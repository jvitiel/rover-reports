# Launch-Readiness Inventory — WordPress Site (Website 4)

**Date:** 2026-05-27 08:49 ET  
**Scope:** Read-only enumeration of johnv80.sg-host.com (future fourlegsgoodnynj.org)  
**Theme:** 4lg-theme (custom)  
**WordPress:** SiteGround hosting, Polylang bilingual (EN/ES)

---

## Important Context: Domain Not Yet Pointed

The domain `www.fourlegsgoodnynj.org` still resolves to the **old Weebly site** [VERIFIED — homepage HTML contains `.wsite-elements` classes, Weebly nav JSON, and Weebly image paths]. The WordPress site is currently accessible only at **`johnv80.sg-host.com`** (SiteGround staging domain). All checks below were performed against the SiteGround domain.

`wp option get siteurl` = `http://johnv80.sg-host.com` [VERIFIED]  
`wp option get home` = `http://johnv80.sg-host.com` [VERIFIED]

---

## 1. Page Inventory

### Published Pages (post_type=page, post_status=publish)

| ID | Slug | Title | Parent | Template | Language |
|----|------|-------|--------|----------|----------|
| 14 | home | Home | — | default (front-page.php via WP) | EN |
| 7 | adopt | Adopt a Pet | — | default | EN |
| 8 | how-to-help | How to Help | — | default | EN |
| 9 | about-us | About Four Legs Good | — | default | EN |
| 10 | rg-cares | RG CARES Animal Shelter | — | default | EN |
| 11 | tnvr | TNVR Program | — | default | EN |
| 12 | stories | Happy Tails | — | page-stories.php | EN |
| 13 | events | Events | — | page-events.php | EN |
| 294 | rg-portal | RG Cares Portal | — | default | EN |
| 335 | home-espanol | Home - Español | — | default | ES |
| 337 | acerca-de-four-legs-good | Acerca de Four Legs Good | — | default | ES |
| 339 | adopta-una-mascota | Adopta una Mascota | — | default | ES |
| 341 | eventos | Eventos | — | page-events.php | ES |
| 343 | historias-felices | Historias Felices | — | page-stories.php | ES |
| 345 | como-ayudar | Cómo Ayudar | — | default | ES |
| 347 | refugio-animal-rg-cares | Refugio Animal RG CARES | — | default | ES |
| 349 | programa-tnvr | Programa TNVR | — | default | ES |

**Total: 17 published pages** (9 EN + 8 ES). No parent-child hierarchy — all top-level [VERIFIED].

Front page: static page ID 14 (Home), `show_on_front=page`, `page_on_front=14` [VERIFIED].  
Blog page: none assigned (`page_for_posts=0`) [VERIFIED].

### Draft/Private Pages (launch-relevant)

| ID | Slug | Title | Status |
|----|------|-------|--------|
| 3 | privacy-policy | Privacy Policy | draft |

This is the WP auto-generated privacy policy page. It has never been published [VERIFIED].

### Custom Post Types with Published Content

| CPT | Label | Published Count |
|-----|-------|----------------|
| shelter_story | Shelter Stories | 10 |
| shelter_event | Events | 10 |

[VERIFIED via `wp post list --format=count`]

No `shelter_animal` CPT exists. Animals are served from the external matcher app, not WP [VERIFIED — `wp post-type list` output has no shelter_animal].

---

## 2. Navigation Structure

### Primary Nav (hardcoded in header.php)

No WP menu assignments exist — `wp menu list` returns empty [VERIFIED]. The navigation is **hardcoded in header.php** using `flg_nav_url()` helper for Polylang-aware URL generation [VERIFIED from header.php source].

