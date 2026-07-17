# WordPress REST User-Enumeration — Pre-flight Diagnosis

Date: 2026-07-17 00:12 UTC

---

## Evidence Discipline Acknowledgment

Two claims tagged [VERIFIED] in prior reports were false:

1. **Round 1:** "SG Security's `disable_usernames` blocks `?author=N`" — the code actually hooks `illegal_user_logins` to prevent registration of common usernames. It has no enumeration-blocking code.

2. **Round 2 section 2c:** "a REST request does not populate `$wp->query_vars['author']`" — contradicted by class-wp.php on this install. `author` is in `$public_query_vars` (class-wp.php:18), and lines 319-333 populate `$this->query_vars[$wpvar]` from `$_GET[$wpvar]` for every public query var. This runs before the `parse_request` action (line 418). So a REST request to `/wp-json/wp/v2/posts?author=1` DOES set `$wp->query_vars['author']` to `'1'` before `parse_request` callbacks fire. A `parse_request` hook checking `$wp->query_vars['author']` would fire on REST requests carrying `?author=` parameters.

Both corrections are incorporated below. All [VERIFIED] tags below cite a file:line on this install or pasted command output.

---

## P1 — FULL ANONYMOUS REST ROUTE INDEX

### P1a. Complete registered route patterns

394 routes total. Full list (output of `curl -s https://www.fourlegsgoodnynj.org/wp-json/ | python3 extracting routes`):

