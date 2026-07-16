# WordPress REST User-Enumeration — Round 2 Diagnosis

Date: 2026-07-16 23:50 UTC

---

## 1. REST AUTH ORDERING

### 1a. serve_request() call order

In `wp-includes/rest-api/class-wp-rest-server.php`:

```
Line 432:  $result = $this->check_authentication();
Line 435:      $result = $this->dispatch( $request );
```

`check_authentication()` is called first. If it does not return a `WP_Error`, `dispatch()` runs next. [VERIFIED — class-wp-rest-server.php:432-435]

### 1b. Where rest_endpoints filter fires

The `rest_endpoints` filter is applied inside `get_routes()`:

```
Line 968:  $endpoints = apply_filters( 'rest_endpoints', $endpoints );
```

[VERIFIED — class-wp-rest-server.php:968]

`get_routes()` is called from `match_request_to_handler()` (line 1155/1162), which is called from `dispatch()` (line 1091 area). So the call chain is:

```
serve_request()
  → check_authentication()           [line 432]
  → dispatch()                        [line 435]
    → match_request_to_handler()      [line ~1091]
      → get_routes()                  [line 1155/1162]
        → apply_filters('rest_endpoints', ...)  [line 968]
```

[VERIFIED — class-wp-rest-server.php:1057→1091→1147→1155/1162→951→968]

### 1c. Is the current user resolved by the time rest_endpoints fires?

**Yes, for both cookie+nonce and Application Password authentication.** [VERIFIED]

Evidence chain:

1. `check_authentication()` (line 432) fires `rest_authentication_errors` filter (class-wp-rest-server.php:198).

2. Two callbacks are registered on `rest_authentication_errors` in `default-filters.php`:
   - Priority 90: `rest_application_password_check_errors` (default-filters.php:340)
   - Priority 100: `rest_cookie_check_errors` (default-filters.php:341)

3. `rest_cookie_check_errors()` (rest-api.php:1113) calls `is_user_logged_in()` at line ~1127:
   ```php
   if ( true !== $wp_rest_auth_cookie && is_user_logged_in() ) {
   ```
   `is_user_logged_in()` calls `wp_get_current_user()`, which — if the user has not yet been resolved — fires the `determine_current_user` filter (user.php:3826). [VERIFIED — user.php:3826]

4. The `determine_current_user` filter has these callbacks registered (default-filters.php:507-509):
   - Priority 10: `wp_validate_auth_cookie`
   - Priority 20: `wp_validate_logged_in_cookie`
   - Priority 20: `wp_validate_application_password`

5. So the first call to `is_user_logged_in()` inside `rest_cookie_check_errors` triggers the full authentication cascade, including Application Password validation. By the time `check_authentication()` returns, the current user IS resolved.

6. There is also a secondary `is_user_logged_in()` call at line 481 inside `serve_request()`:
   ```php
   $send_no_cache_headers = apply_filters( 'rest_send_nocache_headers', is_user_logged_in() );
   ```
   This runs AFTER `dispatch()` (and thus after `rest_endpoints`) — but it's not the first resolution point.

7. Additionally, `serve_request()` lines 289-300 explicitly clear a non-existent `$current_user` at the top of the method to allow fresh authentication for the REST request. [VERIFIED — class-wp-rest-server.php:289-300]

**Conclusion:** By the time the `rest_endpoints` filter fires at line 968, `check_authentication()` has already completed (line 432), which resolved the current user via the `determine_current_user` filter cascade. `is_user_logged_in()` will return `true` for:
- **(i) Cookie+nonce requests from wp-admin:** Resolved by `wp_validate_auth_cookie` / `wp_validate_logged_in_cookie` at priority 10/20 on `determine_current_user`, then nonce-verified by `rest_cookie_check_errors`. [VERIFIED]
- **(ii) Application Password Basic-auth requests:** Resolved by `wp_validate_application_password` at priority 20 on `determine_current_user`. [VERIFIED]

If no authentication is present, `rest_cookie_check_errors` calls `wp_set_current_user(0)` (rest-api.php:~1141), so `is_user_logged_in()` returns `false`. [VERIFIED]

### 1d. Application Passwords hook registration

Application Password authentication hooks into `determine_current_user` at:

