# Story Orphan-Guard Fix: Title → _es_source_en_id Meta Key

## PART 1 — THE FIX

### S0 — Anchor Check

Block A (orphan query, line 1691-1693):
```php
'posts_per_page' => -1,
'title'          => $es_title,
'tax_query'      => array(array(
```
[VERIFIED — matched verbatim]

Block B (insert, lines 1714-1719):
```php
$es_post_id = wp_insert_post(array(
    'post_title'   => $es_title,
    'post_content' => $es_content,
    'post_type'    => 'shelter_story',
    'post_status'  => $en_post->post_status,
    'post_author'  => $en_post->post_author,
), true);
```
[VERIFIED — matched verbatim. `'post_author' => $en_post->post_author,` appears twice in file (story + events); edited only the story occurrence at line 1718]

### S1 — Backup
Backup: `functions.php.bak-20260707-044611` [VERIFIED — ls -la shows 67187 bytes]

### S2-S4 — Edits (on .work)

**Edit A** (orphan query): replaced `'title' => $es_title,` with:
```php
'meta_key'     => '_es_source_en_id',
'meta_value'   => $en_post_id,
```
[VERIFIED]

**Edit B** (insert meta): added after `'post_author'` line:
```php
'meta_input'  => array('_es_source_en_id' => (int) $en_post_id),
```
[VERIFIED]

**Edit C** (message): replaced `'Unlinked ES story with matching title; refusing to create a duplicate'` with `'Unlinked ES story from a prior create for this EN (matched by _es_source_en_id); refusing to create a duplicate'` [VERIFIED]

### S5 — Diff Gate

```
1692c1692,1693
< 'title'          => $es_title,
---
> 'meta_key'     => '_es_source_en_id',
> 'meta_value'   => $en_post_id,
1703c1704
< 'message' => 'Unlinked ES story with matching title; refusing to create a duplicate',
---
> 'message' => 'Unlinked ES story from a prior create for this EN (matched by _es_source_en_id); refusing to create a duplicate',
1717a1719
> 'meta_input'  => array('_es_source_en_id' => (int) $en_post_id),
```
[VERIFIED — exactly 3 changes, all within flg_create_and_link_es_story. flg_create_and_link_es_event unchanged]

### S6 — Syntax Gate
`php -l functions.php.work` → `No syntax errors detected` [VERIFIED]
Swap: `mv functions.php.work functions.php` [VERIFIED]

### S7 — Site Health
| URL | Status |
|-----|--------|
| https://www.fourlegsgoodnynj.org/ | 200 [VERIFIED] |
| /events/ | 200 [VERIFIED] |
| /es/eventos/ | 200 [VERIFIED] |

### S8 — Post-Edit Function Body

```php
function flg_create_and_link_es_story($en_post_id, $es) {
    $en_post = get_post($en_post_id);
    if (!$en_post || $en_post->post_type !== 'shelter_story') {
        return array('status' => 'error', 'message' => 'EN post not found or not a shelter_story');
    }
    if (!function_exists('pll_get_post') || !function_exists('pll_set_post_language') || !function_exists('pll_save_post_translations')) {
        return array('status' => 'error', 'message' => 'Polylang functions unavailable');
    }
    if (function_exists('pll_get_post_language')) {
        $en_lang = pll_get_post_language($en_post_id);
        if ($en_lang && $en_lang !== 'en') {
            return array('status' => 'error', 'message' => 'Source post language is ' . $en_lang . ', not en');
        }
    }
    $existing_es = pll_get_post($en_post_id, 'es');
    if ($existing_es) {
        update_post_meta($en_post_id, '_es_post_id', (int) $existing_es);
        return array('status' => 'adopted', 'es_post_id' => (int) $existing_es);
    }
    $es_title = (isset($es['title_es']) && $es['title_es'] !== '') ? sanitize_text_field($es['title_es']) : $en_post->post_title;
    // ORPHAN-GUARD: unlinked es-language story with the same (intended) title
    $orphan_candidates = get_posts(array(
        'post_type'      => 'shelter_story',
        'post_status'    => 'any',
        'posts_per_page' => -1,
        'meta_key'     => '_es_source_en_id',
        'meta_value'   => $en_post_id,
        'tax_query'      => array(array(
            'taxonomy' => 'language',
            'field'    => 'slug',
            'terms'    => 'es',
        )),
    ));
    foreach ($orphan_candidates as $cand) {
        if (!pll_get_post($cand->ID, 'en')) {
            return array(
                'status'           => 'orphan_conflict',
                'message'          => 'Unlinked ES story from a prior create for this EN (matched by _es_source_en_id); refusing to create a duplicate',
                'orphan_es_post_id' => (int) $cand->ID,
            );
        }
    }
    if (!pll_get_post_language($en_post_id)) {
        pll_set_post_language($en_post_id, 'en');
    }
    $es_content = (isset($es['content_es']) && $es['content_es'] !== '') ? wp_kses_post($es['content_es']) : $en_post->post_content;
    $es_post_id = wp_insert_post(array(
        'post_title'   => $es_title,
        'post_content' => $es_content,
        'post_type'    => 'shelter_story',
        'post_status'  => $en_post->post_status,
        'post_author'  => $en_post->post_author,
        'meta_input'  => array('_es_source_en_id' => (int) $en_post_id),
    ), true);
    if (is_wp_error($es_post_id)) {
        return array('status' => 'error', 'message' => $es_post_id->get_error_message());
    }
    $copy_meta = array('story_date','story_type','animal_name','animal_species','animal_breed','photo_1_url','photo_2_url','photo_layout','link_url','featured_on_homepage','featured_at');
    foreach ($copy_meta as $k) {
        $v = get_post_meta($en_post_id, $k, true);
        if ($v !== '') {
            update_post_meta($es_post_id, $k, $v);
        }
    }
    $lt_es = (isset($es['link_text_es']) && $es['link_text_es'] !== '') ? sanitize_text_field($es['link_text_es']) : get_post_meta($en_post_id, 'link_text', true);
    update_post_meta($es_post_id, 'link_text', $lt_es);
    pll_set_post_language($es_post_id, 'es');
    pll_save_post_translations(array('en' => (int) $en_post_id, 'es' => (int) $es_post_id));
    update_post_meta($en_post_id, '_es_post_id', (int) $es_post_id);
    if (function_exists('flg_delete_lang_transient')) {
        flg_delete_lang_transient('flg_featured_stories');
    }
    if (function_exists('sg_cachepress_purge_cache')) {
        sg_cachepress_purge_cache(home_url('/'));
    }
    return array('status' => 'created', 'es_post_id' => (int) $es_post_id);
}
```
[VERIFIED — structurally intact, all three edits present, no other changes]

