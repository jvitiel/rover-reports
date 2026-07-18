# Volunteer Form Email Validator Swap — Deploy Report — 2026-07-18

Replaced the regex `isValidEmail` in posts 8 (EN) and 345 (ES) with the backslash-free charCodeAt validator.

---

## Step 1 — Extract

| Post | Bytes | SHA256 | Backslashes |
|------|-------|--------|-------------|
| 8 | 49,949 | `49cbc17f2004752bd6cacc312e3dc2cc50728ac0da2588dd6d07d52a2dd3c5e0` | 4 |
| 345 | 51,013 | `cbfa7d6e6878f7668544443657bf9cd0c1f64f3b900cff2cda4bc320cf5843f5` | 4 |

[VERIFIED — wc -c, sha256sum, awk backslash count]

Revert files: `/tmp/post8-revert.html`, `/tmp/post345-revert.html`

## Step 2 — Build

Python transform output:

```
post 8
 old validator matches: 1 (must be 1)
 backslashes in source: 4 (must be 4)
 old bytes: 49949
 new bytes: 50700
 wrote /tmp/post8-new.html
```
[VERIFIED]

### Diff (post 8) — ONLY isValidEmail changed

```diff
517,519c517,536
< if (!value) { return true; }
< return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
< }
---
>  if (!value) { return true; }
>  // charCodeAt validator -- NO regex, NO backslashes. The regex version of
>  // this function contained 4 backslashes; an unslashed save would delete
>  // them and silently break email validation, exactly as happened to the
>  // adoption form on 2026-07-06. Character codes cannot be corrupted that
>  // way. DO NOT rewrite this as a regex. DO NOT add backslashes to this page.
>  const s = String(value);
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
>  }
```
[VERIFIED — diff output shows only lines 517-519 changed]

### Diff (post 345) — identical change, shifted by 1 line

```diff
518,520c518,537
```
Same content diff as post 8. No Spanish text altered. [VERIFIED]

## Step 3 — Pre-Write Render Gate

| Post | Entity corruption | node --check |
|------|------------------|--------------|
| 8 | no entity corruption (0 `&#038;`) | exit 0 |
| 345 | no entity corruption (0 `&#038;`) | exit 0 |

[VERIFIED — apply_filters + node output]

## Step 4 — Post 8 Applied

```
Success: Updated post 8.
```

### Readback SHA256 Match

```
eef4192bc7e767faef59a6c2e012420a53170facd4a98a4809c901ed615ace1e  /tmp/post8-new.html
eef4192bc7e767faef59a6c2e012420a53170facd4a98a4809c901ed615ace1e  /tmp/post8-readback.html
```
[VERIFIED — byte-identical]

### Post 8 Checks

| Check | Result | Expected |
|-------|--------|----------|
| Backslashes | 0 | 0 ✓ |
| `s.charCodeAt(i)` count | 1 | 1 ✓ |
| `.test(value)` count | 0 | 0 ✓ |
| `updateSubmitState` count | 7 | ≥1 ✓ |

[VERIFIED]

### Post 8 Guard Alert (Expected #1 of 2)

```json
{
  "last_checked": "2026-07-18T17:15:04+00:00",
  "last_checked_id": 8,
  "last_alert": "2026-07-18T17:15:04+00:00",
  "last_alert_id": 8,
  "last_mail_result": "true",
  "last_problems": ["ESCAPES DESTROYED BY THIS SAVE: backslash count 4 -> 0..."]
}
```

Guard fired on the 4→0 backslash drop. Email sent. This is the expected one-time alert. [VERIFIED]

## Step 5 — Post 345 Applied

```
post 345
 old validator matches: 1 (must be 1)
 backslashes in source: 4 (must be 4)
 old bytes: 51013
 new bytes: 51764
 wrote /tmp/post345-new.html
```

### Readback SHA256 Match

```
8fff4d9e612ac7502319cb7c04c5a64fd171e2429a2e64f4c27d451a36d697eb  /tmp/post345-new.html
8fff4d9e612ac7502319cb7c04c5a64fd171e2429a2e64f4c27d451a36d697eb  /tmp/post345-readback.html
```
[VERIFIED — byte-identical]