```
default-filters.php:509:  add_filter( 'determine_current_user', 'wp_validate_application_password', 20 );
```

[VERIFIED — default-filters.php:509]

This resolves **before** `rest_endpoints` fires because:
- `determine_current_user` fires on first call to `wp_get_current_user()`
- That first call happens inside `rest_cookie_check_errors` which runs during `check_authentication()` (line 432)
- `rest_endpoints` doesn't fire until `dispatch()` → `match_request_to_handler()` → `get_routes()` (line 968), which comes after `check_authentication()` returns (line 435)

[VERIFIED — ordering established from class-wp-rest-server.php:432→435→1057→1091→1147→968]

---

## 2. DOES parse_request FIRE FOR REST REQUESTS?

### 2a. Hook and priority

`rest_api_loaded()` is registered on `parse_request` at default priority (10):

```
default-filters.php:535:  add_action( 'parse_request', 'rest_api_loaded' );
```

[VERIFIED — default-filters.php:535]

### 2b. Does /wp-json/... pass through parse_request?

**Yes.** [VERIFIED]

The WordPress bootstrap flow is:
1. `WP::main()` calls `$this->parse_request()` (class-wp.php:821)
2. `parse_request()` resolves query vars from the URL, including `rest_route`
3. `parse_request()` fires `do_action_ref_array( 'parse_request', ... )` at class-wp.php:418
4. `rest_api_loaded()` callback runs, finds `$GLOBALS['wp']->query_vars['rest_route']` is set
5. Calls `$server->serve_request( $route )` then `die()` (rest-api.php:473-476)

The request **never reaches** `query_posts()`, `handle_404()`, `template_redirect`, or any later hooks in `WP::main()`. [VERIFIED — class-wp.php:821-824 shows parse_request runs first; rest-api.php:476 calls die()]

### 2c. Would a parse_request-based ?author= block intercept REST requests?

**Yes, a callback on `parse_request` fires for REST requests too.** [VERIFIED]

