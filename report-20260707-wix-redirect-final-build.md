# Wix Migration Redirects — Final Build Report

## S0 — Fail-fast anchors

**Anchor A** (end of $map):
```
 'mission.html' => '/about-us/',
 );
```
Confirmed VERBATIM. [VERIFIED]

**Anchor B** (exact-match block):
```
 if (isset($map[$path])) {
 wp_redirect(home_url($map[$path]), 301);
 exit;
 }
```
Confirmed VERBATIM. [VERIFIED]

## S1 — Backup

Backup filename: `functions.php.bak-20260707-185231`. [VERIFIED]

## S4 — Diff gate

```
1813a1814,1849
>  // Remaining old Wix content pages -> specific WP equivalents (301)
>  'about.html' => '/about-us/',
>  'about1.html' => '/about-us/',
>  'about-old.html' => '/about-us/',
>  'about-us.html' => '/about-us/',
>  'adopt.html' => '/adopt/',
>  'dogs.html' => '/adopt/',
>  'cats.html' => '/adopt/',
>  'donate.html' => '/how-to-help/',
>  'our-team.html' => '/about-us/',
>  'board.html' => '/about-us/',
>  'founders.html' => '/about-us/',
>  'current-board-of-directors.html' => '/about-us/',
>  'adoption-application1.html' => '/adopt/',
>  'adoption-contract.html' => '/adopt/',
>  'adoption-info---cats.html' => '/adopt/',
>  'adoption-info---cats---copy-as-of-102023.html' => '/adopt/',
>  'adoption-info---copy-as-of-32024.html' => '/adopt/',
>  'copy---what-is-tnr.html' => '/tnvr/',
>  'copy---what-is-tnr---original.html' => '/tnvr/',
>  'copy---about.html' => '/about-us/',
>  'copy---about---original.html' => '/about-us/',
>  'copy---adopt.html' => '/adopt/',
>  'copy---adoption-application.html' => '/adopt/',
>  'copy---adoption-contract.html' => '/adopt/',
>  'copy---donate.html' => '/how-to-help/',
>  'copy---donate---original.html' => '/how-to-help/',
>  'copy---events.html' => '/events/',
>  'copy---events---original.html' => '/events/',
>  'copy---our-team.html' => '/about-us/',
>  'copy---our-team---original.html' => '/about-us/',
>  'copy---testimonials.html' => '/stories/',
>  'copy---testimonials---original.html' => '/stories/',
>  'copy---volunteer.html' => '/how-to-help/',
>  'copy---volunteer---original.html' => '/how-to-help/',
>  'old---volunteer-form.html' => '/how-to-help/',
1816a1853,1862
>  // Catch-all: old Wix /store/ paths -> home
>  if (strpos($path, 'store/') === 0) {
>  wp_redirect(home_url('/'), 301);
>  exit;
>  }
>  // Catch-all: any remaining .html path -> home (old Wix pages not worth individual mapping)
>  if (substr($path, -5) === '.html') {
>  wp_redirect(home_url('/'), 301);
>  exit;
>  }
```

Only the two intended additions: 36 lines (35 entries + 1 comment) in $map, 10 lines (2 catch-all blocks) after the isset check. Nothing else changed. [VERIFIED]

## S5 — Syntax gate + swap

```
php -l functions.php.work
No syntax errors detected in functions.php.work
```
Swapped: 1865 lines (was 1819). [VERIFIED]

## S6 — Site health

| URL | HTTP |
|-----|------|
| `https://www.fourlegsgoodnynj.org/` | 200 |
| `https://www.fourlegsgoodnynj.org/events/` | 200 |
| `https://www.fourlegsgoodnynj.org/es/eventos/` | 200 |
| `https://www.fourlegsgoodnynj.org/adopt/` | 200 |

All healthy. [VERIFIED]

## S7 — Redirect verification

### a) New exact matches

| Old URL | HTTP | Location | Expected |
|---------|------|----------|----------|
| `/adopt.html` | 301 | `/adopt/` | ✅ |
| `/donate.html` | 301 | `/how-to-help/` | ✅ |
| `/copy---testimonials.html` | 301 | `/stories/` | ✅ |
| `/copy---what-is-tnr.html` | 301 | `/tnvr/` | ✅ |

[VERIFIED]

### b) Store catch-all

| Old URL | HTTP | Location | Expected |
|---------|------|----------|----------|
| `/store/p12/4LG_One_Kitty_at_a_Time_Mug.html` | 301 | `/` | ✅ |

[VERIFIED]

### c) .html catch-all (unmapped pages)

| Old URL | HTTP | Location | Expected |
|---------|------|----------|----------|
| `/kitten-gallery.html` | 301 | `/` | ✅ |
| `/psychic-soiree.html` | 301 | `/` | ✅ |

[VERIFIED]

### d) Regression (existing entries)

| URL | HTTP | Location | Expected |
|-----|------|----------|----------|
| `/rg-cares-animal-shelter.html` | 301 | `/` | ✅ |
| `/donate/` | 301 | `/how-to-help/` | ✅ |

[VERIFIED]

### e) Real pages unaffected

| URL | HTTP | Expected |
|-----|------|----------|
| `/adopt/` | 200 | ✅ Not redirected |
| `/how-to-help/` | 200 | ✅ Not redirected |
| `/` | 200 | ✅ Not redirected |

[VERIFIED]

### f) Non-.html unmatched → 404

| URL | HTTP | Expected |
|-----|------|----------|
| `/zzz-nonexistent-xyz/` | 404 | ✅ Falls through to 404.php |

[VERIFIED]

### g) CRITICAL — Physical .html files NOT intercepted

| URL | HTTP | Expected |
|-----|------|----------|
| `/readme.html` | 200 | ✅ Served by Apache, not redirected |
| `/Default.html` | 200 | ✅ Served by Apache, not redirected |

**No catch-all interference with physical files.** Apache serves them before WordPress routing. [VERIFIED]

## Summary

`flg_section_slug_redirects` now has:
- **51 exact-match entries** (6 fabricated slugs + 10 first-wave .html + 35 remaining Wix content pages)
- **2 catch-all rules** (store/ prefix → home, .html suffix → home)

This covers the entire 93-URL old Wix surface plus any undiscovered old URLs. All redirects are 301 (permanent). No other functions touched.
