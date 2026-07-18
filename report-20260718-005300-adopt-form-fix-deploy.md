# Adoption Form Fix Deploy — 2026-07-18

## Step 1 — Extract and Baseline

### Post 7 (EN, /adopt/)

```
$ wp eval-file /tmp/x7cur.php
post7: 76576 bytes

$ wc -c /tmp/post7-current.html
76576 /tmp/post7-current.html

$ sha256sum /tmp/post7-current.html
996c71f7453f5405cbd5f50f8f155e68ffd119f7a4ad7e8aa1d0f28c4f9e8d72  /tmp/post7-current.html

$ awk '{n+=gsub(/\\/,"")} END{print n+0}' /tmp/post7-current.html
0
```

[VERIFIED] — 76576 bytes, 0 backslashes. Gate passed.

### Post 339 (ES, /es/adopta-una-mascota/)

```
$ wp eval-file /tmp/x339cur.php
post339: 79919 bytes

$ wc -c /tmp/post339-current.html
79919 /tmp/post339-current.html

$ sha256sum /tmp/post339-current.html
cd9c95f91106462366af9ac9cb24c152e4549c9364798694af2b3bd484cfecf7  /tmp/post339-current.html

$ awk '{n+=gsub(/\\/,"")} END{print n+0}' /tmp/post339-current.html
0
```

[VERIFIED] — 79919 bytes, 0 backslashes. Gate passed.

Revert copies preserved at `/tmp/post7-revert.html` and `/tmp/post339-revert.html`.

---

## Step 2 — Build and Run fix-adopt.py (Post 7)

Script `/tmp/fix-adopt.py` written with quoted heredoc. Two replacements:
1. `<form id="adoptionForm">` → `<form id="adoptionForm" method="post" novalidate>`
2. Corrupted `isValidEmail` regex → charCode-based validator (zero backslashes by design)

```
$ python3 /tmp/fix-adopt.py 7
post 7
 isValidEmail line matches: 1 (must be 1)
 form tag matches: 1 (must be 1)
 backslashes in source: 0 (must be 0)
 old bytes: 76576
 new bytes: 78018
 delta: +1442
 wrote /tmp/post7-new.html
```

[VERIFIED] — all preconditions met.

```
$ sha256sum /tmp/post7-new.html
607b91e38db8d0961001455cb295f3a6f1b1769a220649c6911dfe2977be5760  /tmp/post7-new.html
```

### Diff (post 7)

```
$ diff /tmp/post7-current.html /tmp/post7-new.html
750c750
<     <form id="adoptionForm">
---
>     <form id="adoptionForm" method="post" novalidate>
1751c1751,1779
<       return /^[^s@]+@[^s@]+.[^s@]+$/.test(email);
---
>       // Email format check -- deliberately NO regex and NO backslash escapes.
>  //
>  // This code lives in WordPress post_content. Any programmatic save that
>  // calls wp_update_post() without wp_slash() runs wp_unslash() across the
>  // whole content and deletes every lone backslash. On 2026-07-06 a save did
>  // exactly that: this function's character class went from [^BACKSLASH-s@]
>  // ("not whitespace, not at-sign") to [^s@] ("not the letter s, not
>  // at-sign"). For eleven days the form told every applicant with an "s"
>  // before the "@" -- Smith, Jones, Sanchez, Chris, Jessica -- that their own
>  // email address was invalid. No way for them to proceed, no error reaching
>  // the shelter. Roughly as many applications were blocked as received.
>  // Nobody wrote that bug. A save did. Reproduced on probe post 494.
>  //
>  // Character codes cannot be corrupted that way. The post_content of this
>  // page contains zero backslashes by design. Keep it that way.
>  // DO NOT rewrite this as a regex. DO NOT add escape sequences to this page.
>  const s = String(email);
>  for (let i = 0; i < s.length; i++) {
>  const c = s.charCodeAt(i);
>  if (c === 32 || c === 160 || (c >= 9 && c <= 13)) return false;
>  }
>  const at = s.indexOf('@');
>  if (at < 1) return false;
>  if (s.indexOf('@', at + 1) !== -1) return false;
>  const domain = s.slice(at + 1);
>  const dot = domain.lastIndexOf('.');
>  if (dot < 1) return false;
>  if (dot === domain.length - 1) return false;
>  return true;
```

[VERIFIED] — exactly two changes. No other content altered.

---

## Step 3 — Apply to Post 7

```
$ wp post update 7 /tmp/post7-new.html
Success: Updated post 7.
```

[VERIFIED]

---

## Step 4 — Verify Post 7 Readback

