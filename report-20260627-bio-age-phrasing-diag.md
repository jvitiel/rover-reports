# Bio Age Phrasing Diagnosis

**Date:** 2026-06-27 20:30 UTC  
**Type:** Read-only diagnosis  
**Goal:** Locate where precise-age phrasing originates and identify test-set animals

---

## PART A — The Prompt and Age Mechanism

### A1. Where the age enters the bio

**Mechanism: Code-injected precise value.**

The animal's age is a pre-formatted string from ShelterManager (`raw.ANIMALAGE`), mapped at shelterManagerService.ts:57:

```typescript
age: raw.ANIMALAGE || 'Unknown',
```

SM provides values like `"8 Years, 8 Months."`, `"1 Year, 6 Months."`, `"3 Years."`.

This string is injected verbatim into the GPT user prompt in `generateAnimalBio()` at attributeParser.ts:273:

```typescript
const animalContext = `
Animal Information (from ShelterManager):
- Name: ${input.name}
- Species: ${input.species}
- Breed: ${input.breed}
- Age: ${input.age}
...
```

The model sees `- Age: 8 Years, 8 Months.` and naturally incorporates it into the bio as "8 years and 8 months young" or "an 8-year-old" etc. **The prompt does NOT instruct the model to state the age** — there is no "include the animal's age" directive. But by providing a precise age value with no instruction to avoid or round it, the model uses it literally.

### A2. How many prompts need the fix

**4 prompt sites total, 2 that need the age fix:**

| # | Prompt | File:Line | Age injected? | Needs fix? |
|---|--------|-----------|---------------|------------|
| 1 | `BIO_GENERATION_PROMPT` (main: 4 bios at once) | attributeParser.ts:205 | Yes, via `animalContext` at :273 | **YES** |
| 2 | `BIO_LONG_PROMPT` (single-size regen, long) | attributeParser.ts:305 | Yes, same `animalContext` pattern at :341 | **YES** |
| 3 | `BIO_SHORT_PROMPT` (single-size regen, short) | attributeParser.ts:318 | Yes, same `animalContext` pattern at :341 | **YES** |
| 4 | `renderAdultGenericBios` (deterministic template) | server.ts:12848 | Yes, via `normalizeAgeEn(age)` at :12853 | **Separate** — template, not GPT |

Prompts 1–3 share the same `animalContext` block construction, so the age value enters identically. The fix can be applied either:
- At the `animalContext` construction (one place, affects all 3 GPT prompts), OR
- As a prompt instruction in each of the 3 system prompts

Prompt 4 (adult generic) is a hardcoded template (`approximately ${ageEn} old`) — not GPT-generated. It would need a separate template edit if age phrasing should change there too.

**Matcher bio prompts** (server.ts:5231+) also receive `Age: ${animal.age}` (line 4889) but those are personalized per-adopter bios, not the profile bios in question. The matcher prompts already have extensive age-handling instructions (lines ~5280–5310) prohibiting age-based temperament claims, but do NOT restrict age-as-fact statements. Separate concern.

### A3. Existing age phrasing guidance

**In `BIO_GENERATION_PROMPT`:** None. No mention of age at all — no instruction to include it, avoid it, or phrase it any particular way.

**In matcher prompts (for reference):** Extensive guidance about not deriving personality from age (server.ts ~5280–5310: "State the age as a fact; say nothing about what the age implies for temperament"). But no guidance about precision/rounding. And these don't affect the profile bio pipeline anyway.

---

## PART B — The Test Set

### B1. Specific bad phrases John flagged

| Phrase | Animal(s) | Field | Surrounding context |
|--------|-----------|-------|-------------------|
| "nearly four years old" | A2023301 | bio_en_long | "At nearly four years old, this gentle soul has a heart as big as..." |
| "just over a year old" | A2026025, A2026050, A2026051, R2026007, S2026079, S2026390, S2026519 | bio_en_long | various "just over a year old" phrasings |
| "10 years old" / "10-year-old" | A2025203, S20241225, S2025503, S2026558 | long+short | "a spirited 10-year-old Maltese mix" etc. |
| "8 years and 8 months" | S2025961 | bio_en_long | "At 8 years and 8 months young, Segundo enjoys the simpl..." |
| "1 year and 6 months" | S2026527, W2026074 | bio_en_long | various |
| "two-year-old brindle terrier" | A2025018 | bio_en_long | "Meet Ryder, a two-year-old brindle terrier mix whose zest for life..." |
| "5-year-old" / "5 years old" | A2026061, S20241035 | bio_en_long | "At 5 years old, Clover is the perfect companion..." |

### B2. Broad scan — precise-age language prevalence

| Scope | Count |
|-------|-------|
| Non-generic bios with precise age in bio_en_long | 126 |
| Non-generic bios with precise age in bio_en_short | 60 |
| Unique animals (either field, non-generic) | ~130 |
| **Adoptable animals with precise age** | **64** |

### B3. Recommended test set — 10 adoptable animals with diverse age patterns

| # | Code | Name | Source | Age phrase in bio | Pattern type |
|---|------|------|--------|-------------------|-------------|
| 1 | A2023267 | Cookie | promote_from_draft | "At 8 years young" | N-years-young |
| 2 | A2023301 | (unknown) | backfill | "nearly four years old" | nearly-N |
| 3 | A2024053 | Nanook | promote_from_draft | "a spirited 3-year-old Husky" | N-year-old |
| 4 | A2025018 | Ryder | promote_from_draft | "a two-year-old brindle terrier mix" | written-out-N-year-old |
| 5 | A2025088 | (unknown) | promote_from_draft | "This three-year-old bundle of energy" | written-out |
| 6 | A2025167 | (unknown) | promote_from_draft | "At just 1 year and 9 months old" | years-and-months |
| 7 | A2025203 | Marshmallow | full_generate | "a spirited 10-year-old Maltese mix" | N-year-old (double digit) |
| 8 | S2025961 | Segundo | (unknown) | "At 8 years and 8 months young" | years-and-months precise |
| 9 | S2026047 | Buckley | backfill | "At 1 year and 11 months old" | years-and-months |
| 10 | A2026025 | (unknown) | promote_from_draft | "just over a year old" | just-over |

These cover all the bad-phrasing patterns: numeric year-old, written-out year-old, years-and-months, nearly-N, just-over, N-years-young. All are adoptable, so a post-fix regen produces a meaningful before/after comparison.

---

## PART C — Safe Regen Path (description only)

### Single-animal draft regen endpoint

```
POST /api/bio/generate/:animalId
```

(server.ts:2177)

This calls `generateBioDraftForAnimal(shelterCode)` which:
1. Fetches the animal from SM
2. Loads caregiver data (behavior notes or SM comment)
3. Calls `generateAnimalBio()` → GPT-4o → returns 4 bios
4. Calls `saveAnimalBioDraft()` → writes to `animal_bio_drafts` only

**The live `animal_bios` row is NOT touched.** The draft lands in `animal_bio_drafts` with `promoted_long=0, promoted_short=0`. It becomes public only when staff explicitly promotes it via `POST /api/bio/draft/:shelterCode/promote/:size`.

**Safe test procedure (after prompt fix):**
```bash
curl -X POST http://localhost:3000/api/bio/generate/A2025018
```
Then compare the returned draft content against the current `animal_bios` row for A2025018. The live bio remains unchanged until manual promotion.

**For size-specific regen:**
```
POST /api/bio/:shelterCode/regenerate/:size   (size = 'long' | 'short')
```
(server.ts:2205) — also writes to `animal_bio_drafts` only, per-size.

---

## Summary

| Finding | Detail |
|---------|--------|
| Age source | SM's `ANIMALAGE` field, injected verbatim as `- Age: ${input.age}` in GPT prompt context |
| Prompt sites | 3 GPT prompts (all share same `animalContext`), 1 deterministic template |
| Existing age guidance | None in bio prompts; extensive in matcher prompts (but different pipeline) |
| Bios with precise-age phrasing | ~130 total, 64 adoptable |
| Fix approach | Add age-phrasing instruction to `BIO_GENERATION_PROMPT` and/or modify `animalContext` age line; same for `BIO_LONG_PROMPT`/`BIO_SHORT_PROMPT` |
| Safe regen | `POST /api/bio/generate/:animalId` → draft only, no public impact |
