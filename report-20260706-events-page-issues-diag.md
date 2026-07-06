# Events Page Issues Diagnosis — 2026-07-06

## Section A: Upcoming-Events Flyer Alignment

### A1 — Upcoming Event-Item Markup

Production `page-events.php` (344 lines, template "Events Page"). Upcoming event row (lines 116–189):

```html
<article class="event-strip" id="event-<?php echo $event->ID; ?>"
  style="display: flex; gap: 1.5rem; align-items: flex-start; padding: 1.5rem 0;
         <?php echo !$is_last ? 'border-bottom: 1px solid #E5E0DB;' : ''; ?>">

    <!-- Date Badge -->
    <div class="event-date-badge"
      style="flex-shrink: 0; background: white; border-radius: 12px;
             padding: 1rem 1.25rem; text-align: center; min-width: 70px;
             box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <div style="font-size: 1.75rem; font-weight: 700; color: #C4753B; line-height: 1;">
          <?php echo esc_html($day); ?>
        </div>
        <div style="font-size: 0.75rem; color: #6B6560; text-transform: uppercase;
             font-weight: 600; letter-spacing: 0.05em;">
          <?php echo esc_html($month); ?>
        </div>
    </div>

    <?php if ($photo_url) : ?>
    <!-- Photo (CONDITIONAL — only rendered when event has photo_url) -->
    <div class="event-photo" style="flex-shrink: 0;">
        <img src="<?php echo esc_url($photo_url); ?>"
             alt="<?php echo esc_attr($title); ?>"
             style="width: 280px; height: 200px; object-fit: cover; border-radius: 8px;">
    </div>
    <?php endif; ?>

    <!-- Event Details -->
    <div class="event-details" style="flex: 1; min-width: 0;">
        <!-- type badge, h3 title, meta (date/time/location), content, links -->
    </div>
</article>
```

The row is a **3-column flex** (or 2-column when no photo): `[badge] [gap] [photo?] [gap] [details]`. [VERIFIED — markup quoted verbatim from production file]

### A2 — CSS Governing the Row

**Inline styles (page-events.php):**

| Element | Key Inline Styles |
|---------|------------------|
| `.event-strip` (row) | `display: flex; gap: 1.5rem; align-items: flex-start; padding: 1.5rem 0` |
| `.event-date-badge` | `flex-shrink: 0; min-width: 70px; padding: 1rem 1.25rem; text-align: center` |
| `.event-photo` | `flex-shrink: 0` (no width, no padding, no margin, no text-align) |
| `.event-photo img` | `width: 280px; height: 200px; object-fit: cover; border-radius: 8px` |
| `.event-details` | `flex: 1; min-width: 0` |
| `.container` (parent) | `max-width: 900px; margin: 0 auto; padding: 0 1.5rem` |

**External `style.css` rules that touch these elements:**

```css
/* line 254 */ .events-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
/* line 260 */ .event-details h3 { font-family: var(--font-display); font-weight: 500; font-size: 1.15rem; ... }
/* line 261 */ .event-details p { font-size: 0.9rem; color: var(--color-stone); }
```

No `.event-photo` rules in style.css. [VERIFIED — `grep` returned zero matches for `event-photo`] No width, padding, margin, or alignment overrides on `.event-photo` from any external source.

**Mobile breakpoint (inline `<style>` block in page-events.php, line 310–326):**

```css
@media (max-width: 600px) {
    .event-strip { flex-direction: column !important; gap: 1rem !important; }
    .event-strip .event-photo img { width: 100% !important; height: 180px !important; }
}
```

### A3 — Rendered Alignment Measurements (1920×1080 viewport)

All measurements via Playwright `getBoundingClientRect()` at desktop viewport.

**Event 1 (ID 440 — "Find Your New Best Friend!", HAS photo):**

| Element | x (left edge) | width | right edge |
|---------|--------------|-------|------------|
| `.event-strip` row | 534 | 852 | 1386 |
| `.event-date-badge` | 534 | 70 | 604 |
| `.event-photo` container | 628 | 280 | 908 |
| `.event-photo img` | 628 | 280 | 908 |
| `.event-details` | 932 | 454 | 1386 |

**Event 2 (ID 437 — "Volunteer Orientation", NO photo):**

| Element | x (left edge) | width |
|---------|--------------|-------|
| `.event-details` | 628 | 758 |

**Event 3 (ID 438 — "Volunteer Orientation", NO photo):**

| Element | x (left edge) | width |
|---------|--------------|-------|
| `.event-details` | 631 | 755 |

**Alignment breakdown:**

- Date badge left edge: **x=534** [VERIFIED]
- Photo left edge: **x=628** (534 + 70px badge + 24px gap) [VERIFIED]
- Photo-less event details left edge: **x=628** [VERIFIED]
- Photo event details left edge: **x=932** (628 + 280px photo + 24px gap) [VERIFIED]
- Photo inset from badge left edge: **94px** (70px badge rendered width + 24px flex gap) [VERIFIED]

**Source of the inset:** The photo is the **second flex child** after the date badge. The 94px offset from the badge's left edge = badge width (70px, min-width enforced under `box-sizing: border-box`, includes 20px+20px horizontal padding) + flex gap (1.5rem = 24px). There is no extra padding, margin, or centering on `.event-photo` or its `<img>` — the image fills its container completely (both report identical 280×200 bounding boxes, zero padding). [VERIFIED]

