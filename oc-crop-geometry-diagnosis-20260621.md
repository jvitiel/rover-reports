# Crop Geometry Diagnosis — Why 18 of 25 Crops Are Identical

**Date:** 2026-06-21 ~19:50 UTC
**Mode:** Read-only. No file writes, no DB writes, no service changes.

---

## 1. Current Crop-Math (commit 8d3d8b4)

```python
# scripts/crop-worker.py lines 99–138

PAD_MULTIPLIER = 1.4          # square side = max(box_w, box_h) * 1.4
PAD_TOP_RATIO = 0.643         # top:bottom vertical padding = 1.8:1

def smart_square_crop(img, box):
    w, h = img.size
    x1, y1, x2, y2, conf, cls_name = box
    box_w, box_h = x2 - x1, y2 - y1
    cx = (x1 + x2) / 2

    # Step A: compute desired side, cap at min(w, h)
    side = min(max(box_w, box_h) * PAD_MULTIPLIER, min(w, h))   # ← THE CAP

    # Step B: horizontal — center on box
    left = max(0, min(cx - side / 2, w - side))

    # Step C: vertical — asymmetric padding
    total_v_pad = side - box_h
    if total_v_pad > 0:
        pad_top = total_v_pad * PAD_TOP_RATIO
        top = y1 - pad_top
    else:
        top = (y1 + y2) / 2 - side / 2           # ← fallback: center vertically

    # Step D: clamp to image bounds
    top = max(0, min(top, h - side))
```
[VERIFIED: scripts/crop-worker.py lines 99–138, commit 8d3d8b4.]

**How the 1a version differed (commit 35c8701):**
```python
side = min(max(box_w, box_h) * 1.3, min(w, h))     # 1.3x instead of 1.4x
# Vertical: centered on box center (symmetric)
top = max(0, min(cy - side / 2, h - side))
```

---

## 2. The Root Cause: Side-Cap Absorbs Both Multipliers

For a typical 768×1024 portrait SM photo (21 of 25 are this or close):

- `min(w, h) = 768` (the width)
- If `max(box_w, box_h)` > 768/1.3 ≈ 590px — the 1a unclamped side exceeds 768 → **capped to 768**
- If `max(box_w, box_h)` > 768/1.4 ≈ 549px — the 1b unclamped side exceeds 768 → **also capped to 768**

Since most SM shelter photos show the animal filling >60% of the frame, the detected box height typically exceeds 590px. **Both multipliers clamp to the same `side = 768`.** With the same side:

- If `box_h ≥ side` → `total_v_pad ≤ 0` → both versions center vertically → **identical crop**
- If `box_h < side` but barely → the few pixels of vertical padding get clamped by image bounds → **identical crop**

**This is a geometric limit, not a bug.** The source images are portrait 3:4, the animals fill most of the frame, and the square crop is limited to the image's narrower dimension (width). There is literally no pixel space to add more headroom without either (a) adding bars/fill, or (b) making the subject smaller.

---

## 3. Full 25-Photo Geometry Table

