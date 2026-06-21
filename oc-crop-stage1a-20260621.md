# Stage 1a: crop_url Column + Crop Worker — Proof on 25 Photos

**Date:** 2026-06-21 ~19:15 UTC
**Mode:** Additive schema change + file-only worker. No read-path changes. No API changes.

---

## V1 — Serving Route Verdict: NO CONFIG CHANGE NEEDED

Caddy proxies `/data/*` to Express at localhost:3000 (Caddyfile dogwalker block):
```
@data path /data/*
reverse_proxy @data localhost:3000
```
[VERIFIED: /etc/caddy/Caddyfile, dogwalker.4lgshelterapp.duckdns.org block.]

Express serves `/data` as a **directory-root catch-all**:
```typescript
app.use('/data', express.static(path.join(ROOT_DIR, 'data'), { maxAge: '1h' }));
```
[VERIFIED: server.ts:10498.]

Any file under `data/animal-media/crops/` is served automatically at `https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/crops/{filename}`. **No Caddy or Express change required.**

---

## V2 — thumbnail_url Format

`thumbnail_url` stores **full URLs**:
```
https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/thumbnails/f3a4da04-4aa2-4a05-a65d-0e0e2f65ae92.jpg
https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/thumbnails/1b6d3e1d-9a69-4bf5-bb11-e61f1b42e292.jpg
https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/thumbnails/52ff0f9f-3b79-4d01-b7cc-330cf1934099.jpg
```
[VERIFIED: `SELECT thumbnail_url FROM animal_media WHERE thumbnail_url IS NOT NULL LIMIT 3`.]

**crop_url mirrors this format:** `https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/crops/{shelter_code}-{mediaid}.jpg`

---

## S1 — Schema Migration

```sql
ALTER TABLE animal_media ADD COLUMN crop_url TEXT;
```
[VERIFIED: applied, column index 30.]

**Existing rows unaffected:**
- Row count before: 1844. After: 1844. [VERIFIED.]
- Non-null crop_url count: 0. [VERIFIED.]
- Spot-check S2026454 strip_position=1, file_url unchanged, crop_url=NULL. [VERIFIED.]
- DB ownership: shelter:shelter, mode 644. [VERIFIED: ls -la.]

Migration recorded: `scripts/migration-20260621-crop-url.sql`

---

## W1 — Crop Worker Summary

**File:** `scripts/crop-worker.py`

| Feature | Detail |
|---|---|
| Input | animal_media row (file_url, shelter_code, mediaid) |
| Model | YOLOv8n (ultralytics), COCO animal classes (cat, dog, bird, horse, etc.) |
| Confidence threshold | 0.30 |
| Smart crop | Padded square (1.3× largest detected box), centered on detection, clamped to image bounds |
| Fallback | Center square crop when no animal detected above threshold |
| Output size | 800×800 JPEG, quality 82 |
| Output path | `data/animal-media/crops/{shelter_code}-{mediaid}.jpg` |
| Ownership | shelter:shelter via sudo -u shelter cp (verified) |
| Permissions | 644 (verified) |
| DB writes | **None** — file-only output |
| EXIF | Auto-oriented via PIL ImageOps.exif_transpose before processing |
| Modes | `--sample N` (diverse stratified), `--ids id1,id2`, default (all unprocessed slot-1) |

---

## P1 — 25-Photo Proof Results

