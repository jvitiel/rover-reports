# Photo Thumbnail System — Design Mapping

**Date:** 2026-06-16 20:49 UTC  
**Scope:** Read-only design mapping — no code changes

---

## 1. STORAGE & SERVING

### On-disk locations [VERIFIED]

| Directory | Contents | Naming | Owner |
|---|---|---|---|
| `data/library-photos/{shelterCode}/` | Dashboard/profile-form/profiler uploads (processed) | `{shelterCode}-library-{timestamp}-{hex}.jpg` | shelter:shelter |
| `data/animal-photos/{shelterCode}/` | Camera captures from apps (raw base64) | `{timestamp}_{source}_{caregiver}.jpg` | shelter:shelter |
| `data/animal-media/videos/` | Generated videos | `{uuid}.mp4` | shelter:shelter |
| `data/animal-media/thumbnails/` | Video thumbnails (existing) | `{uuid}.jpg` (matches media ID) | shelter:shelter |
| `intake-photos/{intakeId}/` | Intake form photos | `photo.{ext}` | shelter:shelter |
| (no local file) | SM/SM-sync photos | External URL at `service.sheltermanager.com` | n/a |

### Serving config [VERIFIED]

**Single Express static mount:** `server/src/server.ts:9452`
```js
app.use('/data', express.static(path.join(ROOT_DIR, 'data'), { maxAge: '1h' }));
```

This serves everything under `data/` — library-photos, animal-photos, animal-media (videos + thumbnails) — via a single route. URL pattern: `{BASE_URL}/data/{subpath}`.

**Caddy:** Routes `/data/*` requests to the Express server for domains that need it (dogwalker, volunteer, staff, staging-staff, dashboard). [VERIFIED: Caddyfile `@data path /data/*` → `reverse_proxy @data localhost:3000`]

**Intake photos:** Separate mount at `server/src/server.ts:10532`:
```js
app.use('/intake-photos', express.static(INTAKE_PHOTOS_DIR));
```

**No on-the-fly resize capability.** No image proxy, no CDN transform, no query-param-based resize. Purely static file serving. [VERIFIED]

---

## 2. VIDEO THUMBNAIL PRECEDENT

### (a) Generation [VERIFIED]

`server/src/server.ts:4003-4017` — in the POST `/api/generate-video` handler, after the video file is saved:

```js
const thumbDir = path.join(ROOT_DIR, 'data', 'animal-media', 'thumbnails');
const thumbPath = path.join(thumbDir, `${newMediaId}.jpg`);
execFileSync('ffmpeg', [
  '-y', '-i', localPath,
  '-ss', '00:00:01', '-vframes', '1',
  '-vf', 'scale=320:-1', '-q:v', '3',
  thumbPath,
], { timeout: 15000, stdio: 'pipe' });
thumbnailUrl = `${BASE_URL}/data/animal-media/thumbnails/${newMediaId}.jpg`;
```

- Generated at video creation time (inline, non-blocking failure)
- 320px wide, aspect-preserved
- JPEG quality 3 (ffmpeg scale, roughly ~85% quality)

### (b) Storage [VERIFIED]

- **Path:** `data/animal-media/thumbnails/{mediaId}.jpg`
- **Naming:** Uses the `animal_media.id` UUID as filename — NOT the video filename
- All 59 video thumbnails present on disk, 59/59 match DB records [VERIFIED]

### (c) DB recording [VERIFIED]

`animal_media.thumbnail_url` column — stores the full URL:
```
https://dogwalker.4lgshelterapp.duckdns.org/data/animal-media/thumbnails/{uuid}.jpg
```

Set in the INSERT statement at `server/src/server.ts:4029-4041`.

### (d) Client references [VERIFIED]

- `formatPhotoForApi()` at `server/src/server.ts:3734` returns `thumbnailUrl: row.thumbnail_url || null` [VERIFIED]
- Featured grid: `renderVideoSlot()` at `dashboard/index.html:6570` — `img.src = slot.media.thumbnail_url || slot.animal.photo_url` [VERIFIED]
- Strip: `renderPhotoSlots()` at `dashboard/index.html:7190` — video thumbnails used in `<img src="${escapeHtml(photo.thumbnailUrl)}">` [VERIFIED]
- Library: `renderLibrarySection()` at `dashboard/index.html:7239` — same pattern [VERIFIED]
- Lightbox comparison column: `renderComparisonColumn()` at `dashboard/index.html:8614` — `img.src = item.thumbnail_url` [VERIFIED]

