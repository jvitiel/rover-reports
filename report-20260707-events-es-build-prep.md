# Events EN→ES Build Prep Diagnosis — 2026-07-07

## Q1 — Full flg_handle_event_push

### register_rest_route (functions.php:1152)

```php
register_rest_route('4lg/v1', '/push-event', array(
    'methods'             => 'POST',
    'callback'            => 'flg_handle_event_push',
    'permission_callback' => function() {
        return current_user_can('edit_posts');
    },
));
```

Namespace: `4lg/v1`. Route: `/push-event`. Method: `POST`. Permission: `edit_posts` cap. No `args` validation array. [VERIFIED]

### Function body (functions.php:1177–1268)

```php
function flg_handle_event_push($request) {
    $params = $request->get_json_params();

    // Validate required fields
    if (empty($params['title'])) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Missing required field: title',
        ), 400);
    }

    $title = sanitize_text_field($params['title']);
    
    // Check if event already exists (by title and event_date)
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

    $post_data = array(
        'post_title'  => $title,
        'post_type'   => 'shelter_event',
        'post_status' => 'publish',
    );

    // Include content if provided
    if (!empty($params['content'])) {
        $post_data['post_content'] = wp_kses_post($params['content']);
    }

    if ($existing) {
        // Update existing post
        $post_data['ID'] = $existing->ID;
        $post_id = wp_update_post($post_data);
    } else {
        // Create new post
        $post_id = wp_insert_post($post_data);
    }

    if (is_wp_error($post_id)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => $post_id->get_error_message(),
        ), 500);
    }

    // Update meta fields
    $meta_fields = array(
        'event_date', 'event_time_start', 'event_time_end',
        'event_location', 'event_location_name', 'event_type',
        'photo_url', 'link_url', 'link_text',
        'contact_email', 'contact_phone'
    );

    foreach ($meta_fields as $field) {
        if (isset($params[$field])) {
            $value = sanitize_text_field($params[$field]);
            update_post_meta($post_id, $field, $value);
        }
    }

    // Clear cache after push (all language variants)
    flg_delete_lang_transient('flg_upcoming_events');
    if (function_exists('sg_cachepress_purge_cache')) {
        sg_cachepress_purge_cache(home_url('/'));
        sg_cachepress_purge_cache(home_url('/events'));
    }

    return new WP_REST_Response(array(
        'success'  => true,
        'post_id'  => $post_id,
        'action'   => $existing ? 'updated' : 'created',
    ), 200);
}
```

[VERIFIED — verbatim from functions.php:1177–1268]

### Key variables for extension

| Variable | Purpose |
|----------|---------|
| `$params` | `$request->get_json_params()` — raw JSON body |
| `$title` | `sanitize_text_field($params['title'])` |
| `$existing` | `null` or first matching post (title+event_date dedup) |
| `$post_data` | `wp_insert_post` args array |
| `$post_id` | EN post ID after insert/update |
| `$meta_fields` | flat array of 11 meta key names |

Create branch: `$existing === null` → `wp_insert_post($post_data)`. [VERIFIED]

Post author: NOT explicitly set in `$post_data` — `wp_insert_post` defaults to current user (the REST-authenticated `dashboard-push` user 4). [VERIFIED — event 440 has post_author=4]

---

## Q2 — shelter_event Field + Meta Map

### Event 440 (dashboard-pushed, EN, upcoming)

**Core fields:**

| Field | Value |
|-------|-------|
| post_title | Find Your New Best Friend! |
| post_content | Come meet some adoptable animals who are looking for loving forever homes... |
| post_status | publish |
| post_author | 4 |
| post_type | shelter_event |

**Meta:**

