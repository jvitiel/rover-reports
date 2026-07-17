# Adoption Form Source Location — 2026-07-17

## 1 — WHERE IS THE STRING?

### 1a. Filesystem search

Command:
```
grep -rn 'adoptionForm' /home/customer/www/johnv80.sg-host.com/public_html \
  --include='*.php' --include='*.js' --include='*.html' --include='*.twig' 2>/dev/null
```

**Result: zero hits.** Exit code 1 (no matches). The string `adoptionForm` does not appear in any PHP, JS, HTML, or Twig file in the WordPress install.

[VERIFIED — ran via SSH, exit code 1, no output]

### 1b. Database search — posts table

Table prefix confirmed from wp-config.php: `$table_prefix = 'cqu_';` [VERIFIED]

Command:
```sql
SELECT ID, post_title, post_name, post_type, post_status, post_parent
FROM cqu_posts WHERE post_content LIKE '%adoptionForm%'
```

Result (21 rows):

| ID | post_title | post_name | post_type | post_status | post_parent |
|----|-----------|-----------|-----------|-------------|-------------|
| 7 | Adopt a Pet | adopt | page | publish | 0 |
| 339 | Adopta una Mascota | adopta-una-mascota | page | publish | 0 |
| 206 | Adopt a Pet | 7-revision-v1 | revision | inherit | 7 |
| 211 | Adopt a Pet | 7-revision-v1 | revision | inherit | 7 |
| 214 | Adopt a Pet | 7-revision-v1 | revision | inherit | 7 |
| 215 | Adopt a Pet | 7-revision-v1 | revision | inherit | 7 |
| 295 | Adopt a Pet | 7-autosave-v1 | revision | inherit | 7 |
| 407 | Adopt a Pet | 7-revision-v1 | revision | inherit | 7 |
| 409 | Adopt a Pet | 7-revision-v1 | revision | inherit | 7 |
| 441 | Adopt a Pet | 7-revision-v1 | revision | inherit | 7 |
| 443 | Adopt a Pet | 7-revision-v1 | revision | inherit | 7 |
| 492 | Adopt a Pet | 7-revision-v1 | revision | inherit | 7 |
| 372 | Adopta una Mascota | 339-revision-v1 | revision | inherit | 339 |
| 376 | Adopta una Mascota | 339-revision-v1 | revision | inherit | 339 |
| 377 | Adopta una Mascota | 339-revision-v1 | revision | inherit | 339 |
| 378 | Adopta una Mascota | 339-revision-v1 | revision | inherit | 339 |
| 408 | Adopta una Mascota | 339-revision-v1 | revision | inherit | 339 |
| 410 | Adopta una Mascota | 339-revision-v1 | revision | inherit | 339 |
| 442 | Adopta una Mascota | 339-revision-v1 | revision | inherit | 339 |
| 444 | Adopta una Mascota | 339-revision-v1 | revision | inherit | 339 |
| 493 | Adopta una Mascota | 339-revision-v1 | revision | inherit | 339 |

**2 published pages** contain the form: post 7 (EN) and post 339 (ES). The remaining 19 rows are revisions of those two posts.

[VERIFIED — wp db query output]

### 1c. Postmeta search

Command:
```sql
SELECT post_id, meta_key, LEFT(meta_value, 120)
FROM cqu_postmeta WHERE meta_value LIKE '%adoptionForm%'
```

**Result: zero rows.** The string does not appear in any postmeta field.

[VERIFIED — wp db query, no output]

### 1d. Reusable blocks search

Command:
```
wp post list --post_type=wp_block --fields=ID,post_title,post_status --format=table
```

**Result: zero reusable blocks exist.** The table header was returned with no data rows. There are no `wp_block` posts in this install at all.

[VERIFIED — wp post list output]

### 1e. Source determination

The form lives in **post_content** of two WordPress pages:
- **Post ID 7** ("Adopt a Pet", slug `adopt`, EN)
- **Post ID 339** ("Adopta una Mascota", slug `adopta-una-mascota`, ES)

Evidence:
- Zero filesystem hits means it is not in any theme file, plugin file, or static asset.
- Zero postmeta hits means it is not in a page-builder custom field.
- Zero reusable blocks means it is not in a synced pattern.
- The database query returns exactly 2 published pages containing the string, plus their revisions.

These are **two independent copies** of the form — Polylang does not sync `post_content` (the Polylang `sync` setting includes `post_meta`, `post_date`, `post_parent`, `_wp_page_template`, `menu_order`, `_thumbnail_id` — but NOT `post_content`). Any edit must be applied to both posts separately.