**Key pattern:** Videos use `thumbnailUrl` for small display, `url` for full playback. Photos can mirror this exactly.

---

## 3. animal_media SCHEMA [VERIFIED]

```sql
CREATE TABLE animal_media (
  id TEXT PRIMARY KEY,
  shelter_code TEXT,
  intake_id INTEGER,
  media_type TEXT NOT NULL,          -- 'photo' | 'video' | 'voice'
  source TEXT NOT NULL,              -- 'sm-sync' | 'sm' | 'dashboard-upload' | 'activity' | 'feeding' | 'profiler' | 'intake' | 'form'
  file_path TEXT NOT NULL,           -- local disk path (empty for SM external URLs)
  file_url TEXT,                     -- public URL
  caregiver TEXT,
  captured_at TEXT NOT NULL,
  transcript TEXT,
  sidecar_path TEXT,
  video_source TEXT,
  source_media_id TEXT,
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
  strip_position INTEGER DEFAULT 0,
  hidden INTEGER DEFAULT 0,
  hidden_at TEXT,
  content_hash TEXT,
  sm_push_skipped_reason TEXT,
  thumbnail_url TEXT                 -- ← ALREADY EXISTS, used by videos, NULL for all photos
);
```

**`thumbnail_url` already exists.** Currently populated for all 59 videos, NULL for all 1,614 photos. Photos can reuse it with zero schema change. [VERIFIED]

### Relevant field mapping

| Field | Purpose | Photo thumbnail use |
|---|---|---|
| `file_path` | Local disk path to original | Stays as-is |
| `file_url` | Public URL to original | Stays as-is (used for lightbox/full-size) |
| `thumbnail_url` | Public URL to thumbnail | **Set this for photos** — same pattern as videos |

---

## 4. processUploadedImage — CURRENT STATE [VERIFIED]

**File:** `server/src/imageProcessor.ts:42-79`

```typescript
export async function processUploadedImage(
  buffer: Buffer,
  mimetype: string = '',
  originalname: string = ''
): Promise<{ buffer: Buffer; contentHash: string }> {
  // Pre-convert HEIC to JPEG (sharp lacks H.265 codec)
  let inputBuffer = buffer;
  if (isHeicInput(mimetype, originalname)) {
    inputBuffer = Buffer.from(await heicConvert({ buffer, format: 'JPEG', quality: 0.95 }));
  }

  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  // Resize: longest edge max 2048, no upscaling
  let resizeOptions: sharp.ResizeOptions | undefined;
  if (width && height) {
    const longestEdge = Math.max(width, height);
    if (longestEdge > 2048) {
      resizeOptions = { width: width >= height ? 2048 : undefined, height: height > width ? 2048 : undefined, fit: 'inside', withoutEnlargement: true };
    }
  }

  let pipeline = image;
  if (resizeOptions) pipeline = pipeline.resize(resizeOptions);

  const outputBuffer = await pipeline
    .rotate()                              // Auto-rotate via EXIF
    .jpeg({ quality: 85, mozjpeg: true })  // ← produces progressive JPEG
    .toBuffer();

  return { buffer: outputBuffer, contentHash: computeContentHash(outputBuffer) };
}
```

### Current return value and callers [VERIFIED]

Returns `{ buffer: Buffer; contentHash: string }`. Single caller: `server/src/server.ts:3909` (upload-to-library endpoint).

Caller writes `buffer` to disk, uses `contentHash` for dedup in `insertAnimalMedia`.

### Where thumbnail generation slots in [INFERRED]

Two options:

**Option A — extend processUploadedImage:**
Return a third field: `{ buffer, contentHash, thumbnailBuffer }`. Generate thumbnail from the same sharp pipeline with a second `.resize()` + `.toBuffer()` call. The caller writes both files and passes the thumbnail URL to `insertAnimalMedia`.

**Option B — separate function (mirrors video pattern):**
After writing the original, call a new `generatePhotoThumbnail(originalPath, mediaId)` function that reads the file, resizes with sharp to ~320px, writes to `data/animal-media/thumbnails/{mediaId}.jpg`. This mirrors the video pattern exactly and is also usable for backfill.

**Option B is cleaner** because: (1) it mirrors video thumbnails exactly, (2) it works for backfill of existing files, (3) it works for camera-capture paths that don't use processUploadedImage, (4) it decouples thumbnail generation from upload processing.

---

## 5. ALL SMALL-DISPLAY RENDER POINTS

### Dashboard (`dashboard/index.html`) [VERIFIED]