```
/
/4lg/v1
/4lg/v1/clear-animals-cache
/4lg/v1/clear-events-cache
/4lg/v1/clear-stories-cache
/4lg/v1/link-es-translation
/4lg/v1/push-event
/4lg/v1/set-story-featured
/4lg/v1/test-animals-api
/batch/v1
/mcp
/mcp/mcp-adapter-default-server
/oembed/1.0
/oembed/1.0/embed
/oembed/1.0/proxy
/pll/v1
/pll/v1/languages
/pll/v1/languages/(?P<slug>[a-z][a-z0-9_-]*)
/pll/v1/languages/(?P<term_id>[\d]+)
/pll/v1/settings
/rankmath/v1
/rankmath/v1/an
/rankmath/v1/an/analyticsSummary
/rankmath/v1/an/dashboard
/rankmath/v1/an/inspectionResults
/rankmath/v1/an/keywordsOverview
/rankmath/v1/an/keywordsRows
/rankmath/v1/an/keywordsSummary
/rankmath/v1/an/post/(?P<id>\d+)
/rankmath/v1/an/postsRowsByObjects
/rankmath/v1/an/postsSummary
/rankmath/v1/an/removeFrontendStats
/rankmath/v1/an/userPreferences
/rankmath/v1/ca
/rankmath/v1/ca/createPost
/rankmath/v1/ca/deleteOutput
/rankmath/v1/ca/generateAlt
/rankmath/v1/ca/getCredits
/rankmath/v1/ca/pingContentAI
/rankmath/v1/ca/researchKeyword
/rankmath/v1/ca/saveOutput
/rankmath/v1/ca/savePrompts
/rankmath/v1/ca/updateCredits
/rankmath/v1/ca/updatePrompt
/rankmath/v1/ca/updateRecentPrompt
/rankmath/v1/dashboardWidget
/rankmath/v1/disconnectSite
/rankmath/v1/getFeaturedImageId
/rankmath/v1/in
/rankmath/v1/in/clearLog
/rankmath/v1/in/getLog
/rankmath/v1/in/resetKey
/rankmath/v1/in/submitUrls
/rankmath/v1/links/links
/rankmath/v1/links/links-stats
/rankmath/v1/links/posts
/rankmath/v1/links/posts-stats
/rankmath/v1/saveModule
/rankmath/v1/searchPage
/rankmath/v1/setupWizard
/rankmath/v1/setupWizard/getStepData
/rankmath/v1/setupWizard/updateStepData
/rankmath/v1/setupWizard/updateTrackingOptin
/rankmath/v1/status
/rankmath/v1/status/exportSettings
/rankmath/v1/status/getViewData
/rankmath/v1/status/importSettings
/rankmath/v1/status/runBackup
/rankmath/v1/status/updateViewData
/rankmath/v1/toolsAction
/rankmath/v1/updateMeta
/rankmath/v1/updateMetaBulk
/rankmath/v1/updateMode
/rankmath/v1/updateRedirection
/rankmath/v1/updateSchemas
/rankmath/v1/updateSeoScore
/rankmath/v1/updateSettings
/sg-ai-studio
/sg-ai-studio/acl
/sg-ai-studio/activity-log
/sg-ai-studio/categories
/sg-ai-studio/categories/(?P<id>[\d]+)
/sg-ai-studio/comments
/sg-ai-studio/comments/(?P<id>[\d]+)
/sg-ai-studio/comments/(?P<id>[\d]+)/moderate
/sg-ai-studio/comments/batch
/sg-ai-studio/connection-status
/sg-ai-studio/core/clear-cache
/sg-ai-studio/core/core-update
/sg-ai-studio/core/language-update
/sg-ai-studio/disconnect
/sg-ai-studio/generate-content
/sg-ai-studio/generate-token
/sg-ai-studio/gutenberg/delete-image
/sg-ai-studio/gutenberg/edit-text
/sg-ai-studio/gutenberg/generate-block
/sg-ai-studio/gutenberg/generate-image
/sg-ai-studio/init-auth
/sg-ai-studio/media
/sg-ai-studio/media/(?P<id>[\d]+)
/sg-ai-studio/media/batch
/sg-ai-studio/menu-items
/sg-ai-studio/menu-items/(?P<id>[\d]+)
/sg-ai-studio/menu-locations
/sg-ai-studio/menu-type
/sg-ai-studio/menus
/sg-ai-studio/menus/(?P<id>[\d]+)
/sg-ai-studio/menus/(?P<id>[\d]+)/items
/sg-ai-studio/onboarding-shown
/sg-ai-studio/pages
/sg-ai-studio/pages/(?P<id>[\d]+)
/sg-ai-studio/pages/batch
/sg-ai-studio/ping
/sg-ai-studio/plugins
/sg-ai-studio/plugins/(?P<slug>(?!batch$)[^/]+)
/sg-ai-studio/plugins/batch
/sg-ai-studio/posts
/sg-ai-studio/posts/(?P<id>[\d]+)
/sg-ai-studio/posts/batch
/sg-ai-studio/settings
/sg-ai-studio/settings-page/auto-connect
/sg-ai-studio/settings-page/chat-bubble
/sg-ai-studio/settings-page/connected
/sg-ai-studio/settings-page/disconnect
/sg-ai-studio/settings-page/disconnect-provider
/sg-ai-studio/settings-page/gutenberg-actions
/sg-ai-studio/settings-page/powermode
/sg-ai-studio/settings-page/provider-connected
/sg-ai-studio/settings-page/reconnect-provider
/sg-ai-studio/settings/(?P<setting_name>[a-zA-Z0-9_-]+)
/sg-ai-studio/spam-comments
/sg-ai-studio/tags
/sg-ai-studio/tags/(?P<id>[\d]+)
/sg-ai-studio/themes
/sg-ai-studio/themes/(?P<stylesheet>[^/]+)
/sg-ai-studio/themes/batch
/sg-ai-studio/types
/sg-ai-studio/types/(?P<type>[\w-]+)
/sg-ai-studio/update-domain
/sg-ai-studio/usage
/sg-ai-studio/users
/sg-ai-studio/users/(?P<id>[\d]+)
/sg-ai-studio/users/batch
/sg-security/v1
/sg-security/v1/2fa
/sg-security/v1/activity-log-lifetime
/sg-security/v1/activity-registered
/sg-security/v1/activity-unknown
/sg-security/v1/block-ip/(?P<id>\d+)
/sg-security/v1/block-user/(?P<id>\d+)
/sg-security/v1/blocked-users
/sg-security/v1/custom-login-url
/sg-security/v1/delete-readme
/sg-security/v1/disable-admin-username
/sg-security/v1/disable-editors
/sg-security/v1/disable-feeds
/sg-security/v1/disable-xml-rpc
/sg-security/v1/e-book
/sg-security/v1/fetch-options
/sg-security/v1/force-password-reset
/sg-security/v1/get-visitor-status/(?P<id>\d+)
/sg-security/v1/hardening
/sg-security/v1/hide-wp-version
/sg-security/v1/limit-login-attempts
/sg-security/v1/lock-system-folders
/sg-security/v1/login-access
/sg-security/v1/login-unblock
/sg-security/v1/logout-users
/sg-security/v1/manage-activity-log
/sg-security/v1/notification-emails
/sg-security/v1/notifications
/sg-security/v1/rate
/sg-security/v1/reinstall-plugins
/sg-security/v1/reset-user-2fa/(?P<id>\d+)
/sg-security/v1/security-score
/sg-security/v1/weekly-report
/sg-security/v1/xss-protection
/siteground-central/v1
/siteground-central/v1/connect-agent
/siteground-central/v1/dashboard
/siteground-central/v1/exit-wizard
/siteground-central/v1/get-step(?:/(?P<id>\d+))?
/siteground-central/v1/install
/siteground-central/v1/more-plugins
/siteground-central/v1/more-themes
/siteground-central/v1/plugins
/siteground-central/v1/restart
/siteground-central/v1/save-step
/siteground-central/v1/theme-install
/siteground-central/v1/theme-pre-install
/siteground-central/v1/themes
/siteground-central/v1/wizard
/siteground-central/v1/wp-events
/siteground-dashboard/v1
/siteground-dashboard/v1/dashboard
/siteground-dashboard/v1/email-marketing/connect
/siteground-dashboard/v1/notifications
/siteground-dashboard/v1/notifications/refresh
/siteground-dashboard/v1/partner-plugins
/siteground-dashboard/v1/partner-plugins/(?P<plugin_slug>[^/]+)
/siteground-dashboard/v1/plugins/(?P<plugin_slug>[^/]+)
/siteground-dashboard/v1/power-tools/security-optimizer
/siteground-dashboard/v1/power-tools/speed-optimizer
/siteground-dashboard/v1/site-info
/siteground-optimizer/v1
/siteground-optimizer/v1/autoflush-cache
/siteground-optimizer/v1/backup-media
/siteground-optimizer/v1/combine-css
/siteground-optimizer/v1/combine-javascript
/siteground-optimizer/v1/database-optimization
/siteground-optimizer/v1/disable-emojis
/siteground-optimizer/v1/disable-memcache
/siteground-optimizer/v1/disable-multisite-optimization
/siteground-optimizer/v1/disable-option
/siteground-optimizer/v1/e-book
/siteground-optimizer/v1/enable-browser-caching
/siteground-optimizer/v1/enable-cache
/siteground-optimizer/v1/enable-gzip-compression
/siteground-optimizer/v1/enable-memcache
/siteground-optimizer/v1/enable-multisite-optimization
/siteground-optimizer/v1/enable-option
/siteground-optimizer/v1/exclude/(?P<type>[^/]+)
/siteground-optimizer/v1/feature-popup/(?P<type>[^/]+)
/siteground-optimizer/v1/fetch-options
/siteground-optimizer/v1/fetch-options/(?P<page_id>[^/]+)
/siteground-optimizer/v1/file-caching
/siteground-optimizer/v1/file-caching-settings
/siteground-optimizer/v1/fix-insecure-content
/siteground-optimizer/v1/hardening
/siteground-optimizer/v1/heartbeat/(?P<location>[^/]+)
/siteground-optimizer/v1/image-resize
/siteground-optimizer/v1/lazyload-images
/siteground-optimizer/v1/logged-in-cache
/siteground-optimizer/v1/memcached
/siteground-optimizer/v1/notifications
/siteground-optimizer/v1/optimize-css
/siteground-optimizer/v1/optimize-html
/siteground-optimizer/v1/optimize-javascript
/siteground-optimizer/v1/optimize-javascript-async
/siteground-optimizer/v1/optimize-web-fonts
/siteground-optimizer/v1/perf-notification-email
/siteground-optimizer/v1/performance-report
/siteground-optimizer/v1/preload-combined-css
/siteground-optimizer/v1/preview-image(?:/(?P<id>\d+))?
/siteground-optimizer/v1/purge-cache
/siteground-optimizer/v1/purge-rest-cache
/siteground-optimizer/v1/rate
/siteground-optimizer/v1/remove-query-strings
/siteground-optimizer/v1/reset-images-optimization
/siteground-optimizer/v1/reset-webp-conversion
/siteground-optimizer/v1/run-analysis
/siteground-optimizer/v1/ssl
/siteground-optimizer/v1/test-url-cache
/siteground-optimizer/v1/user-agent-header
/siteground-optimizer/v1/webp-support
/siteground-settings/v1
/siteground-settings/v1/update-settings
/wp-abilities/v1
/wp-abilities/v1/abilities
/wp-abilities/v1/abilities/(?P<name>[a-zA-Z0-9\-\/]+)
/wp-abilities/v1/abilities/(?P<name>[a-zA-Z0-9\-\/]+?)/run
/wp-abilities/v1/categories
/wp-abilities/v1/categories/(?P<slug>[a-z0-9]+(?:-[a-z0-9]+)*)
/wp-block-editor/v1
/wp-block-editor/v1/export
/wp-block-editor/v1/navigation-fallback
/wp-block-editor/v1/url-details
/wp-site-health/v1
/wp-site-health/v1/directory-sizes
/wp-site-health/v1/tests/authorization-header
/wp-site-health/v1/tests/background-updates
/wp-site-health/v1/tests/dotorg-communication
/wp-site-health/v1/tests/https-status
/wp-site-health/v1/tests/loopback-requests
/wp-site-health/v1/tests/page-cache
/wp/v2
/wp/v2/block-directory/search
/wp/v2/block-patterns/categories
/wp/v2/block-patterns/patterns
/wp/v2/block-renderer/(?P<name>[a-z0-9-]+/[a-z0-9-]+)
/wp/v2/block-types
/wp/v2/block-types/(?P<namespace>[a-zA-Z0-9_-]+)
/wp/v2/block-types/(?P<namespace>[a-zA-Z0-9_-]+)/(?P<name>[a-zA-Z0-9_-]+)
/wp/v2/blocks
/wp/v2/blocks/(?P<id>[\d]+)
/wp/v2/blocks/(?P<id>[\d]+)/autosaves
/wp/v2/blocks/(?P<parent>[\d]+)/autosaves/(?P<id>[\d]+)
/wp/v2/blocks/(?P<parent>[\d]+)/revisions
/wp/v2/blocks/(?P<parent>[\d]+)/revisions/(?P<id>[\d]+)
/wp/v2/categories
/wp/v2/categories/(?P<id>[\d]+)
/wp/v2/comments
/wp/v2/comments/(?P<id>[\d]+)
/wp/v2/font-collections
/wp/v2/font-collections/(?P<slug>[\/\w-]+)
/wp/v2/font-families
/wp/v2/font-families/(?P<font_family_id>[\d]+)/font-faces
/wp/v2/font-families/(?P<font_family_id>[\d]+)/font-faces/(?P<id>[\d]+)
/wp/v2/font-families/(?P<id>[\d]+)
/wp/v2/global-styles/(?P<id>[\/\d+]+)
/wp/v2/global-styles/(?P<parent>[\d]+)/revisions
/wp/v2/global-styles/(?P<parent>[\d]+)/revisions/(?P<id>[\d]+)
/wp/v2/global-styles/themes/(?P<stylesheet>[\/\s%\w\.\(\)\[\]\@_\-]+)/variations
/wp/v2/global-styles/themes/(?P<stylesheet>[^\/:<>\*\?"\|]+(?:\/[^\/:<>\*\?"\|]+)?)
/wp/v2/icons
/wp/v2/icons/(?P<name>[a-z][a-z0-9-]*/[a-z][a-z0-9-]*)
/wp/v2/media
/wp/v2/media/(?P<id>[\d]+)
/wp/v2/media/(?P<id>[\d]+)/edit
/wp/v2/media/(?P<id>[\d]+)/post-process
/wp/v2/menu-items
/wp/v2/menu-items/(?P<id>[\d]+)
/wp/v2/menu-items/(?P<id>[\d]+)/autosaves
/wp/v2/menu-items/(?P<parent>[\d]+)/autosaves/(?P<id>[\d]+)
/wp/v2/menu-locations
/wp/v2/menu-locations/(?P<location>[\w-]+)
/wp/v2/menus
/wp/v2/menus/(?P<id>[\d]+)
/wp/v2/navigation
/wp/v2/navigation/(?P<id>[\d]+)
/wp/v2/navigation/(?P<id>[\d]+)/autosaves
/wp/v2/navigation/(?P<parent>[\d]+)/autosaves/(?P<id>[\d]+)
/wp/v2/navigation/(?P<parent>[\d]+)/revisions
/wp/v2/navigation/(?P<parent>[\d]+)/revisions/(?P<id>[\d]+)
/wp/v2/pages
/wp/v2/pages/(?P<id>[\d]+)
/wp/v2/pages/(?P<id>[\d]+)/autosaves
/wp/v2/pages/(?P<parent>[\d]+)/autosaves/(?P<id>[\d]+)
/wp/v2/pages/(?P<parent>[\d]+)/revisions
/wp/v2/pages/(?P<parent>[\d]+)/revisions/(?P<id>[\d]+)
/wp/v2/pattern-directory/patterns
/wp/v2/plugins
/wp/v2/plugins/(?P<plugin>[^.\/]+(?:\/[^.\/]+)?)
/wp/v2/posts
/wp/v2/posts/(?P<id>[\d]+)
/wp/v2/posts/(?P<id>[\d]+)/autosaves
/wp/v2/posts/(?P<parent>[\d]+)/autosaves/(?P<id>[\d]+)
/wp/v2/posts/(?P<parent>[\d]+)/revisions
/wp/v2/posts/(?P<parent>[\d]+)/revisions/(?P<id>[\d]+)
/wp/v2/rm_content_editor
/wp/v2/rm_content_editor/(?P<id>[\d]+)
/wp/v2/rm_content_editor/(?P<id>[\d]+)/autosaves
/wp/v2/rm_content_editor/(?P<parent>[\d]+)/autosaves/(?P<id>[\d]+)
/wp/v2/search
/wp/v2/settings
/wp/v2/shelter-events
/wp/v2/shelter-events/(?P<id>[\d]+)
/wp/v2/shelter-events/(?P<id>[\d]+)/autosaves
/wp/v2/shelter-events/(?P<parent>[\d]+)/autosaves/(?P<id>[\d]+)
/wp/v2/shelter-stories
/wp/v2/shelter-stories/(?P<id>[\d]+)
/wp/v2/shelter-stories/(?P<id>[\d]+)/autosaves
/wp/v2/shelter-stories/(?P<parent>[\d]+)/autosaves/(?P<id>[\d]+)
/wp/v2/sidebars
/wp/v2/sidebars/(?P<id>[\w-]+)
/wp/v2/statuses
/wp/v2/statuses/(?P<status>[\w-]+)
/wp/v2/tags
/wp/v2/tags/(?P<id>[\d]+)
/wp/v2/taxonomies
/wp/v2/taxonomies/(?P<taxonomy>[\w-]+)
/wp/v2/template-parts
/wp/v2/template-parts/(...)/autosaves
/wp/v2/template-parts/(...)/autosaves/(...)
/wp/v2/template-parts/(...)/revisions
/wp/v2/template-parts/(...)/revisions/(...)
/wp/v2/template-parts/lookup
/wp/v2/templates
/wp/v2/templates/(...)/autosaves
/wp/v2/templates/(...)/autosaves/(...)
/wp/v2/templates/(...)/revisions
/wp/v2/templates/(...)/revisions/(...)
/wp/v2/templates/lookup
/wp/v2/themes
/wp/v2/themes/(...)
/wp/v2/types
/wp/v2/types/(?P<type>[\w-]+)
/wp/v2/users
/wp/v2/users/(?P<id>[\d]+)
/wp/v2/users/(?P<user_id>(?:[\d]+|me))/application-passwords
/wp/v2/users/(?P<user_id>(?:[\d]+|me))/application-passwords/(?P<uuid>[\w\-]+)
/wp/v2/users/(?P<user_id>(?:[\d]+|me))/application-passwords/introspect
/wp/v2/users/me
/wp/v2/widget-types
/wp/v2/widget-types/(?P<id>[a-zA-Z0-9_-]+)
/wp/v2/widget-types/(?P<id>[a-zA-Z0-9_-]+)/encode
/wp/v2/widget-types/(?P<id>[a-zA-Z0-9_-]+)/render
/wp/v2/widgets
/wp/v2/widgets/(?P<id>[\w\-]+)
/wp/v2/wp_pattern_category
/wp/v2/wp_pattern_category/(?P<id>[\d]+)
```

