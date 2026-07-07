# Old .html URL Redirect Map

## Q1 — Pattern confirmation

All four Search Console URLs hit the new branded 404.php:

| URL | HTTP | "Page Not Found" | Classification |
|-----|------|-------------------|----------------|
| `/rg-cares-animal-shelter.html` | 404 | ✅ (5 matches) | New 404.php |
| `/contact.html` | 404 | ✅ (5 matches) | New 404.php |
| `/adoption-info.html` | 404 | ✅ (5 matches) | New 404.php |
| `/events.html` | 404 | ✅ (5 matches) | New 404.php |

No old static HTML files are served — WordPress routes all `.html` requests through the WP rewrite chain, which falls through to 404.php. [VERIFIED]

## Q2 — Full old-URL surface

### Sources combined

**a) Theme + wp_posts content:** Zero `.html` internal references found. The theme contains no old-site `.html` links. No published page/post content references `.html` URLs. [VERIFIED]

**b) Old sitemaps:** `/sitemap.xml` returns 301 (to Rank Math's sitemap_index.xml). `/sitemap.html` returns 404. No old sitemap files on disk. [VERIFIED]

**c) Doc-root listing:** Only two `.html` files exist physically:
- `Default.html` (90,305 bytes, 2026-03-10) — SiteGround "Under construction" placeholder, returns HTTP 200. Not an old-site page. [VERIFIED]
- `readme.html` (7,406 bytes, 2026-05-21) — WordPress default readme, returns HTTP 200. Not an old-site page. [VERIFIED]

No old-site `.html` page files, no old assets/images directories, no old-site backup at the doc root. The old site was a Wix-hosted static site (evidenced by URL patterns like `copy---home---original.html` which are Wix editor artifacts); the files were never in this doc root. [INFERRED — Wix artifact naming pattern]

**d) Search engine index (DuckDuckGo `site:fourlegsgoodnynj.org .html`):** This is the authoritative source — these are the URLs still indexed by search engines:

| Old URL | Still indexed? | HTTP now |
|---------|---------------|----------|
| `/rg-cares-animal-shelter.html` | ✅ DuckDuckGo + Search Console | 404 |
| `/contact.html` | ✅ DuckDuckGo + Search Console | 404 |
| `/adoption-info.html` | ✅ DuckDuckGo + Search Console | 404 |
| `/events.html` | ✅ DuckDuckGo + Search Console | 404 |
| `/adoption-application.html` | ✅ DuckDuckGo | 404 |
| `/adoption-application---copy-as-of-22024.html` | ✅ DuckDuckGo | 404 |
| `/rg-cares.html` | ✅ DuckDuckGo | 404 |
| `/mission.html` | ✅ DuckDuckGo | 404 |
| `/copy---home---original.html` | ✅ DuckDuckGo | 404 |
| `/copy---adopt---original.html` | ✅ DuckDuckGo | 404 |

[VERIFIED — all curled, all return HTTP 404]

**e) Speculative probes (42 common slugs):** All return 404. None are indexed. No additional old pages discovered beyond the search-engine-indexed set. [VERIFIED]

### Complete old-URL set (10 URLs)

```
/rg-cares-animal-shelter.html
/contact.html
/adoption-info.html
/events.html
/adoption-application.html
/adoption-application---copy-as-of-22024.html
/rg-cares.html
/mission.html
/copy---home---original.html
/copy---adopt---original.html
```

### Artifact note

The `Default.html` file (SiteGround placeholder) is physically present and returns HTTP 200, but it has `<meta name="robots" content="noindex" />` so search engines should not index it. It's NOT an old-site page — it's the SiteGround auto-generated "Under construction" page from before WordPress was installed. It should be deleted at some point but it won't appear in search results. [VERIFIED — noindex meta tag confirmed in body]

## Q3 — Current WP page inventory

| ID | Title | Slug | Status |
|----|-------|------|--------|
| 7 | Adopt a Pet | `adopt` | publish |
| 8 | How to Help | `how-to-help` | publish |
| 9 | About Four Legs Good | `about-us` | publish |
| 10 | RG CARES Animal Shelter | `rg-cares` | publish |
| 11 | TNVR Program | `tnvr` | publish |
| 12 | Happy Tails | `stories` | publish |
| 13 | Events | `events` | publish |
| 14 | Home | `home` | publish |
| 383 | Privacy Policy | `privacy-policy` | publish |
| 384 | Terms of Service | `terms-of-service` | publish |
| 385 | Accessibility Statement | `accessibility` | publish |
| 335+ | ES translations | various | publish |

[VERIFIED — wp post list]

Key target pages confirmed:

| Target | HTTP |
|--------|------|
| `/adopt/` | 200 |
| `/how-to-help/` | 200 |
| `/events/` | 200 |
| `/about-us/` | 200 |
| `/rg-cares/` | 200 |
| `/tnvr/` | 200 |
| `/stories/` | 200 |

