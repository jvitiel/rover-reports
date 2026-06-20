# Phase-1 Selection Rebuild — Revised Spec (v2, Auditor B1 Fixes)

**Date:** 2026-06-20 18:12 UTC  
**Type:** SPEC REVISION — no build, no commits  
**Supersedes:** report-20260620-150000-phase1-rebuild-scope.md  
**Fixes applied:** B1-FIX1 (expansion drop order), B1-FIX2 (intent-extraction prompt: comparatives + ES translation), B1-FIX3 (missing-value handling)

---

## Changes from v1

| Fix | What changed | Why |
|-----|-------------|-----|
| **FIX 1** | Expansion drop order: `coat → size → breed → age → color` | Color is the adopter's most concrete stated intent. Age is a form field but less concrete than a stated visual attribute. Old order sacrificed color too early — recreating SEL-RULE5 through the fallback. See drop-order verification below. |
| **FIX 2a** | Intent-extraction prompt: explicit comparative/negative → softTerms rule | Prompt was silent on fuzzy language. "Not too big" would mis-extract to `size:["small"]` instead of `softTerms:["not too big"]`. |
| **FIX 2b** | Intent-extraction prompt: Spanish→English translation is LOAD-BEARING, not optional | Hard filter substring-matches against English SM values. Spanish extraction ("negro") silently fails. |
| **FIX 3** | Missing-value on animal = SKIP (include), not hard-exclude | Data-quality blank on color/size/breed shouldn't vanish an animal. Same treatment as coat on non-cats. |

**Note on FIX 1 order vs Auditor text:** The Auditor's stated test case ("a black senior cat" → keep color, relax age → return black adults) is the ground truth. The order that satisfies this test case is `coat → size → breed → age → color` — age drops BEFORE color. The Auditor's prose listed "color second-to-last, age last" which would drop color before age; the test case contradicts this and the test case wins. Color truly last = color maximally preserved.

Sections unchanged from v1 (§1 current structure, §2 structured field sources, §6 change-set + what stays) are not repeated here. Only the two revised artifacts and the new control case-list are included.

---

## ARTIFACT 1 (REVISED): Hard-Filter Module Spec (`hardFilter.ts`)

### Interface

```typescript
interface ExtractedIntent {
  color: string[] | null;     // e.g., ["black", "tuxedo"] — null = not requested
  size: string[] | null;      // e.g., ["small"] — null = not requested
  breed: string[] | null;     // e.g., ["siamese", "ragdoll"] — null = not requested
  coat: string[] | null;      // e.g., ["long"] — null = not requested (cats only)
  softTerms: string[];        // e.g., ["playful", "good with kids"] — passed to LLM, not filtered
  // sex + ageGroup come from form fields, not narrative
}

interface MatchDetail {
  matchedAll: boolean;
  matchedFilters: string[];
  missedFilters: string[];
  unknownFilters: string[];   // attribute requested but animal's value is blank
}

interface HardFilterResult {
  /** Animals passing all requested hard filters */
  candidates: Animal[];
  /** Which filters were applied */
  appliedFilters: string[];
  /** Per-animal: which filters it matched */
  matchDetails: Map<string, MatchDetail>;
}

function hardFilter(
  pool: Animal[],
  intent: ExtractedIntent,
  sex: string[],
  ageGroup: string[],
): HardFilterResult;
```

### Per-Attribute Filter Logic

| Attribute | Filter method | "Not requested" (null) | "Requested, animal value BLANK" | "Requested, animal value PRESENT" |
|-----------|---------------|------------------------|---------------------------------|-----------------------------------|
| **Sex** | `sex.includes(a.sex.toLowerCase())` | Always applied (form) | Excluded (sex always present) | Normal match |
| **Age** | `deriveAgeGroup(a.ageInYears)` in `ageGroup[]` | Always applied (form) | Excluded (age always present) | Normal match |
| **Color** | `intent.color.some(c => a.color.toLowerCase().includes(c))` | No filter | **SKIP — INCLUDED** (FIX 3) | Substring match |
| **Size** | `intent.size.includes(a.size)` | No filter | **SKIP — INCLUDED** (FIX 3) | Exact match on normalized value |
| **Breed** | `intent.breed.some(b => a.breed.toLowerCase().includes(b))` | No filter | **SKIP — INCLUDED** (FIX 3) | Substring match |
| **Coat** | `a.breed.toLowerCase().includes(coat + ' hair')`. Cats only. | No filter | **SKIP — INCLUDED** | Substring match in breed |

### FIX 3 — Missing-value rule

If a hard-filter attribute is requested but the animal's stored value for that attribute is empty, blank, or `"Unknown"`, the animal is **INCLUDED** in the filtered set (treated as "data absent, don't exclude"). The annotation marks it as `unknownFilters: ["color"]` so the LLM prompt renders `[UNKNOWN: color]` — distinct from both `[FULL MATCH]` and `[PARTIAL: missed color]`.

