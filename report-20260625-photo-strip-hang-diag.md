# Photo Strip Hang & Drag Unreliability — Diagnosis

**Date:** 2026-06-26 ~04:55 UTC
**Reported symptoms:** (1) drag-reorder unreliable, (2) library-to-strip inconsistent, (3) dashboard "spins" on refresh

---

## 1. System Health — Confirmed Healthy

```
Load:   0.00, 0.04, 0.01 (2 cores) — idle
Memory: 3.8Gi total, 968Mi used, 2.9Gi available
Swap:   37Mi / 511Mi (7%) — healthy post-OC-restart
```

shelter-app: PID 75002, uptime 53 min, 0.2% CPU, 208MB RSS. **No memory pressure, no swap thrash.** This is a code-level bug, not a resource issue.

## 2. Root Cause: `execSync` in `cropSweep.ts` Blocks the Node.js Event Loop

**File:** `server/src/cropSweep.ts`, line 104
**Called from:** `server.ts` lines 3925, 3957, 4091 (add-to-strip, remove-from-strip, reorder endpoints)

### The blocking call

```typescript
// cropSweep.ts:104
const stdout = execSync(
  `${CROP_PYTHON} ${CROP_WORKER} --ids ${row.id}`,
  {
    cwd: path.resolve(__dirname, '..', '..'),
    timeout: 30_000,      // ← blocks event loop for up to 30 SECONDS
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }
);
```

### How it's triggered

Every strip mutation endpoint (add-to-strip, remove-from-strip, reorder) calls `runCropSweep(shelterCode)` fire-and-forget:

```typescript
// server.ts:3925 (add-to-strip)
runCropSweep(shelterCode).catch(err => console.error('[CropSweep] drag sweep failed:', err));
```

The response is sent BEFORE the sweep runs. But `runCropSweep` is `async` only at the wrapper level — internally it calls `execSync`, which **synchronously blocks the Node.js event loop** for the full duration of the crop-worker Python process (up to 30 seconds per photo). The `async` keyword does not make `execSync` non-blocking. Once execution reaches `execSync`, **all** request handling, timers, and I/O callbacks are frozen.

### The vicious cycle for animal S2023445 (photo ID 728)

Current DB state for S2023445 strip:
```
id                                    | pos | crop_url | crop_locked
cee36558-443f-4733-8ac5-3c66b402381e  |  1  | NULL     | 0
c9a738ee-27d5-4c7c-8cf1-b03f15a40ad6  |  3  | NULL     | 0
92bfcf38-2807-4add-a4bc-63b214e9ecbe  |  6  | (set)    | 1
```

Photo `cee36558...` is at **strip position 1** with **crop_url = NULL** and **crop_locked = 0**. This means EVERY `runCropSweep('S2023445')` invocation:
1. Finds `cee36558` needs cropping (crop_url is NULL, position = 1, not locked)
2. Calls `execSync(crop-worker.py --ids cee36558...)` 
3. **Blocks the event loop for up to 30 seconds**
4. Either the crop succeeds (but crop_url may not persist if the photo gets moved again) or it fails/times out

Every strip drag/drop fires a new crop sweep → 30-second event loop freeze → dashboard unresponsive → user retries when it unfreezes → next sweep → freeze again.

### Evidence: the 30-second heartbeat

Server logs show `POST /api/photos/728/add-to-strip` and `PUT /api/photos/728/reorder` firing exactly every **30 seconds** — matching the `execSync` timeout of `30_000ms`:

```
04:51:29 PUT /api/photos/728/reorder
04:51:59 PUT /api/photos/728/reorder
04:52:29 PUT /api/photos/728/reorder
04:52:59 PUT /api/photos/728/reorder
04:53:29 PUT /api/photos/728/reorder
04:53:59 POST /api/photos/728/add-to-strip
04:54:29 PUT /api/photos/728/reorder
04:54:59 POST /api/photos/728/add-to-strip
```

This pattern has been continuous for 20+ minutes, surviving multiple hard browser refreshes. Each request completes (the response is sent before the sweep), but the next 30 seconds are frozen. The user's next action queues during the freeze and executes the instant it unblocks — then triggers a new sweep.

### The `manual-crop` endpoint has the same problem

```typescript
// server.ts:4014
stdout = execSync(cmd, {
  cwd: path.resolve(__dirname, '..', '..'),
  timeout: 30_000,
  encoding: 'utf-8',
  stdio: ['pipe', 'pipe', 'pipe'],
});
```

This endpoint also uses `execSync` inline, blocking the event loop while it waits for the crop result. However, this is at least intentional (the user waits for the crop result), unlike the fire-and-forget sweep.

## 3. Why the Dashboard "Spins" on Refresh

The dashboard page load itself completes quickly (all API calls return within ~1 second — confirmed in logs). But if any crop sweep is in progress when the page loads, the page-load requests are queued behind the `execSync` block. Additionally:

- After page load, if the user has S2023445 expanded, any interaction with its strip immediately triggers a new crop sweep → freeze.
- The DogWalker background refresh (every 2 min) also queues behind the block, producing the anomalous 30–150 second refresh times seen in logs even post-restart.

## 4. Server-Side Endpoint Analysis

