# Legal Entity Name Update: "Four Legs Good, Inc." → "Four Legs Good NY NJ Inc."

**Date:** 2026-05-28 16:02 ET  
**Type:** Implementation (WP post content + SiteGround theme files)

---

## Page Content Updates

Replaced "Four Legs Good, Inc." → "Four Legs Good NY NJ Inc." in post_content for 6 policy pages:

| Page ID | Title | Old count | New count | Remaining old |
|---------|-------|-----------|-----------|---------------|
| 383 | Privacy Policy (EN) | 3 | 3 | 0 |
| 384 | Terms of Service (EN) | 6 | 6 | 0 |
| 385 | Accessibility Statement (EN) | 2 | 2 | 0 |
| 389 | Política de Privacidad (ES) | 3 | 3 | 0 |
| 390 | Términos de Servicio (ES) | 6 | 6 | 0 |
| 391 | Declaración de Accesibilidad (ES) | 2 | 2 | 0 |

No near-match inconsistencies found (no "Four Legs Good Inc." without comma, no "Four Legs Good, Inc" without period). [VERIFIED — pre-edit grep]

Method: `wp eval` with `str_replace()` on `post_content`, then `wp_update_post()`. Each replacement verified zero remaining old occurrences and correct new count before moving to the next page.

---

## Footer Copyright Update

**Location:** `footer.php`, line 68

**Before:**
```php
<div>&copy; <?php echo date('Y'); ?> <?php esc_html_e('Four Legs Good, Inc. All rights reserved.', 'four-legs-good'); ?></div>
```

**After:**
```php
<div>&copy; <?php echo date('Y'); ?> <?php esc_html_e('Four Legs Good NY NJ Inc. All rights reserved.', 'four-legs-good'); ?></div>
```

### es_ES.po (lines 140–141)

**Before:**
```
msgid "Four Legs Good, Inc. All rights reserved."
msgstr "Four Legs Good, Inc. Todos los derechos reservados."
```

**After:**
```
msgid "Four Legs Good NY NJ Inc. All rights reserved."
msgstr "Four Legs Good NY NJ Inc. Todos los derechos reservados."
```

es_ES.mo recompiled via `wp i18n make-mo`.

---

## File Sizes

| File | Pre-edit | Post-edit |
|------|----------|-----------|
| footer.php | 13,077 bytes (167 lines) | 13,082 bytes (167 lines) |
| es_ES.po | 9,591 bytes (449 lines) | 9,601 bytes (449 lines) |
| es_ES.mo | 7,013 bytes | 7,023 bytes |

---

## Verification [VERIFIED]

### Footer copyright (curl)

**EN** (https://johnv80.sg-host.com/):
```html
<div>&copy; 2026 Four Legs Good NY NJ Inc. All rights reserved.</div>
```

**ES** (https://johnv80.sg-host.com/es/como-ayudar/):
```html
<div>&copy; 2026 Four Legs Good NY NJ Inc. Todos los derechos reservados.</div>
```

### Policy page content (curl)

**EN** (https://johnv80.sg-host.com/privacy-policy/):
- 0 occurrences of "Four Legs Good, Inc." in article body [VERIFIED]
- "Four Legs Good NY NJ Inc." present in meta description and page body [VERIFIED]

**ES** (https://johnv80.sg-host.com/es/politica-de-privacidad/):
- 0 occurrences of "Four Legs Good, Inc." in article body [VERIFIED]
- "Four Legs Good NY NJ Inc." present in meta description and page body [VERIFIED]

### No collateral damage
- Page 8 (How to Help) post_modified: 2026-05-27 19:44:29 — unchanged today [VERIFIED]
- No other footer sections modified [VERIFIED]
- No other theme files modified [VERIFIED]
- Instances of "Four Legs Good" (brand name, without Inc.) untouched throughout [VERIFIED]

### Note: Rank Math schema residue
`og:site_name` and JSON-LD `"name"` still show "Four Legs Good, Inc." — this comes from the Rank Math organization name setting, not from post content or theme files. Updating that is a separate Rank Math config change (outside scope of this prompt).
