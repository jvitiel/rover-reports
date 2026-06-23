# Searcher Metrics Card: Language Labels

**Date:** 2026-06-23 02:48 UTC  
**Commit:** `101e7d3`  
**File:** `dashboard/index.html` (+2 -2)

---

## Located

**dashboard/index.html:15553-15554 (renderSearcherStats):**
```javascript
rowPct('EN', s.langEn),
rowPct('ES', s.langEs),
```

Label and data key are **separate**: `'EN'`/`'ES'` are display strings passed to `rowPct(label, n)` which renders `<span class="stat-label">${label}</span>`. Data keys are `s.langEn`/`s.langEs` (properties on the stats object). Changing the label does not affect the data lookup.

## Before/After

| Before | After |
|--------|-------|
| `rowPct('EN', s.langEn)` | `rowPct('English', s.langEn)` |
| `rowPct('ES', s.langEs)` | `rowPct('Spanish', s.langEs)` |

## Verification

- Rows now read "English" and "Spanish" ✅
- Counts still populate (data keys `s.langEn`/`s.langEs` unchanged) ✅
- All other card rows unchanged ✅
