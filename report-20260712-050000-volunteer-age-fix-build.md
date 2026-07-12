# Volunteer Age Fix (Design A) — Build Report

**Date:** 2026-07-12  
**Commit:** 8faf49f  
**Files:** server/src/server.ts, server/src/localDatabase.ts, dashboard/index.html  
**Backup:** shelter.db.pre-volunteer-age-fix-backup (38M, taken before build)

---

## 1. Schema Proof [VERIFIED]

```
ALTER TABLE volunteers ADD COLUMN age_under_18 INTEGER
```

Added with scoped catch (duplicate-column only, not swallow-all):
```typescript
try { db.exec(`ALTER TABLE volunteers ADD COLUMN age_under_18 INTEGER`); }
catch (e) { if (!/duplicate column/i.test(String(e))) throw e; }
```

**PRAGMA table_info verification:**
```
7|age_18_or_older|BOOLEAN|0||0
43|age_under_18|INTEGER|0||0
```

- Column exists: INTEGER, nullable ✓
- Row count pre/post: 455 (unchanged) ✓
- All existing rows: age_under_18 IS NULL (0 non-null before backfill) ✓

---

## 2. R1 Proof — POST Intake (4 Cases) [VERIFIED]

All test rows created via `POST /api/volunteers`, verified by `SELECT` on stored columns, then deleted.

### Case 1: OCR/paper boolean true

| Field | Value |
|-------|-------|
| **Model** | POST /api/volunteers intake normalize |
| **Endpoint** | POST /api/volunteers |
| **Sample** | `{ submissionSource: "paper_ocr", formData.personal: { full_name: "__TEST_R1_CASE1__", age_18_or_older: true, age_under_18: null } }` |
| **Able-to-fail** | age_18_or_older would be NULL if boolean true wasn't recognized |
| **Proves** | OCR boolean true → column value 1, age_under_18 NULL |
| **Does NOT prove** | Web form string path, boolean false branch |

**SELECT result:** `id=472, age_18_or_older=1, age_under_18=NULL` ✓

### Case 2: OCR/paper boolean false + age string (ABLE-TO-FAIL)

| Field | Value |
|-------|-------|
| **Model** | POST /api/volunteers intake normalize |
| **Endpoint** | POST /api/volunteers |
| **Sample** | `{ submissionSource: "paper_ocr", formData.personal: { full_name: "__TEST_R1_CASE2__", age_18_or_older: false, age_under_18: "15" } }` |
| **Able-to-fail** | If boolean false falls through to null (the original bug pattern), age_18_or_older would be NULL instead of 0 |
| **Proves** | `rawAge18 === false` correctly maps to `false` → stored as 0; age string "15" → integer 15 |
| **Does NOT prove** | Web form string path |

**SELECT result:** `id=473, age_18_or_older=0, age_under_18=15` ✓

### Case 3: Web form string "yes"

| Field | Value |
|-------|-------|
| **Model** | POST /api/volunteers intake normalize |
| **Endpoint** | POST /api/volunteers |
| **Sample** | `{ submissionSource: "web_form", formData.personal: { full_name: "__TEST_R1_CASE3__", is_18_or_older: "yes", age_if_under_18: "" } }` |
| **Able-to-fail** | If `p.is_18_or_older` isn't read (old bug: only read `p.age_18_or_older`), column stays NULL |
| **Proves** | Web form field name `is_18_or_older` with string "yes" → column value 1; empty string age → NULL |
| **Does NOT prove** | OCR boolean path, "no" path |

**SELECT result:** `id=474, age_18_or_older=1, age_under_18=NULL` ✓

### Case 4: Web form string "no" + age "17"

| Field | Value |
|-------|-------|
| **Model** | POST /api/volunteers intake normalize |
| **Endpoint** | POST /api/volunteers |
| **Sample** | `{ submissionSource: "web_form", formData.personal: { full_name: "__TEST_R1_CASE4__", is_18_or_older: "no", age_if_under_18: "17" } }` |
| **Able-to-fail** | If `is_18_or_older` isn't read OR "no" doesn't map to false, column stays NULL or wrong |
| **Proves** | Web form "no" → 0; `age_if_under_18` "17" → integer 17 in new column |
| **Does NOT prove** | OCR path, boolean false |

**SELECT result:** `id=475, age_18_or_older=0, age_under_18=17` ✓

### Test Row Cleanup [VERIFIED]
```
DELETE FROM volunteers WHERE id IN (472, 473, 474, 475) AND notes='__TEST_DATA_PHASE21__';
-- changes(): 4
-- Verify: SELECT returns empty for those ids
-- Row count: 455 (back to original)
```

---

## 3. R2 Proof — PATCH Immutability (Raw curl, NOT UI) [VERIFIED]

**Target:** Row 468 (Christia Ninan), backfilled web_form record.

**BEFORE:**
```
468|Christia Ninan|0|17
```

**PATCH sent (raw curl with gate token):**
```bash
curl -X PATCH http://localhost:3000/api/volunteers/468 \
  -H "Content-Type: application/json" \
  -H "X-Gate-Token: 18318b14..." \
  -d '{"formData":{"personal":{"age_18_or_older":false,"age_under_18":99}}}'
```

