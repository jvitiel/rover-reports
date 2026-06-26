# cropSweep execSync → Async Conversion: Scoping Report

**Date:** 2026-06-26 05:05 UTC

---

## 1. cropSweep.ts — The Blocking Site

### Full function structure (cropSweep.ts, lines 46–170)

`runCropSweep(shelterCode?: string): Promise<SweepResult>` has two phases:

**Phase A — CROP SET** (the blocking part):
1. Queries `animal_media` for slot-1 photos needing a crop:
   ```sql
   WHERE strip_position = 1 AND media_type = 'photo'
     AND hidden = 0 AND crop_locked = 0
     [AND shelter_code = ?]  -- when scoped
   ```
2. For each candidate, checks three conditions: `crop_url IS NULL`, source media ID mismatch, or crop file missing from disk.
3. **For each photo needing a crop: calls `execSync` (line 104)**:
   ```typescript
   const stdout = execSync(
     `${CROP_PYTHON} ${CROP_WORKER} --ids ${row.id}`,
     { cwd: ROOT_DIR, timeout: 30_000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
   );
   ```
4. Parses stdout JSON → verifies crop file exists on disk → writes `crop_url` to DB:
   ```typescript
   db.prepare('UPDATE animal_media SET crop_url = ? WHERE id = ?').run(wr.crop_url, row.id);
   ```

**Phase B — CLEAR SET** (fast, no blocking): Clears stale `crop_url` on non-slot-1 rows. Pure SQLite UPDATEs — no child process.

### Key facts:
- **Loops over N candidates**, calling `execSync` per photo: if 5 photos need cropping, that's **5 × 30s = 150s** of event-loop blocking.
- When scoped to one animal (`shelterCode` param), typically 0 or 1 candidate (only the slot-1 photo). Dashboard drags always pass a shelterCode, so the loop is 1 iteration max in practice.
- The **DB write** (`crop_url` UPDATE) happens in the **Node code** after parsing the worker's stdout. The Python worker does NOT write to the DB — it only writes the crop image file to disk and outputs JSON to stdout.
- Error handling: `try/catch` around `execSync`. On failure (timeout, non-zero exit, bad JSON, missing output file), the photo is recorded as `failed` and `crop_url` is left as-is (NULL or stale). The function continues to the next candidate.
- Return value: `SweepResult { cropped, cleared, failed, details[] }` — counts and per-row action log.

## 2. All Callers of runCropSweep

### Fire-and-forget callers (3 sites in server.ts):

| Line | Endpoint | Context |
|------|----------|---------|
| 3925 | `POST /api/photos/:animalId/add-to-strip` | After `res.json()` sent |
| 3957 | `POST /api/photos/:animalId/remove-from-strip` | After `res.json()` sent |
| 4091 | `PUT /api/photos/:animalId/reorder` | After `res.json()` sent |

All three use the same pattern:
```typescript
res.json({ success: true, data: { strip, library } });
// Fire-and-forget: reconcile crops for this animal after response
runCropSweep(shelterCode).catch(err => console.error('[CropSweep] drag sweep failed:', err));
```

**Key: the HTTP response is sent BEFORE the sweep runs.** The `SweepResult` return value is discarded (only error is caught/logged). No client receives or depends on the sweep result. Making this truly async/non-blocking changes **nothing** the client currently receives.

### Awaited caller (1 site in server.ts):

| Line | Context | Details |
|------|---------|---------|
| 12511 | `runNightlySMPhotoSync()` | `const sweepResult = await runCropSweep()` (no shelterCode — full sweep) |

This runs inside the nightly SM photo sync (2 AM ET daily, `setTimeout`/`setInterval` in the main event loop). It `await`s the result and logs summary counts. The full-sweep (no shelterCode) processes ALL slot-1 photos — potentially dozens of `execSync` calls = minutes of blocking. Making this async is equally important, though it only runs once daily at 2 AM.

**Summary:** No HTTP endpoint depends on the sweep's return value. The nightly sync logs counts but doesn't gate anything on them. Converting to async changes zero client-visible behavior.

## 3. manual-crop Endpoint (server.ts:3968–4072) — USER-WAITS Case