### P1b. Routes containing "user" (case-insensitive)

```
/rankmath/v1/an/userPreferences
/sg-ai-studio/users
/sg-ai-studio/users/(?P<id>[\d]+)
/sg-ai-studio/users/batch
/sg-security/v1/block-user/(?P<id>\d+)
/sg-security/v1/blocked-users
/sg-security/v1/disable-admin-username
/sg-security/v1/logout-users
/sg-security/v1/reset-user-2fa/(?P<id>\d+)
/siteground-optimizer/v1/user-agent-header
/wp/v2/users
/wp/v2/users/(?P<id>[\d]+)
/wp/v2/users/(?P<user_id>(?:[\d]+|me))/application-passwords
/wp/v2/users/(?P<user_id>(?:[\d]+|me))/application-passwords/(?P<uuid>[\w\-]+)
/wp/v2/users/(?P<user_id>(?:[\d]+|me))/application-passwords/introspect
/wp/v2/users/me
```

Core wp/v2 user routes: 6 (the 3 named in the prompt plus application-passwords and application-passwords/introspect).

Non-core user-adjacent routes: 10.

### P1c. Anonymous access test for non-core user routes

**`/sg-ai-studio/users` (GET):**
```json
{
    "code": "rest_forbidden",
    "message": "Authorization header missing.",
    "data": { "status": 401 }
}
```
Returns 401. No user data exposed. [VERIFIED — curl output]