| # | Label | Target | Status |
|---|-------|--------|--------|
| 1 | Home | / | ✅ OK |
| 2 | Adopt | /adopt/ | ✅ OK |
| 3 | How to Help | /how-to-help/ | ✅ OK |
| 4 | About Us | /about-us/ | ✅ OK |
| 5 | RG Cares | /rg-cares/ | ✅ OK |
| 6 | TNVR | /tnvr/ | ✅ OK |
| 7 | Stories | /stories/ | ✅ OK |
| 8 | Events | /events/ | ✅ OK |

Plus two CTA buttons: **Donate** (external: zeffy.com donation form) and **Adopt** (/adopt/).

All nav items resolve to published pages [VERIFIED]. No broken links, no `#` targets, no empty URLs.

### Footer (hardcoded in footer.php)

Footer uses widget areas (`footer-brand`, `footer-adopt`, `footer-involved`, `footer-visit`, `footer-emails`) but **all widget areas are empty** — fallback hardcoded content renders instead [VERIFIED via `wp widget list`].

Footer sections:
- **Brand**: Logo, description, "Contact Us" button (opens contact modal)
- **Adopt**: Meet Our Animals → /adopt/, Adoption Process → /adopt/#process, Adoption FAQ → /adopt/#faq
- **Get Involved**: Donate → /how-to-help/, Volunteer → /how-to-help/#volunteer, Foster → /how-to-help/#foster, Wish Lists → /how-to-help/#wishlists, Events → /events/
- **Visit Us**: Address, hours, phone numbers, social links (Facebook, Instagram, Twitter/X, YouTube)

No footer menu registered in WP. No `#` or empty links in footer [VERIFIED].

⚠️ **No legal links in footer** (privacy, terms, accessibility, cookies, disclaimer) — see Section 6.

---

## 3. Plugins

| Plugin | Status | Version | Category |
|--------|--------|---------|----------|
| sg-cachepress | active | 7.7.11 | 🟡 Caching (SG Optimizer) |
| sg-security | active | 1.6.2 | 🟡 Security |
| sg-ai-studio | active | 1.1.9 | — |
| polylang | active | 3.8.4 | i18n |
| wordpress-starter | active | 3.4.1 | SiteGround onboarding |
| dashboard-service-role | must-use | 1.0.0 | Custom (API role for dashboard push) |

[VERIFIED via `wp plugin list`]

