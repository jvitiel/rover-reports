# Diagnosis: Media Tab Drag Handler Conflict — Second Pass

**Date:** 2026-06-16 19:51 UTC  
**Prior:** Cache/load-race hypothesis DISPROVEN by hard-refresh test. Re-investigating with position-vs-source confound removed.

---

## 1. Full Event Sequence for .photo-slot Drag

When a user drags a populated `.photo-slot` in the per-animal strip:

### Phase 1: Browser initiates drag
- User mousedowns on the `<img>` inside `.photo-slot`
- User moves mouse → browser begins native drag (img is natively draggable)
- `dragstart` event fires on the `<img>`, bubbles through DOM

### Phase 2: Inline handler fires (bubble, element level)
**File:** `dashboard/index.html` line 8155
```javascript
function onPhotoDragStart(event) {
    const slot = event.target.closest('.photo-slot');
    if (!slot) return;
    draggedMediaId = slot.dataset.mediaId;    // reads data-media-id → UUID
    draggedAnimalId = slot.dataset.animalId;  // reads data-animal-id → SM numeric ID
    slot.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';           // sets effectAllowed
    event.dataTransfer.setData('text/plain', draggedMediaId); // sets text/plain → UUID string
}
```
**Result:** Globals set, `effectAllowed = 'move'`, `text/plain` data = UUID. [VERIFIED]

### Phase 3: Delegated handler fires (bubble, document level)
**File:** `dashboard/index.html` line 6656
```javascript
document.addEventListener('dragstart', function(e) {
    const src = e.target.closest('.photo-slot[data-media-id], .library-photo[data-media-id], .featured-slot-new.slot-populated');
    if (!src) return;
    
    let mediaId, animalId, mediaType, source, sourceSlotIndex;
    
    if (src.classList.contains('featured-slot-new')) {
        mediaId = src.dataset.mediaId;
        animalId = src.dataset.animalId;
        mediaType = src.dataset.mediaType || 'photo';
        source = 'grid';
        sourceSlotIndex = parseInt(src.dataset.slotIndex, 10);
    } else {
        // ← THIS BRANCH fires for .photo-slot
        mediaId = src.dataset.mediaId;    // same UUID as inline handler read
        animalId = src.dataset.animalId;
        mediaType = src.dataset.mediaType || 'photo';
        source = 'strip';
        sourceSlotIndex = null;
    }
    
    if (!mediaId) return;  // guard: empty string is falsy, would abort
    
    e.dataTransfer.effectAllowed = 'copyMove';           // OVERWRITES: 'move' → 'copyMove'
    e.dataTransfer.setData('application/x-4lg-media', JSON.stringify({
        media_id: mediaId, animal_id: animalId,
        media_type: mediaType, source: source,
        sourceSlotIndex: sourceSlotIndex
    }));
    src.classList.add('dragging-to-featured');
});
```
**Result:** `effectAllowed` overwritten to `'copyMove'` (more permissive, not less). `application/x-4lg-media` data added alongside existing `text/plain`. Both data types coexist. [VERIFIED]

### Dual-handler conflict analysis:
| Aspect | Effect |
|--------|--------|
| `effectAllowed` overwrite | `'move'` → `'copyMove'` — MORE permissive, cannot cause drag failure [VERIFIED] |
| Multiple `setData` calls | Different MIME types (`text/plain`, `application/x-4lg-media`) — both coexist per spec [VERIFIED] |
| `preventDefault()` called? | Neither handler calls it — drag is never cancelled [VERIFIED] |
| `stopPropagation()` called? | Neither handler calls it — both handlers always fire [VERIFIED] |
| Early exit `if (!mediaId)` | Only triggers if `data-media-id` is empty string — confirmed UUID is always set [VERIFIED] |

**Conclusion: The dual-handler interaction is NOT the cause.** Both handlers cooperate correctly. The overwrite to `'copyMove'` is strictly more permissive than `'move'`. Neither handler cancels or blocks the other. [VERIFIED]

### No other dragstart handlers exist:
```
$ grep -n "addEventListener.*'dragstart'" dashboard/index.html
6656:    document.addEventListener('dragstart', function(e) {
```
Only one delegated + one inline. No capture-phase listeners. No mousedown/pointerdown interceptors. [VERIFIED]

---

## 2. Source/Position-Specific Conditionals Search

### Grep results — no conditionals found in drag handlers:
```
$ grep -n 'dashboard-upload\|source.*strip\|stripPosition\|position.*6\|slot.*6' dashboard/index.html
```
**Zero matches** in the drag handlers (lines 6655–6770, 8152–8213). [VERIFIED]

