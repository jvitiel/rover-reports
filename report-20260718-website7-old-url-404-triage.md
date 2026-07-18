# Old URL 404/Redirect Triage

Date: 2026-07-18T20:28Z
Type: read-only diagnosis — zero changes made
Method: `curl -sI` (initial) + `curl -sLI` (follow redirects), from VPS

---

## Results

| # | URL path | Initial code | Location header | Final code |
|---|----------|-------------|-----------------|------------|
| 1 | `/uploads/1/2/7/3/127394599/four_legs_good_volunteer_app_-_11-2024.pdf` | **404** | — | **404** |
| 2 | `/uploads/1/2/7/3/127394599/four_legs_good_job_application_.pdf` | **404** | — | **404** |
| 3 | `/store/p20/Covered_in_Cat_Hair_and_Filled_with_Dreams_-_Blue_with_Black_Design_Pillow.html` | **301** | `https://www.fourlegsgoodnynj.org/` | **200** (homepage) |
| 4 | `/other-ways-to-donate.html` | **301** | `https://www.fourlegsgoodnynj.org/` | **200** (homepage) |
| 5 | `/4lg-wishlists.html` | **301** | `https://www.fourlegsgoodnynj.org/` | **200** (homepage) |
| 6 | `/adoption-application.html` | **301** | `https://www.fourlegsgoodnynj.org/adopt/` | **200** (adopt page) |
| 7 | `/rg-` | **404** | — | **404** |
| 8 | `/cdn-cgi/l/email-protection` | **403** | — | **403** |
| 9 | `/jail--bail---prisoners.html` | **301** | `https://www.fourlegsgoodnynj.org/` | **200** (homepage) |

[VERIFIED — all 9 URLs tested via curl from VPS]

---

## Classification

### True 404s (3)

**URL 1 — `/uploads/.../four_legs_good_volunteer_app_-_11-2024.pdf`**
Legacy Weebly upload path. The file does not exist on the WordPress install. This is a Weebly-era PDF that was never migrated. No redirect is in place.

**URL 2 — `/uploads/.../four_legs_good_job_application_.pdf`**
Same pattern — legacy Weebly upload directory. File not present.

**URL 7 — `/rg-`**
Truncated/garbled path. Likely a broken crawler or a truncated link from a referring page. Not a real resource.

### Redirects to homepage (4)

**URLs 3, 4, 5, 9** — All return 301 → homepage (`/`). These are old Weebly page slugs (`.html` suffix) for content that either has no WordPress equivalent or wasn't given a targeted redirect. The catch-all redirect sends unknown `.html` paths to the homepage rather than 404ing.

Pattern: SiteGround's redirect rules (or a WordPress plugin) appear to 301 any `.html`-suffixed path that doesn't match a known page to the homepage. This avoids hard 404s for Weebly-era links but doesn't send visitors to the right content.

### Redirect to correct page (1)

**URL 6 — `/adoption-application.html`** → 301 → `/adopt/`
This redirect is correctly targeted. The old Weebly adoption application page redirects to the WordPress adoption form page.

### 403 Forbidden (1)

**URL 8 — `/cdn-cgi/l/email-protection`**
This is a Cloudflare-specific path (email obfuscation endpoint). SiteGround doesn't use Cloudflare's CDN for this site; the path returns 403. This would have been crawled from old Weebly pages where Cloudflare email protection was active. Not actionable — there's no content to redirect to.

---

## robots.txt Analysis

```
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php

Sitemap: https://www.fourlegsgoodnynj.org/sitemap_index.xml
```

[VERIFIED — curl of https://www.fourlegsgoodnynj.org/robots.txt]

**`wp-*` patterns found:**
- `Disallow: /wp-admin/` — standard WordPress robots.txt line
- `Allow: /wp-admin/admin-ajax.php` — standard WordPress exception for AJAX

**No other `/wp-` Disallow patterns.** The robots.txt does NOT block `/wp-login.php`, `/wp-includes/`, `/wp-content/`, or any other `wp-*` path. If Search Console is showing a `wp-*.php` crawl issue, it's not because robots.txt is blocking it — it's because a crawler found and attempted to index a WordPress system file directly (likely `wp-login.php` or `xmlrpc.php` linked from a scan or brute-force attempt log).

---

## Summary

- **3 true 404s:** 2 legacy Weebly upload PDFs (never migrated) + 1 garbled/truncated path
- **4 catch-all redirects to homepage:** old `.html` Weebly slugs with no targeted redirect
- **1 correctly targeted redirect:** `/adoption-application.html` → `/adopt/`
- **1 Cloudflare artifact (403):** `/cdn-cgi/l/email-protection` — not actionable
- **robots.txt:** Only standard `Disallow: /wp-admin/` — no other `wp-*` blocks
