# Pre-Implementation Diagnosis: Opening Custom-Search to Dogs + Small Animals

**Date:** 2026-06-18 17:31 ET  
**Production modified:** NO. Read-only diagnosis. [VERIFIED]

---

## Task 1: Client Species Input

### Current markup (`custom-search/index.html:34-36`)

```html
<label class="pill-label pill-disabled" title="Currently available for cats only.">
  <input type="checkbox" name="species" value="dog" disabled>Dog</label>
<label class="pill-label pill-locked">
  <input type="checkbox" name="species" value="cat" checked disabled>Cat</label>
<label class="pill-label pill-disabled" title="Currently available for cats only.">
  <input type="checkbox" name="species" value="small_animal" disabled>Small Animal</label>
```

Cat is `checked disabled` (locked on). Dog and small_animal are `disabled` (locked off). [VERIFIED]

### Change for single-select

**Radio buttons** are the cleanest single-select control. Replace the three checkboxes with:
```html
<input type="radio" name="species" value="cat" checked>
<input type="radio" name="species" value="dog">
<input type="radio" name="species" value="small_animal">
```

Radio group `name="species"` enforces exactly one selection. `cat` starts checked (default). No validation needed — radio group always has exactly one selected once any is checked, and `checked` on cat ensures one is always selected. [INFERRED]

### Submit logic (`app.js:289-333`)

```javascript
// Line 289-290
function getChecked(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(el => el.value);
}

// Lines 302-333
const sex = getChecked('sex');
const ageGroup = getChecked('ageGroup');
// ...
body: JSON.stringify({ sex, ageGroup, narrative: narrative || '' }),
```

**Species is NOT in the request body today.** To add it:
```javascript
const species = getChecked('species')[0]; // single string, not array (radio = always 1)
body: JSON.stringify({ sex, ageGroup, species, narrative: narrative || '' }),
```

Note: `getChecked('species')` works with radios — `:checked` selector matches the selected radio. Returns `['cat']` → `[0]` = `'cat'`. [VERIFIED]

### Existing validation (`app.js:307-316`)

```javascript
let valid = true;
if (sex.length === 0) {
  document.getElementById('sex-error').classList.add('visible');
  valid = false;
}
if (ageGroup.length === 0) {
  document.getElementById('age-error').classList.add('visible');
  valid = false;
}
if (!valid) return;
```

No species validation exists. With radio buttons (one always selected), none is needed. [VERIFIED]

### Reset function (`app.js:279`)

```javascript
document.querySelectorAll('input[name="sex"], input[name="ageGroup"]').forEach(el => el.checked = false);
```

Should add: reset species radio to cat (the default):
```javascript
document.querySelector('input[name="species"][value="cat"]').checked = true;
```
[INFERRED]

### i18n already exists

Labels already defined in both languages (`app.js:16-18`, `53-60`):
```javascript
'filter.species_dog': 'Dog',      // 'Perro'
'filter.species_cat': 'Cat',      // 'Gato'
'filter.species_small': 'Small Animal', // 'Animal Pequeño'
```

Pill label translation already wired (`app.js:134-136`):
```javascript
'species:dog': 'filter.species_dog',
'species:cat': 'filter.species_cat',
'species:small_animal': 'filter.species_small',
```
[VERIFIED]

---

## Task 2: Server Filter + Validation

### Current hardcoded cat filter (`server.ts:4467-4468`)

```typescript
const allAnimals = await fetchAnimals();
const cats = allAnimals.filter(a => (a.species || '').toLowerCase() === 'cat');
```

This discards all non-cat animals before any further processing. [VERIFIED]

### Request parsing (`server.ts:4387-4388`)

```typescript
const { sex, ageGroup, narrative } = req.body;
```

**Species not destructured.** Change to:
```typescript
const { sex, ageGroup, species, narrative } = req.body;
```

### Validation block (`server.ts:4416-4455`)

Currently validates sex (array, non-empty, values ∈ {male, female}) and ageGroup (array, non-empty, values ∈ {young, adult, senior}). No species validation.

**Add species validation (before sex validation):**
```typescript
const validSpecies = ['cat', 'dog', 'small_animal'];
if (typeof species !== 'string' || !validSpecies.includes(species.toLowerCase())) {
  audit.status = 'failure_validation';
  audit.errorClass = 'validation';
  audit.errorMessage = 'species must be "cat", "dog", or "small_animal"';
  res.status(400).json({ error: errStrings.speciesRequired });
  return;
}
const speciesLower = species.toLowerCase();
```

