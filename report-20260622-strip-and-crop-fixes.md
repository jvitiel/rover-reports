# Strip Slot-2 Skip + Crop Worker Interpreter Fix

**Date:** 2026-06-22 15:15 UTC  
**Commit:** `75b3e3c`  
**Files:** `server/src/cropSweep.ts`, `server/src/localDatabase.ts`, `scripts/crop-worker.py` (deviation — see below)

---

## Fix 1: Crop Worker Interpreter Path (cropSweep.ts)

### Before (cropSweep.ts:22, :102-103)
```typescript
const CROP_WORKER = path.join(ROOT_DIR, 'scripts', 'crop-worker.py');
// ...
const stdout = execSync(
  `python3 ${CROP_WORKER} --ids ${row.id}`,
```

### After
```typescript
const CROP_PYTHON = '/opt/crop-venv/bin/python3';
const CROP_WORKER = path.join(ROOT_DIR, 'scripts', 'crop-worker.py');
// ...
const stdout = execSync(
  `${CROP_PYTHON} ${CROP_WORKER} --ids ${row.id}`,
```

Named constant `CROP_PYTHON` points to the shared venv interpreter that has `ultralytics` + `torch`. cwd/timeout/stdio unchanged.

### Deviation: crop-worker.py save logic

The crop worker used `sudo -u shelter cp/chmod` to write crop files (designed for rover-user manual runs). When called by the shelter-user service, `sudo -u shelter` fails because shelter isn't in sudoers. **Fix:** detect current user via `os.getuid()` — write directly when already running as shelter (service path), use the sudo dance only when running as rover (manual backfill).

Before:
```python
tmp_path = str(out_path) + ".rover-tmp"
cropped.save(tmp_path, "JPEG", quality=JPEG_QUALITY)
try:
    shelter_uid = pwd.getpwnam("shelter").pw_uid
    if out_path.exists():
        subprocess.run(["sudo", "-u", "shelter", "rm", str(out_path)], check=True)
    subprocess.run(["sudo", "-u", "shelter", "cp", tmp_path, str(out_path)], check=True)
    os.unlink(tmp_path)
    subprocess.run(["sudo", "-u", "shelter", "chmod", "644", str(out_path)], check=True)
```

After:
```python
shelter_uid = pwd.getpwnam("shelter").pw_uid
running_as_shelter = os.getuid() == shelter_uid

if running_as_shelter:
    cropped.save(str(out_path), "JPEG", quality=JPEG_QUALITY)
    os.chmod(str(out_path), 0o644)
    result["owner"] = "shelter"
else:
    tmp_path = str(out_path) + ".rover-tmp"
    cropped.save(tmp_path, "JPEG", quality=JPEG_QUALITY)
    # ... sudo dance preserved for rover-user manual runs ...
```

This file was not in the original edit scope but was required for T4 to pass. Flagged as a deviation.

---

## Fix 2: Slot-2 Reserved Skip (localDatabase.ts)

### `addPhotoToStrip` — new `position === 1` branch

Before: the `else` branch handled positions 1, 3-6 with a generic "bump everything ≥ position up by 1" — pushing slot-1 → slot-2 (video collision).

After: new `position === 1` branch (parallel to existing `position === 2`):
```typescript
if (position === 1) {
  // Slot-2 reserved for video: cascade from slot 3 upward, skip slot 2 entirely.
  // Reverse order: 6→library, 5→6, 4→5, 3→4, then slot-1→3 (skip 2)
  // Each step uses media_type = 'photo' to leave video at slot 2 untouched
  ...
  database.prepare(`
    UPDATE animal_media SET strip_position = 3
    WHERE shelter_code = ? AND strip_position = 1 AND media_type = 'photo'
  `).run(row.shelter_code);
} else if (position === 2) {
  // ... existing video cascade unchanged ...
```

### `reorderStripPhoto` — new `newPosition === 1` branch

Before: the "moving left" branch did `strip_position + 1` for all rows between newPosition and oldPosition, blindly including slot 2.

