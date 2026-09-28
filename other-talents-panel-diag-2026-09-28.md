# Other Talents Panel Diagnosis — 2026-09-28

**Generated:** 2026-09-28 14:10 UTC (read-only diagnosis)

---

## 1. Panel Source + Filter

**Endpoint:** `GET /api/volunteers/with-other-talents`
**File:** `/home/shelter/shelter-apps/server/src/server.ts:10055`

**Query (lines 10058–10066):**
```sql
SELECT id, full_name, submitted_at,
       json_extract(form_data, '$.other_talents') as other_talents
FROM volunteers
WHERE json_extract(form_data, '$.other_talents') IS NOT NULL
  AND json_extract(form_data, '$.other_talents') != ''
  AND status = 'approved'
ORDER BY LOWER(json_extract(form_data, '$.other_talents')) ASC
```

**Filter:** The panel explicitly requires `status = 'approved'`. Any volunteer with status `pending` or `archived` is excluded regardless of whether they have other_talents populated.

---

## 2. Field Name

**Location:** JSON key `$.other_talents` inside the `form_data` TEXT column of the `volunteers` table.

There is no dedicated column — it lives as a top-level key in the `form_data` JSON blob. The panel reads it via `json_extract(form_data, '$.other_talents')`.

**References:**
- Schema comment at `server.ts:9605`: `"other_talents": "<verbatim text or null>"`
- Web form capture at `server.ts:9852–9862`: `other_talents: formData.other_talents`
- Panel query at `server.ts:10060`: `json_extract(form_data, '$.other_talents')`

---

## 3. Mary's Record

| Field | Value |
|-------|-------|
| Row ID | 556 |
| Status | pending |
| Submission source | web_form |
| Other talents populated | **yes** |

The field is present and non-empty in her `form_data`. She is excluded from the panel solely because `status = 'pending'` fails the `AND status = 'approved'` filter.

---

## 4. Capture Path

**Web form handler:** `POST /api/volunteers` at `server.ts:9818`

The handler receives `formData` from `req.body` (line 9820) and persists the entire object via `JSON.stringify(formData)` at line 9925 (`form_data: JSON.stringify(formData)`). The `other_talents` key is a top-level property of `formData` and is stored along with everything else — there is no explicit extraction or dropping.

For Spanish submissions, `other_talents` is explicitly translated at lines 9852/9862/9875–9876 before storage, confirming the field is recognized in the intake path.

**Compared to paper_ocr / manual_entry:** These use the same `POST /api/volunteers` endpoint (line 9818) with a different `submissionSource` value. The storage path is identical — all sources persist the full `formData` blob. The field is populated only if the source (OCR extraction or manual dashboard entry) includes it.

**No capture bug.** The web_form path correctly stores `other_talents`.

---

## 5. Scope Counts

| Status | Source | Populated | Empty | Total |
|--------|--------|-----------|-------|-------|
| approved | bulk_import_2026 | 0 | 384 | 384 |
| approved | legacy-timeclock | 0 | 6 | 6 |
| approved | manual_entry | 0 | 5 | 5 |
| approved | paper_ocr | 8 | 32 | 40 |
| approved | web_form | 14 | 27 | 41 |
| archived | bulk_import_2026 | 0 | 7 | 7 |
| archived | legacy-timeclock | 0 | 4 | 4 |
| archived | manual_entry | 0 | 6 | 6 |
| archived | paper_ocr | 0 | 1 | 1 |
| archived | web_form | 3 | 6 | 9 |
| pending | web_form | 11 | 31 | 42 |

**Key observations:**
- **web_form** submissions have the field populated at a 28/114 rate (24.6%) across all statuses — comparable to paper_ocr (8/41, 19.5%). Not systematically empty.
- **pending** volunteers (all web_form): 11 of 42 have other_talents populated. None of these 11 appear in the panel because of the `status = 'approved'` filter.
- **bulk_import_2026** and **legacy-timeclock** have zero populated — expected, as those sources predate the field.

---

## Verdict: **[VERIFIED: benign status filter, not a capture bug]**

**Evidence:**
1. The panel query at `server.ts:10065` includes `AND status = 'approved'`, which excludes all pending volunteers.
2. Row 556 (Mary, submitted 2026-09-22 via web_form) has `status = 'pending'` and `other_talents` **populated**. She is filtered out by the status clause, not by missing data.
3. Scope counts confirm web_form submissions populate the field at the same rate as other sources — no systematic capture gap.

The panel is working as coded. Whether pending volunteers *should* appear in the panel is a product decision, not a bug.
