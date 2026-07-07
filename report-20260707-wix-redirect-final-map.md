# Wix Migration — Final Redirect Map

## Q1 — Current WP page targets

### Published pages

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

(Plus ES translations and legal pages — not redirect targets.) [VERIFIED]

### Target page HTTP confirmation

| Target | HTTP |
|--------|------|
| `/` (home) | 200 |
| `/adopt/` | 200 |
| `/how-to-help/` | 200 |
| `/events/` | 200 |
| `/about-us/` | 200 |
| `/rg-cares/` | 200 |
| `/tnvr/` | 200 |
| `/stories/` | 200 |

All 8 targets confirmed live. [VERIFIED]

No missing targets. Every logical content category (adopt, help/donate, events, about/team/board/mission, rg-cares, tnvr, stories/testimonials) has a real WP page. [VERIFIED]

## Q2 — Full old→new content map

### Already in the handler (16 entries — no changes)

| Entry | Target | Type |
|-------|--------|------|
| `donate` | `/how-to-help/` | fabricated slug |
| `foster` | `/how-to-help/` | fabricated slug |
| `volunteer` | `/how-to-help/` | fabricated slug |
| `adoption-process` | `/adopt/` | fabricated slug |
| `adoption-faq` | `/adopt/` | fabricated slug |
| `meet-our-animals` | `/adopt/` | fabricated slug |
| `rg-cares-animal-shelter.html` | `/` | old Wix |
| `contact.html` | `/` | old Wix |
| `copy---home---original.html` | `/` | old Wix |
| `rg-cares.html` | `/rg-cares/` | old Wix |
| `events.html` | `/events/` | old Wix |
| `adoption-info.html` | `/adopt/` | old Wix |
| `adoption-application.html` | `/adopt/` | old Wix |
| `adoption-application---copy-as-of-22024.html` | `/adopt/` | old Wix |
| `copy---adopt---original.html` | `/adopt/` | old Wix |
| `mission.html` | `/about-us/` | old Wix |

### New exact entries needed (old URLs with non-home targets)

| Old URL | Target | Rationale |
|---------|--------|-----------|
| `index.html` | `/` | Old homepage → home (but NOTE: caught by .html catch-all → home anyway; include for explicitness) |
| `about.html` | `/about-us/` | About page |
| `about1.html` | `/about-us/` | Wix variant of About |
| `about-old.html` | `/about-us/` | Wix variant of About |
| `about-us.html` | `/about-us/` | Direct slug match |
| `adopt.html` | `/adopt/` | Adopt page |
| `dogs.html` | `/adopt/` | Old species page → unified Adopt |
| `cats.html` | `/adopt/` | Old species page → unified Adopt |
| `donate.html` | `/how-to-help/` | Donate → How to Help |
| `our-team.html` | `/about-us/` | Team info lives on About |
| `board.html` | `/about-us/` | Board info lives on About |
| `founders.html` | `/about-us/` | Founders info lives on About |
| `current-board-of-directors.html` | `/about-us/` | Board info lives on About |
| `adoption-application1.html` | `/adopt/` | Application variant |
| `adoption-contract.html` | `/adopt/` | Contract info on Adopt page |
| `adoption-info---cats.html` | `/adopt/` | Cat adoption info → unified Adopt |
| `adoption-info---cats---copy-as-of-102023.html` | `/adopt/` | Wix copy of cat adoption info |
| `adoption-info---copy-as-of-32024.html` | `/adopt/` | Wix copy of adoption info |
| `copy---what-is-tnr.html` | `/tnvr/` | TNVR page |
| `copy---what-is-tnr---original.html` | `/tnvr/` | TNVR page variant |
| `copy---about.html` | `/about-us/` | Wix copy |
| `copy---about---original.html` | `/about-us/` | Wix copy |
| `copy---adopt.html` | `/adopt/` | Wix copy |
| `copy---adoption-application.html` | `/adopt/` | Wix copy |
| `copy---adoption-contract.html` | `/adopt/` | Wix copy |
| `copy---donate.html` | `/how-to-help/` | Wix copy |
| `copy---donate---original.html` | `/how-to-help/` | Wix copy |
| `copy---events.html` | `/events/` | Wix copy |
| `copy---events---original.html` | `/events/` | Wix copy |
| `copy---our-team.html` | `/about-us/` | Wix copy |
| `copy---our-team---original.html` | `/about-us/` | Wix copy |
| `copy---testimonials.html` | `/stories/` | Testimonials → Happy Tails |
| `copy---testimonials---original.html` | `/stories/` | Testimonials → Happy Tails |
| `copy---volunteer.html` | `/how-to-help/` | Volunteer → How to Help |
| `copy---volunteer---original.html` | `/how-to-help/` | Volunteer → How to Help |
| `old---volunteer-form.html` | `/how-to-help/` | Old volunteer form |

