# Photo Strip Data Model & Slot-1 Auto-Crop Design Diagnosis — 2026-06-21

## Q1: Data Model of the Strip

### Schema

```sql
CREATE TABLE animal_media (
  id TEXT PRIMARY KEY,
  shelter_code TEXT,
  intake_id INTEGER,
  media_type TEXT NOT NULL,        -- 'photo' | 'video' | 'voice'
  source TEXT NOT NULL,            -- 'feeding' | 'activity' | 'profiler' | 'intake' | 'sm' | 'dashboard-upload' | 'sm-sync'
  file_path TEXT NOT NULL,         -- on-disk path (empty string for SM-hosted)
  file_url TEXT,                   -- served URL (SM URL or local URL)
  caregiver TEXT,
  captured_at TEXT NOT NULL,
  transcript TEXT,
  sidecar_path TEXT,
  video_source TEXT,
  source_media_id TEXT,            -- SM mediaid for dedup
  video_generator TEXT,
  duration_seconds REAL,
  tag_marketing INTEGER DEFAULT 0,
  tag_health_concern INTEGER DEFAULT 0,
  tag_behavioral INTEGER DEFAULT 0,
  tag_featured INTEGER DEFAULT 0,
  ai_tags TEXT,
  ai_tagged_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  name TEXT,
  species TEXT,
  strip_position INTEGER DEFAULT 0,  -- 0=library, 1-6=strip slot
  hidden INTEGER DEFAULT 0,
  hidden_at TEXT,
  content_hash TEXT,
  sm_push_skipped_reason TEXT,
  thumbnail_url TEXT
);
```
[VERIFIED — `.schema animal_media` output from shelter.db]

### Strip Position Semantics

- `strip_position = 0`: Library (not on strip). [VERIFIED — `getLibraryPhotos` queries `WHERE strip_position = 0`, localDatabase.ts:4892]
- `strip_position = 1`: Main/primary photo. This is what the matcher and all app cards display. [VERIFIED — `enrichWithLocalPhotos` takes lowest strip_position, localDatabase.ts:5148-5152]
- `strip_position = 2`: Can be photo OR video. Video-in-slot-2 is not structurally enforced — it's a convention. The `/api/animals` endpoint queries slot-2 videos separately: `WHERE media_type = 'video' AND strip_position = 2` (server.ts:923-924). A photo can also occupy slot 2. [VERIFIED — server.ts:921-927]
- `strip_position = 3–6`: Additional photos. [VERIFIED — strip distribution below]

### Six-Slot Limit: Code-Enforced

The limit IS enforced in code, not just convention:

```typescript
// add-to-strip endpoint: server.ts:3877
if (!mediaId || !position || position < 1 || position > 6) {
  res.status(400).json({ success: false, error: 'mediaId and position (1-6) required' });
```
[VERIFIED — server.ts:3877]

```typescript
// addPhotoToStrip cascade: any photo bumped past 6 goes to library
database.prepare(`
  UPDATE animal_media SET strip_position = 0 
  WHERE shelter_code = ? AND strip_position > 6
`).run(row.shelter_code);
```
[VERIFIED — localDatabase.ts:4981-4984]

### Current Distribution

| strip_position | media_type | Count |
|----------------|------------|-------|
| 0 (library) | photo | 585 |
| 0 (library) | video | 20 |
| 0 (library) | voice | 106 |
| 1 | photo | 675 |
| 2 | photo | 121 |
| 2 | video | 34 |
| 3 | photo | 105 |
| 4 | photo | 66 |
| 5 | photo | 44 |
| 6 | photo | 34 |

[VERIFIED — `SELECT strip_position, media_type, COUNT(*) FROM animal_media WHERE hidden=0 GROUP BY 1,2`]

---

## Q2: Drag-Drop Reorder Path

### Dashboard UI: Per-Animal Photo Strip

The strip is rendered inside the animal detail panel. Each slot is a `.photo-slot` div with `data-media-id`, `data-animal-id`, and `data-strip-position` attributes:

