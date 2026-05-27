# Legal Pages — Spacer Blocks + Footer Link Color Fix

**Date:** 2026-05-27 10:24 ET (14:24 UTC)

## Page IDs

| Page | ID |
|------|----|
| Privacy Policy | 383 |
| Terms of Service | 384 |
| Accessibility Statement | 385 |

## Fix A: Spacer Blocks (top + bottom)

Added identical spacer blocks to the top and bottom of each page's post_content:

```html
<!-- wp:spacer {"height":"80px"} -->
<div style="height:80px" aria-hidden="true" class="wp-block-spacer"></div>
<!-- /wp:spacer -->
```

### Before (page 383 example)
```
Line 1: <!-- wp:paragraph -->
...
Last block: <!-- /wp:paragraph -->
```

### After (page 383 example)
```
Line 1: <!-- wp:spacer {"height":"80px"} -->
Line 2: <div style="height:80px" aria-hidden="true" class="wp-block-spacer"></div>
Line 3: <!-- /wp:spacer -->
Line 4: (blank)
Line 5: <!-- wp:paragraph -->
...
Line 196: <!-- /wp:paragraph -->
Line 197: (blank)
Line 198: <!-- wp:spacer {"height":"80px"} -->
Line 199: <div style="height:80px" aria-hidden="true" class="wp-block-spacer"></div>
Line 200: <!-- /wp:spacer -->
```

Same pattern applied to pages 384 and 385.

No existing spacer convention found on other published pages — used 80px as specified.

### Spacer verification

| Page | Slug | Spacer divs on live page |
|------|------|--------------------------|
| 383 | privacy-policy | 2 [VERIFIED] |
| 384 | terms-of-service | 2 [VERIFIED] |
| 385 | accessibility | 2 [VERIFIED] |

post_content verified via `wp post get <ID> --field=post_content` — first line is `<!-- wp:spacer {"height":"80px"} -->` and second-to-last line is `<!-- /wp:spacer -->` for all three pages [VERIFIED].

## Fix B: Footer Legal Link Color

### Color identification
- Copyright text ("© 2026 Four Legs Good, Inc. All rights reserved.") inherits color from `.site-footer { color: rgba(255, 255, 255, 0.5); }` (line 306 of style.css) [VERIFIED]
- Legal links were previously colored via `.footer-bottom a { color: var(--color-brand-light); }` (line 322) with `.footer-legal a { opacity: 0.7; }` (line 325) — this made them the brand accent color at 70% opacity, not matching the muted copyright text

### CSS appended (end of style.css, outside all @media blocks)

```css
/* Match legal link color to copyright text color */
.footer-legal a {
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
    opacity: 1;
}
.footer-legal a:hover {
    color: rgba(255, 255, 255, 0.7);
    opacity: 1;
}
```

- Base color: `rgba(255, 255, 255, 0.5)` — exact match to copyright text
- Hover color: `rgba(255, 255, 255, 0.7)` — slightly brighter on hover, no underline (matches footer column link hover pattern of color-change rather than underline)
- `opacity: 1` overrides the earlier `.footer-legal a { opacity: 0.7 }` rule so the rgba value controls the full appearance

### style.css timestamps and line counts

| | Timestamp | Lines |
|---|---|---|
| Before | 2026-05-27 14:14:27 UTC | 1835 |
| After | 2026-05-27 14:24:31 UTC | 1846 |

### CSS verification
Live style.css (`?ver=<filemtime>`) grep for `.footer-legal a` returns both the original rules (lines 325-326, now cascade-overridden) and the new appended rules [VERIFIED].

## Scope confirmation
- Only pages 383, 384, 385 modified (spacer blocks added to post_content)
- Only style.css modified (11 lines appended at end)
- No edits to footer.php or any other theme file
- No edits to any existing CSS rule
- No edits to draft ID 3 or any other page
- No cache purge needed — changes reflected immediately

## Note for John
Hard-refresh the three legal pages and the homepage footer to visually confirm:
1. Top/bottom spacing looks right on all three pages (80px spacers)
2. Legal link color now matches the muted copyright text color
If spacing needs tuning, the 80px value can be adjusted in a quick follow-up.
