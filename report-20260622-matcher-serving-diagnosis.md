# Matcher Serving Diagnosis: How Production Is Served + Parallel-Host Recipe

**Date:** 2026-06-22 16:05 UTC  
**Mode:** Read-only diagnosis  

---

## 1. Caddy Block for the Matcher

**File:** `/etc/caddy/Caddyfile`, lines 111-119

```caddyfile
# Public Matcher Web
matcher.4lgshelterapp.duckdns.org {
	import security_headers
	@api path /api/*
	reverse_proxy @api localhost:3000
	@notapi not path /api/*
	rewrite @notapi /matcher{uri}
	reverse_proxy localhost:3000
}
```

**How it works:** ALL traffic goes through `reverse_proxy localhost:3000` (the Node/Express app). API requests (`/api/*`) pass through directly. Non-API requests are **rewritten** with a `/matcher` prefix before proxying — so a browser request for `/app.js` becomes `/matcher/app.js` hitting Express, which serves it from its static mount.

**Established pattern for other subdomains** — e.g. dogwalker (Caddyfile lines 31-57):

```caddyfile
dogwalker.4lgshelterapp.duckdns.org {
	import security_headers
	@api path /api/*
	reverse_proxy @api localhost:3000
	@data path /data/*
	reverse_proxy @data localhost:3000
	@notapi not path /api/* /data/* /adoption-pdfs/* /test-adoption-es /public/*
	rewrite @notapi /dogwalker{uri}
	reverse_proxy localhost:3000
}
```

Same pattern: rewrite non-API paths with the app-name prefix, proxy to Node. Some subdomains also pass `/data/*` through for media files.

**One exception:** `draft.4lgshelterapp.duckdns.org` uses Caddy `file_server` directly (root `/var/www/draft`, no proxy to Node). That's the only one.

## 2. Static Files Location

**Path:** `/home/shelter/shelter-apps/matcher-web/`

```
$ ls /home/shelter/shelter-apps/matcher-web/
app.js  cat.jpg  index.html  logo.jpg  placeholder.png  styles.css
(plus .backup and .pre-restyle copies)
```

**Express mount** — server.ts:10550:

```typescript
app.use('/matcher', express.static(path.join(ROOT_DIR, 'matcher-web')));
```

**So:** The matcher frontend is served by **Node/Express** via `express.static`, not by Caddy `file_server`. Caddy rewrites the URL to add the `/matcher` prefix, then proxies to Express which serves the static files from `matcher-web/`. The API (`/api/*`) and data (`/data/*`) are also served by the same Express app.

## 3. API Origin

**matcher-web/app.js:2:**

```javascript
const API_BASE = '/api';
```

The API is accessed via **same-origin relative paths** (`/api/animals`, `/api/photos/:id`, etc.). Since Caddy proxies everything (static + API) to the same Node backend, the browser sees both as same-origin. No cross-origin requests.

This means: a copy at a different subdomain, using the same Caddy pattern (rewrite + proxy to localhost:3000), would **also** hit the API as same-origin — no CORS issue, no API-base edit needed. The relative `/api` path works regardless of the hostname because Caddy proxies everything to the same backend.

## 4. DuckDNS / Subdomain Setup

**Wildcard DNS is in effect.** A non-existent subdomain resolves:

```
$ dig +short nonexistent-test.4lgshelterapp.duckdns.org
66.228.37.38

$ dig +short matcher.4lgshelterapp.duckdns.org
66.228.37.38
```

DuckDNS has a wildcard A record for `*.4lgshelterapp.duckdns.org` → `66.228.37.38`. **No new DuckDNS entry is needed** for a new subdomain. Any `anything.4lgshelterapp.duckdns.org` already resolves to the VPS.

## 5. TLS/Cert Model