```typescript
app.post('/api/photos/:mediaId/manual-crop', async (req, res) => {
  // ... validation ...
  const cmd = `${CROP_PYTHON} ${CROP_WORKER} --ids ${mediaId} --manual-box ${x},${y},${w},${h} --rotate ${rot}`;
  let stdout: string;
  try {
    stdout = execSync(cmd, {
      cwd: path.resolve(__dirname, '..', '..'),
      timeout: 30_000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (workerErr: any) {
    res.status(500).json({ success: false, error: 'Crop worker failed' });
    return;
  }
  // ... parse JSON, verify file, write DB ...
  const versionedCropUrl = `${wr.crop_url}?v=${Date.now()}`;
  db.prepare('UPDATE animal_media SET crop_url = ?, crop_locked = 1 WHERE id = ?')
    .run(versionedCropUrl, mediaId);
  res.json({
    success: true,
    data: { cropUrl: versionedCropUrl, method: wr.method, mediaId },
  });
});
```

### Differences from cropSweep:
| Aspect | cropSweep | manual-crop |
|--------|-----------|-------------|
| Caller waits? | No (fire-and-forget) | **Yes** — client needs `cropUrl` in response |
| Sets `crop_locked`? | No | **Yes** — locks the crop (`crop_locked = 1`) |
| Uses `--manual-box` and `--rotate`? | No (auto YOLO crop) | **Yes** |
| Appends `?v=` cache buster? | No | **Yes** |
| Response includes cropUrl? | N/A | **Yes** — `data.cropUrl` |

**This endpoint MUST become an awaited async child process** (e.g. `util.promisify(execFile)` or a `spawn`-based promise wrapper). It cannot be fire-and-forget because the client (the "Save Crop" button) expects `{ cropUrl }` in the response. But it must NOT use `execSync` because that blocks every other request for 30 seconds.

The correct conversion: replace `execSync` with a promise-based `execFile` (or `spawn` wrapper), `await` it within the handler, and the endpoint continues to return the crop result to the client — but without freezing the event loop for other requests.

## 4. Crop Worker Contract

### Invocation:
```
/opt/crop-venv/bin/python3 crop-worker.py --ids <uuid> [--manual-box x,y,w,h] [--rotate 0|90|180|270]
```

### Stdout output:
JSON array on stdout (one element per `--ids` entry):
```json
[{
  "media_id": "uuid",
  "shelter_code": "S2023445",
  "species": "cat",
  "out_filename": "S2023445-1234.jpg",
  "crop_url": "https://dogwalker.../data/animal-media/crops/S2023445-1234.jpg",
  "method": "smart" | "fallback" | "manual",
  "confidence": 0.87,
  "error": null | "error message"
}]
```
Progress/summary lines go to **stderr** (not stdout). The JSON array is always on stdout.

### Exit code:
- **0**: all photos processed (some may have `"error"` in JSON — per-photo error, not fatal)
- **1**: fatal error only (chown failure, invalid args, no DB rows)

### DB writes:
**The Python worker does NOT write to the database.** It only:
1. Writes the crop JPEG file to `data/animal-media/crops/`
2. Outputs JSON to stdout

The **Node code** reads the JSON output and writes `crop_url` to the DB. This is critical for the async conversion: the async wrapper must capture stdout, parse the JSON, and then perform the DB write — exactly as the current synchronous code does, just without blocking.

### Async wrapper contract:
- Spawn the child process
- Collect stdout into a buffer
- On exit code 0: parse JSON, verify crop file exists, write `crop_url` to DB
- On exit code != 0 or timeout: treat as failure (same as current `catch` block)

## 5. Concurrency Safety

### Current state:
There is **no server-side concurrency guard** on crop sweep invocations. The client has `stripMutationSeq` (a per-animal sequence counter) that discards stale responses, but this only guards the UI render — it doesn't prevent the server from running concurrent sweeps.

### Risk if sweep becomes async:
If the user rapidly drags photos, multiple async sweeps for the same animal/photo could run concurrently:
1. Drag #1 → fires async sweep → spawns crop worker for `cee36558`
2. Drag #2 (1 second later) → fires async sweep → spawns ANOTHER crop worker for `cee36558`
3. Both workers write the same output file → potential file corruption (truncated write)
4. Both Node callbacks try to write `crop_url` to DB → last-write-wins (harmless for DB, but file may be corrupt)

### Recommended minimal guard:

A per-shelter-code in-flight `Set` that prevents re-entry:

```typescript
const cropSweepInFlight = new Set<string>();

export async function runCropSweep(shelterCode?: string): Promise<SweepResult> {
  const key = shelterCode || '__global__';
  if (cropSweepInFlight.has(key)) {
    return { cropped: 0, cleared: 0, failed: 0, details: [] }; // skip, already running
  }
  cropSweepInFlight.add(key);
  try {
    // ... actual sweep logic ...
  } finally {
    cropSweepInFlight.delete(key);
  }
}
```