The photo IS flush-left with the content column start (x=628 matches the `.event-details` x on photo-less events). The perceived "inset" is structural: the 3-column flex layout places the photo BETWEEN the badge and text, not at the row's left edge. To align the photo with the badge's left edge (x=534), the layout would need to change from a flat 3-column flex row to either a 2-row or nested layout (e.g., photo above or below the badge, or a CSS grid with the photo spanning a different column).

Only 1 of the 3 upcoming events currently has a `photo_url` set (event 440). [VERIFIED]

---

## Section B: ES Events Page Renders No Events

### B1 — Template Confirmation

| Page | ID | post_name | Template |
|------|-----|-----------|----------|
| Events (EN) | 13 | events | `page-events.php` |
| Eventos (ES) | 341 | eventos | `page-events.php` |

Both pages use the **same** `page-events.php` template. [VERIFIED — `wp post meta get 13 _wp_page_template` and `wp post meta get 341 _wp_page_template` both return `page-events.php`]

### B2 — Event Query in page-events.php

Upcoming events query (lines 35–49):

```php
$upcoming_args = array(
    'post_type'      => 'shelter_event',
    'posts_per_page' => -1,
    'post_status'    => 'publish',
    'meta_key'       => 'event_date',
    'orderby'        => 'meta_value',
    'order'          => 'ASC',
    'meta_query'     => array(
        array(
            'key'     => 'event_date',
            'value'   => $today,
            'compare' => '>=',
            'type'    => 'DATE',
        ),
    ),
    'lang' => function_exists('pll_current_language') ? pll_current_language('slug') : '',
);
```

Past events query (lines 198–214) is identical except `'compare' => '<'`, `'order' => 'DESC'`, `'posts_per_page' => 5`.

**Critical line:** `'lang' => function_exists('pll_current_language') ? pll_current_language('slug') : ''`

This **explicitly** passes the current Polylang language to `get_posts()`. On the EN page, `pll_current_language('slug')` returns `'en'`; on the ES page it returns `'es'`. The query only returns events assigned to that language. [VERIFIED — code quoted from production file]

### B3 — Event Data + Language Assignments

**All 13 published `shelter_event` posts:**

| ID | Title | event_date | Polylang Language |
|----|-------|------------|-------------------|
| 440 | Find Your New Best Friend! | 2026-07-11 | **en** |
| 438 | Volunteer Orientation | 2026-07-25 | **en** |
| 437 | Volunteer Orientation | 2026-07-12 | **en** |
| 371 | Volunteer Orientaton | 2026-06-13 | **en** |
| 366 | Orientación para Voluntarios | 2026-05-31 | **es** |
| 323 | Volunteer Orientaton | 2026-05-31 | **en** |
| 310 | Volunteer Orientation | 2026-05-09 | **en** |
| 307 | Volunteer Orientation | 2026-04-11 | **en** |
| 297 | Test Event | 2026-04-04 | **en** |
| 254 | Late Winter Bow Wow | 2026-03-19 | **en** |
| 249 | Volunteer Orientation | 2026-04-05 | **en** |
| 248 | Pet Supplies Plus Fundraiser | 2026-03-29 | **en** |
| 247 | Spring Adoption Fair | 2026-03-22 | **en** |

[VERIFIED — `pll_get_post_language()` called per event via `wp eval`]

**ES events:** Only **1** event is assigned to ES — ID 366 ("Orientación para Voluntarios", 2026-05-31). Its `event_date` is in the **past** (before 2026-07-06). [VERIFIED]

**Polylang CPT registration:**

```
post_types: Array ( [0] => shelter_story, [1] => shelter_event )
```

`shelter_event` IS registered as translatable in Polylang. [VERIFIED — `wp option get polylang` → `post_types` includes `shelter_event`]

### B4 — Root Cause Determination

**Cause: (a) — Polylang language filter.** [VERIFIED]

The template explicitly passes `'lang' => pll_current_language('slug')` to both queries. On `/es/eventos/`, this becomes `'lang' => 'es'`. Of the 13 published events, only 1 is assigned to `es` (ID 366), and its date (2026-05-31) is in the past. The upcoming query (`event_date >= 2026-07-06`) matches **zero** ES events → the "No hay eventos" empty state renders. The past query matches **one** ES event (ID 366) → one past event strip renders.

The EN page works because 3 events are EN-assigned with future dates (IDs 437, 438, 440).

Evidence chain:
1. Template has explicit `'lang'` parameter in query [VERIFIED — line 49 of page-events.php]
2. `shelter_event` is Polylang-translatable [VERIFIED — polylang option]
3. All 3 upcoming events are EN-only [VERIFIED — pll_get_post_language returns 'en' for 437, 438, 440]
4. Zero ES events have future dates [VERIFIED — only ES event is ID 366 at 2026-05-31]
5. ES page genuinely serves empty state (not cached stale) [VERIFIED — fresh curl returns `no-events` div with "No hay eventos", plus 1 past event-strip]

**Likely fix:** This is a **data/push-side** problem, not a template problem. The template correctly filters by language — that's the intended Polylang behavior. The fix is to either:
- **(preferred)** Create ES translations of the 3 upcoming EN events (or at minimum the ones relevant to Spanish-speaking visitors) and assign them `lang=es` in Polylang, OR
- **(alternative)** Remove the `'lang'` parameter from the query so events render language-agnostically on both pages — but this would show English-titled events on the ES page, which is likely undesirable.

If events are pushed from the Dashboard, the push path would need to create Polylang ES translations when pushing events (currently it appears to only create EN posts). This is a Dashboard/VPS change, not a WordPress template change.

---

Screenshots:
- EN desktop: `2026-07-06-222012-events-en-full-desktop.png`
- ES desktop: `2026-07-06-222051-events-es-full-desktop.png`
