# Events Flyer Enlarge — 2026-07-06

## Step 0 — File Confirmation

- **File:** `/home/u3058-gfugkrmqxgso/www/johnv80.sg-host.com/public_html/wp-content/themes/4lg-theme/page-events.php` (SiteGround production) [VERIFIED]
- **Line count:** 344 (confirms production, not the 124-line stale VPS mirror) [VERIFIED]
- **Anchor 1** (`width: 140px; height: 100px; object-fit: cover; border-radius: 8px;`): count = **1** [VERIFIED]
- **Anchor 2** (`width: 100px; height: 70px; object-fit: cover; border-radius: 6px; filter: grayscale(30%);`): count = **1** [VERIFIED]

## Step 1 — Backup

Backup file: `page-events.php.bak-20260706-214923` (344 lines, same directory on SiteGround) [VERIFIED]

## Step 2b — Diff

```diff
129c129
<                             <img src="<?php echo esc_url($photo_url); ?>" alt="<?php echo esc_attr($title); ?>" style="width: 140px; height: 100px; object-fit: cover; border-radius: 8px;">
---
>                             <img src="<?php echo esc_url($photo_url); ?>" alt="<?php echo esc_attr($title); ?>" style="width: 280px; height: 200px; object-fit: cover; border-radius: 8px;">
274c274
<                         <img src="<?php echo esc_url($photo_url); ?>" alt="<?php echo esc_attr($title); ?>" style="width: 100px; height: 70px; object-fit: cover; border-radius: 6px; filter: grayscale(30%);">
---
>                         <img src="<?php echo esc_url($photo_url); ?>" alt="<?php echo esc_attr($title); ?>" style="width: 200px; height: 140px; object-fit: cover; border-radius: 6px; filter: grayscale(30%);">
```

**Exactly 2 lines changed.** Only width/height values modified; object-fit, border-radius, and grayscale preserved. [VERIFIED]

## Step 3 — Cache Purge

- `wp sg purge`: not available (`sg` is not a registered wp-cli command on this SiteGround instance) [VERIFIED]
- `wp cache flush`: **Success** — "The cache was flushed." [VERIFIED]
- `wp transient delete flg_upcoming_events`: transient did not exist (events page template uses its own transient; not currently cached) [VERIFIED]

## Step 4 — Live Verification

**4a) HTTP status:** 200 [VERIFIED]

**4b) New sizes present:**
- `width: 280px; height: 200px`: count = **1** ✅ [VERIFIED]
- `width: 200px; height: 140px`: count = **0** — expected: no past events currently have a `photo_url` set, so the conditional `<?php if ($photo_url) : ?>` block does not render the `<img>` tag. The edit is confirmed present in the PHP source at line 274. [VERIFIED — grep on SiteGround file shows line 274 contains `width: 200px; height: 140px`]

**4c) Old sizes gone:**
- `width: 140px; height: 100px`: count = **0** ✅ [VERIFIED]
- `width: 100px; height: 70px`: count = **0** ✅ [VERIFIED]

**4d) Dynamic event rendering:**
- `event-strip` occurrences: **13** (3 upcoming articles + 5 past articles + CSS rules) [VERIFIED]
- Event IDs rendered: `event-440`, `event-437`, `event-438` (3 upcoming events) [VERIFIED]
- Dynamic rendering intact — not an empty or static fallback [VERIFIED]

**4e) Page byte length:** 84,138 bytes [VERIFIED]

## Summary

Two inline-style edits applied to production `page-events.php` on SiteGround via SSH. Upcoming event flyers: 140×100 → 280×200. Past event flyers: 100×70 → 200×140 (will render when a past event has a photo). No other files touched. Backup retained on SiteGround.
