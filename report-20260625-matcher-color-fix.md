# Matcher Color i18n Fix — Apply Log

Executed 2026-06-26 02:31 UTC.

---

## Change

**File:** `/home/shelter/shelter-apps/matcher-preview/app.js` (served live at `matcher.4lgshelterapp.duckdns.org`)

**One-line diff at line 753 (`buildOverlayAttrs`):**
```diff
-  if (color && color.toLowerCase() !== 'unknown') lines.push(color);
+  if (color && color.toLowerCase() !== 'unknown') lines.push(translateColorEs(color));
```

**Preconditions verified before edit:**
- Live `/matcher` mount points at `matcher-preview/` directory ✅
- `COLOR_WORD_MAP_ES` defined at line 653 (above call site) ✅
- `translateColorEs` defined at line 667 (above call site) ✅
- Same function already used at line 1098 for detail popup ✅

---

## Raw vs Bundled

**Raw static file.** No `package.json`, no webpack/vite/rollup/tsconfig in `matcher-preview/`. Express serves `app.js` directly via `express.static()`. No build step needed — file edit is live immediately.

---

## Verification

### V1 — New line present at public URL:
```
$ curl -s "https://matcher.4lgshelterapp.duckdns.org/app.js" | grep -n "lines.push(translateColorEs(color))"
753:  if (color && color.toLowerCase() !== 'unknown') lines.push(translateColorEs(color));
```
**✅ PASS** — Localized color push confirmed live.

### V2 — Old raw push removed:
```
$ curl -s "https://matcher.4lgshelterapp.duckdns.org/app.js" | grep -c "lines.push(color)"
0
```
**✅ PASS** — Zero instances of the old raw `lines.push(color)` remain.

---

## Commit

```
5d08f48 matcher overlay: localize color via translateColorEs (match popup behavior)
```

Narrow commit: only `matcher-preview/app.js` staged.
