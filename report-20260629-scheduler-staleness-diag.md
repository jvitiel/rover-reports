# Scheduler Staleness Diagnosis — 2026-06-29

## Finding 1 — Activity Auto-Close: LEGITIMATELY QUIET ✅

### Evidence

**MAX(date) FROM activity_archive = 2026-06-21** — confirmed, with continuous daily entries leading up to it:

```
2026-06-21|162
2026-06-20|174
2026-06-19|158
2026-06-18|166
...continuous daily back to at least June 8
```

### Root cause: 7-day retention window, not staleness

The activity auto-close system has **two stages**:

1. **23:55 ET — `runActivityAutoClose()`** (server.ts:12242): closes all `active_sessions` (sets in_time, computes duration). This writes to `daily_activities`, NOT `activity_archive`.

2. **Midnight ET — `archiveActivitiesOlderThan(7)`** (localDatabase.ts:4382, called from feeding cron at server.ts:12120): moves `daily_activities` rows **older than 7 days** into `activity_archive`.

Today is June 29. Cutoff = June 29 − 7 = June 22. Activities dated June 22 and newer are still in `daily_activities` (waiting). The last batch archived was June 21's activities (moved last night).

**`daily_activities` confirms the pipeline is full and healthy:**
```
2026-06-29|189
2026-06-28|179
2026-06-27|166
2026-06-26|196
...back to 2026-06-22|148
```

**Journal logs confirm both schedulers are running:**
```
Jun 29 04:00:00 [Feeding Cron] Starting midnight feeding roster job...
Jun 29 04:00:01 [Feeding Cron] Archived 196 rows from 2026-06-27
Jun 29 04:00:01 [Activity Cron] Archived 162 activity rows older than 7 days
```

### Verdict: NOT DEAD. The archive lag is always 7 days by design.

The `activity_archive.MAX(date)` will always be ~7-8 days behind today. This is the expected behavior of `archiveActivitiesOlderThan(7)`.

---

## Finding 2 — Generic Bio + Searcher Snapshot "unknown": WRONG COLUMN NAMES 🐛

### animal_bios

Health-check query: `SELECT MAX(created_at) FROM animal_bios`
**Bug:** Column does not exist. The correct column is **`generated_at`**.

```
PRAGMA table_info(animal_bios):
0|id|TEXT|0||1
1|generated_at|TEXT|1||0    ← this one
...
(no created_at column)
```

SQLite silently returns NULL for non-existent column names. MAX(NULL) → empty → "unknown".

**Correct query:** `SELECT MAX(generated_at) FROM animal_bios`
**Actual value:** `2026-06-29T13:30:00.026Z` (today — scheduler is healthy)

### searcher_daily_metrics

Health-check query: `SELECT MAX(date) FROM searcher_daily_metrics`
**Bug:** Column does not exist. The correct column is **`snapshot_date`**.

```
PRAGMA table_info(searcher_daily_metrics):
0|snapshot_date|TEXT|0||1    ← this one
...
(no date column)
```

**Correct query:** `SELECT MAX(snapshot_date) FROM searcher_daily_metrics`
**Actual value:** `2026-06-28` (yesterday — scheduler is healthy)

### Fix for both

In health-check.sh, change:
```bash
# animal_bios: created_at → generated_at
BIO_MAX=$(sudo -u shelter sqlite3 "$DB" "SELECT MAX(generated_at) FROM animal_bios;" ...)

# searcher_daily_metrics: date → snapshot_date
SEARCHER_MAX=$(sudo -u shelter sqlite3 "$DB" "SELECT MAX(snapshot_date) FROM searcher_daily_metrics;" ...)
```

---

## Finding 3 — Activity Archive Threshold: NEEDS REDESIGN, NOT JUST A NUMBER CHANGE

The current threshold (>9 days) was set assuming `activity_archive` receives daily writes. It does — but with a **built-in 7-day lag**.

The archive will always be ~7-8 days stale. A >9 day threshold means the auto-close would need to be dead for **2+ days** before alerting. A >3 day threshold (matching feeding) would **always fire** (false positive every week).

**Recommendation:** Change the freshness check target from `activity_archive` to `daily_activities`:

```sql
SELECT MAX(date) FROM daily_activities
```

This table receives writes every day at 23:55 ET (auto-close) and midnight (new roster). With a >2 day threshold, this accurately detects a dead scheduler without the 7-day lag confusion.

Alternatively, keep the activity_archive check but set threshold to `>10 days` (7-day lag + 3-day grace), though this is fragile and confusing.

---

## Finding 4 — volunteer_declines empty: BENIGN ✅

`volunteer_declines` stores volunteer shift-availability preferences (declined day+hour slots). Schema: `(volunteer_id, day_of_week, hour)` with INSERT/DELETE operations in localDatabase.ts. Zero rows means no volunteers have declined specific time slots yet. The feature exists but hasn't been used. **Benign — not broken.**

---

*Read-only diagnosis. No files modified. Generated 2026-06-29 21:10 UTC.*
