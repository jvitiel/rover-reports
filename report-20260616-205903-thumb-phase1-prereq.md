# Thumbnail Phase 1 — Pre-Implementation Code Extraction

**Date:** 2026-06-16 20:59 UTC  
**Scope:** Read-only — exact code for implementation phase

---

## 1. Upload-to-Library Handler (POST /api/photos/:shelterCode/upload-to-library)

**File:** `server/src/server.ts:3885-3945` [VERIFIED]

```typescript
app.post('/api/photos/:shelterCode/upload-to-library', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const shelterCode = req.params.shelterCode as string;
    
    // Validate animal exists via SM cache lookup (include unavailable animals - staff photograph all statuses)
    const animal = await getAnimalById(shelterCode, true) as Animal | null;
    if (!animal) {
      res.status(404).json({ success: false, error: 'Animal not found' } as ApiResponse<null>);
      return;
    }
    
    // Validate file exists
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No photo provided' } as ApiResponse<null>);
      return;
    }
    
    // Validate file type
    if (!isAcceptableImageMimetype(req.file)) {
      res.status(400).json({ success: false, error: 'Invalid file type' } as ApiResponse<null>);
      return;
    }
    
    // Process image: resize, strip EXIF, convert to JPEG
    const { buffer: processedBuffer, contentHash } = await processUploadedImage(req.file.buffer, req.file.mimetype, req.file.originalname);
    
    // Generate unique filename
    const randomSuffix = randomBytes(3).toString('hex');
    const filename = `${shelterCode}-library-${Date.now()}-${randomSuffix}.jpg`;
    
    // Storage directory (matches profiler pattern but in library-photos)
    const photosDir = path.join(ROOT_DIR, 'data', 'library-photos', shelterCode);
    if (!existsSync(photosDir)) mkdirSync(photosDir, { recursive: true });
    
    const filepath = path.join(photosDir, filename);
    writeFileSync(filepath, processedBuffer);
    
    // Build file URL (matches profiler pattern)
    const fileUrl = `${BASE_URL}/data/library-photos/${shelterCode}/${filename}`;
    
    // Captured timestamp in Eastern time
    const capturedAt = new Date().toLocaleString('sv-SE', { timeZone: 'America/New_York' }).replace(' ', 'T');
    
    // Insert into animal_media with strip_position = 0 (library only)
    const photoId = insertAnimalMedia({
      shelterCode: shelterCode,
      mediaType: 'photo',
      source: req.body.source || 'dashboard-upload',
      filePath: filepath,
      fileUrl: fileUrl,
      caregiver: req.body.caregiver || null,
      capturedAt: capturedAt,
      name: animal.name,
      species: animal.species,
      contentHash: contentHash,
    });
    
    console.log(`[Upload] Photo uploaded to library for ${shelterCode}: ${filepath}`);
    
    res.json({ success: true, data: { photoId, fileUrl } });
  } catch (error) {
    console.error('[Upload] Error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' } as ApiResponse<null>);
  }
});
```

### Key observations [VERIFIED]:
- **mediaId:** Generated inside `insertAnimalMedia()` as `randomUUID()` — the caller does NOT know the id before calling insert. The id is returned as `photoId` (string | null).
- **Original file path:** `data/library-photos/{shelterCode}/{shelterCode}-library-{timestamp}-{hex}.jpg`
- **Original file URL:** `{BASE_URL}/data/library-photos/{shelterCode}/{filename}`
- **No thumbnail_url passed** to insertAnimalMedia — the function doesn't accept it (see §2).

---

## 2. insertAnimalMedia (localDatabase.ts:4686-4760)

**File:** `server/src/localDatabase.ts:4686` [VERIFIED]

