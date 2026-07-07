# Translation Contract Basis Diagnosis — 2026-07-07

## Q1 — Event Create Handler `flg_handle_event_push`

**Location:** `functions.php` in the active theme (`4lg-theme`), lines 1150–1262. [VERIFIED]

**Registration:**

```php
register_rest_route('4lg/v1', '/push-event', array(
    'methods'             => 'POST',
    'callback'            => 'flg_handle_event_push',
    'permission_callback' => function() {
        return current_user_can('edit_posts');
    },
));
```

Route: `POST /wp-json/4lg/v1/push-event`. Permission: `edit_posts` capability. [VERIFIED]

### Create-vs-Update Discriminator

The handler does NOT receive a wp_post_id from the dashboard. Instead, it deduplicates by **title + event_date match**:

```php
$existing = null;
if (!empty($params['event_date'])) {
    $existing_posts = get_posts(array(
        'post_type'   => 'shelter_event',
        'title'       => $title,
        'meta_key'    => 'event_date',
        'meta_value'  => sanitize_text_field($params['event_date']),
        'numberposts' => 1,
    ));
    if (!empty($existing_posts)) {
        $existing = $existing_posts[0];
    }
}

if ($existing) {
    $post_data['ID'] = $existing->ID;
    $post_id = wp_update_post($post_data);    // UPDATE
} else {
    $post_id = wp_insert_post($post_data);    // CREATE
}
```

**`$existing` is null → CREATE. `$existing` is set → UPDATE.** The discriminator is the `get_posts` title+date lookup. [VERIFIED]

### Response Body

```php
return new WP_REST_Response(array(
    'success'  => true,
    'post_id'  => $post_id,
    'action'   => $existing ? 'updated' : 'created',
), 200);
```

Returns `post_id` (int) and `action` ("created" or "updated"). [VERIFIED]

### Extensibility Assessment

The handler is a straightforward PHP function with clear create/update branching. After the `wp_insert_post` call (create branch), a block can be added to:
1. Call `pll_set_post_language($post_id, 'en')` on the EN post
2. Create a second ES post via `wp_insert_post` with translated title/content
3. Copy meta fields to the ES post
4. Call `pll_set_post_language($es_post_id, 'es')`
5. Call `pll_save_post_translations(['en' => $post_id, 'es' => $es_post_id])`
6. Return both IDs in the response

The handler already returns a response body with `post_id` — adding `es_post_id` is trivial. The create branch is cleanly separated from update, so ES-creation logic can be scoped to the create path only. [INFERRED — no structural obstacles]

## Q2 — Story Create Path

### Current Path

Stories push via **standard WP REST API**: `POST /wp-json/wp/v2/shelter-stories` (server.ts:3195). [VERIFIED]

**No custom handler exists.** Grep results for story push handlers in functions.php:
- `flg_handle_story*` → zero matches [VERIFIED]
- `push-story` → zero matches [VERIFIED]
- `rest_after_insert_shelter_story` → zero matches [VERIFIED]
- `rest_pre_insert_shelter_story` → zero matches [VERIFIED]
- `save_post_shelter_story` → zero matches [VERIFIED]

### CPT Registration

```php
register_post_type('shelter_story', array(
    // ...
    'show_in_rest'    => true,
    'rest_base'       => 'shelter-stories',
    'supports'        => array('title', 'editor', 'thumbnail', 'custom-fields'),
    'capability_type' => 'post',
));
```

CPT slug: `shelter_story`. REST base: `shelter-stories`. [VERIFIED]

### Available Hooks for Adding a Handler

WordPress fires these hooks when a post is created/updated via REST (the hook name includes the post type slug):

| Hook | Fires when | Signature |
|------|-----------|-----------|
| `rest_after_insert_shelter_story` | After REST creates or updates a `shelter_story` | `($post, $request, $creating)` — `$creating` is `true` on create, `false` on update |
| `rest_pre_insert_shelter_story` | Before REST inserts/updates | `($prepared_post, $request)` |
| `rest_insert_shelter_story` | After insert, before meta/terms | `($post, $request, $creating)` |

