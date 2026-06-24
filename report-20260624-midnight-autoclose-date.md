# Midnight Auto-Close Date Filing — Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only. Determine what date the auto-closed activity records file under and whether moving the job to 11:59 PM fixes it.

---

## 1. What Timestamp Drives the Record's Date

**`closeActiveSession()`** at **server.ts:7777–7848**

When closing a session, the function uses `now = new Date()` (the moment the close runs) to derive **both** the `in_time` (check-in time) and the `date` (day the record files under):

```ts
const now = new Date();                                                    // :7787
const inTime = now.toLocaleTimeString('en-US', {                           // :7788
    timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: true
});
// ...
const sqliteDate = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });  // :7819
// ...
const activityId = insertDailyActivityRow({                                // :7822
    date: sqliteDate,                                                      // :7823
    // ...
    out_time: session.out_time,                                            // :7828
});
updateDailyActivityRow(activityId, {                                       // :7832
    in_time: inTime,                                                       // :7833
    // ...
});
```

**The `date` column is derived from `now` (the close time), NOT from `session.out_time` (when the animal went out).**

When the midnight job fires at 12:00 AM on 6/24:
- `now` = 2026-06-24T04:00:00Z (midnight Eastern = 4:00 AM UTC)
- `sqliteDate` = `'2026-06-24'` ← **this is why the record files under 6/24**
- `inTime` = `'12:00 AM'`

---

## 2. Sparky and Milo's Actual Rows

```sql
SELECT id, date, name, shelter_code, out_time, in_time, duration, caregiver_in 
FROM daily_activities 
WHERE shelter_code IN ('A2025063','A2026036') AND date >= '2026-06-23'
```

| date | name | shelter_code | out_time | in_time | duration | caregiver_in |
|------|------|-------------|----------|---------|----------|-------------|
| **2026-06-24** | Milo | A2026036 | 01:48 PM | 12:00 AM | *(blank)* | System (midnight auto-close) |
| **2026-06-24** | Sparky | A2025063 | 02:52 PM | 12:00 AM | *(blank)* | System (midnight auto-close) |
| 2026-06-24 | Sparky | A2025063 | 10:39 AM | 12:02 PM | 1h 23m | DALIA 🫶 |
| 2026-06-24 | Milo | A2026036 | 10:02 AM | 10:20 AM | 18m | DALIA 🫶 |
| 2026-06-23 | Milo | A2026036 | 04:09 PM | 10:04 AM | *(blank)* | DALIA 🫶 |
| 2026-06-23 | Sparky | A2025063 | 04:11 PM | 10:03 AM | *(blank)* | DALIA 🫶 |

**Key finding:** The auto-closed rows have `date = '2026-06-24'` even though the animals went out on 6/23 (1:48 PM and 2:52 PM). The `date` comes from `now` at close time (midnight = 6/24), not from the session's out_time.

---

## 3. How the Dashboard Assigns an Activity to a Day

**`GET /api/dashboard/activities/:species`** at **server.ts:1555–1575**:

```ts
SELECT * FROM daily_activities WHERE species = ? ORDER BY date DESC, created_at DESC
```

The dashboard groups activities by the **`date` column** — the value written by `closeActiveSession` from `now`. The frontend renders each row under its `date` value.

**`getDailyActivitiesBySpecies()`** at **localDatabase.ts:4323**:

```ts
SELECT * FROM daily_activities WHERE date = ? AND species = ?
```

Same: queries on the `date` column.

---

## 4. Would 11:59 PM Fix It? — YES ✅

If the auto-close ran at 11:59 PM on 6/23 instead of 12:00 AM 6/24:

- `now` would be 2026-06-23T23:59:xx Eastern
- `sqliteDate = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })` → `'2026-06-23'`
- `inTime` → `'11:59 PM'`

The record would file under **6/23** (the day the animal went out), and `in_time` would show `11:59 PM` instead of `12:00 AM`.

**This fixes the date filing.** The record would appear under the correct day in the dashboard.

**However**, there's a cleaner alternative: instead of moving the entire job's timing, modify `closeActiveSession` to derive `sqliteDate` from the session's `out_time` date (or from the session's `created_at` / `started_at`) rather than from `now`. This would be correct regardless of when the close runs. But the 11:59 PM approach is simpler and also fixes the date.

---

## 5. The Current Trigger — How Midnight Job Is Scheduled

**`scheduleMidnightFeedingJob()`** at **server.ts:12396–12422**:

```ts
function scheduleMidnightFeedingJob(): void {
  const msUntilMidnight = msUntilMidnightEastern();           // :12397
  setTimeout(async () => {
    await runMidnightFeedingJob();                             // :12403
    setInterval(async () => {                                  // :12409
      await runMidnightFeedingJob();
    }, 24 * 60 * 60 * 1000);                                   // repeats every 24h
  }, msUntilMidnight);
}
```

Uses `setTimeout` to the next midnight Eastern, then `setInterval` every 24 hours.

**To run auto-close at 11:59 PM instead:**

The auto-close is **step 5** inside `runMidnightFeedingJob()` (server.ts:12006–12030). It's mixed in with the feeding roster job (steps 1–4: clear feeding tables, seed new feeding rows) and the archive job (step 6). 

To run it at 11:59 PM:
1. **Extract** the auto-close logic (lines 12006–12030) into its own function, e.g. `runActivityAutoClose()`.
2. **Add a separate scheduler** that fires at 11:59 PM Eastern — either:
   - A new `setTimeout`/`setInterval` pair like the midnight job but targeting 23:59 Eastern, OR
   - An OpenClaw cron job (`schedule: { kind: 'cron', expr: '59 23 * * *', tz: 'America/New_York' }`) that calls a new endpoint.
3. **Remove** the auto-close step from `runMidnightFeedingJob()` so it doesn't double-close.

The rest of the midnight job (feeding roster seed, archive) stays at midnight.

---

## 6. Duration — Why It's Blank

**Duration computation** at **server.ts:7797–7810**:

```ts
const diffMinutes = (inHours * 60 + parseInt(inParts[2])) - (outHours * 60 + parseInt(outParts[2]));
if (diffMinutes >= 0) {                                                    // :7808
    durationStr = ...;
}
```

For Sparky: out at 2:52 PM (14:52), in at 12:00 AM (0:00):
- `diffMinutes = (0 * 60 + 0) - (14 * 60 + 52) = 0 - 892 = -892`
- `-892 < 0` → the `if (diffMinutes >= 0)` guard fails → `durationStr` stays empty `''`

**The computation doesn't handle overnight (cross-midnight) durations.** When `in_time` is earlier in the day than `out_time` (because it crossed midnight), the difference is negative and gets silently dropped.

**With 11:59 PM fix:**
- Sparky: out 2:52 PM (14:52), in 11:59 PM (23:59)
- `diffMinutes = (23*60+59) - (14*60+52) = 1439 - 892 = 547` → `9h 7m`
- This would produce a valid (if approximate) duration.

**The 6/23 rows also have blank duration** (Sparky out 4:11 PM, in 10:03 AM next day = negative). This is the same bug: the duration calc doesn't handle cross-midnight. The 11:59 PM change would prevent future auto-close cross-midnight, but the duration calc should also be fixed to handle `diffMinutes < 0` by adding 24 hours (1440 minutes) for overnight sessions.
