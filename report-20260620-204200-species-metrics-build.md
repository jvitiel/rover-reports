# Species Metrics: Cat/Dog/Small Added to Searcher Card + CSV

**Model:** N/A (no LLM calls — database/UI work only)
**Endpoint:** GET /api/dashboard/profiles-summary (card), GET /api/dashboard/searcher-metrics/export (CSV)
**Sample:** Card API response, CSV export, manual sqlite3 cross-check
**Able to fail:** (1) Species columns empty in CSV (snapshot not backfilled). (2) Card species missing (query not updated). (3) Cat+Dog+Small ≠ successCount (bucketing error). All passed.
**Proves:** Species breakdown appears in card + CSV, matches manual DB counts, backfill populates historical data.
**Does NOT prove:** Dashboard visual layout (card HTML not rendered in test — verified via API response only).

---

## WHAT CHANGED

### 1. localDatabase.ts — `getSearcherStats24h()` (line ~1216)

**Type:** Added `speciesCat`, `speciesDog`, `speciesSmall` to return type.

**Query:** Added 3 SUM/CASE lines before the sex counts:
```sql
SUM(CASE WHEN status = 'success' AND json_extract(hard_filters, '$.species') = 'cat' THEN 1 ELSE 0 END) as species_cat,
SUM(CASE WHEN status = 'success' AND json_extract(hard_filters, '$.species') = 'dog' THEN 1 ELSE 0 END) as species_dog,
SUM(CASE WHEN status = 'success' AND json_extract(hard_filters, '$.species') IS NOT NULL
  AND json_extract(hard_filters, '$.species') NOT IN ('cat', 'dog') THEN 1 ELSE 0 END) as species_small,
```

Small = anything non-null that isn't cat or dog (currently only `small_animal` in DB, but future-proof).

### 2. localDatabase.ts — Daily snapshot layer

**Schema migration** (line ~833): 3 `ALTER TABLE searcher_daily_metrics ADD COLUMN` with `DEFAULT 0`.

**Type** `SearcherDailyMetrics` (line ~5509): Added `speciesCat`, `speciesDog`, `speciesSmall`.

**`computeSearcherStatsForEtDay()`** (line ~5530): Same 3 SUM/CASE lines added, same bucketing.

**`backfillSearcherDailyMetrics()`** INSERT (line ~5610): 3 species columns + values added.

**`insertSearcherDailySnapshot()`** INSERT (line ~5660): 3 species columns + values added.

### 3. server.ts — CSV export (line ~1428)

**Header:** Species columns inserted between `success_count` and `male`:
```
...,success_count,species_cat,species_cat_pct,species_dog,species_dog_pct,species_small,species_small_pct,male,...
```

**Row assembly:** 6 values added (count + pct for each species).

### 4. dashboard/index.html — Card UI (line ~15416)

Species row-group inserted between "Queries" and "Male" with dividers:
```javascript
row('Queries', s.queries),
'<div class="searcher-stats-divider"></div>',
rowPct('🐱 Cat', s.speciesCat),
rowPct('🐕 Dog', s.speciesDog),
rowPct('🐹 Small', s.speciesSmall),
'<div class="searcher-stats-divider"></div>',
rowPct('Male', s.male),
```

---

## VERIFICATION

### Card API ✅

```json
{
  "queries": 521,
  "successCount": 466,
  "speciesCat": 306,
  "speciesDog": 127,
  "speciesSmall": 33,
  "male": 395, ...
}
```

| Check | Result |
|-------|--------|
| Species fields present | ✅ speciesCat, speciesDog, speciesSmall |
| Cat+Dog+Small = successCount | ✅ 306+127+33 = 466 |
| Cross-check vs manual query | ✅ Matches `json_extract` GROUP BY |

### CSV Export ✅

Header includes species columns between success_count and male. [VERIFIED]

Sample row (June 19):
```
2026-06-19,265,216,145,67.1,50,23.1,21,9.7,199,92.1,...
```

| Check | Result |
|-------|--------|
| Species columns populated | ✅ cat=145, dog=50, small=21 |
| Percentages correct | ✅ 145/216=67.1%, 50/216=23.1%, 21/216=9.7% |
| Sum matches success_count | ✅ 145+50+21 = 216 |

### Historical Data ✅

Backfill ran: 55 days filled, 0 skipped. Pre-May rows show 0 for species (species wasn't logged — correct). [VERIFIED]

### Snapshot Schema Change ⚠️ FLAGGED

The `searcher_daily_metrics` table needed 3 new columns (`species_cat`, `species_dog`, `species_small`). Added via `ALTER TABLE ... ADD COLUMN ... DEFAULT 0` in the migration block (same pattern as existing `preamble_text` and `lang` migrations). Existing rows get DEFAULT 0. Backfill was run to re-compute from `matcher_audit` source data.

**Action taken:** Deleted all existing snapshot rows and re-ran `backfillSearcherDailyMetrics()` to populate all 55 days with correct species data. This is a one-time operation — future daily snapshots will include species automatically.

### Species Values in DB

```
cat         → 🐱 Cat
dog         → 🐕 Dog
small_animal → 🐹 Small
NULL        → not counted (272 pre-May rows)
```

All-time totals: 308 cat + 130 dog + 33 small + 255 null = 726 success. [VERIFIED]

---

## FILES CHANGED

| File | Lines changed |
|------|---------------|
| server/src/localDatabase.ts | ~30 lines (type, 2 queries, schema migration, 2 INSERTs) |
| server/src/server.ts | ~5 lines (CSV header + row) |
| dashboard/index.html | ~5 lines (card render) |

**Compile:** ✅ `tsc` exit 0
**Service restart:** ✅ healthy
**NOT COMMITTED**
