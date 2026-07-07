# Create-Path Content-Sniff Fix — Residual B Closeout

## Change

Ported the proven content-sniff from `POST /api/volunteers/:id/upload-scan` (0f4602b) into `POST /api/volunteers/upload` (the new-volunteer create upload).

### Insertion point

After multer receives files and before any disk write (UUID dir creation, file save) and before OCR. The sniff runs as a complete per-file pass before any storage or processing begins.

### Implementation (identical to new endpoint)

```ts
const SNIFF_ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};
for (const f of files) {
  const tmpPath = path.join('/tmp', `vol-sniff-${randomUUID()}`);
  writeFileSync(tmpPath, f.buffer);
  let sniffed: string;
  try {
    sniffed = execSync(`file --mime-type -b "${tmpPath}"`, { timeout: 5000 }).toString().trim();
  } finally {
    try { unlinkSync(tmpPath); } catch (_) {}
  }
  if (!SNIFF_ALLOWED[sniffed]) {
    res.status(400).json({ success: false, error: `File "${f.originalname}" rejected: detected type ${sniffed}...` });
    return;
  }
  sniffedMimes.push(sniffed);
}
```

### Downstream changes

- PDF branch now keys on `fileSniffedMime === 'application/pdf'` (was `file.mimetype === 'application/pdf'`)
- Extension mapping: `fileSniffedMime === 'image/png' ? 'png' : 'jpg'` (was `file.mimetype`)
- OCR `mediaType` field: uses `fileSniffedMime` (was `file.mimetype`)

### What was NOT changed

- Routing, gating, multer config, batch/size limits, OCR behavior, storage location/naming, schema — all unchanged
- Multer's `fileFilter` retained as harmless first-pass reject (e.g. `text/plain` header rejected immediately)

## Batch Semantics: WHOLE-BATCH-REJECT

If ANY file in the batch fails the byte-sniff, the entire request is rejected before any disk write. No UUID dir is created, no file is stored, no OCR runs.

Rationale: simpler, safer — no partial state to clean up. The sniff loop runs per-file (not file[0]-only) and short-circuits on the first disguised file.

## Proofs

### P-single — Disguised bytes rejected, real files accepted

| Input | Content-Type sent | Sniffed type | Result |
|-------|------------------|-------------|--------|
| SVG bytes | image/png | image/svg+xml | **REJECTED** 400 |
| HTML bytes | image/jpeg | text/html | **REJECTED** 400 |
| Real PNG | image/png | image/png | Accepted (OCR failed on 1x1 pixel — expected) |
| Real JPEG | image/jpeg | image/jpeg | Accepted (OCR failed on 1x1 pixel — expected) |
| Real PDF | application/pdf | application/pdf | **Accepted** — full flow: stored + OCR ran |

[VERIFIED — curl output]

### P-batch — Mixed batch, disguised file SECOND

```
Request: [real PNG (file 1), SVG-as-image/png (file 2)]
Response: {"error":"File \"disguised.png\" rejected: detected type image/svg+xml..."}  HTTP 400
UUID dirs before: 39
UUID dirs after:  39 (no new dir created)
```

Whole-batch-reject: the disguised SVG (file 2, not file 1) was caught by per-file sniffing. Neither file was stored. No UUID dir was created. [VERIFIED]

### P-no-artifact — No temp/work artifacts from rejected upload

```
/tmp/vol-sniff-*  → No such file or directory
/tmp/scan-sniff-* → No such file or directory
UUID dir count:   39 (unchanged)
```

The sniff's temp files are cleaned in the `finally` block. No stray artifacts remain from rejected uploads. [VERIFIED]

### P-ext-from-sniff — Extension mapped from sniffed type, not client filename

```
Input: real PDF bytes, filename=evil.png, Content-Type=application/pdf
Result: success=true, stored as page-1.png (PDF→pdftoppm→PNG page)
Disk: upload-0.pdf + page-1.png in UUID dir
```

The file entered the PDF branch because `fileSniffedMime === 'application/pdf'` (not because of the `.png` filename). Client filename `evil.png` was ignored. [VERIFIED]

### P-legit — Normal new-volunteer upload, full end-to-end

```
Input: real volunteer form JPEG scan (page-01.jpg from existing volunteer)
Sniff: image/jpeg → accepted
Storage: page-01.jpg in new UUID dir
OCR: extracted "MARTHA PATTERSON", address, phone, emergency contact
Duplicate detection: found existing volunteer #459 "MARTHA PATTERSON" (status: approved)
Full response: success=true with extractedData, fileUrls, ocrTokens, duplicateWarning
```

The complete new-volunteer flow is intact: sniff → store → resize → OCR → extract → duplicate check → response. [VERIFIED]

### Cleanup

All test artifacts removed:
- 3 UUID dirs from P-single/P-ext/P-legit: `sudo -u shelter rm -rf` — confirmed gone
- P-batch: no dir was ever created (whole-batch-reject)
- Zero temp files in /tmp

[VERIFIED]

## Status

- **tsc:** exit 0, zero errors [VERIFIED]
- **Service:** active (running) [VERIFIED]
- **Applied but UNCOMMITTED** — pending proof review + John's check
- **Residual B: CLOSED** — both upload paths now content-sniff actual file bytes
