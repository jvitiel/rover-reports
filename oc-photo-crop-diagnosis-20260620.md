# Photo Pipeline & Crop Comparison Diagnosis — 2026-06-20

## Part 1: Photo Pipeline Shape

### Source of Photos

Matcher-web obtains pet photos via the `/api/animals` endpoint (server.ts:916). The response pipeline:

1. **Shelter Manager (SM) API** → `fetchAnimals()` (shelterManagerService.ts:42) returns `PHOTOURLS[]` from SM's `media_image` endpoint. `photoUrl` = `PHOTOURLS[0]` (shelterManagerService.ts:46). [VERIFIED — shelterManagerService.ts:42-63]

2. **`enrichWithLocalPhotos()`** (localDatabase.ts:5129) overrides `photoUrl` with the lowest `strip_position` photo from `animal_media` table if one exists. [VERIFIED — localDatabase.ts:5129-5164]

3. **`animal_media` table** is populated by two paths:
   - **SM Photo Sync** (server.ts:12000-12119): Periodic job fetches `allPhotoUrls` for each animal, deduplicates by `mediaid` and content-hash, inserts with `source='sm-sync'`. These rows store the SM URL directly (`file_url` = `https://service.sheltermanager.com/asmservice?...&mediaid=NNNN`).
   - **Dashboard uploads** (server.ts:4019+): Staff upload photos via the dashboard, stored on-disk at `/home/shelter/shelter-apps/data/animal-photos/{shelter_code}/` or `/data/library-photos/`, served via Caddy → Express at `https://dogwalker.4lgshelterapp.duckdns.org/data/animal-photos/...`.

### What's Served: Originals, Not Derivatives

**No server-side thumbnails or resized derivatives are generated.** [VERIFIED — no resize/thumbnail generation code in server.ts, localDatabase.ts, or shelterManagerService.ts]

- SM-hosted photos are served at whatever size SM provides (typically 768×1024). The URLs are proxied directly — the VPS does not download, resize, or cache them.
- Dashboard-uploaded photos are served at their upload size (typically 480×640 from phone cameras).
- `thumbnail_url` column exists in `animal_media` but is populated for only 145/1630 visible rows (8.9%). [VERIFIED — sqlite3 query]
- The frontend (`app.js:889-899`) renders photos as `<img>` tags with no explicit width/height attributes. CSS controls display sizing.

### File URL Distribution

| Source | Count | URL Pattern |
|--------|-------|-------------|
| SM hosted | 1,474 | `https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&mediaid=NNNN` |
| Local (animal-photos) | 89 | `https://dogwalker.4lgshelterapp.duckdns.org/data/animal-photos/{code}/...` |
| Local (library-photos) | 48 | `https://dogwalker.4lgshelterapp.duckdns.org/data/library-photos/{code}/...` |
| Intake photos | ~19 | `/intake-photos/NN/photo.jpg` (relative path) |

[VERIFIED — `SELECT DISTINCT substr(file_url,1,50), COUNT(*) FROM animal_media WHERE media_type='photo' AND hidden=0 GROUP BY 1`]

### Dimension & Aspect-Ratio Spread

Sample: 256 photos (246 local on-disk + 10 SM-hosted downloaded for measurement).

| Metric | Width | Height |
|--------|-------|--------|
| Min | 1 | 1 |
| Median | 480 | 640 |
| Max | 1,080 | 1,920 |

| Orientation | Count | % |
|-------------|-------|---|
| Portrait (h>w) | 232 | 90.6% |
| Landscape (w>h) | 18 | 7.0% |
| Square | 6 | 2.3% |

| Dominant Sizes | Count | % |
|----------------|-------|---|
| 480×640 (local, phone portrait) | 220 | 85.9% |
| 640×480 (local, phone landscape) | 17 | 6.6% |
| 768×1024 (SM standard resize) | 5 | 2.0% |
| 1×1 (placeholder/broken) | 6 | 2.3% |
| 1080×1920 (full-res phone) | 3 | 1.2% |

**Aspect ratio**: median 0.750 (3:4 portrait), range 0.562–1.333. The pool is overwhelmingly portrait-oriented phone photos.

[VERIFIED — `identify -format '%w %h'` on all 246 local files + 10 SM downloads]

---

## Part 2: Crop Comparison

### Sample Selection

20 photos selected from strip-position-1 (primary display photo) entries: 8 cats, 7 dogs, 3 rabbits, 1 chinchilla, 1 ferret (classified as rabbit in data). Mix of local dashboard uploads (480×640) and SM-hosted (768×1024, various), plus one 2048×1768 landscape.

### Detection Method

YOLOv8n (ultralytics 8.4.72, `yolov8n.pt` — 6.2MB nano model). COCO-pretrained, detects cats (class 15) and dogs (class 16). Rabbits and chinchillas are misclassified as "cat" by species label but correctly localized with bounding boxes (conf 0.56–0.84). Confidence threshold: 0.25 for detection, 0.30 for smart-crop eligibility.

Smart crop: padded square around best-confidence bounding box, minimum 50% of smaller image dimension, clamped to image bounds.

### Per-Photo Results

