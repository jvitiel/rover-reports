# Stage C: Filter Chrome Cleanup (matcher-preview only)

**Date:** 2026-06-22 17:05 UTC  
**Commit:** `8f40717`  
**Files:** `matcher-preview/index.html` (+3 -20), `matcher-preview/styles.css` (+13 -81), `matcher-preview/app.js` (+0 -15)

---

## Edit 1: Remove filter-hint

**Before (index.html:37):**
```html
<span class="filter-hint">Check all that apply below:</span>
```
**After:** Line removed.

**CSS before (styles.css:1156-1164):**
```css
.filter-hint {
  font-family: var(--body-font);
  font-size: 1.15rem;
  color: var(--text-secondary);
  font-style: italic;
  position: absolute;
  left: 0;
}
```
**After:** Rule removed (plus mobile override at 768px removed).

**JS before (app.js:263-264):**
```javascript
const hint = document.querySelector('.filter-hint');
if (hint) hint.textContent = i18n('filter.hint');
```
**After:** Dead handler removed.

## Edit 2: Left-justify species subtabs

**Before (styles.css:195-199):**
```css
.species-tabs {
  display: flex;
  gap: 10px;
  justify-content: center;
```

**After:**
```css
.species-tabs {
  display: flex;
  gap: 10px;
  justify-content: flex-start;
```

**Before (styles.css:1167-1169) — wrapper inner tabs centered:**
```css
.species-tabs {
  margin-left: auto;
  margin-right: auto;
}
```

**After:**
```css
.species-tabs-wrapper .species-tabs {
  margin-left: 0;
  margin-right: 0;
}
```

## Edit 3: Remove adoption-links group

**Before (index.html:135-147):**
```html
<div class="adoption-links">
  <span class="adoption-links-label">Ready to adopt?</span>
  <a ... class="adoption-link adoption-link-primary">Apply to Adopt</a>
  <a ... class="adoption-link">English PDF</a>
  <a ... class="adoption-link">Español PDF</a>
</div>
```
**After:** Entire block removed.

**CSS:** 7 rules removed (`.adoption-links`, `.adoption-links-label`, `.adoption-link`, `:hover`, `-primary`, `-primary:hover`, mobile wrap).

**JS (app.js:340-348):** Dead i18n handlers for adoption label + 3 link texts removed.

## Edit 4: Move counter to subtab row

**Before:** `.results-count` was inside `.results-adoption-row` below the filter card.

**After (index.html):** `.results-count` moved inside `.species-tabs-wrapper`, after `.species-tabs`:
```html
<div class="species-tabs-wrapper">
  <div class="species-tabs">...</div>
  <div class="results-count">
    Showing <span>0</span> adoptable <span>dogs</span>
  </div>
</div>
```

**CSS:** `.species-tabs-wrapper` changed to `justify-content: space-between` (tabs left, counter right). Counter styled inside wrapper context. Mobile (≤768px): wrapper stacks column, counter left-aligned below tabs.

**JS:** `updateResultsCount()` (app.js:406) still finds `.results-count` by class — works in new position, no change needed.

## Edit 5: Remove empty results-adoption-row

**Before (index.html:131-149):**
```html
<div class="results-adoption-row">
  <div class="results-count">...</div>
  <div class="adoption-links">...</div>
</div>
```
**After:** Entire block removed (counter moved up, links deleted).

**CSS:** `.results-adoption-row` rule + its 768px mobile override replaced with comments.

---

## Verification

- **filter-hint:** 0 occurrences in preview HTML ✅
- **Subtabs left-justified:** `justify-content: flex-start`, `margin-left: 0` ✅
- **Counter in subtab row:** `.results-count` inside `.species-tabs-wrapper`, right-justified via `space-between` ✅
- **Counter still updates:** `updateResultsCount()` JS intact (app.js:406), querySelector finds `.results-count` ✅
- **Adoption links gone:** 0 occurrences of `.adoption-link` in preview HTML ✅
- **results-adoption-row gone:** 0 occurrences in preview HTML ✅
- **Checkbox rows intact:** 7 `.checkbox-group` elements present (unchanged) ✅
- **Species tabs working:** 6 `.species-tab` elements, `switchSpecies()` onclick handlers intact ✅
- **Filtering logic:** `applyFilters()` unchanged, reads from same checkbox DOM ✅

## Dead Code Report

Removed 15 lines of JS (i18n handlers for filter-hint + adoption-links). These were translation wiring for elements that no longer exist. The i18n keys (`filter.hint`, `results.ready_to_adopt`, `results.apply_to_adopt`, `results.english_pdf`, `results.espanol_pdf`) remain in the translations object but are inert — no DOM targets. Left the keys in place (harmless, and available if elements are ever re-added).

## Production Untouched

```
$ curl -s matcher.4lgshelterapp.duckdns.org/ | grep -c 'filter-hint'      → 1 (still present)
$ curl -s matcher.4lgshelterapp.duckdns.org/ | grep -c 'adoption-link'    → 5 (still present)
$ curl -s matcher.4lgshelterapp.duckdns.org/ | grep -c 'results-adoption' → 1 (still present)
```

Production `matcher-web/` directory not in the commit. All 3 elements remain in production ✅
