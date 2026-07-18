# Scroll-Fix SyntaxError Post-Mortem — 2026-07-18

File examined: `/tmp/post7-new.html` (the broken content, already reverted off live site).

---

## 1. EXTRACT AND SYNTAX-CHECK

### 1a. Node availability
```
/usr/local/bin/node
v22.23.1
```
[VERIFIED]

### 1b. node --check results
```
node --check /tmp/old.js   -> exit: 0  (PASS)
node --check /tmp/new.js   -> exit: 0  (PASS)
```
[VERIFIED — the raw JavaScript in post7-new.html is syntactically valid. The SyntaxError is NOT in the source file.]

---

## 2. THE BROKEN REGION

### 2a. Rendered line 1892

Line 1892 in post7-new.html is NOT inside the `<script>` block — it's HTML content below the form:
```
  1892	
```
[VERIFIED — an empty line in post_content. The "line 1892" in the browser error refers to the RENDERED page (which includes theme header/nav/footer HTML), not the raw post_content.]

### 2b. The actual broken line in rendered output

WordPress's `the_content` filter transforms line 1753 of post7-new.html:
```
Raw:      if (topError && topError.focus) { topError.focus({ preventScroll: true }); }
Rendered: if (topError &#038;&#038; topError.focus) { topError.focus({ preventScroll: true }); }
```
[VERIFIED — `apply_filters("the_content", $raw)` output, full diff below:]

```
$ diff /tmp/scroll-raw.txt /tmp/scroll-rendered.txt
19c19
<  if (topError && topError.focus) { topError.focus({ preventScroll: true }); }
---
>  if (topError &#038;&#038; topError.focus) { topError.focus({ preventScroll: true }); }
```
[VERIFIED — this is the ONLY difference in the entire `<script>` block between raw and rendered. One line, one change: `&&` → `&#038;&#038;`.]

The JS parser sees `&#038;` as three separate tokens (`&`, `#`, `038`), producing `Uncaught SyntaxError: Invalid or unexpected token`. Since this is at the top of an inline `<script>`, every function below it (including `isValidEmail` and `validateForm`) fails to parse. The entire form breaks.

---

## 3. THE SPECIFIC CULPRIT

### 3a. Non-ASCII bytes in the scroll block
```
sed -n '/Scroll to the topmost/,/preventScroll/p' /tmp/post7-new.html | grep -nP '[^\x00-\x7F]'
exit: 1
```
[VERIFIED — zero non-ASCII bytes in the scroll block. No smart quotes, no curly apostrophes.]

### 3b–3c. Smart quotes / curly apostrophes

Zero UTF-8 curly quote sequences (`e2 80 98/99/9c/9d`) in the scroll block. All apostrophes are straight `'` (byte 0x27). [VERIFIED]

### 3d. What is at column 16 of the broken rendered line

The rendered broken line (in the browser):
```
 if (topError &#038;&#038; topError.focus) { topError.focus({ preventScroll: true }); }
```
Column 16 is `#` — the second character of `&#038;`. This is where the JS parser chokes: `&` is a valid bitwise operator, but `#` immediately after is not a valid token. [VERIFIED — counted from the leading space]

### 3e. ROOT CAUSE: `wptexturize` + `wp_html_split` false-positive tag matching

**Individual filter test results:**
```
do_blocks:    clean
wptexturize:  CONVERTS
wpautop:      clean
wp_kses_post: clean
```
[VERIFIED]

**`wp_html_split` tokenization of the broken content:**
```
[2469] TAG: "<script>"
[2470] TEXT len=4351: (JS code — validated correctly, inside no-texturize zone)
...
[2522] TEXT len=4401: (more JS code — inside no-texturize zone)
[2523] TAG len=1859: "< errorFields.length; i++) {\n const p = errorFields[i]...topError && topError.focus...
[2524] TEXT len=9: "= 9 && c "
[2525] TAG len=1096: "<= 13)) return false;..."
```
[VERIFIED]

**The mechanism:**

WordPress's `wp_html_split()` uses regex `<[^>]*>` (with `/s` dotall flag) to split content into text and tag tokens. Inside the `<script>` block, the JS comparison operator `<` in `i < errorFields.length` (line 1748) is matched as the start of an HTML tag. The regex `[^>]*` then consumes every character that isn't `>` — spanning across dozens of lines — until it hits the `>` character in `c >= 9` (line 1787, inside `isValidEmail`). This creates a 1,859-byte false "tag" token.

