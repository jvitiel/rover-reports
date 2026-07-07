# link-es-translation Route Liveness — 2026-07-07

## 1. Registration Artifact

**File:** `/home/customer/www/fourlegsgoodnynj.org/public_html/wp-content/themes/4lg-theme/functions.php`

### Route registration (line 1645–1654)

```php
add_action('rest_api_init', function() {
    register_rest_route('4lg/v1', '/link-es-translation', array(
        'methods'             => 'POST',
        'callback'            => 'flg_handle_link_es_translation',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        },
    ));
});
```

- Namespace: `4lg/v1`
- Route: `/link-es-translation`
- Methods: `POST`
- Permission callback: `current_user_can('edit_posts')`
- Callback: `flg_handle_link_es_translation`

[VERIFIED — grep + sed output from production functions.php:1645–1654]

### Helper function

```
1548:function flg_create_and_link_es_event($en_post_id, $es) {
```

Present at line 1548 in the same file. [VERIFIED — grep output]

## 2. Live Probe

Unauthenticated POST to `https://www.fourlegsgoodnynj.org/wp-json/4lg/v1/link-es-translation`:

```
{"code":"rest_forbidden","message":"Sorry, you are not allowed to do that.","data":{"status":401}}
HTTP_STATUS: 401
```

HTTP 401 — route is **registered and routing**. The `permission_callback` fired and rejected the unauthenticated request. A 404 would indicate the route is not registered; 401 confirms it is live and the `edit_posts` cap gate is enforced. [VERIFIED]

## 3. Install Identity

- Scanned theme: `/home/customer/www/fourlegsgoodnynj.org/public_html/wp-content/themes/4lg-theme/functions.php`
- Document root resolves to: `/home/customer/www/johnv80.sg-host.com/public_html` (symlink target)
- Domain probed: `https://www.fourlegsgoodnynj.org/`
- This is the **PRODUCTION** install on SiteGround, not staging. [VERIFIED]
