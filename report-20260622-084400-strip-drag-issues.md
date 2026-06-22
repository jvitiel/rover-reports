# Strip Drag-into-Slot-1 Diagnosis: Issue A (Displaced Photo) + Issue B (No Auto-Crop)

**Date:** 2026-06-22 08:44 UTC  
**Mode:** Read-only diagnosis  
**Source:** server.ts (compiled dist), localDatabase.ts, cropSweep.ts, dashboard/index.html

---

## ISSUE A — Displaced Photo Goes to Slot 2 (Should Skip to Slot 3)

### 1. What happens to the existing slot-1 photo when a new photo is dragged into slot 1

**Dashboard drag path:** When a user drags a strip photo onto slot 1, the dashboard calls:

```javascript
// dashboard/index.html:8196-8205
fetch(`${API_BASE}/photos/${animalIdForReload}/reorder`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mediaId: mediaIdForReorder, newPosition }),
})
```

This hits the reorder endpoint at **server.ts:3936-3957**, which calls `reorderStripPhoto(mediaId, newPosition)`.

**`reorderStripPhoto`** at **localDatabase.ts:5009-5031**:

```typescript
export function reorderStripPhoto(mediaId: string, newPosition: number): void {
  // ...
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

  database.prepare('UPDATE animal_media SET strip_position = ? WHERE id = ?').run(newPosition, mediaId);
}
```

**Trace for dragging from position 3 to position 1** (oldPosition=3, newPosition=1):

Since `oldPosition > newPosition`, the "moving left" branch fires:
```sql
UPDATE animal_media SET strip_position = strip_position + 1
WHERE shelter_code = ? AND strip_position >= 1 AND strip_position < 3
```

This bumps:
- **Position 1 → Position 2** (the old slot-1 photo)
- **Position 2 → Position 3** (whatever was in slot 2, typically the video)

Then the dragged photo is set to position 1.

**Confirmed: the displaced slot-1 photo is pushed to position 2.** If a video was at position 2, it gets pushed to position 3. The old slot-1 photo now occupies the video's reserved slot.

### The same issue exists in `addPhotoToStrip`

If `addPhotoToStrip` is called with `position=1` (e.g. from a future code path), the `else` branch at **localDatabase.ts:4966-4974** does:

```typescript
const photosToShift = database.prepare(`
  SELECT id, strip_position FROM animal_media
  WHERE shelter_code = ? AND strip_position >= ? AND strip_position > 0
  ORDER BY strip_position DESC
`).all(row.shelter_code, position) as { id: string; strip_position: number }[];

for (const photo of photosToShift) {
  database.prepare('UPDATE animal_media SET strip_position = ? WHERE id = ?')
    .run(photo.strip_position + 1, photo.id);
}
```

Same result: everything at position ≥ 1 shifts up by 1. Position 1 → 2, position 2 → 3.

Note: `addPhotoToStrip` has a **special case for `position === 2`** (localDatabase.ts:4941-4962) that explicitly cascades 2→3, 3→4, etc. — but **no special case for position 1** that would skip the video slot.

### 2. Slot 2's reserved meaning: public video

**server.ts:920-928** — The animals API reads the public video from strip_position=2:

```typescript
// Batch lookup: slot 2 videos for all animals (single query, no N+1)
const db = getDatabase();
const slot2Videos = db.prepare(`
  SELECT shelter_code, file_url
  FROM animal_media
  WHERE media_type = 'video' AND strip_position = 2 AND hidden = 0
`).all() as { shelter_code: string; file_url: string }[];
const videoMap = new Map(slot2Videos.map(v => [v.shelter_code, v.file_url]));
```

This feeds the `video_url` field at **server.ts:948**:
```typescript
video_url: videoMap.get(animal.shelterCode) || null,
```

The matcher endpoint at **server.ts:5793-5798** uses a slightly different query (any non-hidden video, ordered by captured_at), but the primary animals list and homepage both rely on **strip_position=2 + media_type='video'**.

The dashboard "Add to Strip and Close" button at **dashboard/index.html:6683** explicitly places videos at position 2:
```javascript
body: JSON.stringify({ mediaId: vgCurrentMainId, position: 2 })
```

**Confirmed: strip_position=2 is the reserved video slot.**

### 3. What currently happens to the video on collision

When a photo is dragged to slot 1 via `reorderStripPhoto`:
- The old slot-1 **photo** moves to position 2
- The slot-2 **video** moves to position 3

