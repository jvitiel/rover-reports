# Stories EN→ES Build Prep Diagnosis — 2026-07-07

## Q1 — shelter_story CPT + rest_after_insert Hook

### register_post_type (functions.php:447)

```php
register_post_type('shelter_story', array(
    'public'              => true,
    'show_in_rest'        => true,
    'rest_base'           => 'shelter-stories',
    'supports'            => array('title', 'editor', 'thumbnail', 'custom-fields'),
    'capability_type'     => 'post',
    // ...labels, menu, rewrite omitted
));
```

REST create route: `wp/v2/shelter-stories` (POST). [VERIFIED]

### Hook firing order (WP 7.0, class-wp-rest-posts-controller.php)

Create flow in `create_item`:
- Line 808: `do_action("rest_insert_{$this->post_type}", $post, $request, true);`
- Line 872: `do_action("rest_after_insert_{$this->post_type}", $post, $request, true);`
- Line 876: `$response = $this->prepare_item_for_response($post, $request);`

**`rest_after_insert_shelter_story` fires BEFORE `prepare_item_for_response`.** A registered REST field whose get_callback reads meta set in the hook WILL appear in the create response. [VERIFIED — line numbers from WP 7.0 source]

Hook args: `($post, $request, $creating)` where `$creating` is `true` for create, `false` for update. [VERIFIED]

### $request carries arbitrary body params

```
$r->get_param("title_es") => 'prueba'     ✓
$r->get_param("content_es") => 'contenido' ✓
```

Unregistered params are accessible via `get_param()` and `get_json_params()`. The hook can read `title_es`/`content_es`/`link_text_es` from the request body. [VERIFIED]

### No recursion risk

`wp_insert_post()` (used by the hook to create the ES story) does NOT fire `rest_after_insert_shelter_story` — that action is only fired by `WP_REST_Posts_Controller::create_item` and `update_item`. A direct `wp_insert_post` call bypasses the REST controller entirely. [VERIFIED — the action is dispatched from the controller, not from wp_insert_post]

---

## Q2 — shelter_story Field + Meta Map

### Story 291 (hand-created EN, linked to ES 361)

**Core fields:**

| Field | Value |
|-------|-------|
| post_title | Better Days for B and B |
| post_content | On October 26, 2023, a quiet but overwhelming moment... (847 days story) |
| post_status | publish |
| post_author | 1 |
| post_type | shelter_story |

**Meta:**

| meta_key | meta_value | Classification |
|----------|------------|---------------|
| story_date | *(empty)* | COPY-VERBATIM |
| story_type | adoption | COPY-VERBATIM |
| animal_name | *(empty)* | COPY-VERBATIM |
| animal_species | *(empty)* | COPY-VERBATIM |
| animal_breed | *(empty)* | COPY-VERBATIM |
| photo_1_url | https://johnv80.sg-host.com/.../unnamed.jpg | COPY-VERBATIM |
| photo_2_url | *(empty)* | COPY-VERBATIM |
| photo_layout | left | COPY-VERBATIM |
| link_url | *(empty)* | COPY-VERBATIM |
| link_text | *(empty)* | **TRANSLATABLE** (via `link_text_es`) |
| featured_on_homepage | 0 | COPY-VERBATIM |
| _edit_lock | 1779649906:1 | IGNORE (auto) |
| rank_math_internal_links_processed | 1 | IGNORE (auto) |

[VERIFIED — wp post meta list 291]

### Story 448 (dashboard-pushed, post_author=4)

Same meta keys. `featured_on_homepage=1`, `featured_at=2026-07-07T00:07:16.887Z`. All other meta empty. [VERIFIED]

### ES Story 361 (translation of 291)

Meta identical to 291 except title+content (Spanish). `photo_1_url` same URL. All non-translatable meta copied verbatim. [VERIFIED — wp post meta list 361]

### Field classification summary

**TRANSLATABLE** (supplied via `_es` fields from dashboard):
- `post_title` (from `title_es`)
- `post_content` (from `content_es`)
- `link_text` meta (from `link_text_es`)

**COPY-VERBATIM to ES post** (exact meta keys the helper must copy):
- `story_date`
- `story_type`
- `animal_name`
- `animal_species`
- `animal_breed`
- `photo_1_url`
- `photo_2_url`
- `photo_layout`
- `link_url`
- `featured_on_homepage`

Note: `featured_at` is a dashboard-specific timestamp — copy if present but not critical. [INFERRED]

[VERIFIED — derived from comparison of 291 vs 361 meta]

