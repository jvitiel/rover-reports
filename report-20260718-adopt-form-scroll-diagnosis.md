# Adoption Form Error-Scroll Diagnosis — 2026-07-18

Read-only analysis of post 7 (EN) and post 339 (ES) `validateForm()` scroll behavior.
Source: `get_post_field('post_content', 7, 'raw')` and `get_post_field('post_content', 339, 'raw')`.

---

## 1. THE VALIDATION FUNCTION

### 1a. validateForm() — FULL VERBATIM from post 7

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
[VERIFIED — pasted verbatim from post 7 raw content, located by `function validateForm()` string literal]

### Config arrays — FULL VERBATIM from post 7

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

    // Required checkboxes (user must check these)
    const REQUIRED_CHECKBOXES = [
      'age_confirmed'
    ];

    // Agreement checkboxes that must ALL be checked
    const AGREEMENT_CHECKBOXES = [
      'willing_animal_control_laws',
      'willing_sign_papers',
      'willing_followup'
    ];
```
[VERIFIED — pasted verbatim from post 7 raw content, located by `const REQUIRED_TEXT_FIELDS` string literal]

### showFieldError() — FULL VERBATIM from post 7

```javascript
function showFieldError(input) {
      input.classList.add('error');
      const errorEl = input.closest('.form-group')?.querySelector('.field-error') ||
                      input.parentElement.querySelector('.field-error');
      if (errorEl) errorEl.classList.add('visible');
    }