The animals API query at server.ts:926 filters for `media_type = 'video' AND strip_position = 2` — so after the collision, **no video is found** for that animal (the video is now at position 3). The API returns `video_url: null`.

The displaced photo at position 2 is a `media_type = 'photo'`, so it's also invisible to the video query. Net effect: **the public video link disappears from the matcher/homepage** until someone manually fixes the strip.

**Current DB state confirms healthy animals have the expected pattern** (verified via query): slot 1 = photo, slot 2 = video, slots 3-6 = photos. No position duplicates exist. The collision hasn't been caught because no one has recently dragged a photo into slot 1 on an animal that has a video at slot 2, or it was manually fixed.

### 4. Fix surface identification

**Primary fix: `reorderStripPhoto` (localDatabase.ts:5009-5031)**

The "moving left" branch needs to skip position 2 when shifting photos to make room for a new position 1. Instead of a blanket `strip_position + 1`, the cascade must detect whether position 2 holds a video and skip it:

- When `newPosition = 1` and a video exists at position 2: the old slot-1 photo should go to position 3 (not 2), and everything at position 3+ shifts up by 1.
- General principle: the cascade should treat position 2 as reserved-for-video (never receive a photo via displacement).

**Secondary fix: `addPhotoToStrip` (localDatabase.ts:4935-4985)**

The `else` branch (positions 1, 3-6) has the same issue for `position=1`. The shift logic at lines 4966-4974 would push slot-1 → slot-2. Needs the same video-skip logic.

Both functions need a predicate like: "if slot 2 holds a video row for this shelter_code, exclude position 2 from receiving a displaced photo." The simplest approach: after the cascade, if a photo now sits at position 2 and a video was there, swap positions 2 and 3.

---

## ISSUE B — Drag Into Slot 1 Did Not Auto-Crop

### 5. runCropSweep wiring on all three drag endpoints

All three endpoints have the `runCropSweep` call. Quoting each:

**Add-to-strip — server.ts:3894:**
```typescript
runCropSweep(shelterCode).catch(err => console.error('[CropSweep] drag sweep failed:', err));
```
Located after `res.json(...)` in the `if (shelterCode)` block. ✅ Present.

**Remove-from-strip — server.ts:3926:**
```typescript
runCropSweep(shelterCode).catch(err => console.error('[CropSweep] drag sweep failed:', err));
```
Located after `res.json(...)` in the `if (shelterCode)` block. ✅ Present.

**Reorder — server.ts:3954:**
```typescript
runCropSweep(shelterCode).catch(err => console.error('[CropSweep] drag sweep failed:', err));
```
Located after `res.json(...)` in the `if (shelterCode)` block. ✅ Present.

**All three endpoints are wired.** The drag-to-slot-1 path goes through the reorder endpoint (PUT /api/photos/:animalId/reorder → server.ts:3936), which has the sweep call at line 3954.

### 6. Why a drag into slot 1 might not produce a visible crop

#### 6a. Does the reorder path have the sweep call?

**Yes.** The reorder endpoint at server.ts:3936-3957 calls `runCropSweep(shelterCode)` at line 3954 after `res.json`. The sweep runs for the specific animal.

#### 6b. Does the stale-crop predicate correctly flag the newly-promoted slot-1 photo?

**cropSweep.ts** "CROP SET" query:

```typescript
const cropCandidates = db.prepare(`
  SELECT am.id, am.shelter_code, am.crop_url, am.source_media_id
  FROM animal_media am
  WHERE am.strip_position = 1
    AND am.media_type = 'photo'
    AND am.hidden = 0
    ${scopeClause}
`).all(...scopeParams)
```

For a photo that was at position N>1 and just moved to position 1:

1. **`crop_url NULL or empty`** — If this photo never had a crop (it was at position 3, and only slot-1 photos get crops), then `crop_url` is NULL → `needsCrop = true`. ✅ **This should trigger a crop.**

2. Additionally, the "CLEAR SET" at the bottom of cropSweep.ts clears `crop_url` on any non-slot-1 row — so the old slot-1 photo (now at position 2) has its crop_url cleared. This is correct behavior.

**The predicate should work correctly** for this case. A photo moving from position N>1 to position 1 will have NULL crop_url and will be flagged for cropping.

#### 6c. TIMING: Does the crop finish before the dashboard re-fetch?

**Sequence:**
1. Server processes reorder → calls `reorderStripPhoto` → sends `res.json` with updated strip
2. **After** res.json: `runCropSweep(shelterCode)` fires (fire-and-forget)
3. Dashboard receives the response → calls `loadPhotosForAnimal(animalId, true)` → fetches `/api/photos/:animalId`

