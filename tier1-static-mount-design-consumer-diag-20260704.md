# Tier-1 Static Mount Closure — Design + Consumer Diagnosis

## 1. Re-Exposure Design Check

### isGatedPath Is Prefix-Specific, NOT All /api/*

```ts
function isGatedPath(p: string): boolean {
  return (
    p === '/api/volunteers'
    || p.startsWith('/api/volunteers/')
    || p === '/api/adoption-applications'
    || p === '/api/dashboard/behavior-notes'
  );
}
```
[VERIFIED]

**⚠️ New `/api/docs/*` routes would NOT be auto-gated.** `isGatedPath` does not cover all `/api/*` — it gates only the 4 patterns listed above. Adding `/api/docs/*` routes requires adding `|| p.startsWith('/api/docs/')` to the predicate. That's one line, not zero — flag it. [VERIFIED]

### Can We Remove express.static('/data') Entirely?

**No — not yet.** The `/data` mount serves 6 subdirectories. Removing it entirely breaks Tier-2 and infrastructure paths that must keep working:

| Subpath | Classification | Must Keep Working? | Notes |
|---------|---------------|-------------------|-------|
| `/data/volunteer-files/` | **Tier-1 PII** — scanned handwritten volunteer apps | Close+regate now | Dashboard only consumer |
| `/data/shelter.db` | **Tier-1 PII** — entire database | **BLOCK now** | No legitimate web consumer |
| `/data/shelter.db-shm`, `shelter.db-wal` | **Tier-1 PII** — WAL journal | **BLOCK now** | No legitimate web consumer |
| `/data/animal-photos/` | Tier-2 — animal photos (staff names in filenames) | Yes (Tier-2, later) | Used by dogwalker/staff/dashboard/matcher PWAs via API-constructed URLs |
| `/data/animal-recordings/` | Tier-2 — audio/video recordings | Yes (Tier-2, later) | Used by dogwalker/staff PWAs |
| `/data/animal-media/` | Tier-2 — video/thumbnails/crops | Yes (Tier-2, later) | Used by dashboard+PWAs |
| `/data/library-photos/` | Tier-2 — shelter library photos | Yes (Tier-2, later) | Used by staff/dashboard |
| `/data/featured-videos/` | Infrastructure — animal feature videos | **Yes — WordPress** | Caddy HTTP-IP block routes `/data/featured-videos*` for WordPress. No auth needed (public website content). |

[VERIFIED — all paths confirmed via filesystem listing and grep of server.ts consumers]

**Recommended approach:** Keep the `/data` express.static mount for now, but add middleware BEFORE it that blocks the DB files and volunteer-files. Specifically:

```ts
app.use('/data', (req, res, next) => {
  // Block database files
  if (/^\/shelter\.db/.test(req.path)) return res.status(404).end();
  // Block volunteer files (require gate)
  if (req.path.startsWith('/volunteer-files/')) {
    // ... gate check ...
  }
  next();
});
app.use('/data', express.static(...));
```

Or: create the new `/api/docs/volunteer-file/:uuid/:file` gated route AND add a deny middleware for `/data/volunteer-files/` on the static mount. The static mount stays for Tier-2 paths. [INFERRED]

### Streaming Route Requirements

For each new `/api/docs/` route:
- **Content-Type:** Must set correct MIME (`application/pdf` for PDFs, `audio/webm` for voice notes, `image/jpeg`/`image/png` for scans) [INFERRED]
- **Content-Disposition:** PDFs should be `inline` (browser displays in-tab). Audio should have no Content-Disposition (browser handles `<audio>` natively). Scans should be inline. [INFERRED]
- **Path traversal prevention:** Validate `:id` is integer, `:uuid` matches `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/`, `:file` matches `/^page-\d{2}\.(jpg|png)$/` (mirrors existing `pathRegex` in rotate-image endpoint). Reject `..`, absolute paths. Use `path.resolve` + prefix check (pattern already exists in `POST /api/volunteers/rotate-image`). [VERIFIED — pattern available at symbol `pathRegex` in server.ts]
- **All parameters via bound/validated regex** — no string interpolation into filesystem paths without validation. [INFERRED]

## 2. Consumer Enumeration

### /adoption-pdfs Consumers

