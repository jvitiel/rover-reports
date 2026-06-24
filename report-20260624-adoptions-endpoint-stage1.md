# Adoptions Tab Stage 1 — GET Endpoint Implementation

**Date:** 2026-06-24  
**Commit:** `e06686b` — `server/src/server.ts` only (31 insertions, 1 deletion)

---

## Existing DB Function (reused, not reimplemented)

**localDatabase.ts:2183** — `getAdoptionApplications(status?)`

```ts
export function getAdoptionApplications(status?: string): AdoptionApplication[] {
  // SELECT * FROM adoption_applications [WHERE status = ?] ORDER BY submitted_at DESC
}
```

Returns full `AdoptionApplication` objects (85+ fields), already sorted newest-first.

## Volunteer Pattern Mirrored

**server.ts:9494** — `GET /api/volunteers`

```ts
app.get('/api/volunteers', (_req: Request, res: Response) => {
  try {
    // ... call getVolunteers(), filter, return
    res.json({ success: true, data: volunteers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to list volunteers' });
  }
});
```

Same structure replicated for adoption applications.

---

## New Endpoint

**`GET /api/adoption-applications`** — added at server.ts (after the OPTIONS handler for the POST submission endpoint, before the Volunteer section).

```ts
app.get('/api/adoption-applications', (_req: Request, res: Response) => {
  try {
    const applications = getAdoptionApplications();
    const pdfDir = getPdfDirectory();
    const pdfFiles = readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));

    const data = applications.map(app => {
      const pdfFile = pdfFiles.find(f => f.startsWith(`${app.id}-`));
      return {
        id: app.id,
        submittedAt: app.submitted_at,
        applicantName: app.applicant_name,
        animalNamesInterested: app.animal_names_interested || null,
        animalType: app.animal_type,
        languageSubmitted: app.language_submitted,
        status: app.status,
        pdfUrl: pdfFile ? `/adoption-pdfs/${pdfFile}` : null,
      };
    });

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[Adoption] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to list adoption applications' });
  }
});
```

### Response Shape

```json
{
  "success": true,
  "data": [
    {
      "id": 9,
      "submittedAt": "2026-05-14T20:38:35.359Z",
      "applicantName": "John Vitiello",
      "animalNamesInterested": null,
      "animalType": "cat",
      "languageSubmitted": "en",
      "status": "new",
      "pdfUrl": "/adoption-pdfs/9-John_Vitiello-2026-05-14.pdf"
    }
  ]
}
```

### PDF URL Construction

**Problem:** The PDF filename `{id}-{sanitizedName}-{generationDate}.pdf` uses the generation-time date (not stored in the DB), and `sanitizeFilename()` is private to pdfGenerator.ts.

**Solution:** Instead of reconstructing the filename, the endpoint reads the PDF directory with `readdirSync()` and finds the file matching the application ID prefix (`f.startsWith(\`${app.id}-\`)`). This is robust regardless of name sanitization or date differences.

**Verified:** All 9 existing PDFs are correctly matched by ID prefix.

---

## Changes Made

| File | Change |
|------|--------|
| server.ts:91 | Added `readdirSync` to fs import |
| server.ts:99 | Added `getAdoptionApplications` to localDatabase import |
| server.ts (after line ~9074) | New `GET /api/adoption-applications` endpoint (25 lines) |

## Untouched

- **POST /api/adoption-application** (server.ts:8799–9064) — the live submission handler (form receive → translate → save → PDF → email) — **completely untouched**
- **localDatabase.ts** — no changes; reused existing `getAdoptionApplications()`
- **pdfGenerator.ts** — no changes
- **dashboard/index.html** — no changes (Stage 2)

---

## Build

```
tsc — clean, zero errors
sudo systemctl restart shelter-app — success
```

## Verification

### Endpoint returns 9 applications, newest first

```
Total: 9 applications
First: id=9, 2026-05-14 (newest)
Last:  id=1, 2026-03-15 (oldest)
```

### PDF URLs resolve (3 checked)

| Application | pdfUrl | HTTP Status |
|-------------|--------|-------------|
| id=9 John Vitiello | /adoption-pdfs/9-John_Vitiello-2026-05-14.pdf | **200** ✅ |
| id=5 JV | /adoption-pdfs/5-JV-2026-03-15.pdf | **200** ✅ |
| id=1 Test Applicant | /adoption-pdfs/1-Test_Applicant-2026-03-15.pdf | **200** ✅ |

### POST handler untouched

Git diff shows only: +1 import addition (`readdirSync`), +1 import addition (`getAdoptionApplications`), +25 lines for the new GET endpoint. Zero changes to the POST handler or any other existing code.

---

## Commit

```
e06686b add GET /api/adoption-applications endpoint for dashboard Adoptions tab (reuses getAdoptionApplications, PDF URL via filesystem lookup)
 1 file changed, 31 insertions(+), 1 deletion(-)
 server/src/server.ts
```
