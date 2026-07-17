# WordPress REST User-Enumeration — Application Passwords Probe

Date: 2026-07-17 00:50 UTC

---

## A — APPLICATION-PASSWORDS ROUTES

### A0. Maximum user ID

```
$ wp user list --field=ID --path=$WP | sort -n
1
2
3
4
5
```

Maximum user ID: **5**. Nonexistent ID used below: **99999** (safely above 5).

### A1. Discriminating comparison — full responses

**A1a. `GET /wp/v2/users/1/application-passwords` (existing user, administrator)**
```json
{"code":"rest_cannot_list_application_passwords","message":"Sorry, you are not allowed to list application passwords for this user.","data":{"status":401}}
```
HTTP status: **401**

**A1b. `GET /wp/v2/users/4/application-passwords` (existing user, dashboard_service)**
```json
{"code":"rest_cannot_list_application_passwords","message":"Sorry, you are not allowed to list application passwords for this user.","data":{"status":401}}
```
HTTP status: **401**

**A1c. `GET /wp/v2/users/99999/application-passwords` (nonexistent user)**
```json
{"code":"rest_user_invalid_id","message":"Invalid user ID.","data":{"status":404}}
```
HTTP status: **404**

**A1d. `GET /wp/v2/users/1/application-passwords/00000000-0000-0000-0000-000000000000` (existing user)**
```json
{"code":"rest_cannot_read_application_password","message":"Sorry, you are not allowed to read this application password.","data":{"status":401}}
```
HTTP status: **401**

**A1e. `GET /wp/v2/users/4/application-passwords/00000000-0000-0000-0000-000000000000` (existing user)**
```json
{"code":"rest_cannot_read_application_password","message":"Sorry, you are not allowed to read this application password.","data":{"status":401}}
```
HTTP status: **401**

**A1f. `GET /wp/v2/users/99999/application-passwords/00000000-0000-0000-0000-000000000000` (nonexistent user)**
```json
{"code":"rest_user_invalid_id","message":"Invalid user ID.","data":{"status":404}}
```
HTTP status: **404**

**A1g. `GET /wp/v2/users/1/application-passwords/introspect` (existing user)**
```json
{"code":"rest_cannot_introspect_app_password_for_non_authenticated_user","message":"The authenticated application password can only be introspected for the current user.","data":{"status":401}}
```
HTTP status: **401**

**A1h. `GET /wp/v2/users/4/application-passwords/introspect` (existing user)**
```json
{"code":"rest_cannot_introspect_app_password_for_non_authenticated_user","message":"The authenticated application password can only be introspected for the current user.","data":{"status":401}}
```
HTTP status: **401**

**A1i. `GET /wp/v2/users/99999/application-passwords/introspect` (nonexistent user)**
```json
{"code":"rest_user_invalid_id","message":"Invalid user ID.","data":{"status":404}}
```
HTTP status: **404**

### A2. Comparison table

| Request | URL suffix | HTTP status | JSON code | JSON message |
|---------|-----------|------------|-----------|--------------|
| A1a | /users/1/application-passwords | 401 | rest_cannot_list_application_passwords | Sorry, you are not allowed to list application passwords for this user. |
| A1b | /users/4/application-passwords | 401 | rest_cannot_list_application_passwords | Sorry, you are not allowed to list application passwords for this user. |
| A1c | /users/99999/application-passwords | 404 | rest_user_invalid_id | Invalid user ID. |
| A1d | /users/1/app-passwords/{uuid} | 401 | rest_cannot_read_application_password | Sorry, you are not allowed to read this application password. |
| A1e | /users/4/app-passwords/{uuid} | 401 | rest_cannot_read_application_password | Sorry, you are not allowed to read this application password. |
| A1f | /users/99999/app-passwords/{uuid} | 404 | rest_user_invalid_id | Invalid user ID. |
| A1g | /users/1/app-passwords/introspect | 401 | rest_cannot_introspect_app_password_for_non_authenticated_user | The authenticated application password can only be introspected for the current user. |
| A1h | /users/4/app-passwords/introspect | 401 | rest_cannot_introspect_app_password_for_non_authenticated_user | The authenticated application password can only be introspected for the current user. |
| A1i | /users/99999/app-passwords/introspect | 404 | rest_user_invalid_id | Invalid user ID. |

**Enumeration oracle: CONFIRMED PRESENT on all three route patterns.**