The re-fetch happens essentially immediately after the response. The crop sweep calls `python3 crop-worker.py --ids <mediaId>` which loads a YOLO model and processes the image — **this takes 2-10+ seconds**. The re-fetch will complete long before the crop finishes.

**But this is irrelevant because the dashboard doesn't show crop_url anyway.** See section 7.

#### 6d. Could the sweep have failed?

Possible failure modes:
- SM external URL images: crop-worker.py downloads from SM servers — could fail on network/auth issues
- Intake photos or name-card images: unusual dimensions or corrupt files
- YOLO model loading timeout (30s limit in execSync)
- Missing python3 or crop-worker.py dependencies

Without checking logs for a specific animal, can't confirm. But the predicate analysis in 6b shows the sweep **should** fire.

### 7. WHICH SURFACE SHOWS CROP_URL — Dashboard vs. Matcher

**Dashboard photo strip: shows `file_url` (original), NOT `crop_url`.**

`formatPhotoForApi` at **server.ts:3812-3828**:

```typescript
function formatPhotoForApi(row: any): any {
  return {
    id: row.id,
    shelterCode: row.shelter_code,
    photoUrl: row.file_url,          // ← original, not crop
    fileUrl: row.file_url,           // ← original, not crop
    mediaType: row.media_type || 'photo',
    source: row.source,
    capturedAt: row.captured_at,
    stripPosition: row.strip_position,
    caregiver: row.caregiver,
    name: row.name,
    species: row.species,
    tagMarketing: row.tag_marketing === 1,
    thumbnailUrl: row.thumbnail_url || null,
  };
}
```

**No `cropUrl` field is returned.** The dashboard strip renders `photo.photoUrl || photo.fileUrl` (**dashboard/index.html:7193**):
```javascript
const photoUrl = photo.photoUrl || photo.fileUrl;
```

The dashboard JS has **zero references to `cropUrl` or `crop_url`** (verified via grep of `staff-pwa/app.js` and `dashboard/index.html`).

**Matcher/public card photos: show `crop_url` when available.**

`enrichWithLocalPhotos` at **localDatabase.ts:5137-5151**:

```typescript
SELECT shelter_code, file_url, crop_url, strip_position
FROM animal_media
WHERE media_type = 'photo'
  AND hidden = 0
  AND strip_position > 0
  AND shelter_code IN (${placeholders})
ORDER BY shelter_code ASC, strip_position ASC
```

```typescript
// Prefer crop_url (smart square crop) when available, else fall back to file_url
const photoMap = new Map<string, string>();
for (const row of rows) {
  if (!photoMap.has(row.shelter_code)) {
    photoMap.set(row.shelter_code, row.crop_url || row.file_url);
  }
}
```

**The crop_url is only consumed by the matcher/public-facing card photos** (via `enrichWithLocalPhotos`), not by the dashboard strip.

### Summary: Why "no square in the dashboard" is expected

The dashboard photo strip **never shows cropped images**. It always renders the original `file_url`. The crop system (crop_url, cropSweep, crop-worker.py) only affects the **matcher** and **public-facing card views** (via `enrichWithLocalPhotos`).

If the concern is "the dashboard slot 1 doesn't show a square crop after drag" — **that's by design**. The dashboard shows originals. The real question is whether the **matcher** shows the crop after a drag — and the answer is: yes, once the sweep completes (2-10s), the matcher will serve the cropped version on the next page load. But the dashboard will never show it.

---

## Fix Surface Summary

| Issue | File | Lines | What to change |
|-------|------|-------|----------------|
| A: displaced photo lands on slot 2 | localDatabase.ts | 5009-5031 (`reorderStripPhoto`) | Skip position 2 when cascading for newPosition=1; detect video at slot 2 and push displaced photo to 3 instead |
| A: same issue in add path | localDatabase.ts | 4935-4985 (`addPhotoToStrip`) | Same video-skip logic for position=1 in the else branch |
| B: dashboard doesn't show crop | server.ts | 3812-3828 (`formatPhotoForApi`) | If dashboard should show crops: add `cropUrl: row.crop_url \|\| null`. If not, this is WAI. |
| B: timing race (if crop matters) | server.ts | 3936-3957 (reorder endpoint) | Could await sweep before res.json, or dashboard could poll/re-fetch after delay. Only relevant if dashboard should show crop_url. |
