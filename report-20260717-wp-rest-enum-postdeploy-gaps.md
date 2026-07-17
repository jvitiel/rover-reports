# WordPress REST User-Enumeration Fix — Post-Deploy Gap Closure

Date: 2026-07-17 01:15 UTC

---

## A — READ THE DEPLOYED FILE BACK

### A1. Full contents of deployed file

```php
<?php
/**
 * Plugin Name: 4LG - Disable User Enumeration
 * Description: Blocks anonymous discovery of WordPress user login handles via the REST users routes and ?author=N. Authenticated requests are unaffected.
 * Version: 1.0.0
 * Author: 4LG (Website discipline)
 *
 * WHAT THIS DOES NOT COVER — deliberate, verified 2026-07-16, do not "complete" it:
 * - /wp/v2/users/me : anonymously returns 401 rest_not_logged_in and leaks
 * nothing. Left registered on purpose; unsetting it risks authenticated flows.
 * - /wp/v2/users/<id>/application-passwords and its two sibling routes:
 * anonymously these return 401 for an existing user ID and 404 for a
 * nonexistent one, which is a user-ID enumeration oracle. It is KNOWN,
 * ACCEPTED and tracked as a residual: it leaks integer IDs, not slugs or
 * emails, and every WordPress install has a user 1. Closing it is a
 * separate decision, not this fix.
 * - /author/<slug>/ archives : still reachable by anyone who already knows
 * the slug. This file removes the DISCOVERY vectors, not the archives.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Remove the wp/v2/users collection and single-user routes for
 * unauthenticated requests only.
 *
 * Why is_user_logged_in() is reliable here: WP_REST_Server::serve_request()
 * calls check_authentication() BEFORE dispatch(), and the rest_endpoints
 * filter is applied inside get_routes(), which is only reached from
 * dispatch(). check_authentication() runs rest_cookie_check_errors(), which
 * calls is_user_logged_in() and thereby triggers the determine_current_user
 * cascade -- including wp_validate_application_password. So by the time this
 * filter fires, both wp-admin cookie+nonce requests and Application Password
 * requests are already resolved as logged in, and pass through untouched.
 * Verified against WordPress core 2026-07-16.
 */
add_filter( 'rest_endpoints', function( $endpoints ) {
	if ( is_user_logged_in() ) {
		return $endpoints;
	}
	if ( isset( $endpoints['/wp/v2/users'] ) ) {
		unset( $endpoints['/wp/v2/users'] );
	}
	if ( isset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] ) ) {
		unset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] );
	}
	return $endpoints;
} );

/**
 * Block ?author=N enumeration for all user IDs, in both languages
 * (Polylang's /es/ prefix does not change the query var).
 *
 * Nothing else on this site blocks it. SiteGround's WAF happens to 403
 * ?author=2..5 but lets ?author=1 through to a 301 revealing the admin slug,
 * and sg-security's "disable_usernames" option only blocks common usernames
 * at REGISTRATION (illegal_user_logins) -- it has no enumeration hook at all.
 * Both facts verified 2026-07-16 by reading the plugin source.
 *
 * LOAD-BEARING: do not delete the rest_route bail below as redundant.
 * It is redundant only by accident of load order. Core registers
 * rest_api_loaded() on parse_request at the same default priority 10
 * (wp-includes/default-filters.php), and wp-settings.php requires
 * default-filters.php BEFORE it loads mu-plugins -- so rest_api_loaded() is
 * registered first, fires first, and die()s on REST requests before this
 * callback ever runs. That accident is currently the only thing keeping this
 * hook away from REST traffic.
 *
 * It matters because $wp->query_vars['author'] IS populated from $_GET on
 * every request, including REST ones: WP::parse_request() fills the public
 * query vars (of which 'author' is one) from $_GET BEFORE it fires the
 * parse_request action. Without this bail, lowering this hook's priority --
 * or any future change to core's load order -- would silently start 403-ing
 * legitimate REST requests that carry an author parameter. The bail removes
 * that dependency entirely. Keep it.
 *
 * isset() rather than empty() on rest_route is deliberate: strictly more
 * conservative than core's own check. Do not "fix" it to match core.
 */
add_action( 'parse_request', function( $wp ) {
	if ( is_admin() || is_user_logged_in() ) {
		return;
	}
	if ( isset( $wp->query_vars['rest_route'] ) ) {
		return;
	}
	if ( isset( $wp->query_vars['author'] ) ) {
		wp_die(
			'Forbidden',
			'Forbidden',
			array( 'response' => 403 )
		);
	}
} );
```

