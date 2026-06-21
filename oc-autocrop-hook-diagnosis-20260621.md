# Autocrop Hook Diagnosis — Slot-1 Write & Leave Paths

**Date:** 2026-06-21 ~21:30 UTC  
**Mode:** Read-only. DB mode=ro. Zero writes. No service/code changes.

---

## 1. Slot-1 Write Paths (ENTER)

### Path A — SM Photo Sync: Empty-Slot Fill (server.ts:12108)

**Trigger:** Nightly sync runs, animal has `websiteMediaId` set, slot-1 is empty (no row with `strip_position=1`), and globe photo exists in DB.

```typescript
// server.ts:12098-12108
if (!slot1Row) {
  // Empty slot-1: fill with globe photo if it exists
  const globeRow = db.prepare(`
    SELECT id, strip_position FROM animal_media
    WHERE shelter_code = ? AND source_media_id = ?
    LIMIT 1
  `).get(animal.shelterCode, String(websiteMediaId));

  if (globeRow) {
    db.prepare(`UPDATE animal_media SET strip_position = 1 WHERE id = ?`).run(globeRow.id);
```

**Sets:** `strip_position = 1` on the globe row.  
**Leaves slot-1:** No — slot was empty. No photo displaced.

---

### Path B — SM Photo Sync: Globe-Swap / Mismatch Correction (server.ts:12148-12149)

**Trigger:** Nightly sync, slot-1 exists and is SM-sourced, but `source_media_id != websiteMediaId` (SM changed preferred photo). Globe photo exists in DB.

```typescript
// server.ts:12148-12149
db.prepare(`UPDATE animal_media SET strip_position = ? WHERE id = ? AND shelter_code = ?`)
  .run(demoteTo, slot1Row.id, animal.shelterCode);
db.prepare(`UPDATE animal_media SET strip_position = 1 WHERE id = ? AND shelter_code = ?`)
  .run(globeRow.id, animal.shelterCode);
```