```typescript
export function insertAnimalMedia(params: {
  shelterCode?: string | null;
  intakeId?: number | null;
  mediaType: 'photo' | 'voice' | 'video';
  source: 'feeding' | 'activity' | 'profiler' | 'intake' | 'sm' | 'dashboard-upload' | 'sm-sync';
  filePath: string;
  fileUrl: string;
  caregiver: string | null;
  capturedAt: string;
  transcript?: string | null;
  sidecarPath?: string | null;
  name?: string | null;
  species?: string | null;
  tagMarketing?: boolean;
  sourceMediaId?: string | null;
  contentHash?: string | null;
}): string | null {
```

### INSERT column list [VERIFIED]:
```sql
INSERT INTO animal_media (id, shelter_code, intake_id, media_type, source, file_path, file_url,
  caregiver, captured_at, transcript, sidecar_path, name, species, tag_marketing,
  strip_position, source_media_id, content_hash)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
```

### Does it accept thumbnail_url? [VERIFIED]

**No.** The function signature has no `thumbnailUrl` parameter. The INSERT does not include `thumbnail_url` in its column list. The column defaults to NULL.

### How videos set thumbnail_url [VERIFIED]

Videos **bypass insertAnimalMedia entirely**. The generate-video handler (`server.ts:4027-4041`) uses a **raw `database.prepare(...).run(...)` call** with an inline INSERT that includes `thumbnail_url` as the last column:

```sql
INSERT INTO animal_media (
  id, shelter_code, intake_id, media_type, source, file_path, file_url,
  captured_at, duration_seconds, source_media_id, video_source, video_generator,
  strip_position, hidden, created_at, thumbnail_url
) VALUES (?, ?, ?, 'video', 'grok_imagine', ?, ?, ?, ?, ?, 'grok_imagine', 'grok-imagine-video', 0, 0, ?, ?)
```

**Two options for photos:**
- **Option A:** Add `thumbnailUrl?: string | null` to `insertAnimalMedia` params, add `thumbnail_url` to the INSERT column list. Clean, single function.
- **Option B:** Call `insertAnimalMedia` first (get id back), then UPDATE `thumbnail_url` separately. Matches video pattern's directness less cleanly but avoids modifying a function with 8+ callers.
- **Option C (recommended):** Generate thumbnail after insert using the returned id, then UPDATE. This mirrors how you'd do backfill anyway and keeps insertAnimalMedia unchanged for existing callers.

---

## 3. Video ID + Thumbnail Ordering

**File:** `server/src/server.ts:3982-4041` [VERIFIED]

The video handler ordering:
```
1. const newMediaId = randomUUID();              // ← ID generated FIRST
2. Download video to disk as {newMediaId}.mp4
3. Fix ownership
4. Generate thumbnail as {newMediaId}.jpg         // ← ID already known
5. INSERT into animal_media with thumbnail_url    // ← thumbnail_url set at insert time
```

### For photos — is the id available at thumbnail generation time? [VERIFIED]

**No — not currently.** In the upload-to-library handler:
```
1. processUploadedImage() → buffer
2. Write original to disk
3. const photoId = insertAnimalMedia({...})       // ← id generated INSIDE this function
4. (handler ends)
```

The `photoId` (the UUID) is returned by `insertAnimalMedia()` but it's generated inside the function at line 4706: `const id = randomUUID()`. The caller gets it back as the return value.

**This means thumbnail generation must happen AFTER insertAnimalMedia returns**, using the returned `photoId` as the filename. Then UPDATE `thumbnail_url` on the row. Order would be:

```
1. processUploadedImage() → buffer
2. Write original to disk
3. const photoId = insertAnimalMedia({...})       // ← get id
4. Generate thumbnail as {photoId}.jpg            // ← use id
5. UPDATE animal_media SET thumbnail_url = ? WHERE id = ?
```

This is clean and doesn't require restructuring insertAnimalMedia. The backfill script would do steps 4-5 for existing records.

---

## 4. resolveMediaById — Exact Bug Text

**File:** `server/src/localDatabase.ts:2378-2401` [VERIFIED]