| Context | Size | File:Line | Current `<img>` src | Needs thumbnail? |
|---|---|---|---|---|
| Featured grid photo slot | 80×80 CSS | `6553` | `slot.media?.url` (full-res) | ✅ YES |
| Featured grid video slot | 80×80 CSS | `6570` | `slot.media.thumbnail_url` (already thumbed) | ✅ Already done |
| Strip photo (renderPhotoSlots) | 80×80 CSS | `7192` | `photo.photoUrl \|\| photo.fileUrl` (full-res) | ✅ YES |
| Strip video (renderPhotoSlots) | 80×80 CSS | `7190` | `photo.thumbnailUrl` (already thumbed) | ✅ Already done |
| Library photo (renderLibrarySection) | 80×80 CSS | `7241` | `photo.photoUrl \|\| photo.fileUrl` (full-res) | ✅ YES |
| Library video (renderLibrarySection) | 80×80 CSS | `7239` | `photo.thumbnailUrl` (already thumbed) | ✅ Already done |
| Lightbox comparison column (photo) | ~60×80 CSS | `8631` | `item.url` (full-res) | ✅ YES |
| Lightbox comparison column (video) | ~60×80 CSS | `8614` | `item.thumbnail_url` (already thumbed) | ✅ Already done |
| Story featured thumb | 48×48 CSS | `10125` | `story.photo_1_url` (from stories table, not animal_media) | ⚠️ SEPARATE — story photos are not in animal_media |
| Story list thumb | 48×48 CSS | `10170` | `story.photo_1_url` | ⚠️ SEPARATE |
| Event featured thumb | 48×48 CSS | `10473` | `event.photo_url` | ⚠️ SEPARATE — event photos are not in animal_media |
| Event list thumb | 48×48 CSS | `10606` | `event.photo_url` | ⚠️ SEPARATE |
| Intake photo thumbnail | 150×150 CSS | `11493` | `intake.photo_url` | ⚠️ LOW PRIORITY — intake photos are separate |
| Wellbeing photo thumb | 130×130 CSS | `13191` | `photo.url` (from daily_activities) | ⚠️ SEPARATE — activity photos |
| Vol scan thumb | 120×160 CSS | `13664` | volunteer scan page URL | ⚠️ SEPARATE — scanned document images |

### Staff PWA (`staff-pwa/app.js`) [VERIFIED]

| Context | Size | File:Line | Current src | Needs thumbnail? |
|---|---|---|---|---|
| Active session card | 70×70 CSS | `765` | `session.photoUrl` (SM or enriched local strip photo) | ✅ YES |
| Profile recording card | 70×70 CSS | `1164` | `session.photo_url` | ✅ YES |
| Behavior session card | 70×70 CSS | `1267` | `session.photoUrl` | ✅ YES |
| Animal list card | ~full width | `1902` | `animal.photoUrl` | ✅ YES |
| Profiler capture preview | large | `2180` | canvas dataURL (temporary, not persisted display) | ❌ NO |

### Volunteer PWA (`volunteer-pwa/app.js`) [VERIFIED]

| Context | Size | File:Line | Current src | Needs thumbnail? |
|---|---|---|---|---|
| Pending animal card | card-size | `375` | `pendingAnimal.photoUrl` | ✅ YES |
| Active session card | 70×70 CSS | `497` | `session.photoUrl` | ✅ YES |
| Behavior animal card | card-size | `759` | `animal.photoUrl` | ✅ YES |

### Dogwalker PWA (`dogwalker-pwa/app.js`) [VERIFIED]

| Context | Size | File:Line | Current src | Needs thumbnail? |
|---|---|---|---|---|
| Dog photo (walk screen) | card-size | `412` | `pendingDog.photoUrl` | ✅ YES |
| Active walk card | card-size | `534` | `walk.photoUrl` | ✅ YES |

### Matcher (`matcher-web/index.html`) [VERIFIED]

| Context | Size | File:Line | Current src | Needs thumbnail? |
|---|---|---|---|---|
| Modal photo | large | `175` | `modalPhoto.src` (full-size display) | ❌ NO — full-size context |

### FULL-SIZE DISPLAY POINTS (keep using original) [VERIFIED]

| Context | File:Line | Notes |
|---|---|---|
| Lightbox main image | `dashboard/index.html:8432` | `imgEl.src = url` — full-res intended |
| Lightbox main video | `dashboard/index.html:8427` | `videoEl.src = url` — full playback |
| Lightbox select main | `dashboard/index.html:8652` | switches main display |
| SM push (to ShelterManager) | `server/src/shelterManagerPush.ts` | Pushes original file bytes |
| WordPress upload | `server/src/server.ts:2910` | Uploads original for website |

