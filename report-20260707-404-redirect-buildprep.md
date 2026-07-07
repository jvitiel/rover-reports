# 404.php + Redirect Build-Prep Diagnosis

## Q1 — Redirect target anchor verification

### /how-to-help/ (page 8)

HTTP 200. [VERIFIED]

Rendered HTML element IDs matching section targets:

| Footer anchor | Exists in rendered HTML? | Actual ID found |
|---------------|------------------------|-----------------|
| `#volunteer` | ❌ NO | `id="volunteer-application"` and `id="volunteer-form"` exist (form elements, not section anchors) |
| `#foster` | ❌ NO | No foster-related ID attribute anywhere in rendered HTML |
| `#wishlists` | ❌ NO | No wishlists-related ID attribute anywhere in rendered HTML |

[VERIFIED — full `id="..."` extraction from rendered HTML via curl + grep]

The page content has Donate, Volunteer, Foster, and Wish Lists as visual sections (rendered as `wp-block-columns` groups with heading text like `<p>Donate</p>`, `<p>Foster</p>`), but **none of these sections have id attributes**. The Gutenberg block source (`post_content`) contains zero `"anchor"` attributes. [VERIFIED]

The footer links to `#volunteer`, `#foster`, `#wishlists` currently scroll nowhere — the browser lands at the top of the page because the fragment targets don't exist.

### /adopt/ (page 7)

HTTP 200. [VERIFIED]

| Footer anchor | Exists in rendered HTML? | Actual ID found |
|---------------|------------------------|-----------------|
| `#process` | ❌ NO | No process-related ID in rendered HTML |
| `#faq` | ❌ NO | No faq-related ID in rendered HTML |

[VERIFIED — full `id="..."` extraction from rendered HTML via curl + grep]

The page content has "Our adoption process" (`<h2>`) and "Adoption FAQ" (`<h2>`) as visible section headings, but neither heading nor its parent container has an `id` attribute. Related IDs present: `id="adoption-application"` (the application form section) and `id="adoptionForm"` (the form element). [VERIFIED]

### Final redirect target URLs

Since the anchor IDs don't exist on the target pages, all redirects should land at the page level (no fragment). The browser behavior would be identical to the current footer links which already use nonexistent fragments.

| Guessed slug | Redirect target | Notes |
|-------------|----------------|-------|
| `/donate/` | `/how-to-help/` | Whole page. Donate is the first visual section. [VERIFIED — page 200, correct destination] |
| `/foster/` | `/how-to-help/` | No `#foster` anchor exists. Foster section is mid-page but unaddressable. [VERIFIED] |
| `/adoption-process/` | `/adopt/` | No `#process` anchor exists. Process section is mid-page but unaddressable. [VERIFIED] |
| `/adoption-faq/` | `/adopt/` | No `#faq` anchor exists. FAQ section is mid-page but unaddressable. [VERIFIED] |
| `/meet-our-animals/` | `/adopt/` | Whole page. "Meet Our Animals" is the footer text for the Adopt page. [VERIFIED — page 200] |

**Recommendation:** If the sections should be directly addressable (for better UX after redirect), the Gutenberg blocks need `id` attributes added via Advanced → HTML Anchor in the block editor. This is a WP admin content edit, not a theme change, and is a separate scope item.

## Q2 — Baseline HTTP status (before-state)

| URL | HTTP status |
|-----|-------------|
| `/donate/` | 404 |
| `/foster/` | 404 |
| `/adoption-process/` | 404 |
| `/adoption-faq/` | 404 |
| `/meet-our-animals/` | 404 |

[VERIFIED — all curled from VPS, all return 404]

All five currently fall through to `index.php` (no `404.php` exists), rendering "No posts found." with the site's header/footer chrome.

## Q3 — Template structure for 404.php

### No 404.php exists

Theme files in `4lg-theme/`:
```
footer.php  front-page.php  functions.php  header.php  index.php
page-events.php  page-stories.php  page.php  single.php  singular.php
```
No `404.php`. [VERIFIED]

### Header/footer mechanism

Both `index.php` and `page.php` use:
- `get_header()` → loads `header.php` (no argument, no template part variant)
- `get_footer()` → loads `footer.php` (no argument, no template part variant)

[VERIFIED]

### index.php opener (the fallthrough template)

```php
<?php
get_header();
?>

    <section class="page-hero">
        <div class="container">
            <h1><?php bloginfo('name'); ?></h1>
            <p><?php bloginfo('description'); ?></p>
        </div>
    </section>

    <section class="content-section">
        <div class="container">
            <?php if (have_posts()) : ?>
                ...
            <?php else : ?>
                <p><?php esc_html_e('No posts found.', 'four-legs-good'); ?></p>
            <?php endif; ?>
        </div>
    </section>

<?php
get_footer();
```

