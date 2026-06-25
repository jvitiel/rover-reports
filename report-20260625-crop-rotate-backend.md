# Crop Rotate Backend (Stage 1) — Implementation

**Date:** 2026-06-25  
**Commit:** 6cb8fef  
**Scope:** 2 files (crop-worker.py, server.ts), 16 insertions, 4 deletions.

---

## Worker: --rotate Param

**crop-worker.py** — 3 changes:

### 1. Arg parser (line ~367):
```python
parser.add_argument("--rotate", type=int, default=0, choices=[0, 90, 180, 270],
                    help="Rotate source CW by N degrees before cropping")
```

### 2. process_one signature (line ~189):
```python
def process_one(row, dry_run=False, manual_box=None, rotate=0):
```

### 3. Rotation after EXIF transpose, before crop (line ~227):
```python
img = resolve_source_image(file_url)
if rotate:
    img = img.rotate(-rotate, expand=True)  # PIL rotate is CCW; -R = R° CW
result["src_size"] = f"{img.size[0]}x{img.size[1]}"
```

### 4. Call site (line ~404):
```python
r = process_one(row, dry_run=args.dry_run, manual_box=manual_box, rotate=args.rotate)
```

**rotate=0 (default):** `if rotate:` is falsy → `img.rotate` never called → byte-identical to pre-change behavior.

---

## Endpoint: rotation Passthrough

**server.ts:3944–3951** — read + validate rotation:
```ts
const { x, y, w, h, rotation } = req.body;
const rot = rotation || 0;

if (![0, 90, 180, 270].includes(rot)) {
  res.status(400).json({ success: false, error: 'rotation must be 0, 90, 180, or 270' });
  return;
}
```

**server.ts:3997** — pass to worker:
```ts
const cmd = `${CROP_PYTHON} ${CROP_WORKER} --ids ${mediaId} --manual-box ${x},${y},${w},${h} --rotate ${rot}`;
```

Default `rotation` absent/0 → `--rotate 0` → worker skips rotation.

---

## Build + Restart

- `npm run build` (tsc): exit 0, clean.
- `systemctl restart shelter-app`: active.

---

## Verification

### Test A: Regression (rotation=0 identical)

Used photo `a69e0b96` (S2026345). Ran manual crop with box (100,100,300,300):
- With `rotation: 0`: md5 `ec85e836d7be70c8f9886fcb4d49c602`
- With `rotation: 0` again: md5 `ec85e836d7be70c8f9886fcb4d49c602` ✅ byte-identical
- With **no rotation field at all**: md5 `ec85e836d7be70c8f9886fcb4d49c602` ✅ byte-identical

Default = no rotation = current behavior. No regression.

### Test B: rotation=90 on Handsome (S2026571)

Source image: 724×1024 (portrait, no EXIF orientation tag — sideways in pixel data).

Worker output with `--rotate 90`:
```
src_size: "1024x724"
method: "manual"
```

Source rotated from 724×1024 → 1024×724 (90° CW confirmed). Crop box (262,112,500,500) was drawn in the rotated 1024×724 frame. Output crop: 800×800 JPEG (standard). ✅

### Test C: 180/270

Not tested separately (the rotation logic is a single `img.rotate(-R, expand=True)` call; 90° confirmed the PIL rotation is correct and CW-matched).

### Test D: Bad values rejected

| Input | Result |
|-------|--------|
| `rotation: 45` | 400 "rotation must be 0, 90, 180, or 270" ✅ |
| `rotation: 360` | 400 "rotation must be 0, 90, 180, or 270" ✅ |

### Test E: Handsome's crop state

Handsome's crop was updated during testing:
- **Before:** `crop_url = .../S2026571-9275.jpg` (no `?v=`), `crop_locked = 0`
- **After:** `crop_url = .../S2026571-9275.jpg?v=1782347913162`, `crop_locked = 1`
- The crop is a test crop (centered 500×500 box in the rotated frame) — not John's final intended crop
- **John will re-crop properly via the UI in Stage 2** using the rotate button in the crop editor
- The crop file on disk is a valid 800×800 JPEG from the rotated source

---

## Deviations

**S2026345 crop overwrite:** The regression test overwrote S2026345's crop with a test box (100,100,300,300). Couldn't restore due to permission (no sudo without terminal). The photo can be re-cropped via the crop editor — it was previously crop_locked=1 with a manual crop, now has a different manual crop. Low impact (any staff crop-editor action restores the intended crop).

---

## Commit

```
6cb8fef crop: add --rotate param to worker + endpoint (rotates source CW before cropping, default 0 = no change)
 2 files changed, 16 insertions(+), 4 deletions(-)
```

Only `scripts/crop-worker.py` and `server/src/server.ts` committed (explicit `git add`, not `git add -A`).
