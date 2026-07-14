# Session-Start Activity Row: Pairing Diagnosis

**Date:** 2026-07-14 15:10 UTC (read-only diagnosis)

---

## 1. Old Start Endpoints — What They Inserted

Both `/api/volunteer/session/start` (server.ts:7617) and `/api/staff/session/start` (server.ts:7707) followed the same pattern:

1. **In-memory session:** `activeSessions.set(sessionKey, { ...data, voiceNotes: [], photos: [] })`
2. **Google Sheets:** `await appendActivityLog(entry, sheetTab)` — with `inTime: ''`, `duration: ''`
3. **SQLite daily_activities:** `const activityId = insertDailyActivityRow({ date, species, location, name, shelter_code, hr, caregiver, out_time })` — **in_time NOT set** (defaults to NULL)
4. **Link:** `(sessionData as any).activityId = activityId` — stores the UUID on the in-memory Map entry

**Columns set at start:**
| Column | Value |
|--------|-------|
| id | new UUID |
| date | YYYY-MM-DD (ET) |
| species | normalized |
| location | from request |
| name | animal name |
| shelter_code | animal ID |
| daily_count | auto-calculated (existing count + 1) |
| hr | 'V' or 'S' |
| caregiver | caregiver name |
| out_time | formatted time string |
| in_time | **NULL** (not set) |
| duration | **NULL** (not set) |
| created_at | ISO timestamp |

[VERIFIED — server.ts lines 7676-7695 (volunteer), 7765-7784 (staff)]

## 2. Old Close Path — UPDATE, Not Insert

Both `/api/volunteer/session/end` (server.ts:7796) and `/api/staff/session/end` (server.ts:7872) did:

```typescript
const activityId = (session as any)?.activityId;
if (activityId) {
  updateDailyActivityRow(activityId, {
    in_time: inTime,
    duration: durationStr,
    urinate: urinate || '',
    defecate: defecate || '',
    // staff version also: placeholder_1, placeholder_2
  });
}
activeSessions.delete(sessionKey);
```

**The matching key was `activityId`** — the UUID returned by `insertDailyActivityRow` at start, stored on the in-memory session object. Close UPDATED the same row (not a new insert). One activity = one `daily_activities` row. [VERIFIED — server.ts lines 7848-7857 (volunteer), 7927-7938 (staff)]

**Google Sheets close path:** `updateActivityLog(animalId, caregiver, outTime, {...}, sheetTab)` — found the row by animal+caregiver+outTime match and updated it.

## 3. Current State — New Shared Endpoints

### `/api/sessions/start` (server.ts:7955)

Writes **only** to SQLite `active_sessions` via `createActiveSession()`. Does NOT call `insertDailyActivityRow()`. Does NOT write to Google Sheets. [VERIFIED — lines 7996-8003, no other write calls in the endpoint]

**active_sessions schema columns:** id (UUID PK), species, shelter_code, animal_name, location, photo_url, caregiver_out, caregiver_out_type, out_time, urinate, defecate, placeholder_1, placeholder_2, voice_note_1-3, photo_1-3, created_at, behavior_status, clean, disin [VERIFIED — .schema output]

**No `activity_id` column exists on `active_sessions`.** There is no foreign key linking to `daily_activities`. [VERIFIED]

### `closeActiveSession()` (server.ts:8120)

Unconditionally **INSERTs** a new `daily_activities` row — does NOT look for an existing open row first:

```typescript
deleteActiveSession(sessionId);           // line 8159
const activityId = insertDailyActivityRow({...}); // line 8165 — INSERT
updateDailyActivityRow(activityId, {...});         // line 8174 — UPDATE same row with end data
```

Then dual-writes to Google Sheets via `appendActivityLog` (APPEND, not update). [VERIFIED — lines 8159-8230]

### Observations during session

`PUT /api/sessions/:id/observe` writes only to `active_sessions` (via `updateActiveSessionObservation`). Observations are carried to `daily_activities` when `closeActiveSession` runs (it reads them from the session row before deleting it). [VERIFIED — lines 8060-8117]

### Auto-close (midnight)

`runActivityAutoClose()` (server.ts:12390) calls `closeActiveSession()` for every open session — same INSERT path. [VERIFIED]

## 4. Double-Count Risk & Correct Design

### The risk

If `/api/sessions/start` is modified to call `insertDailyActivityRow()` (creating an open row with NULL in_time), but `closeActiveSession()` is NOT changed, close will INSERT a **second** row. Result: 2 rows per session, `daily_count` inflated.

### Correct design (matches old system)

| Step | Action | daily_activities |
|------|--------|-----------------|
| Start | `insertDailyActivityRow(...)` → returns `activityId` | Row created: out_time set, in_time NULL |
| Close | `updateDailyActivityRow(activityId, { in_time, duration, ... })` | Same row updated: in_time filled |

**The matching key** must be stored. Two options:

**(A) Add `activity_id` column to `active_sessions`** (recommended — matches old pattern):
- Start: insert daily_activities row → get activityId → store it on the active_sessions row
- Close: read activityId from active_sessions row → UPDATE daily_activities (not INSERT)
- Requires: `ALTER TABLE active_sessions ADD COLUMN activity_id TEXT`
- Requires: `closeActiveSession()` changed from INSERT to conditional: if `session.activity_id` exists, UPDATE; else INSERT (backward compat for sessions created before migration)

**(B) Match by shelter_code + date + out_time** (fragile):
- Close: query `daily_activities WHERE shelter_code=? AND date=? AND out_time=? AND in_time IS NULL`
- Risk: same animal checked out twice in the same minute (rare but possible with auto-close + immediate re-checkout)
- Not recommended

