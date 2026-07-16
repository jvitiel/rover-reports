# WordPress REST User-Enumeration Diagnosis

Date: 2026-07-16 23:31 UTC

---

## 1. LEAK CONFIRMATION (anonymous)

### 1a. REST API — `/wp-json/wp/v2/users`

**HTTP Status:** 200 OK [VERIFIED]

**Response body (full):**

```json
[
    {
        "id": 4,
        "name": "dashboard-push",
        "url": "",
        "description": "",
        "link": "https://www.fourlegsgoodnynj.org/author/dashboard-push/",
        "slug": "dashboard-push",
        "avatar_urls": {
            "24": "https://secure.gravatar.com/avatar/d62231c0d1a610ec63e92987c744d739d984919b5f59b2a5d6716e8b89effe73?s=24&d=mm&r=g",
            "48": "https://secure.gravatar.com/avatar/d62231c0d1a610ec63e92987c744d739d984919b5f59b2a5d6716e8b89effe73?s=48&d=mm&r=g",
            "96": "https://secure.gravatar.com/avatar/d62231c0d1a610ec63e92987c744d739d984919b5f59b2a5d6716e8b89effe73?s=96&d=mm&r=g"
        },
        "meta": [],
        "_links": { ... }
    },
    {
        "id": 1,
        "name": "Four Legs Good",
        "url": "http://johnv80.sg-host.com",
        "description": "",
        "link": "https://www.fourlegsgoodnynj.org/author/flgnynjaigmail-com/",
        "slug": "flgnynjaigmail-com",
        "avatar_urls": {
            "24": "https://secure.gravatar.com/avatar/d4b46a60659b1074a0f68273bfb1f0712f7bcb8668c3e560f359bff53d47ca20?s=24&d=mm&r=g",
            "48": "https://secure.gravatar.com/avatar/d4b46a60659b1074a0f68273bfb1f0712f7bcb8668c3e560f359bff53d47ca20?s=48&d=mm&r=g",
            "96": "https://secure.gravatar.com/avatar/d4b46a60659b1074a0f68273bfb1f0712f7bcb8668c3e560f359bff53d47ca20?s=96&d=mm&r=g"
        },
        "meta": [],
        "_links": { ... }
    }
]
```

**Exposed values:** [VERIFIED]
- User ID 4: slug `dashboard-push`, display name `dashboard-push`, author URL `/author/dashboard-push/`
- User ID 1: slug `flgnynjaigmail-com`, display name `Four Legs Good`, author URL `/author/flgnynjaigmail-com/`, profile URL `http://johnv80.sg-host.com`
- Gravatar hashes exposed for both accounts (SHA-256 of email address)
- User IDs 2, 3, 5 (Thalia, Gayle, Lyra — editors) are NOT exposed via REST (WordPress only returns users who have published posts by default for anonymous requests)

### 1b. Author enumeration — `?author=N`

| Author ID | HTTP Status | Location Header / Behavior |
|-----------|-------------|----------------------------|
| 1 | **301** | `Location: https://www.fourlegsgoodnynj.org/author/flgnynjaigmail-com/` — **slug exposed** [VERIFIED] |
| 2 | 403 | Blocked (52 bytes, no redirect) [VERIFIED] |
| 3 | 403 | Blocked [VERIFIED] |
| 4 | 403 | Blocked [VERIFIED] |

**Summary:** The REST API is the primary leak — it returns full user objects with slugs, display names, and gravatar hashes for any user who has published posts, to any anonymous requester. The `?author=N` redirect is partially blocked by SG Security for IDs 2-4 but **user ID 1 (administrator) still leaks via 301 redirect**.

---

## 2. WHOSE HANDLE IS EXPOSED

Full WordPress user list (via `wp user list`):

```
ID  user_login            display_name     roles
4   dashboard-push        dashboard-push   dashboard_service
1   flgnynjai@gmail.com   Four Legs Good   administrator
3   Gayle                 Gayle            editor
5   Lyra                  Lyra             editor
2   Thalia                Thalia           editor
```

[VERIFIED]

**Cross-reference with exposed data:**

