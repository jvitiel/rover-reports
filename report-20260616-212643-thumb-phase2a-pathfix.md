# Thumbnail Phase 2a — Path Fix Verification

**Date:** 2026-06-16 21:26 UTC  
**Commit:** `e1a8b86` — `thumbnails Phase 2a: pass explicit thumbnails dir to generatePhotoThumbnail (fix intake-photos path; remove /data/ slice dependency)`  
**Scope:** server/src/imageProcessor.ts, server/src/server.ts only

---

## Changes Made

### git diff --stat [VERIFIED]
```
 server/src/imageProcessor.ts | 12 ++++--------
 server/src/server.ts         |  2 +-
 2 files changed, 5 insertions(+), 9 deletions(-)
```

---

## Updated generatePhotoThumbnail (imageProcessor.ts) [VERIFIED]

```typescript
export async function generatePhotoThumbnail(
  originalPath: string,
  mediaId: string,
  baseUrl: string,
  thumbnailsDir: string          // ← NEW: explicit dir, no path slicing
): Promise<string> {
  if (!existsSync(thumbnailsDir)) mkdirSync(thumbnailsDir, { recursive: true });

  const thumbPath = path.join(thumbnailsDir, `${mediaId}.jpg`);

  await sharp(originalPath)
    .resize({
      width: 320,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .rotate()
    .jpeg({ quality: 80, mozjpeg: false })
    .toFile(thumbPath);

  return `${baseUrl}/data/animal-media/thumbnails/${mediaId}.jpg`;
}
```

**Removed:** The `dataDir = originalPath.substring(0, originalPath.indexOf('/data/') + 5)` and `thumbDir = path.join(dataDir, ...)` lines are gone entirely. The function now uses `thumbnailsDir` verbatim — works for ANY source path regardless of directory structure. [VERIFIED]

---

## Updated Caller (server.ts, upload-to-library handler) [VERIFIED]

```typescript
const thumbUrl = await generatePhotoThumbnail(
  filepath,
  photoId,
  BASE_URL,
  path.join(ROOT_DIR, 'data', 'animal-media', 'thumbnails')  // ← explicit dir from ROOT_DIR
);
```

`ROOT_DIR` resolves to `/home/shelter/shelter-apps` (defined at `server.ts:247`), so the thumbnails dir is always `/home/shelter/shelter-apps/data/animal-media/thumbnails/` — the same location as before. [VERIFIED]

---

## REGRESSION TEST [VERIFIED]

Uploaded a real photo via `POST /api/photos/S2025966/upload-to-library`:

| Check | Result |
|---|---|
| Upload success | ✓ `{ success: true, data: { photoId: "9b11c9df-...", fileUrl: "..." } }` |
| Thumbnail file exists | ✓ `data/animal-media/thumbnails/9b11c9df-....jpg` (15,641 bytes) |
| Thumbnail dimensions | ✓ 320×240 (320px width, aspect preserved) |
| Thumbnail encoding | ✓ `JPEG image data, baseline` — `Interlace: None` (NOT progressive) |
| DB `thumbnail_url` set | ✓ `https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/thumbnails/9b11c9df-....jpg` |

Test record, original file, and thumbnail cleaned up after verification. [VERIFIED]

---

## NON-/data/ PATH PROOF [VERIFIED — by code read]

The function no longer contains any reference to `/data/` or `indexOf`. The `thumbnailsDir` parameter is used verbatim:

```typescript
const thumbPath = path.join(thumbnailsDir, `${mediaId}.jpg`);
```

An intake-photos path like `/home/shelter/shelter-apps/intake-photos/44/photo.jpg` would work identically — the `originalPath` is only passed to `sharp(originalPath)` for reading the source image, and the thumbnail is written to `thumbnailsDir` which is caller-controlled. No path parsing of `originalPath` occurs. [VERIFIED by code read — no live intake test needed since the path-slicing code is entirely removed]

---

## Build + Service [VERIFIED]

- **Build:** `npm run build` (tsc) exited code 0, no errors [VERIFIED]
- **Service:** `shelter-app.service` active (running) since 21:26:23 UTC [VERIFIED]
- **Commit:** `e1a8b86` on master [VERIFIED]
- **Files changed:** exactly 2 (imageProcessor.ts, server.ts) [VERIFIED]

---

## Deviations

None.
