# Rotate Button — Read-Only Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only. Fresh file:line references for all code surfaces needed to build a per-image rotate button on volunteer scan images.

---

## 1. File Serving

Volunteer images are stored at `/home/shelter/shelter-apps/data/volunteer-files/{uuid}/page-NN.jpg`. Served via Express static:

**server.ts:10667**
```ts
app.use('/data', express.static(path.join(ROOT_DIR, 'data'), { maxAge: '1h' }));
```

URLs in the DB (`original_files` JSON column) look like `/data/volunteer-files/{uuid}/page-01.jpg`. The `maxAge: '1h'` cache header means rotated images need a cache-buster (`?v=timestamp`) to show immediately.

ROOT_DIR is `/home/shelter/shelter-apps` (server.ts:257).

---

## 2. Thumbnail Rendering (Detail View)

**dashboard/index.html:13811–13812**
```js
volFileUrls.forEach((url, i) => {
  thumbsEl.innerHTML += `<img class="vol-scan-thumb" src="${url}" alt="Page ${i+1}" onclick="volOpenScan('${url}')">`;
});
```

`volFileUrls` is populated from two paths:
- **OCR upload flow** (line 13688): `volFileUrls = data.data.fileUrls || [];`
- **Detail view load** (line 14330): `volFileUrls = vol.original_files ? JSON.parse(vol.original_files) : [];`

Thumbnails render in `#volScanThumbs` (HTML at line 6362). CSS at line 5024: 120×160px, object-fit: cover.

**To add a rotate button**: each thumb needs a sibling button. Currently the thumbs are rendered via `innerHTML +=` concatenation — the rotate button goes inside the same loop.

---

## 3. Lightbox Rendering

**dashboard/index.html:14350–14355**
```js
function volOpenScan(url) {
  const overlay = document.createElement('div');
  overlay.className = 'vol-lightbox';
  overlay.onclick = () => overlay.remove();
  overlay.innerHTML = `<button class="vol-lightbox-close" onclick="this.parentElement.remove()">&times;</button><img src="${url}" alt="Scan">`;
  document.body.appendChild(overlay);
}
```

Lightbox is a full-screen overlay with a single `<img>`. CSS at lines 5035–5037: max 90vw/90vh, centered.

**Rotate button in lightbox**: add a rotate button next to the close button. After rotation, update the img src with cache-buster and also update the corresponding thumbnail.

---

## 4. ImageMagick Pattern (Existing)

**server.ts:9271** — the existing convert call at volunteer upload ingestion:
```ts
execSync(`convert "${filePath}" -resize "2000x2000>" -quality 85 "${filePath}"`, { timeout: 15000 });
```

This is the pattern to reuse. For rotation:
```
convert "${filePath}" -rotate 90 -quality 85 "${filePath}"
```

Plus EXIF orientation reset:
```
mogrify -orient top-left "${filePath}"
```

Or combined:
```
convert "${filePath}" -rotate 90 -orient top-left -quality 85 "${filePath}"
```

---

## 5. Path Validation Requirements

The endpoint MUST validate that the requested path:
1. Starts with `/data/volunteer-files/`
2. Contains only a UUID directory and a page-NN filename
3. Resolves to a real file within `/home/shelter/shelter-apps/data/volunteer-files/`
4. Does NOT contain `..` or path traversal

The UUID format is `{8}-{4}-{4}-{4}-{12}` hex chars. The filename is `page-NN.ext` (jpg or png).

---

## 6. Volunteer File Ownership

Files are owned by shelter:shelter (created during the upload endpoint which runs as the shelter-app service user). The convert/mogrify command in the endpoint will also run as shelter (same service process). No ownership issues.

---

## 7. Endpoint Design

**POST /api/volunteers/rotate-image**

Request body:
```json
{ "filePath": "/data/volunteer-files/{uuid}/page-01.jpg" }
```

Response:
```json
{ "success": true, "url": "/data/volunteer-files/{uuid}/page-01.jpg?v=1719270000" }
```

Steps:
1. Validate filePath format (regex: `/^\/data\/volunteer-files\/[0-9a-f-]{36}\/page-\d{2}\.(jpg|png)$/`)
2. Resolve to absolute path, verify file exists
3. Back up original: `cp file file.bak-rotate` (first rotation only — don't overwrite existing backup)
4. Run `convert "${absPath}" -rotate 90 -orient top-left -quality 85 "${absPath}"`
5. Return URL with `?v=Date.now()` cache-buster

---

## 8. Dashboard UI Changes

### Thumbnail area (line 13811–13812)
Wrap each thumb in a container div with a rotate button overlay:

```js
volFileUrls.forEach((url, i) => {
  thumbsEl.innerHTML += `
    <div class="vol-scan-thumb-wrap" style="position:relative;display:inline-block">
      <img class="vol-scan-thumb" src="${url}" alt="Page ${i+1}" onclick="volOpenScan('${url}')">
      <button class="vol-rotate-btn" onclick="volRotateImage(${i})" title="Rotate 90° CW">↻</button>
    </div>`;
});
```

### Lightbox (line 14354)
Add rotate button next to close button:
```js
overlay.innerHTML = `
  <button class="vol-lightbox-close" onclick="this.parentElement.remove()">&times;</button>
  <button class="vol-lightbox-rotate" onclick="volRotateFromLightbox(this)" data-url="${url}">↻ Rotate</button>
  <img src="${url}" alt="Scan">`;
```

### volRotateImage(index) function
```
POST /api/volunteers/rotate-image with { filePath: volFileUrls[index] }
On success: update volFileUrls[index] to response.url, re-render thumbs
```

### volRotateFromLightbox(btn)
```
POST /api/volunteers/rotate-image with { filePath: btn.dataset.url }
On success: update lightbox img src, update corresponding thumb, update volFileUrls
```

---

## 9. CSS Additions Needed

```css
.vol-scan-thumb-wrap { position: relative; display: inline-block; }
.vol-rotate-btn { position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.6); color: #fff;
  border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 16px;
  opacity: 0; transition: opacity 0.15s; }
.vol-scan-thumb-wrap:hover .vol-rotate-btn { opacity: 1; }
.vol-lightbox-rotate { position: absolute; top: 16px; right: 70px; color: #fff; font-size: 18px;
  cursor: pointer; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4);
  border-radius: 6px; padding: 4px 12px; }
```

---

## 10. No DB Change Needed

The file is overwritten in place. The `original_files` JSON column stores the same path. The only difference is file contents on disk. Cache-busting is display-side only (query parameter, not stored).

---

## 11. Summary of Touches

| File | Lines | What |
|------|-------|------|
| server/src/server.ts | ~10067 (new endpoint, between GET/:id and PATCH/:id) | POST /api/volunteers/rotate-image |
| dashboard/index.html | 5024–5037 (CSS) | Add .vol-rotate-btn, .vol-scan-thumb-wrap, .vol-lightbox-rotate |
| dashboard/index.html | 13811–13812 (thumb render) | Wrap thumbs in container, add rotate button |
| dashboard/index.html | 14350–14355 (lightbox) | Add rotate button in overlay |
| dashboard/index.html | ~14356 (new functions) | volRotateImage(), volRotateFromLightbox() |

Two files. ~50 lines server, ~40 lines dashboard.
