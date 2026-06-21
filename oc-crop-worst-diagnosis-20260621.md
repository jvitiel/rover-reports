# Worst Crop Diagnosis — Root-Cause Split

**Date:** 2026-06-21 ~21:00 UTC
**Mode:** Read-only. No DB writes, no file changes, no service modifications.

---

## BADNESS Formula

```
BADNESS = CLIP_FRAC × 4  +  TOP_JAM × 3  +  FILL_EXCESS × 3

where:
  CLIP_FRAC  = fraction of detected box area outside the crop square (0–1)
  TOP_JAM    = max(0, 0.05 − TOP_GAP) × 20   → 1.0 when head at crop edge, 0 when ≥5% gap
  FILL_EXCESS = max(0, FILL − 0.8) × 2.5     → 1.0 when animal fills 120% of crop, 0 when ≤80%
  TOP_GAP    = (box_top − crop_top) / side    → signed; ≤0 means head above crop top
  FILL       = max(box_w, box_h) / side       → ≥1 means animal overflows crop
```

Weights: CLIP (4) > TOP_JAM (3) = FILL_EXCESS (3). The A2026025 signature — animal clipped with head jammed to top — scores highest.

---

## Crop-Math Quote (commit 8d3d8b4)

```python
side = min(max(box_w, box_h) * 1.4, min(w, h))      # ← capped at source narrow dimension
left = max(0, min(cx - side/2, w - side))              # horizontal: center on box
total_v_pad = side - box_h
if total_v_pad > 0:
    top = y1 - total_v_pad * 0.643                     # asymmetric top-heavy padding
else:
    top = (y1 + y2) / 2 - side / 2                     # box taller than side → center vertically
top = max(0, min(top, h - side))                       # clamp to image bounds
```

---

## 17-Row Table: 15 Worst + A2026025 ★ + 2 Controls ✓

| # | code | species | WxH | conf | box(x,y,w,h) | crop(x,y,s) | CLIP | TOP_GAP | FILL | ZOOM | BAD | tag |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | S2026179 | Cat | 472×1024 | 0.544 | (0,8,472,979) | (0,261,472) | 0.518 | -0.537 | 2.075 | 1.000 | 46.9 | |
| 2 | A2026042 | Dog | 406×789 | 0.515 | (21,116,341,671) | (0,248,406) | 0.395 | -0.327 | 1.653 | 1.000 | 30.6 | |
| 3 | S2026091 | Cat | 460×1024 | 0.877 | (27,179,427,738) | (0,318,460) | 0.377 | -0.302 | 1.604 | 1.000 | 28.7 | |
| 4 | S2026536 | Cat | 571×1024 | 0.752 | (15,148,556,866) | (0,295,571) | 0.340 | -0.258 | 1.516 | 1.000 | 25.2 | |
| 5 | S2024718 | Dog | 628×1024 | 0.876 | (88,5,510,923) | (0,152,628) | 0.320 | -0.235 | 1.470 | 1.000 | 23.4 | |
| 6 | S2026359 | Cat | 604×1024 | 0.842 | (44,55,460,884) | (0,195,604) | 0.317 | -0.232 | 1.464 | 1.000 | 23.2 | |
| 7 | A2024053 | Dog | 599×1024 | 0.815 | (122,63,424,864) | (0,195,599) | 0.306 | -0.221 | 1.442 | 1.000 | 22.3 | |
| 8 | A2025141 | Dog | 576×1024 | 0.923 | (1,157,510,830) | (0,284,576) | 0.306 | -0.221 | 1.442 | 1.000 | 22.3 | |
| 9 | A2025088 | Dog | 668×1024 | 0.878 | (46,63,532,956) | (0,207,668) | 0.301 | -0.215 | 1.431 | 1.000 | 21.9 | |
| 10 | S2026622 | Cat | 659×1024 | 0.878 | (0,86,659,931) | (0,222,659) | 0.292 | -0.206 | 1.413 | 1.000 | 21.1 | |
| 11 | S2026315 | Cat | 576×1024 | 0.881 | (0,208,576,810) | (0,325,576) | 0.289 | -0.203 | 1.407 | 1.000 | 20.9 | |
| 12 | S2024908 | Cat | 576×1024 | 0.856 | (65,85,511,798) | (0,196,576) | 0.278 | -0.193 | 1.385 | 1.000 | 20.1 | |
| 13 | S2026135 | Cat | 637×1024 | 0.829 | (73,148,489,876) | (0,267,637) | 0.273 | -0.188 | 1.375 | 1.000 | 19.7 | |
| 14 | S2026343 | Cat | 656×1024 | 0.811 | (84,12,469,902) | (0,135,656) | 0.273 | -0.187 | 1.374 | 1.000 | 19.6 | |
| 15 | S2026538 | Cat | 709×1024 | 0.868 | (119,42,480,960) | (0,167,709) | 0.261 | -0.177 | 1.354 | 1.000 | 18.8 | |
| 16 | A2026025 | Dog | 768×1024 | 0.799 | (202,150,415,873) | (0,202,768) | 0.120 | -0.068 | 1.137 | 1.000 | 10.1 | ★REF |
| 17 | S2026144 | Cat | 997×1024 | 0.802 | (53,180,754,676) | (0,0,997) | 0.000 | 0.180 | 0.756 | 1.000 | 0.0 | ✓CTL |
| 18 | S2026297 | Dog | 768×1024 | 0.895 | (214,302,344,599) | (0,194,768) | 0.000 | 0.141 | 0.780 | 1.000 | 0.0 | ✓CTL |

