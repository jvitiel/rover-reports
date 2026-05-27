# Publish Three Spanish Legal Pages (Polylang Translations)

**Date:** 2026-05-27 10:35 ET (14:35 UTC)

## Input Files Received (via Telegram)

| File | Size | SHA-256 |
|------|------|---------|
| website4-privacy-policy-es.md | 8110 bytes | `8418d5654162cd7996a3565409af7eeb3475787da0589955bd8fd4ac666960a9` |
| website4-terms-es.md | 7479 bytes | `f2e8cfa0bfe7c6f4ef86c137d1fa51d876911620fa0b5e4036f5e518854944e3` |
| website4-accessibility-es.md | 3176 bytes | `de905a28d7a58cc6804b5997c2312a791de025f3c9475371db302b9d20c14813` |

## Pages Created

| Page | ID | Slug | Status | Polylang Language | EN Counterpart |
|------|----|------|--------|-------------------|----------------|
| Política de Privacidad | 389 | `politica-de-privacidad` | publish | es [VERIFIED] | 383 |
| Términos de Servicio | 390 | `terminos-de-servicio` | publish | es [VERIFIED] | 384 |
| Declaración de Accesibilidad | 391 | `accesibilidad` | publish | es [VERIFIED] | 385 |

All slugs are accent-free, matching the existing ES slug convention on the site.

## Content Conversion

- Markdown → Gutenberg blocks (wp:paragraph, wp:heading level 2/3, wp:list)
- `[FECHA DE PUBLICACIÓN]` placeholders preserved verbatim (2 occurrences per page) [VERIFIED]
- 80px spacer blocks added top and bottom of each page (matching EN pages)

## Spacer Verification

| Page | Slug | Spacer divs on live page |
|------|------|--------------------------|
| 389 | /es/politica-de-privacidad/ | 2 [VERIFIED] |
| 390 | /es/terminos-de-servicio/ | 2 [VERIFIED] |
| 391 | /es/accesibilidad/ | 2 [VERIFIED] |

## Polylang Translation Pairing

Set via `pll_save_post_translations()` through `wp eval`. Verification via `pll_get_post_translations()`:

```
383 translations: {"en":383,"es":389}
384 translations: {"en":384,"es":390}
385 translations: {"en":385,"es":391}
```

All three pairs confirmed [VERIFIED].

### hreflang verification
EN Privacy Policy page (`/privacy-policy/`) contains:
```html
<link rel="alternate" href="https://johnv80.sg-host.com/es/politica-de-privacidad/" hreflang="es" />
```
[VERIFIED] — Polylang language switcher correctly links to ES counterpart.

## HTTP Status Verification

| URL | Status |
|-----|--------|
| /es/politica-de-privacidad/ | 200 [VERIFIED] |
| /es/terminos-de-servicio/ | 200 [VERIFIED] |
| /es/accesibilidad/ | 200 [VERIFIED] |

## Footer Legal Links on ES Pages

Checked on `/es/como-ayudar/`:

```html
<nav class="footer-legal" aria-label="Legal">
    <a href="https://johnv80.sg-host.com/es/politica-de-privacidad/">Privacy Policy</a>
    <span aria-hidden="true">|</span>
    <a href="https://johnv80.sg-host.com/es/terminos-de-servicio/">Terms of Service</a>
    <span aria-hidden="true">|</span>
    <a href="https://johnv80.sg-host.com/es/accesibilidad/">Accessibility</a>
</nav>
```

**URLs are correct** — `flg_nav_url()` resolves to the ES translations (`/es/politica-de-privacidad/`, etc.) [VERIFIED].

**Link text is still English** — "Privacy Policy", "Terms of Service", "Accessibility". This is because footer.php uses `esc_html_e('Privacy Policy', 'four-legs-good')` which relies on WordPress gettext translation. To display Spanish text, the strings need to be either:
- Registered as Polylang string translations via `pll_register_string()` and translated in Polylang's string translation UI, then switched from `esc_html_e()` to `pll_e()` in footer.php
- Or a .po/.mo translation file for the 'four-legs-good' text domain

**This is a separate small fix — not addressed in this prompt as instructed.**

## Scope Confirmation
- Only three new pages created (389, 390, 391)
- No edits to EN pages 383, 384, 385
- No edits to footer.php or style.css
- No edits to draft ID 3
- No edits to other ES or EN pages
- `[FECHA DE PUBLICACIÓN]` placeholders preserved verbatim
- No cache purge needed — all pages rendered immediately
