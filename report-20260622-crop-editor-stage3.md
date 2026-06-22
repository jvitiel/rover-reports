# Crop Editor Stage 3: --manual-box Mode in crop-worker.py

**Date:** 2026-06-22 21:15 UTC  
**Commit:** `5c58ea9`  
**File:** `scripts/crop-worker.py` (+58 -9)

---

## Before

### Argument parsing (main, ~line 332)
```python
parser.add_argument("--sample", type=int, help="Process N diverse samples")
parser.add_argument("--ids", type=str, help="Comma-separated animal_media IDs")
parser.add_argument("--dry-run", action="store_true", help="Show what would be processed")
args = parser.parse_args()
```

### Crop step (process_one, ~line 193)
```python
box = detect_animal_box(img)
cropped, method, conf, cls_name = smart_square_crop(img, box)
result["method"] = method
result["confidence"] = round(conf, 3)
result["class_name"] = cls_name
```

Always runs YOLO → smart_square_crop or center_square_crop fallback.

## After

### New function: manual_square_crop (~line 158)
```python
def manual_square_crop(img, x, y, w, h):
    img_w, img_h = img.size
    # Clamp to image bounds
    x = max(0, min(x, img_w - 1))
    y = max(0, min(y, img_h - 1))
    w = max(1, min(w, img_w - x))
    h = max(1, min(h, img_h - y))
    note = f"box_not_square:{w}x{h}" if w != h else None
    cropped = img.crop((x, y, x + w, y + h))
    cropped = cropped.resize((CROP_SIZE, CROP_SIZE), Image.LANCZOS)
    return cropped, "manual", note
```

### Argument parsing (main, ~line 335)
```python
parser.add_argument("--manual-box", type=str, help="Manual crop box: x,y,w,h in original-pixel coords")
# ...
# Validation: --manual-box requires exactly one --ids
if args.manual_box:
    if not args.ids or ',' in args.ids:
        sys.exit("ERROR: --manual-box requires exactly one --ids value")
    parts = args.manual_box.split(',')
    # must be 4 integers
    manual_box = tuple(int(p) for p in parts)
```

### Crop step (process_one, ~line 200)
```python
if manual_box is not None:
    x, y, w, h = manual_box
    cropped, method, note = manual_square_crop(img, x, y, w, h)
    result["method"] = method
    result["confidence"] = None
    result["class_name"] = None
    if note:
        result["note"] = note
else:
    box = detect_animal_box(img)
    cropped, method, conf, cls_name = smart_square_crop(img, box)
    # ... unchanged
```

Same resize-to-800x800 + save + chown/chmod + JSON output path for both branches.

## CLI Proof

### (a) Manual crop — box 50,100,500,500 on A2024185 (650×1024 original)

```
$ python3 crop-worker.py --ids 01ef1f8d-... --manual-box 50,100,500,500
```
```json
{
  "method": "manual",
  "confidence": null,
  "class_name": null,
  "src_size": "650x1024",
  "out_filename": "A2024185-4484.jpg",
  "crop_url": "https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/crops/A2024185-4484.jpg",
  "file_size_kb": 73.5,
  "error": null,
  "owner": "shelter"
}
```
800×800 JPEG produced. Box (50,100)→(550,600) — crops the upper-center region of the original. method="manual" ✅

### (b) Same ID, auto path (no --manual-box)

```
$ python3 crop-worker.py --ids 01ef1f8d-...
```
```json
{
  "method": "smart",
  "confidence": 0.858,
  "class_name": "dog",
  "src_size": "650x1024",
  "file_size_kb": 78.7
}
```
Auto-YOLO unchanged — method="smart", confidence 0.858, class "dog" ✅

### (c) Out-of-bounds box — 400,800,500,500 on 650×1024

```
$ python3 crop-worker.py --ids 01ef1f8d-... --manual-box 400,800,500,500
```
```json
{
  "method": "manual",
  "note": "box_not_square:250x224",
  "file_size_kb": 37.7,
  "error": null
}
```
Clamped: x=400 + w=500 → 900 > 650 width, clamped to w=250. y=800 + h=500 → 1300 > 1024 height, clamped to h=224. Non-square noted. Still produced valid 800×800 JPEG. No crash ✅

### (d) No DB changes

```
$ SELECT crop_url, crop_locked FROM animal_media WHERE id='01ef1f8d-...'
https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/crops/A2024185-4484.jpg|0
```
crop_url unchanged (same URL as before tests), crop_locked=0. Worker wrote only the image file, no DB ✅

### (e) Files written

One file overwritten during tests: `data/animal-media/crops/A2024185-4484.jpg`. Restored to auto-crop after tests. No other animal's crop touched.
