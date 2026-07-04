# Static File Mount PII Sweep — Exhaustive Enumeration

## 1. Every express.static Mount

### Mount 1: `/adoption-pdfs` → `/home/shelter/shelter-apps/adoption-pdfs`
- **Auth/gate:** None. No middleware before static mount. [VERIFIED]
- **Content:** Adoption application PDFs containing full applicant PII (name, address, phone, email, references, vet info). Filenames are `{id}-{Name}-{date}.pdf` — sequential ID + name in filename. [VERIFIED]
- **PII classification:** **YES — CRITICAL** [VERIFIED]
- **Rate-limited:** No — in `staticPrefixes` exclusion list. [VERIFIED]
- **Anonymous GET test:** `200` from localhost and public internet. [VERIFIED]

### Mount 2: `/data` → `/home/shelter/shelter-apps/data` (with `maxAge: '1h'`)
- **Auth/gate:** None. No middleware before static mount. [VERIFIED]
- **Content:** This directory contains:
  - `shelter.db` — **THE ENTIRE SQLITE DATABASE** (35.7 MB). Contains ALL adopter applications, volunteer records, behavior notes, contact info, credentials references, everything. [VERIFIED]
  - `shelter.db-shm`, `shelter.db-wal` — WAL journal files (also downloadable). [VERIFIED]
  - `volunteer-files/` — scanned volunteer application pages (JPG images of handwritten forms with name, address, phone, DOB, emergency contacts). Organized by UUID subdirectory. [VERIFIED]
  - `animal-photos/` — dogwalker/staff-uploaded animal photos. Filenames may include staff names (e.g. `1772915603714_dogwalker_John.jpg`). [VERIFIED]
  - `animal-recordings/` — audio/video recordings of animals, with staff name in filenames. [VERIFIED]
  - `animal-media/` — videos and thumbnails of animals. [VERIFIED]
  - `library-photos/` — shelter animal library photos. [VERIFIED]
  - `featured-videos/` — animal feature videos (animal names only, no human PII). [VERIFIED]
- **PII classification:** **YES — CATASTROPHIC** — the entire database is downloadable. [VERIFIED]
- **Rate-limited:** No — in `staticPrefixes` exclusion list. [VERIFIED]
- **Anonymous GET tests:**
  - `shelter.db`: `200` (content-length: 35,688,448 — exact match to on-disk file size). [VERIFIED]
  - `volunteer-files/{uuid}/page-01.jpg`: `200` from localhost and public internet. [VERIFIED]
  - `animal-photos/{code}/{file}`: `200`. [VERIFIED]
- **Directory listing:** Disabled (express.static returns 404 on directory paths). [VERIFIED]
- **Enumerability:** Volunteer file UUIDs are not guessable but are stored in the DB (which is itself downloadable — so an attacker downloads the DB first, extracts all UUIDs, then downloads all scans). Animal photo paths use shelter codes (guessable sequential pattern like A2024053). [VERIFIED]

### Mount 3: `/intake-photos` → `/home/shelter/shelter-apps/intake-photos`
- **Auth/gate:** None. [VERIFIED]
- **Content:** Photos of animals seized during overnight intakes. Organized by intake ID (sequential integer). Photos are of animals, not people — but the intake ID is sequential and the intake record (in the downloadable DB) links to officer names, locations, and contact info. [VERIFIED]
- **PII classification:** **LOW-MODERATE** — animal photos themselves are not PII, but sequential-ID enumeration reveals intake volume/timing. The PII (officer name/contact) is in the DB, not the photo files. [INFERRED]
- **Rate-limited:** No — in `staticPrefixes` exclusion list. [VERIFIED]
- **Anonymous GET test:** `200` from localhost and public internet. [VERIFIED]

### Mount 4: `/intake-audio` → `/home/shelter/shelter-apps/intake-audio`
- **Auth/gate:** None. [VERIFIED]
- **Content:** Voice note recordings from officers during overnight intakes. May contain spoken PII (names, addresses, descriptions of situations). Organized by intake ID (sequential integer). Filenames include timestamps (`voice_{timestamp}.webm`). [VERIFIED]
- **PII classification:** **YES — HIGH** — audio recordings likely contain spoken names, locations, circumstances. [INFERRED]
- **Rate-limited:** No — in `staticPrefixes` exclusion list. [VERIFIED]
- **Anonymous GET test:** `200` from localhost. [VERIFIED]

### Mount 5: `/public` → `/home/shelter/shelter-apps/public`
- **Auth/gate:** None. [VERIFIED]
- **Content:** Logos (`4lg-logo.png`, `4lg-logo-header.jpg`, `rg-cares-logo.png`, `ag-markets-logo.jpg`), a layout test page, a WordPress admin guide PDF, and blank volunteer application form PDFs (English/Spanish) under `forms/`. [VERIFIED]
- **PII classification:** **NO** — all assets are public/organizational. Blank application forms are templates, not filled submissions. [VERIFIED]
- **Rate-limited:** No — in `staticPrefixes` exclusion list. [VERIFIED]