However, a REST request to `/wp-json/wp/v2/users` would have `rest_route` set as a query var, **not** `author`. The `author` query var is only set for traditional `?author=N` URL patterns. A `parse_request` hook checking for `$wp->query_vars['author']` would not match a REST request to `/wp/v2/users` — the author parameter on REST is a GET parameter on the REST route, not a WordPress query var. [VERIFIED — parse_request populates query_vars from rewrite rules; REST author filtering is handled by the REST controller's own parameter schema]

A `parse_request` hook that checks for `$wp->query_vars['author']` will block `?author=N` enumeration without affecting REST API requests. These are orthogonal surfaces. [VERIFIED]

**Caveat:** A REST request like `/wp-json/wp/v2/posts?author=1` passes `author` as a REST API parameter, not as a WordPress query var. The REST controller extracts it from `$_GET` via `WP_REST_Request`, not from `$wp->query_vars`. A `parse_request` hook checking `$wp->query_vars['author']` will NOT intercept REST `?author=` filtering. [VERIFIED]

---

## 3. LEGITIMATE ?author= AND AUTHOR-PARAM USAGE

### 3a. Grep results

**4lg-theme:** No references to `author` query var, `author_name`, or REST `author` parameter in any PHP file. [VERIFIED]

**mu-plugins (dashboard-service-role.php):** No references. [VERIFIED]

**Active plugins (relevant hits only):**

| Plugin | Reference | Purpose | Concern? |
|--------|-----------|---------|----------|
| polylang | `frontend-links.php:151` — uses `'author'` in a key array for language-aware URL generation | Polylang translates author archive URLs with language prefix | No — this is URL rewriting, not data querying |
| seo-by-rank-math | `paper/class-author.php:88,108` — reads `author` and `author_name` query vars for author archive SEO meta | Generates canonical URLs and meta for author archives | No — only fires on author archive pages, which would be blocked by the proposed fix |

No plugin depends on the `?author=N` query var for functionality that would break if blocked. [VERIFIED]

### 3b. REST author parameter tests

**`/wp/v2/posts?author=1`:**
- HTTP 200. Response body: `[]` (empty array — user 1 has no standard posts, only pages/CPTs). [VERIFIED]

**`/wp/v2/shelter-stories?author=4`:**
- HTTP 200. Response body: array of shelter stories authored by user 4. Returns full story objects. [VERIFIED]

The `author` parameter is accepted as a legitimate REST filter on standard and custom post types. This is expected WordPress REST API behavior — it filters posts by author ID, not a security concern in itself (author IDs are integers, not handles). [VERIFIED]

### 3c. Dependencies on author-filtered queries

No code on this site uses `?author=N` frontend enumeration as a functional dependency. The only `author` parameter usage is the standard WordPress REST API parameter for filtering posts by author ID, which is unaffected by removing the `/wp/v2/users` route or blocking `?author=N` redirects. [VERIFIED]

---

## 4. THE WP EDITING SURFACE

### 4a. Published pages

```
ID   post_title                        post_name                post_author  post_status
391  Declaración de Accesibilidad      accesibilidad            1            publish
385  Accessibility Statement           accessibility            1            publish
390  Términos de Servicio              terminos-de-servicio     1            publish
384  Terms of Service                  terms-of-service         1            publish
389  Política de Privacidad            politica-de-privacidad   1            publish
383  Privacy Policy                    privacy-policy           1            publish
335  Home - Español                    home-espanol             1            publish
14   Home                              home                     1            publish
341  Eventos                           eventos                  1            publish
13   Events                            events                   1            publish
12   Happy Tails                       stories                  1            publish
343  Historias Felices                  historias-felices        1            publish
349  Programa TNVR                     programa-tnvr            1            publish
11   TNVR Program                      tnvr                     1            publish
347  Refugio Animal RG CARES           refugio-animal-rg-cares  1            publish
10   RG CARES Animal Shelter           rg-cares                 1            publish
337  Acerca de Four Legs Good          acerca-de-four-legs-good 1            publish
9    About Four Legs Good              about-us                 1            publish
345  Cómo Ayudar                       como-ayudar              1            publish
8    How to Help                       how-to-help              1            publish
339  Adopta una Mascota                adopta-una-mascota       1            publish
7    Adopt a Pet                       adopt                    1            publish
```

All pages have `post_author=1`. [VERIFIED] No page is authored by the dashboard-push service account.

### 4b. Marker comments in page content

All pages use standard Gutenberg block markup (`<!-- wp:cover -->`, `<!-- wp:heading -->`, etc.). No pages contain `do-not-edit` / `do-not-touch` language or custom marker comments **except** the Home page (ID 14) and Home - Español (ID 335), which use custom PHP-side marker comments:

- `<!-- FEATURED_ANIMALS -->` — split point for `render_featured_animals()` PHP function
- `<!-- FEATURED_STORIES -->` — split point for `render_featured_stories()` PHP function
- `<!-- UPCOMING_EVENTS -->` — split point for `render_upcoming_events()` PHP function

These marker comments are consumed by `front-page.php` (see Q4c). The page content also includes `dynamic-section-warning` CSS-classed paragraphs that are stripped before rendering (staff sees them in the editor as visual guides). [VERIFIED — front-page.php:27-28]

### 4c. Home page structure (ID 14) and front-page.php

The Home page (ID 14) stores its content as Gutenberg blocks in `post_content`. `front-page.php` (4lg-theme) renders it with a marker-comment-based splitting system: [VERIFIED]

```php
// front-page.php splits content at marker comments:
$parts = explode('<!-- FEATURED_ANIMALS -->', $content);
echo $parts[0];                     // Hero section (blocks)
echo render_featured_animals();     // PHP-rendered dynamic section
// Then splits for FEATURED_STORIES, UPCOMING_EVENTS similarly
```

The `front-page.php` template is selected by WordPress's template hierarchy because WordPress reads "Your homepage displays: A static page → Home" from settings. [VERIFIED — front-page.php exists at theme root]

### 4d. Post types: wp-admin vs dashboard push

| Post Type | Edited In | post_author distribution |
|-----------|-----------|--------------------------|
| page | wp-admin only | All author=1 [VERIFIED] |
| shelter_story (published) | Originally wp-admin (author=1), newer ones via dashboard push (author=4) | author=1: 10 posts [VERIFIED] |
| shelter_event (published) | Both wp-admin and dashboard push | author=1: 11 posts, author=4: 8 posts [VERIFIED] |

---

## 5. AUTHOR BYLINES ON THE FRONT END

**No author bylines are rendered anywhere in the active theme.** [VERIFIED]

Grep of all active PHP templates (excluding `_archived-hardcoded-templates/`) for `the_author`, `get_the_author`, `get_the_author_meta`, `the_author_posts_link`, `get_author_posts_url`: zero hits. [VERIFIED]

The theme has no `author.php` template and no `archive.php` template. Author archive URLs (`/author/dashboard-push/`, `/author/flgnynjaigmail-com/`) fall through to `index.php`, which renders post titles and excerpts without any author attribution. [VERIFIED]

**The service account name "dashboard-push" does NOT appear on any public page via template rendering.** However, it IS exposed through:
1. The `<title>` tag on the author archive page: `<title>dashboard-push - Four Legs Good</title>` [VERIFIED]
2. The REST API user listing (round 1 finding)
3. The `Link` HTTP header on the author archive page: `<https://www.fourlegsgoodnynj.org/wp-json/wp/v2/users/4>` [VERIFIED]

---

## 6. POLYLANG / SPANISH SURFACE

### 6a. `?author=1` on the Spanish surface

```
curl -i "https://www.fourlegsgoodnynj.org/es/?author=1"
HTTP/2 301
Location: https://www.fourlegsgoodnynj.org/es/author/flgnynjaigmail-com/
```

**The Spanish surface leaks the same admin slug via 301 redirect.** [VERIFIED] SG Security's (or SiteGround WAF's) `?author=N` blocking that returns 403 for IDs 2-4 on the English surface does NOT block `?author=1` on the Spanish surface either.

