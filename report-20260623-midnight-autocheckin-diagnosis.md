# Midnight Auto-Check-In — Build Diagnosis

**Date:** 2026-06-23  
**Type:** Read-only diagnosis  
**Scope:** Design auto-close-all-sessions step in the existing midnight job

---

## 1. The Midnight In-Process Job

### Schedule (`server.ts:12327–12355`)

```js
function scheduleMidnightFeedingJob(): void {
  const msUntilMidnight = msUntilMidnightEastern();
  const hoursUntil = (msUntilMidnight / (1000 * 60 * 60)).toFixed(2);
  console.log(`[Feeding Cron] Scheduling next run in ${hoursUntil} hours (midnight Eastern)`);
  setTimeout(async () => {
    try { await runMidnightFeedingJob(); } catch (err) { ... }
    setInterval(async () => {
      try { await runMidnightFeedingJob(); } catch (err) { ... }
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}
scheduleMidnightFeedingJob();
```

### Current step order in `runMidnightFeedingJob()` (`server.ts:11900–11976`):

| Step | Line | What it does |
|------|------|-------------|
| 1 | 11916 | Fetch all animals from SM |
| 2 | 11922 | Filter to main facility |
| 3 | 11932 | Create blank feeding roster rows for today |
| 4 | 11952 | Archive old feeding data (keep 2 most recent days) |
| **→ INSERT HERE** | | **Close all open active_sessions** |
| 5 | 11965 | Archive old activity data (keep 7 days) — `archiveActivitiesOlderThan(7)` |
| 6 | 11970 | Generate wellbeing alerts for yesterday |

