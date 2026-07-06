# Flyer Mobile Height Fix — 2026-07-06

## Step 0 — Fail-Fast Anchor

- File: `/home/u3058-gfugkrmqxgso/www/fourlegsgoodnynj.org/public_html/wp-content/themes/4lg-theme/page-events.php`
- Line count: **344** [VERIFIED]
- `height: 180px !important;` count: **1** [VERIFIED]
- Mobile rule context (lines 327–330):

```css
.event-strip .event-photo img {
    width: 100% !important;
    height: 180px !important;
}
```

Inside `@media (max-width: 600px)` block. Correct target confirmed. [VERIFIED]

## Step 1 — Backup

- Backup filename: `page-events.php.bak-20260706-231334` [VERIFIED]

## Step 2 — Edit

- Old: `height: 180px !important;`
- New: `height: auto !important;`

### Step 2b — Diff Gate

```diff
329c329
<             height: 180px !important;
---
>             height: auto !important;
```

- Lines changed: **exactly 1** (line 329) [VERIFIED]
- Only the height declaration changed; no other content affected [VERIFIED]

## Step 3 — Cache Purge

```
Success: Speed Optimizer by SiteGround assets folder purged successfully.
Warning: Unable to Purge File Cache. Please make sure it is enabled.
Success: Dynamic Cache Successfully Purged.
Success: The cache was flushed.
```

[VERIFIED]

## Step 4 — Live Verification

### 4a — HTTP Status

- **200** [VERIFIED]

### 4b — Declaration Check

- `height: auto !important;` present: **1** (the mobile rule) [VERIFIED]
- `height: 180px !important;` present: **0** [VERIFIED]

### 4c — Mobile Viewport (390px)

| Metric | Value |
|--------|-------|
| Rendered width | **278px** |
| Rendered height | **356px** |
| Ratio (h/w) | **1.28** (natural portrait, undistorted) |
| Portrait? | **Yes** |
| Width scales to container? | **Yes** (278px ≈ full-width at 390px viewport minus padding) |

The ratio matches the natural image aspect (470×602 = 1.28). No distortion, no stretching. [VERIFIED]

### 4d — Desktop Viewport (1280px)

| Metric | Value |
|--------|-------|
| Rendered width | **200px** |
| Rendered height | **256px** |
| Ratio (h/w) | **1.28** |
| Portrait? | **Yes** |

Desktop rendering unchanged from the prior fix. The inline `width: 200px; height: auto` governs above 600px. [VERIFIED]

### 4e — Dynamic Event List

- `event-strip` count: **3** (3 upcoming events rendering) [VERIFIED]

### 4f — Page Byte Length

- **84,117 bytes** [VERIFIED]

## Step 5 — Restore Not Needed

All Step 4 checks passed. No restore required. [VERIFIED]
