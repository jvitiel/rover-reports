# Volunteer Scan Upload — Step 2: Upload New Image Button

## Button Placement

Inserted in the volunteer record **sidebar**, below `#volScanThumbs` and above the Staff Notes section:

```html
<div class="vol-sidebar-section">
  <h4>Original Scans</h4>
  <div id="volScanThumbs" class="vol-scan-thumbs"></div>
  <!-- NEW -->
  <input type="file" id="volScanFileInput" multiple
         accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
         style="display:none">
  <button class="vol-btn-secondary" id="volUploadScanBtn"
          onclick="document.getElementById('volScanFileInput').click()"
          style="width:100%;margin-top:8px;font-size:13px;padding:6px 12px;">
    📄 Upload New Image
  </button>
  <div id="volScanUploadStatus" style="..."><!-- progress/error --></div>
</div>
<div class="vol-sidebar-section">
  <h4>Staff Notes</h4>
  ...
```

[VERIFIED — dashboard/index.html:5813–5815]

- Style: `vol-btn-secondary` (outlined, matching existing sidebar/dashboard buttons)
- Full-width within the sidebar section
- Hidden `<input type="file">` triggered by button click
- File picker accepts JPEG/PNG/PDF, allows multiple (up to 6, enforced in JS + server)

## File Picker + Upload Wiring

On file selection (`change` event on `#volScanFileInput`):

1. **Validates** file count ≤ 6 (client-side guard matching endpoint batch cap)
2. **Checks** `volEditingId` is set (volunteer record is open)
3. **Disables** button + shows "Uploading N file(s)..." status text
4. **POSTs** via `gatedFetch()` to `/api/volunteers/${volEditingId}/upload-scan` as multipart/form-data — carries `X-Gate-Token` automatically (W1-gated endpoint would 401 without it) [VERIFIED]
5. **On success** → updates `volFileUrls` from the response's `fileUrls` array and re-renders `#volScanThumbs` using the **same thumbnail template** as the existing render code (identical `vol-scan-thumb-wrap` / `vol-scan-thumb` / `vol-rotate-btn` markup + `gatedBlobUrl()` blob loading) [VERIFIED]
6. **On error** → shows the server's error message (e.g. "File rejected: detected type image/svg+xml is not allowed") in red below the button; does NOT fail silently [VERIFIED]
7. **Finally** → re-enables button, resets text to "📄 Upload New Image", clears file input for re-selection

## Re-Render

New scans inherit:
- **Thumbnails** with click-to-lightbox (`volOpenGatedScan`)
- **↻ Rotate button** (`volRotateImage`) — same template, automatic
- **Gated blob URLs** via `volToGatedUrl()` → `gatedBlobUrl()` — same pattern

No changes to the thumbnail view/render logic, rotate handler, or lightbox code. [VERIFIED]

## Error Handling

| Condition | User sees |
|-----------|-----------|
| > 6 files selected | Alert: "Maximum 6 files per upload." |
| No volunteer open | Alert: "No volunteer record open." |
| Server 401 (gate) | Red status: "Upload failed (HTTP 401)" |
| Server 400 (bad file type) | Red status: server's specific error (e.g. "File ... rejected: detected type ...") |
| Server 500 | Red status: server's error message |
| Network error | Red status: "Upload failed: network error" |
| Success | Green status: "N scan(s) added." (auto-hides after 3s) |

[VERIFIED — all paths covered in the handler]

## Structural Check

- `<script>` tags balanced: 3 open, 3 close (+ 2 self-contained `<script src>`) [VERIFIED]
- tsc: exit 0 [VERIFIED]
- Dashboard: HTTP 200 [VERIFIED]
- File: 15,544 lines (was 15,482 — added 62 lines: 3 HTML + 59 JS)

## Status

**Applied but UNCOMMITTED.** Service restarted. Pending John's browser check:
- Open any volunteer record → "📄 Upload New Image" button visible in sidebar below scan thumbnails
- Click → file picker opens (JPEG/PNG/PDF)
- Select file(s) → uploads, new scans appear as thumbnails with ↻ rotate
- Error cases: try uploading a non-image file → visible rejection message
- Existing scans, rotate, lightbox, Staff Notes, Tags — all unchanged