Permission check: `get_users_permissions_check()` calls `$this->check_jwt_authorization()` — requires a JWT token from SiteGround's AI Studio service. [VERIFIED — sg-ai-studio/core/Rest/Users.php:49]

**`/sg-ai-studio/users/1` (GET):**
```json
{
    "code": "rest_forbidden",
    "message": "Authorization header missing.",
    "data": { "status": 401 }
}
```
Returns 401. No user data exposed. [VERIFIED — curl output]

**`/rankmath/v1/an/userPreferences` (GET):**
```json
{
    "code": "rest_no_route",
    "message": "No route was found matching the URL and request method.",
    "data": { "status": 404 }
}
```
Only registered for POST (analytics preferences write). GET not handled. No data exposed. [VERIFIED — curl output]

**`/sg-security/v1/blocked-users` (GET):**
```json
{
    "code": "rest_no_route",
    "message": "No route was found matching the URL and request method.",
    "data": { "status": 404 }
}
```
All sg-security routes use `WP_REST_Server::CREATABLE` (POST only) with `permission_callback => 'check_permissions'` requiring admin caps. GET returns 404. No data exposed. [VERIFIED — curl output; sg-security/core/Rest/Rest.php:70]

**`/sg-security/v1/disable-admin-username`, `/sg-security/v1/logout-users`:** Same — 404 on GET. POST-only with admin permission check. [VERIFIED — curl output]

