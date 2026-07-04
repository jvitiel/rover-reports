# Tier-1 Phase C Closure — Pre-Removal Diagnosis

## 1. Remaining Consumers of the Three Old Mounts

### Dashboard (dashboard/index.html)

| Ref | Old URL Pattern | Converted in Phase B? | Status |
|-----|----------------|----------------------|--------|
| Adoption PDF link (`openGatedPdf`) | `/adoption-pdfs/{id}-{Name}-{date}.pdf` | ✅ Yes — uses `/api/docs/adoption-pdf/:id` via blob | Converted |
| Volunteer scan thumbnails (3 render sites) | `/data/volunteer-files/{uuid}/page-NN.jpg` | ✅ Yes — uses `volToGatedUrl` → `/api/docs/volunteer-file/:uuid/:file` via blob | Converted |
| Volunteer scan lightbox (`volOpenGatedScan`) | Same | ✅ Yes — fetches via `gatedBlobUrl` | Converted |
| Intake audio (`audioEl.src`) | `/intake-audio/{id}/voice_{ts}.webm` | ✅ Yes — uses `/api/docs/intake-audio/:id/:file` via blob | Converted |
| **⚠️ RESIDUAL: `volRotateFromLightbox` line 14633** | `data.url` = `/data/volunteer-files/{uuid}/page-NN.jpg?v=...` | ❌ **NOT converted** | `img.src = data.url` sets lightbox image directly to old-mount URL returned by `POST /api/volunteers/rotate-image` |
| `volOpenScan` function (line 14553) | `<img src="${url}">` bare | ❌ Dead code — function defined but **no callers** remain (all onclick → `volOpenGatedScan`). Harmless but should be removed or left. | Dead code |

**RESIDUAL DETAIL — `volRotateFromLightbox`:**

The `POST /api/volunteers/rotate-image` endpoint returns `{ success: true, url: "/data/volunteer-files/{uuid}/page-NN.jpg?v={ts}" }` (line 10338 in server.ts). In `volRotateFromLightbox` (line 14619), this is used:
1. `img.src = data.url` — sets lightbox `<img>` directly to old-mount URL (**RESIDUAL — must convert to gated blob**)
2. `volFileUrls[index] = data.url` — stores old-mount URL in array (subsequent thumbnail re-renders go through `volToGatedUrl` which converts it — **OK**)

**Fix needed in Phase C:** After rotate succeeds, convert `data.url` through `volToGatedUrl` + `gatedBlobUrl` before setting `img.src`, same as the thumbnail flow does. [VERIFIED]

### PWAs (staff, staging-staff, volunteer, dogwalker, caregiver, coordinator, custom-search, matcher-preview)

**NONE reference the three mounts.** Confirmed by grep across all `.html`/`.js` files in each. [VERIFIED]

### Public Pages (vclock, intake-form, profile-form, rg-portal)

**NONE reference the three mounts.** [VERIFIED]

### Public Pages — Blank Form Links (NOT the three mounts, but under /adoption-pdfs/)

| File | Link | Target |
|------|------|--------|
| `adoption-form.html` | `https://dogwalker.../adoption-pdfs/blank-english.pdf` | Blank template (non-PII) |
| `adoption-form.html` | `https://dogwalker.../adoption-pdfs/blank-spanish.pdf` | Blank template (non-PII) |
| `adoption-pdfs/test-adoption-es.html` | `https://dogwalker.../adoption-pdfs/blank-english.pdf` | Same |
| `adoption-pdfs/test-adoption-es.html` | `https://dogwalker.../adoption-pdfs/blank-spanish.pdf` | Same |
| `matcher-web/index.html` | `https://dogwalker.../adoption-pdfs/blank-english.pdf` | Same |
| `matcher-web/index.html` | `https://dogwalker.../adoption-pdfs/blank-spanish.pdf` | Same |

These are blank form templates — non-PII, must stay publicly accessible. They currently go through the dogwalker Caddy `file_server` block AND the Express static mount. Both serving paths will be removed in Phase C, so the blanks must be moved to `/public/forms/` first and all 6 links repointed. [VERIFIED]

### Server-Side — API Responses Building Old-Mount URLs