`wptexturize` converts bare `&` to `&#038;` inside ALL tag tokens (not just text tokens). The `&&` on line 1753 (`topError && topError.focus`) falls inside this false tag token, so both `&` characters are converted to `&#038;`.

**Proof — minimal reproduction:**
```php
$test = "<script>\nif (a < b) {}\nif (c && d) {}\n</script>";
$tokens = wp_html_split($test);
// [0] TEXT: ""
// [1] TAG: "<script>"
// [2] TEXT: "\nif (a "
// [3] TAG: "< b) {}\nif (c && d) {}\n</script>"   ← false tag swallows && AND </script>
// [4] TEXT: ""

echo wptexturize($test);
// Output: <script>\nif (a < b) {}\nif (c &#038;&#038; d) {}\n</script>
```
[VERIFIED — `&&` converted despite being inside `<script>`]

### 3f. WHY THE OLD CODE SURVIVED

**Old script — `<` and `&&` positions (script-relative line numbers):**
```
&&  at line 182:  if (emailInput.value && !isValidEmail(emailInput.value))
&&  at line 191:  if (checkbox && !checkbox.checked)
<   at line 253:  for (let i = 0; i < s.length; i++)     ← first < comparison
&&  at line 255:  if (c === 32 || c === 160 || (c >= 9 && c <= 13))
```

**New script — `<` and `&&` positions:**
```
&&  at line 182:  if (emailInput.value && !isValidEmail(emailInput.value))
&&  at line 191:  if (checkbox && !checkbox.checked)
<   at line 233:  for (let i = 1; i < errorFields.length; i++)   ← NEW, earlier
<   at line 235:  if (p < topPos)                                 ← NEW, earlier
&&  at line 238:  if (topError && topError.focus)                 ← NEW, between < and >
<   at line 269:  for (let i = 0; i < s.length; i++)
&&  at line 271:  if (c >= 9 && c <= 13)
```
[VERIFIED]

In the old code, ALL `&&` occurrences appear either BEFORE the first `<` comparison (lines 182, 191 < 253) or AFTER the false tag's `>` endpoint (line 255's `&&` follows the `>` in `>=`). No `&&` falls inside a false tag token.

In the new code, the scroll block introduced two new `<` comparisons (lines 233, 235) that appear BEFORE a new `&&` (line 238). The false tag starting at `<` on line 233 extends to the `>` in `>=` on line 271 — swallowing the `&&` on line 238.

---

## 4. THE PYTHON TRANSFORM

### 4a. NEW_SCROLL literal (cat -A)
```
NEW_SCROLL = '''// Scroll to the topmost failing field by DOCUMENT position, then focus it.$
 // errorFields is filled in check-order, which is NOT document order:$
 // digital_signature_name is validated with the text fields (first) but sits$
 // at the BOTTOM of the form, so the old "first to fail wins" logic scrolled$
 // to the bottom when a top field like animal_type or age_confirmed was the$
 // real problem, and never scrolled back up on resubmit. Sorting by$
 // getBoundingClientRect().top makes the scroll land on the highest failing$
 // field regardless of validation order. The -100 offset clears the fixed$
 // site header so the field is not hidden beneath it. Focus gives the user a$
 // cursor on the field to fix and makes resubmit reliable across browsers.$
 if (errorFields.length) {$
 let topError = errorFields[0];$
 let topPos = topError.getBoundingClientRect().top + window.scrollY;$
 for (let i = 1; i < errorFields.length; i++) {$
 const p = errorFields[i].getBoundingClientRect().top + window.scrollY;$
 if (p < topPos) { topPos = p; topError = errorFields[i]; }$
 }$
 window.scrollTo({ top: Math.max(0, topPos - 100), behavior: 'smooth' });$
 if (topError && topError.focus) { topError.focus({ preventScroll: true }); }$
 }'''$
```
[VERIFIED — zero non-ASCII bytes, no curly quotes, clean line endings]

### 4b. Corruption origin

The corruption does NOT exist in the Python source or the generated file. The raw post_content (post7-new.html) has clean `&&` — verified by `node --check` and by `sha256` readback match. The corruption is introduced at RENDER TIME by WordPress's `wptexturize` filter processing the `the_content` hook. [VERIFIED]

