# Stuck Activity Cards — Diagnosis Report

**Date:** 2026-06-23  
**Type:** Read-only diagnosis  
**Scope:** Duncan (A2026094) + Luna (A2026040) stuck as checked out; midnight auto-check-in pattern

---

## PART 1 — THE STUCK CARDS

### 1. What Is a "Checked-Out" Animal

An animal shows as a checked-out card when it has a row in the `active_sessions` table (`localDatabase.ts:4459–4477`). There is no separate flag — **the row's existence IS the checked-out state.**

Schema (`active_sessions`):
```sql
CREATE TABLE active_sessions (
  id TEXT PRIMARY KEY,
  species TEXT NOT NULL,
  shelter_code TEXT NOT NULL,
  animal_name TEXT NOT NULL,
  location TEXT NOT NULL,
  photo_url TEXT,
  caregiver_out TEXT NOT NULL,
  caregiver_out_type TEXT NOT NULL,
  out_time TEXT NOT NULL,
  urinate TEXT, defecate TEXT,
  placeholder_1 TEXT, placeholder_2 TEXT,
  voice_note_1 TEXT, voice_note_2 TEXT, voice_note_3 TEXT,
  photo_1 TEXT, photo_2 TEXT, photo_3 TEXT,
  created_at TEXT NOT NULL,
  behavior_status TEXT DEFAULT 'red',
  clean TEXT, disin TEXT
);
CREATE UNIQUE INDEX idx_active_sessions_animal ON active_sessions(shelter_code);
```

The card-listing query (`localDatabase.ts:4473–4478`, called by `GET /api/sessions/active/:species` at `server.ts:7695`):
```js
export function getActiveSessionsBySpecies(species: string): ActiveSession[] {
  const database = getDatabase();
  return database.prepare(
    `SELECT * FROM active_sessions WHERE species = ? ORDER BY created_at ASC`
  ).all(species.toLowerCase()) as ActiveSession[];
}
```

**A card appears** = a row exists in `active_sessions` for that animal. **A card disappears** = that row is deleted. There is no end_time/check-in column — the row is simply removed on check-in, and the activity data is copied to `daily_activities` before deletion.

### 2. Duncan & Luna's Stuck Rows

```
id                                    species  shelter_code  animal_name  caregiver_out  out_time  created_at
------------------------------------  -------  ------------  -----------  -------------  --------  ------------------------
bb6fca75-493b-4cb8-8ca6-134c49427ef3  dog      A2026040      Luna         Shelter        04:08 PM  2026-06-22T20:08:33.918Z
7e4eaeb9-def2-401b-8b16-15e913028b39  dog      A2026094      Duncan       Ben            04:22 PM  2026-06-15T20:22:08.377Z
```

Duncan has been stuck since **June 15** (8 days). Luna since **June 22** (1 day).

Observations on the stuck sessions:
- Luna: urinate=Yes, defecate=Solid, behavior_status=green
- Duncan: urinate=No, defecate=Loose, behavior_status=green

These are the two rows keeping their cards visible. Deleting these rows (after copying data to `daily_activities`) would clear the cards.

### 3. How Normal Check-In Closes a Session

`DELETE /api/sessions/:id/end` (`server.ts:7774–7920`):

1. **Read** the session from `active_sessions` via `getActiveSessionById(sessionId)` (`server.ts:7796`)
2. **Calculate** in_time (current time in ET) and duration (`server.ts:7800–7825`)
3. **Delete** from `active_sessions` via `deleteActiveSession(sessionId)` (`server.ts:7829`) — this calls `localDatabase.ts:4575`:
   ```js
   database.prepare(`DELETE FROM active_sessions WHERE id = ?`).run(id);
   ```
4. **Insert** into `daily_activities` with all observation data preserved (`server.ts:7832–7861`):
   ```js
   const activityId = insertDailyActivityRow({
     date, species, location, name, shelter_code, hr, caregiver, out_time
   });
   updateDailyActivityRow(activityId, {
     in_time, duration, caregiver_in,
     urinate, defecate, placeholder_1, placeholder_2,
     voice_note_1, voice_note_2, voice_note_3,
     photo_1, photo_2, photo_3
   });
   ```