| Line | Code | What it builds | Impact |
|------|------|---------------|--------|
| 9228 | `pdfUrl: pdfFile ? '/adoption-pdfs/${pdfFile}' : null` | Returns old-mount PDF URL in `GET /api/adoption-applications` response | Dashboard no longer uses `pdfUrl` for serving (uses `a.id` → gated route). But `pdfUrl` is still in the API response — harmless dead field. No consumer uses it for fetching after Phase B. [VERIFIED] |
| 9376, 9391 | `path: '/data/volunteer-files/${uuid}/${file}'` | Used internally in `pageImages` for OCR; also returned as `fileUrls` in upload response (line 9500) | `fileUrls` returned to dashboard → stored as `volFileUrls` → converted via `volToGatedUrl` before rendering. Works as-is — `volToGatedUrl` parses the `/data/volunteer-files/` prefix. [VERIFIED] |
| 9589 | `'/data/volunteer-files/${tempId}/${f}'` | Stored in DB `original_files` column on volunteer save | Same as above — parsed by `volToGatedUrl` when loaded from DB. [VERIFIED] |
| 10338 | `url: '${filePath}?v=${Date.now()}'` | `POST /api/volunteers/rotate-image` returns `/data/volunteer-files/...` URL | Used by lightbox rotate (**RESIDUAL** — see above) and by thumbnail re-render (converted via `volToGatedUrl`). [VERIFIED] |
| 12201 | `voiceUrl = '/intake-audio/${intakeId}/${filename}'` | Stored in DB `voice_note_url` on intake voice upload | Dashboard parses this with regex in the intake-audio conversion block. Works as-is. [VERIFIED] |

### Email Templates

**No references to the three Tier-1 mounts in emailService.ts.** Intake emails reference `/intake-photos/` (Tier-2, not in scope). [VERIFIED]

---

## 2. /data Mount Restructure

### Current Mount

```ts
app.use('/data', express.static(path.join(ROOT_DIR, 'data'), { maxAge: '1h' }));
```
Serves the **entire** `/home/shelter/shelter-apps/data/` directory. [VERIFIED]

### Every /data/ Subpath and Its Consumers

| Subpath | Content | Consumers | Classification |
|---------|---------|-----------|---------------|
| `/data/animal-photos/` | Animal photos (staff names in filenames) | Staff/dogwalker PWAs, dashboard, matcher — URLs built by server API handlers | **Tier-2 — KEEP** |
| `/data/animal-recordings/` | Animal voice recordings + JSON transcripts | Staff/dogwalker PWAs, dashboard — URLs built by server; also has a dedicated GET handler at line 10972 | **Tier-2 — KEEP** |
| `/data/animal-media/` | Video files, thumbnails, crops | Dashboard, PWAs — URLs built by server | **Tier-2 — KEEP** |
| `/data/library-photos/` | Shelter library photos | Dashboard, staff PWA — URLs built by server | **Tier-2 — KEEP** |
| `/data/featured-videos/` | Animal feature videos (public) | **WordPress** via Caddy HTTP-IP block `http://66.228.37.38` → `localhost:3000` | **Infrastructure — KEEP** |
| `/data/volunteer-files/` | Scanned volunteer PII documents | Dashboard (converted to gated route in Phase B) | **Tier-1 — REMOVE from static** |
| `/data/shelter.db*` | Entire SQLite database | **No legitimate consumer** — already blocked at Caddy layer via `(block_db)` snippet | **BLOCK (already Caddy-blocked; also block at Express)** |
| `/data/.gitkeep` | Empty file | None | Harmless |

[ALL VERIFIED]

### Featured-Videos — Load-Bearing Check

**How WordPress accesses featured-videos:**
1. WordPress on SiteGround fetches `https://dashboard.4lgshelterapp.duckdns.org/data/featured-videos/aspen_vid.mp4` (URLs stored in `animal_media` table with full dashboard hostname)
2. Caddy `http://66.228.37.38` block has `@api path ... /data/featured-videos*` → `reverse_proxy localhost:3000`
3. Express receives `GET /data/featured-videos/aspen_vid.mp4` → served by `express.static('/data', ...)` mount

**There is NO dedicated Express route or handler for featured-videos.** It depends entirely on the broad `/data` static mount. [VERIFIED]