| # | Surface | File | Mechanism | URL Pattern | PII? | Notes |
|---|---------|------|-----------|-------------|------|-------|
| 1 | Dashboard | `dashboard/index.html` | `<a href="${a.pdfUrl}" target="_blank">` (bare link, no token) | `/adoption-pdfs/{id}-{Name}-{date}.pdf` | **YES** — completed applications | Must convert to gatedFetch → blob → window.open(blobUrl) |
| 2 | Adoption form (public) | `adoption-form.html` | `<a href="...blank-english.pdf">` (bare link) | `https://dogwalker.../adoption-pdfs/blank-english.pdf` | **NO** — blank template | **PUBLIC CONSUMER — must keep anonymous access to blank forms** |
| 3 | Adoption form (public) | `adoption-form.html` | `<a href="...blank-spanish.pdf">` (bare link) | `https://dogwalker.../adoption-pdfs/blank-spanish.pdf` | **NO** — blank template | Same |
| 4 | ES staging form (public) | `adoption-pdfs/test-adoption-es.html` | `<a href="...blank-english.pdf">` (bare link) | Same as #2 | **NO** — blank template | Same |
| 5 | ES staging form (public) | `adoption-pdfs/test-adoption-es.html` | `<a href="...blank-spanish.pdf">` (bare link) | Same as #3 | **NO** — blank template | Same |
| 6 | Matcher (public) | `matcher-web/index.html` | `<a href="...blank-english.pdf">` (bare link) | Same as #2 | **NO** — blank template | Same |
| 7 | Matcher (public) | `matcher-web/index.html` | `<a href="...blank-spanish.pdf">` (bare link) | Same as #3 | **NO** — blank template | Same |
| 8 | Server API | `server.ts` GET handler | Constructs `pdfUrl: '/adoption-pdfs/${pdfFile}'` in JSON response | Consumed by Dashboard (#1) | Data source for #1 | URL construction only |

[ALL VERIFIED]

**⚠️ PUBLIC CONSUMER FLAG (blank forms):** Items #2–7 are public-facing pages linking to **blank template PDFs** (`blank-english.pdf`, `blank-spanish.pdf`). These are NOT PII — they're empty application forms for download. They must remain anonymously accessible. Gating the entire `/adoption-pdfs/` mount would break these public download links.

**Design implication:** The `/api/docs/adoption-pdf/:id` route serves completed (PII) PDFs by ID. The blank template PDFs must either:
- (a) Stay in the static mount with a filename-pattern filter (gate only `{id}-*.pdf` files, allow `blank-*.pdf`), or
- (b) Be moved to `/public/forms/` (which is intentionally ungated) and the public links updated, or
- (c) Get their own ungated route like `GET /api/docs/adoption-form-blank/:lang`

[INFERRED — Auditor decision needed on approach]

**No other surfaces (PWAs, public pages, emails) link to completed adoption PDFs.** Only the dashboard. [VERIFIED]

### /data/volunteer-files Consumers

| # | Surface | File | Mechanism | URL Pattern | PII? | Notes |
|---|---------|------|-----------|-------------|------|-------|
| 1 | Dashboard | `dashboard/index.html` | `<img src="${bustUrl}">` (bare img, no token) | `/data/volunteer-files/{uuid}/page-{NN}.jpg` | **YES** — scan thumbnails | Must convert to gatedFetch → blob → objectURL for img.src |
| 2 | Dashboard | `dashboard/index.html` | `volOpenScan(url)` → `<img src="${url}">` in lightbox overlay | Same | **YES** — full-size scan view | Same blob conversion |
| 3 | Dashboard | `dashboard/index.html` | `fetch('/api/volunteers/rotate-image', { body: { filePath } })` | POST, sends path `/data/volunteer-files/{uuid}/page-NN.jpg` | Server-side FS operation | The rotate endpoint reads+writes the file via filesystem, NOT via HTTP. Uses `path.resolve(ROOT_DIR, filePath.replace(/^\//, ''))`. **Does not fetch via the static mount.** The `filePath` value format will need to match whatever new scheme is used (or stay as-is since it's a server-side FS path, not a URL). |
| 4 | Server API | `server.ts` volunteer upload | Constructs `path: '/data/volunteer-files/${uuid}/${file}'` stored in `original_files` JSON column | Data construction | Must update URL pattern if mount path changes |
| 5 | Server API | `server.ts` volunteer save | Constructs `fileUrls` as `'/data/volunteer-files/${tempId}/${f}'` stored in `original_files` | Data construction | Same |

[ALL VERIFIED]

**No other surfaces (PWAs, public pages, emails) reference volunteer-files.** Dashboard only. [VERIFIED]

**⚠️ Rotate-image interaction:** The `POST /api/volunteers/rotate-image` endpoint receives `/data/volunteer-files/{uuid}/page-NN.jpg` as `filePath` in the request body. It resolves this to an absolute filesystem path via `path.resolve(ROOT_DIR, filePath.replace(/^\//, ''))`. This is a **filesystem operation**, not an HTTP fetch — it does NOT go through the static mount. However, the `filePath` format stored in the DB (`original_files` column) is currently `/data/volunteer-files/{uuid}/page-NN.jpg`. If the serving URL changes to `/api/docs/volunteer-file/{uuid}/page-NN.jpg`, the rotate endpoint's `pathRegex` validation and `path.resolve` logic must be updated (or keep the old `/data/...` format for filesystem operations and use a separate URL format for HTTP serving). [VERIFIED]

### /intake-audio Consumers

| # | Surface | File | Mechanism | URL Pattern | PII? | Notes |
|---|---------|------|-----------|-------------|------|-------|
| 1 | Dashboard | `dashboard/index.html` | `audioEl.src = intake.voice_note_url` (bare audio src, no token) | `/intake-audio/{id}/voice_{timestamp}.webm` | **YES** — spoken content | Must convert to gatedFetch → blob → objectURL for audio.src |
| 2 | Email (plain text) | `emailService.ts` | Not directly — emails embed `https://dashboard...${intake.photo_url}` (photos only, NOT audio). Audio is NOT linked in emails. | N/A | N/A | Confirmed: no audio URL in emails. |

[ALL VERIFIED]

**No other surfaces reference intake-audio.** Dashboard only. [VERIFIED]

### /intake-photos (included for completeness — Tier-1 per sweep)

| # | Surface | File | Mechanism | URL Pattern | PII? | Notes |
|---|---------|------|-----------|-------------|------|-------|
| 1 | Dashboard | `dashboard/index.html` | `<img src="${intake.photo_url}" onclick="openLightbox(...)">` (bare img) | `/intake-photos/{id}/photo.jpg` | LOW-MOD — animal photos, sequential IDs | Must convert to gatedFetch → blob |
| 2 | Dashboard | `dashboard/index.html` | `await fetch(intake.photo_url)` → blob → base64 for PDF generation | Same | Same | Already uses fetch → blob internally for PDF — just needs token |
| 3 | Email (plain text) | `emailService.ts` | `Photo: https://dashboard.4lgshelterapp.duckdns.org${intake.photo_url}` in plain-text email body | Full HTTPS URL | **⚠️ PUBLIC CONSUMER** | Email recipients click this link with no token. If gated, the link breaks. |
| 4 | Email (HTML) | `emailService.ts` | `<img src="cid:intake-photo">` — inline CID attachment | N/A (embedded in email) | Not a URL fetch | No change needed — photo is read from filesystem and attached via CID |

[ALL VERIFIED]

**⚠️ PUBLIC CONSUMER FLAG (intake photo email link):** The plain-text email fallback (item #3) includes a clickable URL `https://dashboard.4lgshelterapp.duckdns.org/intake-photos/{id}/photo.jpg`. If this path is gated, email recipients cannot view the photo by clicking the link. The HTML version uses CID embedding (no URL), so this only affects plain-text email clients. **Auditor decision needed:** remove the plain-text URL, convert to CID-only, or leave intake-photos ungated (they're animal photos, low PII). [VERIFIED]

## 3. Every Serving Path

### Express Static Mounts (3 Tier-1 + parent)

```ts
// Line 10843 — adoption PDFs
app.use('/adoption-pdfs', express.static(getPdfDirectory()));
// getPdfDirectory() returns '/home/shelter/shelter-apps/adoption-pdfs'

// Line 10944 — /data (parent mount covering volunteer-files + shelter.db + Tier-2)
app.use('/data', express.static(path.join(ROOT_DIR, 'data'), { maxAge: '1h' }));

// Line 12025 — intake photos
app.use('/intake-photos', express.static(INTAKE_PHOTOS_DIR));
// INTAKE_PHOTOS_DIR = path.join(ROOT_DIR, 'intake-photos')

// Line 12026 — intake audio
app.use('/intake-audio', express.static(INTAKE_AUDIO_DIR, {
// INTAKE_AUDIO_DIR = path.join(ROOT_DIR, 'intake-audio')
```
[ALL VERIFIED]

### Caddy file_server Blocks

| Vhost | Path | Root | Content | PII? | Must Remove/Gate? |
|-------|------|------|---------|------|-------------------|
| dogwalker | `/adoption-pdfs/*` | `/home/shelter/shelter-apps` | Serves adoption PDFs directly from disk, bypassing Express entirely. Sets `Content-Disposition: inline`. | **YES — CRITICAL** | **YES — remove this block.** Even if Express is gated, this Caddy block serves the files without hitting Node. [VERIFIED] |
| dogwalker | `/test-adoption-es` | `/home/shelter/shelter-apps/adoption-pdfs` | Rewrites to `test-adoption-es.html` — a Spanish adoption form HTML page (staging). Not a completed application. | **NO** — form template HTML | No — not PII. Can leave. [VERIFIED] |
| draft | `/*` | `/var/www/draft` | Static draft website (HTML pages, images, CSS for the future fourlegsgoodnynj.org site). | **NO** — public website draft | No — not PII. [VERIFIED] |

### Rate Limiter staticPrefixes Entries to Remove/Update

```ts
const staticPrefixes = [
  '/staff/', '/staging-staff/', '/matcher/', '/dashboard/',
  '/volunteer/', '/dogwalker/', '/caregiver/', '/coordinator/',
  '/test-activity/', '/data/', '/public/', '/adoption-pdfs/',
  '/intake-photos/', '/intake-audio/', '/custom-search/',
];
```
[VERIFIED]

Entries relevant to Tier-1 closure:
- `'/adoption-pdfs/'` — remove (no longer a static path once gated via API) [INFERRED]
- `'/intake-audio/'` — remove (same) [INFERRED]
- `'/intake-photos/'` — remove if gating intake-photos too [INFERRED]
- `'/data/'` — **KEEP** (still serves Tier-2 animal content). But completed-PDF and volunteer-file requests will now go via `/api/docs/` which IS rate-limited by `globalLimiter`. [INFERRED]

## 4. Client Conversion Detail

### gatedFetch Helper — Does Not Exist Yet

`gatedFetch` was identified as needed during the adoptions PATCH diagnosis but was **never built**. Only `gatedGet` exists (GET-only, symbol `async function gatedGet(url)`). All conversions below need `gatedFetch` to be built first. [VERIFIED]

Proposed helper (one shared function for all conversions):

```js
async function gatedFetch(url, options = {}) {
  await _tokenReady;
  if (_piiGateToken) {
    options.headers = { ...(options.headers || {}), 'X-Gate-Token': _piiGateToken };
  }
  let resp = await fetch(url, options);
  if (resp.status === 401) {
    await fetchToken();
    if (_piiGateToken) {
      options.headers = { ...(options.headers || {}), 'X-Gate-Token': _piiGateToken };
    }
    resp = await fetch(url, options);
  }
  return resp;
}
```

Plus a blob helper for media elements:

```js
async function gatedBlobUrl(apiUrl) {
  const resp = await gatedFetch(apiUrl);
  if (!resp.ok) throw new Error(`Failed to fetch ${apiUrl}: ${resp.status}`);
  const blob = await resp.blob();
  return URL.createObjectURL(blob);
}
```
[INFERRED]

### Per-Consumer Conversion

| Consumer | Current Code | New Code | New API URL |
|----------|-------------|----------|-------------|
| Dashboard: adoption PDF link | `<a href="${a.pdfUrl}" target="_blank">` | `<a href="#" onclick="openGatedPdf(${a.id})">` → `gatedBlobUrl('/api/docs/adoption-pdf/${id}')` → `window.open(blobUrl)` | `GET /api/docs/adoption-pdf/:id` |
| Dashboard: volunteer scan thumbnails | `<img src="${bustUrl}">` | `img.src = await gatedBlobUrl('/api/docs/volunteer-file/${uuid}/${file}')` (set on load) | `GET /api/docs/volunteer-file/:uuid/:file` |
| Dashboard: volunteer scan lightbox | `<img src="${url}">` in overlay | Same blob pattern as thumbnails | Same |
| Dashboard: intake audio player | `audioEl.src = intake.voice_note_url` | `audioEl.src = await gatedBlobUrl('/api/docs/intake-audio/${id}/${file}')` | `GET /api/docs/intake-audio/:id/:file` |
| Dashboard: intake photo thumbnail | `<img src="${intake.photo_url}">` | `img.src = await gatedBlobUrl('/api/docs/intake-photo/${id}/${file}')` | `GET /api/docs/intake-photo/:id/:file` |
| Dashboard: intake photo for PDF gen | `await fetch(intake.photo_url)` → blob | `await gatedFetch('/api/docs/intake-photo/${id}/${file}')` → blob | Same |

[ALL INFERRED]

---

## Summary Tables

### (a) Consumer Map

| Surface | Mechanism | Old URL | New Gated URL | Conversion |
|---------|-----------|---------|---------------|------------|
| Dashboard — adoption PDF | `<a href>` bare link | `/adoption-pdfs/{id}-{Name}-{date}.pdf` | `GET /api/docs/adoption-pdf/:id` | gatedBlobUrl → window.open |
| Dashboard — vol scan thumb | `<img src>` bare | `/data/volunteer-files/{uuid}/page-NN.jpg` | `GET /api/docs/volunteer-file/:uuid/:file` | gatedBlobUrl → img.src |
| Dashboard — vol scan lightbox | `<img src>` bare | Same | Same | Same |
| Dashboard — vol rotate | `POST /api/volunteers/rotate-image` body `filePath` | `/data/volunteer-files/...` (FS path) | Keep FS path format (server-side FS op) | No URL change — validate same regex |
| Dashboard — intake audio | `<audio src>` bare | `/intake-audio/{id}/voice_{ts}.webm` | `GET /api/docs/intake-audio/:id/:file` | gatedBlobUrl → audio.src |
| Dashboard — intake photo | `<img src>` bare | `/intake-photos/{id}/photo.jpg` | `GET /api/docs/intake-photo/:id/:file` | gatedBlobUrl → img.src |
| Dashboard — intake photo PDF | `fetch()` bare | `/intake-photos/{id}/photo.jpg` | Same gated route | gatedFetch → blob |
| Adoption form (PUBLIC) | `<a href>` bare | `/adoption-pdfs/blank-english.pdf` | **KEEP UNGATED** | No change — blank template |
| Adoption form (PUBLIC) | `<a href>` bare | `/adoption-pdfs/blank-spanish.pdf` | **KEEP UNGATED** | No change — blank template |
| Matcher (PUBLIC) | `<a href>` bare | `/adoption-pdfs/blank-english.pdf` | **KEEP UNGATED** | No change |
| Matcher (PUBLIC) | `<a href>` bare | `/adoption-pdfs/blank-spanish.pdf` | **KEEP UNGATED** | No change |
| Email plain text | Clickable URL | `/intake-photos/{id}/photo.jpg` | **⚠️ FLAG** | See below |

### (b) Serving-Path Closure Checklist

| # | Type | Path/Block | Action |
|---|------|-----------|--------|
| 1 | Express static | `app.use('/adoption-pdfs', express.static(...))` | Add deny middleware for `/{id}-*.pdf` pattern; allow `blank-*.pdf` and `volunteer-application.pdf` through. Or move blanks to `/public/forms/` and remove entire mount. |
| 2 | Express static | `app.use('/data', express.static(...))` | Add deny middleware BEFORE mount: block `/shelter.db*` (404), block `/volunteer-files/*` (404 or gate). Keep other subpaths. |
| 3 | Express static | `app.use('/intake-photos', express.static(...))` | Add deny middleware or remove mount; serve via `/api/docs/intake-photo/:id/:file` |
| 4 | Express static | `app.use('/intake-audio', express.static(...))` | Remove mount; serve via `/api/docs/intake-audio/:id/:file` |
| 5 | Caddy file_server | dogwalker `@adoptionpdfs` block | **Remove** — bypasses Express entirely |
| 6 | Caddy /data proxy | 7 vhosts proxy `/data/*` to Express | Keep (Express deny middleware handles blocking) |
| 7 | Rate limiter | `'/adoption-pdfs/'` in staticPrefixes | Remove |
| 8 | Rate limiter | `'/intake-audio/'` in staticPrefixes | Remove |
| 9 | Rate limiter | `'/intake-photos/'` in staticPrefixes | Remove if gating |
| 10 | isGatedPath | Add `\|\| p.startsWith('/api/docs/')` | Required for new gated routes |

### (c) Public-Surface Consumers That Cannot Be Gated

| Consumer | URL | Content | Issue |
|----------|-----|---------|-------|
| **Adoption form + matcher — blank PDFs** | `/adoption-pdfs/blank-english.pdf`, `/adoption-pdfs/blank-spanish.pdf` | Empty application form templates (non-PII) | Public pages link to these for anonymous download. Must remain ungated. **Auditor decision:** move blanks to `/public/forms/` and update links, or filter the gate by filename pattern. |
| **Email plain-text — intake photo** | `https://dashboard.../intake-photos/{id}/photo.jpg` | Animal intake photo (low PII) | Plain-text email recipients click this link without auth. Gating breaks it. **Auditor decision:** remove URL from plain-text email template (HTML version uses CID embedding which is unaffected), or leave `/intake-photos` ungated (it's animal photos, not human PII), or accept the breakage. |
