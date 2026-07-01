# WordPress + Shelter-App Security Follow-Up

**Date:** 2026-07-01 00:53 UTC

---

## Q1 — Staging-Host Login Surface + Rate-Limit Keying

### Login surface reachability

```
curl -sSIL https://johnv80.sg-host.com/wp-login.php
→ HTTP/2 200 (serves the login page directly)

curl -sSIL https://johnv80.sg-host.com/wp-admin/
→ HTTP/2 403 (blocked by sg-security lock_system_folders)
```

**The staging hostname serves the WordPress login page at /wp-login.php with HTTP 200.** [VERIFIED] It does NOT redirect to production. The front page 301s to production, but the login route bypasses the canonical redirect — as expected, because WordPress's `redirect_canonical()` does not apply to wp-login.php.

wp-admin/ returns 403, blocked by sg-security's `lock_system_folders` setting. [VERIFIED]

### Rate-limit counter keying

sg-security's `Login_Service.php` (core/Login_Service/Login_Service.php) stores failed attempts in the WP option `sg_security_unsuccessful_login` as a PHP array keyed by `Helper::get_current_user_ip()`. [VERIFIED — source inspection lines 87-193]

Key mechanism:
- Counter is keyed on **client IP address**, not hostname, not username [VERIFIED — `$login_attempts[$user_ip]` is the lookup key throughout]
- Stored in a shared WP option in the database (not a transient, not a separate table) [VERIFIED — `get_option('sg_security_unsuccessful_login')` / `update_option()`]
- Current value: empty array (no blocked IPs) [VERIFIED — `wp option get` returned `array()` ]

**Verdict: the staging hostname login and production login share the SAME throttle counter** — they hit the same WordPress database and the counter is keyed on IP. A brute-force attempt through johnv80.sg-host.com/wp-login.php would trigger the same lockout as one through www.fourlegsgoodnynj.org/wp-login.php. The staging login is not an un-throttled second door. [INFERRED — same DB confirmed; same sg-security plugin code runs regardless of hostname; counter keys on IP not hostname]

The staging login being reachable at all is still a wider attack surface (two hostnames to target), but it's not a throttle bypass.

---

## Q2 — REST User Enumeration on Production

### /wp-json/wp/v2/users

```
curl -s 'https://www.fourlegsgoodnynj.org/wp-json/wp/v2/users'
→ HTTP 200, JSON array with 2 user objects
```

**Leaks the following user data:** [VERIFIED — full JSON response received]

| id | name | slug | link |
|----|------|------|------|
| 4 | dashboard-push | dashboard-push | /author/dashboard-push/ |
| 1 | Four Legs Good | flgnynjaigmail-com | /author/flgnynjaigmail-com/ |

Exposed fields include: id, name, slug, link (author archive URL), avatar_urls (Gravatar hashes). Users 2, 3, 5 (editors) are not returned (WP REST only returns users with published posts by default).

### ?rest_route=/wp/v2/users (alternative REST path)

Same result — returns the same 2-user JSON array. [VERIFIED]

### ?author=1 (classic author scan)

```
curl -sSIL 'https://www.fourlegsgoodnynj.org/?author=1'
→ HTTP 301, Location: /author/flgnynjaigmail-com/
→ HTTP 200 (author archive page)
```

**Not blocked.** The redirect itself leaks the admin username slug `flgnynjaigmail-com`. [VERIFIED]

**Assessment:** sg-security's `disable_usernames` option (set to 1) blocks the XML/RSS-based username enumeration vectors but does **not** block the REST API /wp/v2/users endpoint or the classic ?author=N redirect. Both leak usernames/slugs for users with published posts. The admin slug `flgnynjaigmail-com` and the service account slug `dashboard-push` are publicly discoverable. [VERIFIED — all three enumeration vectors tested]

---

## Q3 — dashboard-push Least-Privilege: Actual WP Operations

### Complete inventory of WP REST API calls in live server.ts

| Line | HTTP Method | Endpoint | Purpose |
|------|------------|----------|---------|
| 387 | POST | /4lg/v1/clear-animals-cache | Cache clear (custom plugin) |
| 408 | POST | /4lg/v1/clear-stories-cache | Cache clear (custom plugin) |
| 431 | POST | /4lg/v1/clear-events-cache | Cache clear (custom plugin) |
| 461 | POST | /4lg/v1/set-story-featured | Set story featured status |
| 510 | GET | /wp/v2/shelter-stories | List stories (read) |
| 606 | GET | /wp/v2/shelter-stories | List stories (read) |
| 3042 | POST | /wp/v2/media | Upload media (photo/image) |
| 3076 | POST | /wp/v2/shelter-stories | Create story post |
| 3126 | PUT | /wp/v2/shelter-stories/{id} | Update story post |
| 3159 | PUT | /wp/v2/shelter-stories/{id} | Update story post |
| 3454 | POST | /4lg/v1/push-event | Push event (custom plugin) |
| 3504 | POST | /wp/v2/shelter-events/{id} | Update event post |
| 3538 | POST | /wp/v2/shelter-events/{id} | Update event post (set to draft) |
| **3557** | **DELETE** | **/wp/v2/shelter-events/{id}** | **Trash event post** |

[VERIFIED — grep + source inspection of all 14 fetch calls in live server.ts]

### DELETE usage detail

One DELETE exists: `deleteWordPressEvent()` at line 3556, called from the event permanent-delete handler at line 3812. Comment says "Trash WordPress event (30-day recovery before auto-empty)" — WP REST DELETE on posts moves to trash by default (does not permanently delete unless `?force=true` is appended, which it is not). [VERIFIED — source inspection lines 3555-3569]

No DELETE calls exist for stories. [VERIFIED — `grep "DELETE" server.ts` returned only line 3558]

### Capability assessment

| Capability | Currently granted? | Actually used? |
|-----------|-------------------|----------------|
| read | ✅ yes | ✅ GET requests |
| edit_posts | ✅ yes | ✅ POST create |
| edit_others_posts | ✅ yes | ✅ PUT update (may update posts by other authors) |
| publish_posts | ✅ yes | ✅ POST with status=publish |
| upload_files | ✅ yes | ✅ POST /wp/v2/media |
| edit_published_posts | ✅ yes | ✅ PUT on published posts |
| **delete_posts** | ✅ yes | **✅ DELETE /shelter-events/{id} (trash)** |
| **delete_published_posts** | ✅ yes | **✅ needed for trashing published events** |
| **delete_others_posts** | ✅ yes | **⚠️ only needed if trashing events authored by another user** |

**Verdict on delete capabilities:** `delete_posts` and `delete_published_posts` are actively used by the event trash flow and cannot be removed. `delete_others_posts` is needed only if events authored by users other than dashboard-push are ever trashed through this code path — if all events are created by dashboard-push (which is likely given the push flow creates them), this cap could theoretically be removed, but verifying that requires checking whether any events in WP have a different author. [INFERRED — based on typical push-flow ownership patterns]
