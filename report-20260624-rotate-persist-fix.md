# Rotate Persistence Fix — Implementation

**Date:** 2026-06-24  
**Commit:** bb534ca  
**Scope:** dashboard/index.html only (3 insertions, 1 deletion).

---

## Change

**Before (dashboard/index.html:13816–13818):**
```js
volFileUrls.forEach((url, i) => {
  thumbsEl.innerHTML += `<div class="vol-scan-thumb-wrap"><img class="vol-scan-thumb" src="${url}" alt="Page ${i+1}" onclick="volOpenScan('${url}')">...`;
});
```

**After (dashboard/index.html:13816–13820):**
```js
const cacheBust = Date.now();
volFileUrls.forEach((url, i) => {
  const bustUrl = url.split('?')[0] + '?v=' + cacheBust;
  thumbsEl.innerHTML += `<div class="vol-scan-thumb-wrap"><img class="vol-scan-thumb" src="${bustUrl}" alt="Page ${i+1}" onclick="volOpenScan('${bustUrl}')">...`;
});
```

Three lines added:
1. `const cacheBust = Date.now();` — one timestamp per render (all images in a record share it)
2. `const bustUrl = url.split('?')[0] + '?v=' + cacheBust;` — strips any existing `?v=`, appends fresh one
3. `bustUrl` threaded through both `<img src>` and `onclick="volOpenScan('${bustUrl}')"` — so lightbox also gets the fresh URL

---

## Why This Fixes It

The bug: `original_files` stores bare paths (`/data/volunteer-files/{uuid}/page-01.jpg`). Re-opening a record re-reads these bare paths and renders `<img src="bare path">`. The static mount (server.ts:10715) sends `Cache-Control: max-age=3600`, so the browser serves its cached pre-rotation copy (same URL = cache hit).

The fix: every render appends `?v=<timestamp>`. Since the timestamp changes on each re-open, the browser treats it as a new URL (cache miss) and fetches the current file from the server — which is the rotated version.

---

## No Conflict with Rotate Functions

The rotate functions (`volRotateImage`, `volRotateFromLightbox`) set `volFileUrls[index] = data.url` where `data.url` is the endpoint's returned `?v=<endpoint-timestamp>`. They then re-render using that URL directly. `volStripQuery()` strips any `?v=` before sending to the endpoint. The render-time bust and the rotate bust use different timestamps but the same `?v=` parameter — no conflict, the later one always wins.

---

## Verification

### Throwaway test
- Created `00000000-0000-0000-0000-000000000000/page-01.jpg` (copy of Kayla's page-04)
- Rotated via endpoint: 2000×1500 RightTop → 1500×2000 TopLeft ✅
- Server serves rotated file on both bare URL and `?v=` URL (same ETag/Last-Modified) ✅
- The `?v=` makes the browser treat it as a new cache entry — on re-open, the new `?v=Date.now()` forces a fresh fetch ✅

### Rotate buttons still work
- `volRotateImage`: uses `volStripQuery()` to strip `?v=` before sending clean path to endpoint, sets `volFileUrls[index] = data.url` (endpoint's `?v=`) on success, re-renders. Unmodified. ✅
- `volRotateFromLightbox`: same pattern, also updates lightbox `<img>` src. Unmodified. ✅

### Real images
- John already rotated Kayla's pages 1–3 using the button (backups at `.bak-rotate`, current files are 1500×2000 TopLeft) — this happened at ~23:28–23:30 UTC, before this fix
- Page-04 untouched (was already correct)
- No `.bak-rotate` files were created by this test (throwaway cleaned up)

### Throwaway cleaned
- Test dir `00000000-0000-0000-0000-000000000000` removed ✅

---

## Deviations

None.

---

## Commit

```
bb534ca dashboard: cache-bust volunteer scan images on render (fix stale image on re-open after rotation)
 1 file changed, 3 insertions(+), 1 deletion(-)
```

Only `dashboard/index.html` committed (explicit `git add dashboard/index.html`).
