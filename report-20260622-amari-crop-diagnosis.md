# Amari (A2024185) Crop Diagnosis + Slot-2 Skip Rule Confirmation

**Date:** 2026-06-22 13:05 UTC  
**Mode:** Read-only diagnosis  

---

## ISSUE A — Slot-2 Skip Rule Confirmation

**Rule:** When a photo is moved/added to strip_position 1, slot 2 is ALWAYS skipped (reserved, whether or not a video occupies it). The displaced slot-1 photo goes to slot 3, and any cascade steps over slot 2 entirely.

**Cleanly expressible: yes.** Two functions need modification:

### `reorderStripPhoto` (localDatabase.ts:5009-5031)

The "moving left" branch at **line 5025-5027**:
```typescript
database.prepare(`
  UPDATE animal_media SET strip_position = strip_position + 1
  WHERE shelter_code = ? AND strip_position >= ? AND strip_position < ?
`).run(row.shelter_code, newPosition, oldPosition);
```

When `newPosition = 1`, this blindly bumps all rows at positions 1 through `oldPosition - 1` up by 1 — including whatever is at position 2. **Fix point:** After the cascade (or in place of it), detect `newPosition === 1` and exclude position 2 from the shift, making the displaced slot-1 photo jump to position 3. Alternatively: run the cascade for positions ≥ 3 only, then explicitly set the old slot-1 photo to position 3.

### `addPhotoToStrip` (localDatabase.ts:4935-4985)

The `else` branch at **lines 4966-4974** has the generic "bump everything ≥ position up by 1" logic. For `position = 1`, it shifts slot 1 → 2, slot 2 → 3, etc. — same problem. **Fix point:** Add a `position === 1` special case (parallel to the existing `position === 2` special case at lines 4941-4962) that cascades from slot 3 upward and places the old slot-1 photo at position 3 directly.

The rule is simple: both functions already have branching logic for special positions. Adding `position === 1` branches that skip slot 2 is structurally identical to the existing `position === 2` branch.

---

## ISSUE B — Amari's Matcher Card Is Not Square

### 1. Full animal_media dump for A2024185

| id | strip_pos | media_type | source | source_media_id | file_url (tail) | crop_url | hidden |
|----|-----------|------------|--------|-----------------|-----------------|----------|--------|
| efa5cde8-... | 0 | photo | sm | 4486 | ...mediaid=4486&ts=1737882928.0 | NULL | 0 |
| 3dfb941e-... | 0 | video | grok_imagine | 01ef1f8d-... | .../videos/3dfb941e-...mp4 | NULL | 0 |
| **21532db8-...**  | **1** | **photo** | **sm** | **4992** | **...mediaid=4992&ts=1743879100.0** | **NULL** | **0** |
| 4169abb0-... | 2 | photo | sm | 4485 | ...mediaid=4485&ts=1737882921.0 | NULL | 0 |
| 6809808f-... | 3 | photo | sm | 6688 | ...mediaid=6688&ts=1758496966.0 | NULL | 0 |
| 493a9666-... | 4 | video | grok_imagine | 01ef1f8d-... | .../videos/493a9666-...mp4 | NULL | 0 |
| 01ef1f8d-... | 5 | photo | sm | 4484 | ...mediaid=4484&ts=1737882946.0 | NULL | 0 |
| f3c10d91-... | 6 | photo | sm | 3709 | ...mediaid=3709&ts=1729542221.0 | NULL | 0 |

**Slot-1 row:** `21532db8-3dea-4885-bcab-387ff205194e` — source=sm, source_media_id=4992.

