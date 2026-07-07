# Events EN→ES Handler Build — 2026-07-07

## Backup

Filename: `functions.php.bak-20260707-021700` (54,740 bytes). [VERIFIED — ls -la output]

## Step 3b — Diff Gate

Two changed regions only:

### Region 1: flg_handle_event_push create-branch extension (lines 1247–1278)

Added 13 lines before the cache-clear block (ES translation call on CREATE only, guarded by `!$existing` and `function_exists`). Replaced the flat `return new WP_REST_Response(...)` with a `$response` array that conditionally includes `es_post_id` and `es_status` from the ES result.

### Region 2: EOF append (lines 1542–1653)

Added 112 lines: `flg_create_and_link_es_event()` helper function + `flg_handle_link_es_translation()` backfill route callback + `rest_api_init` registration for `4lg/v1/link-es-translation`.

No other lines changed. [VERIFIED — diff output shows only these two regions]

### Full diff

```diff
1246a1247,1259
>     // Create + link ES translation on CREATE only (never on update)
>     $es_result = null;
>     if (!$existing && (!empty($params['title_es']) || !empty($params['content_es']))) {
>         if (function_exists('flg_create_and_link_es_event')) {
>             $es_result = flg_create_and_link_es_event($post_id, array(
>                 'title_es'                  => isset($params['title_es']) ? $params['title_es'] : '',
>                 'content_es'                => isset($params['content_es']) ? $params['content_es'] : '',
>                 'event_location_name_es'    => isset($params['event_location_name_es']) ? $params['event_location_name_es'] : '',
>                 'link_text_es'              => isset($params['link_text_es']) ? $params['link_text_es'] : '',
>             ));
>         }
>     }
> 
1254c1267
<     return new WP_REST_Response(array(
---
>     $response = array(
1258c1271,1278
<     ), 200);
---
>     );
>     if (is_array($es_result)) {
>         if (isset($es_result['es_post_id'])) {
>             $response['es_post_id'] = $es_result['es_post_id'];
>         }
>         $response['es_status'] = $es_result['status'];
>     }
>     return new WP_REST_Response($response, 200);
1521a1542,1653
> [112 lines: flg_create_and_link_es_event + flg_handle_link_es_translation + route registration]
```

[VERIFIED]

## Step 4 — Syntax Gate

```
$ php -l functions.php.work
No syntax errors detected in /home/customer/www/fourlegsgoodnynj.org/public_html/wp-content/themes/4lg-theme/functions.php.work
```

[VERIFIED]

## Step 5 — Atomic Swap

```
$ mv functions.php.work functions.php
```

Live file: 61,524 bytes (was 54,740). Backup intact at 54,740 bytes. [VERIFIED — ls -la]

## Step 6 — Live Verification

### 6a: Homepage

```
$ curl -sS -o /dev/null -w '%{http_code}' 'https://www.fourlegsgoodnynj.org/'
200
```

[VERIFIED]

### 6b: Events page

```
$ curl -sS -o /dev/null -w '%{http_code}' 'https://www.fourlegsgoodnynj.org/events/'
200
```

[VERIFIED]

### 6c: ES Events page

```
$ curl -sS -o /dev/null -w '%{http_code}' 'https://www.fourlegsgoodnynj.org/es/eventos/'
200
```

[VERIFIED]

### 6d: Route registered

```
$ curl -s 'https://www.fourlegsgoodnynj.org/wp-json/4lg/v1' | grep -o 'link-es-translation'
link-es-translation
link-es-translation
```

Route `4lg/v1/link-es-translation` is registered and visible in the REST API index. [VERIFIED]

## Step 7 — Restore

Not needed — all checks passed. Backup remains at `functions.php.bak-20260707-021700` for manual rollback if needed.

## Summary of What Was Deployed

1. **Edit A** — `flg_handle_event_push` create branch now calls `flg_create_and_link_es_event()` when `_es` fields are present and the push is a CREATE (not update). Response includes `es_post_id` and `es_status` when ES creation occurs.

2. **Edit B** — Two new functions + one route:
   - `flg_create_and_link_es_event($en_post_id, $es)` — idempotent (checks `pll_get_post` first), orphan-guarded (checks for unlinked ES events on same `event_date`), creates ES post with translated title/content/location_name/link_text + verbatim copy of 9 meta fields, sets Polylang language + translation link.
   - `flg_handle_link_es_translation($request)` — backfill endpoint callback, delegates to the same helper.
   - `4lg/v1/link-es-translation` — POST route, `edit_posts` cap, matching existing 4lg/v1 permission model.