---

## PART 2 — TESTS

### T1 — Normal Create Writes Stable Meta

- EN post 487 created (draft, shelter_story, lang=en) [VERIFIED]
- REST POST `/4lg/v1/link-es-translation` with `{en_post_id:487, post_type:"shelter_story", title_es:"ZZTEST4-ES", content_es:"Test ES story content", link_text_es:"Mas info"}`
- Response: `{"status":"created","es_post_id":488,"success":true}` HTTP 200 [VERIFIED]
- `get_post_meta(488, '_es_source_en_id', true)` = `487` (matches EN post ID) [VERIFIED]
- **T1 PASS** [VERIFIED]

### T2 — Title-Mismatched Orphan CAUGHT (the fix — able-to-fail)

- EN2 post 489 created (draft, shelter_story, lang=en) [VERIFIED]
- Orphan ES post 490 created: title `ZZTEST4-ORPHAN-DIFFERENT-TITLE`, lang=es, `_es_source_en_id`=489, NOT Polylang-linked [VERIFIED]
- ES story count BEFORE: 7 [VERIFIED]
- REST POST with `{en_post_id:489, title_es:"ZZTEST4-COMPLETELY-DIFFERENT-ES-TITLE", ...}` (title deliberately differs from orphan's title)
- Response: `{"status":"orphan_conflict","message":"Unlinked ES story from a prior create for this EN (matched by _es_source_en_id); refusing to create a duplicate","orphan_es_post_id":490,"success":false}` HTTP 409 [VERIFIED]
- ES story count AFTER: 7 (unchanged) [VERIFIED]
- **T2 PASS** [VERIFIED]
- **Able-to-fail:** The OLD title-based guard would have MISSED this orphan because the titles differ entirely (`ZZTEST4-ORPHAN-DIFFERENT-TITLE` vs `ZZTEST4-COMPLETELY-DIFFERENT-ES-TITLE`). The old guard would have seen zero title matches and created a duplicate (count→8). The new `_es_source_en_id` meta key catches the orphan regardless of title, blocking the duplicate (count stays 7).

### T3 — Idempotency Intact (Regression)

- ES story count BEFORE: 7 [VERIFIED]
- REST POST for already-linked EN 487 → `{"status":"adopted","es_post_id":488,"success":true}` HTTP 200 [VERIFIED]
- ES story count AFTER: 7 (unchanged) [VERIFIED]
- **T3 PASS** [VERIFIED]

### T4 — Cleanup

| Post | Action | Result |
|------|--------|--------|
| 487 (EN) | wp_trash_post | trashed [VERIFIED] |
| 488 (ES) | wp_trash_post | trashed [VERIFIED] |
| 489 (EN2) | wp_trash_post | trashed [VERIFIED] |
| 490 (ORPHAN) | wp_trash_post | trashed [VERIFIED] |

Remaining non-trash ZZTEST4 posts: 0 [VERIFIED]
