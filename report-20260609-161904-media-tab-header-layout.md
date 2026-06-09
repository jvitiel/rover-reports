# Media Tab Header Layout Diagnosis

**Issue:** Mac user reports the Media tab header (species filter cards, Featured grid, Show toggle, search row) expands to fill the entire viewport, pushing animal cards off-screen. Chrome + Safari. Other tabs fine. Other users fine.

**Source file:** `/home/shelter/shelter-apps/dashboard/index.html` (single 15,212-line file)

---

## Structure

The Media tab is `#content-animals` (the button reads "📷 Media", maps to `switchTab('animals')`).

```
div.tab-content#content-animals
  div.container
    div.frozen-header#animalsFrozenHeader          ← STICKY HEADER
      div.profiles-header                          ← FLEX ROW
        div.profiles-header-left (flex: 1 1 auto)
          div.stats-bar#statsBar                   ← SPECIES CARDS + SHOW TOGGLE + SEARCH
            div.stat-card[data-filter="all"]        (All count)
            div.stat-card[data-filter="dog"]        (Dogs count)
            div.stat-card[data-filter="cat"]        (Cats count)
            div.stat-card[data-filter="small"]      (Smalls count)
            div.profiles-filter-group#adoptionStatusPill  (Show: All / Adoptable / Pending)
            div.search-qr-section                  (search input + Find + Print QR buttons)
        div.profiles-header-label                  (Featured / on / Homepage text)
        div.profiles-header-right (flex: 0 0 auto)
          div.featured-grid-new#featuredGrid       ← 3×2 GRID OF FEATURED SLOTS
    div#content                                    ← ANIMAL CARDS GO HERE
```

## Key CSS Rules

### `.frozen-header` (line 1688)
```css
.frozen-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--gray-300);
    padding-top: 16px;
    margin: -24px -24px 8px -24px;
    padding: 16px 24px 8px 24px;
}
```
**No max-height, no overflow constraint.** Height is entirely content-driven.

### `.profiles-header` (line 1386)
```css
.profiles-header {
    display: flex;
    gap: 16px;
    align-items: stretch;    /* ← children stretch to tallest sibling */
}
```

### `.profiles-header-left` (line 1392)
```css
.profiles-header-left {
    flex: 1 1 auto;    /* ← grows to fill available space */
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
}
```

### `.stats-bar` (line 71)
```css
.stats-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    flex-wrap: wrap;    /* ← WRAPS when items overflow */
}
```

### `.stat-card` base (line 73) + `.stat-card.compact` (line 1727)
```css
/* Base */
.stat-card {
    background: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: var(--shadow-md);
    min-width: 150px;     /* ← 150px minimum */
}

/* Compact override (applied in HTML) */
.stat-card.compact {
    padding: 8px 16px;
    min-width: 95px;
}
```

### `.search-qr-section` (line 1750)
```css
.search-qr-section {
    display: flex;
    align-items: center;
    gap: 12px;
    background: white;
    padding: 12px 16px;
    border-radius: 10px;
    /* no max-width, no flex-shrink constraint */
}
```

### `.featured-grid-new` (line 1423)
```css
.featured-grid-new {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, 80px);    /* ← Fixed 80px rows */
    gap: 6px;
    width: 100%;
}

.featured-grid-new .featured-slot-new {
    min-width: 90px;
}
```

### `@media (max-width: 900px)` (line 1541)
```css
.profiles-header {
    flex-direction: column;    /* ← STACKS vertically */
}
.profiles-header-left,
.profiles-header-label,
.profiles-header-right {
    flex: 1 1 auto;
    width: 100%;
}
```

### `@media (max-width: 640px)` (line 1681)
```css
.stats-bar { flex-direction: column; }
.stat-card { min-width: auto; }
```

---

## Analysis: Why This Header Can Consume the Viewport

