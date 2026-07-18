# Adoption Form Scroll-Fix Revert — 2026-07-18

Reverted posts 7 (EN) and 339 (ES) to pre-scroll-fix state due to Uncaught SyntaxError that disabled the entire inline script.

---

## 1. Revert file confirmation

```
 78052 /tmp/post7-revert.html
 81396 /tmp/post339-revert.html
```

| Check | post7-revert | post339-revert |
|-------|-------------|---------------|
| charCodeAt | 1 | 1 |
| novalidate | 1 | 1 |
| window.scrollTo | 0 | 0 |
| firstError (lines) | 8 | 8 |

Revert files are the correct pre-scroll state with the email fix and novalidate intact.

## 2. Apply

```
Success: Updated post 7.
Success: Updated post 339.
```

## 3. Readback

| Check | post 7 | post 339 |
|-------|--------|----------|
| window.scrollTo | 0 | 0 |
| charCodeAt | 1 | 1 |
| novalidate | 1 | 1 |
| backslashes | 0 | 0 |

## 4. Cache purge and live verify

```
wp cache flush: Success
wp sg purge: Dynamic Cache Successfully Purged
```

| Check | Result |
|-------|--------|
| EN scrollTo count | 0 |
| EN charCodeAt count | 1 |
| EN HTTP status | HTTP/2 200 |

## 5. Guard state

```json
{"last_checked":"2026-07-18T14:45:41+00:00","last_checked_id":339,"last_problems":[],"last_alert":"2026-07-18T01:31:35+00:00","last_alert_id":494,"last_mail_result":"true"}
```

Guard clean — last_problems empty, no new alert fired by the revert.