Note: Amari has **no video at slot 2** (it's a photo). Slot 4 has a video. This is a side observation — the video slot convention is not enforced for Amari.

### 2. Slot-1 crop_url state: NULL

**crop_url is NULL.** The crop was never written for this specific slot-1 photo (mediaid 4992).

**Crop file on disk:** No file `A2024185-4992.jpg` exists in `data/animal-media/crops/`. A stale crop file `A2024185-6688.jpg` (107,916 bytes, Jun 21 20:58) exists — that's from mediaid 6688, which WAS at position 1 during the Jun 21 bulk backfill but is now at position 3. The sweep's "clear set" would have NULLed its crop_url when it moved off slot 1.

**Source URL reachable:** 
```
curl -sI -L mediaid=4992 → HTTP 303 → HTTP 200, Content-Type: image/jpeg
```
The SM source is a valid, downloadable JPEG (89,327 bytes). The crop worker WOULD be able to process it.

### 3. What the matcher API serves for Amari

```
GET /api/animals → A2024185:
  photoUrl: https://service.sheltermanager.com/asmservice?...mediaid=4992&ts=1743879100.0
  video_url: None
```

**The matcher serves the raw SM original** (uncropped, portrait 3:4). This is because `enrichWithLocalPhotos` (localDatabase.ts:5147) does `crop_url || file_url` — and crop_url is NULL, so file_url is used.

The `enrichWithLocalPhotos` query at **localDatabase.ts:5137**:
```sql
SELECT shelter_code, file_url, crop_url, strip_position
FROM animal_media
WHERE media_type = 'photo' AND hidden = 0 AND strip_position > 0 AND shelter_code IN (?)
ORDER BY shelter_code ASC, strip_position ASC
```

For Amari, the lowest strip_position > 0 is position 1 (the 21532db8 row). That's the correct row — no ordering ambiguity. But crop_url is NULL, so the original file_url is returned.

### 4. CropSweep failure diagnosis

**The sweep ran and FAILED.** From `journalctl`:

```
Jun 22 06:00:33 [CropSweep] Post-sync sweep: cropped=0, cleared=0, failed=3
```

The sweep found the 4 NULL-crop slot-1 rows, attempted to crop, and 3 failed (the 4th — one of the two animals created during the sync at 06:00:01 — may have been a timing edge case or counted differently).

**Root cause of ALL sweep failures:**

```
$ sudo -u shelter python3 -c "from ultralytics import YOLO"
ModuleNotFoundError: No module named 'ultralytics'

$ sudo -u shelter python3 -c "import torch"
ModuleNotFoundError: No module named 'torch'
```

**`ultralytics` and `torch` are installed only in rover's user-local Python packages** (`/home/rover/.local/lib/python3.12/site-packages/`). The shelter-app service runs as the `shelter` user, whose Python path doesn't include rover's local packages. Every `execSync('python3 crop-worker.py --ids ...')` call from the sweep fails when the worker tries to `from ultralytics import YOLO`.

**Why the existing 688 crops work:** The Stage 1b backfill (Jun 21, commit 514c63a) was run manually as the **rover user** from the command line, where `ultralytics` is available. Those crop_url values were written to DB and the crop files were generated. The cropSweep module (Stage 2a-2b) was wired into the **server process** (shelter user) afterward, and has never successfully generated a single crop.

**Evidence chain:**
- Stage 2b live verify (Jun 21 23:25 UTC): "0 cropped, 1 failed (S2026101 404)" — at that time only S2026101 needed a crop. The failure was attributed to the 404 source file, masking the YOLO import failure.
- Jun 22 06:00 nightly sync: 2 new animals (T2026018, S2026689) got slot-1 filled → NULL crop_url. Sweep ran → 3 failed, 0 cropped. The YOLO import error is the actual failure for all 3 non-404 candidates.

The crash-loop visible in journalctl at Jun 21 22:08-22:09 (23 restarts, `__dirname not defined in ES module scope`) was from the **stale compiled dist** before the rebuild. That's a separate issue — the ESM polyfill fix was included in commit a8ba914 and the rebuild at 22:09 resolved it.

### 5. Blast radius: NULL crop_url slot-1 rows

| shelter_code | media_id | source | source_media_id | created_at | Notes |
|-------------|----------|--------|-----------------|------------|-------|
| **A2024185** | 21532db8-... | sm | 4992 | 2026-04-14 | **Amari — slot-1 changed by Jun 21 globe-swap** |
| S2026101 | f4b53c8d-... | sm | (NULL) | 2026-04-14 | Known: source file 404 |
| T2026018 | 7afb7e4c-... | sm-sync | 9501 | 2026-06-22 | New animal from today's sync |
| S2026689 | 9991b732-... | sm-sync | 9502 | 2026-06-22 | New animal from today's sync |

**4 total** out of 691 slot-1 photo rows (687 have crop_url, 4 do not).

- **S2026101** is a known 404 — source file doesn't exist. Would fail regardless.
- **A2024185 (Amari)** had its slot-1 swapped during the Jun 21 globe correction. The new slot-1 photo never got cropped because the sweep can't run YOLO.
- **T2026018, S2026689** are brand new from today's sync. Their crops weren't generated for the same reason.

**Class:** Any animal whose slot-1 photo changed (or was newly created) AFTER the Jun 21 backfill will have NULL crop_url. This will grow by 1-3 animals per nightly sync as new animals are onboarded. The sweep is structurally broken for all new crops.

### Fix required

**Install `ultralytics` and `torch` system-wide** (or in a location accessible to the shelter user):
```bash
sudo pip3 install ultralytics  # pulls torch as dependency
```

Or create a virtualenv accessible to the shelter user and update the crop-worker.py shebang or the cropSweep `execSync` call to use that venv's Python.

After fixing the Python environment, run a one-time sweep to backfill the 3 fixable NULL-crop rows (excluding S2026101 which has no source file).