**Insert point: between step 4 (feeding archive) and step 5 (activity archive), at line ~11964.** This ensures:
- Sessions closed at midnight get their `daily_activities` rows created with today's date
- Those rows are immediately eligible for the 7-day archive threshold (they won't be archived tonight since they're fresh, but they'll flow normally)
- The feeding roster steps are unaffected (they don't touch sessions)

---

## 2. The Close Logic to Reuse

**The close logic is INLINE in the route handler** (`server.ts:7774–7920`). There is no extracted function like `endSession()` or `closeActiveSession()`. The logic is:

```js
// 1. Read session
const session = getActiveSessionById(sessionId);         // server.ts:7796 → localDatabase.ts:4459

// 2. Calculate times
const now = new Date();
const inTime = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', ... }); // server.ts:7800
// ... duration calculation (server.ts:7807–7825)

// 3. Delete from active_sessions
deleteActiveSession(sessionId);                           // server.ts:7829 → localDatabase.ts:4575

// 4. Insert into daily_activities
const activityId = insertDailyActivityRow({ ... });       // server.ts:7832 → localDatabase.ts:4186
updateDailyActivityRow(activityId, {                      // server.ts:7840 → localDatabase.ts:4234
  in_time, duration, caregiver_in,
  urinate, defecate, placeholder_1, placeholder_2,
  voice_note_1, voice_note_2, voice_note_3,
  photo_1, photo_2, photo_3,
});

// 5. Update feeding clean/disin if present
if (session.clean || session.disin) {                     // server.ts:7863
  updateDailyFeedingCleanDisin(...);
}

// 6. Dual-write to Google Sheets
await appendActivityLog(entry, sheetTab);                 // server.ts:7899
```

### Recommendation: Extract a reusable function

Since the logic is inline, the build should **extract a function** like:

```js
async function closeActiveSessionWithArchive(
  sessionId: string, 
  caregiverIn: string
): Promise<void>
```

This function would contain steps 1–6 above and be callable from both:
- The route handler (`DELETE /api/sessions/:id/end`) — refactored to call it
- The midnight job — loop over all open sessions, call it per session

The existing DB functions it calls are all already imported in server.ts:
- `getActiveSessionById` (line 204)
- `deleteActiveSession` (line 209)
- `insertDailyActivityRow` (line 186 area)
- `updateDailyActivityRow` (line 186 area)
- `updateDailyFeedingCleanDisin` (line 111)
- `appendActivityLog` (line 81)

---

## 3. The "All Open Sessions" Query

There is no `getAllActiveSessions()` function in `localDatabase.ts`. The closest is `getActiveSessionsBySpecies(species)` (`localDatabase.ts:4473`):

```js
export function getActiveSessionsBySpecies(species: string): ActiveSession[] {
  const database = getDatabase();
  return database.prepare(
    `SELECT * FROM active_sessions WHERE species = ? ORDER BY created_at ASC`
  ).all(species.toLowerCase()) as ActiveSession[];
}
```

**For the midnight job, add a new function** to `localDatabase.ts`:

```js
export function getAllActiveSessions(): ActiveSession[] {
  const database = getDatabase();
  return database.prepare(
    `SELECT * FROM active_sessions ORDER BY created_at ASC`
  ).all() as ActiveSession[];
}
```

Or simply use the database directly in the midnight job:

```js
const db = getDatabase();
const openSessions = db.prepare('SELECT * FROM active_sessions ORDER BY created_at ASC').all() as ActiveSession[];
```

Either way, the enumeration is `SELECT * FROM active_sessions` — every row is an open session. No filter needed; at midnight, all remaining sessions are stale.

---

## 4. Caregiver/Audit Label

The close logic writes `caregiver_in` into `daily_activities` via `updateDailyActivityRow` (`server.ts:7849`):

```js
updateDailyActivityRow(activityId, {
  in_time: inTime,
  duration: durationStr,
  caregiver_in: caregiverName || '',    // server.ts:7850
  urinate: session.urinate || '',
  ...
});
```

And into Google Sheets via `appendActivityLog` (`server.ts:7894`):

```js
const entry: ActivityLogEntry = {
  ...
  caregiverIn: caregiverName || '',     // server.ts:7893
};
```

The `caregiverName` comes from `req.body.caregiverName` in the route handler. In the midnight job, the extracted function would accept it as a parameter. Use:

```
caregiverIn: "System (midnight auto-close)"
```

This matches the pattern from the manual close ("System (auto-close)") and is visible in both the `daily_activities` table and Google Sheets for audit.

---

## 5. Edge/Safety

### Empty active_sessions at midnight
If no sessions are open, `getAllActiveSessions()` returns an empty array. The loop runs zero iterations. The step logs "0 sessions auto-closed" and moves on to step 5 (archive). **Clean no-op.**

### Ordering: close before archive
Sessions closed at midnight create `daily_activities` rows with today's date (the midnight ET date). The archive step (`archiveActivitiesOlderThan(7)`) archives rows with `date < 7 days ago`. Today's rows are well within the 7-day window — they won't be archived tonight. They'll persist in `daily_activities` for 7 days, then archive normally. **No double-processing, no conflict.**

If by some edge case a session's `out_time` was from 8+ days ago (like Duncan's 8-day-stuck session), the `daily_activities` row gets today's date (the date the close happens, not the original out date), so it still won't be archived prematurely.

### Purely additive
The close-all step:
- Does NOT change the feeding roster logic (steps 1–4)
- Does NOT change the activity archive logic (step 5)
- Does NOT change the wellbeing alert logic (step 6)
- Only adds a new step between 4 and 5
- Uses existing DB functions (no schema changes)

### Google Sheets dual-write
The `appendActivityLog` call is async and wrapped in try/catch in the route handler (failure logged but doesn't block). The midnight job should do the same — Sheets write is best-effort. If Sheets quota is exhausted (1000-row grid limit), the SQLite write (source of truth) still succeeds.

---

## 6. Recommendation — Exact Minimal Build

### Files to edit:

**`server/src/server.ts`:**

1. **Extract** the close logic from the route handler (`server.ts:7796–7899`) into a reusable async function:
   ```js
   async function closeActiveSession(sessionId: string, caregiverIn: string): Promise<void>
   ```
   Place it near the route handler (~line 7770). It takes a session ID and caregiver label, does the full close (read → delete → insert daily_activities → update observations → Sheets dual-write).

2. **Refactor** the `DELETE /api/sessions/:id/end` route handler to call the new function (dedup, not behavior change).

3. **Add the midnight step** inside `runMidnightFeedingJob()` between step 4 (feeding archive, ~line 11963) and step 5 (activity archive, line 11965):
   ```js
   // 4.5. Auto-close any open active sessions
   const openSessions = getDatabase().prepare(
     'SELECT id, animal_name, shelter_code FROM active_sessions ORDER BY created_at ASC'
   ).all() as { id: string; animal_name: string; shelter_code: string }[];
   
   for (const session of openSessions) {
     try {
       await closeActiveSession(session.id, 'System (midnight auto-close)');
       console.log(`[Activity Auto-Close] Closed: ${session.animal_name} (${session.shelter_code})`);
     } catch (err) {
       console.error(`[Activity Auto-Close] Failed to close ${session.shelter_code}:`, err);
     }
   }
   if (openSessions.length > 0) {
     console.log(`[Activity Auto-Close] Auto-closed ${openSessions.length} sessions at midnight`);
   }
   ```

**`server/src/localDatabase.ts`:** Optionally add `getAllActiveSessions()` for cleanliness, or use inline `getDatabase().prepare(...)` in the midnight job.

### No other files need changes. No schema changes. No new endpoints. No new cron entries.
