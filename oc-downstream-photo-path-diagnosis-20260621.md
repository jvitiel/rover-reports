# Downstream Photo Path Diagnosis — All Public-Facing Views

**Date:** 2026-06-21 ~17:50 UTC
**Mode:** Read-only. No DB writes, no code changes, no service modifications.

---

## 1. MATCHER Opening — Results Grid Card

**(a) SOURCE:** `photoUrl` field from `/api/animals` response (server.ts:962). This endpoint calls `enrichWithLocalPhotos()` (localDatabase.ts:5129), which queries:
```sql
SELECT file_url FROM animal_media
WHERE media_type = 'photo' AND hidden = 0 AND strip_position > 0
  AND shelter_code IN (...)
ORDER BY shelter_code ASC, strip_position ASC
```
First row per animal wins → **slot-1 photo** (lowest strip_position > 0). [VERIFIED: localDatabase.ts:5138-5147.]

**(b) RENDER:** Fixed-height box, `object-fit: contain`:
```css
.animal-card-photo { width: 100%; height: 220px; overflow: hidden; }
.animal-card-photo img { width: 100%; height: 100%; object-fit: contain; }
```
[VERIFIED: matcher-web/styles.css:503-518.]

Photo renders at native aspect inside a 220px-tall box. Portrait 3:4 photos leave horizontal padding (glow gradient visible). A square photo would fill more of the box.

**(c) CROP IMPACT: HELP.** The 220px-tall, 100%-wide box is roughly square on typical card widths (~200-250px). A square crop would fill the box better than the current 3:4 portrait, which letterboxes horizontally. `object-fit: contain` means no distortion either way.

---

## 2. MATCHER Clickthrough — Detail Modal

**(a) SOURCE:** Two sources:
- **Lead media:** If `animal.video_url` exists → slot-2 video. Otherwise → `animal.photoUrl` (slot-1, same as opening). [VERIFIED: matcher-web/app.js:937-947.]
- **Gallery:** Fetches `/api/photos/{animalId}` → returns full strip (positions 1-6). Thumbnails built from strip positions 2+ (photos only), with slot-1 added as first thumbnail when video is lead. [VERIFIED: matcher-web/app.js:996-1019.]

**(b) RENDER:** Gallery main area and thumbnails, both `object-fit: contain`:
```css
.gallery-main img, .gallery-main video {
  width: 100%; height: 100%; object-fit: contain; object-position: top;
}
.gallery-grid-item img {
  width: 100%; height: 100%; object-fit: contain;
}
```
[VERIFIED: matcher-web/styles.css:752-779.] Gallery height is 500px (styles.css:743).

**(c) CROP IMPACT: NEUTRAL.** `object-fit: contain` handles any aspect ratio. A square crop would slightly reduce the visible photo area in the tall gallery container (500px), but no distortion. When video leads, slot-1 appears as a thumbnail — square would fill the thumbnail better.

---

## 3. SEARCHER Opening — Search Results

**(a) SOURCE:** `match.photo_url` from `/api/matcher/custom-search` response. This field is set at server.ts:5815: `photo_url: animal.photoUrl || null`, where `animal` comes from `enrichWithLocalPhotos()` → **slot-1 photo** (same shared query as matcher). Video: `match.video_url` from `animal_media WHERE media_type='video'` (server.ts:5787-5790), NOT slot-specific — just first non-hidden video by `captured_at DESC`. [VERIFIED: server.ts:5782-5815.]

If the animal has a `video_url`, the opening shows the video (custom-search/app.js:462-475). Otherwise, the slot-1 photo (app.js:476-485).

**(b) RENDER:** Photo/video fills 40% column with natural aspect, NO `object-fit`:
```css
.result-media { flex: 0 0 40%; max-width: 40%; }
.result-media video, .result-media img {
  width: 100%; display: block; border-radius: 12px;
}
```
[VERIFIED: custom-search/styles.css:545-556.] No `height` or `object-fit` set — image renders at natural aspect ratio, width-constrained to 40% of row.

