# Matcher Cutover Diagnosis

Read-only. Queried 2026-06-26 ~02:00 UTC.

---

## 1. CADDY / SERVING

**Live matcher:**
- Public hostname: `matcher.4lgshelterapp.duckdns.org` (HTTPS, auto-TLS)
- Caddy block (Caddyfile:111-118): API paths → `reverse_proxy localhost:3000`; all other paths rewritten as `/matcher{uri}` → `reverse_proxy localhost:3000`
- Express mount (server.ts:10802): `app.use('/matcher', express.static(path.join(ROOT_DIR, 'matcher-web')))`
- SPA fallback (server.ts:10811): `app.get('/matcher/*', ...)` → sends `matcher-web/index.html`
- **Directory: `/home/shelter/shelter-apps/matcher-web/`**

**Reskin (preview):**
- Public hostname: `matcher-preview.4lgshelterapp.duckdns.org` (HTTPS, auto-TLS)
- Caddy block (Caddyfile:171-179): API + `/data/*` → `reverse_proxy localhost:3000`; all other paths rewritten as `/matcher-preview{uri}` → `reverse_proxy localhost:3000`
- Express mount (server.ts:10804): `app.use('/matcher-preview', express.static(path.join(ROOT_DIR, 'matcher-preview')))`
- **Directory: `/home/shelter/shelter-apps/matcher-preview/`**

**Verdict: Different public URLs.** Live = `matcher.4lgshelterapp.duckdns.org`, reskin = `matcher-preview.4lgshelterapp.duckdns.org`. A cutover would mean either (a) swapping directory contents, (b) swapping Express mount paths, or (c) swapping Caddy rewrite targets. All three are equivalent; (a) is simplest.

---

## 2. BACKEND / DATA SOURCE

Both builds use **identical API config**:

| File | Line | Value |
|------|------|-------|
| matcher-web/app.js | 2 | `const API_BASE = '/api';` |
| matcher-preview/app.js | 2 | `const API_BASE = '/api';` |

Both use relative `/api` paths (no hardcoded hostname). Because both Caddy blocks proxy `/api/*` to `localhost:3000`, both hit the **same production Express server** and the **same production SM data + SQLite DB**.

**Hostname scan across all reskin files** (app.js, index.html, styles.css): zero matches for `localhost`, `127.0.0.1`, `staging`, `johnv80`, `sg-host`, or any duckdns subdomain. The only `sheltermanager` references are in comment text ("ShelterManager color"), not URLs.

**Verdict: Both point at production. Zero staging/dev references. Cutover is data-safe.**

---

## 3. SERVICE WORKER

| Check | matcher-web | matcher-preview |
|-------|-------------|-----------------|
| SW file on disk | ❌ none | ❌ none |
| `navigator.serviceWorker` in JS | ❌ none | ❌ none |
| `navigator.serviceWorker` in HTML | ❌ none | ❌ none |
| manifest.json | ❌ none | ❌ none |

**Neither build registers a service worker or has a web app manifest.**

**Verdict: Zero SW collision risk. No cache to bust. Cutover is cache-safe.**

---

## 4. GIT STATE

Working tree is **clean** — `git status --short -- matcher-web/ matcher-preview/` returns no output.

### matcher-web recent commits:
```
8eea34a Remove Match Score badge from matcher detail popup (both dirs)
f67105f Phase D4: Bonded Pair — matcher-web cards show stacked status badges
2671a73 Phase B: Adoption Pending — matcher-web cards show pending status
1cddb84 Matcher i18n Stage 3: HTML lang attribute + page title + results count template
e392084 Matcher toggle: use full language names, increase size
36c3b5b Matcher i18n Stage 2: toggle UI + searcher CTA URL threading
d0b005b Matcher i18n Stage 1: foundation + language detection + bio fallback
203060b Phase 18a: realign age bucket thresholds across all 4 locations
```

### matcher-preview recent commits:
```
5babd88 matcher-preview: hero subtitle → 'Let\'s find your new best friend' (EN + ES + HTML fallback)
4bbb864 Localize matcher-preview popup values (sex/age/color) in Spanish + fix overlay weeks gap
1bcffd0 Matcher-preview: abbreviate ES filter labels for two-line fit
8eea34a Remove Match Score badge from matcher detail popup (both dirs)
0505901 Localize preview hover overlay: i18n for all 14 attribute strings
4055c67 Fix preview header: greeting + emoji removal in app.js i18n
b887b04 Preview header/tabs: SEARCHER-style greeting, serif title, coral pills
25d279e Preview header restyle: remove logo+CTA, tan bg, centered dark title
```

### In-progress item status:

**(a) Reskin subtitle changes:** ✅ **Present and committed.** Commit `5babd88` (Jun 25): "hero subtitle → 'Let's find your new best friend' (EN + ES + HTML fallback)". 2 files changed (app.js + index.html).

**(b) Crop-editor rotate button:** ✅ **Present and committed, but in dashboard — NOT in matcher.** Commits `6cb8fef` (backend --rotate param) and `21583b8` (dashboard rotate button UI) are in `dashboard/index.html` and `server/src/server.ts`. The matcher (both live and preview) has no crop editor — the rotate button is a dashboard-only feature. The only "rotation" reference in matcher app.js is the photo lightbox carousel rotation (cycling through images), which is unrelated.

---

## 5. SUBMISSION PATHS

**Both matcher builds are read-only browse experiences.** Neither contains:
- Form submissions (no `<form action=`, no `POST` calls)
- Email sending (no `sendMail`, `nodemailer`, `email`, `inquiry` references)
- Adoption application submission paths
- Any write endpoint calls

The only API interaction is:
- `GET /api/animals` (or similar) — animal data fetch
- `POST /api/matcher/custom-search` — the AI-powered custom search (read-only query, returns ranked results)
- `GET /data/*` — crop/photo URLs (static file serving)

**Verdict: No submission paths. Both builds are purely read-only. Cutover has zero write-path risk.**

---

## Summary

A cutover (swap reskin into the live URL) is **safe** on all axes:
1. **Same backend** — both use relative `/api`, both proxy to the same production Express server
2. **No service worker** — no cache collision, no stale-content risk, no unregister step needed
3. **Git clean** — all work committed, subtitle changes landed, rotate button is dashboard-only (N/A for matcher)
4. **Read-only** — no submission/email/write paths in either build
5. **Simplest swap** — rename `matcher-web` → `matcher-web-old`, rename `matcher-preview` → `matcher-web`, restart shelter-app (Express mount path stays `/matcher`)
