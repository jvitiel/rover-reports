# Verification Re-Run: Corrected Data Source (fetchAnimals)

**Date:** 2026-06-18 13:41 ET  
**Production unchanged:** No code changes, no API calls, no commits to shelter-apps. [VERIFIED]  
**Data source:** SM API (`json_shelter_animals`) + SQLite `behavior_notes` — identical to production custom-search path. [VERIFIED]

---

## Fix Applied

Harness v2 sources data exactly as the custom-search endpoint does:
- Animals from SM API via `fetchAnimals()` equivalent (`description = raw.ANIMALCOMMENTS`)
- Behavior notes from SQLite via `getBehaviorNotes()` replica (post-Change-B)
- Does NOT use `/api/animals` or `resolveBioText()` anywhere

[VERIFIED — harness reads secrets, hits SM API directly, normalizes with same logic as `shelterManagerService.ts:41-87`]

---

## 1. Tier-2 SM-Only Cats (Corrected)

### S20251236 Blizzard (77 chars)

```
RAW ANIMALCOMMENTS: "Not meant to be a household pet, but would be a great barn cat."
TRAIT LINE: Shelter note: Not meant to be a household pet, but would be a great barn cat.
```

Unchanged from prior run — Blizzard's approved bio happens to be identical to ANIMALCOMMENTS. [VERIFIED]

### S2023297 Iron (211 chars)

```
RAW ANIMALCOMMENTS: "Iron found the shelter environment to stressful for him, he is front declaw and that makes him feel very venerable. he got sick and didn't like to be handle, he got very depress. he is been foster and flourish as the handsome gentleman he is. He would love a quite home."
TRAIT LINE: Shelter note: Iron found the shelter environment to stressful for him, he is front declaw and that makes him feel very venerable. he got sick and didn't like to be handle, he got very depress. he is been foster…
```

Unchanged — Iron's bio is draft (not approved), so `resolveBioText()` fell back to ANIMALCOMMENTS anyway. [VERIFIED]

### R2024025 Lucky (77 chars) ⚠️ CHANGED FROM PRIOR RUN

```
RAW ANIMALCOMMENTS: "Not meant to be a household pet, but would be a great barn cat."
TRAIT LINE: Shelter note: Not meant to be a household pet, but would be a great barn cat.
```

**Prior (wrong) harness output was:** `Shelter note: Meet Lucky, the charming ginger cat who's looking for a new adventure! At 12 years and 10 months, Lucky is a seasoned explorer...` (207 chars — the AI-generated approved bio).

**Now correctly shows the raw ANIMALCOMMENTS:** the short barn-cat note. [VERIFIED]

### S20241161 Munster (77 chars) ⚠️ CHANGED FROM PRIOR RUN

```
RAW ANIMALCOMMENTS: "Not meant to be a household pet, but would be a great barn cat."
TRAIT LINE: Shelter note: Not meant to be a household pet, but would be a great barn cat.
```

**Prior (wrong) harness output was:** `Shelter note: Meet Munster, the spirited ginger Domestic Short Hair with a heart as fierce as his color. At 4 years and 7 months old, Munster is a natural adventurer, perfectly suited for life as a barn cat. He…` (211 chars — the AI-generated approved bio).

**Now correctly shows the raw ANIMALCOMMENTS:** the short barn-cat note. [VERIFIED]

### Key finding

Lucky, Blizzard, and Munster all share the **identical** ANIMALCOMMENTS: `"Not meant to be a household pet, but would be a great barn cat."` This appears to be a shelter-entered template applied to all barn-cat placements. In production, 3 of 4 tier-2 cats will produce identical 77-char trait lines. Only Iron has unique SM text. [VERIFIED]

---

## 2. No-AI-Bio Guard

**Check:** Scanned all 4 tier-2 lines for AI-generated bio signals (`charming`, `heart full of`, `seasoned explorer`, `spirited`, `natural adventurer`, `boundless spirit`, `adopt him today`, `perfect fit for`, `flourish in his natural`, etc.).

**Result:** Zero matches. No tier-2 line contains any AI-generated bio text. All 4 lines contain raw operator-entered ANIMALCOMMENTS only. [VERIFIED]

---

## 3. Tier-1 Spot-Check

### S2026447 Karen Smith (tier 1, 205 chars)

```
Documented — energy/playfulness: Very playful, climbs and jumps; with kids: Good with kids, caregiver's kids love her; with cats: Good with other cats; with dogs: Good with other dogs, caregiver has a dog.
```

✅ Identical to prior Stage-1 output. [VERIFIED]

### S2026357 Lilac (tier 1, 197 chars)

```
Documented — energy/playfulness: Very playful, likes the toys; with kids: Could be good with kids, I believe; with cats: Good with cats, has three other siblings; with dogs: Dogs, I don't know yet.
```

✅ Identical to prior Stage-1 output. [VERIFIED]

### S2025966 Abe (tier 1, 133 chars)

```
Documented — energy/playfulness: Low; with kids: Very good with kids; with cats: Very good with cats; with dogs: Very good with dogs.
```

✅ Identical to prior Stage-1 output. [VERIFIED]

---

## 4. Tier-3 Spot-Check

| Code | Name | Output |
|---|---|---|
| S2026495 | Andrew | `Documented — none.` (18 chars) |
| S2026346 | Basil | `Documented — none.` (18 chars) |
| S2026535 | Bobby | `Documented — none.` (18 chars) |
| S2026557 | Buddy | `Documented — none.` (18 chars) |

All 77 tier-3 cats produce the identical 18-char line. [VERIFIED]

---

## 5. Length Recheck (Corrected Data)

### Overall

| Metric | Prior (wrong source) | Corrected |
|---|---|---|
| Count | 99 | 99 |
| Min | 18 | 18 |
| Max | 347 | 347 |
| Mean | 61.0 | 58.3 |

### By Tier

| Tier | Count | Min | Max | Mean |
|---|---|---|---|---|
| 1 (Profile) | 18 | 112 | 347 | 219.2 |
| 2 (SM-only) | 4 | 77 | 211 | 110.5 |
| 3 (No data) | 77 | 18 | 18 | 18.0 |

**Tier-2 max (211) < Tier-1 max (347).** No tier-2 line exceeds the profile-line envelope. [VERIFIED]

Tier-2 mean dropped from 176.5 → 110.5 because Lucky (207→77) and Munster (211→77) now show their short ANIMALCOMMENTS instead of long AI bios. [VERIFIED]

---

## 6. Tier-2 Beyond Known 4

**None.** Only the 4 known SM-only cats (Blizzard, Iron, Lucky, Munster) exist as tier-2 in the adoptable pool. Every other cat either has behavior_notes (→ tier 1) or has a stock/empty ANIMALCOMMENTS (→ tier 3). [VERIFIED]

---

## Summary of Prior Harness Error

| Animal | Prior harness (wrong) | Corrected harness | Cause |
|---|---|---|---|
| Lucky | 207 chars, AI promo bio | 77 chars, SM barn-cat note | `/api/animals` returned approved `animal_bios.bio_en_long` via `resolveBioText()` |
| Munster | 211 chars, AI promo bio | 77 chars, SM barn-cat note | Same |
| Iron | 211 chars, SM note | 211 chars, SM note | No change — bio was draft, `resolveBioText()` fell through to SM |
| Blizzard | 77 chars, SM note | 77 chars, SM note | No change — approved bio identical to SM note |

The builder code (`customSearchSummary.ts`) was always correct. Only the harness data source was wrong. [VERIFIED]
