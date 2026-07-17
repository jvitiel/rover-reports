# Adoption Form Validation Diagnosis — 2026-07-17

## 1 — THE VALIDATION FUNCTION

### 1a. validateForm() — full verbatim

Found in the inline `<script>` block inside the `/adopt/` page content (WordPress block content, not a theme template file). The form and all its JS are stored in the WordPress post body for the Adopt page, rendered inline.

```javascript
    function validateForm() {
      let isValid = true;
      let firstError = null;
      
      // Clear previous errors
      document.querySelectorAll('.field-error').forEach(el => el.classList.remove('visible'));
      document.querySelectorAll('input.error, select.error, textarea.error').forEach(el => el.classList.remove('error'));
      
      // Validate required text fields (from config)
      REQUIRED_TEXT_FIELDS.forEach(field => {
        const input = document.querySelector(`[name="${field.name}"]`);
        if (!input.value.trim()) {
          showFieldError(input);
          isValid = false;
          if (!firstError) firstError = input;
        }
      });
      
      // Email validation (special case - format check)
      const emailInput = document.querySelector('[name="applicant_email"]');
      if (emailInput.value && !isValidEmail(emailInput.value)) {
        showFieldError(emailInput);
        isValid = false;
        if (!firstError) firstError = emailInput;
      }
      
      // Validate required checkboxes (from config)
      REQUIRED_CHECKBOXES.forEach(name => {
        const checkbox = document.querySelector(`[name="${name}"]`);
        if (checkbox && !checkbox.checked) {
          showFieldError(checkbox);
          isValid = false;
          if (!firstError) firstError = checkbox;
        }
      });
      
      // Animal type (required radio group)
      const animalType = document.querySelector('input[name="animal_type"]:checked');
      if (!animalType) {
        const container = document.querySelector('.animal-type-cards');
        container.closest('.form-group').querySelector('.field-error').classList.add('visible');
        isValid = false;
        if (!firstError) firstError = container;
      }
      
      // Agreement checkboxes (all must be checked, from config)
      let allAgreed = true;
      AGREEMENT_CHECKBOXES.forEach(name => {
        if (!document.querySelector(`[name="${name}"]`).checked) {
          allAgreed = false;
        }
      });
      if (!allAgreed) {
        document.getElementById('agreementError').classList.add('visible');
        isValid = false;
        if (!firstError) firstError = document.querySelector(`[name="${AGREEMENT_CHECKBOXES[0]}"]`);
      }
      
      // Scroll to first error
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      return isValid;
    }
```

The config arrays driving it (also inline in the same `<script>` block):

```javascript
    const REQUIRED_TEXT_FIELDS = [
      { name: 'applicant_name', label: 'Full Name' },
      { name: 'applicant_email', label: 'Email' },
      { name: 'applicant_phone_cell', label: 'Cell Phone' },
      { name: 'applicant_address', label: 'Street Address' },
      { name: 'applicant_city', label: 'City' },
      { name: 'applicant_state', label: 'State' },
      { name: 'applicant_zip', label: 'ZIP Code' },
      { name: 'digital_signature_name', label: 'Digital Signature' }
    ];

    const REQUIRED_CHECKBOXES = [
      'age_confirmed'
    ];

    const AGREEMENT_CHECKBOXES = [
      'willing_animal_control_laws',
      'willing_sign_papers',
      'willing_followup'
    ];
```

Helper function:

```javascript
    function showFieldError(input) {
      input.classList.add('error');
      const errorEl = input.closest('.form-group')?.querySelector('.field-error') ||
                      input.parentElement.querySelector('.field-error');
      if (errorEl) errorEl.classList.add('visible');
    }
```

[VERIFIED — pasted from rendered page source at /adopt/]

### 1b. Fields validateForm() checks

