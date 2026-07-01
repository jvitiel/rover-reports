# Auditor 3 — PWA / Client-Tier Security Pull

**Date:** 2026-07-01 02:20 UTC

---

## 1. Public/Auth Split

### Caddy routing

All seven app subdomains use the same Caddy pattern: `import security_headers`, proxy `/api/*` to `localhost:3000`, rewrite non-API paths to the app's static directory, no `basic_auth` or edge-level authentication in any block. [VERIFIED — Caddyfile inspection of all 7 blocks]

### Anonymous GET matrix

| App subdomain | HTTP status | What anonymous client sees |
|---------------|-------------|--------------------------|
| staff.4lgshelterapp.duckdns.org | 200 | **(c) App shell served directly** — full HTML/JS SPA |
| volunteer.4lgshelterapp.duckdns.org | 200 | **(c) App shell served directly** |
| dogwalker.4lgshelterapp.duckdns.org | 200 | **(c) App shell served directly** |
| matcher.4lgshelterapp.duckdns.org | 200 | **(c) App shell served directly** |
| caregiver.4lgshelterapp.duckdns.org | 200 | **(c) App shell served directly** |
| coordinator.4lgshelterapp.duckdns.org | 200 | **(c) App shell served directly** |
| custom-search.4lgshelterapp.duckdns.org | 200 | **(c) App shell served directly** |

[VERIFIED — anonymous `curl -sSI` to each subdomain returned HTTP 200 with full HTML]

**No app challenges, redirects, or blocks an unauthenticated client at the HTML/shell level.** All serve their full client-side SPA to any internet client. Authentication, to the extent it exists at all, is app-level — examined in item 2.

---

## 2. Auth Model

### Two-tier model: name-entry vs. per-user auth

The seven apps use two fundamentally different authentication approaches:

#### Tier 1 — Name-entry apps (staff, volunteer, dogwalker, caregiver, coordinator): NO authentication

These five apps use a client-side "name entry" flow. The user types their name into a text input, which is saved to `localStorage` (e.g., `staff_name`, `volunteer_name`, `dogwalker_name`). There is:

- **No password, PIN, or credential** — the "login" is a free-text name entry with no server validation
- **No server-side session** — no token, cookie, or session ID is issued
- **No auth middleware on any API endpoint** — every `/api/dashboard/*`, `/api/volunteer/*`, `/api/dogwalker/*`, `/api/caregiver/*`, `/api/coordinator/*` endpoint accepts requests from any caller with no authentication check whatsoever

The name is used only as a label for attributing actions (e.g., "who fed this animal") — it is not a security credential. [VERIFIED — source inspection of `saveName()` in staff-pwa/app.js; grep for any auth middleware on these route groups returned zero matches]

#### Tier 2 — RG Cares Portal: per-user bearer-token auth

The RG Cares portal (accessed through coordinator) uses proper per-user authentication:

- **Credentials:** email + PIN, stored in the `rg_requesters` table with `pin_hash` (hashed via `verifyPin()`) [VERIFIED — `/api/rg/login` route handler]
- **Session:** successful login calls `createRGSession(requesterId)` which generates a random token stored in the `rg_sessions` table [VERIFIED — source inspection]
- **Token delivery:** returned as JSON `{ token }` in the login response — stored client-side (examined in item 3)
- **Validation:** `rgAuthMiddleware` checks the `Authorization: Bearer <token>` header on every request, calls `validateRGSession(token)` which queries the DB, rejects with 401 if invalid or expired [VERIFIED — source of `rgAuthMiddleware()`]
- **Routes protected:** all `/api/rg/*` endpoints except `/api/rg/login` have `rgAuthMiddleware` attached [VERIFIED — grep of all `/api/rg/` routes]

#### Tier 3 — Public apps (matcher, custom-search): intentionally unauthenticated

Matcher and custom-search are public-facing tools for prospective adopters. They have no login flow and no auth — this is by design. [VERIFIED — no login code in matcher-preview or custom-search]

---

## 3. Client-Side Token/PII Storage

### localStorage usage by app

