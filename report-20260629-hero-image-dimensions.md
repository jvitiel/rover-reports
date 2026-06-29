# Hero Image Dimensions Report — 2026-06-29

## 1. Where the Hero Markup Lives

The hero is a **Gutenberg `wp:cover` block** in the `post_content` of page ID 14 (EN homepage). [VERIFIED via WP REST API `/wp-json/wp/v2/pages/14`]. The ES homepage (page 335) uses the same Unsplash image with the same URL. [VERIFIED via `/wp-json/wp/v2/pages/335`].

It is NOT in a theme template file — front-page.php renders the page content, and the cover block is stored in the page's Gutenberg content. Staff can edit it directly in the block editor.

**Exact rendered markup:**
```html
<div class="wp-block-cover alignfull" style="min-height:92vh;aspect-ratio:unset;">
  <img decoding="async"
       class="wp-block-cover__image-background"
       alt=""
       src="https://images.unsplash.com/photo-1444212477490-ca407925329e?w=1800&q=80"
       data-object-fit="cover"/>
  <span aria-hidden="true"
        class="wp-block-cover__background has-charcoal-background-color has-background-dim">
  </span>
  <div class="wp-block-cover__inner-container ...">
    <!-- heading + featured pets grid -->
  </div>
</div>
```

## 2. Source Image

| Property | Value |
|----------|-------|
| **URL** | `https://images.unsplash.com/photo-1444212477490-ca407925329e?w=1800&q=80` |
| **Width parameter** | `w=1800` (requested from Unsplash CDN) |
| **Quality parameter** | `q=80` |
| **Height parameter** | None — Unsplash maintains aspect ratio from width alone |
| **Intrinsic dimensions at w=1800** | **1800 × 1125 px** [VERIFIED via ImageMagick `identify`] |
| **Native aspect ratio** | **8:5 (1.6:1)** — landscape |
| **File size at w=1800, q=80** | 418 KB |
| **Full-res intrinsic dimensions** | 3000 × 1875 px (same 8:5 ratio) [VERIFIED at w=3000] |

## 3. Container Behavior

The cover block renders as a **full-width (100vw) viewport-height-based banner**:

| CSS Property | Value | Source |
|-------------|-------|--------|
| **Width** | `alignfull` → 100% of viewport width (breaks out of content column) | Gutenberg block alignment |
| **min-height** | `92vh` | Inline style on the block |
| **aspect-ratio** | `unset` (explicitly disabled) | Inline style |
| **Image fit** | `object-fit: cover` | WP core Cover block CSS (`.wp-block-cover__image-background`) |
| **Image position** | `width: 100%; height: 100%; object-fit: cover;` — image is absolutely positioned, fills the container, crops to fit | WP core Cover block CSS |
| **Overlay** | Charcoal (#3D3835) dim overlay at 50% opacity | `has-background-dim` class |

**How it renders in practice:**
- The container is 100vw wide × 92vh tall
- On a 1920×1080 monitor: **1920 × 994 px** effective container (~1.93:1 aspect)
- On a 1440×900 monitor: **1440 × 828 px** (~1.74:1)
- On a 375×812 phone: **375 × 747 px** (~0.50:1, portrait!)
- The image is scaled via `object-fit: cover` — it fills the container and **crops** excess. On desktop (wide container) it crops top/bottom. On mobile (tall container) it crops left/right heavily.

## 4. Responsive Handling

**No responsive image handling at all.** [VERIFIED — no `srcset`, no `<picture>`, no media queries targeting the cover block].

- Single `<img>` tag with one fixed URL (`w=1800`)
- No `srcset` attribute
- No `<picture>` element with multiple sources
- No CSS media queries in the theme targeting `.wp-block-cover` with different breakpoints
- The same 1800px-wide, 418 KB image loads on both desktop and mobile

The WP core Cover block CSS has no responsive breakpoints for sizing — it just uses `min-height: 92vh` at all viewport sizes.

## 5. Recommendation for Replacement Photo

**Target dimensions: 2400 × 1600 px minimum (3:2 ratio), landscape orientation.**

Reasoning:
- The container is 92vh tall and 100vw wide — on a 2560px-wide monitor, the image needs to be at least 2400px wide to avoid upscaling [SOP2: derived from common viewport widths]
- `object-fit: cover` will crop the image, and the container aspect ratio varies wildly (from ~2:1 on desktop to ~0.5:1 on mobile) — **the center of the image is what survives at all viewport sizes**
- A 3:2 ratio (instead of the current 8:5) gives slightly more vertical content, which helps on mobile where the tall 92vh container crops deeply into the sides
- Source at **q=85+ JPEG** or lossless — the cover overlay dims to 50%, so the image can tolerate moderate compression

**Critical compositional constraint:** Because `object-fit: cover` crops differently at every viewport, the **subject must be centered** in the frame. Anything important in the outer ~25% of the frame will be cropped on some devices. The current Unsplash image (a person with a dog in a field) works because the subject is roughly centered.

**If responsive images are added later:** Serve 3 sizes — 800px (mobile), 1400px (tablet), 2400px (desktop) — via `srcset`. But that's a separate implementation step.

---

*Read-only diagnosis. No files modified. Generated 2026-06-29 16:46 UTC.*
