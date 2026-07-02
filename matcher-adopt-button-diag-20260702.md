# Matcher Adopt Button — Diagnosis

## 1. WHICH APP + FILE

The large animal detail card with the "Please adopt me at (845) 414-9700" CTA exists in **THREE** apps, but only **TWO are live-served**:

### Live apps (must both be changed):

| App | Served at | Files | CTA location |
|-----|-----------|-------|--------------|
| **matcher-preview** | `matcher.4lgshelterapp.duckdns.org` | `matcher-preview/index.html` + `matcher-preview/app.js` + `matcher-preview/styles.css` | HTML: `<div class="modal-cta"><p class="adopt-cta">🐾 Please adopt me at <strong>(845) 414-9700</strong></p></div>` inside the modal body, after the About section. JS: `ctaP.innerHTML = \`${i18n('modal.adopt_cta')} <strong>(845) 414-9700</strong>\`` |
| **custom-search** | `custom-search.4lgshelterapp.duckdns.org` | `custom-search/index.html` + `custom-search/app.js` + `custom-search/styles.css` | HTML: `<div class="popup-cta"><p><span class="popup-adopt-prefix">🐾 Please adopt me at </span><strong class="popup-phone">(845) 414-9700</strong></p></div>` inside the popup body, after the About section. JS: `document.querySelector('.popup-adopt-prefix').textContent = i18n('popup.adopt_cta_prefix')` |

[VERIFIED via Express routes: `app.use('/matcher', express.static('matcher-preview'))` and `express.static('custom-search')` in server.ts, and Caddy config mapping `matcher.4lgshelterapp.duckdns.org` → `/matcher` and `custom-search.4lgshelterapp.duckdns.org` → `/custom-search`.]

### Not live but present:

| App | Status | Notes |
|-----|--------|-------|
| **matcher-web** | NOT directly served at a domain. Its `index.html` is the SPA fallback for `/matcher/*` sub-paths, but the static assets (app.js, styles.css) come from matcher-preview. | Has the same `modal-cta` / `adopt-cta` structure as matcher-preview. Also contains an "Apply to Adopt" link in the results header (see §3). Changing matcher-web is optional — it's not user-facing unless someone hits a deep-link path. |

[VERIFIED via `app.get('/matcher/*', ... matcher-web/index.html)` but `app.use('/matcher', express.static('matcher-preview'))` serves all static assets from matcher-preview.]

**Bottom line: change matcher-preview AND custom-search. matcher-web is optional (dormant).**

---

## 2. LANGUAGE MECHANISM

### How language is determined

Both apps use `?lang=es` URL parameter, defaulting to `en`:

**matcher-preview:**
```javascript
const urlParams = new URLSearchParams(window.location.search);
// (langParam extracted from urlParams)
currentLang = (langParam === 'es') ? 'es' : 'en';
```
[VERIFIED at app.js — same pattern as matcher-web]

**custom-search:**
```javascript
const urlParams = new URLSearchParams(window.location.search);
const langParam = urlParams.get('lang');
let currentLang = (langParam === 'es') ? 'es' : 'en';
```
[VERIFIED at app.js]

Both apps also have EN/ES toggle buttons that set `currentLang` and call `updateI18n()`.

### Translation dict pattern

**matcher-preview** (same structure as matcher-web):

```javascript
const TRANSLATIONS = {
  en: {
    'modal.adopt_cta': '🐾 Please adopt me at',
    // ...
  },
  es: {
    'modal.adopt_cta': '🐾 Por favor adóptame llamando al',
    // ...
  }
};

function i18n(key) {
  return TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
```

Usage in render: `i18n('modal.adopt_cta')` — returns the string for `currentLang`. [VERIFIED]

**custom-search** (SEPARATE dict, different key names):

```javascript
const TRANSLATIONS = {
  en: {
    'popup.adopt_cta_prefix': '🐾 Please adopt me at ',
    // ...
  },
  es: {
    'popup.adopt_cta_prefix': '🐾 Por favor adóptame llamando al ',
    // ...
  }
};
```

