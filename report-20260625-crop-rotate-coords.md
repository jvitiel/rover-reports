# Crop Editor Rotate — Coordinate Math Diagnosis

**Date:** 2026-06-25  
**Scope:** Read-only. No writes, no code changes.

---

## 1. Crop Box Coordinate System

### How the crop box is drawn (screen space)

The crop box is a `<div class="crop-box">` (dashboard:6523) positioned absolutely inside `<div class="crop-editor-img-wrap">` (dashboard:6521). The wrap is sized to match the rendered image dimensions:

**initCropBox — dashboard/index.html:15799–15814:**
```js
wrap.style.width = img.clientWidth + 'px';
wrap.style.height = img.clientHeight + 'px';
// Default: centered square covering 70% of the shorter dimension
const side = Math.round(Math.min(img.clientWidth, img.clientHeight) * 0.7);
const left = Math.round((img.clientWidth - side) / 2);
const top = Math.round((img.clientHeight - side) / 2);
box.style.left = left + 'px';
box.style.top = top + 'px';
box.style.width = side + 'px';
box.style.height = side + 'px';
```

The crop box position/size is in **displayed-image pixels** (the rendered `<img>` dimensions as seen on screen).

### How drag/resize works

**Drag/resize handlers — dashboard/index.html:15817–15901:**

Dragging: adds screen-space deltas to `box.style.left/top`, clamped to `img.clientWidth/clientHeight` via `clampBox()`:
```js
function clampBox(l, t, s) {
  const maxW = img.clientWidth;
  const maxH = img.clientHeight;
  s = Math.max(30, Math.min(s, maxW, maxH));
  l = Math.max(0, Math.min(l, maxW - s));
  t = Math.max(0, Math.min(t, maxH - s));
  return { l, t, s };
}
```

All operations stay in displayed-image pixel space. The box is always square (w === h enforced by using a single `s` value).

### How saveCrop converts displayed → natural pixels

**getCropCoords — dashboard/index.html:15903–15917:**
```js
function getCropCoords() {
  const img = document.getElementById('cropEditorImg');
  const scaleX = img.naturalWidth / img.clientWidth;
  const scaleY = img.naturalHeight / img.clientHeight;
  const bL = parseInt(box.style.left) || 0;
  const bT = parseInt(box.style.top) || 0;
  const bS = parseInt(box.style.width) || 100;
  return {
    x: Math.round(bL * scaleX),
    y: Math.round(bT * scaleY),
    w: Math.round(bS * scaleX),
    h: Math.round(bS * scaleY)
  };
}
```

**Coordinate space of {x, y, w, h} sent to the endpoint: natural-image pixels.**

`scaleX = naturalWidth / clientWidth` converts from displayed pixels to natural (original) pixels. This assumes the `<img>` element's `naturalWidth/Height` match what the worker will process.

---

## 2. Worker Crop Coordinate Frame

**crop-worker.py:54–72 — resolve_source_image:**
```python
img = resolve_source_image(file_url)
# Downloads image, then:
img = ImageOps.exif_transpose(img)  # Auto-orient based on EXIF
```

**crop-worker.py:168–187 — manual_square_crop:**
```python
def manual_square_crop(img, x, y, w, h):
    img_w, img_h = img.size
    x = max(0, min(x, img_w - 1))
    y = max(0, min(y, img_h - 1))
    w = max(1, min(w, img_w - x))
    h = max(1, min(h, img_h - y))
    cropped = img.crop((x, y, x + w, y + h))
    cropped = cropped.resize((CROP_SIZE, CROP_SIZE), Image.LANCZOS)
    return cropped, "manual", note
```

**Worker coordinate frame: pixels on the post-EXIF-transposed image.** The worker first corrects EXIF orientation (`exif_transpose`), then `x, y, w, h` index into that corrected image. This matches what the browser shows (browsers also auto-apply EXIF orientation when rendering `<img>`), so the `naturalWidth/Height` in the browser match the worker's post-transpose dimensions. The existing system works because both sides operate in the EXIF-corrected frame.

