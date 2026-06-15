# Dashboard approved tile — exclude youth from count

**Commit:** `dd2fb6a` — `dashboard: approved tile counts only bioState approved, excludes youth`  
**Scope:** `dashboard/index.html` only (3 insertions, 3 deletions). Static file, live on save.

---

## Change

In `updateTileCounts()` (~line 6819), removed `|| a.bioState === 'youth'` from the three per-species approved sub-counts:

```javascript
// BEFORE:
const catsData = cats.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;
const dogsData = dogs.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;
const smallsData = smalls.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;

// AFTER:
const catsData = cats.filter(a => a.bioState === 'approved').length;
const dogsData = dogs.filter(a => a.bioState === 'approved').length;
const smallsData = smalls.filter(a => a.bioState === 'approved').length;
```

`allData` derives from the three sub-counts (`catsData + dogsData + smallsData`), so it's fixed automatically.

## Scope guard

These three variables feed ONLY the tile display text (`dataAll`, `dataCats`, `dataDogs`, `dataSmalls` via `getElementById().textContent`). They are NOT reused for:
- Row filtering (separate `renderFilteredAnimals` logic at line 6849)
- bioState computation (server-side `computeBioState`)
- Any other display or data path

**Not changed:**
- `computeBioState` (server-side) — untouched
- BIO STATE filter row (Needed/Pending/Youth/Approved buttons) — untouched
- The Approved filter logic at line 6849 (`a.bioState === 'approved' || a.bioState === 'youth'`) — untouched
- All other 'youth' references — untouched

## Before/after tile counts

### All view

| Tile | Before | After |
|------|--------|-------|
| All approved | 302 | **32** |
| Cats approved | 280 | **20** |
| Dogs approved | 16 | **7** |
| Smalls approved | 6 | **5** |

### Adoptable & Pending view

| Tile | Before | After |
|------|--------|-------|
| All approved | 73 | **29** |
| Cats approved | 62 | **18** |
| Dogs approved | 7 | **7** |
| Smalls approved | 4 | **4** |

### Verification

- Youth animals still appear under the Youth bio-state filter: **270** (All) / **44** (Adoptable) — unchanged
- Approved filter still shows approved animals: **32** (All) / **29** (Adoptable)
- Row filtering by bioState untouched — Approved filter still includes youth in the row list (line 6849, separate logic)
