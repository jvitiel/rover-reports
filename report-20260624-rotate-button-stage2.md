# Rotate Button — Stage 2 Implementation

**Date:** 2026-06-24  
**Commit:** 6107592  
**Scope:** dashboard/index.html only (67 insertions, 3 deletions). Builds on Stage 1 endpoint (be871a4).

---

## CSS Additions (lines 5024–5042)

```css
/* Thumb wrapper + hover-visible rotate button */
.vol-scan-thumb-wrap { position: relative; display: inline-block; }
.vol-rotate-btn { position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.6); color: #fff;
  border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 16px;
  line-height: 28px; text-align: center; opacity: 0; transition: opacity 0.15s; padding: 0; }
.vol-scan-thumb-wrap:hover .vol-rotate-btn { opacity: 1; }

/* Lightbox rotate button */
.vol-lightbox-rotate { position: absolute; top: 16px; right: 70px; color: #fff; font-size: 18px;
  cursor: pointer; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4);
  border-radius: 6px; padding: 4px 12px; }
.vol-lightbox-rotate:hover { background: rgba(255,255,255,0.35); }
```

---

## Thumb Render (line 13817)

Before:
```js
thumbsEl.innerHTML += `<img class="vol-scan-thumb" src="${url}" ...>`;
```

After:
```js
thumbsEl.innerHTML += `<div class="vol-scan-thumb-wrap">
  <img class="vol-scan-thumb" src="${url}" alt="Page ${i+1}" onclick="volOpenScan('${url}')">
  <button class="vol-rotate-btn" onclick="event.stopPropagation(); volRotateImage(${i})" title="Rotate 90° CW">↻</button>
</div>`;
```

Each thumb wrapped in `.vol-scan-thumb-wrap`. Rotate button uses `event.stopPropagation()` so it doesn't also trigger `volOpenScan`.

---

## Lightbox (lines 14355–14362)

Before:
```js
overlay.onclick = () => overlay.remove();
overlay.innerHTML = `<button class="vol-lightbox-close">...</button><img src="${url}">`;
```

After:
```js
overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
overlay.innerHTML = `
  <button class="vol-lightbox-close" onclick="event.stopPropagation(); this.parentElement.remove()">&times;</button>
  <button class="vol-lightbox-rotate" onclick="event.stopPropagation(); volRotateFromLightbox(this)"
    data-url="${cleanUrl}" data-index="${idx}">↻ Rotate</button>
  <img src="${url}" alt="Scan">`;
```

Key changes:
- Overlay close now checks `e.target === overlay` (only closes on background click, not on child element clicks)
- Close button has `event.stopPropagation()`
- Rotate button has `event.stopPropagation()` + carries `data-url` (clean path) and `data-index` (volFileUrls index)
- `cleanUrl` strips any `?v=` from the URL before storing in `data-url`

---

## Functions (lines 14365–14420)

### volStripQuery(url)
Strips `?v=...` query string from URL. Used before sending to endpoint (regex rejects query params).

### async volRotateImage(index)
1. Strips `?v=` from `volFileUrls[index]`
2. POSTs clean path to `/api/volunteers/rotate-image`
3. On success: updates `volFileUrls[index]` to response URL (with `?v=timestamp`), re-renders all thumbs
4. On error: alert + console.error, doesn't break the view

### async volRotateFromLightbox(btn)
1. Reads clean path from `btn.dataset.url`, index from `btn.dataset.index`
2. POSTs to endpoint
3. On success: updates lightbox `<img>` src, updates `volFileUrls[index]`, re-renders thumbs (both lightbox and thumbnail reflect the rotation)
4. On error: alert + console.error

---

## Verification (Throwaway Test)

**Test image:** Created `00000000-0000-0000-0000-000000000000/page-01.jpg` — copy of Kayla's page-04 (the correct orient=6 image, 2000×1500).

### Test 1: First rotate
- Before: 2000×1500, Orientation=RightTop
- After: 1500×2000, Orientation=TopLeft ✅
- Response: `?v=1782343597602` ✅
- Backup created (`.bak-rotate`) ✅

### Test 2: Second rotate (repeatable)
- After 2nd: 2000×1500 (rotated again), Orientation=TopLeft ✅
- Backup NOT overwritten (mtime identical) ✅
- New `?v=` timestamp ✅

### Test 3: ?v= stripping
- Endpoint rejects path with `?v=123` (400 "Invalid file path format") ✅
- JS `volStripQuery()` strips `?v=` before sending — the two layers work together

### Test 4: stopPropagation
- Thumb rotate button: `event.stopPropagation()` prevents `volOpenScan` from firing ✅
- Lightbox rotate button: `event.stopPropagation()` prevents overlay close ✅
- Lightbox close: only fires on `e.target === overlay` (background click) or close button — rotate clicks don't close ✅

### Test 5: Persistence on reload
- Rotation is baked into the file on disk (ImageMagick overwrites in place)
- Page reload serves the rotated file — rotation persists ✅

### Test 6: Real 10 sideways images untouched
| Record | UUID | Files | Status |
|--------|------|-------|--------|
| Kayla McGregor (452) | da10d71e-... | 4 files, mtimes Jun 22 21:12 | ✅ Untouched |
| Sydney Ferst (431) | 88fe920a-... | 4 files, mtimes Jun 3 23:55 | ✅ Untouched |
| Alison Garcia (432) | b8b5a700-... | 4 files, mtimes Jun 4 00:23 | ✅ Untouched |
| Idan Meoded (444) | ae28ac5d-... | 4 files, mtimes Jun 14 15:50 | ✅ Untouched |

Zero `.bak-rotate` files across all volunteer-files (after throwaway cleanup).

### Cleanup
Throwaway dir `00000000-0000-0000-0000-000000000000` removed. Confirmed no `.bak-rotate` files remain.

---

## Deviations

None.

---

## Commit

```
6107592 dashboard: per-image rotate button on volunteer scans (thumb hover + lightbox, calls rotate-image endpoint, cache-bust refresh)
 1 file changed, 67 insertions(+), 3 deletions(-)
```

Only `dashboard/index.html` committed (explicit `git add dashboard/index.html`, not `git add -A`).

---

## Ready for John

The 10 sideways images across 4 records are ready for manual correction:
- Open each volunteer record in the dashboard
- Hover the sideways thumbnail → click ↻ (or open lightbox → click ↻ Rotate)
- Click until the image is upright (1–3 clicks depending on starting orientation)
- Rotation is permanent (baked into the file, backup preserved as `.bak-rotate`)
