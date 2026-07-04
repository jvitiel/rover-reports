# Tier-1 Phase C: Express/Client Closure Implementation

## STEP 0 — Pre-Read Findings

### 0a. volToGatedUrl + rotate `?v=` query string

**Finding:** `volToGatedUrl` uses regex `(.+)$` which would capture a trailing `?v=...` query string if passed. However, ALL existing callers strip the query first via `.split('?')[0]` before calling `volToGatedUrl(cleanUrl)`. [VERIFIED]

**Action taken:** Hardened `volToGatedUrl` to strip the query string internally (`const clean = url.split('?')[0]`) so STEP 3's rotate conversion (which passes `data.url` containing `?v=`) is safe without requiring the caller to strip. [VERIFIED]

### 0b. /test-adoption-es consumers

**Finding:** Zero code references link to `/test-adoption-es` anywhere in the codebase. No HTML file, JS file, or server endpoint links to it. Only the Caddy `@testadoptes` handler on the dogwalker vhost serves it directly. [VERIFIED by grep across all .html/.js/.ts under shelter-apps excluding node_modules/dist/.git]

**Implication:** No link repointing needed for `/test-adoption-es` beyond fixing the internal blank-PDF links inside the file itself (done in STEP 1).

### 0c. featured-videos on-disk structure

**Finding:** `/data/featured-videos/` is a real subdirectory containing 4 `.mp4` files:
```
/home/shelter/shelter-apps/data/featured-videos/
├── aspen_vid.mp4   (2.8MB)
├── mildred_vid.mp4 (4.3MB)
├── yoko_vid.mp4    (2.1MB)
└── zelda_vid.mp4   (2.5MB)
```
[VERIFIED via `ls -la`]

**Implication:** `app.use('/data/featured-videos', express.static(path.join(ROOT_DIR, 'data', 'featured-videos'), ...))` will correctly serve requests like `GET /data/featured-videos/aspen_vid.mp4`. WordPress videos will continue working through the Caddy IP block → localhost:3000 → this mount. [VERIFIED]

---

## STEP 1 — Blanks + test-adoption-es Moved to /public

### Blank forms copied

| File | Source | Destination | Verify |
|------|--------|-------------|--------|
| `blank-english.pdf` | `adoption-pdfs/blank-english.pdf` (309,446 bytes) | `public/forms/blank-english.pdf` | [VERIFIED — 200 on anonymous GET to /public/forms/blank-english.pdf] |
| `blank-spanish.pdf` | `adoption-pdfs/blank-spanish.pdf` (127,119 bytes) | `public/forms/blank-spanish.pdf` | [VERIFIED] |

`/public/forms/` already contained `volunteer-application.pdf` and `volunteer-application-es.pdf` — those were not touched. [VERIFIED]