| meta_key | meta_value | Classification |
|----------|------------|---------------|
| event_date | 2026-07-11 | COPY-VERBATIM |
| event_time_start | 12:30 PM | COPY-VERBATIM |
| event_time_end | 3:00 PM | COPY-VERBATIM |
| event_location | 59 South Broadway, Nyack, NY | COPY-VERBATIM |
| event_location_name | Nyack Public Library | **TRANSLATABLE** (via `event_location_name_es`) |
| event_type | adoption_event | COPY-VERBATIM |
| photo_url | https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/Screenshot-2026-07-06-185958.png | COPY-VERBATIM |
| link_url | *(empty)* | COPY-VERBATIM |
| link_text | *(empty)* | **TRANSLATABLE** (via `link_text_es`) |
| contact_email | *(empty)* | COPY-VERBATIM |
| contact_phone | 845-414-9700 | COPY-VERBATIM |
| rank_math_internal_links_processed | 1 | IGNORE (auto-generated by plugin) |

[VERIFIED — wp post meta list 440]

### Event 323 (EN, linked to ES 366)

**Core fields:**

| Field | Value |
|-------|-------|
| post_title | Volunteer Orientaton |
| post_content | Ready to volunteer and help our shelter residents... |
| post_status | publish |
| post_author | 1 |
| post_type | shelter_event |

**Meta (relevant):**

| meta_key | meta_value |
|----------|------------|
| event_date | 2026-05-31 |
| event_time_start | 11:30 AM |
| event_time_end | 12:30 PM |
| event_location | 65 Firemens Memorial Drive, Pomona, NY 10970 |
| event_location_name | RG Cares Animal Shelter |
| event_type | volunteer_day |
| photo_url | *(empty)* |
| link_url | *(empty)* |
| link_text | *(empty)* |
| contact_email | volunteer@4lg.org |
| contact_phone | 845-414-9700 |

[VERIFIED — wp post meta list 323]

### Event 366 (ES translation of 323)

Confirmed: meta keys are IDENTICAL to EN counterpart 323. All non-translatable meta values are identical copies. Only `post_title` and `post_content` differ (Spanish translations). `event_location_name` is "RG Cares Animal Shelter" on both (proper noun, not translated). [VERIFIED — wp post meta list 366]

### Field classification summary

**TRANSLATABLE** (supplied via `_es` fields from dashboard):
- `post_title` (from `title_es`)
- `post_content` (from `content_es`)
- `event_location_name` meta (from `event_location_name_es`)
- `link_text` meta (from `link_text_es`)

**COPY-VERBATIM to ES post** (exact meta keys the handler must copy):
- `event_date`
- `event_time_start`
- `event_time_end`
- `event_location`
- `event_type`
- `photo_url`
- `link_url`
- `contact_email`
- `contact_phone`

[VERIFIED — derived from comparison of 323 vs 366 meta + contract field map]

---

## Q3 — Featured Image / Photo Handling

No `_thumbnail_id` meta exists on events 440, 323, or 366. All three return exit code 1 (key not found) for `wp post meta get <id> _thumbnail_id`. [VERIFIED]

Events use `photo_url` meta exclusively — a full URL to a WordPress media library upload (event 440: `https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/Screenshot-2026-07-06-185958.png`). Events 323 and 366 both have empty `photo_url`. [VERIFIED]

