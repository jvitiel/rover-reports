# Subscribe Form Removal Inventory — Pre-Removal Diagnosis

**Date:** 2026-06-01 10:21 ET  
**Type:** Diagnosis (read-only inventory)  
**Purpose:** Enumerate every artifact from the subscribe-form wiring session for precise removal scope

---

## 1. Complete Artifact Inventory

### 1a. HTML Form Markup (WP post_content)

**EN Homepage — Page 14, raw lines 339–356**

The form lives inside a `wp:group` block (charcoal background, full-width). The block structure is:

```
<!-- wp:group {"align":"full",...,"backgroundColor":"charcoal",...} -->    ← line 339
<div class="wp-block-group alignfull has-charcoal-background-color ...">
  <!-- wp:heading -->
  <h2>Stay connected</h2>                                                ← line 341
  <!-- /wp:heading -->
  <!-- wp:paragraph -->
  <p>Get tales about tails in your inbox — adoption updates, event       ← line 345
     announcements, and heartwarming stories from the shelter.</p>
  <!-- /wp:paragraph -->
  <!-- wp:html -->                                                       ← line 348
  <form id="subscribe-form" ...>                                         ← line 349
      <input type="text" name="website_url" ... (honeypot)>              ← line 350
      <input type="email" id="subscribe-email" ...>                      ← line 351
      <button type="submit" id="subscribe-submit" ...>Subscribe</button> ← line 352
      <div id="subscribe-error" ... hidden></div>                        ← line 353
  </form>                                                                ← line 354
  <!-- /wp:html -->                                                      
</div>
<!-- /wp:group -->                                                       ← line 356
```

[VERIFIED — retrieved via `wp post get 14 --field=post_content` over SSH]

**ES Homepage — Page 335, identical structure:**

Same block layout. Differences:
- Heading: "Mantente conectado"
- Paragraph: "Recibe historias con cola en tu bandeja de entrada..."
- Email placeholder: "Tu correo electrónico"
- Button label: "Suscribirse"

[VERIFIED — retrieved via `wp post get 335 --field=post_content` over SSH]

**Elements added during wiring session:**
- `id="subscribe-form"` + `onsubmit="return false;"` on the `<form>` tag
- `<input type="text" name="website_url" ...>` (honeypot) — entire element added
- `id="subscribe-email"` + `name="subscribe-email"` on the email input
- `id="subscribe-submit"` on the button
- `<div id="subscribe-error" ...>` — entire element added

**Pre-existing elements (existed before wiring):**
- The `<form class="newsletter-form" ...>` wrapper — existed but lacked `id` and `onsubmit`
- The email `<input type="email">` — existed but lacked `id` and `name`
- The `<button type="submit">` — existed but lacked `id`
- The `wp:group` wrapper (charcoal section), heading, and paragraph — all pre-existing

[INFERRED — based on before/after comparison in the prior wiring report]

**Container added solely for the form?** No. The `wp:group` (charcoal background div) and its children (heading, paragraph) are the pre-existing "Stay connected" section. The `<!-- wp:html -->` block wrapping the form is also pre-existing. Only IDs, attributes, and new child elements were added inside.

[VERIFIED — the prior wiring report shows "before" markup with the form already present]

---

### 1b. Thank-You Modal (footer.php)

**File:** `footer.php`, lines 145–156

```php
    <!-- Subscribe Thank You Modal -->
    <div class="contact-modal-overlay" id="subscribe-thanks-modal" role="dialog" aria-modal="true" aria-labelledby="subscribe-thanks-title" aria-hidden="true">
        <div class="contact-modal" style="max-width:440px;text-align:center;">
            <button type="button" class="contact-modal-close" aria-label="<?php esc_attr_e('Close', 'four-legs-good'); ?>">&times;</button>
            <div class="contact-modal-inner">
                <div class="contact-form-success-icon">&check;</div>
                <h2 id="subscribe-thanks-title" class="contact-modal-title"><?php esc_html_e('Thank you!', 'four-legs-good'); ?></h2>
                <p style="margin:1rem 0 1.5rem;line-height:1.6;"><?php esc_html_e('You\'re on the list. We\'ll be in touch with adoption updates, event announcements, and heartwarming stories.', 'four-legs-good'); ?></p>
                <button type="button" class="btn-primary subscribe-thanks-ok"><?php esc_html_e('OK', 'four-legs-good'); ?></button>
            </div>
        </div>
    </div>
```

Entire block (lines 145–156) was added during wiring. [VERIFIED]

---

### 1c. CSS — OK Button Rule (style.css)

**File:** `style.css`, lines 1848–1856

```css
/* Subscribe thank-you modal — OK button sizing (mirrors .contact-form-success .btn-primary) */
#subscribe-thanks-modal .subscribe-thanks-ok {
    min-width: 140px;
    padding: 12px 32px;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
}
```

[VERIFIED — grep confirmed these are the only subscribe-specific selectors in style.css]

---

