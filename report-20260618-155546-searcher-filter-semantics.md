# Diagnosis: Searcher Widget Filter Semantics + Counting Math

**Date:** 2026-06-18 15:55 ET  
**Production modified:** NO. Read-only diagnosis. [VERIFIED]

---

## Task 1: Filter UI Semantics

### Sex — multi-select checkboxes, default unchecked

**HTML (`custom-search/index.html:44-45`):**
```html
<label class="pill-label"><input type="checkbox" name="sex" value="male">Male</label>
<label class="pill-label"><input type="checkbox" name="sex" value="female">Female</label>
```

No `checked` attribute — both start **unchecked** on page load. [VERIFIED]

### Age — multi-select checkboxes, default unchecked

**HTML (`custom-search/index.html:55-57`):**
```html
<label class="pill-label"><input type="checkbox" name="ageGroup" value="young">Young</label>
<label class="pill-label"><input type="checkbox" name="ageGroup" value="adult">Adult</label>
<label class="pill-label"><input type="checkbox" name="ageGroup" value="senior">Senior</label>
```

No `checked` attribute — all three start **unchecked**. [VERIFIED]

### Species — multi-select checkboxes, cat locked/checked, dog+small disabled

**HTML (`custom-search/index.html:34-36`):**
```html
<label class="pill-label pill-disabled" title="Currently available for cats only."><input type="checkbox" name="species" value="dog" disabled>Dog</label>
<label class="pill-label pill-locked"><input type="checkbox" name="species" value="cat" checked disabled>Cat</label>
<label class="pill-label pill-disabled" title="Currently available for cats only."><input type="checkbox" name="species" value="small_animal" disabled>Small Animal</label>
```

Cat is `checked disabled` (locked on). Dog and small_animal are `disabled` (locked off). [VERIFIED]

### What's sent in the request body

**JS (`custom-search/app.js:302-333`):**
```javascript
const sex = getChecked('sex');
const ageGroup = getChecked('ageGroup');
// ...
body: JSON.stringify({ sex, ageGroup, narrative: narrative || '' }),
```

Where `getChecked` (`app.js:289-290`):
```javascript
function getChecked(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(el => el.value);
}
```

**Species is NOT sent in the request body.** Only `sex`, `ageGroup`, and `narrative`. The server hardcodes species=cat at `server.ts:4405`:
```typescript
const cats = allAnimals.filter(a => (a.species || '').toLowerCase() === 'cat');
```
[VERIFIED]

### Default state

Reset function (`app.js:279`):
```javascript
document.querySelectorAll('input[name="sex"], input[name="ageGroup"]').forEach(el => el.checked = false);
```

On fresh page load and after reset: **all unchecked**. Client-side validation blocks submission until at least one sex and one ageGroup are checked. [VERIFIED]

---

## Task 2: What the Widget SQL Actually Counts

### Full `getSearcherStats24h()` (`localDatabase.ts:1191-1249`)