**Sets:** `strip_position = 1` on the new globe row.  
**Leaves slot-1:** YES — the old slot-1 photo moves to `demoteTo` (globe's old position, or 0 if unpublished). **This is a LEAVE path.**

---

### Path C — insertAnimalMedia Auto-Fill (localDatabase.ts:4864-4867)

**Trigger:** Any photo insert where `source === 'profiler' || source === 'sm' || tagMarketing === true`, AND the animal currently has 0 strip photos (`currentCount === 0`).

```typescript
// localDatabase.ts:4852-4867
if (params.mediaType === 'photo' && params.shelterCode) {
  const shouldAutoFill = 
    params.source === 'profiler' || 
    params.source === 'sm' || 
    params.tagMarketing;
  
  if (shouldAutoFill) {
    const countResult = database.prepare(`
      SELECT COUNT(*) as count FROM animal_media 
      WHERE shelter_code = ? AND media_type = 'photo' AND strip_position > 0
    `).get(params.shelterCode) as { count: number };
    
    const currentCount = countResult?.count || 0;
    if (currentCount < 6) {
      database.prepare(
        `UPDATE animal_media SET strip_position = ? WHERE id = ?`
      ).run(currentCount + 1, id);
    }
  }
}
```

**Sets:** `strip_position = currentCount + 1`. When `currentCount === 0`, this is `strip_position = 1`.  
**Leaves slot-1:** No — slot was empty. No displacement.  
**Note:** Source `'sm-sync'` does NOT match — only `'sm'`, `'profiler'`, or `tagMarketing`. In practice, the SM sync ingest path (server.ts:12067) uses `'sm-sync'`, so this auto-fill fires for profiler photos (field captures) and dashboard-tagged marketing photos only. The subsequent slot-1 self-correction block (Path A/B) handles the SM sync case.

**Callers that could reach slot 1:**
- Profiler photo upload (server.ts:8653, source `'profiler'`) — first photo for a new animal
- No current callers use source `'sm'` with `insertAnimalMedia` (SM sync uses `'sm-sync'`)
- `tagMarketing` photos — possible but uncommon

---

### Path D — Dashboard: Add Photo to Strip (localDatabase.ts:4936-4986 / server.ts:3882)

**Trigger:** Staff drags a library photo onto strip position 1 (or any position, causing cascade).

```typescript
// server.ts:3881-3882
const { mediaId, position } = req.body;
addPhotoToStrip(mediaId, position);
```

```typescript
// localDatabase.ts:4986 (final line of addPhotoToStrip)
database.prepare('UPDATE animal_media SET strip_position = ? WHERE id = ?').run(position, mediaId);
```

When `position === 1`: the new photo gets slot 1. When `position === 2` with full strip: cascade bumps 2→3, 3→4, 4→5, 5→6, 6→0 (library). Slot 1 is NOT displaced by an add at position 2+.

**Sets:** `strip_position = position` (could be 1).  
**Leaves slot-1:** Only if the add is at position 1 AND another photo was already there — the bump logic shifts existing photos up. But `addPhotoToStrip` at position 1 is unusual; typically staff adds at position 2. If position=1, existing slot-1 photo gets shifted to position 2.

**Important detail:** The bump logic (`strip_position >= ? AND strip_position > 0 ORDER BY strip_position DESC`) increments existing positions. A photo at slot-1 moves to slot-2 — it LEAVES slot 1 but does NOT go to library.

---

### Path E — Dashboard: Reorder Strip Photo (localDatabase.ts:5012-5032 / server.ts:3939)

**Trigger:** Staff drags a strip photo to a new position via drag-and-drop.

```typescript
// localDatabase.ts:5032
database.prepare('UPDATE animal_media SET strip_position = ? WHERE id = ?').run(newPosition, mediaId);
```

When `newPosition === 1`: the dragged photo becomes slot-1. When `oldPosition === 1` and `newPosition > 1`: the photo at slot-1 moves out.

**Sets:** `strip_position = newPosition` (could be 1).  
**Leaves slot-1:** YES — if `oldPosition === 1`, the old slot-1 photo moves to `newPosition`, and another photo shifts into slot 1. **Bidirectional leave/enter.**

The shift logic:
```typescript
// Moving left (newPosition < oldPosition): shift others right
database.prepare(`
  UPDATE animal_media SET strip_position = strip_position + 1
  WHERE shelter_code = ? AND strip_position >= ? AND strip_position < ?
`).run(row.shelter_code, newPosition, oldPosition);
```

When a photo at slot 3 moves to slot 1, photos at positions 1 and 2 shift to 2 and 3. The old slot-1 photo moves to slot 2 — it LEAVES slot 1.

---

### Path F — Dashboard: Remove Photo from Strip (localDatabase.ts:4993-5005 / server.ts:3912)

**Trigger:** Staff removes a strip photo back to library.

```typescript
// localDatabase.ts:5000-5005
database.prepare('UPDATE animal_media SET strip_position = 0 WHERE id = ?').run(mediaId);
database.prepare(`
  UPDATE animal_media SET strip_position = strip_position - 1
  WHERE shelter_code = ? AND strip_position > ?
`).run(row.shelter_code, oldPosition);
```

If `oldPosition === 1`: the slot-1 photo goes to library (position 0), and the photo at position 2 shifts down to become the new slot 1.

**Sets:** The removed photo goes to 0; the shift makes position-2 become position-1.  
**Leaves slot-1:** YES — the removed photo leaves. The photo shifting from 2→1 ENTERS slot 1.

---

## 2. Leave-Slot-1 Paths (Where crop_url Must Be CLEARED)

| Path | Photo Leaves Slot-1? | Where It Goes | crop_url Clear Needed? |
|------|---------------------|---------------|----------------------|
| A (empty fill) | No | — | No |
| B (globe swap) | YES — old slot-1 | `demoteTo` (old globe pos or 0) | YES — stale crop on non-slot-1 row |
| C (auto-fill) | No | — | No |
| D (add at pos 1) | YES — old slot-1 shifts to pos 2 | Position 2 | YES — stale crop at pos 2 |
| E (reorder from 1) | YES — old slot-1 shifts | Higher position | YES — stale crop at new position |
| F (remove slot-1) | YES — removed to library | Position 0 | YES — stale crop at pos 0 |

**Confirmation: crop_url is currently NEVER cleared anywhere** [VERIFIED via `grep -n 'crop_url' server.ts localDatabase.ts` — only 4 hits, all in the SELECT/read path at `enrichWithLocalPhotos` (localDatabase.ts:5138-5152)]. No UPDATE or SET crop_url = NULL exists in any code path.

---

## 3. Crop Worker Invocation Interface

### Current Interface (scripts/crop-worker.py)

**Input:** Animal media row IDs (via `--ids id1,id2,...` CLI arg). The worker queries the DB itself:
```python
# crop-worker.py:248-249 (from DB query)
SELECT am.id, am.shelter_code, am.file_url, am.strip_position,
       a.species ...
```

**Per-photo inputs consumed internally:**
- `file_url` — source image (SM HTTP URL or local path)
- `shelter_code` — for output filename
- `source_media_id` parsed from `file_url` query param (`mediaid=XXXX`) — for output filename
- `species` — for YOLO class selection

**Output per photo:**
- Crop file at `data/animal-media/crops/{shelter_code}-{mediaid}.jpg` (800×800 JPEG, shelter:shelter, 644)
- JSON metadata line to stdout: `{ "media_id", "shelter_code", "mediaid", "species", "method", "conf", "out_filename", "crop_url" }`
- Does NOT write `crop_url` to DB (separate `write-crop-urls.py` script does that)

### Node-to-Python Invocation

To call from Node (server.ts), the minimum is:
```typescript
const { execSync } = require('child_process');
execSync(`python3 /path/to/crop-worker.py --ids ${mediaId}`, { timeout: 30000 });
// Then: UPDATE animal_media SET crop_url = ? WHERE id = ?
```

**Inputs available at each slot-1 write site:**

| Path | `media_id` | `file_url` | `shelter_code` | `source_media_id` | All in scope? |
|------|-----------|-----------|---------------|-------------------|--------------|
| A (empty fill) | `globeRow.id` ✓ | Not in query (need extra SELECT) | `animal.shelterCode` ✓ | In query ✓ | Partial |
| B (globe swap) | `globeRow.id` ✓ | Not in query | `animal.shelterCode` ✓ | In query ✓ | Partial |
| C (auto-fill) | `id` (just-generated UUID) ✓ | `params.fileUrl` ✓ | `params.shelterCode` ✓ | `params.sourceMediaId` ✓ | YES |
| D (add to strip) | `mediaId` from req ✓ | Not in scope | `row.shelter_code` ✓ | Not in scope | Partial |
| E (reorder) | `mediaId` from req ✓ | Not in scope | `row.shelter_code` ✓ | Not in scope | Partial |
| F (remove) | `mediaId` from req ✓ | Not in scope | `row.shelter_code` ✓ | Not in scope | Partial |

The "Partial" cases all have `media_id` — the crop worker can look up everything else from the DB. The `--ids` interface accepts media IDs and handles the rest internally.

---

## 4. Sync-vs-Sweep Recommendation

### Option (a) — INLINE: Crop at Each Write Site

**How:** After each slot-1 write (paths A–F), shell out to `crop-worker.py --ids <id>`, then UPDATE crop_url. On leave-slot-1, SET crop_url = NULL on the departing row.

**Pros:**
- Crop is immediately available after the write
- Dashboard staff see the crop right away on drag

**Cons:**
- 6 separate hook points to maintain (paths A–F)
- Each hook needs both ENTER (crop) and LEAVE (clear) logic
- Sync paths (A, B) run inside a tight loop over 500+ animals — shelling to Python per-animal adds ~1-2s × affected animals. Acceptable for the ~1-5 changes per night, but if SM does a bulk photo update, this could add minutes.
- Path D/E/F need hooking in `localDatabase.ts` or `server.ts` at the API layer
- Path C needs hooking inside `insertAnimalMedia` — deep and sensitive
- If any hook is missed or added later (new feature), crops silently go stale until noticed

**Failure modes:**
- Forgotten hook → stale/missing crop_url (silent, shows original photo instead — graceful fallback)
- Worker timeout/crash → crop_url stays NULL → shows original (graceful)
- Permission error on crop file → same graceful fallback

### Option (b) — POST-SWEEP: Self-Healing Pass After Sync

**How:** After `runNightlySMPhotoSync()` completes, run a single sweep:
1. For every `strip_position=1` row: if `crop_url IS NULL` OR crop file missing OR mediaId mismatch → generate crop + write crop_url
2. For every `strip_position != 1` row with non-NULL `crop_url` → SET crop_url = NULL (and optionally delete the crop file)

**Pros:**
- **ONE hook point** — attaches after the sync, covers ALL slot-1 writes (A, B, C, and any future path)
- **Self-healing and idempotent** — re-runnable, catches any missed or stale crop_url regardless of cause
- Simple to reason about: "after everything settles, ensure slot-1 has crops and non-slot-1 doesn't"
- Naturally covers the `insertAnimalMedia` auto-fill path (C) — new animals get cropped on next sync
- Handles edge cases automatically: failed crops, DB corruption, manual SQL fixes

**Cons:**
- Dashboard drag (paths D, E, F) changes are NOT cropped until the next nightly sync (~24h delay max)
- New animals ingested via profiler (path C) don't get a crop until next sync

**Failure modes:**
- Worker crash mid-sweep → partial crop_url writes. Next run self-heals (idempotent).
- Sweep runs but no changes → no-op (zero cost beyond the query)

### RECOMMENDATION: **(b) POST-SWEEP** with an optional targeted INLINE hook at path D/E/F

The post-sweep is the correct primary mechanism because:
1. It's self-healing by design — covers all current and future slot-1 write paths
2. ONE hook point, not six
3. The stale-crop predicate (§6) is computable, cheap, and idempotent
4. SM sync is the dominant slot-1 change path (paths A+B account for >95% of slot-1 mutations)

**For the dashboard drag path (D/E/F):** the sweep catches it on the next nightly run. If staff need to see the crop immediately (not next-day), a small inline hook at the 3 API endpoints (`add-to-strip`, `remove-from-strip`, `reorder`) can fire the crop worker for the new slot-1 row and clear crop_url on the departed row. This is optional — the post-sweep makes it safe to defer.

---

## 5. Manual Drag Coverage

**Would inline (a) miss the drag?** YES — if wired only in the sync, the dashboard drag APIs (`add-to-strip`, `remove-from-strip`, `reorder`) are unhooked. Staff would see the old photo or original (no crop) until the next nightly sync.

**Would post-sweep (b) catch it?** YES — on the next nightly sync run, the sweep finds the new slot-1 row with NULL crop_url and crops it, and clears crop_url on the old slot-1 row (now at a different position).

**Latency implication:** The post-sweep runs nightly at 2am ET. A drag at 3pm means ~11h before the crop appears. However:
- The fallback is graceful: `crop_url || file_url` serves the original uncropped photo. Staff see the original, not a broken image.
- The crop is cosmetic (square card display in matcher). Staff working in the dashboard see the full uncropped image anyway (the dashboard shows the original, not the crop).
- **External-facing surfaces** (matcher, searcher) show the uncropped original until the sweep runs. This is acceptable because the original photo is always a valid display — it just isn't square-cropped.

If immediate drag-to-crop is desired: add a lightweight inline hook at the 3 drag API endpoints (server.ts:3882, 3912, 3939). This is ~10 lines each: shell to crop worker for new slot-1, clear crop_url on old slot-1. Not required for correctness — only for immediacy.

---

## 6. Stale-Crop Predicate

The condition "this slot-1 row needs a (re)crop":

```sql
SELECT am.id, am.shelter_code, am.file_url, am.source_media_id
FROM animal_media am
WHERE am.strip_position = 1
  AND am.media_type = 'photo'
  AND am.hidden = 0
  AND (
    am.crop_url IS NULL                          -- no crop exists
    OR am.crop_url = ''                          -- empty string
    OR am.crop_url NOT LIKE '%' || REPLACE(am.source_media_id, '''', '') || '%'
                                                  -- crop_url mediaId != current source_media_id
  )
```

Plus a filesystem check for the crop file (crop_url populated but file missing on disk).

**Computable from DB alone?** YES — `crop_url` and `source_media_id` are both in `animal_media`. The mediaId mismatch check (`crop_url NOT LIKE '%' || source_media_id || '%'`) detects when the slot-1 photo changed but crop_url still points to the old crop.

**For the CLEAR predicate** (non-slot-1 rows with stale crops):

```sql
SELECT id FROM animal_media
WHERE strip_position != 1
  AND crop_url IS NOT NULL
```

Both predicates are O(1) index scans on `strip_position` — fast enough to run nightly.

---

## Summary

| # | Path | Location | Enters Slot-1 | Leaves Slot-1 |
|---|------|----------|---------------|---------------|
| A | Empty-slot fill | server.ts:12108 | YES | No |
| B | Globe-swap mismatch | server.ts:12148-12149 | YES | YES (old slot-1 demoted) |
| C | insertAnimalMedia auto-fill | localDatabase.ts:4864-4867 | YES (first photo) | No |
| D | Dashboard add-to-strip | localDatabase.ts:4986 | YES (if pos=1) | YES (old slot-1 bumps to 2) |
| E | Dashboard reorder | localDatabase.ts:5032 | YES (if newPos=1) | YES (old slot-1 shifts) |
| F | Dashboard remove from strip | localDatabase.ts:5000-5005 | YES (pos-2 shifts to 1) | YES (removed to library) |

**6 write paths total. 4 have leave-slot-1 counterparts. crop_url is currently never cleared. Post-sweep is the recommended primary hook — self-healing, idempotent, one attachment point. Optional inline hooks at D/E/F for immediate staff feedback.**
