# Preview: Results Counter Size Bump

**Date:** 2026-06-22 17:10 UTC  
**Commit:** `fc92f69`  
**File:** `matcher-preview/styles.css` (+3 -3)

---

## Before (styles.css:1071-1082)

```css
.species-tabs-wrapper .results-count {
  font-size: 0.85rem;
}

.species-tabs-wrapper .results-count span {
  font-weight: 700;
  font-size: 0.95rem;
}
```

## After

```css
.species-tabs-wrapper .results-count {
  font-size: 1rem;
}

.species-tabs-wrapper .results-count span {
  font-weight: 800;
  font-size: 1.2rem;
}
```

## Verification

- **Counter larger:** text 0.85→1rem, number span 0.95→1.2rem with 800 weight — number stands out ✅
- **Still right-justified, one line, vertically aligned with subtabs:** flex layout unchanged ✅
- **Still updates on species/filter change:** `updateResultsCount()` JS untouched ✅
- **Production:** `matcher.4lgshelterapp.duckdns.org` has `.results-count { font-size: 0.85rem }` — unchanged ✅
