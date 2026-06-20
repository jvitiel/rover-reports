# Phase-1 Rebuild — B2 Deviation Fixes

**Date:** 2026-06-20 14:31 UTC  
**Type:** BUILD (no commits, no restart, no acceptance tests)  
**Compile:** ✅ Clean (`tsc` exit 0)

---

## Changes

### CHANGE 1: Temperature 0.5 → 0.2

**File:** `customSearchSelect.ts` line 192  
**Before:** `temperature: 0.5`  
**After:** `temperature: 0.2`

Ranking is not creative; determinism is the goal. B3 will verify stability.

### CHANGE 2: [UNKNOWN] as distinct tier

**File:** `hardFilter.ts` — `formatAnnotation()` rewritten + new `annotationTier()` exported

Three distinct annotations:
```
[FULL MATCH]          → tier 0 (confirmed match on all filters)
[UNKNOWN: color]      → tier 1 (no mismatches, but attribute data missing)
[PARTIAL: missed color] → tier 2 (confirmed mismatch, expansion animal)
```

**Before:** unknowns-only → `[FULL MATCH]` (data-gap animals indistinguishable from confirmed matches)  
**After:** unknowns-only → `[UNKNOWN: X]` (honest — can't confirm, not a mismatch, but distinct from confirmed)

**Verified at runtime:**
```
formatAnnotation({missedFilters:[], unknownFilters:[]})        → '[FULL MATCH]'
formatAnnotation({missedFilters:[], unknownFilters:['color']}) → '[UNKNOWN: color]'
formatAnnotation({missedFilters:['color'], unknownFilters:[]}) → '[PARTIAL: missed color]'
formatAnnotation({missedFilters:['color'], unknownFilters:['size']}) → '[PARTIAL: missed color; unknown size]'
annotationTier({missedFilters:[], unknownFilters:[]})        → 0
annotationTier({missedFilters:[], unknownFilters:['color']}) → 1
annotationTier({missedFilters:['color'], unknownFilters:[]}) → 2
```

**File:** `customSearchSelect.ts` — system prompt updated

- Rule 3 now: "ALWAYS respect this tier order: [FULL MATCH] > [UNKNOWN] > [PARTIAL]. Never promote a lower tier above a higher one regardless of behavioral evidence."
- Rules 4-5 now specify "within the SAME tier"
- low_confidence section replaced: "low_confidence is determined by the system, not by you. Always set low_confidence to false in your response."

### CHANGE 3: Code-derived confidence + tier re-sort

**File:** `server.ts` — new block between Phase-1 result validation and Phase-2

**Tier re-sort (lines ~4606-4620):**
```typescript
validSelectedCodes.sort((a, b) => tierOf(a) - tierOf(b));
```
After the LLM returns its 3 picks, code re-sorts by tier: FULL > UNKNOWN > PARTIAL. The LLM controls within-tier ordering only; code enforces cross-tier. This means the LLM can never float a PARTIAL above a FULL MATCH, even if the PARTIAL has stronger behavioral evidence.

**Code-derived confidence (lines ~4622-4635):**
```typescript
const codeDerivedLowConfidence = candidateSet.expansionLevel !== 'none' || (() => {
  const fullCount = validSelectedCodes.filter(c => {
    const d = candidateSet.annotations.get(c);
    return d ? annotationTier(d) === 0 : false;
  }).length;
  return fullCount < 3;
})();
```

`low_confidence = true` when:
- Expansion was needed (`expansionLevel !== 'none'` — a stated filter had to be dropped), OR
- Fewer than 3 of the selected animals are [FULL MATCH] (can't fill all 3 slots with confirmed matches)

**Downstream override (line ~5409):**
```typescript
// Before:
const lowConfidence = parsed.low_confidence === true || usedFallback;
// After:
const lowConfidence = usedFallbackOverride;
```

The model's self-assessed `parsed.low_confidence` is **no longer consulted**. `usedFallbackOverride` is the code-derived value. The model's prompt now says "always set low_confidence to false" — any model output is discarded in favor of the code computation.

---

## Confirmations

**(a) low_confidence is now code-derived:** ✅ Computed from `expansionLevel` + full-match count. Model's self-assessment discarded. [VERIFIED — server.ts line ~5409 uses `usedFallbackOverride`, not `parsed.low_confidence`]

**(b) Tier order FULL>UNKNOWN>PARTIAL is code-enforced:** ✅ `validSelectedCodes.sort()` by `annotationTier()` after LLM returns picks. [VERIFIED — server.ts lines ~4606-4620]

**(c) [UNKNOWN] is a distinct annotation:** ✅ `formatAnnotation()` returns `[UNKNOWN: X]` when missedFilters empty + unknownFilters non-empty. `annotationTier()` returns 1 (between FULL=0 and PARTIAL=2). [VERIFIED — runtime test output above]

---

## Deviations

None. All three changes built as specified.

---

## Files Changed

| File | Lines changed | What |
|------|--------------|------|
| `customSearchSelect.ts` | ~8 lines | Temperature 0.2, prompt rules updated for 3 tiers, low_confidence delegated to code |
| `hardFilter.ts` | ~30 lines | `formatAnnotation()` rewritten for 3 tiers, new `annotationTier()` export |
| `server.ts` | ~25 lines | Tier re-sort block, code-derived confidence, downstream override |

## Files Untouched

| File | Status |
|------|--------|
| `intentExtractor.ts` | UNTOUCHED |
| Phase-2 prompts/bio assembly | UNTOUCHED |
| `customSearchSummary.ts` | UNTOUCHED |
| `localDatabase.ts` | UNTOUCHED |
| `shelterManagerService.ts` | UNTOUCHED |
| All app code | UNTOUCHED |