[VERIFIED — all curled from VPS]

No standalone `/contact/` page exists (returns 404). Contact info is accessed via the Contact Us modal (button in footer, `id="contact"` on the `<footer>` element on every page). The footer's "Visit Us" column has address, phone, hours. [VERIFIED]

## Q4 — Proposed old→new 301 map

### High-confidence mappings (clear 1:1)

| Old URL | → Target | Rationale |
|---------|----------|-----------|
| `rg-cares-animal-shelter.html` | `/rg-cares/` | Direct equivalent — RG CARES Animal Shelter page (ID 10) |
| `rg-cares.html` | `/rg-cares/` | Same page, shorter old slug |
| `events.html` | `/events/` | Direct equivalent — Events page (ID 13) |
| `adoption-info.html` | `/adopt/` | Direct equivalent — Adopt page has process + FAQ + info |
| `adoption-application.html` | `/adopt/` | Adopt page has the application form (`id="adoption-application"`) |
| `adoption-application---copy-as-of-22024.html` | `/adopt/` | Stale copy of adoption application → same target |
| `mission.html` | `/about-us/` | Old mission page → About page covers mission/history |

[VERIFIED — target pages confirmed 200, content alignment confirmed]

### Reasonable mappings (no exact 1:1, best match)

| Old URL | → Target | Rationale | Flag? |
|---------|----------|-----------|-------|
| `contact.html` | `/about-us/` | No `/contact/` page exists. Footer has Contact Us modal on every page. About page has team/org info + footer contact. Alternative: `/` (home). | ⚠️ John's call — `/about-us/` or `/` |
| `copy---home---original.html` | `/` | Wix editor artifact — was the homepage. Redirect to current homepage. | |
| `copy---adopt---original.html` | `/adopt/` | Wix editor artifact — was a copy of the adopt/info page. | |

[INFERRED — based on old page titles from search index snippets]

### Summary redirect map (for implementation)

```php
$html_map = array(
    'rg-cares-animal-shelter.html'              => '/',           // homepage — the old "main" page
    'rg-cares.html'                              => '/rg-cares/',
    'contact.html'                               => '/about-us/', // ⚠️ or '/' — John's call
    'adoption-info.html'                         => '/adopt/',
    'adoption-application.html'                  => '/adopt/',
    'adoption-application---copy-as-of-22024.html' => '/adopt/',
    'events.html'                                => '/events/',
    'mission.html'                               => '/about-us/',
    'copy---home---original.html'                => '/',
    'copy---adopt---original.html'               => '/adopt/',
);
```

**Decision needed from John:**
1. `rg-cares-animal-shelter.html` — This was the OLD homepage (title: "RG Cares Animal Shelter", 397 clicks — more than the WP home). Should it go to `/` (homepage, the natural successor) or `/rg-cares/` (the facility page, name match)? **Recommendation: `/`** because the traffic volume suggests people are looking for the organization's front door, not specifically the facility page.
2. `contact.html` — No contact page exists. Best options: `/about-us/` (org info + footer contact), or just `/` (footer contact modal available everywhere). **Recommendation: `/about-us/`** — closest to a contact/info page.

## Q5 — Redirect mechanism

### Current handler structure

The `flg_section_slug_redirects` function at the end of `functions.php` (lines 1789-1808):

```php
add_filter('do_redirect_guess_404_permalink', '__return_false');

add_action('template_redirect', 'flg_section_slug_redirects', 1);
function flg_section_slug_redirects() {
    if (is_admin()) {
        return;
    }
    $path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
    $map = array(
        'donate'           => '/how-to-help/',
        'foster'           => '/how-to-help/',
        'volunteer'        => '/how-to-help/',
        'adoption-process' => '/adopt/',
        'adoption-faq'     => '/adopt/',
        'meet-our-animals' => '/adopt/',
    );
    if (isset($map[$path])) {
        wp_redirect(home_url($map[$path]), 301);
        exit;
    }
}
```

[VERIFIED — read from production functions.php]

### Extension approach

The `.html` paths work naturally with this handler because `$path = trim(parse_url(REQUEST_URI), '/')` strips only leading/trailing slashes — `.html` extension is preserved. So `rg-cares-animal-shelter.html` becomes the key `rg-cares-animal-shelter.html` in the map. The handler can be extended by adding a second `$html_map` array lookup after the existing `$map` check, or by merging the `.html` entries into the same `$map`. Either approach is functionally identical.

**Recommended:** Add the `.html` entries directly to the existing `$map` array (simplest, one lookup, no structural change). No conflict — `.html` keys won't collide with the existing extensionless keys. [VERIFIED — no overlap]
