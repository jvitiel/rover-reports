# Adoption PDF Download Buttons — Diagnosis — 2026-07-18

## 1. Caddy — What Does the Dogwalker Host Serve?

```
dogwalker.4lgshelterapp.duckdns.org {
	import security_headers
	import block_db
	@api path /api/*
	reverse_proxy @api localhost:3000
	@data path /data/*
	reverse_proxy @data localhost:3000
	@notapi not path /api/* /data/* /public/*
	rewrite @notapi /dogwalker{uri}
	reverse_proxy localhost:3000
}
```

The dogwalker host has THREE path categories:
1. `/api/*` → reverse proxy direct to Express
2. `/data/*` → reverse proxy direct to Express
3. Everything else (`@notapi`) → **rewrite to `/dogwalker{uri}`** → reverse proxy to Express

The `@notapi` matcher explicitly excludes only `/api/*`, `/data/*`, and `/public/*`. The path `/adoption-pdfs/*` is **NOT excluded**. Any request to `/adoption-pdfs/blank-english.pdf` hits the `@notapi` matcher, gets rewritten to `/dogwalker/adoption-pdfs/blank-english.pdf`, and goes to Express.

**Compare with the dashboard host**, which DOES exclude `/adoption-pdfs/*`:
```
@standalone path /intake /vclock /profile-form /intake-photos/* /intake-audio/* /public/* /data/* /adoption-pdfs/*
reverse_proxy @standalone localhost:3000
```

The dogwalker host never had an `/adoption-pdfs/*` exclusion added to its Caddy block. [VERIFIED — Caddyfile content]

---

## 2. Are the Blank PDFs on the VPS?

**Yes.** They exist in two locations:

```
/home/shelter/shelter-apps/adoption-pdfs/blank-english.pdf   (309,446 bytes — original location)
/home/shelter/shelter-apps/adoption-pdfs/blank-spanish.pdf   (127,119 bytes — original location)
/home/shelter/shelter-apps/public/forms/blank-english.pdf    (309,446 bytes — Phase C copy)
/home/shelter/shelter-apps/public/forms/blank-spanish.pdf    (127,119 bytes — Phase C copy)
```

**But they are NOT served.** The Express `/adoption-pdfs` static mount was removed on 2026-07-04 in commit `6cdc3d1` (Tier-1 Phase C):

```typescript
// /adoption-pdfs static mount REMOVED (Phase C) — PDFs served via /api/docs/adoption-pdf/:id
// Blank forms moved to /public/forms/; Caddy dogwalker file_server removal is a separate step.
```

The comment explicitly notes "Caddy dogwalker file_server removal is a separate step" — that step was never completed. [VERIFIED — server.ts line 11507, git log]

---

## 3. Did Anything Change Today?

### 3a. Commits in last 24 hours

| Commit | Message | Touches Caddy/routes/static/PDFs? |
|--------|---------|-----------------------------------|
| `b13e057` | Adoption confirmation email: Spanish strings map | No |
| `d536d86` | Adoption confirmation email: vet-authorization notice | No |
| `0067f6c` | Move generic bio job 9:30→8:30 AM ET | No |

**None of today's 3 commits touch Caddy config, static file serving, routes, or anything serving PDFs.** [VERIFIED — git log + git diff]

### 3c. Caddy reload/restart events

```
Active: active (running) since Sun 2026-03-15 20:47:23 UTC; 4 months 2 days ago
```

Caddy has not been restarted or reloaded in 4 months. Journal entries are only ACME cert renewals and reverse_proxy stream-closed warnings for video requests (normal mobile browser behavior). **No config reload event in last 24h.** [VERIFIED — systemctl status + journalctl]

### 3d. shelter-app restarts

Two restarts in last 24h — both within the last 2 hours, both by Rover (vet notice deploy at 02:32 UTC, Spanish email deploy at 02:47 UTC). Neither restart could affect PDF serving because the `/adoption-pdfs` static mount was already removed in the running code since July 4. [VERIFIED — journalctl]

---

## 4. Catch-All That Serves HTML Instead of 404

**Yes, it exists.** Express has this SPA catch-all for the dogwalker PWA:

```typescript
// server.ts:11614-11619
// Serve dogwalker PWA
app.use('/dogwalker', express.static(path.join(ROOT_DIR, 'dogwalker-pwa')));
app.get('/dogwalker/*', (_req: Request, res: Response) => {
  res.sendFile(path.join(ROOT_DIR, 'dogwalker-pwa', 'index.html'));
});
```

**This is the mechanism:**
1. WordPress `/adopt/` page has buttons linking to `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf`
2. Caddy dogwalker host: `/adoption-pdfs/*` is NOT in the exclusion list → matches `@notapi`
3. Caddy rewrites to `/dogwalker/adoption-pdfs/blank-english.pdf`
4. Express `express.static('/dogwalker', ...)` looks for `dogwalker-pwa/adoption-pdfs/blank-english.pdf` — doesn't exist
5. Express `app.get('/dogwalker/*', ...)` catch-all fires → serves `dogwalker-pwa/index.html`
6. Browser receives HTML with `content-type: text/html` instead of the PDF

Confirmed with live curl:
```
$ curl -sI 'https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf'
HTTP/2 200
content-type: text/html; charset=UTF-8
```

[VERIFIED — Caddyfile rewrite rule + Express catch-all code + live HTTP response]

---

## 5. Verdict

**Verdict: B — The VPS hosts the PDFs but they are unreachable, and a catch-all explains why a broken link renders a form page instead of a 404.**

**Evidence chain:**
1. The blank PDFs exist at `/home/shelter/shelter-apps/adoption-pdfs/blank-{english,spanish}.pdf` and at `/home/shelter/shelter-apps/public/forms/blank-{english,spanish}.pdf`
2. The `/adoption-pdfs` Express static mount was removed on 2026-07-04 (Phase C, commit `6cdc3d1`). The comment in the code notes the Caddy fix was deferred.
3. The WordPress `post_content` (post 7) still links to `https://dogwalker.4lgshelterapp.duckdns.org/adoption-pdfs/blank-english.pdf`
4. The dogwalker Caddy block rewrites that path to `/dogwalker/adoption-pdfs/blank-english.pdf`
5. Express's dogwalker SPA catch-all serves `index.html` (the dogwalker login page) for any unmatched `/dogwalker/*` path
6. Result: clicking the PDF button shows the dogwalker PWA login page instead of a PDF

**Why it "works now" is [UNCERTAIN].** Nothing changed in the last 24h that would fix this. Possible explanations:
- Browser cache cleared or different browser/device was used for the working test
- SiteGround CDN or Cloudflare (if any) served a cached response
- The report of "it works now" may be for a different button or page

**The buttons are currently broken** — confirmed by live curl returning `content-type: text/html`.

**To fix (two options, not implemented — read-only diagnosis):**
- **Option A (WordPress-side):** Update the button hrefs in posts 7 and 339 to point at `/public/forms/blank-english.pdf` and `/public/forms/blank-spanish.pdf` (which ARE served by the existing `/public/*` exclusion in Caddy's dogwalker block and Express's `express.static('/public', ...)`)
- **Option B (Caddy-side):** Add `/adoption-pdfs/*` to the dogwalker host's `@notapi` exclusion list and restore the Express static mount for that path
