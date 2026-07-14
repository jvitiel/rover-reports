# Session-Activity-Row Fix: Build Report

**Date:** 2026-07-14 20:45 UTC
**Commit:** `d600cf1` — "Restore daily_activities-at-start for /api/sessions/start"
**Files changed:** server/src/server.ts, server/src/localDatabase.ts (2 files, +79 −17)

---

## Schema

```sql
ALTER TABLE active_sessions ADD COLUMN activity_id TEXT
```

Idempotent — catches duplicate-column error, rethrows anything else:
```typescript
try {
  db.exec(`ALTER TABLE active_sessions ADD COLUMN activity_id TEXT`);
} catch (e: unknown) {
  if (!/duplicate column/i.test(String(e))) throw e;
}
```

Added `activity_id?: string | null` to the `ActiveSession` TypeScript interface.

**Verification:**
```
PRAGMA table_info(active_sessions) → 23|activity_id|TEXT|0||0  ✅
Row count: 6 (unchanged)
All 6 existing rows: activity_id IS NULL  ✅
```
[VERIFIED]

---

## Start Path (`/api/sessions/start`)

After `createActiveSession()` succeeds:
```typescript
const startActivityId = insertDailyActivityRow({
  date: sqliteDate, species: normalizedSpecies, location, name: animalName,
  shelter_code: animalId, hr: caregiverType, caregiver: caregiverName,
  out_time: session.out_time,
});
updateActiveSessionActivityId(session.id, startActivityId);
```

Order: createActiveSession → insertDailyActivityRow → updateActiveSessionActivityId. If createActiveSession throws (duplicate/409), no daily_activities row is created. [VERIFIED — Case 3]

---

## Close Path (`closeActiveSession`)

```typescript
const existingActivityId = session.activity_id;  // read BEFORE delete
deleteActiveSession(sessionId);

const endColumns = { in_time, duration, caregiver_in, urinate, defecate,
  placeholder_1, placeholder_2, voice_note_1..3, photo_1..3 };  // 13 columns

if (existingActivityId) {
  // Post-migration: UPDATE the start-row
  updateDailyActivityRow(existingActivityId, endColumns);
} else {
  // Fallback: check for existing open row first
  const openRow = findOpenDailyActivityRow(session.shelter_code, sqliteDate);
  if (openRow) {
    updateDailyActivityRow(openRow.id, endColumns);
  } else {
    const activityId = insertDailyActivityRow({...start cols...});
    updateDailyActivityRow(activityId, endColumns);
  }
}
```

Sheets dual-write and clean/disin → daily_feeding: unchanged.

---

## New Helper Functions

```typescript
// localDatabase.ts
export function updateActiveSessionActivityId(sessionId: string, activityId: string): void {
  database.prepare(`UPDATE active_sessions SET activity_id = ? WHERE id = ?`).run(activityId, sessionId);
}

export function findOpenDailyActivityRow(shelterCode: string, date: string): DailyActivityRow | null {
  return database.prepare(
    `SELECT * FROM daily_activities WHERE shelter_code = ? AND date = ? AND (in_time IS NULL OR in_time = '') ORDER BY created_at DESC LIMIT 1`
  ).get(shelterCode.toUpperCase(), date);
}
```

---

## Archive Hardening

```sql
-- BEFORE:
SELECT * FROM daily_activities WHERE date < ?
DELETE FROM daily_activities WHERE date < ?

-- AFTER:
SELECT * FROM daily_activities WHERE date < ? AND in_time IS NOT NULL
DELETE FROM daily_activities WHERE date < ? AND in_time IS NOT NULL
```

Open rows (in_time IS NULL) can never be archived mid-session. [VERIFIED]

---

## Able-to-Fail Proof Cases

### Case 1: HAPPY PATH (start → close)
| Field | Value |
|-------|-------|
| **Test** | Start session for TEST-DIAG-001, then close |
| **Assertion** | Exactly 1 daily_activities row, same ID, out_time from start, in_time from close |
| **Fail condition** | Row count ≠ 1, or ID changes between start and close |
| **Result** | ✅ PASS |

```
Start → daily_activities id: ffba5202-..., out_time: 04:38 PM, in_time: (NULL)
Close → daily_activities id: ffba5202-... (SAME), out_time: 04:38 PM, in_time: 04:38 PM
Row count: 1
```
[VERIFIED]