**Automatic per-host ACME (Let's Encrypt, HTTP-01 challenge).** No explicit `tls` directive in the Caddyfile. No DNS challenge configuration. No wildcard cert.

Caddy's default behavior: when a new HTTPS site block is added to the Caddyfile and reloaded, Caddy automatically obtains a Let's Encrypt certificate for that hostname via HTTP-01 challenge. This takes 2-10 seconds on first request.

**A new subdomain gets a cert automatically** on Caddy reload — just add the site block and reload. The wildcard DNS is already resolving, so the HTTP-01 challenge succeeds immediately.

## 6. Parallel-Host Recipe (Identify Only — Do Not Execute)

### Goal
Serve a copy of `matcher-web` at `matcher-preview.4lgshelterapp.duckdns.org` hitting the same live API, without touching production.

### Steps

**Step 1 — Copy the frontend:**
```bash
cp -r /home/shelter/shelter-apps/matcher-web /home/shelter/shelter-apps/matcher-preview
```

**Step 2 — Add Express static mount** (server.ts, near line 10550):
```typescript
app.use('/matcher-preview', express.static(path.join(ROOT_DIR, 'matcher-preview')));
```

**Step 3 — Add Caddy site block** (Caddyfile):
```caddyfile
matcher-preview.4lgshelterapp.duckdns.org {
	import security_headers
	@api path /api/*
	reverse_proxy @api localhost:3000
	@data path /data/*
	reverse_proxy @data localhost:3000
	@notapi not path /api/* /data/*
	rewrite @notapi /matcher-preview{uri}
	reverse_proxy localhost:3000
}
```

**Step 4 — Add CORS origin** (server.ts ALLOWED_ORIGINS array):
```typescript
'https://matcher-preview.4lgshelterapp.duckdns.org',
```

While same-origin relative `/api` calls from the preview subdomain will be proxied through to the same Express app (and thus technically same-server), the browser's `Origin` header will carry the preview hostname. The CORS middleware checks `ALLOWED_ORIGINS` for every request with an `Origin` header. **Without adding the preview origin, API calls from the preview will be CORS-blocked.** This is the critical gotcha.

There are also three SSE/WebSocket CORS checks at server.ts:8688, 8954, and 9371 that independently check `ALLOWED_ORIGINS` — these also need the preview origin added.

**Step 5 — Add rate-limit static exemption** (server.ts, `staticPrefixes` array):
```typescript
'/matcher-preview/',
```

Without this, static asset requests count toward the global rate limit, which could cause white-screen loading failures.

**Step 6 — Rebuild + restart + Caddy reload:**
```bash
cd /home/shelter/shelter-apps/server && npm run build && sudo systemctl restart shelter-app
sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

**DuckDNS:** No action needed — wildcard already resolves.  
**TLS:** Automatic on Caddy reload.  
**app.js API_BASE:** No change needed — relative `/api` works on any hostname with the same proxy pattern.

### No-edit-to-app.js note

The copy's `app.js` uses `const API_BASE = '/api'` (relative). Since Caddy proxies both the preview frontend and `/api/*` to the same Express backend, all API calls are same-origin. No API base URL change needed.

### Cutover

When the preview version is approved:
1. Swap directories: `mv matcher-web matcher-web-old && mv matcher-preview matcher-web`
2. Update Express mount if the preview had a separate one (or just keep it — both paths serve the same dir after swap)
3. No Caddy change needed for the swap — `matcher.4lgshelterapp.duckdns.org` already proxies to Express which serves from `matcher-web/`
4. Optionally remove the preview Caddy block + CORS entry after cutover

### Gotchas

1. **CORS is the #1 gotcha.** The preview origin must be in `ALLOWED_ORIGINS` (+ the 3 SSE/WS checks) or every API call fails. Easy to miss since the current matcher works without thinking about CORS (same origin).
2. **Rate-limit static exemption** — the preview prefix must be in the `staticPrefixes` skip list or static assets eat the rate-limit budget.
3. **Crop URLs / image paths** — crop and media URLs in API responses use the `dogwalker.4lgshelterapp.duckdns.org` hostname (hardcoded in the crop_url generation). These work cross-origin as plain image loads (no CORS issue for `<img src>`), but if any `fetch()` calls reference them, the dogwalker origin would need to serve appropriate CORS headers. Currently this isn't an issue — all image loads are via `<img>` tags.
4. **Service worker** — if matcher-web has a service worker, the preview copy would register a separate one scoped to the preview origin. Verify there's no SW caching production assets.