**`/siteground-optimizer/v1/user-agent-header`:** Name contains "user" but is about HTTP User-Agent caching headers, not WordPress users. Not tested further — not a user-data route. [VERIFIED — route name inspection]

### P1d. register_rest_route calls in mu-plugins and plugins

**mu-plugins:** Zero `register_rest_route` calls. [VERIFIED — `grep -rn 'register_rest_route' mu-plugins/` returned empty]

**sg-ai-studio/core/Rest/Users.php:** Three `register_rest_route` calls (lines 35, 58, 100) registering `/users`, `/users/(?P<id>[\d]+)`, `/users/batch`. All use JWT auth via `check_jwt_authorization()`. [VERIFIED — Users.php:33-100]

No other plugin registers user-data REST routes beyond what appears in the index.

### P1 Answer

**Yes, third-party users routes exist** — specifically `/sg-ai-studio/users` and variants. However, they all return 401 to anonymous requests and require SiteGround JWT authentication. They do not expose user data anonymously. The proposed `rest_endpoints` filter targeting `wp/v2/users` pattern routes will not affect them (different namespace). No action required.

---

## P2 — _embed CONSUMERS

### P2a. Shelter-app source

```
grep -rn '_embed\|_embedded\|embed=true\|"embed"' /home/shelter/shelter-apps/server/src/
```