### page.php opener (for comparison)

```php
<?php
get_header();
?>

<main id="primary" class="site-main">
    <?php
    while (have_posts()) :
        the_post();
        the_content();
    endwhile;
    ?>
</main>

<?php
get_footer();
```

### CSS handles/classes for 404.php

The theme enqueues:
- `flg-style` → `style.css` (main stylesheet, via `get_stylesheet_uri()`)
- Google Fonts: Fraunces + Nunito Sans (lines 116-121)
- `flg-scripts` → `js/scripts.js`

[VERIFIED — from `flg_enqueue_scripts` in functions.php]

Key classes from the existing templates:
- `.page-hero` + `.container` — hero banner section (cream/charcoal styling)
- `.content-section` + `.container` — body content wrapper
- `#primary` + `.site-main` — page.php uses this as the main content wrapper
- `.site-header` — header chrome (in header.php)
- `.site-footer` — footer chrome (in footer.php)

The 404.php should use `get_header()` / `get_footer()` (no arguments), wrap content in a `.page-hero` + `.content-section` shell (matching index.php), and can use `.site-main` if desired. All site chrome (header, footer, styles, scripts) loads automatically via wp_head/wp_footer. [VERIFIED]

## Q4 — Sitemap loose ends

### Stale sitemap entry found

`/event/test-event/` appears in `shelter_event-sitemap.xml`. [VERIFIED]

This is stale: post 297 ("Test Event", slug `test-event`, `shelter_event` CPT) was **force-deleted** on 2026-07-07. `wp post get 297` returns "POST_NOT_FOUND". The URL returns HTTP 404. [VERIFIED]

The companion ES post 470 is also force-deleted (`wp post get 470` returns "POST_NOT_FOUND"). Its URL does NOT appear in the sitemap. [VERIFIED]

### Other test data in WP (any status)

Events:
| ID | Title | Slug | Status |
|----|-------|------|--------|
| 309 | test event | test-event-2 | draft |
| 298 | second test event | second-test-event | draft |

Stories:
| ID | Title | Slug | Status |
|----|-------|------|--------|
| 448 | Test story | test-story-3 | draft |
| 447 | Test story | test-story-2 | draft |
| 308 | Test story | test-story | draft |
| 301 | FB test post | fb-test-post | draft |

[VERIFIED — wp post list with --post_status=any]

None of these draft posts appear in the sitemap (Rank Math correctly excludes drafts). [VERIFIED]

### Sitemap summary

| Sub-sitemap | URLs | Stale entries |
|-------------|------|---------------|
| page-sitemap.xml | 23 | 0 — all resolve 200 [VERIFIED in prior diagnosis] |
| shelter_event-sitemap.xml | 12 | 1 — `/event/test-event/` (404, post force-deleted) |
| shelter_story-sitemap.xml | 10 | 0 — all are published EN+ES stories [VERIFIED] |

The stale entry will clear on the next Rank Math sitemap rebuild/regeneration. A manual rebuild can be triggered from WP Admin → Rank Math → Sitemap Settings, or by resaving permalinks, but that counts as a write action (excluded from this diagnosis). [INFERRED — based on standard Rank Math behavior]

## Q5 — Redirect mechanism

### Existing template_redirect hooks

Zero `template_redirect` hooks in `functions.php`. [VERIFIED — grep returned no matches]

No redirect-related add_action calls of any kind in the theme. [VERIFIED]

### Rank Math Redirections module

**NOT active.** The `rank_math_modules` option lists 13 modules; `redirections` is not among them. [VERIFIED]

No `wp_rank_math_redirections` table exists in the database. [VERIFIED — `SHOW TABLES LIKE '%redirect%'` returned empty]

No redirect-related options exist (only `siteground_wizard_activation_redirect` which is a one-time SiteGround install wizard flag). [VERIFIED]

### Recommendation

Implement redirects via `add_action('template_redirect', ...)` in `functions.php`. No conflict with existing hooks (none exist) or Rank Math (Redirections module inactive, no table). The hook fires early in the WP template resolution — a `wp_redirect()` + `exit` there will intercept before `index.php` loads. [VERIFIED — no conflicts]

The `/volunteer/` → `/event/volunteer-orientation/` 301 redirect is NOT from Rank Math and NOT from functions.php — it's WordPress's built-in `redirect_guess_404_permalink()` matching the word "volunteer" against the event slug. This is a core WP behavior, not configurable from the theme. If desired, it can be disabled via `add_filter('do_redirect_guess_404_permalink', '__return_false')` but that's a separate scope decision. [INFERRED — based on WP core behavior; no explicit redirect source found]
