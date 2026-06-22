# Dashboard Photo Strip Drag → Re-Render Lag Diagnosis

**Date:** 2026-06-22 15:35 UTC  
**Mode:** Read-only diagnosis  

---

## 1. The Drop Handler

**dashboard/index.html:8177-8212** — `onPhotoDrop`:

```javascript
// line 8177
function onPhotoDrop(event) {
  event.preventDefault();
  const targetSlot = event.target.closest('.photo-slot');
  if (!targetSlot || targetSlot.dataset.animalId !== draggedAnimalId) {
    return;
  }
  
  targetSlot.classList.remove('drag-over');
  
  // Capture IDs before async operation (they get reset by onPhotoDragEnd)
  const animalIdForReload = draggedAnimalId;
  const mediaIdForReorder = draggedMediaId;
  
  let newPosition;
  if (targetSlot.dataset.mediaId) {
    newPosition = parseInt(targetSlot.dataset.stripPosition) || 1;
  } else {
    newPosition = (parseInt(targetSlot.dataset.slot) || 0) + 1;
  }
  
  fetch(`${API_BASE}/photos/${animalIdForReload}/reorder`, {    // (a) call reorder API
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaId: mediaIdForReorder, newPosition }),
  })
  .then(res => res.json())                                       // (b) await response
  .then(result => {
    if (result.success) {
      loadPhotosForAnimal(animalIdForReload, true);              // (c) re-fetch + re-render
    }
  })
  .catch(err => console.error('Reorder failed:', err));
}
```

**Sequence after drop:**
1. **(a)** Fire PUT `/api/photos/:animalId/reorder` with `{ mediaId, newPosition }`
2. **(b)** Await the JSON response
3. **(c)** On success, call `loadPhotosForAnimal(animalId, true)` which issues a **second** GET `/api/photos/:animalId` to fetch the authoritative strip, then re-renders

**No optimistic DOM update exists today.** The strip stays frozen showing the old layout until step (c) completes.

## 2. The Re-Render

**`loadPhotosForAnimal`** — dashboard/index.html:8078-8098:

```javascript
async function loadPhotosForAnimal(animalId, forceRefresh = false) {
  if (!forceRefresh && photoCache.has(animalId)) {
    const cached = photoCache.get(animalId);
    renderPhotosForAnimal(animalId, cached.strip || [], cached.library || []);
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/photos/${animalId}`);
    const result = await response.json();
    if (result.success && result.data) {
      const strip = result.data.strip || result.data.photos || [];
      const library = result.data.library || [];
      photoCache.set(animalId, { strip, library });
      renderPhotosForAnimal(animalId, strip, library);
    }
  } catch (error) { ... }
}
```

Since the drop handler passes `forceRefresh = true`, the cache is bypassed every time — it always fetches from the server.

**`renderPhotosForAnimal`** — dashboard/index.html:8103-8155:

```javascript
function renderPhotosForAnimal(animalId, strip, library = []) {
  const container = document.getElementById(`photos-${animalId}`);
  if (container) {
    container.innerHTML = renderPhotoSlots(animalId, strip);   // full innerHTML rebuild
    // ... library section rebuild follows ...
  }
}
```

**`renderPhotoSlots`** — dashboard/index.html:7184-7231:

Iterates positions 1-6, does `strip.find(p => p.stripPosition === position)` for each slot, builds full HTML string. This is a **complete innerHTML replacement** — no incremental/per-element updates.

**Confirmed:** The strip DOM updates ONLY after the GET response returns. There is zero pre-response (optimistic) DOM update today.

## 3. Where the ~2s Goes

### Breakdown

| Phase | What happens | Estimated time |
|-------|-------------|---------------|
| PUT /reorder | `reorderStripPhoto()` (DB write) → `getStripPhotos()` → `res.json()` | ~5-20ms |
| GET /photos/:id | `getStripPhotos()` + `getLibraryPhotos()` → `res.json()` | ~5-20ms |
| Network (2 round-trips) | LAN/localhost ≈ negligible; remote ≈ 50-200ms × 2 | ~100-400ms |
| Image loading | Browser loads new `<img src="...">` for moved photos (SM external URLs, uncached) | **~500-2000ms** |
| DOM rebuild | `innerHTML` replacement + browser layout/paint | ~10-50ms |

**The PUT does NOT block on `runCropSweep`.** Confirmed at server.ts:3954-3955:

```typescript
res.json({ success: true, data: { strip } });
// Fire-and-forget: reconcile crops for this animal after response
runCropSweep(shelterCode).catch(err => ...);
```

`res.json()` is called first; the sweep is fire-and-forget after the response is sent.

### Dominant cost: the redundant GET + image re-loading

The PUT response **already contains the updated strip** (`result.data.strip`) but the client ignores it and issues a fresh GET. This is a wasted round-trip.

More importantly, the full innerHTML rebuild causes the browser to re-create all 6 `<img>` elements. For photos that didn't change position, the browser must re-request or re-decode the images. SM-hosted images (external URLs with query params) may not cache efficiently, adding 500ms+ per image on slow connections.

### No artificial delays

No `setTimeout`, `debounce`, or intentional delays exist in the drag→render path.

## 4. Optimistic-Update Feasibility

### Client-side state: YES, reorderable

**`photoCache`** (dashboard/index.html:6435) is a `Map<animalId, { strip: [], library: [] }>` holding the full strip array with `stripPosition`, `id`, `photoUrl`, `mediaType`, etc. This array can be locally reordered and passed to `renderPhotosForAnimal` immediately.

### Slot-2-skip mirroring: NEEDED for full accuracy

If the optimistic update aims to predict the exact post-reorder layout, it would need to replicate the slot-2-skip rule:
- When dragging to position 1: displaced photo goes to position 3 (not 2), cascade from 3 upward
- When dragging to any other position: standard shift

**However, a simpler approach works:** optimistically move ONLY the dragged tile into its target slot and leave the rest for the server response to settle. The visual result is: the dragged photo instantly appears in slot 1, the old slot-1 photo briefly stays where it was (or disappears), and the full correct layout snaps in when the server responds ~100-400ms later. This avoids mirroring the slot-2 rule and is still a massive improvement over the current 2s freeze.

### Even simpler: use the PUT response directly

Since the PUT `/reorder` response already includes `{ strip }`, the client can skip the redundant GET entirely:

```javascript
// Instead of:
.then(result => {
  if (result.success) loadPhotosForAnimal(animalIdForReload, true);
})

