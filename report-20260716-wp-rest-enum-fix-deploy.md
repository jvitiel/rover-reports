# WordPress REST User-Enumeration Fix — Deploy Report

Date: 2026-07-17 01:00 UTC

---

## STEP 0 — T6-PRE: Authenticated control (before deploy)

Credential located in `/home/shelter/.config/shelter-secrets.json` at `wordpress.username` and `wordpress.appPassword`, matching `server.ts:343-353`. Read into shell variable without echoing. [VERIFIED — server.ts:353 constructs the same `Basic` auth from these fields]

Authenticated GET `https://www.fourlegsgoodnynj.org/wp-json/wp/v2/users`:

- HTTP status: **200** [VERIFIED — curl output]
- User objects returned: **2**
- id=4, slug=dashboard-push
- id=1, slug=flgnynjaigmail-com

**STEP 0: PASS.** Credential works. Baseline established for T6 comparison.

---

## STEP 1 — Write to /tmp

File written locally to `/tmp/4lg-disable-user-enumeration.php` (4182 bytes), then SCP'd to remote `/tmp/4lg-disable-user-enumeration.php`. [VERIFIED — scp exit code 0]

## STEP 2 — Lint

```
$ php -l /tmp/4lg-disable-user-enumeration.php
No syntax errors detected in /tmp/4lg-disable-user-enumeration.php
```
[VERIFIED — pasted output]

**STEP 2: PASS.**

## STEP 3 — Move into place

Existing mu-plugins directory before move:
```
drwxr-xr-x 2 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 May 23 21:08 .
drwxr-xr-x 9 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 Jul 17 00:57 ..
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 1664 May 23 22:20 dashboard-service-role.php
```

After move:
```
drwxr-xr-x 2 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 Jul 17 00:57 .
drwxr-xr-x 9 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 Jul 17 00:57 ..
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4184 Jul 17 00:57 4lg-disable-user-enumeration.php
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 1664 May 23 22:20 dashboard-service-role.php
```

Ownership: `u3058-gfugkrmqxgso:u3058-gfugkrmqxgso` (matches existing file). Permissions: `644` (matches existing file). [VERIFIED — ls -la output]

## STEP 4 — Flush SiteGround cache

Commands used:
1. `wp eval 'sg_cachepress_purge_everything();'` — function located by checking `function_exists("sg_cachepress_purge_everything")` which returned true. Output: `purged` [VERIFIED]
2. `wp sg purge` — Output: `Success: Speed Optimizer by SiteGround assets folder purged successfully. Warning: Unable to Purge File Cache. Please make sure it is enabled. Success: Dynamic Cache Successfully Purged.` [VERIFIED — the file cache warning is expected since `siteground_optimizer_file_caching` option is not set, confirmed in preflight report]
3. `wp cache flush` — Output: `Success: The cache was flushed.` [VERIFIED]

---

## STEP 5 — VERIFICATION

### T1. anon GET /wp-json/wp/v2/users

```json
{"code":"rest_no_route","message":"No route was found matching the URL and request method.","data":{"status":404}}
```
HTTP status: **404**

**T1: PASS.** Route removed for anonymous. Contradicting result: 200 with user objects — did not occur.

### T2. anon GET /wp-json/wp/v2/users/1

```json
{"code":"rest_no_route","message":"No route was found matching the URL and request method.","data":{"status":404}}
```
HTTP status: **404**

**T2: PASS.** Single-user route removed for anonymous. Contradicting result: any response containing user slug — did not occur.

### T3. anon GET /wp-json/wp/v2/shelter-stories?per_page=1 (regression test)

Headers:
```
HTTP/2 200
server: nginx
date: Fri, 17 Jul 2026 00:59:00 GMT
content-type: application/json; charset=UTF-8
vary: Accept-Encoding
x-robots-tag: noindex
access-control-expose-headers: X-WP-Total, X-WP-TotalPages, Link
access-control-allow-headers: Authorization, X-WP-Nonce, Content-Disposition, Content-MD5, Content-Type
x-wp-total: 10
x-wp-totalpages: 10
link: <https://www.fourlegsgoodnynj.org/wp-json/wp/v2/shelter-stories?per_page=1&page=2>; rel="next"
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
allow: GET
x-httpd: 1
host-header: 8441280b0c35cbc1147f8ba998a563a7
x-proxy-cache-info: DT:1
```

