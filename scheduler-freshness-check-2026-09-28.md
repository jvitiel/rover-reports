# Scheduler Freshness Check — 2026-09-28

**Generated:** 2026-09-28 12:42 UTC (read-only diagnosis)

---

## 1. FEEDING ARCHIVE

### Database state

| Table | MAX(archived_at) | Column |
|-------|-------------------|--------|
| feeding_archive | 2026-09-28T04:00:05.991Z | archived_at |
| activity_archive | 2026-09-28T04:00:05.996Z | archived_at |

**3 most recent distinct archive dates (feeding_archive):** 2026-09-28, 2026-09-27, 2026-09-26

**3 most recent distinct archive dates (activity_archive):** 2026-09-28, 2026-09-27, 2026-09-26

### Job definition

**File:** `/home/shelter/shelter-apps/server/src/server.ts`

- **Function:** `runMidnightFeedingJob()` (line 12181)
- **Scheduler:** `scheduleMidnightFeedingJob()` (line 12679) — uses `setTimeout` to first midnight Eastern, then `setInterval` every 24h
- **Schedule:** Midnight Eastern Time (00:00 ET) daily
- **Archive behavior:** Archives dates older than the 2 most recent days (run-day creates new roster, archives day-before-yesterday's data)
- **Activity archive:** Also runs inside the same job — archives activity rows older than 7 days (line 12246)
- **Registered at startup:** Lines 12705–12706 call `scheduleMidnightFeedingJob()` and log initialization

### Log evidence (last 48h)

| Fire time (UTC) | Status | Created | Archived |
|-----------------|--------|---------|----------|
| Sep 26 04:00:05 | ✅ SUCCESS | 206 rows | 212 rows (from 2026-09-24) |
| Sep 27 04:00:05 | ✅ SUCCESS | 211 rows | 210 rows (from 2026-09-25) |
| Sep 28 04:00:05 | ✅ SUCCESS | 228 rows | 206 rows (from 2026-09-26) |

No errors logged for any feeding cron run in the 48h window.

### Verdict: **[VERIFIED: running]**

The feeding archive job fired successfully at midnight ET on all 3 nights (Sep 26, 27, 28). The most recent `archived_at` is 2026-09-28T04:00:05.991Z — today. The weekly health check showing "2d stale" likely used `date` column values (the date being archived was 2026-09-26, i.e., 2 days prior) rather than `archived_at`. The archive keeps only the 2 most recent days live, so the newest archived feeding date is always ≥2 days behind today by design.

---

## 2. VALIDATE TIMING — Two Other Jobs

### Activity Auto-Close (23:55 ET)

**Definition:** `scheduleActivityAutoClose()` at line 12412 — `setTimeout` to 23:55 ET, then `setInterval` 24h.

| Fire time (UTC) | Result |
|-----------------|--------|
| Sep 26 03:55:02 | 1 closed, 0 failed |
| Sep 27 03:55:02 | 3 closed, 0 failed |
| Sep 28 03:55:02–05 | 8 closed, 0 failed |

**Status:** ✅ Current — last ran 2026-09-28 03:55 UTC (8.7h ago)

### Adoptable Check (9:00 AM ET)

**Definition:** `scheduleDailyAdoptableCheck()` at line 12815 — `setTimeout` to next 9am ET, then `setInterval` 24h.

| Fire time (UTC) | Result |
|-----------------|--------|
| Sep 26 13:00:00 | No newly adoptable animals |
| Sep 27 13:00:00 | 1 newly adoptable (Panda), email sent |
| Sep 28 — | Not yet fired (9am ET = 13:00 UTC, ~20 min from now) |

**Status:** ✅ Current — fired on schedule Sep 26 & 27; Sep 28 run expected at 13:00 UTC

---

## 3. SCHEDULER HOST

**shelter-app process:**
- **SubState:** running
- **ActiveEnterTimestamp:** Thu 2026-09-24 18:10:36 UTC (uptime ~3.8 days)
- **PID:** 2023818 (consistent across all log entries in the 48h window — no restarts)

**Scheduler registration at startup:** The schedulers use `setTimeout`/`setInterval` patterns called at module load (lines 12705, 12709, 12713, 12840). They registered when the process started on Sep 24 and have been running continuously since. All scheduled jobs have fired on time in the 48h window.

**Errors in last 48h:**
- **Google Sheets API error** during auto-close on Sep 26 03:55:02 — gaxios error when writing activity log to Sheets. The auto-close itself succeeded (session closed in DB); only the Sheets write-back had an issue. Non-blocking.
- **Missing config file:** `shelter-policy-faq-small.json` ENOENT in Matcher module (Sep 26). Cosmetic — unrelated to scheduling.
- **No scheduler-level errors.** No `[Feeding Cron] Job failed`, `[Auto-Close] Job failed`, or unhandled exceptions related to scheduled jobs.

---

## Summary

All three checked schedulers are running correctly. The feeding archive "2d stale" report was a false alarm — the archive stores the *date of the data being archived*, which by design is always the day-before-yesterday. The `archived_at` timestamp confirms the job ran today at 04:00 UTC.