```typescript
function fieldIsBlank(value: string | null | undefined): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return v === '' || v === 'unknown' || v === 'n/a';
}

// Inside per-attribute filter check (color example):
if (intent.color !== null) {
  if (fieldIsBlank(animal.color)) {
    detail.unknownFilters.push('color');
    // animal stays in pool — not excluded
  } else if (!intent.color.some(c => animal.color.toLowerCase().includes(c))) {
    detail.missedFilters.push('color');
    passes = false;  // excluded
  } else {
    detail.matchedFilters.push('color');
  }
}
```

### Expansion (CORRECTED drop order — FIX 1)

```typescript
function expandCandidates(
  pool: Animal[],
  strictResult: HardFilterResult,
  sex: string[],
  ageGroup: string[],
  intent: ExtractedIntent,
): AnnotatedCandidateSet {

  const MIN_CANDIDATES = 3;

  if (strictResult.candidates.length >= MIN_CANDIDATES) {
    return {
      candidates: strictResult.candidates,
      expansionLevel: 'none',
      annotations: strictResult.matchDetails,
      droppedFilters: [],
    };
  }

  // ---------------------------------------------------------------
  // DROP ORDER (B1-FIX1, corrected to match test-case ground truth):
  //
  //   coat → size → breed → age → color
  //
  // Rationale (drop least-adopter-central first):
  //   coat:  weakest signal, cat-only, often not stated
  //   size:  95% "medium" = low discriminating power, often vague
  //   breed: specific but rarely stated in free text
  //   age:   form field — deliberate but less concrete than a visual
  //          attribute the adopter described in words
  //   color: LAST — a stated color ("I want a black cat") is the
  //          adopter's most concrete visual intent. Dropping it
  //          before age recreates SEL-RULE5 through the fallback.
  //
  // The loop skips inactive filters (null intent) so no-ops don't
  // advance the sequence. Only actually-constraining filters get
  // dropped.
  // ---------------------------------------------------------------
  const DROP_ORDER: ReadonlyArray<'coat' | 'size' | 'breed' | 'age' | 'color'> =
    ['coat', 'size', 'breed', 'age', 'color'];

  let currentIntent = { ...intent };
  let currentAge = [...ageGroup];
  const droppedSoFar: string[] = [];

  for (const attr of DROP_ORDER) {
    // Skip attributes that aren't active — dropping a null filter is a no-op
    if (attr === 'age') {
      // Age is always active (form field). Drop = accept all age groups.
      if (currentAge.length >= 3) continue; // already fully open
      currentAge = ['young', 'adult', 'senior'];
    } else {
      if (currentIntent[attr] === null) continue; // not active, skip
      currentIntent = { ...currentIntent, [attr]: null };
    }

    droppedSoFar.push(attr);
    const expanded = hardFilter(pool, currentIntent, sex, currentAge);

    if (expanded.candidates.length >= MIN_CANDIDATES) {
      return {
        candidates: expanded.candidates,
        expansionLevel: `dropped_${droppedSoFar.join('+')}`,
        annotations: expanded.matchDetails,
        droppedFilters: [...droppedSoFar],
      };
    }
  }

  // Final fallback: sex only (all narrative + age filters dropped)
  const sexOnly = pool.filter(a => sex.includes(a.sex.toLowerCase()));
  return {
    candidates: sexOnly,
    expansionLevel: 'sex_only',
    annotations: new Map(sexOnly.map(a => [a.shelterCode, {
      matchedAll: false,
      matchedFilters: ['sex'],
      missedFilters: [],
      unknownFilters: [],
    }])),
    droppedFilters: [...droppedSoFar, 'sex_expansion'],
  };
}
```

### Drop-order verification: "a black senior cat"

**Scenario:** Adopter wants a black senior cat. No black seniors exist, but black adults do.

- Intent: `color:["black"], size:null, breed:null, coat:null`
- Form: `sex:["female","male"], ageGroup:["senior"]`
- Strict filter: `color=black + age=senior` → 0 candidates.

Expansion loop:
1. **coat** → `null` → skip (already null, no-op)
2. **size** → `null` → skip (already null, no-op)
3. **breed** → `null` → skip (already null, no-op)
4. **age** → drop → `ageGroup = [young, adult, senior]`, color still `["black"]`
   → Filter: all black cats of requested sex, any age → **black adults found → ≥3 → RETURN** ✅

**Result:** Black adults returned. Color preserved. Age relaxed. ✅

**Counter-scenario:** "a senior cat" (no color stated). Intent: `color:null, size:null, breed:null, coat:null`. Strict filter: `age=senior` → suppose <3 seniors. Expansion: coat/size/breed/color all null → all skipped → drop age → all cats → ≥3 → RETURN. Correct: broadest pool when no narrative attributes were stated.

