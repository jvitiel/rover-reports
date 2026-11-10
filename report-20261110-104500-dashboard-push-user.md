# Dashboard-Push WordPress Service Account — Diagnosis Report

**Date:** 2026-11-10 10:45 ET (read-only diagnosis)

---

## 1. Is "dashboard-push" the live push identity?

**YES** [VERIFIED — secrets file + server.ts:289-292]

The shelter-app authenticates to WordPress via Basic Auth using credentials from `/home/shelter/.config/shelter-secrets.json` at the `wordpress.username` and `wordpress.appPassword` keys.

- **Live username:** `dashboard-push` (read from secrets file at runtime; not hardcoded in source)
- **Auth loading:** `server.ts:286-294` — `getWpAuth()` lazy-initializes a cached Basic Auth header from `secrets.wordpress.username` + `secrets.wordpress.appPassword`
- **Usage:** 13 call sites in `server.ts` (lines 302, 324, 347, 377, 425, 521, 3079, 3149, 3190, and others) all call `getWpAuth()`
- **Type definition:** `server/src/types.ts:26` defines the `wordpress?: { username: string; appPassword: string }` shape

The code never hardcodes a WordPress username. It reads whatever is in the secrets file. The secrets file currently contains `dashboard-push`.

## 2. When did the code adopt "dashboard-push"?

The auth mechanism (`getWpAuth()` + secrets-file pattern) was introduced in:

- **Commit:** `7735438` — "Featured slots Phase 1b: new API endpoints + compat layer"
- **Date:** 2026-04-21 19:57:15 UTC

This commit added the `wordpress` block to the `ShelterSecrets` type and the `getWpAuth()` function. From its introduction, the code read the username from the secrets file (never hardcoded).

The `dashboard-push` username specifically was documented as the live identity in:

- **Commit:** `0003301` — "CONTRACTS.md: fold in WP service account, error handling protocol, bilingual architecture locks per Website 3 batch"
- **Date:** 2026-05-23 23:32:06 UTC

CONTRACTS.md states: *"The previous admin-level Application Password (manifest 5.1) was revoked 2026-05-23."* This indicates the secrets file was updated from the old admin credential to `dashboard-push` on **2026-05-23**.

## 3. WordPress-Side Facts

**Method used:** WP REST API — `GET /wp-json/wp/v2/users/me?context=edit` authenticated with the shelter-app's existing stored credential. Succeeded.

### User Record

| Field | Value |
|-------|-------|
| WP User ID | 4 |
| Username | dashboard-push |
| Display name | dashboard-push |
| Role | `dashboard_service` |
| **Registered date** | **2026-05-23T21:39:54+00:00** [VERIFIED — WP REST API /users/me] |

### Role Capabilities (9 capabilities + role flag)

| Capability | Granted |
|------------|---------|
| `read` | ✓ |
| `edit_posts` | ✓ |
| `edit_others_posts` | ✓ |
| `edit_published_posts` | ✓ |
| `publish_posts` | ✓ |
| `upload_files` | ✓ |
| `delete_posts` | ✓ |
| `delete_published_posts` | ✓ |
| `delete_others_posts` | ✓ |
| `dashboard_service` (role flag) | ✓ |

Per CONTRACTS.md, the `dashboard_service` role was registered via mu-plugin at `wp-content/mu-plugins/dashboard-service-role.php` using idempotent `add_role()` / `add_cap()` sync.

### What the role can do

These 9 capabilities give `dashboard-push` the ability to:
- **Read** all published content
- **Create, edit, and publish** posts (including others' posts) — covers story and event CPT creation/updates
- **Upload media** — covers story photo uploads
- **Delete posts** (own, published, and others') — covers event trash/delete

It **cannot**: manage users, install plugins/themes, manage options, edit themes, or do anything administrative. It's a scoped service account for content push operations.

### Timeline Summary

| Date | Event |
|------|-------|
| 2026-04-21 | Auth mechanism (`getWpAuth()`) added to shelter-app (commit `7735438`) |
| 2026-05-23 21:39 UTC | `dashboard-push` WP user created [VERIFIED — WP registered_date] |
| 2026-05-23 | Old admin Application Password revoked; secrets file updated to dashboard-push (per CONTRACTS.md) |
| 2026-05-23 23:32 UTC | CONTRACTS.md updated to document the service account (commit `0003301`) |

---

*Read-only diagnosis. No changes made.*
