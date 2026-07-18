# Phase 2 Extraction Diagnosis — Adoption Form Inline JS — 2026-07-18

Read-only investigation: what breaks when the adoption form's inline `<script>` (posts 7/339) moves to an enqueued theme JS file.

---

## 1 — SCOPING

### 1a — Adoption JS Structure (Post 7)

The script block has 375 lines. Structure:

```
L1:  (blank)
L2-14:   const REQUIRED_TEXT_FIELDS = [...]          ← TOP LEVEL (global)
L17-19:  const REQUIRED_CHECKBOXES = [...]           ← TOP LEVEL (global)
L22-26:  const AGREEMENT_CHECKBOXES = [...]          ← TOP LEVEL (global)
L29:     let petRowCount = 1;                        ← TOP LEVEL (global)
L32-45:  document.addEventListener('DOMContentLoaded', function() {
           initConditionalLogic();
           initFormSubmission();
           initAnimalTypeCards();
         });                                         ← SHORT CALLBACK, calls 3 functions
L48:     function initAnimalTypeCards() { ... }      ← TOP LEVEL (global)
L62:     function updateAnimalSections() { ... }     ← TOP LEVEL (global)
L71:     function initConditionalLogic() { ... }     ← TOP LEVEL (global)
L109:    function addPetRow() { ... }                ← TOP LEVEL (global)
L130:    function removePetRow() { ... }             ← TOP LEVEL (global)
L137:    function collectPreviousPets() { ... }      ← TOP LEVEL (global)
L162:    function validateForm() { ... }             ← TOP LEVEL (global)
L250:    function showFieldError() { ... }           ← TOP LEVEL (global)
L257:    function isValidEmail() { ... }             ← TOP LEVEL (global)
L290:    function initFormSubmission() { ... }       ← TOP LEVEL (global)
L375: (blank)
```

**No IIFE. No wrapping closure.** The DOMContentLoaded listener (L32-45) is a 14-line callback that calls three init functions. Every function declaration and every `const`/`let` is at the top level of the script — bare statements directly in the `<script>` block. All names are global (`window.isValidEmail`, `window.addPetRow`, etc.). [VERIFIED — indent=4 on all function declarations, DOMContentLoaded opens at L32, closes at L45]

### 1b — Top-Level Functions (Post 7)

10 functions, all global:

```
initAnimalTypeCards()
updateAnimalSections()
initConditionalLogic()
addPetRow()
removePetRow()
collectPreviousPets()
validateForm()
showFieldError()
isValidEmail()
initFormSubmission()
```

Plus 4 top-level variables:

```
const REQUIRED_TEXT_FIELDS    (array of objects)
const REQUIRED_CHECKBOXES     (array of strings)
const AGREEMENT_CHECKBOXES    (array of strings)
let petRowCount               (number)
```

[VERIFIED]

### 1c — Post 339 (ES)

Identical structure: 375 lines, same function names at same line numbers, same DOMContentLoaded pattern. Differs only in string literals (labels, messages, language code). [VERIFIED — pasted output matches]

### 1d — Volunteer JS Structure (Posts 8/345)

```
L1:  (blank)
L2:  (function(){                                    ← IIFE OPENS
L3:    var form = document.getElementById('volunteer-form');
L4:    if (!form) { return; }
L6-11: var ageConditional = ...                      ← element refs at IIFE top
L13:   function showFieldError() { ... }
L21:   function clearFieldError() { ... }
L29:   function isValidEmail() { ... }
L51:   function getAgeAnswer() { ... }
L59:   function updateAgeConditional() { ... }
L72:   function isFormValid() { ... }
L100:  function updateSubmitState() { ... }
L181:  function getInputValue() { ... }
L187:  function getCheckedValue() { ... }
L196:  function getCheckboxBoolean() { ... }
L202:  function buildPayload() { ... }
L275:  function showSubmitError() { ... }
L288:  function showSuccess() { ... }
L348: })();                                          ← IIFE CLOSES
L349: (blank)
```

**Wrapped in an IIFE.** All 13 functions are inside `(function(){ ... })()`. Nothing is global. [VERIFIED — `(function(){` at L2, `})();` at L348]

### 1e — Scope Summary

| Form | Scope | Why |
|------|-------|-----|
| Adoption (7/339) | **GLOBAL** | Bare function declarations directly in `<script>`, no IIFE, no closure |
| Volunteer (8/345) | **WRAPPED** | IIFE `(function(){ ... })()` around entire script |

[VERIFIED]

**Extraction consequence:** The adoption form's global scope is not accidental — inline `onclick` handlers (section 2) depend on it. An extracted file must preserve global exposure for at least the handler-called functions.