The most suitable hook is **`rest_after_insert_shelter_story`** — it fires after the post + meta are saved, provides `$creating` (boolean) for create-vs-update discrimination, and the post ID is available. [INFERRED — standard WP REST controller hook pattern]

Alternative: create a custom `4lg/v1/push-story` endpoint (like events) for full control. [INFERRED]

## Q3 — Existing Good Pairs: Exact Polylang Linkage

### Event Pair: 323 (EN) ↔ 366 (ES)

**Post 323 (EN):**

| Taxonomy | Term slug | Term ID | Description |
|----------|-----------|---------|-------------|
| `language` | `en` | 3 | — |
| `post_translations` | `pll_6a1350b48b0fc` | 23 | `a:2:{s:2:"es";i:366;s:2:"en";i:323;}` |

**Post 366 (ES):**

| Taxonomy | Term slug | Term ID | Description |
|----------|-----------|---------|-------------|
| `language` | `es` | 6 | — |
| `post_translations` | `pll_6a1350b48b0fc` | 23 | `a:2:{s:2:"es";i:366;s:2:"en";i:323;}` |

Both posts share the **same** `post_translations` term (term_id=23). The term's description is a serialized PHP array mapping `{lang_slug → post_id}`. [VERIFIED — `wp_get_object_terms` output]

### Story Pair: 291 (EN) ↔ 361 (ES)

**Post 291 (EN):**

| Taxonomy | Term slug | Term ID | Description |
|----------|-----------|---------|-------------|
| `language` | `en` | 3 | — |
| `post_translations` | `pll_6a134acecbac5` | 18 | `a:2:{s:2:"es";i:361;s:2:"en";i:291;}` |

**Post 361 (ES):**

| Taxonomy | Term slug | Term ID | Description |
|----------|-----------|---------|-------------|
| `language` | `es` | 6 | — |
| `post_translations` | `pll_6a134acecbac5` | 18 | `a:2:{s:2:"es";i:361;s:2:"en";i:291;}` |

Same pattern — shared `post_translations` term (term_id=18). [VERIFIED]

### Target Linkage State to Reproduce

For a new EN+ES pair, the handler must produce:
1. EN post assigned `language` taxonomy term `en` (term_id=3)
2. ES post assigned `language` taxonomy term `es` (term_id=6)
3. Both posts assigned to a **shared** `post_translations` taxonomy term whose description is `a:2:{s:2:"en";i:<EN_ID>;s:2:"es";i:<ES_ID>;}`

`pll_set_post_language` handles step 1–2. `pll_save_post_translations` handles step 3 (creates the shared term automatically). [VERIFIED]

### Language Terms Available

| Slug | Term ID | Name |
|------|---------|------|
| `en` | 3 | English |
| `es` | 6 | Español |

[VERIFIED]

## Q4 — Polylang PHP API Availability

```
var_dump(
    function_exists("pll_set_post_language"),   → bool(true)
    function_exists("pll_save_post_translations"), → bool(true)
    function_exists("pll_get_post_language")    → bool(true)
);
```

All three functions exist and are callable. [VERIFIED — `wp eval` output]

**Availability in REST context:** `flg_handle_event_push` runs inside a WordPress REST API request. Polylang hooks into `plugins_loaded` (priority 1) and registers its API functions in `init`. REST routes fire after `init`. Therefore Polylang's `pll_*` functions are available when `flg_handle_event_push` executes. [INFERRED — standard WordPress load order; confirmed indirectly by the fact that `flg_handle_event_push` already calls `flg_delete_lang_transient` which uses `pll_languages_list`, a Polylang function]

The handler already calls `flg_delete_lang_transient('flg_upcoming_events')` at line ~1252, and that function calls `pll_languages_list()` (functions.php:239). This **proves** Polylang is loaded and callable in the push handler's execution context. [VERIFIED — `flg_delete_lang_transient` at line 238 calls `pll_languages_list()`; `flg_handle_event_push` calls `flg_delete_lang_transient` at line ~1252]

## Q5 — Create-Only Guard Signals