Discriminating values:
- Existing user ID → HTTP 401, JSON code is a route-specific "not allowed" error
- Nonexistent user ID → HTTP 404, JSON code `rest_user_invalid_id`

An anonymous requester can determine which user IDs exist by comparing 401 vs 404.

Contradicting result that would have disproved this: if both existing and nonexistent IDs returned the same HTTP status and same JSON error code. They do not.

### A3. Anonymous GET on 'me' variants

**A3a. `GET /wp/v2/users/me`**
```json
{"code":"rest_not_logged_in","message":"You are not currently logged in.","data":{"status":401}}
```
HTTP status: **401**

**A3b. `GET /wp/v2/users/me/application-passwords`**
```json
{"code":"rest_not_logged_in","message":"You are not currently logged in.","data":{"status":401}}
```
HTTP status: **401**

**A3c. `GET /wp/v2/users/me/application-passwords/introspect`**
```json
{"code":"rest_not_logged_in","message":"You are not currently logged in.","data":{"status":401}}
```
HTTP status: **401**

All three `me` requests return 401 with `rest_not_logged_in`. The `me` literal resolves in `get_user()` at class-wp-rest-application-passwords-controller.php:700 before the user-existence check, so the code path hits the `is_user_logged_in()` gate and returns without revealing whether any user exists. No enumeration oracle via `me`.

### A4. Sensitive data check

No response in A1 or A3 returned HTTP 200. No response contained: an application password name, uuid, created/last_used timestamp, last_ip, user_login, slug, display_name, email, or gravatar hash. All responses were JSON error objects with only a code, message, and status.

### A5. Source read — Application Passwords REST controller

File: `/home/customer/www/johnv80.sg-host.com/public_html/wp-includes/rest-api/endpoints/class-wp-rest-application-passwords-controller.php`

**A5a. `get_items_permissions_check()` — verbatim (found at line 112):**
```php
public function get_items_permissions_check( $request ) {
    $user = $this->get_user( $request );

    if ( is_wp_error( $user ) ) {
        return $user;
    }

    if ( ! current_user_can( 'list_app_passwords', $user->ID ) ) {
        return new WP_Error(
            'rest_cannot_list_application_passwords',
            __( 'Sorry, you are not allowed to list application passwords for this user.' ),
            array( 'status' => rest_authorization_required_code() )
        );
    }

    return true;
}
```

**`get_item_permissions_check()` — verbatim (found at line 165):**
```php
public function get_item_permissions_check( $request ) {
    $user = $this->get_user( $request );

    if ( is_wp_error( $user ) ) {
        return $user;
    }

    if ( ! current_user_can( 'read_app_password', $user->ID, $request['uuid'] ) ) {
        return new WP_Error(
            'rest_cannot_read_application_password',
            __( 'Sorry, you are not allowed to read this application password.' ),
            array( 'status' => rest_authorization_required_code() )
        );
    }

    return true;
}
```

**`get_current_item_permissions_check()` (introspect) — verbatim (found at line 484):**
```php
public function get_current_item_permissions_check( $request ) {
    $user = $this->get_user( $request );

    if ( is_wp_error( $user ) ) {
        return $user;
    }

    if ( get_current_user_id() !== $user->ID ) {
        return new WP_Error(
            'rest_cannot_introspect_app_password_for_non_authenticated_user',
            __( 'The authenticated application password can only be introspected for the current user.' ),
            array( 'status' => rest_authorization_required_code() )
        );
    }

    return true;
}
```

**A5b. `get_user()` — verbatim (found at line 681):**
```php
protected function get_user( $request ) {
    if ( ! wp_is_application_passwords_available() ) {
        return new WP_Error(
            'application_passwords_disabled',
            __( 'Application passwords are not available.' ),
            array( 'status' => 501 )
        );
    }

    $error = new WP_Error(
        'rest_user_invalid_id',
        __( 'Invalid user ID.' ),
        array( 'status' => 404 )
    );

    $id = $request['user_id'];

    if ( 'me' === $id ) {
        if ( ! is_user_logged_in() ) {
            return new WP_Error(
                'rest_not_logged_in',
                __( 'You are not currently logged in.' ),
                array( 'status' => 401 )
            );
        }

        $user = wp_get_current_user();
    } else {
        $id = (int) $id;

        if ( $id <= 0 ) {
            return $error;
        }

        $user = get_userdata( $id );
    }

    if ( empty( $user ) || ! $user->exists() ) {
        return $error;
    }

    if ( is_multisite() && ! user_can( $user->ID, 'manage_sites' ) && ! is_user_member_of_blog( $user->ID ) ) {
        return $error;
    }

    if ( ! wp_is_application_passwords_available_for_user( $user ) ) {
        return new WP_Error(
            'application_passwords_disabled_for_user',
            __( 'Application passwords are not available for your account. Please contact the site administrator for assistance.' ),
            array( 'status' => 501 )
        );
    }

    return $user;
}
```