---

## 2 — INLINE EVENT HANDLERS

### 2a — Post 7 (Adoption EN)

```
onclick="removePetRow(this)"
onclick="addPetRow()"
```

Two inline handlers in the form HTML. Both call top-level functions. [VERIFIED — grep output]

### 2b — Function-Handler Mapping

| Inline Handler | Function Called | In Top-Level List? |
|---|---|---|
| `onclick="removePetRow(this)"` | `removePetRow` | Yes (L130) |
| `onclick="addPetRow()"` | `addPetRow` | Yes (L109) |

Both are confirmed top-level global functions. [VERIFIED]

### 2c — All Posts

| Post | Inline Handlers |
|------|----------------|
| 7 (adoption EN) | `onclick="removePetRow(this)"`, `onclick="addPetRow()"` |
| 339 (adoption ES) | `onclick="removePetRow(this)"`, `onclick="addPetRow()"` |
| 8 (volunteer EN) | **none** |
| 345 (volunteer ES) | **none** |

[VERIFIED — grep output for all 4 posts]

### 2d — Functions That MUST Stay Global

**`addPetRow` and `removePetRow`** — called from inline `onclick` handlers in the form HTML. If these are hidden inside a closure or IIFE in the extracted file, the onclick handlers fail with `ReferenceError: addPetRow is not defined` at click time.

No other functions are called from inline handlers. The remaining 8 functions (`initAnimalTypeCards`, `updateAnimalSections`, `initConditionalLogic`, `collectPreviousPets`, `validateForm`, `showFieldError`, `isValidEmail`, `initFormSubmission`) are only called from within the script itself. They COULD be wrapped in a closure if the wrapper exposes `addPetRow` and `removePetRow` globally. [VERIFIED]

---

## 3 — INITIALIZATION TIMING

### 3a — Adoption Script Init

The script initializes via `document.addEventListener('DOMContentLoaded', function() { ... })` at L32-45. It does NOT run setup code at parse time. The DOMContentLoaded callback calls `initConditionalLogic()`, `initFormSubmission()`, and `initAnimalTypeCards()`. [VERIFIED]

No code runs before DOMContentLoaded except:
- `const` and `let` declarations (L5-29) — safe at any time
- Function declarations (L48-374) — hoisted, safe at any time

### 3b — Script Position Relative to Form HTML

```
Post 7:
  <form starts at byte: 31626
  <script starts at byte: 62814
  script is AFTER form
```

[VERIFIED]

The script is inline, after the form HTML in post_content. Currently it relies on being after the form only indirectly — the DOMContentLoaded pattern means it doesn't actually need to be after the form. But element queries inside the init functions (`getElementById('adoptionForm')`, etc.) do require the form to exist when the callback fires.

**If enqueued with `in_footer=true`:** The script tag appears near `</body>`, which is after the post content (including the form HTML). Timeline:
1. Browser encounters form HTML in post content → DOM nodes created
2. Browser reaches script tag near `</body>` → downloads and executes script
3. Function declarations become global immediately on execution
4. Browser finishes parsing → DOMContentLoaded fires → init functions run → `getElementById` finds form elements

This works. The onclick handlers (`addPetRow`, `removePetRow`) are available immediately after step 3, before the user has time to click. [INFERRED — based on WordPress `in_footer=true` behavior and standard browser parsing]

**Risk:** If `defer` or `async` is added to the script tag (WordPress 6.x `loading strategy` feature), function definitions might not be available when the user clicks an inline handler. The theme's current `flg-scripts` enqueue does NOT use a loading strategy. [VERIFIED — functions.php: `wp_enqueue_script('flg-scripts', ..., true)` with no strategy parameter]

### 3c — Top-Level Element References at Parse Time

**None.** All `document.getElementById()` calls are inside function bodies, which only execute when called from the DOMContentLoaded handler. No element queries run at script-parse time. [VERIFIED — scan of lines 1-31 found zero getElementById/querySelector calls]

### 3d — Volunteer Comparison

```
Post 8:
  <form starts at byte: 29935
  <script starts at byte: 39361
  script is AFTER form
```

The volunteer IIFE immediately queries DOM elements at its top level (L3-10):

```javascript
var form = document.getElementById('volunteer-form');
if (!form) { return; }
var ageConditional = document.getElementById('vf-age-conditional');
var ageInput = document.getElementById('vf-age');
var fullNameInput = document.getElementById('vf-full-name');
var emailInput = document.getElementById('vf-email');
```

[VERIFIED]