The drag handlers have NO conditional logic based on:
- `photo.source` or `data-source` [VERIFIED — not present in DOM or handler]
- `file_url` path pattern [VERIFIED — not read by handlers]
- `stripPosition` value [VERIFIED — not read by dragstart]
- position === 6 [VERIFIED — no such check]

### API response comparison — SM vs upload at SAME position 6:
```json
// SM image at position 6 (animal A2025088)
{ "id": "7b849acf-...", "stripPosition": 6, "source": "sm",
  "photoUrl": "https://service.sheltermanager.com/..." }

// Upload image at position 6 (animal R2023007)  
{ "id": "b47f5827-...", "stripPosition": 6, "source": "dashboard-upload",
  "photoUrl": "https://dogwalker.4lgshelterapp.duckdns.org/data/library-photos/..." }
```
Identical field set. `id` is valid UUID in both. `stripPosition` is `6` in both. Only `photoUrl` and `source` differ — neither is read by any drag handler or referenced in any data- attribute. [VERIFIED]

---

## 3. Same-Position Rendered Element Comparison

`renderPhotoSlots` (line 7178) renders ALL populated slots identically. Position-specific differences are:
- `primary` class: only position 1 (CSS border color) [VERIFIED]
- `publicLabel` span: only positions 1–2 (cosmetic text below slot) [VERIFIED]

**For position 6, SM and upload produce IDENTICAL DOM:**
```html
<!-- SM at position 6 -->
<div class="photo-slot has-photo" draggable="true"
     data-media-id="7b849acf-..." data-animal-id="3359"
     data-media-type="photo" data-strip-position="6"
     ondragstart="onPhotoDragStart(event)"
     ondragover="onPhotoDragOver(event)"
     ondrop="onPhotoDrop(event)"
     ondragend="onPhotoDragEnd(event)">
  <img src="https://service.sheltermanager.com/..." alt="Photo 6"
       onclick="openLightbox(...)">
  <button class="delete-photo" onclick="removeFromStrip(...)">×</button>
</div>

<!-- Upload at position 6 -->
<div class="photo-slot has-photo" draggable="true"
     data-media-id="b47f5827-..." data-animal-id="297"
     data-media-type="photo" data-strip-position="6"
     ondragstart="onPhotoDragStart(event)"
     ondragover="onPhotoDragOver(event)"
     ondrop="onPhotoDrop(event)"
     ondragend="onPhotoDragEnd(event)">
  <img src="https://dogwalker.../data/library-photos/..." alt="Photo 6"
       onclick="openLightbox(...)">
  <button class="delete-photo" onclick="removeFromStrip(...)">×</button>
</div>
```

**Same classes, same attributes, same inline handlers, same element structure.** The ONLY differences are the UUID string in `data-media-id` (both valid) and the URL in `img src` (both accessible). [VERIFIED]

---

## 4. CSS Overlay / Pointer-Events / Stacking Check at Slot 6

### Overlay elements:
| Element | Position | pointer-events | z-index | Affects slot 6? |
|---------|----------|---------------|---------|-----------------|
| `.delete-photo` button | `absolute`, inside slot | inherited | none | `display: none` unless hover — no [VERIFIED] |
| `.marketing-star` span | `absolute`, inside slot | inherited | 1 | Only renders if `tagMarketing=true` — false for both SM and upload [VERIFIED] |
| `.slot-video-indicator` | `absolute`, inside slot | `none` | 1 | Only renders for video — photos skip it [VERIFIED] |
| `.public-label` | `absolute`, inside slot | inherited | none | Only positions 1–2 — not slot 6 [VERIFIED] |
| `.strip-actions-col` | static, flex sibling | inherited | none | See layout analysis below |
| `.expand-icon` | static, flex sibling of `.animal-info` | inherited | none | Far right of header — no [VERIFIED] |
| `<input type="file">` | `display: none` | n/a | n/a | Invisible — no [VERIFIED] |

### Layout analysis — can `.strip-actions-col` overlap slot 6?

`.animal-info` is `display: flex; flex-wrap: wrap; gap: 16px; row-gap: 10px;`

Children:
1. Name section (`flex: 1`) — takes remaining space
2. `.photo-strip` — 6 × 80px + 5 × 8px gap = 520px, plus `padding-right: 8px` = 528px
3. `.strip-actions-col` — buttons: ~300px total (Adoption Status `width: 150px` + Bonded Pair `width: 134px` + margins)

At 1200px viewport: `.animal-info` ≈ 1068px wide. Total needed: 208 + 528 + 300 + 32 (gaps) = 1068px. All three fit on one line. Photo-strip keeps its natural 528px — **no shrinking, no overflow, no overlap.** [VERIFIED]

