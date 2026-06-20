# Phase-1 Selection Rebuild — Scope, Change-Set, and Two Spec Artifacts

**Date:** 2026-06-20 15:00 UTC  
**Type:** READ-ONLY DIAGNOSIS + SPEC (no production changes, no commits)  
**Goal:** Move hard-attribute filtering from LLM to CODE. One new model call (intent extraction). Phase-2 untouched.

---

## LEAD: Structured Field Sources (#2 — the 73% trap)

**All hard-filterable attributes are populated pool-wide on the Animal object.** No attribute is trapped behind the 27% behavior-record coverage. [VERIFIED]

| Attribute | Animal field | SM source | Populated | Notes |
|-----------|-------------|-----------|-----------|-------|
| **Color** | `color` | `BASECOLOURNAME` | 177/177 ✅ | Values like "Black", "Tabby and White", "Tuxedo: Black and White" |
| **Size** | `size` | `SIZENAME` → `normalizeSize()` | 177/177 ✅ | 168 medium, 8 small, 1 large. **Heavily skewed** — 95% medium. |
| **Breed** | `breed` | `BREEDNAME` | 177/177 ✅ | "Domestic Short Hair" (111), "Terrier/Mixed Breed" (13), etc. |
| **Coat/hair** | Embedded in `breed` | `BREEDNAME` | 118/177 ⚠️ | "Domestic **Short** Hair", "Domestic **Long** Hair" etc. for cats. Dogs/small = NO coat field. |
| **Age** | `ageInYears` | `DATEOFBIRTH` → calc | 177/177 ✅ | Numeric. Bucketed by `deriveAgeGroup()`: <2=young, 2-6=adult, 7+=senior |
| **Sex** | `sex` | `SEXNAME` | 177/177 ✅ | "Male" (93), "Female" (84) |
| **FIV** | `fivStatus` | `COMBITESTED`+`COMBITESTRESULT` | 177/177 ✅ | "untested"/"negative"/"positive" |
| **FeLV** | `felvStatus` | `FLVRESULT` | 177/177 ✅ | "unknown"/"negative"/"positive" |

### Coat attribute — the partial gap

Coat/hair length is **not a standalone field.** It's embedded in `breed` for cats (111 of 118 cats are "Domestic Short/Medium/Long Hair"), but:
- Dogs: breed is "Terrier/Mixed Breed", "Husky", etc. — no coat info. [VERIFIED]
- Small animals: breed is "Lop Eared", "American", etc. — no coat info. [VERIFIED]

**Implication:** Coat can only be hard-filtered for cats whose breed contains "Short/Medium/Long Hair" (118/118 cats in current pool). For dogs/small animals, coat is not hard-filterable — it must remain a soft/semantic ask for the LLM. [VERIFIED]

### Size — minimal signal

168/177 animals are "medium." Size is technically populated but offers almost no filtering power. An adopter asking for "a small cat" would reduce the pool from 118 to ~5. An adopter asking for "a large dog" would get 0-1 hits. Size hard-filtering is valid but should use the fallback expansion early. [VERIFIED]

---

## 1. Current Phase-1 Structure

### File: `customSearchSelect.ts` (280 lines, INERT — wired but serves as Phase-1)

**Candidate-line construction** (line 109-119):
```typescript
candidateLines.push(
  `SHELTER_CODE: ${animal.shelterCode} | Name: ${animal.name} | Breed: ${animal.breed} ` +
  `| Age: ${animal.age} | Sex: ${animal.sex} | Color: ${animal.color}` +
  `${fivFelvPart} | ${traitLine}`
);
```
Each animal gets one line: structured fields (code, name, breed, age, sex, color, optionally FIV/FeLV) + a trait-summary line from `buildTraitSummary()`.

**System prompt** (lines 62-100) — key rules:
- Rule 1: Always return exactly 3 shelter_codes, ranked best-match first.
- Rule 3: For behavioral asks → prefer documented evidence matches over absence.
- Rule 4: For base-attribute asks → match directly from listed attributes. ALL animals (including "Documented — none") can match.
- **Rule 5**: When asks combine behavioral + base attributes, weigh both. A documented behavioral match with a minor attribute miss CAN outrank a no-evidence animal with a perfect attribute match.
- Rule 6: Do NOT fabricate behavioral traits.

**Selection flow** (lines 173-237): Single Anthropic API call (claude-sonnet-4-6, temp 0.7, max_tokens 256) → parse JSON → validate codes → retry if parse fails → fallback to first-3 if retry fails.

