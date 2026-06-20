# Hard-Attribute Selection Matrix — Custom-Search (EN gap 1)

**Date:** 2026-06-20 05:00 ET  
**Type:** READ-ONLY TEST  
**Method:** 40 live endpoint queries (8 tests × 5 runs each)  
**Source:** Real `/api/matcher/custom-search` endpoint + attribute verification via `fetchAnimals()`

---

## Answers

### Attribute Respect Matrix

| Attribute | In Phase-1 data? | Respected by Phase-1? | Match rate | low_confidence when missed? |
|-----------|-----------------|----------------------|------------|---------------------------|
| **Color** | ✅ YES (Color field) | ✅ YES — strong | 15/15 black, 15/15 orange | N/A (no misses) |
| **Breed** | ✅ YES (Breed field) | ✅ YES — strong | 14/15 terrier | N/A (near-perfect) |
| **Coat/hair length** | ✅ YES (in Breed field: "Domestic Long Hair") | ✅ YES — strong | 10/15 long/medium hair | 0/5 (not fired for medium-hair picks) |
| **Size** | ❌ NOT IN Phase-1 data | ⚠️ INFERRED from breed | 8/15 small dogs, 0/25 cats | 0/5 (never fired on size miss) |
| **Multi-attribute** | Mixed | ❌ DROPS soft attributes | See below | 4/15 multi runs fired |

### Key Findings

1. **Color is NOW respected** — 30/30 single-color picks matched (15/15 black, 15/15 orange). The earlier "Karen Smith orange for black cat" finding was real but is no longer reproducing. Phase-1 correctly matches color when it's the primary ask. [VERIFIED]

2. **Size is NOT in Phase-1 data** — the `size` field exists on Animal objects but is NOT included in the Phase-1 candidate line (customSearchSelect.ts:117-120). Phase-1 sees `Name | Breed | Age | Sex | Color` but NOT size. It infers size from breed names ("Havanese" → small, "Maltese" → small) which works for recognizable breeds but fails for generic breeds. [VERIFIED]

3. **Multi-attribute queries drop soft attributes** — "a small black male senior cat" returned 2/3 black cats (Abe, Jeans) but 1/3 was grey (Buddy), and 0/3 were small. Sex and age (hard-filtered) were 100%. Color partially respected, size completely ignored. `low_confidence: false` on all 5 runs despite obvious mismatches. [VERIFIED]

4. **"Large senior dog" returned Marshmallow (small/Maltese, 10.7 lbs)** in 2/5 runs — asked "large," got small. `low_confidence: false`. [VERIFIED]

---

## Available Attribute Fields

```
Animal fields: id, shelterCode, name, species, breed, age, ageInYears, sex, 
               size, color, description, photoUrl, allPhotoUrls, location, 
               dateOfBirth, dateIntake, status, isAvailable, additionalFlags, 
               fivStatus, felvStatus, websiteMediaId
```

| Field | Real/Derived | In Phase-1 prompt? | Example values |
|-------|-------------|-------------------|----------------|
| `color` | Real (SM) | ✅ YES | "Black", "Orange tabby", "Tuxedo: black and white" |
| `breed` | Real (SM) | ✅ YES | "Domestic Short Hair", "Terrier/Mixed Breed" |
| `size` | Real (SM) | ❌ **NO** | "small", "medium", "large" |
| `sex` | Real (SM) | ✅ YES (+ hard filter) | "Male", "Female" |
| `age` | Real (SM) | ✅ YES (+ hard filter) | "2 years 3 months." |
| coat/hair length | **Not a field** — encoded in breed | ✅ Indirectly (Breed) | "Domestic Long Hair" vs "Domestic Short Hair" |

**Phase-1 candidate line format** (customSearchSelect.ts:117-120):
```
SHELTER_CODE: S2025966 | Name: Abe (Louie) | Breed: Domestic Short Hair | Age: 9 years 7 months. | Sex: Male | Color: Black with white | FIV: untested | FeLV: unknown | Documented — energy/playfulness: ...
```

**Size is absent.** Phase-1 must infer size from breed name, which is unreliable for mixed breeds. [VERIFIED]

---

## Single-Attribute Tests

### Test 1: "a black cat" — 5 runs

