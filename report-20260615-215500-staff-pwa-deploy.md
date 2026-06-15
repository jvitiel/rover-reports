# Staff-PWA service worker + deploy mechanism

**Date:** 2026-06-15 21:55 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Q1: Service worker

**Path:** `/home/shelter/shelter-apps/staff-pwa/sw.js` [VERIFIED via `ls`]

**Cache-name constant (line 2):**

```javascript
const CACHE_NAME = 'staff-v23';
```

This is the single authoritative cache-version constant. No other cache-version-like constants exist in the file. [VERIFIED — `grep` found only `CACHE_NAME` on line 2, used in install/activate/fetch handlers]

The service worker's activate handler deletes all caches whose name doesn't match `CACHE_NAME`:

```javascript
cacheNames.map((cacheName) => {
  if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
})
```

**To invalidate the old cache on deploy:** bump `'staff-v23'` to `'staff-v24'`. When the browser detects the sw.js byte change, it installs the new service worker, which on activate deletes `staff-v23` and re-caches from `urlsToCache`. [VERIFIED from sw.js logic]

---

## Q2: Deploy/serve mechanism

**Caddy** proxies `staff.4lgshelterapp.duckdns.org` to Express on `localhost:3000`. All non-API paths are rewritten to `/staff{uri}` and reverse-proxied: [VERIFIED from `/etc/caddy/Caddyfile`]

```
staff.4lgshelterapp.duckdns.org {
    @notapi not path /api/* /data/*
    rewrite @notapi /staff{uri}
    reverse_proxy localhost:3000
}
```

**Express** serves the staff-pwa directory as static files (server.ts:9515): [VERIFIED]

```typescript
app.use('/staff', express.static(path.join(ROOT_DIR, 'staff-pwa')));
app.get('/staff/*', (_req: Request, res: Response) => {
  res.sendFile(path.join(ROOT_DIR, 'staff-pwa', 'index.html'));
});
```

`ROOT_DIR` resolves to `/home/shelter/shelter-apps/` (`path.resolve(__dirname, '../..')` where `__dirname` = `server/dist/`). [VERIFIED]

**No build step, no copy step.** `express.static` serves files directly from the filesystem on each HTTP request. Editing a file in `/home/shelter/shelter-apps/staff-pwa/` makes it immediately available to the next HTTP request — no server restart needed for static file changes. [VERIFIED — Express static middleware reads from disk, does not cache in memory]

**However:** users with an active service worker will continue to receive cached versions until `CACHE_NAME` is bumped in `sw.js`. The browser checks for sw.js changes on navigation (byte-diff triggers install of new SW). So the deploy sequence is:

1. Edit the files (app.js, index.html, etc.)
2. Bump `CACHE_NAME` in `sw.js` (e.g. `'staff-v23'` → `'staff-v24'`)
3. No restart needed — Express serves the new files immediately
4. Users get the update on their next navigation (browser detects sw.js change → installs new SW → activates → deletes old cache)

---

## Q3: Are these the live-served files?

**Yes.** `/home/shelter/shelter-apps/staff-pwa/index.html` and `/home/shelter/shelter-apps/staff-pwa/app.js` are the exact files served by Express. [VERIFIED]

There is no `dist/`, no build output, no separate served root. The source files ARE the served files. [VERIFIED — `express.static(path.join(ROOT_DIR, 'staff-pwa'))` points directly at the source directory]
