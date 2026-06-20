# Diagnosis: Adding Species to Searcher Usage Metrics Card + CSV

## LEAD ANSWERS

**(2) Is the species filter currently logged per query?**
**YES** — species is stored in `hard_filters` JSON column of `matcher_audit` table. Historical data exists: 364 cat, 129 dog, 34 small_animal, 272 NULL (early rows before species was logged). Species can be shown including historical data via `json_extract(hard_filters, '$.species')`. [VERIFIED — `sudo -u shelter sqlite3 ... GROUP BY species`]

**(3) Are sex/age filter-based?**
**YES** — Male/Female and Young/Adult/Senior counts are extracted from the user's FILTER settings stored in `hard_filters` JSON, using `json_each(hard_filters, '$.sex')` and `json_each(hard_filters, '$.ageGroup')`. Species would use the same basis: `json_extract(hard_filters, '$.species')`. [VERIFIED — localDatabase.ts:1231-1244]

---

## 1. THE METRICS CARD: Data Source

**Function:** `getSearcherStats24h()` at localDatabase.ts:1216
**Query:** Single SELECT on `matcher_audit WHERE created_at > datetime('now', '-24 hours')` (localDatabase.ts:1226-1256)
**Table:** `matcher_audit`

Existing breakdowns computed via:
- Sex: `json_each(hard_filters, '$.sex') WHERE value = 'male'/'female'` (localDatabase.ts:1231-1234) [VERIFIED]
- Age: `json_each(hard_filters, '$.ageGroup') WHERE value = 'young'/'adult'/'senior'` (localDatabase.ts:1235-1244) [VERIFIED]
- Language: `lang` column (localDatabase.ts:1245-1246) [VERIFIED]
- Preamble: `low_confidence` + `candidate_count` columns (localDatabase.ts:1247-1249) [VERIFIED]

**API endpoint:** `GET /api/dashboard/profiles` at server.ts:1332 — calls `getSearcherStats24h()`, returns result as `searcherStats` field in response JSON (server.ts:1391). [VERIFIED]

## 2. WHAT'S LOGGED PER QUERY

**Insert function:** `writeMatcherAudit()` at localDatabase.ts:5044
**INSERT statement:** localDatabase.ts:5049-5068 [VERIFIED]

```typescript
INSERT INTO matcher_audit (id, created_at, hard_filters, narrative, result_shelter_codes, result_bios,
  rejected_codes, input_profiles,
  status, error_class, error_message, candidate_count, response_time_ms, input_tokens, output_tokens,
  low_confidence, preamble_shown, preamble_text, lang)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

`hard_filters` (column 3) is `JSON.stringify(entry.hardFilters)` — contains `{"species":"cat","sex":["male","female"],"ageGroup":["young","adult","senior"]}`. [VERIFIED — queried actual rows]

**Species IS captured:** `$.species` field in `hard_filters` JSON. Available for all rows where species was set at query time. 272 early rows have no species (NULL in json_extract). [VERIFIED]

## 3. HOW SEX/AGE ARE COUNTED

Both are **filter-based** — they read from `hard_filters` JSON, which stores the user's FILTER settings at query time. They are NOT derived from returned animals or intent-extracted.

Species would match the same basis: `json_extract(hard_filters, '$.species')` for the scalar species value. Unlike sex/age which use `json_each()` for arrays, species is a single string value, so the query uses `json_extract()` with equality check. [VERIFIED]

Example SQL for species counts:
```sql
SUM(CASE WHEN status = 'success' AND json_extract(hard_filters, '$.species') = 'cat' THEN 1 ELSE 0 END) as species_cat,
SUM(CASE WHEN status = 'success' AND json_extract(hard_filters, '$.species') = 'dog' THEN 1 ELSE 0 END) as species_dog,
SUM(CASE WHEN status = 'success' AND json_extract(hard_filters, '$.species') = 'small_animal' THEN 1 ELSE 0 END) as species_small,
```

## 4. THE CSV REPORT

**Endpoint:** `GET /api/dashboard/searcher-metrics/export` at server.ts:1408
**Source table:** `searcher_daily_metrics` (daily snapshots, not live `matcher_audit`)
**Header:** server.ts:1430 [VERIFIED]
```
date,queries,success_count,male,male_pct,female,female_pct,young,young_pct,adult,adult_pct,senior,senior_pct,
lang_en,lang_en_pct,lang_es,lang_es_pct,preamble_low_confidence,preamble_low_threshold,preamble_both,
preamble_pct,errors,error_pct,avg_response_time_sec
```

**Row assembly:** server.ts:1432-1451 — maps each `searcher_daily_metrics` row to CSV fields. [VERIFIED]

**To add species:** Need changes in:
1. `searcher_daily_metrics` table schema (localDatabase.ts:836) — add `species_cat INTEGER, species_dog INTEGER, species_small INTEGER` columns
2. `computeSearcherStatsForEtDay()` query (localDatabase.ts:5524-5551) — add 3 species SUM/CASE lines
3. `SearcherDailyMetrics` type (localDatabase.ts:5499-5516) — add 3 fields
4. `backfillSearcherDailyMetrics()` INSERT (localDatabase.ts:5603+5653) — add 3 columns + values
5. CSV header string (server.ts:1430) — add `species_cat,species_cat_pct,species_dog,species_dog_pct,species_small,species_small_pct`
6. CSV row assembly (server.ts:1432-1451) — add 6 values

**Backfill:** `backfillSearcherDailyMetrics()` re-computes from `matcher_audit` for missing days. Adding species columns + running backfill would populate historical CSV data from the existing `hard_filters` JSON. [VERIFIED — function at localDatabase.ts:5574]

## 5. THE CARD UI

**File:** dashboard/index.html:5323-5326 [VERIFIED]

```html
<div class="profiles-searcher-card">
  <h3>🔍 Searcher Usage Metrics (past 24h)</h3>
  <div class="searcher-stats-grid" id="searcherStatsGrid">
    <span class="stat-label">Loading...</span><span class="stat-value"></span>
  </div>
