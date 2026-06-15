# Dashboard tile width layout — diagnosis

**Date:** 2026-06-15 21:00 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Q1: HTML structure

```html
<div class="frozen-header" id="animalsFrozenHeader">
  <div class="profiles-header">
    <div class="profiles-header-left">
      <div class="stats-bar" id="statsBar">                     ← FLEX ROW (flex-wrap: wrap)
        
        <div class="stat-card clickable compact" data-filter="all">   ← FIRST TILE
          <div class="label">All</div>
          <div class="value" id="totalAnimals">—</div>               ← BIG NUMBER
          <div class="data-count" id="dataAll"></div>                 ← SUB-COUNT ("73 approved")
        </div>
        
        <div class="stat-card clickable compact" data-filter="dog">   ← DOGS TILE
          ...
        </div>
        <div class="stat-card clickable compact" data-filter="cat">   ← CATS TILE
          ...
        </div>
        <div class="stat-card clickable compact" data-filter="small"> ← SMALLS TILE
          ...
        </div>
        
        <div class="profiles-filter-group" id="adoptionStatusPill">   ← ADOPTION TOGGLE
          ...
        </div>
        
        <div class="rows-showing-metric">                             ← SHOWING BADGE
          <span class="rows-showing-label">Showing</span>
          <span class="rows-showing-number" id="rowsShowingCount">—</span>
          <span class="rows-showing-label">Rows</span>
        </div>
        
        <div class="search-qr-section">                               ← SEARCH + BIO STATE ROW
          ...
        </div>
      </div>
    </div>
  </div>
</div>
```

**The four tiles, adoption toggle, SHOWING badge, and search section are ALL siblings in `.stats-bar`** — a single `display: flex; flex-wrap: wrap; gap: 16px;` row that wraps when its children exceed the available width.

---

## Q2: CSS rules

### `.stats-bar` (parent flex container)
```css
.stats-bar { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
```

### `.stat-card` (base tile)
```css
.stat-card {
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  min-width: 150px;            /* ← base min-width */
  transition: all 0.15s;
  border-right: 2px solid var(--gray-200);
  border-bottom: 2px solid var(--gray-200);
}
```

### `.stat-card.compact` (override — all tiles have this class)
```css
.stat-card.compact {
  padding: 8px 16px;           /* ← smaller padding than base */
  min-width: 95px;             /* ← overrides base 150px to 95px */
}
```
**No `width`, no `max-width`. Tiles are content-sized with `min-width: 95px`.**

### `.stat-card.clickable:hover` (hover state)
```css
.stat-card.clickable:hover {
  border-color: var(--primary);
  transform: translateY(-2px);        /* ← visual lift, does NOT change layout flow */
  box-shadow: var(--shadow-lg);
}
```

### `.stat-card.clickable.active` (selected state)
```css
.stat-card.clickable.active {
  border-color: var(--primary);
  background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
}
```

**(a) No fixed width.** `min-width: 95px`, no `width` or `max-width`. Tiles grow with content.

**(b) Selected vs unselected — box-size-affecting differences:**

| Property | Unselected | Selected (.active) | Hover |
|----------|-----------|-------------------|-------|
| border-right | 2px solid var(--gray-200) | 2px solid var(--primary) | 2px solid var(--primary) |
| border-bottom | 2px solid var(--gray-200) | 2px solid var(--primary) | 2px solid var(--primary) |
| background | white | linear-gradient | (no change) |
| transform | none | none | translateY(-2px) |
| box-shadow | var(--shadow-md) | (no change) | var(--shadow-lg) |

**Border width does NOT change** (2px→2px). **Padding does NOT change.** **Font weight/size does NOT change.** The selected state changes only `border-color` and `background` — no box-size difference. The hover `transform: translateY(-2px)` doesn't affect flow (transforms are paint-only).

**(c) Font sizes are fixed:**
```css
.stat-card.compact .value { font-size: 1.5rem; line-height: 1.2; }  /* big number */
.stat-card.compact .label { font-size: 0.65rem; }                     /* "All"/"Dogs"/etc */
.stat-card.compact .data-count { font-size: 0.7rem; line-height: 1.2; margin-top: 1px; }  /* sub-count */
```
Font size/weight don't change with state. **But the sub-count text content changes** (e.g. "" → "73 approved" → "302 approved"), and since there's no fixed width, the card grows to fit.

**(d) Overflow/wrap:** `.stats-bar` has `flex-wrap: wrap`. When the total width of tiles + adoption toggle + badge + search exceeds the container, items wrap to the next line. A wider first tile (from longer sub-count text) can push later siblings to wrap.

### `.rows-showing-metric` (SHOWING badge)
```css
.rows-showing-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0 10px;
  flex-shrink: 0;          /* ← won't shrink, but CAN be pushed to next line by wrap */
}
```

### Global box-sizing
```css
* { box-sizing: border-box; }
```
All elements use border-box. Border changes don't affect outer dimensions when width is set.

---

## Q3: SHOWING badge vs tiles

The SHOWING badge (`.rows-showing-metric`) is a **sibling of the four tile cards** inside the same `.stats-bar` flex row. It wraps to a new line when the combined width of all preceding siblings (4 tiles + adoption toggle) exceeds the container width. The badge itself has `flex-shrink: 0`, so it won't compress — it wraps instead.

**What causes the wrap:** the tiles are content-sized (`min-width: 95px`, no max). When the sub-count text changes from empty to "81 approved", the first tile grows, adding ~60-70px, which can push the badge past the container edge.

---

## Q4: Minimal fix location

The first tile (`[data-filter="all"]`) needs a fixed width that accommodates:
- Big number: 1-3 digits (e.g. "9" to "492") at `font-size: 1.5rem; font-weight: 700`
- Sub-count: up to ~"302 approved" at `font-size: 0.7rem`
- Padding: `8px 16px` (compact)
- Label: "All" at `0.65rem`

**Safest approach:** Add a `width` (or `min-width` + `max-width` to the same value) on `.stat-card.compact[data-filter="all"]` or give the first tile an id/class and set a fixed width. Since `box-sizing: border-box` is global, the border (2px) is included in the declared width — no size change on selection.

A value around **120-130px** should fit "492" + "302 approved" comfortably while not being wider than needed. The other three species tiles can remain content-sized (their numbers are smaller and more stable).

Alternatively, setting `min-width` and `max-width` to the same value locks it without overriding the default auto behavior for other tiles. A targeted selector like:
```css
.stat-card.compact[data-filter="all"] { width: 125px; }
```
would affect only the first tile.

**No other tile sizing or alignment is disturbed** — the other three tiles keep their `min-width: 95px` content-sizing, and the flex container continues to wrap naturally with a now-stable first tile.