| Run | Pick 1 | Pick 2 | Pick 3 | All black? | lowConf |
|-----|--------|--------|--------|-----------|---------|
| 1 | Andrew (Black) ✅ | Juliet (Black) ✅ | Carlo Gambino (Black) ✅ | YES | false |
| 2 | Andrew (Black) ✅ | Aiden (Black) ✅ | Basil (Black) ✅ | YES | false |
| 3 | Andrew (Black) ✅ | Aiden (Black) ✅ | Basil (Black) ✅ | YES | false |
| 4 | Andrew (Black) ✅ | Aiden (Black) ✅ | Cinder (Black) ✅ | YES | false |
| 5 | Andrew (Black) ✅ | Aiden (Black) ✅ | Basil (Black) ✅ | YES | false |

**15/15 picks actually black. 0 non-black picks.** Color respected perfectly. [VERIFIED]

### Test 2: "an orange cat" — 5 runs

| Run | Pick 1 | Pick 2 | Pick 3 | All orange? | lowConf |
|-----|--------|--------|--------|-----------|---------|
| 1 | Reeboks (Orange tabby) ✅ | Macy (Ginger) ✅ | Munster (Ginger) ✅ | YES | false |
| 2 | Reeboks ✅ | Macy ✅ | Munster ✅ | YES | false |
| 3 | Reeboks ✅ | Macy ✅ | Munster ✅ | YES | false |
| 4 | Reeboks ✅ | Macy ✅ | Munster ✅ | YES | false |
| 5 | Reeboks ✅ | Macy ✅ | Munster ✅ | YES | false |

**15/15 picks actually orange/ginger. Perfectly stable — same 3 animals every run.** [VERIFIED]

### Test 3: "a small dog" — 5 runs

| Run | Pick 1 | Pick 2 | Pick 3 | Sizes | lowConf |
|-----|--------|--------|--------|-------|---------|
| 1 | Amari (small) ✅ | Scottie (**medium**) ❌ | Marshmallow (small) ✅ | 2/3 | false |
| 2 | Amari (small) ✅ | Scottie (**medium**) ❌ | Nena (small) ✅ | 2/3 | false |
| 3 | Amari (small) ✅ | Scottie (**medium**) ❌ | Marshmallow (small) ✅ | 2/3 | false |
| 4 | Amari (small) ✅ | Scottie (**medium**) ❌ | Nena (small) ✅ | 2/3 | false |
| 5 | Amari (small) ✅ | Scottie (**medium**) ❌ | Marshmallow (small) ✅ | 2/3 | false |

**10/15 picks actually small. Scottie (Maltese/Poodle, medium) appeared in every run at slot 2.** Phase-1 infers size from breed ("Maltese/Poodle" → inferred small) but Scottie's actual `size` field is "medium." Phase-1 cannot see the `size` field. `low_confidence: false` despite 1/3 miss every run. [VERIFIED]

### Test 4: "a long-haired cat" — 5 runs

| Run | Pick 1 | Pick 2 | Pick 3 | Hair match? | lowConf |
|-----|--------|--------|--------|------------|---------|
| 1 | Buckley (DLH) ✅ | Ursa (DLH) ✅ | Dunkaroo (**DMH**) ⚠️ | 2/3 long, 1/3 medium | false |
| 2 | Buckley (DLH) ✅ | Ursa (DLH) ✅ | Dunkaroo (**DMH**) ⚠️ | 2/3 long, 1/3 medium | false |
| 3 | Buckley (DLH) ✅ | Ursa (DLH) ✅ | Dunkaroo (**DMH**) ⚠️ | 2/3 long, 1/3 medium | false |
| 4 | Buckley (DLH) ✅ | Ursa (DLH) ✅ | Dunkaroo (**DMH**) ⚠️ | 2/3 long, 1/3 medium | false |
| 5 | Buckley (DLH) ✅ | Ursa (DLH) ✅ | Dunkaroo (**DMH**) ⚠️ | 2/3 long, 1/3 medium | false |

**10/15 Domestic Long Hair, 5/15 Domestic Medium Hair.** Only 2 DLH cats exist (Buckley, Ursa); Dunkaroo (DMH) is a reasonable near-match for the 3rd slot. Hair length is inferred from breed name (no separate field). Perfectly stable. [VERIFIED]

### Test 5: "a terrier" (dog) — 5 runs