### Case 2: PARTIAL-FAILURE-AT-START (activity_id NULL, open row exists)
| Field | Value |
|-------|-------|
| **Test** | Manually create active_session (activity_id NULL) + open daily_activities row, then close via API |
| **Assertion** | Exactly 1 daily_activities row — fallback finds open row and UPDATEs, does NOT insert 2nd |
| **Fail condition** | Row count = 2 (double-count) |
| **Result** | ✅ PASS |

```
Pre-close: 1 row (test-case2-act, in_time NULL)
Post-close: 1 row (test-case2-act, in_time: 04:39 PM) — fallback UPDATED existing
Row count: 1
```
[VERIFIED]

### Case 3: DUPLICATE-START (same animal already out)
| Field | Value |
|-------|-------|
| **Test** | Start TEST-DIAG-003, then attempt 2nd start for same animal |
| **Assertion** | 2nd start returns 409, daily_activities count stays at 1 |
| **Fail condition** | Row count > 1 or HTTP ≠ 409 |
| **Result** | ✅ PASS |

```
1st start: 200, daily_activities count: 1
2nd start: 409 "TestDog Gamma is already checked out by Rover Test"
daily_activities count: 1 (unchanged)
```
[VERIFIED]

### Case 4: DOUBLE-CLOSE (close same session twice)
| Field | Value |
|-------|-------|
| **Test** | Close TEST-DIAG-003 session, then close again |
| **Assertion** | 2nd close returns 404, exactly 1 daily_activities row, no orphan |
| **Fail condition** | Row count ≠ 1 or 2nd close succeeds |
| **Result** | ✅ PASS |

```
1st close: 200 success
2nd close: 404 "Session not found"
daily_activities count: 1
```
[VERIFIED]

### Case 5: AUTO-CLOSE post-migration (activity_id present)
| Field | Value |
|-------|-------|
| **Test** | Start via API (creates activity_id link), close with "System (midnight auto-close)" |
| **Assertion** | Exactly 1 row, same ID as start, UPDATE path used |
| **Fail condition** | Row count ≠ 1, or row ID differs from start |
| **Result** | ✅ PASS |

```
Start → activity_id: d2f4a8f4-..., daily_activities id: d2f4a8f4-... (same)
Close → daily_activities id: d2f4a8f4-... (SAME), in_time: 04:39 PM, caregiver_in: System (midnight auto-close)
Row count: 1
```
[VERIFIED]

### Case 6: AUTO-CLOSE pre-migration (activity_id NULL, no open row)
| Field | Value |
|-------|-------|
| **Test** | Manually create active_session (activity_id NULL, no daily_activities row), close via API |
| **Assertion** | Exactly 1 daily_activities row — fallback INSERT+UPDATE |
| **Fail condition** | Row count ≠ 1 |
| **Result** | ✅ PASS |

```
Pre-close: 0 daily_activities rows, activity_id NULL
Post-close: 1 row (986e419c-..., out_time: 04:40 PM, in_time: 04:39 PM)
Row count: 1
```
[VERIFIED]

---

## Cleanup

```
daily_activities TEST-DIAG-% remaining: 0  ✅
active_sessions TEST-DIAG-% remaining: 0  ✅
Real active sessions: 6 (all activity_id NULL — pre-migration, expected)  ✅
Real daily_activities today: 113 (unchanged from pre-test 113)  ✅
```
[VERIFIED]

---

## Summary

| Item | Status |
|------|--------|
| Schema migration (activity_id) | ✅ Applied, idempotent |
| Start writes daily_activities | ✅ With activity_id link |
| Close UPDATE path (post-migration) | ✅ Cases 1, 5 |
| Close fallback (open row exists) | ✅ Case 2 |
| Close fallback (no open row) | ✅ Case 6 |
| Duplicate-start guard | ✅ Case 3 |
| Double-close guard | ✅ Case 4 |
| Archive excludes open rows | ✅ Both WHERE clauses |
| tsc clean | ✅ Exit 0 |
| shelter-app restart | ✅ Active, 200 |
| Commit | ✅ d600cf1, named paths only |
| Test cleanup | ✅ 0 test rows, real data untouched |
