# WordPress Access Method — GSC Verification Prep

**Date:** 2026-06-26 15:47 UTC
**Target:** johnv80.sg-host.com (Four Legs Good WordPress site on SiteGround)

---

## 1. Access Mechanism Inventory

| Method | Available? | Details |
|--------|-----------|---------|
| **WP-CLI** | ❌ No | `wp` not installed on the VPS. No WP root exists locally — WordPress runs entirely on SiteGround. |
| **SSH to SiteGround** | ❌ No | No SSH config entries for SiteGround in any user's `~/.ssh/config` (rover, root, shelter). |
| **WP REST API** | ✅ Yes (limited) | Base URL: `https://johnv80.sg-host.com/wp-json/`. Auth: HTTP Basic with WordPress Application Password. Credentials stored in `shelter-secrets.json` under `wordpress.username` + `wordpress.appPassword`. |
| **Direct MySQL** | ❌ No | No MySQL client config or connection details on the VPS. |

### REST API User Capabilities

The authenticated user is **`dashboard-push`** with role **`dashboard_service`** (a custom role). Active capabilities:

```
read, edit_posts, edit_others_posts, publish_posts, upload_files,
delete_posts, delete_published_posts, delete_others_posts, dashboard_service
```

**Missing critical capability: `manage_options`** — this is required to read or write `wp_options` via `wp/v2/settings` or Rank Math's import/export endpoints. Confirmed:
- `GET /wp-json/wp/v2/settings` → 403 `rest_forbidden`
- `POST /wp-json/rankmath/v1/status/exportSettings` → 403 `rest_cannot_access`
- `POST /wp-json/rankmath/v1/status/getViewData` → 403 `rest_forbidden`

### What the REST API CAN do (via custom 4lg/v1 plugin):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/4lg/v1/clear-animals-cache` | POST | Clear featured animals cache |
| `/4lg/v1/clear-stories-cache` | POST | Clear stories cache |
| `/4lg/v1/clear-events-cache` | POST | Clear events cache |
| `/4lg/v1/set-story-featured` | POST | Set story featured status |
| `/4lg/v1/push-event` | POST | Push event to WP |
| `/4lg/v1/test-animals-api` | GET | Test animals API |

Plus standard `wp/v2/shelter-stories`, `wp/v2/shelter-events`, `wp/v2/media` — for content CRUD (posts/media), not options.

### Primary method summary

**OC's primary WordPress access is the REST API with a limited-role Application Password.** It can create/edit/delete posts and upload media, but it **cannot read or write `wp_options`**. It has no SSH, no WP-CLI, and no direct database access.

---

## 2. Rank Math Option Structure

**Cannot read `rank-math-options-general` from the VPS.** The `dashboard-push` user lacks `manage_options`, so all paths to read the serialized option (REST settings endpoint, Rank Math export API) return 403.

### What we know from the public HTML:

Rank Math is active (confirmed by `<!-- Search Engine Optimization by Rank Math -->` comment and `rank-math-schema` JSON-LD in the page source). The Rank Math REST namespace (`rankmath/v1`) is registered with sub-namespaces: `setupWizard`, `ca`, `an`, `in`, `status`.

### Rank Math general settings — expected structure (from Rank Math docs/source):

The `rank-math-options-general` wp_option is a serialized PHP array. The Google Search Console verification field is named **`google_verify`** (historically `webmaster_google` in older versions, but Rank Math uses `google_verify`). The option contains ~40+ top-level fields including:

```
google_verify, bing_verify, baidu_verify, pinterest_verify,
breadcrumbs, noindex_empty_category, strip_category_base,
attachment_redirect_urls, 404_monitor, search_console_*,
local_seo, robots_txt_content, ...
```

**Cannot confirm the exact field name or current value from the VPS** — this requires either:
- SiteGround Site Tools → WP-CLI in the hosting panel
- WordPress admin dashboard → Rank Math → General Settings → Webmaster Tools
- `manage_options` capability added to the `dashboard_service` role (or using an admin-level app password)

