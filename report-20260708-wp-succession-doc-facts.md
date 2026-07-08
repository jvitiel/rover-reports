# WordPress Succession-Doc Facts — 2026-07-08

## Q1 — TOPOLOGY

### Document Roots

```
~/www/
├── fourlegsgoodnynj.org -> johnv80.sg-host.com   (SYMLINK)
└── johnv80.sg-host.com/
    └── public_html/   (the ONE WordPress install)
```

`fourlegsgoodnynj.org` is a **symlink** to `johnv80.sg-host.com`. Same files, same directory. [VERIFIED — `ls -la ~/www/` shows `fourlegsgoodnynj.org -> johnv80.sg-host.com`]

### WordPress URLs

```
siteurl = https://www.fourlegsgoodnynj.org
home    = https://www.fourlegsgoodnynj.org
```

[VERIFIED — `wp option get siteurl`, `wp option get home`]

### Database

- **ONE database**: `db6poxrgeh6bkd`
- **Table prefix**: `cqu_`
- ONE install on two hostnames — `johnv80.sg-host.com` is the SiteGround staging hostname; `fourlegsgoodnynj.org` is the production domain. They share everything.

[VERIFIED — `wp-config.php` grep]

**Conclusion: "staging" (johnv80) and prod (fourlegsgoodnynj.org) are the SAME files and the SAME database served under two hostnames.** There is no isolation. [VERIFIED]

---

## Q2 — THEME

### Active Theme

| Field | Value |
|-------|-------|
| Name | `4lg-theme` |
| Version | `1.0.0` |
| Child theme | **No** (no `Template:` header in style.css) |
| Path | `wp-content/themes/4lg-theme/` |

[VERIFIED — `wp theme list --status=active`]

### Template Files Present

| File | Purpose |
|------|---------|
| `404.php` | Custom "Page Not Found" with branded nav + search |
| `front-page.php` | Homepage template |
| `header.php` | Site header + nav |
| `footer.php` | Site footer (13,669 lines — contains substantial inline JS/CSS) |
| `functions.php` | Theme functions (1,865 lines) |
| `index.php` | Fallback template |
| `page.php` | Generic page template |
| `page-events.php` | Events listing page (18,804 lines — heavy inline JS/CSS) |
| `page-stories.php` | Stories listing page (9,137 lines) |
| `single.php` | Single post view |
| `singular.php` | Singular fallback |

Also present: `editor-style.css`, `img/`, `js/`, `languages/`, `patterns/`, `_archived-hardcoded-templates/`, 8 `functions.php.bak-*` backups. [VERIFIED — `ls *.php`]

### functions.php — 1,865 lines, 23 `flg_*` functions

| Line | Function | Purpose |
|------|----------|---------|
| 16 | `flg_theme_setup` | Theme support registration (title tag, post thumbnails, menus, HTML5, editor styles) |
| 59 | `flg_widgets_init` | Sidebar/widget area registration |
| 111 | `flg_enqueue_scripts` | Enqueue theme CSS/JS |
| 152 | `flg_get_current_page_slug` | Helper: get current page slug from query |
| 160 | `flg_is_current_page` | Helper: check if current page matches slug |
| 176 | `flg_register_story_meta` | Register 12 story meta fields for REST |
| 208 | `flg_register_stories_endpoints` | Register story REST routes (clear-cache, set-featured) |
| 238 | `flg_delete_lang_transient` | Delete both EN+ES transient variants |
| 256 | `flg_clear_stories_cache` | Clear stories transients + SG cache |
| 281 | `flg_set_story_featured` | Toggle story homepage feature |
| 417 | `flg_register_shelter_story_cpt` | Register `shelter_story` CPT |
| 1082 | `flg_register_shelter_event_cpt` | Register `shelter_event` CPT |
| 1119 | `flg_register_event_meta` | Register 11 event meta fields for REST |
| 1150 | `flg_register_events_endpoints` | Register event REST routes (push, clear-cache) |
| 1177 | `flg_handle_event_push` | Handle `POST /4lg/v1/push-event` — create/update events |
| 1284 | `flg_clear_events_cache` | Clear events transients + SG cache |
| 1477 | `flg_nav_url` | Polylang-aware navigation URL helper |
| 1510 | `flg_get_lang_toggle_data` | Language toggle data (EN↔ES) |
| 1548 | `flg_create_and_link_es_event` | Create + Polylang-link ES event translation |
| 1624 | `flg_handle_link_es_translation` | Dispatch route: event or story → appropriate ES handler |
| 1667 | `flg_create_and_link_es_story` | Create + Polylang-link ES story translation |
| 1762 | `flg_after_insert_shelter_story` | Hook: auto-create ES story on REST create |
| 1791 | `flg_section_slug_redirects` | 51 exact-match + 2 catch-all redirect rules for old/Wix URLs |

