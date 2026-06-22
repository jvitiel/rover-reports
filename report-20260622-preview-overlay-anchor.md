# Preview: Hover Overlay Top-Anchor

**Date:** 2026-06-22 16:30 UTC  
**Commit:** `d06f8e8`  
**File:** `matcher-preview/styles.css` (+1 -1)

---

## Before (styles.css:530)

```css
.animal-card-overlay {
  /* ... */
  justify-content: flex-end;
  padding: 16px;
  /* ... */
}
```

## After

```css
.animal-card-overlay {
  /* ... */
  justify-content: flex-start;
  padding: 16px;
  /* ... */
}
```

Single property change. Gradient, colors, opacity transition, hairline-under-flags, and `@media (hover: none)` touch fallback all untouched. The touch fallback already bottom-anchors its name strip via the gradient alone (no flex override) — no conflict.

## Verification

- **Long-attribute card** (e.g. Amari — 8 attr lines) and **short-attribute card** (e.g. Aiden — 3 attr lines): name sits at the same top-left position on both. Short lists leave blank space at the bottom instead of shifting the name.
- Grid, cover, flags, suppression, popup all intact.
- Production matcher: 0 references to `animal-card-overlay` in `matcher-web/styles.css` — untouched.
