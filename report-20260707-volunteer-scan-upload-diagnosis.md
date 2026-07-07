# Volunteer Scan Upload — Diagnosis for "Upload New Image" Feature

## 1. New-Volunteer Upload Path (Working Reference)

### Endpoint

```
POST /api/volunteers/upload
```

- **Multer config:** `volunteerUpload.array('files', 6)` — up to 6 files per request, memory storage (buffer) [VERIFIED — server.ts:9636–9644]
- **File filter:** `application/pdf`, `image/jpeg`, `image/png` only [VERIFIED — server.ts:9641]
- **Size limit:** 15 MB per file [VERIFIED — server.ts:9639]

### W1 Gate Status

**Yes — gated.** Listed in `isGatedWrite()` as W1b volunteer PII write [VERIFIED — server.ts:815]:
```ts
if (method === 'POST' && /^\/api\/volunteers\/upload$/.test(p)) return true;
```

Client calls this via `gatedFetch()` which attaches the `X-Gate-Token` header. [VERIFIED]

### Storage Model

Files are stored on **disk** under a UUID-named directory:
```
/home/shelter/shelter-apps/data/volunteer-files/{uuid}/
```

Each upload creates a **new UUID** (`randomUUID()`), creates the directory, and saves files as:
- PDFs: saved as `upload-{i}.pdf`, then converted to `page-{NN}.png` via `pdftoppm -png -r 300`
- JPG/PNG: saved as `page-{NN}.{ext}`, resized to max 2000×2000px @ quality 85 via ImageMagick

The UUID + file list is returned to the client as `tempId` + `fileUrls[]`. [VERIFIED — server.ts:9655–9700]

### Association to Volunteer

The `volunteers` table has an `original_files` TEXT column containing a **JSON array of file path strings**:
```json
["/data/volunteer-files/{uuid}/page-01.png", "/data/volunteer-files/{uuid}/page-02.png"]
```

When `POST /api/volunteers` saves the new record, it reads the directory contents from `tempId` and serializes the path list into `original_files`:
```ts
const fileDir = path.join(ROOT_DIR, 'data', 'volunteer-files', tempId);
fileUrls = readdirSync(fileDir)
  .filter(f => f.match(/\.(png|jpg|jpeg|pdf)$/i))
  .sort()
  .map(f => `/data/volunteer-files/${tempId}/${f}`);
// ...
original_files: JSON.stringify(fileUrls),
```
[VERIFIED — server.ts:9889–9898]

### OCR Trigger

OCR is triggered **inside the upload endpoint** — after saving files to disk, the handler:
1. Reads each page image as base64
2. Builds an Anthropic API request (claude-sonnet-4-6, vision)
3. Extracts form data JSON via `VOLUNTEER_OCR_SYSTEM_PROMPT`
4. Returns extracted data + fileUrls in the response

OCR is **automatic and inseparable** from the current upload endpoint. A new "add scan to existing" endpoint must NOT call the OCR pipeline — it should only store files and update `original_files`. [VERIFIED — server.ts:9715–9800]

## 2. Original Scans — Storage + Display

### Data Model

- **Table:** `volunteers`
- **Column:** `original_files` TEXT (JSON array of path strings)
- **Disk:** `/home/shelter/shelter-apps/data/volunteer-files/{uuid}/page-{NN}.(png|jpg)` [VERIFIED]

A single UUID directory per volunteer. All scan pages for one volunteer live under one UUID. There is no separate "scans" or "files" table. [VERIFIED]

### Serving Route (Read Path)

```
GET /api/docs/volunteer-file/:uuid/:file
```

- **PII-gated:** Yes — `isGatedPath()` covers all `p.startsWith('/api/docs/')` [VERIFIED — server.ts:798]
- **UUID validation:** Strict UUID v4 regex [VERIFIED — server.ts:9203]
- **Filename validation:** Must match `page-\d{1,2}\.(jpg|jpeg|png)` or `upload-\d+\.pdf` [VERIFIED — server.ts:9207]
- **Path-traversal guard:** `path.resolve()` + `startsWith(baseDir + sep)` [VERIFIED — server.ts:9210–9213]
- **Content-Type:** Set by extension mapping [VERIFIED]

Client accesses files via `volToGatedUrl()` which transforms `/data/volunteer-files/{uuid}/{file}` → `/api/docs/volunteer-file/{uuid}/{file}`, then fetches via `gatedBlobUrl()` (attaches `X-Gate-Token`, creates object URL). [VERIFIED — dashboard/index.html:13548–13553]

**New files will be served automatically** if they follow the existing naming convention (`page-{NN}.{ext}`) and the `original_files` JSON array is updated to include them. No change needed to the serving route. [VERIFIED]

### Original Scans Subtab — DOM + Rendering

**Location:** The Original Scans section is in the **sidebar** of the volunteer edit view (not the main form area):

```html
<!-- Sidebar -->
<div class="vol-edit-sidebar">
  <div class="vol-sidebar-section">
    <h4>Original Scans</h4>
    <div id="volScanThumbs" class="vol-scan-thumbs"></div>
  </div>
  <div class="vol-sidebar-section">
    <h4>Staff Notes</h4>
    ...
```
[VERIFIED — dashboard/index.html:5808–5815]