</div>
```

**Render function:** `renderSearcherStats()` at dashboard/index.html:15405-15439 [VERIFIED]

Current row layout:
```javascript
grid.innerHTML = [
  row('Queries', s.queries),
  rowPct('Male', s.male),        // ← sex group
  rowPct('Female', s.female),
  rowPct('Young', s.young),      // ← age group
  rowPct('Adult', s.adult),
  rowPct('Senior', s.senior),
  '<div class="searcher-stats-divider"></div>',
  rowPct('EN', s.langEn),        // ← language group
  rowPct('ES', s.langEs),
  '<div class="searcher-stats-divider"></div>',
  row('Low Confidence', s.preambleLowConfidence),  // ← preamble group
  row('Low Threshold', s.preambleLowThreshold),
  row('Both Triggers', s.preambleBoth),
  row('Total Preamble', s.preamblePct + '%'),
  '<div class="searcher-stats-divider"></div>',
  row('Avg Response', (s.avgResponseTimeSec || 0) + 's'),
  row('Errors', s.errorPct + '%'),
].join('');
```

**Species row-group would go** after "Queries" row and before the sex group (or after sex, before age — operator's choice). Insert with a divider:
```javascript
'<div class="searcher-stats-divider"></div>',
rowPct('🐱 Cat', s.speciesCat),
rowPct('🐕 Dog', s.speciesDog),
rowPct('🐹 Small', s.speciesSmall),
```

---

## CHANGE SCOPE SUMMARY

| Layer | File | What to add |
|-------|------|-------------|
| 24h query | localDatabase.ts:1226 (`getSearcherStats24h`) | 3 species SUM/CASE lines + return fields |
| 24h return type | localDatabase.ts:1216 | 3 fields: `speciesCat`, `speciesDog`, `speciesSmall` |
| Daily snapshot schema | localDatabase.ts:836 | 3 columns: `species_cat`, `species_dog`, `species_small` |
| Daily snapshot query | localDatabase.ts:5524 (`computeSearcherStatsForEtDay`) | 3 species SUM/CASE lines + return fields |
| Daily snapshot type | localDatabase.ts:5499 | 3 fields |
| Daily snapshot INSERT | localDatabase.ts:5603 + 5653 | 3 columns in INSERT |
| CSV header | server.ts:1430 | 6 fields (count + pct for each species) |
| CSV row assembly | server.ts:1432 | 6 values |
| Card UI render | dashboard/index.html:15416 | 3 `rowPct()` lines + divider |
| Backfill | Run `backfillSearcherDailyMetrics()` after schema change | Populates historical data |

**Estimated size:** ~40 lines of code across 3 files. No new tables, no new endpoints. Species is already logged — this is purely adding counts + display.

**Historical coverage:** 527/799 rows (66%) have species. All rows from ~May 2026 onward have species. Early rows show NULL → would count as "unknown" or be excluded from species breakdown (operator's choice). Backfill would populate daily snapshots from existing data.