After: new `newPosition === 1 && oldPosition > 1` branch:
```typescript
if (newPosition === 1 && oldPosition > 1) {
  // Slot-2 reserved: shift photos at 3..oldPosition-1 up by 1
  database.prepare(`
    UPDATE animal_media SET strip_position = strip_position + 1
    WHERE shelter_code = ? AND strip_position >= 3 AND strip_position < ? AND media_type = 'photo'
  `).run(row.shelter_code, oldPosition);
  // Move old slot-1 photo to position 3 (skipping reserved slot 2)
  database.prepare(`
    UPDATE animal_media SET strip_position = 3
    WHERE shelter_code = ? AND strip_position = 1 AND id != ?
  `).run(row.shelter_code, mediaId);
  // Overflow to library
  database.prepare(`
    UPDATE animal_media SET strip_position = 0
    WHERE shelter_code = ? AND strip_position > 6 AND media_type = 'photo'
  `).run(row.shelter_code);
} else if (oldPosition < newPosition) {
  // ... existing right-shift unchanged ...
```

Both branches use `media_type = 'photo'` filters so a video at slot 2 is never touched.

---

## Build

```
$ npx tsc --noEmit → exit 0
$ npm run build → exit 0
```

---

## T1: Slot-2 skip, video present

Setup: photoA@1, video@2, photoB@3, photoX@4.  
`reorderStripPhoto(photoX, 1)`:

```
After:  photoX@1  video@2  photoA@3  photoB@4
```

- ✅ photoX at position 1
- ✅ video STILL at position 2 (untouched)
- ✅ photoA displaced to position 3 (skipped slot 2)
- ✅ photoB shifted to position 4
- ✅ No duplicate positions

Also tested `addPhotoToStrip(photoLib, 1)` with same layout:
- ✅ photoLib@1, video@2, photoA@3, photoB@4

## T2: Slot-2 skip, slot 2 EMPTY

Setup: photoA@1, (empty@2), photoB@3, photoX@5.  
`reorderStripPhoto(photoX, 1)`:

```
After:  photoX@1  (empty@2)  photoA@3  photoB@4
```

- ✅ photoX at position 1
- ✅ No photo placed at slot 2 (reserved, even when empty)
- ✅ photoA displaced to position 3
- ✅ photoB shifted to position 4

## T3: Non-slot-1 reorder (regression)

Setup: photoA@1, video@2, photoB@3, photoC@4, photoD@5.  
`reorderStripPhoto(photoB, 5)`:

```
After:  photoA@1  video@2  photoC@3  photoD@4  photoB@5
```

- ✅ photoA still at 1
- ✅ video1 still at 2
- ✅ photoC shifted from 4 to 3
- ✅ photoD shifted from 5 to 4
- ✅ photoB moved to 5
- ✅ No duplicate positions

---

## T4: Live Crop — Amari (A2024185)

One-shot script invoked compiled `runCropSweep('A2024185')` as shelter user.

**crop_url BEFORE:** NULL  
**crop_url AFTER:** `https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/crops/A2024185-4992.jpg`

```
$ curl -sI 'https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/crops/A2024185-4992.jpg'
HTTP/2 200
cache-control: public, max-age=3600

$ python3 -c "from PIL import Image; img=Image.open('.../A2024185-4992.jpg'); print(img.size, img.format)"
(800, 800) JPEG
```

- ✅ crop_url written
- ✅ HTTP 200
- ✅ 800×800 square JPEG
- ✅ File owned by shelter:shelter, mode 644

Also swept T2026018 and S2026689 (new from today's sync) — both cropped successfully.

## T5: Remaining NULL crop_url slot-1 rows

```
S2026101 — known source-file 404, source_media_id NULL
```

**1 remaining** (down from 4). S2026101 is the known permanently-broken case (source file doesn't exist on SM). All fixable animals now have crops.

No rows other than crop_url were modified by any sweep.

---

## Service Status

```
$ sudo systemctl restart shelter-app
$ systemctl is-active shelter-app → active
```

Commit hash: `75b3e3c`  
Files changed: `server/src/cropSweep.ts` (1 const + 1 invocation), `server/src/localDatabase.ts` (2 new branches), `scripts/crop-worker.py` (save-path user detection — deviation)
