# Crop Editor Stage 1: Slot-1 Thumb Shows Crop

**Date:** 2026-06-22 20:40 UTC  
**Commit:** `9444faf`  
**Files:** `server/src/server.ts` (+1), `dashboard/index.html` (+4 -1)

---

## Edit 1: API Shape — formatPhotoForApi

**Before (server.ts:3828-3829):**
```javascript
    thumbnailUrl: row.thumbnail_url || null,
  };
```

**After:**
```javascript
    thumbnailUrl: row.thumbnail_url || null,
    cropUrl: row.crop_url || null,
  };
```

## Edit 2: Slot-1 Render

**Before (dashboard/index.html:7193-7199):**
```javascript
const photoUrl = photo.photoUrl || photo.fileUrl;
const isVideo = photo.mediaType === 'video';
const mediaContent = isVideo
  ? /* video branches unchanged */
  : `<img src="${escapeHtml(photo.thumbnailUrl || photoUrl)}" ...>`;
```

**After:**
```javascript
const photoUrl = photo.photoUrl || photo.fileUrl;
const isVideo = photo.mediaType === 'video';
const thumbSrc = i === 0 && !isVideo
  ? (photo.cropUrl || photo.thumbnailUrl || photoUrl)
  : (photo.thumbnailUrl || photoUrl);
const mediaContent = isVideo
  ? /* video branches unchanged */
  : `<img src="${escapeHtml(thumbSrc)}" ...>`;
```

`thumbSrc` prefers `cropUrl` only for slot 1 (`i === 0`) and only for photos (not videos). All other slots use the original chain. The `openLightbox()` call still passes `photoUrl` (the full original) — lightbox is unaffected.

## Build

```
$ cd server && npm run build
> tsc
(exit 0)
```

Service restarted: `systemctl is-active shelter-app` → active. Dashboard is static — browser refresh picks up changes.

## Verification

### API includes cropUrl
```
$ curl -s localhost:3000/api/photos/A2024185 | ...
strip pos=1 cropUrl=https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/crops/A2024185-4484.jpg
strip pos=2 cropUrl=None
strip pos=3 cropUrl=None
library pos=0 cropUrl=None
```
Slot-1 has non-null cropUrl ✅. All other positions return cropUrl=None ✅.

### Slot-1 shows crop
For Amari (A2024185) and other animals with crops: slot-1 thumbnail now displays the 800×800 square crop image. The crop is visually distinct from the original (square, tighter framing) ✅.

### Fallback when no crop
S2026101 (crop_url NULL due to source 404): slot-1 falls through `cropUrl` (null) → `thumbnailUrl` (null) → `photoUrl` (SM URL). No broken image ✅.

### Other slots unchanged
Slots 2-6 still use `thumbnailUrl || photoUrl` — the `i === 0` guard ensures only slot 1 is affected ✅.

### Lightbox + make-video unchanged
Clicking slot-1 thumb still opens the lightbox with the full original image (photoUrl passed to openLightbox, not thumbSrc). Make-video button appears for photos with mediaId ✅.

### Matcher/matcher-preview unaffected
These frontends use `enrichWithLocalPhotos` (localDatabase.ts:5177) which already reads `crop_url` independently. The `formatPhotoForApi` change is additive — the new `cropUrl` field is unused by matcher code ✅.
