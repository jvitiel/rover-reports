# Stage A: Matcher Preview Plumbing

**Date:** 2026-06-22 16:15 UTC  
**Commit:** `5f35c7c`  
**Files:** `server/src/server.ts` (+4 lines), `matcher-preview/` (verbatim copy of matcher-web/, 10 files)

---

## Step 0: Service Worker Check

```
$ grep -rn 'serviceWorker\|service-worker\|sw\.js\|workbox' matcher-web/
(no output, exit 1)
```

**No service worker** in matcher-web/. No scope conflict risk for the preview copy.

## Step 1: Frontend Copy

```
$ cp -r matcher-web matcher-preview
$ diff -rq matcher-web matcher-preview
(no output — identical)
```

Files: `app.js`, `cat.jpg`, `index.html`, `index.html.backup`, `index.html.pre-restyle`, `logo.jpg`, `placeholder.png`, `styles.css`, `styles.css.backup`, `styles.css.pre-restyle`. No files edited in `matcher-preview/`.

## Step 2: Express Mount (server.ts:10552-10553)

Added immediately after the existing matcher mount:

```typescript
// line 10550 (existing, unchanged)
app.use('/matcher', express.static(path.join(ROOT_DIR, 'matcher-web')));
// line 10552-10553 (NEW)
// Serve matcher preview (unmodified copy for testing new frontend builds)
app.use('/matcher-preview', express.static(path.join(ROOT_DIR, 'matcher-preview')));
```

## Step 3: CORS Origin (server.ts:670)

Added to the `ALLOWED_ORIGINS` array:

```typescript
  'https://custom-search.4lgshelterapp.duckdns.org',
  'https://matcher-preview.4lgshelterapp.duckdns.org',  // NEW
  // WordPress staging and production (current + future)
```

The three SSE/WS CORS checks at server.ts:8688, 8954, 9371 all reference `ALLOWED_ORIGINS` — no separate lists. Adding the origin to the single array covers all four CORS checkpoints.

## Step 4: Rate-Limit Static Exemption (server.ts:718)

Added to the `staticPrefixes` skip array:

```typescript
      '/intake-photos/', '/intake-audio/', '/custom-search/',
      '/matcher-preview/',  // NEW
```

## Step 5: Build + Restart

```
$ cd server && npm run build → exit 0 (tsc clean)
$ sudo systemctl restart shelter-app → active
```

## Step 6: Caddy Block (FOR JOHN TO ADD)

Add this block to `/etc/caddy/Caddyfile` (e.g. after the existing matcher block):

```caddyfile
# Matcher Preview (same live API, preview frontend)
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

Then validate and reload:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy will auto-obtain a Let's Encrypt cert for the new subdomain on reload (wildcard DNS already resolves). No DuckDNS action needed.

## Step 7: Verification

### Preview serves via Express (localhost):

```
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/matcher-preview/index.html
200

$ curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/matcher-preview/app.js
200

$ curl -s http://localhost:3000/matcher-preview/app.js | head -2
// Four Legs Good - Pet Adoption Matcher
const API_BASE = '/api';
```

### Production matcher unaffected:

```
$ curl -s -o /dev/null -w "%{http_code}" https://matcher.4lgshelterapp.duckdns.org/
200

$ curl -s -o /dev/null -w "%{http_code}" https://matcher.4lgshelterapp.duckdns.org/app.js
200
```

### API_BASE unmodified in preview:

Confirmed: `const API_BASE = '/api'` (relative same-origin). No edit needed — the Caddy proxy pattern makes `/api/*` same-origin for the preview subdomain.

### What remains gated on John's Caddy reload:

The preview URL `https://matcher-preview.4lgshelterapp.duckdns.org/` is **not publicly reachable** until the Caddy block is added and Caddy is reloaded. The Express mount is live (localhost:3000/matcher-preview/ serves), but external HTTPS access requires Caddy to route the hostname. After Caddy reload, the preview will serve the identical matcher frontend against the live API, fully functional.