### Post 345 Checks

| Check | Result | Expected |
|-------|--------|----------|
| Backslashes | 0 | 0 ✓ |
| `s.charCodeAt(i)` count | 1 | 1 ✓ |
| `.test(value)` count | 0 | 0 ✓ |
| `updateSubmitState` count | 7 | ≥1 ✓ |

[VERIFIED]

### Post 345 Guard Alert (Expected #2 of 2)

```json
{
  "last_checked": "2026-07-18T17:15:21+00:00",
  "last_checked_id": 345,
  "last_alert": "2026-07-18T17:15:21+00:00",
  "last_alert_id": 345,
  "last_mail_result": "true",
  "last_problems": ["ESCAPES DESTROYED BY THIS SAVE: backslash count 4 -> 0..."]
}
```

Guard fired second expected alert. Email sent. [VERIFIED]

## Step 6 — Served-Page Gate

Cache purged: `wp cache flush` + `wp sg purge` (both succeeded). [VERIFIED]

### /how-to-help/ (EN)

| Check | Result |
|-------|--------|
| node --check | exit 0 ✓ |
| `&#038;` count | 0 ✓ |
| `charCodeAt` count | 2 (comment + code) ✓ |
| `.test(value)` count | 0 ✓ |

[VERIFIED — curl + extraction + node]

### /es/como-ayudar/ (ES)

| Check | Result |
|-------|--------|
| node --check | exit 0 ✓ |
| `&#038;` count | 0 ✓ |
| `charCodeAt` count | 2 (comment + code) ✓ |
| `.test(value)` count | 0 ✓ |

[VERIFIED — curl + extraction + node]

### HTTP Status

```
/how-to-help/:    HTTP/2 200
/es/como-ayudar/: HTTP/2 200
/:                HTTP/2 200
```
[VERIFIED]

## Step 7 — Record

### 7a — Revert Commands

```
wp post update 8 /tmp/post8-revert.html
wp post update 345 /tmp/post345-revert.html
```

### 7b — Guard SHA256s (All Untouched)

| File | SHA256 | Status |
|------|--------|--------|
| 4lg-adopt-form-guard.php | `f8366c50acef25a19976f9ca381501f749e7eba422d2b917f3da0d4f9f12eb44` | unchanged ✓ |
| 4lg-disable-user-enumeration.php | `d910154a5646b324f19b0600d4436fbee7020997c3df843eb22a8cc426953663` | unchanged ✓ |
| 4lg-volunteer-form-guard.php | `087f78ad14a5b4b29de6edbffb4388a1d0320e545005487681735e7fc58979ec` | unchanged ✓ |

[VERIFIED]

### 7c — Untouched Posts

```
Post 7 modified:   2026-07-18 15:16:29 UTC  (scroll-fix V2 from earlier today)
Post 339 modified: 2026-07-18 15:16:50 UTC  (scroll-fix V2 from earlier today)
Post 494 modified: 2026-07-18 01:31:45 UTC  (guard testing from earlier today)
```

None modified by this operation. [VERIFIED]

### 7d — Guard Alert Count

**Exactly 2 alerts fired:**

1. Post 8 at `2026-07-18T17:15:04+00:00` — `last_mail_result: "true"`
2. Post 345 at `2026-07-18T17:15:21+00:00` — `last_mail_result: "true"`

Both alerts were the expected "ESCAPES DESTROYED BY THIS SAVE: backslash count 4 -> 0" message from the planned validator swap. Both emails sent successfully. [VERIFIED]

### 7e — Final Backslash Counts

```
Post 8:   0 backslashes
Post 345: 0 backslashes
```

Both posts now contain zero backslashes. `wp_unslash()` is a no-op on these pages going forward. [VERIFIED]

---

## Post Sizes After Swap

| Post | Before | After | Delta |
|------|--------|-------|-------|
| 8 | 49,949 | 50,700 | +751 |
| 345 | 51,013 | 51,764 | +751 |

---

## Summary Answers

1. **Post 8 served node --check:** pass
2. **Post 345 served node --check:** pass
3. **&#038; in either served script:** no
4. **Guard alerts fired (expect exactly 2):** 2