```html
<!-- dashboard/index.html:7200-7206 -->
<div class="photo-slot has-photo ${i === 0 ? 'primary' : ''}" 
     draggable="true"
     ondragstart="onPhotoDragStart(event)"
     data-media-id="${photo.id}"
     data-animal-id="${animal.animalId}"
     data-strip-position="${photo.stripPosition || (i + 1)}">
```
[VERIFIED — dashboard/index.html:7200-7205]

### Drag Handlers (dashboard/index.html:8155-8216)

```javascript
function onPhotoDragStart(event) {
  const slot = event.target.closest('.photo-slot');
  if (!slot) return;
  draggedMediaId = slot.dataset.mediaId;
  draggedAnimalId = slot.dataset.animalId;
  slot.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggedMediaId);
}

function onPhotoDrop(event) {
  event.preventDefault();
  const targetSlot = event.target.closest('.photo-slot');
  if (!targetSlot || targetSlot.dataset.animalId !== draggedAnimalId) return;
  
  targetSlot.classList.remove('drag-over');
  const animalIdForReload = draggedAnimalId;
  const mediaIdForReorder = draggedMediaId;
  
  let newPosition;
  if (targetSlot.dataset.mediaId) {
    newPosition = parseInt(targetSlot.dataset.stripPosition) || 1;
  } else {
    newPosition = (parseInt(targetSlot.dataset.slot) || 0) + 1;
  }
  
  fetch(`${API_BASE}/photos/${animalIdForReload}/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaId: mediaIdForReorder, newPosition }),
  })
  .then(res => res.json())
  .then(result => {
    if (result.success) loadPhotosForAnimal(animalIdForReload, true);
  });
}
```
[VERIFIED — dashboard/index.html:8159-8210]

### Server Endpoint: `PUT /api/photos/:animalId/reorder`

```typescript
// server.ts:3932-3959
app.put('/api/photos/:animalId/reorder', async (req, res) => {
  const { mediaId, newPosition, positions } = req.body;
  if (mediaId && newPosition) {
    reorderStripPhoto(mediaId, newPosition);
    // ... return updated strip
  }
});
```
[VERIFIED — server.ts:3932-3959]

### Database Write: `reorderStripPhoto` (localDatabase.ts:5010-5034)

```typescript
export function reorderStripPhoto(mediaId: string, newPosition: number): void {
  const row = database.prepare(
    'SELECT shelter_code, strip_position FROM animal_media WHERE id = ?'
  ).get(mediaId);
  if (!row || row.strip_position === 0) return;
  
  const oldPosition = row.strip_position;
  if (oldPosition === newPosition) return;
  
  if (oldPosition < newPosition) {
    // Moving right: shift others left
    database.prepare(`
      UPDATE animal_media SET strip_position = strip_position - 1
      WHERE shelter_code = ? AND strip_position > ? AND strip_position <= ?
    `).run(row.shelter_code, oldPosition, newPosition);
  } else {
    // Moving left: shift others right
    database.prepare(`
      UPDATE animal_media SET strip_position = strip_position + 1
      WHERE shelter_code = ? AND strip_position >= ? AND strip_position < ?
    `).run(row.shelter_code, newPosition, oldPosition);
  }
  
  database.prepare(
    'UPDATE animal_media SET strip_position = ? WHERE id = ?'
  ).run(newPosition, mediaId);
}
```
[VERIFIED — localDatabase.ts:5010-5034]

**Hook point for auto-crop**: The `reorderStripPhoto` function and the `addPhotoToStrip` function are where "entered slot 1" / "left slot 1" events can be detected. Both write `strip_position` values; checking `newPosition === 1` or `oldPosition === 1` in these functions (or the server endpoint above them) is the interception point.

Additionally, `addPhotoToStrip` (localDatabase.ts:4936-4990) has a cascade path: when inserting at position 2, it shifts positions 2→3, 3→4, etc. This does NOT disturb slot 1. But inserting at position 1 (if the UI supports it) would bump the current slot-1 item. [VERIFIED — localDatabase.ts:4936-4990]

---

## Q3: Original Preservation

**No image bytes are mutated by any strip operation.** [VERIFIED]

Evidence:
- `reorderStripPhoto` (localDatabase.ts:5010-5034): Only UPDATE on `strip_position` column. No file I/O. [VERIFIED]
- `addPhotoToStrip` (localDatabase.ts:4936-4990): Only UPDATE on `strip_position`. No file I/O. [VERIFIED]  
- `removePhotoFromStrip` (localDatabase.ts:4992-5008): Only UPDATE `strip_position = 0`. No file I/O. [VERIFIED]
- The reorder server endpoint (server.ts:3932-3959): Calls `reorderStripPhoto`, then reads updated strip for response. No file operations. [VERIFIED]

The slot is purely a `strip_position` pointer. The underlying image file at `file_url` / `file_path` is never touched by strip operations. Revert-to-original is a pointer change (strip_position or file_url swap), not a file restoration.

---

## Q4: Matcher Display Field

The matcher tile image comes from `enrichWithLocalPhotos` (localDatabase.ts:5129-5164):

```typescript
const rows = database.prepare(`
  SELECT shelter_code, file_url, strip_position
  FROM animal_media
  WHERE media_type = 'photo'
    AND hidden = 0
    AND strip_position > 0
    AND shelter_code IN (${placeholders})
  ORDER BY shelter_code ASC, strip_position ASC
`).all(...codes);

