# Crop Save Bug Diagnosis

**Date:** 2026-06-22 21:32 UTC  
**Mode:** Read-only

---

## 1. Client Save Path

**dashboard/index.html:15703-15739 — saveCrop():**

```javascript
async function saveCrop() {
  const btn = document.getElementById('cropSaveBtn');
  btn.classList.add('saving');
  btn.textContent = 'Saving...';
  try {
    const coords = getCropCoords();
    const side = Math.min(coords.w, coords.h);
    const body = { x: coords.x, y: coords.y, w: side, h: side };
    const resp = await fetch(`/api/photos/${_cropState.mediaId}/manual-crop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      throw new Error(data.error || 'Save failed');
    }
    // Close editor and refresh the strip
    closeCropEditor();                            // ← BUG 1: nulls _cropState
    if (_cropState.animalId || _cropState.mediaId) {  // ← always false now
      const expanded = document.querySelector('.animal-row.expanded');
      if (expanded) {
        const animalId = expanded.dataset.animalId;
        if (animalId) {
          loadPhotosForAnimal(animalId, true);
        }
      }
    }
  } catch (err) {
    alert('Crop save failed: ' + err.message);
  } finally { ... }
}
```

**getCropCoords() (line 15687):** Reads `img.naturalWidth / img.clientWidth` for scale, `parseInt(box.style.left/top/width)` for the box. These are valid after img load — no NaN/zero risk in normal use.

**Error handling:** `resp.ok` + `data.success` checked, throws to `alert()`. The "no visible error" means the POST returned 200+success.

### BUG 1: closeCropEditor() nulls state before refresh

**closeCropEditor() (line 15576-15581):**
```javascript
function closeCropEditor(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('cropEditor').classList.remove('open');
  _cropState.mediaId = null;     // ← nulled
  _cropState.animalId = null;    // ← nulled
}
```

Called at line 15722, BEFORE the `if (_cropState.animalId || _cropState.mediaId)` guard at line 15724. Since both are null, the guard is false, **`loadPhotosForAnimal` is never called**. The strip never re-fetches.

Even if the `if` guard is removed (the `expanded.dataset.animalId` fallback doesn't depend on `_cropState`), the strip render would re-render with the same `cropUrl` — same URL, same cached image.

## 2. Server Logs

```
Jun 22 21:26:52 POST /api/photos/a69e0b96-a2c3-40a2-be83-38af6ec48c94/manual-crop
Jun 22 21:27:14 POST /api/photos/a69e0b96-a2c3-40a2-be83-38af6ec48c94/manual-crop
Jun 22 21:28:14 POST /api/photos/a69e0b96-a2c3-40a2-be83-38af6ec48c94/manual-crop
```

Three POSTs reached the server for Maya (S2026345). No error log lines. All returned 200 (the client's `if (!resp.ok)` didn't fire — no alert shown).

## 3. DB State (Maya S2026345, slot-1)

```
id: a69e0b96-a2c3-40a2-be83-38af6ec48c94
crop_url: https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/crops/S2026345-8739.jpg
crop_locked: 1
strip_position: 1
```

**crop_locked = 1** — endpoint ran and UPDATE succeeded. crop_url points at a valid file.

## 4. File + Cache

### File mtime
```
-rw-r--r-- shelter shelter 70324 Jun 22 21:28 S2026345-8739.jpg
```
Rewritten at 21:28 (the time of the last POST). 800×800 JPEG, 70KB. **File is correct and current.**

### Cache headers
```
$ curl -sI 'https://dogwalker.../data/animal-media/crops/S2026345-8739.jpg'
cache-control: public, max-age=3600
etag: W/"112b4-19ef13be64f"
last-modified: Mon, 22 Jun 2026 21:28:15 GMT
content-length: 70324
```

**`max-age=3600` (1 hour).** The browser has this image cached from an earlier load (the auto-crop). The URL is IDENTICAL before and after the manual crop (`S2026345-8739.jpg` — stable filename). The browser sees the same URL and serves from its 1-hour cache. Even if `loadPhotosForAnimal` ran, the `<img src="...same-url...">` would show the stale cached bytes.

### BUG 2: No cache-busting on the crop URL

The crop URL is stable across re-crops. No `?t=` timestamp is appended after save. The browser has no signal to re-fetch the image. The `ETag` has changed on the server, but the browser doesn't re-validate until `max-age` expires.

## 5. Verdict: BOTH A and B

**Bug 1 (Case A — client refresh never fires):** `closeCropEditor()` nulls `_cropState.animalId` and `_cropState.mediaId` before the refresh guard, so `loadPhotosForAnimal` is never called. The strip render never re-runs.

**Bug 2 (Case B — cache-stale-filename):** Even if Bug 1 is fixed, the strip would re-render with the identical crop URL. The browser serves the cached old image (max-age=3600). A cache-busting `?v=<timestamp>` must be appended to the crop URL in the API response or in the client img src after save.

**Both bugs must be fixed for the crop to appear updated:**
1. Save the animalId before calling closeCropEditor, or move closeCropEditor after the refresh.
2. Append a cache-buster to the crop URL (e.g. `cropUrl + '?v=' + Date.now()`) either server-side in the `formatPhotoForApi` response, or client-side when rendering the slot-1 img after a save.

**The endpoint, worker, DB update, and crop file are all correct.** The save chain works — it's purely a client-side refresh + browser cache issue.