1. `applicant_name` (text, empty check)
2. `applicant_email` (text, empty check + email format via `isValidEmail()`)
3. `applicant_phone_cell` (text, empty check)
4. `applicant_address` (text, empty check)
5. `applicant_city` (text, empty check)
6. `applicant_state` (text, empty check)
7. `applicant_zip` (text, empty check)
8. `digital_signature_name` (text, empty check)
9. `age_confirmed` (checkbox, checked check)
10. `animal_type` (radio, `:checked` check)
11. `willing_animal_control_laws` (checkbox, checked check)
12. `willing_sign_papers` (checkbox, checked check)
13. `willing_followup` (checkbox, checked check)

### 1c. Fields in the form markup carrying HTML `required` attribute

Extracted from inside `<form id="adoptionForm">`:

1. `applicant_name` — `<input type="text" name="applicant_name" required>`
2. `applicant_email` — `<input type="email" name="applicant_email" required>`
3. `applicant_phone_cell` — `<input type="tel" name="applicant_phone_cell" required>`
4. `applicant_address` — `<input type="text" name="applicant_address" required>`
5. `applicant_city` — `<input type="text" name="applicant_city" required>`
6. `applicant_state` — `<input type="text" name="applicant_state" required>`
7. `applicant_zip` — `<input type="text" name="applicant_zip" required>`
8. `age_confirmed` — `<input type="checkbox" name="age_confirmed" required>`
9. `animal_type` (first radio only) — `<input type="radio" name="animal_type" value="cat" required>`
10. `willing_animal_control_laws` — `<input type="checkbox" name="willing_animal_control_laws" value="yes" required>`
11. `willing_sign_papers` — `<input type="checkbox" name="willing_sign_papers" value="yes" required>`
12. `willing_followup` — `<input type="checkbox" name="willing_followup" value="yes" required>`
13. `digital_signature_name` — `<input type="text" name="digital_signature_name" required style="font-style: italic;">`

[VERIFIED — grep of `required` within `<form id="adoptionForm">...</form>` from page source]

### 1d. SET DIFFERENCE: required fields NOT checked by validateForm()

**None.** The 13 HTML `required` fields and the 13 fields checked by `validateForm()` are an exact match. Every field with the HTML `required` attribute is also validated by `validateForm()`.

### 1e. Does validateForm() check animal_type?

**Yes.** The relevant lines:

```javascript
      // Animal type (required radio group)
      const animalType = document.querySelector('input[name="animal_type"]:checked');
      if (!animalType) {
        const container = document.querySelector('.animal-type-cards');
        container.closest('.form-group').querySelector('.field-error').classList.add('visible');
        isValid = false;
        if (!firstError) firstError = container;
      }
```

[VERIFIED — from inline script in page source]

### 1f. What validateForm() does on failure

1. Adds `.error` class to failing inputs and `.visible` class to their adjacent `.field-error` spans (via `showFieldError()`).
2. For animal_type specifically, adds `.visible` to the `.field-error` inside the `.animal-type-cards` container's parent `.form-group`.
3. For agreement checkboxes, adds `.visible` to `#agreementError`.
4. Tracks the first failing element and calls `firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
5. Returns `false`.

---

## 2 — THE ERROR DISPLAY

### 2a. formError markup and CSS

Markup (from page source):
```html
    <div id="formError" class="form-error"></div>
```

CSS (from inline `<style>` in page source):
```css
    .form-error {
      display: none;
      background: rgba(194, 75, 90, 0.1);
      border: 1px solid var(--error);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      color: var(--error);
      text-align: center;
    }
    
    .form-error.visible {
      display: block;
    }
```

### 2b. Code paths that set formError text content

Only one path — in the submit handler's `catch` block:

```javascript
          formError.textContent = 'There was an error submitting your application. Please try again or contact us directly.';
          formError.classList.add('visible');
          formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

This only fires on a failed HTTP request (network error or non-success response), NOT on validation failure. `validateForm()` never touches `formError` — it uses per-field `.field-error` spans instead.

[VERIFIED — searched all references to `formError` in the inline script]

### 2c. Per-field error display