**(c) CROP IMPACT: NEUTRAL.** No fixed container forces a shape. A square crop would render as a square (width=40% of row, height=same). Current 3:4 portrait renders taller. Neither distorts. The photo shows only when there's no video — most results will lead with video.

---

## 4. SEARCHER Clickthrough — Detail Popup

**(a) SOURCE:** Lead image = `match.photo_url` (slot-1). Gallery fetches `/api/photos/{shelter_code}` for remaining strip photos (positions 2+, photos only). [VERIFIED: custom-search/app.js:522-524 and 547-572.]

**(b) RENDER:** Main image `object-fit: contain`, thumbnails `object-fit: cover`:
```css
.popup-main-img {
  max-height: 560px; max-width: 100%; width: auto;
  object-fit: contain; display: block; margin: 0 auto;
}
.popup-thumb img { width: 100%; height: 80px; object-fit: cover; }
```
[VERIFIED: custom-search/styles.css:673-709.]

**(c) CROP IMPACT: NEUTRAL.** Main image uses `contain` — any aspect works. Thumbnails use `cover` at 80px height — a square crop would be slightly cropped to fill, but 80px thumbnails tolerate any aspect. No distortion.

---

## 5. HOMEPAGE Opening — Featured Animals Grid

**(a) SOURCE:** Featured-slots data is server-rendered into WordPress HTML as `data-animal` JSON attributes (with `photo_url` from `buildFeaturedAnimalData` → `animal_media WHERE strip_position > 0 ORDER BY strip_position ASC LIMIT 1` [VERIFIED: server.ts:2783-2789]). However, the opening view shows **slot-2 VIDEO**, not the photo:
```html
<video autoplay loop muted playsinline poster="...thumbnails/UUID.jpg"
  style="width:100%; height:280px; object-fit:cover; object-position:center 20%;">
  <source src="...videos/UUID.mp4" type="video/mp4">
</video>
```
[VERIFIED: live WP homepage HTML, all 6 featured cards have `<video>` elements.]

The `photo_url` in `data-animal` is the slot-1 photo but is NOT displayed in the opening view — only in the clickthrough modal.

**(b) RENDER:** Video with `object-fit: cover` at 280px height. Slot-1 photo is NOT rendered here.

**(c) CROP IMPACT: N/A (slot-1 photo not displayed).** The opening view shows the slot-2 video, not the slot-1 photo. A slot-1 crop has zero effect on this view.

---

## 6. HOMEPAGE Clickthrough — Featured Animal Modal

**(a) SOURCE:** `photo_url` from the `data-animal` JSON embedded in the card (= slot-1 photo from `buildFeaturedAnimalData`). Gallery loads additional photos from `/api/photos/{shelterCode}` via fetch to `dashboard.4lgshelterapp.duckdns.org`. [VERIFIED: WP homepage inline JS, `openPetModal` function + `loadModalGallery` call.]

**(b) RENDER:** Gallery placeholder and main image use `object-fit: contain`:
```css
.gallery-placeholder { width: 100%; height: 100%; object-fit: contain; }
.gallery-main img { width: 100%; height: 100%; object-fit: contain; object-position: top; }
```
[VERIFIED: WP homepage inline CSS.]

Modal gallery height is flexible (min-height: 400px).

**(c) CROP IMPACT: NEUTRAL.** `object-fit: contain` handles any aspect. A square crop would fill slightly more of the gallery area than 3:4 portrait, but no distortion or clipping.

---

## Q7 — Shared-Source Confirmation

**All six views resolve photos from the same `animal_media` table in `shelter.db`.** Three paths converge:

| Path | Used by | Query |
|---|---|---|
| `enrichWithLocalPhotos()` | Matcher opening, Searcher opening/clickthrough | `animal_media WHERE strip_position > 0 ORDER BY strip_position ASC` → lowest pos photo |
| `buildFeaturedAnimalData()` | Homepage opening/clickthrough | Same query: `animal_media WHERE strip_position > 0 ORDER BY strip_position ASC LIMIT 1` |
| `/api/photos/{id}` | All three clickthroughs (gallery) | Full strip: `animal_media WHERE strip_position BETWEEN 1 AND 6` |

