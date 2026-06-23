# Match Score Badge — Removal Diagnosis

**Date:** 2026-06-23  
**Type:** Read-only diagnosis  
**Scope:** Locate Match Score badge in matcher detail popup for later removal

---

## Searcher Status Note

Before this diagnosis, checked service health re: John's report of searcher API errors. The 14:27 UTC search hit transient Anthropic API errors (500 internal + 529 overloaded). The 15:13 UTC search succeeded normally (status=success, 25s). Service is up, responding 200. These were upstream Anthropic outages, not a shelter-app bug.

---

## 1. Badge Location

### matcher-web

**HTML** (`matcher-web/index.html:194–197`):
```html
<div class="detail-item" id="modalScoreContainer" style="display: none;">
  <span class="detail-label">Match Score</span>
  <span id="modalScore" class="detail-value score-badge">-</span>
</div>
```

**JS populate** (`matcher-web/app.js:958–965`):
```js
const scoreContainer = document.getElementById('modalScoreContainer');
const scoreValue = document.getElementById('modalScore');
if (animal.matchScore !== undefined) {
  scoreContainer.style.display = 'block';
  scoreValue.textContent = `${animal.matchScore}%`;
} else {
  scoreContainer.style.display = 'none';
}
```

**i18n label** (`matcher-web/app.js:121`): `'modal.match_score_label': 'Match Score'`  
**i18n update** (`matcher-web/app.js:363`): `['modalScore', 'modal.match_score_label']`

### matcher-preview

**HTML** (`matcher-preview/index.html:177–180`):
```html
<div class="detail-item" id="modalScoreContainer" style="display: none;">
  <span class="detail-label">Match Score</span>
  <span id="modalScore" class="detail-value score-badge">-</span>
</div>
```

**JS populate** (`matcher-preview/app.js:1015–1022`):
```js
const scoreContainer = document.getElementById('modalScoreContainer');
const scoreValue = document.getElementById('modalScore');
if (animal.matchScore !== undefined) {
  scoreContainer.style.display = 'block';
  scoreValue.textContent = `${animal.matchScore}%`;
} else {
  scoreContainer.style.display = 'none';
}
```

**i18n label** (`matcher-preview/app.js:140`): `'modal.match_score_label': 'Match Score'`  
**i18n update** (`matcher-preview/app.js:392`): `['modalScore', 'modal.match_score_label']`

---

## 2. Identical or Drifted

**Identical.** The badge markup, the JS populate logic, the i18n key/value, and the i18n update wiring are byte-identical between matcher-web and matcher-preview. `diff` of the populate blocks returns no output.

---

## 3. Display vs Computation Separation

### Computation (`matcher-web/app.js:645`, `matcher-preview/app.js:727`):
```js
function calculateMatchScore(animal) { ... }
```

### Ordering (`matcher-web/app.js:816,822`, `matcher-preview/app.js:898,904`):
```js
matchScore: calculateMatchScore(animal)       // attached to animal object during filter
filteredAnimals.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));  // sort by score
```

### Display (popup populate):
Lines quoted in §1 above — `getElementById('modalScoreContainer')` + `.style.display`.

**These are fully separable.** The computation attaches `matchScore` to each animal object during filtering. The sort uses it to order results. The popup display reads it to show the badge. Removing the popup display (the `modalScoreContainer` div + the populate JS) does NOT affect `calculateMatchScore` or the sort. The score is still computed, animals are still ordered by score — the badge just stops being shown.

---

## 4. Grid Layout Impact

### Grid structure (`matcher-web/styles.css:881–886`, `matcher-preview/styles.css:864–869`):
```css
.modal-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 22px;
}
```

**2-column CSS grid.** Current children:
1. Sex (always visible)
2. Age (always visible)
3. Color (always visible)
4. Match Score (conditionally visible via `display: none/block`)

With the score badge present and visible: 4 items in a 2×2 grid — clean.  
**With the score badge removed:** 3 items in a 2-column grid → row 1 has Sex + Age, row 2 has Color alone (left-aligned, right cell empty). This is a cosmetic gap but not broken — the grid reflows naturally; no fixed column-count issue. CSS grid auto-places items; there's no hardcoded row assignment.

**Mobile** (`matcher-web/styles.css:1039`, `matcher-preview/styles.css:1006`):
```css
.modal-details-grid { grid-template-columns: 1fr; }
```
Single-column on mobile — 3 items stack cleanly, no gap.

### Layout fix if desired:
To avoid the empty 4th cell on desktop, either:
- Change to `grid-template-columns: 1fr 1fr 1fr` (3-column, one row) — all three items on one line
- Or leave as-is — the asymmetry (2+1) is minor and the score was already conditionally hidden (`display: none` by default), so the 3-item layout already occurs when no score is available

---

## 5. Clean Removal Surface

### Per directory (identical in both):

| What to remove | File | Lines |
|----------------|------|-------|
| Badge markup: `<div class="detail-item" id="modalScoreContainer">...</div>` | index.html | matcher-web:194–197, matcher-preview:177–180 |
| Populate JS: `const scoreContainer...scoreContainer.style.display = 'none';` | app.js | matcher-web:958–965, matcher-preview:1015–1022 |
| i18n key (EN): `'modal.match_score_label': 'Match Score'` | app.js | matcher-web:121, matcher-preview:140 |
| i18n key (ES): `'modal.match_score_label': 'Puntuación'` (or equivalent) | app.js | (in ES block, same key) |
| i18n update mapping: `['modalScore', 'modal.match_score_label']` | app.js | matcher-web:363, matcher-preview:392 |
| CSS `.detail-item .detail-value.score-badge` rule | styles.css | matcher-web:912–919, matcher-preview:895–902 |

### Do NOT remove:
- `calculateMatchScore()` function
- `matchScore: calculateMatchScore(animal)` assignment
- `filteredAnimals.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))` ordering

### Grid tweak:
Optional. The 2-column grid with 3 items (Sex, Age, Color) leaves an empty bottom-right cell. If that bothers the eye, switch to `grid-template-columns: repeat(3, 1fr)` on desktop and leave the mobile single-column as-is. Otherwise no change needed — it's the same layout that already appeared when `matchScore` was undefined (the badge was `display: none`).
