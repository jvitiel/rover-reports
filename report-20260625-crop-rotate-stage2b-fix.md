# Crop Editor Stage 2b — initCropBox Race Fix

**Date:** 2026-06-25  
**Commit:** f5dff86  
**Scope:** 1 file (dashboard/index.html), 9 insertions, 4 deletions.

---

## Root Cause

`openCropEditor` set `img.src` BEFORE `img.onload`, so for cached images the `load` event could fire before the handler was registered. `initCropBox()` never ran → crop box stayed 0×0 → its `box-shadow: 0 0 0 9999px rgba(0,0,0,0.45)` flooded the entire editor body with a dark overlay, hiding the crop box, obscuring the footer (Cancel/Rotate/Save), and leaving the sideways image dim behind the overlay.

---

## Changes

### 1. #cropBox default-hidden (dashboard:5194)

**Before:**
```css
.crop-box {
  position: absolute; border: 2px solid #fff;
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.45); cursor: move;
  touch-action: none;
}
```

**After:**
```css
.crop-box {
  position: absolute; border: 2px solid #fff;
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.45); cursor: move;
  touch-action: none; display: none;
}
```

Prevents the 9999px shadow from flooding the editor when `initCropBox` hasn't run yet.

### 2. openCropEditor race fix (dashboard:15784–15798)

**Before:**
```js
function openCropEditor(mediaId, animalId, originalUrl, event) {
  // ...state setup...
  img.src = originalUrl;           // ← sets src first
  overlay.classList.add('open');
  img.onload = function() { initCropBox(); };  // ← handler AFTER src (race!)
}
```

**After:**
```js
function openCropEditor(mediaId, animalId, originalUrl, event) {
  // ...state setup...
  document.getElementById('cropBox').style.display = 'none';  // reset for re-open
  overlay.classList.add('open');     // visible first (layout ready for clientWidth)
  img.onload = function() { requestAnimationFrame(function() { initCropBox(); }); };  // handler BEFORE src
  img.src = originalUrl;
  if (img.complete && img.naturalWidth > 0) {  // same-URL re-open fallback
    requestAnimationFrame(function() { initCropBox(); });
  }
}
```

Three fixes:
1. **onload before src** — handler registered before the load event can fire
2. **requestAnimationFrame** — defers `initCropBox` to after layout, ensuring `clientWidth` > 0
3. **img.complete fallback** — handles same-URL re-open (setting src to the same value doesn't fire `load`)

### 3. initCropBox shows the box (dashboard:5853)

**After sizing:**
```js
box.style.display = 'block';
```

The crop box only becomes visible once it has real dimensions.

### 4. rotateCropImage onload order fix (dashboard:15831–15832)

**Before:**
```js
cropImg.src = canvas.toDataURL('image/jpeg', 0.92);
cropImg.onload = function() { initCropBox(); };
```

**After:**
```js
cropImg.onload = function() { requestAnimationFrame(function() { initCropBox(); }); };
cropImg.src = canvas.toDataURL('image/jpeg', 0.92);
```

Same race fix applied: handler before src, rAF wrapper.

---

## Unchanged

- `rotateCropImage` canvas rotation logic — untouched
- `saveCrop` + rotation passthrough — untouched
- `getCropCoords` — untouched
- `initCropBox` sizing logic — untouched (only added `display = 'block'` at end)
- Backend (crop-worker.py, server.ts) — untouched

---

## Verification

### Served file
- Dashboard loads: HTTP 200 ✅
- 3 `requestAnimationFrame` calls in served HTML ✅ (openCropEditor onload + complete-fallback + rotateCropImage)
- `display: none` on `.crop-box` CSS ✅
- `display = 'block'` in `initCropBox` ✅

### Backend regression
- Handsome (S2026571) manual-crop with rotation=90: success, 800×800 crop ✅
- Crop visually upright (confirmed via image inspection — cat's eyes level) ✅

### Browser UI (requires John's manual test)
Expected behavior after hard refresh / incognito:
1. Open any crop editor → crop box renders (sized, draggable), footer shows all 3 buttons, no dark overlay flood
2. Open Handsome → image sideways (expected), click ↻ Rotate → image upright, crop box re-fits
3. Draw crop on upright image → Save → upright crop saved, strip refreshes
4. Re-open same photo → crop box still renders (img.complete fallback)
5. Normal photo crop without rotation → works unchanged (rotation=0)

---

## No deviations

All changes in dashboard/index.html only. Explicit `git add dashboard/index.html`. No git add -A.

## Commit

```
f5dff86 crop editor: fix initCropBox race (onload before src + rAF + complete-fallback, default-hide cropBox until sized)
 dashboard/index.html | 9 insertions(+), 4 deletions(-)
```
