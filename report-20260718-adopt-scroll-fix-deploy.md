# Adoption Form Scroll-Fix Deploy — 2026-07-18

Fixed `validateForm()` in posts 7 (EN) and 339 (ES) to scroll to the topmost failing field by document position, replacing the old "first to fail in validation order wins" logic.

---

## Change Summary

**Old behavior:** `let firstError = null;` assigned once per failing field with `if (!firstError)` guard. Scroll target was the first failing field in VALIDATION order (text → email → checkbox → radio → agreement). `digital_signature_name` (text field, step 1) sits at the BOTTOM of the form DOM, so if it was empty it captured `firstError` before top-of-form fields like `age_confirmed` or `animal_type` were evaluated.

**New behavior:** `const errorFields = [];` collects ALL failing fields. After validation, a simple loop finds the element with the smallest `getBoundingClientRect().top + window.scrollY` (topmost in document). `window.scrollTo()` with a `-100` offset clears the fixed site header. `focus({ preventScroll: true })` anchors the cursor for keyboard users and ensures resubmit reliability.

---

## Step 1 — Extract

```
post 7: 78052 bytes
post 339: 81396 bytes
```
[VERIFIED]

```
sha256sum:
1d1e02504e0de15e2128fb03948c2a9b86bf3d5e965588926e022fe9bdafb044  /tmp/post7-current.html
36628c82a9f4d1b706d1d351db503131b994afe8e4e8b8b98df06fbcb76b7846  /tmp/post339-current.html
```
[VERIFIED]

Backslash counts: post 7 = 0, post 339 = 0 [VERIFIED]

---

## Step 2 — Build and Transform Post 7

```
post 7
 "let firstError = null;" count: 1 (must be 1)
 assignment-line count: 5 (must be 5)
 total firstError references: 13 (must be 13)
 backslashes in source: 0 (must be 0)
 push conversions: 5 (must be 5)
 scroll-block conversions: 1 (must be 1)
 old bytes: 78052
 new bytes: 79081
 wrote /tmp/post7-new.html
```
[VERIFIED — all preconditions and postconditions passed]

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
1735,1738c1735,1754
<       // Scroll to first error
<       if (firstError) {
<         firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
<       }
---
>       // Scroll to the topmost failing field by DOCUMENT position, then focus it.
>  // errorFields is filled in check-order, which is NOT document order:
>  // digital_signature_name is validated with the text fields (first) but sits
>  // at the BOTTOM of the form, so the old "first to fail wins" logic scrolled
>  // to the bottom when a top field like animal_type or age_confirmed was the
>  // real problem, and never scrolled back up on resubmit. Sorting by
>  // getBoundingClientRect().top makes the scroll land on the highest failing
>  // field regardless of validation order. The -100 offset clears the fixed
>  // site header so the field is not hidden beneath it. Focus gives the user a
>  // cursor on the field to fix and makes resubmit reliable across browsers.
>  if (errorFields.length) {
>  let topError = errorFields[0];
>  let topPos = topError.getBoundingClientRect().top + window.scrollY;
>  for (let i = 1; i < errorFields.length; i++) {
>  const p = errorFields[i].getBoundingClientRect().top + window.scrollY;
>  if (p < topPos) { topPos = p; topError = errorFields[i]; }
>  }
>  window.scrollTo({ top: Math.max(0, topPos - 100), behavior: 'smooth' });
>  if (topError && topError.focus) { topError.focus({ preventScroll: true }); }
>  }
```
[VERIFIED — only validateForm() body changed; no isValidEmail, no form tag, no field changes]

---

## Step 3 — Apply and Verify Post 7

```
Success: Updated post 7.
```

### sha256 readback match:
```
c0e2ad21644ff4ae2febbe851c58b0a3c4f67ed4d07c26852d1d3918837ed4b5  /tmp/post7-new.html
c0e2ad21644ff4ae2febbe851c58b0a3c4f67ed4d07c26852d1d3918837ed4b5  /tmp/post7-readback.html
```
[VERIFIED — byte-identical]

### Verification checks:
- 3a. Backslash count: 0 [VERIFIED]
- 3b. firstError count: 0 [VERIFIED]
- 3c. window.scrollTo count: 1 [VERIFIED]
- 3d. charCodeAt count: 1 [VERIFIED]
- 3e. novalidate count: 1 [VERIFIED]
- 3f. Guard state: `{"last_checked":"2026-07-18T14:35:18+00:00","last_checked_id":7,"last_problems":[],"last_alert":"2026-07-18T01:31:35+00:00","last_alert_id":494,"last_mail_result":"true"}` [VERIFIED — last_problems empty, no new alert, last_alert unchanged from earlier post-494 test]

---

## Step 4 — Post 339 (Spanish)

### Transform output:
```
post 339
 "let firstError = null;" count: 1 (must be 1)
 assignment-line count: 5 (must be 5)
 total firstError references: 13 (must be 13)
 backslashes in source: 0 (must be 0)
 push conversions: 5 (must be 5)
 scroll-block conversions: 1 (must be 1)
 old bytes: 81396
 new bytes: 82425
 wrote /tmp/post339-new.html
