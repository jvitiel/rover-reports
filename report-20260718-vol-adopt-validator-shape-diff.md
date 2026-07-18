# Volunteer ↔ Adoption isValidEmail Shape Diff — 2026-07-18

Read-only comparison of the two `isValidEmail` implementations to scope the validator swap.

---

## 1 — ADOPTION isValidEmail (Post 7 — the source)

### 1a — Full Function

```javascript
function isValidEmail(email) {
      // Email format check -- deliberately NO regex and NO backslash escapes.
 //
 // This code lives in WordPress post_content. Any programmatic save that
 // calls wp_update_post() without wp_slash() runs wp_unslash() across the
 // whole content and deletes every lone backslash. On 2026-07-06 a save did
 // exactly that: this function's character class went from [^BACKSLASH-s@]
 // ("not whitespace, not at-sign") to [^s@] ("not the letter s, not
 // at-sign"). For eleven days the form told every applicant with an "s"
 // before the "@" -- Smith, Jones, Sanchez, Chris, Jessica -- that their own
 // email address was invalid. No way for them to proceed, no error reaching
 // the shelter. Roughly as many applications were blocked as received.
 // Nobody wrote that bug. A save did. Reproduced on probe post 494.
 //
 // Character codes cannot be corrupted that way. The post_content of this
 // page contains zero backslashes by design. Keep it that way.
 // DO NOT rewrite this as a regex. DO NOT add escape sequences to this page.
 const s = String(email);
 for (let i = 0; i < s.length; i++) {
 const c = s.charCodeAt(i);
 if (c === 32 || c === 160 || (c >= 9 && c <= 13)) return false;
 }
 const at = s.indexOf('@');
 if (at < 1) return false;
 if (s.indexOf('@', at + 1) !== -1) return false;
 const domain = s.slice(at + 1);
 const dot = domain.lastIndexOf('.');
 if (dot < 1) return false;
 if (dot === domain.length - 1) return false;
 return true;
    }
```
[VERIFIED — extracted from post 7 raw content via brace-counting]

### 1b — Signature

`function isValidEmail(email)` — one parameter named `email`. [VERIFIED]

### 1c — Return Contract

- Valid email → `return true` (last line)
- Invalid (whitespace, no @, double @, no dot, trailing dot) → `return false` (multiple early returns)
- **Empty string → `return false`** (passes whitespace check, fails `at < 1` since `indexOf('@')` returns -1)
- **null/undefined → `return false`** (`String(null)` = `"null"`, fails `at < 1`)

[VERIFIED — traced through code logic]

### 1d — Call Sites in Post 7

```javascript
// Line 1697:
if (emailInput.value && !isValidEmail(emailInput.value)) {
```

One call site. Argument: `emailInput.value`. Caller pre-guards with `emailInput.value &&` (truthy check). [VERIFIED]

### 1e — Backslash Count

Zero. [VERIFIED]

---

## 2 — VOLUNTEER isValidEmail (Post 8 — being replaced)

### 2a — Full Function

```javascript
function isValidEmail(value) {
if (!value) { return true; }
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
```
[VERIFIED — extracted from post 8 raw content]

### 2b — Signature

`function isValidEmail(value)` — one parameter named `value`. [VERIFIED]

### 2c — Return Contract

- Valid email → `return true` (regex test passes)
- Invalid (no @, no dot, etc.) → `return false` (regex test fails)
- **Empty string → `return true`** (falsy, hits `if (!value)` guard)
- **null/undefined → `return true`** (falsy, same guard)

[VERIFIED — traced through code logic]

### 2d — Call Sites in Post 8

```javascript
// Line 563 (inside isFormValid):
if (!isValidEmail(emailValue)) { return false; }

// Line 603 (emailInput 'input' event listener):
} else if (isValidEmail(v)) {

// Line 611 (emailInput 'blur' event listener):
if (!isValidEmail(v)) {
```

Three call sites. All pre-guarded by truthiness checks:
- L562: `if (emailValue) {` → only calls isValidEmail when emailValue is truthy
- L601-603: `if (!v) { clearFieldError } else if (isValidEmail(v))` → v is truthy in else branch
- L610-611: `if (v) { if (!isValidEmail(v))` → v is truthy

[VERIFIED — context lines pasted]

### 2e — Backslash Count

4 backslashes. All are `\s` in the regex pattern:
```
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
     ^^       ^^       ^^  (backslash-s × 4, but \. is also a backslash)
```
Wait — re-examining: `[^\s@]` × 3 = 3 `\s` = 3 backslashes. Plus `\.` = 1 backslash. Total = 4.

