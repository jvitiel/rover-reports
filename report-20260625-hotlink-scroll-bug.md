# Hotlink Scroll Bug — Card ID Mismatch (animalId vs shelterCode)

**Date:** 2026-06-25  
**Type:** Read-only diagnosis  
**Status:** Root cause identified — getElementById uses wrong key

---

## 1. Card ID: animalId ≠ shelterCode

Cards are rendered with `id="card-${animal.animalId}"` (`dashboard/index.html:7272`):

```html
<div class="animal-card" id="card-${animal.animalId}" 
  data-species="..." data-name="..." 
  data-id="${(animal.shelterCode || animal.animalId).toLowerCase()}" 
  data-shelter-code="${animal.shelterCode || ''}" ...>
```

- `animal.animalId` = SM numeric ID (e.g. `"3764"`)
- `animal.shelterCode` = alphanumeric code (e.g. `"A2025138"`)
- These are **different values** — confirmed for Juno: `animalId = "3764"`, `shelterCode = "A2025138"`
- Card element ID = `card-3764`

**`jumpToMediaCard` looks up by shelterCode** (line 9019):
```js
const card = document.getElementById(`card-${shelterCode}`);
// Looks for: card-A2025138
// Actual ID: card-3764
// → null → no scroll
```

**This is the bug.** `getElementById('card-A2025138')` finds nothing because the actual ID is `card-3764`.

---

## 2. How findAnimal Locates Cards (The Working Way)

`findAnimal` (line 8947) does NOT use `getElementById`. It iterates `querySelectorAll('.animal-card')` and matches on **data attributes**:

```js
// dashboard/index.html:8915-8923
const cards = document.querySelectorAll('.animal-card');
for (const card of cards) {
  const name = card.dataset.name || '';   // data-name (lowercase name)
  const id = card.dataset.id || '';       // data-id (shelterCode.toLowerCase())
  if (name.includes(query) || id.includes(query)) {
    found = card;
    break;
  }
}
```

`data-id` is set to `(animal.shelterCode || animal.animalId).toLowerCase()` — so for Juno it's `"a2025138"`. This matches on `shelterCode`, which is what `jumpToMediaCard` has.

---

## 3. Timing / Re-render Sequencing

Not the primary issue, but worth noting:

`jumpToMediaCard` sets all three filter state variables (`currentBioStateFilter`, `currentAdoptionStatusFilter`, `currentSpeciesFilter`) **before** calling `renderFilteredAnimals()` once. This is correct — one re-render after all state is set, no race.

The 150ms setTimeout is adequate (findAnimal uses 100ms for the same purpose). The card IS in the DOM after the re-render — the lookup just uses the wrong key.

---

## 3b. Multiple Filter Changes — Single Re-render ✅

```js
// jumpToMediaCard sets state vars:
currentBioStateFilter = 'all';      // state only
currentAdoptionStatusFilter = 'all'; // state only
currentSpeciesFilter = '...';        // state only
updateFilterUI();                    // UI buttons only
renderFilteredAnimals();             // SINGLE re-render with all three applied
```

No separate re-renders per filter — correct sequencing.

---

## 4. Card Present in DOM?

**Yes.** After clearing filters + correcting species + calling `renderFilteredAnimals()`, the card IS rendered in the DOM. The filter logic is working correctly. The card exists with `id="card-3764"` — but `jumpToMediaCard` looks for `id="card-A2025138"` → not found → no scroll.

---

## 5. The Fix

### Problem 1: Wrong lookup key

**Line 9019:** `document.getElementById(\`card-${shelterCode}\`)` — uses shelterCode, but cards are keyed by animalId.

**Fix:** Use `querySelector` with `data-shelter-code` attribute (which IS set to `animal.shelterCode`):

```js
const card = document.querySelector(`.animal-card[data-shelter-code="${shelterCode}"]`);
```

This matches how `findAnimal` works (data attribute lookup, not getElementById).

### Problem 2: toggleCard expects animalId, not shelterCode

**Line 9022:** `toggleCard(shelterCode)` — but `toggleCard` does `document.getElementById(\`card-${animalId}\`)`. If called with shelterCode, it won't find the card either.

**Fix:** Extract the animalId from the found card element and pass it to toggleCard:

```js
if (card) {
  const animalId = card.id.replace('card-', '');
  highlightCard(card);
  if (!card.classList.contains('expanded')) {
    toggleCard(animalId);
  }
}
```

### Lines to change

**dashboard/index.html, inside `jumpToMediaCard` (line ~9019-9024):**

Before:
```js
setTimeout(() => {
  const card = document.getElementById(`card-${shelterCode}`);
  if (card) {
    highlightCard(card);
    if (!card.classList.contains('expanded')) {
      toggleCard(shelterCode);
    }
  }
}, 150);
```

After:
```js
setTimeout(() => {
  const card = document.querySelector(`.animal-card[data-shelter-code="${shelterCode}"]`);
  if (card) {
    const animalId = card.id.replace('card-', '');
    highlightCard(card);
    if (!card.classList.contains('expanded')) {
      toggleCard(animalId);
    }
  }
}, 150);
```

---

*End of diagnosis.*
