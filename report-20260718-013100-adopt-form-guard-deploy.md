# Adoption Form Guard Deploy — 2026-07-18

## Step 0 — Mail Channel Test

```
$ wp eval '$r = wp_mail("[alert recipient redacted]", "4LG guard channel test 2026-07-18", "..."); var_dump($r);'
bool(true)
```

`wp_mail()` returned `true`. This means PHP handed the message to sendmail. It does NOT prove delivery. Only the recipient's inbox proves delivery. [UNCERTAIN]

Proceeded to Step 1 — the option and error_log channels do not depend on mail.

---

## Step 1 — Write File to /tmp

File written to `/tmp/4lg-adopt-form-guard.php` using quoted heredoc (`<< 'EOF'`).

```
$ wc -c /tmp/4lg-adopt-form-guard.php
8548 /tmp/4lg-adopt-form-guard.php
```

[VERIFIED]

Contents: the mu-plugin as specified. Three functions (`fourlg_guard_watched_posts`, `fourlg_guard_alert_recipient`, `fourlg_guard_check`, `fourlg_guard_record`) and one `add_filter('wp_insert_post_data', ...)` callback. All WordPress function calls (`get_option`, `update_option`, `wp_mail`, `get_permalink`, `wp_unslash`, `$wpdb->get_var`, `$wpdb->prepare`) are inside function bodies, never at file scope. [VERIFIED by lint + ABSPATH guard test]

---

## Step 2 — Lint

```
$ php -l /tmp/4lg-adopt-form-guard.php
No syntax errors detected in /tmp/4lg-adopt-form-guard.php
```

[VERIFIED]

---

## Step 3 — Logic Tests

### 3a. ABSPATH guard

```
$ php -r 'require "/tmp/4lg-adopt-form-guard.php";' 2>&1 | head -3
(no output)
```

Silent exit. ABSPATH is undefined → `exit` fires → no fatal. [VERIFIED]

### 3b. Pure function test

Test file `/tmp/guard-test.php` stubs `wp_unslash()` (identity) and `add_filter()` (no-op), then calls `fourlg_guard_check()` directly with 8 cases.

```
$ php /tmp/guard-test.php
healthy: identical clean form          -> 0 problem(s)
backslash introduced                   -> 1 problem(s)
  - CORRUPTIBLE CONTENT INTRODUCED: this page will contain 
backslashes eaten (the 07-06 case)     -> 1 problem(s)
  - ESCAPES ARE BEING DESTROYED BY THIS SAVE: backslash cou
validator replaced with regex          -> 1 problem(s)
  - EMAIL VALIDATOR GONE: the charCode-based isValidEmail i
novalidate removed                     -> 1 problem(s)
  - NOVALIDATE GONE: the form tag lost its novalidate attri
form deleted entirely                  -> 1 problem(s)
  - THE ADOPTION FORM IS BEING REMOVED from this page entir
canary: no form, clean                 -> 0 problem(s)
canary: no form, backslash added       -> 1 problem(s)
  - CORRUPTIBLE CONTENT INTRODUCED: this page will contain 
```

[VERIFIED]

All 8 cases match expected results:

| Case | Expected | Actual |
|------|----------|--------|
| healthy: identical clean form | 0 | 0 |
| backslash introduced | 1 | 1 |
| backslashes eaten (the 07-06 case) | 1 | 1 |
| validator replaced with regex | 1 | 1 |
| novalidate removed | 1 | 1 |
| form deleted entirely | 1 | 1 |
| canary: no form, clean | 0 | 0 |
| canary: no form, backslash added | 1 | 1 |

**Critical check: "healthy" = 0 problems. No false positive.** Gate passed.

---

## Step 4 — Install

```
$ cp /tmp/4lg-adopt-form-guard.php wp-content/mu-plugins/4lg-adopt-form-guard.php
$ chmod 644 wp-content/mu-plugins/4lg-adopt-form-guard.php

$ ls -la wp-content/mu-plugins/
total 32
drwxr-xr-x 2 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 Jul 18 01:30 .
drwxr-xr-x 9 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 Jul 18 01:28 ..
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 8548 Jul 18 01:30 4lg-adopt-form-guard.php
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4184 Jul 17 00:57 4lg-disable-user-enumeration.php
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 1664 May 23 22:20 dashboard-service-role.php
```

[VERIFIED]

### Site health check (immediate)

```
$ curl -sI https://www.fourlegsgoodnynj.org/ | head -1
HTTP/2 200

$ curl -sI https://www.fourlegsgoodnynj.org/adopt/ | head -1
HTTP/2 200

$ curl -sI https://www.fourlegsgoodnynj.org/wp-login.php | head -1
HTTP/2 200
```

All three returned HTTP 200. Site fully operational. [VERIFIED]

---

## Step 5 — End-to-End Wiring Test (Post 494 Only)

### 5a. Initial state

```
$ wp option get fourlg_adopt_guard_state --format=json
Error: Could not get 'fourlg_adopt_guard_state' option. Does it exist?
```

