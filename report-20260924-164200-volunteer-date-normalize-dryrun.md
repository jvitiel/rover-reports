# Volunteer submitted_at ISO Normalization — Dry-Run

**Date:** 2026-09-24  
**Type:** Read-only dry-run (SELECT only, no writes)  
**Subject:** Proposed old→new conversion for non-ISO `submitted_at` values

---

## 1. Non-ISO Row Count

**17 rows** have `submitted_at` values that do not start with `YYYY-MM-DD`.

Query used:
```sql
SELECT id, submission_source, submitted_at
FROM volunteers
WHERE submitted_at NOT LIKE '____-__-__%'
ORDER BY id;
```

Sources: 3× `manual_entry`, 14× `paper_ocr`.

---

## 2. Conversion Table [VERIFIED]

Verified via the SELECT above. Each raw value was split on `/` or `.` as `[month, day, year]`. Two-digit years → `20YY`. Four-digit years kept as-is. Month and day zero-padded to 2 digits.

| id  | source       | old value     | proposed new value |
|-----|-------------|---------------|--------------------|
| 428 | manual_entry | `5/31/26`     | `2026-05-31`       |
| 429 | manual_entry | `5/31/26`     | `2026-05-31`       |
| 430 | manual_entry | `5/31/26`     | `2026-05-31`       |
| 435 | paper_ocr    | `5/31/2026`   | `2026-05-31`       |
| 436 | paper_ocr    | `5/30/26`     | `2026-05-30`       |
| 437 | paper_ocr    | `05/30/26`    | `2026-05-30`       |
| 438 | paper_ocr    | `4.27.26`     | `2026-04-27`       |
| 439 | paper_ocr    | `5/28/26`     | `2026-05-28`       |
| 441 | paper_ocr    | `5/24/26`     | `2026-05-24`       |
| 442 | paper_ocr    | `05/31/2026`  | `2026-05-31`       |
| 443 | paper_ocr    | `06/13/26`    | `2026-06-13`       |
| 444 | paper_ocr    | `06/13/2026`  | `2026-06-13`       |
| 445 | paper_ocr    | `05/11/26`    | `2026-05-11`       |
| 446 | paper_ocr    | `6/1/26`      | `2026-06-01`       |
| 447 | paper_ocr    | `6/8/26`      | `2026-06-08`       |
| 448 | paper_ocr    | `5/26/26`     | `2026-05-26`       |
| 449 | paper_ocr    | `5/31/26`     | `2026-05-31`       |

---

## 3. Rows Needing Manual Review

**None.** All 17 values cleanly split into 3 numeric parts interpretable as `[month, day, 2-digit-or-4-digit-year]`.

Format variants encountered:
- `M/DD/YY` — e.g. `5/31/26` (9 rows)
- `MM/DD/YY` — e.g. `05/30/26` (3 rows)
- `M/DD/YYYY` — e.g. `5/31/2026` (1 row)
- `MM/DD/YYYY` — e.g. `06/13/2026` (2 rows)
- `M/D/YY` — e.g. `6/1/26`, `6/8/26` (2 rows)
- `M.DD.YY` — e.g. `4.27.26` (1 row, dot-separated)

---

## 4. Sanity Check

All 17 proposed ISO dates pass `datetime.date.fromisoformat()` validation:
- No month > 12 ✓
- No day > 31 ✓
- No invalid calendar date (e.g. Feb 30) ✓
- All years resolve to 2026 ✓

Date range of proposed values: `2026-04-27` through `2026-06-13` — plausible for paper/manual submissions entered May–June 2026.

---

## Note: Not in scope (already ISO)

Row id 310 (`bulk_import_2026`, value `1900-01-03`) is already ISO-formatted and was flagged in the prior diagnosis as a placeholder. It is not included in this conversion because it matches `YYYY-MM-DD` pattern. Its correctness is a separate data-quality question.
