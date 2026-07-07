# Volunteer Scan Upload — Step 1: Server Endpoint

## Endpoint

```
POST /api/volunteers/:id/upload-scan
```

Multer: `volunteerUpload.array('files', 6)` — same instance as the create path (memory storage, 15 MB/file, PDF/JPEG/PNG client-type filter as first pass).

### b-1: W1 Gate

Added to `isGatedWrite()` (server.ts:818–819):
```ts
// POST /api/volunteers/:id/upload-scan
if (method === 'POST' && /^\/api\/volunteers\/\d+\/upload-scan$/.test(p)) return true;
```

Anchored to numeric `:id` + exact `/upload-scan` suffix. Cannot broaden to public siblings. [VERIFIED]

### b-2: Content-Sniff

After multer accepts the upload, each file buffer is written to a temp file and sniffed via `file --mime-type -b`. Only these detected types are allowed:

| Sniffed MIME | Extension |
|-------------|-----------|
| `image/jpeg` | `.jpg` |
| `image/png` | `.png` |
| `application/pdf` | `.pdf` |

Any other detected type → 400 with specific error naming the file and detected type. Client Content-Type and filename extension are **ignored** for the allow decision. Extension is mapped from the sniffed type. [VERIFIED]

### b-4: :id Resolution

1. Parse `:id` as integer; NaN → 400
2. `getVolunteerById(id)` — unknown → 404 (no directory created, no file written)
3. UUID derived from existing `original_files[0]` path if present, else `randomUUID()`
4. FS path built from server-side UUID, never from `:id`

[VERIFIED]

### b-5: Server-Generated Filenames

- Scans existing dir for `page-\d{2}\.(jpg|png)` files, finds max NN
- Each new file gets `page-{max+1}.{sniffed-ext}`
- Client filename completely ignored (used only in rejection error message)
- PDFs: saved as temp, converted via `pdftoppm -png -r 300`, renamed to `page-NN.png`

[VERIFIED]

### b-3: Concurrency

The read-allocate-write-append sequence runs inside a SQLite `db.transaction()` (IMMEDIATE mode by default in better-sqlite3), serializing concurrent requests:

```
BEGIN IMMEDIATE
→ SELECT original_files WHERE id = ?
→ scan dir for max page-NN
→ write files to disk
→ chown
→ UPDATE volunteers SET original_files = ? WHERE id = ?
COMMIT
```

Two simultaneous uploads to the same volunteer serialize on the transaction lock. Neither can read stale `original_files` or allocate a colliding page-NN. [VERIFIED — P4 proof]

### b-7: No-Existing-Dir Branch

When `original_files` is empty/null:
- New UUID generated via `randomUUID()`
- `mkdirSync(fileDir, { recursive: true })`
- `execSync('chown -R shelter:shelter ...')`
- Result: `drwxr-sr-x shelter:shelter` — identical to create-path dirs

[VERIFIED — P5 proof]

### No OCR

The handler stores files and updates `original_files` only. No Anthropic API call, no OCR prompt, no `extractedData` processing. [VERIFIED]

### Response

```json
{ "success": true, "fileUrls": ["...full updated list..."] }
```

Returns the complete `original_files` array (existing + new) so Step 2's client can re-render thumbnails.

## Build-Time Proofs

### P1 — Gate Rejection (b-1)

```
curl -X POST /api/volunteers/465/upload-scan (no token)
→ {"error":"gate"} HTTP 401

curl -X POST /api/volunteers/465/upload-scan -H "X-Gate-Token: wrong"
→ {"error":"gate"} HTTP 401
```

Route confirmed in `isGatedWrite()` at server.ts:818–819. [VERIFIED]

### P2 — Content-Sniff Rejection (b-2)

```
SVG bytes (Content-Type: image/png, filename: innocent.png)
→ {"error":"File \"innocent.png\" rejected: detected type image/svg+xml is not allowed..."} HTTP 400

HTML bytes (Content-Type: image/jpeg, filename: evil.jpg)
→ {"error":"File \"evil.jpg\" rejected: detected type text/html is not allowed..."} HTTP 400

Real PNG bytes
→ {"success":true,"fileUrls":["...page-01.png"]} HTTP 200
```

Disguised bytes rejected by magic-number sniff, not client Content-Type. Real PNG accepted. [VERIFIED]

### P3 — Traversal (b-5)

```
Client filename: "../../evil.png.svg" with real PNG bytes
→ {"success":true,"fileUrls":["...f6990528.../page-02.png"]} HTTP 200

Disk: page-02.png in correct UUID dir. Nothing escaped.
Parent dir listing: only UUID-named dirs present.
```

Client filename completely ignored; server-generated `page-02.png` in the correct UUID directory. [VERIFIED]

### P4 — Concurrency (b-3)

Two near-simultaneous uploads (parallel curl) to volunteer 465:

```
Response 1: fileUrls = [page-01, page-02, page-03]  (3 files after adding 1)
Response 2: fileUrls = [page-01, page-02, page-03, page-04]  (4 files after adding 1)

DB final: 4 files, all unique page-NNs, no collisions
Disk: 4 files (page-01 through page-04), all present
```

No lost `original_files` entry, no page-NN overwrite. Transaction serialization held. [VERIFIED]

### P5 — No-Existing-Dir Branch (b-7)

Volunteer 466 (empty `original_files`) → upload created new UUID dir:

```
New dir:     drwxr-sr-x  2 shelter shelter 4096  .
Create-path: drwxr-sr-x  2 shelter shelter 4096  .
Files:       -rw-r--r--  1 shelter shelter   67  page-01.png
```

Perms and ownership identical to create-path directories. [VERIFIED]

### Cleanup

- Test volunteers 465 + 466: archived (soft-deleted)
- Test scan directories: `sudo -u shelter rm -rf` — confirmed gone
- No test artifacts remain on disk or in active volunteer list

[VERIFIED]

## Status

- **tsc:** exit 0, zero errors [VERIFIED]
- **Service:** active (running) [VERIFIED]
- **Applied but UNCOMMITTED** — pending proof review
- No client/UI code touched (Step 2)
- No changes to: serve route, rotate handler, create path, PATCH, schema, Caddy