Yes. Each required field has a `<span class="field-error">` adjacent to it with a pre-set message. Examples:

```html
<span class="field-error">Please enter your full name</span>
<span class="field-error">Please enter a valid email address</span>
<span class="field-error">Please enter your cell phone number</span>
<span class="field-error">Please select an animal type</span>
<span class="field-error" id="agreementError">Please check all agreement boxes</span>
<span class="field-error">Please type your full name as your signature</span>
```

CSS:
```css
    .field-error {
      color: var(--error);
      font-size: 0.85rem;
      margin-top: 0.3rem;
      display: none;
    }
    
    .field-error.visible {
      display: block;
    }
```

These are the validation messages. `formError` is only for submission-level HTTP errors.

### 2d. Scroll/focus on validation failure

All hits in the adopt form's inline JS:

1. **validateForm() scroll on failure** — inline `<script>` (within validateForm):
   ```javascript
   firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
   ```

2. **Success scroll** — inline `<script>` (within submit handler, success branch):
   ```javascript
   successMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
   ```

3. **formError scroll** — inline `<script>` (within submit handler, catch block):
   ```javascript
   formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
   ```

No `scrollTo`, `window.scroll`, or `.focus(` calls in the adoption form JS. (The contact modal in `scripts.js` has `.focus()` calls but those are for the contact form, not the adoption form.)

