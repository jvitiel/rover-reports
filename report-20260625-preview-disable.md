# Matcher-Preview Subdomain Disable — Apply Log

Executed 2026-06-26 02:24–02:27 UTC.

---

## Step 0: Backups

| Backup | Path | Size |
|--------|------|------|
| Caddyfile | `/home/shelter/rover-reports/backups/Caddyfile.pre-preview-disable-20260625` | 5220 bytes |
| server.ts preview entries | `/home/shelter/rover-reports/backups/server-ts-preview-mounts.pre-disable-20260625.txt` | 4 lines |

Both confirmed non-empty before proceeding.

---

## Step 1: Caddyfile — Remove preview block

### Removed block (was at lines 172-182):
```
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

Live matcher block (`matcher.4lgshelterapp.duckdns.org`): **byte-for-byte unchanged** (verified via grep).

### Apply sequence:
1. Staged to `/tmp/caddy-staged-1782440713`
2. `sudo cp` to `/etc/caddy/Caddyfile` ✅
3. `sudo caddy validate` → **"Valid configuration"** ✅
4. `sudo systemctl reload caddy` → exit 0 ✅

---

## Step 2: server.ts — Remove preview mount + CORS

### Three removals:

**1. CORS origin (was line 672):**
```diff
-  'https://matcher-preview.4lgshelterapp.duckdns.org',
```

**2. Rate-limit exemption path (was line 720):**
```diff
-      '/matcher-preview/',
```

**3. Express mount (was lines 10803-10804):**
```diff
-// Serve matcher preview (unmodified copy for testing new frontend builds)
-app.use('/matcher-preview', express.static(path.join(ROOT_DIR, 'matcher-preview')));
```

### NOT removed (live production mount, line 10802):
```
app.use('/matcher', express.static(path.join(ROOT_DIR, 'matcher-preview')));
```

### Build + restart:
- `npm run build` (tsc) → exit 0, clean compile
- `sudo systemctl restart shelter-app` → exit 0
- Service status: active (running) since 02:26:03 UTC

### Note: matcher-preview/ directory NOT touched — it remains on disk as the live build served by `/matcher`.

---

## Step 3: Verification

### V1 — Preview subdomain should be down:
```
$ curl -sI --max-time 10 https://matcher-preview.4lgshelterapp.duckdns.org/
(empty response — connection refused, no Caddy handler)
```
**✅ PASS** — Preview subdomain is no longer served.

### V2 — Live matcher still serving:
```
$ curl -sI https://matcher.4lgshelterapp.duckdns.org/
HTTP/2 200
accept-ranges: bytes
access-control-allow-credentials: true
```
**✅ PASS** — Live matcher returns 200.

### V3 — Live still serving reskin:
```
$ curl -s https://matcher.4lgshelterapp.duckdns.org/ | grep -o "find your new best friend"
find your new best friend
```
**✅ PASS** — Reskin subtitle confirmed at live URL.

---

## Commit

```
9b27425 remove redundant matcher-preview mount + CORS origin post-cutover
```

Narrow commit: only `server/src/server.ts` staged. No `git add -A`.

---

## Rollback procedure (if needed)

1. Restore Caddyfile: `sudo cp /home/shelter/rover-reports/backups/Caddyfile.pre-preview-disable-20260625 /etc/caddy/Caddyfile && sudo systemctl reload caddy`
2. Revert server.ts: `git revert 9b27425`, build + restart
3. matcher-preview/ directory is untouched — no recovery needed
