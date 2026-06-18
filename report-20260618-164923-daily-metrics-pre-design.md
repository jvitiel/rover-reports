# Pre-Design Diagnosis: Daily Metrics Snapshot + 365-Day CSV Export

**Date:** 2026-06-18 16:49 ET  
**Production modified:** NO. Read-only diagnosis. [VERIFIED]

---

## Task 1: Rolling Window, Not a Daily Reset

### The query (`localDatabase.ts:1232`)

```sql
FROM matcher_audit
WHERE created_at > datetime('now', '-24 hours')
```

This is a **rolling 24-hour window** anchored at the moment the query runs. There is no daily reset, no midnight rollover, no clock-aligned bucket. [VERIFIED]

### Any reset/truncation/rollover anywhere?

Searched for:
- `DELETE FROM matcher_audit` — **none** [VERIFIED]
- `TRUNCATE matcher_audit` — **none** [VERIFIED]
- Any cron, scheduled task, or interval that clears/archives matcher_audit — **none** [VERIFIED]
- Any TTL, retention, or prune logic on matcher_audit — **none** [VERIFIED]

**Conclusion: There is no daily reset. The widget is purely a rolling window. matcher_audit rows are retained forever.** [VERIFIED]

---

## Task 2: Scheduled-Job Infrastructure

### Pattern: `setTimeout` to target time + `setInterval` for 24h repeat

The app uses a consistent in-process scheduling pattern. No `node-cron`, no external job runner, no systemd timers for these tasks. Each job calculates ms-until-target-time, sets a `setTimeout`, then inside it starts a `setInterval(fn, 24*60*60*1000)`.

### All daily scheduled jobs

| Job | Target time | Schedule function | File:line |
|---|---|---|---|
| Midnight Feeding | Midnight ET | `scheduleMidnightFeedingJob()` | `server.ts:11181` |
| SM Photo Sync | 2:00am ET | `scheduleNightlySMPhotoSync()` | `server.ts:11154` |
| Adoptable Alert | 9:00am ET | `scheduleDailyAdoptableCheck()` | `server.ts:11306` |
| Generic Bio | 9:30am ET | `scheduleGenericBioJob()` | `server.ts:11630` |
| Deadline Reminders | Every 1 hour | `setInterval(checkDeadlineReminders, 60*60*1000)` | `server.ts:10768` |
| Dog Walker Cache | Every `AVAILABLE_CACHE_TTL` | `setInterval(refreshAvailableDogsCache, TTL)` | `server.ts:5528` |

[VERIFIED — all quoted from source]

### Midnight Eastern helper (`server.ts:11000-11016`)

```typescript
function msUntilMidnightEastern(): number {
  const now = new Date();
  const easternNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const midnightEastern = new Date(easternNow);
  midnightEastern.setDate(midnightEastern.getDate() + 1);
  midnightEastern.setHours(0, 0, 0, 0);
  const easternOffset = easternNow.getTime() - now.getTime();
  const targetUtc = midnightEastern.getTime() - easternOffset;
  return targetUtc - now.getTime();
}
```
[VERIFIED]

### External crontab

**shelter user:** no crontab (`no crontab for shelter`). [VERIFIED]

**root crontab** has one shelter-related entry:
```
0 6 * * * sudo -u shelter python3 /home/shelter/shelter-apps/scripts/score-profiles.py >> /home/shelter/logs/score-profiles.log 2>&1
```
(profile scoring at 6am UTC / 2am ET) [VERIFIED]

### Recommendation for the daily snapshot

A new daily job should follow the existing in-process pattern: add a `scheduleDailyMetricsSnapshot()` function using the same `setTimeout` → `setInterval(fn, 24h)` idiom. **The natural time is just before midnight ET** so the snapshot captures the full calendar day (ET) that's about to end.

Alternatively, the snapshot could run at e.g. 11:55pm ET and bucket the day as `date(created_at, '-5 hours')` (ET day boundary). The point is that the snapshot must use calendar-day bucketing, not a rolling window.

---

