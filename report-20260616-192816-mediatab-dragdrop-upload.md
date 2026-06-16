# Diagnosis: Media Tab Drag-Drop Failure for Upload-Button Images

**Date:** 2026-06-16 19:28 UTC  
**Bug:** Dashboard Media tab — upload-button images stuck at strip position 6, cannot be dragged to other positions. SM-sync and staff-app images drag fine.

---

## 1. Dragstart Handler & Payload Construction

**File:** `dashboard/index.html`

### Two drag systems coexist on the Media tab:

**A. Inline strip drag (per-animal strip reorder):** lines 8152–8213  
```javascript
// line 8152
function onPhotoDragStart(event) {
    const slot = event.target.closest('.photo-slot');
    if (!slot) return;
    draggedMediaId = slot.dataset.mediaId;    // reads data-media-id
    draggedAnimalId = slot.dataset.animalId;  // reads data-animal-id
    slot.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedMediaId);
}
```
- **Payload source:** `slot.dataset.mediaId` from `data-media-id` attribute
- **Drop handler** (`onPhotoDrop`, line 8175): uses global `draggedMediaId`/`draggedAnimalId` (not dataTransfer), calls `PUT /api/photos/:animalId/reorder`

**B. Delegated featured-grid drag (library/strip → featured grid, grid ↔ grid):** lines 6655–6692  
```javascript
// line 6656
document.addEventListener('dragstart', function(e) {
    const src = e.target.closest(
        '.photo-slot[data-media-id], .library-photo[data-media-id], .featured-slot-new.slot-populated'
    );
    if (!src) return;
    
    let mediaId, animalId, mediaType, source, sourceSlotIndex;
    if (src.classList.contains('featured-slot-new')) {
        mediaId = src.dataset.mediaId;  // reads data-media-id on featured slot
        // ... grid source
    } else {
        mediaId = src.dataset.mediaId;  // reads data-media-id on strip/library element
        // ... strip source
    }
    
    if (!mediaId) return;  // ← EARLY EXIT: empty/null mediaId kills the drag
    
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('application/x-4lg-media', JSON.stringify({
        media_id: mediaId, animal_id: animalId,
        media_type: mediaType, source: source, sourceSlotIndex: sourceSlotIndex
    }));
    src.classList.add('dragging-to-featured');
});
```
- **Payload source:** `src.dataset.mediaId` from `data-media-id`
- **Critical guard:** `if (!mediaId) return;` — empty string is falsy, aborts without calling `setData`

### Both handlers fire on the same dragstart event (inline first, then delegated via bubbling). [VERIFIED]

---

## 2. How `data-media-id` Is Set for Each Intake Path

### Strip rendering (line 7178, `renderPhotoSlots`):
```javascript
// line 7194
`<div class="photo-slot has-photo" draggable="true"
     data-media-id="${photo.id}"
     data-animal-id="${animalId}"
     data-media-type="${isVideo ? 'video' : 'photo'}"
     data-strip-position="${photo.stripPosition || (i + 1)}"
     ondragstart="onPhotoDragStart(event)" ...>`
```
`photo.id` comes from `formatPhotoForApi` (line 3720):
```javascript
return { id: row.id, shelterCode: row.shelter_code, photoUrl: row.file_url, ... };
```
`row.id` is the UUID from `animal_media.id` (PRIMARY KEY, never null). [VERIFIED]

### Library rendering (line 7243, `renderLibrarySection`):
```javascript
`<div class="library-photo" draggable="true" data-media-id="${photo.id}" data-animal-id="${animalId}" ...>`
```
Same `photo.id` source. [VERIFIED]

### Featured-grid rendering (line 6555, `renderPhotoSlot`):
```javascript
slotEl.dataset.mediaId = slot.media?.id || '';  // ← CAN BE EMPTY
```
**If `slot.media.id` is null, `data-media-id` becomes `''` (empty string), and the delegated dragstart aborts at `if (!mediaId) return;`.** [VERIFIED]

---

## 3. Server Data for Each Intake Path

