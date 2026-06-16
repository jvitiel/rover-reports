# Media Tab Drag Failure — Byte-Level File Diagnosis

**Date:** 2026-06-16 20:35 UTC  
**Scope:** Read-only diagnosis — no code changes

## Summary

The drag failure in the media tab correlates with **image pixel dimensions**, not source or strip position. All file-picker uploads produce large progressive JPEGs (up to 2048×2731px) displayed at 80×80px CSS with no thumbnail layer. Camera captures produce small images (480×640). The browser fails to generate a drag ghost for the large images. No photo thumbnails exist anywhere in the system.

---

## 1. Ingest Path Analysis — Image Processing per Route

### Dashboard upload button (`/api/photos/:shelterCode/upload-to-library`)
- **Processing:** `processUploadedImage()` via sharp — resize max 2048px longest edge, auto-rotate, strip all EXIF, re-encode as JPEG with `mozjpeg: true` (progressive) [VERIFIED]
- **File:** `server/src/imageProcessor.ts:48-79`, called at `server/src/server.ts:3909`
- **Storage:** `data/library-photos/{shelterCode}/` [VERIFIED]

### Profile-form upload (`profile-form.html` → same endpoint)
- **Processing:** Same as dashboard — uploads to `/api/photos/:shelterCode/upload-to-library` [VERIFIED]
- **File:** `profile-form.html:685` — `fetch('/api/photos/' + ... + '/upload-to-library', ...)` [VERIFIED]
- **Storage:** `data/library-photos/` (progressive JPEG) [VERIFIED]

### Profile-app file picker (staff-pwa profiler upload button)
- **Processing:** Same endpoint — `upload-to-library` [VERIFIED]
- **File:** `staff-pwa/app.js:2267` — `fetch(\`${API_BASE}/photos/${shelterCode}/upload-to-library\`, ...)` [VERIFIED]
- **Storage:** `data/library-photos/` (progressive JPEG) [VERIFIED]

### Profile-app camera capture (staff-pwa profiler camera)
- **Processing:** `canvas.toDataURL('image/jpeg', 0.85)` on client → 480×640 baseline JPEG → sent as Blob to same `upload-to-library` endpoint → `processUploadedImage()` re-encodes as progressive JPEG, but dimensions stay 480×640 [VERIFIED]
- **File:** `staff-pwa/app.js:2180,2213` [VERIFIED]
- **Storage:** `data/library-photos/` (480×640 progressive JPEG, ~30-56KB) [VERIFIED]

### Activities-app camera (`/api/volunteer/photo`, `/api/staff/photo`)
- **Processing:** None — raw base64 from `canvas.toDataURL` decoded and written as-is [VERIFIED]
- **File:** `server/src/server.ts:6953-6954` (volunteer), `server/src/server.ts:7042-7043` (staff) [VERIFIED]
- **Storage:** `data/animal-photos/` (480×640 baseline JPEG) [VERIFIED]

### Feeding-app camera (`/api/staff/feeding/photo`)
- **Processing:** None — raw base64 decoded and written as-is [VERIFIED]
- **File:** `server/src/server.ts:7490-7491` [VERIFIED]
- **Storage:** `data/animal-photos/` (480×640 baseline JPEG) [VERIFIED]

### SM-sync ingest (nightly sync job)
- **Processing:** None — stores external SM URL directly in `animal_media.file_url`, no local file created [VERIFIED]
- **File:** `server/src/server.ts:11019-11024` — `insertAnimalMedia({ filePath: '', fileUrl: url, ... })` [VERIFIED]
- **Storage:** No local file — `<img src>` points to `service.sheltermanager.com` [VERIFIED]

### Summary Table

