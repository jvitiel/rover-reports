# Profiles Table Width Bleed — Diagnosis Report

**Date:** 2026-06-23  
**Type:** Read-only diagnosis  
**Scope:** Dashboard profiles-tab main table bleeds into right-side card

---

## 1. Table + Wrapper Width CSS

### Layout hierarchy (HTML at `dashboard/index.html:5351–5355`):
```html
<div class="profiles-content-layout">    <!-- flex row -->
  <div class="profiles-main">            <!-- flex: 1, holds the table -->
    <div class="profiles-table-wrapper">  <!-- scroll container -->
      <table class="profiles-table">      <!-- the table itself -->
```

### `.profiles-content-layout` (`dashboard/index.html:2452–2456`):
```css
.profiles-content-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
```

### `.profiles-main` (`dashboard/index.html:2457–2460`):
```css
.profiles-main {
  flex: 1;
  min-width: 0;
}
```
No explicit width, max-width, or padding. `flex: 1` means it grows to fill remaining space after the sidebar's 280px + 16px gap.

### `.profiles-sidebar` (`dashboard/index.html:2461–2463`):
```css
.profiles-sidebar {
  flex: 0 0 280px;
}
```

### `.profiles-table-wrapper` (`dashboard/index.html:2464–2475`):
```css
.profiles-table-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  border-right: 2px solid var(--accent);
  border-bottom: 2px solid var(--accent);
  width: fit-content;          /* sizes to content */
  padding-right: 32px;         /* ← THE CULPRIT */
}
```

### `.profiles-table` (`dashboard/index.html:2476–2480`):
```css
.profiles-table {
  border-collapse: collapse;
  font-size: 0.8rem;
  table-layout: auto;          /* columns size to content */
}
```
No width, max-width, or min-width on the table itself.

---

## 2. The Gap: What Creates the Dead Space

**Root cause: `padding-right: 32px` on `.profiles-table-wrapper` (line 2474).**

With `width: fit-content`, the wrapper computes its width as:

```
wrapper width = table content width + padding-right (32px)
```

The 32px right padding is the white space visible between the Score column's right edge and the wrapper's right border/scrollbar. The table itself (`table-layout: auto`) sizes its columns to content correctly — there's no excess width inside the table. The dead space is entirely the wrapper's padding.

`fit-content` is working as intended (sizing to content), but "content" here is the table, and the padding is additive outside the content box. So the wrapper is always 32px wider than the table needs.

---

## 3. Why It Bleeds When "All"

The bleed is a **horizontal-width issue, independent of row count**. The "All" filter doesn't change column widths — it only adds more rows (taller table, more vertical scroll). The wrapper's horizontal footprint is identical regardless of filter.

Why it's "more visible" with All: more rows means the vertical scrollbar appears (via `overflow-y: auto`), and the scrollbar sits inside the 32px padding zone, making the dead space obvious. With fewer rows (no scrollbar), the padding is still there but less conspicuous.

The underlying issue is constant: the wrapper is 32px wider than its table content in all filter states.

---

## 4. Why It Overlaps the Right Card

The wrapper has `width: fit-content`, so it sizes to `table + 32px`. The wrapper sits inside `.profiles-main` which is `flex: 1; min-width: 0`. The flex container (`.profiles-content-layout`) has `gap: 16px` and the sidebar is `flex: 0 0 280px`.

When `table + 32px` exceeds the natural flex-1 allocation (viewport width − 280px sidebar − 16px gap), the wrapper overflows `.profiles-main`. Since `.profiles-main` has `min-width: 0`, the flex item itself shrinks, but `fit-content` on the wrapper means the wrapper won't shrink below its content — it overflows into the sidebar's space.

The `overflow: hidden` on the wrapper clips content vertically but the wrapper's own box still extends horizontally past `.profiles-main`'s allocated width.

---

## 5. Fix Options (not applied)

### Option A — Remove `padding-right: 32px` (minimal, recommended)

**Change:** `dashboard/index.html:2474` — delete `padding-right: 32px;`

This eliminates the dead space entirely. The wrapper snaps to the table's right edge. The `border-right: 2px solid var(--accent)` sits flush against the Score column. The `fit-content` width now equals exactly the table width.

If a small visual buffer is desired between the Score column and the right border, replace 32px with something much smaller (e.g. `padding-right: 4px` or `padding-right: 8px`).

### Option B — Cap the wrapper with `max-width: 100%`

**Change:** Add `max-width: 100%;` to `.profiles-table-wrapper`.

This prevents the wrapper from exceeding `.profiles-main`'s allocated width. The 32px padding would compress when space is tight, and the table would get a horizontal scrollbar if needed. Downside: the dead space remains on wider viewports where the table fits easily.

### Option C — Change `.profiles-main` to `overflow: hidden`

This clips the wrapper at `.profiles-main`'s boundary, preventing visual overlap into the sidebar. But it doesn't fix the dead space — it just hides it. And it may clip the wrapper's `border-right` and `box-shadow`.

### Recommendation

**Option A** — remove (or drastically reduce) `padding-right: 32px`. It's the sole cause of both problems (dead space + bleed). The padding was likely added for visual breathing room but 32px is excessive for a `fit-content` table with `border-right`. A 4–8px padding or none at all would be clean.

As a belt-and-suspenders measure, also add `max-width: 100%` to the wrapper (Option B) to prevent any future scenario where the table itself exceeds the flex allocation.
