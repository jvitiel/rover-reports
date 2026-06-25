# Crop Editor Rotate Button — Scoping Diagnosis

**Date:** 2026-06-25  
**Scope:** Read-only. No writes, no code changes.

---

## 1. The Crop Editor Lightbox

**Markup — dashboard/index.html:6514–6538:**
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
          <!-- 4 corner handles -->
        </div>
      </div>
    </div>
    <div class="crop-editor-footer">
      <div class="crop-btn-group">
        <button class="crop-btn crop-btn-cancel" onclick="closeCropEditor()">Cancel</button>
        <button class="crop-btn crop-btn-save" id="cropSaveBtn" onclick="saveCrop()">Save Crop</button>
      </div>
    </div>
  </div>
</div>
```

**Where the rotate button goes:** In the `crop-editor-footer` (line 6531), alongside the Cancel and Save Crop buttons. A "↻ Rotate" button before the save group.

**CSS:** Lines 5163–5212 define the modal, body, image wrapper, crop box, handles, footer.

---

## 2. What Image the Editor Displays

**dashboard/index.html:15781–15790** — `openCropEditor(mediaId, animalId, originalUrl, event)`:
```js
_cropState.mediaId = mediaId;
_cropState.animalId = animalId;
const img = document.getElementById('cropEditorImg');
img.src = originalUrl;
```

**Where `originalUrl` comes from — dashboard/index.html:7346:**
```js
openCropEditor('${photo.id}', '${animalId}', '${escapeHtml(photoUrl)}', event)
```

**Where `photoUrl` comes from — dashboard/index.html:7321:**
```js
const photoUrl = photo.photoUrl || photo.fileUrl;
```

**Which is `file_url` from the API — server.ts:3819:**
```js
photoUrl: row.file_url,
```

### Critical Finding: SM Photos Have NO Local File

For SM-sourced photos (679 of 692 slot-1 photos), `file_url` is a **remote ShelterManager URL**:
```
https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&mediaid=9275&ts=...
```

There is **no local file** on disk for SM photos — `file_path` is empty. The crop editor displays the SM remote image directly. The crop worker (scripts/crop-worker.py) downloads the remote image to a temp file to produce the crop (crop-worker.py:54–62).

For dashboard-upload/local photos (13 slot-1 photos), `file_url` is a local URL and `file_path` is a local path:
```
file_path: /home/shelter/shelter-apps/data/library-photos/S2025966/S2025966-library-...jpg
file_url: https://dogwalker.4lgshelterapp.duckdns.org/data/library-photos/S2025966/...
```

---

## 3. What File Would Rotate

### SM photos (98% of slot-1)
There is **no local source file to rotate**. The original lives on ShelterManager's servers. Rotating would require:
1. Download the SM image to a local file
2. Rotate the local copy
3. Store it as a new local file (replacing the SM URL in `file_url`)
4. This fundamentally changes how the photo is sourced — it's no longer an SM remote reference

**This is a much bigger change than the volunteer rotate** — it means creating a local copy of an SM photo and re-pointing `file_url` to the local copy. This has sync implications (SM re-syncs could overwrite the change, or the local/remote would drift).

### Dashboard-upload/local photos (2% of slot-1)
These have a local `file_path` — rotation works like the volunteer pattern: ImageMagick rotates in place, backup the original.

### Handsome (S2026571) — the live case
```
source: sm-sync
file_path: (empty)
file_url: https://service.sheltermanager.com/...mediaid=9275&ts=...
crop_url: https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/crops/S2026571-9275.jpg
```
SM-sourced. No local file. Rotation would need to download, rotate, and store locally.

---

## 4. Rotation ↔ Crop Interaction

### How the crop is produced

**server.ts:3940–4029** — `POST /api/photos/:mediaId/manual-crop`:
1. Receives `{ x, y, w, h }` — pixel coordinates on the **original** image
2. Invokes `crop-worker.py --ids ${mediaId} --manual-box ${x},${y},${w},${h}`
3. The worker downloads the source image (if remote), auto-orients via EXIF (`ImageOps.exif_transpose`), crops to the box, saves to `/data/animal-media/crops/{shelter_code}-{mediaid}.jpg`
4. The endpoint updates `animal_media SET crop_url = ?, crop_locked = 1`

### After rotation, the crop is STALE

The existing crop box coordinates (`x, y, w, h`) were drawn against the pre-rotation image dimensions. After rotation:
- Width and height swap (e.g., 1200×800 → 800×1200)
- The crop box points at wrong pixel coordinates
- The crop file on disk is the old crop of the old orientation

### What needs to happen after rotate

1. **Clear the existing crop**: `UPDATE animal_media SET crop_url = NULL, crop_locked = 0 WHERE id = ?`
2. **Reload the editor image**: set `cropEditorImg.src` to the now-rotated source (with `?v=` cache-bust)
3. **Re-initialize the crop box**: `initCropBox()` resets to a centered 70% square on the new dimensions
4. **User draws a new crop** on the upright image and clicks Save Crop
5. **Save Crop** calls the existing `POST /api/photos/:mediaId/manual-crop` — the worker re-downloads (now-rotated) source, crops, saves. Standard path.

`crop_locked` must be reset to 0 so the automated cropper doesn't skip this photo — though the user will immediately re-crop and set it to 1 again. The key is: rotate clears the crop, user re-draws, save re-locks.

---

## 5. The Rotate Endpoint — New Required

**Cannot reuse the volunteer rotate endpoint** (POST /api/volunteers/rotate-image) — it's regex-validated to `/data/volunteer-files/` only.

A new endpoint is needed: `POST /api/photos/:mediaId/rotate`

### For SM photos (the hard case)
1. Look up the media row to get `file_url` (remote SM URL)
2. Download the image to a local temp file
3. Rotate with ImageMagick: `convert "${tempPath}" -rotate 90 -orient top-left -quality 85 "${localPath}"`
4. Store the rotated image locally: `/data/animal-media/originals/{shelter_code}-{mediaid}-rotated.jpg` (or similar)
5. Update `file_url` to point to the local copy (served via the existing `/data` static mount)
6. Clear `crop_url = NULL, crop_locked = 0` (crop is stale)
7. Return `{ success: true, url: newLocalUrl + '?v=' + Date.now() }`

### For local/dashboard-upload photos
1. Rotate the local file in place (like volunteer pattern)
2. Backup original (`.bak-rotate` on first rotate)
3. Clear crop
4. Return cache-busted URL

### Path validation
- Validated by `mediaId` lookup (not by path regex) — the endpoint looks up the media row by ID, confirms it exists and is a photo, then operates on the file referenced by that row
- No path traversal risk since the file path comes from the DB, not from user input

### ImageMagick pattern
Same as volunteer (server.ts:10158): `convert "${path}" -rotate 90 -orient top-left -quality 85 "${path}"`

### Where it goes
Between the existing GET /api/photos/:animalId (line ~3835) and the manual-crop endpoint (line 3940). Or right before manual-crop.

---

## 6. Cache-Bust

**The crop editor already cache-busts — server.ts:4020:**
```js
const versionedCropUrl = `${wr.crop_url}?v=${Date.now()}`;
```

After rotation, the rotate endpoint returns a `?v=` URL. The editor reloads `cropEditorImg.src = newUrl` (cache-busted, shows the rotated image). After the user re-crops and saves, the manual-crop endpoint returns another `?v=` crop URL. The strip refreshes via `loadPhotosForAnimal()` (dashboard:15943). Standard cache-bust chain.

---

## 7. Safety / Backup

### SM photos
The original is always on ShelterManager's servers — there's no local file to lose. Downloading + rotating creates a LOCAL copy. If it goes wrong, re-download from SM. No backup needed for the downloaded file (SM is the backup).

However: updating `file_url` from the SM remote to a local URL is a **one-way change** that disconnects the photo from SM. If SM re-syncs, the sync process may overwrite `file_url` back to the remote (needs checking). This is the main risk.

### Dashboard-upload/local photos
The original IS the only copy. Backup via `.bak-rotate` on first rotate (same as volunteer pattern). Important.

---

## 8. Scope / Sizing

| Piece | Size | Notes |
|-------|------|-------|
| Rotate endpoint (backend) | **Medium** | New endpoint; SM download + rotate + local storage + crop clear; local photos simpler. ~60 lines. |
| Rotate button (UI) | **Small** | Button in crop-editor-footer; onclick calls endpoint, reloads img, re-inits crop box. ~15 lines. |
| Rotate → crop reset (UX) | **Small** | Clear crop_url + crop_locked in DB (done by endpoint); re-init crop box in UI (done by button handler). |
| Cache-bust | **Trivial** | Existing pattern — `?v=Date.now()` on the returned URL. |
| SM file_url migration | **Medium risk** | Changing `file_url` from SM remote to local. Sync implications. |
| CSS | **Trivial** | One button style in the footer. |
| DB change | **None** | No new columns. `crop_url` cleared to NULL, `crop_locked` reset to 0 — existing columns. `file_url` updated to local path — existing column. |

**Overall: Medium.** The backend is the complex part (SM download + local storage + file_url update). The UI is straightforward. The main risk is the SM sync interaction — needs a decision on whether rotating an SM photo should disconnect it from SM sync or be handled differently (e.g., rotate only the crop, not the source — see alternative below).

---

## 9. Alternative: Rotate the CROP, Not the Source

Instead of rotating the source image (which requires downloading SM photos and changing `file_url`), an alternative:

1. The crop worker already auto-orients via EXIF (`ImageOps.exif_transpose` at crop-worker.py:68)
2. If the image is sideways despite EXIF (wrong EXIF tag, like the volunteer scans), the crop is ALSO sideways
3. **Option:** Add a `rotation` parameter to the manual-crop endpoint — the worker applies a 90° rotation before cropping. The source image stays on SM unchanged. The crop is produced from the rotated download.
4. **Pro:** No local source file storage, no SM sync issues, no `file_url` change
5. **Con:** The editor still shows the sideways image to draw the crop on — the user would need to visually compensate or the editor would need client-side CSS rotation

This is architecturally cleaner but UX-worse (drawing a crop on a sideways image is confusing). The "download + rotate + store locally" approach gives a better UX but has SM sync implications.

**Recommendation:** For the live case (Handsome, SM photo), the pragmatic approach is: download the SM photo, rotate it locally, store at a local path, update `file_url`, clear the crop, let the user re-crop. Flag the SM sync risk and handle it (either skip re-syncing photos that have been locally rotated, or add a `locally_modified` flag).