### a. SM-sync images
- `insertAnimalMedia` with `source: 'sm'` or `'sm-sync'`
- UUID auto-generated: `const id = randomUUID()` (line 4708)
- Auto-fills strip positions 1–6 if fewer than 6 exist (`shouldAutoFill = source === 'profiler' || source === 'sm' || tagMarketing`) [VERIFIED]
- `file_url`: `https://service.sheltermanager.com/asmservice?...`

### b. Staff-app uploads (source: `activity`, `feeding`, `profiler`)
- Same `insertAnimalMedia`, UUID auto-generated
- `activity` and `feeding` are NOT in auto-fill list — must be manually moved to strip via `+ Strip`
- `file_url`: `https://dogwalker.4lgshelterapp.duckdns.org/data/animal-photos/...`

### c. Upload-button images (source: `dashboard-upload`)
- `insertAnimalMedia` with `source: 'dashboard-upload'` (line 3929)
- UUID auto-generated, strip_position = 0 (library only)
- NOT in auto-fill list — must be manually moved via `+ Strip`
- `file_url`: `https://dogwalker.4lgshelterapp.duckdns.org/data/library-photos/...`

### DB verification for R2023007 (test animal with both sources): [VERIFIED]
```
SM positions 1-4:    UUIDs present, file_url = sheltermanager.com
Upload position 6:   b47f5827-..., file_url = dogwalker.../data/library-photos/...
```

### API response shape (GET /api/photos/297): [VERIFIED]
```json
// SM image at position 1
{ "id": "372a5b54-...", "stripPosition": 1, "source": "sm", ... }
// Upload image at position 6
{ "id": "b47f5827-...", "stripPosition": 6, "source": "dashboard-upload", ... }
```
Both return identical field sets including valid `id`. No difference in API response shape. [VERIFIED]

---

## 4. Rendered Thumbnail Comparison

### SM image at strip position 1 (rendered by `renderPhotoSlots`):
```html
<div class="photo-slot has-photo primary" draggable="true"
     data-media-id="372a5b54-6ce6-4fbc-aa8b-efd5051fc757"
     data-animal-id="297" data-media-type="photo" data-strip-position="1"
     ondragstart="onPhotoDragStart(event)" ondragover="onPhotoDragOver(event)"
     ondrop="onPhotoDrop(event)" ondragend="onPhotoDragEnd(event)">
  <img src="https://service.sheltermanager.com/..." alt="Photo 1"
       onclick="openLightbox(...)">
  <button class="delete-photo" onclick="removeFromStrip(...)">×</button>
  <span class="public-label">Public Pic</span>
</div>
```

### Upload image at strip position 6 (rendered by `renderPhotoSlots`):
```html
<div class="photo-slot has-photo" draggable="true"
     data-media-id="b47f5827-bb67-42c4-bb94-86151aff9fe9"
     data-animal-id="297" data-media-type="photo" data-strip-position="6"
     ondragstart="onPhotoDragStart(event)" ondragover="onPhotoDragOver(event)"
     ondrop="onPhotoDrop(event)" ondragend="onPhotoDragEnd(event)">
  <img src="https://dogwalker.4lgshelterapp.duckdns.org/data/library-photos/..." alt="Photo 6"
       onclick="openLightbox(...)">
  <button class="delete-photo" onclick="removeFromStrip(...)">×</button>
</div>
```

**Differences:** CSS class `primary` (position 1 only), `<span class="public-label">` (positions 1–2 only). Neither affects drag. `data-media-id` is a valid UUID in both cases. Both have `draggable="true"`. [VERIFIED]

---

## 5. Persistence Check

Upload image `b47f5827` is persisted at `strip_position = 6` in `animal_media`: [VERIFIED]
```sql
SELECT id, strip_position FROM animal_media WHERE id = 'b47f5827-bb67-42c4-bb94-86151aff9fe9';
-- b47f5827-...|6
```
The `addPhotoToStrip` function (line 4816) correctly updates `strip_position` for all sources. The image survives reload — the persistence path works. [VERIFIED]

---

## 6. CSS Bug Independence

The known `.stats-bar` flex-wrap CSS bug is a layout issue affecting the frozen header toolbar. The drag failure is an event/data issue in the photo strip. No overlap identified. [VERIFIED independent]

---

## 7. Root Cause Analysis

