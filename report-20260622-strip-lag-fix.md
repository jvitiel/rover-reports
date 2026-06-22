# Dashboard Strip Lag Fix: Render from Mutation Response

**Date:** 2026-06-22 15:50 UTC  
**Commit:** `15ae01e`  
**File:** `dashboard/index.html` (1 file, +23 / -8)

---

## Server Response Shapes (confirmed)

| Endpoint | Method | Returns `data.strip`? | Returns `data.library`? |
|----------|--------|----------------------|------------------------|
| `/api/photos/:id/reorder` | PUT | ✅ Yes | ❌ No |
| `/api/photos/:id/add-to-strip` | POST | ✅ Yes | ✅ Yes |
| `/api/photos/:id/remove-from-strip` | POST | ✅ Yes | ✅ Yes |
| `/api/dashboard/media/:id/hide` | POST | ❌ No | ❌ No |

The reorder PUT returns only strip — library must be preserved from `photoCache`. Add/remove return both. hideMedia returns neither — that handler still uses `loadPhotosForAnimal(id, true)`.

---

## Before / After

### Re-entrancy guard + helper (NEW — dashboard/index.html:6436, 8079-8088)

```javascript
// line 6436
const stripMutationSeq = new Map(); // per-animal sequence counter for re-entrancy guard

// line 8079-8088
function applyStripMutationResponse(animalId, seq, data) {
  if ((stripMutationSeq.get(animalId) || 0) !== seq) return; // stale response, skip
  const strip = data.strip || [];
  const library = data.library || (photoCache.get(animalId) || {}).library || [];
  photoCache.set(animalId, { strip, library });
  renderPhotosForAnimal(animalId, strip, library);
}
```

When `data.library` is absent (reorder PUT), the helper preserves the existing library from `photoCache`. The sequence counter ensures only the latest mutation response for a given animal renders — earlier out-of-order responses are silently dropped.

### onPhotoDrop — BEFORE (dashboard/index.html:~8207):
```javascript
.then(result => {
  if (result.success) {
    loadPhotosForAnimal(animalIdForReload, true);
  }
})
```

### onPhotoDrop — AFTER:
```javascript
const seq = (stripMutationSeq.get(animalIdForReload) || 0) + 1;
stripMutationSeq.set(animalIdForReload, seq);
// ... fetch ...
.then(result => {
  if (result.success && result.data) {
    applyStripMutationResponse(animalIdForReload, seq, result.data);
  }
})
```

### addToStrip — BEFORE (dashboard/index.html:~8232):
```javascript
if (result.success) {
  loadPhotosForAnimal(animalId, true);
}
```

### addToStrip — AFTER:
```javascript
const seq = (stripMutationSeq.get(animalId) || 0) + 1;
stripMutationSeq.set(animalId, seq);
// ... fetch ...
if (result.success && result.data) {
  applyStripMutationResponse(animalId, seq, result.data);
}
```

### removeFromStrip — BEFORE (dashboard/index.html:~8252):
```javascript
if (result.success) {
  loadPhotosForAnimal(animalId, true);
}
```

### removeFromStrip — AFTER:
```javascript
const seq = (stripMutationSeq.get(animalId) || 0) + 1;
stripMutationSeq.set(animalId, seq);
// ... fetch ...
if (result.success && result.data) {
  applyStripMutationResponse(animalId, seq, result.data);
}
```

### hideMedia — UNCHANGED

Still calls `loadPhotosForAnimal(animalId, true)` because its endpoint (`/api/dashboard/media/:id/hide`) returns only `{ success: true }` with no strip/library data.

---

## Verification

### No redundant GET in mutation handlers
✅ Confirmed: `loadPhotosForAnimal(..., true)` does not appear in `onPhotoDrop`, `addToStrip`, or `removeFromStrip`. Only `hideMedia` retains it (by necessity — no strip in its response).

### Library section preserved
✅ `applyStripMutationResponse` falls back to `(photoCache.get(animalId) || {}).library || []` when the response lacks `data.library` (reorder PUT). For add/remove, the response includes both strip and library. The library section is never blanked.

### Slot-2/video skip + slot-3 displacement
✅ Still correct. The rendered strip comes from the server's authoritative response, which includes the slot-2-skip logic from commit `75b3e3c`. The client never computes strip positions — it only renders what the server returns.

### Syntax / load check
```
$ node -e "new Function(js)" → All script blocks parse OK
$ curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/dashboard/ → 200
```

### Expected UX improvement
**Before:** drop → PUT round-trip (~100ms) → response ignored → GET round-trip (~100ms) → full innerHTML rebuild + image re-fetch from scratch (~500-2000ms) = **~1-2s stale strip**

**After:** drop → PUT round-trip (~100ms) → render from response (~10ms DOM update, images cached from prior render) = **~100-200ms**, no stale strip

### Service restart needed?
**No.** `dashboard/index.html` is a static file served via `express.static`. A browser hard-refresh (Ctrl+Shift+R) picks up the change immediately. No service restart required.

---

## Commit

```
Hash:  15ae01e
Files: dashboard/index.html (+23, -8)
```

No deviations from the edit scope.
