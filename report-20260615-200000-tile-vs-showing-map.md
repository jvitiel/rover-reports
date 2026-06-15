# Dashboard tile big-number vs SHOWING badge — complete filter-chain map

**Date:** 2026-06-15 20:00 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Scenario

"Adoptable & Pending" selected, BIO STATE filter = "Approved".  
- First tile big number: **150**  
- SHOWING badge: **73**

---

## 1. FIRST TILE BIG NUMBER (`#totalAnimals`)

### Code (dashboard/index.html, `updateTileCounts` called at ~line 6869)

```javascript
// In renderFilteredAnimals():
const tilePool = currentAdoptionStatusFilter === 'adoptable'
  ? allAnimalsData.filter(a => a.isAvailable !== false)
  : currentAdoptionStatusFilter === 'pending'
    ? allAnimalsData.filter(a => a.adoptionPending === true)
    : allAnimalsData;
updateTileCounts(tilePool);

// In updateTileCounts(filtered):
document.getElementById('totalAnimals').textContent = filtered.length;  // ← THE BIG NUMBER
```

### Filter chain (in order)

| Step | Filter | Applied? |
|------|--------|----------|
| 1 | Source array | `allAnimalsData` (all animals from `/api/dashboard/behavior-notes`) |
| 2 | Adoption status | ✅ `isAvailable !== false` (when "Adoptable & Pending" selected) |
| 3 | Species filter | ❌ NOT applied — `tilePool` is built from `allAnimalsData`, not from the species-filtered `filtered` variable |
| 4 | **BioState filter** | ❌ **NOT applied** |
| 5 | Search box | ❌ Not a data filter (DOM-based card scroll) |

**Result: `allAnimalsData` → adoption filter only → 150 adoptable animals.**

The big number intentionally shows the total population for the selected adoption filter, regardless of species or bioState selection.

---

## 2. SHOWING ROWS BADGE (`#rowsShowingCount`)

### Code (dashboard/index.html, ~line 6881)

```javascript
// In renderFilteredAnimals():
const rowsEl = document.getElementById('rowsShowingCount');
if (rowsEl) rowsEl.textContent = filtered.length;  // ← THE SHOWING NUMBER
```

### Filter chain (in order)

```javascript
// Line 6840: start
let filtered = allAnimalsData;

// Line 6841-6845: species filter
if (currentSpeciesFilter !== 'all') {
  filtered = allAnimalsData.filter(a => { /* species match */ });
}

// Line 6849-6852: bioState filter
if (currentBioStateFilter === 'approved') {
  filtered = filtered.filter(a => a.bioState === 'approved' || a.bioState === 'youth');
} else if (currentBioStateFilter !== 'all') {
  filtered = filtered.filter(a => a.bioState === currentBioStateFilter);
}

// Line 6855-6859: adoption status filter
if (currentAdoptionStatusFilter === 'adoptable') {
  filtered = filtered.filter(a => a.isAvailable !== false);
} else if (currentAdoptionStatusFilter === 'pending') {
  filtered = filtered.filter(a => a.adoptionPending === true);
}

// Line 6881-6882: set badge
rowsEl.textContent = filtered.length;
```

| Step | Filter | Applied? |
|------|--------|----------|
| 1 | Source array | `allAnimalsData` |
| 2 | Species filter | ✅ (when not 'all') — currently 'all', so no-op |
| 3 | **BioState filter** | ✅ **`a.bioState === 'approved' \|\| a.bioState === 'youth'`** (when "Approved" selected) |
| 4 | Adoption status | ✅ `isAvailable !== false` (when "Adoptable & Pending" selected) |
| 5 | Search box | ❌ Not a data filter |

**Result: `allAnimalsData` → species (all=no-op) → bioState (approved \|\| youth) → adoption (adoptable) → 73 rows.**

---

## 3. SIDE-BY-SIDE

| Filter | Big number (`tilePool`) | SHOWING (`filtered`) |
|--------|------------------------|---------------------|
| Source | `allAnimalsData` | `allAnimalsData` |
| Species | ❌ Never applied | ✅ Applied (no-op when 'all') |
| **BioState** | **❌ Never applied** | **✅ Applied** |
| Adoption status | ✅ Applied | ✅ Applied |
| Search | ❌ | ❌ |

**The big number does NOT apply the bioState filter. SHOWING does. That's the entire discrepancy.**

- Big number = 150 (all adoptable, regardless of bioState)
- SHOWING = 73 (adoptable AND bioState approved+youth)
- 150 ≠ 73 because the bioState "Approved" filter excludes 77 animals (37 needed + 40 pending)

**Hypothesis confirmed:** big number = adoption-filtered only (150); SHOWING = adoption + bioState + species filtered (73).

---

## 4. PER-SPECIES TILE COUNTS (Dogs / Cats / Smalls)

### Code

```javascript
// In updateTileCounts(filtered):   ← receives tilePool, NOT the filtered variable
const cats = filtered.filter(a => classifySpecies(a.species) === 'cat');
const dogs = filtered.filter(a => classifySpecies(a.species) === 'dog');
const smalls = filtered.filter(a => classifySpecies(a.species) === 'small');

document.getElementById('totalCats').textContent = cats.length;    // species count
document.getElementById('totalDogs').textContent = dogs.length;
document.getElementById('totalSmalls').textContent = smalls.length;
```

**Filter chain: same as big number** — `tilePool` = adoption-filtered only, no bioState, no species pre-filter.

- Dogs 40 + Cats 91 + Smalls 19 = 150 = big number ✅
- Species tiles are consistent with the big number (both use `tilePool`)
- Species tiles do NOT reflect the bioState filter

### Approved sub-counts (the "X approved" text under each species)

```javascript
const catsData = cats.filter(a => a.bioState === 'approved').length;   // ← dd2fb6a change site
const dogsData = dogs.filter(a => a.bioState === 'approved').length;
const smallsData = smalls.filter(a => a.bioState === 'approved').length;
const allData = catsData + dogsData + smallsData;

document.getElementById('dataAll').textContent = allData > 0 ? `${allData} approved` : '';
```

These sub-counts apply bioState='approved' on top of `tilePool` (adoption-filtered). They're a secondary metric under the species count, not the big number itself.

---

## 5. dd2fb6a CHANGE SITE (for potential revert)

```javascript
// BEFORE dd2fb6a (line ~6819):
const catsData = cats.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;
const dogsData = dogs.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;
const smallsData = smalls.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;

// AFTER dd2fb6a (current):
const catsData = cats.filter(a => a.bioState === 'approved').length;
const dogsData = dogs.filter(a => a.bioState === 'approved').length;
const smallsData = smalls.filter(a => a.bioState === 'approved').length;
```

To revert: restore `|| a.bioState === 'youth'` on all three lines.

---

## Summary of all counting paths

| Element | ID | Source | Adoption? | Species? | BioState? | Value (Adoptable + Approved filter) |
|---------|-----|--------|-----------|----------|-----------|-------------------------------------|
| Big number | `totalAnimals` | `tilePool` | ✅ | ❌ | ❌ | **150** |
| Dogs count | `totalDogs` | `tilePool` | ✅ | ✅ (per-species) | ❌ | 40 |
| Cats count | `totalCats` | `tilePool` | ✅ | ✅ | ❌ | 91 |
| Smalls count | `totalSmalls` | `tilePool` | ✅ | ✅ | ❌ | 19 |
| Approved sub-count | `dataAll` | `tilePool` | ✅ | ❌ | ✅ (approved only) | 29 |
| SHOWING badge | `rowsShowingCount` | `filtered` | ✅ | ✅ | ✅ (approved+youth) | **73** |
