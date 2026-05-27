# Report: Favicon + Donate Heart Color Fix

**Date:** 2026-05-27 15:43 ET
**Scope:** Website 4 — two unrelated small fixes (favicon, heart icon color).

---

## Task A: Favicon (WP Site Icon)

### A1 — Logo files found

| File | Location | Dimensions | Format |
|------|----------|------------|--------|
| 4lg-logo.png | WP media library (ID 292) | 800×781 | PNG |
| 4lg_logo.jpg | Theme root (`/4lg-theme/4lg_logo.jpg`) | 819×800 | JPEG |

Both are the full circular logo with "FOUR LEGS GOOD" text arc + three animal circles + green border ring.

### A2 — Source image selection

Full logo is illegible at 32×32 (text arc, fine details). No icon-only version existed.

**Created cropped version:** Center-cropped the media library PNG to 480×480 (removes text ring, keeps three animal circles with hearts and green hands). Upscaled to 512×512 for WP Site Icon requirement.

Tool: `convert 4lg-logo.png -gravity center -crop 480x480+0+0 +repage` then `-resize 512x512`

### A3 — Upload

- Uploaded as WP media attachment **ID 392** via `wp media import`
- Title: "Site Icon"
- File: `wp-content/uploads/2026/05/4lg-site-icon.png`

### A4 — Site Icon set

`wp option update site_icon 392` — success [VERIFIED]

### A5 — Verification [VERIFIED]

Favicon tags now present in HTML `<head>`:
```html
<link rel="icon" href=".../4lg-site-icon-150x150.png" sizes="32x32" />
<link rel="icon" href=".../4lg-site-icon-300x300.png" sizes="192x192" />
<link rel="apple-touch-icon" href=".../4lg-site-icon-300x300.png" />
<meta name="msapplication-TileImage" content=".../4lg-site-icon-300x300.png" />
```

`/favicon.ico` returns HTTP 200 (WP handles the redirect).

---

## Task B: White Heart on Donate Now Button

### B1 — Markup identification

**Heart type:** Unicode emoji ❤️ (U+2764 U+FE0F) embedded directly in button text.

**Before:**
```html
<a class="wp-block-button__link has-white-color has-rose-background-color ...">❤️ Donate Now</a>
```

The emoji has the "emoji presentation selector" (U+FE0F) which forces color emoji rendering — CSS `color: white` doesn't affect it. The button text "Donate Now" renders white (via `has-white-color` class) but the ❤️ renders red/pink regardless.

**Header donate button:** Uses `class="btn btn-heart"` in `header.php` — no emoji, heart is CSS-based. Completely separate mechanism. Not affected by this change [VERIFIED].

### B2 — Fix applied

Replaced ❤️ (U+2764 U+FE0F, emoji presentation) with ♥ (U+2665, text presentation).

**After:**
```html
<a class="wp-block-button__link has-white-color has-rose-background-color ...">♥ Donate Now</a>
```

♥ (U+2665) is a text character that inherits CSS `color`. Since the button already has `has-white-color`, the heart now renders white along with "Donate Now".

Change applied via `wp post update 8` with modified `post_content`.

### B3 — Verification

- EN `/how-to-help/`: ♥ Donate Now confirmed in rendered HTML [VERIFIED]
- Header Donate button: unchanged, still uses `btn-heart` class [VERIFIED]
- Second Donate Now button (bottom of page, no heart): unchanged [VERIFIED]

### ES page flag ⚠️

**ES page ID 345 (`/es/como-ayudar/`) still has `❤️ Donar Ahora`** — same emoji issue, needs the same ❤️→♥ replacement. Not fixed in this prompt per instructions. Flagged for follow-up.

---

## Files modified

| Location | File | Change |
|----------|------|--------|
| WP media library | 4lg-site-icon.png (ID 392) | New upload (cropped logo) |
| WP options | `site_icon` | Set to 392 |
| WP page 8 | post_content | ❤️→♥ in Donate Now button |

No theme files modified. No git commits.
