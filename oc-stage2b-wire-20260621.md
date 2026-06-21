# Stage 2b: Wire runCropSweep into Sync + Drag Endpoints

**Date:** 2026-06-21 ~22:10 UTC  
**Commit:** `a8ba914`  
**Files:** `server/src/server.ts` (15 insertions), `server/src/cropSweep.ts` (6 insertions, 2 deletions — ESM fix, see Deviations)

---

## 1. Import

```typescript
// server.ts:14 (between customSearchSummary and logger imports)
import { runCropSweep } from './cropSweep.js';
```

## 2. Sync Attach (server.ts:12178-12183)

After the `[SM Photo Sync] Complete...` log, inside the try block:

```typescript
    console.log(`[SM Photo Sync] Complete. ${newPhotosCount} new photos ...`);

    // Post-sync crop reconciliation: ensure all slot-1 photos have valid crops
    try {
      const sweepResult = await runCropSweep();
      console.log(`[CropSweep] Post-sync sweep: cropped=${sweepResult.cropped}, cleared=${sweepResult.cleared}, failed=${sweepResult.failed}`);
    } catch (sweepErr) {
      console.error('[CropSweep] Post-sync sweep failed (non-fatal):', sweepErr);
    }
    
  } catch (err) {
    console.error('[SM Photo Sync] Job failed:', err);
  }
```

The sweep has its own inner try/catch so a sweep failure is logged but doesn't affect the outer sync error handling. The outer try/catch still catches sync-level failures.

## 3. Drag Endpoints (fire-and-forget after res.json)

### add-to-strip (server.ts:3894)

```typescript
      res.json({ success: true, data: { strip, library } });
      // Fire-and-forget: reconcile crops for this animal after response
      runCropSweep(shelterCode).catch(err => console.error('[CropSweep] drag sweep failed:', err));
```

### remove-from-strip (server.ts:3927)

```typescript
      res.json({ success: true, data: { strip, library } });
      // Fire-and-forget: reconcile crops for this animal after response
      runCropSweep(shelterCode).catch(err => console.error('[CropSweep] drag sweep failed:', err));
```

### reorder (server.ts:3955)

```typescript
        res.json({ success: true, data: { strip } });
        // Fire-and-forget: reconcile crops for this animal after response
        runCropSweep(shelterCode).catch(err => console.error('[CropSweep] drag sweep failed:', err));
```

All three: after `res.json()` (non-blocking), scoped to `shelterCode`, with `.catch()` (no unhandled rejections). The `else` branch (no shelterCode resolved) skips the sweep — no shelter_code to scope with.

## 4. Build

TypeScript compile (`npx tsc --noEmit`): **exit 0, clean** [VERIFIED].  
Runtime build (`npm run build`): **exit 0** [VERIFIED].  
Service restart: **active** [VERIFIED via `systemctl is-active shelter-app`].

## 5. Commit

**Hash:** `a8ba914`  
**Files:** 2 (server.ts + cropSweep.ts ESM fix)  
**Message:** "Wire runCropSweep: full sweep after nightly sync + scoped fire-and-forget on strip drag endpoints"

## 6. Live Verify

### 6a. Full sweep

```
runCropSweep() → cropped=0, cleared=0, failed=1
details: [S2026101:fail:crop_url_null: 404 Client Error]
```
**Expected:** cropped=0 (all 688 already valid), failed=1 (S2026101 source 404), cleared=0. ✅

### 6b. Idempotency (second run)

```
runCropSweep() → cropped=0, cleared=0, failed=1
details: [S2026101:fail:crop_url_null: 404]
```
**Identical to 6a.** S2026101 fails gracefully every time (known broken source). ✅

### 6c. Scoped no-op

```
runCropSweep('S2025966') → cropped=0, cleared=0, failed=0
```
**Expected:** S2025966 has valid slot-1 crop, no action. ✅

### 6d. No live rows changed

- S2026101 crop_url: **NULL** [VERIFIED — still NULL, not modified]
- S2025966, A2025088, S2026397: all have crop_url non-NULL [VERIFIED — unchanged]
- Total crop_url non-NULL: **688** [VERIFIED — same as before wiring]

### 6e. Verify script cleanup

`/tmp/verify-cropsweep.mjs` deleted after use [VERIFIED].

## Deviations

**1 deviation:** `cropSweep.ts` was also modified in this commit (6 insertions, 2 deletions). The original module used `__dirname` which is not available in ES modules. Fixed by adding `import { fileURLToPath } from 'url'` and deriving `__dirname` via `path.dirname(fileURLToPath(import.meta.url))` — the same pattern used in server.ts:254-255. This fix was necessary for the service to start. The commit was amended to include both files.