| # | code | species | WxH | orient | box(x,y,w,h) | conf | uncl_1a | uncl_1b | min(w,h) | crop_1a | crop_1b | ident | headroom_avail | wanted_top | actual_top | class |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | S2026023 | Dog | 819×1024 | P | (196,131,621,805) | 0.865 | 1046.8 | 1127.3 | 819 | (0,124,819) | (0,122,819) | N | 131 | 8.9 | 9.4 | APPLIED |
| 2 | A2025108 | Dog | 574×640 | P | (0,133,460,445) | 0.785 | 599.2 | 645.3 | 574 | (0,66,574) | (0,50,574) | N | 133 | 82.8 | 83.0 | APPLIED |
| 3 | A2024017 | Dog | 768×1024 | P | (146,285,420,733) | 0.853 | 952.9 | 1026.2 | 768 | (0,256,768) | (0,256,768) | Y | 285 | 22.5 | 29.7 | CLAMPED-SIDE |
| 4 | S2026159 | Dog | 768×1024 | P | (243,179,356,774) | 0.844 | 1006.4 | 1083.8 | 768 | (0,182,768) | (0,182,768) | Y | 179 | 0.0 | -2.7 | CLAMPED-SIDE |
| 5 | S2026438 | Cat | 768×1024 | P | (172,336,339,541) | 0.891 | 704.2 | 758.3 | 768 | (0,255,704) | (0,197,758) | N | 336 | 139.1 | 139.7 | APPLIED |
| 6 | S2026407 | Cat | 768×1024 | P | (116,142,606,862) | 0.773 | 1121.3 | 1207.5 | 768 | (0,189,768) | (0,189,768) | Y | 142 | 0.0 | -46.5 | CLAMPED-SIDE |
| 7 | S2026384 | Cat | 768×1024 | P | (86,172,630,486) | 0.830 | 819.6 | 882.7 | 768 | (0,31,768) | (0,0,768) | N | 172 | 180.7 | 172.3 | APPLIED |
| 8 | S2026220 | Cat | 768×1024 | P | (137,478,630,407) | 0.874 | 819.5 | 882.6 | 768 | (0,256,768) | (0,246,768) | N | 478 | 232.0 | 232.6 | APPLIED |
| 9 | S2026175 | Cat | 768×1024 | P | (11,0,743,817) | 0.576 | 1062.2 | 1143.9 | 768 | (0,25,768) | (0,25,768) | Y | 0 | 0.0 | -24.5 | CLAMPED-SIDE |
| 10 | S2026143 | Cat | 768×1024 | P | (220,110,540,900) | 0.566 | 1170.6 | 1260.6 | 768 | (0,176,768) | (0,176,768) | Y | 110 | 0.0 | -65.2 | CLAMPED-SIDE |
| 11 | S2026610 | Cat | 768×1024 | P | (81,155,679,719) | 0.652 | 934.7 | 1006.6 | 768 | (0,131,768) | (0,124,768) | N | 155 | 31.5 | 31.8 | APPLIED |
| 12 | S2025206 | Cat | 480×640 | P | (65,99,395,538) | 0.695 | 700.0 | 753.9 | 480 | (0,129,480) | (0,129,480) | Y | 100 | 0.0 | -29.0 | CLAMPED-SIDE |
| 13 | S20251236 | Cat | 768×1024 | P | (104,59,553,804) | 0.860 | 1045.4 | 1125.8 | 768 | (0,77,768) | (0,77,768) | Y | 59 | 0.0 | -17.2 | CLAMPED-SIDE |
| 14 | S2026149 | Cat | 1024×1006 | L | (14,74,880,899) | 0.581 | 1169.2 | 1259.2 | 1006 | (0,0,1006) | (0,0,1006) | Y | 74 | 68.5 | 74.5 | CLAMPED-TOP |
| 15 | S2026379 | Cat | 768×1024 | P | (94,174,673,806) | 0.811 | 1048.2 | 1128.8 | 768 | (0,193,768) | (0,193,768) | Y | 174 | 0.0 | -18.2 | CLAMPED-SIDE |
| 16 | S2026394 | Cat | 917×1024 | P | (0,92,885,920) | 0.807 | 1197.0 | 1289.1 | 917 | (0,94,917) | (0,94,917) | Y | 92 | 0.0 | -1.5 | CLAMPED-SIDE |
| 17 | W2026048 | Cat | 768×1024 | P | (0,127,768,823) | 0.797 | 1071.1 | 1153.5 | 768 | (0,155,768) | (0,155,768) | Y | 128 | 0.0 | -27.0 | CLAMPED-SIDE |
| 18 | S20251152 | Cat | 965×1024 | P | (154,146,588,829) | 0.862 | 1078.0 | 1160.9 | 965 | (0,59,965) | (0,58,965) | N | 146 | 87.3 | 88.2 | APPLIED |
| 19 | S2026357 | Cat | 768×1024 | P | (1,125,658,783) | 0.715 | 1018.2 | 1096.5 | 768 | (0,133,768) | (0,133,768) | Y | 125 | 0.0 | -7.4 | CLAMPED-SIDE |
| 20 | S2026605 | Cat | 768×1024 | P | (3,11,764,975) | 0.358 | 1268.8 | 1366.4 | 768 | (0,115,768) | (0,115,768) | Y | 11 | 0.0 | -103.7 | CLAMPED-SIDE |
| 21 | S2026381 | Cat | 768×1024 | P | (93,78,555,943) | 0.836 | 1227.1 | 1321.5 | 768 | (0,166,768) | (0,166,768) | Y | 78 | 0.0 | -87.7 | CLAMPED-SIDE |
| 22 | S2026638 | Cat | 768×1024 | P | (0,179,767,841) | 0.831 | 1094.1 | 1178.3 | 768 | (0,215,768) | (0,215,768) | Y | 179 | 0.0 | -36.0 | CLAMPED-SIDE |
| 23 | S2026441 | Cat | 791×1024 | P | (29,82,563,939) | 0.779 | 1220.8 | 1314.7 | 791 | (0,156,791) | (0,156,791) | Y | 82 | 0.0 | -73.6 | CLAMPED-SIDE |
| 24 | S2026190 | Rabbit | 1024×963 | L | (52,95,943,847) | 0.776 | 1227.0 | 1321.4 | 963 | (42,0,963) | (42,0,963) | Y | 95 | 74.2 | 95.6 | CLAMPED-TOP |
| 25 | S2026454 | Cat | 768×1024 | P | (0,144,588,781) | 0.885 | 1015.6 | 1093.8 | 768 | (0,150,768) | (0,150,768) | Y | 144 | 0.0 | -6.0 | CLAMPED-SIDE |

