# Volunteer Source Column — Reconciliation of Prior Claims

**Date:** 2026-06-26 22:05 UTC

---

## 1. The Volunteers List Render

**File:** `dashboard/index.html`
- Table header: line 6229 — `<th onclick="volSortBy('source')">Source</th>`
- Row render: line 14348 — `<td>${(v.submission_source || '').replace('_', ' ')}</td>`
- Sort key: line 14425 — `case 'source': return (v.submission_source || '').toLowerCase();`

The **SOURCE column** displays `volunteers.submission_source`, with underscores replaced by spaces for display (e.g. `bulk_import_2026` → `bulk import 2026`, `legacy-timeclock` → `legacy-timeclock` (hyphens kept)).

Columns rendered: Name (`full_name`), City (`address_city`), Phone (`cell_phone || home_phone`), Source (`submission_source`), Tags (`tags` JSON), Submitted (`submitted_at`), Status (`status`).

## 2. Single Table — No JOIN, No UNION

The list is populated by `volLoadList()` (line 14309) which calls:

```
GET /api/volunteers?status=...&search=...&include_test=...&tags=...
```

The server handler (server.ts:9578) calls `getVolunteers()` (localDatabase.ts:5329), which queries:

```sql
SELECT id, full_name, email, cell_phone, home_phone, address_city, address_state,
  age_18_or_older, status, submission_source, submitted_at, approved_at, approved_by,
  form_version, original_files, notes, training_start_date, ..., tags, created_at, last_modified_at
FROM volunteers
WHERE 1=1
  [AND notes != '__TEST_DATA_PHASE21__']
  [AND status = ?]
  [AND (full_name LIKE ? OR email LIKE ?)]
ORDER BY submitted_at DESC
```

**Single table: `volunteers` only.** No JOIN to `volunteer_timeclock`. No UNION. The `legacy-timeclock` rows visible in the UI are rows in the `volunteers` table with `submission_source = 'legacy-timeclock'` — they are volunteer **profiles** imported from the legacy timeclock, not timeclock shift records.

## 3. Distinct Source Values in `volunteers`

```
submission_source    | count
---------------------|------
bulk_import_2026     | 391
paper_ocr            |  20
legacy-timeclock     |  10
manual_entry         |   8
web_form             |   7
                     ------
TOTAL                | 436
```

All 436 rows live in the single `volunteers` table. The 10 `legacy-timeclock` rows are volunteer profiles whose biographical data was originally derived from legacy timeclock records — they are NOT the 377 shift records in `volunteer_timeclock`.

## 4. Correction of Prior Claims

### Claim 1 (DISPROVEN): "Neither submission_source nor source is surfaced as a visible column in the UI"

**Wrong.** The Volunteers subtab has a visible, sortable **Source** column (header at line 6229, cell at line 14348) that displays `volunteers.submission_source`. Values like `legacy-timeclock`, `bulk import 2026`, `manual entry`, `web form`, and `paper ocr` are all visible to the user.

### Claim 2 (PARTIALLY WRONG): "Each subtab renders from one table only, no interleaving of differently-sourced rows"

The "one table per subtab" part was **correct** — the Volunteers subtab queries only the `volunteers` table, the Timeclock subtab queries only `volunteer_timeclock` (joined to `volunteers` for the name). There is no cross-table JOIN or UNION.

But the conclusion drawn from it was **wrong**. The prior answer said the 391 `bulk_import_2026` and 377 `legacy` figures lived in different tables and were never shown together. In reality:
- **`volunteers` table** (436 rows): contains profiles with `submission_source` values including `bulk_import_2026` (391), `legacy-timeclock` (10), `paper_ocr` (20), `manual_entry` (8), `web_form` (7). These ARE shown together in one list.
- **`volunteer_timeclock` table** (542 rows): contains shift records with `source` values `legacy` (377) and `vclock` (165). These are shown in the Timeclock subtab only.

The 10 `legacy-timeclock` profiles in `volunteers` and the 377 `legacy` shifts in `volunteer_timeclock` are **different data** (profiles vs shift records) that happen to share a "legacy" origin label. The prior answer conflated the 10 `legacy-timeclock` volunteer profiles with the 377 `legacy` timeclock shift records.

## 5. Corrected Subtab Scope

| Subtab | Table(s) | Source column visible? | Mixed sources in one list? |
|--------|----------|----------------------|--------------------------|
| **Volunteers** | `volunteers` only | **Yes** — `submission_source` shown as "Source" column | **Yes** — bulk_import_2026, legacy-timeclock, paper_ocr, manual_entry, web_form all interleaved |
| **Timeclock** | `volunteer_timeclock` JOIN `volunteers` (name only) | No — `source` column not rendered | Both `legacy` and `vclock` shifts shown, but source not displayed |
| **Availability** | `volunteers` only (approved + has form data) | No | Only approved volunteers with availability data |

## Summary

The SOURCE column is a visible, sortable field in the Volunteers subtab, showing `volunteers.submission_source`. All 436 volunteer profiles (from 5 different sources) render in a single interleaved list sorted by submission date. The prior claim that source labels were invisible and that differently-sourced rows were never blended in one view was incorrect.
