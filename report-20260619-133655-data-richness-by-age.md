# Data Richness by Age: How Many Animals Does the Age-Leak Fix Actually Affect?

**Date:** 2026-06-19 13:36 ET  
**Prior report:** report-20260619-131941 (age drives the 6-9% leak on blank seniors)  
**Pool:** 163 adoptable animals from `fetchAnimals()`, classified via `isBlankAnimal()` + `getBehaviorRecords()`  
**Status:** READ-ONLY DIAGNOSIS — no code changes

---

## HEADLINE

1. **38.5% of senior cats are blank** (5/13). Senior cats are NOT well-documented — they're blank at nearly the same rate as mid-age cats (42.1%). [VERIFIED]
2. **10.0% of senior dogs are blank** (1/10). Dogs are better documented at every age band. [VERIFIED]
3. **6 blank seniors exist in the entire pool** (5 cats + 1 dog), comprising **6.5% of all 92 blanks.** [VERIFIED]
4. **The age-leak fix's footprint is 6 animals.** At the measured ~6-9% leak rate for blank seniors, that's roughly 0-1 fabricated bios per full run of the matcher. Small footprint, but the fix is still warranted — a single fabricated bio on a 15-year-old cat is exactly the kind of harm the auditor exists to prevent.

---

## Cross-Tab: Species × Age Band × Tier

### Cats (105 total)

| Age Band | Total | Tier-1 (has bn) | Tier-2 (SM desc only) | Blank | Blank % | Avg bn | Avg desc len |
|----------|-------|-----------------|----------------------|-------|---------|--------|-------------|
| Young (<2yr) | 73 | 4 (5.5%) | 1 (1.4%) | **68 (93.2%)** | 93.2% | 0.05 | 1 |
| Mid (2-<7yr) | 19 | 10 (52.6%) | 1 (5.3%) | 8 (42.1%) | 42.1% | 1.00 | 205 |
| Senior (7+yr) | 13 | 6 (46.2%) | 2 (15.4%) | **5 (38.5%)** | 38.5% | 0.85 | 26 |

**Cat richness trend:** Young cats are overwhelmingly blank (93%) — almost all are recent intake kittens with no behavioral data. Documentation jumps sharply at mid-age (42% blank → 53% Tier-1), then stays flat into senior (39% blank → 46% Tier-1). Senior cats are NOT more documented than mid-age cats. [VERIFIED]

The avg behavior-record count for senior cats (0.85) is slightly BELOW mid-age cats (1.00). The avg SM-description length for seniors (26 chars) is far below mid-age (205 chars). Senior cats that ARE documented are often thinly documented. [VERIFIED]

### Dogs (39 total)

| Age Band | Total | Tier-1 (has bn) | Tier-2 (SM desc only) | Blank | Blank % | Avg bn | Avg desc len |
|----------|-------|-----------------|----------------------|-------|---------|--------|-------------|
| Young (<2yr) | 7 | 2 (28.6%) | 5 (71.4%) | **0 (0.0%)** | 0.0% | 0.29 | 401 |
| Mid (2-<7yr) | 22 | 7 (31.8%) | 9 (40.9%) | 6 (27.3%) | 27.3% | 0.32 | 318 |
| Senior (7+yr) | 10 | 4 (40.0%) | 5 (50.0%) | **1 (10.0%)** | 10.0% | 0.40 | 476 |

**Dog richness trend:** Dogs have SM descriptions at a much higher rate than cats across all age bands (71% Tier-2 for young dogs vs 1.4% for young cats). Zero young dogs are blank. Senior dogs are the best-documented band (90% have data, only 1 blank). Dogs show a real richness-with-age trend: blank rate drops from 27% mid to 10% senior. [VERIFIED]

The avg SM-description length for senior dogs (476 chars) is the highest of any dog band — senior dogs that have descriptions have RICH descriptions. [VERIFIED]

### Small Animals (19 total)

| Age Band | Total | Tier-1 | Tier-2 | Blank | Blank % | Avg bn |
|----------|-------|--------|--------|-------|---------|--------|
| Young (<2yr) | 7 | 5 (71.4%) | 0 | 2 (28.6%) | 28.6% | 1.00 |
| Mid (2-<7yr) | 11 | 9 (81.8%) | 0 | 2 (18.2%) | 18.2% | 1.18 |
| Senior (7+yr) | 1 | 1 (100%) | 0 | 0 (0.0%) | 0.0% | 1.00 |

Small animals have no SM descriptions (desc_len=0 for all). Most are Tier-1 from behavior records. Only 1 senior small animal (Snowie, rabbit, 7yr, documented). Zero blank senior smalls. [VERIFIED]

---

## The 6 Blank Seniors (the fix's full footprint)

| Code | Name | Species | Age | bn | desc_len |
|------|------|---------|-----|-----|----------|
| S2025206 | Lacey | Cat | 16yr 2mo | 0 | 0 |
| S2026557 | Buddy | Cat | 15yr 0mo | 0 | 0 |
| S2025503 | Cheshire | Cat | 11yr 0mo | 0 | 0 |
| S2026558 | Holly | Cat | 10yr 0mo | 0 | 0 |
| A2024047 | Lupa | Cat | 7yr 9mo | 0 | 0 |
| A2023278 | Honey | Dog | 8yr 8mo | 0 | 0 |

All confirmed blank via `isBlankAnimal()`: 0 behavior records AND 0-length description. [VERIFIED]

Of these 6, the first 4 (Lacey, Buddy, Cheshire, Holly) were in the leak characterization matrix test. All 4 leaked at least once across 8-14 runs.

---

## Richness Trend Summary

| Metric | Young → Mid → Senior (Cat) | Young → Mid → Senior (Dog) |
|--------|---------------------------|---------------------------|
| Blank % | 93% → 42% → **39%** | 0% → 27% → **10%** |
| Tier-1 % | 6% → 53% → **46%** | 29% → 32% → **40%** |
| Tier-2 % | 1% → 5% → **15%** | 71% → 41% → **50%** |
| Avg bn count | 0.05 → 1.00 → **0.85** | 0.29 → 0.32 → **0.40** |
| Avg desc len | 1 → 205 → **26** | 401 → 318 → **476** |

**Cat:** Documentation peaks at mid-age, NOT senior. Young cats are nearly all blank kittens. Senior cats are as blank as mid-age cats — the "seniors are well-documented" hypothesis is FALSE for cats. [VERIFIED]

**Dog:** Documentation increases with age. Senior dogs are the best-documented band. The "seniors are well-documented" hypothesis is TRUE for dogs — only 1 blank senior dog exists. [VERIFIED]

This species divergence matters: the age-leak fix primarily affects **cats** (5 of 6 blank seniors), and cats are the species where seniors are NOT preferentially documented.

---

## Impact Assessment

- **Fix footprint:** 6 animals (6.5% of 92 blanks)
- **Expected fabrication without fix:** At the measured 6-9% leak rate for blank seniors, ~0.4-0.5 fabricated bios per matcher run that includes a blank senior. Given Phase-1 preferentially selects documented animals, blank seniors appear in results only via targeted attribute queries (specific color/breed) — so the actual fabrication exposure is lower than the per-bio rate suggests, but non-zero.
- **Species breakdown:** 5 cats (where the leak is measured and confirmed) + 1 dog (Honey, Pit Bull, 8.7yr — the dog senior cell showed 0/8 leaks but was n=1, so [UNCERTAIN] whether dog seniors leak at the same rate as cat seniors).
