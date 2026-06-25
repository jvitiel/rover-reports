# Profiles-Tab Name Hotlink — Jump to Media Tab Card

**Date:** 2026-06-25  
**Type:** Read-only diagnosis  
**Status:** Easy implementation — all pieces exist

---

## 1. The Profiles-Tab Name Cell

**Location:** `dashboard/index.html:15740`

```js
<td class="name-cell" title="${escapeHtml(a.shelterCode)}">${escapeHtml(a.name)}</td>
```

Each row's animal is identified by `a.shelterCode` (available in the row render context). The name cell has the `name-cell` class and already carries the `shelterCode` as its `title` attribute.

**Where to add the link:** Wrap `${escapeHtml(a.name)}` in a clickable element with an onclick handler like `jumpToMediaCard('${a.shelterCode}')`.

---

## 2. Tab Switching

**Function:** `switchTab(tabName)` — `dashboard/index.html:9045`

```js
function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.getElementById(`content-${tabName}`).classList.add('active');
  // ... loads data for the target tab ...
}
```

**Media tab identifier:** `'animals'` — called via `switchTab('animals')`. The tab button is `id="tab-animals"` (line 5233), content div is `id="content-animals"`.

Can be called programmatically. When switching TO the media tab from another tab, it activates the media content div. The media tab's animal cards are **already rendered** from the initial page load — `switchTab('animals')` doesn't re-render them (no `if (tabName === 'animals')` handler in the function), it just shows/hides the content divs.

---

## 3. Media-Tab Cards — DOM Presence

**Rendering:** `renderFilteredAnimals()` — `dashboard/index.html:6996`

```js
content.innerHTML = `<div class="animal-list">${filtered.map(a => renderAnimalCard(a)).join('')}</div>`;
```

Cards are **bulk-rendered** via `innerHTML` replacement. Each card has `id="card-${animal.animalId}"` (line 7264). When the media tab is visible with the default "all" species filter, ALL animal cards are in the DOM.

**Critical:** `renderFilteredAnimals()` uses `innerHTML` replacement — when a filter is active, cards that don't match are **removed from the DOM entirely**, not just hidden. Only `filtered` animals' cards exist in the DOM.

---

## 4. Filters and Card Presence

Three filters can exclude cards from the DOM:

1. **Species filter** (`currentSpeciesFilter`): `'all'` / `'dog'` / `'cat'` / `'small'` — default `'all'` (line 6569). When set to `'dog'`, only dog cards are in the DOM.
2. **BioState filter** (`currentBioStateFilter`): `'all'` / `'approved'` / `'pending'` / `'needed'` / `'youth'` — further limits cards.
3. **Adoption status filter** (`currentAdoptionStatusFilter`): `'adoptable'` / `'pending'` / `'all'` — default `'adoptable'` (line 6570).

If the user is on the Profiles tab looking at a dog and clicks the name, but the media tab has `currentSpeciesFilter = 'cat'`, the dog's card won't be in the DOM.

**However:** The existing `findAnimal()` function already handles this case.

---

## 5. Existing Jump-to-Animal: `findAnimal()` — Complete Solution

**Location:** `dashboard/index.html:8901-8967`

`findAnimal()` already implements the full flow:

1. Takes a query from the search input
2. Searches currently-rendered cards by `data-name` and `data-id` (case-insensitive partial match)
3. **If the card is found:** calls `highlightCard(card)` → `scrollIntoView({ behavior: 'smooth', block: 'center' })` + visual highlight effect
4. **If the card is NOT found (filtered out):** checks `allAnimalsData` for a match → switches to the correct species filter via `filterBySpecies(bucket)` → waits 100ms → retries with `findAndHighlight(query)`

```js
// dashboard/index.html:8929-8943
if (matchInAll) {
  const bucket = classifySpecies(matchInAll.species);
  if (bucket === 'small') {
    filterBySpecies('small');
  } else {
    filterBySpecies(bucket);
  }
  setTimeout(() => findAndHighlight(query), 100);
}
```

`highlightCard()` (line 8967):
```js
function highlightCard(card) {
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.style.transition = 'box-shadow 0.3s, transform 0.3s';
  // ... highlight animation ...
}
```

**This handles ALL the edge cases:** species filter mismatch → auto-switches filter, then scrolls. The search-by-shelterCode is exact enough (the `data-id` attribute on each card matches `shelterCode.toLowerCase()`).

---

## 6. Scroll + Expand

After scrolling to the card via `highlightCard`, expanding it is straightforward:

```js
toggleCard(animalId)  // adds .expanded class + triggers loadBioForAnimal(id, true)
```

Since we built fetch-on-expand (Stage 1), expanding the card will fetch live bio/draft data and potentially trigger SM auto-gen. The `toggleCard` function is safe to call programmatically.

**Consideration:** `highlightCard` scrolls with `scrollIntoView`. After expanding, the card grows taller and may shift. A second `scrollIntoView` after expand (with a small delay) could improve UX, but isn't required for v1.

---

## 7. Verdict + Approach

### Easy — ~20 lines

**Recommended approach:**

1. **Define `jumpToMediaCard(shelterCode)`** (~15 lines):
   ```js
   function jumpToMediaCard(shelterCode) {
     // Switch to media tab
     switchTab('animals');
     // Use findAnimal's filter-aware search logic
     const query = shelterCode.toLowerCase();
     const card = document.getElementById(`card-${shelterCode}`) ||
       document.querySelector(`.animal-card[data-shelter-code="${shelterCode}"]`);
     if (card) {
       highlightCard(card);
       if (!card.classList.contains('expanded')) toggleCard(shelterCode);
     } else {
       // Card filtered out — switch species filter, then scroll+expand
       const match = allAnimalsData.find(a => (a.shelterCode || '').toLowerCase() === query);
       if (match) {
         filterBySpecies(classifySpecies(match.species) === 'small' ? 'small' : classifySpecies(match.species));
         setTimeout(() => {
           const c = document.getElementById(`card-${shelterCode}`) ||
             document.querySelector(`.animal-card[data-shelter-code="${shelterCode}"]`);
           if (c) {
             highlightCard(c);
             if (!c.classList.contains('expanded')) toggleCard(shelterCode);
           }
         }, 150);
       }
     }
   }
   ```

2. **Update the profiles name cell** (~1 line change at line 15740):
   ```html
   <td class="name-cell" title="${escapeHtml(a.shelterCode)}">
     <a href="#" onclick="jumpToMediaCard('${a.shelterCode}'); return false;" class="profile-name-link">
       ${escapeHtml(a.name)}
     </a>
   </td>
   ```

3. **Minimal CSS** for the link styling (~3 lines).

### What we reuse:
- `switchTab('animals')` — tab switching
- `filterBySpecies()` — filter auto-correction when card is filtered out
- `highlightCard()` — scroll + visual highlight
- `toggleCard()` — expand + fetch-on-expand (Stage 1)
- `allAnimalsData` — full animal list for filter-aware lookup

### No new endpoint, no server change, no DB change.

### Edge case handled:
- Species filter excludes the target → `filterBySpecies` corrects it → card rendered → scroll + expand
- BioState filter could still exclude the card (e.g. filter = 'approved' but animal is 'pending'). Could clear bioState filter too, or accept that edge case. The species filter is the most common mismatch.

---

*End of diagnosis.*