**Critical difference:** The volunteer script queries elements IMMEDIATELY on execution (not in a DOMContentLoaded callback). If the script runs before the form HTML exists, `getElementById('volunteer-form')` returns null, the `if (!form) { return; }` guard fires, and the ENTIRE IIFE exits — no event listeners attached, no `updateSubmitState` runs, submit button stays permanently disabled. This is a harder extraction constraint than the adoption form.

If extracted with `in_footer=true`, the script would execute after the form HTML, and the element queries would succeed. But there is zero tolerance for `defer` or `async` — the guard clause makes it fail silently and completely. [INFERRED]

---

## 4 — GUARD ANCHOR ANALYSIS

### 4a — Adoption Guard (`4lg-adopt-form-guard.php`)

The guard checks `post_content` for:

| Check | String | Where It Lives | Survives Extraction? |
|-------|--------|---------------|---------------------|
| Backslash count change | `chr(92)` | Content-wide | ✓ (count is 0 in both HTML and JS; remains 0) |
| Backslash count > 0 | `chr(92)` | Content-wide | ✓ (0 stays 0) |
| Form removed | `'adoptionForm'` | HTML (`id="adoptionForm"`) | ✓ Stays in post_content |
| charCodeAt present | `'charCodeAt'` | **JS only** | **✗ LEAVES post_content** |
| novalidate present | `'novalidate'` | HTML (`<form ... novalidate>`) | ✓ Stays in post_content |

[VERIFIED — full guard source pasted, each strpos check listed]

**On extraction:** The `charCodeAt` check would fire: "EMAIL VALIDATOR GONE: the charCode-based isValidEmail is no longer present." This is a false positive — the validator exists, it just moved to a theme file. [VERIFIED]

### 4b — Volunteer Guard (`4lg-volunteer-form-guard.php`)

| Check | String | Where It Lives | Survives Extraction? |
|-------|--------|---------------|---------------------|
| Backslash count drop | `chr(92)` | Content-wide | ✓ (0 stays 0) |
| Backslash count rise | `chr(92)` | Content-wide | ✓ |
| Form removed | `'volunteer-form'` | HTML (`id="volunteer-form"`) | ✓ Stays |
| isValidEmail present | `'function isValidEmail'` | **JS only** | **✗ LEAVES** |
| updateSubmitState present | `'updateSubmitState'` | **JS only** | **✗ LEAVES** |
| wptexturize adjacency | `<script>` block scan | **JS only** | **✗ No script block to scan** |

[VERIFIED — full guard source pasted]

**On extraction:** Two false-positive alerts:
1. "EMAIL VALIDATOR GONE: function isValidEmail is no longer present"
2. "SUBMIT-ENABLE LOGIC GONE: updateSubmitState is no longer present"

The wptexturize scan silently becomes a no-op (no `<script>` block to match). This is not a false positive but a loss of protection scope. However, the protection is no longer needed — extracted JS is never processed by wptexturize. [VERIFIED]

### 4c — False Positives on Extraction Save

| Guard | Check | Would Fire? | Alert Message |
|-------|-------|------------|---------------|
| Adoption | `charCodeAt` | **YES — false positive** | "EMAIL VALIDATOR GONE" |
| Volunteer | `isValidEmail` | **YES — false positive** | "EMAIL VALIDATOR GONE" |
| Volunteer | `updateSubmitState` | **YES — false positive** | "SUBMIT-ENABLE LOGIC GONE" |

Total: **3 false-positive alerts** (1 email from adoption guard, 1 email from volunteer guard with 2 problems listed).

The guards MUST be updated BEFORE or CONCURRENTLY with the extraction save. If updated after, the extraction save triggers the alerts. [VERIFIED]

### 4d — Can Guards Repoint to Theme Files?

**Yes.** A mu-plugin has full filesystem access. It can read a theme file:

```php
$theme_js = file_get_contents(get_template_directory() . '/js/adoption-form.js');
if (strpos($theme_js, 'charCodeAt') === false) { ... }
```

This is standard PHP, no special permissions needed. `get_template_directory()` returns the absolute path to the active theme. [INFERRED — standard WordPress API + PHP filesystem access]

**However, the guard design should change:**

After extraction, the threats change:
- **wp_unslash corruption:** No longer applies. Theme files are never processed by `wp_unslash()`. The backslash concern that created these guards is entirely eliminated by extraction.
- **wptexturize corruption:** No longer applies. Theme files are never processed by `the_content` filters.
- **Accidental deletion:** Still applies. Someone could delete or overwrite the theme JS file. A guard checking the file exists and contains key invariants has value.
- **Form HTML corruption:** Still applies via post_content saves. The `adoptionForm`, `novalidate`, `volunteer-form` checks in post_content remain valid.

