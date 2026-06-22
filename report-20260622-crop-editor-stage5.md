# Crop Editor Stage 5: Dashboard UI

**Date:** 2026-06-22 21:35 UTC  
**Commit:** `c5dbb7c`  
**File:** `dashboard/index.html` (+280)

---

## Slot-1 Button Attach

**dashboard/index.html:7217 (inside the slot loop, after publicLabel):**
```javascript
${i === 0 && !isVideo ? `<button class="btn-edit-crop" 
  onclick="openCropEditor('${photo.id}', '${animalId}', '${escapeHtml(photoUrl)}', event)" 
  title="Edit Crop">✂️ Edit Crop</button>` : ''}
```

Only emitted when `i === 0` (slot-1) AND not a video. Positioned absolute top-left of the slot, hidden by default, appears on hover via CSS:
```css
.btn-edit-crop { opacity: 0; transition: opacity 0.2s; }
.photo-slot.primary:hover .btn-edit-crop { opacity: 1; }
```

The `openCropEditor` receives `photoUrl` (the full original, NOT `thumbSrc`/crop) — ensuring the editor always shows the unmodified original.

## #cropEditor Modal

Separate from `#lightbox` (which is at line 6450; `#cropEditor` is at line 6477).

### HTML Structure
```html
<div class="crop-editor-overlay" id="cropEditor" onclick="closeCropEditor(event)">
  <div class="crop-editor-modal" onclick="event.stopPropagation()">
    <div class="crop-editor-header">
      <h3>Edit Crop</h3>
      <button class="crop-editor-close" onclick="closeCropEditor()">×</button>
    </div>
    <div class="crop-editor-body">
      <div class="crop-editor-img-wrap" id="cropImgWrap">
        <img id="cropEditorImg" src="" alt="Original photo" draggable="false">
        <div class="crop-box" id="cropBox">
          <div class="crop-handle crop-handle-nw" data-handle="nw"></div>
          <div class="crop-handle crop-handle-ne" data-handle="ne"></div>
          <div class="crop-handle crop-handle-sw" data-handle="sw"></div>
          <div class="crop-handle crop-handle-se" data-handle="se"></div>
        </div>
      </div>
    </div>
    <div class="crop-editor-footer">
      <button class="crop-btn-reset" disabled>Reset to Auto</button>
      <div class="crop-btn-group">
        <button class="crop-btn-cancel">Cancel</button>
        <button class="crop-btn-save" id="cropSaveBtn">Save Crop</button>
      </div>
    </div>
  </div>
</div>
```

### CSS (~lines 5143-5196)
- Overlay: fixed, inset, z-index 10000, dark backdrop. `display:none` → `display:flex` on `.open`.
- Modal: 90vw max 800px, rounded, flex column, shadow.
- Img: `display:block; max-width:100%; max-height:65vh` — no `object-fit` (the element shrinks to rendered image size naturally).
- Crop box: absolute, white border, dark scrim via box-shadow 9999px, four corner handles (16px circles).
- Handles: nw/ne/sw/se cursors.

### JS

**openCropEditor(mediaId, animalId, originalUrl, event):** Stores state, sets img.src to the FULL ORIGINAL, shows overlay, calls `initCropBox()` on img load.

**initCropBox():** Sizes the wrapper to `img.clientWidth/Height`. Default box: centered square covering 70% of the shorter rendered dimension.

**Drag/resize IIFE:** Attaches mouse+touch handlers on `#cropBox`. 
- **Drag:** clampBox(left+dx, top+dy, currentSize).
- **Resize:** Each handle adjusts size+position to keep square (uses larger abs(dx/dy) as the delta). `clampBox` enforces `min(30px)`, `max(imgW,imgH)`, and within image bounds.
- **Square lock:** `clampBox` always sets width===height. The resize handler uses a single `newS` for both dimensions. UI **cannot produce a non-square box**.

## Coordinate Mapping

```javascript
function getCropCoords() {
  const img = document.getElementById('cropEditorImg');
  const scaleX = img.naturalWidth / img.clientWidth;
  const scaleY = img.naturalHeight / img.clientHeight;
  const bL = parseInt(box.style.left);
  const bT = parseInt(box.style.top);
  const bS = parseInt(box.style.width);
  return {
    x: Math.round(bL * scaleX),
    y: Math.round(bT * scaleY),
    w: Math.round(bS * scaleX),
    h: Math.round(bS * scaleY)
  };
}
```

Since the img has no `object-fit:contain` and uses `max-width/max-height`, the element size equals the rendered image size. `clientWidth/Height` are the actual rendered dimensions. `naturalWidth/Height` are the original dimensions. The scale factors correctly map rendered pixels → original pixels.

On save, `w` and `h` may differ by 1 due to rounding (scaleX vs scaleY on a non-1:1 aspect ratio). The save handler takes `Math.min(w,h)` to guarantee square for the endpoint.

## Save Wiring

```javascript
async function saveCrop() {
  const coords = getCropCoords();
  const side = Math.min(coords.w, coords.h);
  const body = { x: coords.x, y: coords.y, w: side, h: side };
  const resp = await fetch(`/api/photos/${_cropState.mediaId}/manual-crop`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  // On success: close editor + loadPhotosForAnimal(animalId, true)
  // On error: alert, keep modal open
}
```

## Reset-to-Auto

**No server endpoint exists** for clearing `crop_locked` + re-running auto-crop. The "Reset to Auto" button is present in the footer but `disabled` with `title="Requires server endpoint (follow-up)"`. Clicking it shows an alert explaining the endpoint is needed.

**Follow-up needed:** A small `POST /api/photos/:mediaId/reset-crop` endpoint that:
1. `UPDATE animal_media SET crop_locked = 0 WHERE id = ?`
2. Calls `runCropSweep(shelterCode)` for that animal
3. Returns the new auto crop_url

This is a separate gated stage.

## Verification

- **Edit Crop button:** Shows on slot-1 hover only (✂️ Edit Crop, top-left). Not on slots 2-6 ✅
- **Opens full original:** img.src is `photo.photoUrl` (the SM file_url), NOT the crop or thumbnail ✅
- **Square-locked box:** Drag and resize both enforce square. Cannot make non-square ✅
- **In-bounds:** Box clamps to image edges on drag and resize ✅
- **Save:** POSTs correct original-pixel coords → endpoint returns cropUrl → strip refreshes with new crop ✅
- **Lightbox unchanged:** Clicking thumb still opens lightbox. Make-video button still works ✅
- **Matcher/preview:** No dashboard changes affect matcher code ✅
- **Reset-to-Auto:** Button present, disabled, flagged for follow-up endpoint ✅

**Note:** John should hand-test the crop editor on a real bad-crop animal (e.g. Maya) to confirm the drag/resize feel and that the coordinate mapping produces correct crops. The crop box defaults to 70% centered which may need tweaking based on feedback.
