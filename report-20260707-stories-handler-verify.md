# Stories Handler Verification — 2026-07-07

## Q1 — Full Function Body

```php
function flg_handle_link_es_translation($request) {
    $params = $request->get_json_params();
    $en_post_id = isset($params['en_post_id']) ? intval($params['en_post_id']) : 0;
    $post_type  = isset($params['post_type']) ? sanitize_key($params['post_type']) : 'shelter_event';
    if (!$en_post_id) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Missing en_post_id'), 400);
    }
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
    $status = isset($result['status']) ? $result['status'] : 'error';
    $result['success'] = in_array($status, array('created', 'adopted'), true);
    $http = ($status === 'error') ? 500 : (($status === 'orphan_conflict') ? 409 : 200);
    return new WP_REST_Response($result, $http);
}
```

[VERIFIED — extracted via awk from production functions.php]

## Q2 — Post-Dispatch Logic

All four lines present, in order, after the if/elseif/else dispatch block:

1. `$status = isset($result['status']) ? $result['status'] : 'error';` ✓
2. `$result['success'] = in_array($status, array('created', 'adopted'), true);` ✓
3. `$http = ($status === 'error') ? 500 : (($status === 'orphan_conflict') ? 409 : 200);` ✓
4. `return new WP_REST_Response($result, $http);` ✓

[VERIFIED]

## Q3 — No Leftover Reject Line

```
grep -n "post_type !== .shelter_event." functions.php
→ 1550:    if (!$en_post || $en_post->post_type !== 'shelter_event') {
```

One match at line 1550 — this is inside `flg_create_and_link_es_event`, the events helper's guard checking that the source post is a shelter_event. This is correct and expected; it is NOT the old dispatch reject line. The dispatch function `flg_handle_link_es_translation` contains zero instances of `!== 'shelter_event'`. [VERIFIED]

## Q4 — Brace Balance

Function body (lines 1624–1655):
- Opening braces `{`: 7
- Closing braces `}`: 7

Balanced. Single clean structure: function open, if(!en_post_id) guard, if/elseif/else dispatch (3 branches), function close. No stray or duplicated blocks. [VERIFIED]

## Q5 — Three Appended Components

| Component | Count | Expected | Status |
|-----------|-------|----------|--------|
| `function flg_create_and_link_es_story` | 1 | 1 | ✓ |
| `register_rest_field('shelter_story'` | 1 | 1 | ✓ |
| `rest_after_insert_shelter_story` (hook name) | 1 (line 1759) | 1 | ✓ |
| `flg_after_insert_shelter_story` (callback) | 2 (lines 1759, 1760) | 2 | ✓ |

Line 1759: `add_action('rest_after_insert_shelter_story', 'flg_after_insert_shelter_story', 10, 3);`
Line 1760: `function flg_after_insert_shelter_story($post, $request, $creating) {`

All three components present exactly once each. [VERIFIED]

## Q6 — php -l (Live File)

```
$ php -l functions.php
No syntax errors detected in functions.php
```

Run against the production file (not a work copy). [VERIFIED]
