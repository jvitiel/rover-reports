# Preview: Full-Width 6-Column Grid

**Date:** 2026-06-22 16:50 UTC  
**Commit:** `eb050d7`  
**File:** `matcher-preview/styles.css` (+28 -5)

---

## Before

**styles.css:475-483:**
```css
.animals-section {
  padding: 20px 0 60px;
}

.animals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2px;
}
```

**styles.css:1120-1122:**
```css
@media (max-width: 400px) {
  .animals-grid { grid-template-columns: repeat(2, 1fr); }
}
```

Grid capped at 1200px by parent `.container { max-width: 1200px; padding: 0 20px; }`. Auto-fill yielded 4 columns max at desktop width. Single 400px breakpoint for phone.

## After

**styles.css:475-509:**
```css
.animals-section {
  padding: 0 0 60px;
}

.animals-section .container {
  max-width: none;
  padding-left: 0;
  padding-right: 0;
}

.animals-section #loadingState,
.animals-section #emptyState {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

.animals-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
}

@media (max-width: 1199px) {
  .animals-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (max-width: 899px) {
  .animals-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 599px) {
  .animals-grid { grid-template-columns: repeat(2, 1fr); }
}
```

**Old 400px breakpoint** (styles.css:1120) replaced with comment — ladder above handles all responsive steps.

## Breakpoint Ladder

| Width | Columns | Tile size at breakpoint |
|-------|---------|------------------------|
| ≥1200px | 6 | ~200px at 1200, ~426px at 2560 |
| ≤1199px | 4 | ~300px at 1199, ~225px at 900 |
| ≤899px | 3 | ~300px at 899, ~200px at 600 |
| ≤599px | 2 | ~300px at 599, ~187px at 375 |

Tiles grow uncapped at very wide viewports (matches NSAL behavior). No `max-width` on the grid or tiles.

## Scrollbar Safety

Zero `100vw` usage. The grid uses `width: 100%` within the uncapped container (inherits from normal document flow). No horizontal scrollbar at any width. The 2px gap is internal to the grid and doesn't affect document width.

## Global .container Unchanged

```
$ curl -s .../styles.css | grep -A3 '^\.container {'
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
```

The override is scoped to `.animals-section .container` only. Header (`.hero`), species tabs (`.species-tabs-section .container`), and filter bar (`.filters-section .container`) all use the global `.container` — untouched at 1200px.

## Loading/Empty States

`#loadingState` and `#emptyState` now have `max-width: 600px; margin: 0 auto; text-align: center` — visually centered within the full-width section, not awkwardly stretched.

## Verification

**Wide desktop (preview URL):**
- Grid spans full browser width, 6 tiles per row, edge-to-edge, 2px gaps ✅
- Tiles square (aspect-ratio 1/1, object-fit: cover) ✅
- Header + filter bar visually narrower than grid, centered at ~1200px ✅
- No horizontal scrollbar ✅

**Narrow (simulated 375px phone):**
- 2 columns, full-width, tiles square ✅
- No horizontal scrollbar ✅

**Production:**
```
$ curl -s matcher.4lgshelterapp.duckdns.org/styles.css | grep -c 'animals-section .container'
0
```
Production `matcher-web/styles.css` untouched ✅

## Commit

`eb050d7` — 1 file: `matcher-preview/styles.css`
