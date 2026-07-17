# WordPress Security Diagnosis — Post-Launch

**Date:** 2026-07-01 00:45 UTC

---

## Q1 — Old Staging URL Reachability

```
curl -sSIL https://johnv80.sg-host.com/
→ HTTP/2 301, Location: https://www.fourlegsgoodnynj.org/
→ HTTP/2 200 (final)
```

- `X-Redirect-By: WordPress` [VERIFIED — header present in 301 response]
- No `X-Robots-Tag` or `noindex` header on either hop [VERIFIED — absent from both response headers]

**Verdict: (b) Redirecting to the real domain.** johnv80.sg-host.com 301-redirects to www.fourlegsgoodnynj.org via WordPress. It is not serving a live second copy and is not separately noindexed (the redirect itself prevents indexing of the staging URL). [VERIFIED]

---

## Q2 — Application Passwords and Account Inventory

### User list

| ID | user_login | user_email | roles |
|----|-----------|------------|-------|
| 1 | flgnynjai@gmail.com | flgnynjai@gmail.com | administrator |
| 2 | Thalia | [REDACTED] | editor |
| 3 | Gayle | [REDACTED] | editor |
| 4 | dashboard-push | dashboard-push+wp@fourlegsgoodnynj.org | dashboard_service |
| 5 | Lyra | [REDACTED] | editor |

[VERIFIED — wp user list output]

### Application Passwords

| User ID | user_login | role | App Password name | created (unix) | last_used (unix) |
|---------|-----------|------|------------------|----------------|-----------------|
| 1 | flgnynjai@gmail.com | administrator | (none) | — | — |
| 2 | Thalia | editor | (none) | — | — |
| 3 | Gayle | editor | (none) | — | — |
| 4 | dashboard-push | dashboard_service | Dashboard API | 1779572490 (2026-05-23) | 1782826247 (2026-06-30) |
| 5 | Lyra | editor | (none) | — | — |

[VERIFIED — wp user application-password list for all 5 users]

**No administrator-role user has an Application Password.** The only App Password ("Dashboard API") belongs to user `dashboard-push` (ID 4), which has the custom `dashboard_service` role. [VERIFIED]

**No user named `shelter-service` exists.** [VERIFIED — not in user list output]

### dashboard-push capabilities

| Capability | Present? |
|-----------|---------|
| read | ✅ |
| edit_posts | ✅ |
| edit_others_posts | ✅ |
| publish_posts | ✅ |
| edit_published_posts | ✅ |
| upload_files | ✅ |
| delete_posts | ✅ |
| delete_published_posts | ✅ |
| delete_others_posts | ✅ |
| manage_options | ❌ absent |
| edit_pages | ❌ absent |

[VERIFIED — wp user list-caps 4]

The scoped account can manage posts (create/edit/delete all posts, upload media) but cannot manage site options or edit pages. This is the intended scope for the dashboard push service.

---

## Q3 — wp-login / wp-admin Hardening

### Active plugins

| Plugin | Version |
|--------|---------|
| sg-ai-studio | 1.2.5 |
| polylang | 3.8.4 |
| seo-by-rank-math | 1.0.270 |
| sg-security | 1.6.2 |
| wordpress-starter | 3.4.4 |
| sg-cachepress | 7.7.11 |

[VERIFIED — wp plugin list --status=active]

### Security posture

**SiteGround Security (sg-security 1.6.2)** is active with these settings [VERIFIED — wp option list --search='sg_security*']:

| Setting | Value | Effect |
|---------|-------|--------|
| sg_security_login_attempts | 5 | Rate-limiting: 5 failed attempts before lockout |
| sg_security_login_type | default | Login URL is standard /wp-login.php (no custom path) |
| sg_security_disable_xml_rpc | 1 | XML-RPC disabled (also enforced via .htaccess deny) |
| sg_security_disable_file_edit | 1 | WP theme/plugin file editor disabled |
| sg_security_disable_usernames | 1 | Username enumeration blocked |
| sg_security_lock_system_folders | 1 | System folders locked |
| sg_security_xss_protection | 1 | XSS protection headers enabled |
| sg_security_wp_remove_version | 1 | WP version removed from markup |
| sg_security_total_blocked_logins | 0 | No blocked logins recorded |

**2FA:** No sg_security_2fa option exists. No dedicated 2FA plugin is active. [VERIFIED — option lookup returned "Does it exist?" error; no 2FA plugin in active plugin list]

**IP allowlist on login:** No sg_security_login_access option exists (not configured). No IP-based restrictions in .htaccess for wp-login.php or wp-admin. [VERIFIED — option lookup error; .htaccess contains only XMLRPC deny, WP rewrite rules, and SGO Vary header]

**.htaccess login restrictions:** None. The only access restriction is the XMLRPC deny block. [VERIFIED — full .htaccess content inspected]

**Summary:** Login surface is at the default /wp-login.php URL. Rate-limiting is active (5 attempts). No 2FA. No IP allowlist on login. No non-default login path. Username enumeration is blocked.

---

## Q4 — Photo Passthrough (Shape A)

### /api/photos reference

```
functions.php:655: var response = await fetch('https://dashboard.4lgshelterapp.duckdns.org/api/photos/' + animalId);
```

[VERIFIED — grep -rn '/api/photos' in theme dir returned one match]

### What identifier is passed?

The function `loadModalGallery(animalId, publicPhotoUrl)` is called at line 768 as:

```javascript
loadModalGallery(shelterCode, photo);
```

where `shelterCode` is extracted from `data.shelter_code` (line 717). **The parameter is named `animalId` but receives `shelter_code` at the call site.** The `/api/photos/` endpoint receives the shelter_code string (e.g., "R2024018"), not the SM numeric animal_id. [VERIFIED — grep and source inspection of lines 642, 717, 768]

### Dormant CPT registration

```
functions.php:447: register_post_type('shelter_story', $args);
functions.php:1112: register_post_type('shelter_event', $args);
```

**No `shelter_animal` CPT registration exists.** The two registered CPTs are `shelter_story` and `shelter_event`, both actively used for the stories and events pages. [VERIFIED — grep for register_post_type returned only these two; grep for shelter_animal returned 0 matches]