```
$ sha256sum /tmp/post7-new.html /tmp/post7-readback.html
607b91e38db8d0961001455cb295f3a6f1b1769a220649c6911dfe2977be5760  /tmp/post7-new.html
607b91e38db8d0961001455cb295f3a6f1b1769a220649c6911dfe2977be5760  /tmp/post7-readback.html
```

**SHA256 MATCH.** Stored content is byte-identical to the file that was written. [VERIFIED]

```
$ wc -c /tmp/post7-readback.html
78018 /tmp/post7-readback.html

$ awk '{n+=gsub(/\\/,"")} END{print n+0}' /tmp/post7-readback.html
0

$ grep -c 'method="post" novalidate' /tmp/post7-readback.html
1

$ grep -c 'charCodeAt' /tmp/post7-readback.html
1

$ grep -c 'DO NOT rewrite this as a regex' /tmp/post7-readback.html
1

$ grep -c 'isValidEmail' /tmp/post7-readback.html
2
```

All 7 checks pass. [VERIFIED]

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| 4a. sha256 match | identical | identical | YES |
| 4b. wc -c | 78018 | 78018 | YES |
| 4c. backslash count | 0 | 0 | YES |
| 4d. novalidate | 1 | 1 | YES |
| 4e. charCodeAt | 1 | 1 | YES |
| 4f. DO NOT rewrite | 1 | 1 | YES |
| 4g. isValidEmail | 2 | 2 | YES |

**Post 7 gate: CLEARED.**

---

## Step 5 — Polylang Cross-Check

```
$ sha256sum /tmp/post339-current.html /tmp/post339-check.html
cd9c95f91106462366af9ac9cb24c152e4549c9364798694af2b3bd484cfecf7  /tmp/post339-current.html
cd9c95f91106462366af9ac9cb24c152e4549c9364798694af2b3bd484cfecf7  /tmp/post339-check.html
```

**SHA256 MATCH.** Post 339 was not modified by the post 7 save. Polylang did not sync post_content. [VERIFIED]

---

## Step 6 — Post 339 (Spanish)

### Build

```
$ python3 /tmp/fix-adopt.py 339
post 339
 isValidEmail line matches: 1 (must be 1)
 form tag matches: 1 (must be 1)
 backslashes in source: 0 (must be 0)
 old bytes: 79919
 new bytes: 81361
 delta: +1442
 wrote /tmp/post339-new.html
```

[VERIFIED] — all preconditions met. Delta identical to post 7 (+1442 bytes).

### Diff (post 339)

```
$ diff /tmp/post339-current.html /tmp/post339-new.html
783c783
<     <form id="adoptionForm">
---
>     <form id="adoptionForm" method="post" novalidate>
1784c1784,1812
<       return /^[^s@]+@[^s@]+.[^s@]+$/.test(email);
---
>       // Email format check -- deliberately NO regex and NO backslash escapes.
>  //
>  // This code lives in WordPress post_content. Any programmatic save that
>  // calls wp_update_post() without wp_slash() runs wp_unslash() across the
>  // whole content and deletes every lone backslash. On 2026-07-06 a save did
>  // exactly that: this function's character class went from [^BACKSLASH-s@]
>  // ("not whitespace, not at-sign") to [^s@] ("not the letter s, not
>  // at-sign"). For eleven days the form told every applicant with an "s"
>  // before the "@" -- Smith, Jones, Sanchez, Chris, Jessica -- that their own
>  // email address was invalid. No way for them to proceed, no error reaching
>  // the shelter. Roughly as many applications were blocked as received.
>  // Nobody wrote that bug. A save did. Reproduced on probe post 494.
>  //
>  // Character codes cannot be corrupted that way. The post_content of this
>  // page contains zero backslashes by design. Keep it that way.
>  // DO NOT rewrite this as a regex. DO NOT add escape sequences to this page.
>  const s = String(email);
>  for (let i = 0; i < s.length; i++) {
>  const c = s.charCodeAt(i);
>  if (c === 32 || c === 160 || (c >= 9 && c <= 13)) return false;
>  }
>  const at = s.indexOf('@');
>  if (at < 1) return false;
>  if (s.indexOf('@', at + 1) !== -1) return false;
>  const domain = s.slice(at + 1);
>  const dot = domain.lastIndexOf('.');
>  if (dot < 1) return false;
>  if (dot === domain.length - 1) return false;
>  return true;
```

[VERIFIED] — exactly two changes, at different line numbers (783 and 1784 vs 750 and 1751 in post 7, matching the different form/script positions in the Spanish version). No Spanish labels, error messages, or `data.language = 'es'` altered.

### Apply and Verify

