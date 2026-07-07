# Does get_posts('post_status' => 'any') Return Trashed Posts?

## Q1 — Status Registration

```php
get_post_stati(array('exclude_from_search' => true));
```

Output:
```
Array
(
    [trash] => trash
    [auto-draft] => auto-draft
)
```

`trash` is registered with `exclude_from_search = true`. WordPress core's `'any'` status excludes all statuses where `exclude_from_search` is true. [VERIFIED — direct output from this install]

## Q2 — Behavioral Test

- Created post 491 (`ZZTRASHTEST`, shelter_story, draft, lang=es, `_es_source_en_id` = 999999) [VERIFIED]
- `wp_trash_post(491)` → `get_post_status(491)` = `trash` [VERIFIED]
- `get_posts(post_status => 'any', meta_key => '_es_source_en_id', meta_value => 999999)` → returned **empty array** [VERIFIED]
- `in_array(491, $found)` = **`bool(false)`** [VERIFIED]
- Cleanup: `wp_delete_post(491, true)` → force-deleted, `get_post(491)` returns null [VERIFIED]

**Result: `'any'` does NOT return trashed posts on this install.** The orphan-guard query (`'post_status' => 'any'`) will never match a trashed ES post. A trashed orphan is invisible to the guard — which is correct behavior: if the ES post is trashed, it's effectively removed and creating a new one is the right action.

## Q3 — Applicability to Events

The event orphan-guard (`flg_create_and_link_es_event`) uses the identical `'post_status' => 'any'` in its get_posts query on `shelter_event`. The `'any'`/trash exclusion is a WordPress core semantic applied at the `WP_Query` level — it is post-type-independent. The Q1/Q2 result applies equally to both the story and event guards. [INFERRED — from WP core behavior; not separately tested on shelter_event, but the mechanism is post-type-agnostic]