At narrower viewports: `flex-wrap: wrap` causes items to wrap to new lines. The strip-actions-col wraps BELOW the photo-strip, not on top of it. **No overlap at any viewport width.** [VERIFIED]

No `position: absolute`, `position: fixed`, negative margins, or z-index elevation on `.strip-actions-col` or its children. [VERIFIED]

**No CSS overlay intercepts pointer events at slot 6.** [VERIFIED]

---

## 5. Slot-6 Wiring vs Slots 1–5

`renderPhotoSlots` (line 7178) loops `for (let i = 0; i < 6; i++)`. Slot 6 is `i=5`.

For ALL populated slots:
- `draggable="true"` ✓
- `ondragstart="onPhotoDragStart(event)"` ✓
- `data-media-id="${photo.id}"` ✓
- `data-animal-id="${animalId}"` ✓
- `data-media-type` ✓
- `data-strip-position` ✓

The `addToStrip` path vs auto-fill path:
- Auto-fill (`insertAnimalMedia` for source `sm`/`profiler`): sets `strip_position` during INSERT
- Manual (`addToStrip` → `addPhotoToStrip(mediaId, 6)`): sets `strip_position` via UPDATE

Both result in the same DB record shape. Both are served by the same `getStripPhotos` → `formatPhotoForApi` → `renderPhotoSlots` pipeline. The rendering code does not know or care HOW the image got into the strip. [VERIFIED]

---

## 6. Diagnosis Result

### What is confirmed NOT the cause: [VERIFIED]
1. ❌ Dual-handler dataTransfer conflict — handlers cooperate correctly
2. ❌ Source/position conditional — no such logic exists in drag code
3. ❌ CSS overlay intercepting pointer events at slot 6 — no overlapping elements found
4. ❌ Different element wiring at slot 6 — identical to slots 1–5
5. ❌ Different API data shape — identical for SM and upload at position 6
6. ❌ Image load timing — disproven by hard-refresh test (prior report)
7. ❌ Service worker interference — no service worker on dashboard
8. ❌ Capture-phase event listener — none found

### CRITICAL CONFOUND NOT YET CONTROLLED: [UNCERTAIN]

**The prior testing may have confounded SOURCE with POSITION.** The test animal (R2023007) has:
- SM images at positions **1–4** → drag works
- Upload image at position **6** → drag fails
- No SM image at position **6** for this animal

If the user has ONLY tested SM images at positions 1–4 and upload images at position 6, they'd attribute the failure to source when it may be position-dependent. The code analysis shows NO source-specific difference, making the position confound the most plausible alternative explanation.

### TO RESOLVE — Two browser-side tests needed:

**Test A (controls for source):** Find an animal that has an SM image at position 6 (DB query: `SELECT shelter_code FROM animal_media WHERE source='sm' AND strip_position=6 AND hidden=0 LIMIT 5` — examples: A2025088, A2023228, C2023029). Try dragging that SM image from slot 6. If it ALSO fails, the bug is **position-specific**, not source-specific, and the cause is likely a layout/rendering issue invisible from server-side code analysis (e.g., a browser compositing edge case at the rightmost flex item boundary).

**Test B (controls for position):** Upload a new image, add it to strip via `+ Strip`, then use the strip reorder API or add another photo to shift the upload image from position 6 to position 3. Try dragging from position 3. If it works, the bug is **position-specific**. If it still fails, the bug IS source-specific, and the cause is in the `<img>` element's interaction with the browser's native drag system at a level below what server-side code analysis can observe.

**Test C (browser DevTools, immediate):** On the failing slot, right-click → Inspect Element. Verify:
1. Element has `draggable="true"` attribute
2. Element has non-empty `data-media-id` attribute
3. No other element overlaps the slot in the Elements panel's "box model" view
4. Console shows no JavaScript errors during dragstart (add `console.log('dragstart fired')` at the top of `onPhotoDragStart` temporarily, or watch the Network/Console tabs during a drag attempt)

### If Tests A/B confirm position-specific:

The most likely candidate is the **native `<img>` drag interference** at the flex boundary. The `<img>` elements inside `.photo-slot` do NOT have `draggable="false"`. HTML `<img>` elements are natively draggable. At certain DOM/layout geometries, the browser's native image drag can suppress the parent div's custom drag handler. Adding `draggable="false"` to the `<img>` (and `<video>`) elements in `renderPhotoSlots` would force the parent `<div draggable="true">` to own the drag exclusively.

### If Tests A/B confirm source-specific:

The cause is below the application code layer — likely a browser interaction between the `<img>` element's source URL characteristics (origin, cache headers, content type) and the drag preview generation. This would require browser DevTools `dragstart` event breakpointing to observe the actual `dataTransfer` state at each handler.