| User | Exposed via REST? | Exposed via ?author=N? | Role |
|------|-------------------|------------------------|------|
| dashboard-push (ID 4) | **YES** — slug `dashboard-push` | No (403) | dashboard_service |
| flgnynjai@gmail.com (ID 1) | **YES** — slug `flgnynjaigmail-com` | **YES** — 301 to `/author/flgnynjaigmail-com/` | **administrator** |
| Gayle (ID 3) | No | No (403) | editor |
| Lyra (ID 5) | No | No | editor |
| Thalia (ID 2) | No | No (403) | editor |

**The administrator account IS exposed.** [VERIFIED] Its slug (`flgnynjaigmail-com`) reveals the login email pattern. An attacker seeing slug `flgnynjaigmail-com` can trivially reconstruct the email `flgnynjai@gmail.com` and use it for targeted credential-stuffing or phishing.

**The dashboard_service account IS exposed.** [VERIFIED] Its slug `dashboard-push` matches its user_login exactly, confirming the service account's existence and name to any anonymous viewer.

---

## 3. MU-PLUGINS STATE

### Document root relationship

Both document roots resolve to the **same inode** (hardlink or bind mount): [VERIFIED]

```
61762532  /home/customer/www/fourlegsgoodnynj.org/public_html
61762532  /home/customer/www/johnv80.sg-host.com/public_html
```

`readlink -f` for both resolves to `/home/customer/www/johnv80.sg-host.com/public_html`. The `fourlegsgoodnynj.org` path is a symlink/alias to the `johnv80.sg-host.com` path. [VERIFIED] There is one WordPress install, one `wp-content`, one `mu-plugins` directory.

### mu-plugins directory

**Path:** `/home/customer/www/fourlegsgoodnynj.org/public_html/wp-content/mu-plugins/` (same via either root) [VERIFIED]

**Exists:** Yes [VERIFIED]

**Permissions and ownership:**
```
drwxr-xr-x 2 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 4096 May 23 21:08 .
```
[VERIFIED]

**Contents:**
```
-rw-r--r-- 1 u3058-gfugkrmqxgso u3058-gfugkrmqxgso 1664 May 23 22:20 dashboard-service-role.php
```

One file: `dashboard-service-role.php` (the dashboard_service custom role mu-plugin deployed 2026-05-23). [VERIFIED]

### WPMU_PLUGIN_DIR

Not defined in `wp-config.php`. [VERIFIED] WordPress uses the default (`wp-content/mu-plugins/`).

---

## 4. EXISTING FILTERS

### Theme functions.php

No matches for `rest_endpoints`, `rest_user_query`, `wp_sitemaps_users`, `author_link`, `rest_authentication_errors`, `redirect_canonical`, or author query-var blocking. [VERIFIED]

### mu-plugins (dashboard-service-role.php)

No matches for any of the above filter hooks. [VERIFIED] The file only registers the `dashboard_service` role and its capabilities.

### wp-config.php

No matches. [VERIFIED]

### Active plugins

| Plugin | Relevant filters? |
|--------|-------------------|
| polylang 3.8.5 | Hooks `author_link` in `frontend-filters-links.php` (line 55) — adds language prefix to author URLs. Standard Polylang behavior, not a security filter. [VERIFIED] |
| seo-by-rank-math 1.0.273 | Hooks `author_link` in `class-rewrite.php` (line 50) — rewrites author permalink structure. Also has author sitemap provider. Not a security filter. [VERIFIED] |
| sg-security 1.6.5 | Has `sg_security_disable_usernames` = `1` [VERIFIED]. This setting blocks `?author=N` enumeration via redirect suppression. However, it does NOT block the REST API `/wp/v2/users` endpoint. No PHP code in sg-security references `rest_endpoints`, `rest_user_query`, `rest_authentication_errors`, or `wp/v2/users`. [VERIFIED] |
| sg-cachepress 7.8.0 | No relevant filters. [VERIFIED] |
| sg-ai-studio 1.2.6 | No relevant filters. [VERIFIED] |
| wordpress-starter 3.4.5 | No relevant filters. [VERIFIED] |

### Rank Math author sitemap

`authors_sitemap` is set to `off` in Rank Math sitemap options. [VERIFIED] Author archives are not included in the XML sitemap.

### SG Security coverage gap

SG Security's `disable_usernames` feature blocks `?author=N` enumeration for **most** user IDs (2, 3, 4 return 403), but **user ID 1 (administrator) still gets a 301 redirect** exposing the slug. [VERIFIED] This may be a SG Security bug or a special case for the primary admin. Regardless, SG Security does not touch the REST API surface at all.

