# Events Flyer Size Diagnosis — 2026-07-06

## Part 1 — Dashboard / VPS (Upload + Push Side)

### 1a. Upload and Storage

The event flyer upload uses `multer` with `memoryStorage()` (server/src/server.ts line 3690). The raw buffer is sent directly to WordPress Media Library via REST API (`POST /wp-json/wp/v2/media`) with no resize, no thumbnail generation, no dimension constraint on the VPS side. [VERIFIED — source read, server.ts lines 3156–3178]

```javascript
// server/src/server.ts:3156
async function uploadMediaToWordPress(photoBuffer: Buffer, filename: string, mimeType: string): Promise<string> {
  const uint8Array = new Uint8Array(photoBuffer);
  const blob = new Blob([uint8Array], { type: mimeType });
  
  const response = await fetch('https://johnv80.sg-host.com/wp-json/wp/v2/media', {
    method: 'POST',
    headers: {
      'Authorization': getWpAuth(),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': mimeType,
    },
    body: blob,
  });
  // ...returns mediaData.source_url
}
```

The uploaded media URL is stored in `dashboard_events.photo_url` (local SQLite) and in the WordPress `shelter_event` CPT post meta `photo_url` (just a URL string). [VERIFIED — server.ts lines 3721–3790, database query]

**Currently stored flyer (July 11 "Find Your New Best Friend!"):**

```
sqlite> SELECT photo_url FROM dashboard_events WHERE id=23;
https://www.fourlegsgoodnynj.org/wp-content/uploads/2026/07/Screenshot-2026-07-06-161009.jpeg
```

**Intrinsic image dimensions: 690×692 pixels** (JPEG, 106,158 bytes). [VERIFIED via `identify` and `file` commands on downloaded copy]

### 1b. Push to WordPress

The push uses a custom REST endpoint `/wp-json/4lg/v1/push-event` (server.ts line 3574). The `photo_url` is passed as a plain URL string — no width, height, size attribute, image-size name, or inline style is baked into the push payload. [VERIFIED — source read]

```javascript
// server/src/server.ts:3574–3599
body: JSON.stringify({
  title: event.title,
  content: event.content,
  event_date: event.event_date || '',
  // ...
  photo_url: event.photo_url || '',  // <-- just a URL string
  // ...
}),
```

On the WordPress side, the push-event handler stores `photo_url` as post meta via `update_post_meta($post_id, 'photo_url', $value)`. No image processing, no attachment association, no size registration. [VERIFIED — production functions.php line ~1559, read via SSH]

## Part 2 — WordPress / SiteGround (Render Side)

### Template identification

The Events page (slug `events`) uses template `page-events.php`. **The local mirror at `/home/shelter/4lg-theme/page-events.php` is stale (124 lines, last modified 2026-03-10)**. The production version is 344 lines and contains the dynamic event rendering. [VERIFIED — local `stat` vs SSH `wc -l` on production]

Production template read via: `ssh -p 18765 u3058-gfugkrmqxgso@ssh.johnv80.sg-host.com`

### What controls the displayed size

**The flyer display size is controlled by an inline `style` attribute on the `<img>` element in the production `page-events.php` template.** There is no CSS class rule, no WordPress registered image size, and no theme stylesheet rule that sets the flyer dimensions.

#### Upcoming events (line 129):

```php
<div class="event-photo" style="flex-shrink: 0;">
    <img src="<?php echo esc_url($photo_url); ?>"
         alt="<?php echo esc_attr($title); ?>"
         style="width: 140px; height: 100px; object-fit: cover; border-radius: 8px;">
</div>
```

**Controlling rule: inline `style="width: 140px; height: 100px"`**
File: production `page-events.php` line 129

#### Past events (line 274):

```php
<img src="<?php echo esc_url($photo_url); ?>"
     alt="<?php echo esc_attr($title); ?>"
     style="width: 100px; height: 70px; object-fit: cover; border-radius: 6px; filter: grayscale(30%);">
```

**Controlling rule: inline `style="width: 100px; height: 70px"`**
File: production `page-events.php` line 274

#### Mobile override (lines 327–329 in `<style>` block at bottom of template):

```css
@media (max-width: 600px) {
    .event-strip .event-photo img {
        width: 100% !important;
        height: 180px !important;
    }
}
```

File: production `page-events.php` lines 327–329

#### Other potential controls checked — NOT involved:

| Control | Status |
|---------|--------|
| `style.css` event-photo rules | None exist. Only `.event-strip .event-meta` at line 1291 (font-size only). [VERIFIED via SSH grep] |
| `add_image_size()` | No custom image sizes registered in functions.php. [VERIFIED via SSH grep — zero hits] |
| `the_post_thumbnail()` | Not used. The flyer is rendered via `get_post_meta($event->ID, 'photo_url', true)` directly. [VERIFIED] |
| WordPress generated thumbnails | Not involved. The `<img src>` points to the original uploaded file URL, not a `-WxH` resized variant. [VERIFIED — URL is `Screenshot-2026-07-06-161009.jpeg`, no dimension suffix] |

## Part 3 — Measurement + 2× Headroom

### Current rendered display size

Measured via `visual.sh measure` with Playwright (1920×1080 viewport):

```json
{
  "boundingBox": {
    "x": 628,
    "y": 576,
    "width": 140,
    "height": 100
  },
  "computedStyles": {
    "width": "140px",
    "height": "100px"
  }
}
```

**Current rendered: 140×100 CSS pixels** (desktop). [VERIFIED — visual.sh measure output]

### Stored image resolution vs rendered size

| Metric | Value |
|--------|-------|
| Stored intrinsic dimensions | 690×692 px |
| Desktop rendered dimensions | 140×100 px |
| 2× target dimensions | 280×200 px |
| Available headroom (width) | 690 / 280 = **2.46×** |
| Available headroom (height) | 692 / 200 = **3.46×** |

### 2× headroom verdict

**YES — the stored image has sufficient resolution to render at 2× the current display size without upscaling or pixelation.** The intrinsic width (690px) is 2.46× the target 2× width (280px), and the intrinsic height (692px) is 3.46× the target 2× height (200px). [VERIFIED — arithmetic on measured values]

### Note on `object-fit: cover`

The image uses `object-fit: cover`, which crops to fill the container. At 140×100 (1.4:1 aspect ratio) the nearly-square source image (690×692, ~1:1) is cropped at the sides. At 280×200 (still 1.4:1), the same crop behavior applies with identical visual coverage — no pixelation concern since intrinsic dimensions exceed the container in both axes.

## Summary — Where to Change

To double the flyer display size, **only the production `page-events.php` on SiteGround needs to change**:

1. **Line 129** (upcoming events): change `width: 140px; height: 100px` → `width: 280px; height: 200px`
2. **Line 274** (past events): change `width: 100px; height: 70px` → `width: 200px; height: 140px` (if also doubling past events)
3. **Lines 327–329** (mobile override): optionally adjust `height: 180px` → `height: 360px` or leave as-is since mobile already uses `width: 100%`

No VPS/dashboard changes needed — the upload pipeline stores original resolution, and the push payload carries no size data. No WordPress image regeneration needed — the `<img src>` already points to the full-resolution original.
