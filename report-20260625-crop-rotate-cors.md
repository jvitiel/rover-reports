# Crop Rotate CORS Test — Read-Only Diagnosis

**Date:** 2026-06-25  
**Scope:** Read-only. No writes, no code changes.

---

## 1. SM CORS Headers — Present ✅

Tested Handsome's SM image URL:
```
https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&mediaid=9275&ts=1780696653.0
```

### First hop (303 redirect):
```
HTTP/1.1 303 See Other
Server: Apache/2.4.67 (Debian)
Location: https://us01d.sheltermanager.com/service?account=gw3095&method=media_image&mediaid=9275&ts=1780696653.0
Access-Control-Allow-Origin: *
Cache-Control: public, max-age=3600, s-maxage=3600
Content-Type: text/html
```

### Final response (200 image):
```
HTTP/1.1 200 OK
Server: Apache/2.4.67 (Debian)
Cache-Control: public, max-age=86400, s-maxage=86400
Access-Control-Allow-Origin: *
Content-Type: image/jpeg
```

**Both responses send `Access-Control-Allow-Origin: *`.**

This means a browser canvas CAN read the pixel data and call `toDataURL()` — the canvas will NOT be tainted — **as long as the `<img>` element has `crossOrigin="anonymous"` set before loading the image.**

---

## 2. Current Editor Display — Plain Cross-Origin `<img>` (No crossOrigin Attribute)

**dashboard/index.html:6522:**
```html
<img id="cropEditorImg" src="" alt="Original photo" draggable="false">
```

No `crossOrigin` attribute. Currently this is fine — browsers display cross-origin images without CORS. But drawing a cross-origin `<img>` (loaded without `crossOrigin="anonymous"`) onto a canvas **taints it** regardless of the server's CORS headers. The `crossOrigin` attribute must be set **before** the image loads for the browser to make a CORS request.

### What needs to change (trivial):

**Option 1 — HTML attribute:**
```html
<img id="cropEditorImg" src="" alt="Original photo" draggable="false" crossorigin="anonymous">
```

**Option 2 — In openCropEditor (dashboard:15788):**
```js
img.crossOrigin = 'anonymous';
img.src = originalUrl;
```

Either works. The `crossOrigin="anonymous"` attribute tells the browser to make a CORS request. Since SM sends `Access-Control-Allow-Origin: *`, the CORS preflight passes, and the canvas is clean (not tainted).

---

## 3. Proxy Option — Not Needed

Since SM sends `Access-Control-Allow-Origin: *`, a same-origin proxy is **not required**. Adding `crossOrigin="anonymous"` to the `<img>` element is sufficient.

For reference, a proxy would be feasible (the crop worker already downloads SM images via `requests.get()` in `resolve_source_image`, crop-worker.py:57), but it's unnecessary given the CORS headers.

---

## 4. Server-Side Rotated Preview — Not Needed

A server-side preview (server downloads SM image, rotates it, returns a same-origin rotated JPEG) would avoid CORS entirely, but it's over-engineered given that:
1. SM sends `Access-Control-Allow-Origin: *`
2. Adding `crossOrigin="anonymous"` is a one-attribute change
3. Client-side canvas rotation is instant (no server round-trip for the preview)
4. Server-side preview adds latency (download SM image + rotate + serve back) for every rotate click

The server-side approach would only be needed if SM ever removes the CORS header. For now, client-side canvas is cleaner, faster, and simpler.

---

## 5. Recommendation: Plain Canvas Approach ✅

**SM sends `Access-Control-Allow-Origin: *` on both the redirect and the final image response.** The plain canvas approach (from the coordinate math report) works with ONE addition:

**Add `crossOrigin="anonymous"` to `cropEditorImg`** — either in the HTML (line 6522) or in `openCropEditor` before setting `src` (line 15788).

No proxy needed. No server-side preview needed. The canvas rotation approach scoped in the coordinate math report is viable as-is.

### Checklist:
1. ✅ SM CORS: `Access-Control-Allow-Origin: *` on both hops
2. ⚠️ `crossOrigin="anonymous"` must be added to `cropEditorImg` (currently missing)
3. ✅ Canvas `toDataURL()` will work once crossOrigin is set
4. ✅ No proxy or server-side preview needed
5. ✅ Build as scoped in the coordinate math report

### Risk note:
If ShelterManager ever removes the `Access-Control-Allow-Origin: *` header, the canvas approach would break. At that point, a server-side proxy or preview would be needed. But SM has had this header on their media API for as long as we've been integrating — it's standard for media APIs to allow cross-origin access. Low risk.
