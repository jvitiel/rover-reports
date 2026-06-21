# Stage-2 Pre-Build Diagnosis

**Date:** 2026-06-21 ~21:55 UTC  
**Mode:** Read-only. DB mode=ro. Zero writes. No code/service changes.

---

## 1. Sync Completion & Scheduling

### 1a. Signature and Exit Points

```typescript
// server.ts:11992
async function runNightlySMPhotoSync(): Promise<void> {
```

The function has a single exit structure — a top-level try/catch wrapping the entire body:

```typescript
// server.ts:11996-12179
  try {
    // ... fetch animals, iterate, ingest photos, slot-1 self-correction ...
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[SM Photo Sync] Complete. ${newPhotosCount} new photos across ${animalsWithNewPhotos} animals. Skipped ${skippedNoMediaId} URLs with no mediaid. Elapsed: ${elapsed}s`);
    
  } catch (err) {
    console.error('[SM Photo Sync] Job failed:', err);
  }
}
```
[VERIFIED: server.ts:12173-12179]

The slot-1 self-correction loop (lines 12091–12170) runs inside the same `for (const animal of animals)` loop as photo ingestion. It runs to completion for each animal before moving to the next. The `console.log('Complete...')` at line 12174 fires ONLY after the entire animal loop finishes, including all slot-1 corrections.

**Return:** implicit void. No return value. Two exit paths: normal completion (line 12175, after "Complete" log) and catch (line 12177, after "Job failed" log). Both fall through to the end of the function.

### 1b. Scheduling & Callers

```typescript
// server.ts:12181
function scheduleNightlySMPhotoSync(): void {
  // Target: 2am Eastern daily. Uses EDT (-4hr) offset to match existing timezone pattern.
  const msUntilNext2AM = (): number => {
    const now = new Date();
    const etOffsetMs = 4 * 60 * 60 * 1000;
    const nowEt = new Date(now.getTime() - etOffsetMs);
    const next2amEt = new Date(nowEt);
    next2amEt.setHours(2, 0, 0, 0);
    if (next2amEt.getTime() <= nowEt.getTime()) {
      next2amEt.setDate(next2amEt.getDate() + 1);
    }
    return next2amEt.getTime() - nowEt.getTime();
  };
  
  const initialDelay = msUntilNext2AM();
  const hoursUntil = (initialDelay / 1000 / 60 / 60).toFixed(2);
  console.log(`[SM Photo Sync] First run scheduled in ${hoursUntil} hours`);
  
  setTimeout(() => {
    runNightlySMPhotoSync();          // server.ts:12200 — first run
    setInterval(() => {
      runNightlySMPhotoSync();        // server.ts:12202 — recurring every 24h
    }, 24 * 60 * 60 * 1000);
  }, initialDelay);
}
```
[VERIFIED: server.ts:12181-12205]

**Schedule:** Daily at 2:00 AM Eastern. First run fires after a computed delay; thereafter every 24 hours via `setInterval`.

**On-demand trigger:** None found. `runNightlySMPhotoSync` is not exported, not exposed via any API endpoint, and not called from any other function. It can only be triggered by the scheduler. [VERIFIED via `grep -n 'runNightlySMPhotoSync' server.ts` — only 3 hits: declaration at 11992, call at 12200, call at 12202]

**Note:** The calls at 12200 and 12202 are fire-and-forget — `runNightlySMPhotoSync()` returns a Promise but it is NOT awaited. The function's internal try/catch prevents unhandled rejections.

### 1c. Recommended Attach Point

**The safe attach point is immediately after the "Complete" log, inside the try block:**

```typescript
// server.ts:12174 (current)
    console.log(`[SM Photo Sync] Complete. ...`);
    
    // ← ATTACH HERE: await runCropSweep();
    
  } catch (err) {
    console.error('[SM Photo Sync] Job failed:', err);
  }