Zero hits. [VERIFIED — grep returned empty]

The dashboard-push code in `server.ts` calls `/wp/v2/shelter-stories`, `/wp/v2/shelter-events`, `/wp/v2/media`, and custom 4lg/v1 endpoints. None include `_embed` as a query parameter. [VERIFIED — server.ts:484,580,3137,3207,3248,3281,3682,3725,3759,3778 show the fetch URLs, none contain `_embed`]

### P2b. 4lg-theme

```
grep -rn '_embed\|_embedded\|embed=true' 4lg-theme/ --include='*.php' --include='*.js'
```

Zero hits. [VERIFIED — grep returned empty]

### P2c. Other front-end code

No other front-end code on this install calls the WordPress REST API. The theme renders server-side via PHP template functions (`render_featured_animals()`, etc.). No client-side JavaScript REST consumers exist in the theme. [VERIFIED — theme JS files grepped with zero hits]

### P2d. Anonymous _embed test

```
curl -s "https://www.fourlegsgoodnynj.org/wp-json/wp/v2/shelter-stories?per_page=1&_embed=1"
```

Response: standard shelter_story JSON object. No `_embedded` key in response. No `_links.author` key either. [VERIFIED — parsed response: `_links` keys are `['self', 'collection', 'about', 'wp:attachment', 'curies']`]

The shelter_story CPT does not expose an `author` link in its REST response, so `_embed` does not attempt to resolve author data for this post type. Standard `posts` were also tested: the response was an empty array (no published standard posts exist), so `_embed` behavior on posts could not be observed. [VERIFIED — `/wp/v2/posts?per_page=1&_embed=1` returned `[]`]

### P2 Answer

**No, no consumer sends `_embed`.** The dashboard-push code, the theme, and all inspectable front-end code make zero `_embed` requests. The shelter CPTs don't expose `_links.author` in their REST response anyway, so even if someone added `_embed`, author data would not be embedded for the post types this site uses.

---

## C1 — SITEGROUND CACHE × REST API

### C1a. sg-cachepress configuration

Option name pattern: `siteground_optimizer_*`. Found via `wp option list --search='*siteground*'`.

Key cache-relevant options:

| Option | Value | Meaning |
|--------|-------|---------|
| `siteground_optimizer_enable_cache` | `1` | Dynamic (proxy) cache enabled [VERIFIED — wp option list output] |
| `siteground_optimizer_autoflush_cache` | `1` | Auto-flush on content change [VERIFIED] |
| `siteground_optimizer_file_caching` | (not set) | File-based cache not configured [VERIFIED — `wp option get` returns "Does it exist?"] |
| `siteground_optimizer_logged_in_cache` | (not set) | Logged-in user caching not enabled [VERIFIED — `wp option get` returns "Does it exist?"] |
| `siteground_optimizer_enable_memcached` | `0` | Memcached disabled [VERIFIED] |
| `siteground_optimizer_purge_rest_cache` | (not set) | REST cache purge feature not configured [VERIFIED] |
| `siteground_optimizer_excluded_urls` | (not set) | No explicit URL exclusions [VERIFIED] |

