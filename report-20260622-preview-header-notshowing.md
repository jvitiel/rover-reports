# Preview Header Not Showing — Cache Diagnosis

**Date:** 2026-06-22 22:30 UTC  
**Mode:** Read-only

---

## 1. On-Disk Content

### Title (index.html:26)
```html
<h1 id="heroTitle">Good evening. Let's browse for your perfect pet.</h1>
```
Old "Browse Your Perfect Pet" only remains in `<title>` tag (line 8, the browser tab title — not visible on page). ✅ New title present.

### Emojis
```
$ grep -n '🐕\|🐱\|🐰' matcher-preview/index.html
(exit 1 — zero hits)
```
✅ Emojis removed.

### Greeting JS (index.html:207-210, inline script)
```javascript
var h = new Date().getHours();
var g = h < 12 ? 'Good morning.' : h < 17 ? 'Good afternoon.' : 'Good evening.';
document.getElementById('heroTitle').textContent = g + " Let's browse for your perfect pet.";
```
✅ Greeting function present.

### git show --stat b887b04
```
matcher-preview/index.html | 19 ++++++----
matcher-preview/styles.css | 88 +++++++++++++++++++++++++---------------------
2 files changed, 61 insertions(+), 46 deletions(-)
```
✅ Commit touched both files. On-disk content matches commit.

## 2. Served Bytes (localhost:3000)

| Check | Result |
|-------|--------|
| Title in served HTML | `heroTitle">Good evening. Let's browse for your perfect pet.</h1>` ✅ |
| Emojis in served HTML | 0 hits ✅ |
| Greeting in served HTML | "Good morning", "Good afternoon", "Good evening" all present ✅ |
| Pill CSS in served styles.css | `border-radius: 999px`, `border: 1.5px solid #C9613F` ✅ |

Server serves the new content correctly.

## 3. Cache Headers

| File | Cache-Control | Last-Modified | ETag |
|------|---------------|---------------|------|
| index.html | `public, max-age=0` | Mon, 22 Jun 2026 22:22:10 GMT | `W/"248c-..."` |
| styles.css | `public, max-age=0` | Mon, 22 Jun 2026 22:22:31 GMT | `W/"53d2-..."` |
| app.js | `public, max-age=0` | Mon, 22 Jun 2026 17:11:44 GMT | `W/"b37d-..."` |

**`max-age=0`** — Express static serves these with no cache duration. The browser should revalidate on every request using the ETag. However, browsers may still hold a disk cache entry and use conditional requests (If-None-Match). If the browser had an old ETag cached and the server returned 304 Not Modified for a stale ETag, it would serve old content — but this is unlikely since the ETag changed with the file.

**More likely:** John's browser has the old files in memory/disk cache from a session before the commit, and hasn't done a hard refresh (Ctrl+Shift+R / Cmd+Shift+R). A normal reload with `max-age=0` should revalidate, but if the page was loaded from the back-forward cache or a pinned tab, the old resources may persist.

**Caddy layer:** If the preview is accessed through Caddy (the public `matcher-preview.4lgshelterapp.duckdns.org`), Caddy may add its own cache headers or serve from a cached response. However, Caddy doesn't typically add `Cache-Control` for proxied content unless explicitly configured. The public-facing headers should match what Express returns.

## 4. Verdict: (C) On disk and served correctly — browser cache

**Evidence:**
- On-disk files contain all new content (title, greeting, no emojis, pill CSS) ✅
- Server serves the new content via localhost ✅
- `Cache-Control: public, max-age=0` — server does not instruct long caching ✅
- ETags updated to reflect new file content ✅

**John needs a hard refresh:** Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac). Alternatively, open in an incognito/private window to confirm.

If the issue persists after hard refresh, check whether Caddy's public-facing response for `matcher-preview.4lgshelterapp.duckdns.org` has different cache headers (the Caddy block may not exist yet — if John is testing via a direct URL, the Caddy proxy may be caching at its layer).