```

**Rationale:**
- At this point, ALL photo ingestion and ALL slot-1 self-corrections are finished. The for-loop over animals is complete.
- It's inside the try/catch, so a sweep failure would be caught and logged (not crash the process).
- The function is async, so `await runCropSweep()` works naturally.

**Concern:** If `runNightlySMPhotoSync` throws partway through the animal loop (e.g. on animal #300 of #500), the catch block fires and the sweep never runs. However, this is acceptable — a partial sync shouldn't trigger a sweep because slot-1 state may be inconsistent. The sweep should only run after a COMPLETE sync. If needed, a separate safety-net sweep could be added in the catch block (or as a standalone scheduled job), but the primary attach point should be after full completion.

**Alternative concern:** The callers (12200, 12202) don't `await` the function. This means the sweep runs detached from the scheduler. This is fine — the sweep is self-contained and the function is already async. No behavior change needed.

---

## 2. Drag Endpoint Response Shape

### 2a. add-to-strip (server.ts:3871-3900)

```typescript
// server.ts:3882-3896
    addPhotoToStrip(mediaId, position);                    // synchronous DB write
    
    // Return updated strip and library
    let shelterCode = getShelterCodeFromAnimalId(animalId); // sync lookup
    if (!shelterCode && animalId.match(/^[A-Z]\d+$/)) shelterCode = animalId;
    
    if (shelterCode) {
      const strip = getStripPhotos(shelterCode).map(formatPhotoForApi);    // sync
      const library = getLibraryPhotos(shelterCode).map(formatPhotoForApi); // sync
      res.json({ success: true, data: { strip, library } });
    } else {
      res.json({ success: true });
    }
```

**Post-write behavior:** Entirely synchronous. No awaits between strip write and response.  
**Response payload:** `{ success: true, data: { strip: [...], library: [...] } }` — returns the full updated strip AND library arrays.  
**Dashboard UI after call:** Calls `loadPhotosForAnimal(animalId, true)` on success (dashboard/index.html:8232) — **re-fetches** the full photo set from the server.

### 2b. remove-from-strip (server.ts:3903-3930)

```typescript
// server.ts:3912-3926
    removePhotoFromStrip(mediaId);                          // synchronous DB write
    
    // Return updated strip and library
    let shelterCode = getShelterCodeFromAnimalId(animalId);  // sync
    if (!shelterCode && animalId.match(/^[A-Z]\d+$/)) shelterCode = animalId;
    
    if (shelterCode) {
      const strip = getStripPhotos(shelterCode).map(formatPhotoForApi);
      const library = getLibraryPhotos(shelterCode).map(formatPhotoForApi);
      res.json({ success: true, data: { strip, library } });
    } else {
      res.json({ success: true });
    }
```

**Post-write behavior:** Entirely synchronous. No awaits.  
**Response payload:** `{ success: true, data: { strip, library } }`  
**Dashboard UI:** `loadPhotosForAnimal(animalId, true)` on success (dashboard/index.html:8252) — **re-fetches**.

### 2c. reorder (server.ts:3931-3958)

```typescript
// server.ts:3939-3952
    if (mediaId && newPosition) {
      reorderStripPhoto(mediaId, newPosition);              // synchronous DB write
      
      // Return updated strip
      let shelterCode = getShelterCodeFromAnimalId(animalId); // sync
      if (!shelterCode && animalId.match(/^[A-Z]\d+$/)) shelterCode = animalId;
      
      if (shelterCode) {
        const strip = getStripPhotos(shelterCode).map(formatPhotoForApi);
        res.json({ success: true, data: { strip } });       // NOTE: no library in response
      } else {
        res.json({ success: true });
      }
      return;
    }
