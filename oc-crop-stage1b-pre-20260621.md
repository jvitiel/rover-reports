# Stage 1b-pre: Asymmetric Padding Tune + Confidence Floor

**Date:** 2026-06-21 ~19:28 UTC
**Mode:** Worker-only change. No DB writes. No read-path changes.

---

## 1. Padding Tune

**Old (1a):**
```python
side = min(max(box_w, box_h) * 1.3, min(w, h))
# Centered on detection box center (symmetric)
left = max(0, cx - side / 2)
top = max(0, cy - side / 2)
```
Symmetric 1.3× multiplier. Equal padding top and bottom. Result: ears/head clipped when box top is near image edge.

**New (1b-pre):**
```python
PAD_MULTIPLIER = 1.4
PAD_TOP_RATIO = 0.643    # top:bottom = 1.8:1 → 1.8/(1.8+1.0) = 0.643
```
- Square side = `max(box_w, box_h) * 1.4` (slightly larger overall).
- Horizontal: centered on box center (unchanged).
- Vertical: total vertical padding = `side - box_h`. Top gets 64.3% of it, bottom gets 35.7%. This gives ~1.8× more space above the detected box than below.
- All clamped to image bounds; no distortion.

[VERIFIED: scripts/crop-worker.py lines 100-112.]

---

## 2. Confidence Floor

**Old:** `YOLO_CONFIDENCE_THRESHOLD = 0.30`
**New:** `YOLO_CONFIDENCE_THRESHOLD = 0.35`

Below 0.35 → center-crop fallback (no YOLO box used), labeled "fallback" in metadata.

**S2026605 treatment:** Detected at confidence 0.358 — this is **above** the 0.35 floor by 0.008, so it's treated as **smart** (YOLO box used). If the floor were raised to e.g. 0.40, S2026605 would fall to center-crop fallback. At 0.35, it remains smart.

[VERIFIED: scripts/crop-worker.py line 28, stderr output line 19: `S2026605 (Cat) → smart CONF=0.358`.]

---

## 3. Strict Slot-1 + S2026438 Explanation

**S2026438 was NOT duplicated.** The 1a sample contained:
- **S2026438** with mediaid **9017** (Dog species in sample, Cat in DB — species comes from the `species` column)
- **S2026638** with mediaid **9399**

These are **different shelter_codes** that look similar at a glance (S2026**4**38 vs S2026**6**38). The 1a sample was strictly `strip_position=1 AND media_type='photo' AND hidden=0`. [VERIFIED: sample query in crop-worker.py `get_sample_rows()`.]

**Duplicate-check:** No animal has more than one strip_position=1 photo row:
```sql
SELECT shelter_code, COUNT(*) c FROM animal_media
WHERE strip_position=1 AND media_type='photo' AND hidden=0
GROUP BY shelter_code HAVING c > 1;
```
Result: **0 rows.** No duplicates. [VERIFIED.]

S2026438 has exactly one strip_position=1 photo row (mediaid 9017). [VERIFIED: `SELECT id, shelter_code, strip_position FROM animal_media WHERE shelter_code='S2026438' AND media_type='photo'` returns 1 row.]

---

## 4. Three-Column Contact Sheet

Saved to: `/home/shelter/rover-reports/crop-stage1b-pre-contactsheet-20260621.png` (4.7 MB)

Layout per animal: **ORIGINAL** (letterboxed) | **OLD CROP** (1a, symmetric 1.3×) | **NEW CROP** (1b, asymmetric 1.4× top-heavy)

### 25-Photo Metadata

| # | shelter_code | species | mediaid | method | confidence | class |
|---|---|---|---|---|---|---|
| 1 | S2026023 | Dog | 8611 | smart | 0.865 | dog |
| 2 | A2025108 | Dog | 5799 | smart | 0.785 | dog |
| 3 | A2024017 | Dog | 8942 | smart | 0.853 | dog |
| 4 | S2026159 | Dog | 8256 | smart | 0.844 | dog |
| 5 | S2026438 | Cat | 9017 | smart | 0.891 | cat |
| 6 | S2026407 | Cat | 8834 | smart | 0.773 | cat |
| 7 | S2026384 | Cat | 9054 | smart | 0.83 | cat |
| 8 | S2026220 | Cat | 8418 | smart | 0.874 | cat |
| 9 | S2026175 | Cat | 8324 | smart | 0.576 | cat |
| 10 | S2026143 | Cat | 8228 | smart | 0.566 | cat |
| 11 | S2026610 | Cat | 9361 | smart | 0.652 | cat |
| 12 | S2025206 | Cat | 5161 | smart | 0.695 | cat |
| 13 | S20251236 | Cat | 7744 | smart | 0.86 | cat |
| 14 | S2026149 | Cat | 8321 | smart | 0.581 | cat |
| 15 | S2026379 | Cat | 8881 | smart | 0.811 | cat |
| 16 | S2026394 | Cat | 9236 | smart | 0.807 | cat |
| 17 | W2026048 | Cat | 9252 | smart | 0.797 | cat |
| 18 | S20251152 | Cat | 7485 | smart | 0.862 | cat |
| 19 | S2026357 | Cat | 8758 | smart | 0.715 | cat |
| 20 | S2026605 | Cat | 9287 | smart | 0.358 | cat |
| 21 | S2026381 | Cat | 8788 | smart | 0.836 | cat |
| 22 | S2026638 | Cat | 9399 | smart | 0.831 | cat |
| 23 | S2026441 | Cat | 9238 | smart | 0.779 | cat |
| 24 | S2026190 | Rabbit | 8342 | smart | 0.776 | cat* |
| 25 | S2026454 | Cat | 9476 | smart | 0.885 | cat |

*YOLO COCO has no rabbit class; detection box is still accurate.

---

## 5. No-DB-Writes / No-Read-Path Confirmation

| Check | Result |
|---|---|
| crop_url non-null | 0 [VERIFIED] |
| Total rows | 1844 (unchanged) [VERIFIED] |
| enrichWithLocalPhotos diff | empty (no changes) [VERIFIED] |
| localDatabase.ts diff | empty [VERIFIED] |
| server.ts diff | empty (no changes this session) [VERIFIED] |

---

## Commit

**Hash:** `8d3d8b42f63a2f82a185c37aa2c5c865e04f8cfc`
**File:** `scripts/crop-worker.py` (modified)

---

## Deviations

None.
