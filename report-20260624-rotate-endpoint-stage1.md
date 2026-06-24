# Rotate Endpoint — Stage 1 Implementation

**Date:** 2026-06-24  
**Commit:** be871a4  
**Scope:** server/src/server.ts only (49 insertions, 1 deletion — added `copyFileSync` to fs import).

---

## Endpoint

**POST /api/volunteers/rotate-image** — server.ts:10074–10119

```ts
// POST /api/volunteers/rotate-image — Rotate a volunteer scan image 90° CW
app.post('/api/volunteers/rotate-image', (req: Request, res: Response) => {
  try {
    const { filePath } = req.body;
    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({ success: false, error: 'filePath is required' });
      return;
    }

    // Validate filePath format: must be /data/volunteer-files/{uuid}/page-NN.(jpg|png)
    const pathRegex = /^\/data\/volunteer-files\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/page-\d{2}\.(jpg|png)$/;
    if (!pathRegex.test(filePath)) {
      res.status(400).json({ success: false, error: 'Invalid file path format' });
      return;
    }

    // Resolve to absolute path and defense-in-depth: must stay inside volunteer-files
    const absPath = path.resolve(ROOT_DIR, filePath.replace(/^\//, ''));
    const safePrefix = path.join(ROOT_DIR, 'data', 'volunteer-files') + path.sep;
    if (!absPath.startsWith(safePrefix)) {
      res.status(400).json({ success: false, error: 'Path escapes volunteer-files directory' });
      return;
    }

    if (!existsSync(absPath)) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    // Backup on first rotate only (preserve true original)
    const backupPath = absPath + '.bak-rotate';
    if (!existsSync(backupPath)) {
      copyFileSync(absPath, backupPath);
      console.log(`[Volunteer] Backed up original: ${backupPath}`);
    }

    // Rotate 90° CW, reset EXIF orientation to normal, overwrite in place
    execSync(`convert "${absPath}" -rotate 90 -orient top-left -quality 85 "${absPath}"`, { timeout: 15000 });
    console.log(`[Volunteer] Rotated image 90° CW: ${absPath}`);

    // Return cache-busted URL
    res.json({ success: true, url: `${filePath}?v=${Date.now()}` });
  } catch (error: any) {
    console.error('[Volunteer] Rotate image error:', error);
    res.status(500).json({ success: false, error: 'Failed to rotate image' });
  }
});
```

Inserted between GET /api/volunteers/:id (line 10058) and PATCH /api/volunteers/:id (line 10122). Matches the auth/permission pattern of all other volunteer endpoints (no auth middleware — dashboard endpoints are behind Caddy's IP restriction).

---

## Path Validation (Two Layers)

1. **Regex gate**: `/^\/data\/volunteer-files\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/page-\d{2}\.(jpg|png)$/` — rejects anything that doesn't match the exact UUID + page-NN pattern.
2. **Resolved-path check**: `path.resolve()` + `startsWith(safePrefix)` — defense-in-depth against traversal even if regex somehow passes.

---

## Backup Logic

- First rotate: `copyFileSync(absPath, absPath + '.bak-rotate')` — preserves the true original pixel data.
- Subsequent rotates: skip if `.bak-rotate` already exists — never overwrites the backup.

---

## Rotate Command

```bash
convert "${absPath}" -rotate 90 -orient top-left -quality 85 "${absPath}"
```

Reuses the ImageMagick pattern from volunteer upload (server.ts:9271). `-rotate 90` rotates pixels 90° CW. `-orient top-left` resets EXIF orientation to 1 (Normal). `-quality 85` matches upload quality. Overwrites file in place (same path in DB, no schema change).

---

## Build + Restart

- `npm run build` (tsc): exit 0, clean.
- `systemctl restart shelter-app`: active.

---

## Verification (Throwaway Test)

**Test setup:** Created dir `00000000-0000-0000-0000-000000000000` under volunteer-files. Copied Kayla's page-04.jpg (the CORRECT orient=6 image, 2000×1500 landscape pixels) as `page-01.jpg`.

### Test A: Successful Rotate
- **Before:** 2000×1500, Orientation=RightTop (6)
- **After:** 1500×2000, Orientation=TopLeft (1/Normal)
- **Response:** `{ success: true, url: "/data/volunteer-files/00000000-.../page-01.jpg?v=1782343285248" }`
- ✅ Pixels rotated 90° CW. EXIF reset to normal. Cache-bust `?v=` present.

### Test B: Backup Skip-on-Second
- Second rotate call: backup file mtime unchanged (1782343285 before and after).
- ✅ Backup NOT overwritten. Skip-if-exists works. Backup still has original (2000×1500, RightTop).

### Test C: Path Validation (4 bad paths)
| Input | Result |
|-------|--------|
| `/data/volunteer-files/../../../etc/passwd` | 400 "Invalid file path format" ✅ |
| `/data/volunteer-files/notauuid/page-01.jpg` | 400 "Invalid file path format" ✅ |
| `/data/animal-media/videos/test.jpg` | 400 "Invalid file path format" ✅ |
| `{}` (missing filePath) | 400 "filePath is required" ✅ |

All rejected. No files touched.

### Test D: Real 10 Sideways Images Untouched
- Kayla's dir (da10d71e): 4 files, mtimes all `Jun 22 21:12`, zero `.bak-rotate` files. ✅
- Global `.bak-rotate` search: only test dir had one. ✅
- Real sideways images are John's to fix via the button (Stage 2).

### Cleanup
- Test dir `00000000-0000-0000-0000-000000000000` removed. Confirmed gone.

---

## Deviations

None. Endpoint matches the spec exactly.

---

## Commit

```
be871a4 volunteer: POST /api/volunteers/rotate-image endpoint (90° CW, EXIF reset, path-validated, backup-on-first)
 1 file changed, 49 insertions(+), 1 deletion(-)
```

Only `server/src/server.ts` committed (explicit `git add server/src/server.ts`, not `git add -A`).