---

## 3. Adding Rotation — Display Side

### CSS rotation approach

The simplest display rotation: `img.style.transform = 'rotate(90deg)'` on `cropEditorImg`.

**Problem with CSS rotation:** CSS `transform: rotate()` rotates the visual rendering but does NOT change `clientWidth/clientHeight` or `naturalWidth/naturalHeight`. A 1200×800 image rotated 90° CSS still reports `clientWidth=1200, clientHeight=800` even though it visually appears 800×1200. The crop box overlay (which lives in the parent `cropImgWrap`) stays aligned to the pre-rotation bounds. This means:

- The crop box won't match the visual — it'll be positioned in unrotated space while the image is visually rotated
- `getCropCoords` will compute wrong scales since `naturalWidth/Height` are still the unrotated values
- The wrap dimensions won't match the visual

**CSS rotation is unsuitable** because the crop box overlay coordinates wouldn't correspond to the visual.

### Canvas rotation approach (recommended)

Instead of CSS rotation, **draw the rotated image onto a canvas** (or create a new image via an offscreen canvas) and set `cropEditorImg.src` to the canvas data URL:

```js
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
// For 90° CW: swap width/height
canvas.width = img.naturalHeight;
canvas.height = img.naturalWidth;
ctx.translate(canvas.width, 0);
ctx.rotate(Math.PI / 2);
ctx.drawImage(img, 0, 0);
cropEditorImg.src = canvas.toDataURL('image/jpeg', 0.9);
```

After this, the `<img>` has `naturalWidth = originalHeight, naturalHeight = originalWidth` — the crop box, `initCropBox`, `clampBox`, and `getCropCoords` all work on the rotated dimensions automatically. No coordinate math issues.

**BUT** there's a natural-pixel accuracy issue: `getCropCoords` uses `img.naturalWidth/naturalHeight` to scale from displayed → natural. If the img is a data-URL canvas rendering, `naturalWidth/Height` are the canvas dimensions (rotated). This is correct for coordinates in the rotated frame — but the worker must ALSO rotate the source by the same amount before cropping, or the coordinates won't match.

---

## 4. The Coordinate Transform — Two Options

### Given:
- Original source image: W₀ × H₀ (post-EXIF-transpose, pre-user-rotation)
- User rotation R (0°, 90° CW, 180°, 270° CW)
- After rotation: displayed image is W' × H' where:
  - R=0°: W'=W₀, H'=H₀
  - R=90°: W'=H₀, H'=W₀
  - R=180°: W'=W₀, H'=H₀
  - R=270°: W'=H₀, H'=W₀
- User draws crop box (x', y', w', h') in the rotated frame (natural pixels of the rotated image)

### Option X: Worker rotates then crops (RECOMMENDED)

Pass rotation R to the worker. Worker does:
1. `img = resolve_source_image(file_url)` → EXIF-transposed, W₀ × H₀
2. `img = img.rotate(-R, expand=True)` → rotated, W' × H' (PIL rotate is CCW, so -90 for 90° CW)
3. `manual_square_crop(img, x', y', w', h')` → crops in the rotated frame

**Coordinates map 1:1.** The display shows the rotated image (via canvas). The user draws the box on it. `getCropCoords` produces (x', y', w', h') in the rotated natural-pixel frame. The worker rotates by R then crops — same frame. No JS coordinate transform needed.

### Option Y: Transform coords in JS, worker stays unrotated

Convert (x', y', w', h') drawn in rotated frame to (x, y, w, h) in original frame:

For 90° CW (W'=H₀, H'=W₀):
```
x = y'
y = W₀ - (x' + w')
w = h'
h = w'
```

For 180°:
```
x = W₀ - (x' + w')
y = H₀ - (y' + h')
w = w'
h = h'
```

For 270° CW:
```
x = H₀ - (y' + h')
y = x'
w = h'
h = w'
```

