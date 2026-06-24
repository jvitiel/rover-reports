# Rotate Button Cache Bug — Read-Only Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only. No writes, no code changes.

---

## 1. Detail View Image Render on Open

When a volunteer record is opened, `volOpenDetail(id)` fetches the record and populates `volFileUrls`:

**dashboard/index.html:14335**
```js
volFileUrls = vol.original_files ? JSON.parse(vol.original_files) : [];
```

The `original_files` column stores bare paths — no query parameters:
```json
["/data/volunteer-files/da10d71e-.../page-01.jpg","/data/volunteer-files/da10d71e-.../page-02.jpg", ...]
```

These bare URLs flow directly into the thumb render:

**dashboard/index.html:13817**
```js
volFileUrls.forEach((url, i) => {
  thumbsEl.innerHTML += `<div class="vol-scan-thumb-wrap"><img class="vol-scan-thumb" src="${url}" ...>...`;
});
```

**Confirmed:** When re-opening a record, the `<img>` src is the bare `/data/volunteer-files/{uuid}/page-NN.jpg` — no `?v=` cache-buster. The in-memory `?v=` values set by the rotate function are lost because `volFileUrls` is repopulated from `original_files` (which is never updated with `?v=` — the rotate endpoint doesn't modify the DB).

---

## 2. The Static Cache

**server.ts:10715**
```js
app.use('/data', express.static(path.join(ROOT_DIR, 'data'), { maxAge: '1h' }));
```

Express sends `Cache-Control: public, max-age=3600` on all `/data/*` responses. When the browser first loads a volunteer image, it caches that response for up to 1 hour. Subsequent requests to the **same URL** within that window get the cached copy — the browser doesn't even contact the server.

**Confirmed:** The bare path `/data/volunteer-files/{uuid}/page-01.jpg` is the same URL before and after rotation (the file is overwritten in place, same path). The browser's cache key is the URL. With no `?v=` to differentiate, the browser serves the pre-rotation cached copy.

---

## 3. Why Hard Reload Works But Re-Open Doesn't

**Hard reload** (Ctrl+Shift+R / Cmd+Shift+R): The browser bypasses the cache entirely and re-fetches all resources from the server. The server reads the rotated file from disk and serves it. The image appears correctly rotated.

**Re-opening the record** (clicking a different volunteer row, then clicking back): The SPA re-runs `volOpenDetail(id)`, which re-parses `original_files` into `volFileUrls` — bare paths, no `?v=`. The thumb render sets `<img src="/data/volunteer-files/{uuid}/page-01.jpg">`. The browser sees this is a URL it already has cached (within the 1h window) and serves the cached pre-rotation copy without contacting the server.

**The mechanism:**
1. John opens record → images load and cache (pre-rotation)
2. John clicks rotate → endpoint rotates file on disk, returns `?v=1234` URL → browser fetches the `?v=1234` URL (cache miss, new URL) → shows rotated ✅
3. John navigates away → the in-memory `volFileUrls` (with `?v=1234`) is discarded
4. John re-opens the record → `volFileUrls` repopulated from `original_files` (bare paths) → `<img src="...page-01.jpg">` (no `?v=`) → browser cache hit → serves stale pre-rotation image ❌

The `?v=` only lives in the JavaScript variable `volFileUrls` during the current view session. It's never persisted to `original_files` in the DB, so it's lost on re-open.

---

## 4. Fix Options

### Option A — Cache-bust on render (simplest, recommended)

Append `?v=Date.now()` to every scan image URL when rendering thumbnails on record open.

**Where it goes — two locations:**

**1. Thumb render at dashboard/index.html:13817:**
```js
// Before (current):
volFileUrls.forEach((url, i) => {
  thumbsEl.innerHTML += `<div class="vol-scan-thumb-wrap"><img class="vol-scan-thumb" src="${url}" ...>...`;
});

// After (fix):
const cacheBust = Date.now();
volFileUrls.forEach((url, i) => {
  const bustUrl = url.split('?')[0] + '?v=' + cacheBust;
  thumbsEl.innerHTML += `<div class="vol-scan-thumb-wrap"><img class="vol-scan-thumb" src="${bustUrl}" ...>...`;
});
```

**2. volOpenScan (lightbox) at dashboard/index.html:14355:**
The lightbox already receives the URL from the onclick — if thumbs pass `bustUrl`, the lightbox gets it automatically via `onclick="volOpenScan('${bustUrl}')"`.

**Downside:** Re-fetches all scan images every time a record is opened (even if nothing changed). For 3–6 images at ~400–500KB each, this is ~2MB — trivial on any connection, and volunteer records are opened infrequently.

**Note:** The same `cacheBust` value should also be used in the re-render inside `volRotateImage()` and `volRotateFromLightbox()` — but those already use the endpoint's `?v=` response, which is a different (later) timestamp. That's fine: the key point is that the *initial* render on open also gets a `?v=`.

### Option B — File mtime-based cache-bust

Have the GET /api/volunteers/:id endpoint (or a new endpoint) return each file's mtime alongside the path, so the frontend can use `?v=<mtime>` instead of `Date.now()`. Only re-fetches when the file actually changed.

**Downside:** More server-side work (stat each file, modify the API response shape). Over-engineered for the use case — volunteer scans are opened rarely and there are only a handful per record.

### Option C — Reduce/remove maxAge for volunteer-files

Change the static mount or add a separate mount for volunteer-files with `maxAge: 0` or a short duration.

**Downside:** Affects all `/data/*` caching (animal photos, thumbnails, crops, videos) unless a separate mount is added specifically for volunteer-files. A separate mount is viable but less targeted than fixing the render.

### Recommendation

**Option A.** One `const cacheBust = Date.now();` line before the thumb render loop, and threading `bustUrl` through the `<img>` src and onclick. ~3 lines changed. No server/DB/API changes. The re-fetch cost is negligible for the handful of scan images per record.

---

## Summary

| Aspect | Finding |
|--------|---------|
| Root cause | Re-opening a record re-reads `original_files` (bare paths, no `?v=`). Browser serves 1h-cached pre-rotation copy. |
| Hard reload works | Bypasses cache, re-fetches from disk (rotated file). |
| In-memory `?v=` lost | Set by rotate function, never persisted to DB, discarded on re-open. |
| Fix | Append `?v=Date.now()` at thumb render time (dashboard:13817). ~3 lines. |
| Downside | Re-fetches images on every record open (~2MB, trivial). |
