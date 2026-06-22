# Manual-Crop Save Display Fix

**Date:** 2026-06-22 21:38 UTC  
**Commit:** `6d4ca1b`  
**Files:** `dashboard/index.html` (+8 -10), `server/src/server.ts` (+3 -1)

---

## Bug 1: Refresh Never Fires

### Before (dashboard/index.html:15722-15733)
```javascript
closeCropEditor();
if (_cropState.animalId || _cropState.mediaId) {
  const expanded = document.querySelector('.animal-row.expanded');
  if (expanded) {
    const animalId = expanded.dataset.animalId;
    if (animalId) { loadPhotosForAnimal(animalId, true); }
  }
}
```
`closeCropEditor()` nulls `_cropState.animalId` and `_cropState.mediaId` → guard is always false → refresh never fires.

### After
```javascript
const savedAnimalId = _cropState.animalId;
closeCropEditor();
const expanded = document.querySelector('.animal-row.expanded');
const refreshId = (expanded && expanded.dataset.animalId) || savedAnimalId;
if (refreshId) {
  loadPhotosForAnimal(refreshId, true);
}
```
`savedAnimalId` captured before close. Refresh always fires with either the expanded row's id or the captured id.

## Bug 2: Stable Filename → Cached Stale Image

### Before (server.ts:4017-4029)
```javascript
db.prepare(
  'UPDATE animal_media SET crop_url = ?, crop_locked = 1 WHERE id = ?'
).run(wr.crop_url, mediaId);
res.json({ ..., cropUrl: wr.crop_url, ... });
```
`wr.crop_url` is the stable filename URL. Re-crops produce the identical URL → browser serves cached old image.

### After
```javascript
const versionedCropUrl = `${wr.crop_url}?v=${Date.now()}`;
db.prepare(
  'UPDATE animal_media SET crop_url = ?, crop_locked = 1 WHERE id = ?'
).run(versionedCropUrl, mediaId);
res.json({ ..., cropUrl: versionedCropUrl, ... });
```
Each save produces a unique URL. Browser re-fetches on every crop change.

## Build
```
$ cd server && npm run build → tsc exit 0
$ systemctl is-active shelter-app → active
```

## Verification

### (a) Versioned crop_url written
```
POST /api/photos/01ef1f8d-.../manual-crop {x:50,y:100,w:400,h:400}
Response: cropUrl: "...A2024185-4484.jpg?v=1782164325570"
DB: crop_url = "...A2024185-4484.jpg?v=1782164325570", crop_locked = 1
Other cols: strip_position=1, file_url unchanged, media_type=photo ✅
Different animal (T2026018): crop_locked=0, crop_url unversioned ✅
```

### (b) Versioned URL serves 200
```
curl -sI '...A2024185-4484.jpg?v=1782164325570'
HTTP/2 200, content-type: image/jpeg, content-length: 66201 ✅
```

### (c) ?v= changes on re-crop
```
First:  ?v=1782164325570
Second: ?v=1782164341252  ✅ (different epoch)
```

### (d) Refresh path reached
Code shows: `savedAnimalId` captured before `closeCropEditor()`, then `loadPhotosForAnimal(refreshId, true)` called unconditionally when `refreshId` is truthy. The guard no longer depends on nulled state ✅

### (e) Restore
```
A2024185: crop_locked=0, crop_url=...A2024185-4484.jpg (no ?v=) ✅
Maya S2026345: crop_locked=0, crop_url=...S2026345-8739.jpg (no ?v=) ✅
```
Both test animals restored: auto-crop file regenerated, lock cleared, unversioned URL.
