# Volunteer Intake Date-Write Paths — Diagnosis

**Date:** 2026-09-24  
**Type:** Read-only diagnosis (no writes, no schema changes)  
**Subject:** Where paper_ocr and manual_entry paths set `submitted_at`, and the best normalization point

---

## 1. INSERT Choke Point

**One shared insert function.** All intake paths — web_form, paper_ocr, and manual_entry — call the same function:

- **`insertVolunteer()`** at `/home/shelter/shelter-apps/server/src/localDatabase.ts:4894`
- Contains the single `INSERT INTO volunteers` at `localDatabase.ts:4919`
- `submitted_at` is passed in as `data.submitted_at` (a plain string parameter, typed `string`, no parsing)

The caller is the `POST /api/volunteers` route handler:

- `/home/shelter/shelter-apps/server/src/server.ts:9879` (route definition)
- `/home/shelter/shelter-apps/server/src/server.ts:9978` — the assignment:
  ```typescript
  submitted_at: p.todays_date || now,
  ```
  where `p = formData.personal`, and `now = new Date().toISOString()` (line 9946)

[VERIFIED] — single INSERT at `localDatabase.ts:4919`, single caller at `server.ts:9967–9978`. All three intake sources flow through this one code path.

---

## 2. Paper_OCR Path

### Date origin
The date comes from **OCR-extracted text** — the AI reads the handwritten "Today's Date" field on the paper form and returns it verbatim.

- OCR system prompt: `server.ts:9580–9640` — instructs the model to extract `"todays_date": "<string or null>"` as a raw string
- No normalization instruction in the prompt — the OCR returns whatever the volunteer wrote (e.g. `5/30/26`, `4.27.26`, `06/13/2026`)

### Flow to INSERT
1. OCR returns JSON with `personal.todays_date` = raw handwritten date string
2. Dashboard receives OCR JSON, populates `input type="date"` (`id="vf-todays_date"`) at `dashboard/index.html:5749`
3. When populating from OCR, the dashboard attempts to parse into YYYY-MM-DD for the date picker (`dashboard/index.html:12914–12932`) — but the initial OCR result goes into `formData.personal.todays_date` as the raw OCR string
4. On save, dashboard sends `formData.personal.todays_date` = value from the `input type="date"` picker (`dashboard/index.html:13052`)
5. Server stores it at `server.ts:9978`: `submitted_at: p.todays_date || now`

### Why some are raw
The `input type="date"` HTML element returns `YYYY-MM-DD` when a valid date is selected. However:
- If the OCR value can't be parsed into the date picker (the parse at lines 12919–12928 fails), the picker is left empty
- If the operator manually types over the date picker value with a slash-format string, `input type="date"` may accept it as raw text on some browsers, or the value may come from an earlier code version that used a text input instead of a date picker
- Early paper_ocr rows (ids 435–449, May–June 2026) predate the date-picker normalization code, which was likely added later

### Stored raw?
**Yes** — no server-side parsing or normalization on the INSERT path. Whatever `p.todays_date` contains is stored verbatim.

---

## 3. Manual_Entry Path

### Date input
Same dashboard form as paper_ocr — the "Date on Form" field:
- `dashboard/index.html:5749`: `<input type="date" id="vf-todays_date">`
- Collected at `dashboard/index.html:13052`: `todays_date: gv('vf-todays_date')`

### Source distinction
The dashboard determines `submissionSource` at `dashboard/index.html:13139`:
```javascript
const submissionSource = volTempId ? 'paper_ocr' : 'manual_entry';
```
(`volTempId` is set when files were uploaded for OCR; absent for manual entry)

### Server-side handling
Identical to paper_ocr — same `POST /api/volunteers` handler, same line `server.ts:9978`.

### Stored raw?
**Yes** — same as paper_ocr. The 3 slash-format manual_entry rows (ids 428–430, all `5/31/26`) were likely entered before the `input type="date"` picker was in place, or via a text input on an older dashboard version.

---

## 4. Web_Form Path (the correct pattern)

The web form (WordPress volunteer application) does **not** include `todays_date` in `formData.personal`. The field is specific to the paper form layout.

At `server.ts:9978`:
```typescript
submitted_at: p.todays_date || now,
```

