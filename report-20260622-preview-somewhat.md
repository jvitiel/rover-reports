# Preview: "Somewhat" Good-With Wording

**Date:** 2026-06-22 16:58 UTC  
**Commit:** `83dc460`  
**File:** `matcher-preview/app.js` (+1 -1)

---

## Before (app.js:655)

```javascript
else if (v === 'somewhat') lines.push(`Sometimes good with ${label}`);
```

## After

```javascript
else if (v === 'somewhat') lines.push(`Somewhat good with ${label}`);
```

Single word change. `yes` → "Good with…", `no` → "Not good with…", `unknown` → suppressed — all unchanged.

## Verification

- **"Somewhat" renders:** `grep -c 'Somewhat good with'` → 1 ✅
- **No "Sometimes" remains:** `grep 'Sometimes' app.js` → empty ✅
- **yes/no/unknown unchanged:** code paths untouched ✅
- **Production:** `matcher.4lgshelterapp.duckdns.org/app.js` has 0 references to `buildOverlayAttrs` ✅
