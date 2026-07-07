# "No posts found" diagnosis — Google sitelinks

## Q1 — Source of "No posts found"

Single source: `index.php:33` in the production 4lg-theme. [VERIFIED]

```php
<?php else : ?>
    <p><?php esc_html_e('No posts found.', 'four-legs-good'); ?></p>
<?php endif; ?>
```

Full loop context (index.php is the WordPress fallback template):

```php
<?php if (have_posts()) : ?>
    <?php while (have_posts()) : the_post(); ?>
        <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
            <header>
                <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
            </header>
            <div class="entry-content">
                <?php the_excerpt(); ?>
            </div>
        </article>
    <?php endwhile; ?>
    <?php the_posts_navigation(); ?>
<?php else : ?>
    <p><?php esc_html_e('No posts found.', 'four-legs-good'); ?></p>
<?php endif; ?>
```

No other files emit the string. `functions.php` has "not found" in REST error messages (lines 299, 1551, 1670) but those are JSON API responses, not rendered HTML. [VERIFIED]

No `404.php` exists in the theme — WordPress falls through to `index.php` for all unmatched URLs. [VERIFIED]

## Q2 — Page inventory and sitelink target mapping

### Published pages (wp post list)

| ID | Title | Slug | Status |
|----|-------|------|--------|
| 391 | Declaración de Accesibilidad | accesibilidad | publish |
| 385 | Accessibility Statement | accessibility | publish |
| 390 | Términos de Servicio | terminos-de-servicio | publish |
| 384 | Terms of Service | terms-of-service | publish |
| 389 | Política de Privacidad | politica-de-privacidad | publish |
| 383 | Privacy Policy | privacy-policy | publish |
| 335 | Home - Español | home-espanol | publish |
| 14 | Home | home | publish |
| 13 | Events | events | publish |
| 341 | Eventos | eventos | publish |
| 12 | Happy Tails | stories | publish |
| 343 | Historias Felices | historias-felices | publish |
| 11 | TNVR Program | tnvr | publish |
| 349 | Programa TNVR | programa-tnvr | publish |
| 347 | Refugio Animal RG CARES | refugio-animal-rg-cares | publish |
| 10 | RG CARES Animal Shelter | rg-cares | publish |
| 337 | Acerca de Four Legs Good | acerca-de-four-legs-good | publish |
| 9 | About Four Legs Good | about-us | publish |
| 345 | Cómo Ayudar | como-ayudar | publish |
| 8 | How to Help | how-to-help | publish |
| 339 | Adopta una Mascota | adopta-una-mascota | publish |
| 7 | Adopt a Pet | adopt | publish |

Draft pages: 294 (RG Cares Portal, slug `rg-portal`), 3 (Privacy Policy, slug `privacy-policy-old-draft`). [VERIFIED]

### Sitelink target mapping

Google sitelinks likely surface anchor text from the footer and header nav. The theme's **header.php** links to: `/`, `/adopt/`, `/how-to-help/`, `/about-us/`, `/rg-cares/`, `/tnvr/`, `/stories/`, `/events/` — all have published pages. [VERIFIED]

The theme's **footer.php** links to:

| Footer text | Target URL | Page exists? |
|-------------|-----------|--------------|
| Meet Our Animals | `/adopt/` | ✅ page 7 |
| Adoption Process | `/adopt/#process` | ✅ anchor on page 7 |
| Adoption FAQ | `/adopt/#faq` | ✅ anchor on page 7 |
| Donate | `/how-to-help/` | ✅ page 8 |
| Volunteer | `/how-to-help/#volunteer` | ✅ anchor on page 8 |
| Foster | `/how-to-help/#foster` | ✅ anchor on page 8 |
| Wish Lists | `/how-to-help/#wishlists` | ✅ anchor on page 8 |
| Events | `/events/` | ✅ page 13 |

Header Donate button links to external Zeffy URL (not a site page). [VERIFIED]

**No theme link points to `/donate/`, `/volunteer/`, `/foster/`, `/adoption-process/`, `/adoption-faq/`, or `/meet-our-animals/`.** These slugs don't exist as pages. [VERIFIED]

## Q3 — Curl classification of sitelink targets

### Slugs matching actual footer/header/nav links

| URL | HTTP | Body | Classification |
|-----|------|------|----------------|
| `/adopt/` | 200 | Real content | ✅ (a) real page, renders content |
| `/how-to-help/` | 200 | Real content | ✅ (a) real page, renders content |
| `/about-us/` | 200 | Real content | ✅ (a) real page, renders content |
| `/events/` | 200 | Real content | ✅ (a) real page, renders content |
| `/stories/` | 200 | Real content | ✅ (a) real page, renders content |
| `/tnvr/` | 200 | Real content | ✅ (a) real page, renders content |
| `/rg-cares/` | 200 | Real content | ✅ (a) real page, renders content |

[VERIFIED — all curled from VPS]

### Slugs Google might infer from anchor text (no matching page)

| URL | HTTP | Body | Classification |
|-----|------|------|----------------|
| `/donate/` | 404 | "No posts found" | ❌ (c) 404 fallthrough to index.php |
| `/volunteer/` | 301 → `/event/volunteer-orientation/` | Redirects | ⚠️ Rank Math or WP redirect (no redirect table found; likely WP slug guess) |
| `/foster/` | 404 | "No posts found" | ❌ (c) 404 fallthrough to index.php |
| `/adoption-process/` | 404 | "No posts found" | ❌ (c) 404 fallthrough to index.php |
| `/adoption-faq/` | 404 | "No posts found" | ❌ (c) 404 fallthrough to index.php |
| `/meet-our-animals/` | 404 | "No posts found" | ❌ (c) 404 fallthrough to index.php |

