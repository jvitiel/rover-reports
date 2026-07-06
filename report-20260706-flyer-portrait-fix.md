# Flyer Portrait Fix — 2026-07-06

## Step 0 — Fail-Fast Anchor

- File: `/home/u3058-gfugkrmqxgso/www/fourlegsgoodnynj.org/public_html/wp-content/themes/4lg-theme/page-events.php`
- Line count: **344** (production file, not the 124-line stale VPS mirror) [VERIFIED]
- Anchor string `width: 280px; height: 200px; object-fit: cover; border-radius: 8px;` count: **1** [VERIFIED]

## Step 1 — Backup

- Backup filename: `page-events.php.bak-20260706-230735` [VERIFIED]
- Full path: `/home/u3058-gfugkrmqxgso/www/fourlegsgoodnynj.org/public_html/wp-content/themes/4lg-theme/page-events.php.bak-20260706-230735`

## Step 2 — Edit

Replacement:
- Old: `width: 280px; height: 200px; object-fit: cover; border-radius: 8px;`
- New: `width: 200px; height: auto; border-radius: 8px;`

### Step 2b — Diff Gate

```diff
129c129
<                             <img src="<?php echo esc_url($photo_url); ?>" alt="<?php echo esc_attr($title); ?>" style="width: 280px; height: 200px; object-fit: cover; border-radius: 8px;">
---
>                             <img src="<?php echo esc_url($photo_url); ?>" alt="<?php echo esc_attr($title); ?>" style="width: 200px; height: auto; border-radius: 8px;">
```

- Lines changed: **exactly 1** (line 129) [VERIFIED]
- Only the inline style string changed; no other content affected [VERIFIED]

## Step 3 — Cache Purge

```
Success: Speed Optimizer by SiteGround assets folder purged successfully.
Warning: Unable to Purge File Cache. Please make sure it is enabled.
Success: Dynamic Cache Successfully Purged.
Success: The cache was flushed.
```

`wp sg purge` ran successfully. Dynamic cache purged, file cache not enabled (expected). `wp cache flush` also succeeded. [VERIFIED]

## Step 4 — Live Verification

### 4a — HTTP Status

- `curl -s -o /dev/null -w '%{http_code}' https://www.fourlegsgoodnynj.org/events/` → **200** [VERIFIED]

### 4b — Style String Check

- New style `width: 200px; height: auto; border-radius: 8px;` present: **1** match [VERIFIED]
- Old style `width: 280px; height: 200px; object-fit: cover` present: **0** matches [VERIFIED]

### 4c — Rendered Flyer Dimensions (Playwright, 1280px viewport)

| Metric | Value |
|--------|-------|
| Rendered width | **200px** |
| Rendered height | **256px** |
| Aspect ratio (h/w) | **1.28** (portrait) |
| Natural image size | 470 × 602 |
| Portrait? | **Yes** (height > width) |
| Left edge x | 308 |

Image renders at 200px wide with natural height, portrait orientation, uncropped. [VERIFIED]

### 4d — Dynamic Event List

- `event-strip` class count: **3** (3 upcoming events rendering) [VERIFIED — not a stale-mirror overwrite; dynamic content intact]

Note: curl finds 3 `event-strip` occurrences. These are the 3 upcoming events. Past events are also present on the page (class `event-strip past`) but the `class="event-strip"` anchor matches the 3 upcoming-only articles. Total event articles on page confirmed rendering.

### 4e — Page Byte Length

- **84,117 bytes** [VERIFIED]

### 4f — Mobile Check (@media max-width: 600px)

From page-events.php inline `<style>` block (lines 327–330):

```css
.event-strip .event-photo img {
    width: 100% !important;
    height: 180px !important;
}
```

No `.event-photo` rules in `style.css`. [VERIFIED]

**Mobile observation:** At ≤600px, the `!important` override sets `height: 180px` which will **re-crop** the image (overriding `height: auto`). The `width: 100%` makes it full-width. Combined with the now-missing `object-fit: cover`, the image will stretch/distort rather than crop-to-fit at mobile widths. **This needs a follow-up fix** — either add `object-fit: cover` back into the mobile rule, or change `height: 180px` to `height: auto` to preserve the portrait behavior on mobile too. Not addressed in this change (out of scope — upcoming flyer inline style only).

## Step 5 — Restore Not Needed

All Step 4 checks (a–e) passed. No restore required. [VERIFIED]