**Low confidence**: Set by the LLM when "inventory genuinely cannot meet the adopter's core request."

### File: `server.ts` — pool construction + fallback (lines 4499-4540)

**Current hard filters** (line 4507-4514):
```typescript
const filtered = speciesPool.filter(a => {
  const animalSex = (a.sex || '').toLowerCase();
  if (!sexLower.includes(animalSex)) return false;
  const bucket = deriveAgeGroup(a.ageInYears);
  if (ageLower.includes(bucket)) return true;
  return false;
});
```
Only **sex** and **age** are hard-filtered in code. Color, size, breed, coat are NOT filtered — the LLM handles them via the candidate-line attributes.

**Current fallback** (lines 4519-4537):
```typescript
if (withRecords.length < 3) {
  const sameSexAllAges = speciesPool.filter(a => {
    const animalSex = (a.sex || '').toLowerCase();
    return sexLower.includes(animalSex);
  });
  if (sameSexAllAges.length === 0) {
    // Return empty
    return;
  }
  withRecords = sameSexAllAges;
  usedFallback = true;
}
```
Drops the age filter, keeps sex. The expanded set goes to the LLM with NO annotation of which animals matched the original age request. This is the FALLBACK-BURY bug: a genuine age-match can be buried by the LLM among age-mismatches that now outnumber it. [VERIFIED — lines 4519-4537, server.ts]

### What changes

| Component | Changes? | What changes |
|-----------|----------|--------------|
| `customSearchSelect.ts` | **YES** | Remove hard-attribute matching from prompt. Model now ranks on soft/semantic ONLY within a pre-filtered set. Rule 4 (base-attribute matching) removed from system prompt. |
| `server.ts` pool/fallback | **YES** | Replace sex+age filter with full hard-filter module call. Replace fallback with annotated expansion. |
| New: `hardFilter.ts` | **NEW** | Hard-filter module (spec below). |
| New: intent extraction call | **NEW** | One model call: narrative → structured intent JSON. |
| `customSearchSummary.ts` | **NO** | Trait-summary builder unchanged — still produces compact lines for selection. |
| Phase-2 bio writing | **NO** | Entirely untouched — system prompts, bio assembly, blank-bio architecture, `resolveBioText()`, all stay. |

---

## 2. Structured Field Sources — Detailed (confirmed above)

All six hard-filterable attributes exist on the `Animal` object from `fetchAnimals()`, sourced from SM's API response and normalized in `normalizeAnimal()` (`shelterManagerService.ts:41-87`). None require behavior records. The 73% of animals without behavior records are fully filterable on all structured attributes. [VERIFIED]

**Coat exception:** Not a standalone field. Parseable from `breed` for cats only. See #3 spec for handling. [VERIFIED]

---

## 3. ARTIFACT 1: Hard-Filter Module Spec (`hardFilter.ts`)

### Interface

```typescript
interface ExtractedIntent {
  color: string[] | null;     // e.g., ["black", "tuxedo"] — null = not requested
  size: string[] | null;      // e.g., ["small"] — null = not requested
  breed: string[] | null;     // e.g., ["siamese", "ragdoll"] — null = not requested
  coat: string[] | null;      // e.g., ["long"] — null = not requested (cats only)
  softTerms: string[];        // e.g., ["playful", "good with kids"] — passed to LLM, not filtered
  // sex + ageGroup already come from the form fields, not from narrative
}

interface HardFilterResult {
  /** Animals passing all requested hard filters */
  candidates: Animal[];
  /** Which filters were applied */
  appliedFilters: string[];
  /** Per-animal: which filters it matched (for expansion annotation) */
  matchDetails: Map<string, { matchedAll: boolean; matchedFilters: string[]; missedFilters: string[] }>;
}

function hardFilter(
  pool: Animal[],
  intent: ExtractedIntent,
  sex: string[],
  ageGroup: string[],
): HardFilterResult;
```

### Per-Attribute Filter Logic

