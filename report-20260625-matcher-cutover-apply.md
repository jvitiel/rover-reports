# Matcher Cutover — Apply Log

Executed 2026-06-26 02:14–02:17 UTC.

---

## Step 0: Backups

| Backup | Path | Size |
|--------|------|------|
| Caddyfile | `/home/shelter/rover-reports/backups/Caddyfile.pre-matcher-cutover-20260625` | 5156 bytes |
| server.ts mounts | `/home/shelter/rover-reports/backups/server-ts-matcher-mounts.pre-cutover-20260625.txt` | 538 bytes |

Both confirmed non-empty before proceeding.

---

## Step 1: Caddyfile — /data/* passthrough

### Diff applied (matcher.4lgshelterapp.duckdns.org block only):
```diff
115c115,117
< 	@notapi not path /api/*
---
> 	@data path /data/*
> 	reverse_proxy @data localhost:3000
> 	@notapi not path /api/* /data/*
```

### Resulting live matcher block (Caddyfile:111-120):
```
matcher.4lgshelterapp.duckdns.org {
	import security_headers
	@api path /api/*
	reverse_proxy @api localhost:3000
	@data path /data/*
	reverse_proxy @data localhost:3000
	@notapi not path /api/* /data/*
	rewrite @notapi /matcher{uri}
	reverse_proxy localhost:3000
}
```

Preview block: **unchanged** (verified lines 173-181 identical).

### Apply sequence:
1. Staged to `/tmp/caddy-staged-1782440093`
2. `sudo /usr/bin/cp /tmp/caddy-staged-1782440093 /etc/caddy/Caddyfile` ✅
3. `sudo /usr/bin/caddy validate --config /etc/caddy/Caddyfile` → **"Valid configuration"** ✅
4. `sudo /usr/bin/systemctl reload caddy` → exit 0 ✅

Caddy status: active (running), ExecReload exit 0.

---

## Step 2: Mount path change

### Diff applied (server/src/server.ts, line 10802):
```diff
- app.use('/matcher', express.static(path.join(ROOT_DIR, 'matcher-web')));
+ app.use('/matcher', express.static(path.join(ROOT_DIR, 'matcher-preview')));
```

The `/matcher-preview` mount line was **NOT touched** (unchanged).

### Build + restart:
- `npm run build` (tsc) → exit 0, clean compile
- `sudo systemctl restart shelter-app` → exit 0
- Service status: active (running) since 02:15:38 UTC

---

## Step 3: Verification

### V1 — HTTP 200 on live URL:
```
$ curl -sI https://matcher.4lgshelterapp.duckdns.org/
HTTP/2 200
accept-ranges: bytes
access-control-allow-credentials: true
cache-control: public, max-age=0
```
**✅ PASS** — 200 OK

### V2 — Reskin subtitle served at live URL:
```
$ curl -s https://matcher.4lgshelterapp.duckdns.org/ | grep -o "find your new best friend"
find your new best friend
```
**✅ PASS** — Reskin subtitle confirmed (old build does not contain this text)

### V3 — /data/ photo passthrough:
```
$ curl -sI https://matcher.4lgshelterapp.duckdns.org/data/animal-media/crops/A2023030-8732.jpg
HTTP/2 200
accept-ranges: bytes
cache-control: public, max-age=3600
content-type: image/jpeg
```
**✅ PASS** — Image returned as `image/jpeg` (not `text/html`), /data/* passthrough working.

Note: The API returns photo URLs as full absolute URLs (e.g., `https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/crops/...`), not relative `/data/` paths. The `/data/*` passthrough is still correct because the popup detail view fetches additional photos via `/api/photos/:id` which may return relative paths, and direct `/data/` navigation must work.

---

## Commit

```
5765694 matcher cutover: point /matcher mount at reskin build
```

Narrow commit: only `server/src/server.ts` staged. No `git add -A`.

---

## Rollback procedure (if needed)

1. Revert server.ts: change `'matcher-preview'` back to `'matcher-web'` at line 10802, build + restart
2. Revert Caddyfile: `sudo cp /home/shelter/rover-reports/backups/Caddyfile.pre-matcher-cutover-20260625 /etc/caddy/Caddyfile && sudo systemctl reload caddy`
3. `matcher-web/` directory remains untouched on disk — no file recovery needed