[VERIFIED — `grep -n '^function flg_'`]

---

## Q3 — CUSTOM REST ENDPOINTS

7 routes under `4lg/v1`:

| Route | Method | Permission | Callback | What it does |
|-------|--------|------------|----------|-------------|
| `/clear-stories-cache` | POST | `edit_posts` | `flg_clear_stories_cache` | Deletes `flg_featured_stories_*` + `flg_recent_stories_*` transients; purges SG cache |
| `/set-story-featured` | POST | `edit_posts` | `flg_set_story_featured` | Sets/clears `featured_on_homepage` + `featured_at` meta on a story; clears transients |
| `/test-animals-api` | GET | `edit_posts` | (inline) | Diagnostic: fetches `http://66.228.37.38/api/featured-slots` from VPS, returns status + preview |
| `/clear-animals-cache` | POST | `edit_posts` | (inline) | Deletes `4lg_featured_slots_en`, `_es`, `featured_animals_data` transients; purges SG cache |
| `/push-event` | POST | `edit_posts` | `flg_handle_event_push` | Creates/updates `shelter_event` posts with meta; on CREATE auto-links ES translation if `_es` params present; clears caches |
| `/clear-events-cache` | POST | `edit_posts` | `flg_clear_events_cache` | Deletes `flg_upcoming_events_*` transients; purges SG cache |
| `/link-es-translation` | POST | `edit_posts` | `flg_handle_link_es_translation` | Dispatch: `shelter_event` → `flg_create_and_link_es_event`; `shelter_story` → `flg_create_and_link_es_story`; else 400 |

All 7 require `current_user_can('edit_posts')`. No public/anonymous routes. [VERIFIED — `grep -A5 'register_rest_route'`]

---

## Q4 — CPTs + TAXONOMIES

### Custom Post Types

| CPT | rest_base | public | show_in_rest | capability_type | rewrite slug |
|-----|-----------|--------|-------------|----------------|-------------|
| `shelter_story` | `shelter-stories` | true | true | `post` | `stories` |
| `shelter_event` | `shelter-events` | true | true | `post` | `event` |

`shelter_animal` does **NOT exist** as a CPT. Animals are fetched live from the VPS API (`http://66.228.37.38/api/featured-slots`) and rendered via `render_featured_animals()` PHP function using transient caching. Animals are NOT stored in WordPress at all. [VERIFIED — `wp post-type get shelter_animal` → "doesn't exist"; `test-animals-api` route fetches from VPS]

### Taxonomies

No custom taxonomies registered in the theme (`grep register_taxonomy` → zero results). [VERIFIED]

Polylang adds its own:

| Taxonomy | Public | show_in_rest |
|----------|--------|-------------|
| `language` | (hidden) | — |
| `post_translations` | (hidden) | — |

Both applied to `shelter_story` and `shelter_event` (per Polylang `post_types` config). [VERIFIED]

---

## Q5 — POLYLANG + PLUGINS

### Active Plugins

| Plugin | Version |
|--------|---------|
| `polylang` | 3.8.4 |
| `seo-by-rank-math` | 1.0.270 |
| `sg-security` | 1.6.2 |
| `sg-cachepress` | 7.7.11 |
| `sg-ai-studio` | 1.2.5 |
| `wordpress-starter` | 3.4.4 |

[VERIFIED — `wp plugin list --status=active`]

### Polylang Details