**⚠️ If the broad `/data` mount is replaced with per-subdir mounts, `/data/featured-videos` MUST be included in the whitelist, or WordPress video embeds break on the public site.** [VERIFIED]

### Proposed Per-Subdir Whitelist (replacing broad mount)

```ts
// Tier-2 animal content (keep serving, gate later)
app.use('/data/animal-photos', express.static(path.join(ROOT_DIR, 'data', 'animal-photos'), { maxAge: '1h' }));
app.use('/data/animal-recordings', express.static(path.join(ROOT_DIR, 'data', 'animal-recordings'), { maxAge: '1h' }));
app.use('/data/animal-media', express.static(path.join(ROOT_DIR, 'data', 'animal-media'), { maxAge: '1h' }));
app.use('/data/library-photos', express.static(path.join(ROOT_DIR, 'data', 'library-photos'), { maxAge: '1h' }));

// Infrastructure (WordPress videos — must stay public)
app.use('/data/featured-videos', express.static(path.join(ROOT_DIR, 'data', 'featured-videos'), { maxAge: '1h' }));

// NOT mounted: volunteer-files (gated via /api/docs), shelter.db (blocked), .gitkeep (irrelevant)
```

**Deny-by-default:** Any request to `/data/shelter.db`, `/data/volunteer-files/...`, `/data/anything-new` → 404 (no mount matches). [INFERRED]

**Keep the existing `/data/animal-recordings/:animalId/:filename` route handler** (line 10972) which serves JSON transcripts as formatted HTML — it reads from disk directly, doesn't depend on the static mount. [VERIFIED]

---

## 3. Blank Forms Move

### Files Under /adoption-pdfs/ That Are Non-PII (Public Templates)

| Filename | Content | Linked by public pages? | Must move to /public/forms/ |
|----------|---------|------------------------|---------------------------|
| `blank-english.pdf` | Empty adoption application (English) | Yes (6 links) | **YES** |
| `blank-spanish.pdf` | Empty adoption application (Spanish) | Yes (6 links) | **YES** |
| `volunteer-application.pdf` | Blank volunteer application form | No public links (already in `/public/forms/` as a separate copy) | No — leave or remove |
| `test-adoption-es.html` | Spanish adoption form staging page | Served by Caddy `/test-adoption-es` handler (separate from `/adoption-pdfs/*` block) | Needs its own solution (see Caddy section) |
| `TEST-spacing-verify.pdf` | Test file | No links anywhere | No — remove or leave |

[ALL VERIFIED]

### Every Public Link to Blank Forms (6 total, all must repoint)

