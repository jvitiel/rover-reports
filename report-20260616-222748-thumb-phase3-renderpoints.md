# Thumbnail Phase 3 — Dashboard Photo Render Points

**Date:** 2026-06-16 22:27 UTC  
**Scope:** Read-only diagnosis — no changes  
**File:** `dashboard/index.html`

---

## Summary

4 small-display photo render points need `thumbnailUrl || original` replacement. 2 full-size points (lightbox main, lightbox select-main) stay on original. `thumbnailUrl` is in scope at all 4 points via `formatPhotoForApi()` which returns `thumbnailUrl: row.thumbnail_url || null` [VERIFIED]. The featured grid uses a different data shape (`slot.media.thumbnail_url`) but the field is also present [VERIFIED].

---

## SMALL-DISPLAY POINTS — Switch to thumbnailUrl

### 1. Featured Grid Photo Slot — `renderPhotoSlot()` (line 6551)

**Current code (line 6553):**
```javascript
img.src = slot.media?.url || slot.animal.photo_url;
```

**Data shape:** `slot.media` comes from `GET /api/featured-slots` → `resolveMediaById()`. The API returns `{ id, type, url, thumbnail_url }` [VERIFIED at server.ts:2738-2757]. For photos, `thumbnail_url` is set from `resolved.thumbnailUrl` (which reads `animal_media.thumbnail_url` via the fixed `resolveMediaById`). For the fallback case (orphaned media), it's set to `animalData.photo_url` [VERIFIED at server.ts:2764].

**`thumbnail_url` in scope?** YES — `slot.media.thumbnail_url` [VERIFIED]

**Replacement:**
```javascript
img.src = slot.media?.thumbnail_url || slot.media?.url || slot.animal.photo_url;
```

**Note:** This function handles ONLY photos (the video branch is `renderVideoSlot` at line 6569, already uses `slot.media.thumbnail_url`). No photo/video branch split needed here. [VERIFIED]

---

### 2. Strip Photo — `renderPhotoSlots()` (line 7178)

**Current code (line 7192):**
```javascript
: `<img src="${escapeHtml(photoUrl)}" alt="Photo ${i + 1}" onclick="openLightbox('${escapeHtml(photoUrl)}', '${photo.id}', '${animalId}', 'photo')">`;
```

Where `photoUrl` is defined at line 7186: `const photoUrl = photo.photoUrl || photo.fileUrl;`

**Data shape:** `photo` comes from `strip` array via `formatPhotoForApi()` [VERIFIED at server.ts:3762]. `photo.thumbnailUrl` is returned as `row.thumbnail_url || null` [VERIFIED at server.ts:3734].

**`thumbnailUrl` in scope?** YES — `photo.thumbnailUrl` [VERIFIED]

**Replacement (line 7192):**
```javascript
: `<img src="${escapeHtml(photo.thumbnailUrl || photoUrl)}" alt="Photo ${i + 1}" onclick="openLightbox('${escapeHtml(photoUrl)}', '${photo.id}', '${animalId}', 'photo')">`;
```

**Critical:** The `onclick="openLightbox(...)"` call MUST keep passing `photoUrl` (the full-res original), NOT the thumbnail. The lightbox displays full-size. Only the `<img src=` changes. [VERIFIED — openLightbox sets `imgEl.src = url` at line 8433]

---

### 3. Library Photo — `renderLibrarySection()` (line 7226)

**Current code (line 7241):**
```javascript
: `<img src="${escapeHtml(photoUrl)}" alt="Library photo" onclick="openLightbox('${escapeHtml(photoUrl)}', '${photo.id}', '${animalId}', 'photo')">`;
```

Where `photoUrl` is defined at line 7233: `const photoUrl = photo.photoUrl || photo.fileUrl;`

**Data shape:** Same `formatPhotoForApi()` shape. `photo.thumbnailUrl` available. [VERIFIED at server.ts:3763]

**`thumbnailUrl` in scope?** YES — `photo.thumbnailUrl` [VERIFIED]

**Replacement (line 7241):**
```javascript
: `<img src="${escapeHtml(photo.thumbnailUrl || photoUrl)}" alt="Library photo" onclick="openLightbox('${escapeHtml(photoUrl)}', '${photo.id}', '${animalId}', 'photo')">`;
```

**Same critical note:** `openLightbox` onclick keeps `photoUrl` (full-res). Only `<img src=` changes. [VERIFIED]

