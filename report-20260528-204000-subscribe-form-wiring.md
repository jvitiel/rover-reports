# Subscribe Form Wiring — Homepage to POST /api/subscribe

**Date:** 2026-05-28 16:40 ET  
**Type:** Implementation (WP post content + SiteGround theme files)

---

## Summary

Wired the "Stay connected" / "Mantente conectado" subscribe form on the homepage to POST to the live Dashboard endpoint. Added honeypot, client-side validation, loading state, error display, and a thank-you modal on success. Both EN and ES fully translated.

---

## Files Modified

### Page content (WP post_content via wp eval-file)
- **Page 14** (EN homepage): Added form ID, honeypot, email input ID, button ID, error div
- **Page 335** (ES homepage): Same changes, preserving Spanish placeholder text

### Theme files (SiteGround SFTP)

| File | Pre-edit | Post-edit | Changes |
|------|----------|-----------|---------|
| js/scripts.js | 255 lines | 394 lines | +139 lines: subscribe handler IIFE |
| footer.php | 167 lines | 180 lines | +13 lines: subscribe thank-you modal |
| functions.php | 1515 lines | 1523 lines | +8 lines: flg_subscribe_i18n localize call |
| es_ES.po | 449 lines | 473 lines | +24 lines: 6 new translation entries |
| es_ES.mo | 7,023 bytes | 7,558 bytes | Recompiled |

---

## Form Markup (before → after)

### Before (EN, page 14):
```html
<form class="newsletter-form" style="display:flex;gap:0.75rem;margin-top:1.5rem;flex-wrap:wrap;justify-content:center;">
    <input type="email" name="email" placeholder="Your email address" required style="...">
    <button type="submit" style="...">Subscribe</button>
</form>
```

### After (EN, page 14):
```html
<form id="subscribe-form" class="newsletter-form" style="display:flex;gap:0.75rem;margin-top:1.5rem;flex-wrap:wrap;justify-content:center;" onsubmit="return false;">
    <input type="text" name="website_url" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true" value="">
    <input type="email" id="subscribe-email" name="subscribe-email" placeholder="Your email address" required style="...">
    <button type="submit" id="subscribe-submit" style="...">Subscribe</button>
    <div id="subscribe-error" role="alert" aria-live="polite" style="width:100%;text-align:center;color:#ff6b6b;font-size:0.9rem;margin-top:0.25rem;" hidden></div>
</form>
```

ES page 335: identical structure with Spanish placeholder and button text.

---

## JavaScript Handler

**Location:** `js/scripts.js:232–370` (IIFE block)  
**Endpoint constant:** `js/scripts.js:235` — `var SUBSCRIBE_ENDPOINT = 'https://dashboard.4lgshelterapp.duckdns.org/api/subscribe';`

### Flow:
1. Read email, trim, validate with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
2. If honeypot (`website_url`) non-empty → silent no-op (clear input, no POST, no modal, no error)
3. Detect lang from `document.documentElement.lang`, normalize to 2-letter code, validate en/es, default en with console.warn
4. Disable button, show "Sending..." / "Enviando..."
5. POST `{ email, lang, website_url: "" }` to endpoint
6. On `{ success: true }` → clear input, open thank-you modal
7. On error → display server's error string verbatim in `#subscribe-error`, re-enable button, preserve email input
8. On network failure → display localized fallback, re-enable button

### i18n (functions.php:142–148)
```php
wp_localize_script('flg-scripts', 'flg_subscribe_i18n', array(
    'email_invalid'  => __('Please enter a valid email address', 'four-legs-good'),
    'sending'        => __('Sending...', 'four-legs-good'),
    'generic_error'  => __('Something went wrong. Please try again.', 'four-legs-good'),
    'network_error'  => __('Something went wrong. Please try again.', 'four-legs-good'),
));
```

---

## Thank-You Modal

**Location:** `footer.php:145–157`, ID `#subscribe-thanks-modal`  
Reuses contact modal CSS classes (`contact-modal-overlay`, `contact-modal`, `contact-modal-close`, `contact-modal-inner`, `contact-modal-title`, `contact-form-success-icon`, `btn-primary`).  
One inline style addition: `max-width:440px;text-align:center` on the modal container (narrower than contact modal since it's just a message).  
No new CSS added to style.css.

### Content:
- EN: "Thank you!" / "You're on the list. We'll be in touch with adoption updates, event announcements, and heartwarming stories."
- ES: "¡Gracias!" / "Estás en la lista. Te enviaremos actualizaciones de adopciones, anuncios de eventos e historias conmovedoras."

Dismiss via: ×button, OK button, Escape key, overlay click.

---

## Translation Entries Added to es_ES.po

```
msgid "Thank you!" → msgstr "¡Gracias!"
msgid "You're on the list. We'll be in touch..." → msgstr "Estás en la lista. Te enviaremos..."
msgid "Please enter a valid email address" → msgstr "Por favor ingresa un correo electrónico válido"
msgid "Sending..." → msgstr "Enviando..."
msgid "Something went wrong. Please try again." → msgstr "Algo salió mal. Por favor intenta de nuevo."
msgid "OK" → msgstr "OK"
```

---

## Verification [VERIFIED]

### Markup presence (curl)
| Element | EN homepage | ES homepage |
|---------|-------------|-------------|
| `id="subscribe-form"` | ✅ | ✅ |
| `id="subscribe-email"` | ✅ | ✅ |
| `id="subscribe-submit"` | ✅ | ✅ |
| `name="website_url"` (honeypot) | ✅ | ✅ |
| `id="subscribe-thanks-modal"` | ✅ | ✅ |
| `id="subscribe-error"` | ✅ | ✅ |

### i18n injection (curl grep)
- EN: `flg_subscribe_i18n = {"email_invalid":"Please enter a valid email address","sending":"Sending...","generic_error":"Something went wrong. Please try again.",...}` [VERIFIED]
- ES: `flg_subscribe_i18n = {"email_invalid":"Por favor ingresa un correo electrónico válido","sending":"Enviando...","generic_error":"Algo salió mal. Por favor intenta de nuevo.",...}` [VERIFIED]

### Modal text (curl grep)
- EN: "on the list. We'll be in touch with adoption updates, event announcements, and heartwarming stories." [VERIFIED]
- ES: "en la lista. Te enviaremos actualizaciones de adopciones, anuncios de eventos e historias conmovedoras." [VERIFIED]

### Honeypot field name
`name="website_url"` — exact match, confirmed in curl output [VERIFIED]

### No collateral damage
- Contact form `id="contact-form"` present and unchanged [VERIFIED]
- Contact modal `id="contact-modal-overlay"` present and unchanged [VERIFIED]
- No other forms, pages, or theme sections modified [VERIFIED]

### End-to-end test
Deferred to John (browser DevTools observation): submit a test email, verify Network tab shows POST to endpoint, confirm modal opens on success, confirm honeypot silent no-op behavior.

---

## Future Reference

- **SUBSCRIBE_ENDPOINT:** `js/scripts.js:235` — update at W4 domain cutover (Phase 5 list)
- **Honeypot field:** `name="website_url"` — must stay exactly this name (matches server expectation)
- **Rate limit:** 3/hr/IP server-side — no client-side throttle
