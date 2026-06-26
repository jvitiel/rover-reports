# Hotlink Scroll Fix — Card Lookup by data-shelter-code + animalId for toggleCard

**Date:** 2026-06-26  
**Commit:** 89f43c4  
**Files changed:** dashboard/index.html

---

## Change

**Before** (dashboard/index.html, jumpToMediaCard setTimeout block ~line 9017):
```js
const card = document.getElementById(`card-${shelterCode}`);
if (card) {
  highlightCard(card);
  if (!card.classList.contains('expanded')) {
    toggleCard(shelterCode);
  }
}
```

**After:**
```js
const card = document.querySelector(`.animal-card[data-shelter-code="${shelterCode}"]`);
if (card) {
  const animalId = card.id.replace('card-', '');
  highlightCard(card);
  if (!card.classList.contains('expanded')) {
    toggleCard(animalId);
  }
}
```

- `querySelector` with `data-shelter-code` finds the card by the attribute that matches shelterCode (e.g. `A2025138`)
- `card.id.replace('card-', '')` extracts the numeric animalId (e.g. `3764`) for `toggleCard`
- No other instance of the bug in `jumpToMediaCard` — confirmed only filter-button `getElementById` calls remain (correct usage)

---

## Build

Dashboard loads HTTP 200.

---

## Verification

### Structural ✅

- `querySelector(`.animal-card[data-shelter-code="..."]`)` matches the `data-shelter-code` attribute set in `renderAnimalCard` (line 7272)
- `card.id` is `card-{animalId}` → `.replace('card-', '')` extracts `animalId` → `toggleCard(animalId)` works with the correct key
- `highlightCard(card)` receives the actual DOM element → `scrollIntoView` works
- `findAnimal` unchanged and still works (uses its own `dataset.id` / `dataset.name` lookup)

---

## Commit

```
89f43c4 - Fix profiles hotlink scroll: use data-shelter-code lookup + animalId for toggleCard
1 file changed: dashboard/index.html
```