| App | Keys stored | Contains auth token? | Contains PII? |
|-----|------------|---------------------|---------------|
| staff-pwa | `staff_name`, `staff_sessions` (active feeding/activity session IDs), `staff_queue` (offline action queue), `notif_seen_hash` | No | **staff_name** (self-entered name, not from DB) |
| volunteer-pwa | `volunteer_name`, `volunteer_sessions`, `volunteer_queue` | No | **volunteer_name** (self-entered) |
| dogwalker-pwa | `dogwalker_name`, `dogwalker_active_walks`, `dogwalker_queue` | No | **dogwalker_name** (self-entered) |
| caregiver-pwa | `offlineQueue` (queued caregiver notes) | No | **offlineQueue** may contain animal behavior notes with caregiver name |
| coordinator-pwa | (none) | No | No |
| matcher-preview | (none) | No | No |
| custom-search | `lastWaitVideo` (sessionStorage, not localStorage) | No | No |
| dashboard | (none) | No | No |

[VERIFIED — `grep -rn localStorage/sessionStorage` across all client directories]

### RG Cares token storage

The RG Cares login response contains `{ token }`. The coordinator app's RG module would store this client-side for subsequent API calls. Since coordinator-pwa has no localStorage usage, the token is likely held in a JavaScript variable (in-memory only, lost on page refresh). [INFERRED — no localStorage/sessionStorage writes found in coordinator-pwa code; token must be held in JS runtime]

### Cookies

No `Set-Cookie` headers are issued by any login endpoint. No `document.cookie` writes exist in any client code. No `express-session` or `cookie-session` middleware is used in server.ts. [VERIFIED — grep for cookie patterns returned zero; no session middleware imports]

### Auth token in localStorage/sessionStorage

**None.** No auth tokens, bearer tokens, or session IDs are stored in localStorage or sessionStorage in any app. [VERIFIED]

---

## 4. Service Worker Caching

| App | Service worker? | Caching strategy | Caches API/data responses? |
|-----|----------------|-------------------|--------------------------|
| staff-pwa | ✅ sw.js | Precache static assets; network-first for code files; cache-first for images; **API calls bypass cache entirely** (`if (url.pathname.includes('/api/')) return;`) | **No** — API responses never cached |
| staging-staff | ✅ sw.js | Same as staff-pwa | **No** |
| volunteer-pwa | ✅ sw.js | Same pattern; API bypass (`if (event.request.url.includes('/api/')) return;`) | **No** |
| dogwalker-pwa | ✅ sw.js | Same pattern; API bypass | **No** |
| caregiver-pwa | ✅ sw.js | API bypass (`if (url.pathname.startsWith('/api/')) return;`) | **No** |
| coordinator-pwa | ✅ sw.js | API bypass | **No** |
| matcher-preview | ❌ | — | — |
| custom-search | ❌ | — | — |
| dashboard | ❌ | — | — |

**No service worker caches API/data responses.** All six SW-enabled apps explicitly bypass the cache for `/api/*` paths, so no PII (applicant data, volunteer rosters, foster contacts, caregiver notes) is cached on-device via service workers. [VERIFIED — source inspection of all six sw.js files]

Precached assets are static only: index.html, styles.css, app.js, manifest.json, icons, placeholder images, fonts.

---

## 5. Secrets in Client Bundles

**None found.** Grep across all nine client directories (staff-pwa, staging-staff, volunteer-pwa, dogwalker-pwa, matcher-preview, caregiver-pwa, coordinator-pwa, custom-search, dashboard) for credential patterns:

- `sk-`, `re_`, `AIza`, `xai-`, `ghp_`, `ghs_`, `AKIA`, `Basic ` — zero matches [VERIFIED]
- `apiKey`, `_KEY`, `Bearer`, `anthropic`, `openai`, `xai`, `resend`, `telegram`, `shelterManager` — zero credential-bearing matches (only false positives: CSS class names, time-token parsing regex) [VERIFIED]

All API keys (Anthropic, OpenAI, Resend, ShelterManager, etc.) are loaded server-side from `shelter-secrets.json` and never sent to clients. [VERIFIED — server.ts reads secrets via `SECRETS_PATH`; no client JS references secret values]

---

## 6. Endpoint Auth Enforcement — Server-Side

### 6a. /api/volunteers/timeclock/auto-close

**Route definition:**
```typescript
app.post('/api/volunteers/timeclock/auto-close', (_req: Request, res: Response) => {
```