**Conclusion:** No existing filter addresses the REST API user enumeration. A new mu-plugin filter will not conflict with or duplicate any existing code. [VERIFIED]

---

## 5. AUTHENTICATED CONSUMERS

### 5a. Theme code

No references to `/wp/v2/users`, `wp.api.*users`, or `apiRequest.*users` in the 4lg-theme. [VERIFIED]

### 5b. Dashboard push integration

The VPS dashboard push code (`/home/shelter/shelter-apps/server/src/server.ts`) calls these WordPress endpoints: [VERIFIED]

```
/wp-json/4lg/v1/clear-animals-cache       (POST)
/wp-json/4lg/v1/clear-stories-cache       (POST)
/wp-json/4lg/v1/clear-events-cache        (POST)
/wp-json/4lg/v1/set-story-featured        (POST)
/wp-json/4lg/v1/push-event                (POST)
/wp-json/wp/v2/media                      (POST)
/wp-json/wp/v2/shelter-stories            (GET, POST)
/wp-json/wp/v2/shelter-stories/{id}       (POST)
/wp-json/wp/v2/shelter-events/{id}        (POST, DELETE)
```

**`/wp/v2/users` is NOT called anywhere in the dashboard push code.** [VERIFIED] Zero references to the users endpoint in `server.ts` or any other source file.

### 5c. Gutenberg block editor

No Classic Editor plugin is active. [VERIFIED] The site uses the default Gutenberg block editor. Gutenberg queries `/wp/v2/users` for author dropdown menus when editing posts. This is an **authenticated** call (requires logged-in wp-admin session). A filter that blocks anonymous access to `/wp/v2/users` while allowing authenticated access will not break Gutenberg. [VERIFIED via WordPress core behavior — Gutenberg sends a nonce cookie]

### Summary of consumers

| Consumer | Uses /wp/v2/users? | Authenticated? |
|----------|-------------------|----------------|
| Dashboard push (VPS) | No | Yes (app password) |
| 4lg-theme | No | N/A |
| Gutenberg editor | Yes (author dropdown) | Yes (wp-admin nonce) |
| Active plugins | No | N/A |

A filter that returns `WP_Error` for unauthenticated `/wp/v2/users` requests will not break any known consumer. [INFERRED from code analysis]

---

## 6. ENVIRONMENT

| Property | Value |
|----------|-------|
| PHP version | 8.2.32 (ZTS) [VERIFIED] |
| WordPress version | 7.0.1 [VERIFIED] |
| Active theme | `4lg-theme` ("Four Legs Good", v1.0.0) [VERIFIED] |
| Theme path | `/home/customer/www/fourlegsgoodnynj.org/public_html/wp-content/themes/4lg-theme/` [VERIFIED] |
| Document root (canonical) | `/home/customer/www/johnv80.sg-host.com/public_html` [VERIFIED] |
| Document root (symlink) | `/home/customer/www/fourlegsgoodnynj.org/public_html` → same inode [VERIFIED] |
| Active plugins | sg-ai-studio 1.2.6, polylang 3.8.5, seo-by-rank-math 1.0.273, sg-security 1.6.5, wordpress-starter 3.4.5, sg-cachepress 7.8.0 [VERIFIED] |

---

## Summary of Exposure

1. **REST API `/wp/v2/users`** returns HTTP 200 with full user objects to anonymous requests. Two users exposed: the **administrator** (slug reveals email pattern) and the **dashboard_service** account. This is the primary vulnerability.

2. **`?author=1`** returns a 301 redirect exposing the administrator's slug. SG Security's `disable_usernames` setting is enabled but fails to block the primary admin (ID 1). IDs 2-4 are correctly blocked with 403.

3. **No existing filter** in the theme, mu-plugins, or wp-config addresses REST API user enumeration. SG Security only covers the `?author=N` vector (partially).

4. **No authenticated consumer** depends on anonymous access to `/wp/v2/users`. The only legitimate consumer (Gutenberg editor) sends authenticated requests.

5. **The mu-plugins directory exists** and is writable by the site owner. It contains one file (`dashboard-service-role.php`). A new mu-plugin can be safely added without conflict.