[VERIFIED — filesystem grep exit code 1; postmeta query empty; wp_block list empty; posts query returns IDs 7 and 339 as the only published pages; Polylang sync setting from `cqu_options` does not include post_content]

---

## 2 — HOW MANY COPIES? (the Polylang question)

### 2a. All pages

```
ID   post_title                       post_name               post_status
391  Declaración de Accesibilidad     accesibilidad           publish
385  Accessibility Statement          accessibility           publish
390  Términos de Servicio             terminos-de-servicio    publish
384  Terms of Service                 terms-of-service        publish
389  Política de Privacidad           politica-de-privacidad  publish
383  Privacy Policy                   privacy-policy          publish
335  Home - Español                   home-espanol            publish
14   Home                             home                    publish
341  Eventos                          eventos                 publish
13   Events                           events                  publish
12   Happy Tails                      stories                 publish
343  Historias Felices                 historias-felices        publish
349  Programa TNVR                    programa-tnvr           publish
11   TNVR Program                     tnvr                    publish
347  Refugio Animal RG CARES          refugio-animal-rg-cares publish
10   RG CARES Animal Shelter          rg-cares                publish
337  Acerca de Four Legs Good         acerca-de-four-legs-good publish
9    About Four Legs Good             about-us                publish
345  Cómo Ayudar                      como-ayudar             publish
8    How to Help                      how-to-help             publish
339  Adopta una Mascota               adopta-una-mascota      publish
7    Adopt a Pet                      adopt                   publish
3    Privacy Policy                   privacy-policy-old-draft draft
```

[VERIFIED — `wp post list --post_type=page` output]

### 2b. Post IDs backing each URL

- `/adopt/` is served by **post ID 7** (slug: `adopt`, language: EN)
- `/es/adopta-una-mascota/` is served by **post ID 339** (slug: `adopta-una-mascota`, language: ES)

They are **different post IDs**.

Evidence from Polylang taxonomy:

```
object_id  slug                   taxonomy
7          en                     language
7          pll_6a132557e66c7      post_translations
339        es                     language
339        pll_6a132557e66c7      post_translations
```

The serialized translation group description for `pll_6a132557e66c7`:
```
a:2:{s:2:"es";i:339;s:2:"en";i:7;}
```

This confirms: post 7 is the EN translation, post 339 is the ES translation, and they are linked as a translation pair.

[VERIFIED — `cqu_term_relationships` query and `cqu_term_taxonomy` description field]

### 2c. Correction to prior report

The previous report stated: "The URL `https://www.fourlegsgoodnynj.org/es/adopt/` serves the same page content."

This is misleading. What actually happens:

```
$ curl -sI 'https://www.fourlegsgoodnynj.org/es/adopt/'

HTTP/2 301
location: https://www.fourlegsgoodnynj.org/adopt/
x-redirect-by: Polylang
set-cookie: pll_language=es; ...
```

`/es/adopt/` returns a **301 redirect to `/adopt/`** (issued by Polylang, with `x-redirect-by: Polylang` header). It sets a `pll_language=es` cookie but redirects to the EN page. The browser follows the redirect and loads post 7. That is why the content appeared identical — the browser was showing post 7 in both cases.

The actual Spanish adoption page URL is: **`https://www.fourlegsgoodnynj.org/es/adopta-una-mascota/`** (HTTP 200, serves post 339, confirmed by `link` header containing `wp/v2/pages/339`).

[VERIFIED — HTTP response headers from curl -sI for both URLs]

### 2d. Both IDs contain the form

From section 1b, the query `WHERE post_content LIKE '%adoptionForm%'` returns both post 7 and post 339 as published pages. Both posts contain independent copies of the form and both need the edit.

[VERIFIED — section 1b query results]

### 2e. /es/adoptar/

```
$ curl -sI 'https://www.fourlegsgoodnynj.org/es/adoptar/'
HTTP/2 404
```

No page with slug `adoptar` exists in the database (query `WHERE post_name = 'adoptar' AND post_type = 'page'` returned zero rows). The URL is a 404.

[VERIFIED — HTTP 404 response + database query returning empty]

---

## 3 — THE RESTORE PATH

### 3a. Revisions

**Post 7 (EN)** — 29 revisions:

| ID | post_date |
|----|-----------|
| 492 | 2026-07-14 13:26:15 |
| 443 | 2026-07-06 17:20:32 |
| 441 | 2026-07-06 17:00:10 |
| 409 | 2026-06-20 21:15:52 |
| 407 | 2026-06-17 22:42:57 |
| 295 | 2026-03-31 19:00:50 |
| 215 | 2026-03-15 16:09:37 |
| 214 | 2026-03-15 15:37:58 |
| 211 | 2026-03-15 15:23:28 |
| 206 | 2026-03-15 14:38:47 |
| (19 more, earliest 2026-03-14 15:03:06) | |

