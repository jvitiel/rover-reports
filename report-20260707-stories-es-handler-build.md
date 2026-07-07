# Stories EN→ES Handler Build — 2026-07-07

## STEP 0 — Stories Transient Key + Page

Stories transient base key: `flg_featured_stories` (resolved as `flg_featured_stories_en`, `flg_featured_stories_es` via `flg_delete_lang_transient`). [VERIFIED — functions.php:258, 315, 333, 408]

Stories page: `page-stories.php`, URL path `/stories/` (EN) and `/es/historias/` (ES, via Polylang slug translation). [VERIFIED — template file exists]

## STEP 1 — Backup

Backup: `functions.php.bak-20260707-032652` [VERIFIED]

Work copy: `functions.php.work` (1654 lines, matching original). [VERIFIED]

## STEP 2 — Dispatch Block Edit

Replaced `flg_handle_link_es_translation` dispatch (lines 1631–1639):

**Before:**
```php
if ($post_type !== 'shelter_event') {
    return new WP_REST_Response(array('success' => false, 'message' => 'Only shelter_event supported at this stage'), 400);
}
$result = flg_create_and_link_es_event($en_post_id, array(
    'title_es'                  => isset($params['title_es']) ? $params['title_es'] : '',
    'content_es'                => isset($params['content_es']) ? $params['content_es'] : '',
    'event_location_name_es'    => isset($params['event_location_name_es']) ? $params['event_location_name_es'] : '',
    'link_text_es'              => isset($params['link_text_es']) ? $params['link_text_es'] : '',
));
```

**After:**
```php
if ($post_type === 'shelter_event') {
    $result = flg_create_and_link_es_event($en_post_id, array(
        'title_es'                  => isset($params['title_es']) ? $params['title_es'] : '',
        'content_es'                => isset($params['content_es']) ? $params['content_es'] : '',
        'event_location_name_es'    => isset($params['event_location_name_es']) ? $params['event_location_name_es'] : '',
        'link_text_es'              => isset($params['link_text_es']) ? $params['link_text_es'] : '',
    ));
} elseif ($post_type === 'shelter_story') {
    $result = flg_create_and_link_es_story($en_post_id, array(
        'title_es'    => isset($params['title_es']) ? $params['title_es'] : '',
        'content_es'  => isset($params['content_es']) ? $params['content_es'] : '',
        'link_text_es' => isset($params['link_text_es']) ? $params['link_text_es'] : '',
    ));
} else {
    return new WP_REST_Response(array('success' => false, 'message' => 'Unsupported post_type'), 400);
}
```

Events path (`flg_create_and_link_es_event`) unchanged — same args, same call. [VERIFIED via diff]

## STEP 3 — EOF Append

Three components appended after the route registration:

### 1. `flg_create_and_link_es_story($en_post_id, $es)` (functions.php:1663–1741)

- **Guards:** post exists + is `shelter_story`, Polylang functions available, source language is `en`
- **Idempotent:** `pll_get_post($en_post_id, 'es')` → if linked, returns `adopted` + stores `_es_post_id` meta
- **Orphan-guard:** keys on `title` (exact match) — `get_posts` with `post_status=any` + `tax_query language=es`. If unlinked ES story with matching title found → 409 `orphan_conflict`
- **Create:** `wp_insert_post` with translated title/content, same status/author as EN
- **Meta copy:** 11 keys verbatim (`story_date`, `story_type`, `animal_name`, `animal_species`, `animal_breed`, `photo_1_url`, `photo_2_url`, `photo_layout`, `link_url`, `featured_on_homepage`, `featured_at`)
- **`link_text`:** translated via `link_text_es` param, falls back to EN value
- **Polylang:** `pll_set_post_language($es, 'es')` + `pll_save_post_translations({en, es})`
- **`_es_post_id` meta:** set on EN post for REST field surface
- **Cache clear:** `flg_delete_lang_transient('flg_featured_stories')` + `sg_cachepress_purge_cache`

### 2. `register_rest_field('shelter_story', 'es_post_id', ...)` (functions.php:1746–1755)

Read-only field on `wp/v2/shelter-stories` response. `get_callback` reads `_es_post_id` meta from EN post. Returns int or null. [VERIFIED — field appears in REST response]

### 3. `rest_after_insert_shelter_story` hook (functions.php:1760–1780)

- Fires on `rest_after_insert_shelter_story` (create_item + update_item)
- `$creating` guard: returns immediately if `!$creating` (edits don't trigger)
- Language guard: skips if source post isn't `en`
- Empty guard: skips if both `title_es` and `content_es` are empty (no `_es` params = no translation attempt)
- Calls `flg_create_and_link_es_story` with the 3 `_es` params from `$request`

## STEP 3b — Diff Gate

```
1631,1632c1631,1645    — dispatch block: old 2-line reject → new 15-line if/elseif/else
1634,1639d1646         — old event-only $result block removed (now inside if branch)
1654a1662,1780         — EOF append: helper + REST field + hook (119 lines)
```

Two regions only: (1) dispatch block, (2) EOF append. No other changes. [VERIFIED]

## STEP 4 — Syntax Gate

```
$ php -l functions.php.work
No syntax errors detected in functions.php.work
```

Swap: `mv functions.php.work functions.php` → live at 1780 lines. [VERIFIED]

## STEP 5 — Live Verification

| URL | HTTP | Expected |
|-----|------|----------|
| `https://www.fourlegsgoodnynj.org/` | 200 | 200 ✓ |
| `/events/` | 200 | 200 ✓ |
| `/es/eventos/` | 200 | 200 ✓ |
| `/wp-json/wp/v2/shelter-stories` | 200 | 200 ✓ |
| `/wp-json/4lg/v1/link-es-translation` (unauth POST) | 401 | 401 ✓ |

[VERIFIED — all match expected]

### es_post_id REST field

```
curl /wp-json/wp/v2/shelter-stories?per_page=1
→ es_post_id field present: True, value: None
```

Field registered and surfacing. Value is null because no `_es_post_id` meta set on this story yet (expected — backfill not run). [VERIFIED]

## Events Path Integrity

The `flg_create_and_link_es_event` function and its call from the dispatch block are byte-identical to the pre-edit version — only the guard structure changed from a reject-if-not-event to a dispatch-by-type. The event args array is identical. [VERIFIED via diff — lines 1632–1638 in new file match old lines 1634–1639]