**Notable absences:**
- ❌ **No SEO plugin** (no Yoast, Rank Math, All in One SEO, SEOPress)
- ❌ **No analytics plugin** (no GA, GTM, Plausible, Fathom, Meta Pixel)
- ❌ **No backup plugin** (relies on SiteGround daily backups)
- No caching beyond SG Optimizer (SiteGround's built-in)

---

## 4. Indexing and Discoverability

### Search Engine Visibility (blog_public)

`blog_public = 1` — **Search engines are NOT discouraged** [VERIFIED].

Note: Since the site is at `johnv80.sg-host.com` (a shared SiteGround staging URL), this means Google can currently index the staging domain. This will create duplicate content issues when the domain is pointed.

### robots.txt (johnv80.sg-host.com)

```
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php

Sitemap: http://johnv80.sg-host.com/wp-sitemap.xml
```

[VERIFIED] Standard WordPress default. No custom rules. Sitemap reference uses `http://` (not https).

Note: The **fourlegsgoodnynj.org** robots.txt (currently Weebly) contains malformed Disallow entries with full URLs instead of paths:
```
Disallow: /https://www.fourlegsgoodnynj.org/4lg-chewy-wishlist.html
Disallow: /https://www.adoptapet.com/shelter/80097-...
```
These are syntactically invalid but will become irrelevant after cutover.

### wp-sitemap.xml

Returns **valid sitemap XML** (HTTP 200, Content-Type: application/xml) [VERIFIED].

Child sitemaps:
1. `wp-sitemap-posts-page-1.xml` (EN pages)
2. `es/wp-sitemap-posts-page-1.xml` (ES pages)
3. `wp-sitemap-posts-shelter_story-1.xml` (EN stories)
4. `es/wp-sitemap-posts-shelter_story-1.xml` (ES stories)
5. `wp-sitemap-posts-shelter_event-1.xml` (EN events)
6. `es/wp-sitemap-posts-shelter_event-1.xml` (ES events)
7. `wp-sitemap-users-1.xml` (EN users)
8. `es/wp-sitemap-users-1.xml` (ES users)

⚠️ Users sitemap is present — exposes author archive URLs. Consider filtering if author pages are empty/unwanted.  
⚠️ All sitemap URLs use `http://` not `https://` (matches `siteurl` option).

### Homepage Meta Tags

**Present:**
- `<link rel="canonical" href="https://johnv80.sg-host.com/" />` [VERIFIED] — uses https (Caddy-like redirect?) despite siteurl being http
- `<link rel="alternate" href="https://johnv80.sg-host.com/" hreflang="en" />` [VERIFIED]
- `<link rel="alternate" href="https://johnv80.sg-host.com/es/" hreflang="es" />` [VERIFIED]
- `og:site_name` = "FOUR LEGS GOOD" [VERIFIED — from fourlegsgoodnynj.org, WP site not tested for OG directly]

**Absent from WP site:**
- ❌ No `<meta name="robots">` tag (only default WP `max-image-preview:large` on 404 page)
- ❌ No `<meta property="og:*">` tags [VERIFIED — grep of johnv80.sg-host.com homepage HTML returned no og: matches]
- ❌ No `<meta name="twitter:*">` tags
- ❌ No `<meta name="description">` tag

The `og:` tags visible on fourlegsgoodnynj.org are from **Weebly**, not WordPress. The WP site has **no Open Graph, Twitter Card, or meta description tags** [VERIFIED].

---

## 5. Analytics and Tracking

### Theme files grep (header.php, footer.php, functions.php, js/scripts.js)

No matches for: `gtag`, `UA-`, `G-`, `GTM-`, `fbq`, `plausible`, `fathom`, `google.analytics`, `googletagmanager` [VERIFIED — grep returned exit code 1, no output].

### Rendered homepage HTML grep (johnv80.sg-host.com)

No analytics snippets found [VERIFIED].

**Conclusion: Zero analytics or tracking is installed on the WordPress site.**

---

## 6. Standard Launch-Killers

### Favicon

- `/favicon.ico` on johnv80.sg-host.com: **HTTP 200 but returns HTML** (Content-Type: text/html). This is NOT a valid favicon — it's the homepage being served for all unmatched routes [VERIFIED via `curl -sI`].
- `<link rel="icon">`: **Not present** in homepage HTML [VERIFIED — grep returned no matches].
- No `<link rel="apple-touch-icon">` either [VERIFIED].

⚠️ **No favicon configured.** Browser tabs show generic/blank icon.

### 404 Page

- HTTP status: **404** (correct) [VERIFIED]
- Renders the themed 404 page with site header (nav, logo), styled "Page not found" title, and proper 4lg-theme styling [VERIFIED — body class `error404 wp-theme-4lg-theme`, full nav rendered].
- Uses `index.php` fallback (no custom `404.php` template exists) [INFERRED — theme has no 404.php in file listing, but WP renders 404 through index.php with proper body class].

The 404 page is functional and on-brand.

### Legal Pages

- **Privacy Policy**: Draft (ID 3, auto-generated by WP) — **NOT published** [VERIFIED]
- **Terms of Service / Use**: None found [VERIFIED — not in page list, not in footer]
- **Accessibility Statement**: None found [VERIFIED]
- **Cookie Policy / Consent Banner**: None found [VERIFIED]
- **Disclaimer**: None found [VERIFIED]
- **Footer legal links**: None — footer bottom only shows "© 2026 Four Legs Good, Inc. All rights reserved." [VERIFIED from footer.php source]

⚠️ **No legal pages are published or linked.** The Privacy Policy is in draft. No terms, accessibility, or cookie notices exist.

### SSL Certificate (johnv80.sg-host.com)

| Field | Value |
|-------|-------|
| Issuer | GlobalSign GCC R6 AlphaSSL CA 2025 |
| Subject | *.sg-host.com (wildcard) |
| Valid From | Jun 24, 2025 |
| Valid Until | **Jul 26, 2026** |
| Days Remaining | ~60 days |

[VERIFIED via openssl s_client]

This is SiteGround's shared wildcard cert. After domain cutover, a new cert (likely Let's Encrypt via SiteGround) will be needed for `fourlegsgoodnynj.org`.