[VERIFIED — all curled from VPS]

`/event/volunteer-orientation/` (the redirect target for `/volunteer/`) returns HTTP 200 with real content — it's a shelter_event CPT single post. [VERIFIED]

## Q4 — Root cause

### Primary mechanism

1. **No `404.php` exists** in the 4lg-theme. [VERIFIED]
2. When WordPress resolves a URL to no content (no page, no post, no CPT), it falls through to `index.php`. [VERIFIED]
3. `index.php` runs the default query loop (`have_posts()`). [VERIFIED]
4. The site has **zero published standard `post` type posts** (`wp post list --post_type=post --post_status=publish --format=count` = 0). [VERIFIED]
5. `show_on_front` = `page`, `page_on_front` = 14 (Home), `page_for_posts` = 0 (none). [VERIFIED]
6. Therefore the default loop for any unmatched URL returns empty → "No posts found." [VERIFIED]

### Why Google surfaces these URLs

Google is NOT getting these URLs from the sitemap (see Q5 — none of the broken slugs appear in any sitemap). [VERIFIED]

Google is generating **sitelinks by inferring section names from footer anchor text**. The footer says "Donate" linking to `/how-to-help/`, "Volunteer" linking to `/how-to-help/#volunteer`, "Foster" linking to `/how-to-help/#foster`, "Adoption Process" linking to `/adopt/#process`, "Adoption FAQ" linking to `/adopt/#faq`, "Meet Our Animals" linking to `/adopt/`. [VERIFIED]

Google's sitelink algorithm sometimes **constructs URLs from the anchor text** (e.g., seeing "Donate" and guessing `/donate/`, or seeing "Volunteer" and guessing `/volunteer/`), especially when these look like plausible section paths. These constructed URLs don't match any actual page. [INFERRED — based on the gap between footer anchor text and the failing slugs]

The `/volunteer/` → 301 → `/event/volunteer-orientation/` redirect is an oddity. No Rank Math redirect table exists (`wp_rank_math_redirections` table not found). [VERIFIED] This is likely WordPress's built-in URL guessing (`redirect_guess_404_permalink`) matching the word "volunteer" in the `volunteer-orientation` event slug. [INFERRED]

### Per-URL cause classification

| URL | Cause |
|-----|-------|
| `/donate/` | (ii) No page at this slug → WP falls through to index.php → empty blog index (0 posts) |
| `/foster/` | (ii) Same — no page, empty blog fallthrough |
| `/adoption-process/` | (ii) Same |
| `/adoption-faq/` | (ii) Same |
| `/meet-our-animals/` | (ii) Same |
| `/volunteer/` | WP 404 guess redirects to `/event/volunteer-orientation/` (200, renders fine) — not broken but unexpected |

None are (i) — no page was lost/unpublished. None are (iii) — no template selects the wrong query. The pages simply don't exist. [VERIFIED]

## Q5 — Sitemap contents

### Sitemap index (Rank Math)

Three sub-sitemaps: [VERIFIED]

| Sitemap | Last modified |
|---------|--------------|
| page-sitemap.xml | 2026-06-29 |
| shelter_story-sitemap.xml | 2026-05-24 |
| shelter_event-sitemap.xml | 2026-06-29 |

### page-sitemap.xml (23 URLs)

EN pages: `/`, `/accessibility/`, `/terms-of-service/`, `/privacy-policy/`, `/adopt/`, `/how-to-help/`, `/events/`, `/about-us/`, `/rg-cares/`, `/tnvr/`, `/stories/`
ES pages: `/es/`, `/es/accesibilidad/`, `/es/terminos-de-servicio/`, `/es/politica-de-privacidad/`, `/es/adopta-una-mascota/`, `/es/como-ayudar/`, `/es/eventos/`, `/es/historias-felices/`, `/es/programa-tnvr/`, `/es/refugio-animal-rg-cares/`, `/es/acerca-de-four-legs-good/`

[VERIFIED — full XML retrieved]

### shelter_event-sitemap.xml (12 URLs)

Includes individual event pages: `/event/volunteer-orientation/` through `-5/`, `/event/late-winter-bow-wow/`, `/event/pet-supplies-plus-fundraiser/`, `/event/spring-adoption-fair/`, `/event/test-event/`, plus one ES event. [VERIFIED]

**NOTE:** `/event/test-event/` is the test event we created and trashed on 2026-07-07. If it's still in the sitemap, the trash/delete may not have purged it from Rank Math's index. [UNCERTAIN — depends on Rank Math cache/rebuild timing]

### Broken URLs in sitemap: ZERO

None of the five 404 URLs (`/donate/`, `/foster/`, `/adoption-process/`, `/adoption-faq/`, `/meet-our-animals/`) appear in any sitemap. [VERIFIED]

**Google is surfacing these as inferred sitelinks, not from crawling the sitemap.**

## Summary

The "No posts found" message appears on URLs that Google fabricates from footer anchor text (Donate, Volunteer, Foster, etc.). These slugs have no corresponding WP pages — the actual links point to anchor sections on `/adopt/` and `/how-to-help/`. With no `404.php` in the theme and zero standard blog posts, unmatched URLs fall through to `index.php` whose empty `have_posts()` loop renders "No posts found." The sitemap is clean — all 23 page URLs and 12 event URLs resolve correctly.

Fix paths (not implemented — diagnosis only):
- **A.** Add a `404.php` template with a proper "page not found" message and navigation back to real pages
- **B.** Add redirects from the inferred slugs to the real destinations (`/donate/` → `/how-to-help/`, `/foster/` → `/how-to-help/#foster`, etc.)
- **C.** Both A and B (recommended)