// Take lowest strip_position per group (first row wins)
const photoMap = new Map<string, string>();
for (const row of rows) {
  if (!photoMap.has(row.shelter_code)) {
    photoMap.set(row.shelter_code, row.file_url);
  }
}

// Override photoUrl
return animals.map(a => {
  const localUrl = a.shelterCode ? photoMap.get(a.shelterCode) : undefined;
  if (localUrl) return { ...a, photoUrl: localUrl };
  return a;
});
```
[VERIFIED — localDatabase.ts:5138-5164]

**The exact column read is `file_url` from the lowest `strip_position` row.** This means:
- If a crop derivative is stored as a **new row** with `strip_position = 1`, its `file_url` will automatically reach the matcher tile.
- If stored by updating `file_url` on the existing slot-1 row, it also reaches the matcher.
- If stored in `thumbnail_url`, it would **NOT** reach the matcher — `enrichWithLocalPhotos` reads only `file_url`.

**Critical constraint for SM-hosted slot-1 photos**: 660 of 675 slot-1 rows have `file_url` pointing to SM (`https://service.sheltermanager.com/...`). The on-disk file does not exist. A crop operation would need to: (1) download the SM image, (2) crop it, (3) save locally, (4) update `file_url` to the local derivative URL. This is a download-on-demand operation for 97.8% of slot-1 photos.

---

## Q5: Are the Photos Actually on Disk?

### Q5a: On-Disk Footprint

```
=== du -sh ===
14M   /home/shelter/shelter-apps/data/animal-photos
19M   /home/shelter/shelter-apps/data/library-photos
197M  /home/shelter/shelter-apps/data/animal-media     (mostly videos + thumbnails)
340M  /home/shelter/shelter-apps/data/                  (total data dir)

=== Image file counts per dir ===
/home/shelter/shelter-apps/data/animal-photos:          246
/home/shelter/shelter-apps/data/library-photos:          65
/home/shelter/shelter-apps/data/intake-photos:             0
/home/shelter/shelter-apps/data/animal-media/thumbnails: 229
```
[VERIFIED — `du -sh` and `find ... | wc -l` output]

### Q5b: Broader Sweep

```
Total image files under /home/shelter: 834

Top directories by file count:
  229  /home/shelter/shelter-apps/data/animal-media/thumbnails   (generated thumbnails)
   23  /home/shelter/rover-reports                                (report screenshots)
   21  /home/shelter/rover-reports/screenshots
   19  /home/shelter/shelter-apps/server/node_modules/png-js/test/images  (test fixtures)
   18  /home/shelter/shelter-apps/data/animal-photos/S2026133    (one prolific animal)
   18  /home/shelter/shelter-apps/data/animal-photos/R2024018
```

