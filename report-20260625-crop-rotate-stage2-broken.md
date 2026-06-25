# Crop Editor Stage 2 Broken — Diagnosis

**Date:** 2026-06-25  
**Scope:** Read-only. No writes, no code changes.

---

## Symptoms

1. No rotate button visible
2. Crop box missing (doesn't render)
3. Editor image is sideways (not rotated)
4. Slot-1 thumbnail IS upright (backend crop works fine)

---

## 1. Edit Verification — All Edits Landed Correctly

### a. cropEditorImg (dashboard:6524)
```html
<img id="cropEditorImg" src="" alt="Original photo" draggable="false" crossorigin="anonymous">
```
✅ `crossOrigin="anonymous"` present. Valid markup.

### b. Rotate button in footer (dashboard:6536)
```html
<button class="crop-btn crop-btn-rotate" onclick="rotateCropImage()" title="Rotate 90° clockwise">↻ Rotate</button>
```
✅ Inside `crop-btn-group`, between Cancel and Save. CSS at lines 5214–5215.

### c. _cropState (dashboard:15782)
```js
let _cropState = { mediaId: null, animalId: null, dragging: false, resizing: false, handle: null, rotation: 0, originalImgSrc: null };
```
✅ Has `rotation: 0` and `originalImgSrc: null`.

### d. openCropEditor (dashboard:15784–15795)
```js
function openCropEditor(mediaId, animalId, originalUrl, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  _cropState.mediaId = mediaId;
  _cropState.animalId = animalId;
  _cropState.rotation = 0;
  _cropState.originalImgSrc = originalUrl;
  const overlay = document.getElementById('cropEditor');
  const img = document.getElementById('cropEditorImg');
  img.src = originalUrl;          // ← LINE A: sets src
  overlay.classList.add('open');   // ← LINE B: makes modal visible
  img.onload = function() { initCropBox(); };  // ← LINE C: sets handler
}
```
✅ Sets rotation/originalImgSrc. **BUT note the order: src (A) before onload handler (C).**

### e. rotateCropImage (dashboard:15804–15836)
✅ Syntactically valid. Properly bounded function. Canvas rotation logic correct.

### f. saveCrop rotation passthrough (dashboard:15966)
```js
const body = { x: coords.x, y: coords.y, w: side, h: side, rotation: _cropState.rotation || 0 };
```
✅ Passes rotation.

### Served file verification
```
curl: "rotateCropImage" → 2 hits ✅
curl: "crop-btn-rotate" → 3 hits ✅  
curl: "crossorigin" → 1 hit ✅
curl: "originalImgSrc" → 3 hits ✅
Last-Modified: Thu, 25 Jun 2026 00:45:01 GMT (matches file mtime) ✅
ETag file size: 0x97b48 = 621384 = actual file size ✅
Cache-Control: public, max-age=0 (revalidation required) ✅
```

---

## 2. JS Syntax Check — Clean

Extracted the crop-editor script block (lines 15421–15993) and ran `node --check`:
```
$ node --check /tmp/crop-script.js
(no output = success)
```
No syntax errors. All function boundaries (closeCropEditor → rotateCropImage → initCropBox → getCropCoords → saveCrop) are properly scoped. No unclosed braces, no function-inside-function errors.

---

## 3. Why the Crop Box Doesn't Render

### The img.onload race condition

In `openCropEditor` (dashboard:15784), the order is:

```js
img.src = originalUrl;          // LINE A: sets source
overlay.classList.add('open');   // LINE B: makes modal visible
img.onload = function() { initCropBox(); };  // LINE C: sets handler
```

**The `onload` handler is set AFTER `img.src`.** If the image loads before line C executes (synchronous load from cache, or very fast network), the `load` event fires before the handler is registered, and `initCropBox()` never runs.

**This was the same order in the ORIGINAL code** (pre-Stage-2). So this is a **pre-existing race condition** that may have been masked by timing. The `crossOrigin="anonymous"` attribute (new in Stage 2) changes caching behavior:

- **Without crossOrigin:** The browser can reuse the same cached response from the strip thumbnails (same URL, no CORS). The image may load instantly from cache, firing `load` synchronously — but in some browsers, even cached loads fire `onload` asynchronously (next microtask), so the handler gets set in time.
- **With crossOrigin="anonymous":** The browser cannot reuse the non-CORS cached response (different cache key). It makes a new CORS request to SM. This is async, so the handler SHOULD be set before `onload` fires. In theory this HELPS the timing.

**However**, there's a subtlety: if the same `img` element previously loaded the same URL (from a prior crop editor open), setting `img.src` to the same value does NOT trigger a new `load` event. So `initCropBox()` never runs on a re-open of the same image.

### If initCropBox runs with clientWidth = 0

If `initCropBox` runs before the browser has laid out the newly-visible image (overlay just became visible), `img.clientWidth` = 0. This produces:
- `wrap.style.width = '0px'` → wrap collapses
- `side = Math.round(Math.min(0, 0) * 0.7)` = 0
- `box.style.width = '0px'; box.style.height = '0px'` → crop box invisible

---

## 4. Sideways Image — Expected

The editor opens showing the **original unrotated source**. Handsome's source (724×1024) is sideways in its pixel data (no EXIF orientation tag). The sideways display is **expected behavior** — the rotate button is supposed to fix it. The sideways image is NOT a separate bug; it's just that the rotate button isn't available (symptom #1).

---

## 5. crossOrigin Cache Gotcha

When `crossOrigin="anonymous"` is added to an `<img>` element, the browser treats CORS and non-CORS requests as **different cache entries** (cache partitioning). If the SM image was previously loaded by a strip thumbnail `<img>` (without crossOrigin), that cached response can't be reused by the crop editor's `<img crossorigin="anonymous">`. The browser makes a fresh CORS request.

This should NOT prevent loading — SM responds with `Access-Control-Allow-Origin: *` on both the 303 redirect and the 200 image (verified via curl with Origin header). The image should load successfully, and `img.onload` should fire.

The `crossOrigin` attribute does NOT cause a load failure. The image CAN be displayed and CAN be drawn to canvas. This is not the root cause.

---

## 6. Root Cause and Fix Direction

### Most Likely: Browser Cache of Old HTML

The served HTML is verified correct (curl shows all edits present, ETag matches current file, max-age=0). But John's browser may have a cached copy of the pre-Stage-2 HTML. With `max-age=0`, the browser SHOULD revalidate, but a stale cache (e.g., back/forward cache, or a pinned tab) could serve old HTML without the rotate button or crossOrigin attribute.

**Test:** Hard-refresh (Ctrl+Shift+R) or open in incognito. If the rotate button appears, it was browser cache.

### Secondary: img.onload Race Condition (Pre-Existing)

If hard refresh doesn't fix it, the crop box issue is the `img.onload` race condition:

**Fix (for Stage 2b):**
```js
// In openCropEditor — set handler BEFORE src:
const img = document.getElementById('cropEditorImg');
img.onload = function() { initCropBox(); };  // FIRST
img.src = originalUrl;                        // THEN
overlay.classList.add('open');
```

Plus a fallback for same-URL re-opens:
```js
// After setting src, if image is already complete, init immediately
if (img.complete && img.naturalWidth > 0) {
  setTimeout(initCropBox, 0);  // defer to ensure overlay is visible
}
```

### Tertiary: Layout Timing

If `initCropBox` runs before the browser has laid out the visible overlay, `img.clientWidth` = 0 and the crop box collapses. Fix: wrap `initCropBox()` in `requestAnimationFrame()` to ensure layout is complete:

```js
img.onload = function() {
  requestAnimationFrame(function() { initCropBox(); });
};
```

### Recommended Fix (addresses all three):
```js
function openCropEditor(mediaId, animalId, originalUrl, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  _cropState.mediaId = mediaId;
  _cropState.animalId = animalId;
  _cropState.rotation = 0;
  _cropState.originalImgSrc = originalUrl;
  const overlay = document.getElementById('cropEditor');
  const img = document.getElementById('cropEditorImg');
  // Set handler BEFORE src to avoid race condition
  img.onload = function() {
    requestAnimationFrame(function() { initCropBox(); });
  };
  overlay.classList.add('open');  // Make visible BEFORE src for layout
  img.src = originalUrl;
  // Fallback: if image already loaded (same URL re-open), init after layout
  if (img.complete && img.naturalWidth > 0) {
    requestAnimationFrame(function() { initCropBox(); });
  }
}
```

This fixes:
1. **Race condition:** `onload` handler set before `src`
2. **Same-URL re-open:** `img.complete` check as fallback
3. **Layout timing:** `requestAnimationFrame` ensures overlay is laid out before reading `clientWidth`