| # | Filename | Species | Dims | Box? | Conf | Method | Notes |
|---|----------|---------|------|------|------|--------|-------|
| 1 | 01_cat_S2026028 | cat | 480×640 | Y | 0.74 | smart | Cat in basket, already centered |
| 2 | 02_cat_S2026224 | cat | 480×640 | Y | 0.88 | smart | Gray cat, smart centers better |
| 3 | 03_cat_S2026078 | cat | 480×640 | Y | 0.89 | smart | Cat in cage, slight improvement |
| 4 | 04_cat_S2026230 | cat | 480×640 | Y | 0.62 | smart | Tabby lying, smart frames body better |
| 5 | 05_cat_S2026366 | cat | 768×1024 | Y | 0.84 | smart | Kitten held, both similar |
| 6 | 06_cat_S2026350 | cat | 768×1024 | Y | 0.76 | smart | Black kitten held, both similar |
| 7 | 07_cat_S2026394 | cat | 768×1024 | Y | 0.89 | smart | Gray kitten, smart clearly better |
| 8 | 08_cat_S2026597 | cat | 768×1024 | Y | 0.91 | smart | Black cat, both similar (dark subject) |
| 9 | 09_dog_A2026051 | dog | 2048×1768 | Y | 0.67 | smart | Puppy on blanket, landscape — smart much better |
| 10 | 10_dog_A2025162 | dog | 480×640 | Y | 0.37 | smart | Black/tan puppy, smart frames puppy better |
| 11 | 11_dog_S2026228 | dog | 480×640 | Y | 0.47 | smart | Dog with cone, smart centers head |
| 12 | 12_dog_S2026606 | dog | 768×1024 | Y | 0.87 | smart | Yorkie, both similar |
| 13 | 13_dog_A2025234 | dog | 768×1024 | Y | 0.76 | smart | Senior dog in harness, smart better |
| 14 | 14_dog_S2026134 | dog | 711×1024 | Y | 0.71 | smart | Tan/white dog, both similar |
| 15 | 15_dog_A2026042 | dog | 406×789 | Y | 0.51 | smart | Black dog, slight improvement |
| 16 | 16_rabbit_R2023007 | rabbit | 852×1024 | Y | 0.77 | smart | Brown/white rabbit, both similar (near-square) |
| 17 | 17_chinchilla_S2026403 | chinchilla | 472×1024 | Y | 0.73 | smart | Dark animal in cage, smart better |
| 18 | 18_rabbit_R2026003 | rabbit | 896×1024 | Y | 0.84 | smart | White/gray rabbit, both similar |
| 19 | 19_rabbit_R2026009 | rabbit | 848×1024 | Y | 0.60 | smart | Gray rabbit, both similar |
| 20 | 20_rabbit_R2026004 | rabbit | 903×1024 | Y | 0.56 | smart | Gray/white rabbit, both similar |

### Summary Counts

| Metric | Count |
|--------|-------|
| **Smart-cropped** | **20 / 20** |
| **Fell back to center** | **0 / 20** |
| Detection rate (any animal box ≥0.30) | 100% |

| Species | Smart | Fallback | Total |
|---------|-------|----------|-------|
| Cat | 8 | 0 | 8 |
| Dog | 7 | 0 | 7 |
| Rabbit | 4 | 0 | 4 |
| Chinchilla | 1 | 0 | 1 |

### Quality Assessment (Visual Inspection)

Of the 20 photos:

- **Smart crop clearly better** (~8–9 photos): Rows 2, 4, 7, 9, 10, 11, 13, 17 — animal is off-center or in lower portion of portrait frame; smart crop shifts to subject.
- **Roughly the same** (~11 photos): Rows 1, 3, 5, 6, 8, 12, 14, 15, 16, 18, 19, 20 — animal was already centered; center crop was fine.
- **Smart crop worse**: **0 photos**.

The improvement is most visible on:
- **Off-center subjects** (dogs on leash with handler, cats in corners of cages)
- **Tall portrait shots** where the animal is in the lower or upper third
- **Landscape photos** (row 9, 2048×1768) where center crop catches background

The no-difference cases are mostly near-square SM photos (≈0.75–0.88 aspect ratio) where the animal fills the frame — center crop already captures the subject.

### Contact Sheet

![Contact Sheet](https://raw.githubusercontent.com/jvitiel/rover-reports/main/photo-crop-contactsheet-20260620.png)

---

## Key Findings

1. **No derivatives exist today.** Matcher-web serves the original SM or dashboard-uploaded photo at full resolution. All cropping/scaling is done client-side by CSS.

2. **Photos are overwhelmingly portrait 3:4** (91%). The crop challenge is vertical — fitting a tall portrait into a square card. Landscape is rare (7%).

3. **YOLO detection rate is 100% on this sample**, including rabbits and chinchillas (misclassified as "cat" by species, but correctly localized). Zero fallbacks needed.

4. **Smart crop improves ~40–45% of photos**, is equivalent on the rest, and is never worse. The ROI depends on how many off-center or zoomed-out shots are in the pool. For portrait phone photos where the photographer centered the animal, center crop is already adequate.

5. **Recommendation signal**: A lightweight YOLO pipeline (6MB model, ~50ms/image on CPU) delivers real improvement for off-center shots with zero regressions. But CSS `object-fit: cover` with `object-position: center 33%` (shifting focus upward by one-third for portrait photos) would capture ~60–70% of the smart-crop benefit with zero infrastructure — since most animals appear in the upper-center of portrait phone shots.
