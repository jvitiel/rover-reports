# Crop Re-Backfill — Head-Anchor Fix Applied

**Date:** 2026-06-21 ~21:50 UTC
**Mode:** DB read-write (crop_url only). Worker committed. Crop files overwritten. No read-path change.

---

## 1. Committed Diff

```diff
--- a/scripts/crop-worker.py
+++ b/scripts/crop-worker.py
@@ -129,8 +129,9 @@
             top = y1 - pad_top
         else:
-            # Box taller than crop side — center vertically
-            top = (y1 + y2) / 2 - side / 2
+            # Box taller than crop side — anchor near head with headroom
+            headroom = round(0.10 * side)
+            top = y1 - headroom
         # Clamp to image bounds
         top = max(0, min(top, h - side))
```

**Hash:** `8a72657263be5b2e4aa2b25c4992a9d1490f2898`
**File:** `scripts/crop-worker.py` (3 insertions, 2 deletions)

---

## 2. Re-Backfill Results

| Metric | Count |
|---|---|
| Total slot-1 photo rows | 689 |
| Successfully cropped | 688 |
| Smart (YOLO detection) | 681 |
| Fallback (center crop, conf < 0.35) | 7 |
| Failed (crop_url left NULL) | 1 (S2026101, source 404) |

All 688 crop files overwritten at `data/animal-media/crops/`. All chown shelter:shelter, chmod 644. crop_url re-populated for 688 slot-1 rows.

---

## 3. Head-Jam Ranking (Post-Fix)

| Category | Count | Description |
|---|---|---|
| **Head clipped (N)** | **0** | No animal has its head/face above the crop's top edge |
| **Borderline (~)** | **162** | Head inside but TOP_GAP < 0.05 (tight; usually source image has animal head at very top of frame) |
| **Good (Y)** | **526** | Head inside with ≥5% headroom |

**Zero heads clipped.** Down from ~200 with the old center-vertical approach.

### 12 Worst by Head-Jam

| # | code | species | WxH | conf | TOP_GAP | HEAD |
|---|---|---|---|---|---|---|
| 1 | S2026478 | Cat | 768×1024 | 0.853 | 0.0000 | ~ |
| 2 | S2026473 | Cat | 844×1024 | 0.415 | 0.0000 | ~ |
| 3 | S2026182 | Cat | 768×1024 | 0.606 | 0.0000 | ~ |
| 4 | W2026068 | Cat | 768×1024 | 0.871 | 0.0003 | ~ |
| 5 | S2026541 | Cat | 768×1024 | 0.761 | 0.0003 | ~ |
| 6 | S2025783 | Cat | 768×1024 | 0.870 | 0.0006 | ~ |
| 7 | S2026296 | Cat | 792×1024 | 0.362 | 0.0006 | ~ |
| 8 | S2026175 | Cat | 768×1024 | 0.576 | 0.0007 | ~ |
| 9 | S2026427 | Cat | 768×1024 | 0.689 | 0.0009 | ~ |
| 10 | W2026050 | Cat | 903×1024 | 0.767 | 0.0012 | ~ |
| 11 | S2026546 | Cat | 768×1024 | 0.830 | 0.0012 | ~ |
| 12 | S2026484 | Cat | 768×1024 | 0.914 | 0.0014 | ~ |

All 12 are borderline (~) — head is inside the crop but with <1px gap. These are all cases where the animal's head/ears touch the very top of the source image (box_top ≈ 0), so `top = box_top - headroom` clamps to `top = 0`. The headroom can't add pixels that don't exist in the source. This is a source-image limit, not a worker defect.

---

## 4. Upscale Report (Information Only — NO ACTION TAKEN)

| Source side | Count | % of 688 |
|---|---|---|
| < 500px | 30 | 4.4% |
| 500–699px | 41 | 6.0% |
| 700–799px | 494 | 71.8% |
| ≥ 800px (no upscale) | 123 | 17.9% |
| **Total upscaled** | **565** | **82.1%** |

**Smallest 5:**

| code | source side (px) |
|---|---|
| S2026230 | 196 |
| S2026341 | 260 |
| S2026228 | 323 |
| A2023278 | 360 |
| S2026061 | 370 |

The dominant cohort (72%) is 700–799px, which is the 768px-wide SM portrait photos where `side = min(768, 1024) = 768`. These are enlarged 4% to reach 800px — minimal quality impact.

The 30 photos under 500px are more significantly upscaled (1.6–4× enlargement). S2026230 at 196px is enlarged 4× — these would benefit from higher-resolution source photos if available.

---

## 5. Verification

| Check | Result |
|---|---|
| crop_url non-null on slot-1 | 688 [VERIFIED] |
| crop_url non-null on non-slot-1 | 0 [VERIFIED] |
| S2026101 crop_url | NULL (source 404) [VERIFIED] |
| file_url containing "crops" | 0 [VERIFIED] |
| Total rows | 1844 (unchanged) [VERIFIED] |
| 5 non-SM strip_position | All still 1, sources unchanged [VERIFIED] |
| API check S2025966 | Match ✓, HTTP 200 [VERIFIED] |
| API check A2025088 | Match ✓, HTTP 200 [VERIFIED] |
| API check S2026397 | Match ✓, HTTP 200 [VERIFIED] |

---

## 6. Contact Sheet

12 worst by head-jam: ORIGINAL (letterboxed) vs NEW CROP, labeled with shelter_code, species, confidence, dimensions, TOP_GAP, HEAD status.

Saved to: crop-rebackfill-headjam-20260621.png (3.2 MB)

---

## Deviations

None.