[VERIFIED — grep of scrollIntoView, scrollTo, window.scroll, .focus( across /tmp/adopt-page.html]

---

## 3 — IS NATIVE VALIDATION SUPPRESSED ANYWHERE?

### 3a. Search results

**`novalidate` / `noValidate`:** One hit — the contact form (a separate `<form>` element, NOT the adoption form):
```html
<form id="contact-form" class="contact-form" novalidate>
```

**`setCustomValidity`:** Zero hits in the entire page source and in `scripts.js`.

**`checkValidity`:** Zero hits.

**`reportValidity`:** Zero hits.

**`invalid` event listener:** Zero hits. No code binds to the `'invalid'` event.

[VERIFIED — grep of page source and scripts.js]

### 3b. Full opening `<form>` tag for the adoption form

```html
    <form id="adoptionForm">
```

No `method`, no `action`, no `novalidate`. The browser default is `method="GET"` and `action` = current page URL.

[VERIFIED — from page source]

### 3c. Does any JS add or remove the novalidate attribute at runtime?

No. No code references `novalidate` or `noValidate` in the adoption form's inline JS or in `scripts.js` (the only `novalidate` is the hardcoded HTML attribute on the contact form). No code calls `setAttribute('novalidate', ...)` or `removeAttribute('novalidate')`.

[VERIFIED — searched all JS in page source and scripts.js]

---

## 4 — THE FULL SUBMIT HANDLER

```javascript
    function initFormSubmission() {
      const form = document.getElementById('adoptionForm');
      const submitBtn = document.getElementById('submitBtn');
      const formError = document.getElementById('formError');
      
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate
        if (!validateForm()) {
          return;
        }
        
        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        formError.classList.remove('visible');
        
        try {
          // Collect form data
          const formData = new FormData(form);
          const data = {};
          
          formData.forEach((value, key) => {
            // Skip pet rows - we'll handle separately
            if (!key.startsWith('pet_')) {
              data[key] = value;
            }
          });
          
          // Add language
          data.language = 'en';
          
          // Collect previous pets
          if (data.had_pets_before === 'yes') {
            data.previous_pets_json = collectPreviousPets();
          }
          
          // Convert checkbox values
          ['willing_animal_control_laws', 'willing_sign_papers', 'willing_followup'].forEach(key => {
            data[key] = data[key] === 'yes' ? 'yes' : 'no';
          });
          
          // Submit
          const response = await fetch('https://dogwalker.4lgshelterapp.duckdns.org/api/adoption-application', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          });
          
          const result = await response.json();
          
          if (result.success) {
            // Show success message
            form.style.display = 'none';
            const successMessage = document.getElementById('successMessage');
            successMessage.classList.add('visible');
            
            // Customize success text
            const animalNames = data.animal_names_interested || 'a pet';
            const email = data.applicant_email;
            document.getElementById('successText').innerHTML = `
              Thank you for your application! We've received your submission for <strong>${animalNames}</strong> 
              and will be in touch within a few business days. A copy of your application has been emailed to 
              <strong>${email}</strong>.
            `;
            
            // Scroll to success message
            successMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            throw new Error(result.error || 'Submission failed');
          }
        } catch (error) {
          console.error('Submission error:', error);
          formError.textContent = 'There was an error submitting your application. Please try again or contact us directly.';
          formError.classList.add('visible');
          formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } finally {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
        }
      });
    }
```

[VERIFIED — from inline script in page source]

### 4a. Endpoint and request shape

**Endpoint:** `POST https://dogwalker.4lgshelterapp.duckdns.org/api/adoption-application`

**Request shape:** JSON object built from `FormData` entries (all form fields as key-value pairs, excluding `pet_*` rows which are collected separately into `data.previous_pets_json` as an array). Adds `data.language = 'en'`. Converts agreement checkbox values to 'yes'/'no' strings.

### 4b. Non-OK response handling

If `result.success` is falsy (either the JSON response has `success: false`, or the response can't be parsed as JSON), it throws into the `catch` block, which:
- Logs to console
- Sets `formError.textContent` to a generic error message
- Adds `.visible` to `formError`
- Scrolls `formError` into view

### 4c. Re-enables submitBtn on failure?

**Yes.** The `finally` block always runs:
```javascript
        } finally {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
        }
```

The button is re-enabled on both success and failure. No stuck-button scenario.

---

## 5 — THE RADIO MARKUP AND CSS

### 5a. Animal type radio group markup

```html
        <div class="form-group">
          <label>What type of animal are you interested in? <span class="required">*</span></label>
          <div class="animal-type-cards">
            <label class="animal-type-card" data-type="cat">
              <input type="radio" name="animal_type" value="cat" required>
              <div class="emoji">🐱</div>
              <div class="type-name">Cat</div>
            </label>
            <label class="animal-type-card" data-type="dog">
              <input type="radio" name="animal_type" value="dog">
              <div class="emoji">🐕</div>
              <div class="type-name">Dog</div>
            </label>
            <label class="animal-type-card" data-type="small_animal">
              <input type="radio" name="animal_type" value="small_animal">
              <div class="emoji">🐹</div>
              <div class="type-name">Small Animal</div>
            </label>
          </div>
          <span class="field-error">Please select an animal type</span>
        </div>
```

### 5b. CSS rules

```css
    .animal-type-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-top: 0.5rem;
    }
    
    .animal-type-card {
      position: relative;
      border: 2px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .animal-type-card:hover {
      border-color: var(--primary);
    }
    
    .animal-type-card.selected {
      border-color: var(--primary);
      background: rgba(196, 117, 59, 0.05);
    }
    
    .animal-type-card input {
      position: absolute;
      opacity: 0;
    }
```

The rule `.animal-type-card input` applies `position: absolute` and `opacity: 0`. No explicit width/height is set in this rule — the input inherits its default size. The browser renders it at its intrinsic size (observed as 13×13px in the browser), positioned absolutely within the `.animal-type-card` (which is `position: relative`), and invisible.

### 5c. Are the visible cards `<label>` elements properly associated?

**Yes.** Each card is a `<label class="animal-type-card">` element that wraps the `<input type="radio">` directly. This is implicit label association — clicking anywhere on the card (emoji, text, border) activates the radio input. No `for=` attribute is needed because the input is a descendant of the label.

### 5d. Pattern identification

This is a standard **custom radio card** pattern: visually hide the native radio input, style the parent `<label>` as a card, and use CSS (`.selected` class or `:checked` pseudo-class) to show selection state. The `initAnimalTypeCards()` JS adds a `.selected` class to the card on change. The hidden input is intentional — the card IS the clickable surface.

---

## 6 — SPANISH VERSION

### 6a. Separate template or same?

The URL `https://www.fourlegsgoodnynj.org/es/adopt/` serves the same page content. Polylang serves the same WordPress post body (and therefore the same inline `<script>` and `<style>`) for both `/adopt/` and `/es/adopt/`.

### 6b. Differences

A diff of the adoption-form-relevant lines between the EN and ES pages produces **zero differences**. Same form id (`adoptionForm`), same validation binding, same radio pattern, same JS config arrays, same field names, same English-language labels (the labels are not translated).

Note: `https://www.fourlegsgoodnynj.org/es/adoptar/` returns a page with zero `adoptionForm` references — that URL either does not exist or loads a different page without the form.

[VERIFIED — diff of grep output between EN and ES page sources]

### 6c. Spanish adoption form URL

`https://www.fourlegsgoodnynj.org/es/adopt/` (same English form, untranslated labels).

---

## 7 — SCOPE OF THE BREAKAGE

### 7a. Required fields with visually hidden inputs

Only **`animal_type`** (the first radio, `value="cat"`) is both `required` and visually hidden (`opacity: 0`, `position: absolute` inside `.animal-type-card`).

All other required fields:
- Text inputs (`applicant_name`, `applicant_email`, `applicant_phone_cell`, `applicant_address`, `applicant_city`, `applicant_state`, `applicant_zip`, `digital_signature_name`): standard visible `<input>` elements, no hiding CSS.
- Checkboxes (`age_confirmed`, `willing_animal_control_laws`, `willing_sign_papers`, `willing_followup`): styled via `.checkbox-option input` at `width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer;` — fully visible.

### 7b. Document order of all required fields

In form source order (top to bottom):

| # | Field | Type | Visually Hidden? |
|---|-------|------|------------------|
| 1 | `applicant_name` | text | No |
| 2 | `applicant_email` | email | No |
| 3 | `applicant_phone_cell` | tel | No |
| 4 | `applicant_address` | text | No |
| 5 | `applicant_city` | text | No |
| 6 | `applicant_state` | text | No |
| 7 | `applicant_zip` | text | No |
| 8 | `age_confirmed` | checkbox | No |
| 9 | `animal_type` (cat radio) | radio | **Yes** (`opacity: 0`, `position: absolute`) |
| 10 | `willing_animal_control_laws` | checkbox | No |
| 11 | `willing_sign_papers` | checkbox | No |
| 12 | `willing_followup` | checkbox | No |
| 13 | `digital_signature_name` | text | No |

Native validation checks fields in document order. If a user fills in fields 1–8 and 10–13 but skips `animal_type` (#9), native validation focuses the invisible radio at position #9 and the browser scrolls to it with no visible message. If the user skips an earlier visible field (e.g. leaves `applicant_name` empty), native validation focuses that visible field first, which displays normally. The silent-jump only occurs when `animal_type` is the first failing required field in document order.

---

## Mechanism of the bug

The form has `e.preventDefault()` as the submit handler's first statement, but that handler is bound to the `'submit'` event. When native validation blocks the submit (because a `required` field is empty), the `'submit'` event never fires — the browser fires `'invalid'` events on the failing fields instead. So `e.preventDefault()` never runs, `validateForm()` never runs, and the theme's error display (per-field `.field-error` spans with messages, smooth scroll to first error) never activates. The browser's own native validation UI takes over: it tries to focus the first invalid field, which for the `animal_type` radio is an invisible element, producing a scroll-to-nothing effect.

---

1d: required fields NOT checked by validateForm(): none
1e: validateForm() checks animal_type: yes
3a: native validation suppressed anywhere: no (only on the separate contact form, not on adoptionForm)
7a: other required fields that are visually hidden: none (only animal_type)