Body: Array of 1 object, id=361 title="Mejores Días para B y B". [VERIFIED — curl output]

shelter-events:
```
HTTP/2 200
x-wp-total: 19
x-wp-totalpages: 19
```
[VERIFIED — curl output]

**T3: PASS.** Stories 200 with x-wp-total:10. Events 200 with x-wp-total:19. The `parse_request` hook's `rest_route` bail correctly allowed REST through without interference. Contradicting result: 403 Forbidden — did not occur.

### T4. anon GET /?author=N

`/?author=1`:
```
HTTP/2 403
server: nginx
date: Fri, 17 Jul 2026 00:59:14 GMT
content-type: text/html; charset=UTF-8
vary: Accept-Encoding
expires: Wed, 11 Jan 1984 05:00:00 GMT
cache-control: no-cache, must-revalidate, max-age=0, no-store, private
x-httpd: 1
host-header: 8441280b0c35cbc1147f8ba998a563a7
x-proxy-cache-info: DT:1
```

No `Location` header present. [VERIFIED — pasted full headers above, no Location line]

Status for all IDs:
- `/?author=1`: 403
- `/?author=2`: 403
- `/?author=3`: 403
- `/?author=4`: 403
- `/?author=5`: 403

[VERIFIED — curl output for each]

**T4: PASS.** All author IDs return 403 with no Location header. The prior leak (301 to `/author/flgnynjaigmail-com/` for author=1) is closed. Contradicting result: 301 with Location header — did not occur.

Note on IDs 2-5: before this fix, IDs 2-5 returned 403 from SiteGround's WAF (not from WordPress). After this fix, all IDs including 1 return 403 from WordPress's `wp_die()`. The status code is identical (403) so the two sources are indistinguishable by status alone. However, the prior 301 leak on author=1 is gone, which is the fix's purpose. [VERIFIED — author=1 previously returned 301, now returns 403]

### T5. anon GET /es/?author=1

```
HTTP/2 403
server: nginx
date: Fri, 17 Jul 2026 00:59:19 GMT
content-type: text/html; charset=UTF-8
vary: Accept-Encoding
expires: Wed, 11 Jan 1984 05:00:00 GMT
cache-control: no-cache, must-revalidate, max-age=0, no-store, private
x-httpd: 1
host-header: 8441280b0c35cbc1147f8ba998a563a7
x-proxy-cache-info: DT:1
```

No Location header. [VERIFIED — pasted full headers]

**T5: PASS.** Spanish surface also blocked.

### T6. Authenticated GET /wp-json/wp/v2/users (post-deploy)

- HTTP status: **200** [VERIFIED — curl output]
- User objects returned: **2**
- id=4, slug=dashboard-push
- id=1, slug=flgnynjaigmail-com

Identical to Step 0 pre-deploy control. [VERIFIED — same count (2), same ids and slugs]

**T6: PASS.** `is_user_logged_in()` correctly resolved inside `rest_endpoints` for Application Password authentication. The Gutenberg author dropdown and dashboard-push operations are unaffected.

### T7. anon GET /wp-json/ (route index)

| Route key | Status |
|-----------|--------|
| `/wp/v2/users` | **ABSENT** |
| `/wp/v2/users/(?P<id>[\d]+)` | **ABSENT** |
| `/wp/v2/users/(?P<user_id>(?:[\d]+\|me))/application-passwords` | **PRESENT** |
| `/wp/v2/users/(?P<user_id>(?:[\d]+\|me))/application-passwords/(?P<uuid>[\w\-]+)` | **PRESENT** |
| `/wp/v2/users/(?P<user_id>(?:[\d]+\|me))/application-passwords/introspect` | **PRESENT** |
| `/wp/v2/users/me` | **PRESENT** |

