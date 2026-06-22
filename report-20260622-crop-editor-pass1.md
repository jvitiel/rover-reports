# Crop Editor Pass 1: Foundation Diagnosis

**Date:** 2026-06-22 20:21 UTC  
**Mode:** Read-only, DB mode=ro

---

## 1. Strip Thumbnail Render

**dashboard/index.html:7194-7199 — slot-1 thumbnail src:**
```javascript
const photoUrl = photo.photoUrl || photo.fileUrl;
const mediaContent = isVideo
  ? /* video branch */
  : `<img src="${escapeHtml(photo.thumbnailUrl || photoUrl)}" ...>`;
```

The src chain is: `photo.thumbnailUrl || photo.photoUrl || photo.fileUrl`. **`crop_url` is never in the chain** — the dashboard strip always shows `thumbnailUrl` (320px sharp thumbnail) or the full original `file_url`.

**`formatPhotoForApi` (server.ts:3814-3830)** maps DB rows to the API shape sent to the dashboard:
```javascript
{
  id: row.id,
  photoUrl: row.file_url,
  fileUrl: row.file_url,
  thumbnailUrl: row.thumbnail_url || null,
  stripPosition: row.strip_position,
  // ... no crop_url field
}
```

`crop_url` is NOT returned by the API. To show the crop on slot 1:
1. Add `cropUrl: row.crop_url || null` to `formatPhotoForApi`
2. In the slot-1 img src (dashboard/index.html:7199), for `i === 0` only: use `photo.cropUrl || photo.thumbnailUrl || photoUrl`

Slot 1 is identifiable: `i === 0` in the strip loop, and the slot gets `class="primary"` (line 7201).

## 2. Make-Video Button + Popup Pattern

**UI pattern:** Click a strip/library thumbnail → `openLightbox(url, mediaId, animalId, mediaType, thumbnailUrl)` (dashboard/index.html:8427).

**Lightbox structure (index.html:6386-6405):**
```html
<div class="lightbox" id="lightbox" data-state="idle" onclick="closeLightbox(event)">
  <button class="lightbox-close" onclick="closeLightboxBtn()">×</button>
  <div class="lightbox-body">
    <div class="lightbox-comparison" id="lightboxComparison"></div>
    <div class="lightbox-main">
      <img id="lightboxImg" src="" alt="Photo">
      <video id="lightboxVideo" ...></video>
      <div class="lightbox-spinner">...</div>
      <button class="btn-make-video" onclick="enterPromptState()">🎬 Make Video</button>
    </div>
  </div>
  <div class="lightbox-prompt-bar">...</div>
  <div class="lightbox-result-bar">...</div>
</div>
```

**State machine:** `data-state` attribute cycles through `idle → prompt → generating → result`, CSS rules show/hide elements per state (styles lines 765-800). The `🎬 Make Video` button is a child of `.lightbox-main`, visible only in `idle` state, only for photos with a mediaId.

**Pattern to mirror for Edit Crop:**
- The Edit Crop button does NOT go inside the existing lightbox — it opens a SEPARATE editor modal (see §3 boundary).
- The Edit Crop button sits above/beside the slot-1 thumbnail in the strip (not inside the lightbox).
- The editor modal is a new `<div id="cropEditor">` separate from `<div id="lightbox">`.

## 3. Click-to-Full-Image Popup — Boundary

**Container:** `<div class="lightbox" id="lightbox">` — the entire full-image popup + video generator.

**Handler:** `openLightbox()` at index.html:8427.

**Boundary:** The lightbox is a self-contained modal. The new crop editor must be a SEPARATE modal element (`#cropEditor`), opened by its own handler. The lightbox is NOT touched. Clicking a slot-1 thumb still opens the lightbox as before; the "Edit Crop" button is a separate control (positioned on the strip slot, not inside the lightbox).

## 4. Crop Generation: Browser vs. Server

### The non-destructive invariant (confirmed)

The current pipeline already separates originals from crops:
- **`file_url`**: the full original image URL (SM remote or local upload). Never mutated by cropping.
- **`crop_url`**: a separate derivative file at `/data/animal-media/crops/`. Written by crop-worker.py via `cropSweep.ts`.
- Re-crop always re-reads the original via `file_url` (crop-worker.py line 165-180: fetches from `file_url`, never from `crop_url`).

