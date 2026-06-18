# Tiered Candidate Model — Tier Sizing Analysis

**Date:** 2026-06-18 09:56 ET  
**Production unchanged:** No edits, commits, restarts, migrations, or Anthropic API calls. SM API queried once read-only; local DB queried read-only. [VERIFIED]  
**Adoptable logic:** `raw.ADOPTABLE === 1` per `shelterManagerService.ts:54`. [VERIFIED]

---

## TASK 1 — Overall Tier Sizes

| Metric | Count |
|---|---|
| Total adoptable cats | **99** |
| Bucket A (≥1 behavior_notes) | **18** |
| Bucket B (SM description only, no behavior_notes) | **4** |
| Bucket C (no notes, no SM description — inferred-only) | **77** |
| **Evidenced tier (A + B)** | **22** |
| **Reserve tier (C)** | **77** |

Cross-check: A + B + C = 18 + 4 + 77 = 99 = total adoptable. ✅ [VERIFIED]  
Dashboard reports ~98–99. Match confirmed. [VERIFIED]

Within Bucket A, **5 of 18** also have a non-empty SM description (the redundant-legacy-note subset). The remaining 13 Bucket A cats have behavior_notes but no SM description. [VERIFIED]

**The pool is 78% reserve (inferred-only) and only 22% evidenced.** [VERIFIED]

---

## TASK 2 — Tier Sizes By Filter Combination

### Multi-select combinations (21 total)

| Sex | Age | Total | A | A+B (ev) | C (rsv) | ev ≥ 3? |
|---|---|---|---|---|---|---|
| male | young | 32 | 0 | 1 | 31 | **NO** |
| male | adult | 11 | 5 | 6 | 5 | YES |
| male | senior | 9 | 5 | 7 | 2 | YES |
| male | young+adult | 43 | 5 | 7 | 36 | YES |
| male | young+senior | 41 | 5 | 8 | 33 | YES |
| male | adult+senior | 20 | 10 | 13 | 7 | YES |
| male | all three | 52 | 10 | 14 | 38 | YES |
| female | young | 39 | 4 | 4 | 35 | YES |
| female | adult | 4 | 3 | 3 | 1 | YES |
| female | senior | 4 | 1 | 1 | 3 | **NO** |
| female | young+adult | 43 | 7 | 7 | 36 | YES |
| female | young+senior | 43 | 5 | 5 | 38 | YES |
| female | adult+senior | 8 | 4 | 4 | 4 | YES |
| female | all three | 47 | 8 | 8 | 39 | YES |
| both | young | 71 | 4 | 5 | 66 | YES |
| both | adult | 15 | 8 | 9 | 6 | YES |
| both | senior | 13 | 6 | 8 | 5 | YES |
| both | young+adult | 86 | 12 | 14 | 72 | YES |
| both | young+senior | 84 | 10 | 13 | 71 | YES |
| both | adult+senior | 28 | 14 | 17 | 11 | YES |
| **both** | **all three** | **99** | **18** | **22** | **77** | **YES** |

### Radio-button single cells (6 total)

| Sex | Age | Total | A | A+B (ev) | C (rsv) | ev ≥ 3? |
|---|---|---|---|---|---|---|
| male | young | 32 | **0** | **1** | 31 | **NO** |
| male | adult | 11 | 5 | 6 | 5 | YES |
| male | senior | 9 | 5 | 7 | 2 | YES |
| female | young | 39 | 4 | 4 | 35 | YES |
| female | adult | 4 | 3 | 3 | 1 | YES |
| female | senior | 4 | **1** | **1** | 3 | **NO** |

**Notable finding:** The male × young cell has **zero** Bucket A cats and only **1** Bucket B cat. Of the 32 young male adoptable cats, 31 have no behavioral evidence at all. [VERIFIED]

---

## TASK 3 — Reserve Composition & Evidence Age Breakdown

### Bucket C (reserve) age breakdown

| Age | Count | % |
|---|---|---|
| Young (<2y) | 66 | **86%** |
| Adult (2–6y) | 6 | 8% |
| Senior (7+) | 5 | 6% |

**Confirmed: the reserve is overwhelmingly youth.** 86% of inferred-only cats are under 2 years old. [VERIFIED]

### Bucket A (behavioral evidence) age breakdown

| Age | Count | % |
|---|---|---|
| Young (<2y) | 4 | 22% |
| Adult (2–6y) | 8 | **44%** |
| Senior (7+) | 6 | 33% |

Behavioral evidence skews heavily toward adults and seniors — 78% of Bucket A is 2+ years old. This is the inverse of the overall pool (72% young). The behavioral recording process has disproportionately covered longer-stay, older cats. [VERIFIED]

### Bucket B (SM description only) age breakdown

| Age | Count |
|---|---|
| Young (<2y) | 1 |
| Adult (2–6y) | 1 |
| Senior (7+) | 2 |

Small bucket (4 cats), same adult/senior skew. [VERIFIED]

---

## TASK 4 — Summary For Design

### Evidenced tier sufficiency

| | ev ≥ 3 (no reserve needed) | ev < 3 (reserve needed) |
|---|---|---|
| Multi-select (21 combos) | **19** | **2** |
| Radio-button (6 cells) | **4** | **2** |

The two shortfall combinations under both UI models are:
- **male × young:** ev = 1 (need 2 from reserve; 31 reserve available) [VERIFIED]
- **female × senior:** ev = 1 (need 2 from reserve; 3 reserve available) [VERIFIED]

All other combinations have ≥ 3 evidenced cats and would never touch the reserve. [VERIFIED]

### Bounded top-up to 15

**Broad query (both × all ages):**
- Evidenced tier: **22 cats**
- Reserve: 77 cats
- Reserve needed to reach 15: **0** — the evidenced tier alone exceeds 15
- Final pool sent to model: **15** (top 15 from evidenced tier, no reserve pulled)
- This is the case where the attention failure was observed at full-pool 99. Under the tiered model, the model would see **22 evidenced candidates** (or 15 if hard-capped), vs the current 99. [VERIFIED]

**Per radio cell with 15-cap:**

| Cell | Evidenced | Top-up from reserve | Final pool | Notes |
|---|---|---|---|---|
| male × young | 1 | 14 | **15** | Nearly all reserve — weak cell |
| male × adult | 6 | 5 | **11** | Under 15 even with full pool (11 total) |
| male × senior | 7 | 2 | **9** | Under 15 even with full pool (9 total) |
| female × young | 4 | 11 | **15** | Mostly reserve |
| female × adult | 3 | 1 | **4** | Under 15 even with full pool (4 total) |
| female × senior | 1 | 3 | **4** | Under 15 even with full pool (4 total) |

**4 of 6 radio cells come in under 15 even after using the entire pool.** Only the two "young" cells hit the 15-cat cap. [VERIFIED]

### Key design takeaway

For the broad query where the attention failure was observed: the evidenced tier is **22 cats** — well under the ~30 threshold where model attention is reliable, and dramatically below the current 99 that caused the failure. A tier-first approach with a 15-cat cap would send at most 15 evidenced candidates to the model for the broad query, with no reserve needed. [VERIFIED]

The structural gap is in **young cats**: 71 of 99 adoptable cats are young, but only 5 of 22 evidenced cats are young (4 in Bucket A + 1 in Bucket B). Behavior recording has not kept pace with intake of kittens and young adults. For queries selecting only young cats, the model will have very little evidence to work with under any architecture — the male × young cell has zero Bucket A cats and would be 93% reserve even with tiering. [VERIFIED]
