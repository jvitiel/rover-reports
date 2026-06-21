# Crop Fix Prove-out — Head-Anchor on Scratch Copy

**Date:** 2026-06-21 ~21:30 UTC
**Mode:** Scratch only. No live worker change, no crop_url writes, no service change.

---

## The Edit

**Old (commit 8d3d8b4, line 129–131):**
```python
        else:
            # Box taller than crop side — center vertically
            top = (y1 + y2) / 2 - side / 2
```

**New (scratch copy only):**
```python
        else:
            # Box taller than crop side — anchor near head with headroom
            headroom = round(0.10 * side)
            top = y1 - headroom
```

**HEADROOM = 10% of crop side** (e.g. 77px on a 768px crop). Places the crop so the head has a ~10% gap above it, and any clipping falls on the lower body/feet instead of both head and feet.

The `total_v_pad > 0` branch (animal fits inside the crop) is **untouched**. Horizontal centering is **untouched**. The `top = max(0, min(top, h - side))` clamp still applies after.

---

## Test Set

| Group | Count | Source |
|---|---|---|
| Worst 15 | 15 | S2026179, A2026042, S2026091, S2026536, S2024718, S2026359, A2024053, A2025141, A2025088, S2026622, S2026315, S2024908, S2026135, S2026343, S2026538 |
| Reference | 1 | A2026025 |
| Controls | 2 | S2026144, S2026297 |
| Random 15 | 15 | S2026447, S2026423, S2026158, S2026681, S2026112, S2026195, S2026214, S2025783, R2025039, S2026217, S2026426, S2026583, S2026603, R2025054, W2026042 |

---

## Before/After Table

| # | code | sp | WxH | conf | OLD TG | NEW TG | OLD CLIP | NEW CLIP | HEAD | tag |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | S2026179 | Cat | 472×1024 | 0.544 | -0.537 | 0.017 | 0.518 | 0.526 | ~ | WORST |
| 2 | A2026042 | Dog | 406×789 | 0.515 | -0.327 | 0.101 | 0.395 | 0.456 | Y | WORST |
| 3 | S2026091 | Cat | 460×1024 | 0.877 | -0.302 | 0.100 | 0.377 | 0.439 | Y | WORST |
| 4 | S2026536 | Cat | 571×1024 | 0.752 | -0.258 | 0.100 | 0.340 | 0.406 | Y | WORST |
| 5 | S2024718 | Dog | 628×1024 | 0.876 | -0.235 | 0.007 | 0.320 | 0.325 | ~ | WORST |
| 6 | S2026359 | Cat | 604×1024 | 0.842 | -0.232 | 0.090 | 0.317 | 0.379 | Y | WORST |
| 7 | A2024053 | Dog | 599×1024 | 0.815 | -0.221 | 0.100 | 0.306 | 0.376 | Y | WORST |
| 8 | A2025141 | Dog | 576×1024 | 0.923 | -0.221 | 0.101 | 0.306 | 0.376 | Y | WORST |
| 9 | A2025088 | Dog | 668×1024 | 0.878 | -0.215 | 0.094 | 0.301 | 0.367 | Y | WORST |
| 10 | S2026622 | Cat | 659×1024 | 0.878 | -0.206 | 0.100 | 0.292 | 0.363 | Y | WORST |
| 11 | S2026315 | Cat | 576×1024 | 0.881 | -0.203 | 0.101 | 0.289 | 0.361 | Y | WORST |
| 12 | S2024908 | Cat | 576×1024 | 0.856 | -0.193 | 0.101 | 0.278 | 0.351 | Y | WORST |
| 13 | S2026135 | Cat | 637×1024 | 0.829 | -0.188 | 0.101 | 0.273 | 0.346 | Y | WORST |
| 14 | S2026343 | Cat | 656×1024 | 0.811 | -0.187 | 0.018 | 0.273 | 0.286 | ~ | WORST |
| 15 | S2026538 | Cat | 709×1024 | 0.868 | -0.177 | 0.059 | 0.261 | 0.305 | Y | WORST |
| 16 | A2026025 | Dog | 768×1024 | 0.799 | -0.068 | 0.100 | 0.120 | 0.208 | Y | ★REF |
| 17 | S2026144 | Cat | 997×1024 | 0.802 | 0.180 | 0.180 | 0.000 | 0.000 | Y | ✓CTL |
| 18 | S2026297 | Dog | 768×1024 | 0.895 | 0.141 | 0.141 | 0.000 | 0.000 | Y | ✓CTL |
| 19 | S2026447 | Cat | 768×1024 | 0.925 | 0.291 | 0.291 | 0.000 | 0.000 | Y | RND |
| 20 | S2026423 | Cat | 768×1024 | 0.760 | 0.089 | 0.089 | 0.000 | 0.000 | Y | RND |
| 21 | S2026158 | Dog | 789×1024 | 0.846 | -0.087 | 0.100 | 0.149 | 0.234 | Y | RND |
| 22 | S2026681 | Cat | 748×1024 | 0.493 | 0.058 | 0.058 | 0.000 | 0.000 | Y | RND |
| 23 | S2026112 | Cat | 768×1024 | 0.824 | 0.128 | 0.128 | 0.000 | 0.000 | Y | RND |
| 24 | S2026195 | Cat | 768×1024 | 0.539 | 0.129 | 0.129 | 0.000 | 0.000 | Y | RND |
| 25 | S2026214 | Cat | 768×1024 | 0.856 | -0.129 | 0.073 | 0.205 | 0.263 | Y | RND |
| 26 | S2025783 | Cat | 768×1024 | 0.870 | 0.001 | 0.001 | 0.000 | 0.000 | ~ | RND |
| 27 | R2025039 | Rabbit | 687×1024 | 0.820 | -0.076 | 0.100 | 0.132 | 0.219 | Y | RND |
| 28 | S2026217 | Cat | 768×1024 | 0.835 | -0.060 | 0.100 | 0.107 | 0.196 | Y | RND |
| 29 | S2026426 | Cat | 768×1024 | 0.897 | 0.146 | 0.146 | 0.000 | 0.000 | Y | RND |
| 30 | S2026583 | Cat | 819×1024 | 0.893 | 0.056 | 0.056 | 0.000 | 0.000 | Y | RND |
| 31 | S2026603 | Cat | 768×1024 | 0.861 | -0.070 | 0.100 | 0.123 | 0.211 | Y | RND |
| 32 | R2025054 | Rabbit | 1024×1019 | 0.677 | 0.105 | 0.105 | 0.000 | 0.000 | Y | RND |
| 33 | W2026042 | Cat | 935×1024 | 0.632 | 0.093 | 0.093 | 0.000 | 0.000 | Y | RND |