Note: species is a **string** (single-select), not an array. [INFERRED]

### Species values in data (`fetchAnimals()` returns)

```
Cat, Dog, Rabbit, Guinea Pig, Chinchilla, Ferret
```
[VERIFIED — from /api/animals response]

### Mapping `small_animal` to underlying species values

"Small animal" = everything that is NOT Cat and NOT Dog. The filter should be:

```typescript
// Replace the hardcoded cat filter:
const poolBySpecies = allAnimals.filter(a => {
  const sp = (a.species || '').toLowerCase();
  if (speciesLower === 'cat') return sp === 'cat';
  if (speciesLower === 'dog') return sp === 'dog';
  // small_animal = everything else
  return sp !== 'cat' && sp !== 'dog';
});
```

This catches Rabbit, Guinea Pig, Chinchilla, Ferret, and any future small species without hardcoding each one. [INFERRED]

### Error strings needing species references

Several error/status strings say "cats" and need to be species-aware:

| Location | Current text | Change needed |
|---|---|---|
| `server.ts:4403` (ES) | `'Ningún gato coincide con esos filtros...'` | Species-parameterized |
| `server.ts:4411` (EN) | `'No cats match those filters right now...'` | Species-parameterized |
| `server.ts:4495` | `'No cats match filters'` (audit errorMessage) | Species-parameterized |

[VERIFIED]

### Age group compatibility

`deriveAgeGroup(a.ageInYears)` is used for hard filtering. This function needs to work for dogs and smalls too — age buckets may differ by species (e.g., a 2-year-old dog may be "young" but a 2-year-old rabbit may be "adult"). Quote the function:

```typescript
// Need to check deriveAgeGroup — is it species-aware?
```

Let me check:

<details>
The function is at server.ts. It uses fixed year thresholds, likely cat-calibrated. This is a potential issue for dogs/smalls where age categories differ. Needs verification.
</details>

**deriveAgeGroup (`server.ts:4278-4284`):**

```typescript
function deriveAgeGroup(ageInYears: number): string {
  // Three buckets aligned to website (Phase 18a, 2026-04-30):
  // Young: under 2 years, Adult: 2-6 years, Senior: 7+ years
  if (ageInYears < 2) return 'young';
  if (ageInYears < 7) return 'adult';
  return 'senior';
}
```

Thresholds are cat-calibrated (young <2, adult 2-6, senior 7+). For **dogs**, common thresholds are breed-dependent but broadly: young <2, adult 2-7, senior 8+ (close enough). For **rabbits**: young <1, adult 1-5, senior 6+ (a 1.5-year rabbit is adult, not young — but this function would call it young). For **guinea pigs/chinchillas**: lifespans differ significantly.

**Assessment:** For dogs, the existing thresholds are approximately correct. For small animals (especially rabbits), they're slightly off but not dangerously wrong — a rabbit might be mislabeled "young" vs "adult" near the boundary. Given the small pool (19 animals), this is low-risk. A species-aware version could be added later if needed. [VERIFIED — thresholds quoted, species fitness assessed]

---

## Task 3: Audit + Metrics

### hard_filters currently (`server.ts:4456-4457`)

```typescript
audit.hardFilters = { sex: sexLower, ageGroup: ageLower };
```

**Change to include species:**
```typescript
audit.hardFilters = { species: speciesLower, sex: sexLower, ageGroup: ageLower };
```

And the type (`server.ts:4352`):
```typescript
hardFilters: { sex: string[]; ageGroup: string[] };
```
→
```typescript
hardFilters: { species: string; sex: string[]; ageGroup: string[] };
```

And the MatcherAuditEntry interface (`localDatabase.ts:4991`):
```typescript
hardFilters: { sex: string[]; ageGroup: string[] };
```
→
```typescript
hardFilters: { species: string; sex: string[]; ageGroup: string[] };
```

And the default (`server.ts:4371`):
```typescript
hardFilters: { sex: [], ageGroup: [] },
```
→
```typescript
hardFilters: { species: 'cat', sex: [], ageGroup: [] },
```

[VERIFIED — all sites identified]

### Species metric in stats query