**No auth middleware attached.** The route accepts any caller — no bearer token check, no IP restriction, no shared secret. [VERIFIED — route declaration in server.ts]

**Publicly reachable through Caddy:** Yes. All seven app Caddy blocks proxy `/api/*` to `localhost:3000`. Any of the seven subdomains would route a POST to this endpoint. [VERIFIED — Caddyfile pattern; determination made from code inspection only, no POST issued]

### 6b. Representative endpoint sample — auth middleware presence

**State-changing endpoints (POST/PUT/DELETE):**

| Endpoint | Method | Auth middleware? | Notes |
|----------|--------|-----------------|-------|
| `/api/adoption-application` | POST | ❌ None | Has `adoptionLimiter` (rate limit), but no auth |
| `/api/volunteers` | POST | ❌ None | Has `volunteerWebFormLimiter`, no auth |
| `/api/volunteers/upload` | POST | ❌ None | Has `volunteerUpload` (multer), no auth |
| `/api/volunteers/timeclock/auto-close` | POST | ❌ None | |
| `/api/notifications/staff` | POST | ❌ None | |
| `/api/notifications/staff/repush` | POST | ❌ None | |
| `/api/dogwalker/walk/start` | POST | ❌ None | |
| `/api/dogwalker/walk/end` | POST | ❌ None | |
| `/api/volunteer/session/start` | POST | ❌ None | |
| `/api/volunteer/session/end` | POST | ❌ None | |
| `/api/caregiver/save` | POST | ❌ None | Has `express.json()`, no auth |
| `/api/caregiver/eval-followups` | POST | ❌ None | |
| `/api/coordinator/process` | POST | ❌ None | |
| `/api/bio/:bioId/approve/long` | POST | ❌ None | |
| `/api/bio/:bioId/approve/short` | POST | ❌ None | |
| `/api/animals/:shelterCode/adoption-pending` | PUT | ❌ None | |
| `/api/intake` | POST | ❌ None | |
| `/api/profile/photo` | POST | ❌ None | |
| `/api/rg/requests` | POST | ✅ `rgAuthMiddleware` | RG Cares only |
| `/api/rg/requests/:id/messages` | POST | ✅ `rgAuthMiddleware` | RG Cares only |

[VERIFIED — grep of each route declaration in server.ts showing middleware arguments]

**PII-returning endpoints (GET):**

| Endpoint | Auth middleware? | Data returned |
|----------|-----------------|---------------|
| `/api/adoption-applications` | ❌ None | List with applicant names, emails, phone numbers, animal interests |
| `/api/volunteers` | ❌ None | Full volunteer roster: names, emails, phones, addresses, approval status |
| `/api/volunteers/:id` | ❌ None | Complete volunteer record including form_data, OCR, all PII |
| `/api/volunteers/timeclock/recent` | ❌ None | Recent clock-in/out with volunteer names |
| `/api/volunteers/timeclock/report` | ❌ None | Timeclock report with names and hours |
| `/api/notifications/staff` | ❌ None | Staff notification feed |
| `/api/dashboard/profiles-summary` | ❌ None | Animal profiles summary |
| `/api/dashboard/behavior-notes` | ❌ None | Behavior notes with staff/caregiver names |
| `/api/animals` | ❌ None | Animal data (not human PII) |
| `/api/rg/requests` | ✅ `rgAuthMiddleware` | RG Cares requests |
| `/api/rg/requests/:id` | ✅ `rgAuthMiddleware` | Individual RG request |
| `/api/rg/attachments/:id` | ✅ `rgAuthMiddleware` | RG attachment files |

[VERIFIED — route declarations and return data inspection]

### 6c. PII-returning endpoints reachable without authentication

**YES — multiple endpoints return PII to any anonymous caller:**

1. **`GET /api/adoption-applications`** — returns applicant names, emails, phone numbers, animal type, status. No auth. [VERIFIED — route handler returns `getAdoptionApplications()` data including `applicant_name`, `applicant_email`]

2. **`GET /api/volunteers`** — returns full volunteer roster: `full_name`, `email`, `cell_phone`, `home_phone`, `address_city`, `address_state`, approval status, all approved task flags. No auth. [VERIFIED — `getVolunteers()` SELECT includes all PII columns]