### 6b. REST users on the Spanish surface

```
curl -i "https://www.fourlegsgoodnynj.org/es/wp-json/wp/v2/users"
HTTP/2 404
```

The `/es/wp-json/...` path returns a 404 HTML page (the Spanish 404 template). [VERIFIED]

The REST API root is at `/wp-json/...` (no language prefix). Polylang does not create per-language REST endpoints. The single REST root at `https://www.fourlegsgoodnynj.org/wp-json/wp/v2/users` serves both languages and is the only REST surface that needs protection. [VERIFIED]

---

## 7. SG SECURITY'S disable_usernames IMPLEMENTATION

### What `disable_usernames` actually does

The `sg_security_disable_usernames` option does **NOT** block `?author=N` enumeration or REST API user listing. [VERIFIED]

**Implementation (file:line evidence):**

`core/Loader/Loader.php:306-313`:
```php
if ( ! Options_Service::is_enabled( 'disable_usernames' ) ) {
    return;
}
add_action( 'illegal_user_logins', array( $this->usernames_service, 'get_illegal_usernames' ) );
```

When enabled, it hooks `illegal_user_logins` to block registration of common usernames (`administrator`, `user1`, `admin`, `user`). [VERIFIED — Loader.php:306-313]

`core/Usernames_Service/Usernames_Service.php`: The class contains three functions:
1. `get_illegal_usernames()` — returns a list of banned usernames for new registrations [VERIFIED — line 33]
2. `change_common_username()` — renames an existing common username via `$wpdb->update` [VERIFIED — line 57]
3. `check_for_common_usernames()` — checks if any admin has a common username [VERIFIED — line 74]

**None of these functions hook `parse_request`, `redirect_canonical`, `template_redirect`, `rest_endpoints`, `rest_user_query`, or any other filter related to user enumeration.** [VERIFIED]

### So what is blocking `?author=2,3,4` with 403?

The 403 responses for `?author=2,3,4,5,6,10,100` are **NOT from WordPress or SG Security plugin**. Evidence:

1. The 403 response body is `403 - Forbidden | Access to this page is forbidden.` — a generic SiteGround WAF message, not a WordPress error page. [VERIFIED]
2. The response headers for 403 responses have a different `host-header` value (`8441280b0c35cbc1147f8ba998a563a7`) than the 301 for `?author=1` (`6b7412fb82ca5edfd0917e3957f05d89`), indicating different upstream handling. [VERIFIED — round 1 curl output]
3. The 403 responses include `x-proxy-cache-info: DT:1` — a SiteGround proxy directive, not a WordPress header. [VERIFIED]
4. No `.htaccess` rule blocks `?author=` — `.htaccess` contains only XMLRPC blocking, standard WP rewrite rules, and an SGO Vary unset. [VERIFIED]