## Task 3: matcher_audit Retention

### No deletion, pruning, or archival exists

- `DELETE FROM matcher_audit` — not found anywhere in the codebase. [VERIFIED]
- No TTL, no prune cron, no archive logic. [VERIFIED]

### Current data extent

| Metric | Value |
|---|---|
| Total rows | **271** |
| Earliest `created_at` | `2026-04-26T22:22:31.093Z` |
| Latest `created_at` | `2026-06-18T20:21:03.310Z` |
| Span | **53 days** (Apr 26 – Jun 18, 2026) |
| Days with data | **14** (sparse — many days have 0 queries) |

[VERIFIED — queried from live DB]

### Per-day row counts

```
2026-04-26 |  6 (6 ok)
2026-04-27 | 25 (25 ok)
2026-04-28 | 22 (22 ok)
2026-04-29 | 60 (57 ok)
2026-04-30 | 69 (65 ok)
2026-05-01 | 16 (16 ok)
2026-05-02 |  3 (3 ok)
2026-05-04 |  1 (1 ok)
2026-05-11 |  3 (3 ok)
2026-05-21 |  1 (1 ok)
2026-05-24 |  8 (6 ok)
2026-05-28 |  5 (5 ok)
2026-05-29 | 26 (19 ok)
2026-06-18 | 26 (25 ok)
```

**40 days with zero queries** (no rows). [VERIFIED]

### Backfill feasibility

Since all 271 rows are retained, a daily snapshot table **CAN be backfilled from existing data** for the 14 days that have rows. Days with zero queries would get a row with all counts = 0 (or be omitted). The backfill would use `date(created_at)` grouping (see Task 4 for timezone bucketing).

Note: `lang` is NULL for all rows before today's deploy (`2c8b5ea`). Backfilled lang counts would be 0 for historical days. [VERIFIED]

---

## Task 4: created_at Format + Day-Bucketing

### Format

```
2026-04-26T22:22:31.093Z
```

ISO-8601 with `Z` suffix = **UTC**. [VERIFIED — generated by `new Date().toISOString()` at `localDatabase.ts:5012`]

### Day-bucketing

`date(created_at)` in SQLite extracts `YYYY-MM-DD` from the ISO string, giving **UTC calendar days**. [VERIFIED]

### Timezone issue

The shelter operates in Eastern Time (ET = UTC-5/UTC-4). A query at 11pm ET on June 18 has `created_at` of June 19 01:00 UTC. With `date(created_at)`, it buckets into June 19 UTC, which is "wrong" from the operator's perspective (they'd consider it a June 18 query).

**For ET-aligned day boundaries, use:**
```sql
date(created_at, '-4 hours')   -- EDT (summer)
date(created_at, '-5 hours')   -- EST (winter)
```

