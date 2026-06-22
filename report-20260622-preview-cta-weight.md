# Preview: CTA Font Weight Reduction

**Date:** 2026-06-22 17:24 UTC  
**Commit:** `3fb6607`  
**File:** `matcher-preview/styles.css` (+1 -1)

---

## Before (styles.css:176)

```css
font-weight: 700;
```

## After

```css
font-weight: 500;
```

Context: `.hero-cta` rule at styles.css:170. Only `font-weight` changed; `font-family: var(--heading-font)`, `font-size: 1.8rem`, `color`, `background: #F5F1EA`, `padding`, `border-radius` all untouched.

## Verification

- **CTA text lighter:** visibly thinner at 500 vs previous 700 bold, still legible on the white pill ✅
- **Size, color, pill, position:** unchanged ✅
- **Title + language toggle:** unchanged ✅
- **Production:** `matcher.4lgshelterapp.duckdns.org` `.hero-cta` still `font-weight: 700` ✅
