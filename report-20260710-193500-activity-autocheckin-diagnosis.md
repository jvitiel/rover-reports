# Activity Auto-Check-In Diagnosis

**Date:** 2026-07-10 19:35 ET  
**Requested by:** John  
**Scope:** Read-only diagnosis — why four animals appear checked out in staff-app Activity section  

---

## 1. The Four Records

**Table:** `active_sessions` (in-memory-equivalent SQLite table; rows exist only while an animal is checked out)

[VERIFIED: `SELECT * FROM active_sessions` — 4 rows returned]

| # | Animal | shelter_code | Species | Out Time | created_at (UTC) | Caregiver | Hours Open |
|---|--------|-------------|---------|----------|------------------|-----------|------------|
| 1 | Jennifur Lopez | W2026103 | cat | 11:20 AM | 2026-07-10T15:20:07Z | Leilani | 8.2h |
| 2 | Peanut Butter | R2025005 | small (rabbit) | 01:00 PM | 2026-07-10T17:00:27Z | Nova | 6.6h |
| 3 | Caramel | R2025003 | small (rabbit) | 01:00 PM | 2026-07-10T17:00:30Z | Nova | 6.6h |
| 4 | Nova | S2026045 | dog | 04:40 PM | 2026-07-10T20:40:58Z | Junior | 2.9h |

**Key columns:** `out_time` (time-only string, e.g. "11:20 AM"), `created_at` (full ISO-8601 UTC timestamp). There is no `status` column — presence in `active_sessions` = checked out; deletion from the table = checked in.

**All four sessions were created TODAY (July 10).** The oldest is 8.2 hours old, not hundreds. The `created_at` timestamps are unambiguous. [VERIFIED]

---

## 2. The Auto-Check-In Job

**YES, it exists.** It's an in-process `setTimeout` → `setInterval` job inside `server.ts`, NOT a system cron.

**Name in source:** `runActivityAutoClose()` / `scheduleActivityAutoClose()`  
**Location:** `server.ts` lines 12369–12432  
**Schedule:** Fires at **11:55 PM Eastern Time** daily  
**Mechanism:** On startup, calculates ms until next 23:55 ET via `msUntil2355Eastern()`, sets a one-shot `setTimeout`, then chains a 24-hour `setInterval` for subsequent days.

### What the job does (exact logic):

```typescript
async function runActivityAutoClose(): Promise<void> {
  const db = getDatabase();
  const openSessions = db.prepare(
    `SELECT id, animal_name, shelter_code FROM active_sessions`
  ).all();

  for (const sess of openSessions) {
    const result = await closeActiveSession(sess.id, 'System (midnight auto-close)');
    // ... logging ...
  }
}
```

**Selection criteria:** `SELECT id, animal_name, shelter_code FROM active_sessions` — i.e., **ALL rows in the table, unconditionally.** No species filter, no time filter, no status filter. Every open session gets closed. [VERIFIED: source code]

**`closeActiveSession()` does:**
1. Reads the full session row
2. Calculates `in_time` as current ET wall-clock time (will be "11:55 PM")
3. Calculates duration from `out_time` → `in_time`
4. **Deletes the row from `active_sessions`**
5. Inserts a completed record into `daily_activities` (SQLite) with today's date
6. Writes to Google Sheets (dual-write, failure non-blocking)
7. Logs `[SharedSessions] Ended: System (midnight auto-close) checked in <animal>`

[VERIFIED: source code, server.ts lines 8118–8235]

### Separate jobs:
- **Activity auto-close (23:55 ET)** — this one, closes all active_sessions
- **Midnight feeding job (00:00 ET)** — archives daily_feeding records, unrelated to activity sessions
- **Volunteer timeclock auto-close** — external cron POSTing to `/api/volunteers/timeclock/auto-close` every hour, separate system

---

## 3. Why These Four Survived

**They didn't survive a missed close. They were checked out TODAY, and the job hasn't fired yet tonight.**

