# Create-Path MIME Check — Residual B Diagnosis

## 1. Validation Code

The only file-type check is the multer `fileFilter` callback (server.ts:9642–9645):

```ts
const volunteerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB per file
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    cb(null, allowed.includes(file.mimetype));
  },
});
```

After multer accepts the file, the handler at server.ts:9648–9710 saves files to disk and processes them. There is **no secondary byte-level validation** — no `file --mime-type`, no magic-number inspection, no buffer signature check. The `file.mimetype` value from multer is trusted for all downstream decisions (PDF branch vs image branch, extension selection). [VERIFIED — full handler inspected, zero byte-sniff calls]

## 2. Verdict: HEADER-TRUST

**HEADER-TRUST.** The check is `allowed.includes(file.mimetype)` where `file.mimetype` is set by multer from the client-supplied `Content-Type` in the multipart form field. Multer does not inspect file bytes — it copies the MIME type verbatim from the `Content-Type` header of the multipart part.

This is **not a content-sniff**. The actual bytes of the file are never examined for type validation. [VERIFIED]

## 3. Concrete Vector

An SVG or HTML file sent with `Content-Type: image/png` would be **ACCEPTED and STORED**:

1. Multer's `fileFilter` sees `file.mimetype === 'image/png'` → `allowed.includes('image/png')` → `true` → file accepted into `req.files`
2. Handler enters the else branch (not PDF): `file.mimetype === 'image/png'` → `ext = 'png'`
3. File is written to disk as `page-NN.png` with the original (SVG/HTML) bytes intact
4. ImageMagick `convert` resize runs — for SVG, ImageMagick would likely succeed (it can render SVG); for HTML, it would likely fail but the error is caught and the raw HTML bytes remain on disk as `page-NN.png`
5. The file path is stored in `original_files` JSON and served inline via `GET /api/docs/volunteer-file/:uuid/:file` with `Content-Type: image/png`

**Result:** A disguised SVG (with embedded `<script>`) stored as `.png` and served with `Content-Type: image/png` to staff browsers. Browser behavior varies — modern browsers generally won't execute script in a resource served as `image/png`, but older browsers or specific contexts (e.g. if the file is opened directly by URL rather than loaded as an `<img>` src) may sniff the content. The served file would also pass through the gated blob URL path (`gatedBlobUrl` → object URL), which adds another layer, but the raw file on disk contains the attacker's bytes regardless.

[VERIFIED — reasoned from code path, no upload performed]

## 4. Bottom Line

**Residual B is a LIVE HOLE.** The create path (`POST /api/volunteers/upload`) trusts the client-supplied `Content-Type` via multer's `file.mimetype`. Disguised bytes (SVG/HTML sent as `image/png`) would be accepted, stored, and served to staff.

**Fix:** Port the content-sniff from the new endpoint (`POST /api/volunteers/:id/upload-scan`) — write each buffer to a temp file, run `file --mime-type -b`, reject if the detected type is not in `{image/jpeg, image/png, application/pdf}`. The sniff runs after multer's first-pass filter and before any disk write. The pattern is already proven and deployed on the new endpoint.

Note: Both endpoints share the same `volunteerUpload` multer instance, so the multer-level `fileFilter` would remain as a fast first-pass reject (e.g. someone sending `Content-Type: text/plain` gets rejected immediately). The byte-sniff is the second-pass defense against disguised headers.