5. **Dual-write** to Google Sheets (`server.ts:7881–7893`)
6. **Update** clean/disin on `daily_feeding` if present (`server.ts:7863–7870`)

### 4. Close-Not-Delete Confirmation

The normal check-in **preserves all activity data.** The flow is:
1. Copy all session data (observations, photos, voice notes) → `daily_activities` table
2. Then delete the `active_sessions` row

The `daily_activities` rows persist (they're later archived to `activity_archive` after 7 days by the midnight job, but that's a move, not a delete).

**Minimal safe write to close Duncan & Luna:**

For each session, replicate what `DELETE /api/sessions/:id/end` does:
1. Read the session row from `active_sessions`
2. Insert a `daily_activities` row with the session data + an `in_time` of "Auto-closed" or current time + caregiver_in of "System"
3. Delete the row from `active_sessions`
4. Optionally dual-write to Google Sheets

**Simplest approach:** Call the existing `DELETE /api/sessions/:id/end` endpoint for each session with a synthetic caregiver (e.g. `caregiverName: "System (auto-close)"`, `caregiverType: "staff"`). This reuses all the existing logic including Sheets dual-write and clean/disin propagation. The two session IDs are:
- Luna: `bb6fca75-493b-4cb8-8ca6-134c49427ef3`
- Duncan: `7e4eaeb9-def2-401b-8b16-15e913028b39`

---

## PART 2 — MIDNIGHT AUTO-CHECK-IN

### 5. Existing Auto-Close Patterns

#### Timeclock auto-close (`server.ts:9828–9860`)

**Trigger:** `POST /api/volunteers/timeclock/auto-close` — called by root crontab hourly (`5 * * * *`)

**Find stale:** 
```sql
SELECT id, volunteer_id, check_in_at FROM volunteer_timeclock
WHERE check_out_at IS NULL AND check_in_at < datetime('now', '-8 hours')
```

**Close:**
```sql
UPDATE volunteer_timeclock
SET check_out_at = datetime(check_in_at, '+8 hours'), auto_closed = 1
WHERE id = ?
```

Pattern: external cron → POST endpoint → find stale → update rows.

#### Midnight feeding/activity job (`server.ts:12327–12355`, `server.ts:11935–11976`)

**Trigger:** In-process `setTimeout` → `setInterval(24h)`, anchored to midnight ET via `msUntilMidnightEastern()`.

**Runs `runMidnightFeedingJob()`** which includes (at step 5, `server.ts:11965`):
```js
const activitiesArchived = archiveActivitiesOlderThan(7);
```

This archives `daily_activities` rows older than 7 days → `activity_archive`. It does NOT touch `active_sessions`.

Pattern: in-process scheduler → midnight ET → batch operations on daily tables.

### 6. Recommended Pattern for Auto-Check-In

**Best fit: extend the midnight in-process job** (`runMidnightFeedingJob`).

Rationale:
- It already runs at midnight ET (the natural "end of business" boundary)
- It already handles activity archival in the same function
- Adding a "close stale active_sessions" step before the archive step is a natural fit
- No new cron entry or endpoint needed — just a new step in the existing midnight sequence

The alternative (external cron → POST endpoint like timeclock) would also work but adds infrastructure for something that fits cleanly in the existing midnight job.

### "Still Checked Out at Midnight" Query

```sql
SELECT * FROM active_sessions
WHERE created_at < datetime('now', '-6 hours')
```

Or more precisely, to close any session open at midnight ET:
```sql
SELECT * FROM active_sessions
```

At midnight, ALL remaining `active_sessions` rows are stale (shelter closes well before midnight). The query can be simply "all rows in `active_sessions`" — or use a safety threshold like `created_at < datetime('now', '-4 hours')` to avoid closing a session that was just created moments before midnight.

**The close operation** for each would replicate the normal check-in flow:
1. Read session from `active_sessions`
2. Insert into `daily_activities` with `in_time` = "Auto" or midnight, `caregiver_in` = "System", `duration` = calculated
3. Delete from `active_sessions`
4. Optionally dual-write to Sheets

This would slot in as step 4.5 in `runMidnightFeedingJob()` — after feeding roster creation but before the 7-day activity archive.
