# WordPress REST Auth Throttle + Enumeration Root Cause

**Date:** 2026-07-01 01:03 UTC

---

## Q1 — Is the REST / Application-Password Auth Surface Throttled?

### 1. sg-security hook analysis

The full hook registration in `core/Loader/Loader.php` was inspected. sg-security's login limiter is wired exclusively to the form-login path:

| Hook | Line | Purpose |
|------|------|---------|
| `login_init` | 423 | `restrict_login_to_ips` — IP allowlist check (form only) |
| `login_head` | 431 | `maybe_block_login_access` — block after threshold |
| `login_errors` | 433 | `log_login_attempt` — records failed attempt |
| `wp_login` | 435 | `reset_login_attempts` — clears counter on success |

**Not hooked:** `rest_authentication_errors`, `application_password_failed_authentication`, `wp_authenticate_application_password`, `rest_pre_dispatch` (for auth). [VERIFIED — grep for all five patterns returned zero matches in sg-security source]

The only REST-related hooks in sg-security are:
- `rest_api_init` (lines 113, 268) — registers sg-security's own settings/management REST routes
- `rest_post_dispatch` (line 591) — sets security response headers (X-Content-Type-Options, X-XSS-Protection)

Neither performs auth-failure counting. [VERIFIED — source inspection]

**sg-security does not throttle REST/Application-Password auth failures.** The login limiter is form-path-only. [VERIFIED]

### 2. .htaccess inspection

Full .htaccess contents:

```
# SGS XMLRPC Disable Service — deny all to xmlrpc.php
# WordPress rewrite rules (standard)
# SGO Unset Vary — Header unset Vary
```

No rules touching `/wp-json/`, the `Authorization` header, or REST endpoints. The `RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]` line passes the Authorization header through to PHP (standard WP requirement for App Passwords behind nginx/Apache) — it does not restrict or rate-limit it. [VERIFIED — full .htaccess content inspected]

### 3. Anonymous GET to /wp-json/ — response headers

```
HTTP/2 200
server: nginx
x-robots-tag: noindex
access-control-allow-headers: Authorization, X-WP-Nonce, Content-Disposition, Content-MD5, Content-Type
access-control-expose-headers: X-WP-Total, X-WP-TotalPages, Link
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
allow: GET
x-httpd: 1
host-header: 8441280b0c35cbc1147f8ba998a563a7
x-proxy-cache-info: DT:1
```

**No rate-limit headers present:** no `Retry-After`, no `X-RateLimit-*`, no `X-Rate-Limit-*`. [VERIFIED]

`x-proxy-cache-info: DT:1` and `host-header` are SiteGround infrastructure markers. `server: nginx` is the SiteGround edge. No WAF-specific headers (no Cloudflare, no Sucuri, no Imperva markers). [VERIFIED]

**Whether SiteGround's nginx edge layer has an implicit connection-rate or request-rate limiter on /wp-json/ paths is not determinable from header inspection alone.** SiteGround's managed infrastructure may include nginx `limit_req` zones, but these are not visible in response headers unless triggered. [UNCERTAIN — not determinable without an intrusive repeated-failed-auth probe; we will not perform one]

### 4. Application Passwords availability

```
wp eval 'var_dump( wp_is_application_passwords_available() );'
→ bool(false)
```

This returns false because `is_ssl()` is false in the wp-cli context (no HTTPS in shell). **The App Password door is confirmed live in practice** — dashboard-push's "Dashboard API" App Password was last used 2026-06-30 (from the previous audit). WordPress's `wp_is_application_passwords_available()` requires HTTPS, which is satisfied by actual web requests but not by CLI. [VERIFIED — is_ssl()=false in CLI; last_used timestamp confirms real-world HTTPS usage]

### 5. XML-RPC status

- `sg_security_disable_xml_rpc` = `1` [VERIFIED — wp option get]
- `.htaccess` contains `<Files xmlrpc.php> order deny,allow / deny from all </Files>` [VERIFIED]

**XML-RPC is closed at both the application layer (sg-security) and the web server layer (.htaccess deny).** This related basic-auth vector is fully blocked. [VERIFIED]

### Verdict

**There is no visible throttle on the REST/Application-Password auth surface at the WordPress application layer.** sg-security's login limiter covers only the form path. .htaccess has no REST restrictions. No WAF/rate-limit headers are present in REST responses.

The known username `dashboard-push` (leaked via /wp-json/wp/v2/users) has an active Application Password. An attacker who discovered this username could attempt brute-force basic-auth against any /wp-json/ endpoint without triggering sg-security's login counter.

**SiteGround's edge/nginx layer may provide implicit rate-limiting at the connection or request level**, but this cannot be confirmed or denied from non-intrusive inspection. [UNCERTAIN — would require an actual repeated-request probe to determine, which is out of scope]

---

## Q2 — Enumeration Root Cause + Authorship Inventory

### Published post counts by author

| User ID | user_login | role | Published posts |
|---------|-----------|------|----------------|
| 1 | flgnynjai@gmail.com | administrator | 41 |
| 4 | dashboard-push | dashboard_service | 3 |
| 2 | Thalia | editor | 0 |
| 3 | Gayle | editor | 0 |
| 5 | Lyra | editor | 0 |

[VERIFIED — wp post list --format=count for all 5 users]

**Confirmed:** Users 1 and 4 appear in the REST /users endpoint because they have published posts. Users 2, 3, 5 have zero published posts and are correctly excluded. The enumeration is a direct consequence of authorship. [VERIFIED]

### Author 1 (administrator) — 41 published posts

| Post type | Count | Items |
|-----------|-------|-------|
| page | 20 | Home, Home-ES, Adopt, About, How to Help, Events, Happy Tails, TNVR, RG CARES, Privacy Policy, Terms of Service, Accessibility Statement + their Spanish translations |
| shelter_story | 10 | Better Days for B and B, Love for Louise, Time for Tinka, Pets Alive to the Rescue!, Cheshire Found His People + their Spanish translations |
| shelter_event | 11 | Volunteer Orientation (×4), Test Event, Late Winter Bow Wow, Pet Supplies Plus Fundraiser, Spring Adoption Fair + 2 Spanish translations, 1 historical |

[VERIFIED — wp post list --author=1 full output]

The 20 pages are static site structure (Home, Adopt, About, etc.) — these were created during site build and are operationally stable. The shelter_story and shelter_event posts (21 total) were likely created before the dashboard-push service account existed, during initial content population.

### Author 4 (dashboard-push) — 3 published posts

| ID | Post type | Title |
|----|-----------|-------|
| 438 | shelter_event | Volunteer Orientation |
| 437 | shelter_event | Volunteer Orientation |
| 371 | shelter_event | Volunteer Orientaton |

[VERIFIED — wp post list --author=4 full output]

All 3 are shelter_event CPT posts — events pushed through the dashboard service. No stories have been pushed by dashboard-push yet (the older stories were created by author 1 before the push flow existed).

### Reassignment feasibility assessment (data only — no action taken)

To remove author 1 from REST enumeration, all 41 published posts would need reassignment to another user. The 20 pages are straightforward (static content, any user works). The 21 shelter_story/shelter_event posts could be reassigned to dashboard-push if desired, since that's the service account that would create them going forward.

However: reassigning the 20 pages to dashboard-push would also require `edit_pages` capability on that role, which it currently lacks. An alternative would be reassigning pages to an editor account (which has edit_pages by default).

**No reassignment performed. This is inventory for John's judgment.**
