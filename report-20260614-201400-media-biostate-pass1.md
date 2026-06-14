# Media Tab — bioState Filter Logic (Pass 1)

**Date:** 2026-06-14 20:14 ET  
**Type:** Implementation (pass 1 of 2 — logic only, provisional placement)  
**Commit:** `29cce50` — `dashboard: media tab bioState filter logic + approved+youth tile gauge (pass 1, provisional button placement)`  

---

## STEP 1 — Tile Numbers (approved + youth gauge)

Changed `updateTileCounts()` secondary number from `hasCaregiverData` count to `bioState === 'approved' || bioState === 'youth'` count:

```diff
-      const catsData = cats.filter(a => a.hasCaregiverData).length;
-      const dogsData = dogs.filter(a => a.hasCaregiverData).length;
-      const smallsData = smalls.filter(a => a.hasCaregiverData).length;
+      const catsData = cats.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;
+      const dogsData = dogs.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;
+      const smallsData = smalls.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;
```

**Per-species tile values (live, adoptable pool):**

| Species | approved+youth | total | Note |
|---------|---------------|-------|------|
| Cats | 63 | 90 | Shifted from expected 66/93 — 3 cats adopted/moved since earlier check |
| Dogs | 7 | 40 | Matches expected |
| Smalls | 4 | 19 | Matches expected |
| **All** | **74** | **149** | Shifted from 77/152 — intake/adoption churn |

The label text still reads "with data" (pass 2 will reword). [VERIFIED]

## STEP 2 — bioState Filter State + Step

**State variable (near L6343):**
```javascript
let currentBioStateFilter = 'all';
```

**Filter step in renderFilteredAnimals() (after species, before adoption):**
```javascript
// Apply bioState filter (ANDs with species)
if (currentBioStateFilter !== 'all') {
  filtered = filtered.filter(a => a.bioState === currentBioStateFilter);
}
```

**Filter chain order:**
1. Species filter (currentSpeciesFilter) — narrows allAnimalsData
2. **bioState filter (currentBioStateFilter) — ANDs with species** ← new
3. Adoption status filter (currentAdoptionStatusFilter) — further narrows
4. tilePool / updateTileCounts — uses adoption-filtered pool from allAnimalsData (ignores species AND bioState)

The bioState filter does NOT affect tile counts. tilePool is computed independently from `allAnimalsData` filtered only by adoption status. [VERIFIED]

## STEP 3 — Handlers + Symmetric Reset

**setBioStateFilter(state):**
```javascript
function setBioStateFilter(state) {
  currentBioStateFilter = state;
  // update bioState button active class
  document.querySelectorAll('#bioStateFilterRow .bio-state-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('bf-' + state).classList.add('active');
  // Symmetric reset: bioState off default → adoption toggle back to 'adoptable'
  if (state !== 'all') {
    currentAdoptionStatusFilter = 'adoptable';
    // update adoption toggle UI
    document.querySelectorAll('#adoptionStatusPill .profiles-filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('af-adoptable').classList.add('active');
  }
  renderFilteredAnimals();
}
```

**setAdoptionStatusFilter(state) — added reset block:**
```javascript
// Symmetric reset: adoption off default → bioState back to 'all'
if (state !== 'adoptable') {
  currentBioStateFilter = 'all';
  document.querySelectorAll('#bioStateFilterRow .bio-state-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('bf-all').classList.add('active');
}
```

**Reset trace:**
- User clicks "Needed" → `setBioStateFilter('needed')` → `currentBioStateFilter = 'needed'`, adoption reset to 'adoptable' ✓
- User clicks "All" (adoption) → `setAdoptionStatusFilter('all')` → `currentAdoptionStatusFilter = 'all'`, bioState reset to 'all' ✓
- User clicks "Pending Only" (adoption) → `setAdoptionStatusFilter('pending')` → bioState reset to 'all' ✓
- User clicks "Cats" → `filterBySpecies('cat')` → no reset of either bioState or adoption (species is orthogonal) ✓

## STEP 4 — Temporary Buttons

Placed between the frozen header and the `#content` div. Provisional location — pass 2 will relocate into the toolbar.

```html
<div id="bioStateFilterRow" style="display:flex; gap:8px; padding:8px 16px; align-items:center;">
  <span style="font-size:0.85rem; font-weight:600; color:var(--gray-600);">Bio State:</span>
  <button class="bio-state-btn active" id="bf-all" ...>All</button>
  <button class="bio-state-btn" id="bf-needed" ...>Needed</button>
  <button class="bio-state-btn" id="bf-pending" ...>Pending</button>
  <button class="bio-state-btn" id="bf-youth" ...>Youth</button>
  <button class="bio-state-btn" id="bf-approved" ...>Approved</button>
</div>
```

Active styling: gray background + bold + darker border. No colors.

## Untouched (confirmed)

- `.search-qr-section`, Find/Print buttons, `.old-bios-badge` — 0 lines changed [VERIFIED]
- `fetchOldGenericBios()` — 0 lines changed [VERIFIED]
- `filterBySpecies()` — 0 lines changed [VERIFIED]
- No server files — dashboard/index.html only [VERIFIED]
- Tile label text "with data" unchanged (pass 2 reword) [VERIFIED]

---

*Implemented by Rover. Pass 1 of 2 — logic functional, placement provisional.*