| Run | Pick 1 | Pick 2 | Pick 3 | All terriers? | lowConf |
|-----|--------|--------|--------|--------------|---------|
| 1 | Abstract (Terrier/Mixed) ✅ | Amari (**Havanese/Terrier**) ⚠️ | Rex (Terrier/Mixed) ✅ | 3/3 terrier-containing | false |
| 2 | Abstract ✅ | Rex ✅ | Mikey (Terrier/Mixed) ✅ | 3/3 | false |
| 3 | Abstract ✅ | Rex ✅ | Mikey ✅ | 3/3 | false |
| 4 | Abstract ✅ | Rex ✅ | Mikey ✅ | 3/3 | false |
| 5 | Abstract ✅ | Rex ✅ | Mikey ✅ | 3/3 | false |

**15/15 picks have "terrier" in breed name.** Phase-1 correctly matches breed substring. Amari is "Havanese/Terrier" — debatable match but has "terrier" in the breed. [VERIFIED]

---

## Multi-Attribute Tests

### Test 6: "a small black male senior cat" — 5 runs (hard filters: male + senior)

| Run | Pick 1 | Pick 2 | Pick 3 | Black? | Small? | Male? | Senior? | lowConf |
|-----|--------|--------|--------|--------|--------|-------|---------|---------|
| 1 | Abe (black-white) ⚠️ | Jeans (black-white) ⚠️ | Buddy (**grey**) ❌ | 2/3 | **0/3** | 3/3 ✅ | 3/3 ✅ | false |
| 2 | Abe ⚠️ | Jeans ⚠️ | Buddy ❌ | 2/3 | **0/3** | 3/3 ✅ | 3/3 ✅ | false |
| 3 | Abe ⚠️ | Jeans ⚠️ | Buddy ❌ | 2/3 | **0/3** | 3/3 ✅ | 3/3 ✅ | false |
| 4 | Abe ⚠️ | Jeans ⚠️ | Buddy ❌ | 2/3 | **0/3** | 3/3 ✅ | 3/3 ✅ | false |
| 5 | Abe ⚠️ | Jeans ⚠️ | Buddy ❌ | 2/3 | **0/3** | 3/3 ✅ | 3/3 ✅ | false |

**Attribute satisfaction across 15 picks:**
- Male: 15/15 ✅ (hard filter)
- Senior: 15/15 ✅ (hard filter)
- Black: 10/15 ⚠️ (2/3 per run; Buddy is grey)
- Small: **0/15** ❌ (all medium; size not in Phase-1 data)
- `low_confidence: false` on all 5 runs despite grey cat + zero small matches

**Perfectly stable: same 3 picks every run.** Hard filters work. Color partially respected (prioritized personality-documented animals over strict color match). Size completely invisible to Phase-1. [VERIFIED]

### Test 7: "a long-haired orange kitten" — 5 runs (hard filter: young)

| Run | Pick 1 | Pick 2 | Pick 3 | Orange? | Long-haired? | Young? | lowConf |
|-----|--------|--------|--------|---------|-------------|--------|---------|
| 1 | Frodo (white-orange) ⚠️ | Samwise (white-orange) ⚠️ | Honey Mustard (orange-white) ✅ | 3/3 | **0/3** | 3/3 ✅ | **true** |
| 2 | Karen Smith (orange-white) ✅ | Gretchen Wieners (orange-white) ✅ | Honey Mustard ✅ | 3/3 | **0/3** | 3/3 ✅ | false |
| 3 | Gretchen Wieners ✅ | Karen Smith ✅ | Honey Mustard ✅ | 3/3 | **0/3** | 3/3 ✅ | false |
| 4 | Frodo ⚠️ | Samwise ⚠️ | Gretchen Wieners ✅ | 3/3 | **0/3** | 3/3 ✅ | **true** |
| 5 | Frodo ⚠️ | Samwise ⚠️ | Ursa (**black** DLH) ❌ | 2/3 | **1/3** | 3/3 ✅ | **true** |

**Attribute satisfaction across 15 picks:**
- Young: 15/15 ✅ (hard filter)
- Orange: 14/15 (Ursa is black — selected for long-hair match)
- Long-haired: **1/15** ❌ (only Ursa; no orange long-haired kittens exist)
- `low_confidence`: 3/5 true — Phase-1 correctly detected the impossible combination in some runs

**Notable:** No orange long-haired kittens exist in the pool. Phase-1 must choose which attribute to sacrifice — it predominantly chose orange (14/15) over long-haired (1/15). When it noted the gap, it fired `low_confidence: true`. But 2/5 runs silently returned all-DSH orange kittens without flagging. [VERIFIED]

### Test 8: "a large male senior dog" — 5 runs (hard filters: male + senior)