**A5c. Order: user existence is resolved BEFORE the capability check.**

In all three permission check methods, the sequence is:
1. `$user = $this->get_user( $request )` — line 113, 166, 485
2. `if ( is_wp_error( $user ) ) { return $user; }` — line 115, 168, 487
3. Capability check (`current_user_can(...)` or `get_current_user_id() !== $user->ID`) — line 119, 172, 491

Inside `get_user()`:
1. `wp_is_application_passwords_available()` check — line 682
2. `get_userdata( $id )` — line 714
3. `empty( $user ) || ! $user->exists()` — line 718 → returns `rest_user_invalid_id` (404)
4. `wp_is_application_passwords_available_for_user( $user )` — line 726 (only reached if user exists)
5. Returns `$user` object (only reached if user exists and app passwords available for them)

The `get_user()` error for a nonexistent user (404 `rest_user_invalid_id`) is returned from the permissions check method BEFORE the capability check on line 119/172/491 ever runs. For an existing user, `get_user()` returns the user object, the `is_wp_error()` check passes, and the capability check runs, producing the 401.

This ordering is what creates the enumeration oracle: the response differs based on whether the user exists, and this difference is returned to the anonymous caller.

**A5d. Distinct HTTP statuses `get_user()` can return:**

| Status | Condition | Error code |
|--------|-----------|------------|
| 501 | `wp_is_application_passwords_available()` returns false | `application_passwords_disabled` |
| 404 | `$id <= 0` | `rest_user_invalid_id` |
| 404 | `get_userdata($id)` returns empty/non-existent | `rest_user_invalid_id` |
| 404 | Multisite: user exists but not a member of the blog and can't manage_sites | `rest_user_invalid_id` |
| 401 | `$id === 'me'` and `is_user_logged_in()` is false | `rest_not_logged_in` |
| 501 | `wp_is_application_passwords_available_for_user($user)` returns false | `application_passwords_disabled_for_user` |
| (none — returns `$user` object) | All checks pass | (success — not an error) |

**A5e. `wp_is_application_passwords_available()` gating:**

The function is at `wp-includes/user.php:5140`:
```php
function wp_is_application_passwords_available() {
    return apply_filters( 'wp_is_application_passwords_available', wp_is_application_passwords_supported() );
}
```

`wp_is_application_passwords_supported()` at `wp-includes/user.php:5125`:
```php
function wp_is_application_passwords_supported() {
    return is_ssl() || 'local' === wp_get_environment_type();
}
```

This check is at `get_user()` line 682, BEFORE the user existence check at lines 714/718.

wp-cli reports `wp_is_application_passwords_available()` returns `false`. However, this is a wp-cli artifact — `is_ssl()` returns false in CLI context. Over HTTPS (which all REST requests to this site use), `is_ssl()` returns true, and the function returns true. The observed HTTP responses confirm this: no response returned 501 `application_passwords_disabled`. All existing-user responses reached the capability check (401), which is only possible if `wp_is_application_passwords_available()` returned true.

Contradicting result: if any existing-user request had returned 501 `application_passwords_disabled`, that would mean the availability check gates before user existence, and the enumeration oracle would not exist on this route. That did not happen.

---

## B — DOES THE PROPOSED FILTER TOUCH THESE ROUTES?

### B1. Exact key strings for all six core wp/v2 user routes

From the anonymous route index (`curl -s https://www.fourlegsgoodnynj.org/wp-json/ | python3 -c "..."`):

```
'/wp/v2/users'
'/wp/v2/users/(?P<id>[\\d]+)'
'/wp/v2/users/(?P<user_id>(?:[\\d]+|me))/application-passwords'
'/wp/v2/users/(?P<user_id>(?:[\\d]+|me))/application-passwords/(?P<uuid>[\\w\\-]+)'
'/wp/v2/users/(?P<user_id>(?:[\\d]+|me))/application-passwords/introspect'
'/wp/v2/users/me'
```

