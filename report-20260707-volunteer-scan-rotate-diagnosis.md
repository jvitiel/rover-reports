# Volunteer Scan Rotate — Diagnosis

## Handler

```
POST /api/volunteers/rotate-image
```

```ts
app.post('/api/volunteers/rotate-image', (req: Request, res: Response) => {
  const { filePath } = req.body;
  // Validate: must match /data/volunteer-files/{uuid}/page-NN.(jpg|png)
  const pathRegex = /^\/data\/volunteer-files\/[0-9a-f-]{36}\/page-\d{2}\.(jpg|png)$/;
  // Resolve to absolute, confirm stays inside volunteer-files/
  const absPath = path.resolve(ROOT_DIR, filePath.replace(/^\//, ''));
  // Backup on first rotate (preserve original)
  copyFileSync(absPath, absPath + '.bak-rotate');
  // Rotate 90° CW in place via ImageMagick
  execSync(`convert "${absPath}" -rotate 90 -orient top-left -quality 85 "${absPath}"`);
  // Return cache-busted URL
  res.json({ success: true, url: `${filePath}?v=${Date.now()}` });
});
```

[VERIFIED — server.ts:10603–10649]

### Client trigger

Each thumbnail in `#volScanThumbs` has a `↻` button calling `volRotateImage(index)`. That function reads `volFileUrls[index]`, strips the query string, and POSTs `{ filePath: cleanPath }` via `gatedFetch('/api/volunteers/rotate-image', ...)`. On success it updates `volFileUrls[index]` with the cache-busted URL and re-renders all thumbnails. [VERIFIED — dashboard/index.html:13558–13580]

## Answers

### 1. Does rotate operate on the file BY ITS PATH?

**Yes.** The handler takes `filePath` (e.g. `/data/volunteer-files/{uuid}/page-01.png`), validates format, resolves to absolute, confirms it exists on disk, and rotates it in place with ImageMagick. No DB lookup, no volunteer ID, no metadata table. The only inputs are the path string and the file on disk. [VERIFIED — server.ts:10607–10645]

### 2. Does it need per-file registration that only CREATE sets?

**No.** There is zero per-file registration. No files table, no metadata row, no DB entry per scan page. The handler validates purely by:
- Path format regex (`/data/volunteer-files/{uuid}/page-\d{2}\.(jpg|png)`)
- Path-traversal guard (must resolve inside `volunteer-files/`)
- File existence (`existsSync`)

None of these require anything the CREATE upload sets beyond the physical file on disk. [VERIFIED]

### 3. Is the rotate endpoint gated?

**Yes — W1 gated.** Listed in `isGatedWrite()` [VERIFIED — server.ts:816–817]:
```ts
// POST /api/volunteers/rotate-image
if (method === 'POST' && /^\/api\/volunteers\/rotate-image$/.test(p)) return true;
```

Anonymous requests without `X-Gate-Token` → 401. Client calls via `gatedFetch()` which attaches the token. [VERIFIED]

## Bottom Line

**Yes — automatic.** If a new scan lands at `/data/volunteer-files/{uuid}/page-{NN}.{ext}` and is listed in `original_files` exactly like existing scans, the rotate button appears in the thumbnail rendering (it's part of the thumb HTML template), and the rotate handler will find and rotate the file by path alone. No registration, no metadata, no gap. [VERIFIED]