[VERIFIED — `return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);` reported as the only backslash-containing line]

---

## 3 — THE SHAPE DIFF

### 3a — Signature Comparison

| | Adoption | Volunteer |
|--|----------|-----------|
| Function name | `isValidEmail` | `isValidEmail` | 
| Parameter name | `email` | `value` |
| Parameter count | 1 | 1 |

Function name matches. **Parameter name differs: `email` vs `value`.** [VERIFIED]

### 3b — Return Contract Comparison

| Input | Adoption returns | Volunteer returns | Match? |
|-------|-----------------|-------------------|--------|
| Valid email | `true` | `true` | ✓ |
| Invalid email | `false` | `false` | ✓ |
| Empty string `""` | `false` | `true` | **✗** |
| `null` | `false` | `true` | **✗** |
| `undefined` | `false` | `true` | **✗** |

Both return plain booleans. No caller depends on anything beyond truthiness. [VERIFIED]

### 3c — Body Transplant Analysis

**The adoption function body refers to its parameter as `email`** (in `const s = String(email)`). The volunteer function's parameter is named `value`. If the adoption body is transplanted into the volunteer signature `function isValidEmail(value)`, the internal reference to `email` must be changed to `value`, OR the parameter name must be changed to `email`.

**A body transplant needs an internal rename: `email` → `value`** (or change the parameter name to `email`, but keeping `value` matches the existing call sites' expectations if anyone reads the code). [VERIFIED]

### 3d — Call Site Compatibility

All three volunteer call sites pass the email value by position:
- `isValidEmail(emailValue)` — passes a string value
- `isValidEmail(v)` — passes a string value

The callers don't reference the parameter name. Changing the function BODY does not require changing any call site. The call sites are identical for both implementations. [VERIFIED]

### 3e — Behavioral Comparison (12 Test Inputs)

```
Input                    Adoption    Volunteer   Match?
------------------------------------------------------------
empty string             false       true        ** NO **
normal email             true        true        YES
dotted local part        true        true        YES
no @ sign                false       false       YES
@ at start               false       false       YES
nothing after @          false       false       YES
no dot in domain         false       false       YES
trailing dot             false       false       YES
double @                 false       false       YES
space in local           false       false       YES
null                     false       true        ** NO **
undefined                false       true        ** NO **
```

[VERIFIED — node execution with both implementations]

**Three disagreements: empty string, null, undefined.** All three are falsy values that the volunteer's `if (!value) { return true; }` guard catches. The adoption validator has no such guard.

**HOWEVER: No call site ever passes a falsy value.** All three call sites in posts 8/345 pre-guard with truthiness checks (`if (emailValue)`, `if (v)`, `else if`). The empty/null/undefined code path is dead code in the current volunteer form. The behavioral difference exists but is **unreachable** in practice.

**Edge case analysis beyond the 12 test inputs:** The adoption charCodeAt validator rejects whitespace by character code (space=32, nbsp=160, tab-through-CR=9-13) and requires exactly one `@` with a dot in the domain. The volunteer regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` rejects `\s` (any JS-whitespace character) and `@`, requires exactly the same structure. The regex `\s` matches the same character set as the charCodeAt whitespace check, except the regex also matches Unicode whitespace categories (U+2000-U+200A, U+2028, U+2029, U+202F, U+205F, U+3000, U+FEFF) while charCodeAt only checks 5 specific codes. **The charCodeAt validator is slightly more permissive** on exotic Unicode whitespace — it would accept an email containing U+2003 (em space) that the regex would reject. This is a vanishingly unlikely real-world input and arguably a correct accept (Unicode spaces in email local parts are theoretically valid in quoted strings). [INFERRED — based on JS `\s` character class spec vs explicit charCodeAt checks]

---

## 4 — THE EXACT REPLACEMENT STRING

### 4a — Current Function in Post 8 (the string to replace)

```
function isValidEmail(value) {
if (!value) { return true; }
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
```

- Byte length: 110 bytes
- Occurrences in post 8: **exactly 1**

[VERIFIED]

### 4b — Same String in Post 345

- Occurrences in post 345: **exactly 1**
- Byte-identical to post 8's version: **YES**

[VERIFIED]

### 4c — Surrounding Code Comparison

**Post 8 (lines 511-524):**
```
L511: group.classList.remove('has-error');
L512: var errorSpan = group.querySelector('.field-error');
L513: if (errorSpan) { errorSpan.textContent = ''; }
L514: }
L515: 
L516: function isValidEmail(value) {
L517: if (!value) { return true; }
L518: return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
L519: }
L520: 
L521: function getAgeAnswer() {
L522: var i;
L523: for (i = 0; i < ageRadios.length; i++) {
L524: if (ageRadios[i].checked) { return ageRadios[i].value; }
```

**Post 345 (lines 512-525):**
```
L512: group.classList.remove('has-error');
L513: var errorSpan = group.querySelector('.field-error');
L514: if (errorSpan) { errorSpan.textContent = ''; }
L515: }
L516: 
L517: function isValidEmail(value) {
L518: if (!value) { return true; }
L519: return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
L520: }
L521: 
L522: function getAgeAnswer() {
L523: var i;
L524: for (i = 0; i < ageRadios.length; i++) {
L525: if (ageRadios[i].checked) { return ageRadios[i].value; }
```

Surrounding code is **byte-identical** between posts 8 and 345 (line numbers shifted by 1 due to the extra `language: 'es'` line elsewhere in 345). One replacement string matches both. [VERIFIED]

### 4d — wptexturize Adjacency Analysis

The adoption function body contains 4 `<` operators:
1. `i < s.length` (for loop)
2. `c <= 13` (whitespace range check)
3. `at < 1` (@ position check)
4. `dot < 1` (dot position check)

And 1 `&&` operator: `(c >= 9 && c <= 13)`

**Critical question: does the volunteer post's content make these dangerous?**

Scanned the entire volunteer JS block (between `<script>` and `</script>` in post 8):

```
Total & characters in volunteer JS: 0
```

**Zero ampersand characters in the entire volunteer script block.** The volunteer code uses nested `if` statements instead of `&&` throughout. Since `wptexturize` only corrupts `&` characters found inside false HTML tags created by `<` operators, and there are no `&` characters anywhere in the volunteer JS, the adoption function body's `<` operators **cannot create a corruption** in this context.

[VERIFIED — full JS block ampersand scan]

The first `>` character after isValidEmail in post 8 is at +863 bytes (`ageNum > 17`). No `&` exists between isValidEmail and that `>`. [VERIFIED]

**OBSERVATION:** The safety here is a property of the volunteer code's current content (no `&&` anywhere), not a structural guarantee. If anyone later adds `&&` to the volunteer JS, the adoption function's `<` operators become dangerous. The safest long-term approach would be to also rewrite comparisons high-side-first (`s.length > i` instead of `i < s.length`) as was done for the scroll fix — but that changes the replacement body from a direct transplant to a rewrite, and is beyond this diagnosis scope.

---

## 5 — CALLER CONTEXT

### 5a — isFormValid() and updateSubmitState()

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

[VERIFIED — extracted from post 8]

### 5b — Submit-Enable Flow

`isFormValid()` → calls `isValidEmail(emailValue)` → if false, returns false → `updateSubmitState()` disables button.

The flow depends ONLY on the boolean return of `isValidEmail`. Both implementations return the same boolean for any truthy input (the only inputs that reach isValidEmail from isFormValid, since `if (emailValue)` guards the call). The submit-enable behavior is **unchanged** by the swap. [VERIFIED — code trace]

### 5c — Email Required or Optional?

**Email is validated-if-present, NOT required for submit-enable.**

In `isFormValid()`:
```javascript
if (emailInput) {
var emailValue = emailInput.value.trim();
if (emailValue) {                              // ← only validates if non-empty
if (!isValidEmail(emailValue)) { return false; }
}
}
```

If emailInput is empty, the `if (emailValue)` block is skipped entirely, and `isFormValid()` falls through to `return true` (assuming name and age are valid). The submit button enables with a blank email.

**Blast radius of a validator regression:** Lower than the adoption form. On the adoption form, email is required (empty email disables submit). On the volunteer form, a broken email validator would only affect volunteers who choose to provide an email and whose address triggers the bug. Volunteers who leave email blank are unaffected. [VERIFIED]

---

## SUMMARY ANSWERS

1. **Adoption param name / volunteer param name:** `email` / `value`
2. **Body transplant needs internal rename:** yes (`email` → `value` in `const s = String(email)`)
3. **Validators disagree on any test input:** yes — empty string, null, undefined (adoption=false, volunteer=true; but callers never pass these values)
4. **One replacement string matches both post 8 and 345:** yes (110 bytes, exactly 1 occurrence each, byte-identical, identical surrounding context)