This is lightweight (no timers, no external state) and prevents concurrent workers for the same animal. Different animals can crop concurrently — that's safe (different output files).

## 6. crop_url NULL Trigger — Selection Logic

The selection query (cropSweep.ts:58–67):
```sql
SELECT am.id, am.shelter_code, am.crop_url, am.source_media_id
FROM animal_media am
WHERE am.strip_position = 1
  AND am.media_type = 'photo'
  AND am.hidden = 0
  AND am.crop_locked = 0
  [AND am.shelter_code = ?]
```

Then three conditions trigger a crop:
1. `crop_url IS NULL` (most common — new or never-cropped)
2. `source_media_id` changed (photo was swapped)
3. `crop_url` set but file missing on disk

### Current problem with S2023445:
Photo `cee36558-443f-4733-8ac5-3c66b402381e` is at position 1 with `crop_url = NULL` and `crop_locked = 0`. Every sweep invocation finds it, spawns a worker, and either:
- The crop **succeeds** and writes `crop_url` to DB → but the next drag may move a different photo to position 1, clearing the old crop (Phase B) and the new photo may have NULL crop_url → cycle repeats
- The crop **fails** → `crop_url` stays NULL → next sweep tries again

### Is debouncing needed beyond async?

**Async alone is sufficient for the event-loop-blocking problem.** With the concurrency guard (§5), a rapid-fire sequence of drags won't spawn duplicate workers — only the first triggers a worker, and subsequent sweeps skip while it's in flight.

However, there's an **efficiency concern**: even with async, every single strip drag spawns a crop worker process (Python + YOLO model load ≈ 2–5 seconds). This is wasteful if the user is mid-session dragging photos around. A **debounce** (e.g. 2-second delay before starting the sweep) would let rapid drags settle before cropping. This is a nice-to-have, not a correctness requirement.

**Recommendation:** Implement the concurrency guard first. Add debounce only if crop workers still spawn too frequently in practice.

## 7. Build/Deploy Path

- Source files to modify: `server/src/cropSweep.ts`, `server/src/server.ts`
- TypeScript compiled: `cd /home/shelter/shelter-apps/server && npm run build`
- Restart: `sudo systemctl restart shelter-app`
- Git clean: working tree has only untracked `.backup-*` / `.bak-*` files — no tracked-file modifications. HEAD is `ac3fdd3`.
- **Crop SW/NE fix is NOT in the tree** — confirmed, the dashboard `index.html` is unmodified.

## Summary of Conversion Plan

| Call site | Current | Target | Notes |
|-----------|---------|--------|-------|
| cropSweep.ts `execSync` (line 104) | Blocking, 30s timeout | `execFile` promise wrapper, same timeout | Core change. Must still parse stdout JSON, verify file, write DB |
| server.ts add-to-strip (3925) | Fire-and-forget, response already sent | No change needed (already fire-and-forget) | Concurrency guard prevents duplicates |
| server.ts remove-from-strip (3957) | Fire-and-forget, response already sent | No change needed | Same |
| server.ts reorder (4091) | Fire-and-forget, response already sent | No change needed | Same |
| server.ts nightly sync (12511) | `await runCropSweep()` | `await runCropSweep()` — same | Sweep becomes async internally, caller still awaits |
| server.ts manual-crop (4019) | `execSync`, user waits for `cropUrl` | Awaited `execFile` promise | Must preserve response with `cropUrl`; must NOT block event loop |

### Files to change:
1. **cropSweep.ts**: Replace `import { execSync }` with `import { execFile }` + promisify wrapper. Add per-shelterCode concurrency guard. Loop body becomes `await execFileAsync(...)`.
2. **server.ts**: Replace `execSync` in `manual-crop` handler with awaited `execFile` promise. No changes needed for the three fire-and-forget call sites (they already call `runCropSweep(...).catch(...)`).

### What must NOT change:
- DB write happens in Node after parsing stdout (not in Python worker)
- manual-crop response includes `cropUrl` synchronously to the client
- `crop_locked = 1` set only by manual-crop, not by sweep
- Phase B (clear stale crop_url) runs after Phase A — no blocking there, fine as-is
- Error handling: sweep failures are non-fatal (log and continue)