Manual crop would follow the same pattern: always derive from the full original `file_url`, write a new file to `crop_url`. Staff always sees the full original in the editor.

### Option A: Browser-side crop

**Workflow:** Editor loads full original in `<canvas>` → staff draws square box → canvas crops to box → uploads cropped JPEG blob → server saves as crop file + sets `crop_url`.

**Existing upload endpoint:** `POST /api/photos/:shelterCode/upload-to-library` (server.ts:3985) accepts a `photo` multipart file, processes it with sharp, saves to library. Could be adapted or a new dedicated `POST /api/photos/:shelterCode/save-crop` created.

**⚠️ CRITICAL: Canvas CORS/taint issue.** 91% of slot-1 photos are SM remote URLs:
```
https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&mediaid=7720&...
```
Loading a cross-origin image into `<canvas>` taints it — `canvas.toBlob()` / `canvas.toDataURL()` will throw a SecurityError. SM does not send `Access-Control-Allow-Origin` headers. Options:
1. **Server-side image proxy:** Add a `/api/image-proxy?url=...` endpoint that fetches the SM image and serves it with same-origin headers. The canvas loads from the proxy URL. ~15 lines of server code.
2. **`crossOrigin="anonymous"` on the img** — only works if the remote server sends CORS headers. SM does not. **This does not work.**

**Verdict:** Browser-side is viable IF a proxy endpoint is added. Without the proxy, it's blocked for 91% of photos.

### Option B: Server-side crop

**Workflow:** Editor shows the full original (img tag, no canvas needed — display only). Staff draws a square box overlay (pure DOM/CSS positioning, no canvas). Editor sends `{ mediaId, x, y, w, h }` (box coordinates in original-pixel space) to a new endpoint. Server fetches the original, crops to the box, resizes to 800×800, saves as crop file, sets `crop_url`.

**crop-worker.py:** Currently only accepts `--ids` (auto-YOLO detection). Does NOT accept an explicit crop box. Adding a `--manual-box x,y,w,h` mode is straightforward — skip YOLO detection, use the provided box coordinates directly, feed into the existing Pillow resize+save pipeline. ~15 lines of Python.

**Server endpoint:** New `POST /api/photos/:mediaId/manual-crop` that accepts `{ x, y, w, h }` (pixel coordinates relative to original), calls crop-worker.py with `--ids <mediaId> --manual-box x,y,w,h`, writes `crop_url`, sets the lock flag. ~30 lines of TypeScript.

**No CORS issue:** The editor only needs to DISPLAY the original image (an `<img>` tag works fine cross-origin — taint only applies to canvas export). The box overlay is pure DOM positioning. No canvas needed.

### Recommendation: Server-side (Option B)

- No CORS/taint issue — avoids the proxy endpoint entirely.
- No canvas API complexity — the editor is pure DOM (img + draggable/resizable div overlay).
- Consistent with existing pipeline — crop-worker.py already handles the image processing; adding a manual box mode is minimal.
- The server always crops from `file_url` (the original) — non-destructive by construction.
- The editor calculates box coords in original-pixel space by scaling the rendered img dimensions to the natural dimensions.

## 5. Lock Flag

### Storage

New additive column on `animal_media`:
```sql
ALTER TABLE animal_media ADD COLUMN crop_locked INTEGER DEFAULT 0;
```

Matches the prior additive pattern (`crop_url TEXT` added in Stage 1a, commit 35c8701). No migration script — single `ALTER TABLE` in a startup-check or one-shot.

### Sweep-skip predicate

**Current cropSweep.ts:57-65 — crop candidate query:**
```sql
SELECT am.id, am.shelter_code, am.crop_url, am.source_media_id
FROM animal_media am
WHERE am.strip_position = 1
  AND am.media_type = 'photo'
  AND am.hidden = 0
```

**With lock, add:**
```sql
  AND am.crop_locked = 0
```

This single clause covers both the nightly full sweep (no `scopeClause`) and the scoped drag-triggered sweep (with `AND shelter_code = ?`). Both use the same query. Locked rows are simply excluded from the candidate set — never re-cropped, never cleared.