```
[VERIFIED — pasted verbatim from post 7 raw content, located by `function showFieldError` string literal]

### 1b. How it selects the scroll target

A `let firstError = null` variable is declared at the top. Each failing validation block has:
```javascript
if (!firstError) firstError = <element>;
```
The guard `if (!firstError)` means **only the first failing field wins**. Subsequent failures do not overwrite it. [VERIFIED — guard present on all 5 assignment sites]

The scroll fires once, after the loop, on line:
```javascript
if (firstError) {
    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
```
[VERIFIED]

### 1c. Validation order (CHECK ORDER, not DOM order)

The function checks fields in this order:

| Step | What | Array / Check | First failing element becomes firstError |
|------|------|---------------|------------------------------------------|
| 1 | Text fields | REQUIRED_TEXT_FIELDS forEach | The `<input>` element |
| 2 | Email format | Single check on `applicant_email` | The email `<input>` |
| 3 | Required checkboxes | REQUIRED_CHECKBOXES forEach | The `<input type="checkbox">` |
| 4 | Animal type radio | querySelector for `:checked` | The `.animal-type-cards` container div |
| 5 | Agreement checkboxes | AGREEMENT_CHECKBOXES check | First agreement checkbox input |

**This is grouped by type, not by DOM position.** All text fields are checked first (step 1), then all checkboxes (step 3), then the radio group (step 4), then the agreement group (step 5). [VERIFIED]

### 1d. Scroll location relative to loop

The scroll fires **ONCE after all validation**, not inside any loop. The single `scrollIntoView` call is outside and after all five validation blocks. [VERIFIED — see full function above]

---

## 2. THE FIRST-ERROR SELECTION

### 2a. Guard analysis

Every assignment is guarded with `if (!firstError)`:
```javascript
if (!firstError) firstError = input;          // step 1 (text fields)
if (!firstError) firstError = emailInput;     // step 2 (email format)
if (!firstError) firstError = checkbox;       // step 3 (required checkboxes)
if (!firstError) firstError = container;      // step 4 (animal type)
if (!firstError) firstError = document.querySelector(`[name="${AGREEMENT_CHECKBOXES[0]}"]`);  // step 5
```
[VERIFIED — all 5 assignments have the `if (!firstError)` guard. No assignment overwrites a previously set value.]

### 2b. Document position computation

**None.** The function does not use `getBoundingClientRect`, `offsetTop`, `compareDocumentPosition`, or any other position computation. It relies entirely on the order it happens to check fields: the first failing field in VALIDATION ORDER wins, regardless of where that field sits in the DOM. [VERIFIED — grep of full function body finds zero position-related APIs]

---

## 3. THE RESUBMIT CASE

### 3a. Flags or state between submits

**None found.** There is no `hasScrolled` boolean, no class that persists between calls, no debounce timer, no state variable outside `validateForm()`. The function is stateless — every call declares fresh `isValid = true` and `firstError = null`, clears all previous error indicators, and re-validates from scratch. [VERIFIED — full function pasted above, no external state referenced]

### 3b. Scroll gating

The scroll fires unconditionally whenever `firstError` is non-null:
```javascript
if (firstError) {
    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
```
There is no additional condition — no check for "already scrolled," no check for "element is already visible," no check for which submit attempt this is. [VERIFIED]

### 3c. Does clearing bottom errors suppress the scroll?

**No code-level suppression.** Clearing errors (the two `querySelectorAll` calls at the top) removes `.visible` from all `.field-error` spans and `.error` from all inputs. This is purely cosmetic cleanup. It does not affect `firstError` (which starts as `null` on every call) or the scroll logic. [VERIFIED]

**However:** `scrollIntoView({ behavior: 'smooth' })` is asynchronous — it initiates an animated scroll. If the browser does not complete or re-initiate the scroll when the target element hasn't moved since the last call, the scroll might appear to do nothing on resubmit. This is browser-implementation-dependent and cannot be diagnosed from code alone. [INFERRED — no code evidence, but this is a known browser behavior edge case]

---

## 4. THE FIELD/ERROR MODEL

### 4a. Required fields: VALIDATION ORDER vs DOM ORDER

| # | Field name | Validation step | Array position | DOM position (approx. line in post_content) | Section |
|---|-----------|----------------|----------------|----------------------------------------------|---------|
| 1 | applicant_name | 1 (text) | REQUIRED_TEXT_FIELDS[0] | ~758 | §1 Your Info (TOP) |
| 2 | applicant_email | 1 (text) | REQUIRED_TEXT_FIELDS[1] | ~763 | §1 (TOP) |
| 3 | applicant_phone_cell | 1 (text) | REQUIRED_TEXT_FIELDS[2] | ~773 | §1 (TOP) |
| 4 | applicant_address | 1 (text) | REQUIRED_TEXT_FIELDS[3] | ~783 | §1 (TOP) |
| 5 | applicant_city | 1 (text) | REQUIRED_TEXT_FIELDS[4] | ~788 | §1 (TOP) |
| 6 | applicant_state | 1 (text) | REQUIRED_TEXT_FIELDS[5] | ~793 | §1 (TOP) |
| 7 | applicant_zip | 1 (text) | REQUIRED_TEXT_FIELDS[6] | ~800 | §1 (TOP) |
| 8 | **digital_signature_name** | **1 (text)** | **REQUIRED_TEXT_FIELDS[7]** | **~1486** | **§12 Agreement (BOTTOM)** ⚠️ |
| 9 | applicant_email (format) | 2 (email) | n/a | ~763 | §1 (TOP) |
| 10 | **age_confirmed** | **3 (checkbox)** | REQUIRED_CHECKBOXES[0] | **~808** | **§1 (TOP)** |
| 11 | **animal_type** | **4 (radio)** | n/a | **~822-834** | **§2 Animal Prefs (TOP)** |
| 12 | willing_animal_control_laws | 5 (agreement) | AGREEMENT_CHECKBOXES[0] | ~1467 | §12 Agreement (BOTTOM) |
| 13 | willing_sign_papers | 5 (agreement) | AGREEMENT_CHECKBOXES[1] | ~1471 | §12 Agreement (BOTTOM) |
| 14 | willing_followup | 5 (agreement) | AGREEMENT_CHECKBOXES[2] | ~1475 | §12 Agreement (BOTTOM) |

**⚠️ ORDER DISAGREEMENT — CANDIDATE BUG:**

`digital_signature_name` (row 8) is checked at step 1 (text fields), position 7 in the array. It is the LAST text field checked. But it sits at DOM line ~1486, which is **BELOW the willing checkboxes** (lines 1467-1475) and near the very bottom of the form.

This means: if a user fills all top text fields but leaves `digital_signature_name` empty (easy to miss — it's 12 sections down from the other text fields), `firstError` is set to `digital_signature_name` at step 1, before `age_confirmed` (step 3) or `animal_type` (step 4) are ever evaluated. The page scrolls to the signature field at the bottom, right next to the willing checkboxes. [VERIFIED — DOM positions confirmed by grep of field `name` attributes]

`age_confirmed` (row 10) and `animal_type` (row 11) are at DOM positions ~808 and ~822 (near the top, in sections 1-2). But they are checked at steps 3 and 4, AFTER all text fields. If ANY text field fails — particularly `digital_signature_name` at the bottom — they never get a chance to become `firstError`. [VERIFIED]

### 4b. Error surfacing mechanism

Each field uses two mechanisms:
1. **CSS class on the input:** `input.classList.add('error')` — adds red border/highlight via CSS
2. **Error message span:** `.field-error` span gets `.visible` class — shows the text label

Special cases:
- Animal type: error shown on `.form-group`'s `.field-error` span directly (no `showFieldError` call on the container)
- Agreement group: error shown on `#agreementError` element directly

`showFieldError()` does NOT call `scrollIntoView` or `focus()` — it only adds CSS classes. [VERIFIED]

### 4c. Scroll mechanism

```javascript
firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
```
[VERIFIED]

- **Method:** `scrollIntoView`
- **Options:** `behavior: 'smooth'` (animated, asynchronous), `block: 'center'` (centers element vertically in viewport)
- **No header offset compensation.** The site header is `position: fixed` with variable height (theme CSS: `.site-header { position: fixed; top: 0; ... }`). `scrollIntoView` does not account for fixed headers — the element is centered in the full viewport, but the fixed header obscures the top ~60-80px. With `block: 'center'` this is less noticeable than with `block: 'start'`, but for elements near the top of the page the header may partially or fully cover them. [VERIFIED — theme stylesheet confirms `.site-header { position: fixed; ... }`]
- **No `focus()` call** — the errored field does not receive keyboard focus after scroll. [VERIFIED]

---

## 5. SPANISH PARITY

### 5a. Post 339 validateForm() comparison

Post 339's `validateForm()` is **byte-identical to post 7 in all logic**. The function body — variable names, control flow, guards, scroll call — is character-for-character the same. [VERIFIED — both extracted and compared from raw post_content]

The only difference between the two posts is in the config arrays:

Post 7 (EN):
```javascript
{ name: 'applicant_name', label: 'Full Name' },
```

Post 339 (ES):
```javascript
{ name: 'applicant_name', label: 'Nombre Completo' },
```

The `name` properties (field identifiers) are identical. Only the `label` properties (human-readable, used in error messages) differ. The REQUIRED_CHECKBOXES and AGREEMENT_CHECKBOXES arrays are byte-identical. [VERIFIED]

**A fix that replaces the validateForm function body will match both posts with the same replacement string**, as long as the replacement doesn't include config-array labels. The function body itself is identical across both posts.

---

## 6. SHAPE OF THE FIX (report only — not implemented)

### 6a. Minimal change

The fix has two parts:

**Part A — Correct scroll target selection:**
Replace the current approach (rely on validation order = first-checked-first-wins) with explicit document-position comparison. Collect ALL failing elements, then pick the one with the smallest `getBoundingClientRect().top` (or `offsetTop`). This ensures the topmost field in the viewport/document wins regardless of what order the code checks them.

Alternatively (simpler): reorder the validation to match DOM order. Move `digital_signature_name` out of REQUIRED_TEXT_FIELDS and into a separate check after the agreement checkboxes, or check checkboxes/radios inline with text fields in DOM order. This is fragile — any future field addition must respect DOM order.

The document-position approach is more robust.

**Part B — Ensure scroll fires on every submit:**
`scrollIntoView({ behavior: 'smooth' })` is asynchronous and browser-implementation-dependent. Some browsers may skip or truncate a smooth scroll if the target hasn't moved since the last call. To force a re-scroll:
- Option 1: Use `behavior: 'auto'` (instant, always fires) then optionally smooth-scroll manually
- Option 2: Before calling `scrollIntoView`, scroll to a different position first (e.g., `window.scrollBy(0, 1)`) to reset the browser's scroll state
- Option 3: Add `element.focus({ preventScroll: true })` after `scrollIntoView` as a fallback anchor

### 6b. Scope

The fix is **confined to validateForm() and its immediate vicinity**. The error-clearing logic (the two `querySelectorAll` calls at the top) does not need to change. The `showFieldError` function does not need to change. The error labels work correctly and must be preserved.

If the document-position approach is used, the config arrays (REQUIRED_TEXT_FIELDS, etc.) don't need to change either — the validation still checks the same fields, it just picks the scroll target differently.

### 6c. Change size

**A few lines.** The core change is:
1. Replace `let firstError = null` + five `if (!firstError) firstError = x` guards with a `const errors = []` + five `errors.push(x)` calls
2. After all validation, add ~3 lines: sort `errors` by document position, pick `errors[0]`, call `scrollIntoView` on it

The rest of the function stays the same. Estimated: ~8-10 lines changed/added. No restructure needed.

---

## OBSERVATIONS vs CONCLUSIONS

### Observations (from code)
1. `firstError` guard is correctly implemented — only first failing field in VALIDATION ORDER wins [VERIFIED]
2. Validation order is by TYPE (text → email → checkbox → radio → agreement), not by DOM position [VERIFIED]
3. `digital_signature_name` is the 8th text field in REQUIRED_TEXT_FIELDS but is at the BOTTOM of the form in the DOM [VERIFIED]
4. `scrollIntoView({ behavior: 'smooth', block: 'center' })` fires once, after all validation, unconditionally when firstError is non-null [VERIFIED]
5. No flags, state, or debounce between submit attempts [VERIFIED]
6. Site header is `position: fixed` — scrollIntoView does not compensate for it [VERIFIED]
7. No external JS (theme or plugin) interferes with form validation or scrolling [VERIFIED — only theme scripts.js loaded, contains header scroll effect + contact modal, no adoption form interference]

### Conclusions (inferred from observations + reported symptoms)

**"Scrolls to bottom when top fields are missing":** The most likely explanation is that `digital_signature_name` is empty in the test scenario. It's a text field (checked at step 1, before checkboxes/radios), and it's at the bottom of the form (DOM line ~1486, right next to the willing checkboxes at ~1467-1475). If it's empty, it becomes `firstError` before `age_confirmed` or `animal_type` ever get evaluated. The scroll goes to the signature field area, which is visually adjacent to the willing checkboxes. [INFERRED — cannot confirm which fields John had filled without browser observation]

A second candidate: if `digital_signature_name` IS filled but the willing checkboxes are the only bottom failures, and all prior fields (including age_confirmed and animal_type) pass, then the scroll correctly goes to the first agreement checkbox. This would mean John's description "age_confirmed missing" doesn't match the actual form state. [UNCERTAIN — contradicts John's report]

**"Won't scroll back up on resubmit":** The code has no suppression mechanism. Two possible external causes: (1) `scrollIntoView({ behavior: 'smooth' })` is a no-op in some browsers when the target element is already near center — if the user is still at the bottom after filling the willing checkboxes and `firstError` is now a top field, `smooth` scrolling should work, but browser implementations vary; (2) if `digital_signature_name` is still empty on resubmit, `firstError` stays pointing to the signature field (bottom), and no upward scroll occurs. [INFERRED]

---

## BOTTOM-LINE ANSWERS

**1d:** scrolls ONCE AFTER all validation (using a saved first-error reference). `after`.

**3:** No flag, condition, or state found in the code that would suppress resubmit scrolling. The scroll fires unconditionally on every call when firstError is non-null. The resubmit non-scroll is either (a) `firstError` still pointing to a bottom field because `digital_signature_name` remains empty, or (b) browser-level `scrollIntoView` smooth-scroll deduplication. `nothing found in code — likely external: digital_signature_name still empty keeps firstError at bottom, or browser smooth-scroll dedup`.

**5a:** Post 339 scroll logic identical to post 7: `yes`. Function body is byte-identical; only config array labels differ (Spanish vs English). Same replacement string will match both.
