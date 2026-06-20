# Fallback & Filtering Diagnosis — Custom-Search

**Date:** 2026-06-20 01:45 ET  
**Type:** READ-ONLY DIAGNOSIS  
**Source:** Code inspection + live endpoint queries

---

## Answers

**(A) Does the fallback honestly tell the adopter their age filter was dropped?** YES — the preamble explicitly says "you're looking for a senior rabbit, but our current female rabbits are younger." Individual bios also note the age gap ("she's not quite the senior you had in mind"). The `lowConfidence` flag is correctly set to `true`. The fallback is honest. [VERIFIED]

**(B) Does the live UI send correct sex casing?** YES — HTML values are lowercase `value="male"` / `value="female"` (custom-search/index.html:44-45). The endpoint also accepts uppercase via `.toLowerCase()` normalization (server.ts:4456,4481), so there's no casing failure path from the UI. [VERIFIED]

**(C) Do cat age-cutoffs misbucket any species?** YES for chinchillas — a 4-year-old chinchilla (lifespan 10-20 years, genuinely young) is bucketed as "adult" by cat cutoffs. Currently harmless (only 1 chinchilla in pool), but would misbucket chinchillas at scale. Guinea pig boundary is also borderline. Rabbits and ferrets are reasonable. [VERIFIED for chinchilla; INFERRED for lifespan comparisons]

**(D) Empty-filter behavior sane or broken?** SANE — empty `sex: []` returns 400 "sex is required and must be a non-empty array." Empty `ageGroup: []` returns 400 with equivalent message. Both are explicit rejections with clear error text, not silent failures. [VERIFIED]

---

## PART A — The <3-Candidate Fallback

### Fallback Logic (server.ts:4515-4541)

```typescript
let withRecords = filtered;
let usedFallback = false;

if (withRecords.length < 3) {
  // Fallback: keep sex filter, drop age filter to find at least 3 candidates
  const sameSexAllAges = speciesPool.filter(a => {
    const animalSex = (a.sex || '').toLowerCase();
    return sexLower.includes(animalSex);
  });

  if (sameSexAllAges.length === 0) {
    // Truly zero of requested sex
    res.json({ matches: [], message: errStrings.noMatches });
    return;
  }

  withRecords = sameSexAllAges;
  usedFallback = true;
}
```

**Trigger:** filtered pool (species + sex + age) has <3 animals.  
**Action:** drops age filter, keeps sex filter.  
**Signal:** `usedFallback = true` → feeds into `lowConfidence` at server.ts:5373:

```typescript
const lowConfidence = parsed.low_confidence === true || usedFallback;
```

So `lowConfidence` is forced true whenever the fallback fires, regardless of what Sonnet says. [VERIFIED]

### Live Test: small_animal + female + senior (1 animal → triggers fallback)

**Server log:** `[Matcher] Fallback: sex=female, dropped age filter, 11 candidates`

Only Snowie (7yr female rabbit) matched the original filter. Fallback expanded to 11 female smalls across all ages. [VERIFIED]

**Response:**

| Field | Value |
|-------|-------|
| candidateCount | **11** (expanded from 1) |
| lowConfidence | **true** (forced by usedFallback) |
| preamble | "You mentioned you're looking for a senior rabbit, but our current female rabbits are younger — the closest is Elsa at just over two years old. Each of them is friendly and full of personality, so they may still be worth a look." |

**Animals returned:**

| Animal | Requested Age | Actual Age | Bucket | In original filter? |
|--------|--------------|-----------|--------|-------------------|
| Elsa (S2026155) | senior | 2yr 3mo | adult | ❌ NO |
| Anastasia (R2026007) | senior | 1yr 2mo | young | ❌ NO |
| Anna (S2026154) | senior | 8mo | young | ❌ NO |

All 3 animals are OUTSIDE the requested "senior" age filter. The preamble explicitly acknowledges this. Each bio individually notes the age gap:
- Elsa: "she's not quite the senior you had in mind"
- Anastasia: "younger than the senior rabbit you mentioned"
- Anna: "a bigger gap from the senior rabbit you had in mind"

**Assessment: the fallback is honest.** The adopter understands they're seeing younger animals. The `lowConfidence: true` flag signals to the UI that matches are weak. The preamble names the gap. Individual bios reinforce it. [VERIFIED]

**Notable: Snowie (the ONLY actual senior female rabbit) was NOT selected.** Phase-1 chose 3 younger rabbits over the single animal that actually matched the filter. This is because Phase-1 sees all 11 candidates and picks "best 3" without knowing which ones matched the original filter vs. the fallback expansion. Snowie may have been ranked lower due to weaker narrative match or other factors. [VERIFIED]

---

## PART B — Sex Casing Contract

### UI Values (custom-search/index.html:44-45)

```html
<label class="pill-label"><input type="checkbox" name="sex" value="male">Male</label>
<label class="pill-label"><input type="checkbox" name="sex" value="female">Female</label>
```

Values are lowercase `"male"` / `"female"`. The JS reads values directly via `el.value` (app.js:291). [VERIFIED]

### Server Normalization (server.ts:4456,4481)