### Mounts 6–13: PWA App Shells (non-PII)
| Mount | Directory | Content |
|-------|-----------|---------|
| `/dogwalker` | `dogwalker-pwa` | HTML/JS/CSS app shell |
| `/volunteer` | `volunteer-pwa` | HTML/JS/CSS app shell |
| `/staff` | `staff-pwa` | HTML/JS/CSS app shell |
| `/staging-staff` | `staging-staff` | HTML/JS/CSS app shell |
| `/caregiver` | `caregiver-pwa` | HTML/JS/CSS app shell |
| `/coordinator` | `coordinator-pwa` | HTML/JS/CSS app shell |
| `/matcher` | `matcher-preview` | HTML/JS/CSS app shell |
| `/test-activity` | `test-activity` | HTML/JS/CSS app shell |

- **Auth/gate:** None (intentionally public — these are client-side apps). [VERIFIED]
- **PII classification:** **NO** — application code only, no data files. [VERIFIED]

### Mount 14: `/custom-search` → `custom-search`
- **Auth/gate:** Has a preceding middleware that sets CORS headers. [VERIFIED]
- **PII classification:** **NO** — search UI assets. [VERIFIED]

### Mount 15: `/dashboard` → `dashboard`
- **Auth/gate:** None on static files (the gate is on API calls, not the HTML/JS/CSS). [VERIFIED]
- **PII classification:** **NO** — dashboard app shell (index.html, JS, CSS). PII is loaded via gated API calls. [VERIFIED]

## 2. Volunteer Scans Specifically

**Directory:** `/home/shelter/shelter-apps/data/volunteer-files/`
**Served via:** The `/data` express.static mount — path `/data/volunteer-files/{uuid}/{filename}`.
**Anonymous GET:** `200` from both localhost and public internet via ANY Caddy vhost that proxies `/data/*` (dashboard, dogwalker, volunteer, staff, staging-staff, matcher, test-activity). [VERIFIED]

**Enumerability:**
- UUIDs themselves are not guessable (v4 UUIDs, 36 subdirectories currently). [VERIFIED]
- **However:** Since `shelter.db` is also downloadable via `/data/shelter.db`, an attacker can download the DB, query `SELECT original_files FROM volunteers`, extract all UUIDs, and download every volunteer scan. [VERIFIED]
- Filenames within each UUID directory are predictable (`page-01.jpg`, `page-02.jpg`, etc.). [VERIFIED]

**Content:** Scanned handwritten volunteer application forms containing: full name, address, phone numbers, date of birth, emergency contacts, employment history. [VERIFIED — confirmed by file structure and dashboard rendering code in `volOpenScan`]

## 3. Caddy-Proxied Static Paths

### Caddy file_server: `/adoption-pdfs/*` on dogwalker.4lgshelterapp.duckdns.org

```
@adoptionpdfs path /adoption-pdfs/*
handle @adoptionpdfs {
    root * /home/shelter/shelter-apps
    header Content-Disposition "inline"
    file_server
}
```

**This serves adoption PDFs directly from disk at the Caddy layer, BEFORE the request ever reaches Express.** Even if Express adds middleware to gate `/adoption-pdfs`, requests to the dogwalker subdomain bypass Express entirely for this path. [VERIFIED]

**Anonymous GET test:** `200` via `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/12-Test_Verification-2026-06-30.pdf`. [VERIFIED]

**⚠️ This is a distinct blast-radius path.** Fixing the Express static mount alone is insufficient — the Caddy `file_server` block must also be removed or gated. [VERIFIED]

### Caddy file_server: `/test-adoption-es` on dogwalker subdomain