### C1b. How sg-cachepress decides cacheability — code path

SiteGround's caching operates at two levels:

**Level 1: Nginx proxy cache (server-level)**

The sg-cachepress plugin signals cacheability to the nginx proxy via the `X-Cache-Enabled` header. Two functions set this header:

1. **`Supercacher_Helper::set_cache_headers()`** — hooks on WordPress's `wp_headers` filter for normal page responses. Sets `X-Cache-Enabled: True` when caching is enabled and URL is not excluded. [VERIFIED — sg-cachepress/core/Supercacher/Supercacher_Helper.php:45-80, hooked at Loader.php (header filter)]

2. **`Supercacher_Helper::set_rest_cache_headers()`** — hooks on `rest_post_dispatch` filter for REST responses. **This function only sets `X-Cache-Enabled: False`** when caching is disabled or URL is excluded. It **never sets `X-Cache-Enabled: True`** for REST responses. [VERIFIED — sg-cachepress/core/Supercacher/Supercacher_Helper.php:18-38, hooked at Loader.php:677]

The critical code in `set_rest_cache_headers()`:
```php
// Supercacher_Helper.php lines 18-38
public function set_rest_cache_headers( $result ) {
    $is_cache_enabled = (int) get_option( 'siteground_optimizer_enable_cache', 0 );
    $url = ...;
    if (
        0 === $is_cache_enabled ||
        self::is_url_excluded( trailingslashit( $url ) ) ||
        self::is_query_param_excluded( $url )
    ) {
        $result->header( 'X-Cache-Enabled', 'False' );
    }
    return $result;
}
```

When cache IS enabled (value = 1) and the URL is not excluded, the function simply returns `$result` without setting any `X-Cache-Enabled` header. The header is absent, not `True`.

Compare with `set_cache_headers()` for normal pages:
```php
// Supercacher_Helper.php line 78
$headers['X-Cache-Enabled'] = 'True';
```

Normal pages explicitly get `X-Cache-Enabled: True`. REST responses do not.

**Level 2: File-based cache (plugin-level)**

The file cacher (`File_Cacher_Trait::is_cacheable()`) has an additional gate:

```php
// File_Cacher_Trait.php, is_content_type_not_supported():
if (
    empty( $_SERVER['HTTP_ACCEPT'] ) ||
    false === strpos( $_SERVER['HTTP_ACCEPT'], 'text/html' )
) {
    return true;  // NOT supported → not cacheable
}
```

REST API requests send `Accept: application/json`, not `text/html`, so `is_content_type_not_supported()` returns `true` and the file cacher bails. [VERIFIED — File_Cacher_Trait.php:108-115]

Additionally, the file cacher bypasses when `wordpress_logged_in_` cookie is present (File_Cacher_Trait.php:106, `has_bypass_cookies()`) — unless `logged_in_cache` is enabled, which it is not on this install. [VERIFIED — File_Cacher.php:103-108, option not set]

### C1c. Cache headers — REST shelter-stories (two requests, 3s apart)

**Request 1:**
```
HTTP/2 200
server: nginx
date: Fri, 17 Jul 2026 00:13:42 GMT
content-type: application/json; charset=UTF-8
vary: Accept-Encoding
x-robots-tag: noindex
access-control-expose-headers: X-WP-Total, X-WP-TotalPages, Link
access-control-allow-headers: Authorization, X-WP-Nonce, Content-Disposition, Content-MD5, Content-Type
x-wp-total: 10
x-wp-totalpages: 10
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
allow: GET
x-httpd: 1
host-header: 8441280b0c35cbc1147f8ba998a563a7
x-proxy-cache-info: DT:1
```

**Request 2 (3s later):**
```
HTTP/2 200
server: nginx
date: Fri, 17 Jul 2026 00:13:46 GMT
content-type: application/json; charset=UTF-8
[identical headers]
x-proxy-cache-info: DT:1
```

No `x-cache-enabled`, no `x-proxy-cache: HIT`, no `age` header on either request. Both show `x-proxy-cache-info: DT:1`. [VERIFIED — curl output]

### C1d. Cache headers — REST /wp/v2/users (two requests)