**Clear set (line 168):** Also needs the lock check:
```sql
WHERE strip_position != 1
  AND crop_url IS NOT NULL
  AND crop_locked = 0
```
This prevents the clear set from nulling a crop_url on a row that was manually cropped and then dragged off slot 1 (edge case but correct).

### Lock tied to mediaId (not slot)

The lock should be tied to the specific mediaId (row in `animal_media`), not to the slot. Since `crop_locked` is a column on `animal_media`, it's already per-row (per-mediaId) by construction.

**Scenario analysis:**
- **Locked photo still in slot 1:** `crop_locked = 1` on that row → sweep skip clause excludes it ✅
- **Different photo dragged into slot 1:** The NEW photo's row has `crop_locked = 0` (default) → sweep crops it normally ✅
- **Locked photo dragged OFF slot 1:** Its row keeps `crop_locked = 1`, but `strip_position != 1` → it's in the clear set. The clear-set lock check (`AND crop_locked = 0`) prevents clearing its crop_url. This is correct — the manual crop is preserved even if the photo moves off slot 1 ✅
- **No auto-clear needed:** The lock stays on the mediaId permanently. If the photo is dragged back to slot 1 later, the lock still applies. No slot-change detection logic needed.

### Save/re-crop

- **Save:** Endpoint writes crop file → sets `crop_url` → sets `crop_locked = 1` on that `animal_media` row. One UPDATE.
- **Re-crop:** Editor always loads the full original (`file_url`), never the previous crop. Staff draws a new box. Endpoint overwrites the crop file, updates `crop_url`, `crop_locked` remains 1. The editor itself never reads or checks `crop_locked`.
- **Unlock (future/optional):** If staff wants to revert to auto-crop, a separate "Reset to Auto" action sets `crop_locked = 0` and optionally clears `crop_url` (next sweep will auto-crop).

## 6. Proposed Staging Plan

### Stage 1: Slot-1 thumb shows crop_url
- **server.ts:** Add `cropUrl: row.crop_url || null` to `formatPhotoForApi`
- **dashboard/index.html:** For `i === 0` only, change img src to `photo.cropUrl || photo.thumbnailUrl || photoUrl`
- **Verify:** Slot-1 thumbnail displays the square crop (for animals that have one); other slots unchanged
- **Files:** server.ts, dashboard/index.html

### Stage 2: Lock column + sweep-skip
- **Schema:** `ALTER TABLE animal_media ADD COLUMN crop_locked INTEGER DEFAULT 0`
- **cropSweep.ts:** Add `AND am.crop_locked = 0` to both crop-candidate and clear-set queries
- **Verify:** Manually set `crop_locked = 1` on a test row → sweep skips it; unset → sweep crops it
- **Files:** localDatabase.ts or startup migration, cropSweep.ts

### Stage 3: Manual-box mode in crop-worker.py
- **crop-worker.py:** Add `--manual-box x,y,w,h` argument; when provided, skip YOLO, use the box directly
- **Verify:** CLI test with explicit coords → correct crop generated
- **Files:** scripts/crop-worker.py

### Stage 4: Server endpoint for manual crop
- **server.ts:** New `POST /api/photos/:mediaId/manual-crop` accepting `{ x, y, w, h }`, calls crop-worker.py with `--manual-box`, writes `crop_url` + sets `crop_locked = 1`
- **Verify:** curl test → crop file created, DB updated, lock set
- **Files:** server.ts

### Stage 5: Editor UI
- **dashboard/index.html:** New `#cropEditor` modal with: full original img display, draggable/resizable square overlay, save/cancel buttons, "Edit Crop" button on slot-1 thumb
- **Coordinate mapping:** Editor maps rendered box position to original-pixel coordinates using `img.naturalWidth / img.clientWidth` scaling
- **Save handler:** POST to manual-crop endpoint, refresh strip thumbnail on success
- **Verify:** End-to-end: open editor on slot-1, draw box, save, slot-1 thumb updates, sweep skips
- **Files:** dashboard/index.html (HTML + CSS + JS)
