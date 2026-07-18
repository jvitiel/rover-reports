# Adoption Form Scroll-Fix V2 Deploy — 2026-07-18

Fixed `validateForm()` in posts 7 (EN) and 339 (ES) to scroll to the topmost failing field by document position. This is V2 — the first attempt shipped a SyntaxError because `wptexturize` converted `&&` inside a false-positive HTML tag created by `<` comparison operators. This version uses `>` (high-side-first) comparisons and nested `if` instead of `&&`, and was gated with render-time + served-page verification.

---

## Change Summary

**Root cause addressed:** WordPress's `wp_html_split` regex `<[^>]*>` treats JS `<` comparison operators as HTML tag openers, creating false tag tokens. `wptexturize` converts `&` to `&#038;` inside tag tokens. V1 had `i < errorFields.length` + `topError && topError.focus` — the `<` swallowed the `&&`. V2 avoids both: comparisons are `errorFields.length > i` and `topPos > p` (no `<`); the focus guard is `if (topError) { if (topError.focus) { ... } }` (no `&&`).

**Functional change:** Same as V1 — collects all failing fields into `errorFields[]`, picks the topmost by `getBoundingClientRect().top + window.scrollY`, scrolls with `window.scrollTo` and a -100px header offset, focuses the field.

---

## Step 1 — Extract

```
post 7: 78052 bytes     sha256: 1d1e02504e0de15e2128fb03948c2a9b86bf3d5e965588926e022fe9bdafb044
post 339: 81396 bytes   sha256: 36628c82a9f4d1b706d1d351db503131b994afe8e4e8b8b98df06fbcb76b7846
backslashes: 0 / 0
```
[VERIFIED]

---

## Step 2 — Transform Post 7

```
post 7
 "let firstError = null;": 1 (must be 1)
 assignment lines: 5 (must be 5)
 firstError refs: 13 (must be 13)
 backslashes: 0 (must be 0)
 push conversions: 5 (must be 5)
 scroll-block conversions: 1 (must be 1)
 inserted block: no less-than, no ampersand [OK]
 old bytes: 78052
 new bytes: 79568
 wrote /tmp/post7-new.html
```
[VERIFIED — all preconditions, conversions, and character-safety assertions passed]

### Full diff post 7:

```
1679c1679
<       let firstError = null;
---
>       const errorFields = [];
1691c1691
<           if (!firstError) firstError = input;
---
>           errorFields.push(input);
1700c1700
<         if (!firstError) firstError = emailInput;
---
>         errorFields.push(emailInput);
1709c1709
<           if (!firstError) firstError = checkbox;
---
>           errorFields.push(checkbox);
1719c1719
<         if (!firstError) firstError = container;
---
>         errorFields.push(container);
1732c1732
<         if (!firstError) firstError = document.querySelector(`[name="${AGREEMENT_CHECKBOXES[0]}"]`);
---
>         errorFields.push(document.querySelector(`[name="${AGREEMENT_CHECKBOXES[0]}"]`));
1735,1737c1735,1759
<       // Scroll to first error
<       if (firstError) {
<         firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
---
>       // Scroll to the topmost failing field by DOCUMENT position, then focus it.
>       // [16-line comment block explaining the wptexturize constraint]
>       if (errorFields.length) {
>         let topError = errorFields[0];
>         let topPos = topError.getBoundingClientRect().top + window.scrollY;
>         for (let i = 1; errorFields.length > i; i++) {
>           const p = errorFields[i].getBoundingClientRect().top + window.scrollY;
>           if (topPos > p) { topPos = p; topError = errorFields[i]; }
>         }
>         window.scrollTo({ top: Math.max(0, topPos - 100), behavior: 'smooth' });
>         if (topError) { if (topError.focus) { topError.focus({ preventScroll: true }); } }
```
[VERIFIED — only validateForm() body changed; no isValidEmail, no form tag, no field changes; comparisons use > not <; no && operator]

---

## Step 3 — Pre-Write Render Gate (Post 7)

```
no entity corruption
extracted 15282 bytes of JS to /tmp/rendered-extracted.js
node exit: 0
```
[VERIFIED — `apply_filters("the_content", $raw)` produced clean JS; `node --check` passed]

topError context in rendered JS:
```
237:        let topError = errorFields[0];
238:        let topPos = topError.getBoundingClientRect().top + window.scrollY;
241:          if (topPos > p) { topPos = p; topError = errorFields[i]; }
244:        if (topError) { if (topError.focus) { topError.focus({ preventScroll: true }); } }
```
[VERIFIED — nested `if`, no `&&`, no `&#038;`]

---

## Step 4 — Apply and Verify Post 7

```
Success: Updated post 7.
```

### sha256 readback:
```
30cf946788ec45bfe2b325a3af5d844a3e7d0e285a418bf5954fd60d6a2eb534  /tmp/post7-new.html
30cf946788ec45bfe2b325a3af5d844a3e7d0e285a418bf5954fd60d6a2eb534  /tmp/post7-readback.html
```
[VERIFIED — byte-identical]

| Check | Expected | Got |
|-------|----------|-----|
| 4a. backslashes | 0 | 0 |
| 4b. firstError | 0 | 0 |
| 4c. window.scrollTo | 1 | 1 |
| 4d. charCodeAt | 1 | 1 |
| 4e. novalidate | 1 | 1 |

