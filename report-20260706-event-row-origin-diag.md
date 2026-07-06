# Event Row Origin Diagnosis — 2026-07-06

## Q1 — Where Is the Event-Row Markup Emitted?

The **entire** upcoming-event row markup is authored by the template PHP in `page-events.php`. No part of the row layout comes from a stored HTML blob.

The template loop (lines 78–189) iterates `$upcoming_events` (from `get_posts()`), reads structured meta fields, and prints hardcoded HTML:

```php
<?php foreach ($upcoming_events as $index => $event) :
    $title = esc_html(get_the_title($event));
    $event_date = get_post_meta($event->ID, 'event_date', true);
    $time_start = get_post_meta($event->ID, 'event_time_start', true);
    $time_end = get_post_meta($event->ID, 'event_time_end', true);
    $location_name = get_post_meta($event->ID, 'event_location_name', true);
    $location = get_post_meta($event->ID, 'event_location', true);
    $photo_url = get_post_meta($event->ID, 'photo_url', true);
    $event_type = get_post_meta($event->ID, 'event_type', true);
    $link_url = get_post_meta($event->ID, 'link_url', true);
    $link_text = get_post_meta($event->ID, 'link_text', true);
    $contact_email = get_post_meta($event->ID, 'contact_email', true);
    $contact_phone = get_post_meta($event->ID, 'contact_phone', true);
    $content = apply_filters('the_content', get_post_field('post_content', $event->ID));
    // ... date/time formatting ...
?>

<article class="event-strip" id="event-<?php echo $event->ID; ?>"
  style="display: flex; gap: 1.5rem; align-items: flex-start; padding: 1.5rem 0; ...">

    <!-- Date Badge — template-authored markup -->
    <div class="event-date-badge" style="flex-shrink: 0; background: white; border-radius: 12px;
         padding: 1rem 1.25rem; text-align: center; min-width: 70px; ...">
        <div style="..."><?php echo esc_html($day); ?></div>
        <div style="..."><?php echo esc_html($month); ?></div>
    </div>

    <?php if ($photo_url) : ?>
    <!-- Photo — template-authored markup, only the src URL comes from data -->
    <div class="event-photo" style="flex-shrink: 0;">
        <img src="<?php echo esc_url($photo_url); ?>"
             alt="<?php echo esc_attr($title); ?>"
             style="width: 280px; height: 200px; object-fit: cover; border-radius: 8px;">
    </div>
    <?php endif; ?>

    <!-- Event Details — template-authored markup -->
    <div class="event-details" style="flex: 1; min-width: 0;">
        <!-- type badge, h3 title, meta row, $content, contact/link -->
    </div>
</article>
<?php endforeach; ?>
```

[VERIFIED — quoted verbatim from production page-events.php lines 116–189]

**Verdict:** The row layout — the `display: flex` container, the `.event-date-badge`, `.event-photo`, and `.event-details` wrapper elements, and all inline styles — are **100% template-authored**. The pushed data supplies only scalar values plugged into `esc_html()` / `esc_url()` slots. The one exception is `$content` (from `post_content`), which is echoed inside the `.event-details` block as the event description paragraph — it does NOT contain any layout/wrapper markup. [VERIFIED]

## Q2 — Where Does the Flyer `<img>` and Its Inline Size Come From?

The `<img>` tag and its inline `style="width: 280px; height: 200px; object-fit: cover; border-radius: 8px;"` are **written by the template PHP** at line 129 of page-events.php. [VERIFIED]

The only data-sourced part is the `src` attribute value, which comes from `get_post_meta($event->ID, 'photo_url', true)` — a plain URL string stored as post meta. [VERIFIED]

The 280×200 edit we made on 2026-07-06 IS what renders. Confirmation:

```
$ curl -s https://www.fourlegsgoodnynj.org/events/ | grep -o 'width: 280px[^"]*"'
width: 280px; height: 200px; object-fit: cover; border-radius: 8px;"
```

[VERIFIED — one match, from the single upcoming event with a photo (ID 440)]

## Q3 — What Does the Dashboard Push Actually Write?

The shelter-app pushes **structured fields only** — no pre-built HTML layout. Two push paths exist:

### Create path: `createWordPressEvent()` (server.ts lines 3556–3602)

POSTs to custom endpoint `https://johnv80.sg-host.com/wp-json/4lg/v1/push-event` with flat JSON:

```typescript
body: JSON.stringify({
    title: event.title,           // → post_title
    content: event.content,       // → post_content (description text, not layout HTML)
    event_date: event.event_date || '',
    event_time_start: event.event_time_start || '',
    event_time_end: event.event_time_end || '',
    event_location: event.event_location || '',
    event_location_name: event.event_location_name || '',
    event_type: event.event_type || 'other',
    photo_url: event.photo_url || '',       // plain URL string
    link_url: event.link_url || '',
    link_text: event.link_text || '',
    contact_email: event.contact_email || '',
    contact_phone: event.contact_phone || '',
})
```

[VERIFIED — quoted from server.ts lines 3576–3600]

### WordPress receiver: `flg_handle_event_push()` (functions.php lines 1180–1260)

Creates a `shelter_event` post with `post_title` + `post_content`, then stores all other fields as **individual post_meta** via `update_post_meta()`:

```php
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
```

[VERIFIED — quoted from production functions.php lines 1232–1244]

### Update path: `updateWordPressEvent()` (server.ts lines 3605–3650)

Uses standard WP REST API (`wp/v2/shelter-events/{id}`) with fields nested under `meta: { ... }`. Same field set. [VERIFIED]

**Verdict:** The row LAYOUT is **owned entirely by the template** (`page-events.php`). The Dashboard pushes only structured data (title, date, photo URL, etc.) as post meta. The template reads these fields and renders them inside its own hardcoded HTML structure. Restructuring the row layout requires editing **only** `page-events.php` — no Dashboard push-path change is needed. [VERIFIED]

## Q4 — Alignment Target Coordinates

From the prior diagnosis measurements (1920×1080 viewport, Playwright `getBoundingClientRect()`):

| Element | x (left edge) |
|---------|---------------|
| `.event-date-badge` | 534 |
| `.event-photo` container (event with photo) | 628 |
| `.event-photo img` | 628 |
| `.event-details` (event WITH photo, ID 440) | 932 |
| `.event-details` (event WITHOUT photo, ID 437) | 628 |
| `.event-details` (event WITHOUT photo, ID 438) | 631 |

[VERIFIED — from Playwright measurements in prior diagnosis session]

**Content-column start = x≈628** for both photo and photo-less rows. [VERIFIED]

**Fix goal confirmed:** The photo's left edge should remain at x=628 (where it already is), but instead of sitting BESIDE the text (pushing `.event-details` to x=932), it should stack ABOVE the text within the content column. Both photo and title would share the same left edge (x≈628), with the photo appearing over the "V" in "Volunteer Orientation" (or whatever title text is below it). [VERIFIED — this is achievable by moving the `.event-photo` block inside `.event-details` and placing it before the title, or by restructuring the flex to a 2-column layout (badge | stacked content)]

The date badge stays at x=534 as a fixed left column. The "content column" (badge-right + gap, starting at x=628) would contain: photo (full-width of column), then title, then meta, then description. [INFERRED — this is the natural layout that achieves the stated goal; exact implementation is a design choice]