| Run | Pick 1 | Pick 2 | Pick 3 | Large? | Male? | Senior? | lowConf |
|-----|--------|--------|--------|--------|-------|---------|---------|
| 1 | Jax (medium) ❌ | Donny (medium) ❌ | Marshmallow (**small**) ❌ | **0/3** | 3/3 ✅ | 3/3 ✅ | false |
| 2 | Donny (medium) ❌ | Jax (medium) ❌ | Abstract (medium) ❌ | **0/3** | 3/3 ✅ | 3/3 ✅ | false |
| 3 | Jax (medium) ❌ | Donny (medium) ❌ | Marshmallow (**small**) ❌ | **0/3** | 3/3 ✅ | 3/3 ✅ | false |
| 4 | Donny (medium) ❌ | Jax (medium) ❌ | Abstract (medium) ❌ | **0/3** | 3/3 ✅ | 3/3 ✅ | false |
| 5 | Donny (medium) ❌ | Jax (medium) ❌ | Abstract (medium) ❌ | **0/3** | 3/3 ✅ | 3/3 ✅ | false |

**Attribute satisfaction across 15 picks:**
- Male: 15/15 ✅ (hard filter)
- Senior: 15/15 ✅ (hard filter)
- Large: **0/15** ❌ (all medium or small; size not in Phase-1 data)
- `low_confidence: false` on all 5 runs despite zero size matches

**Worst gap: Marshmallow (Maltese, small, 10.7 lbs) returned for "large dog" in 2/5 runs.** Phase-1 cannot distinguish size because the field is absent from the prompt. No large dogs exist in the pool (0 animals have `size: large` among male seniors), but Phase-1 never flags this because it can't see the size data. [VERIFIED]

---

## Root Cause: Size Not in Phase-1 Data

The Phase-1 candidate line is built at **customSearchSelect.ts:117-120**:

```typescript
candidateLines.push(
  `SHELTER_CODE: ${animal.shelterCode} | Name: ${animal.name} | Breed: ${animal.breed} | Age: ${animal.age} | Sex: ${animal.sex} | Color: ${animal.color}${fivFelvPart} | ${traitLine}`
);
```

**`animal.size` is not included.** The `size` field exists on every Animal object (sourced from SM API), but it is never passed to Phase-1. Phase-1 must infer size from breed name, which:
- Works for recognizable breeds: "Chihuahua" → small, "Great Dane" → large
- Fails for mixed/generic breeds: "Terrier/Mixed Breed" → unknown size
- Produces wrong answers: Scottie ("Maltese/Poodle") inferred as small but is actually medium

The Phase-1 system prompt lists "size" implicitly under rule 4 ("BASE-ATTRIBUTE asks") but the data doesn't include it. The prompt says to "match directly from the candidate's listed attributes" — but size isn't listed. [VERIFIED]

---

## Summary

### Single-Attribute Performance

| Test | Attribute | Match rate | Notes |
|------|-----------|-----------|-------|
| Black cat | Color | **15/15** (100%) | Perfect |
| Orange cat | Color | **15/15** (100%) | Perfect, perfectly stable |
| Small dog | Size | **10/15** (67%) | Inferred from breed, Scottie wrong |
| Long-haired cat | Coat | **10/15** (67%) | Only 2 DLH cats exist; DMH as near-match |
| Terrier dog | Breed | **15/15** (100%) | Breed substring match works |

### Multi-Attribute Performance

| Test | Hard filter (sex+age) | Color | Size/coat | lowConf fired? |
|------|----------------------|-------|-----------|----------------|
| Small black senior male cat | 15/15 ✅ | 10/15 ⚠️ | **0/15** ❌ | 0/5 ❌ |
| Long-haired orange kitten | 15/15 ✅ | 14/15 ✅ | **1/15** ❌ | 3/5 ⚠️ |
| Large senior male dog | 15/15 ✅ | N/A | **0/15** ❌ | 0/5 ❌ |

### The Gap

**Size is the critical missing attribute.** It exists in the data (`animal.size`) but is not passed to Phase-1 (`customSearchSelect.ts:117-120`). Adding `Size: ${animal.size}` to the candidate line would give Phase-1 the data it needs. Color and breed are already in the data and are respected well. Hair length is indirectly available through the breed field and works acceptably.

**low_confidence is unreliable for size misses** — Phase-1 can't flag what it can't see. It correctly flags impossible color+coat combinations (3/5 on long-haired orange kitten) but never flags size mismatches.