### 1. No height cap on `.frozen-header`
The frozen header is `position: sticky; top: 0` with no `max-height` or `overflow` property. Its height is 100% driven by content. If the content inside grows, the header grows unbounded.

### 2. `.stats-bar` wrapping chain reaction
The `.stats-bar` contains 6 inline items (4 stat cards + 1 filter group + 1 search section) in a `flex-wrap: wrap` container with `gap: 16px`. Each `.stat-card.compact` has `min-width: 95px`. The `.search-qr-section` has no max-width and contains a 180px input + two buttons.

At certain viewport widths (or zoom levels), wrapping causes each item to fall to its own row. With 6 items stacking vertically plus 16px gaps, this alone could be:
- 4 stat cards × ~50px each = ~200px
- 1 filter group = ~40px
- 1 search section = ~50px
- 5 gaps × 16px = 80px
- Plus `margin-bottom: 24px` on stats-bar
- **Total ≈ 400px+ just for the left column**

### 3. `@media (max-width: 900px)` stacks the entire `.profiles-header` vertically
Below 900px, `.profiles-header` goes `flex-direction: column`, putting the stats-bar, "Featured on Homepage" label, and the entire 3×2 featured grid (2 × 80px = 160px + 6px gap = 166px) into a single vertical stack. Combined height at this breakpoint:
- Stats bar (wrapped) ≈ 400px
- Label ≈ 30px
- Featured grid ≈ 170px
- **Total ≈ 600px+** — easily fills a laptop viewport

### 4. `align-items: stretch` on `.profiles-header`
Above 900px, `.profiles-header` uses `align-items: stretch`, meaning the left column height forces the right column (featured grid) to match. If the stats-bar wraps excessively, the entire row grows.

### 5. Mac-specific zoom / text-size
macOS honors system-level text size preferences and has different default font rendering. A larger text size would increase stat card heights AND trigger earlier wrapping (items exceed container width sooner). This explains why it reproduces on both Chrome and Safari on the same Mac but not on other users' machines — it's likely a system-level display setting (Accessibility > Display > Text Size, or display scaling).

---

## Comparison With Other Tabs' Headers

| Tab | Frozen header? | Content in header |
|-----|----------------|-------------------|
| **Media (animals)** | YES - `#animalsFrozenHeader` | stats-bar (6 items, flex-wrap) + featured grid (3×2, 160px) + search row |
| Stories | YES - `#storiesFrozenHeader` | 2 featured story cards (horizontal) — much simpler |
| Events | YES - `#eventsFrozenHeader` | Similar to Stories — minimal |
| Activities | YES - `#activitiesFrozenHeader` | Compact header with reduced padding |
| Feeding | YES - `#feedingFrozenHeader` | Compact header |
| Profiles | **NO frozen header** | Simple filter buttons, not sticky |

**The Media tab header is uniquely dense.** It's the only one with a flex-wrapping stats bar + a 3×2 grid + a search section all inside a single sticky container with no height cap. Every other frozen header has far less content.

---

## Images Without Explicit Dimensions

Featured slot thumbnails are created dynamically in JS (lines 6415, 6432):
```js
const img = document.createElement('img');
img.src = slot.media?.url || slot.animal.photo_url;
img.className = 'slot-thumbnail';
img.loading = 'lazy';
// NO img.width or img.height set
```

The CSS does set `width: 100%; height: 100%; object-fit: cover` on `.slot-thumbnail`, and the grid cells have fixed `80px` row height, so these are **contained** and unlikely to cause expansion. Not the primary issue.

---

## Summary

The root cause is almost certainly **the `.stats-bar` wrapping at the user's effective viewport width** (likely driven by macOS display scaling or zoom), combined with **no max-height/overflow on `.frozen-header`**. At certain widths, 6 flex items wrap into a tall vertical stack, and the 900px breakpoint adds the featured grid vertically too — creating a header that can easily exceed 600px, consuming a laptop's entire viewport.
