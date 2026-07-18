# Form JS Extraction Inventory — 2026-07-18

Read-only scoping inventory for moving inline `<script>` JavaScript out of WordPress post_content and into enqueued theme files.

---

## 0 — POST CONFIRMATION

```
ID   Title                   Slug                    Status
7    Adopt a Pet             adopt                   publish
339  Adopta una Mascota      adopta-una-mascota      publish
8    How to Help             how-to-help             publish
345  Cómo Ayudar             como-ayudar             publish
```
[VERIFIED — wp post list output]

### Polylang Translation Groupings

```
Adoption pair:  en => 7, es => 339
Volunteer pair: en => 8, es => 345
```
[VERIFIED — pll_get_post_translations() output]

### Post Sizes and Backslash Counts

| Post | Length (bytes) | Backslashes |
|------|---------------|-------------|
| 7    | 79,568        | 0           |
| 339  | 82,912        | 0           |
| 8    | 49,949        | 4           |
| 345  | 51,013        | 4           |

[VERIFIED — strlen(get_post_field) and awk gsub output]

Posts 7 and 339 have zero backslashes by design (2026-07-18 repair replaced regex with charCode-based validator). Posts 8 and 345 have 4 backslashes each — see Section 2b.

---

## 1 — JS BLOCK INVENTORY

### Post 7 (EN adoption form)

- **Script blocks:** 1
- **Block 0:** 15,282 bytes
- **JS as % of post:** 19.2% (15,282 / 79,568)
- **Functions:** `initAnimalTypeCards`, `updateAnimalSections`, `initConditionalLogic`, `addPetRow`, `removePetRow`, `collectPreviousPets`, `validateForm`, `showFieldError`, `isValidEmail`, `initFormSubmission`
- **Description:** Full adoption application — animal type card selector, conditional section visibility, dynamic add/remove pet rows, field validation (charCode-based email validator), scroll-to-topmost-error, form submission via fetch

[VERIFIED — preg_match_all + function name extraction]

### Post 339 (ES adoption form)

- **Script blocks:** 1
- **Block 0:** 15,325 bytes
- **JS as % of post:** 18.5% (15,325 / 82,912)
- **Functions:** Same as post 7
- **Description:** Identical code to post 7 with Spanish string literals

[VERIFIED]

### Post 8 (EN volunteer form)

- **Script blocks:** 1
- **Block 0:** 9,052 bytes
- **JS as % of post:** 18.1% (9,052 / 49,949)
- **Functions:** `showFieldError`, `clearFieldError`, `isValidEmail`, `getAgeAnswer`, `updateAgeConditional`, `isFormValid`, `updateSubmitState`, `getInputValue`, `getCheckedValue`, `getCheckboxBoolean`, `buildPayload`, `showSubmitError`, `showSuccess`
- **Description:** Volunteer application — age conditional (under-18 shows age input), real-time field validation, disabled submit button that enables when required fields valid, fetch POST to VPS

[VERIFIED]

### Post 345 (ES volunteer form)

- **Script blocks:** 1
- **Block 0:** 9,144 bytes
- **JS as % of post:** 17.9% (9,144 / 51,013)
- **Functions:** Same as post 8
- **Description:** Identical code to post 8 with Spanish string literals + `language: 'es'` in payload

[VERIFIED]

### 1d — PHP-Injected / Templated Values

**Adoption (posts 7/339):** None. No `ajax_url`, no nonces, no `wp_` references. The endpoint URL `https://dogwalker.4lgshelterapp.duckdns.org/api/adoption-application` is hardcoded. The language code (`data.language = 'en'` / `'es'`) is hardcoded per post. [VERIFIED]

**Volunteer (posts 8/345):** None. No `ajax_url`, no nonces, no `wp_` references. The endpoint URL `https://dashboard.4lgshelterapp.duckdns.org/api/volunteers` is hardcoded. The ES post adds `language: 'es'` to the payload and `?lang=es` to the fetch URL. [VERIFIED]