### B2. Match check

The proposed mu-plugin unsets exactly two keys:
1. `'/wp/v2/users'`
2. `'/wp/v2/users/(?P<id>[\\d]+)'`

The application-passwords route keys are:
3. `'/wp/v2/users/(?P<user_id>(?:[\\d]+|me))/application-passwords'`
4. `'/wp/v2/users/(?P<user_id>(?:[\\d]+|me))/application-passwords/(?P<uuid>[\\w\\-]+)'`
5. `'/wp/v2/users/(?P<user_id>(?:[\\d]+|me))/application-passwords/introspect'`

**No.** Neither of the two proposed filter keys matches any application-passwords route key. They are distinct strings. Keys 1 and 2 are exact string comparisons; they do not match keys 3, 4, or 5. The application-passwords routes will remain registered after the proposed filter runs.

The enumeration oracle on the application-passwords routes will therefore NOT be closed by the proposed fix.

---

## C — CLAIM 6 DISCRIMINATOR: IS THE AUTHOR PARAM A REAL FILTER?

### C1. STRUCTURAL — register_post_type() supports arrays

**shelter_story** — `functions.php:444` (located by `register_post_type('shelter_story', $args)` at line 447; `$args` defined starting line 434):
```php
'supports' => array('title', 'editor', 'thumbnail', 'custom-fields'),
```
`'author'` is **NOT** present.

**shelter_event** — `functions.php:1108` (located by `register_post_type('shelter_event', $args)` at line 1112; `$args` defined starting line 1098):
```php
'supports' => array('title', 'editor', 'thumbnail', 'custom-fields'),
```
`'author'` is **NOT** present.

### C2. BEHAVIORAL — X-WP-Total comparison

| Request | URL | X-WP-Total |
|---------|-----|-----------|
| C2a | /wp/v2/shelter-stories?per_page=1 | 10 |
| C2b | /wp/v2/shelter-stories?per_page=1&author=4 | 10 |
| C2c | /wp/v2/shelter-stories?per_page=1&author=1 | 10 |
| C2d | /wp/v2/shelter-stories?per_page=1&author=99999 | 10 |
| C2e | /wp/v2/shelter-events?per_page=1 | 19 |
| C2f | /wp/v2/shelter-events?per_page=1&author=4 | 19 |
| C2g | /wp/v2/shelter-events?per_page=1&author=99999 | 19 |

Full headers for each (representative — all followed the same pattern):