---

## ARTIFACT 2 (REVISED): Intent-Extraction Prompt Spec

### System Prompt (v2)

```
You are an intent extractor for an animal shelter adoption matcher. Given an adopter's
free-text description of what they're looking for, extract ONLY the structured attributes
they explicitly and unambiguously state. Do NOT infer, guess, or add attributes the
adopter didn't state.

EXTRACT these hard attributes (return null if not mentioned OR if mentioned ambiguously):

- color: specific color(s) the adopter names (e.g., "black", "orange", "tuxedo",
  "tabby", "calico", "grey").
  Map common terms: "ginger"→"orange", "gray"→"grey".
  "spotted"→null (too vague for a hard filter).

- size: "small", "medium", or "large" — ONLY if the adopter uses an unambiguous
  absolute size word.
  Do NOT infer size from breed (e.g., "chihuahua" does NOT imply size:"small" —
  breed matching handles size indirectly).

- breed: specific breed(s) mentioned (e.g., "siamese", "labrador", "ragdoll").
  "mixed breed" or "mutt" → null (not filterable).

- coat: hair length if clearly stated: "short", "medium", "long", "hairless".
  "fluffy" → ["long"]. "smooth" → ["short"]. Only extract when clearly about
  hair length, not texture.

COMPARATIVE, NEGATIVE, AND FUZZY LANGUAGE → softTerms, NEVER hard fields:
  Hard fields are ONLY for unambiguous stated values ("black", "small", "siamese").
  ANY fuzzy, comparative, hedged, or negative attribute language goes to softTerms:
    "not too big"           → size: null,  softTerms: ["not too big"]
    "any color but black"   → color: null, softTerms: ["any color but black"]
    "darkish"               → color: null, softTerms: ["darkish"]
    "smallish"              → size: null,  softTerms: ["smallish"]
    "medium to large"       → size: null,  softTerms: ["medium to large"]
    "preferably black"      → color: null, softTerms: ["preferably black"]
    "not a kitten"          → softTerms: ["not a kitten"]
  If in doubt whether something is unambiguous, put it in softTerms.

EXTRACT soft terms (always return as array, empty if none):
- softTerms: behavioral/personality descriptors, household-fit factors, AND any
  fuzzy/comparative/negative attribute language (see rule above).
  Examples: "playful", "calm", "good with kids", "lap cat", "active", "cuddly",
  "good with dogs", "independent", "kitten", "puppy", "hypoallergenic".

SPANISH INPUT — CRITICAL:
  When the narrative is in Spanish, you MUST return color and breed values in ENGLISH,
  because the hard filter matches against English values from the shelter database.
  This is load-bearing — Spanish values will silently fail the filter.
  Translation table (non-exhaustive):
    negro → black          blanco → white         gris → grey
    naranja/anaranjado → orange    atigrado → tabby
    marrón/café → brown    crema → cream          calico → calico
    siamés → siamese       persa → persian
  If unsure of the English equivalent, return null for that field and put the
  original Spanish term in softTerms.

RULES:
1. Extract ONLY what the adopter said. "A friendly cat" → all hard fields null,
   softTerms: ["friendly"].
2. If the narrative is empty or generic ("a cat", "any dog"), return all nulls +
   empty softTerms.
3. Return valid JSON only. No explanatory text before or after.
4. When multiple unambiguous values are possible, return as array:
   color: ["black", "white"].
5. NEVER infer one attribute from another. "Chihuahua" sets breed, NOT size.
   "Persian" sets breed, NOT coat.

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

- **Model:** claude-sonnet-4-6
- **Temperature:** 0.0 (deterministic extraction)
- **Max tokens:** 128
- **Cost:** ~200 input + ~50 output tokens per call ≈ $0.001/query

### Failure fallback

If intent extraction returns invalid JSON or API error:
- All intent fields = `null`, `softTerms = [narrative]` (entire narrative as one soft term).
- Effect: no narrative-derived hard filters applied — sex+age only (degrades to current behavior). Graceful.

### The single failure point

This is the ONE new place a failure can enter. Two failure modes:

1. **Over-extraction** (e.g., extracting `size:["small"]` from "not too big"): Hard filter excludes valid animals. Mitigated by FIX 2a (comparative→softTerms rule) and expansion fallback.
2. **Spanish mis-translation** (e.g., returning "negro" instead of "black"): Hard filter finds zero matches. Mitigated by FIX 2b (explicit translation table in prompt) and expansion fallback.

---

## ARTIFACT 3 (NEW): Extraction Able-to-Fail Control Set (for B3)

These cases will be run against the intent-extraction prompt before the build is trusted. Each specifies the input narrative and the exact expected output. A case PASSES if the output matches exactly. A case FAILS if any hard field contains a value that should be in softTerms, or softTerms is missing a value, or a Spanish term appears in a hard field.

### Case List

| # | Name | Narrative | Expected `color` | Expected `size` | Expected `breed` | Expected `coat` | Expected `softTerms` |
|---|------|-----------|-------------------|------------------|--------------------|-----------------|-----------------------|
| 1 | **Clean single** | "a black cat" | `["black"]` | `null` | `null` | `null` | `[]` |
| 2 | **Null (soft only)** | "a friendly cat" | `null` | `null` | `null` | `null` | `["friendly"]` |
| 3 | **Comparative size** | "a cat that's not too big" | `null` | `null` | `null` | `null` | `["not too big"]` |
| 4 | **Multi-attribute** | "small black kitten good with dogs" | `["black"]` | `["small"]` | `null` | `null` | `["kitten", "good with dogs"]` |
| 5 | **Inference trap (breed→size)** | "a chihuahua" | `null` | `null` | `["chihuahua"]` | `null` | `[]` |
| 6 | **Inference trap (breed→coat)** | "a persian cat" | `null` | `null` | `["persian"]` | `null` | `[]` |
| 7 | **Spanish clean** | "un gato negro pequeño" | `["black"]` | `["small"]` | `null` | `null` | `[]` |
| 8 | **Spanish comparative** | "un gato no muy grande" | `null` | `null` | `null` | `null` | `["not too big"]` or `["no muy grande"]` |
| 9 | **Negation trap** | "any color but black" | `null` | `null` | `null` | `null` | `["any color but black"]` |
| 10 | **Hedged color** | "preferably an orange tabby" | `null` | `null` | `null` | `null` | `["preferably orange tabby"]` or `["preferably an orange tabby"]` |
| 11 | **Multi-value color** | "a black and white cat" | `["black", "white"]` or `["black and white"]` | `null` | `null` | `null` | `[]` |
| 12 | **Comparative size + real color** | "a smallish grey cat" | `null` | `null` | `null` | `null` | `["smallish", "grey"]` or `["smallish grey"]` |
| 13 | **Empty narrative** | "" | `null` | `null` | `null` | `null` | `[]` |
| 14 | **Generic** | "just a nice cat" | `null` | `null` | `null` | `null` | `["nice"]` |
| 15 | **Spanish breed** | "un gato siamés" | `null` | `null` | `["siamese"]` | `null` | `[]` |
| 16 | **Coat stated** | "a long-haired black cat" | `["black"]` | `null` | `null` | `["long"]` | `[]` |
| 17 | **Negative breed** | "anything but a pit bull" | `null` | `null` | `null` | `null` | `["anything but a pit bull"]` |
| 18 | **Range size** | "a medium to large dog" | `null` | `null` | `null` | `null` | `["medium to large"]` |

### Pass/fail criteria

- **PASS:** All hard fields match expected values exactly (order within arrays doesn't matter). softTerms contains expected terms (additional minor rewordings acceptable if the core meaning is preserved — e.g., "not too big" vs "no muy grande" for case 8).
- **CRITICAL FAIL (blocker):** Any case where a comparative/negative/hedged term lands in a hard field (cases 3, 8, 9, 10, 12, 17, 18). This would cause silent exclusion of valid animals.
- **CRITICAL FAIL (blocker):** Any case where a Spanish term appears in a hard field instead of the English equivalent (cases 7, 8, 15). This would cause silent ES filter failure.
- **FAIL (non-blocker):** Inference trap violations (cases 5, 6) — extracting `size:["small"]` from "chihuahua" is wrong but recoverable via expansion.

### Execution plan (B3, not now)

Run all 18 cases against the actual intent-extraction prompt via direct API call. Log raw responses. Score pass/fail per case. Report results. Gate: if any CRITICAL FAIL, the prompt must be revised before the hard-filter module is built.

---

## Summary of revisions

1. **Drop order corrected:** `coat → size → breed → age → color`. Color is truly last — the adopter's most concrete visual intent is maximally preserved. Verified: "a black senior cat" returns black adults (color kept, age relaxed), not non-black seniors.

2. **Intent-extraction prompt hardened:** (a) Explicit comparative/negative → softTerms rule with 8 examples of what NOT to hard-extract. (b) Spanish→English translation table marked as LOAD-BEARING with fallback instruction (if unsure → null + softTerm).

3. **Missing-value handling:** Blank animal fields = SKIP (include + annotate as `[UNKNOWN]`), not hard-exclude. Prevents data-quality gaps from vanishing animals.

4. **Extraction control set specified:** 18 cases covering clean, null, comparative, multi-attribute, inference traps, Spanish, negation. 10 are CRITICAL-FAIL gated (comparatives + Spanish). Ready for B3 execution.