| # | shelter_code | species | mediaid | src_size | method | confidence | class | file_kb |
|---|---|---|---|---|---|---|---|---|
| 1 | S2026023 | Dog | 8611 | 819x1024 | smart | 0.865 | dog | 108.6 |
| 2 | A2025108 | Dog | 5799 | 574x640 | smart | 0.785 | dog | 116.6 |
| 3 | A2024017 | Dog | 8942 | 768x1024 | smart | 0.853 | dog | 152.6 |
| 4 | S2026159 | Dog | 8256 | 768x1024 | smart | 0.844 | dog | 164.9 |
| 5 | S2026438 | Cat | 9017 | 768x1024 | smart | 0.891 | cat | 103.2 |
| 6 | S2026407 | Cat | 8834 | 768x1024 | smart | 0.773 | cat | 92.5 |
| 7 | S2026384 | Cat | 9054 | 768x1024 | smart | 0.83 | cat | 131.9 |
| 8 | S2026220 | Cat | 8418 | 768x1024 | smart | 0.874 | cat | 90.5 |
| 9 | S2026175 | Cat | 8324 | 768x1024 | smart | 0.576 | cat | 97.3 |
| 10 | S2026143 | Cat | 8228 | 768x1024 | smart | 0.566 | cat | 161.3 |
| 11 | S2026610 | Cat | 9361 | 768x1024 | smart | 0.652 | cat | 107.3 |
| 12 | S2025206 | Cat | 5161 | 480x640 | smart | 0.695 | cat | 77.5 |
| 13 | S20251236 | Cat | 7744 | 768x1024 | smart | 0.86 | cat | 106.0 |
| 14 | S2026149 | Cat | 8321 | 1024x1006 | smart | 0.581 | cat | 79.3 |
| 15 | S2026379 | Cat | 8881 | 768x1024 | smart | 0.811 | cat | 72.5 |
| 16 | S2026394 | Cat | 9236 | 917x1024 | smart | 0.807 | cat | 82.0 |
| 17 | W2026048 | Cat | 9252 | 768x1024 | smart | 0.797 | cat | 71.5 |
| 18 | S20251152 | Cat | 7485 | 965x1024 | smart | 0.862 | cat | 155.4 |
| 19 | S2026357 | Cat | 8758 | 768x1024 | smart | 0.715 | cat | 80.9 |
| 20 | S2026605 | Cat | 9287 | 768x1024 | smart | 0.358 | cat | 119.4 |
| 21 | S2026381 | Cat | 8788 | 768x1024 | smart | 0.836 | cat | 175.2 |
| 22 | S2026638 | Cat | 9399 | 768x1024 | smart | 0.831 | cat | 125.4 |
| 23 | S2026441 | Cat | 9238 | 791x1024 | smart | 0.779 | cat | 129.1 |
| 24 | S2026190 | Rabbit | 8342 | 1024x963 | smart | 0.776 | cat* | 86.9 |
| 25 | S2026454 | Cat | 9476 | 768x1024 | smart | 0.885 | cat | 124.5 |

*S2026190 is a rabbit in shelter records; YOLO classifies it as "cat" (COCO has no rabbit class). Detection box is still valid — the animal is correctly located even if the class label is wrong. This is expected behavior for YOLO on non-COCO species.

**Summary:** 25/25 smart (YOLO detection), 0 fallback, 0 errors. Species: 4 Dog, 20 Cat, 1 Rabbit. Globe-corrected S2026454 included.

---

## P2 — Server-Readability Check

```
$ curl -sI 'https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/crops/S2026454-9476.jpg'
HTTP/2 200
content-type: image/jpeg
cache-control: public, max-age=3600
```
[VERIFIED: HTTP 200, served via Express static catch-all, no config change needed.]

File ownership: shelter:shelter, mode 644 for all 25 crops. [VERIFIED: ls -la.]

---

## P3 — Contact Sheet

Saved to: `/home/shelter/rover-reports/crop-stage1a-contactsheet-20260621.png` (5.0 MB)
Each of the 25 photos shown as ORIGINAL (letterboxed) beside SMART CROP (800×800), labeled with shelter_code, mediaid, species, method, confidence.

---

## P4 — Zero Existing Rows Changed

| Check | Result |
|---|---|
| crop_url non-null count | 0 [VERIFIED] |
| Total row count | 1844 (unchanged from pre-migration) [VERIFIED] |
| file_url containing "crops" | 0 [VERIFIED] |
| S2026454 strip_position | 1 (unchanged) [VERIFIED] |
| S2026454 file_url | SM URL with mediaid=9476 (unchanged) [VERIFIED] |
| A2025108 strip_position | 1 (unchanged) [VERIFIED] |
| A2025108 file_url | SM URL with mediaid=5799 (unchanged) [VERIFIED] |

**No existing columns or rows modified. crop_url is NULL for all 1844 rows. No read-path code touched.**

---

## Commit

**Hash:** `35c8701e16fe92e24eabc32104526b22becf86e6`
**Files:**
- `scripts/crop-worker.py` (new)
- `scripts/migration-20260621-crop-url.sql` (new)

**Message:** "Stage 1a: add crop_url column + crop worker script"

---

## Deviations

1. **YOLO class for rabbit:** S2026190 is a rabbit but YOLO COCO classes have no "rabbit" — it detects as "cat" (conf 0.776). The detection box is still accurate (animal correctly located), only the class label is wrong. This is inherent to COCO and does not affect crop quality.

2. **ultralytics installed under rover, not shelter.** The worker runs as rover (which has ultralytics) and uses `sudo -u shelter cp` to transfer file ownership. The `sudo -u shelter chmod 644` emits a harmless stderr warning before the cp path takes over. Functionally correct: all 25 output files confirmed shelter:shelter 644.
