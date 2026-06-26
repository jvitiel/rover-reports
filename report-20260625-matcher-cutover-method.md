# Matcher Cutover Method — Exact Changes Needed

Read-only diagnosis. Queried 2026-06-26 ~02:09 UTC.

---

## 1. CADDY BLOCK DIFF

### Live block (Caddyfile:111-118):
```
matcher.4lgshelterapp.duckdns.org {
	import security_headers
	@api path /api/*
	reverse_proxy @api localhost:3000
	@notapi not path /api/*
	rewrite @notapi /matcher{uri}
	reverse_proxy localhost:3000
}
```

### Preview block (Caddyfile:171-179):
```
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

### Lines the preview block has that the live block LACKS:

| Line | Preview block | Live block |
|------|--------------|------------|
| `@data path /data/*` | ✅ present | ❌ missing |
| `reverse_proxy @data localhost:3000` | ✅ present | ❌ missing |
| `@notapi not path /api/* /data/*` | ✅ excludes both `/api/*` AND `/data/*` | ❌ excludes only `/api/*` |

### What happens if we serve the reskin under the LIVE block as-is:

**`/data/*` requests would break.** Under the live block, a request to `/data/animal-media/crops/S2026345-8739.jpg` hits the `@notapi` matcher (since it's not `/api/*`), gets rewritten to `/matcher/data/animal-media/crops/S2026345-8739.jpg`, and proxied to Express. Express has no mount at `/matcher/data/...` — it would fall through to the SPA fallback (`matcher-web/index.html`), returning HTML instead of a JPEG. **All locally-hosted photos (crops, uploads, thumbnails) would fail to load.**

SM-hosted photos (external URLs like `https://service.sheltermanager.com/...`) would be **unaffected** because the browser fetches those directly, not through Caddy.

**Fix required:** Add the `/data/*` passthrough to the live block before cutover. Two lines added, one line modified.

---

## 2. RESKIN ASSET + IMAGE PATHS

### Own assets (matcher-preview/index.html):
```html
<link rel="stylesheet" href="styles.css">        <!-- relative -->
<script src="app.js"></script>                     <!-- relative -->
```
All own assets use **bare relative paths** (no prefix). Under a Caddy rewrite from `/` → `/matcher{uri}`, `styles.css` resolves to `/styles.css` → rewritten to `/matcher/styles.css` → Express serves `matcher-web/styles.css`. ✅ This works correctly after a directory swap.

Google Fonts: external CDN URL (no local dependency).

### Animal photos (matcher-preview/app.js):
- Card photo: `animal.photoUrl` — this is whatever the API returns. For SM photos it's a full `https://service.sheltermanager.com/...` URL. For local crops/uploads, it's a `/data/animal-media/...` absolute path.
- Detail popup photos: fetched via `GET ${API_BASE}/photos/${animalId}` → returns `photoUrl` and `fileUrl` fields — same scheme (SM URLs or `/data/...` paths).
- Placeholder: inline SVG data URI (no file dependency).

**Photo URL prefix for local files: `/data/...`** (absolute, no matcher-specific prefix).

---

## 3. LIVE BUILD IMAGE PATHS

Identical scheme to the reskin:
- Card photo: `animal.photoUrl` (from API response)
- Detail popup: `GET ${API_BASE}/photos/${animalId}`
- Same API_BASE: `'/api'` (line 2 in both)
- Same photoUrl/fileUrl field usage

**Live and reskin use the SAME image-path scheme.** Both consume whatever the API returns — they never construct photo paths client-side. The API returns either full SM URLs or `/data/...` paths via `enrichWithLocalPhotos` (localDatabase.ts:5179) + `formatPhotoForApi`.

The `/data/...` paths are served by Express at server.ts:10757:
```js
app.use('/data', express.static(path.join(ROOT_DIR, 'data'), { maxAge: '1h' }));
```

---

## 4. CADDYFILE WRITABILITY

| Property | Value |
|----------|-------|
| Path | `/etc/caddy/Caddyfile` |
| Owner | `root:root` |
| Mode | `644` (`-rw-r--r--`) |
| Rover can read | ✅ yes (world-readable) |
| Rover can edit directly | ❌ no (owner=root, group=root, no write for other) |

**However**, Rover has a sudoers entry for staged Caddyfile writes:
```
(root) NOPASSWD: /usr/bin/cp /tmp/caddy-staged-* /etc/caddy/Caddyfile
(root) NOPASSWD: /usr/bin/caddy validate --config /etc/caddy/Caddyfile
(root) NOPASSWD: /usr/bin/systemctl reload caddy
```

**OC CAN edit the Caddyfile** via the stage-validate-copy pattern:
1. Write new Caddyfile to `/tmp/caddy-staged-<timestamp>`
2. `sudo /usr/bin/cp /tmp/caddy-staged-<timestamp> /etc/caddy/Caddyfile`
3. `sudo /usr/bin/caddy validate --config /etc/caddy/Caddyfile`
4. `sudo /usr/bin/systemctl reload caddy`

No John terminal access required.

---

## 5. APPLY MECHANISM

### server.ts changes (Express mount path):

The matcher mount is in **source** at `server/src/server.ts:10802-10804`. It compiles to `dist/server.js` via `tsc`. The running service executes `dist/server.js` (systemd ExecStart: `/usr/bin/node dist/server.js`).

**Build + restart commands:**
```bash
cd /home/shelter/shelter-apps/server && npm run build && sudo /usr/bin/systemctl restart shelter-app
```

### Caddyfile changes:
```bash
sudo /usr/bin/caddy validate --config /etc/caddy/Caddyfile
sudo /usr/bin/systemctl reload caddy
```

---

## Cutover Step List (for reference — not executed)

The minimal cutover requires exactly these changes:

### A. Caddyfile (live matcher block, lines 111-118):
Add `/data/*` passthrough. Change from:
```
@notapi not path /api/*
```
To:
```
@data path /data/*
reverse_proxy @data localhost:3000
@notapi not path /api/* /data/*
```
(2 lines added, 1 line modified)

### B. Directory swap:
```bash
mv matcher-web matcher-web-pre-reskin
mv matcher-preview matcher-web
```
No server.ts change needed — Express mount path `/matcher` already points at the `matcher-web` directory name.

### C. Apply:
```bash
sudo /usr/bin/caddy validate --config /etc/caddy/Caddyfile
sudo /usr/bin/systemctl reload caddy
# No shelter-app restart needed — Express serves static files from the directory name, not cached contents
```

### D. Optional cleanup:
- Remove or archive `matcher-web-pre-reskin`
- Remove the `matcher-preview` Caddy block (lines 171-179) and Express mount (server.ts:10804) + CORS origin
- That cleanup DOES require a build+restart

### Risk: the reskin directory is owned by `rover:shelter` (not `shelter:shelter`). Express static serving works (group-readable), but for consistency, `chown -R shelter:shelter matcher-web` after swap.