No image caches found:
- Caddy cache (`/var/lib/caddy`, `/var/cache`): 0 image files [VERIFIED]
- `/tmp`: 104 files (from this diagnosis session's scratch work, not persistent) [VERIFIED]

### Q5c: DB Rows vs Disk Files

| Metric | Count |
|--------|-------|
| DB photo rows (media_type='photo', hidden=0) | **1,630** |
| On-disk original photo files (animal-photos + library-photos) | **311** |
| On-disk thumbnails (animal-media/thumbnails) | **229** |
| **Ratio: disk originals / DB rows** | **19.1%** |

[VERIFIED — sqlite3 COUNT + find ... | wc -l]

**The vast majority of photo rows (80.9%) are SM-hosted URLs with no local copy.**

### Q5d: SM Photo Sync — URL-Only, No Byte Download

The SM Photo Sync (server.ts:12067-12083) stores the SM URL string directly into `file_url`. It does NOT download or persist image bytes locally:

```typescript
// server.ts:12067-12082
insertAnimalMedia({
  shelterCode: animal.shelterCode,
  mediaType: 'photo',
  source: 'sm-sync',
  filePath: '',              // ← EMPTY STRING — no local file
  fileUrl: url,              // ← SM URL stored directly
  caregiver: null,
  capturedAt: new Date().toISOString(),
  name: animal.name || null,
  species: animal.species || null,
  sourceMediaId: mediaId,
  contentHash: smContentHash,  // ← hash is fetched for dedup ONLY, bytes discarded
});
```
[VERIFIED — server.ts:12067-12082. `filePath: ''` confirms no local file path. The hash fetch (server.ts:12045-12052) downloads bytes into memory for `computeContentHash()` only, then discards them — no `writeFileSync` or equivalent.]

### Q5e: Sample of 10 Slot-1 SM URLs — Local File Check

| shelter_code | mediaid | Local files on disk? |
|-------------|---------|---------------------|
| A2025088 | 7720 | NO |
| S2025592 | 6206 | NO |
| S2025896 | 7974 | NO |
| W2026014 | 8046 | YES (12 in animal-photos, 1 in library) |
| A2023124 | 1056 | YES (15 in animal-photos) |
| A2023301 | 1058 | YES (5 in animal-photos, 6 in library) |
| S2026143 | 8228 | YES (1 in animal-photos, 1 in library) |
| A2023228 | 5265 | NO |
| A2025167 | 6492 | NO |
| R2026003 | 8188 | YES (1 in animal-photos) |

5/10 have local files — but those local files are dashboard uploads or profiler captures, not downloaded copies of the SM slot-1 image. The slot-1 `file_url` still points to SM; these local files are at other strip positions or in the library.

[VERIFIED — `find` per shelter_code directory]

### Q5f: Final Slot-1 Counts

| Category | Count | % |
|----------|-------|---|
| Slot-1 with SM URL (remote, no local copy) | **660** | **97.8%** |
| Slot-1 with local URL (dogwalker.4lgshelterapp.duckdns.org) | **15** | **2.2%** |
| **Total slot-1 photos** | **675** | 100% |

[VERIFIED — `SELECT COUNT(*) ... WHERE strip_position=1 AND file_url LIKE ...`]

**Verdict: Photos are NOT all on disk. 97.8% of slot-1 (main display) photos are SM-hosted URLs with no local copy of the image bytes.** The prior diagnosis claim (~90% SM-hosted) was directionally correct but understated for slot-1 specifically — it's 97.8%. Only 15 slot-1 photos are local files (from dashboard uploads or profiler captures that were promoted to slot 1).

**Implication for auto-crop**: A crop pipeline must download the SM image on-demand for 660/675 slot-1 photos. The existing thumbnail generator (`generatePhotoThumbnail` in imageProcessor.ts) requires a local file path — it cannot operate on SM URLs directly without a download step.

---

## Q6: thumbnail_url Column

### Status: LIVE — Active in Dashboard Upload Pipeline

The `thumbnail_url` column is populated by a live mechanism in the upload-to-library handler:

```typescript
// server.ts:4037-4042
if (photoId) {
  try {
    const thumbUrl = await generatePhotoThumbnail(
      filepath, photoId, BASE_URL,
      path.join(ROOT_DIR, 'data', 'animal-media', 'thumbnails')
    );
    setMediaThumbnailUrl(photoId, thumbUrl);
  } catch (thumbErr) {
    console.error(`[Upload] Thumbnail generation failed for ${photoId} (non-fatal):`, thumbErr);
  }
}
```
[VERIFIED — server.ts:4037-4042]

### Generator: `generatePhotoThumbnail` (imageProcessor.ts:98-120)

```typescript
export async function generatePhotoThumbnail(
  originalPath: string,   // ← requires LOCAL file path
  mediaId: string,
  baseUrl: string,
  thumbnailsDir: string
): Promise<string> {
  if (!existsSync(thumbnailsDir)) mkdirSync(thumbnailsDir, { recursive: true });
  const thumbPath = path.join(thumbnailsDir, `${mediaId}.jpg`);
  await sharp(originalPath)
    .resize({ width: 320, fit: 'inside', withoutEnlargement: true })
    .rotate()  // auto-rotate from EXIF
    .jpeg({ quality: 80, mozjpeg: false })  // baseline JPEG
    .toFile(thumbPath);
  return `${baseUrl}/data/animal-media/thumbnails/${mediaId}.jpg`;
}
```
[VERIFIED — imageProcessor.ts:98-120]

### Current Population

| media_type | source | thumbnail_url populated |
|-----------|--------|------------------------|
| photo | activity | 71 |
| photo | dashboard-upload | 60 |
| photo | feeding | 15 |
| photo | form | 5 |
| photo | intake | 17 |
| photo | profiler | 2 |
| video | grok_imagine | 55 |
| video | manual_upload | 4 |
| photo | **sm-sync** | **0** |

[VERIFIED — `SELECT media_type, source, COUNT(*) FROM animal_media WHERE thumbnail_url IS NOT NULL GROUP BY 1,2`]

**170 photos and 59 videos** have thumbnails. Zero SM-synced photos have thumbnails (927 sm-sync photos, all without). This is expected — `generatePhotoThumbnail` requires a local file path, and sm-sync photos have `filePath: ''`.

### Backfill Script

A backfill script was committed (7ca7da1, 2026-06-16) but NOT yet executed. It would generate thumbnails for the ~170 local-file photos that were uploaded before the pipeline was wired. It does NOT cover SM-hosted photos.

### Dashboard Rendering

The dashboard photo strip renders thumbnails when available:

```javascript
// dashboard/index.html:6558
img.src = slot.media?.thumbnail_url || slot.media?.url || slot.animal.photo_url;
```
[VERIFIED — dashboard/index.html:6558]

### Verdict

**Live mechanism, not vestigial.** The upload-to-library handler generates 320px baseline JPEG thumbnails via sharp and stores them at `/data/animal-media/thumbnails/{mediaId}.jpg`. The column is actively read by the dashboard strip renderer. However:
- It only works for **locally-stored files** (requires a file path, not a URL)
- It does NOT reach the matcher — `enrichWithLocalPhotos` reads `file_url`, not `thumbnail_url`
- A crop derivative should use a **separate column or naming convention** (`crop_url`?) rather than overloading `thumbnail_url`, since the thumbnail is 320px and a crop would need to be larger for matcher display

---

## Summary for Auto-Crop Design

| Question | Answer |
|----------|--------|
| Strip model | `strip_position` 1–6 in `animal_media`, 6-slot limit code-enforced |
| Hook point | `reorderStripPhoto()` + `addPhotoToStrip()` in localDatabase.ts — detect `newPosition === 1` |
| Originals preserved? | **Yes** — strip ops are pointer-only, zero file mutation |
| Matcher display | `file_url` from lowest `strip_position` row (via `enrichWithLocalPhotos`) |
| Photos on disk? | **No** — 660/675 slot-1 photos (97.8%) are SM URLs, no local copy |
| thumbnail_url | **Live** — wired in dashboard upload path, 320px sharp/JPEG, but only for local files |

### Key Design Constraints for Auto-Crop

1. **Download-on-demand required**: 97.8% of slot-1 images must be fetched from SM before cropping.
2. **New column or dual-URL approach needed**: `thumbnail_url` is too small (320px) for matcher display. A `crop_url` column or overwriting `file_url` (with original URL preserved elsewhere) is needed.
3. **Revert = pointer swap**: Since originals are never modified, reverting is swapping `file_url` back to the SM URL (or clearing `crop_url`).
4. **enrichWithLocalPhotos reads `file_url` only**: Whatever column holds the cropped image must either BE `file_url` or `enrichWithLocalPhotos` must be updated to prefer `crop_url`.