| Attribute | Filter method | "Not requested" (null) | "Requested but absent on animal" |
|-----------|---------------|------------------------|----------------------------------|
| **Sex** | `pool.filter(a => sex.includes(a.sex.toLowerCase()))` | Always applied (comes from form, not narrative) | Animal excluded (sex is always present) |
| **Age** | `deriveAgeGroup(a.ageInYears)` must be in `ageGroup[]` | Always applied (comes from form) | Animal excluded (age is always present) |
| **Color** | Case-insensitive substring match: `intent.color.some(c => a.color.toLowerCase().includes(c))` | No filter | Animal excluded (color is always present, but match may fail on unusual SM phrasing) |
| **Size** | `intent.size.includes(a.size)` after normalization | No filter | Animal excluded (size is always present) |
| **Breed** | Case-insensitive substring match: `intent.breed.some(b => a.breed.toLowerCase().includes(b))` | No filter | Animal excluded |
| **Coat** | Parse from `breed` field: `a.breed.toLowerCase().includes(coat + ' hair')`. Only applied for cats. | No filter | **Animal INCLUDED** (if breed doesn't contain hair-length info, coat filter is not applied to that animal — absence ≠ mismatch) |

### Edge cases

1. **Coat for non-cats:** Coat filter silently skipped for dogs and small animals (coat info not available). Intent extraction should still extract it (the LLM can use it as a soft term), but hardFilter won't apply it.

2. **Color normalization:** SM color values are rich ("Tabby: Orange and White", "Tuxedo: Black and White"). The filter does substring matching, so "black" matches "Black", "Black with white", "Tuxedo: Black and White". The intent-extraction prompt should map adopter language to SM color vocabulary (e.g., "orange" → includes "tabby: orange").

3. **"Any" / no preference:** Intent extraction returns `null` for unrequested attributes. `null` = no filter applied.

---

## 4. Fallback Rework

### Current (BROKEN — lines 4519-4537, server.ts)

```typescript
if (withRecords.length < 3) {
  // Drop age filter, keep sex
  const sameSexAllAges = speciesPool.filter(a => {
    const animalSex = (a.sex || '').toLowerCase();
    return sexLower.includes(animalSex);
  });
  withRecords = sameSexAllAges;
  usedFallback = true;
}
```

**Why it's broken:** The expanded set includes all animals of the right sex, regardless of age or any narrative-derived attribute. The LLM then re-picks from this undifferentiated set, with no signal about which animals matched the original request. Result: FALLBACK-BURY (genuine matches lost among expansions) and confabulation risk (model invents justifications for mismatches).

### New Design

```typescript
function expandCandidates(
  pool: Animal[],                    // species-filtered pool
  strictResult: HardFilterResult,    // result of strict hardFilter()
  sex: string[],
  ageGroup: string[],
  intent: ExtractedIntent,
): AnnotatedCandidateSet {
  
  const MIN_CANDIDATES = 3;
  
  if (strictResult.candidates.length >= MIN_CANDIDATES) {
    // No expansion needed — return strict set
    return {
      candidates: strictResult.candidates,
      expansionLevel: 'none',
      annotations: strictResult.matchDetails,
    };
  }

  // EXPANSION ORDER (drop one filter at a time, most→least specific):
  // 1. Drop coat
  // 2. Drop breed  
  // 3. Drop color
  // 4. Drop size
  // 5. Drop age
  // 6. Drop all narrative-derived filters (keep sex only)
  
  const dropOrder = ['coat', 'breed', 'color', 'size', 'age'];
  let currentIntent = { ...intent };
  let currentAge = [...ageGroup];
  let expanded: HardFilterResult;

  for (const attr of dropOrder) {
    if (attr === 'age') {
      // Drop age = use all age groups
      expanded = hardFilter(pool, currentIntent, sex, ['young', 'adult', 'senior']);
    } else {
      currentIntent = { ...currentIntent, [attr]: null };
      expanded = hardFilter(pool, currentIntent, sex, currentAge);
    }
    
    if (expanded.candidates.length >= MIN_CANDIDATES) {
      return {
        candidates: expanded.candidates,
        expansionLevel: `dropped_${attr}`,
        annotations: expanded.matchDetails,
        droppedFilter: attr,
      };
    }
  }

  // Final fallback: sex only
  const sexOnly = pool.filter(a => sex.includes(a.sex.toLowerCase()));
  return {
    candidates: sexOnly,
    expansionLevel: 'sex_only',
    annotations: new Map(sexOnly.map(a => [a.shelterCode, {
      matchedAll: false,
      matchedFilters: ['sex'],
      missedFilters: Object.keys(intent).filter(k => intent[k] !== null),
    }])),
  };
}
```

### Key differences from current

1. **Ordered expansion:** Drops filters one at a time from most specific to least, not all-at-once.
2. **Annotations preserved:** Every animal in the expanded set carries `matchedAll: true/false` + which filters it matched/missed. The LLM prompt includes this annotation: `[FULL MATCH]` vs `[PARTIAL: missed color]`.
3. **Genuine matches never buried:** A `[FULL MATCH]` animal is always ranked above a `[PARTIAL]` by prompt instruction — the LLM sees the annotation and respects it.
4. **No LLM re-derivation of age:** CODE decides age bucket. The LLM never recalculates whether an animal is "young" or "senior."

---

## 5. ARTIFACT 2: Intent-Extraction Prompt Spec

### Purpose

One model call: narrative → structured intent JSON. The model **extracts** what the adopter wants; CODE **applies** the filters. The model never sees the candidate pool during extraction.

### Input

```
User message:
"I'm looking for a small black kitten that's good with my two dogs"
```

### Output format

```json
{
  "color": ["black"],
  "size": ["small"],
  "breed": null,
  "coat": null,
  "softTerms": ["good with dogs", "kitten"]
}
```

### System Prompt

```
You are an intent extractor for an animal shelter adoption matcher. Given an adopter's
free-text description of what they're looking for, extract ONLY the structured attributes
they explicitly mention. Do NOT infer, guess, or add attributes the adopter didn't state.

EXTRACT these hard attributes (return null if not mentioned):
- color: specific color(s) mentioned (e.g., "black", "orange", "tuxedo", "tabby", "calico").
  Map common terms: "ginger"→"orange", "gray"→"grey", "spotted"→null (too vague).
- size: "small", "medium", or "large" — only if the adopter explicitly mentions size.
  Do NOT infer size from breed (e.g., "chihuahua" does not imply "small" for extraction;
  breed matching handles that separately).
- breed: specific breed(s) mentioned (e.g., "siamese", "labrador", "ragdoll").
  "mixed breed" or "mutt" → null (not filterable).
- coat: hair length if mentioned: "short", "medium", "long", "hairless".
  "fluffy" → ["long"]. "smooth" → ["short"]. Only extract if clearly about hair length.

EXTRACT soft terms (always return as array, empty if none):
- softTerms: behavioral/personality descriptors and household-fit factors.
  Examples: "playful", "calm", "good with kids", "lap cat", "active", "cuddly",
  "good with dogs", "independent", "hypoallergenic", "declawed".
  Include terms like "kitten" or "puppy" here (age is handled by form fields, but the
  semantic signal matters for ranking).

RULES:
1. Extract ONLY what the adopter said. "A friendly cat" → color: null, size: null,
   breed: null, coat: null, softTerms: ["friendly"].
2. If the narrative is empty or generic ("a cat", "any dog"), return all nulls +
   empty softTerms.
3. Return valid JSON only. No explanatory text.
4. When multiple values are possible, return as array: color: ["black", "white"].
5. Spanish input: extract the same way. "Un gato negro" → color: ["negro"/"black"].
   Return color values in English for filter matching.

OUTPUT FORMAT — respond with ONLY this JSON:
{
  "color": [...] or null,
  "size": [...] or null,
  "breed": [...] or null,
  "coat": [...] or null,
  "softTerms": [...]
}
```

### Model call spec

- **Model:** claude-sonnet-4-6 (same as current Phase-1)
- **Temperature:** 0.0 (deterministic extraction — no creativity needed)
- **Max tokens:** 128 (output is small structured JSON)
- **Cost:** ~200 input tokens + ~50 output tokens per call. At $3/$15 per M tokens: ~$0.001 per query. Negligible vs Phase-2 bio-writing cost.

### Failure mode

If intent extraction fails to return valid JSON or returns an error:
- **Fallback:** All intent fields = `null`, softTerms = `[narrative]` (pass entire narrative as a soft term to the LLM).
- **Effect:** No hard filters applied beyond sex+age (same as current behavior). Graceful degradation.

### The single failure point

This is the ONE new place a failure can enter. If the model extracts the wrong color (e.g., "tabby" when the adopter said "orange tabby"), the hard filter excludes correct matches. Mitigations:
1. Temperature 0.0 for deterministic output.
2. Substring matching on color (not exact), so "orange" matches "Tabby: Orange and White."
3. The fallback expansion will recover if the hard filter is too restrictive (<3 results).
4. The extraction prompt explicitly says "extract ONLY what the adopter said" — no inference.

---

## 6. Change-Set + What Stays

### Files that CHANGE

| File | Section | Change |
|------|---------|--------|
| `server.ts` | Lines 4507-4537 (pool construction + fallback) | Replace sex+age filter with: (1) intent extraction call, (2) `hardFilter()` call, (3) `expandCandidates()` if <3. Pass annotated set to selectMatches. |
| `server.ts` | Lines 4570-4584 (selectMatches call) | Pass `annotated` candidates + `softTerms` instead of raw `withRecords` + full narrative. |
| `customSearchSelect.ts` | System prompt (lines 62-100) | Remove Rule 4 (base-attribute matching from listed attributes). Model now ranks on: (a) soft/semantic match to `softTerms`, (b) documented behavioral evidence, (c) `[FULL MATCH]` vs `[PARTIAL]` annotation. Rule 5 simplified. |
| `customSearchSelect.ts` | User message assembly (lines 109-119) | Add `[FULL MATCH]` / `[PARTIAL: missed X]` annotation per candidate line. Optionally strip base-attribute fields the model no longer needs for filtering (breed, color can stay for context). |
| `customSearchSelect.ts` | Model call | Optionally reduce `temperature` from 0.7 to ~0.5 (model now ranks semantically, not making hard selection decisions). |

### NEW files

| File | Purpose |
|------|---------|
| `hardFilter.ts` | Hard-filter module: `hardFilter()` + `expandCandidates()` |
| `intentExtractor.ts` | Intent-extraction model call: narrative → structured JSON |

### Files that DO NOT CHANGE

| File | Reason |
|------|--------|
| `customSearchSummary.ts` | Trait-summary builder. Still produces compact lines for LLM selection. No change. |
| Phase-2 bio-writing system prompts (server.ts ~4686-5170) | **UNTOUCHED.** Bio generation operates on already-selected animals. No coupling to Phase-1 selection. |
| `resolveBioText()`, bio assembly, blank-bio architecture | **UNTOUCHED.** |
| `localDatabase.ts` (behavior records, getBehaviorNotes) | **UNTOUCHED.** Still used for trait summaries in Phase-1 and transcripts in Phase-2. |
| `shelterManagerService.ts` (fetchAnimals, normalizeAnimal) | **UNTOUCHED.** Hard filters read from the Animal objects it already produces. |
| `imageProcessor.ts`, `mediaTab`, all app code | **UNTOUCHED.** |

### Call flow: current vs new

**Current:**
```
Form fields (sex, age) → CODE hard-filter (sex+age only) → fallback (drop age) →
LLM selects 3 from filtered pool (handles color/breed/size/coat/personality) →
Phase-2 writes bios
```

**New:**
```
Form fields (sex, age) + narrative →
  (1) INTENT EXTRACTION: narrative → {color, size, breed, coat, softTerms} [new model call]
  (2) CODE HARD-FILTER: sex + age + color + size + breed + coat → filtered pool
  (3) CODE EXPANSION: if <3, drop filters one-at-a-time, annotate [FULL MATCH]/[PARTIAL]
  (4) LLM RANKS on softTerms + behavioral evidence only (no hard-attribute decisions) →
  Phase-2 writes bios [UNCHANGED]
```

### Token budget impact

- **Intent extraction:** +~250 tokens per query (~$0.001). One call, deterministic.
- **Phase-1 selection:** Similar token count (candidate lines slightly longer with annotations, but pool may be smaller due to hard filtering). Net neutral.
- **Phase-2:** Unchanged.
- **Total new cost:** ~$0.001 per query. Negligible.

---

## Summary

The rebuild moves six hard attributes (color, size, breed, coat, age, sex) from LLM judgment to deterministic code. The LLM's role narrows to: (1) intent extraction (new, isolated, small) and (2) semantic ranking on soft terms within a pre-filtered valid set. Phase-2 is entirely untouched.

The 73% trap is avoided: all hard-filterable attributes are on the Animal object from SM, populated pool-wide. Coat is the one partial exception (embedded in breed for cats only, unavailable for dogs/small animals — handled by skipping the filter for non-cats).

The fallback is reworked from "drop everything, let the LLM re-pick" to "drop one filter at a time, annotate which animals matched the original request." This eliminates FALLBACK-BURY and confabulation risk.

Two artifacts delivered:
1. **Hard-filter module spec** (§3): interface, per-attribute logic, edge cases.
2. **Intent-extraction prompt** (§5): system prompt, output format, failure mode, the single new failure point.
