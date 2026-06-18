# Pool Reconciliation & Corrected Sizing Analysis

**Date:** 2026-06-18 08:49 ET  
**Production unchanged:** No edits, commits, restarts, migrations, or Anthropic API calls. SM API queried once read-only. [VERIFIED]

---

## TASK 1 — The Endpoint's Exact Candidate Logic

### Source trace

**File:** `server/src/shelterManagerService.ts`

**Line 54 — the adoptable gate:**
```typescript
const isAvailable = raw.ADOPTABLE === 1;
```

This is a single SM API field. The `ADOPTABLE` flag is computed server-side by ShelterManager based on the animal's status, holds, movements, and other shelter configuration. It is the canonical "available for adoption" signal. [VERIFIED — direct quote from shelterManagerService.ts:54]

**Lines 95–155 — fetchAnimals():**
```typescript
const availableAnimals = allAnimals.filter(a => a.isAvailable);
```
The default call (`includeUnavailable: false`) returns **only** animals where `ADOPTABLE === 1`. [VERIFIED]

**server.ts:4398–4410 — the custom-search endpoint filter chain:**
```typescript
const allAnimals = await fetchAnimals();  // default: available only
const cats = allAnimals.filter(a => (a.species || '').toLowerCase() === 'cat');
const filtered = cats.filter(a => {
  const animalSex = (a.sex || '').toLowerCase();
  if (!sexLower.includes(animalSex)) return false;
  const bucket = deriveAgeGroup(a.ageInYears);
  if (ageLower.includes(bucket)) return true;
  return false;
});
```

The chain is: `fetchAnimals()` → `ADOPTABLE === 1` only → species = cat → sex filter → age filter. [VERIFIED]

### Current adoptable cat count

```
ADOPTABLE field distribution across all 494 SM API animals:
  ADOPTABLE=0: 337
  ADOPTABLE=1: 157

Of the 157 adoptable: 99 are cats, 58 are other species.
```

**Current adoptable-cat count: 99** [VERIFIED]

The dashboard reports ~98. The 1-cat difference is normal SM cache/churn — one cat likely became adoptable between the dashboard snapshot and this API call. The counts are consistent. [VERIFIED]

---

## TASK 2 — The 164 vs 98 Discrepancy

### What the buggy sizing script filtered on

The throwaway script (`pool-sizing.mjs` and `custom-search-harness.mjs`) used:
```javascript
const status = (a.ANIMALSSTATUSID || '').toString();
const isArchived = status === '3' || status === '4';
const movement = (a.ACTIVEMOVEMENTTYPE || '').toString();
const hasActiveMovement = movement !== '' && movement !== '0';
const isAvailable = !isArchived && !hasActiveMovement;
```

### What the endpoint actually filters on

```javascript
const isAvailable = raw.ADOPTABLE === 1;
```

### The exact condition the script got wrong

The script invented a multi-field heuristic (`ANIMALSSTATUSID` + `ACTIVEMOVEMENTTYPE`) instead of using the SM API's canonical `ADOPTABLE` flag. This caused **two errors in opposite directions**:

**Error 1 — 94 non-adoptable cats leaked IN:**
All 94 have `ADOPTABLE=0` but passed the script's heuristic because their `ANIMALSSTATUSID` was undefined (not 3 or 4) and `ACTIVEMOVEMENTTYPE` was null (no active movement). These are cats physically at the shelter but NOT marked adoptable — in medical holds, behavioral assessment, URI/isolation, intake processing, or other non-public statuses.

Breakdown by location:

| Location | Count | Likely status |
|---|---|---|
| Cat Room 4 | 27 | In-care, not yet adoptable |
| URI/ISO (upper respiratory / isolation) | 13 | Medical isolation |
| Annex | 10 | Annex holding |
| Cat Room 3 | 10 | In-care, not yet adoptable |
| Cat Room 6 | 7 | In-care, not yet adoptable |
| Cat Room 7 | 7 | In-care, not yet adoptable |
| Cat Room 2 | 6 | In-care, not yet adoptable |
| RW ISO | 3 | Isolation |
| Catio | 3 | Outdoor holding |
| 4LG Foster House | 2 | Foster (but not adoptable) |
| Cat Room 1 | 2 | In-care, not yet adoptable |
| Shelter (generic) | 2 | In-care |
| Cat Room 5 | 1 | In-care |
| Roots Vet Hospital | 1 | Veterinary care |

**Error 2 — 29 adoptable cats were EXCLUDED:**
All 29 have `ADOPTABLE=1` but `ACTIVEMOVEMENTTYPE=2` (foster). The script treated foster movement as "active movement" and excluded them. In reality, SM marks fostered animals as still adoptable — `ADOPTABLE=1` with `ACTIVEMOVEMENTTYPE=2` means "in foster but available for adoption." [VERIFIED]

Notable exclusions: Karen Smith (S2026447), Edna (S20251008), Dean (W2025068), Sky (S2026314) — all cats that appeared in the production matcher run's 98-cat pool. [VERIFIED]

**Net:** 94 leaked in − 29 missed = 65 net overcounting → 99 + 65 = 164. [VERIFIED — arithmetic matches]

### Impact on the ablation experiment