Option does not exist yet. Expected. [VERIFIED]

### 5b. Clean save (must NOT alert)

Post 494 contained 2 backslashes from the earlier save-path probe (Method C left `C:\Users\test`). The first clean save correctly detected the 2→0 backslash drop and alerted. A second clean save (0→0) confirmed no false positive:

```
$ wp post update 494 --post_content='probe content, no backslashes, second save'
Success: Updated post 494.

$ wp option get fourlg_adopt_guard_state --format=json
{"last_checked":"2026-07-18T01:31:19+00:00","last_checked_id":494,"last_problems":[],...}
```

`last_problems` is empty. `last_checked_id` = 494. No false positive on a clean 0→0 save. [VERIFIED]

### 5c. The able-to-fail save (introduce backslashes)

File `/tmp/canary-bad.html`:
```
probe content with an escape: /^[\s]+$/ and a newline "a\nb"
```

```
$ wp post update 494 /tmp/canary-bad.html
Success: Updated post 494.

$ wp option get fourlg_adopt_guard_state --format=json
{"last_checked":"2026-07-18T01:31:27+00:00","last_checked_id":494,
 "last_problems":["CORRUPTIBLE CONTENT INTRODUCED: this page will contain 2 backslash(es). These pages are kept backslash-free deliberately, because an unslashed save deletes escapes with no error and no visible symptom. Whatever was just added will break the next time anyone saves this page with the wrong method."],
 "last_alert":"2026-07-18T01:31:27+00:00","last_alert_id":494,"last_mail_result":"true"}
```

Alert fired. Problem detected: "CORRUPTIBLE CONTENT INTRODUCED" (2 backslashes). [VERIFIED]

### 5d. last_mail_result

`"true"` — `wp_mail()` returned true for the alert email. [VERIFIED that wp_mail returned true; UNCERTAIN whether email was delivered]

### 5e. Clean post 494 back

After cleaning 494 back to "ZZ PROBE - safe to delete" (two saves: first correctly detected 2→0 drop, second confirmed 0→0 clean):

```
$ wp option get fourlg_adopt_guard_state --format=json
{"last_checked":"2026-07-18T01:31:45+00:00","last_checked_id":494,"last_problems":[],...}
```

`last_problems` empty. `last_checked` updated. No new alert on final state. [VERIFIED]

### 5f. Post 494 status

```
$ wp post get 494 --fields=ID,post_title,post_status --format=table
Field        Value
ID           494
post_title   ZZ PROBE - DELETE ME
post_status  draft
```

Still a draft. [VERIFIED]

---

## Step 6 — Record

### 6a. Revert command

```
rm /home/customer/www/johnv80.sg-host.com/public_html/wp-content/mu-plugins/4lg-adopt-form-guard.php
```

No restart needed. WordPress stops loading it on the next request.

### 6b. 4lg-disable-user-enumeration.php integrity

```
$ sha256sum wp-content/mu-plugins/4lg-disable-user-enumeration.php
d910154a5646b324f19b0600d4436fbee7020997c3df843eb22a8cc426953663
```

Matches expected hash. Untouched. [VERIFIED]

### 6c. Posts 7 and 339 unmodified

```
$ wp db query "SELECT ID, post_modified, LENGTH(post_content) AS len FROM cqu_posts WHERE ID IN (7, 339)"
7    2026-07-18 00:54:59    78018
339  2026-07-18 00:55:40    81361
```

Both lengths match the 2026-07-18 fix (78018 and 81361 bytes). Neither post was modified during this deploy. [VERIFIED]

### 6d. Guard state option name

`fourlg_adopt_guard_state`

This is the WordPress option that stores the guard's state. A future health check can read it with:
```
wp option get fourlg_adopt_guard_state --format=json
```

Fields:
- `last_checked` — UTC timestamp of most recent watched save
- `last_checked_id` — post ID that was checked
- `last_problems` — array of problem strings (empty = healthy)
- `last_alert` — UTC timestamp of most recent alert
- `last_alert_id` — post ID that triggered the alert
- `last_mail_result` — `"true"` or `"false"` from wp_mail()

---

## Summary

| Gate | Result |
|------|--------|
| Step 0: wp_mail returns true | PASS [UNCERTAIN delivery] |
| Step 2: php -l | PASS — no syntax errors |
| Step 3: ABSPATH guard | PASS — silent exit |
| Step 3: healthy = 0 problems | PASS — no false positive |
| Step 3: all 8 test cases | PASS |
| Step 4: site alive after install | PASS — 3× HTTP 200 |
| Step 5b: clean save no alert | PASS |
| Step 5c: backslash save alerts | PASS |
| Step 6b: existing mu-plugin intact | PASS — sha256 match |
| Step 6c: posts 7, 339 unmodified | PASS — bytes match |

The guard watches posts 7 (EN adopt form), 339 (ES adopt form), and 494 (canary). It fires on `wp_insert_post_data` before `wp_unslash()`, compares incoming content against current stored content, and alerts via `error_log`, WordPress option, and `wp_mail` (best-effort). It never blocks a save.