```typescript
export function resolveMediaById(mediaId: string): ResolvedMedia | null {
  const database = getDatabase();
  
  // Check animal_media (unified: strip/library photos + videos)
  const media = database.prepare(`SELECT * FROM animal_media WHERE id = ?`).get(mediaId) as Record<string, unknown> | undefined;
  if (media) {
    const shelterCode = media.shelter_code as string | null;
    let animalId = '';
    if (shelterCode) {
      const meta = database.prepare(`SELECT animal_id FROM animal_metadata WHERE shelter_code = ?`).get(shelterCode) as { animal_id: string } | undefined;
      animalId = meta?.animal_id || '';
    }
    const mediaType = (media.media_type as string) === 'video' ? 'video' : 'photo';
    return {
      mediaType: mediaType as 'photo' | 'video',
      animalId,
      shelterCode,
      url: media.file_url as string,
      thumbnailUrl: media.file_url as string,   // ← BUG: should read media.thumbnail_url
    };
  }
  
    return null;
}
```

### The fix [VERIFIED — exact text to change]:

**Line to change** (`localDatabase.ts:2396`):
```typescript
// CURRENT (bug):
      thumbnailUrl: media.file_url as string,
// FIX:
      thumbnailUrl: (media.thumbnail_url as string | null) || (media.file_url as string),
```

The fallback to `file_url` is intentional — if no thumbnail exists yet, the full-res URL is the correct fallback (matches how `formatPhotoForApi` does `row.thumbnail_url || null`, and how the client does `photo.thumbnailUrl || photo.photoUrl`).

### ResolvedMedia interface [VERIFIED]:
```typescript
// localDatabase.ts:2306
export interface ResolvedMedia {
  mediaType: 'photo' | 'video';
  animalId: string;
  shelterCode: string | null;
  url: string;
  thumbnailUrl: string | null;
}
```

The interface already allows `string | null` for `thumbnailUrl`, so the fix is type-safe. [VERIFIED]

---

## 5. Sharp Availability + Thumbnail Directory

### sharp in imageProcessor.ts [VERIFIED]
```typescript
// Line 1-4 of server/src/imageProcessor.ts:
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import crypto from 'crypto';
```

sharp is imported and used for `processUploadedImage`. A new `generatePhotoThumbnail()` export in this file is the natural home — same module, same dependency, complementary purpose. [VERIFIED]

### Thumbnails directory [VERIFIED]

```
Path:  data/animal-media/thumbnails/
Owner: shelter:shelter
Perms: 2775 (drwxrwsr-x) — group-setgid, writable by shelter group
Files: 59 video thumbnails present
```

The directory exists, is writable by shelter, and already contains 59 video thumbnail JPEGs. Photo thumbnails using the same `{mediaId}.jpg` naming will coexist without collision (video and photo media IDs are distinct UUIDs). [VERIFIED]

---

## CONCLUSION

### (a) Is thumbnail_url settable via insertAnimalMedia? [VERIFIED]

**No.** `insertAnimalMedia` does not accept or write `thumbnail_url`. Videos bypass it entirely with a raw INSERT. For photos, the cleanest path is: call `insertAnimalMedia` → get `photoId` back → generate thumbnail → UPDATE the row's `thumbnail_url`. This avoids modifying `insertAnimalMedia`'s signature (8+ callers) and mirrors the generate-then-set pattern.

### (b) Is the mediaId available before thumbnail generation? [VERIFIED]

**Not before insert** — the UUID is generated inside `insertAnimalMedia`. But the returned `photoId` gives it immediately after. The sequence is: insert → get id → generate thumbnail as `{id}.jpg` → UPDATE `thumbnail_url`. No restructuring needed.

### (c) Exact resolveMediaById text to fix [VERIFIED]

`localDatabase.ts:2396` — change:
```typescript
thumbnailUrl: media.file_url as string,
```
to:
```typescript
thumbnailUrl: (media.thumbnail_url as string | null) || (media.file_url as string),
```