### `POST /api/photos/:animalId/add-to-strip`
- Calls `addPhotoToStrip(mediaId, position)` — SQLite, fast
- Reads strip + library — SQLite, fast
- Sends response
- **Fire-and-forget `runCropSweep(shelterCode)` — BLOCKS EVENT LOOP**
- No SM API or Google Sheets calls in the request path

### `PUT /api/photos/:animalId/reorder`
- Calls `reorderStripPhoto(mediaId, newPosition)` — SQLite, fast
- Reads strip — SQLite, fast
- Sends response
- **Fire-and-forget `runCropSweep(shelterCode)` — BLOCKS EVENT LOOP**
- No SM API or Google Sheets calls in the request path

### `POST /api/photos/:animalId/remove-from-strip`
- Same pattern: SQLite ops, response, then blocking crop sweep

**None of these endpoints call SM API or Google Sheets.** The external-call slowness (DogWalker 150s refreshes) is a secondary victim of the event-loop block, not a cause.

## 5. Google Sheets / SM in the Hot Path

- **add-to-strip / reorder / remove-from-strip**: NO external calls. Pure SQLite + fire-and-forget crop sweep.
- **GET /api/featured-slots**: Calls `buildFeaturedAnimalData` → `getAnimalById` (SM cache, fast). No Google Sheets.
- **DogWalker refresh** (background, 2-min interval): Calls SM API + Google Sheets Walk Log. No re-entrancy guard — multiple refreshes can overlap. The Google Sheets `Walk Log!A:G` read has **no timeout** on the Google API call.
- **clearWordPressFeaturedCache**: Fires on SM sync and slot/bio mutations. POST to `https://johnv80.sg-host.com/wp-json/4lg/v1/clear-animals-cache` with **no timeout**. Currently returns 404 in 0.37s — fast, but a DNS/network issue would block indefinitely.
- **Cat Activity Google Sheet**: Hit 1000-row grid limit (error at 03:55). This only affects activity logging, not dashboard page load or photo strip.

## 6. Client-Side Retry Analysis

The dashboard JS for strip operations (add-to-strip, reorder, remove-from-strip) uses a simple `fetch` with no retry loop, no `setInterval`, no `setTimeout` retry:

```javascript
// onPhotoDrop — line 8392
fetch(`${API_BASE}/photos/${animalIdForReload}/reorder`, { ... })
  .then(res => res.json())
  .then(result => {
    if (result.success && result.data) {
      applyStripMutationResponse(animalIdForReload, seq, result.data);
    }
  })
  .catch(err => console.error('Reorder failed:', err));
```

There is a `stripMutationSeq` re-entrancy guard that discards stale responses, but no automatic retry. The 30-second repeating pattern is the **user manually retrying** each time the dashboard unfreezes from the `execSync` block, not an automated loop.

No service worker exists for the dashboard. No `visibilitychange` handler. No background sync.

## 7. Recent Commit Correlation

Last 5 commits (newest first):
```
ac3fdd3 featured rotation: edition windowing + email render + 4-edition dry test
6a2f215 featured rotation: seed insert
3cc8c79 featured rotation: dateAvailableForAdoption field + seed compute
2aeae58 featured rotation: add featured_rotation_queue table
5d08f48 matcher overlay: localize color via translateColorEs
```

**None of these touch the photo strip, crop sweep, or dashboard load path.** The `execSync` in `cropSweep.ts` predates this session's work. The crop-resize corner bug fix (SW/NE handle inversion) has NOT been applied — confirmed not in the tree.

## 8. DogWalker Overlapping Refreshes (Secondary Issue)

The `setInterval` fires every 2 minutes with **no re-entrancy guard**. When a refresh takes >2 minutes (due to event-loop blocking or Sheets API latency), the next interval fires and starts a second concurrent refresh. Both compete for the Google Sheets API, creating a snowball effect:

```
04:55:29 DogWalker Cache refreshed: 36 dogs in 150472ms  (started ~04:52:59)
04:55:29 DogWalker Cache refreshed: 36 dogs in 30390ms   (started ~04:54:59)
```

Two refreshes resolved simultaneously. The 150s one was blocked behind `execSync` calls; the 30s one overlapped it. This is a secondary issue — fixing the `execSync` blocking will also fix the DogWalker timing because the refreshes won't be frozen behind crop work.

---

## Summary

| Finding | Severity |
|---------|----------|
| `cropSweep.ts` uses `execSync` (blocks event loop up to 30s per photo) | **Critical — root cause** |
| S2023445 slot-1 photo has crop_url=NULL, triggering sweep on every strip op | Trigger condition |
| `manual-crop` endpoint also uses `execSync` inline | High (same class of bug) |
| DogWalker refresh lacks re-entrancy guard | Medium (secondary) |
| WP cache-clear fetch has no timeout | Low (currently fast, latent risk) |
| Google Sheets Walk Log fetch has no timeout | Low (latent risk) |
| Cat Activity sheet hit 1000-row limit | Unrelated (activity logging only) |

**The fix:** Replace `execSync` in `cropSweep.ts` (and ideally `manual-crop` in `server.ts`) with `execFile`/`spawn` (async, non-blocking child process). The fire-and-forget sweep should use async process spawning so the event loop stays free. The manual-crop endpoint should use a promise-based child process wrapper.
