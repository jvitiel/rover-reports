# Preview Public URL Diagnosis

**Date:** 2026-06-22 22:55 UTC  
**Mode:** Read-only

---

## 1. Public URL Serves NEW Content

```
$ curl -s https://matcher-preview.4lgshelterapp.duckdns.org/ | grep -i 'heroTitle\|Browse Your Perfect'
  <title>Browse Your Perfect Pet</title>
          <h1 id="heroTitle">Good evening. Let's browse for your perfect pet.</h1>
      document.getElementById('heroTitle').textContent = g + " Let's browse for your perfect pet.";
```

The `<title>` tag (browser tab) still says "Browse Your Perfect Pet" — **we didn't change that** (only the visible `<h1>`). The `<h1>` has the new greeting text. Emojis: 0 hits. Greeting JS: present. Pill CSS (`border-radius: 999px`, `1.5px solid #C9613F`): present.

**The public URL serves the NEW content correctly.**

## 2. Localhost vs Public — Identical

Both return the same `<h1>`:
```
<h1 id="heroTitle">Good evening. Let's browse for your perfect pet.</h1>
```
No divergence. Same ETag, same content-length (9356).

## 3. Caddy Block (verbatim from /etc/caddy/Caddyfile)

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

Caddy rewrites non-API paths with `/matcher-preview` prefix → Express serves from `matcher-preview/` directory. No file_server, no stale path. Same pattern as production matcher.

## 4. Path Reconcile

- **Edited path:** `/home/shelter/shelter-apps/matcher-preview/` (git show --stat b887b04: `matcher-preview/index.html`, `matcher-preview/styles.css`)
- **Express mount:** `app.use('/matcher-preview', express.static('matcher-preview'))` → resolves to same dir
- **Same directory.** ✅

## 5. Cache Headers (Public, Through Caddy)

| File | Cache-Control | ETag | Last-Modified |
|------|---------------|------|---------------|
| index.html | `public, max-age=0` | `W/"248c-19ef16d4290"` | Mon, 22 Jun 2026 22:22:10 GMT |
| styles.css | `public, max-age=0` | `W/"53d2-19ef16d9838"` | Mon, 22 Jun 2026 22:22:31 GMT |
| app.js | `public, max-age=0` | `W/"b37d-19ef0510dea"` | Mon, 22 Jun 2026 17:11:44 GMT |

No Caddy-layer caching. `max-age=0`, no `Age` header. Caddy passes Express headers through unchanged. No service worker registered.

## 6. Verdict: (D) WRONG URL — John Is Looking at Production

The preview URL (`matcher-preview.4lgshelterapp.duckdns.org`) serves the NEW content correctly — new title, no emojis, pill CSS, greeting JS, all present.

The **production** URL (`matcher.4lgshelterapp.duckdns.org`) still serves the OLD content:
```
$ curl -s https://matcher.4lgshelterapp.duckdns.org/ | grep 'h1\|🐕'
          <h1>Browse Your Perfect Pet</h1>
            🐕 Dogs
```

Production (`matcher-web/`) was intentionally never modified — all changes went to `matcher-preview/` only. John is likely looking at the production matcher URL, not the preview URL. The two URLs:

| URL | Shows |
|-----|-------|
| `https://matcher-preview.4lgshelterapp.duckdns.org/` | NEW ✅ (greeting, no emojis, coral pills) |
| `https://matcher.4lgshelterapp.duckdns.org/` | OLD (expected — production, never modified) |

**Note:** The `<title>` tag (browser tab title) still reads "Browse Your Perfect Pet" in both preview and production — we only changed the visible `<h1>`, not the `<title>`. If John is checking the browser tab text, that would also explain the confusion.