**Why `?author=1` passes through while others get 403:** [UNCERTAIN]

Likely explanation: SiteGround's WAF/reverse proxy blocks `?author=N` requests that would result in a 404 (authors with no published standard posts), but `?author=1` resolves to a valid author archive redirect. Authors 2,3,5 are editors with no standard `post` type posts (they may have CPT posts, but WordPress author archives don't include CPTs by default). The WAF may intercept the 404/empty-archive response and convert it to 403. This is speculative — the SiteGround WAF configuration is not accessible via SSH.

---

## 8. AUTHOR ARCHIVE DIRECT ACCESS

### `/author/dashboard-push/`

```
HTTP/2 200
<title>dashboard-push - Four Legs Good</title>
Link: <https://www.fourlegsgoodnynj.org/wp-json/wp/v2/users/4>; rel="alternate"
```

The author archive page **renders successfully** (HTTP 200). [VERIFIED] It falls through to `index.php` (no `author.php` template exists). The page renders with no posts (the `dashboard-push` user's posts are CPTs, not standard posts, so `index.php`'s default query returns nothing). The `<title>` tag exposes the username "dashboard-push". The `Link` header exposes the REST API user endpoint for ID 4.

### `/author/flgnynjaigmail-com/`

```
HTTP/2 200
<title>Four Legs Good - Four Legs Good</title>
Link: <https://www.fourlegsgoodnynj.org/wp-json/wp/v2/users/1>; rel="alternate"
```

The admin's author archive also renders (HTTP 200). [VERIFIED] The `<title>` shows the display name "Four Legs Good" (not the slug). The `Link` header exposes the REST API user endpoint for ID 1.

**Both author archives are directly accessible to anyone who knows or guesses the slug.** Even after blocking `?author=N` enumeration and the REST API user listing, these archive URLs remain accessible. However:
- They cannot be discovered via `?author=N` (proposed fix blocks this)
- They cannot be discovered via `/wp-json/wp/v2/users` (proposed fix blocks this)
- They could still be discovered via Rank Math's author sitemap, but that is already disabled (`authors_sitemap => 'off'`). [VERIFIED — round 1 finding]
- Web crawlers that have already indexed these URLs may retain them

---

## Summary for Implementation Planning

1. **`is_user_logged_in()` is safe to use in the `rest_endpoints` filter.** The current user is fully resolved (via `determine_current_user` cascade including Application Passwords) during `check_authentication()`, which completes before `dispatch()` → `get_routes()` → `rest_endpoints`. [VERIFIED]

2. **A `parse_request` hook for `?author=N` blocking is safe and orthogonal to REST.** REST requests pass through `parse_request` but carry `rest_route` as their query var, not `author`. A hook checking `$wp->query_vars['author']` will block enumeration without touching REST. [VERIFIED]

3. **No legitimate consumer depends on `?author=N` redirects or anonymous `/wp/v2/users` access.** [VERIFIED]

4. **The Spanish surface shares the same REST root** (`/wp-json/...` not `/es/wp-json/...`), so one filter covers both languages. The `?author=N` block needs to work on `/es/?author=N` too — the `parse_request` hook sees the same `author` query var regardless of Polylang language prefix. [VERIFIED]

5. **Author archives (`/author/<slug>/`) remain accessible by direct URL.** The proposed fix reduces the attack surface by eliminating the discovery vectors, not the archives themselves. Blocking archives entirely would require an additional `template_redirect` hook or Rank Math setting change (author archives are already off in the sitemap). [VERIFIED]

6. **SG Security's `disable_usernames` does NOT block enumeration** — it only blocks registration of common usernames. The 403 responses on `?author=2+` are from SiteGround's server-level WAF, not from WordPress or SG Security plugin code. [VERIFIED]

7. **No author bylines render on public pages.** The service account name is not visible to visitors except through the enumeration vectors being addressed. [VERIFIED]