### Create-vs-Update Discriminator (Events)

**Signal:** `$existing` variable in `flg_handle_event_push`. When `$existing` is null → create branch (`wp_insert_post`). When set → update branch (`wp_update_post`). The ES-creation block goes inside the `else` (create) branch, after `wp_insert_post` returns successfully. [VERIFIED — code at lines 1216–1222]

Guard code pattern:
```php
if ($existing) {
    // UPDATE — do NOT create ES translation here
} else {
    $post_id = wp_insert_post($post_data);
    // CREATE — add ES translation here
}
```

### Confirming the Post is EN (Not ES)

The push handler creates posts without setting a language. Polylang assigns the site default language (EN) to posts created without explicit language assignment. To be explicit, the handler should call `pll_set_post_language($post_id, 'en')` before creating the ES translation. This also serves as documentation of intent. [INFERRED]

Alternatively, after `wp_insert_post`, check: `if (pll_get_post_language($post_id) !== 'en') return;` — but this is belt-and-suspenders since the push only ever creates EN content. [INFERRED]

### Risk: Could a Dashboard ES PUT Re-Trigger ES Creation?

**Events UPDATE path:** The dashboard's `updateWordPressEvent()` (server.ts:3607) sends `PUT` to `wp/v2/shelter-events/{wpPostId}` — the **standard WP REST API**, NOT `4lg/v1/push-event`. [VERIFIED — server.ts:3623]

Therefore: **a standard REST PUT to an existing ES event post does NOT pass through `flg_handle_event_push`**. The custom endpoint only handles `POST /4lg/v1/push-event`. No re-trigger risk from the update path. [VERIFIED]

**Events CREATE path:** `createWordPressEvent()` (server.ts:3557) sends `POST` to `4lg/v1/push-event`, which DOES hit `flg_handle_event_push`. But: (a) the dashboard only calls `createWordPressEvent` for NEW events, never for updates, and (b) the WP handler's title+date dedup would match the EN post, routing to the update branch (not create). Double safety. [VERIFIED — server.ts:3557 vs 3607]

**Stories:** The future `rest_after_insert_shelter_story` hook receives `$creating` (boolean). Use `if (!$creating) return;` as the first line. A REST PUT to an existing ES story post fires with `$creating = false` → guard returns early. No re-trigger risk. [INFERRED — standard WP REST controller behavior; `$creating` is set by `WP_REST_Posts_Controller::create_item` vs `update_item`]

## Q6 — Dashboard WP User Capabilities

### User

`dashboard-push` (user ID 4), role `dashboard_service`. [VERIFIED]

### Capabilities

```
delete_others_posts: YES
delete_posts: YES
delete_published_posts: YES
edit_others_posts: YES
edit_posts: YES
edit_published_posts: YES
publish_posts: YES
read: YES
upload_files: YES
```

[VERIFIED — `wp eval` with `$user->allcaps`]

### CPT Capability Type

Both CPTs use `'capability_type' => 'post'`:

| CPT | capability_type | Result |
|-----|----------------|--------|
| `shelter_story` | `post` | Maps to standard post caps (`edit_posts`, `publish_posts`, etc.) |
| `shelter_event` | `post` | Maps to standard post caps |

[VERIFIED — `register_post_type` args in functions.php]

### Assessment

With `capability_type => 'post'`, both CPTs inherit standard post capabilities. The `dashboard_service` role has all the required caps:
- **Create:** `edit_posts` + `publish_posts` → can create and publish both EN and ES posts ✓
- **Update:** `edit_posts` + `edit_published_posts` + `edit_others_posts` → can edit any existing post ✓
- **Upload media:** `upload_files` → can upload event/story photos ✓

**No cap gaps.** Polylang language assignment is not gated by a separate capability — `pll_set_post_language` is a PHP function, not a REST endpoint, so it runs with whatever permissions the handler has. The `edit_posts` cap on the push handler's `permission_callback` is sufficient. [VERIFIED]

ES posts use the same CPT (just with a different language term), so the same caps apply. No role change needed. [VERIFIED]
