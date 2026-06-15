# Revert dd2fb6a — approved sub-count includes youth again

**Commit:** `e987f32` — `dashboard: revert dd2fb6a — approved sub-count includes youth again (matches Approved filter)`  
**Scope:** `dashboard/index.html` only (3 lines, static file, live on save)

---

## Change

Restored `|| a.bioState === 'youth'` on the three approved sub-count lines in `updateTileCounts()`:

```javascript
const catsData = cats.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;
const dogsData = dogs.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;
const smallsData = smalls.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;
```

The sub-count now uses the same approved-or-youth definition as the BIO STATE "Approved" filter / SHOWING badge.

## Before/after

### Adoptable & Pending (big number: 150, unchanged)

| Element | Before (dd2fb6a) | After (reverted) |
|---------|------------------|-------------------|
| dataAll sub-count | 29 approved | **73 approved** |
| dataCats | 18 | **62** |
| dataDogs | 7 | **7** |
| dataSmalls | 4 | **4** |
| SHOWING (Approved filter) | 73 | **73** (unchanged) |
| Sub-count == SHOWING | ❌ (29≠73) | ✅ (73=73) |

### All (big number: 492, unchanged)

| Element | Before | After |
|---------|--------|-------|
| dataAll sub-count | 32 approved | **302 approved** |
| SHOWING (Approved filter) | 302 | **302** (unchanged) |
| Sub-count == SHOWING | ❌ (32≠302) | ✅ (302=302) |

### Unchanged elements

- Big number (`totalAnimals`): 150 (Adoptable), 492 (All) — unchanged
- Species tiles: Dogs 40, Cats 91, Smalls 19 (Adoptable) — unchanged
- SHOWING badge: 73 (Adoptable + Approved) — unchanged
- BioState filter logic (line 6849): unchanged
- `computeBioState`: unchanged
