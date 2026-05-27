# Footer Legal Link Label Translations (ES)

**Date:** 2026-05-27 10:42 ET (14:42 UTC)

## Diagnosis: Translation Mechanism

The copyright line in footer.php (line 67):
```php
<?php esc_html_e('Four Legs Good, Inc. All rights reserved.', 'four-legs-good'); ?>
```

Uses **gettext** with text domain `four-legs-good`. The translation is in:
- `.po` file: `wp-content/themes/4lg-theme/languages/es_ES.po`
- `.mo` file: `wp-content/themes/4lg-theme/languages/es_ES.mo`

Confirmed by grep of es_ES.po [VERIFIED]:
```
msgid "Four Legs Good, Inc. All rights reserved."
msgstr "Four Legs Good, Inc. Todos los derechos reservados."
```

The three legal link labels already use the same mechanism (footer.php lines 69, 71, 73):
```php
<?php esc_html_e('Privacy Policy', 'four-legs-good'); ?>
<?php esc_html_e('Terms of Service', 'four-legs-good'); ?>
<?php esc_html_e('Accessibility', 'four-legs-good'); ?>
```

**No footer.php changes needed** — the labels were already wired into gettext with the correct text domain. Only the .po/.mo files needed the translation entries.

## Changes Made

### es_ES.po — three entries appended

```
#: footer.php:69
msgid "Privacy Policy"
msgstr "Política de Privacidad"

#: footer.php:71
msgid "Terms of Service"
msgstr "Términos de Servicio"

#: footer.php:73
msgid "Accessibility"
msgstr "Accesibilidad"
```

es_ES.po: 434 → 446 lines

### es_ES.mo — recompiled

Compiled via `wp i18n make-mo` on SiteGround.
- es_ES.mo: 6836 → 6988 bytes

### Files modified on SiteGround
| File | Before | After |
|------|--------|-------|
| languages/es_ES.po | 9353 bytes, 2026-05-24 15:38 | 9564 bytes, 2026-05-27 14:41 |
| languages/es_ES.mo | 6836 bytes, 2026-05-24 15:38 | 6988 bytes, 2026-05-27 14:42 |

### Files NOT modified
- footer.php — no changes needed (already used esc_html_e with correct text domain)
- style.css — no changes
- No pages modified

## Verification

### ES page footer (`/es/como-ayudar/`)
```html
<nav class="footer-legal" aria-label="Legal">
    <a href="https://johnv80.sg-host.com/es/politica-de-privacidad/">Política de Privacidad</a>
    <span aria-hidden="true">|</span>
    <a href="https://johnv80.sg-host.com/es/terminos-de-servicio/">Términos de Servicio</a>
    <span aria-hidden="true">|</span>
    <a href="https://johnv80.sg-host.com/es/accesibilidad/">Accesibilidad</a>
</nav>
```
Labels render in Spanish [VERIFIED]. URLs point to ES pages [VERIFIED].

### EN page footer (`/adopt/`)
```html
<nav class="footer-legal" aria-label="Legal">
    <a href="https://johnv80.sg-host.com/privacy-policy/">Privacy Policy</a>
    <span aria-hidden="true">|</span>
    <a href="https://johnv80.sg-host.com/terms-of-service/">Terms of Service</a>
    <span aria-hidden="true">|</span>
    <a href="https://johnv80.sg-host.com/accessibility/">Accessibility</a>
</nav>
```
Labels render in English [VERIFIED]. No regression [VERIFIED].

## Summary
No WP Admin steps needed — translations are live immediately via the compiled .mo file. No footer.php changes were required since the labels were already using `esc_html_e()` with the `four-legs-good` text domain.
