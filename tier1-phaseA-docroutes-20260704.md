# Tier-1 Phase A: Gated Document Streaming Routes

## isGatedPath Addition

One clause added to `isGatedPath` in `server.ts`:

```ts
function isGatedPath(p: string): boolean {
  return (
    p === '/api/volunteers'
    || p.startsWith('/api/volunteers/')
    || p === '/api/adoption-applications'
    || p === '/api/dashboard/behavior-notes'
    || p.startsWith('/api/docs/')            // ← NEW
  );
}
```

All `GET /api/docs/*` requests now require `X-Gate-Token`. [VERIFIED — isGatedPath is checked by the piiGate middleware on GET requests]

## Route Handlers

### Route 2a: GET /api/docs/adoption-pdf/:id

```ts
app.get('/api/docs/adoption-pdf/:id', (req: Request, res: Response) => {
  try {
    const idParam = req.params.id as string;
    if (!/^\d+$/.test(idParam)) {
      return res.status(400).json({ error: 'Invalid id — must be an integer' });
    }
    const id = parseInt(idParam, 10);

    const application = getAdoptionApplication(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const pdfDir = getPdfDirectory();
    const pdfFiles = readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));
    const pdfFile = pdfFiles.find(f => f.startsWith(`${id}-`));
    if (!pdfFile) {
      return res.status(404).json({ error: 'PDF not found for this application' });
    }

    const baseDirWithSep = pdfDir + (pdfDir.endsWith(path.sep) ? '' : path.sep);
    const resolved = path.resolve(pdfDir, pdfFile);
    if (!resolved.startsWith(baseDirWithSep)) {
      return res.status(400).json({ error: 'Bad path' });
    }

    if (!existsSync(resolved)) {
      return res.status(404).json({ error: 'PDF file missing on disk' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(resolved);
  } catch (error: any) {
    console.error('[docs] adoption-pdf error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});
```

**Param validation:** `:id` must match `/^\d+$/` (integer only). [VERIFIED]
**Base dir:** `/home/shelter/shelter-apps/adoption-pdfs` (from `getPdfDirectory()`). [VERIFIED]
**Traversal guard:** `path.resolve(pdfDir, pdfFile)` must start with `baseDirWithSep`. [VERIFIED]
**Filename derivation:** Mirrors existing `GET /api/adoption-applications` — scans pdf dir for files starting with `{id}-`. [VERIFIED]

### Route 2b: GET /api/docs/volunteer-file/:uuid/:file

```ts
app.get('/api/docs/volunteer-file/:uuid/:file', (req: Request, res: Response) => {
  try {
    const uuid = req.params.uuid as string;
    const file = req.params.file as string;

    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)) {
      return res.status(400).json({ error: 'Invalid uuid format' });
    }
    if (!/^(page-\d{1,2}\.(jpg|jpeg|png)|upload-\d+\.pdf)$/i.test(file)) {
      return res.status(400).json({ error: 'Invalid file name format' });
    }

    const baseDir = path.join(ROOT_DIR, 'data', 'volunteer-files');
    const baseDirWithSep = baseDir + path.sep;
    const resolved = path.resolve(baseDir, uuid, file);
    if (!resolved.startsWith(baseDirWithSep)) {
      return res.status(400).json({ error: 'Bad path' });
    }

    if (!existsSync(resolved)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const ext = path.extname(file).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.pdf': 'application/pdf',
    };
    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(resolved);
  } catch (error: any) {
    console.error('[docs] volunteer-file error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});
```

**Param validation:** `:uuid` must match full UUID v4 regex; `:file` must match `/^(page-\d{1,2}\.(jpg|jpeg|png)|upload-\d+\.pdf)$/i`. [VERIFIED]
**Base dir:** `{ROOT_DIR}/data/volunteer-files`. [VERIFIED]
**Traversal guard:** `path.resolve(baseDir, uuid, file)` must start with `baseDirWithSep`. [VERIFIED]

### Route 2c: GET /api/docs/intake-audio/:id/:file