[VERIFIED]

4f. Guard: `{"last_checked":"2026-07-18T15:16:29+00:00","last_checked_id":7,"last_problems":[],"last_alert":"2026-07-18T01:31:35+00:00","last_alert_id":494,"last_mail_result":"true"}` — last_problems empty, no new alert. [VERIFIED]

---

## Step 5 — Post 339

### Transform:
```
post 339
 "let firstError = null;": 1 (must be 1)
 assignment lines: 5 (must be 5)
 firstError refs: 13 (must be 13)
 backslashes: 0 (must be 0)
 push conversions: 5 (must be 5)
 scroll-block conversions: 1 (must be 1)
 inserted block: no less-than, no ampersand [OK]
 old bytes: 81396
 new bytes: 82912
 wrote /tmp/post339-new.html
```
[VERIFIED]

### Render gate:
```
no entity corruption
extracted 15325 bytes of JS to /tmp/rendered-extracted.js
node exit: 0
```
[VERIFIED]

### Diff (same structure, no Spanish text altered):
```
1712c1712:  let firstError → const errorFields
1724,1733,1742,1752,1765:  five if (!firstError) → errorFields.push(...)
1768-1770 → 1768-1792:  scroll block replaced (identical to post 7)
```
[VERIFIED]

### sha256 readback:
```
d8a95aadbf72ff659c30543e3a4d9b135e64b87cbc5a704d5651f7f8c1e260fc  /tmp/post339-new.html
d8a95aadbf72ff659c30543e3a4d9b135e64b87cbc5a704d5651f7f8c1e260fc  /tmp/post339-readback.html
```
[VERIFIED — byte-identical]

All 4a-4e checks pass (same values as post 7). Guard: `{"last_checked":"2026-07-18T15:16:50+00:00","last_checked_id":339,"last_problems":[],...}` — clean. [VERIFIED]

---

## Step 6 — THE AUTHORITATIVE GATE: THE SERVED PAGE

### 6a. Cache purge:
```
wp cache flush: Success
wp sg purge: Dynamic Cache Successfully Purged
```
[VERIFIED]

### 6b. Served-page node --check:

Extraction method: `re.finditer` over ALL `<script>` blocks in the served HTML, selecting the one containing `errorFields` or `validateForm`. This avoids the JSON-LD schema script that was the first `<script>` match.

| Language | Extracted bytes | node --check | &#038; count |
|----------|----------------|-------------|-------------|
| EN /adopt/ | 15,281 | exit 0 (PASS) | 0 |
| ES /es/adopta-una-mascota/ | 15,314 | exit 0 (PASS) | 0 |

[VERIFIED — both served pages parse cleanly, zero HTML entities in JS]

### 6c. Feature presence in served scripts:

| Check | EN | ES |
|-------|----|----|
| charCodeAt | 1 | 1 |
| window.scrollTo | 1 | 1 |

[VERIFIED]

### 6d. topError context in served scripts:

EN and ES both identical:
```
237:        let topError = errorFields[0];
238:        let topPos = topError.getBoundingClientRect().top + window.scrollY;
241:          if (topPos > p) { topPos = p; topError = errorFields[i]; }
244:        if (topError) { if (topError.focus) { topError.focus({ preventScroll: true }); } }
```
[VERIFIED — `if (topError) { if (topError.focus)` pattern (nested if, no &&), `topPos > p` (high-side-first, no <), zero `&#038;` anywhere near topError]

### HTTP status:
```
/adopt/: HTTP/2 200
/es/adopta-una-mascota/: HTTP/2 200
homepage: HTTP/2 200
```
[VERIFIED]

---

## Step 7 — Record

### 7a. Revert commands:
```
wp post update 7 /tmp/post7-revert.html
wp post update 339 /tmp/post339-revert.html
```

Durable fallback revisions (pre-today's scroll saves):
- Post 7: revision 501 (2026-07-18 00:54:59 — email fix deploy, before any scroll work)
- Post 339: revision 502 (2026-07-18 00:55:40)

### 7b. mu-plugins untouched:
```
d910154a5646b324f19b0600d4436fbee7020997c3df843eb22a8cc426953663  4lg-disable-user-enumeration.php
f8366c50acef25a19976f9ca381501f749e7eba422d2b917f3da0d4f9f12eb44  4lg-adopt-form-guard.php
```
[VERIFIED — 4lg-disable-user-enumeration.php matches expected hash exactly]

### 7c. Untouched posts:
```
post 8: 2026-05-27 19:44:29
post 345: 2026-05-27 19:47:47
post 494: 2026-07-18 01:31:45
```
[VERIFIED — none modified by this deploy]

### 7d. Did the served-page gate pass on both languages?

**YES.** Both EN and ES served pages pass `node --check` with exit 0, contain zero `&#038;` entities, and show the correct `topError` pattern with `>` comparisons and nested `if` (no `&&`). The fix is live and working.

---

## Size Delta

| Post | Before | After | Delta |
|------|--------|-------|-------|
| 7 (EN) | 78,052 | 79,568 | +1,516 |
| 339 (ES) | 81,396 | 82,912 | +1,516 |

Both grew by exactly 1,516 bytes. [VERIFIED]

---

post 7 served-page node --check: pass
post 339 served-page node --check: pass
&#038; in either served script: no
reverted due to gate failure: no