**C2a: shelter-stories, no author param**
```
HTTP/2 200
server: nginx
date: Fri, 17 Jul 2026 00:37:48 GMT
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

**C2d: shelter-stories, author=99999 (nonexistent user)**
```
HTTP/2 200
server: nginx
date: Fri, 17 Jul 2026 00:37:49 GMT
content-type: application/json; charset=UTF-8
vary: Accept-Encoding
x-robots-tag: noindex
access-control-expose-headers: X-WP-Total, X-WP-TotalPages, Link
access-control-allow-headers: Authorization, X-WP-Nonce, Content-Disposition, Content-MD5, Content-Type
x-wp-total: 10
x-wp-totalpages: 10
link: <https://www.fourlegsgoodnynj.org/wp-json/wp/v2/shelter-stories?per_page=1&author=99999&page=2>; rel="next"
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
allow: GET
x-httpd: 1
host-header: 8441280b0c35cbc1147f8ba998a563a7
x-proxy-cache-info: DT:1
```

**C2g: shelter-events, author=99999 (nonexistent user)**
```
HTTP/2 200
server: nginx
date: Fri, 17 Jul 2026 00:37:58 GMT
content-type: application/json; charset=UTF-8
vary: Accept-Encoding
x-robots-tag: noindex
access-control-expose-headers: X-WP-Total, X-WP-TotalPages, Link
access-control-allow-headers: Authorization, X-WP-Nonce, Content-Disposition, Content-MD5, Content-Type
x-wp-total: 19
x-wp-totalpages: 19
link: <https://www.fourlegsgoodnynj.org/wp-json/wp/v2/shelter-events?per_page=1&author=99999&page=2>; rel="next"
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
allow: GET
x-httpd: 1
host-header: 8441280b0c35cbc1147f8ba998a563a7
x-proxy-cache-info: DT:1
```

### C3. Answer

**shelter_story:** X-WP-Total is 10 for no-param, author=4, author=1, and author=99999. The `author` parameter is **IGNORED**. The prior claim ("live, working author filter") is **FALSE**.

Contradicting result: if author=99999 had returned X-WP-Total of 0 (no posts by nonexistent user), that would prove the filter works. It returned 10 (the full set), proving the parameter has no effect.

**shelter_event:** X-WP-Total is 19 for no-param, author=4, and author=99999. The `author` parameter is **IGNORED**. Same reasoning.

Both CPTs omit `'author'` from their `'supports'` array, which is why WordPress's REST controller does not register `author` as a valid query parameter for these post types. The `?author=N` parameter in the query string is silently ignored.

### C4. post_author values

**shelter_story (all published):**

| ID | Title | post_author |
|----|-------|-------------|
| 361 | Mejores Días para B y B | 1 |
| 291 | Better Days for B and B | 1 |
| 362 | Amor para Louise | 1 |
| 288 | Love for Louise | 1 |
| 363 | El Momento de Tinka | 1 |
| 266 | Time for Tinka | 1 |
| 364 | ¡Pets Alive al Rescate! | 1 |
| 237 | Pets Alive to the Rescue! | 1 |
| 365 | Cheshire Encontró a Su Gente | 1 |
| 223 | Cheshire Found His People | 1 |

All 10 stories have post_author = 1. No rows have post_author = 0 or empty.

**shelter_event (all published):**

| ID | Title | post_author |
|----|-------|-------------|
| 471 | Finales de Invierno Bow Wow | 1 |
| 469 | Orientación para Voluntarios | 1 |
| 468 | Orientación para Voluntarios | 1 |
| 467 | Orientación para Voluntarios | 4 |
| 466 | ¡Encuentra a Tu Nuevo Mejor Amigo! | 4 |
| 465 | Orientación para Voluntarios | 4 |
| 464 | Orientación para Voluntarios | 4 |
| 440 | Find Your New Best Friend! | 4 |
| 438 | Volunteer Orientation | 4 |
| 437 | Volunteer Orientation | 4 |
| 371 | Volunteer Orientaton | 4 |
| 366 | Orientación para Voluntarios | 1 |
| 323 | Volunteer Orientaton | 1 |
| 310 | Volunteer Orientation | 1 |
| 307 | Volunteer Orientation | 1 |
| 254 | Late Winter Bow Wow | 1 |
| 249 | Volunteer Orientation | 1 |
| 248 | Pet Supplies Plus Fundraiser | 1 |
| 247 | Spring Adoption Fair | 1 |

19 events. 10 have post_author = 1, 9 have post_author = 4. No rows have post_author = 0 or empty. The non-zero post_author values are present because WordPress sets post_author to the creating user regardless of whether the CPT declares `'author'` support. The distinction: without `'author'` support, the REST API does not expose the author field in responses and does not register `author` as a query parameter, but the database column is still populated.

---

## D — PRE-DEPLOY BASELINE FOR ALL THREE DASHBOARD FEEDS

### D1. Homepage fetch results

| Page | HTTP status | Byte size |
|------|------------|-----------|
| EN (`/`) | 200 | 137,041 |
| ES (`/es/`) | 200 | 139,456 |

### D2. Feed counts

Selectors used (all `grep -oP` against the downloaded HTML):
- Animal cards: `grep -oP 'class="pet-card"' | wc -l` and `grep -oP 'class="pet-name"[^>]*>\K[^<]+'` for names
- Story cards: `grep -oP 'class="story-card"' | wc -l` and `grep -oP 'class="story-body".*?<h3[^>]*>\K[^<]+'` for titles
- Event cards: `grep -oP 'class="event-card"' | wc -l` and `grep -oP 'class="event-body".*?<h3[^>]*>\K[^<]+'` for titles

**EN homepage (`/`):**

| Feed | Count | Items |
|------|-------|-------|
| Featured animals | 6 | Nanook, Lupa, Leo (Petey), Lucky, Butterscotch, Dante |
| Featured stories | 2 | Love for Louise, Time for Tinka |
| Upcoming events | 1 | Volunteer Orientation |

**ES homepage (`/es/`):**

| Feed | Count | Items |
|------|-------|-------|
| Featured animals | 6 | Nanook, Lupa, Leo (Petey), Lucky, Butterscotch, Dante |
| Featured stories | 2 | Amor para Louise, El Momento de Tinka |
| Upcoming events | 1 | Orientación para Voluntarios |

### D3. Featured-animals failure marker

Searched all HTML comments in both pages:
```
grep -oP '<!--.*?-->' /tmp/baseline-home-en.html
```

EN comments found:
```
<!-- Search Engine Optimization by Rank Math - https://rankmath.com/ -->
<!-- /Rank Math WordPress SEO plugin -->
<!-- Contact Us Modal -->
<!-- Subscribe Modal (Constant Contact widget) -->
```

ES comments found:
```
<!-- Optimización para motores de búsqueda de Rank Math -  https://rankmath.com/ -->
<!-- /Plugin Rank Math WordPress SEO -->
<!-- Contact Us Modal -->
<!-- Subscribe Modal (Constant Contact widget) -->
```

No HTML comment indicating a fetch failure, empty result, or API error appears on either page. The failure markers from the code (`<!-- Featured animals error: ... -->`, `<!-- No featured slots -->`, `<!-- No featured animals available -->`) are absent.

**The featured-animals section is currently POPULATED** — 6 animal cards rendered with names, photos/videos, breeds, and bios on both EN and ES pages.

### D4. `render_featured_animals()` analysis

Found at `functions.php:458` (located by `function render_featured_animals` search).

**D4a. Outbound URL:**
```php
$response = wp_remote_get('http://66.228.37.38/api/featured-slots', array(
    'timeout' => 10,
    'sslverify' => false,
));
```
URL: `http://66.228.37.38/api/featured-slots`. No explicit Host header set. The request goes to the VPS bare IP over HTTP.

