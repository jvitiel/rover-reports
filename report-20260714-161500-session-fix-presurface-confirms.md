# Session-Activity-Row Fix: Pre-Build Confirmations

**Date:** 2026-07-14 20:14 UTC (read-only)

---

## 1. SESSION-LOAD SELECT INCLUDES activity_id? → YES (auto-includes)

`closeActiveSession()` calls `getActiveSessionById(sessionId)` at line 8125. That function uses **`SELECT *`**:

```typescript
// localDatabase.ts:3989
export function getActiveSessionById(id: string): ActiveSession | null {
  const database = getDatabase();
  const row = database.prepare(`SELECT * FROM active_sessions WHERE id = ?`).get(id) as ActiveSession | undefined;
  return row || null;
}
```

`SELECT *` auto-includes any new column. After `ALTER TABLE active_sessions ADD COLUMN activity_id TEXT`, the returned row will include `session.activity_id` with no code change needed on the read side.

Similarly, `getActiveSessionByAnimalId` (used in the start endpoint's duplicate check) also uses `SELECT *`. [VERIFIED — localDatabase.ts:3996]

**No named-column list to update. No risk of reading `undefined`.** [VERIFIED]

## 2. READ-BEFORE-DELETE ORDERING → SAFE (session already in memory)

Current ordering in `closeActiveSession()` (server.ts:8120–8175):

```typescript
// Line 8125: READ session into local variable
const session = getActiveSessionById(sessionId);  // ← session object now in memory
if (!session) return null;

// Lines 8128-8156: calculate inTime, durationStr (uses session.out_time)

// Line 8159: DELETE from active_sessions
deleteActiveSession(sessionId);

// Line 8165: INSERT into daily_activities (uses session.species, session.location, etc.)
const activityId = insertDailyActivityRow({...});

// Line 8177: UPDATE daily_activities with end data (uses session.urinate, etc.)
updateDailyActivityRow(activityId, {...});
```

**The session object (including future `activity_id`) is already loaded into the local `session` variable at line 8125, before `deleteActiveSession` at line 8159.** No re-read needed. The fix can reference `session.activity_id` at any point after line 8125. [VERIFIED]

## 3. COLUMN PARITY — INSERT vs UPDATE Branches

The current close path writes to daily_activities in two steps. The UPDATE branch must write the same final set.

**Step 1 — INSERT via `insertDailyActivityRow` (line 8165):**

| Column | Source |
|--------|--------|
| id | new UUID (auto-generated) |
| date | sqliteDate (YYYY-MM-DD ET) |
| species | session.species |
| location | session.location |
| name | session.animal_name |
| shelter_code | session.shelter_code |
| daily_count | auto-calculated (COUNT+1) |
| hr | session.caregiver_out_type |
| caregiver | session.caregiver_out |
| out_time | session.out_time |
| created_at | new ISO timestamp |

**Step 2 — UPDATE via `updateDailyActivityRow` (line 8177):**

| Column | Source |
|--------|--------|
| in_time | inTime (calculated) |
| duration | durationStr (calculated) |
| caregiver_in | caregiverIn (function param) |
| urinate | session.urinate ∥ '' |
| defecate | session.defecate ∥ '' |
| placeholder_1 | session.placeholder_1 ∥ '' |
| placeholder_2 | session.placeholder_2 ∥ '' |
| voice_note_1 | session.voice_note_1 ∥ '' |
| voice_note_2 | session.voice_note_2 ∥ '' |
| voice_note_3 | session.voice_note_3 ∥ '' |
| photo_1 | session.photo_1 ∥ '' |
| photo_2 | session.photo_2 ∥ '' |
| photo_3 | session.photo_3 ∥ '' |

**For the UPDATE-branch (when `session.activity_id` exists):** the START insert already set id/date/species/location/name/shelter_code/daily_count/hr/caregiver/out_time/created_at. Close only needs to UPDATE with the Step 2 columns above (13 fields). This is exactly what `updateDailyActivityRow` already does — the same call, just targeting the existing row's id instead of a freshly-inserted id.

**Definitive column list the UPDATE branch must write at close:** `in_time`, `duration`, `caregiver_in`, `urinate`, `defecate`, `placeholder_1`, `placeholder_2`, `voice_note_1`, `voice_note_2`, `voice_note_3`, `photo_1`, `photo_2`, `photo_3` — 13 columns, identical to Step 2. [VERIFIED]

**Note:** `clean` and `disin` are written to `daily_feeding` (not daily_activities) via `updateDailyFeedingCleanDisin` at line 8193. This is unchanged by either branch. [VERIFIED]

## 4. createActiveSession IS NAMED-COLUMN → YES (safe to add column)

```typescript
// localDatabase.ts:3966
database.prepare(`
  INSERT INTO active_sessions (
    id, species, shelter_code, animal_name, location, photo_url,
    caregiver_out, caregiver_out_type, out_time, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  id, data.species.toLowerCase(), data.animalId.toUpperCase(),
  data.animalName, data.location, data.photoUrl,
  data.caregiverName, data.caregiverType.toUpperCase(), outTime, createdAt
);
```

**Named-column INSERT.** Adding `activity_id TEXT` to the table won't break this — the new column defaults to NULL for rows created by this statement. To populate it, a new UPDATE call after this INSERT (or adding it to the column list) is needed. [VERIFIED]

**SELECT * consumers:** `getActiveSessionById`, `getActiveSessionByAnimalId`, `getActiveSessionsBySpecies`, `deleteActiveSession` — all use `SELECT *` and cast to `ActiveSession`. The TypeScript interface would need `activity_id?: string | null` added, but SQLite returns the column regardless. All JS consumers read by property name, not position. No shape breakage. [VERIFIED]

## 5. ARCHIVE × OPEN ROW → NOT A HOLE (timing precludes it)

Archive query (`archiveActivitiesOlderThan`, localDatabase.ts:3879):

```typescript
const rows = database.prepare(
  `SELECT * FROM daily_activities WHERE date < ?`
).all(cutoffStr) as DailyActivityRow[];
// ...
database.prepare(`DELETE FROM daily_activities WHERE date < ?`).run(cutoffStr);
```

**Filter: `date < cutoffStr` only. No `in_time IS NULL` exclusion.** An open row with the right date WOULD be archived.

**However, timing precludes it:**

- Archive cutoff: `days = 7` → `cutoffStr` = today minus 7 days (line 12269)
- Auto-close runs at 11:55 PM ET every night (line 12398, `runActivityAutoClose`)
- Auto-close calls `closeActiveSession()` for EVERY open `active_sessions` row
- Auto-close runs BEFORE midnight; archive runs during the midnight feeding cron job
- A session opened today gets its daily_activities row dated today
- That row won't reach `date < (today - 7)` for 8 days
- By then, auto-close will have closed it (within hours of creation, same day at 11:55 PM)

**The only scenario that could hit this:** auto-close fails for 8+ consecutive days while a session stays open. That requires the midnight cron job to fail (which would also prevent archiving from running, since they're in the same job). Circular dependency — if cron fails, archive doesn't run either.

**Answer: (b) timing precludes it.** Not a practical hole. Auto-close at 23:55 ET guarantees all sessions close the same day they open. The archive query runs in the same cron job as auto-close, 7+ days later. An open row cannot reach the archive cutoff under normal operation. [VERIFIED]

**Edge note:** If auto-close is ever separated from the archive job, or if the 7-day retention is shortened, this assumption breaks. A defensive `AND in_time IS NOT NULL` on the archive query would be zero-cost insurance but is not strictly required today. [INFERRED]

## 6. DUPLICATE-START AND DOUBLE-CLOSE GUARDS → BOTH GUARDED

### Duplicate start (same animal):

Two layers:

1. **Application check** in `/api/sessions/start` (server.ts:7984):
```typescript
const existing = getActiveSessionByAnimalId(animalId);
if (existing) {
  res.status(409).json({ error: `${animalName} is already checked out by ${existing.caregiver_out}` });
  return;
}
```

2. **Database constraint** (schema):
```sql
CREATE UNIQUE INDEX idx_active_sessions_animal ON active_sessions(shelter_code);
```
If the application check is bypassed (race condition), the INSERT throws a UNIQUE constraint violation, caught at line 8011:
```typescript
if ((error as Error).message?.includes('UNIQUE constraint')) {
  res.status(409).json({ error: 'Animal already has an active session' });
}
```

**Double-start for the same animal is rejected at both layers.** A second `/api/sessions/start` for the same shelter_code cannot create a second active_sessions row or a second daily_activities open row. [VERIFIED]

### Double close (same session):

`closeActiveSession()` starts with:
```typescript
const session = getActiveSessionById(sessionId);
if (!session) return null;   // ← early return, no-op
```

After the first close, `deleteActiveSession(sessionId)` removes the row. A second call to `closeActiveSession(sessionId)` hits `getActiveSessionById` → returns null → returns null. The caller (`DELETE /api/sessions/:id/end`, line 8254) handles null:
```typescript
const result = await closeActiveSession(sessionId, caregiverName);
if (!result) {
  res.status(404).json({ error: 'Session not found' });
  return;
}
```

**A second close is a no-op — returns 404, no INSERT, no UPDATE, no double-count.** [VERIFIED]

---

## Summary Table

| Check | Result | Risk? |
|-------|--------|-------|
| 1. Session-load SELECT includes activity_id | `SELECT *` — auto-includes | ✅ No risk |
| 2. Read-before-delete ordering | Session loaded at 8125, deleted at 8159 — safe | ✅ No risk |
| 3. Column parity INSERT vs UPDATE | 13 end-columns identical; START columns already set | ✅ No risk |
| 4. createActiveSession named-column | Named INSERT — adding column won't break | ✅ No risk |
| 5. Archive × open row | Timing precludes (auto-close same day, archive 7+ days later) | ✅ No practical risk |
| 6. Duplicate-start / double-close | UNIQUE constraint + 409 / null-check early return | ✅ Both guarded |

**All six confirmations pass. No blockers for the session-activity-row implementation.**