**Column key:**
- `uncl_1a` / `uncl_1b`: unclamped side before min(w,h) cap
- `crop_1a` / `crop_1b`: final crop rect (left, top, side)
- `headroom_avail`: pixels above box top in source (= box_y1)
- `wanted_top`: the extra top padding the 1b asymmetric logic wanted to apply
- `actual_top`: actual pixels from box_y1 to crop top (negative = box extends above crop top)

---

## 3. Headline Classification

| Classification | Count | Explanation |
|---|---|---|
| **APPLIED** | **7** | Padding change produced a different crop |
| **CLAMPED-SIDE** | **16** | Both 1a and 1b exceed `min(w,h)` → same side. Of these 16: **15 have box_h ≥ side** (zero vertical padding to redistribute), **1** (A2024017) has 35px slack but bottom-edge clamp forces identical position |
| **CLAMPED-TOP** | **2** | Same side, crop already at y=0 (image top), no room to shift up |
| **SLACK-BUG** | **0** | None |

**Of the 18 identical crops: all 18 are geometric limits. Zero are bugs.**

The fundamental constraint: SM shelter photos are 768×1024 portrait (3:4). The square crop is capped at `min(w,h) = 768`. When the animal's detected bounding box is taller than 768px (which it is in 15 of 18 cases — animals fill the frame), there is **no vertical padding at all**. The `total_v_pad` is zero or negative, and the `PAD_TOP_RATIO` multiplier has nothing to multiply against.

---

## 4. What Would Need to Change

The padding tune is correct but has no effect when `side = min(w,h)` and `box_h ≥ side`. To add headroom in these cases, the worker would need one of:

1. **Shrink the subject** — use a side smaller than `min(w,h)`, e.g. cap at `min(w,h) * 0.85`, so box_h < side and vertical padding exists. Tradeoff: smaller animal in the 800×800 output.
2. **Add background fill** — allow the square to exceed image bounds and fill with a solid/blurred color. Tradeoff: artificial borders visible.
3. **Accept the limit** — for photos where the animal fills the full width, the 768×768 center crop of a 768×1024 source is geometrically the best possible square crop. The animal IS the frame.

This is a source-photo / taste tradeoff, not a worker-logic fix. The asymmetric padding works correctly for the 7 photos where there IS slack.

---

## Deviations

None.