**Conclusion:** No values are currently injected by PHP. All per-language config is hardcoded string literals. Moving to a theme file would require `wp_localize_script` to inject the language and strings, but there are no existing PHP-to-JS injection points to preserve.

---

## 2 — CORRUPTION-EXPOSURE AUDIT

### 2a — wptexturize / wp_html_split (Operator Corruption)

All four posts tested: raw post_content run through `apply_filters('the_content', $raw)`, rendered JS scanned for `&#038;`.

| Post | `&#038;` in rendered JS | Dangerous `<`-before-`&` adjacency in raw JS |
|------|------------------------|----------------------------------------------|
| 7    | 0                      | 0                                             |
| 339  | 0                      | 0                                             |
| 8    | 0                      | 0                                             |
| 345  | 0                      | 0                                             |

**No post is currently broken by wptexturize.** [VERIFIED — apply_filters output]

**No post currently contains the dangerous `<` comparison before `&` adjacency.** [VERIFIED]

Posts 7 and 339 were specifically hardened against this in the V2 scroll fix (all `<` comparisons flipped to `>`). Posts 8 and 345 happen to avoid it by code structure — their `<` comparisons in `for` loops do not span across any `&&` before the next `>`.

### 2b — Backslash Content

**Posts 7 and 339:** Zero backslashes. The email validator uses `charCodeAt` instead of regex. Not exposed to the wp_unslash mechanism. [VERIFIED]

**Posts 8 and 345:** 4 backslashes each. All in the `isValidEmail` function:

```javascript
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
```

This is the **exact same regex pattern** that was corrupted in the adoption form on 2026-07-06. The 4 backslashes are the `\s` sequences (4 occurrences of `\s` = 4 backslashes). [VERIFIED — line-by-line backslash scan output]

**This regex will be silently destroyed by any `wp_update_post()` without `wp_slash()`**, exactly as happened to posts 7/339. The volunteer form's `isValidEmail` would change from "not whitespace, not @" to "not the letter s, not @", rejecting every email containing "s" before the "@".

### 2c — Risk Summary Per Post

| Post | Status | Risk Level | Reason |
|------|--------|-----------|--------|
| 7    | Intact | **Low** | Zero backslashes, no dangerous `<`-before-`&` adjacency. Both corruption mechanisms are no-ops. |
| 339  | Intact | **Low** | Same as post 7. |
| 8    | Intact | **LATENT HIGH** | 4 backslashes in email regex. Currently functional, but one unslashed save destroys the regex silently. No guard watches this post. |
| 345  | Intact | **LATENT HIGH** | Same as post 8. |

**OBSERVATION:** Posts 8 and 345 are currently unprotected. The mu-plugin guard (`4lg-adopt-form-guard.php`) watches posts 7, 339, and 494 only. The volunteer form posts have the same vulnerability that took down the adoption form for 11 days.

---

## 3 — VOLUNTEER FORM DEEP-DIVE

### 3a — Full Validation / Submit-Enable Logic

```javascript
function isFormValid() {
  var nameValue = '';
  if (fullNameInput) { nameValue = fullNameInput.value.trim(); }
  if (!nameValue) { return false; }

  var ageAnswer = getAgeAnswer();
  if (ageAnswer === null) { return false; }

  if (ageAnswer === 'no') {
    var ageValue = '';
    if (ageInput) { ageValue = ageInput.value.trim(); }
    if (!ageValue) { return false; }
    var ageNum = parseInt(ageValue, 10);
    if (isNaN(ageNum)) { return false; }
    if (ageNum < 1) { return false; }
    if (ageNum > 17) { return false; }
  }

  if (emailInput) {
    var emailValue = emailInput.value.trim();
    if (emailValue) {
      if (!isValidEmail(emailValue)) { return false; }
    }
  }

  return true;
}

function updateSubmitState() {
  if (isFormValid()) {
    submitBtn.disabled = false;
  } else {
    submitBtn.disabled = true;
  }
}
```