**ES post creation requirement:** Copy the `photo_url` meta value verbatim to the ES post (it's an absolute URL to a shared media file). No `set_post_thumbnail()` call needed. No attachment duplication needed. The same URL renders in both language versions. [INFERRED — confirmed by 323↔366 pattern where both share identical meta values]

---

## Q4 — Idempotency Function

```
wp eval 'var_dump(function_exists("pll_get_post"));'
=> bool(true)
```

[VERIFIED]

```
wp eval 'var_dump(pll_get_post(323, "es"));'
=> int(366)
```

Returns the linked ES post ID. [VERIFIED]

```
wp eval 'var_dump(pll_get_post(440, "es"));'
=> int(0)
```

Returns `int(0)` when no linked ES post exists (not `false` or `null`). [VERIFIED]

**Idempotency check:** `pll_get_post($en_post_id, 'es')` — truthy (non-zero int) means ES already linked, falsy (0) means no ES post exists. Use `!pll_get_post($en_post_id, 'es')` as create guard. [VERIFIED]

### Full EN event inventory and ES link status

| EN ID | Title | ES Link |
|-------|-------|---------|
| 440 | Find Your New Best Friend! | 0 (none) |
| 438 | Volunteer Orientation | 0 |
| 437 | Volunteer Orientation | 0 |
| 371 | Volunteer Orientaton | 0 |
| 323 | Volunteer Orientaton | 366 |
| 310 | Volunteer Orientation | 0 |
| 307 | Volunteer Orientation | 0 |
| 297 | Test Event | 0 |
| 254 | Late Winter Bow Wow | 0 |
| 249 | Volunteer Orientation | 0 |
| 248 | Pet Supplies Plus Fundraiser | 0 |
| 247 | Spring Adoption Fair | 0 |

12 EN events total, 1 has ES link. [VERIFIED]

---

## Q5 — Orphan-Detection Query Primitives

### Language taxonomy

- Taxonomy name: `language`
- EN term: slug `en`, term_id `3`
- ES term: slug `es`, term_id `6`

[VERIFIED — get_terms output]

### Translation linkage taxonomy

- Taxonomy name: `post_translations`
- Each term's `description` is a PHP serialized array: `a:2:{s:2:"en";i:<EN_ID>;s:2:"es";i:<ES_ID>;}`
- Example: term 23 `pll_6a1350b48b0fc` → `{en: 323, es: 366}`

[VERIFIED — get_terms post_translations output]

### Query to list ES-language shelter_events

```php
$es_events = get_posts(array(
  'post_type'      => 'shelter_event',
  'posts_per_page' => -1,
  'tax_query'      => array(array(
    'taxonomy' => 'language',
    'field'    => 'slug',
    'terms'    => 'es',
  )),
));
```

Returns: 1 result (post 366). [VERIFIED]

### Orphan detection (unlinked ES event)

For each ES event, check `pll_get_post($es_id, 'en')` — returns `int(0)` if no EN counterpart linked. Current state: 0 orphans (366 links to 323). [VERIFIED]

### Matching candidate to EN

Match on `event_date` meta + title similarity (same approach as `$existing` dedup in push-event handler). The event_date meta is copied verbatim to ES posts, so `meta_key=event_date, meta_value=<date>` + post_type=shelter_event + lang=es is a reliable query. [INFERRED — based on observed data pattern 323↔366]

---

## Q6 — 4lg/v1 Write Route Registration Pattern

### push-event (functions.php:1152)

```php
register_rest_route('4lg/v1', '/push-event', array(
    'methods'             => 'POST',
    'callback'            => 'flg_handle_event_push',
    'permission_callback' => function() {
        return current_user_can('edit_posts');
    },
));
```

No `args` validation array. Permission: `edit_posts` cap. [VERIFIED]

### set-story-featured (functions.php:219)

```php
register_rest_route('4lg/v1', '/set-story-featured', array(
    'methods'             => 'POST',
    'callback'            => 'flg_set_story_featured',
    'permission_callback' => function() {
        return current_user_can('edit_posts');
    },
));
```

Same pattern: POST, `edit_posts` cap, no args. [VERIFIED]

### Pattern for new link-es-translation route

All 4lg/v1 write routes use:
- Namespace: `4lg/v1`
- Methods: `POST`
- Permission callback: `current_user_can('edit_posts')`
- No formal `args` validation — body params validated inside the callback
- Callbacks prefixed `flg_`
- Registered inside an `rest_api_init` action hook function

[VERIFIED — consistent across push-event and set-story-featured]

### flg_delete_lang_transient helper (functions.php:238)

```php
function flg_delete_lang_transient($base_key) {
    if (function_exists('pll_languages_list')) {
        $langs = pll_languages_list();
        if (!empty($langs)) {
            foreach ($langs as $lang_slug) {
                delete_transient($base_key . '_' . $lang_slug);
            }
            return;
        }
    }
    // Fallback if Polylang unavailable or returns empty
    delete_transient($base_key . '_en');
    delete_transient($base_key . '_es');
}
```

Already called in push-event handler: `flg_delete_lang_transient('flg_upcoming_events')`. Clears both `_en` and `_es` transients. Reusable for ES post creation. [VERIFIED]