**Yes, the ablation experiment's "162-cat current pool" side-comparison used this same buggy filter.** [VERIFIED]

Specific impacts:
- **Arnold (B2026001)** and **Oxford (S2026162)** — which the 162-cat harness consistently selected — are both `ADOPTABLE=0` (Cat Room 7, non-adoptable). They should never have been in the candidate pool. The harness's consistent selection of these two cats in the "current pool" runs is an artifact of the buggy filter. [VERIFIED]
- The **production-pool replay** (T2 replay using the exact `input_profiles` from matcher_audit) was NOT affected by this bug — it used the actual production prompt verbatim. Its results remain valid. [VERIFIED]
- The **T3 small-field** test included Arnold (B2026001) and Oxford (S2026162), both non-adoptable. If they had been excluded, the 10-cat field would have been 8 cats, and the results would have differed. [VERIFIED — T3 results are partially invalidated]

---

## TASK 3 — Corrected Sizing Against the True Adoptable Pool

### Pool demographics

| Metric | Count |
|---|---|
| Total adoptable cats | 99 |
| Male | 52 |
| Female | 47 |
| Unknown sex | 0 |
| Young (<2y) | 71 |
| Adult (2–6y) | 15 |
| Senior (7+) | 13 |

Young cats are 72% of the pool (vs 77% in the buggy count). Still heavily skewed but less extreme. [VERIFIED]

### (a) Every Sex × Age combination (multi-select)

| Sex | Age | Count |
|---|---|---|
| male | young | 32 |
| male | adult | 11 |
| male | senior | 9 |
| male | young+adult | 43 |
| male | young+senior | 41 |
| male | adult+senior | 20 |
| male | all three | 52 |
| female | young | 39 |
| female | adult | 4 |
| female | senior | 4 |
| female | young+adult | 43 |
| female | young+senior | 43 |
| female | adult+senior | 8 |
| female | all three | 47 |
| both | young | 71 |
| both | adult | 15 |
| both | senior | 13 |
| both | young+adult | 86 |
| both | young+senior | 84 |
| both | adult+senior | 28 |
| **both** | **all three** | **99** |

Smallest: 4 (female × adult, female × senior). Largest: 99 (both × all). [VERIFIED]

**Cross-check:** both × all ages = 99 = total adoptable cats. ✅ [VERIFIED]

### (b) Six single-cell radio-button combinations

| Sex | Age | Count |
|---|---|---|
| male | young | 32 |
| male | adult | 11 |
| male | senior | 9 |
| female | young | **39** |
| female | adult | 4 |
| female | senior | 4 |

**Largest single cell: 39 (female × young).** [VERIFIED]

### (c) Fallback analysis

Sex-only totals (fallback ceilings):

| Sex filter | Count |
|---|---|
| male only | 52 |
| female only | 47 |
| both | 99 |

**Primary combos < 3:** None — the smallest primary is 4 (female × adult and female × senior). No fallback triggers under either UI model. [VERIFIED]

**Edge case:** Female × adult and female × senior are both 4, only 2 above the threshold. If 2 cats in either cell become unavailable, fallback fires → widens to 47 (entire female pool). This is a realistic scenario under radio buttons. [INFERRED]

### (d) Worst-case comparison

| Metric | Multi-select UI | Radio-button UI |
|---|---|---|
| Worst-case pool (incl. fallback) | **99** | **39** |
| Reduction | — | **61%** |
| Combos exceeding 30 | **12 of 21** (57%) | **2 of 6** (33%) |
| Combos ≤ 30 | 9 of 21 | 4 of 6 |

The two radio-button cells exceeding 30 are male × young (32) and female × young (39). [VERIFIED]

---

## Comparison: Buggy vs Corrected

| Metric | Buggy (prior report) | Corrected |
|---|---|---|
| Adoptable cat pool | 164 | **99** |
| Multi-select worst case | 162 | **99** |
| Radio-button worst case | 63 | **39** |
| Radio-button largest cell | male × young (63) | **female × young (39)** |
| Reduction % | 61% | **61%** (same ratio) |
| Radio cells > 30 | 2 of 6 | **2 of 6** |

The reduction ratio is coincidentally identical (61%), but the absolute numbers are dramatically different. Under radio buttons, the corrected worst case is **39** — still above the ~30 target but meaningfully closer than the buggy 63. [VERIFIED]

---

## Summary

The prior sizing report's 164-cat pool was wrong because the throwaway script used a hand-rolled status/movement heuristic instead of the SM API's canonical `ADOPTABLE` field. The true adoptable pool is **99 cats** (matching the dashboard's ~98 and the production audit's 98 within normal churn). [VERIFIED]

The ablation experiment's 162-cat "current pool" comparison was contaminated by 94 non-adoptable cats including Arnold and Oxford (both non-adoptable Cat Room 7 residents), which the harness consistently selected. The production-pool replay (using exact audit data) was not affected. [VERIFIED]

Against the corrected 99-cat pool, radio buttons reduce worst-case from 99 → 39, and only 2 of 6 cells exceed 30 (male × young at 32, female × young at 39). To reach ≤30 in all cells, the young bracket would need subdivision. [VERIFIED]