[VERIFIED — verbatim from post 8 post_content]

### 3b — Required Fields

The two required fields for enabling the submit button are:
1. **`vf-full-name`** (Full Name) — must be non-empty
2. **`is_18_or_older`** (Age radio) — must have a selection ("Yes" or "No"). If "No", also requires `vf-age` (1-17).

Email is validated IF provided, but is not required for button enable. [VERIFIED — code logic above]

### 3c — Location

The enable/disable logic is **inline JS in post_content**. It is NOT in a theme file. It has the same latent exposure as the adoption form (the backslash-containing `isValidEmail` regex). [VERIFIED]

### 3d — Scroll-to-Error Pattern

The volunteer form does **NOT** have a scroll-to-error pattern. It uses only the disabled-button pattern. On submit with invalid form, `updateSubmitState()` is called (re-disables button) and `return` — no scroll, no error highlighting on submit. Field-level error messages appear only on individual input `blur` events. [VERIFIED — submit handler code]

On successful submission, `showSuccess()` uses `scrollIntoView({ behavior: 'smooth', block: 'center' })` to scroll to the success message. [VERIFIED]

### 3e — POST Endpoint

```
https://dashboard.4lgshelterapp.duckdns.org/api/volunteers
```
ES form appends `?lang=es`. [VERIFIED]

### 3f — Failure Mode if JS Corrupted

The submit button is:
```html
<button type="submit" class="btn-submit" disabled>
  <span class="text">Submit application</span><span class="spinner"></span>
</button>
```
[VERIFIED — extracted from post_content]

The form tag:
```html
<form id="volunteer-form" novalidate>
```
[VERIFIED]

**If the JS is corrupted or fails to execute:**
- The button starts `disabled` in the HTML. With no JS, it stays disabled forever.
- There is no `action` attribute on the form, so even removing `disabled` manually wouldn't submit to the VPS.
- The `novalidate` attribute is present but irrelevant — without JS, neither validation nor submission can occur.

**CONCLUSION:** A JS corruption that kills the script (like the SyntaxError that hit the adoption form) would leave the volunteer form with a permanently disabled submit button. **This is a silent complete outage** — no error message, no fallback, no way for a volunteer to submit. The form would appear functional (fields fillable) but the button would never enable. Unlike the adoption form email bug (which only blocked emails containing "s"), this would block 100% of submissions.

---

## 4 — LANGUAGE-SPLIT ANALYSIS

### 4a — Code Identity Between EN and ES

**Adoption pair (7 vs 339):** Code (control flow, function bodies) is **identical**. Only string literals differ. [VERIFIED — diff output]

**Volunteer pair (8 vs 345):** Code (control flow, function bodies) is **identical**. Only string literals differ. The ES version also adds `language: 'es'` to the payload object. [VERIFIED — diff output]

### 4b — Differing String Literals

#### Adoption Pair (7 vs 339) — 17 differing strings:

| Location | EN (Post 7) | ES (Post 339) |
|----------|-------------|----------------|
| REQUIRED_TEXT_FIELDS label | `'Full Name'` | `'Nombre Completo'` |
| REQUIRED_TEXT_FIELDS label | `'Email'` | `'Correo Electrónico'` |
| REQUIRED_TEXT_FIELDS label | `'Cell Phone'` | `'Teléfono Celular'` |
| REQUIRED_TEXT_FIELDS label | `'Street Address'` | `'Dirección'` |
| REQUIRED_TEXT_FIELDS label | `'City'` | `'Ciudad'` |
| REQUIRED_TEXT_FIELDS label | `'State'` | `'Estado'` |
| REQUIRED_TEXT_FIELDS label | `'ZIP Code'` | `'Código Postal'` |
| REQUIRED_TEXT_FIELDS label | `'Digital Signature'` | `'Firma Digital'` |
| Select option text | `'Select...'` | `'Selecciona...'` |
| Select option text | `'Current'` | `'Actual'` |
| Select option text | `'Previous'` | `'Anterior'` |
| data.language | `'en'` | `'es'` |
| Fetch URL | (no query param) | `?lang=es` |
| Fallback animal name | `'a pet'` | `'una mascota'` |
| Success message (2 lines) | `'Thank you for your application!...'` | `'¡Gracias por tu solicitud!...'` |
| Error message (throw) | `'Submission failed'` | `'Envío fallido'` |
| Error message (catch) | `'There was an error...'` | `'Hubo un error...'` |

