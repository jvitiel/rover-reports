# Crop Editor Stage 4: Manual-Crop Endpoint

**Date:** 2026-06-22 21:25 UTC  
**Commit:** `ea5f8f7`  
**File:** `server/src/server.ts` (+97)

---

## Patterns Reused

### Worker invocation (from cropSweep.ts:104-114)
```typescript
const CROP_PYTHON = '/opt/crop-venv/bin/python3';
const CROP_WORKER = path.join(ROOT_DIR, 'scripts', 'crop-worker.py');
const stdout = execSync(`${CROP_PYTHON} ${CROP_WORKER} --ids ${row.id}`, {
  cwd: path.resolve(__dirname, '..', '..'),
  timeout: 30_000, encoding: 'utf-8',
  stdio: ['pipe', 'pipe', 'pipe'],
});
const jsonMatch = stdout.match(/\[[\s\S]*\]/);
```

### Route pattern (from add-to-strip, server.ts:3876)
```typescript
app.post('/api/photos/:animalId/add-to-strip', async (req, res) => {
  const { mediaId, position } = req.body;
  if (!mediaId || !position) { res.status(400).json(...); return; }
  // ... action + response
});
```

## New Route: POST /api/photos/:mediaId/manual-crop (server.ts:3941-4035)

```typescript
app.post('/api/photos/:mediaId/manual-crop', async (req, res) => {
  const { x, y, w, h } = req.body;
  // Validate: all present, integers, non-negative, w>0, h>0, w===h (square)
  // Validate: mediaId exists in animal_media, media_type='photo'
  // Invoke: /opt/crop-venv/bin/python3 crop-worker.py --ids <mediaId> --manual-box x,y,w,h
  // Parse JSON, verify crop file exists
  // UPDATE animal_media SET crop_url = ?, crop_locked = 1 WHERE id = ?
  // Respond: { success, data: { cropUrl, method, mediaId } }
});
```

### DB write — explicit columns only (server.ts:4025)
```typescript
db.prepare(
  'UPDATE animal_media SET crop_url = ?, crop_locked = 1 WHERE id = ?'
).run(wr.crop_url, mediaId);
```

## Build

```
$ cd server && npm run build → tsc exit 0
$ systemctl is-active shelter-app → active
```

Note: initial build had `database` instead of `db` (the route-level pattern is `const db = getDatabase()`). Fixed to `db`, clean on second build.

## Curl Proof

### Pre-test state
```
id: 01ef1f8d-7335-49c0-92ee-7a473aee6897
crop_url: https://dogwalker.../crops/A2024185-4484.jpg
crop_locked: 0
strip_position: 1
file_url: https://service.sheltermanager.com/...mediaid=4484...
media_type: photo
```

### (a) Success — valid square box
```
POST /api/photos/01ef1f8d-.../manual-crop
Body: {"x":50,"y":100,"w":400,"h":400}
```
```json
{
  "success": true,
  "data": {
    "cropUrl": "https://dogwalker.../crops/A2024185-4484.jpg",
    "method": "manual",
    "mediaId": "01ef1f8d-..."
  }
}
```
✅ Worker ran manual, crop file written, response carries cropUrl.

### (b) DB row — lock set
```
crop_url: https://dogwalker.../crops/A2024185-4484.jpg
crop_locked: 1
```
✅

### (c) Isolation — different animal unchanged
```
T2026018 slot-1:
crop_url: https://dogwalker.../crops/T2026018-9501.jpg
crop_locked: 0
```
✅

### (d) Explicit-column — other columns unchanged on target
```
strip_position: 1 (unchanged)
file_url: https://service.sheltermanager.com/...mediaid=4484... (unchanged)
media_type: photo (unchanged)
hidden: 0 (unchanged)
shelter_code: A2024185 (unchanged)
```
✅ Only crop_url + crop_locked were touched.

### (e) Validation rejections

| Test | Body | Response |
|------|------|----------|
| Non-square | `{"x":0,"y":0,"w":400,"h":300}` | 400: "Box must be square (w must equal h)" |
| Missing field | `{"x":0,"y":0,"w":400}` | 400: "x, y, w, h are all required" |
| Negative | `{"x":-10,"y":0,"w":400,"h":400}` | 400: "x, y must be non-negative; w, h must be positive" |
| Bogus mediaId | valid box, id="nonexistent-id" | 404: "Media not found" |

All returned 4xx, no DB writes, no worker invocation ✅

### (f) Restore
```
UPDATE animal_media SET crop_locked = 0 WHERE id = '01ef1f8d-...'
python3 crop-worker.py --ids 01ef1f8d-... → method="smart"
```
Post-restore:
```
crop_url: https://dogwalker.../crops/A2024185-4484.jpg
crop_locked: 0
```
Auto-crop file restored, no lingering lock ✅