```ts
app.get('/api/docs/intake-audio/:id/:file', (req: Request, res: Response) => {
  try {
    const idParam = req.params.id as string;
    const file = req.params.file as string;

    if (!/^\d+$/.test(idParam)) {
      return res.status(400).json({ error: 'Invalid id — must be an integer' });
    }
    if (!/^voice_\d+\.webm$/.test(file)) {
      return res.status(400).json({ error: 'Invalid file name format' });
    }

    const baseDir = path.resolve(ROOT_DIR, 'intake-audio');
    const baseDirWithSep = baseDir + path.sep;
    const resolved = path.resolve(baseDir, idParam, file);
    if (!resolved.startsWith(baseDirWithSep)) {
      return res.status(400).json({ error: 'Bad path' });
    }

    if (!existsSync(resolved)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(resolved);
  } catch (error: any) {
    console.error('[docs] intake-audio error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});
```

**Param validation:** `:id` must match `/^\d+$/`; `:file` must match `/^voice_\d+\.webm$/`. [VERIFIED]
**Base dir:** `{ROOT_DIR}/intake-audio` = `/home/shelter/shelter-apps/intake-audio`. [VERIFIED]
**Traversal guard:** `path.resolve(baseDir, idParam, file)` must start with `baseDirWithSep`. [VERIFIED]

## Actual Filename Patterns Found On Disk

### Volunteer files (`/home/shelter/shelter-apps/data/volunteer-files/`)

Distinct filenames (excluding `.bak-rotate` backups):
```
page-01.jpg    page-02.jpg    page-03.jpg    page-04.jpg
page-1.png     upload-0.pdf
```

The regex `(page-\d{1,2}\.(jpg|jpeg|png)|upload-\d+\.pdf)` covers all of these. [VERIFIED]

### Intake audio (`/home/shelter/shelter-apps/intake-audio/`)

All files follow `voice_{unix_timestamp_ms}.webm`:
```
voice_1774567593525.webm    voice_1776433650857.webm    voice_1776901907299.webm
voice_1777478630579.webm    voice_1777478815596.webm    voice_1777817600148.webm
voice_1777835325111.webm    voice_1777836392349.webm    voice_1777839948443.webm
voice_1777840125486.webm    voice_1777840259663.webm    voice_1778693566569.webm
```

The regex `voice_\d+\.webm` covers all of these. [VERIFIED]

### Adoption PDFs (`/home/shelter/shelter-apps/adoption-pdfs/`)

Completed application PDFs follow `{id}-{Name}-{date}.pdf`:
```
12-Test_Verification-2026-06-30.pdf
13-Pattie_Stalter-2026-06-30.pdf
14-Pattie_Stalter-2026-07-01.pdf
15-corey_smith-2026-07-03.pdf
16-Elizabeth_Leonardi-2026-07-03.pdf
```

Resolved by scanning directory for files starting with `{id}-` (mirrors existing logic). [VERIFIED]

## Confirmation: Nothing Else Touched

- **No static mount changed** — `/adoption-pdfs`, `/data`, `/intake-photos`, `/intake-audio` all untouched. [VERIFIED]
- **No Caddy config changed.** [VERIFIED]
- **No rate-limiter `staticPrefixes` changed.** [VERIFIED]
- **No client/dashboard link changed.** [VERIFIED]
- **No localDatabase.ts changed.** [VERIFIED]

## Build Result

```
> shelter-apps@2.0.0 build
> tsc

Process exited with code 0.
```

tsc exit 0 — clean build. [VERIFIED]

## git diff --stat

```
server/src/server.ts | 126 +++++++++++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 126 insertions(+)
```

Exactly 1 file, purely additive. [VERIFIED]

## Commit

```
[master 6195c91] Tier-1 Phase A: add gated /api/docs/{adoption-pdf,volunteer-file,intake-audio}
  streaming routes with path-traversal validation; gate /api/docs/* in isGatedPath
 1 file changed, 126 insertions(+)
```

Only `src/server.ts` staged and committed. [VERIFIED]