[VERIFIED — diff output]

#### Volunteer Pair (8 vs 345) — 9 differing strings:

| Location | EN (Post 8) | ES (Post 345) |
|----------|-------------|----------------|
| Field error | `'Please enter your full name'` | `'Por favor ingresa tu nombre completo'` |
| Field error | `'Please enter a valid email address'` | `'Por favor ingresa un correo electrónico válido'` |
| Field error | `'Please enter an age between 1 and 17'` | `'Por favor ingresa una edad entre 1 y 17'` |
| Payload property | (absent) | `language: 'es'` |
| Fetch URL | (no query param) | `?lang=es` |
| Submit error (429) | `'Too many submissions...'` | `'Demasiados envíos...'` |
| Submit error (400) | `'Some required information...'` | `'Falta información requerida...'` |
| Submit error (generic) | `'Something went wrong...'` | `'Algo salió mal...'` |
| Submit error (network) | `'We could not reach...'` | `'No pudimos conectar...'` |

[VERIFIED — diff output]

### 4c — Language Value References

**Adoption pair:**
- Post 7 line 321: `data.language = 'en';`
- Post 339 line 321: `data.language = 'es';`
- Post 339 fetch URL: `?lang=es` query param

[VERIFIED]

**Volunteer pair:**
- Post 8: No language reference in code (EN is implicit — no `language` property in payload)
- Post 345 line 193: `language: 'es'` in payload object
- Post 345 fetch URL: `?lang=es` query param

[VERIFIED]

### 4d — Theme Already Uses wp_localize_script

**Yes.** The theme already uses `wp_localize_script` for the contact form modal:

```php
wp_localize_script('flg-scripts', 'flg_contact_i18n', array(
    'name_required'     => __('Please enter your name.', 'four-legs-good'),
    'email_invalid'     => __('Please enter a valid email address.', 'four-legs-good'),
    'category_required' => __('Please select a subject category.', 'four-legs-good'),
    // ... 8 more string keys
));
```

It also uses `wp_add_inline_script` for the Constant Contact widget variable. [VERIFIED — functions.php lines 127-144]

**OBSERVATION:** The pattern for injecting per-page config into external JS already exists in this theme. The form refactor could follow the same approach: `wp_localize_script('flg-adopt-form', 'flg_adopt_i18n', $strings)` conditionally on `is_page(7) || is_page(339)`.

---

## 5 — THEME ENQUEUE SURFACE

### 5a — Script Enqueues

```php
// Theme JavaScript (all pages)
wp_enqueue_script('flg-scripts', get_template_directory_uri() . '/js/scripts.js', 
    array(), filemtime(get_stylesheet_directory() . '/js/scripts.js'), true);

// Constant Contact (homepage only)
wp_enqueue_script('flg-ctct-widget', '//static.ctctcdn.com/js/signup-form-widget/current/signup-form-widget.min.js', 
    array(), null, array('strategy' => 'defer', 'in_footer' => false));
```
[VERIFIED — functions.php lines 124, 143]

### 5b — Conditional Page Loading

The theme already conditionally enqueues the Constant Contact widget on homepage only:
```php
if (is_front_page() || is_page(335)) {
    wp_enqueue_script('flg-ctct-widget', ...);
}
```
[VERIFIED — functions.php line 142]