For reference, the **current** fourlegsgoodnynj.org cert:
- Issuer: Let's Encrypt R13
- Expires: Jul 3, 2026 (~37 days)

---

## 7. Public Animal-Listing Surface

The **Adopt a Pet** page (ID 7, slug `adopt`, default page template) handles the animal listing. [VERIFIED]

### How it works

The Adopt page does **NOT** use a custom template, shortcode, or WP query for animals. Instead, it contains Gutenberg block content with:

1. A hero section ("Adopt a Pet" heading + image)
2. An "Our adoption process" section (Browse → Apply → Interview → Welcome Home)
3. A "Ready to browse?" section with a **button linking to the external matcher app**: `https://matcher.4lgshelterapp.duckdns.org`
4. Secondary buttons linking to Petfinder, Adopt-A-Pet, and Facebook adoption page
5. A CTA banner with phone number and FAQ section

[VERIFIED from `wp post get 7 --field=post_content`]

**There is no `shelter_animal` CPT in WordPress.** Animals are served entirely by the external shelter app (matcher-web PWA on `matcher.4lgshelterapp.duckdns.org`), not by WordPress. The WP Adopt page is a funnel/landing page that sends users to the matcher [VERIFIED].

The homepage (`front-page.php`) also includes a `render_featured_animals()` PHP function (line 452 of functions.php) that renders featured animals dynamically on the front page [VERIFIED from grep].

### Example shelter_story permalink

`http://johnv80.sg-host.com/stories/better-days-for-b-and-b/` (ID 291) [VERIFIED]

---

## Summary of Launch-Blockers and Risks

### 🔴 Blockers (should fix before cutover)

1. **No SEO plugin** — no meta descriptions, no OG tags, no Twitter cards, no structured data, no XML sitemap customization
2. **No analytics** — zero tracking of any kind
3. **No favicon** — /favicon.ico returns HTML, no `<link rel="icon">` in head
4. **No privacy policy published** — draft exists but not live, not linked from footer
5. **Domain not pointed** — `siteurl` and `home` still set to `http://johnv80.sg-host.com`; all canonical URLs, sitemaps, and internal links reference the staging domain
6. **HTTP in siteurl/home** — option values use `http://` not `https://`; will need updating at cutover

### 🟡 Should address

7. **No legal pages** — no terms of service, accessibility statement, or cookie notice
8. **Users sitemap exposed** — `wp-sitemap-users-1.xml` reveals author archives
9. **Staging domain indexable** — `blog_public=1` on a staging URL means Google may be indexing `johnv80.sg-host.com` content now
10. **No WP nav menus used** — navigation is hardcoded in PHP; any page additions require theme file edits
11. **All footer widget areas empty** — footer content is hardcoded fallback; widgets were registered but never populated
12. **matcher URL in page content** — Adopt page hardcodes `matcher.4lgshelterapp.duckdns.org`; will need updating when production domain is ready

### ✅ In good shape

- Theme is custom-built and clean (4lg-theme)
- Bilingual infrastructure working (Polylang, 9 EN + 8 ES pages, hreflang tags)
- Custom post types functional (stories + events with meta fields)
- 404 page is styled and branded
- Contact modal is fully built with validation
- SSL active on staging domain
- SG Optimizer caching + SG Security active
- Dashboard service role properly scoped (mu-plugin)
- CSS/JS cache busting via filemtime() (recently fixed)
