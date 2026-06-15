# Track C Step 1 Patch — translateColorEs fixes

**Commit:** `2a8f963` — `server: adult generic ES color — tuxedo→blanco y negro, lowercase mapped colors (Track C step 1 patch)`
**Base:** `816f67d`
**Scope:** `server/src/server.ts` only — function still inert (0 external callers)

## Changes

### Fix 1 — Tuxedo
- Removed `tuxedo: 'esmoquin'` from `COLOR_DICT_ES`
- Added early-return special case: if any token is `tuxedo`, return `"blanco y negro"` (ignores all other tokens)

### Fix 2 — Lowercase mapped results
- Removed the `charAt(0).toUpperCase()` capitalization of mapped Spanish colors
- Mapped results now stay fully lowercase (correct for mid-sentence "con pelaje ...")
- English fallback strings preserve their original SM casing unchanged

## Diff

```diff
-  tortie: 'carey', tortoiseshell: 'carey', tuxedo: 'esmoquin',
+  tortie: 'carey', tortoiseshell: 'carey',

+  // Special-case: tuxedo → entire color is "blanco y negro"
+  if (tokens.includes('tuxedo')) {
+    return 'blanco y negro';
+  }

-  // Capitalize first letter
-  return result.charAt(0).toUpperCase() + result.slice(1);
+  return result;
```

## Re-rendered ES output (function still uncalled — manual trace)

| Animal | SM Color | translateColorEs | ES template snippet |
|--------|----------|-----------------|---------------------|
| Catzilla | Tuxedo: Black and White | `blanco y negro` | ...con pelaje blanco y negro y de tamaño mediano... ✅ |
| Luna | Brown and White | `marrón y blanco` | ...con pelaje marrón y blanco... ✅ |
| Abe | Black with white | `negro con blanco` | ...con pelaje negro con blanco... ✅ |
| Danica | Dilute Calico | `calicó diluido` | ...con pelaje calicó diluido... ✅ |
| Cardinal | Tabico | `Tabico` (fallback) | ...con pelaje Tabico... ✅ (original casing preserved) |

## EN output
Unchanged — EN templates use `${color}` (raw SM string), not `translateColorEs`.

## Verification
- Build: clean (`tsc` exit 0)
- `renderAdultGenericBios` appears 1 time in server.ts (definition only) — 0 external callers
- `translateColorEs` called only from within `renderAdultGenericBios`
- No other files modified