```typescript
export function getSearcherStats24h(): {
  queries: number; male: number; female: number;
  young: number; adult: number; senior: number;
  preambleLowConfidence: number; preambleLowThreshold: number; preambleBoth: number;
  preamblePct: number; errors: number; errorPct: number;
  avgResponseTimeSec: number;
} {
  const database = getDatabase();
  const row = database.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN EXISTS (
        SELECT 1 FROM json_each(hard_filters, '$.sex') WHERE value = 'male'
      ) THEN 1 ELSE 0 END) as male,
      SUM(CASE WHEN EXISTS (
        SELECT 1 FROM json_each(hard_filters, '$.sex') WHERE value = 'female'
      ) THEN 1 ELSE 0 END) as female,
      SUM(CASE WHEN EXISTS (
        SELECT 1 FROM json_each(hard_filters, '$.ageGroup') WHERE value = 'young'
      ) THEN 1 ELSE 0 END) as young,
      SUM(CASE WHEN EXISTS (
        SELECT 1 FROM json_each(hard_filters, '$.ageGroup') WHERE value = 'adult'
      ) THEN 1 ELSE 0 END) as adult,
      SUM(CASE WHEN EXISTS (
        SELECT 1 FROM json_each(hard_filters, '$.ageGroup') WHERE value = 'senior'
      ) THEN 1 ELSE 0 END) as senior,
      SUM(CASE WHEN low_confidence = 1 AND candidate_count >= 4 THEN 1 ELSE 0 END) as preamble_low_confidence,
      SUM(CASE WHEN low_confidence = 0 AND candidate_count < 4 THEN 1 ELSE 0 END) as preamble_low_threshold,
      SUM(CASE WHEN low_confidence = 1 AND candidate_count < 4 THEN 1 ELSE 0 END) as preamble_both,
      SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) as errors,
      SUM(CASE WHEN preamble_shown = 1 THEN 1 ELSE 0 END) as preamble_total,
      AVG(CASE WHEN status = 'success' THEN response_time_ms END) / 1000.0 as avg_response_time_sec
    FROM matcher_audit
    WHERE created_at > datetime('now', '-24 hours')
  `).get() as any;
  // ... return object assembly
}
```

[VERIFIED — quoted verbatim]

### Counting semantics

Each `json_each` expression counts **"how many queries included this option in their filter array"** — option-inclusion frequency, NOT mutually exclusive partition.

For example, `male` counts:
```sql
SUM(CASE WHEN EXISTS (
  SELECT 1 FROM json_each(hard_filters, '$.sex') WHERE value = 'male'
) THEN 1 ELSE 0 END)
```

A query with `sex: ["male", "female"]` increments BOTH `male` AND `female`. [VERIFIED]

### Is Male 12 / Female 11 / Queries 12 consistent?

**Actual audit data (24h window at report time, 23 rows):**

| # | sex filter | ageGroup filter |
|---|---|---|
| 1-11 | ["male","female"] | ["young","adult","senior"] |
| 12 | ["male"] | ["young","adult","senior"] |
| 13 | [] | [] (validation failure) |
| 14-17 | ["male","female"] | ["young","adult","senior"] |
| 18 | ["male","female"] | ["young"] |
| 19 | ["male","female"] | ["young","adult","senior"] |
| 20 | ["female"] | ["senior"] |
| 21 | ["male"] | ["young","adult","senior"] |
| 22-23 | ["male","female"] | ["young","adult","senior"] |

When John saw "Queries 12", the 24h window contained a subset of these rows. The pattern holds: most queries had both sexes checked (Male and Female both count), a few had only one sex. **Male 12 / Female 11 means 11 queries had both sexes, 1 had male-only, 0 had female-only.** This is correct multi-select counting. [VERIFIED]

**These counts are NOT expected to sum to total queries.** They are inclusion frequencies, not partitions. [VERIFIED]

---

## Task 3: Language Field

### Is lang stored in matcher_audit?

**No.** The schema has no `lang` column:

```
0|id|TEXT|1||1
1|created_at|TEXT|1||0
2|hard_filters|TEXT|1||0
3|narrative|TEXT|0||0
...17 columns total, none named lang/language
```
[VERIFIED]

The `lang` value is extracted from `req.query.lang` at `server.ts:4327`:
```typescript
const langRaw = typeof req.query.lang === 'string' ? req.query.lang.toLowerCase().trim() : '';
const lang: 'en' | 'es' = langRaw === 'es' ? 'es' : 'en';
```

It flows into Phase-1 (`selectMatches`) and Phase-2 (system prompt selection), but is **never written to the audit record or hard_filters**. [VERIFIED]

### Is lang single-valued?

Yes — exactly one of `'en'` or `'es'` per query. Defaults to `'en'` if not specified. [VERIFIED]

### EN + ES should equal total queries

Yes. Language is single-select (one value per query), so `EN_count + ES_count === total`. This is a reconcilable partition, unlike sex/age. [VERIFIED]

### What's needed to add EN/ES breakdown

1. **Store it:** Either add a `lang TEXT` column to `matcher_audit`, or embed `lang` in `hard_filters` (e.g. `{"sex":[...],"ageGroup":[...],"lang":"es"}`). A column is cleaner.
2. **Write it:** Add `audit.lang = lang;` after line 4327 + add the column to the audit INSERT statement.
3. **Query it:** Add to `getSearcherStats24h()`:
   ```sql
   SUM(CASE WHEN lang = 'en' THEN 1 ELSE 0 END) as lang_en,
   SUM(CASE WHEN lang = 'es' THEN 1 ELSE 0 END) as lang_es,
   ```
4. **Display it:** Add `row('EN', s.langEn)` and `row('ES', s.langEs)` to `renderSearcherStats()`.

---

## Task 4: Species Metric Feasibility

### Is species stored in hard_filters today?

**No.** Hard filters contain only `sex` and `ageGroup`:
```json
{"sex":["male","female"],"ageGroup":["young","adult","senior"]}
```
[VERIFIED — all 23 audit records checked]

Species is not sent by the client and not recorded by the server. The server hardcodes `species === 'cat'` at `server.ts:4405`. [VERIFIED]

### What would a species metric show today?

100% cat, 0% dog, 0% small. Every query is implicitly cat. The metric would be meaningless until the species filter is opened to dogs/smalls. [VERIFIED]

### What's needed to add species counts

**Pre-species-launch (optional, low value):**
1. Record `species: ["cat"]` in `hard_filters` or a new column — always `["cat"]` until the UI/server opens other species.

**Post-species-launch (when dogs/smalls open):**
1. Client sends `species: getChecked('species')` in the request body.
2. Server reads + validates `species`, adds to `hard_filters`, filters pool by species.
3. Widget query adds `json_each(hard_filters, '$.species')` expressions for cat/dog/small.
4. Species is multi-select (checkboxes), so counts overlap (same as sex/age).

**Recommendation:** Don't add the species metric until the species filter is actually opened. Adding it now would show "Cat 100%" on every row — no signal. [INFERRED]

---

## Task 5: Reconciliation Design Input

| Filter group | Input type | Values | Can overlap? | Components = Total? | Presentation |
|---|---|---|---|---|---|
| **Sex** | Multi-select checkboxes | male, female | Yes — both can be checked | **No** — Male + Female ≥ Total | Show as inclusion count ("12 queries included male") or "% of queries" |
| **Age** | Multi-select checkboxes | young, adult, senior | Yes — all three can be checked | **No** — Young + Adult + Senior ≥ Total | Same as sex |
| **Species** | Multi-select checkboxes (future) | cat, dog, small | Yes — multiple can be checked | **No** — Cat + Dog + Small ≥ Total | Same as sex |
| **Language** | Single-select (query param) | en, es | No — exactly one per query | **Yes** — EN + ES = Total | Show as partition; can use fraction/bar |

### Reconciliation rules

1. **Sex, Age, Species:** Cannot hold to "components = total." Legitimate to show raw inclusion counts as-is (dashboard operator understands multi-select). Alternative: show as "% of queries" or add a "Both" count (e.g., "Male only 1 / Female only 1 / Both 10 / Total 12" — this DOES reconcile).
2. **Language:** CAN hold to "components = total." EN + ES = Queries. Show as a simple partition.

### "Both" decomposition option for sex

Since sex has only 2 values, a clean partition is possible:

| Metric | Meaning | Sums to Total? |
|---|---|---|
| Male only | sex = ["male"] | |
| Female only | sex = ["female"] | |
| Both | sex = ["male","female"] | |
| **Total** | | ✅ Male-only + Female-only + Both = Total |

This is straightforward to compute:
```sql
SUM(CASE WHEN ... 'male' AND NOT ... 'female' THEN 1 ELSE 0 END) as male_only,
SUM(CASE WHEN ... 'female' AND NOT ... 'male' THEN 1 ELSE 0 END) as female_only,
SUM(CASE WHEN ... 'male' AND ... 'female' THEN 1 ELSE 0 END) as both_sex,
```

For age (3 values → 7 combinations), decomposition is impractical. Keep as inclusion counts. [INFERRED]

---

## Summary

| Finding | Status |
|---|---|
| Sex/Age are multi-select checkboxes | [VERIFIED] |
| Default state: all unchecked | [VERIFIED] |
| Species not sent in request, hardcoded to cat | [VERIFIED] |
| Male 12 / Female 11 / Queries 12 is consistent (multi-select overlap) | [VERIFIED] |
| `lang` not stored in audit — needed for EN/ES split | [VERIFIED] |
| `species` not stored in hard_filters — no value adding until opened | [VERIFIED] |
| Sex/Age/Species: multi-select, cannot reconcile to total | [VERIFIED] |
| Language: single-select, CAN reconcile to total | [VERIFIED] |

### Implementation needs for the three requested additions

| Addition | Audit schema change | Endpoint write change | Widget query change | Widget display change |
|---|---|---|---|---|
| EN/ES split | Add `lang TEXT` column | Write `audit.lang = lang` | Add `SUM(CASE WHEN lang = 'en/es')` | Add `row('EN/ES', ...)` |
| Species counts | Add `species` to `hard_filters` schema | Write species in hard_filters | Add `json_each(hard_filters, '$.species')` | Add `row('Cat/Dog/Small', ...)` |
| Reconcilable sums | None | None | Rewrite sex as male-only/female-only/both | Change display to partition |
