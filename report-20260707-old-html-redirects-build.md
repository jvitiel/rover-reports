# Old .html URL Redirects — Build Report

## S0 — Fail-fast anchor

Existing `$map` tail in `flg_section_slug_redirects` confirmed VERBATIM:
```
 'meet-our-animals' => '/adopt/',
 );
```
[VERIFIED]

## S1 — Backup

Backup filename: `functions.php.bak-20260707-142704` (68,094 bytes). [VERIFIED]

## S2 — Edit

Replaced the two-line `$map` tail with the expanded block (10 new entries + comment). Existing 6 entries untouched.

## S3 — Diff gate

```
1802a1803,1813
> // Old Wix .html URLs still indexed by search engines -> current pages (301)
>  'rg-cares-animal-shelter.html' => '/',
>  'contact.html' => '/',
>  'copy---home---original.html' => '/',
>  'rg-cares.html' => '/rg-cares/',
>  'events.html' => '/events/',
>  'adoption-info.html' => '/adopt/',
>  'adoption-application.html' => '/adopt/',
>  'adoption-application---copy-as-of-22024.html' => '/adopt/',
>  'copy---adopt---original.html' => '/adopt/',
>  'mission.html' => '/about-us/',
```

Only the 11 lines (1 comment + 10 entries) inserted before `);`. Nothing else changed. [VERIFIED]

## S4 — Syntax gate + swap

```
php -l functions.php.work
No syntax errors detected in functions.php.work
```

Swapped: `mv functions.php.work functions.php` → 1819 lines. [VERIFIED]

## S5 — Site health

| URL | HTTP |
|-----|------|
| `https://www.fourlegsgoodnynj.org/` | 200 |
| `https://www.fourlegsgoodnynj.org/events/` | 200 |
| `https://www.fourlegsgoodnynj.org/es/eventos/` | 200 |
| `https://www.fourlegsgoodnynj.org/adopt/` | 200 |

All healthy. [VERIFIED]

## S6 — Redirect verification (all 10)

| Old URL | HTTP | Location |
|---------|------|----------|
| `/rg-cares-animal-shelter.html` | 301 | `https://www.fourlegsgoodnynj.org/` |
| `/contact.html` | 301 | `https://www.fourlegsgoodnynj.org/` |
| `/copy---home---original.html` | 301 | `https://www.fourlegsgoodnynj.org/` |
| `/rg-cares.html` | 301 | `https://www.fourlegsgoodnynj.org/rg-cares/` |
| `/events.html` | 301 | `https://www.fourlegsgoodnynj.org/events/` |
| `/adoption-info.html` | 301 | `https://www.fourlegsgoodnynj.org/adopt/` |
| `/adoption-application.html` | 301 | `https://www.fourlegsgoodnynj.org/adopt/` |
| `/adoption-application---copy-as-of-22024.html` | 301 | `https://www.fourlegsgoodnynj.org/adopt/` |
| `/copy---adopt---original.html` | 301 | `https://www.fourlegsgoodnynj.org/adopt/` |
| `/mission.html` | 301 | `https://www.fourlegsgoodnynj.org/about-us/` |

All 10 redirect correctly. [VERIFIED]

## S7 — Regression

| Test | HTTP | Result |
|------|------|--------|
| `/donate/` (existing fabricated-slug redirect) | 301 → `/how-to-help/` | ✅ No regression |
| `/zzz-nonexistent-xyz/` (unmatched URL) | 404 | ✅ Falls through to 404.php |

[VERIFIED]

## Summary

`$map` now has 16 entries: 6 original fabricated-slug redirects + 10 old Wix `.html` redirects. Handler logic, 404-guess filter, and all other functions untouched.