### Old URLs correctly handled by the .html catch-all → home (NO explicit entry needed)

These all go to `/` (home), which the `.html` suffix catch-all handles automatically:

`4lg-merch-store.html`, `4lg-chewy-wishlist.html`, `4lg-wishlists.html`, `other-ways-to-donate.html`, `old-donate---with-sponsorship-info.html`, `other-ways-to-donate---copy-as-of-22024.html`, `home---copy---as-of-22024.html`, `contact---copy-as-of-22024.html`, `donate---copy-as-of-22024.html`, `mission---copy-as-of-22024.html`, `rg-cares-animal-shelter---copy-as-of-22024.html`, `copy---contact.html`, `copy---home.html`, `copy-old-kitten-gallery.html`, `kitten-gallery.html`, `kitten-live-feed.html`, `coming-soon.html`, `atlantis.html`, `comedy-show-2023.html`, `comedy-show---august-2023.html`, `fall-festival-fundraiser-2022.html`, `jail--bail.html`, `jail--bail---prisoners.html`, `pet-supplies-plus.html`, `psychic-soiree.html`, `psychic-soiree-2021.html`, `psychic-soiree-photo-gallery.html`, `psychic-soiree-2021-photo-gallery.html`, `events-art-t-shirt-design.html`, `adoptableartistsexhibit.html`, `past-events.html`, all `events-759229-*` hash pages, `index.html`

[VERIFIED — all these have no specific content equivalent; home is the correct landing]

## Q3 — Final explicit exact-entry list (entries to ADD to $map)

Only entries whose target is NOT home (since `.html` catch-all → home covers all home-bound URLs):

```php
// Old Wix content pages -> specific WP equivalents (301)
'about.html'                                    => '/about-us/',
'about1.html'                                   => '/about-us/',
'about-old.html'                                => '/about-us/',
'about-us.html'                                 => '/about-us/',
'adopt.html'                                    => '/adopt/',
'dogs.html'                                     => '/adopt/',
'cats.html'                                     => '/adopt/',
'donate.html'                                   => '/how-to-help/',
'our-team.html'                                 => '/about-us/',
'board.html'                                    => '/about-us/',
'founders.html'                                 => '/about-us/',
'current-board-of-directors.html'               => '/about-us/',
'adoption-application1.html'                    => '/adopt/',
'adoption-contract.html'                        => '/adopt/',
'adoption-info---cats.html'                     => '/adopt/',
'adoption-info---cats---copy-as-of-102023.html' => '/adopt/',
'adoption-info---copy-as-of-32024.html'         => '/adopt/',
'copy---what-is-tnr.html'                       => '/tnvr/',
'copy---what-is-tnr---original.html'            => '/tnvr/',
'copy---about.html'                             => '/about-us/',
'copy---about---original.html'                  => '/about-us/',
'copy---adopt.html'                             => '/adopt/',
'copy---adoption-application.html'              => '/adopt/',
'copy---adoption-contract.html'                 => '/adopt/',
'copy---donate.html'                            => '/how-to-help/',
'copy---donate---original.html'                 => '/how-to-help/',
'copy---events.html'                            => '/events/',
'copy---events---original.html'                 => '/events/',
'copy---our-team.html'                          => '/about-us/',
'copy---our-team---original.html'               => '/about-us/',
'copy---testimonials.html'                      => '/stories/',
'copy---testimonials---original.html'           => '/stories/',
'copy---volunteer.html'                         => '/how-to-help/',
'copy---volunteer---original.html'              => '/how-to-help/',
'old---volunteer-form.html'                     => '/how-to-help/',
```

**35 new exact entries.** Combined with the existing 16, the map will have 51 entries total + 2 catch-all rules.

## Q4 — Catch-all safety + ordering

### a) WordPress generates NO .html URLs

Permalink structure: `/%postname%/` [VERIFIED]