### 1d. Other CSS Targeting Subscribe Selectors

No other CSS rules in `style.css` match `#subscribe-*` or `.subscribe-*` selectors. The one rule above (lines 1848–1856) is the only subscribe-specific CSS. [VERIFIED — `grep -n "subscribe" style.css` returned only lines 1848–1849]

---

### 1e. JavaScript Handler (scripts.js)

**File:** `js/scripts.js`, lines 227–364

Removable block = comment header (lines 227–231) + IIFE (lines 232–364):

```
Line 227: /* ============================================================
Line 228:  Subscribe Form — validation, submit handler, thank-you modal
Line 229:  Submits to dashboard.4lgshelterapp.duckdns.org pre-cutover;
Line 230:  URL swaps to api.fourlegsgoodnynj.org at W4 cutover (Phase 5 list).
Line 231:  ============================================================ */
Line 232: (function() {
Line 233:  'use strict';
Line 235:  var SUBSCRIBE_ENDPOINT = '...';
  ...
Line 363:  submitBtn.addEventListener('click', handleSubmit);
Line 364: })();
```

**138 lines total** (227–364 inclusive). The IIFE is self-contained — see shared-usage analysis below.

[VERIFIED]

---

### 1f. functions.php — i18n Localize Block

**File:** `functions.php`, lines 141–147

```php
    // Inject i18n strings for subscribe-form JS (scripts.js)
    wp_localize_script('flg-scripts', 'flg_subscribe_i18n', array(
        'email_invalid'  => __('Please enter a valid email address', 'four-legs-good'),
        'sending'        => __('Sending...', 'four-legs-good'),
        'generic_error'  => __('Something went wrong. Please try again.', 'four-legs-good'),
        'network_error'  => __('Something went wrong. Please try again.', 'four-legs-good'),
    ));
```

These 7 lines sit immediately after the `flg_contact_i18n` localize block (lines 127–140) and before the closing `}` of `flg_enqueue_scripts()` at line 148.

[VERIFIED]

---

### 1g. Translation Entries (es_ES.po)

Six entries, all at the end of the file:

| Lines | msgid | Comment |
|-------|-------|---------|
| 451–453 | "Thank you!" → "¡Gracias!" | footer.php (subscribe modal) |
| 455–457 | "You're on the list. We'll be in touch..." → "Estás en la lista..." | footer.php (subscribe modal) |
| 459–461 | "Please enter a valid email address" → "Por favor ingresa..." | functions.php (subscribe i18n) |
| 463–465 | "Sending..." → "Enviando..." | functions.php (subscribe i18n) |
| 467–469 | "Something went wrong. Please try again." → "Algo salió mal..." | functions.php (subscribe i18n) |
| 471–473 | "OK" → "OK" | footer.php (subscribe modal) |

[VERIFIED — lines 451–473, each entry is 3 lines (comment + msgid + msgstr)]

**Note:** `es_ES.mo` (compiled binary) must be recompiled after .po edits.

---

## 2. Shared-Usage Analysis

### 2a. Function Name Collisions

The subscribe IIFE (lines 232–364) declares these functions: `getLang`, `showError`, `clearError`, `setLoading`, `openThankYouModal`, `handleSubmit`, `handleEsc`, `closeThankYou`.

The contact-form IIFE (lines 63–225) declares its own `clearError`, `setLoading`, and `handleEsc` with the same names.

**This is safe.** Both are wrapped in IIFEs — `(function() { ... })();` — so all function declarations are lexically scoped to their own closure. The subscribe IIFE's functions are invisible to the contact form IIFE and vice versa. Removing the entire subscribe IIFE (lines 227–364) will not affect the contact form's identically-named functions. [VERIFIED — IIFE boundaries at lines 63/225 and 232/364 confirmed]