**Response:** `{"success":true}`

**AFTER:**
```
468|Christia Ninan|0|17
```

**Result:** age_18_or_older UNCHANGED (0→0), age_under_18 UNCHANGED (17→17). The PATCH accepted the request but the Design A immutability guard dropped both age fields from the updates object. ✓

---

## 4. Backfill — 5 Pending Rows [VERIFIED]

### Per-Row Source → Computed → Written

| ID | Name | form_data `is_18_or_older` | form_data `age_if_under_18` | → `age_18_or_older` | → `age_under_18` | changes() | Written ✓ |
|----|------|---------------------------|---------------------------|---------------------|-------------------|-----------|-----------|
| 464 | Jeremy Levine | `yes` | `` (empty) | 1 | NULL | 1 | 464\|1\| |
| 468 | Christia Ninan | `no` | `17` | 0 | 17 | 1 | 468\|0\|17 |
| 469 | Everly Tejada | `no` | `16` | 0 | 16 | 1 | 469\|0\|16 |
| 470 | Hailey Veloz | `no` | `17` | 0 | 17 | 1 | 470\|0\|17 |
| 471 | Amber Veloz | `yes` | `` (empty) | 1 | NULL | 1 | 471\|1\| |

All 5: submission_source = `web_form` confirmed before update. All changes() = 1.

### Full-Table Before/After Diff

```diff
449c449
< 464,,
---
> 464,1,
453,456c453,456
< 468,,
< 469,,
< 470,,
< 471,,
---
> 468,0,17
> 469,0,16
> 470,0,17
> 471,1,
```

**Exactly 5 rows changed, 0 others affected.** Row count: 456 lines (455 data + header) pre and post. ✓

---

## 5. Dashboard Changes [VERIFIED]

### HTML (line ~5726-5727)
- **Removed:** `<select id="vf-age_18_or_older">` dropdown with Unknown/Yes/No options
- **Removed:** `<input type="text" id="vf-age_under_18">` text input
- **Added:** `<span id="vf-age_18_or_older_display">` read-only display
- **Added:** `<span id="vf-age_under_18_display">` read-only display
- Labels: "18 or older?" and "Age"

### Population (~12885)
- **Removed:** `setVal('vf-age_18_or_older', p.age_18_or_older)` (read from form_data.personal)
- **Removed:** `setVal('vf-age_under_18', p.age_under_18)` (read from form_data.personal)
- **Removed:** `volToggleAge()` call
- **Added:** IIFE reads from `volRecord.age_18_or_older` and `volRecord.age_under_18` (column values)
  - `1/true` → "Yes", hide age field
  - `0/false` → "No", show age field with value or blank
  - `null` → blank (empty string), hide age field

### Save/Collect (~13024-13025)
- **Removed:** `age_18_or_older: document.getElementById(...)` conversion
- **Removed:** `age_under_18: gv('vf-age_under_18')`
- **Added:** Comment noting immutability

### volToggleAge (~12648)
- **Removed:** Function body
- **Replaced with:** Comment noting removal
- **No dangling callers:** `grep volToggleAge` returns only the comment; `grep onchange.*age` returns empty ✓

---

## 6. Other-PATCH-Fields Intact Proof [VERIFIED]

PATCH updates block after edit still contains all non-age fields:
- `updates.full_name = p.full_name || vol.full_name` ✓
- `updates.email = p.email ?? vol.email` ✓
- `updates.cell_phone = p.cell_phone ?? vol.cell_phone` ✓
- `updates.home_phone = p.home_phone ?? vol.home_phone` ✓
- `updates.address_city = p.city ?? vol.address_city` ✓
- `updates.address_state = p.state ?? vol.address_state` ✓
- `updates.form_data = JSON.stringify(formData)` ✓
- `updates.submitted_at` (conditional on todays_date) ✓
- `updates.training_start_date` (conditional on availability) ✓

Only `updates.age_18_or_older` removed (and `age_under_18` never added). ✓

---

## 7. Build [VERIFIED]

- `npx tsc --noEmit`: exit code 0 (clean)
- `npm run build`: exit code 0
- `systemctl is-active shelter-app`: active
- API responds (gate-protected endpoints return `{"error":"gate"}` without token, confirming server is running)

---

## Summary

| Change | Status |
|--------|--------|
| Schema: `age_under_18 INTEGER` column added | ✓ VERIFIED |
| POST intake: reads both field names, normalizes to boolean + int | ✓ VERIFIED (4 cases) |
| PATCH: age fields immutable (Design A) | ✓ VERIFIED (raw curl) |
| Dashboard: read-only display from column values | ✓ VERIFIED |
| Backfill: 5 pending rows correct | ✓ VERIFIED (per-row + full-table diff) |
| volToggleAge: removed, no dangling callers | ✓ VERIFIED |
| Other PATCH fields: untouched | ✓ VERIFIED |
| Test rows: created and deleted | ✓ VERIFIED |
| tsc clean + restart | ✓ VERIFIED |
| Commit: 8faf49f (3 files, named paths only) | ✓ |