### A2. File metadata

| Measurement | Value |
|-------------|-------|
| A2a. wc -c (deployed) | 4184 |
| A2b. sha256sum (deployed) | d910154a5646b324f19b0600d4436fbee7020997c3df843eb22a8cc426953663 |
| A2c. sha256sum (/tmp remote) | d910154a5646b324f19b0600d4436fbee7020997c3df843eb22a8cc426953663 |
| A2c. wc -c (/tmp remote) | 4184 |
| A2c. sha256sum (VPS local /tmp) | d910154a5646b324f19b0600d4436fbee7020997c3df843eb22a8cc426953663 |
| A2c. wc -c (VPS local /tmp) | 4184 |
| A2d. file output | `PHP script, Unicode text, UTF-8 text` |
| A2f. carriage return count | 0 |

All three copies (VPS local /tmp, SiteGround remote /tmp, deployed mu-plugins) have identical sha256 hashes and identical byte counts. No CRLF line endings. No BOM.

A2e. od -c of last 32 bytes:
```
0000000   r   e   s   p   o   n   s   e   '       =   >       4   0   3
0000020       )  \n  \t  \t   )   ;  \n  \t   }  \n   }       )   ;  \n
0000040
```
File ends with `} );\n` — a single trailing newline after the closing `);` of `add_action`. No extra bytes, no trailing whitespace.

### A3. 2-byte discrepancy explanation

The deploy report stated "4182 bytes" for Step 1 and "4184 bytes" for Step 3. The "4182" figure came from the OpenClaw `write` tool's output (`Successfully wrote 4182 bytes`), not from `wc -c`. The actual file on disk was 4184 bytes from the moment it was written — `wc -c` on the VPS local `/tmp` copy reads 4184, and its sha256 matches the deployed file exactly.

The `write` tool's byte count appears to differ from `wc -c` by 2 bytes. The cause is not determinable from the available evidence — it may be a reporting artifact in the tool (e.g., counting characters vs bytes for the UTF-8 em-dash `—` which is 3 bytes but 1 character, though that alone would produce a larger discrepancy). What the evidence does establish: the file on disk (4184 bytes) was `scp`'d without modification (sha256 match), and the deployed file is identical to the source file. The "4182" was never the true size of any file on any disk.

### A4. Required strings

**A4a.** `$endpoints['/wp/v2/users']` — present (two occurrences: `isset` and `unset`):
```php
	if ( isset( $endpoints['/wp/v2/users'] ) ) {
		unset( $endpoints['/wp/v2/users'] );
```

**A4b.** `$endpoints['/wp/v2/users/(?P<id>[\d]+)']` — present (two occurrences: `isset` and `unset`):
```php
	if ( isset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] ) ) {
		unset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] );
```
The backslash in `[\d]` is a **single backslash**. Confirmed by: (1) the file was `cat`'d to the terminal and the output shows `[\d]+` not `[\\d]+`, and (2) the earlier heredoc attempt (which would have mangled single quotes and backslashes) was abandoned in favor of a local `write` + `scp` approach that does not interpret escape sequences.

**A4c.** `isset( $wp->query_vars['rest_route'] )` — present:
```php
	if ( isset( $wp->query_vars['rest_route'] ) ) {
```

**A4d.** `isset( $wp->query_vars['author'] )` — present:
```php
	if ( isset( $wp->query_vars['author'] ) ) {
```

**A4e.** "LOAD-BEARING" comment block — present and intact. Full block:
```
 * LOAD-BEARING: do not delete the rest_route bail below as redundant.
 * It is redundant only by accident of load order. Core registers
 * rest_api_loaded() on parse_request at the same default priority 10
 * (wp-includes/default-filters.php), and wp-settings.php requires
 * default-filters.php BEFORE it loads mu-plugins -- so rest_api_loaded() is
 * registered first, fires first, and die()s on REST requests before this
 * callback ever runs. That accident is currently the only thing keeping this
 * hook away from REST traffic.
 *
 * It matters because $wp->query_vars['author'] IS populated from $_GET on
 * every request, including REST ones: WP::parse_request() fills the public
 * query vars (of which 'author' is one) from $_GET BEFORE it fires the
 * parse_request action. Without this bail, lowering this hook's priority --
 * or any future change to core's load order -- would silently start 403-ing
 * legitimate REST requests that carry an author parameter. The bail removes
 * that dependency entirely. Keep it.
 *
 * isset() rather than empty() on rest_route is deliberate: strictly more
 * conservative than core's own check. Do not "fix" it to match core.
```