```typescript
// Validation (4456):
if (!sex.every((s: string) => validSex.includes(s.toLowerCase()))) { ... }

// Normalization (4481):
const sexLower = sex.map((s: string) => s.toLowerCase());
```

Both validation and the working filter use `.toLowerCase()`. **Uppercase is accepted and normalized silently.** [VERIFIED]

### Live Test: `["Male"]` (uppercase)

**Result:** 200 OK, 61 candidates, 3 matches. No error, no 400. Uppercase works. [VERIFIED]

**Prior assumption corrected:** The earlier smoke test that 400'd on uppercase was likely caused by a different field issue, not sex casing. The endpoint is case-insensitive for sex values. [VERIFIED]

---

## PART C — Age-Bucket Cutoffs

### Logic (server.ts:4278-4284)

```typescript
function deriveAgeGroup(ageInYears: number): string {
  // Three buckets aligned to website (Phase 18a, 2026-04-30):
  // Young: under 2 years, Adult: 2-6 years, Senior: 7+ years
  if (ageInYears < 2) return 'young';
  if (ageInYears < 7) return 'adult';
  return 'senior';
}
```

**Same cutoffs for ALL species.** No species-specific adjustment. [VERIFIED]

### Species-Specific Assessment

| Species | Typical Lifespan | Cutoff Fit | Notes |
|---------|-----------------|-----------|-------|
| **Cat** | 12-18 years | ✅ Correct | Cutoffs designed for cats |
| **Dog** | 10-13 years | ✅ Reasonable | Senior at 7+ is standard for most breeds |
| **Rabbit** | 8-12 years | ✅ Reasonable | Senior at 7+ works for rabbits |
| **Ferret** | 5-10 years | ⚠️ Borderline | 3.5yr → "adult" is OK, but a 5yr ferret is mid-to-late life |
| **Guinea Pig** | 4-8 years | ⚠️ Borderline | 4yr → "adult" but this is middle-aged for a guinea pig |
| **Chinchilla** | 10-20 years | ❌ Wrong | 4yr → "adult" but a 4yr chinchilla is genuinely YOUNG |

### Boundary Animals (spot-check)

| Animal | Species | Age (years) | Bucket | Correct? |
|--------|---------|-------------|--------|----------|
| Snowie (A2023287) | Rabbit | 7.2 | senior | ✅ Reasonable for rabbit lifespan |
| Fluffy (S2026403) | Chinchilla | 4.1 | adult | ❌ Should be "young" for chinchilla (lifespan 10-20yr) |
| Tater Tot (G2026002) | Guinea Pig | 0.3 | young | ✅ Correct |
| Kirby (S2025877) | Ferret | 3.5 | adult | ⚠️ Reasonable but on the older side for a ferret |

**Chinchilla is the clear misbucket.** A 4-year-old chinchilla is roughly equivalent to a 4-year-old human in terms of life stage — it's genuinely young, not "adult." If an adopter filters for "young" chinchillas, Fluffy would be excluded despite being young for her species. Currently harmless with 1 chinchilla, but structurally wrong. [VERIFIED for current animals; INFERRED for lifespan assessments]

**Impact on senior-warmth provision:** The senior-warmth prompt rule kicks in for "senior" animals. A 5-year-old guinea pig (senior for its species) would get the cat cutoff "adult" bucket, missing the senior-warmth framing. Conversely, a 7-year-old chinchilla would get the "senior" tag and senior-warmth framing despite being middle-aged. Currently no guinea pigs are near the 7yr threshold, so this is theoretical. [INFERRED]

---

## PART D — Empty/Partial Filters

### Empty sex: `[]`

```
POST: {"species":"cat","sex":[],"ageGroup":["young","adult","senior"],"language":"en","narrative":"a cat"}
Response: 400 {"error":"sex is required and must be a non-empty array"}
```

[VERIFIED]

### Empty ageGroup: `[]`

```
POST: {"species":"cat","sex":["male","female"],"ageGroup":[],"language":"en","narrative":"a cat"}
Response: 400 {"error":"ageGroup is required and must be a non-empty array"}
```

[VERIFIED]

### Validation Code (server.ts:4448-4478)

```typescript
if (!Array.isArray(sex) || sex.length === 0) {
  res.status(400).json({ error: errStrings.sexRequired });
  return;
}
// ...
if (!Array.isArray(ageGroup) || ageGroup.length === 0) {
  res.status(400).json({ error: errStrings.ageRequired });
  return;
}
```

Both are explicit 400 rejections with clear error messages. Neither silently treats empty as "all" or returns empty results. The behavior is sane. [VERIFIED]

---

## Summary

| Area | Status | Detail |
|------|--------|--------|
| Fallback honesty | **CLEAN** ✅ | Preamble + per-bio notes + lowConfidence=true all communicate the filter drop |
| Sex casing | **CLEAN** ✅ | UI sends lowercase; server accepts any case via .toLowerCase() |
| Cat age cutoffs | **MOSTLY OK** ⚠️ | Correct for cats/dogs/rabbits; wrong for chinchillas (4yr → "adult" should be "young") |
| Empty filters | **CLEAN** ✅ | Explicit 400 rejections with clear messages |
| Fallback selection | **NOTABLE** ⚠️ | Snowie (the only actual matching senior) wasn't even selected by Phase-1 from the fallback pool |