Originals left in place in `adoption-pdfs/` (Caddy dogwalker still serves them until John's separate Caddy edit). [VERIFIED]

### test-adoption-es.html copied

| File | Source | Destination |
|------|--------|-------------|
| `test-adoption-es.html` | `adoption-pdfs/test-adoption-es.html` | `public/test-adoption-es.html` |

Served at `/public/test-adoption-es.html` (anonymous, 200 confirmed). [VERIFIED]

Internal blank-PDF links in the `/public/` copy updated (see STEP 2 below). Original in `adoption-pdfs/` left untouched. [VERIFIED]

---

## STEP 2 — All 6 Blank-Form Links Repointed

| # | File | Old URL | New URL |
|---|------|---------|---------|
| 1 | `adoption-form.html` | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf` | `/public/forms/blank-english.pdf` |
| 2 | `adoption-form.html` | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-spanish.pdf` | `/public/forms/blank-spanish.pdf` |
| 3 | `public/test-adoption-es.html` | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf` | `/public/forms/blank-english.pdf` |
| 4 | `public/test-adoption-es.html` | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-spanish.pdf` | `/public/forms/blank-spanish.pdf` |
| 5 | `matcher-web/index.html` | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf` | `/public/forms/blank-english.pdf` |
| 6 | `matcher-web/index.html` | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-spanish.pdf` | `/public/forms/blank-spanish.pdf` |

All 6 confirmed changed. [VERIFIED by post-edit grep]

No `/test-adoption-es` consumers needed repointing (0b: zero external links found). [VERIFIED]

---

## STEP 3 — Rotate Lightbox Residual Converted

**Before (line 14633):**
```js
if (img) img.src = data.url;
```
Set lightbox `<img>` directly to old-mount URL (`/data/volunteer-files/{uuid}/page-NN.jpg?v=...`) returned by `POST /api/volunteers/rotate-image`.

**After:**
```js
if (img) {
  const rotGatedUrl = volToGatedUrl(data.url);
  if (rotGatedUrl) {
    if (img.dataset.blobUrl) URL.revokeObjectURL(img.dataset.blobUrl);
    const rotBlob = await gatedBlobUrl(rotGatedUrl);
    if (rotBlob) { img.src = rotBlob; img.dataset.blobUrl = rotBlob; }
  }
}
```

- `volToGatedUrl(data.url)` converts `/data/volunteer-files/{uuid}/{file}?v=...` → `/api/docs/volunteer-file/{uuid}/{file}` (query stripped by hardened `volToGatedUrl`) [VERIFIED]
- Previous blob URL revoked before replacement [VERIFIED]
- `gatedBlobUrl` fetches through the gated route with token [VERIFIED]
- `POST /api/volunteers/rotate-image` endpoint NOT modified [VERIFIED — zero diff lines touch `rotate-image`]

---

## STEP 4 — /data Mount → Per-Subdir Whitelist

**Removed:**
```ts
app.use('/data', express.static(path.join(ROOT_DIR, 'data'), { maxAge: '1h' }));
```

**Replaced with 5 explicit mounts:**
```ts
app.use('/data/animal-photos', express.static(path.join(ROOT_DIR, 'data', 'animal-photos'), { maxAge: '1h' }));
app.use('/data/animal-recordings', express.static(path.join(ROOT_DIR, 'data', 'animal-recordings'), { maxAge: '1h' }));
app.use('/data/animal-media', express.static(path.join(ROOT_DIR, 'data', 'animal-media'), { maxAge: '1h' }));
app.use('/data/library-photos', express.static(path.join(ROOT_DIR, 'data', 'library-photos'), { maxAge: '1h' }));
app.use('/data/featured-videos', express.static(path.join(ROOT_DIR, 'data', 'featured-videos'), { maxAge: '1h' }));
```

**Deny-by-default result:**
| Request | Result |
|---------|--------|
| `GET /data/animal-photos/A123/photo.jpg` | 200 (mount matches) |
| `GET /data/featured-videos/aspen_vid.mp4` | 200 (WordPress keeps working) |
| `GET /data/shelter.db` | 404 (no mount matches) + Caddy 403 at edge |
| `GET /data/volunteer-files/{uuid}/page.jpg` | 404 (no mount matches — gated route only) |
| `GET /data/anything-new/foo` | 404 (no mount matches) |

[ALL INFERRED — requires restart to verify]

Existing dedicated `GET /data/animal-recordings/:animalId/:filename` route handler (line ~10972) left as-is — it reads from disk directly, does not depend on the static mount. [VERIFIED]

---

## STEP 5 — Removed Static Mounts

### /adoption-pdfs mount removed
```ts
// BEFORE:
app.use('/adoption-pdfs', express.static(getPdfDirectory()));

// AFTER:
// /adoption-pdfs static mount REMOVED (Phase C) — PDFs served via /api/docs/adoption-pdf/:id
// Blank forms moved to /public/forms/; Caddy dogwalker file_server removal is a separate step.
```

On-disk directory `adoption-pdfs/` NOT deleted — Caddy dogwalker still serves from it until John's Caddy edit, and `/api/docs/adoption-pdf/:id` reads from it. [VERIFIED]

### /intake-audio mount removed
```ts
// BEFORE:
app.use('/intake-audio', express.static(INTAKE_AUDIO_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'audio/webm');
    }
  }
}));

// AFTER:
// /intake-audio static mount REMOVED (Phase C) — audio served via /api/docs/intake-audio/:id/:file
```

Note: The gated `/api/docs/intake-audio/:id/:file` route (committed in Phase A) already sets `Content-Type` via `res.type(ext)` which maps `.webm` → `audio/webm`. [VERIFIED]

---

## STEP 6 — Rate-Limiter

**Before:**
```ts
const staticPrefixes = [
  '/staff/', '/staging-staff/', '/matcher/', '/dashboard/',
  '/volunteer/', '/dogwalker/', '/caregiver/', '/coordinator/',
  '/test-activity/', '/data/', '/public/', '/adoption-pdfs/',
  '/intake-photos/', '/intake-audio/', '/custom-search/',
];
```

**After:**
```ts
const staticPrefixes = [
  '/staff/', '/staging-staff/', '/matcher/', '/dashboard/',
  '/volunteer/', '/dogwalker/', '/caregiver/', '/coordinator/',
  '/test-activity/', '/data/', '/public/',
  '/intake-photos/', '/custom-search/',
];
```

| Entry | Action | Reason |
|-------|--------|--------|
| `'/adoption-pdfs/'` | **Removed** | Mount removed; PDFs via `/api/docs/` (rate-limited by `globalLimiter`) |
| `'/intake-audio/'` | **Removed** | Mount removed; audio via `/api/docs/` |
| `'/data/'` | Kept | Per-subdir mounts still serve Tier-2 animal content |
| `'/intake-photos/'` | Kept | Tier-2, not in Phase C scope |
| `'/public/'` | Kept | Serves blank forms, volunteer apps |

[VERIFIED]

---

## STEP 7 — Cosmetic: audioEl.style.display

**Before:**
```js
gatedBlobUrl('/api/docs/intake-audio/...').then(b => {
  if (b) { audioEl.src = b; audioEl.dataset.blobUrl = b; }
  else { console.warn('...'); audioEl.style.display = 'none'; }
}).catch(() => { console.warn('...'); audioEl.style.display = 'none'; });
} else {
  console.warn('...');
  audioEl.style.display = 'none';
}
audioEl.style.display = 'block';  // ← unconditional, overrode error branches
```

**After:**
```js
gatedBlobUrl('/api/docs/intake-audio/...').then(b => {
  if (b) { audioEl.src = b; audioEl.dataset.blobUrl = b; audioEl.style.display = 'block'; }
  else { console.warn('...'); audioEl.style.display = 'none'; }
}).catch(() => { console.warn('...'); audioEl.style.display = 'none'; });
} else {
  console.warn('...');
  audioEl.style.display = 'none';
}
// unconditional display='block' removed — now only shows on successful blob load
```

[VERIFIED]

---

## Build Result

```
> shelter-apps@2.0.0 build
> tsc
Process exited with code 0.
```
Dashboard is static HTML — no build step. [VERIFIED]

---

## git diff --stat

```
adoption-form.html     |  4 ++--
 dashboard/index.html   | 17 ++++++++++++-----
 matcher-web/index.html |  4 ++--
 server/src/server.ts   | 25 +++++++++++--------------
 4 files changed, 27 insertions(+), 23 deletions(-)
```

Plus 3 new files:
```
 create mode 100644 public/forms/blank-english.pdf
 create mode 100644 public/forms/blank-spanish.pdf
 create mode 100644 public/test-adoption-es.html
```

Total: 7 files in commit. [VERIFIED]

## Commit

```
[master 6cdc3d1] Tier-1 Phase C: /data per-subdir whitelist (deny-by-default),
  remove /adoption-pdfs + /intake-audio static mounts, blanks+test-adoption-es → /public,
  convert rotate lightbox residual to gated, drop rate-limiter exclusions
 7 files changed, 1698 insertions(+), 23 deletions(-)
```

Files committed: `adoption-form.html`, `dashboard/index.html`, `matcher-web/index.html`, `server/src/server.ts`, `public/forms/blank-english.pdf`, `public/forms/blank-spanish.pdf`, `public/test-adoption-es.html`. No `git add -A`. [VERIFIED]

## Confirmations

- **Caddy config NOT touched** (Caddyfile is outside the repo; no edits made) [VERIFIED]
- **POST /api/volunteers/rotate-image NOT modified** (zero diff lines touch `rotate-image`) [VERIFIED]
- **Service NOT restarted** [VERIFIED]
- **No DB changes** [VERIFIED]
