# Searcher Metrics CSV Export + Dashboard Button — DEPLOYED (Stage 2 of 2)

**Date:** 2026-06-18 17:20 ET  
**Commit:** `6ed5617` — 2 files, +67/-1. [VERIFIED]  
**Build:** Clean (tsc, zero errors). [VERIFIED]  
**Service:** `shelter-app` active after restart. [VERIFIED]  
**Status:** **DEPLOYED-AND-LIVE.**  
**Rollback:** `git revert 6ed5617` + rebuild + restart.

---

## Changes Made

### Change 1: CSV Export Endpoint (`server.ts`)

```typescript
app.get('/api/dashboard/searcher-metrics/export', (_req: Request, res: Response) => {
  // Queries searcher_daily_metrics for last 365 days (ET cutoff)
  // Outputs CSV with header + recomputed percentages
  // Content-Type: text/csv; charset=utf-8
  // Content-Disposition: attachment; filename="searcher-metrics-YYYY-MM-DD.csv"
});
```

**Percentage recomputation:**
- Filter/lang/preamble percentages: `count / success_count * 100` (matches widget denominator). [VERIFIED]
- Error percentage: `errors / queries * 100` (matches widget's Errors%). [VERIFIED]
- Divide-by-zero guard: returns `0` when denominator is 0. [VERIFIED]
- Precision: 1 decimal place (Math.round(x * 1000) / 10), matching widget's preamblePct/errorPct format. [VERIFIED]

### Change 2: Dashboard Button (`dashboard/index.html:5302-5306`)

```html
<div style="margin-top: 12px;">
  <a href="/api/dashboard/searcher-metrics/export" class="btn-upload-library"
     style="text-decoration:none; display:inline-flex; background:#5171A5; margin-left:0;">
    📥 Searcher Metric History Download (CSV)
  </a>
</div>
```

- Placed below the profiles table, inside `profiles-main` (left column). [VERIFIED]
- Uses `btn-upload-library` class (existing dashboard button style) with blue color override. [VERIFIED]
- `<a href=...>` — browser follows Content-Disposition and downloads as .csv file. [VERIFIED]

### Change 3: Card Retitle (`dashboard/index.html:5323`)

```html
<h3>🔍 Searcher Usage Metrics (past 24h)</h3>
```

Changed from `Searcher (24h)`. Title text only — no metrics/layout change inside. [VERIFIED]

---

## Verification

### Response Headers

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="searcher-metrics-2026-06-18.csv"
```
[VERIFIED]

### CSV Header + Sample Rows

```csv
date,queries,success_count,male,male_pct,female,female_pct,young,young_pct,adult,adult_pct,senior,senior_pct,lang_en,lang_en_pct,lang_es,lang_es_pct,preamble_low_confidence,preamble_low_threshold,preamble_both,preamble_pct,errors,error_pct,avg_response_time_sec
2026-04-26,18,18,9,50,12,66.7,5,27.8,8,44.4,10,55.6,0,0,0,0,0,0,0,0,0,0,0
2026-04-29,46,43,24,55.8,26,60.5,29,67.4,17,39.5,12,27.9,0,0,0,0,5,2,1,18.6,3,6.5,20
2026-05-03,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
```
[VERIFIED]

### Row Count

53 data rows (Apr 26 – Jun 17). Header + 53 data = 54 lines. [VERIFIED]

### Spot-Check: Apr 29

| Field | CSV | Snapshot table | Match? |
|---|---|---|---|
| queries | 46 | 46 | ✅ |
| success_count | 43 | 43 | ✅ |
| male | 24 | 24 | ✅ |
| male_pct | 55.8 | 24/43*100=55.81 | ✅ (rounded) |
| female | 26 | 26 | ✅ |
| errors | 3 | 3 | ✅ |
| error_pct | 6.5 | 3/46*100=6.52 | ✅ (rounded) |
| avg_response_time_sec | 20 | 20.0 | ✅ |

[VERIFIED]

### Zero-Query Day (May 3)

```
2026-05-03,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
```

All zeros — no NaN, no Infinity. [VERIFIED]

### Today NOT in CSV

Last row is `2026-06-17`. Jun 18 excluded (incomplete day, not yet snapshotted). [VERIFIED]

### Dashboard Loads

`/api/dashboard/profiles-summary` returns 200. [VERIFIED]

### Search Behavior Unchanged

No matcher/search code modified. [VERIFIED]

---

## Stage 1 + Stage 2 Complete

The full daily-metrics pipeline is now live:

1. **Stage 1** (commit `624c012`): `searcher_daily_metrics` table + `computeSearcherStatsForEtDay()` + idempotent backfill on boot + daily 00:10 ET snapshot job.
2. **Stage 2** (commit `6ed5617`): `GET /api/dashboard/searcher-metrics/export` CSV endpoint + dashboard download button + card retitle.

**Data flow:** matcher_audit rows → 00:10 ET daily job → searcher_daily_metrics → CSV export endpoint → dashboard download button → operator's spreadsheet.
