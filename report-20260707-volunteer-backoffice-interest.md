# Volunteer Back-Office Interest Query

## PART 1 — Field Identification + New-vs-Old Signal

### The Column

The area-of-interest checkboxes are stored in `form_data` (JSON TEXT column) under `$.jobs`. Each checkbox is a key like `other_back_office`, `other_front_office`, `other_it_tech`, etc. Values are `true` (checked) or absent/`false` (unchecked). [VERIFIED — sampled across web_form, paper_ocr, and bulk_import_2026 rows]

There is also an `approved_other_back_office` BOOLEAN column, but this is an admin-set approval flag (currently 0 for every row in the table), NOT the applicant's checkbox. The applicant's expressed interest is `json_extract(form_data, '$.jobs.other_back_office') = 1`. [VERIFIED — `SUM(approved_other_back_office)` = 0 across all submission sources]

### The Distinguishing Signal: `submission_source`

| submission_source | Count | Has back_office=true | Pattern |
|---|---|---|---|
| bulk_import_2026 | 391 | 218 | **ALL 218 have every single other_\* flag set to true** (all 10 of 10). Not one bulk-import row has back_office=true with any other_\* flag false. This is a blanket mapping artifact, not individual checkbox selections. [VERIFIED — query confirmed 0 exceptions] |
| paper_ocr | 30 | 3 | Selective checkboxes (mixed true/false/absent), except 1 row (Idan Meoded) with all flags — could be genuine or OCR artifact |
| web_form | 9 | 2 | Selective checkboxes — genuine new-form submissions [VERIFIED] |
| manual_entry | 8 | 0 | — |
| legacy-timeclock | 10 | 0 | — |

The `submission_source` column is the reliable distinguishing signal. `bulk_import_2026` with `form_version='legacy'` is the old-system import. All other sources (web_form, paper_ocr, manual_entry) represent individual new-form submissions. [VERIFIED]

### The Predicate

```sql
WHERE submission_source != 'bulk_import_2026'
  AND json_extract(form_data, '$.jobs.other_back_office') = 1
```

This returns only people who individually checked back-office interest on a new-form submission (web or scanned paper), excluding the 218 bulk-imported rows where every other_\* flag was blanket-set to true.

---

## PART 2 — The List

### New-form volunteers who explicitly checked back-office interest (5 matches)

| # | Name | Application Date | Source | Note |
|---|---|---|---|---|
| 1 | John Vitiello | 2026-05-14 | web_form | Selective: back_office, it_tech, photography_social, greeter, cat_socialize |
| 2 | Inam Haq | 2026-05-31 | paper_ocr | Selective: back_office, front_office, greeter, dog/cat/small socialize |
| 3 | Kayla McGregor | 2026-06-09 | paper_ocr | Selective: back_office + 11 other specific interests (not all-flags) |
| 4 | Idan Meoded | 2026-06-13 | paper_ocr | ⚠️ ALL other_\* flags true — same pattern as bulk imports. Could be genuine (checked every box on paper form) or OCR over-extraction. Flagged for human review. |
| 5 | Test Applicant | 2026-06-30 | web_form | Selective: back_office, it_tech, photography_social, cat_socialize. Likely a test row. |

**Count: 5** (including 1 flagged all-flags paper_ocr and 1 likely test row)

### Excluded: old-system bulk-import rows

**Count: 218** — all `bulk_import_2026` rows where `other_back_office=1`. Every one of these had all 10 other_\* flags blanket-set to true. These are the old-system-mapped entries being filtered out.
