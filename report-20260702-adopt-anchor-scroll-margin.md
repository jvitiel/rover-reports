# Adopt Page Anchor Scroll-Margin Diagnosis

## Q1 — Anchor Location and Template

**Active theme:** `4lg-theme` (version 1.0.0, NOT a child theme — no `Template:` header in style.css). [VERIFIED via `wp theme list --status=active`]

**The `id="adoption-application"` is NOT in a theme template file.** `grep -rn "adoption-application" <theme-dir>` returned zero matches from theme PHP/HTML files. [VERIFIED]

The anchor lives in **WordPress page content** (Gutenberg post_content):

| Page ID | Title | Slug | Anchor present |
|---------|-------|------|----------------|
| 7 | Adopt a Pet | `adopt` | Yes — line 726 of post_content |
| 339 | Adopta una Mascota | `adopta-una-mascota` | Yes — line 759 of post_content |

[VERIFIED via `wp post get <id> --field=post_content | grep 'adoption-application'`]

**Surrounding markup** (identical structure in both pages):

```html
<div id="adoption-application" class="adoption-form-container">
  <!-- Header -->
  <div class="form-header">
    <span class="label">Apply to Adopt</span>
    <h2>Adoption Application</h2>
    <p>Complete the form below to apply. You can also download a printable version.</p>
  </div>
  <!-- Download Buttons -->
  <div class="download-buttons">...
```

The anchor `id` is on the outer `<div class="adoption-form-container">`. The CSS rule should target `#adoption-application` (or `.adoption-form-container` if a class-based selector is preferred, but the id is more specific and already the deep-link target). [VERIFIED]

---

## Q2 — ES Parity

```
$ curl -s 'https://www.fourlegsgoodnynj.org/adopt/' | grep -o 'id="adoption-application"'
id="adoption-application"

$ curl -s 'https://www.fourlegsgoodnynj.org/es/adopta-una-mascota/' | grep -o 'id="adoption-application"'
id="adoption-application"
```

**Both EN and ES rendered pages contain `id="adoption-application"`.** [VERIFIED via anonymous VPS curl — no auth, no cookies]

One CSS rule targeting `#adoption-application` covers both language pages. The markup is in page content (not a template), and each translation has its own copy of the block with the same id. [VERIFIED]

---

## Q3 — Sticky Header Height

**Selector:** `.site-header`
**Position:** `fixed` (not sticky) — `position: fixed; top: 0; left: 0; right: 0; z-index: 100;` [VERIFIED at style.css line 68]

**Height:** The header has no explicit `height` declaration. The inner container `.nav-inner` has `min-height: 52px`. The hero sections use `margin-top: 52px` to clear the fixed header. [VERIFIED at style.css line 70 (nav-inner) and line 108/123 (hero/page-hero margin-top)]

```css
.nav-inner { min-height: 52px; }
.hero { margin-top: 52px; }
.page-hero { margin-top: 52px; }
body.admin-bar .hero { margin-top: calc(52px + 32px); }
```

**Mobile breakpoint:** No mobile-specific height override for the header or nav-inner was found. The 52px min-height applies at all viewport sizes. At `@media (max-width: 1200px)` there is a `.site-header .nav-inner { position: relative; }` but no height change. [VERIFIED via grep]

**Recommended `scroll-margin-top` value:** At least **68px** (52px header + 16px breathing room). The `page-events.php` precedent uses `100px` for its `.event-strip` anchor, which provides generous clearance. Either 68px–80px (tight) or 100px (matching existing precedent) would work. [INFERRED — the exact rendered header height may vary slightly with padding, but the theme consistently uses 52px as the offset constant]

---

## Q4 — Existing Scroll CSS

```
style.css:41:     html { scroll-behavior: smooth; }
page-events.php:311:  .event-strip { scroll-margin-top: 100px; }
```

[VERIFIED via `grep -rn` across full theme directory]

- **`html { scroll-behavior: smooth; }`** — global smooth scrolling is enabled. This means hash-link navigation already animates; the `scroll-margin-top` will define where the smooth scroll stops. No conflict. [VERIFIED]

- **`.event-strip { scroll-margin-top: 100px; }`** — this is the ONLY existing `scroll-margin-top` rule in the theme, scoped to the Events page template (`page-events.php`) as an inline `<style>` block. It uses 100px. No global `scroll-padding-top` on `html` or `body`. [VERIFIED]

- **No existing rule targets `#adoption-application` or `.adoption-form-container`** with any scroll offset. Adding one will not conflict with or double-apply against anything. [VERIFIED]

---

## Q5 — Where Custom CSS Should Go

### Theme structure

`4lg-theme` is a standalone theme (no child theme, no `Template:` header). [VERIFIED]

### Enqueued stylesheets

```php
wp_enqueue_style('flg-style', get_stylesheet_uri(), ...);  // style.css
wp_enqueue_style('flg-google-fonts', '...googleapis...', ...);  // Google Fonts
```

The main (and only custom) stylesheet is **`style.css`** in the theme root. [VERIFIED at functions.php line 113]

### Customizer Additional CSS

`wp post list --post_type=custom_css` returned an empty result set. `wp eval 'echo wp_get_custom_css();'` returned empty. **No Customizer Additional CSS is in use.** [VERIFIED]

### Existing precedent for scroll-margin-top

The one existing `scroll-margin-top: 100px` rule for `.event-strip` is in an **inline `<style>` block inside `page-events.php`** (the Events page template). This is a template-specific rule for a template-specific anchor. [VERIFIED]

### Where to put the new rule

**Two viable options:**

1. **`style.css`** (theme root) — the canonical location for all theme-wide CSS. The adopt anchor id exists in page content (not a template), so there's no page-template PHP file to put an inline `<style>` in (both pages use the generic `page.php`). Adding `#adoption-application { scroll-margin-top: 80px; }` to style.css is consistent with how all other CSS is organized. This is the recommended placement.

2. **Customizer Additional CSS** — not currently in use, and starting to use it for a single rule when the theme's own style.css is the established location would be inconsistent.

**Recommended file:** `/home/customer/www/fourlegsgoodnynj.org/public_html/wp-content/themes/4lg-theme/style.css` — add the one rule at the end or near the existing `html { scroll-behavior: smooth; }` block at line 41.
