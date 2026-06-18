# Daily Searcher Metrics Snapshot — DEPLOYED (Stage 1 of 2)

**Date:** 2026-06-18 17:11 ET  
**Commit:** `624c012` — 2 files, +290/-0. [VERIFIED]  
**Build:** Clean (tsc, zero errors). [VERIFIED]  
**Service:** `shelter-app` active after restart. [VERIFIED]  
**Status:** **DEPLOYED-AND-LIVE.**  
**Rollback:** `git revert 624c012` + rebuild + restart. Table can be dropped or left (harmless).

---

## Changes Made

### Change 1: Table DDL (`localDatabase.ts:834-852`)

```sql
CREATE TABLE IF NOT EXISTS searcher_daily_metrics (
  snapshot_date TEXT PRIMARY KEY,   -- ET calendar day 'YYYY-MM-DD'
  queries INTEGER,
  success_count INTEGER,
  male INTEGER, female INTEGER,
  young INTEGER, adult INTEGER, senior INTEGER,
  lang_en INTEGER, lang_es INTEGER,
  preamble_low_confidence INTEGER, preamble_low_threshold INTEGER, preamble_both INTEGER,
  errors INTEGER,
  avg_response_time_sec REAL,
  created_at TEXT
)
```
[VERIFIED]

### Change 2: ET-Bounds Computation (`localDatabase.ts`, `etDayToUtcBounds()`)

```typescript
function etDayToUtcBounds(etDateString: string): { startUtc: string; endUtc: string } {
  const [year, month, day] = etDateString.split('-').map(Number);
  // Use toLocaleString timezone trick to get ET offset (handles EST/EDT automatically)
  const startGuess = new Date(Date.UTC(year, month - 1, day, 5, 0, 0));
  const startEtStr = startGuess.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const startEt = new Date(startEtStr);
  const offsetMs = startEt.getTime() - startGuess.getTime();
  const midnightEtAsLocal = new Date(year, month - 1, day, 0, 0, 0, 0);
  const startUtcMs = midnightEtAsLocal.getTime() - offsetMs;
  // Recompute offset for next day (handles DST transitions at boundary)
  const endGuess = new Date(Date.UTC(year, month - 1, day + 1, 5, 0, 0));
  const endEtStr = endGuess.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const endEt = new Date(endEtStr);
  const endOffsetMs = endEt.getTime() - endGuess.getTime();
  const nextDayEtAsLocal = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  const endUtcMs = nextDayEtAsLocal.getTime() - endOffsetMs;
  return {
    startUtc: new Date(startUtcMs).toISOString(),
    endUtc: new Date(endUtcMs).toISOString(),
  };
}
```

**Boundary example:** Apr 29 2026 is EDT (UTC-4).
- Start: `2026-04-29T04:00:00.000Z` (midnight ET = 4am UTC)
- End: `2026-04-30T04:00:00.000Z` (next midnight ET)
- Query: `WHERE created_at >= '2026-04-29T04:00:00.000Z' AND created_at < '2026-04-30T04:00:00.000Z'`

[VERIFIED — spot-check counts match direct query with these bounds]

### Change 3: Backfill (`backfillSearcherDailyMetrics()`)

- Iterates from earliest matcher_audit ET date through yesterday (ET).
- Skips days already in the table (idempotent).
- Zero-query days get zero-count rows.
- Called once on boot after `initDatabase()`.

### Change 4: Daily Job (`scheduleDailySearcherSnapshot()`, `server.ts`)

- Fires at **00:10 ET** daily (10 minutes after midnight feeding job).
- Uses same `setTimeout` → `setInterval(24h)` pattern as other daily jobs.
- Snapshots yesterday's ET date via `insertSearcherDailySnapshot()`.
- Logs next-run time on schedule, logs date written on each run.

---

## Verification

### Table + backfill

| Metric | Value |
|---|---|
| Rows | **53** |
| Earliest | `2026-04-26` |
| Latest | `2026-06-17` |
| Today (Jun 18) | **NOT present** (correct — incomplete day) |

[VERIFIED]

### Boot logs

```
[Searcher Snapshot] Backfill complete: 53 filled, 0 skipped, 53 total days
[Searcher Snapshot] Daily job scheduled in 7.01 hours (00:10 ET)
```
[VERIFIED]

### Zero-query day (May 3, no matcher_audit rows)

```
snapshot_date: 2026-05-03
queries: 0, success_count: 0, male: 0, female: 0, young: 0, adult: 0, senior: 0
lang_en: 0, lang_es: 0, preamble_*: 0, errors: 0, avg_response_time_sec: 0.0
```
[VERIFIED]

### Spot-check #1: Apr 29 (heavy day)

| Field | Snapshot | Direct query |
|---|---|---|
| queries | 46 | 46 |
| success_count | 43 | 43 |
| male | 24 | 24 |
| female | 26 | 26 |
| errors | 3 | 3 |
| avg_response_time_sec | 20.0 | 19.96 (rounded) |

**Note:** UTC-bucketed Apr 29 had 60 rows; ET-bucketed has 46. The difference is late-night ET queries that UTC assigns to Apr 29 but ET assigns to Apr 28. This is correct behavior — the snapshot uses ET day boundaries. [VERIFIED]

### Spot-check #2: Apr 30

| Field | Snapshot | Direct query |
|---|---|---|
| queries | 59 | 59 |
| success_count | 57 | 57 |
| male | 27 | 27 |
| female | 34 | 34 |
| errors | 2 | 2 |

[VERIFIED]

### Idempotency (second boot)

```
[Searcher Snapshot] Backfill complete: 0 filled, 53 skipped, 53 total days
```
Row count still 53. No duplicates, no errors. [VERIFIED]

### Search behavior unchanged

Response shape identical: `candidateCount`, `lowConfidence`, `matches` (3), `preamble`. [VERIFIED]

### Existing jobs untouched

Midnight feeding, SM photo sync, adoptable alert, generic bio — all still registered (no code changes to their functions). [VERIFIED]

---

## Summary

53 days of daily metrics backfilled from existing matcher_audit data (Apr 26 – Jun 17). ET-aware day boundaries handle EST/EDT automatically. Zero-query days included with zero counts. Daily job at 00:10 ET will snapshot yesterday going forward. Stage 2 (CSV export button) is the remaining piece.
