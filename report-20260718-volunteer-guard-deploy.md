# Volunteer Form Guard — Deploy Report — 2026-07-18

New mu-plugin `4lg-volunteer-form-guard.php` installed to watch posts 8 (EN) and 345 (ES) for content-corruption patterns.

---

## Step 2 — Lint

```
$ php -l /tmp/4lg-volunteer-form-guard.php
No syntax errors detected in /tmp/4lg-volunteer-form-guard.php
```
[VERIFIED]

## Step 3a — ABSPATH Guard

```
$ php -r 'require "/tmp/4lg-volunteer-form-guard.php";'
(silent exit, code 0)
```
Undefined ABSPATH triggers `exit` before any function/hook registration. [VERIFIED]

## Step 3b — Redeclare Test (Both Guards Loaded Together)

```
$ php -r 'define("ABSPATH","/tmp/"); function wp_unslash($v){return $v;} function add_filter(...){} require "/tmp/adopt-guard-copy.php"; require "/tmp/4lg-volunteer-form-guard.php"; echo "BOTH LOADED, NO REDECLARE\n";'
BOTH LOADED, NO REDECLARE
```

No function name collision. Adoption guard uses `fourlg_guard_*`, volunteer guard uses `fourlg_vol_guard_*`. [VERIFIED]

## Step 3c — Logic Test (8 Cases)

```
healthy pre-swap (4 bs, unchanged)            -> 0 problem(s)
healthy post-swap (0 bs, unchanged)           -> 0 problem(s)
THE SWAP (4 bs -> 0 bs)                       -> 1 problem(s)
  - ESCAPES DESTROYED BY THIS SAVE: backslash count 1 -> 0. Eith
validator killed (isValidEmail gone)          -> 1 problem(s)
  - EMAIL VALIDATOR GONE: function isValidEmail is no longer pre
submit-enable killed                          -> 1 problem(s)
  - SUBMIT-ENABLE LOGIC GONE: updateSubmitState is no longer pre
backslash introduced (0 -> 2)                 -> 1 problem(s)
  - BACKSLASHES INTRODUCED BY THIS SAVE: count 0 -> 2. Corruptib
wptexturize risk (< before & in JS)           -> 1 problem(s)
  - WPTEXTURIZE CORRUPTION RISK: the script contains a less-than
form removed entirely                         -> 2 problem(s)
  - ESCAPES DESTROYED BY THIS SAVE: backslash count 1 -> 0. Eith
  - THE VOLUNTEER FORM IS BEING REMOVED from this page entirely.
```

All healthy cases = 0 problems. All break cases ≥ 1 problem. [VERIFIED]

## Step 4 — Install and Site-Alive

```
$ ls -la wp-content/mu-plugins/
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 8548 Jul 18 01:30 4lg-adopt-form-guard.php
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4184 Jul 17 00:57 4lg-disable-user-enumeration.php
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 9957 Jul 18 16:48 4lg-volunteer-form-guard.php
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 1664 May 23 22:20 dashboard-service-role.php
```

Four mu-plugins. All 644, owner u3058-gfugkrmqxgso. [VERIFIED]

```
Homepage:       HTTP/2 200
/how-to-help/:  HTTP/2 200
/wp-login.php:  HTTP/2 200
```

Site fully alive after install. [VERIFIED]

## Step 5a — Baseline

```
Error: Could not get 'fourlg_volunteer_guard_state' option. Does it exist?
```

Option did not exist before this deploy. [VERIFIED]

## Step 5b — Clean Save (Must Not Alert)

Re-saved post 8 with its own current content via `wp_slash()`:

```
resaved 8
```

Guard state after clean save:
```json
{"last_checked":"2026-07-18T16:49:16+00:00","last_checked_id":8,"last_problems":[]}
```

- `last_checked`: populated (guard fired) [VERIFIED]
- `last_checked_id`: 8 [VERIFIED]
- `last_problems`: empty array (no false alarm on 4-backslash content) [VERIFIED]
- `last_alert`: ABSENT (no alert triggered) [VERIFIED]
- `last_mail_result`: ABSENT (no email sent) [VERIFIED]

## Step 5c — Planted Break (Must Alert)

Called `fourlg_vol_guard_check()` with `function isValidEmail` replaced by `function xEmail` against real post 8 content:

```
Problems found: 1
  - EMAIL VALIDATOR GONE: function isValidEmail is no longer present. The volunteer
    form submit button enables via JS validation; if the validator is missing or the
    script cannot parse, the button never enables and 100% of submissions are silently
    blocked.
```

Planted break correctly detected. [VERIFIED]

Scratch post 517 created and deleted (no side effects). [VERIFIED]

## Step 5d — No Alert Email from Tests

```
last_alert: ABSENT
last_mail_result: ABSENT
```

No email was sent during testing. The 5b clean save produced no alert, and the 5c planted break used the check function directly (not the record/email path). [VERIFIED]

## Step 6 — Record

### 6a — Revert Command

```
rm /home/customer/www/johnv80.sg-host.com/public_html/wp-content/mu-plugins/4lg-volunteer-form-guard.php
```

### 6b — Adoption Guard (Untouched)

```
sha256: f8366c50acef25a19976f9ca381501f749e7eba422d2b917f3da0d4f9f12eb44
```
Matches pre-deploy hash. [VERIFIED — unchanged]

### 6c — User Enumeration Guard (Untouched)

```
sha256: d910154a5646b324f19b0600d4436fbee7020997c3df843eb22a8cc426953663
```
Matches expected hash. [VERIFIED — unchanged]

### 6d — Posts 8 and 345

```
Post 8 modified:   2026-07-18 16:49:16 UTC  (the 5b no-op re-save)
Post 345 modified:  2026-05-27 19:47:47 UTC  (unchanged)
Post 8 backslashes:  4
Post 345 backslashes: 4
```

Post 8's modified timestamp reflects the 5b re-save (byte-identical content, wp_slash used). Post 345 was not touched. Both retain 4 backslashes. [VERIFIED]

### 6e — Guard Option

Option name: `fourlg_volunteer_guard_state`

Read command: `wp option get fourlg_volunteer_guard_state --format=json`

### New Guard Hash

```
sha256: 087f78ad14a5b4b29de6edbffb4388a1d0320e545005487681735e7fc58979ec
```

---

## Guard Checks Summary

| Check | What it detects | Anchor |
|-------|----------------|--------|
| Backslash drop | `$bs_cur > $bs_in` — escapes being destroyed by unslashed save | `chr(92)` count |
| Backslash rise | `$bs_in > $bs_cur` — corruptible content introduced | `chr(92)` count |
| Form removal | `volunteer-form` string disappears | `strpos` |
| Email validator | `function isValidEmail` disappears | `strpos` |
| Submit-enable | `updateSubmitState` disappears | `strpos` |
| wptexturize adjacency | `<` before `&` before `>` in `<script>` block | raw JS scan |

## Expected Behavior on the Planned Validator Swap

When posts 8 and 345 are updated with the charCodeAt validator (replacing the regex), each save will:
1. Drop backslash count from 4 to 0
2. Trigger "ESCAPES DESTROYED BY THIS SAVE" with the explanatory note about the planned swap
3. Send one email per post (2 total)
4. After both saves complete, the guard goes quiet (0 backslashes, all anchors present)

This is by design — the guard is simple and accepts the known one-time alerts rather than special-casing the swap.

---

## Summary Answers

1. **Redeclare test (both guards loaded):** pass
2. **Healthy pre-swap content alerts:** no (must be no)
3. **Planted break detected:** yes (must be yes)
4. **Site alive after install:** yes