3. **`GET /api/volunteers/:id`** — returns complete individual volunteer record via `getVolunteerById()` which does `SELECT *` — includes `form_data` (full application JSON), `ocr_raw`, all PII. No auth. [VERIFIED — route handler returns full `VolunteerRow`]

4. **`GET /api/volunteers/timeclock/*`** (recent, search, status, history, all, report) — returns volunteer names + timeclock data. No auth. [VERIFIED]

---

## 7. Role Authorization

**There is no role or scope enforcement.** Once a user "logs in" (by typing a name), they have full access to every API endpoint served by the Express app. There are no role checks, permission gates, or scope restrictions anywhere in server.ts outside of the RG Cares module. [VERIFIED — grep for `role`, `permission`, `scope`, `isAdmin`, `isStaff`, `authorize` returned zero relevant matches outside RG Cares and AI prompt text]

Concretely:
- A dogwalker app client can call `/api/adoption-applications` and get the full adoption PII [INFERRED — no CORS-only restriction; same-origin policy doesn't apply to direct curl/fetch from outside; CORS blocks are browser-enforced only and the endpoint has no server auth]
- Any internet client can call any `/api/*` endpoint directly (bypassing the SPA) with no authentication [VERIFIED — no auth middleware on any non-RG route]

The CORS allowlist blocks **browser-initiated cross-origin requests** from unauthorized origins, but does not protect against direct HTTP calls (curl, scripts, non-browser clients). CORS is a browser security mechanism, not an API authentication mechanism. [VERIFIED — CORS origin callback in server.ts allows `!origin` requests through (server-to-server/curl)]

---

## 8. Response Security Headers

All seven apps share the same headers via the Caddy `security_headers` snippet:

| Header | Value | Source |
|--------|-------|--------|
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` | Caddy |
| X-Content-Type-Options | `nosniff` | Caddy |
| X-Frame-Options | `DENY` | Caddy |
| Referrer-Policy | `strict-origin-when-cross-origin` | Caddy |
| **Content-Security-Policy** | **ABSENT** | — |

[VERIFIED — `curl -sSI` to each subdomain; CSP explicitly checked on all seven, absent on all]

No per-app variation — all seven use the identical `import security_headers` Caddy snippet. [VERIFIED — Caddyfile inspection]

---

## DIVERGENCES FROM EXPECTED AUTH MODEL

| # | Finding | Severity | Detail |
|---|---------|----------|--------|
| **D1** | **All PII-returning API endpoints are unauthenticated** | **Critical** | `/api/adoption-applications`, `/api/volunteers`, `/api/volunteers/:id` return applicant names, emails, phones, addresses, full application forms to any anonymous internet caller. No auth middleware on any non-RG endpoint. |
| **D2** | **All state-changing API endpoints are unauthenticated** | **Critical** | POST endpoints that create feeding sessions, walk records, behavior notes, approve bios, set adoption-pending status, create staff notifications, auto-close timeclock shifts — all accept requests from any caller. No authentication, no authorization, no CSRF protection. |
| **D3** | **No server-side authentication exists for 5 of 7 apps** | **Critical** | staff, volunteer, dogwalker, caregiver, coordinator have no authentication mechanism at all — the "login" is a client-side name-entry stored in localStorage with no server validation. Only RG Cares has real auth. |
| **D4** | **Content-Security-Policy absent on all apps** | Medium | No CSP header on any app. Combined with the name-in-localStorage pattern (D5), an XSS vulnerability would have full access to all localStorage data and could make authenticated-looking API calls. |
| **D5** | **Staff/volunteer names in localStorage** | Low | Self-entered names (not DB-sourced credentials), but XSS-exfiltratable. Low severity because these are not auth tokens and the names are not secret — but they are used for action attribution. |
| **D6** | **POST /api/volunteers/timeclock/auto-close is publicly reachable with no auth** | High | Intended to be called by root cron on localhost, but Caddy proxies all `/api/*` paths publicly. Any internet client can trigger the auto-close. |
| **D7** | **CORS allows null-origin / no-origin requests** | Info | The CORS callback allows requests with no Origin header (returns `true` for `!origin`). This is intentional for server-to-server calls but means CORS provides zero protection against non-browser clients. |