**A4f.** "WHAT THIS DOES NOT COVER" comment block — present and intact. Full block:
```
 * WHAT THIS DOES NOT COVER — deliberate, verified 2026-07-16, do not "complete" it:
 * - /wp/v2/users/me : anonymously returns 401 rest_not_logged_in and leaks
 * nothing. Left registered on purpose; unsetting it risks authenticated flows.
 * - /wp/v2/users/<id>/application-passwords and its two sibling routes:
 * anonymously these return 401 for an existing user ID and 404 for a
 * nonexistent one, which is a user-ID enumeration oracle. It is KNOWN,
 * ACCEPTED and tracked as a residual: it leaks integer IDs, not slugs or
 * emails, and every WordPress install has a user 1. Closing it is a
 * separate decision, not this fix.
 * - /author/<slug>/ archives : still reachable by anyone who already knows
 * the slug. This file removes the DISCOVERY vectors, not the archives.
```

### A5. File-scope function call check

The deployed file has exactly three top-level statements:
1. `if ( ! defined( 'ABSPATH' ) ) { exit; }` — calls `defined()`, which is a PHP language construct, not a pluggable function.
2. `add_filter( 'rest_endpoints', function( $endpoints ) { ... } );` — registers a callback; `add_filter` is loaded from `wp-includes/plugin.php` during bootstrap, not pluggable.
3. `add_action( 'parse_request', function( $wp ) { ... } );` — registers a callback; `add_action` is a wrapper around `add_filter`, also not pluggable.

Calls to pluggable functions (`is_user_logged_in`, `is_admin`) appear **only inside closure bodies**:
- `is_user_logged_in()` at two locations, both inside closures passed to `add_filter`/`add_action`
- `is_admin()` at one location, inside the closure passed to `add_action`

No pluggable function is called at file scope. [VERIFIED — full file contents pasted in A1]

---

## B — THE /wp-admin/ 403

### B1. Full responses

**B1a. `curl -i https://www.fourlegsgoodnynj.org/wp-admin/`**

Headers:
```
HTTP/2 403
server: nginx
date: Fri, 17 Jul 2026 01:10:54 GMT
content-type: text/html
content-length: 52
vary: Accept-Encoding
etag: "6a27b6bb-34"
host-header: 8441280b0c35cbc1147f8ba998a563a7
x-proxy-cache-info: DT:1
```

Body:
```
403 - Forbidden | Access to this page is forbidden.
```

52 bytes. Static nginx error page. ETag present. No `x-httpd` header. No `cache-control` header. No `expires` header.

**B1b. `curl -i https://www.fourlegsgoodnynj.org/?author=1`**

Headers:
```
HTTP/2 403
server: nginx
date: Fri, 17 Jul 2026 01:10:54 GMT
content-type: text/html; charset=UTF-8
vary: Accept-Encoding
expires: Wed, 11 Jan 1984 05:00:00 GMT
cache-control: no-cache, must-revalidate, max-age=0, no-store, private
x-httpd: 1
host-header: 6b7412fb82ca5edfd0917e3957f05d89
x-proxy-cache: MISS
x-proxy-cache-info: 0 NC:000000 UP:
```

Body (abbreviated — full WordPress styled HTML error page):
```html
<!DOCTYPE html>
<html lang="en-US">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name='robots' content='max-image-preview:large, noindex, follow' />
	<title>Forbidden</title>
	<style> ... </style>
</head>
<body id="error-page">
	<div class="wp-die-message">Forbidden</div></body>
</html>
```

Full WordPress `wp_die()` error page with inline CSS, `#error-page` container, `.wp-die-message` div. `x-httpd: 1` header present (request reached PHP). `cache-control: no-cache` headers present.

**B1c. `curl -i https://www.fourlegsgoodnynj.org/?author=3`**

Headers:
```
HTTP/2 403
server: nginx
date: Fri, 17 Jul 2026 01:11:01 GMT
content-type: text/html
content-length: 52
vary: Accept-Encoding
etag: "6a27b6bb-34"
host-header: 8441280b0c35cbc1147f8ba998a563a7
x-proxy-cache-info: DT:1
```