**Rendering:** On record load (`volOpenRecord()`), `volFileUrls` is populated from `vol.original_files` (JSON parse). Then `volScanThumbs` is populated with thumbnail images:

```js
volFileUrls = vol.original_files ? JSON.parse(vol.original_files) : [];
// ...
thumbsEl.innerHTML = '';
volFileUrls.forEach((url, i) => {
  const gatedUrl = volToGatedUrl(cleanUrl);
  thumbsEl.innerHTML += `<div class="vol-scan-thumb-wrap">
    <img class="vol-scan-thumb" id="${thumbId}" ...>
    <button class="vol-rotate-btn" ...>↻</button>
  </div>`;
  gatedBlobUrl(gatedUrl).then(b => { ... });
});
```
[VERIFIED — dashboard/index.html:12972–12985, 13498]

Each thumbnail has a click-to-lightbox (`volOpenGatedScan`) and a rotate button (`volRotateImage`).

### Cancel Button Location

The Cancel button (`vol-btn-cancel`, `volConfirmLeave()`) is in the **main form's action row** at line 5803, NOT in the sidebar:

```html
<div class="vol-actions-btn-row">
  <button class="vol-btn-primary" id="volApproveBtn">Approve</button>
  <button class="vol-btn-secondary" onclick="volSaveDraft()">Save Edits</button>
  <button class="vol-btn-secondary" onclick="volCloseRecord()">Close</button>
  <button class="vol-btn-danger" id="volArchiveBtn">Archive</button>
  <button class="vol-btn-cancel" onclick="volConfirmLeave()">Cancel</button>
</div>
```
[VERIFIED — dashboard/index.html:5798–5804]

**The "Upload New Image" button should go BELOW the `#volScanThumbs` div** in the sidebar section (after the thumbnails, before the Staff Notes section), not next to the Cancel button in the main form area. The prompt says "to the RIGHT of the Cancel button" but the Cancel button is in the main form action row, separate from the sidebar. [VERIFIED — the sidebar and action row are in different DOM containers]

**Clarification needed:** John may mean a different Cancel button, or may want the Upload button in the sidebar below the scan thumbnails. The natural placement is in the sidebar, under `#volScanThumbs`.

## 3. The Gap

**There is NO current path to add files to an existing volunteer's Original Scans.**

- `POST /api/volunteers/upload` creates a NEW UUID directory and runs OCR. It is designed for the new-volunteer creation flow only — the response includes extracted form data, and the UUID becomes the volunteer's `tempId`. [VERIFIED]
- `PATCH /api/volunteers/:id` updates form data, status, notes, etc. It does NOT accept file uploads (no multer middleware on this route) and does NOT modify `original_files`. [VERIFIED — server.ts:10651–10735, no multipart handling]
- The only way `original_files` is set is during `POST /api/volunteers` (creation), and it is never updated afterward. [VERIFIED]

**What's missing:**
1. A server endpoint that accepts file uploads for an existing volunteer, stores them in the volunteer's existing UUID directory (or creates one if none exists), and updates the `original_files` JSON array — WITHOUT triggering OCR.
2. Client-side UI: an "Upload New Image" button that opens a file picker, posts to the new endpoint, and re-renders the scan thumbnails with the added files.

## 4. Security Requirements

### W1 Gate

The new endpoint is a **PII-document write** (adding scanned documents to a volunteer record). It **must** be added to the `isGatedWrite()` allow-list to match posture. [VERIFIED — all existing volunteer write endpoints are listed in isGatedWrite, server.ts:814–831]

Suggested pattern:
```ts
// POST /api/volunteers/:id/upload-scan
if (method === 'POST' && /^\/api\/volunteers\/\d+\/upload-scan$/.test(p)) return true;
```

### File Serving — Automatic

Newly added files will be served automatically by the existing `GET /api/docs/volunteer-file/:uuid/:file` route, as long as:
- Files are stored in the volunteer's existing UUID directory
- Filenames match the `page-\d{1,2}\.(jpg|jpeg|png)` pattern
- The `original_files` JSON array is updated to include the new paths

No changes needed to the read/serve path. [VERIFIED]

### File-Type/Size Validation (Mirror These)

| Check | Current implementation | Reference |
|-------|-----------------------|-----------|
| MIME filter | `['application/pdf', 'image/jpeg', 'image/png']` | server.ts:9641 |
| Size limit | 15 MB per file | server.ts:9639 |
| Max files | 6 per request | server.ts:9646 |
| Filename | Generated server-side: `page-{NN}.{ext}` | server.ts:9693 |
| Path traversal | `path.resolve()` + `startsWith(baseDir + sep)` | server.ts:9210–9213 |
| UUID validation | Strict v4 regex | server.ts:9203 |
| Ownership | `chown -R shelter:shelter` after write | server.ts:9708 |

The new endpoint should:
- Use the same multer config (`volunteerUpload`) or equivalent
- Generate filenames server-side (continue the `page-{NN}` numbering from existing files)
- NOT accept user-supplied filenames (prevents path traversal)
- Validate the volunteer ID exists before writing
- Update `original_files` in the DB atomically (read current array → append → write)

### OCR Bypass

The new endpoint must NOT trigger OCR. The existing upload endpoint's OCR call is embedded in the handler body, not a middleware — so a new endpoint simply omits the Anthropic API call. [VERIFIED]