This confirms `is_page()` conditional loading is already in use and would work for form-page-only scripts.

### 5c — Theme JS Directory

```
wp-content/themes/4lg-theme/js/
└── scripts.js  (10,412 bytes)
```

One file. Contains: header scroll effect, intersection observer animations, mobile nav toggle, contact form modal, and related UI behaviors. [VERIFIED — find + head output]

### 5d — Version Control

**No `.git` directory in the theme.** Theme files are not under version control. Changes require `.bak` discipline (manual backup copies before editing). [VERIFIED — ls -la output: "No .git in theme directory"]

### 5e — Cache Busting

Uses `filemtime()` as the version parameter:
```php
wp_enqueue_script('flg-scripts', ..., filemtime(get_stylesheet_directory() . '/js/scripts.js'), true);
```

This means the query string changes whenever the file is modified on disk. Browser and SiteGround caches will see a new URL and fetch the updated file. [VERIFIED — functions.php line 124]

**OBSERVATION:** This cache-busting approach is robust. A new `adopt-form.js` file using the same `filemtime()` pattern would auto-bust on deploy with no manual cache purge needed.

---

## 6 — DEPENDENCIES ON CURRENT STRUCTURE

### 6a — Guard mu-plugin

The guard (`4lg-adopt-form-guard.php`) performs these checks on post_content:

1. **Backslash count comparison** (incoming vs current) — keys on `chr(92)` count in post_content
2. **Backslash presence** — keys on `substr_count($incoming, $bs) > 0`
3. **`adoptionForm` presence** — `strpos($incoming, 'adoptionForm')`
4. **`charCodeAt` presence** — `strpos($incoming, 'charCodeAt')`
5. **`novalidate` presence** — `strpos($incoming, 'novalidate')`

[VERIFIED — full guard source read]

**If adoption JS moves out of post_content:**
- Checks 1-2 (backslash) become vacuous (post_content would have 0 backslashes, same as now — no change)
- Check 3 (`adoptionForm`) would still pass — the `<form id="adoptionForm">` tag remains in post_content (it's HTML, not JS)
- Check 4 (`charCodeAt`) **WOULD BREAK** — it would report "EMAIL VALIDATOR GONE" on every save because `charCodeAt` is inside the `<script>` block that would be removed from post_content
- Check 5 (`novalidate`) would still pass — the `novalidate` attribute is on the `<form>` tag in post_content

**CONCLUSION:** Guard check #4 needs updating if JS is extracted. The string `charCodeAt` would no longer be in post_content. The guard would need to either (a) check the theme JS file instead, or (b) change its check to verify the external script is enqueued, or (c) be updated to reflect the new architecture.

### 6b — Other Plugin Dependencies

Grep for `adoptionForm`, `volunteer-form`, `charCodeAt` across all plugins returned only:
- `4lg-adopt-form-guard.php` (expected)
- SG Security, SG AI Studio, WordPress Starter — all false positives (generic `charCodeAt` usage in their own minified JS bundles, unrelated to form content)

**No plugin or theme code reads or depends on the inline scripts being in post_content.** [VERIFIED]

### 6c — Content-Security-Policy

```
No CSP header found
```
[VERIFIED — curl -sI on /adopt/ page]

No CSP restrictions. Moving from inline to external scripts will not be blocked by security policy.

---

## SUMMARY ANSWERS

1. **Confirmed post IDs:** adoption [7/339], volunteer [8/345]
2. **Currently BROKEN (served &#038; in JS):** none
3. **Latent-risk posts (backslashes or <-before-& present):** posts 8 and 345 (4 backslashes each in isValidEmail regex — same pattern that was corrupted in posts 7/339 on 2026-07-06; guard does NOT watch these posts)
4. **EN/ES code identical except strings:** adoption [yes], volunteer [yes]
5. **Theme already uses wp_localize_script:** yes (contact form i18n strings)