Body:
```
403 - Forbidden | Access to this page is forbidden.
```

52 bytes. Identical to B1a. No `x-httpd` header. No `cache-control`. Same ETag.

**B1d. `curl -i https://www.fourlegsgoodnynj.org/wp-admin/edit.php`**

Headers:
```
HTTP/2 302
server: nginx
date: Fri, 17 Jul 2026 01:11:01 GMT
content-type: text/html; charset=UTF-8
location: https://www.fourlegsgoodnynj.org/wp-login.php?redirect_to=https%3A%2F%2Fwww.fourlegsgoodnynj.org%2Fwp-admin%2Fedit.php&reauth=1
expires: Wed, 11 Jan 1984 05:00:00 GMT
cache-control: no-cache, must-revalidate, max-age=0, no-store, private
x-redirect-by: WordPress
x-httpd: 1
host-header: 6b7412fb82ca5edfd0917e3957f05d89
x-proxy-cache: MISS
x-proxy-cache-info: 0302 NC:000000 UP:
```

Body: empty (302 redirect).

**B1e. `curl -sI https://www.fourlegsgoodnynj.org/wp-login.php`**

```
HTTP/2 200
server: nginx
date: Fri, 17 Jul 2026 01:11:02 GMT
content-type: text/html; charset=UTF-8
vary: Accept-Encoding
expires: Wed, 11 Jan 1984 05:00:00 GMT
cache-control: no-cache, must-revalidate, max-age=0, no-store, private
x-frame-options: SAMEORIGIN
content-security-policy: frame-ancestors 'self';
referrer-policy: strict-origin-when-cross-origin
set-cookie: wordpress_test_cookie=WP%20Cookie%20check; path=/; secure; HttpOnly
x-httpd: 1
host-header: 8441280b0c35cbc1147f8ba998a563a7
x-proxy-cache-info: DT:1
```

### B2. Comparison: B1a (/wp-admin/) vs B1b (/?author=1)

**DIFFERENT pages from DIFFERENT sources.**

| Attribute | B1a (/wp-admin/) | B1b (/?author=1) |
|-----------|-----------------|-------------------|
| content-type | `text/html` | `text/html; charset=UTF-8` |
| content-length | 52 | (not set, chunked) |
| Body | `403 - Forbidden \| Access to this page is forbidden.` | Full HTML page with `<div class="wp-die-message">Forbidden</div>` |
| ETag | `"6a27b6bb-34"` | (absent) |
| x-httpd | (absent) | `1` |
| cache-control | (absent) | `no-cache, must-revalidate, max-age=0, no-store, private` |
| expires | (absent) | `Wed, 11 Jan 1984 05:00:00 GMT` |

B1a is a 52-byte static nginx error page served by the SiteGround WAF/proxy. The request never reached PHP (`x-httpd` absent). B1b is a full WordPress `wp_die()` page generated by PHP (`x-httpd: 1` present, WordPress-standard `cache-control` headers, `#error-page` HTML structure). The mu-plugin produced B1b. The mu-plugin did not produce B1a.

### B3. Comparison: B1b (/?author=1) vs B1c (/?author=3)

**DIFFERENT pages from DIFFERENT sources.**

B1b (author=1): WordPress `wp_die()` page — full HTML, `x-httpd: 1`, `cache-control` headers, no ETag.
B1c (author=3): SiteGround WAF page — 52-byte plaintext, no `x-httpd`, ETag `"6a27b6bb-34"`.

The SiteGround WAF is still intercepting `?author=3` (and presumably IDs 2-5) before the request reaches WordPress. Only `?author=1` reaches WordPress and is handled by the mu-plugin's `parse_request` callback. Both return 403 but from different sources.

This is not a defect. Before the fix: author=1 leaked the admin slug via 301; author=2-5 were 403'd by the WAF. After the fix: author=1 is 403'd by the mu-plugin; author=2-5 are still 403'd by the WAF. The enumeration vector (the 301 on author=1) is closed.

### B4. Structural check: does /wp-admin/ fire parse_request?

**B4a.** `wp-admin/admin.php` line 35 requires `wp-load.php` directly:
```php
require_once dirname( __DIR__ ) . '/wp-load.php';
```
[VERIFIED — wp-admin/admin.php:35]