### What I confirmed works identically for all sources: [VERIFIED]
- DB record shape (same columns, same UUID generation)
- API response shape (`formatPhotoForApi` is source-agnostic)
- Client rendering (`renderPhotoSlots` produces identical HTML structure)
- Drag event handler attachment (inline + delegated, both source-agnostic)
- `data-media-id` attribute contains valid UUID for both sources
- Image URLs are accessible (Express static middleware serves `/data/*`)
- Persistence (strip_position correctly written and survives reload)

### Primary hypothesis: **Native `<img>` drag interference + image loading race**

The `<img>` elements inside `.photo-slot` containers do NOT have `draggable="false"`. In HTML5, `<img>` elements are **natively draggable by default**. When the user initiates a drag, the browser may start a **native image drag** on the `<img>` element rather than the parent `<div>`'s custom drag.

The critical difference between sources:

| Source | Image origin | Cache state after `addToStrip` re-render |
|--------|-------------|----------------------------------------|
| SM | `service.sheltermanager.com` | **Warm** — loaded on initial page render |
| Staff-app | `dogwalker.../data/animal-photos/` | **Warm** — loaded on initial page render |
| Upload button | `dogwalker.../data/library-photos/` | **Cold** — brand new URL, first load |

After `addToStrip()` → `loadPhotosForAnimal(animalId, true)` → `renderPhotosForAnimal()`:
- `container.innerHTML = renderPhotoSlots(...)` **destroys and recreates** all `<img>` elements
- SM/staff-app image URLs may be in the browser's HTTP cache → images render instantly
- Upload-button image URLs are brand new (just created seconds ago) → browser must fetch from server

If the user initiates drag before the upload image finishes loading:
1. The `<img>` has no rendered content (alt text or empty)
2. The browser's native image drag may produce an empty/failed drag
3. Chrome specifically may cancel the drag if the image isn't loaded, producing **no drag-preview rectangle**
4. The inline `onPhotoDragStart` handler still fires (it reads `data-media-id` from the parent div, not the img), but the browser's drag state may already be cancelled

This explains why:
- SM images work (cached, load instantly on re-render)
- Staff-app images work (cached from initial page load)
- Upload images fail (cold URL, race between image load and drag initiation)
- The bug is intermittent or timing-dependent (might work if user waits long enough)

### Secondary contributing factor: Missing `draggable="false"` on child images

Best practice for draggable containers with images is to set `draggable="false"` on child `<img>` and `<video>` elements. This prevents the browser's native image drag from competing with the parent's custom drag handler.

Current `renderPhotoSlots` (line 7207):
```javascript
: `<img src="${escapeHtml(photoUrl)}" alt="Photo ${i + 1}" onclick="...">`;
```
**Missing:** `draggable="false"` attribute on the `<img>`.

---

## 8. Conclusions

**(a) Field the dragstart needs:** `data-media-id` attribute on the `.photo-slot` or `.featured-slot-new` element. Read by both `onPhotoDragStart` (inline, reads into global `draggedMediaId`) and the delegated dragstart (reads into `application/x-4lg-media` JSON payload). [VERIFIED]

**(b) How that field differs:** It does **not** differ in the rendered DOM — both SM and upload images produce valid UUID values in `data-media-id`. The server data, API response, and rendering code are source-agnostic. [VERIFIED — no data-level difference found]

**(c) Client render gap vs server gap:** Neither. The gap is a **browser-level interaction** between native image drag behavior and the custom drag handler, exacerbated by image loading timing for cold URLs. The defensive fix is client-side: add `draggable="false"` to `<img>` elements inside draggable containers. [INFERRED — not confirmed via browser DevTools]

**(d) Strip move persistence:** Yes, upload images persist at their assigned strip position after reload. The `addPhotoToStrip` write succeeds for all sources. [VERIFIED via DB query]

### Recommended fix (two lines, defensive):
In `renderPhotoSlots`, add `draggable="false"` to the `<img>` and `<video>` elements inside populated `.photo-slot` containers. This forces the browser to use the parent div's `draggable="true"` and custom drag handlers exclusively, eliminating the native image drag race.

Same fix should be applied in `renderLibrarySection` for library thumbnails.