**Option A is the clean path.** The old system used the same approach (store activityId on session), just in-memory instead of SQLite. [INFERRED from analysis of both flows]

## 5. Dashboard Rendering with NULL in_time

The dashboard table (`renderActivitiesRow` in dashboard/index.html:9382) renders each cell with:
```javascript
const cellVal = (val) => val || '';
```

For the In column: `${escapeHtml(stripLeadingZero(cellVal(row.inTime)))}`
For Duration: `${escapeHtml(cellVal(row.duration))}`

**NULL/empty in_time renders as an empty cell.** No crash, no error. The duration cell also renders empty, and `getDurationStyle('')` returns `''` (no background color). [VERIFIED — dashboard/index.html lines 9393-9430]

**However:** there is no visual "in progress" / "still out" indicator. An open row would look like a row with blank In/Duration columns — visually indistinguishable from a data-entry gap. Consider adding a visual cue (e.g., a 🟢 badge or "Out" text in the In column) so the dashboard user understands the row is active, not incomplete. [INFERRED — cosmetic concern, not a functional bug]

The **editable cell** for in_time has `onclick="openCellEditModal('activity', {rowId:'${row.id}'}, 'in_time', this)"` — staff can manually fill it. This works fine with null. [VERIFIED]

## 6. Other Readers of daily_activities — Blast Radius

| Reader | What it does | Impact of NULL in_time row |
|--------|-------------|--------------------------|
| `/api/dashboard/activities/:species` | SELECT * ORDER BY date, created_at | Shows row with empty In/Duration — acceptable [VERIFIED] |
| `/api/dashboard/activities/no-activity/:species` | SELECT DISTINCT shelter_code WHERE date=today | Animal counts as "has activity" even while still out — **correct behavior** (currently they don't appear until return) [VERIFIED] |
| `getTodayActivityStatsFromDb(species)` | COUNT(*) + MAX(created_at) per shelter_code today | Count increments at start instead of end — changes `activitiesToday` from 0→1 while still out. **Desired behavior** — staff list shows "1 activity" during walk. [VERIFIED] |
| `/api/dashboard/activity-archive/search` | UNION daily_activities + activity_archive | Same as dashboard table — empty In cell [VERIFIED] |
| Date-range query (line 2170) | SELECT with date BETWEEN | Same — shows open row with empty fields [VERIFIED] |
| `insertDailyActivityRow` daily_count | COUNT(*) WHERE date+shelter_code | If animal goes out twice, second start row gets daily_count=2 — **correct**, same as old system [VERIFIED] |
| Google Sheets dual-write | `appendActivityLog` in closeActiveSession | Only runs at close — unaffected. Start doesn't write to Sheets in the proposed design. [VERIFIED] |
| `archiveOldActivities` | Moves rows older than cutoff to activity_archive | Operates on date — unaffected by in_time null [VERIFIED] |

**No reader breaks on NULL in_time.** The "no activity" endpoint actually **improves** — animals currently out will correctly show as "has activity today" instead of being listed as "no activity." [VERIFIED]

## 7. Scope — Which Apps Use Which Endpoints

| App | Session Start Endpoint | Writes daily_activities at start? | Species |
|-----|----------------------|----------------------------------|---------|
| **staff-pwa** | `/api/sessions/start` (line 652) | ❌ NO | dog, cat, small |
| **volunteer-pwa** | `/api/volunteer/session/start` (line 399) | ✅ YES (old flow) | dog, cat, small |
| **dogwalker-pwa** | `/api/dogwalker/walk/start` (line 439) | ❌ (separate `activeWalks` + Sheets-only) | dog only |
| **staff-pwa offline queue** | `/api/staff/session/start` (line 3424) | ✅ YES (old flow) | dog, cat, small |
| **caregiver-pwa** | No session start | N/A | N/A |
| **coordinator-pwa** | No session start | N/A | N/A |

The fix applies to `/api/sessions/start` — used by the **staff-pwa** for all species. The volunteer-pwa still uses the old endpoint (already has start-time rows). The dogwalker-pwa is a completely separate system. [VERIFIED]

**The staff-pwa offline queue** at line 3424 still routes to `/api/staff/session/start` (the old endpoint). This means offline-queued staff sessions DO get start-time rows — but online ones don't. This inconsistency would be resolved by the fix. [VERIFIED]

## Summary — Implementation Blueprint

**Changes required (3 edits, 1 migration):**

1. **Migration:** `ALTER TABLE active_sessions ADD COLUMN activity_id TEXT` (nullable, for backward compat)

2. **`/api/sessions/start`** (server.ts ~7996): After `createActiveSession()`, call `insertDailyActivityRow()` with the session data (in_time not set → NULL). Store returned activityId on the active_sessions row via a new `updateActiveSessionActivityId(session.id, activityId)` function.

3. **`closeActiveSession()`** (server.ts ~8165): Change from unconditional INSERT to conditional:
   - If `session.activity_id` is non-null: `updateDailyActivityRow(session.activity_id, { in_time, duration, caregiver_in, ...observations })` — UPDATE existing row
   - Else (backward compat for sessions created before migration): INSERT as today (existing code)

4. **Optional cosmetic:** Dashboard `renderActivitiesRow` — if `in_time` is empty/null, show "🟢 Out" or similar instead of blank cell, so staff know it's an active session, not missing data.

**No changes needed to:** volunteer-pwa, dogwalker-pwa, Google Sheets dual-write, dashboard endpoint, getTodayActivityStatsFromDb, no-activity endpoint, archive, or any other reader.