### SOURCE OF `photoUrl` IN NON-DASHBOARD APPS [VERIFIED]

The volunteer/staff/dogwalker apps get `photoUrl` from animal list APIs. These call `enrichWithLocalPhotos()` (`localDatabase.ts:5008-5044`) which overrides the SM `photoUrl` with the strip position-1 photo's `file_url` (full-res original). **This is where a thumbnail swap would have the widest impact** — if this function returned a thumbnail URL instead of the full-res URL for the card-display context, ALL app cards would benefit.

However, `enrichWithLocalPhotos` serves dual purpose: cards (small) AND the profiler's initial display. The card context needs thumbnails; the profiler context does not. This may require the API to return both `photoUrl` (original) and `thumbnailUrl` (thumb), letting clients choose.

---

## 6. SERVING THE THUMBNAIL

### Recommended path (mirrors video pattern) [INFERRED]

**Storage:** `data/animal-media/thumbnails/{mediaId}.jpg` — same directory as video thumbnails, same naming convention (media UUID). Already served by the `/data` static mount. [VERIFIED: directory exists, 59 video thumbs present]

**URL pattern:** `{BASE_URL}/data/animal-media/thumbnails/{mediaId}.jpg` — identical to video thumbnails.

### formatPhotoForApi today [VERIFIED]

`server/src/server.ts:3720-3735`:
```js
function formatPhotoForApi(row: any): any {
  return {
    id: row.id,
    shelterCode: row.shelter_code,
    photoUrl: row.file_url,
    fileUrl: row.file_url,
    mediaType: row.media_type || 'photo',
    source: row.source,
    capturedAt: row.captured_at,
    stripPosition: row.strip_position,
    caregiver: row.caregiver,
    name: row.name,
    species: row.species,
    tagMarketing: row.tag_marketing === 1,
    thumbnailUrl: row.thumbnail_url || null,  // ← ALREADY RETURNED, just always null for photos
  };
}
```

**`thumbnailUrl` is already in the API response shape.** Once `thumbnail_url` is populated in the DB, the API will return it automatically. Zero API change needed. [VERIFIED]

### resolveMediaById BUG [VERIFIED]

`localDatabase.ts:2396` — `resolveMediaById` hard-codes `thumbnailUrl: media.file_url` for ALL media types, ignoring the `thumbnail_url` column:

```js
return {
  mediaType: mediaType as 'photo' | 'video',
  animalId,
  shelterCode,
  url: media.file_url as string,
  thumbnailUrl: media.file_url as string,  // ← BUG: should be media.thumbnail_url
};
```

This is used by the featured grid API. **Must be fixed** to read `thumbnail_url` from the row — otherwise featured grid photos will never use thumbnails even when populated. (Videos work around this via `resolveVideoThumbnailUrl()` which has its own lookup.)

### enrichWithLocalPhotos [VERIFIED]

`localDatabase.ts:5018-5028` — currently queries only `file_url` from strip photos. To support thumbnails in app cards, would need to also select `thumbnail_url` (or a separate query/join) and return it alongside `photoUrl`. This would require the animal list API responses to include a `thumbnailUrl` field — a small but cross-app change.

---

## 7. BACKFILL SCOPE

### Local photo files needing thumbnails [VERIFIED]

| Location | Count | Notes |
|---|---|---|
| `data/library-photos/` | **65 files** | All processed JPEGs (progressive, up to 2048px) |
| `data/animal-photos/` (jpg) | **246 files** | Raw camera captures (baseline, 480×640) |
| **Total local photos** | **311 files** | All need thumbnail generation |

### DB records by source [VERIFIED]

| Source | Total records | Has local file | Has thumbnail | Needs backfill? |
|---|---|---|---|---|
| sm-sync | 877 | 0 (external URL) | 0 | ⚠️ Special — see below |
| sm | 565 | 0 (external URL) | 0 | ⚠️ Special — see below |
| activity | 71 | 71 | 0 | ✅ YES — 71 files |
| dashboard-upload | 60 | 60 | 0 | ✅ YES — 60 files |
| intake | 19 | 19 | 0 | ✅ YES — 19 files |
| feeding | 15 | 15 | 0 | ✅ YES — 15 files |
| form | 5 | 5 | 0 | ✅ YES — 5 files |
| profiler | 2 | 2 | 0 | ✅ YES — 2 files |
| **Total with local files** | **243** | **243** | **0** | ✅ |
| **Total SM (no local file)** | **1,442** | **0** | **0** | ⚠️ |