```

**Post-write behavior:** Entirely synchronous. No awaits.  
**Response payload:** `{ success: true, data: { strip } }` — strip only, no library.  
**Dashboard UI:** `loadPhotosForAnimal(animalIdForReload, true)` on success (dashboard/index.html:8205) — **re-fetches**.

### 2d. Block vs Fire-and-Forget Assessment

| Factor | Assessment |
|--------|-----------|
| All 3 handlers are sync after strip write | YES [VERIFIED — no `await` between write and `res.json`] |
| Dashboard UI re-fetches after success | YES — all 3 call `loadPhotosForAnimal(animalId, true)` [VERIFIED] |
| Response includes strip data | YES — but UI ignores it and re-fetches anyway |

**Recommendation: FIRE-AND-FORGET is viable and preferred.**

Because the dashboard UI re-fetches the full photo set from the server after each operation, the response data is supplementary, not authoritative. The UI will see the crop on the re-fetch IF the crop_url is written to the DB by then.

However, a ~1-2s blocking crop before `res.json` would:
- Delay the drag response by 1-2s (noticeable for staff)
- Guarantee the crop_url is present when the UI re-fetches

A fire-and-forget approach would:
- Respond instantly (current behavior)
- Write crop_url async — the re-fetch MIGHT hit before the crop is ready (~50% chance given Python startup + YOLO inference)
- Second re-fetch or page reload would always show the crop

**Best approach:** Fire-and-forget the crop AFTER `res.json()`. The re-fetch might not see it immediately, but the next page view will. If immediate visibility is critical, a 1-2s blocking call works but degrades UX.

---

## 3. Sweep Predicate Dry-Run

### Re-Crop Set (strip_position=1, needing crop)

| Reason | Count | Details |
|--------|-------|---------|
| `crop_url IS NULL` | **1** | S2026101 (sm source, file_url returns 404 — known broken, crop will fail again) |
| `crop_url = ''` | **0** | — |
| mediaId mismatch | **0** | All 688 existing crop_urls embed the correct source_media_id |
| **Total needing (re)crop** | **1** | Only the known broken source |

**688 are OK** — current crop_urls match their source_media_id [VERIFIED].

### Clear Set (non-slot-1 with stale crop_url)

| Count | Details |
|-------|---------|
| **0** | No non-slot-1 rows have crop_url set [VERIFIED via `SELECT COUNT(*) FROM animal_media WHERE strip_position != 1 AND crop_url IS NOT NULL` → 0] |

**The backfill was clean** — crop_url was only written to slot-1 rows.

### SM Download vs Local (for the 1 re-crop row)

| Source type | Count |
|-------------|-------|
| SM download (http) | **1** (S2026101 — but source is 404) |
| Local file | **0** |

### Ambiguous Rows (source_media_id NULL or empty)

**14 slot-1 rows have NULL/empty source_media_id** [VERIFIED]:

| shelter_code | source | Has crop? | Notes |
|---|---|---|---|
| A2025162 | activity | YES | Manual drag, no SM mediaid |
| A2026051 | dashboard-upload | YES | Manual drag |
| A2026061 | activity | YES | Protected non-SM pick |
| A2026067 | dashboard-upload | YES | Manual drag |
| S20251008 | dashboard-upload | YES | Protected non-SM pick |
| S2025963 | activity | YES | Protected non-SM pick |
| S2026028 | activity | YES | Protected non-SM pick |
| S2026061 | feeding | YES | Manual drag |
| S2026073 | feeding | YES | Manual drag |
| S2026078 | activity | YES | Protected non-SM pick |
| S2026224 | dashboard-upload | YES | Manual drag |
| S2026228 | activity | YES | Manual drag |
| S2026230 | feeding | YES | Manual drag |
| S2026101 | sm | NO | Broken source (404) |

**Impact on the mediaId-match predicate:** For these 14 rows, the check `crop_url NOT LIKE '%' || source_media_id || '%'` cannot evaluate meaningfully because `source_media_id` is NULL/empty. The LIKE pattern becomes `'%' || NULL || '%'` which evaluates to NULL (not matched), so the predicate CORRECTLY skips these rows — they won't be flagged as mismatches.

**Rule for the build:** For rows with NULL/empty `source_media_id`, the sweep should treat them as "no mediaid to compare" and skip the mismatch check. If `crop_url` is non-NULL, they're fine. If `crop_url` is NULL, they need cropping. The current SQLite behavior (NULL propagation in LIKE) already handles this correctly, but the sweep code should document this explicitly.

All 13 staff-capture rows with NULL `source_media_id` already HAVE valid crop_urls (they were cropped in the backfill). Only S2026101 has NULL crop_url (and will fail again — source file is 404).

---

## Summary

- **Sync attach point:** After the "Complete" log at server.ts:12174, inside the try block. All slot-1 corrections are done by this point.
- **Schedule:** 2:00 AM Eastern daily (setTimeout + setInterval). No on-demand endpoint.
- **Drag handlers:** All 3 are synchronous after the strip write (no awaits). All 3 return updated strip/library. Dashboard UI re-fetches on success (`loadPhotosForAnimal(animalId, true)`).
- **Block vs fire-and-forget:** Fire-and-forget is viable because the UI re-fetches. A 1-2s blocking crop would guarantee immediate visibility but degrade UX.
- **Dry-run counts:** Re-crop set = 1 (S2026101, 404). Clear set = 0. 14 ambiguous (NULL source_media_id) — all already have valid crops, predicate handles them correctly via NULL propagation.