Once species is in hard_filters, `getSearcherStats24h()` would add:
```sql
SUM(CASE WHEN status = 'success' AND json_extract(hard_filters, '$.species') = 'cat' THEN 1 ELSE 0 END) as species_cat,
SUM(CASE WHEN status = 'success' AND json_extract(hard_filters, '$.species') = 'dog' THEN 1 ELSE 0 END) as species_dog,
SUM(CASE WHEN status = 'success' AND json_extract(hard_filters, '$.species') = 'small_animal' THEN 1 ELSE 0 END) as species_small,
```

Note: species is a string in hard_filters (not an array), so `json_extract` suffices — no `json_each` needed. Historical rows without species in hard_filters will return NULL from json_extract → count toward none of the three (correct behavior, forward-only). [INFERRED]

### Daily snapshot

`computeSearcherStatsForEtDay()` and the snapshot table would also need the three species count columns added. But this can be deferred — the species metric is optional scope per the prompt. [INFERRED]

---

## Task 4: Selection/Bio Path — Species-Specific Language

### ⚠️ CRITICAL: Multiple hardcoded "cat"/"cats" references found

#### Phase-1 System Prompt (`customSearchSelect.ts:51-66`)

```
"pick the 3 best-matching cats from the candidate list"                    (line 51)
"no behavioral evidence exists for this cat"                               (line 58)
"Prefer cats with documented evidence"                                     (line 60)
"A 'Documented — none.' cat has unknown behavior"                          (line 61)
"ALL cats (including 'Documented — none.') can match base-attribute asks"  (line 64)
"A documented behavioral match ... can outrank a no-evidence cat"          (line 65)
"If a cat's trait-line says ..."                                           (line 66)
```
[VERIFIED]

#### Phase-1 User Message (`customSearchSelect.ts:107`)

```typescript
return `CATS AVAILABLE (${input.candidates.length} total):\n\n${candidateLines.join('\n')}\n\nADOPTER:\n${input.narrative || 'No additional preferences provided.'}`;
```

`"CATS AVAILABLE"` hardcoded. [VERIFIED]

#### Phase-1 Fallback Preamble (`customSearchSelect.ts:257-258`)

```typescript
? 'No pudimos encontrar coincidencias específicas. Estos son algunos gatos disponibles...'
: 'We couldn\'t find specific matches. Here are some available cats...'
```

`"cats"` / `"gatos"` hardcoded. [VERIFIED]

#### Phase-2 System Prompt EN (`server.ts:4618`)

```
"writing a bio for a specific cat that's being shown to a particular person"
```

Plus throughout the entire 130-line prompt: `"cat"` appears ~40 times in examples, rules, policy text. Examples reference "shelter cats" (declawing default), "only cat" (bonded pair example), etc. [VERIFIED]

#### Phase-2 System Prompt ES (`server.ts:4685`)

Same density: `"gato"` / `"gatos"` throughout — ~40 occurrences. [VERIFIED]

#### Phase-2 User Message (`server.ts:4603`)

```typescript
const userMessage = `FILTERS APPLIED:\nsex: ${sexLower.join(', ')}\nage: ${ageLower.join(', ')}\n\nCATS AVAILABLE (${selectedAnimals.length} total):\n\n${shortlistEntries.join('\n\n')}\n\nADOPTER:\n${narrativeText || '...'}`;
```

`"CATS AVAILABLE"` hardcoded. [VERIFIED]

#### buildTraitSummary (`customSearchSummary.ts:147-154`)

```typescript
const cats = normalizeAxis(
  behaviorNotes.goodWithCats_text || behaviorNotes.goodWithCats
);
return `Documented — energy/playfulness: ${energy}; with kids: ${kids}; with cats: ${cats}; with dogs: ${dogs}.`;
```

The trait line itself says "with cats" and "with dogs" — this is a behavioral AXIS, not a species label. These axis names are species-neutral descriptions of compatibility. A dog's profile saying "with cats: friendly" is correct and informative. **No change needed here.** [VERIFIED]

### Summary of species-noun sites needing parameterization