No function declared inside the subscribe IIFE is referenced outside it. [VERIFIED — grep for each function name outside lines 232–364 returned zero matches except for the contact form's own independent declarations]

### 2b. CSS Class/ID Overlap with Contact Modal

The subscribe thank-you modal (footer.php:146–156) reuses these contact-modal CSS classes:
- `contact-modal-overlay` — shared with contact modal (footer.php:81)
- `contact-modal` — shared with contact modal (footer.php:82)
- `contact-modal-close` — shared with contact modal (footer.php:83)
- `contact-modal-inner` — shared with contact modal (footer.php:84)
- `contact-modal-title` — shared with contact modal (footer.php:85)
- `contact-form-success-icon` — shared with contact modal (footer.php:136)
- `btn-primary` — site-wide class, used on 4 elements in footer.php (lines 14, 128, 139, 153)

**The one subscribe-specific class** is `.subscribe-thanks-ok` (footer.php:153), targeted by the CSS rule `#subscribe-thanks-modal .subscribe-thanks-ok` (style.css:1849). This class appears nowhere else. [VERIFIED]

**Removal is clean:** Deleting the subscribe modal HTML (footer.php:145–156) and its CSS rule (style.css:1848–1856) orphans nothing. All shared classes (`contact-modal-*`, `btn-primary`) remain in use by the contact modal. [VERIFIED]

### 2c. "Subscribe" / "Suscribirse" Text References

The button label "Subscribe" (EN) and "Suscribirse" (ES) are hardcoded in the WP post_content of pages 14 and 335 respectively. They are **not** translated via .po — they're literal text in the page content.

**No separate "Subscribe" msgid exists in es_ES.po.** [VERIFIED — `grep '"Subscribe"' es_ES.po` returned no results]

The word "Subscribe" does not appear anywhere in the theme files (footer.php, functions.php, style.css, scripts.js) outside the subscribe handler block. [VERIFIED]

---

## 3. "Stay Connected" Section Structure (Post-Removal)

The "Stay connected" section is a `wp:group` block with charcoal background containing three child blocks:

1. `wp:heading` — "Stay connected" / "Mantente conectado"
2. `wp:paragraph` — intro text ("Get tales about tails...")
3. `wp:html` — the subscribe form

If we remove only the `<!-- wp:html -->` form block (lines 348–355 in page 14), the heading and paragraph remain as valid children of the group. The section will render as:

```
┌─────────────────────────────────────────────┐
│ (charcoal background, full-width)           │
│                                             │
│         Stay connected                      │
│  Get tales about tails in your inbox...     │
│                                             │
│  [empty space where form was]               │
│                                             │
└─────────────────────────────────────────────┘
```

The heading and paragraph are **siblings** of the form block (not parents), so they can be preserved independently. For the CC widget replacement, the natural approach is to replace the `<!-- wp:html -->` form block with a new `<!-- wp:html -->` block containing the CC embed `<div>` (and optionally its `<script>`). The heading and paragraph can stay as-is or be edited to match CC's messaging. [VERIFIED — block structure confirmed via raw post_content]

The intro paragraph text ("Get tales about tails in your inbox — adoption updates, event announcements, and heartwarming stories from the shelter.") may want updating since CC handles its own copy, but that's a content decision, not a structural one. [INFERRED]

---

## 4. Vendor Embed Pattern Analysis

**Existing third-party script enqueues in functions.php:**

| Script | Method | Location |
|--------|--------|----------|
| Google Fonts | `wp_enqueue_style()` | functions.php:117–122 |
| `flg-scripts` (theme JS) | `wp_enqueue_script()` | functions.php:124 |

That's it. **No other vendor scripts are enqueued.** No `wp_register_script`, no `wp_add_inline_script`, no CDN-hosted JS libraries. [VERIFIED — grep returned only the two calls above]

**Inline scripts in footer.php:**

One `<script>` block at footer.php:158–176 (header scroll effect + intersection observer for animations). This is theme code, not a vendor embed. [VERIFIED]

**Existing convention:** The theme uses `wp_enqueue_style/script` in `functions.php` for external resources (Google Fonts) and inline `<script>` in `footer.php` for small theme behaviors. There are **no existing vendor widget embeds** to model after. [VERIFIED]

**CC widget placement options:**

Given the absence of prior vendor embed patterns, either approach is viable:

1. **Inline in post_content** — Both CC `<script>` and `<div>` inside a `<!-- wp:html -->` block replacing the form. Simplest, one file touch (WP post_content only). Matches how the current form is embedded.

2. **Script in functions.php + div in post_content** — `wp_enqueue_script` for the CC JS in `flg_enqueue_scripts()`, with only the `<div>` in the page's `<!-- wp:html -->` block. Cleaner separation but two file touches and the CC script would load on every page, not just the homepage.

The existing pattern (the subscribe form itself, and the events placeholder `<!-- UPCOMING_EVENTS -->`) uses inline `<!-- wp:html -->` blocks in post_content for page-specific dynamic content. [VERIFIED]

---

## Summary Table — Complete Removal Scope

| # | File | Location | What | Lines |
|---|------|----------|------|-------|
| 1 | WP Page 14 (EN) | post_content raw lines 348–355 | `<!-- wp:html -->` form block | 8 lines |
| 2 | WP Page 335 (ES) | post_content (same relative position) | `<!-- wp:html -->` form block | 8 lines |
| 3 | footer.php | lines 145–156 | Subscribe thank-you modal HTML | 12 lines |
| 4 | style.css | lines 1848–1856 | `#subscribe-thanks-modal .subscribe-thanks-ok` rule | 9 lines |
| 5 | js/scripts.js | lines 227–364 | Comment header + subscribe IIFE | 138 lines |
| 6 | functions.php | lines 141–147 | `flg_subscribe_i18n` localize block | 7 lines |
| 7 | es_ES.po | lines 451–473 | 6 translation entries | 23 lines |
| 8 | es_ES.mo | (binary) | Recompile after .po edit | — |

**Total removable:** ~205 lines across 7 files + 1 binary recompile.

**Safe to remove entirely:** All items. No shared dependencies, no cross-references outside the subscribe feature boundary. [VERIFIED]