### 4c. Heredoc integrity

The `/tmp/fix-scroll.py` file was written with a quoted heredoc (`<< 'EOF'`). Zero non-ASCII bytes in the file. The Python regex backslashes (`\(`, `\s`, `\1`) survived intact — confirmed by the script executing correctly: all 5 precondition checks passed, all 5 push conversions matched, the scroll-block regex matched exactly once. [VERIFIED — correct operation proves backslash preservation]

---

## 5. WHY THE DEPLOY CHECKS MISSED IT

The deploy verified:
- `sha256sum` readback match → confirms bytes were stored correctly. Does NOT parse JS.
- `grep -c 'charCodeAt'` → confirms the email fix is present. Does NOT parse JS.
- `grep -c 'window.scrollTo'` → confirms the scroll code is present. Does NOT parse JS.
- `diff` → confirms only intended lines changed. Does NOT parse JS.
- `node --check` was NOT run. If it had been, it would have PASSED (the raw JS is valid).
- `wptexturize($content)` was NOT simulated. This is the only check that would have caught the bug.
- No live `curl | grep 'SyntaxError'` or `curl | node --check -` was performed on the rendered page.

**The gap:** No check in the deploy pipeline verifies that WordPress's content filters preserve the JavaScript. The raw content is valid; the rendered content is broken. The sha256, grep, and diff checks verify the raw content only. [VERIFIED]

**The only check that would have caught this:**
```php
wp eval '
$raw = file_get_contents("/tmp/post7-new.html");
$rendered = apply_filters("the_content", $raw);
echo (strpos($rendered, "&#038;") !== false && strpos($rendered, "topError") !== false) ? "BROKEN" : "OK";
'
```
Or equivalently: `curl` the rendered page and pipe the `<script>` block through `node --check`.

---

## 6. REVERT FILE CLEANLINESS

```
$ sed -n '/<script>/,/<\/script>/p' /tmp/post7-revert.html | grep -cP '[^\x00-\x7F]'
1
$ sed -n '/<script>/,/<\/script>/p' /tmp/post7-revert.html | grep -nP '[^\x00-\x7F]'
124: <td><button type="button" class="remove-pet" onclick="removePetRow(this)">×</button></td>
```
[VERIFIED — one non-ASCII byte: `×` (U+00D7 MULTIPLICATION SIGN, UTF-8 `c3 97`) in the `addPetRow()` template literal. This is intentional (the "remove row" button label). It's inside a JS template literal string, inside a TEXT token, inside the no-texturize zone. It does not affect parsing.]

---

## BOTTOM-LINE ANSWERS

**`node --check` on the broken script:** `exit 0 (passes)` — the raw JS is syntactically valid; the error is introduced at render time by wptexturize.

**The parse-breaking byte(s):** `wptexturize` converts `&&` (bytes `26 26`) to `&#038;&#038;` (bytes `26 23 30 33 38 3b 26 23 30 33 38 3b`) inside a false-positive TAG token. Location: CODE — line 1753 of post7-new.html, `if (topError && topError.focus)`. The `&&` is swallowed into a false "tag" created by `wp_html_split` matching the `<` comparison operator on line 1748 (`i < errorFields.length`) as the start of an HTML tag.

**Corruption originated in:** WordPress's `wptexturize` filter at render time. The Python script, heredoc, and raw post_content are all correct. The `<` comparison operators in the new scroll block JS code cause `wp_html_split`'s regex `<[^>]*>` to create false-positive tag tokens that swallow the `&&` operator, and `wptexturize` converts bare `&` inside tag tokens to `&#038;`.

---

## IMPLICATIONS FOR THE RE-FIX

Any JS code inside WordPress `post_content` `<script>` blocks must obey this constraint:

**Never place a `<` character (JS comparison) on a line that is followed — at any distance before the next `>` character — by `&&`, `&`, or any other character that `wptexturize` transforms.**

Practical rules for the scroll-fix redo:
1. Replace `i < errorFields.length` with `errorFields.length > i`
2. Replace `p < topPos` with `topPos > p`
3. Or: replace `&&` with a construct that doesn't contain `&` (e.g., nested `if` statements, or a helper function)
4. Add a render-time verification step to the deploy: `apply_filters("the_content", $raw)` and check for `&#038;` inside the `<script>` block