The guards should be redesigned for post-extraction reality, not merely repointed. The backslash and wptexturize checks become obsolete. The invariant checks (charCodeAt, isValidEmail, updateSubmitState) should move to file-existence checks on the theme JS. [INFERRED]

---

## 5 — ENQUEUE MECHANICS

### 5a — Existing Pattern (functions.php)

The theme already enqueues and localizes a script for the contact form:

```php
// Theme JavaScript
wp_enqueue_script('flg-scripts', get_template_directory_uri() . '/js/scripts.js', array(), filemtime(get_stylesheet_directory() . '/js/scripts.js'), true);

// Inject i18n strings for contact-modal JS (scripts.js)
wp_localize_script('flg-scripts', 'flg_contact_i18n', array(
    'name_required'     => __('Please enter your name.', 'four-legs-good'),
    'name_too_long'     => __('Name must be 100 characters or fewer.', 'four-legs-good'),
    'email_invalid'     => __('Please enter a valid email address.', 'four-legs-good'),
    'category_required' => __('Please select a subject category.', 'four-legs-good'),
    'subject_required'  => __('Please enter a subject.', 'four-legs-good'),
    'subject_too_long'  => __('Subject must be 150 characters or fewer.', 'four-legs-good'),
    'message_required'  => __('Please enter a message.', 'four-legs-good'),
    'message_too_long'  => __('Message must be 5000 characters or fewer.', 'four-legs-good'),
    'rate_limited'      => __('Too many submissions. Please try again later.', 'four-legs-good'),
    'generic_error'     => __('Something went wrong. Please try again later.', 'four-legs-good'),
    'network_error'     => __('Could not reach the server. Please check your connection and try again.', 'four-legs-good'),
));
```

[VERIFIED — full functions.php pasted]

Key pattern elements:
1. `filemtime()` for cache-busting ✓
2. `in_footer = true` (the `true` parameter) ✓
3. `wp_localize_script()` for i18n strings ✓
4. Polylang `__()` for translation ✓

### 5b — Conditional Enqueue

The theme currently does NOT conditionally enqueue `flg-scripts` — it loads on every page. The only conditional enqueue is for the Constant Contact widget:

```php
if (is_front_page() || is_page(335)) {
    wp_enqueue_script('flg-ctct-widget', ...);
}
```

[VERIFIED]

For the adoption form, the condition would be:

```php
if (is_page(7) || is_page(339)) {
    wp_enqueue_script('flg-adoption-form', ...);
    wp_localize_script('flg-adoption-form', 'flg_adopt_i18n', array(...));
}
```

And for the volunteer form:

```php
if (is_page(8) || is_page(345)) {
    wp_enqueue_script('flg-volunteer-form', ...);
    wp_localize_script('flg-volunteer-form', 'flg_vol_i18n', array(...));
}
```

[INFERRED — follows existing `is_page()` pattern]

### 5c — Theme js/ Directory

```
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 10412 Jun  1 14:37 scripts.js
```

One file. Owner is the SiteGround user account. A new file `adoption-form.js` written with the same owner would be served correctly. The `filemtime()` cache-bust pattern works for any file in this directory. [VERIFIED]

### 5d — Footer Enqueue Confirmed

`wp_enqueue_script('flg-scripts', ..., true)` — the last parameter `true` is `$in_footer`. Scripts enqueued this way appear near `</body>`. [VERIFIED]

### 5e — Content-Security-Policy

```
curl -sI https://www.fourlegsgoodnynj.org/how-to-help/ | grep -i 'content-security-policy'
(empty — no CSP header)
```

No CSP header on the site. Moving from inline to external script will not be blocked. [VERIFIED]

---

## 6 — STRING-INJECTION SURFACE

### 6a — All 18 Differing Lines

