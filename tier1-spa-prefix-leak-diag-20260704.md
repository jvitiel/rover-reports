# Tier-1 SPA-Prefix Leak Diagnosis

## TL;DR: FALSE ALARM — No PII Leak

The reported "200 on /dogwalker/adoption-pdfs/12-Test.pdf" is the SPA catch-all returning `index.html`, NOT the actual PDF. The response is `text/html` at exactly 7,552 bytes — the dogwalker-pwa SPA shell. The actual PDF is 84,439 bytes `application/pdf`. No PII document is served on any tested path. [VERIFIED]

---

## 1. How Express Resolves /<app>/adoption-pdfs/{file}

**Request:** `GET /dogwalker/adoption-pdfs/12-Test_Verification-2026-06-30.pdf`

**Serving chain:**
1. `app.use('/dogwalker', express.static(path.join(ROOT_DIR, 'dogwalker-pwa')))` — tries to find `adoption-pdfs/12-Test_Verification-2026-06-30.pdf` inside `/home/shelter/shelter-apps/dogwalker-pwa/`. No such subdir exists → **miss**. [VERIFIED — `ls` confirms no `adoption-pdfs/` in `dogwalker-pwa/`]
2. `app.get('/dogwalker/*', (_req, res) => res.sendFile(path.join(ROOT_DIR, 'dogwalker-pwa', 'index.html')))` — SPA catch-all matches → **sends index.html** [VERIFIED]

**Result:** `200 text/html; charset=UTF-8 7552` — the SPA shell. NOT the PDF. [VERIFIED]

The `adoption-pdfs/` directory is at `/home/shelter/shelter-apps/adoption-pdfs/` (a sibling of `dogwalker-pwa/`, not inside it). The static mount for `/dogwalker` only serves files under `dogwalker-pwa/`. The SPA catch-all then handles everything else as a client-side route, returning `index.html`. [VERIFIED]

---

## 2. Same Trick on Other Mounts

All tested. Every SPA-prefix path returns the SPA shell HTML, confirmed by exact byte-size match:

| Test Path | HTTP | Content-Type | Size | Actual File | Matches SPA Shell? |
|-----------|------|-------------|------|-------------|-------------------|
| `/dogwalker/adoption-pdfs/12-Test.pdf` | 200 | text/html | 7,552 | dogwalker-pwa/index.html (7,552 bytes) | ✅ YES [VERIFIED] |
| `/staff/data/shelter.db` | 200 | text/html | 19,054 | staff-pwa/index.html (19,054 bytes) | ✅ YES [VERIFIED] |
| `/dogwalker/data/volunteer-files/{uuid}/page-01.jpg` | 200 | text/html | 7,552 | dogwalker-pwa/index.html (7,552 bytes) | ✅ YES [VERIFIED] |
| `/volunteer/intake-audio/44/voice.webm` | 200 | text/html | 6,478 | volunteer-pwa/index.html (6,478 bytes) | ✅ YES [VERIFIED] |

**No PII document is served on any prefix path.** The 200 is misleading but harmless — browsers receiving HTML when expecting a PDF/image/audio will either display a blank page or show the SPA shell (which then fails to route client-side). [VERIFIED]

### shelter.db specifically:
- `/staff/data/shelter.db` → 200 text/html 19,054 bytes (SPA shell, NOT the DB) [VERIFIED]
- `/data/shelter.db` (direct) → 404 (Phase C whitelist: no mount for `/data/shelter.db`) [VERIFIED]
- Caddy `block_db` → 403 on all vhosts (additional edge layer) [VERIFIED]

The DB is triple-protected: (1) no Express static mount, (2) Caddy block_db 403, (3) SPA prefix returns HTML not binary. [VERIFIED]

---

## 3. Files' Location vs Web Roots

| Content | On-Disk Path | Inside Any Static-Served Tree? | Reachable via Static Mount? |
|---------|-------------|-------------------------------|---------------------------|
| Completed PDFs | `shelter-apps/adoption-pdfs/` | NO — sibling of app dirs, not inside any `*-pwa/` dir | NO — Express mount removed (Phase C) [VERIFIED] |
| Intake audio | `shelter-apps/intake-audio/` | NO — sibling of app dirs | NO — Express mount removed (Phase C) [VERIFIED] |
| Volunteer files | `shelter-apps/data/volunteer-files/` | Was under broad `/data` mount; now NO — Phase C whitelist excludes `volunteer-files/` | NO — 404 on direct path [VERIFIED] |
| shelter.db | `shelter-apps/data/shelter.db` | Was under broad `/data` mount; now NO — Phase C whitelist excludes root `data/` | NO — 404 [VERIFIED] |
| Animal photos | `shelter-apps/data/animal-photos/` | YES — explicit whitelist mount | YES — intentional (Tier-2) [VERIFIED] |
| Featured videos | `shelter-apps/data/featured-videos/` | YES — explicit whitelist mount | YES — intentional (WordPress) [VERIFIED] |