Most recent revision: **ID 492, 2026-07-14 13:26:15 UTC**

**Post 339 (ES)** — 11 revisions:

| ID | post_date |
|----|-----------|
| 493 | 2026-07-14 13:26:23 |
| 444 | 2026-07-06 17:21:33 |
| 442 | 2026-07-06 17:07:45 |
| 410 | 2026-06-20 21:15:58 |
| 408 | 2026-06-17 22:43:00 |
| 378 | 2026-05-25 21:41:38 |
| 377 | 2026-05-25 21:19:43 |
| 376 | 2026-05-25 21:19:08 |
| 372 | 2026-05-25 20:19:38 |
| 368 | 2026-05-24 19:44:44 |
| 340 | 2026-05-24 16:20:38 |

Most recent revision: **ID 493, 2026-07-14 13:26:23 UTC**

[VERIFIED — `wp post list --post_type=revision --post_parent=<ID>` output]

### 3b. Revisions enabled?

`WP_POST_REVISIONS` is **not set** in wp-config.php or functions.php (grep returned exit code 1, no matches). WordPress default is unlimited revisions — they are enabled.

Restore path: any edit to either post will create a new revision automatically. The pre-edit state can be restored via the WordPress revision UI or `wp post update <ID> <revision_content>`.

[VERIFIED — grep of wp-config.php and functions.php for WP_POST_REVISIONS returned no matches]

### 3c. Theme file path (N/A)

The form does not live in a theme file (section 1a: zero filesystem hits). However, for reference, the archived template `_archived-hardcoded-templates/page-adopt.php` exists but does NOT contain `adoptionForm` — it is a static informational page with no form.

---

## 4 — THE EXACT STRING TO BE EDITED

### 4a. Opening form tag from post_content

**Post 7 (EN)** — `wp post get 7 --field=content | grep -n 'adoptionForm'`:
```
750:    <form id="adoptionForm">
1756:      const form = document.getElementById('adoptionForm');
```

Context (lines 748–752):
```
    
    <!-- Application Form -->
    <form id="adoptionForm">
      <!-- Section 1: Your Information -->
      <div class="form-section">
```

**Post 339 (ES)** — `wp post get 339 --field=content | grep -n 'adoptionForm'`:
```
783:    <form id="adoptionForm">
1789:      const form = document.getElementById('adoptionForm');
```

Context (lines 781–785):
```
    
    <!-- Application Form -->
    <form id="adoptionForm">
      <!-- Section 1: Your Information -->
      <div class="form-section">
```

[VERIFIED — `wp post get <ID> --field=content` piped through grep and sed]

### 4b. Occurrences of `<form id="adoptionForm"` per post

- Post 7: **1 occurrence** (line 750)
- Post 339: **1 occurrence** (line 783)

The second `adoptionForm` hit in each post (lines 1756/1789) is the JS `getElementById` call, not a `<form` tag. The `grep -c '<form id="adoptionForm"'` command returned `1` for both posts.

[VERIFIED — `grep -c` output]

### 4c. Contact form tag (convention reference)

The contact form `<form id="contact-form">` is NOT in the post_content of either adopt page. It lives in the theme file:

```
/home/customer/www/johnv80.sg-host.com/public_html/wp-content/themes/4lg-theme/footer.php:87:
                <form id="contact-form" class="contact-form" novalidate>
```

This is the existing convention: the contact form already carries the `novalidate` attribute.

[VERIFIED — `grep -n` of footer.php, and confirmed absent from post_content grep]

### 4d. Post content byte lengths (pre-edit baseline)

- **Post 7 (EN): 76,576 bytes**
- **Post 339 (ES): 79,919 bytes**

```sql
SELECT LENGTH(post_content) FROM cqu_posts WHERE ID = 7   → 76576
SELECT LENGTH(post_content) FROM cqu_posts WHERE ID = 339 → 79919
```

Post 339 is 3,343 bytes larger than post 7, consistent with Spanish translations being longer than English text.

[VERIFIED — `wp db query` LENGTH() output]

---

1e: form source lives in: post_content (two independent copies, post IDs 7 and 339)
2b: /adopt/ post ID = 7; /es/adopt/ post ID = N/A (301 redirects to /adopt/); /es/adopta-una-mascota/ post ID = 339; same post: no
2d: number of posts containing the form: 2, IDs: 7, 339
3a: revisions available for each adopt post: yes, post 7 = 29 revisions (latest ID 492), post 339 = 11 revisions (latest ID 493)
4b: occurrences of '<form id="adoptionForm"' per post: 1 each