```
$ wp post update 339 /tmp/post339-new.html
Success: Updated post 339.

$ sha256sum /tmp/post339-new.html /tmp/post339-readback.html
3381bf9170c88a4c4893fc59f0d6dc426006f7793f10cca31bea78bd62e350c8  /tmp/post339-new.html
3381bf9170c88a4c4893fc59f0d6dc426006f7793f10cca31bea78bd62e350c8  /tmp/post339-readback.html

$ awk '{n+=gsub(/\\/,"")} END{print n+0}' /tmp/post339-readback.html
0

$ grep -c 'method="post" novalidate' /tmp/post339-readback.html
1

$ grep -c 'charCodeAt' /tmp/post339-readback.html
1
```

**SHA256 MATCH.** All checks pass. [VERIFIED]

---

## Step 7 — Cache Purge and Live Verification

### Purge

```
$ wp cache flush
Success: The cache was flushed.

$ wp sg purge
Success: Speed Optimizer by SiteGround assets folder purged successfully.
Warning: Unable to Purge File Cache. Please make sure it is enabled.
Success: Dynamic Cache Successfully Purged.
```

[VERIFIED] — WP object cache flushed, SG dynamic cache purged.

### Live Checks — EN (/adopt/)

```
$ curl -s https://www.fourlegsgoodnynj.org/adopt/ | grep -c 'method="post" novalidate'
1

$ curl -s https://www.fourlegsgoodnynj.org/adopt/ | grep -c 'charCodeAt'
1

$ curl -s https://www.fourlegsgoodnynj.org/adopt/ | grep -c 'test(email)'
0

$ curl -sI https://www.fourlegsgoodnynj.org/adopt/
HTTP/2 200
server: nginx
date: Sat, 18 Jul 2026 00:56:05 GMT
content-type: text/html; charset=UTF-8

Rendered page size: 133676 bytes
```

[VERIFIED] — novalidate present, charCodeAt present, old regex GONE from live page, HTTP 200.

### Live Checks — ES (/es/adopta-una-mascota/)

```
$ curl -s https://www.fourlegsgoodnynj.org/es/adopta-una-mascota/ | grep -c 'method="post" novalidate'
1

$ curl -s https://www.fourlegsgoodnynj.org/es/adopta-una-mascota/ | grep -c 'charCodeAt'
1

$ curl -s https://www.fourlegsgoodnynj.org/es/adopta-una-mascota/ | grep -c 'test(email)'
0

$ curl -sI https://www.fourlegsgoodnynj.org/es/adopta-una-mascota/
HTTP/2 200
server: nginx
date: Sat, 18 Jul 2026 00:56:06 GMT
content-type: text/html; charset=UTF-8

Rendered page size: 137861 bytes
```

[VERIFIED] — same results on Spanish page. Old regex GONE.

### Homepage

```
$ curl -sI https://www.fourlegsgoodnynj.org/
HTTP/2 200
server: nginx
date: Sat, 18 Jul 2026 00:56:07 GMT
```

[VERIFIED] — homepage unaffected, HTTP 200.

---

## Step 8 — Record

### 8a. Replacement isValidEmail function (verbatim from post 7 readback)

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

[VERIFIED] — extracted from database via `wp post get 7 --field=content`. Contains both the code and the DO-NOT-REWRITE comment.

### 8b. Revert commands

```
wp post update 7 /tmp/post7-revert.html
wp post update 339 /tmp/post339-revert.html
```

Full absolute paths on the WordPress server. These restore the pre-fix content (76576 bytes for post 7, 79919 bytes for post 339).

### 8c. Durable fallback revisions

```
$ wp db query "SELECT ID, post_parent, post_status, LENGTH(post_content) AS len FROM cqu_posts WHERE ID IN (492, 493, 494)" --skip-column-names
492	7	inherit	76576
493	339	inherit	79919
494	0	draft	454
```

Revision 492 (post 7, 76576 bytes) and revision 493 (post 339, 79919 bytes) exist as inheritable revisions. These contain the pre-fix content and survive `/tmp` cleanup. [VERIFIED]

### 8d. Probe post 494

Post 494: status `draft`, 454 bytes, post_parent 0 (standalone). Untouched. [VERIFIED]

---

## Summary

| Post | Pre-fix bytes | Post-fix bytes | Delta | sha256 readback match | Backslashes | Live `test(email)` |
|------|-------------|---------------|-------|----------------------|-------------|-------------------|
| 7 (EN) | 76,576 | 78,018 | +1,442 | YES | 0 | 0 (old regex gone) |
| 339 (ES) | 79,919 | 81,361 | +1,442 | YES | 0 | 0 (old regex gone) |

Two string replacements applied to each of two posts. No other content altered. Both pages serving the new validator live. The broken regex that rejected emails containing the letter "s" has been replaced with a charCode-based check that cannot be corrupted by WordPress's `wp_unslash()` pipeline.