**Note:** 311 on-disk files vs 243 DB records with local files — the delta (68 files) likely represents animal-photos that aren't in animal_media (older activity photos from before dual-write, or orphaned files). The backfill script should work from DB records (not filesystem), since the DB is the source of truth for what appears in the UI.

### SM external-URL photos [VERIFIED]

1,442 SM records have no local file — `file_path` is empty, `file_url` is an SM service URL. Options:

**Option A — Download + thumbnail at sync time:** During SM-sync (`server.ts:10939`), after fetching photo bytes for content-hash (already done at line 10992-10998), generate a thumbnail and save locally. This adds ~0.5s per new SM photo during nightly sync but produces local thumbnails.

**Option B — Download + thumbnail in backfill only:** Run a one-time backfill that fetches each SM URL, generates a thumbnail, stores locally. New SM photos during sync would also need the generation step.

**Option C — Leave SM photos as-is:** SM photos are already 768×1024 baseline JPEG (~170KB). They're not the largest offenders. The drag bug doesn't affect them (they drag fine). Thumbnail generation could be deferred for SM photos.

**Recommendation:** Option C for initial launch — SM photos work fine today and are already moderate-sized. Add SM thumbnail generation later if page load performance warrants it.

---

## CONCLUSION

### (a) Storage + serving model

All photos served via a single `express.static('/data', ...)` mount at `server.ts:9452` with 1-hour cache. Library-photos (processed) in `data/library-photos/`, camera captures in `data/animal-photos/`, SM photos are external URLs. No resize/transform layer exists. [VERIFIED]

### (b) Video-thumbnail pattern to mirror

Videos use `data/animal-media/thumbnails/{mediaId}.jpg` (320px wide, JPEG), stored in `animal_media.thumbnail_url`, returned via `formatPhotoForApi().thumbnailUrl`. **Photos can reuse the exact same column, directory, and naming convention with zero schema change.** [VERIFIED]

One bug to fix: `resolveMediaById()` at `localDatabase.ts:2396` hard-codes `thumbnailUrl: media.file_url` instead of reading `thumbnail_url` from the row. [VERIFIED]

### (c) Where thumbnail generation slots into processUploadedImage

Best approach: a **separate `generatePhotoThumbnail(originalPath, mediaId)` function** (mirrors the video ffmpeg call pattern but uses sharp). Called after file write in upload-to-library, and independently for backfill. Returns the thumbnail URL. This is cleaner than extending `processUploadedImage`'s return value because it works for both new uploads and backfill, and for camera-capture paths that bypass `processUploadedImage`. [INFERRED]

### (d) Complete small-display render points to switch + full-size to leave alone

**Switch to thumbnail (13 points across 4 apps + dashboard):**
- Dashboard: featured grid photo (`6553`), strip photo (`7192`), library photo (`7241`), comparison column photo (`8631`)
- Staff PWA: active session card (`765`), profile card (`1164`), behavior card (`1267`), animal list (`1902`)
- Volunteer PWA: pending card (`375`), session card (`497`), behavior card (`759`)
- Dogwalker PWA: dog photo (`412`), walk card (`534`)

**Leave as full-size (5 points):**
- Dashboard lightbox main image (`8432`), lightbox main video, lightbox select-main (`8652`)
- SM push (shelterManagerPush.ts), WordPress upload (server.ts:2910)

**Separate systems (not animal_media, lower priority):**
- Story thumbs, event thumbs, intake thumbs, wellbeing activity thumbs, volunteer scan thumbs — these use their own tables/storage and would need separate thumbnail handling if desired.

### (e) SM external-URL images

SM photos are 768×1024 baseline JPEG, already draggable, moderate-sized. **Recommend deferring SM thumbnails** — focus initial implementation on the 243 local-file records (311 on-disk files). SM thumbnails can be added later by downloading during sync and generating locally. [INFERRED]

### (f) Backfill count

- **243 DB photo records** with local files need thumbnails (60 dashboard-upload + 71 activity + 15 feeding + 2 profiler + 19 intake + 5 form + 71 other)
- **311 on-disk photo files** total (68 files not tracked in DB)
- **1,442 SM external-URL records** — deferred
- **59 video thumbnails** already exist and are working (no backfill needed)
- Estimated backfill time: ~30-60 seconds for 243 local files using sharp (sub-250ms per image)
