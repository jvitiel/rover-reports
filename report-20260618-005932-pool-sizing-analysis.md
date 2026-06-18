# Custom Search Pool Sizing Analysis — Multi-Select vs Radio-Button UI

**Date:** 2026-06-18 00:59 ET  
**Production unchanged:** No edits, commits, restarts, or API calls to Anthropic. SM API queried once read-only for current pool. [VERIFIED]

---

## Current Pool Snapshot

| Metric | Count |
|---|---|
| Total adoptable cats (SM API, all species filtered to cat) | 164 [VERIFIED] |
| Male | 90 [VERIFIED] |
| Female | 72 [VERIFIED] |
| Unknown sex (excluded by any sex filter) | 2 [VERIFIED] |
| Young (<2 years) | 126 [VERIFIED] |
| Adult (2–6 years) | 27 [VERIFIED] |
| Senior (7+ years) | 11 [VERIFIED] |

The pool is heavily skewed young — 77% of adoptable cats are under 2 years old. [VERIFIED]

Note: The production Q2 run (2026-06-18 03:55 UTC) had 98 candidates for "both × all ages." The current pool is 162 for the same filter. The SM API pool grew ~65% between the production run and this analysis — likely reflecting new intake or foster-return activity. [INFERRED]

---

## TASK 1 — Pool Size For Every Filter Combination (Current Multi-Select UI)

The endpoint accepts `sex` as a non-empty subset of {male, female} and `ageGroup` as a non-empty subset of {young, adult, senior}. This yields 3 sex options × 7 age subsets = 21 combinations. [VERIFIED from server.ts validation logic]

| Sex | Age | Primary Count |
|---|---|---|
| male | young | 63 |
| male | adult | 19 |
| male | senior | 8 |
| male | young+adult | 82 |
| male | young+senior | 71 |
| male | adult+senior | 27 |
| male | young+adult+senior | 90 |
| female | young | 61 |
| female | adult | 8 |
| female | senior | 3 |
| female | young+adult | 69 |
| female | young+senior | 64 |
| female | adult+senior | 11 |
| female | young+adult+senior | 72 |
| both | young | 124 |
| both | adult | 27 |
| both | senior | 11 |
| both | young+adult | 151 |
| both | young+senior | 135 |
| both | adult+senior | 38 |
| both | young+adult+senior | **162** |

- **Smallest:** 3 — female × senior [VERIFIED]
- **Largest:** 162 — both × young+adult+senior [VERIFIED]
- **"Both sexes + all three ages" = 162**, which equals the full adoptable count minus 2 unknown-sex cats (164 − 2 = 162). Confirmed. [VERIFIED]

---

## TASK 2 — Radio-Button Ceiling (Exactly One Sex + One Age)

| Sex | Age | Count |
|---|---|---|
| male | young | **63** |
| male | adult | 19 |
| male | senior | 8 |
| female | young | **61** |
| female | adult | 8 |
| female | senior | 3 |

**Largest single cell: 63 (male × young).** [VERIFIED]

This is the worst-case pool under a radio-button UI where the user must select exactly one sex and one age bracket.

---

## TASK 3 — Fallback Behavior

The endpoint has a fallback: when primary filtered count < 3, it drops the age filter and keeps sex only. [VERIFIED from server.ts lines 4432-4438]

**Fallback ceilings (sex-only totals):**

| Sex filter | Sex-only count |
|---|---|
| male only | 90 |
| female only | 72 |
| both sexes | 162 |

**Multi-select fallback triggers:** 0 of 21 combinations — the smallest primary count is 3 (female × senior), which is ≥ 3 so no fallback fires. [VERIFIED]

**Radio-button fallback triggers:** 0 of 6 combinations — the smallest is also female × senior = 3, barely clearing the threshold. [VERIFIED]

**Maximum pool the endpoint could ever send the model:**

| UI model | Worst case (including fallback) |
|---|---|
| Current multi-select | **162** (both × all ages, no fallback needed) [VERIFIED] |
| Radio-button | **63** (male × young, no fallback needed) [VERIFIED] |

**Edge case to flag:** Female × senior = 3 is exactly at the fallback threshold. If one senior female is adopted, the next query would trigger fallback → sex-only → 72 candidates (entire female pool). This means the radio-button worst case could transiently jump from 63 to 72 if the senior-female cell drops to 2 and the fallback kicks in. Under the multi-select UI the same scenario is less impactful since multi-select users selecting "senior only" are less common. [INFERRED]

---

## TASK 4 — Summary For the Decision

| Metric | Multi-select UI | Radio-button UI |
|---|---|---|
| Worst-case pool (incl. fallback) | **162** | **63** |
| Reduction | — | **61%** |
| Combos exceeding 30 candidates | **13 of 21** (62%) | **2 of 6** (33%) |
| Combos ≤ 30 candidates | 8 of 21 | 4 of 6 |
| Median pool size | 69 | 19 |

**Does the radio-button ceiling land at or under ~30?**  
No. The worst case is 63, driven by the young-cat skew (126 of 164 cats are under 2 years old). However, 4 of 6 radio-button cells are ≤ 27, and the two that exceed 30 are both in the "young" bracket (male×young=63, female×young=61). [VERIFIED]

**Would further splitting the "young" bracket help?**  
If "young" (<2 years) were split into "kitten" (<6 months) and "young adult" (6 months–2 years), each sub-bracket would contain roughly 30–60 cats (exact split depends on the age distribution within "young"). This could bring all radio-button cells under ~40, but would not guarantee ≤30 unless the kitten/young-adult split happens to be balanced. [INFERRED — would need DOB distribution analysis to confirm]

**Bottom line:** Switching to radio buttons cuts worst-case pool from 162 → 63 (61% reduction). This is a meaningful improvement but does NOT reach the ~30-candidate target where model attention is reliable. To reach ≤30, either the "young" age bracket needs subdivision or a hard cap with random sampling would be needed. [INFERRED]