// Use:
.then(result => {
  if (result.success && result.data && result.data.strip) {
    const strip = result.data.strip;
    photoCache.set(animalIdForReload, { strip, library: photoCache.get(animalIdForReload)?.library || [] });
    renderPhotosForAnimal(animalIdForReload, strip, photoCache.get(animalIdForReload)?.library || []);
  }
})
```

This eliminates one entire round-trip and uses the server's authoritative post-reorder data. No slot-2-skip mirroring needed.

### Drag library: native HTML5 DnD

The strip uses native HTML5 drag-and-drop (`draggable="true"`, `ondragstart`, `ondragover`, `ondrop`, `ondragend`). No third-party library. The `draggedMediaId` / `draggedAnimalId` module-level variables are simple and don't interfere with optimistic updates.

### Re-entrancy risk

If a staffer drags again while the first request is in-flight, the second drop would fire another PUT. With the current "ignore PUT response, always GET" pattern, the GET responses could arrive out of order. An optimistic update that uses the PUT response directly would have the same risk — last-write-wins on the server, but the client could briefly show stale data if responses arrive out of order. Mitigation: a simple sequence counter or request-abort.

## 5. Spinner Feasibility (Fallback)

**Attach point:** The strip container is `<div class="photo-strip" id="photos-${animalId}">` (dashboard/index.html:7149).

To disable further drags during the round-trip:
```javascript
// In onPhotoDrop, before fetch:
const stripEl = document.getElementById(`photos-${animalIdForReload}`);
if (stripEl) stripEl.classList.add('strip-loading');

// In the .then/.catch, after render:
if (stripEl) stripEl.classList.remove('strip-loading');
```

CSS:
```css
.photo-strip.strip-loading { opacity: 0.5; pointer-events: none; }
```

This dims the strip and blocks further drags until the re-render completes.

## 6. Recommendation

**Use the PUT response directly** (eliminate the redundant GET). This is the cleanest fix:

1. **One line change** in `onPhotoDrop` (dashboard/index.html:8205-8207): instead of calling `loadPhotosForAnimal(animalId, true)`, read `result.data.strip` from the PUT response, update `photoCache`, and call `renderPhotosForAnimal` directly.
2. **No slot-2-skip mirroring needed** — the server already computed the correct layout; we just use it.
3. **Eliminates one full round-trip** (~100-400ms on remote connections).
4. **Reduces image re-loading** — unchanged slots keep their positions, and `renderPhotoSlots` rebuilds from the same URLs (browser cache hits for unchanged images).

For the remaining image-load lag on the newly-moved photo: optionally add a lightweight CSS transition or swap the dragged tile's DOM position immediately in `onPhotoDrop` before the fetch (true optimistic), then let the PUT response reconcile. But the PUT-response-direct approach alone should cut the perceived lag from ~2s to ~200ms.

Apply the same pattern to `addToStrip` and `removeFromStrip` (both also ignore their mutation response and re-GET). All three server endpoints already return `{ strip, library }` or `{ strip }`.