Timeline:
- **Last auto-close run:** 2026-07-10 03:55:01 UTC = **July 9 at 11:55 PM ET** ✓
- **Result:** 14 sessions closed, 0 failed [VERIFIED: journal `[Auto-Close 23:55] Summary: 14 closed, 0 failed, of 14 open sessions`]
- **Animals closed included:** Callie Rabbit, Cookies and Cream, Electra, Mambo, Gigi, Bean, Achilles, and 7 others
- **These four sessions created:** July 10 between 11:20 AM – 4:40 PM ET (AFTER the last auto-close)
- **Next auto-close fires:** July 11 03:55 UTC = **July 10 at 11:55 PM ET** (in ~4.3 hours from diagnosis time)

**Root cause: there is no bug.** The job runs once daily at 11:55 PM ET. These animals were checked out during today's daytime and will be auto-closed tonight. The "hundreds of hours" duration John reported does not match the database — the oldest session is 8.2 hours. Possible explanations for the discrepancy:
- The staff-app UI may be displaying something that looks like a longer duration (unlikely — client code uses `Date.now() - new Date(created_at).getTime()`, which should be accurate) [VERIFIED: app.js line 1176-1179]
- John may have been estimating or describing a different view

[VERIFIED: all timestamps from SELECT + journalctl]

---

## 4. Is the Job Running?

**YES — confirmed firing and succeeding.**

| Date (ET) | Fire Time (UTC) | Sessions Closed | Failures | Evidence |
|-----------|----------------|-----------------|----------|----------|
| Jul 9 | 03:55:01 Jul 10 | 14 | 0 | journal: `Summary: 14 closed, 0 failed` |
| Jul 8 | 03:55 Jul 9 | 1 (Panko) | 0 | journal: `Closed session for Panko (W2026060)` |

Service has been running continuously since 2026-07-08 21:25:57 UTC (2 days). On startup, the scheduling log says: `[Auto-Close] Scheduling next run in 6.48 hours (23:55 Eastern)`. [VERIFIED: journalctl]

**Side issue discovered:** The Google Sheets "Dog Activity" tab has hit its 1000-row limit. Every auto-close of a dog session logs a Sheets error: `Range ('Dog Activity'!A1001:T1001) exceeds grid limits. Max rows: 1000`. The SQLite close succeeds (code catches Sheets errors and continues), so the auto-close itself is unaffected — but the Sheets dual-write for dog activities is silently failing. Cat Activity and Small Animal tabs may also be approaching this limit. [VERIFIED: journal error at 03:55:01-03:55:02 Jul 10]

Historical auto-close counts from `daily_activities` (caregiver_in = 'System (midnight auto-close)'):

| Date | Auto-Closed Count |
|------|-------------------|
| 2026-07-09 | 14 |
| 2026-07-08 | 1 |
| 2026-07-07 | 1 |
| 2026-07-06 | 1 |
| 2026-07-04 | 8 |
| 2026-07-03 | 9 |

[VERIFIED: SELECT from daily_activities]

---

## 5. Scope: All Open Activities

**Currently open sessions in `active_sessions`:** 4 (the four listed above — all from today) [VERIFIED]

**Sessions open > 24 hours:** 0  
**Sessions open > 100 hours:** 0  

There are no orphaned or stuck sessions. The table contains only today's legitimate checkouts. [VERIFIED: SELECT shows 4 rows, all with created_at on 2026-07-10]

**`daily_activities` table:** 975 rows total, all have `in_time` populated (none are "open"). [VERIFIED]

---

## Summary

1. **The auto-close job exists and works correctly.** It runs at 11:55 PM ET daily as an in-process setTimeout/setInterval in server.ts. It selects ALL rows from `active_sessions` unconditionally and closes each one via `closeActiveSession()`.

2. **These four animals are normal same-day sessions.** They were checked out today between 11:20 AM and 4:40 PM ET. The job hasn't fired tonight yet (fires in ~4 hours). There is no bug — they will be closed at 11:55 PM ET.

3. **The "hundreds of hours" duration does not match the data.** The longest-open session is 8.2 hours. This may be a UI misread or a different observation than what's in the database.

4. **Side issue: Google Sheets Dog Activity tab is full** (1000 rows). Sheets dual-write for dog auto-closes is failing silently. SQLite records are unaffected.