For web_form: `p.todays_date` is `undefined` → falls through to `now` = `new Date().toISOString()` (full ISO 8601 with time, e.g. `2026-09-24T15:52:45.125Z`).

[VERIFIED] at `server.ts:9946` (`const now = new Date().toISOString()`) and `server.ts:9978`.

---

## 5. Existing Date Helpers

### In the codebase

| Helper | File:Line | What it does |
|--------|-----------|--------------|
| `formatDate()` | `pdfGenerator.ts:22` | Formats ISO string for PDF display via `new Date(isoDate).toLocaleDateString()` — display only, not normalization |
| `formatDateLong()` | `timeReceiptPDF.ts:23` | Formats date for time receipt PDF — display only |
| `formatDateET()` | `timeReceiptPDF.ts:41` | Formats ISO to Eastern Time for receipts — display only |

### Date libraries
```bash
grep -r "dayjs\|date-fns\|moment\|luxon" server/src/ → no results
```
**No date parsing/normalization library is imported.** All date handling uses native `Date` constructor and `.toISOString()`.

### Partial normalization in PATCH path
The PATCH `/api/volunteers/:id` handler at `server.ts:10919–10923` already normalizes `todays_date`:
```typescript
if (p.todays_date) {
  const parsed = new Date(p.todays_date);
  if (!isNaN(parsed.getTime())) {
    updates.submitted_at = p.todays_date.split('T')[0] + 'T12:00:00.000Z';
  }
}
```
This works for ISO-format values (`2026-05-31` → `2026-05-31T12:00:00.000Z`) but `new Date('5/30/26')` would parse to year 1926 in most JS engines (2-digit year < 50 → 19xx). So this PATCH normalization is not reliable for American-format dates either.

---

## 6. Field Shape: Date-Only vs Datetime

### Stored formats currently in use
- web_form: full ISO datetime (`2026-09-24T15:52:45.125Z`)
- bulk_import_2026: mixed date-only (`2023-11-02`) and datetime (`2024-03-07T12:00:00.000Z`)
- legacy-timeclock: space-separated datetime (`2026-05-14 21:47:29`)
- paper_ocr/manual_entry (post-normalization): now date-only (`2026-05-31`)

### Consumers that parse `submitted_at`
| Consumer | File:Line | How it parses | Breaks on date-only? |
|----------|-----------|---------------|---------------------|
| PDF generator | `pdfGenerator.ts:133` | `new Date(submitted_at)` | No — `new Date('2026-05-31')` works (midnight UTC) |
| Dashboard list sort | `dashboard/index.html:13491` | Raw string comparison | No — `YYYY-MM-DD` sorts correctly against `YYYY-MM-DDTHH:...` |
| Dashboard date picker (edit) | `dashboard/index.html:12918` | `sa.split('T')[0]` then regex | No — `'2026-05-31'.split('T')[0]` = `'2026-05-31'`, passes regex |
| PATCH handler | `server.ts:10923` | `p.todays_date.split('T')[0]` | No — same reason |
| Email service | `server.ts:9998` | Passes through as display string | No |

**Date-only (`YYYY-MM-DD`) is safe** — no consumer would break. The existing bulk_import_2026 data already has 200+ date-only rows proving the format works.

---

## 7. Recommendation: Single Best Normalization Point

The single best place to normalize is **`server.ts:9978`** — the INSERT assignment line. This is where all three paths converge before `insertVolunteer()`. 

A normalization function at this point would:
1. Accept `p.todays_date` (which may be `YYYY-MM-DD` from the date picker, `M/DD/YY` from OCR, or `undefined` from web_form)
2. If it matches ISO (`/^\d{4}-\d{2}-\d{2}/`), use it as-is (or take the date part)
3. If it matches American format (`M/DD/YY`, `MM/DD/YYYY`, `M.DD.YY`), parse and convert to `YYYY-MM-DD`
4. Fall through to `now` if unparseable

This catches both paper_ocr (OCR-extracted raw dates) and manual_entry (any non-date-picker input), without touching the working web_form path. The PATCH handler at line 10919–10923 should get the same normalization for consistency.

No external date library is needed — a small `normalizeSubmittedDate(raw: string): string` helper with regex parsing (same logic as the dry-run conversion) would suffice.