Same `i18n(key)` function pattern. [VERIFIED]

### Adding a new translated string

Add a new key to both `en` and `es` blocks in each app's TRANSLATIONS dict. For matcher-preview, use prefix `modal.` (e.g. `'modal.adopt_button'`). For custom-search, use prefix `popup.` (e.g. `'popup.adopt_button'`). Reference via `i18n('modal.adopt_button')` / `i18n('popup.adopt_button')`.

---

## 3. EXISTING OUTBOUND LINKS

### matcher-web (dormant) — YES, has outbound adopt link

In the results header area (NOT the modal card), matcher-web has:

```html
<div class="adoption-links">
  <span class="adoption-links-label">Ready to adopt?</span>
  <a href="https://johnv80.sg-host.com/adopt/#adoption-application" target="_blank" rel="noopener"
     class="adoption-link adoption-link-primary">Apply to Adopt</a>
  <a href=".../blank-english.pdf" ...>English PDF</a>
  <a href=".../blank-spanish.pdf" ...>Español PDF</a>
</div>
```

This link does **NOT** switch URL by language — it always points to the English adopt page regardless of `currentLang`. The link text is translated (`'results.apply_to_adopt'`: EN "Apply to Adopt" / ES "Solicitar Adopción") but the href stays the same. [VERIFIED]

### matcher-preview — NO outbound adopt links

No links to the website anywhere. No `adoption-links` section (removed in "Stage C" per CSS comment). [VERIFIED via grep — zero matches for `fourlegsgoodnynj`, `sg-host`, or `adoption-link` in matcher-preview HTML/JS.]

### custom-search — NO outbound adopt links

No links to the website anywhere. [VERIFIED via grep — zero matches.]

### Website adopt page availability

Both EN and ES paths return 200:
- EN: `https://johnv80.sg-host.com/adopt/#adoption-application` [VERIFIED via curl → 200]
- ES: `https://johnv80.sg-host.com/es/adopt/#adoption-application` [VERIFIED via curl → 200]

**Pattern for the new button:** Use `currentLang === 'es'` to switch between `/adopt/` and `/es/adopt/`. This pattern doesn't exist yet in either live app — it needs to be introduced. The anchor fragment `#adoption-application` should be appended to both.

---

## 4. BUTTON STYLING + LAYOUT

### matcher-preview modal CTA area

```css
.modal-cta {
  margin-top: 20px;
  padding: 18px;
  background: var(--glow);
  border-radius: 12px;
  text-align: center;         /* centered content */
  border: 1px solid var(--border);
}

.adopt-cta {
  font-size: 1.05rem;
  color: var(--text);
  margin: 0;
}

.adopt-cta strong {
  color: var(--primary-dark);
  font-size: 1.15rem;
}
```

The `modal-cta` div is `text-align: center` — the phone text is a single centered `<p>`. There's room to add a button below or beside it. A stacked layout (phone line on top, button below with small gap) fits the centered design cleanly. Side-by-side is possible but the div is narrow on mobile.

Existing button classes in the same stylesheet:

```css
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  /* ... */
}
```

The `adoption-link-primary` class from matcher-web (dormant) provides a good model for a styled link-button:

```css
.adoption-link-primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
```

### custom-search popup CTA area

```css
.popup-cta {
  font-size: 16px;
  color: #2C2925;
  line-height: 1.5;
}
.popup-phone {
  color: #C9613F;
  font-weight: 600;
}
```

No `text-align: center` — the popup CTA is left-aligned. The popup is narrower than the matcher modal. A button below the phone line (stacked) works; beside it would crowd the popup on mobile.

### Recommendation

For both apps: add the button as a new element BELOW the phone `<p>`, inside the existing `modal-cta` / `popup-cta` div. Style it as an `<a>` with a small pill/rounded-rect appearance matching the app's color scheme. Set `href` dynamically based on `currentLang` in the `updateI18n()` function.