All WP-generated URLs use trailing-slash clean URLs. No page, post, CPT (shelter_event, shelter_story), or archive generates a `.html` URL. The `.html` suffix catch-all cannot intercept a real WordPress page. [VERIFIED]

### b) Physical .html files in the document root

| File | Size | Served by Apache? | Notes |
|------|------|-------------------|-------|
| `Default.html` | 90,305 bytes | ✅ HTTP 200, `content-type: text/html`, served directly | SiteGround placeholder, has `noindex` meta |
| `readme.html` | 7,406 bytes | ✅ HTTP 200, `content-type: text/html`, served directly | WordPress default readme |

[VERIFIED — both curled, both return 200 with `text/html`]

Both are served as **static files by Apache/LiteSpeed BEFORE WordPress routing**. The `.htaccess` RewriteCond `!-f` means existing physical files are served directly and never reach `index.php` → WordPress → `template_redirect` → our handler. The catch-all will never see `Default.html` or `readme.html`. [VERIFIED — standard WP `.htaccess` RewriteCond confirmed in prior diagnosis]

No Google verification files (`google*.html`) found. No other `.html` or `.htm` files in the doc root. [VERIFIED]

### c) Ordering: exact → store prefix → .html suffix

Correct order in the handler:

1. **Exact match** (`isset($map[$path])`) — fires first, handles all 51 specific entries
2. **Store prefix** (`strpos($path, 'store/') === 0`) — catches `/store/p12/4LG_One_Kitty_at_a_Time_Mug.html` and any `/store/...` path
3. **`.html` suffix** (`substr($path, -5) === '.html'`) — catches everything else ending in `.html`

A store product URL like `store/p12/4LG_One_Kitty_at_a_Time_Mug.html` matches BOTH the store prefix and the `.html` suffix. With prefix checked first, it hits the store rule. Both redirect to `/` (home), so the result is identical either way — **no conflict**. But prefix-first is semantically correct (store intent → store rule). [VERIFIED — no conflict regardless of order since both → home]

### d) No redirect loops

All redirect targets: `/`, `/adopt/`, `/about-us/`, `/how-to-help/`, `/events/`, `/tnvr/`, `/rg-cares/`, `/stories/`

- None end in `.html` → won't trigger the `.html` suffix rule
- None start with `store/` → won't trigger the store prefix rule
- None match any exact-map key → won't trigger the exact-match rule
- All are real published pages returning 200 → WordPress serves them normally

**No redirect loops possible.** [VERIFIED]

## Q5 — Current handler (verbatim)

Lines 1788–1819 of `functions.php`:

```php
add_filter('do_redirect_guess_404_permalink', '__return_false');

add_action('template_redirect', 'flg_section_slug_redirects', 1);
function flg_section_slug_redirects() {
 if (is_admin()) {
 return;
 }
 $path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
 $map = array(
 'donate' => '/how-to-help/',
 'foster' => '/how-to-help/',
 'volunteer' => '/how-to-help/',
 'adoption-process' => '/adopt/',
 'adoption-faq' => '/adopt/',
 'meet-our-animals' => '/adopt/',
// Old Wix .html URLs still indexed by search engines -> current pages (301)
 'rg-cares-animal-shelter.html' => '/',
 'contact.html' => '/',
 'copy---home---original.html' => '/',
 'rg-cares.html' => '/rg-cares/',
 'events.html' => '/events/',
 'adoption-info.html' => '/adopt/',
 'adoption-application.html' => '/adopt/',
 'adoption-application---copy-as-of-22024.html' => '/adopt/',
 'copy---adopt---original.html' => '/adopt/',
 'mission.html' => '/about-us/',
 );
 if (isset($map[$path])) {
 wp_redirect(home_url($map[$path]), 301);
 exit;
 }
}
```

### Extension plan

1. Add 35 new entries to `$map` (after the existing `'mission.html'` line, before the `);`)
2. After the `isset($map[$path])` block, add two catch-all rules:

```php
    // Catch-all: old Wix /store/ paths -> home
    if (strpos($path, 'store/') === 0) {
        wp_redirect(home_url('/'), 301);
        exit;
    }
    // Catch-all: any remaining .html path -> home (old Wix pages not worth individual mapping)
    if (substr($path, -5) === '.html') {
        wp_redirect(home_url('/'), 301);
        exit;
    }
```

[VERIFIED — structure confirmed, extension points identified]