`wp-admin/admin.php` does **not** call `wp()` or `WP::main()`. grep for `wp()` in both `admin.php` and `admin-header.php` returned zero hits. [VERIFIED — grep output empty]

The front-end entry point (`wp-blog-header.php`) is the one that calls `wp()`:
```php
require_once __DIR__ . '/wp-load.php';
wp();
require_once ABSPATH . WPINC . '/template-loader.php';
```
[VERIFIED — wp-blog-header.php pasted in full]

The `wp()` function (wp-includes/functions.php:1340) calls `$wp->main()`, which calls `$this->parse_request()` (class-wp.php:821), which fires `do_action_ref_array( 'parse_request', ... )` at class-wp.php:418. [VERIFIED — class-wp.php:418,821]

**B4b.** `wp-admin/admin.php` loads `wp-load.php` but never calls `wp()` or `WP::main()`. The `parse_request` action is only fired inside `WP::parse_request()`, which is only called from `WP::main()`. Therefore, **`parse_request` does NOT fire for wp-admin requests**, and the mu-plugin's `parse_request` callback cannot execute on wp-admin requests at all, regardless of the `is_admin()` bail in the callback. [VERIFIED — admin.php:35 loads wp-load.php; no call to wp() or WP::main() in admin.php; parse_request action at class-wp.php:418 inside WP::parse_request() called from WP::main() at class-wp.php:821]

### B5. What caused the /wp-admin/ 403

**The SiteGround WAF caused it.** Two independent lines of evidence:

1. The response body is the 52-byte SiteGround WAF page (`403 - Forbidden | Access to this page is forbidden.`), not a WordPress `wp_die()` page. The request never reached PHP (`x-httpd` header absent). [VERIFIED — B1a vs B1b comparison]

2. `wp-admin/admin.php` does not call `wp()` or `WP::main()`, so the `parse_request` action never fires for wp-admin requests. The mu-plugin's `parse_request` callback is structurally unreachable on wp-admin URLs. [VERIFIED — admin.php:35, class-wp.php:418,821]

Additionally, `wp-admin/edit.php` (B1d) returns 302 to wp-login.php with `x-httpd: 1` — that request DID reach PHP and was handled by WordPress's auth_redirect(), not by the WAF. The WAF blocks `/wp-admin/` (the directory index) specifically, not all wp-admin paths. [VERIFIED — B1d headers]

---

## C — T9d RETEST

### C1. Re-fetch

| Page | HTTP status | Byte size |
|------|------------|-----------|
| EN | 200 | 137,041 |
| ES | 200 | 139,456 |

### C2. Marker search (separate grep per marker, no alternation)

| Marker | EN count | ES count |
|--------|----------|----------|
| `Featured animals error` | 0 | 0 |
| `No featured slots` | 0 | 0 |
| `No featured animals available` | 0 | 0 |

All six counts are 0. [VERIFIED — grep -c output for each]

Contradicting result that would indicate a problem: any count > 0. That did not occur.

### C3. Positive control

```
$ echo '<!-- No featured slots -->' > /tmp/control.html
$ grep -c 'No featured slots' /tmp/control.html
1
```

Positive control returned **1**. The test method works — it correctly detects the marker when present. [VERIFIED — grep output]

### C4. Featured animal cards

**EN:** 6 cards. Names: Nanook, Lupa, Leo (Petey), Lucky, Butterscotch, Dante.
**ES:** 6 cards. Names: Nanook, Lupa, Leo (Petey), Lucky, Butterscotch, Dante.

Identical to baseline. [VERIFIED — grep -oP 'class="pet-name"[^>]*>\K[^<]+' output]

---

## BOTTOM-LINE ANSWERS

A: deployed file byte-exact to spec **yes**; 2-byte delta explained by: the `write` tool reported 4182 but `wc -c` on all three copies (VPS /tmp, SiteGround /tmp, deployed) reads 4184 with identical sha256; the 4182 was a tool reporting artifact, never an actual file size.
A4: all six required strings present and intact **yes**
B: /wp-admin/ 403 caused by **WAF**, basis: response body is the 52-byte SiteGround WAF page (not wp_die()), `x-httpd` header absent (request never reached PHP), and `parse_request` is structurally unreachable on wp-admin URLs (admin.php never calls wp()/WP::main()).
C: failure markers present **no**; positive control returned **1**