---

## A2026025 Reference Case

- **Source:** 768×1024 portrait (3:4), full-body dog standing.
- **Box:** (202, 150, 415, 873) — correctly detects the full dog body, head to feet. Box height 873px.
- **Crop:** (0, 202, 768) — side = min(768, 1024) = 768. The crop is already at maximum width.
- **Problem:** Box height (873) > crop side (768). The crop can only show 768 vertical pixels, so 105px of the dog's body (bottom) gets clipped. `CLIP_FRAC = 0.120`, `FILL = 1.137`.
- **The box is correct.** The crop geometry has no room to expand.

---

## Root-Cause Split

| Classification | Count | Description |
|---|---|---|
| **BAD-CROP** | **15 + A2026025 = 16** | Box correctly detects the full animal. Crop is at maximum width (`zoom = 1.000`). Animal's vertical extent exceeds the square side (`FILL > 1.0`). Clipping is a geometry limit. |
| **BAD-BOX** | **0** | No cases where YOLO boxed only part of the animal. |
| **BOTH/OTHER** | **0** | — |

**Every worst crop has the same signature:**

1. Source is portrait (aspect ratio 0.46–0.75), height ≫ width.
2. YOLO correctly detects the full animal body (box covers 46–96% of image area).
3. `side = min(w, h)` caps the crop at the source width — can't go wider.
4. `box_h > side` means the animal is taller than the crop is wide → bottom gets clipped.
5. The crop vertically centers the box (since `total_v_pad ≤ 0`), but centering a too-tall box in a too-short square still clips top and bottom.

**The fix is geometry-side, not detection-side.** The boxes are correct. Two approaches:

- **Option A: Reduce crop side** — e.g. `side = min(max(bw, bh) * 1.4, min(w, h) * 0.85)` — makes the crop smaller than full width, so the animal fits inside. Tradeoff: lower resolution (the subject occupies fewer pixels of the 800×800 output), more background visible.
- **Option B: Allow overshoot with fill** — let the crop extend beyond image bounds and fill with a solid/blurred background. Tradeoff: artificial borders visible; more complex.

The worst cases (S2026179 at ar=0.46, FILL=2.08) are extreme narrow portraits where the animal literally occupies the full image height. These will always be challenging for a square crop without significant subject shrinkage.

---

## Population Distribution

| Metric | Value |
|---|---|
| Total crops analyzed | 688 |
| Mean BADNESS | 6.622 |
| Median BADNESS | 5.321 |
| Worst BADNESS | 46.875 (S2026179) |
| A2026025 rank | 210 of 688 |
| BADNESS = 0 (no clipping at all) | — only the controls approach 0 |

A2026025 ranks #210 — it's not even in the worst 200. The confirmed-bad crops are far worse. The top 15 all have `CLIP_FRAC > 0.26` and `FILL > 1.35`.

---

## Controls (2 Best)

- **S2026144** (Cat, 997×1024): Near-square source, box fits inside crop with 18% top gap. BADNESS = 0.0. No clipping.
- **S2026297** (Dog, 768×1024): Box is shorter than crop side (FILL = 0.78), 14% top gap. BADNESS = 0.0. No clipping.

These work because the detected animal is shorter (or narrower) than the crop side — there's room for padding.

---

## Deviations

None.