---

### 4. Comparison Column Photo — `renderComparisonColumn()` (line 8602)

**Current code (line 8630):**
```javascript
} else {
  const img = document.createElement('img');
  img.src = item.url;
  el.appendChild(img);
}
```

**Data shape:** `item` comes from `vgComparisonItems`. For the seed photo (first entry), it's populated at line 8422:
```javascript
vgComparisonItems = [{ media_id: ..., url: url, type: ..., is_seed: true, thumbnail_url: thumbnailUrl || null }];
```
Where `thumbnailUrl` is passed from the `openLightbox()` call. Currently, photo `openLightbox` calls do NOT pass `thumbnailUrl` (5th arg) — only video calls pass it [VERIFIED at lines 7190 vs 7192, 7239 vs 7241].

**`thumbnail_url` in scope?** YES on the item object (`item.thumbnail_url`), but currently always `null` for seed photos because `openLightbox` is called without the 5th arg for photos. [VERIFIED]

**Two changes needed:**

**(a)** In `renderComparisonColumn()` photo branch (line 8630):
```javascript
} else {
  const img = document.createElement('img');
  img.src = item.thumbnail_url || item.url;
  el.appendChild(img);
}
```

**(b)** In `renderPhotoSlots()` and `renderLibrarySection()` photo onclick calls, pass `photo.thumbnailUrl` as the 5th arg to `openLightbox`:

Strip (line 7192):
```javascript
: `<img src="${escapeHtml(photo.thumbnailUrl || photoUrl)}" alt="Photo ${i + 1}" onclick="openLightbox('${escapeHtml(photoUrl)}', '${photo.id}', '${animalId}', 'photo', '${escapeHtml(photo.thumbnailUrl || '')}')">`;
```

Library (line 7241):
```javascript
: `<img src="${escapeHtml(photo.thumbnailUrl || photoUrl)}" alt="Library photo" onclick="openLightbox('${escapeHtml(photoUrl)}', '${photo.id}', '${animalId}', 'photo', '${escapeHtml(photo.thumbnailUrl || '')}')">`;
```

**Note:** The comparison column is a small sidebar of thumbnails next to the full-size lightbox view. It's appropriate to use thumbnails here. The click handler calls `selectMainMedia()` which uses `item.url` (full-size) for the main display — that stays correct. [VERIFIED at line 8653]

---

## FULL-SIZE POINTS — Leave on Original

### A. Lightbox Main Image — `openLightbox()` (line 8408)

**Current code (line 8433):**
```javascript
imgEl.src = url;
```

Where `url` is the first argument to `openLightbox()`, which is always `photoUrl` (the full-res `photo.photoUrl || photo.fileUrl`). [VERIFIED]

**Verdict:** LEAVE ALONE. This is the full-size lightbox display. Must show original. [VERIFIED]

---

### B. Lightbox Select-Main — `selectMainMedia()` (line 8643)

**Current code (line 8653):**
```javascript
imgEl.src = item.url;
```

Where `item.url` is the full-res URL from `vgComparisonItems`. [VERIFIED]

**Verdict:** LEAVE ALONE. This switches the main lightbox display when clicking comparison column items. Must show original. [VERIFIED]

---

## EDIT SUMMARY

| # | Function | Line | Current src | Replacement src | Lightbox onclick | 
|---|----------|------|-------------|-----------------|------------------|
| 1 | `renderPhotoSlot` | 6553 | `slot.media?.url \|\| slot.animal.photo_url` | `slot.media?.thumbnail_url \|\| slot.media?.url \|\| slot.animal.photo_url` | N/A (no onclick) |
| 2 | `renderPhotoSlots` | 7192 | `photoUrl` | `photo.thumbnailUrl \|\| photoUrl` | Keep `photoUrl` (add thumbnail as 5th arg) |
| 3 | `renderLibrarySection` | 7241 | `photoUrl` | `photo.thumbnailUrl \|\| photoUrl` | Keep `photoUrl` (add thumbnail as 5th arg) |
| 4 | `renderComparisonColumn` | 8630 | `item.url` | `item.thumbnail_url \|\| item.url` | N/A (click uses selectMainMedia → item.url) |

**Full-size points left untouched:**
- `openLightbox` line 8433: `imgEl.src = url` ← original
- `selectMainMedia` line 8653: `imgEl.src = item.url` ← original
