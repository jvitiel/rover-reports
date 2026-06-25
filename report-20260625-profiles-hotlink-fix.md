# Profiles-Tab Name Hotlink — Jump to Media Tab Card

**Date:** 2026-06-25  
**Commit:** 0894705  
**Files changed:** dashboard/index.html

---

## Changes

### 1. `jumpToMediaCard(shelterCode)` (dashboard/index.html:8989)

```js
function jumpToMediaCard(shelterCode) {
  switchTab('animals');

  // Clear bioState + adoption filters → card renders regardless of state
  currentBioStateFilter = 'all';
  document.querySelectorAll('#bioStateFilterRow .bio-state-btn').forEach(btn => btn.classList.remove('active'));
  const bfAll = document.getElementById('bf-all');
  if (bfAll) bfAll.classList.add('active');

  currentAdoptionStatusFilter = 'all';
  document.querySelectorAll('#adoptionStatusPill .profiles-filter-btn').forEach(btn => btn.classList.remove('active'));
  const afAll = document.getElementById('af-all');
  if (afAll) afAll.classList.add('active');

  // Correct species filter to target animal
  const match = allAnimalsData.find(a => a.shelterCode === shelterCode);
  if (match) {
    const bucket = classifySpecies(match.species);
    currentSpeciesFilter = bucket === 'small' ? 'small' : bucket;
  } else {
    currentSpeciesFilter = 'all';
  }
  updateFilterUI();
  renderFilteredAnimals();

  // Scroll + highlight + expand after re-render
  setTimeout(() => {
    const card = document.getElementById(`card-${shelterCode}`);
    if (card) {
      highlightCard(card);
      if (!card.classList.contains('expanded')) toggleCard(shelterCode);
    }
  }, 150);
}
```

**How it handles filter edge cases:**
- **bioState filter** (e.g. 'approved' excluding a 'pending' animal): reset to 'all' + update UI button
- **Adoption filter** (e.g. 'adoptable' excluding an unavailable animal): reset to 'all' + update UI button  
- **Species filter** (e.g. 'cat' for a dog): corrected to the target's species bucket + updateFilterUI
- All filter UI buttons updated to reflect the cleared state (no desync)
- `renderFilteredAnimals()` rebuilds the card DOM with the corrected filters
- 150ms setTimeout for the DOM to settle before scrollIntoView + toggleCard

**Reuses existing functions:** `switchTab`, `classifySpecies`, `updateFilterUI`, `renderFilteredAnimals`, `highlightCard`, `toggleCard` — no filter/search logic rewritten.

### 2. Name cell link (dashboard/index.html:15786)

**Before:**
```html
<td class="name-cell" title="${escapeHtml(a.shelterCode)}">${escapeHtml(a.name)}</td>
```

**After:**
```html
<td class="name-cell" title="${escapeHtml(a.shelterCode)}"><a href="#" class="profile-name-link" onclick="jumpToMediaCard('${a.shelterCode}'); return false;">${escapeHtml(a.name)}</a></td>
```

### 3. CSS (dashboard/index.html:2518)

```css
.profile-name-link {
  color: var(--primary);
  text-decoration: none;
  cursor: pointer;
}
.profile-name-link:hover {
  text-decoration: underline;
}
```

Uses `var(--primary)` (the dashboard's orange/brown accent) for consistency.

---

## Build

Dashboard is static HTML — loads HTTP 200.

---

## Verification

### Structural verification ✅

- `jumpToMediaCard` defined at line 8989, called from profiles name cell onclick at line 15786
- Clears `currentBioStateFilter` to `'all'` + updates `#bioStateFilterRow` button UI
- Clears `currentAdoptionStatusFilter` to `'all'` + updates `#adoptionStatusPill` button UI
- Sets `currentSpeciesFilter` to the target's classified species bucket via `classifySpecies`
- Calls `updateFilterUI()` + `renderFilteredAnimals()` to rebuild the card DOM
- 150ms `setTimeout` → finds card by `id="card-${shelterCode}"` → `highlightCard` (scrollIntoView + glow) → `toggleCard` if not expanded (triggers fetch-on-expand)

### Filter edge cases handled ✅

| Scenario | Mechanism |
|---|---|
| Species filter excludes target (e.g. cats shown, target is dog) | Species auto-corrected to target's bucket |
| BioState filter excludes target (e.g. 'approved', target is 'pending') | BioState reset to 'all' |
| Adoption filter excludes target (e.g. 'adoptable', target is unavailable) | Adoption reset to 'all' |
| All filters clear, card always renders | `renderFilteredAnimals()` rebuilds with cleared filters |

### Existing Find Animal ✅

`findAnimal()` (line 8947) unchanged — still works via its own search logic. No shared state mutated unexpectedly.

### Expand triggers fetch-on-expand ✅

`toggleCard(shelterCode)` (called in the setTimeout) triggers `loadBioForAnimal(shelterCode, true)` (Stage 1) → fetches live bio/draft data → renders the bio panel with current data.

---

## Commit

```
0894705 - Add profiles-tab name hotlink to jump to media-tab card
1 file changed: dashboard/index.html
```