```
[VERIFIED — all preconditions and postconditions passed]

### Full diff post 339:
```
1712c1712
<       let firstError = null;
---
>       const errorFields = [];
1724c1724
<           if (!firstError) firstError = input;
---
>           errorFields.push(input);
1733c1733
<         if (!firstError) firstError = emailInput;
---
>         errorFields.push(emailInput);
1742c1742
<           if (!firstError) firstError = checkbox;
---
>           errorFields.push(checkbox);
1752c1752
<         if (!firstError) firstError = container;
---
>         errorFields.push(container);
1765c1765
<         if (!firstError) firstError = document.querySelector(`[name="${AGREEMENT_CHECKBOXES[0]}"]`);
---
>         errorFields.push(document.querySelector(`[name="${AGREEMENT_CHECKBOXES[0]}"]`));
1768,1771c1768,1787
<       // Scroll to first error
<       if (firstError) {
<         firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
<       }
---
>       // Scroll to the topmost failing field by DOCUMENT position, then focus it.
>  [... identical replacement block ...]
```
[VERIFIED — same structural changes, no Spanish text altered]

### sha256 readback match:
```
e9194eb46fdcbd891c8e626e88c27e776cea17a6227cd090ce24c46ddb37ca8c  /tmp/post339-new.html
e9194eb46fdcbd891c8e626e88c27e776cea17a6227cd090ce24c46ddb37ca8c  /tmp/post339-readback.html
```
[VERIFIED — byte-identical]

### Verification checks:
- 3a. Backslash count: 0 [VERIFIED]
- 3b. firstError count: 0 [VERIFIED]
- 3c. window.scrollTo count: 1 [VERIFIED]
- 3d. charCodeAt count: 1 [VERIFIED]
- 3e. novalidate count: 1 [VERIFIED]
- 3f. Guard state: `{"last_checked":"2026-07-18T14:35:36+00:00","last_checked_id":339,"last_problems":[],"last_alert":"2026-07-18T01:31:35+00:00","last_alert_id":494,"last_mail_result":"true"}` [VERIFIED — last_problems empty, no new alert]

---

## Step 5 — Purge and Live-Verify

Cache purge: `wp cache flush` + `wp sg purge` (dynamic cache purged successfully) [VERIFIED]

| Check | EN /adopt/ | ES /es/adopta-una-mascota/ |
|-------|-----------|---------------------------|
| window.scrollTo count | 1 | 1 |
| firstError count | 0 | 0 |
| HTTP status | 200 | 200 |

Homepage: HTTP/2 200 [VERIFIED]

---

## Step 6 — Record

### 6a. Revert commands:
```
wp post update 7 /tmp/post7-revert.html
wp post update 339 /tmp/post339-revert.html
```

### 6b. mu-plugins untouched:
```
d910154a5646b324f19b0600d4436fbee7020997c3df843eb22a8cc426953663  wp-content/mu-plugins/4lg-disable-user-enumeration.php
f8366c50acef25a19976f9ca381501f749e7eba422d2b917f3da0d4f9f12eb44  wp-content/mu-plugins/4lg-adopt-form-guard.php
```
[VERIFIED — 4lg-disable-user-enumeration.php sha256 matches expected hash exactly]

### 6c. Untouched posts:
```
post 8: 2026-05-27 19:44:29
post 345: 2026-05-27 19:47:47
post 494: 2026-07-18 01:31:45
```
[VERIFIED — none modified by this deploy]

---

## Size Delta

| Post | Before | After | Delta |
|------|--------|-------|-------|
| 7 (EN) | 78,052 | 79,081 | +1,029 |
| 339 (ES) | 81,396 | 82,425 | +1,029 |

Both posts grew by exactly 1,029 bytes (the scroll block comment + position logic replacing the 4-line scrollIntoView block). [VERIFIED]