- **Edition:** Standard (free) — plugin slug is `polylang`, not `polylang-pro` [VERIFIED]
- **Languages:** English (`en`) + Español (`es`) [VERIFIED — DB query `cqu_terms` → language taxonomy]
- **Default language:** `en` [VERIFIED — `wp option get polylang` → `default_lang: en`]
- **Translatable post types:** `shelter_story`, `shelter_event` [VERIFIED — `post_types: ['shelter_story', 'shelter_event']`]
- **Translatable taxonomies:** none configured [VERIFIED — `taxonomies: []`]
- `pll` WP-CLI subcommand: NOT available (Polylang standard doesn't ship it — Pro only) [VERIFIED — `wp pll lang list` → "pll command not available"]

### Notes

- **Rank Math:** active, v1.0.270 — handles SEO meta, sitemaps
- **SG Security:** active, v1.6.2 — SiteGround security hardening
- **SG CachePress:** active, v7.7.11 — `sg_cachepress_purge_everything()` and `sg_cachepress_purge_cache()` called by theme cache-clear functions
- **No Constant Contact plugin** [VERIFIED — not in active plugin list]

---

## Q6 — THE TWO SEAMS

### Push Pipeline (dashboard → WP)

#### Events: `POST 4lg/v1/push-event` → `flg_handle_event_push`

1. Receives title + content + meta from dashboard
2. Deduplication: checks for existing `shelter_event` with same title + `event_date`
3. Creates or updates post via `wp_insert_post` / `wp_update_post`
4. Writes 11 meta fields via `update_post_meta`:

**Event meta keys:** `event_date`, `event_time_start`, `event_time_end`, `event_location`, `event_location_name`, `event_type`, `photo_url`, `link_url`, `link_text`, `contact_email`, `contact_phone` [VERIFIED]

5. On CREATE only: if `title_es` or `content_es` present, calls `flg_create_and_link_es_event`
6. Clears transients + SG cache
7. Returns `{ success, post_id, action, es_post_id?, es_status? }`

#### Stories: Standard `wp/v2/shelter-stories` REST + `rest_after_insert_shelter_story` hook

1. Dashboard POSTs to `wp/v2/shelter-stories` (standard WP REST)
2. `flg_after_insert_shelter_story` hook fires on CREATE only
3. Hook reads `title_es`, `content_es`, `link_text_es` from `$request`, calls `flg_create_and_link_es_story`
4. `es_post_id` returned via registered REST field (`register_rest_field('shelter_story', 'es_post_id')` — reads `_es_post_id` meta)

**Story meta keys:** `story_date`, `story_type`, `animal_name`, `animal_species`, `animal_breed`, `photo_1_url`, `photo_2_url`, `photo_layout`, `link_url`, `link_text`, `featured_on_homepage`, `featured_at` [VERIFIED — `flg_register_story_meta` at line 176]

### Translation Pipeline (EN → ES)

#### `flg_create_and_link_es_event` (line 1548)

- Validates EN post exists + is `shelter_event` + language is EN
- Idempotent: `pll_get_post($en_post_id, 'es')` → if exists, returns `adopted`
- **Orphan-guard keys on `event_date`**: checks for unlinked ES events with same `event_date` → returns `orphan_conflict` if found
- Creates ES post via `wp_insert_post` with translated title/content
- Copies all 11 meta fields verbatim; overwrites `event_location_name` and `link_text` with ES versions if provided
- Links via `pll_set_post_language` + `pll_save_post_translations`
- Returns `{ status: 'created', es_post_id }` or `{ status: 'adopted' }` or `{ status: 'orphan_conflict' }`

[VERIFIED]

#### `flg_create_and_link_es_story` (line 1667)

- Validates EN post exists + is `shelter_story` + language is EN
- Idempotent: `pll_get_post` check → if exists, stores `_es_post_id` meta, returns `adopted`
- **Orphan-guard keys on `_es_source_en_id` meta** (NOT title, NOT story_date): checks for unlinked ES stories with `_es_source_en_id = $en_post_id` → returns `orphan_conflict` if found
- Creates ES post with translated title/content
- Copies 11 verbatim meta fields + translates `link_text`
- Stores `_es_source_en_id` meta on the new ES post (for orphan-guard)
- Stores `_es_post_id` meta on the EN post (for REST field readback)
- Links via `pll_set_post_language` + `pll_save_post_translations`
- Clears `flg_featured_stories` transient

[VERIFIED]

#### `flg_handle_link_es_translation` (line 1624) — Dispatch

- Reads `post_type` from JSON body (default: `shelter_event`)
- `shelter_event` → `flg_create_and_link_es_event`
- `shelter_story` → `flg_create_and_link_es_story`
- else → 400

[VERIFIED]

#### ES Return Path

- **Events:** `es_post_id` returned in `push-event` response body (inline in `flg_handle_event_push` return) [VERIFIED]
- **Stories:** `es_post_id` returned as registered REST field on `shelter_story` (reads `_es_post_id` meta via `register_rest_field` at line 1749) [VERIFIED]

---

## Q7 — PUBLIC PAGES

```
ID   post_title                       post_name                post_status
391  Declaración de Accesibilidad     accesibilidad            publish
385  Accessibility Statement          accessibility            publish
390  Términos de Servicio             terminos-de-servicio     publish
384  Terms of Service                 terms-of-service         publish
389  Política de Privacidad           politica-de-privacidad   publish
383  Privacy Policy                   privacy-policy           publish
335  Home - Español                   home-espanol             publish
14   Home                             home                     publish
341  Eventos                          eventos                  publish
13   Events                           events                   publish
12   Happy Tails                      stories                  publish
343  Historias Felices                 historias-felices         publish
349  Programa TNVR                    programa-tnvr            publish
11   TNVR Program                     tnvr                     publish
347  Refugio Animal RG CARES          refugio-animal-rg-cares  publish
10   RG CARES Animal Shelter          rg-cares                 publish
337  Acerca de Four Legs Good         acerca-de-four-legs-good publish
9    About Four Legs Good             about-us                 publish
345  Cómo Ayudar                      como-ayudar              publish
8    How to Help                      how-to-help              publish
339  Adopta una Mascota               adopta-una-mascota       publish
7    Adopt a Pet                      adopt                    publish
3    Privacy Policy                   privacy-policy-old-draft draft
```

[VERIFIED — `wp post list --post_type=page`]

### Key Pages

| EN Page | EN Slug | ES Page | ES Slug | Status |
|---------|---------|---------|---------|--------|
| Home | `home` (ID 14) | Home - Español | `home-espanol` (ID 335) | ✅ Live |
| Adopt a Pet | `adopt` (ID 7) | Adopta una Mascota | `adopta-una-mascota` (ID 339) | ✅ Live |
| How to Help | `how-to-help` (ID 8) | Cómo Ayudar | `como-ayudar` (ID 345) | ✅ Live |
| About Four Legs Good | `about-us` (ID 9) | Acerca de Four Legs Good | `acerca-de-four-legs-good` (ID 337) | ✅ Live |
| RG CARES Animal Shelter | `rg-cares` (ID 10) | Refugio Animal RG CARES | `refugio-animal-rg-cares` (ID 347) | ✅ Live (KEPT) |
| TNVR Program | `tnvr` (ID 11) | Programa TNVR | `programa-tnvr` (ID 349) | ✅ Live |
| Happy Tails | `stories` (ID 12) | Historias Felices | `historias-felices` (ID 343) | ✅ Live |
| Events | `events` (ID 13) | Eventos | `eventos` (ID 341) | ✅ Live |

Plus 3 legal pages (Privacy, Terms, Accessibility) each with EN+ES pairs. One draft: `privacy-policy-old-draft` (ID 3).

**Note:** RG Cares Portal page (ID 294) was trashed on 2026-07-07 and does NOT appear in the page list. The live `/rg-cares/` page (ID 10) is the facility info page and remains published. [VERIFIED]

### Adoption/Search Button Target

[UNCERTAIN — the Adopt page (ID 7, slug `adopt`) exists, but determining where the CTA button on the homepage points would require inspecting the Gutenberg block content of the Home page (ID 14), which was not done in this pass. The `front-page.php` template renders Gutenberg content via `the_content()` — the link target is in the page content, not the template.]