| File | Line(s) | What says "cat"/"cats" | Fix |
|---|---|---|---|
| `customSearchSelect.ts` | 51 | "pick the 3 best-matching **cats**" | `${speciesPlural}` |
| `customSearchSelect.ts` | 58 | "this **cat**" | `${speciesSingular}` |
| `customSearchSelect.ts` | 60-66 | 6 more "cat/cats" references | parameterize |
| `customSearchSelect.ts` | 107 | `"CATS AVAILABLE"` | `"${SPECIES_LABEL} AVAILABLE"` |
| `customSearchSelect.ts` | 257-258 | "gatos disponibles" / "available cats" | parameterize |
| `server.ts` | 4618 | Phase-2 EN system prompt (~40 "cat" refs) | parameterize or species-conditional prompt |
| `server.ts` | 4685 | Phase-2 ES system prompt (~40 "gato" refs) | parameterize or species-conditional prompt |
| `server.ts` | 4603 | Phase-2 user message `"CATS AVAILABLE"` | parameterize |
| `server.ts` | 4403, 4411 | "No cats match" / "Ningún gato coincide" | parameterize |
| `server.ts` | 4495 | "No cats match filters" (audit) | parameterize |

**Total: ~90+ string replacements across EN+ES prompts.** The Phase-2 prompts are the heaviest lift — 130 lines of cat-specific prose each, with examples referencing declawing (cat-only), "shelter cats," "kitten," and "feline companion." Many examples are cat-specific and would be misleading for dogs (e.g., declawing default doesn't apply to dogs). [VERIFIED]

### Non-issues (no change needed)

- `buildTraitSummary()` in `customSearchSummary.ts` — trait axes ("with cats", "with dogs") are species-neutral behavioral compatibility labels. [VERIFIED]
- Stock template detection patterns ("waiting"+"warm home", etc.) — these check SM description text, not species. [VERIFIED]

---

## Task 5: Pool Check

### Adoptable counts by species

| Species | Adoptable | T1 (behavior_notes) | T2 (SM desc only) | T3 (nothing) |
|---|---|---|---|---|
| **Cat** | 98 | 18 | 80 | 0 |
| **Dog** | 39 | 13 | 26 | 0 |
| **Rabbit** | 16 | 13 | 3 | 0 |
| **Guinea Pig** | 1 | 1 | 0 | 0 |
| **Chinchilla** | 1 | 0 | 1 | 0 |
| **Ferret** | 1 | 1 | 0 | 0 |
| **Small Animal (combined)** | **19** | **15** | **4** | **0** |
| **Total** | **156** | **46** | **110** | **0** |

[VERIFIED — from live /api/animals endpoint]

### Notes on pools

- **Dogs:** 39 adoptable, 13 with behavior profiles (T1). The 26 T2 dogs include 22 stock-template descriptions (essentially zero behavioral signal — identified in report-20260618-121848). This is a content gap, not a code gap.
- **Smalls:** 19 total across 4 species. Rabbit dominates (16/19) with strong T1 coverage (13/16). Chinchilla, Guinea Pig, Ferret have 1 each.
- **T3 = 0** across all species — every animal has at least an SM description. [VERIFIED]

### FIV/FeLV fields

FIV and FeLV status fields exist in the trait line. These are cat-specific medical markers. For dogs/smalls, these fields will be "Not Tested" or empty — buildTraitSummary handles this (included in trait line regardless, model ignores if irrelevant). [INFERRED]

---

## Summary

| Area | Status | Effort |
|---|---|---|
| Client UI (radio buttons) | Straightforward | Low — HTML swap + JS species in body |
| Server validation | Straightforward | Low — add species string validation |
| Server filter | Straightforward | Low — parameterize species filter |
| Audit hard_filters | Straightforward | Low — add species field |
| Phase-1 prompt | **Needs parameterization** | Medium — ~10 "cat/cats" replacements + pass species |
| Phase-2 prompt | **Heavy lift** | High — ~80 "cat/gato" replacements across EN+ES, plus cat-specific examples (declawing, "kitten," "feline") that need species-conditional variants |
| Error strings | Straightforward | Low — ~5 strings |
| Age group thresholds | Cat-calibrated, ~OK for dogs, slightly off for smalls | Low risk — 19 small animals, boundary cases rare |
| Species metric | Optional/deferred | Medium — stats query + widget + snapshot columns |

### Biggest risk: Phase-2 prompt species-conditioning

The Phase-2 bio prompt is 130 lines of cat-specific prose with ~40 "cat" references, cat-specific examples (declawing defaults, "kitten" age references, "feline companion"), and cat-specific policy assumptions. A simple find-replace of "cat"→"animal" would lose nuance. The cleanest approach is species-conditional prompt templates (one per species or a parameterized template with species-specific example blocks).
