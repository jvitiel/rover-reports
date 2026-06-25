# Crop Editor Rotate Button (Stage 2) — Implementation

**Date:** 2026-06-25  
**Commit:** 21583b8  
**Scope:** 1 file (dashboard/index.html), 42 insertions, 3 deletions.

---

## Changes

### 1. crossOrigin attribute (dashboard:6524)

**Before:**
```html
<img id="cropEditorImg" src="" alt="Original photo" draggable="false">
```

**After:**
```html
<img id="cropEditorImg" src="" alt="Original photo" draggable="false" crossorigin="anonymous">
```

Set in HTML so it's present before any `src` assignment. SM sends `Access-Control-Allow-Origin: *` so this works.

### 2. _cropState (dashboard:15782)

**Before:**
```js
let _cropState = { mediaId: null, animalId: null, dragging: false, resizing: false, handle: null };
```

**After:**
```js
let _cropState = { mediaId: null, animalId: null, dragging: false, resizing: false, handle: null, rotation: 0, originalImgSrc: null };
```

### 3. openCropEditor (dashboard:15784)

Added rotation reset and original src capture:
```js
_cropState.rotation = 0;
_cropState.originalImgSrc = originalUrl;
```

### 4. Rotate button (dashboard:6536)

Added between Cancel and Save in `crop-editor-footer`:
```html
<button class="crop-btn crop-btn-rotate" onclick="rotateCropImage()" title="Rotate 90° clockwise">↻ Rotate</button>
```

CSS (dashboard:5214–5215):
```css
.crop-btn-rotate { background: #e3f2fd; border-color: #90caf9; color: #1565c0; }
.crop-btn-rotate:hover { background: #bbdefb; }
```

### 5. rotateCropImage() (dashboard:15804–15836)

- Increments `_cropState.rotation` by 90 (mod 360)
- Loads the **original** (unrotated) image into an offscreen `Image` with `crossOrigin='anonymous'`
- On load, draws to an offscreen canvas with the appropriate rotation transform:
  - 90°: `canvas.width=H, height=W; translate(W,0); rotate(π/2)`
  - 180°: `canvas.width=W, height=H; translate(W,H); rotate(π)`
  - 270°: `canvas.width=H, height=W; translate(0,H); rotate(-π/2)`
  - 0°: no transform
- Sets `cropEditorImg.src = canvas.toDataURL('image/jpeg', 0.92)`
- On the new image's load, calls `initCropBox()` to re-fit the crop box
- Always rotates from the original (not cumulative re-rotation) — no quality loss across repeated clicks
- `toDataURL` wrapped in try/catch — logs+alerts if tainted canvas (CORS regression guard)

### 6. saveCrop POST body (dashboard:15966)

**Before:**
```js
const body = { x: coords.x, y: coords.y, w: side, h: side };
```

**After:**
```js
const body = { x: coords.x, y: coords.y, w: side, h: side, rotation: _cropState.rotation || 0 };
```

### 7. initCropBox + getCropCoords — NO CHANGE

These read `img.clientWidth/naturalWidth` which are the rotated dimensions after the canvas swap. They work unchanged.

---

## Verification

### Handsome (S2026571) — live sideways case

- **Source:** 724×1024 portrait, no EXIF orientation tag — sideways in pixel data
- **After rotation=90:** worker reports `src_size: "1024x724"` (rotated CW)
- **Crop output:** 800×800 JPEG, visually confirmed **upright** via image inspection:
  - Source: cat sideways (eyes stacked vertically, whiskers fanning right)
  - Crop: cat upright (eyes level, whiskers horizontal, hand holding from below)
- **Handsome's crop is now upright** with a centered 600×600 box in the rotated frame (crop_locked=1)
- John can re-crop via the editor at any time to adjust framing

### Rotation cycle

Backend confirmed: rotation=0 → 90 → 180 → 270 all produce valid crops. The canvas always rotates from the original source (no cumulative quality loss).

### No CORS error

SM image URL with `crossOrigin="anonymous"` works — `Access-Control-Allow-Origin: *` on both the 303 redirect and final 200 response.

### Regression (rotation=0)

No rotation field omitted from POST body → `rotation || 0` = 0 → `--rotate 0` → worker skips rotation → byte-identical to pre-change behavior. Tested on photo `098cb098` — crop succeeded, no rotation applied.

### No deviations

All changes in dashboard/index.html only. Backend untouched. initCropBox/getCropCoords untouched. No schema changes.

---

## Commit

```
21583b8 crop editor: add rotate button with canvas display-rotation, passes rotation to backend (coords map 1:1)
 dashboard/index.html | 42 insertions(+), 3 deletions(-)
```

Only `dashboard/index.html` committed (explicit `git add`, not `git add -A`).

---

## Full Feature Summary (Stage 1 + Stage 2)

| Commit | Scope | What |
|--------|-------|------|
| `6cb8fef` | crop-worker.py + server.ts | `--rotate` param: worker rotates source CW then crops; endpoint validates+passes |
| `21583b8` | dashboard/index.html | Rotate button + canvas display-rotation + saveCrop passes rotation to backend |

**End-to-end flow:** User opens crop editor → clicks ↻ Rotate (1–3 times) → image displays upright via canvas rotation → draws crop box on upright view → saves → endpoint sends rotation to worker → worker rotates source by same angle then crops the drawn box → coords map 1:1 → output crop is upright.