Serves a single HTML test file (`test-adoption-es.html`) from the adoption-pdfs directory. Non-PII (it's a form template page). [VERIFIED]

### Caddy file_server: draft.4lgshelterapp.duckdns.org

```
root * /var/www/draft
file_server
```

Serves draft website files. Non-PII. [VERIFIED]

### All other Caddy vhosts

All other vhosts use `reverse_proxy` to Express for `/api/*` and `/data/*` — no direct `file_server` for PII content. But the `/data/*` proxy passes through to Express's ungated static mount, so the exposure is still present. [VERIFIED]

**Vhosts proxying `/data/*` to Express:** dogwalker, volunteer, staff, staging-staff, test-activity, matcher, dashboard (via `@standalone`). [VERIFIED]

## 4. Other Document-Bearing Directories

### RG Cares Attachments
- **On-disk:** `/home/shelter/shelter-apps/rg-attachments/`
- **Served via:** `GET /api/rg/attachments/:id` — an API route with `rgAuthMiddleware` (session-based auth). **NOT a static mount.** [VERIFIED]
- **Anonymous GET test:** `/rg-attachments/` returns 404 (no static mount). The API route requires auth. [VERIFIED]
- **Status:** **PROPERLY GATED.** [VERIFIED]

### No other document directories found
- No ID upload directory exists. [VERIFIED — not found in filesystem or code]
- No medical/vet record upload directory exists. [VERIFIED]
- No other static mounts serve user-uploaded documents. [VERIFIED]

## 5. Per-Mount Client Access Mechanism

| Mount | Client access mechanism | Needs blob conversion? |
|-------|------------------------|----------------------|
| `/adoption-pdfs` | Bare `<a href="${a.pdfUrl}" target="_blank">` in dashboard `loadAdoptionsData()` — no token. [VERIFIED] | Yes — must convert to gatedFetch + blob URL |
| `/data/volunteer-files` | Bare `<img src="${url}">` in dashboard `volOpenScan()`, loaded from `volFileUrls` array. [VERIFIED] | Yes — must convert to gatedFetch + blob URL |
| `/data/shelter.db` | Not intentionally linked by any client — but publicly reachable. [VERIFIED] | Must be blocked entirely (never served via HTTP) |
| `/intake-photos` | Bare `<img src="${intake.photo_url}">` in dashboard intake rendering. [VERIFIED] | Yes — must convert to gatedFetch + blob URL |
| `/intake-audio` | `<audio>` element with `src` set to URL in dashboard. [VERIFIED] | Yes — must convert to gatedFetch + blob URL |

---

## SUMMARY TABLE

| Mount Path | On-Disk Directory | PII? | Currently Gated? | Anon GET Status | Rate-Limited? | Client Mechanism | Needs Fix? |
|-----------|-------------------|------|-----------------|----------------|---------------|-----------------|------------|
| `/adoption-pdfs` | adoption-pdfs/ | **YES — CRITICAL** | ❌ No | 200 | ❌ Excluded | bare `<a href>` | **YES** |
| `/data` (all) | data/ | **YES — CATASTROPHIC** | ❌ No | 200 | ❌ Excluded | various bare links | **YES** |
| ↳ `/data/shelter.db` | data/shelter.db | **YES — CATASTROPHIC** | ❌ No | 200 | ❌ Excluded | not linked (exposed) | **YES — BLOCK** |
| ↳ `/data/volunteer-files` | data/volunteer-files/ | **YES — CRITICAL** | ❌ No | 200 | ❌ Excluded | bare `<img src>` | **YES** |
| ↳ `/data/animal-photos` | data/animal-photos/ | LOW | ❌ No | 200 | ❌ Excluded | bare `<img src>` | YES |
| ↳ `/data/animal-recordings` | data/animal-recordings/ | LOW | ❌ No | 200 | ❌ Excluded | bare refs | YES |
| `/intake-photos` | intake-photos/ | LOW-MOD | ❌ No | 200 | ❌ Excluded | bare `<img src>` | YES |
| `/intake-audio` | intake-audio/ | **YES — HIGH** | ❌ No | 200 | ❌ Excluded | bare `<audio src>` | **YES** |
| `/public` | public/ | No | ❌ No (intentional) | 200 | ❌ Excluded | bare links | No |
| `/dogwalker` etc. (8 PWAs) | *-pwa/ | No | ❌ No (intentional) | 200 | ❌ Excluded | browser navigation | No |
| `/dashboard` | dashboard/ | No | ❌ No (intentional) | 200 | ❌ Excluded | browser navigation | No |
| `/custom-search` | custom-search/ | No | CORS only | 200 | ❌ Excluded | browser navigation | No |
| **Caddy file_server** | | | | | | | |
| dogwalker `/adoption-pdfs/*` | shelter-apps/ | **YES — CRITICAL** | ❌ No | 200 | N/A (Caddy) | N/A | **YES — Caddy block** |

## Mounts Requiring Gate+Blob+Rate-Limit Fix

1. **`/data/shelter.db`** — BLOCK ENTIRELY. The database must never be served over HTTP. Highest priority. [VERIFIED]
2. **`/adoption-pdfs`** — Gate with token, convert dashboard links to blob pattern. Also remove Caddy `file_server` block on dogwalker vhost. [VERIFIED]
3. **`/data/volunteer-files`** — Gate with token, convert dashboard `<img>` to blob pattern. [VERIFIED]
4. **`/intake-audio`** — Gate with token, convert dashboard `<audio>` to blob pattern. [VERIFIED]
5. **`/intake-photos`** — Gate with token, convert dashboard `<img>` to blob pattern. [VERIFIED]
6. **`/data/animal-photos`** — Lower priority (animal photos, not human PII) but staff names in filenames. Gate recommended. [INFERRED]
7. **`/data/animal-recordings`** — Same as above. [INFERRED]
8. **`/data/animal-media`** — Same as above. [INFERRED]