---

## Q3 — Story Image Handling

No `_thumbnail_id` meta exists on stories 291, 448, or 361. All return exit code 1 (key not found). [VERIFIED]

Stories use `photo_1_url` and `photo_2_url` meta exclusively — full URLs to WordPress media library uploads. ES story 361 has the same `photo_1_url` as EN 291 (`https://johnv80.sg-host.com/.../unnamed.jpg`). [VERIFIED]

**ES post creation requirement:** Copy `photo_1_url` and `photo_2_url` meta values verbatim to the ES post. No `set_post_thumbnail()` call needed. No attachment duplication. Same absolute URLs render in both languages. [INFERRED — confirmed by 291↔361 pattern]

---

## Q4 — Registering the es_post_id REST Field

### Existing pattern: register_post_meta (functions.php:180–200)

```php
$meta_fields = array(
    'story_date'            => 'string',
    'story_type'            => 'string',
    'animal_name'           => 'string',
    'animal_species'        => 'string',
    'animal_breed'          => 'string',
    'photo_1_url'           => 'string',
    'photo_2_url'           => 'string',
    'photo_layout'          => 'string',
    'link_url'              => 'string',
    'link_text'             => 'string',
    'featured_on_homepage'  => 'string',
    'featured_at'           => 'string',
);

foreach ($meta_fields as $key => $type) {
    register_post_meta('shelter_story', $key, array(
        'show_in_rest'  => true,
        'single'        => true,
        'type'          => $type,
        'auth_callback' => function() {
            return current_user_can('edit_posts');
        },
    ));
}
```

[VERIFIED — functions.php:180–200]

No `register_rest_field` calls exist in the theme. [VERIFIED — grep returned empty]

### Recommended approach for es_post_id

Two options:

**Option A — register_post_meta** (mirrors existing pattern):
```php
register_post_meta('shelter_story', '_es_post_id', array(
    'show_in_rest'  => true,
    'single'        => true,
    'type'          => 'integer',
    'auth_callback' => function() { return current_user_can('edit_posts'); },
));
```
The hook sets `update_post_meta($en_post_id, '_es_post_id', $es_post_id)` before returning. Since `rest_after_insert` fires before `prepare_item_for_response`, the field appears in the create response under `meta._es_post_id`. Dashboard reads `response.meta._es_post_id`. [INFERRED]

**Option B — register_rest_field** (top-level field):
```php
register_rest_field('shelter_story', 'es_post_id', array(
    'get_callback' => function($post) {
        return (int) get_post_meta($post['id'], '_es_post_id', true) ?: null;
    },
    'schema' => array('type' => 'integer', 'description' => 'Linked ES post ID'),
));
```
Surfaces as `response.es_post_id` (top-level). Cleaner for the dashboard to read. [INFERRED]

Both work. Option A matches the existing style. Option B matches the dashboard's expected `es_post_id` field name (same as the events path). [INFERRED]

---

## Q5 — Orphan-Detection Key for Stories

### story_date meta

| ES Story | story_date | EN Link |
|----------|-----------|---------|
| 361 | *(empty)* | 291 |
| 362 | March 2026 | 288 |
| 363 | March 2026 | 266 |
| 364 | November 2025 | 237 |
| 365 | February 2026 | 223 |

`story_date` is freeform text (e.g., "March 2026"), sometimes empty. Two stories share "March 2026". Not a unique key — cannot reliably match a single orphan to a single EN story. [VERIFIED]

**Recommended match key:** `post_title` (story titles are more distinctive than dates). For orphan guard: match on title similarity or title+story_date compound. [INFERRED]

### Language taxonomy for shelter_story

```
5 ES stories — all linked, zero orphans
tax_query on 'language' term 'es' for shelter_story: works ✓
```

The `language` taxonomy + `es` term applies to `shelter_story` posts. Tax_query produces correct results. [VERIFIED]

---

## Q6 — Idempotency Check

```
pll_get_post(291, 'es') = 361     (linked ES story exists)
pll_get_post(448, 'es') = 0       (no linked ES, dashboard-pushed)
```

`pll_get_post` discriminates for `shelter_story` identically to `shelter_event`: truthy (int) = linked, 0 = no link. Use `!pll_get_post($en_id, 'es')` as create guard. [VERIFIED]

### Full EN story inventory and ES link status

5 hand-created EN stories have ES links. Story 448 (dashboard-pushed) has no ES link. All 5 ES stories are properly linked (zero orphans). [VERIFIED]