---

## 3. Write-Path Feasibility

| Write Method | Feasible from VPS? | Notes |
|--------------|-------------------|-------|
| `wp option patch` (WP-CLI) | ❌ | No WP-CLI on VPS, no SSH to SiteGround |
| `wp eval 'update_option(...)'` | ❌ | Same — no WP-CLI |
| REST API `PUT /wp/v2/settings` | ❌ | 403 — user lacks `manage_options` |
| Rank Math REST API | ❌ | 403 — same capability barrier |
| Custom 4lg/v1 endpoint | ❌ | No options-related endpoint exists in the plugin |
| **Rank Math UI** (human-driven) | ✅ | WordPress admin → Rank Math → General Settings → Webmaster Tools → Google Verification |
| **SiteGround WP-CLI** (human-driven) | ✅ | SiteGround Site Tools panel has a WP-CLI interface |

### Bottom line

**OC cannot write the Rank Math Google verification option from the VPS.** The only safe paths are:

1. **Rank Math UI** (recommended): John logs into WP admin → Rank Math → General Settings → Webmaster Tools → paste the verification code into the Google field → Save. Rank Math handles the serialized array safely — no risk of clobbering sibling fields.

2. **SiteGround WP-CLI**: Via SiteGround's Site Tools SSH terminal, run:
   ```
   wp option patch update rank-math-options-general google_verify '<verification-code>'
   ```
   `wp option patch` safely modifies one key in a serialized array without disturbing others.

3. **Upgrade the `dashboard_service` role** to include `manage_options` — then OC could write via REST API. But this grants broad options access (security tradeoff — not recommended unless scoped by a custom endpoint).

⚠️ **A raw `update_option` that replaces the entire serialized array would clobber all other Rank Math settings.** Both `wp option patch` and the Rank Math UI are safe because they merge into the existing array.

---

## 4. Meta Tag Baseline (Current State)

Checked three pages for `<meta name="google-site-verification" ...>` in `<head>`:

| Page | google-site-verification present? |
|------|----------------------------------|
| `https://johnv80.sg-host.com/` | ❌ No |
| `https://johnv80.sg-host.com/es/` | ❌ No |
| `https://johnv80.sg-host.com/adopt/` | ❌ No |

**No Google Search Console verification meta tag exists on any page currently.** Once set in Rank Math, it will appear as:
```html
<meta name="google-site-verification" content="<verification-code>" />
```

---

## 5. Caching Layer

Response headers from SiteGround:

```
server: nginx
x-cache-enabled: True
x-proxy-cache-info: DT:1
```

**SiteGround's nginx-based dynamic cache is active.** After setting the verification meta tag:
- The cached HTML will serve the old (no-tag) version until the cache expires or is purged
- SiteGround cache can be purged via: SiteGround Site Tools → Speed → Caching → Purge, or via the SG Optimizer plugin (if installed — no evidence of it in page source)
- Alternatively, Google's verification crawler may hit a non-cached response; SiteGround's DT (dynamic) cache typically has a short TTL

**Recommendation:** After setting the Rank Math verification value, purge SiteGround's cache before triggering GSC verification to ensure the meta tag is served immediately.

---

## Summary

| Question | Answer |
|----------|--------|
| Primary WP access method | REST API with Application Password (`dashboard-push` user, `dashboard_service` role) |
| Can OC write wp_options? | **No** — user lacks `manage_options` capability |
| Rank Math Google field name | Expected: `google_verify` in `rank-math-options-general` (cannot confirm from VPS — 403) |
| Current verification value | Unknown (cannot read the option) |
| Verification meta tag present? | **No** — not on any page currently |
| Safe write method | **Rank Math UI** (John, in WP admin) or **SiteGround WP-CLI** (`wp option patch`) |
| Post-change cache purge needed? | **Yes** — SiteGround nginx dynamic cache is active |
