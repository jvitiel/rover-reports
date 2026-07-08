# Searcher Library-Media Leak Diagnosis — 2026-07-08

## 1. GET /api/animals (Photo-Browser) — CORRECT Path

**Video selection** (server.ts:1020–1025):
```sql
SELECT shelter_code, file_url
FROM animal_media
WHERE media_type = 'video' AND strip_position = 2 AND hidden = 0
```
Constraint: **`strip_position = 2`** — only the designated public video slot. [VERIFIED]

**Photo selection** via `enrichWithLocalPhotos()` (localDatabase.ts:4703–4710):
```sql
SELECT shelter_code, file_url, crop_url, strip_position
FROM animal_media
WHERE media_type = 'photo'
  AND hidden = 0
  AND strip_position > 0
  AND shelter_code IN (...)
ORDER BY shelter_code ASC, strip_position ASC
```
Constraint: **`strip_position > 0`** — only public-strip photos (slots 1–6). [VERIFIED]

Both paths correctly enforce the public-strip boundary.

## 2. POST /api/matcher/custom-search (SEARCHER) — BROKEN Path

**Video selection** (server.ts:6227–6230):
```sql
SELECT file_url FROM animal_media
WHERE shelter_code = ? AND media_type = 'video' AND hidden = 0
ORDER BY captured_at DESC LIMIT 1
```
Constraint: **`hidden = 0` only** — no `strip_position` filter at all. Picks the most-recently-captured non-hidden video regardless of whether it's in the public strip or the staff library. [VERIFIED]

**Photo selection**: The SEARCHER uses `enrichWithLocalPhotos()` for photos (called at line 5012), which correctly filters `strip_position > 0`. **The photo path is not affected.** The leak is video-only. [VERIFIED]

## 3. THE KEY DIFF

| Aspect | GET /api/animals (correct) | POST custom-search (broken) |
|---|---|---|
| Video query | `strip_position = 2 AND hidden = 0` | `hidden = 0` (no strip_position filter) |
| Order | N/A (exact slot match) | `ORDER BY captured_at DESC LIMIT 1` |
| Result | Public-strip slot 2 video only | Most recent non-hidden video from ANY source |

**The SEARCHER's video query is missing `AND strip_position = 2`** (or at minimum `AND strip_position > 0`). It selects the most recent non-hidden video by `captured_at`, which picks library items (strip_position = 0) when they are newer than the public-strip video. [VERIFIED]

## 4. Dante's Media Rows (S20241099)

### Videos

| id | source | strip_position | hidden | captured_at | Role |
|---|---|---|---|---|---|
| `7b85b8bb-...` | grok_imagine | **0** (library) | 0 | 2026-06-27 | ← **SEARCHER picks this** (most recent) |
| `b02d4487-...` | grok_imagine | **2** (public strip) | 0 | 2026-04-27 | ← **GET /api/animals picks this** (slot 2) |

The SEARCHER picks `7b85b8bb` (library, strip_position=0, captured 2026-06-27) because it's newer.
GET /api/animals picks `b02d4487` (public strip slot 2, captured 2026-04-27) because it constrains to `strip_position = 2`. [VERIFIED]

### Photos (14 rows)

| strip_position | count | note |
|---|---|---|
| 0 (library) | 8 | Activity photos, dashboard uploads, sm-sync; 2 are hidden |
| 1 | 1 | SM primary photo (public) |
| 3 | 1 | Activity photo (public) |
| 4 | 1 | SM photo (public) |
| 5 | 1 | SM photo (public) |

Photos are not affected — `enrichWithLocalPhotos()` correctly filters `strip_position > 0` for both paths. [VERIFIED]

## 5. Scope of Exposure

**This is systemic, not Dante-only.**

Of 84 animals with at least one non-hidden video:

| Scenario | Count | Impact |
|---|---|---|
| SEARCHER picks **public-strip** video (correct) | 74 | No issue — most recent video happens to be the public one |
| SEARCHER picks **library** video (LEAK) | **10** | Staff-only/library video shown to public users |

Of the 10 affected animals:

| Sub-case | Count | Meaning |
|---|---|---|
| Has public-strip video too (wrong video shown) | **6** | SEARCHER shows library video instead of the correct public one (includes Dante) |
| No public-strip video (library-only leak) | **4** | SEARCHER shows a library video where /api/animals would show nothing |

**Affected shelter codes:** A2023228, A2024112, A2026061, A2026067, R2024016, R2026007, S20241099, S2025966, S2026028, S2026558

8 of the 10 library videos are `grok_imagine` source; 2 are `manual_upload`. All have `strip_position = 0` (library).

## Summary

**Root cause:** The SEARCHER's video query (server.ts:6227–6230) lacks the `strip_position` constraint that the photo-browser's video query (server.ts:1020–1023) enforces. It selects any non-hidden video by recency, which surfaces library items when they're newer than the public-strip video.

**Fix (not applied — diagnosis only):** Add `AND strip_position = 2` (or `AND strip_position BETWEEN 1 AND 6`) to the SEARCHER's video query at server.ts:6229.

**Scope:** 10 animals currently affected (12% of animals with video). 6 of those have a correct public video that gets bypassed; 4 have only library videos that should not appear publicly at all. The leak is video-only — photo selection correctly uses `strip_position > 0` in both paths.