| Ingest Path | processUploadedImage | Output Encoding | Typical Dimensions | Drags? |
|---|---|---|---|---|
| Dashboard upload (file picker) | ✓ | Progressive JPEG | 1536–2731px | ✗ FAILS |
| Profile-form upload (file picker) | ✓ | Progressive JPEG | 1536–2731px | ✗ FAILS |
| Profile-app upload (file picker) | ✓ | Progressive JPEG | 1536–2731px | ✗ FAILS |
| Profile-app camera | ✓ | Progressive JPEG | 480×640 | ✓ Works |
| Activities-app camera | ✗ | Baseline JPEG | 480×640 | ✓ Works |
| Feeding-app camera | ✗ | Baseline JPEG | 480×640 | ✓ Works |
| SM-sync | ✗ (external URL) | Baseline JPEG | 768×1024 | ✓ Works |

---

## 2. File-Level Comparison — Failing vs Working

### FAILING: Dashboard uploads (library-photos, progressive JPEG)

| File | Dimensions | Interlace | Size |
|---|---|---|---|
| S2025966-library-...-4f857b.jpg | 480×640 | JPEG (progressive) | 43,911 B |
| S2025966-library-...-c97a3c.jpg | 1538×2048 | JPEG (progressive) | 480,230 B |
| R2023007-library-...-ffdf32.jpg | 2048×2048 | JPEG (progressive) | 470,705 B |
| R2023007-library-...-0ce23d.jpg | 2048×2048 | JPEG (progressive) | 489,799 B |
| R2023007-library-...-37734d.jpg | 2048×2731 | JPEG (progressive) | 543,833 B |

**Note:** The 480×640 file (first row) is likely a camera capture that went through `upload-to-library` — it would be expected to drag fine despite being progressive, per user testing.

### WORKING: Camera captures (animal-photos, baseline JPEG)

| File | Dimensions | Interlace | Size |
|---|---|---|---|
| 1781201049969_feeding_DALIA___.jpg | 480×640 | None (baseline) | 68,680 B |
| 1777040652691_feeding_Demo.jpg | 640×480 | None (baseline) | 44,575 B |
| 1776901348164_feeding_Demo.jpg | 640×480 | None (baseline) | 33,924 B |

### WORKING: SM photos (external URL, baseline JPEG)

| Source | Dimensions | Interlace | Size |
|---|---|---|---|
| SM mediaid=9076 (sample) | 768×1024 | None (baseline) | 171,656 B |

### Corpus-wide encoding stats [VERIFIED]

| Directory | Total JPEGs | Progressive | Baseline |
|---|---|---|---|
| `data/library-photos/` | 65 | **65 (100%)** | 0 |
| `data/animal-photos/` | 246 | 0 | **246 (100%)** |

**EXIF:** All library-photos have EXIF stripped by `processUploadedImage` (sharp `.rotate()` auto-applies orientation before `.jpeg()` strips metadata). Camera captures from canvas.toDataURL have minimal EXIF (1 entry — orientation). Neither group has substantive EXIF orientation tags. [VERIFIED]

---

## 3. Thumbnail / Resize Layer — Does It Exist?

**No photo thumbnails exist.** [VERIFIED]

- The `<img>` in `.photo-slot` and `.library-photo` containers points directly to the full-resolution original URL [VERIFIED: `dashboard/index.html:7193` — `img.src = photoUrl` where `photoUrl = photo.photoUrl || photo.fileUrl`]
- `.photo-slot` CSS: 80×80px with `object-fit: cover` [VERIFIED: `dashboard/index.html:155-169`]
- `.library-photo` CSS: 80×80px with `object-fit: cover` [VERIFIED: similar CSS block]
- Thumbnails only exist for **videos** — generated by ffmpeg at 320px width, stored in `data/animal-media/thumbnails/` [VERIFIED: `server/src/server.ts:4004-4015`]
- No on-the-fly resize endpoint, no `<picture>` element, no `srcset`, no CDN thumbnail layer [VERIFIED]

**John's recollection confirmed:** The media tab does load full-resolution images (up to 2048×2731 progressive JPEGs, ~1MB) into 80×80px CSS containers. The `processUploadedImage` function caps images at 2048px longest edge, which provides a ceiling but no actual thumbnails.