Or more robustly, store the ET date as a string at snapshot time (the snapshot job knows what ET day it's closing).

**Recommendation:** The daily snapshot job runs at ~11:55pm ET, computes metrics for `WHERE created_at >= '<start-of-day-utc>' AND created_at < '<end-of-day-utc>'` using explicitly computed UTC boundaries for that ET calendar day, and stores `snapshot_date = 'YYYY-MM-DD'` (ET). This avoids SQLite timezone arithmetic entirely. [INFERRED]

---

## Task 5: Existing CSV-Export Pattern

### No CSV export exists anywhere in the codebase

Searched for `text/csv`, `.csv`, `csv export`, `export csv` in server and dashboard — **zero matches**. [VERIFIED]

### Existing file-download patterns

The app does serve downloadable files via `Content-Disposition: attachment`:

**PDF downloads (`server.ts:2942`):**
```typescript
'Content-Disposition': `attachment; filename="${filename}"`,
```

**Intake attachments (`server.ts:9932`, `10113`):**
```typescript
res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_filename}"`);
```

**These are all binary file passes, not generated content.** No precedent for server-side CSV generation exists. [VERIFIED]

### Recommendation

Two options:
1. **Server-side CSV endpoint:** `GET /api/dashboard/searcher-metrics/export?days=365` → `Content-Type: text/csv`, `Content-Disposition: attachment; filename="searcher-metrics-YYYY-MM-DD.csv"`. Server queries snapshot table, formats CSV, streams.
2. **Client-side generation:** Dashboard JS fetches JSON from a metrics API, builds CSV string, creates Blob, triggers download via `URL.createObjectURL()`.

Option 1 is cleaner for large datasets and follows the existing Content-Disposition pattern (closest match). [INFERRED]

---

## Task 6: Fields to Snapshot

### Full `getSearcherStats24h()` return type (post-lang, `localDatabase.ts:1194-1202`)

```typescript
{
  queries: number;           // COUNT(*) — all traffic including failures
  successCount: number;      // SUM(status='success') — denominator for %
  male: number;              // inclusion count (success only)
  female: number;            // inclusion count (success only)
  young: number;             // inclusion count (success only)
  adult: number;             // inclusion count (success only)
  senior: number;            // inclusion count (success only)
  langEn: number;            // count where lang='en' AND success
  langEs: number;            // count where lang='es' AND success
  preambleLowConfidence: number;  // low_confidence=1 AND candidate_count>=4
  preambleLowThreshold: number;   // low_confidence=0 AND candidate_count<4
  preambleBoth: number;           // low_confidence=1 AND candidate_count<4
  preamblePct: number;       // DERIVED: preambleTotal / successCount * 100
  errors: number;            // count where status != 'success'
  errorPct: number;          // DERIVED: errors / total * 100
  avgResponseTimeSec: number; // DERIVED: AVG(response_time_ms where success) / 1000
}
```

[VERIFIED — quoted from source]

### Classification: counts vs derived

| Field | Type | Store in snapshot? |
|---|---|---|
| queries | count | ✅ Yes — total traffic |
| successCount | count | ✅ Yes — denominator |
| male | count | ✅ Yes |
| female | count | ✅ Yes |
| young | count | ✅ Yes |
| adult | count | ✅ Yes |
| senior | count | ✅ Yes |
| langEn | count | ✅ Yes |
| langEs | count | ✅ Yes |
| preambleLowConfidence | count | ✅ Yes |
| preambleLowThreshold | count | ✅ Yes |
| preambleBoth | count | ✅ Yes |
| preamblePct | derived % | ❌ No — recompute from counts |
| errors | count | ✅ Yes |
| errorPct | derived % | ❌ No — recompute from counts |
| avgResponseTimeSec | derived avg | ⚠️ Store as `total_response_time_ms` + `successCount` for exact recomputation, OR store the rounded avg (simpler, loses precision) |

**Candidate snapshot columns (13 counts + 1 avg):**
`snapshot_date`, `queries`, `success_count`, `male`, `female`, `young`, `adult`, `senior`, `lang_en`, `lang_es`, `preamble_low_confidence`, `preamble_low_threshold`, `preamble_both`, `errors`, `avg_response_time_sec`

Percentages are NOT stored — recomputed at export/display time from counts + denominator. [INFERRED]

---

## Summary

| Question | Answer |
|---|---|
| Daily reset? | **No.** Rolling 24h window, no reset anywhere. [VERIFIED] |
| Rows ever deleted? | **No.** 271 rows retained since Apr 26. [VERIFIED] |
| Backfill possible? | **Yes.** 14 days with data can be backfilled from raw rows. [VERIFIED] |
| Job scheduler? | In-process `setTimeout` → `setInterval(24h)`. 4 daily jobs exist. [VERIFIED] |
| Best hook time? | ~11:55pm ET (just before midnight, captures full ET day). [INFERRED] |
| Timezone for buckets? | `created_at` is UTC; day boundaries need ET offset. Snapshot job should compute UTC bounds for each ET day. [VERIFIED] |
| CSV precedent? | **None.** Server Content-Disposition pattern exists for binary files. [VERIFIED] |
| Fields to store | 13 counts + 1 avg. Skip derived percentages. [INFERRED] |