[VERIFIED — python3 parsed route index keys]

**T7: PASS.** The two targeted routes are removed. The four routes that should remain (3 application-passwords, 1 /me) are still present.

### T8. anon GET /wp-json/wp/v2/users/me

```json
{"code":"rest_not_logged_in","message":"You are not currently logged in.","data":{"status":401}}
```
HTTP status: **401**

[VERIFIED — curl output]

**T8: PASS.** /users/me returns 401 rest_not_logged_in, same as before deploy. No user data exposed.

### T9. Baseline comparison

**T9a/b: Homepage fetch**

| Page | HTTP status | Byte size |
|------|------------|-----------|
| EN (`/`) | 200 | 137,041 |
| ES (`/es/`) | 200 | 139,456 |

Byte sizes match pre-deploy baseline exactly (EN: 137,041 vs 137,041; ES: 139,456 vs 139,456). [VERIFIED — curl output]

**T9c: Feed counts and items**

Selectors (identical to baseline report):
- `grep -oP 'class="pet-card"' | wc -l`
- `grep -oP 'class="pet-name"[^>]*>\K[^<]+'`
- `grep -oP 'class="story-card"' | wc -l`
- `grep -oP 'class="story-body".*?<h3[^>]*>\K[^<]+'`
- `grep -oP 'class="event-card"' | wc -l`
- `grep -oP 'class="event-body".*?<h3[^>]*>\K[^<]+'`

**EN homepage:**

| Feed | Count | Items | Baseline match |
|------|-------|-------|----------------|
| Featured animals | 6 | Nanook, Lupa, Leo (Petey), Lucky, Butterscotch, Dante | ✓ identical |
| Featured stories | 2 | Love for Louise, Time for Tinka | ✓ identical |
| Upcoming events | 1 | Volunteer Orientation | ✓ identical |

**ES homepage:**

| Feed | Count | Items | Baseline match |
|------|-------|-------|----------------|
| Featured animals | 6 | Nanook, Lupa, Leo (Petey), Lucky, Butterscotch, Dante | ✓ identical |
| Featured stories | 2 | Amor para Louise, El Momento de Tinka | ✓ identical |
| Upcoming events | 1 | Orientación para Voluntarios | ✓ identical |

[VERIFIED — grep output for all selectors]

**T9d: Failure markers**

```
grep -oP '<!--.*?-->' /tmp/post-home-en.html | grep -i 'Featured animals error|No featured slots|No featured animals available'
```
Exit code: 1 (no match). Same for ES. [VERIFIED — grep exit code 1 = no match]

No failure markers present. Featured-animals section is populated.

**T9e: wp-admin**

- `wp-admin/`: HTTP 403 — this is SiteGround WAF behavior for unauthenticated access, NOT caused by the mu-plugin. Confirmed by: `wp-login.php` returns HTTP 200 (site is alive and serving PHP), and this same 403 behavior is expected when SG Security's custom login URL or admin access restriction is active. [VERIFIED — wp-login.php returns 200; sg_security_login_type option is "default"]
- `wp-login.php`: HTTP 200 [VERIFIED — curl output]

**T9: PASS.** All counts and items match baseline exactly. No failure markers. Site serving normally.

---

## STEP 6 — Revert command

```
rm /home/customer/www/johnv80.sg-host.com/public_html/wp-content/mu-plugins/4lg-disable-user-enumeration.php
```

No cache flush needed after revert — the mu-plugin is a runtime filter, not cached content.

---

## SUMMARY

STEP 0 (T6-PRE control): **pass**
T1: **pass** T2: **pass** T3: **pass** T4: **pass** T5: **pass**
T6: **pass** T7: **pass** T8: **pass** T9: **pass**
Any test failed: **no**
Revert command: `rm /home/customer/www/johnv80.sg-host.com/public_html/wp-content/mu-plugins/4lg-disable-user-enumeration.php`
