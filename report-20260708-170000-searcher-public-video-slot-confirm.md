# Searcher Public-Video Slot Confirmation — 2026-07-08

## 1. Strip Position Semantics

`animal_media.strip_position` defines the public/library boundary:

| strip_position | Meaning |
|---|---|
| **0** | **Library** (staff-only, not public) |
| **1–6** | **Public strip** (the 6 publicly-visible slots) |

The codebase is explicit. `getStripPhotos()` (localDatabase.ts:4407) uses `strip_position > 0`; `getLibraryPhotos()` (localDatabase.ts:4415) uses `strip_position = 0`. [VERIFIED]

**Slot 2 is reserved for video.** The `addPhotoToStrip()` function (localDatabase.ts:4468) documents: "Slot-2 reserved for video: cascade from slot 3 upward, skip slot 2 entirely." When a photo is inserted at position 1, the cascade pushes 1→3, 3→4, 4→5, 5→6, 6→library — slot 2 is never assigned a photo by the strip management code. [VERIFIED]

## 2. Public Video = Slot 2 Only, or a Range?

**Canonical is slot 2, but not exclusive in practice.**

Distribution of non-hidden public-strip videos:

| strip_position | count | notes |
|---|---|---|
| 1 | 1 | S2024694 — only video, no slot-2 video exists |
| **2** | **79** | Canonical video slot — 96.3% of all public videos |
| 3 | 1 | A2025138 — also has a slot-2 video |
| 4 | 1 | S2026133 — also has a slot-2 video |
| 5 | 1 | A2024185 — also has a slot-2 video |

[VERIFIED via SELECT]

Of the 4 non-slot-2 public videos:
- **3 animals** (A2025138, S2026133, A2024185) also have a slot-2 video. These are extra videos placed in photo slots — the slot-2 video is the primary.
- **1 animal** (S2024694) has its only public video at slot 1, with no slot-2 video. This is an edge case where the video was placed in the primary photo slot.

**Correct constraint for the fix: `strip_position = 2`** is right for 79 of 83 public-video animals (95.2%). Using `strip_position BETWEEN 1 AND 6` would be more inclusive and catch S2024694, but the photo-browser already uses `strip_position = 2` and the architecture designates slot 2 as the video slot. The SEARCHER should match the photo-browser's constraint for consistency. S2024694's slot-1 video is an anomaly that should be addressed separately (move it to slot 2) rather than by widening the filter. [INFERRED — architectural judgment, but the code evidence strongly supports slot 2 as canonical]

## 3. SEARCHER Photo Fallback

The SEARCHER's photo selection uses `enrichWithLocalPhotos()` (called at server.ts:5012), which queries:

```sql
SELECT shelter_code, file_url, crop_url, strip_position
FROM animal_media
WHERE media_type = 'photo'
  AND hidden = 0
  AND strip_position > 0
  AND shelter_code IN (...)
ORDER BY shelter_code ASC, strip_position ASC
```
(localDatabase.ts:4703–4710)

It takes the lowest `strip_position` photo per animal (slot 1 = primary public photo). **This already correctly restricts to public-strip photos only** (`strip_position > 0`). [VERIFIED]

The response builder (server.ts:6255) uses `animal.photoUrl` which was set by `enrichWithLocalPhotos()`. When no public video exists (after adding the `strip_position = 2` constraint), the front-end will fall back to the photo. **The photo path is already public-strip-safe.** [VERIFIED]

## 4. Library-Only-Video Animals — Pic Fallback Confirmation

These 4 animals have library videos (strip_position=0) but no public-strip video. With the fix, they would return `video_url: null` and the front-end falls back to their photo.

| shelter_code | public_photo_count | first_photo_slot | Fallback OK? |
|---|---|---|---|
| A2023228 | 6 | 1 | ✅ Yes |
| A2024112 | 6 | 1 | ✅ Yes |
| A2026067 | 5 | 1 | ✅ Yes |
| R2026007 | 1 | 1 | ✅ Yes |

[VERIFIED via SELECT]

All 4 have at least one public-strip photo at slot 1. They will display their primary public photo instead of a video. No animal would show a blank/broken result.

## Summary

- **Public video = strip_position 2** (canonical, 96% of public videos). The photo-browser uses `= 2`; the SEARCHER fix should match.
- **SEARCHER photo path already restricts to public strip** (`strip_position > 0` via `enrichWithLocalPhotos`). No fix needed there.
- **All 4 library-only-video animals have public-strip photos** to fall back to. No blank results after the fix.
- **One edge case:** S2024694 has its only public video at slot 1 (not slot 2). Using `strip_position = 2` would miss it. This is a data anomaly (video in a photo slot) best fixed by moving it to slot 2, not by widening the SEARCHER filter.