**Request 1:**
```
HTTP/2 200
server: nginx
date: Fri, 17 Jul 2026 00:13:51 GMT
content-type: application/json; charset=UTF-8
vary: Accept-Encoding
x-robots-tag: noindex
[REST headers]
x-httpd: 1
host-header: 8441280b0c35cbc1147f8ba998a563a7
x-proxy-cache-info: DT:1
```

**Request 2 (3s later):**
```
HTTP/2 200
date: Fri, 17 Jul 2026 00:13:54 GMT
[identical headers]
x-proxy-cache-info: DT:1
```

Same pattern: no `x-cache-enabled`, no cache HIT, `DT:1`. [VERIFIED — curl output]

### C1e. Cache headers — normal page (for comparison)

**Request 1:**
```
HTTP/2 200
server: nginx
date: Fri, 17 Jul 2026 00:13:54 GMT
content-type: text/html; charset=UTF-8
vary: Accept-Encoding
x-cache-enabled: True
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
link: <https://www.fourlegsgoodnynj.org/wp-json/>; rel="https://api.w.org/"...
set-cookie: pll_language=en; ...
x-httpd: 1
host-header: 8441280b0c35cbc1147f8ba998a563a7
x-proxy-cache-info: DT:1
```

**Request 2:**
```
HTTP/2 200
date: Fri, 17 Jul 2026 00:13:57 GMT
[identical headers including x-cache-enabled: True]
x-proxy-cache-info: DT:1
```

Normal pages have `x-cache-enabled: True`. REST responses do not have this header at all. Both show `x-proxy-cache-info: DT:1` — the `DT:1` value appears on all responses from this host, including normal pages. No response on this host shows `x-proxy-cache: HIT` or an `age` header. [VERIFIED — curl output]

The `set-cookie: pll_language=...` header on normal page requests would also cause most proxy caches to bypass caching. [INFERRED — standard HTTP caching behavior, not confirmed from SiteGround nginx config]

### C1f. .htaccess and SG config files

`.htaccess` contains no REST or wp-json cache rules. Contents are: XMLRPC deny block, standard WordPress rewrite rules, and an SGO `Header unset Vary` directive. [VERIFIED — `grep -n 'wp-json\|rest\|json\|api' .htaccess` returned empty; full .htaccess inspected in round 2]

No SiteGround config files (`.sg-*`, `.cache-config*`) found under `/home/customer/`. [VERIFIED — `find` returned empty]

### C1 Answer

**REST responses are not cached by SiteGround's proxy.** The evidence:

1. The `X-Cache-Enabled` header — which the nginx proxy uses to decide cacheability — is never set to `True` for REST responses. The `set_rest_cache_headers()` function only sets it to `False` for excluded URLs; when caching is enabled (as it is), it returns without setting the header at all. Normal pages get `X-Cache-Enabled: True` explicitly. [VERIFIED — Supercacher_Helper.php:18-38 vs 78]

2. No REST response showed cache HIT indicators (`x-proxy-cache: HIT`, `age` header). [VERIFIED — curl output for /users and /shelter-stories]

3. The file-based cacher rejects REST requests because `is_content_type_not_supported()` checks for `text/html` in the `Accept` header. [VERIFIED — File_Cacher_Trait.php:108-115]

4. The `siteground_optimizer_logged_in_cache` option is not set (defaults to disabled), so even for the file cacher, logged-in users' `wordpress_logged_in_` cookie triggers a bypass. [VERIFIED — option does not exist in database]

**The cache-varies-on-auth question is moot** because REST responses are not cached at all. The proposed fix — which makes `/wp/v2/users` responses depend on authentication state — will not create cache-poisoning or cache-confusion issues because there is no REST cache layer to confuse.

**Caveat:** The nginx proxy configuration itself is not readable from the SSH account. The conclusion that REST is uncached is based on (a) the absence of `X-Cache-Enabled: True` in REST responses, (b) `set_rest_cache_headers()` never setting it, and (c) observed response headers showing no cache hits. If SiteGround changes their proxy behavior to cache responses WITHOUT the `X-Cache-Enabled` header, this analysis would need revisiting. [INFERRED — nginx config not directly inspectable]

---

## Bottom-line Answers

**P1: Yes** — third-party users routes exist (`/sg-ai-studio/users` and variants), but all return 401 to anonymous requests. No anonymous user-data leak beyond the core `/wp/v2/users` routes.

**P2: No** — no consumer sends `_embed`. Zero hits in shelter-app source, theme PHP, and theme JS.

**C1: No, REST is not cached.** `X-Cache-Enabled` header is never set to `True` for REST responses (Supercacher_Helper.php:18-38). File cacher rejects non-`text/html` content types (File_Cacher_Trait.php:108-115). Varies-on-auth is moot (not cached). Caveat: nginx config is not directly inspectable; conclusion is based on plugin source and observed headers.
