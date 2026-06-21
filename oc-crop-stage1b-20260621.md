# Stage 1b: Full Slot-1 Backfill + crop_url Write + Matcher Read Flip

**Date:** 2026-06-21 ~20:10 UTC
**Mode:** DB read-write (crop_url only). One read-path line changed. Service restarted.

---

## 1. Backfill Results

| Metric | Count |
|---|---|
| Total slot-1 photo rows | 689 |
| Successfully cropped | 688 |
| Smart (YOLO detection) | 681 |
| Fallback (center crop, conf < 0.35) | 7 |
| Failed (crop_url left NULL) | 1 |

**Failed row:** S2026101 — source file_url returned HTTP 404 (`https://dogwalker.4lgshelterapp.duckdns.org/data/animal-photos/4859/...`). crop_url left NULL. [VERIFIED: `SELECT crop_url FROM animal_media WHERE shelter_code='S2026101' AND strip_position=1` returns NULL.]

**Fallback rows (7):** S2026208, S2026656, S2025963, S2026623, S2026600, S2026428, S2026621 — all cats, YOLO returned no detection above 0.35 threshold. Center-crop applied, files generated, crop_url populated.

**Species breakdown (smart):** Cat 536, Dog 115, Rabbit 25, Guinea Pig 2, Ferret 2, Chinchilla 1.

---

## 2. crop_url Write Confirmation

| Check | Result |
|---|---|
| crop_url non-null on strip_position=1 | 688 [VERIFIED] |
| crop_url non-null on strip_position≠1 | 0 [VERIFIED] |
| crop_url NULL on slot-1 (the error row) | 1 (S2026101) [VERIFIED] |
| Total rows unchanged | 1844 [VERIFIED] |
| file_url containing "crops" | 0 [VERIFIED] |
| DB ownership | shelter:shelter [VERIFIED] |

**Format match:** crop_url follows the same full-URL pattern as thumbnail_url:
```
crop_url:      https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/crops/S2025966-8613.jpg
thumbnail_url: https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/thumbnails/f3a4da04-...jpg
```
[VERIFIED: both are full https URLs with the same host + `/data/animal-media/` prefix.]

---

## 3. Read Flip — Before/After

**Before (commit 8d3d8b4):**
```typescript
const rows = database.prepare(`
    SELECT shelter_code, file_url, strip_position
    ...
`).all(...codes) as { shelter_code: string; file_url: string; strip_position: number }[];

photoMap.set(row.shelter_code, row.file_url);
```

**After (commit 514c63a):**
```typescript
const rows = database.prepare(`
    SELECT shelter_code, file_url, crop_url, strip_position
    ...
`).all(...codes) as { shelter_code: string; file_url: string; crop_url: string | null; strip_position: number }[];

// Prefer crop_url (smart square crop) when available, else fall back to file_url
photoMap.set(row.shelter_code, row.crop_url || row.file_url);
```

[VERIFIED: `git diff --cached` shows exactly these 4 lines changed in `server/src/localDatabase.ts`. No ordering, filter, strip_position logic, or other code changed.]

**Build:** `npm run build` (tsc) — clean, exit 0. [VERIFIED.]

---

## 4. End-to-End API Verification

Shelter-app restarted after build. Three animals from the live `/api/animals` response:

| shelter_code | API photoUrl | DB crop_url | Match | HTTP |
|---|---|---|---|---|
| S2025966 | `.../crops/S2025966-8613.jpg` | `.../crops/S2025966-8613.jpg` | ✓ | 200 |
| S2026133 | `.../crops/S2026133-8183.jpg` | `.../crops/S2026133-8183.jpg` | ✓ | 200 |
| A2025088 | `.../crops/A2025088-7720.jpg` | `.../crops/A2025088-7720.jpg` | ✓ | 200 |

[VERIFIED: `curl -s http://127.0.0.1:3000/api/animals` returns crop_url as photoUrl; `curl -sI` on each crop URL returns HTTP/2 200.]

---

## 5. No Other Columns Changed

| Check | Result |
|---|---|
| Total row count | 1844 (unchanged from pre-backfill) [VERIFIED] |
| file_url values referencing crops | 0 [VERIFIED] |
| 5 non-SM animals strip_position | All still 1 [VERIFIED] |
| 5 non-SM animals source | Unchanged (activity×4, dashboard-upload×1) [VERIFIED] |
| 5 non-SM animals file_url | Unchanged (dogwalker.../animal-photos/... or library-photos/...) [VERIFIED] |
| 5 non-SM animals has crop_url | Yes (all 5 cropped successfully) [VERIFIED] |

---

## 6. Full-Population Contact Sheets

688 animals across 6 sheets (120 per sheet, 68 on sheet 6). Each shows ORIGINAL (letterboxed to square) beside CROP (800×800 output), labeled with shelter_code, species, method, confidence.

- Sheet 1: crop-stage1b-full-contactsheet-20260621-1.png (7.8 MB)
- Sheet 2: crop-stage1b-full-contactsheet-20260621-2.png (7.7 MB)
- Sheet 3: crop-stage1b-full-contactsheet-20260621-3.png (7.7 MB)
- Sheet 4: crop-stage1b-full-contactsheet-20260621-4.png (7.7 MB)
- Sheet 5: crop-stage1b-full-contactsheet-20260621-5.png (7.8 MB)
- Sheet 6: crop-stage1b-full-contactsheet-20260621-6.png (5.7 MB)

---

## Commit

**Hash:** `514c63a5d27c275479783034a13b7000915f25f0`
**File:** `server/src/localDatabase.ts` (modified — 4 insertions, 3 deletions)

---

## Deviations

None.
