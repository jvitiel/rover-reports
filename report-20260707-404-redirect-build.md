# 404.php + Redirect Handler Build Report

## Part 1 — 404.php

### S1: File creation
Created `404.php` in `/wp-content/themes/4lg-theme/`. Content matches spec exactly (branded not-found page with page-hero + content-section + navigation links). [VERIFIED]

### S2: Syntax check
```
php -l 404.php
No syntax errors detected in .../4lg-theme/404.php
```
[VERIFIED]

## Part 2 — functions.php

### S3: Backup + work copy
Backup filename: `functions.php.bak-20260707-134717` (67,348 bytes). [VERIFIED]
Work copy created: `functions.php.work` (67,348 bytes, identical to original). [VERIFIED]

### S4: Append
Appended redirect handler + WP 404-guess disable to `functions.php.work` (26 lines including blank line separator).

### S5: Diff gate
```
1782a1783,1808
> 
> /**
>  * Redirect Google-fabricated flat slugs to their real destinations, and stop WP core
>  * from guessing unmatched URLs to random posts (so they hit 404.php cleanly instead).
>  */
> add_filter('do_redirect_guess_404_permalink', '__return_false');
> 
> add_action('template_redirect', 'flg_section_slug_redirects', 1);
> function flg_section_slug_redirects() {
>  if (is_admin()) {
>  return;
>  }
>  $path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
>  $map = array(
>  'donate' => '/how-to-help/',
>  'foster' => '/how-to-help/',
>  'volunteer' => '/how-to-help/',
>  'adoption-process' => '/adopt/',
>  'adoption-faq' => '/adopt/',
>  'meet-our-animals' => '/adopt/',
>  );
>  if (isset($map[$path])) {
>  wp_redirect(home_url($map[$path]), 301);
>  exit;
>  }
> }
```
Only EOF append — no other changes. [VERIFIED]

### S6: Syntax gate + swap
```
php -l functions.php.work
No syntax errors detected in .../4lg-theme/functions.php.work
```
Swapped: `mv functions.php.work functions.php` → 1808 lines. [VERIFIED]

### S7: Site health
| URL | HTTP status |
|-----|-------------|
| `https://www.fourlegsgoodnynj.org/` | 200 |
| `https://www.fourlegsgoodnynj.org/events/` | 200 |
| `https://www.fourlegsgoodnynj.org/es/eventos/` | 200 |

All healthy, no 500s. [VERIFIED]

## Part 3 — Sitemap rebuild

### S8: Commands run
1. `wp rankmath sitemap generate` — output the sitemap XML (displayed rather than regenerating; Rank Math CLI generates on-the-fly). [VERIFIED]
2. `wp rewrite flush` — "Success: Rewrite rules flushed." — triggers permalink + sitemap cache invalidation. [VERIFIED]

## Verification

### V1 — 404 page renders correctly
```
curl -sS 'https://www.fourlegsgoodnynj.org/zzz-nonexistent-test-xyz/'

"Page Not Found": MATCH (5 occurrences — title, h1, og:title, twitter:title, schema)
"No posts found": 0 occurrences
HTTP status: 404
```
[VERIFIED]

### V2 — Redirects

| Slug | HTTP | Location |
|------|------|----------|
| `/donate/` | 301 | `https://www.fourlegsgoodnynj.org/how-to-help/` |
| `/foster/` | 301 | `https://www.fourlegsgoodnynj.org/how-to-help/` |
| `/volunteer/` | 301 | `https://www.fourlegsgoodnynj.org/how-to-help/` |
| `/adoption-process/` | 301 | `https://www.fourlegsgoodnynj.org/adopt/` |
| `/adoption-faq/` | 301 | `https://www.fourlegsgoodnynj.org/adopt/` |
| `/meet-our-animals/` | 301 | `https://www.fourlegsgoodnynj.org/adopt/` |

All 6 redirects working as specified. [VERIFIED]

Note: `/volunteer/` previously 301'd to `/event/volunteer-orientation/` via WP's `redirect_guess_404_permalink`. Now correctly 301s to `/how-to-help/` via our handler (fires at priority 1 before WP guess, and guess is also disabled via `__return_false` filter). [VERIFIED]

### V3 — Sitemap stale entry
```
curl -sS shelter_event-sitemap.xml | grep -c 'test-event'
0
```
Stale `/event/test-event/` entry cleared after rewrite flush. [VERIFIED]

## Summary of changes

| File | Action |
|------|--------|
| `4lg-theme/404.php` | **Created** — branded 404 page with nav links |
| `4lg-theme/functions.php` | **Appended** 26 lines — `do_redirect_guess_404_permalink` filter + `flg_section_slug_redirects` handler |
| `4lg-theme/functions.php.bak-20260707-134717` | Backup of pre-change functions.php |

Events/stories code untouched. [VERIFIED — diff shows only EOF append, no mid-file changes]