**Root cause of the false alarm:** The SPA catch-all `app.get('/<app>/*')` returns 200 for ANY path under the app prefix, because SPAs handle routing client-side. This is by design — it's how React/Vue/SPA routing works. The response is always `index.html`, never the file from the URL path. [VERIFIED]

---

## 4. Fix Options (Not Implemented)

**No fix needed for the SPA-prefix paths.** They do not serve PII documents. The 200 text/html response is the intended SPA behavior. [VERIFIED]

However, for hygiene, the SPA catch-all could be tightened to 404 on known non-SPA subpaths (e.g. `/dogwalker/adoption-pdfs/*` → 404 instead of index.html). This is **cosmetic**, not a security fix — it would reduce confusion in security scans that flag 200s. Not recommended as a priority. [INFERRED]

### /api/docs routes are independent
The gated `/api/docs/*` routes read files from disk using absolute paths (e.g., `path.join(ROOT_DIR, 'adoption-pdfs', ...)`) — they do NOT depend on any Express static mount. Removing all static mounts would not break gated routes. [VERIFIED]

---

## 5. Live Verification Matrix (Phase C code is running)

The shelter-app service was restarted at **2026-07-04 21:17:01 UTC**, AFTER the Phase C build (commit `6cdc3d1` at 21:14:41 UTC). All Phase C changes are live. [VERIFIED — `systemctl show shelter-app --property=ActiveEnterTimestamp`]

| Path | Expected | Actual | Status |
|------|----------|--------|--------|
| `/adoption-pdfs/12-Test.pdf` (direct) | 404 (mount removed) | 404 | ✅ [VERIFIED] |
| `/intake-audio/44/voice.webm` (direct) | 404 (mount removed) | 404 | ✅ [VERIFIED] |
| `/data/volunteer-files/{uuid}/page.jpg` (direct) | 404 (whitelist excludes) | 404 | ✅ [VERIFIED] |
| `/data/shelter.db` (direct) | 404 (whitelist excludes) | 404 | ✅ [VERIFIED] |
| `/data/shelter.db` (via Caddy) | 403 (block_db) | 403 | ✅ [VERIFIED] |
| `/data/animal-photos/{id}/{file}` | 200 (Tier-2 mount) | 200 (27,846 bytes) | ✅ [VERIFIED] |
| `/data/featured-videos/aspen_vid.mp4` (via IP block) | 200 (WordPress) | 200 (2,785,922 bytes) | ✅ [VERIFIED] |
| `/api/docs/adoption-pdf/12` (no token) | 401 (gated) | 401 | ✅ [VERIFIED] |
| `/api/docs/volunteer-file/{uuid}/{file}` (no token) | 401 (gated) | 401 | ✅ [VERIFIED] |
| `/api/docs/intake-audio/44/{file}` (no token) | 401 (gated) | 401 | ✅ [VERIFIED] |

---

## 6. Caddy Reload State

- **ActiveEnterTimestamp:** `Sun 2026-03-15 20:47:23 UTC` — this is the PROCESS start time, NOT the last config reload. Caddy reloads in-place without process restart. [VERIFIED]
- **Caddyfile on disk:** Modified `2026-07-04 21:30:52 UTC` — the dogwalker block no longer has the `@adoptionpdfs` file_server or `@testadoptes` handler. [VERIFIED]
- **Running config (admin API):** Also does NOT have file_server in the dogwalker block. [VERIFIED — `curl localhost:2019/config/` confirms no file_server handler in dogwalker routes]
- **Conclusion:** The running Caddy config matches the on-disk Caddyfile — a reload was applied at some point between March and now (likely via `caddy reload` or API). [VERIFIED]

### Stale passthrough paths in dashboard block
The dashboard vhost still has `/adoption-pdfs/*` and `/intake-audio/*` in the `@standalone` passthrough list (both on-disk and running config). These are harmless now (Express returns 404 for both), but should be removed for hygiene in John's Caddy cleanup step. [VERIFIED]

---

## Summary

**No PII leak exists.** The 200 responses on SPA-prefix paths (`/dogwalker/adoption-pdfs/...`, `/staff/data/shelter.db`, etc.) are the SPA `index.html` shells (confirmed by exact byte-size match and `text/html` content-type), not the actual documents. Phase C mount removal is live and working — all direct paths to PII documents return 404. Gated routes return 401 without token. WordPress featured-videos and Tier-2 animal media continue serving normally.