**D4b. User data / REST / author var usage:**
```
grep -i 'user\|author\|wp-json\|wp/v2/users' functions.php (lines 458-650)
```
Zero hits. The function reads no WordPress user data, calls no `/wp/v2/users` route, and does not read the `author` query var. It fetches exclusively from the VPS API at `66.228.37.38/api/featured-slots`.

**D4c. Failure rendering:**
```php
if (is_wp_error($response)) {
    return '<!-- Featured animals error: ' . esc_html($response->get_error_message()) . ' -->';
}
// ...
if (empty($data['slots']) || !is_array($data['slots'])) {
    return '<!-- No featured slots -->';
}
// ...
if (empty($renderable)) {
    return '<!-- No featured animals available -->';
}
```
On fetch failure: returns an HTML comment with the error message. On empty/malformed response: returns `<!-- No featured slots -->`. On no available animals: returns `<!-- No featured animals available -->`. All three are invisible to the visitor — the section renders empty with a buried comment.

### D5. `render_featured_stories()` and `render_upcoming_events()` analysis

**`render_featured_stories()`** — found at `functions.php:331`:
Uses `get_posts()` with `'post_type' => 'shelter_story'` and meta query. Reads post meta (`photo_1_url`, `story_date`, `animal_species`, `animal_breed`). Does not reference any user data, does not call `/wp/v2/users`, does not read the `author` query var.

**`render_upcoming_events()`** — found at `functions.php:1309`:
Uses `get_posts()` with `'post_type' => 'shelter_event'` and meta query on `event_date`. Reads post meta (`event_date`, `event_start_time`, `event_end_time`, `event_location`). Does not reference any user data, does not call `/wp/v2/users`, does not read the `author` query var.

Evidence: `grep -i 'user\|author\|wp-json\|wp/v2/users'` against the line ranges for both functions returned zero hits.

---

## BOTTOM-LINE ANSWERS

A4: **No** — no response returned HTTP 200 or contained any credential data (no application password name, uuid, timestamp, last_ip, user_login, slug, display_name, email, or gravatar hash).

A2: **Present** — user-ID enumeration oracle confirmed on all three application-passwords route patterns. Discriminating values: existing user → HTTP 401 with route-specific error code; nonexistent user → HTTP 404 with `rest_user_invalid_id`.

B2: **No** — proposed filter keys (`/wp/v2/users` and `/wp/v2/users/(?P<id>[\d]+)`) do not match any application-passwords route key. The enumeration oracle on application-passwords routes will remain after the proposed fix.

C3: shelter_story author param **ignored**; shelter_event author param **ignored**.

D3: featured-animals section currently **populated** (6 cards, no failure comment).

D4/D5: any homepage feed reads user data or the author query var: **no**.