**HEAD column:** Y = full head inside crop with ≥5% gap. ~ = head inside but gap < 5% (borderline). N = head clipped.

---

## Headline Results

### Worst 16 (15 worst + A2026025)

| Metric | Result |
|---|---|
| Head preserved with headroom (Y) | **13/16** |
| Head preserved borderline (~, gap < 5%) | **3/16** (S2026179, S2024718, S2026343) |
| Head still clipped (N) | **0/16** |
| TOP_GAP improved (negative → positive) | **16/16** |

**All 16 worst cases now keep the full head inside the crop.** 13 with comfortable headroom (≥5% gap), 3 borderline (these have box_top very close to image top, so the 10% headroom is clamped by `top = max(0, ...)` — physically no room to add more above).

### A2026025 (★REF)
- OLD: TOP_GAP = -0.068 (head above crop), CLIP = 0.120
- NEW: TOP_GAP = +0.100 (10% headroom above head), CLIP = 0.208
- Head is cleanly inside the crop. Clip shifted entirely to lower legs/feet.

### Regression Check

| Group | Photos unclipped before | Still unclipped after | True regressions |
|---|---|---|---|
| Controls (2) | 2 | 2 | **0** |
| Random (15) | 10 | 10 | **0** |

**Zero true regressions.** All 12 previously-unclipped photos remain unclipped (the fits-fine branch is untouched). The 5 random photos with increased CLIP_FRAC were **already clipped** (box_h > side) — the fix moved clip from head+feet to feet-only, which increases total clip_frac by design. This is the intended tradeoff: sacrifice lower body to preserve the face.

---

## Contact Sheet

Four panels per animal: (a) ORIG+OLD rect, (b) ORIG+NEW rect, (c) OLD crop, (d) NEW crop.
Green rect = detected box. Red rect = crop rect.

Saved to: crop-fix-proveout-20260621.png (7.4 MB)

---

## Notes on the 3 Borderline Cases

- **S2026179** (472×1024, ar=0.46): Extreme narrow portrait. Box top at y=8 — only 8px above box in the source. Headroom wants 47px but clamps to y=0. TOP_GAP = 0.017. Head IS inside but barely.
- **S2024718** (628×1024): Box top at y=5. Only 5px above. Clamps to y=0. TOP_GAP = 0.007.
- **S2026343** (656×1024): Box top at y=12. Clamps near y=0. TOP_GAP = 0.018.

These are source-image limits (animal's head is at the very top of the frame). Even the head-anchor fix can't create pixels that don't exist. The improvement is still significant: OLD had TOP_GAP deeply negative (head above crop).

---

## Deviations

None. Live `scripts/crop-worker.py` untouched. No crop_url writes. No service change.