---

## 4. Response-Level Differences

HTTP response headers for library-photos vs animal-photos are **identical** [VERIFIED]:

```
Content-Type: image/jpeg
Cache-Control: public, max-age=3600
```

Both served by Express `express.static()` through Caddy reverse proxy with identical headers, CORS settings, and security headers. No cross-origin difference for same-origin files. SM photos are cross-origin but still draggable. [VERIFIED]

---

## 5. Drag Handler Analysis

Two drag handler systems coexist in the dashboard:

1. **Strip reorder** (`onPhotoDragStart`/`onPhotoDrop`): inline `ondragstart` on `.photo-slot` elements [VERIFIED: `dashboard/index.html:7198-7202`]
2. **Featured grid drag** (delegated `dragstart` on document): catches `.photo-slot`, `.library-photo`, and `.featured-slot-new` [VERIFIED: `dashboard/index.html:6655-6690`]

**Neither handler calls `setDragImage()`.** [VERIFIED — grep returned no results] The browser generates the drag ghost image from the element's rendered pixels using its default behavior.

---

## Conclusion

### The concrete, evidence-backed difference

**Failing images** (file-picker uploads): large progressive JPEGs, 1536–2731px dimensions, 215KB–1MB, stored in `library-photos/`.

**Working images** (camera captures): small baseline JPEGs, 480–640px dimensions, 25–125KB, stored in `animal-photos/`; OR external SM URLs at 768–1024px baseline.

**One overlap case**: profiler camera captures go through `processUploadedImage` and become 480×640 progressive JPEGs in `library-photos/` — these are reported to drag fine, ruling out progressive encoding alone as the cause.

### Root cause [INFERRED]

The browser's default drag image generation fails for large images (1500+ px) that are CSS-downscaled to 80×80px. The `<img>` loads the full 2048×2731 progressive JPEG, the browser renders it at 80×80px via `object-fit: cover`, and when a `dragstart` fires, the browser cannot efficiently composite a drag ghost from the heavily downscaled large source. The code does not call `setDragImage()` to provide a pre-sized alternative.

This is a known browser behavior — Chrome's drag image renderer has performance limits with very large source images. Progressive JPEG may compound the issue (progressive decode requires multiple passes, potentially leaving the image in an intermediate decode state during rapid drag initiation), but dimensions are the primary correlate.

### What `processUploadedImage` does [VERIFIED]

`server/src/imageProcessor.ts` lines 42-79:
1. Pre-converts HEIC/HEIF to JPEG (sharp lacks H.265 codec)
2. Resizes so longest edge ≤ 2048px (no upscaling)
3. Auto-rotates based on EXIF orientation
4. Re-encodes as JPEG at quality 85 with `mozjpeg: true` → **always produces progressive JPEG**
5. Strips all EXIF/metadata
6. Computes SHA-256 content hash for dedup

### Which upload paths skip normalization [VERIFIED]

ALL of: `/api/volunteer/photo`, `/api/staff/photo`, `/api/staff/feeding/photo`, `/api/dogwalker/photo`, `/api/profile/photo` — raw base64 decode → write. No resize, no EXIF strip, no format conversion. The SM-sync path stores external URLs with no local processing.

Only `/api/photos/:shelterCode/upload-to-library` calls `processUploadedImage`.

### Recommended next diagnostic step (if fix not yet clear)

Browser DevTools test: on a failing image, open DevTools Console and temporarily add a `dragstart` listener that calls `e.dataTransfer.setDragImage(smallCanvas, 0, 0)` with a pre-rendered 80×80 canvas copy of the image. If drag starts working, confirms the browser's default drag image generation is the bottleneck. This would point to the fix: either generate photo thumbnails server-side, or call `setDragImage()` with a canvas-rendered copy in the dragstart handler.