[VERIFIED: localDatabase.ts:5138 for enrichWithLocalPhotos; server.ts:2783 for buildFeaturedAnimalData; both query `animal_media` directly.]

**No separate copy, cache, or independent store.** The WordPress homepage embeds a server-rendered snapshot of the data at page-generation time, but the underlying data source is the same `animal_media` table. WordPress cache busting occurs when featured animals change (server.ts:1280, 2411, 2444).

**A slot-1 crop stored in `animal_media` propagates to all six views automatically.**

---

## Q8 — Searcher Opening Video

The searcher's opening video is **pre-generated and stored**, not generated per-search.

**Production path:** Dashboard operator clicks "Generate Video" → POST `/api/generate-video` with `source_media_id` (the operator picks which photo) → xAI generates video from that photo's URL → video saved to `data/animal-media/videos/` → inserted into `animal_media` at strip_position=2.
[VERIFIED: server.ts:4055-4150.]

**The video input is operator-selected, NOT automatically slot-1.** The `source_media_id` comes from `req.body` (server.ts:4057), meaning the dashboard operator chooses which photo to animate. It could be slot-1, slot-3, or any library photo. The slot-1 crop does NOT automatically feed video generation — it only would if the operator manually selected the cropped slot-1 photo as the video source for a future generation.

**Stored, not discarded:** The video persists in `animal_media` at strip_position=2 and is reused across all future searches and page loads.

**The searcher opening video is NOT seeded from slot-1 by default.** A slot-1 crop does not affect existing videos.

---

## Q9 — Where the Crop Shows Up

| View | Slot-1 crop surfaces? | Impact |
|---|---|---|
| 1. Matcher opening (grid card) | ✅ Yes | **HELP** — fills the ~square card better than 3:4 |
| 2. Matcher clickthrough (modal gallery) | ✅ Yes (as lead photo or first thumbnail) | **NEUTRAL** — `object-fit: contain` handles any aspect |
| 3. Searcher opening (results) | ✅ Yes (photo fallback when no video) | **NEUTRAL** — natural aspect, no forced shape |
| 4. Searcher clickthrough (popup) | ✅ Yes (main image) | **NEUTRAL** — `object-fit: contain` |
| 5. Homepage opening (featured grid) | ❌ No (video leads, not photo) | N/A |
| 6. Homepage clickthrough (modal) | ✅ Yes (initial photo before gallery loads) | **NEUTRAL** — `object-fit: contain` |
| Searcher video generation | ❌ No (operator-selected source, not auto slot-1) | N/A |

**Headline:** The slot-1 crop surfaces in **5 of 6 views** (all except homepage opening which shows video). It **helps** the matcher grid card and is **neutral** everywhere else. It **breaks nothing** — every render surface uses `object-fit: contain` or natural-aspect rendering.

---

## Q10 — Video-vs-Photo Note

**Confirmed:** The slot-2 video and the slot-1 photo are **different slots** in `animal_media`. The slot-1 crop does NOT affect:

- **Homepage opening video** — sourced from a `<video>` element pointing at the featured-slot's specific media (slot-2 video from `featured_slots` table → `animal_media` video row). The `photo_url` in the data attribute is slot-1 but is not rendered in the opening view.
- **Searcher opening video** — sourced from `animal_media WHERE media_type='video'` (first by `captured_at DESC`), completely independent of slot-1.
- **Matcher opening video** — when the matcher card shows a video (`animal.video_url`), it's the slot-2 video from the `/api/animals` response (server.ts:928 `WHERE strip_position = 2`).

**The crop's blast radius excludes all videos.** Videos are a separate media type at a separate strip position, generated from an operator-selected source photo (not auto-linked to slot-1). Existing videos will not change.

---

## Deviations

None.