| # | File | Current URL | New URL |
|---|------|------------|---------|
| 1 | `adoption-form.html` line 565 | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf` | `/public/forms/blank-english.pdf` (or full domain) |
| 2 | `adoption-form.html` line 569 | `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-spanish.pdf` | `/public/forms/blank-spanish.pdf` |
| 3 | `adoption-pdfs/test-adoption-es.html` line 588 | Same as #1 | Same new URL |
| 4 | `adoption-pdfs/test-adoption-es.html` line 592 | Same as #2 | Same new URL |
| 5 | `matcher-web/index.html` line 140 | Same as #1 | Same new URL |
| 6 | `matcher-web/index.html` line 143 | Same as #2 | Same new URL |

[ALL VERIFIED]

### /public/forms/ Availability

`/public/forms/` exists and already contains `volunteer-application.pdf` and `volunteer-application-es.pdf`. Served via `app.use('/public', express.static(...))` — ungated, anonymous access confirmed (`200` on anonymous GET). The blank adoption PDFs can be copied here. [VERIFIED]

---

## 4. Caddy Closure

### Dogwalker `/adoption-pdfs/*` file_server — **REMOVE**

```
@adoptionpdfs path /adoption-pdfs/*
handle @adoptionpdfs {
    root * /home/shelter/shelter-apps
    header Content-Disposition "inline"
    file_server
}
```

Serves completed PII PDFs directly from disk, bypassing Express. **Must be removed.** [VERIFIED]

### Dogwalker `/test-adoption-es` file_server — **KEEP (with caveat)**

```
@testadoptes path /test-adoption-es
handle @testadoptes {
    root * /home/shelter/shelter-apps/adoption-pdfs
    rewrite * /test-adoption-es.html
    file_server
}
```

Serves `test-adoption-es.html` (a staging Spanish adoption form page). This is **not PII** — it's a form template. However:
- It lives on disk at `/home/shelter/shelter-apps/adoption-pdfs/test-adoption-es.html`
- Its internal links reference blank PDFs at `https://dogwalker.../adoption-pdfs/blank-english.pdf` — those links must be updated to `/public/forms/` as part of the blank-forms move
- The file itself must be moved or its Caddy root changed if the `/adoption-pdfs/` directory structure changes

**Recommendation:** Move `test-adoption-es.html` to `/public/` and update the Caddy handler root, OR keep the handler root pointing at the adoption-pdfs dir (the HTML file can stay there — it's not PII, and the dir still exists for generated PDFs). [INFERRED]

### Draft vhost file_server — **NO CHANGE**

```
root * /var/www/draft
file_server
```

Serves draft website files from `/var/www/draft`. Does not touch the three mounts. [VERIFIED]

### No other Caddy file_server blocks touch the three mounts. [VERIFIED]

---

## 5. Rate-Limiter staticPrefixes

### Current List

```ts
const staticPrefixes = [
  '/staff/', '/staging-staff/', '/matcher/', '/dashboard/',
  '/volunteer/', '/dogwalker/', '/caregiver/', '/coordinator/',
  '/test-activity/', '/data/', '/public/', '/adoption-pdfs/',
  '/intake-photos/', '/intake-audio/', '/custom-search/',
];
```

### Changes for Phase C

| Entry | Action | Reason |
|-------|--------|--------|
| `'/adoption-pdfs/'` | **REMOVE** | Mount removed; PDFs served via `/api/docs/` (rate-limited by `globalLimiter`) |
| `'/intake-audio/'` | **REMOVE** | Mount removed; audio served via `/api/docs/` |
| `'/data/'` | **KEEP** | Per-subdir mounts remain for Tier-2 animal content + featured-videos |
| `'/intake-photos/'` | KEEP for now | Tier-2, not in Phase C scope |
| All others | KEEP | PWA app shells, public assets |

[ALL VERIFIED]

---

## 6. Cosmetic — Trailing `audioEl.style.display = 'block'`

**Location:** `dashboard/index.html`, the intake-audio conversion block:

```js
          if (audioMatch) {
            gatedBlobUrl('/api/docs/intake-audio/...').then(b => {
              if (b) { audioEl.src = b; audioEl.dataset.blobUrl = b; }
              else { console.warn('...'); audioEl.style.display = 'none'; }
            }).catch(() => { console.warn('...'); audioEl.style.display = 'none'; });
          } else {
            console.warn('...');
            audioEl.style.display = 'none';
          }
          audioEl.style.display = 'block';  // ← UNCONDITIONAL — overrides error-branch hide
```

The trailing `audioEl.style.display = 'block'` runs synchronously after the async `gatedBlobUrl().then(...)` is initiated, so it always sets `display='block'` immediately. The `.then()` error branches set `display='none'` later (after the fetch), which works for errors — but on success the player shows before the blob loads, which is fine. However, the pattern-mismatch `else` branch sets `display='none'` then is immediately overridden by `display='block'` — that's a bug (audio player shows with no src).

**Fix:** Move `audioEl.style.display = 'block'` into the success path inside `.then(b => { if (b) { ...; audioEl.style.display = 'block'; } })` and remove the unconditional line. [VERIFIED]

---

## Summary Tables

### (a) Consumer Map — Every Residual Flagged

| Surface | Reference | Old URL | Phase B Status | Phase C Action |
|---------|-----------|---------|---------------|----------------|
| Dashboard — adoption PDF | `openGatedPdf(id)` | `/adoption-pdfs/...` | ✅ Converted | None |
| Dashboard — vol thumbnails (×3 render sites) | `volToGatedUrl` → blob | `/data/volunteer-files/...` | ✅ Converted | None |
| Dashboard — vol lightbox | `volOpenGatedScan` → blob | `/data/volunteer-files/...` | ✅ Converted | None |
| **Dashboard — vol lightbox rotate** | **`img.src = data.url`** | **`/data/volunteer-files/...`** | **❌ RESIDUAL** | **Convert to gated blob after rotate** |
| Dashboard — vol `volOpenScan` | `<img src>` bare | `/data/volunteer-files/...` | Dead code (no callers) | Remove or leave |
| Dashboard — intake audio | `gatedBlobUrl` → blob | `/intake-audio/...` | ✅ Converted | Fix cosmetic `display='block'` |
| Server — `pdfUrl` in API response | `/adoption-pdfs/${pdfFile}` | — | Dead field (not used for fetching) | Can remove field later; not blocking |
| Server — `fileUrls` / `original_files` | `/data/volunteer-files/...` | — | Parsed by `volToGatedUrl` | No change needed |
| Server — `voice_note_url` | `/intake-audio/...` | — | Parsed by regex in conversion block | No change needed |
| Server — rotate-image response `url` | `/data/volunteer-files/...` | — | Thumbnails converted; lightbox **RESIDUAL** | See above |
| Public pages (×6 blank-form links) | `/adoption-pdfs/blank-*.pdf` | — | N/A (non-PII) | Move blanks → `/public/forms/`, repoint 6 links |

### (b) /data Whitelist Design

**Replace** `app.use('/data', express.static(ROOT_DIR + '/data', { maxAge: '1h' }))` with:

```ts
app.use('/data/animal-photos', express.static(path.join(ROOT_DIR, 'data', 'animal-photos'), { maxAge: '1h' }));
app.use('/data/animal-recordings', express.static(path.join(ROOT_DIR, 'data', 'animal-recordings'), { maxAge: '1h' }));
app.use('/data/animal-media', express.static(path.join(ROOT_DIR, 'data', 'animal-media'), { maxAge: '1h' }));
app.use('/data/library-photos', express.static(path.join(ROOT_DIR, 'data', 'library-photos'), { maxAge: '1h' }));
app.use('/data/featured-videos', express.static(path.join(ROOT_DIR, 'data', 'featured-videos'), { maxAge: '1h' }));
```

**Featured-videos resolved:** Must be explicitly included — no dedicated Express route exists; depends entirely on the static mount. Without it, WordPress video embeds break. [VERIFIED]

**Deny-by-default:** `/data/shelter.db*` → 404 (no mount). `/data/volunteer-files/*` → 404 (no mount). Any new `/data/X` → 404. The Caddy `(block_db)` snippet provides an additional 403 layer at the edge. [INFERRED]

### (c) Blank-Forms Link List (6 links to repoint)

| # | File | Line (by content) | Current URL | New URL |
|---|------|--------------------|-------------|---------|
| 1 | `adoption-form.html` | `<a href="...blank-english.pdf"` | `https://dogwalker.../adoption-pdfs/blank-english.pdf` | `/public/forms/blank-english.pdf` |
| 2 | `adoption-form.html` | `<a href="...blank-spanish.pdf"` | `https://dogwalker.../adoption-pdfs/blank-spanish.pdf` | `/public/forms/blank-spanish.pdf` |
| 3 | `test-adoption-es.html` | `<a href="...blank-english.pdf"` | Same as #1 | Same |
| 4 | `test-adoption-es.html` | `<a href="...blank-spanish.pdf"` | Same as #2 | Same |
| 5 | `matcher-web/index.html` | `<a href="...blank-english.pdf"` | Same as #1 | Same |
| 6 | `matcher-web/index.html` | `<a href="...blank-spanish.pdf"` | Same as #2 | Same |

**Pre-step:** Copy `blank-english.pdf` and `blank-spanish.pdf` to `/public/forms/`. [INFERRED]

### (d) Caddy Directives to Remove

| Vhost | Block | Action |
|-------|-------|--------|
| `dogwalker.4lgshelterapp.duckdns.org` | `@adoptionpdfs` file_server block (lines 37–42) | **REMOVE** |
| `dogwalker.4lgshelterapp.duckdns.org` | `@testadoptes` file_server block | **KEEP** (non-PII staging form) — but update `test-adoption-es.html` internal links to new `/public/forms/` paths |

No other Caddy file_server blocks touch the three mounts. [VERIFIED]

### (e) Rate-Limiter Entries to Drop

| Entry | Action |
|-------|--------|
| `'/adoption-pdfs/'` | **REMOVE** |
| `'/intake-audio/'` | **REMOVE** |
| `'/data/'` | KEEP (Tier-2 per-subdir mounts still served) |