```
L6  EN: { name: 'applicant_name', label: 'Full Name' },
    ES: { name: 'applicant_name', label: 'Nombre Completo' },

L7  EN: { name: 'applicant_email', label: 'Email' },
    ES: { name: 'applicant_email', label: 'Correo Electrónico' },

L8  EN: { name: 'applicant_phone_cell', label: 'Cell Phone' },
    ES: { name: 'applicant_phone_cell', label: 'Teléfono Celular' },

L9  EN: { name: 'applicant_address', label: 'Street Address' },
    ES: { name: 'applicant_address', label: 'Dirección' },

L10 EN: { name: 'applicant_city', label: 'City' },
    ES: { name: 'applicant_city', label: 'Ciudad' },

L11 EN: { name: 'applicant_state', label: 'State' },
    ES: { name: 'applicant_state', label: 'Estado' },

L12 EN: { name: 'applicant_zip', label: 'ZIP Code' },
    ES: { name: 'applicant_zip', label: 'Código Postal' },

L13 EN: { name: 'digital_signature_name', label: 'Digital Signature' }
    ES: { name: 'digital_signature_name', label: 'Firma Digital' }

L118 EN: <option value="">Select...</option>
     ES: <option value="">Selecciona...</option>

L119 EN: <option value="current">Current</option>
     ES: <option value="current">Actual</option>

L120 EN: <option value="previous">Previous</option>
     ES: <option value="previous">Anterior</option>

L321 EN: data.language = 'en';
     ES: data.language = 'es';

L334 EN: fetch('https://dogwalker.4lgshelterapp.duckdns.org/api/adoption-application', {
     ES: fetch('https://dogwalker.4lgshelterapp.duckdns.org/api/adoption-application?lang=es', {

L351 EN: const animalNames = data.animal_names_interested || 'a pet';
     ES: const animalNames = data.animal_names_interested || 'una mascota';

L354 EN: Thank you for your application! We've received your submission for ...
     ES: ¡Gracias por tu solicitud! Hemos recibido tu envío para ...

L355 EN: and will be in touch within a few business days. A copy ...
     ES: y nos pondremos en contacto dentro de unos días hábiles. Se ha enviado ...

L362 EN: throw new Error(result.error || 'Submission failed');
     ES: throw new Error(result.error || 'Envío fallido');

L366 EN: formError.textContent = 'There was an error submitting your application...';
     ES: formError.textContent = 'Hubo un error al enviar tu solicitud...';
```

[VERIFIED — diff output from line-by-line comparison]

### Classification

| # | Line(s) | Content | Type |
|---|---------|---------|------|
| 1-8 | L6-L13 | REQUIRED_TEXT_FIELDS labels | **UI string** |
| 9 | L118 | Select placeholder | **UI string** |
| 10 | L119 | "Current" option label | **UI string** |
| 11 | L120 | "Previous" option label | **UI string** |
| 12 | L321 | `data.language = 'en'/'es'` | **STRUCTURAL** |
| 13 | L334 | Endpoint URL `?lang=es` suffix | **STRUCTURAL** |
| 14 | L351 | Fallback animal name | **UI string** |
| 15-16 | L354-355 | Success message | **UI string** |
| 17 | L362 | Error fallback text | **UI string** |
| 18 | L366 | Error message | **UI string** |

**16 UI strings, 2 structural values.** [VERIFIED]

### 6b — Endpoint and Field Names

```
EN endpoint: https://dogwalker.4lgshelterapp.duckdns.org/api/adoption-application
ES endpoint: https://dogwalker.4lgshelterapp.duckdns.org/api/adoption-application?lang=es
```

The base endpoint is IDENTICAL. ES appends `?lang=es`. [VERIFIED]

All field `name` attributes in REQUIRED_TEXT_FIELDS are identical between EN and ES:
```
applicant_name, applicant_email, applicant_phone_cell, applicant_address,
applicant_city, applicant_state, applicant_zip, digital_signature_name
```

All element IDs (`adoptionForm`, `submitBtn`, `formError`, `successMessage`, `successText`, `catSection`, `dogSection`, `smallAnimalSection`, etc.) are identical between EN and ES. [VERIFIED — same line-by-line comparison showing only `label:` values differ, not `name:` values]

### 6c — Structural Per-Language Differences

**Two structural differences, both derivable from language code:**

1. `data.language = '<lang>'` — the language code sent in the POST body
2. Endpoint URL — base URL + (lang === 'es' ? '?lang=es' : '')

A single `wp_localize_script` value for `language` (e.g., `'en'` or `'es'`) handles both:

```javascript
data.language = flg_adopt_i18n.lang;
const url = 'https://dogwalker.4lgshelterapp.duckdns.org/api/adoption-application'
  + (flg_adopt_i18n.lang === 'es' ? '?lang=es' : '');
```

No other structural differences exist. [VERIFIED]

---

## SUMMARY ANSWERS

```
adoption JS scope: global; volunteer JS scope: wrapped
functions that MUST stay global (inline handlers): addPetRow, removePetRow
script init depends on running after form HTML: adoption no, volunteer yes
guard anchors that vanish on extraction: charCodeAt (adoption guard), function isValidEmail (volunteer guard), updateSubmitState (volunteer guard)
any structural (non-UI) string differs EN/ES: data.language and endpoint URL ?lang=es suffix (both derivable from one language code value)
```
