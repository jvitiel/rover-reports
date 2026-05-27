# Report: Rank Math SEO Installation and Configuration

**Date:** 2026-05-27 16:04 ET
**Scope:** Website 4 — install Rank Math Free, configure via WP-CLI, disable staging indexing.

---

## Installation

- **Plugin:** seo-by-rank-math (Rank Math SEO – AI SEO Tools to Dominate SEO Rankings)
- **Version:** 1.0.270 [VERIFIED — `wp plugin list`]
- **Status:** Active [VERIFIED]
- **Setup wizard:** Skipped via `rank_math_wizard_completed=1` and `rank_math_registration_skip=1`

## Configuration Applied

### Titles & Organization Schema (`rank-math-options-titles`)

| Setting | Value |
|---------|-------|
| knowledgegraph_type | Organization |
| knowledgegraph_name | Four Legs Good, Inc. |
| website_name | Four Legs Good, Inc. |
| knowledgegraph_email | info@fourlegsgoodnynj.org |
| local_address | PO Box 103 |
| local_address_locality | Pomona |
| local_address_region | NY |
| local_address_postalcode | 10970 |
| local_address_country | US |
| title_separator | - (default) |
| homepage_title | %sitename% %page% %sep% %sitedesc% (default) |
| pt_page_title | %title% %sep% %sitename% (default) |
| twitter_card_type | summary_large_image (default) |
| author_robots | noindex (default) |

### Sitemap (`rank-math-options-sitemap`)

| Setting | Value |
|---------|-------|
| authors_sitemap | off (disabled) |
| pt_post_sitemap | on |
| pt_page_sitemap | on |
| pt_shelter_story_sitemap | on |
| pt_shelter_event_sitemap | on |
| pt_product_sitemap | off (disabled — no products) |
| pt_attachment_sitemap | off (default) |

Users sitemap: not exposed — Rank Math doesn't generate a users sitemap [VERIFIED via sitemap_index.xml].

### Indexing

`blog_public` set to **0** [VERIFIED] — was 1 before this prompt. This injects `<meta name="robots" content="noindex, nofollow"/>` on all pages site-wide.

## Verification

### 4a — Plugin active [VERIFIED]
```
seo-by-rank-math  active  none  1.0.270  off
```

### 4b — Sitemap [VERIFIED]
`https://johnv80.sg-host.com/sitemap_index.xml` returns HTTP 200, content-type text/xml.

Child sitemaps:
- page-sitemap.xml
- shelter_story-sitemap.xml
- shelter_event-sitemap.xml

No authors, no users, no products, no attachments.

### 4c — Homepage OG/meta tags [VERIFIED]

Present in `<head>`:
- `og:locale` = en_US
- `og:type` = website
- `og:title` = "Home - Four Legs Good"
- `og:description` = "Four Legs Good is a 501(c)(3) nonprofit..."
- `og:url` = https://johnv80.sg-host.com/
- `og:site_name` = "Four Legs Good, Inc."
- `og:updated_time` = 2026-05-25T21:50:18+00:00
- `twitter:card` = summary_large_image
- `twitter:title` = "Home - Four Legs Good"
- `twitter:description` = (matches og:description)
- `meta name="robots"` = **noindex, nofollow** (from blog_public=0)
- `meta name="description"` = auto-generated from page content
- Canonical tag: suppressed (standard Rank Math behavior for noindexed pages — will appear when blog_public=1 at launch)

### 4d — ES page OG tags [VERIFIED]

`/es/como-ayudar/` shows:
- `og:locale` = **es_ES** (correct, reflects ES page)
- `og:title` = "Cómo Ayudar - Four Legs Good"
- `og:description` = "Cada acto de bondad marca una diferencia..." (Spanish, from page content)
- `og:image` = help-hero-1.jpg (featured image)
- `hreflang` alternates present (en + es)

OG tags correctly reflect the ES page, not the EN counterpart.

### 4e — blog_public [VERIFIED]
```
Before: 1
After:  0
```

### 4f — Polylang + Rank Math integration [VERIFIED]

Polylang uses separate WordPress post IDs per language translation (e.g., EN page 8, ES page 345). Rank Math stores SEO meta in `post_meta` per post ID (`rank_math_title`, `rank_math_description`, etc.). Since each translation is a separate post, each automatically gets its own independent Rank Math meta fields.

**Per-page meta descriptions can be set independently for EN and ES.** No special integration needed — it's architectural.

No per-page Rank Math meta exists yet on any page (none have been edited in the Rank Math editor). Meta descriptions will be filled in a separate session.

## Auto-detected CPTs

Rank Math auto-detected and configured defaults for:
- `shelter_story` (CPT) — title template, sitemap inclusion, meta box enabled
- `shelter_event` (CPT) — same
- `product` (WooCommerce) — detected but sitemap disabled (no products)

## Notes

- Rank Math's `content_ai_post_types` auto-includes shelter_story and shelter_event — this is informational only (Content AI features require premium)
- The `twitter:label1/data1` shows "Written by flgnynjai@gmail.com" — this is the admin username. Low priority but may want to change the display name in the WP user profile before launch
- Homepage meta description auto-generated from page content. Custom description should be set in the per-page meta session

## No files modified

No theme files, no git commits. Changes are WP options only.