**Doable but error-prone**, and the worker still operates on the unrotated image — the crop output reflects the original orientation, not the user's intended upright view. The output crop would be sideways unless the worker also rotates the cropped result.

### Recommendation: Option X

Option X is cleanest:
- No JS coordinate math (the drawn box maps directly to the worker's frame)
- The worker rotates-then-crops, so the output crop is upright
- Only additive change: a `--rotate` parameter to the worker + one `img.rotate()` call
- Default `--rotate 0` = current behavior (no rotation)

---

## 5. Passing Rotation Through

### Endpoint — server.ts:3940–4029 (POST /api/photos/:mediaId/manual-crop)

Currently accepts `{ x, y, w, h }`. Add `rotation` (0/90/180/270, default 0):

```ts
const { x, y, w, h, rotation } = req.body;
// ... existing validation ...
const rot = rotation || 0;
if (![0, 90, 180, 270].includes(rot)) {
  res.status(400).json({ success: false, error: 'rotation must be 0, 90, 180, or 270' });
  return;
}
```

The `cmd` construction (server.ts:3987):
```ts
const cmd = `${CROP_PYTHON} ${CROP_WORKER} --ids ${mediaId} --manual-box ${x},${y},${w},${h}`;
```

Add `--rotate ${rot}`:
```ts
const cmd = `${CROP_PYTHON} ${CROP_WORKER} --ids ${mediaId} --manual-box ${x},${y},${w},${h} --rotate ${rot}`;
```

### Worker — crop-worker.py

**Arg parsing — crop-worker.py:365–385:**

Add `--rotate` argument:
```python
parser.add_argument("--rotate", type=int, default=0, choices=[0, 90, 180, 270],
                    help="Rotate source image CW by N degrees before cropping")
```

Pass to `process_one`:
```python
process_one(row, dry_run=args.dry_run, manual_box=manual_box, rotate=args.rotate)
```

**process_one — crop-worker.py:189:**

After `img = resolve_source_image(file_url)` (which does EXIF transpose), add:
```python
if rotate:
    # PIL Image.rotate is CCW; -90 for 90° CW
    img = img.rotate(-rotate, expand=True)
```

Then `manual_square_crop(img, x, y, w, h)` crops in the rotated frame. Default `rotate=0` = no change = current behavior.

---

## 6. Verification: Coords Match 1:1 Under Rotation

### Flow with rotation R=90° CW:

1. **Browser:** `openCropEditor` loads the original image (W₀×H₀ after EXIF). User clicks rotate. Client-side canvas renders a 90° CW rotated image (H₀×W₀). `cropEditorImg.src = canvasDataURL`. Now `naturalWidth=H₀, naturalHeight=W₀`.

2. **initCropBox:** Sizes the wrap to `img.clientWidth × img.clientHeight` (the rotated displayed dims). Crop box fits inside.

3. **getCropCoords:** `scaleX = naturalWidth(=H₀) / clientWidth(=displayedRotatedW)`. Maps displayed box → natural pixels in the rotated frame. Returns `(x', y', w', h')` in the H₀×W₀ coordinate space.

4. **saveCrop:** Sends `{ x: x', y: y', w: w', h: h', rotation: 90 }`.

5. **Worker:** Downloads original (W₀×H₀ after EXIF). Rotates 90° CW → H₀×W₀. Crops `(x', y', w', h')` in the H₀×W₀ frame. **Exact same frame as step 3.** ✅

6. **Output crop:** Is upright (rotated then cropped) and matches what the user drew. ✅

### For 180° and 270°:
Same logic. The canvas produces the rotated dimensions. `getCropCoords` scales to the rotated natural pixels. The worker rotates by the same angle then crops. 1:1 match in all cases.

### Gotcha: none for Option X

The only requirement is that the canvas rotation and the worker rotation are the **same operation** (both 90° CW). Since the canvas uses `ctx.rotate(Math.PI/2)` (90° CW) and the worker uses `img.rotate(-90, expand=True)` (PIL rotate is CCW, so -90 = 90° CW), they match.

---

## 7. Editor State and Rotate Button

### _cropState — dashboard/index.html:15779:
```js
let _cropState = { mediaId: null, animalId: null, dragging: false, resizing: false, handle: null };
```

Add `rotation: 0` and `originalImgSrc: null`:
```js
let _cropState = { mediaId: null, animalId: null, dragging: false, resizing: false, handle: null, rotation: 0, originalImgSrc: null };
```

### openCropEditor — dashboard/index.html:15781:
Store the original (unrotated) image src and reset rotation:
```js
_cropState.rotation = 0;
_cropState.originalImgSrc = originalUrl;
img.src = originalUrl;
```

### Rotate button handler:
```js
function rotateCropImage() {
  _cropState.rotation = (_cropState.rotation + 90) % 360;
  const img = document.getElementById('cropEditorImg');
  // Use an offscreen Image to get the unrotated natural dims
  const orig = new Image();
  orig.crossOrigin = 'anonymous';  // for SM URLs
  orig.onload = function() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const r = _cropState.rotation;
    if (r === 90) {
      canvas.width = orig.naturalHeight; canvas.height = orig.naturalWidth;
      ctx.translate(canvas.width, 0); ctx.rotate(Math.PI / 2);
    } else if (r === 180) {
      canvas.width = orig.naturalWidth; canvas.height = orig.naturalHeight;
      ctx.translate(canvas.width, canvas.height); ctx.rotate(Math.PI);
    } else if (r === 270) {
      canvas.width = orig.naturalHeight; canvas.height = orig.naturalWidth;
      ctx.translate(0, canvas.height); ctx.rotate(-Math.PI / 2);
    } else { // 0
      canvas.width = orig.naturalWidth; canvas.height = orig.naturalHeight;
    }
    ctx.drawImage(orig, 0, 0);
    img.src = canvas.toDataURL('image/jpeg', 0.92);
    img.onload = function() { initCropBox(); };
  };
  orig.src = _cropState.originalImgSrc;
}
```

### saveCrop modification:
In `saveCrop` (dashboard:15919), add rotation to the POST body:
```js
const body = { x: coords.x, y: coords.y, w: side, h: side, rotation: _cropState.rotation || 0 };
```

### initCropBox:
No change needed — it already reads `img.clientWidth/Height` which will be the rotated dimensions after the canvas swap.

### getCropCoords:
No change needed — it reads `img.naturalWidth/Height` which will be the canvas dimensions (rotated frame). The scaling works correctly because both the display and natural sizes are in the rotated frame.

---

## 8. Summary / Sizing

| Piece | Size | Files |
|-------|------|-------|
| Worker `--rotate` param | **Small** (5 lines) | crop-worker.py |
| Endpoint passes `rotation` | **Small** (5 lines) | server.ts |
| Rotate button + canvas handler | **Medium** (30 lines) | dashboard/index.html |
| `_cropState.rotation` + saveCrop mod | **Small** (5 lines) | dashboard/index.html |
| CSS for rotate button | **Trivial** (3 lines) | dashboard/index.html |
| **Total** | **~50 lines across 3 files** | |

No DB change. No new columns. The rotation is transient (applied during crop, not stored). The crop output is upright because the worker rotates-then-crops. `crop_url` stores the upright crop as usual. `crop_locked=1` set as usual.

### CORS Gotcha
SM image URLs (`https://service.sheltermanager.com/...`) may not have CORS headers, which would block `canvas.toDataURL()` (tainted canvas). If so, the canvas approach needs a proxy: load the SM image through the local server (e.g., `/api/proxy-image?url=...`) to avoid CORS. This is the one potential blocker — verify SM CORS headers before building.

Alternative if CORS blocks: load the image as a blob via `fetch()` from the local server (proxy the SM URL through Express), then create an object URL for the canvas source. This avoids the cross-origin taint.
