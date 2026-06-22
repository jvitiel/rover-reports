# Full-Width 6-Column Grid Diagnosis (matcher-preview)

**Date:** 2026-06-22 16:42 UTC  
**Mode:** Read-only diagnosis  

---

## 1. Container Structure (DOM nesting)

**matcher-preview/index.html:13-166:**

```
body
  #app
    .frozen-header                         ← sticky header zone
      header.hero                          ← logo, title, CTA (no .container; hero has its own max-width/padding)
      section.species-tabs-section
        .container                         ← 1200px centered
          .species-tabs-wrapper
      section.filters-section
        .container                         ← 1200px centered
          .filters-card                    ← filter checkboxes
          .results-adoption-row            ← "Showing N dogs" + adoption links
    main.animals-section                   ← below frozen header
      .container                           ← 1200px centered  ← THIS CAPS THE GRID
        #animalsGrid.animals-grid          ← the results grid
        #loadingState
        #emptyState
```

**The grid is a direct child of `.container`** (which has `max-width: 1200px; margin: 0 auto; padding: 0 20px`). The container is the width ceiling. The header and filter sections have their own separate `.container` wrappers — they're siblings of `.animals-section`, not parents, so they're structurally independent.

**Cleanly separable: YES.** Moving the grid out of `.container` (or overriding `.container` behavior within `.animals-section`) doesn't affect the header or filters at all. They have their own `.container` wrappers.

## 2. Current Grid CSS

**styles.css:80-84:**
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}
```

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

**styles.css:1121 (≤400px breakpoint):**
```css
.animals-grid { grid-template-columns: repeat(2, 1fr); }
```

**Body:** `* { margin: 0; padding: 0; }` and `body { background: var(--bg); }` — no body margin/padding.

**Current width ceiling:** `.container` at `max-width: 1200px` + `padding: 0 20px` = effective max content width of 1160px. The `auto-fill, minmax(280px, 1fr)` yields 4 columns at 1200px viewport (4 × 280 = 1120 < 1160).

## 3. Full-Width 6-Column Approach

### Recommended: Option (a) — CSS override on `.animals-section .container`

No HTML change needed. Override the `.container` within `.animals-section` to be full-width:

```css
.animals-section .container {
  max-width: none;
  padding: 0;
}

.animals-grid {
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
}
```

This breaks `.animals-section`'s `.container` out of the 1200px cap while leaving every other `.container` (species tabs, filters) untouched. No markup moves. The `#loadingState` and `#emptyState` inside the same `.container` would also go full-width — they'd need their own `max-width`/centering if that looks off, but they're simple centered text with `text-align: center` already.

### Why not option (b) — full-bleed trick:

The `width: 100vw; margin-left: calc(-50vw + 50%)` trick is fragile: it doesn't account for the scrollbar width (typically 15-17px on Windows), producing a horizontal scrollbar. Requires `overflow-x: hidden` on body which hides legitimate horizontal overflow. Not recommended.

### What moves:
- **CSS only.** No HTML restructuring.
- `.animals-section .container` gets `max-width: none; padding: 0;`
- `.animals-grid` gets `grid-template-columns: repeat(6, 1fr)` on desktop
- Responsive breakpoints scale down the column count

## 4. Responsive Column Plan

| Breakpoint | Columns | Rationale |
|-----------|---------|-----------|
| ≥1200px (desktop) | 6 | Full-width 6-up, like NSAL |
| 900px–1199px (small desktop / landscape tablet) | 4 | Tiles stay ~225-300px |
| 600px–899px (portrait tablet) | 3 | Tiles ~200-300px |
| ≤599px (phone) | 2 | Full-width 2-up, tiles ~150-200px |

**Current breakpoints in the file:**
- `@media (max-width: 768px)` — filter layout changes (styles.css:457, 1072, 1147)
- `@media (max-width: 400px)` — grid forced to `repeat(2, 1fr)` (styles.css:1121)

**Proposed replacement for the grid breakpoints:**

```css
/* Desktop: 6 columns */
.animals-grid {
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
}

/* Small desktop / landscape tablet */
@media (max-width: 1199px) {
  .animals-grid { grid-template-columns: repeat(4, 1fr); }
}

/* Portrait tablet */
@media (max-width: 899px) {
  .animals-grid { grid-template-columns: repeat(3, 1fr); }
}

/* Phone */
@media (max-width: 599px) {
  .animals-grid { grid-template-columns: repeat(2, 1fr); }
}
```

**Tiles stay square** at every width: `aspect-ratio: 1/1` is on `.animal-card` and is independent of column count. The tiles scale fluidly with `1fr`.

**Tile size at huge viewports:** At 2560px wide with 6 columns and 2px gaps, each tile is ~426px. At 3840px (4K), ~640px. NSAL lets tiles grow uncapped — their tiles get very large on 4K. A `max-width` cap (e.g. `max-width: 2400px; margin: 0 auto` on `.animals-section` or `.animals-grid`) would be a taste decision. Recommend **no cap initially** (match NSAL), note it as a design review point.

## 5. Side Padding / Edge-to-Edge

**Body:** `* { margin: 0; padding: 0 }` — no body margin. The `.container` adds `padding: 0 20px`, but we're overriding that to `padding: 0` for `.animals-section .container`.

**With the override:** The grid goes truly edge-to-edge (tiles touch the viewport edges). The 2px `gap` provides the only visual separation between tiles.

**NSAL reference:** Their tiles go truly edge-to-edge on desktop — no viewport gutter. On mobile they have a small ~8px side margin. We can match this:

```css
@media (max-width: 599px) {
  .animals-section .container { padding: 0 1px; }
}
```

Or leave it at `padding: 0` for true edge-to-edge everywhere. Design choice — flag for review.

## 6. Gotchas

1. **`#loadingState` and `#emptyState`** are siblings of `.animals-grid` inside the same `.container`. With `max-width: none; padding: 0`, the loading spinner and "no pets match" message go full-width. They use `text-align: center` so they'll still look centered, but if their background or visual width looks odd, they may need a `max-width: 600px; margin: 0 auto` wrapper. Low risk — they're simple text blocks.

2. **`.animals-section` padding** is `padding: 20px 0 60px`. The `20px` top padding creates a gap between the frozen header and the grid. For truly flush edge-to-edge (no top gap), set `padding-top: 0` or reduce it to match the 2px grid gap.

3. **No horizontal scrollbar risk** with this approach (unlike 100vw trick). The override stays within normal document flow.

4. **Filter bar / results count** are inside `.filters-section > .container` — a separate `.container` from the grid's. The full-width grid override doesn't affect them. Stage C filter changes won't conflict.

5. **The `@media (max-width: 400px)` grid override** at styles.css:1121 must be replaced — it currently sets `repeat(2, 1fr)` but the new breakpoint plan uses `≤599px` for 2 columns. Remove the old 400px breakpoint.
