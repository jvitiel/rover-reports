# Volunteer Age Fix — Diagnosis & Change Surface

**Date:** 2026-07-12  
**Type:** Read-only scoping diagnosis  
**Goal:** Pin exact edit points for: new `age_under_18` column, fix write-path field-name mismatch, backfill 5 pending, replace dashboard age dropdown with read-only fields.

---

## 1. WRITE PATH — POST Intake (server.ts ~line 9921–9938)

### Current Code [VERIFIED]

```typescript
// server.ts lines 9921-9938 (POST /api/volunteers handler, line 9841)
const id = insertVolunteer({
  full_name: p.full_name,
  email: p.email || null,
  cell_phone: p.cell_phone || null,
  home_phone: p.home_phone || null,
  address_city: p.city || null,
  address_state: p.state || null,
  age_18_or_older: p.age_18_or_older ?? null,       // ← BUG: reads wrong field name
  status: status || 'pending',
  submission_source: submissionSource || 'paper_ocr',
  submitted_at: p.todays_date || now,
  approved_at: status === 'approved' ? now : null,
  approved_by: status === 'approved' ? approvedBy : null,
  form_version: formData.form_version || null,
  form_data: JSON.stringify(formData),
  original_files: JSON.stringify(fileUrls),
  ocr_raw: req.body.ocrRaw ? JSON.stringify(req.body.ocrRaw) : null,
  notes: notes || null,
  training_start_date: formData.availability?.start_date || null,
});
```

### What the Form Sends [VERIFIED from stored form_data JSON]

**Web form** sends in `formData.personal`:
- `is_18_or_older`: string `"yes"` or `"no"`
- `age_if_under_18`: string `"17"` or `""` (empty when 18+)

**OCR/paper** sends in `formData.personal`:
- `age_18_or_older`: boolean `true` / `false` / `null`
- `age_under_18`: string `"17"` or `null`

**Dashboard save** sends in `formData.personal`:
- `age_18_or_older`: boolean `true` / `false` / `null` (converted from select value)
- `age_under_18`: string from text input

Three different field names for the same concept across three sources.

### Corrected Mapping

The POST path needs to handle all three sources. Corrected logic:

```typescript
// Read from whichever field name is present (web form vs OCR vs dashboard)
const rawAge18 = p.age_18_or_older ?? p.is_18_or_older ?? null;
// Normalize: string "yes"→true, "no"→false; boolean pass-through; anything else→null
const age18orOlder = rawAge18 === true || rawAge18 === 'yes' ? true
                   : rawAge18 === false || rawAge18 === 'no' ? false
                   : null;

// Read under-18 age from whichever field name is present
const rawAgeUnder18 = p.age_under_18 ?? p.age_if_under_18 ?? null;
// Parse to integer; empty string or non-numeric → null
const ageUnder18 = rawAgeUnder18 ? parseInt(String(rawAgeUnder18), 10) || null : null;
```

Then pass to insertVolunteer:
```typescript
age_18_or_older: age18orOlder,
age_under_18: ageUnder18,    // NEW — needs new column + insert fn param
```

**Edge cases:**
- `rawAge18` is `undefined`/`null`/`""` → `null` (unknown — acceptable for incomplete OCR)
- `rawAge18` is `"yes"` (web form) → `true`
- `rawAge18` is `true` (OCR) → `true` (pass-through)
- `rawAgeUnder18` is `""` (web form when 18+) → `null`
- `rawAgeUnder18` is `"abc"` (garbage) → `parseInt` returns `NaN`, `|| null` → `null`

---

## 2. WRITE PATH — PATCH Update (server.ts ~line 10855–10862)

### Current Code [VERIFIED]

```typescript
// server.ts lines 10855-10862 (PATCH /api/volunteers/:id handler)
const p = formData.personal || {};
updates.full_name = p.full_name || vol.full_name;
updates.email = p.email ?? vol.email;
updates.cell_phone = p.cell_phone ?? vol.cell_phone;
updates.home_phone = p.home_phone ?? vol.home_phone;
updates.address_city = p.city ?? vol.address_city;
updates.address_state = p.state ?? vol.address_state;
updates.age_18_or_older = p.age_18_or_older ?? vol.age_18_or_older;  // ← same mismatch
updates.form_data = JSON.stringify(formData);
```

### Dashboard-edit safety for READ-ONLY age fields

The target design makes the 18+/age fields **read-only on the dashboard**. This means:

1. The dashboard will no longer send `age_18_or_older` or `age_under_18` in PATCH requests (the fields won't be inputs).
2. The PATCH handler should **not** overwrite submitted age values from dashboard edits.

**Safe handling:** Remove the `updates.age_18_or_older = ...` line from the PATCH formData block entirely. Since the dashboard won't send it, and OCR re-processing doesn't go through PATCH, the submitted values remain intact.

If paranoia is desired, an explicit guard:
```typescript
// Do NOT update age_18_or_older or age_under_18 from dashboard edits
// These are submission-time values, read-only after intake
// (line removed: updates.age_18_or_older = p.age_18_or_older ?? vol.age_18_or_older;)
```

**Can PATCH currently overwrite?** Yes — if a dashboard user changes the dropdown and saves, the PATCH sends `age_18_or_older: true/false/null` in `formData.personal`, and the handler writes it. With the dropdown removed, this path dies naturally. But the line should still be removed as defense-in-depth. [VERIFIED]

---

## 3. INSERT FUNCTION — localDatabase.ts lines 4865–4900

### Current Code [VERIFIED]

```typescript
export function insertVolunteer(data: {
  full_name: string;
  email: string | null;
  // ... other fields ...
  age_18_or_older: boolean | null;    // takes boolean, NOT string
  // ...
}): number {
  const database = getDatabase();
  const result = database.prepare(`
    INSERT INTO volunteers (full_name, email, cell_phone, home_phone, address_city, address_state,
      age_18_or_older, status, submission_source, submitted_at, approved_at, approved_by,
      form_version, form_data, original_files, ocr_raw, notes, training_start_date, policy_reviewed_at, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.full_name, data.email, data.cell_phone, data.home_phone,
    data.address_city, data.address_state,
    data.age_18_or_older ? 1 : (data.age_18_or_older === false ? 0 : null),  // boolean→int conversion
    data.status, data.submission_source, data.submitted_at,
    data.approved_at, data.approved_by, data.form_version,
    data.form_data, data.original_files, data.ocr_raw, data.notes,
    data.training_start_date, data.policy_reviewed_at || null, data.tags || null
  );
  return Number(result.lastInsertRowid);
}
```

### Confirmation

The function signature takes `boolean | null`. The POST path MUST pass a real boolean (not the string `"yes"`). The corrected POST mapping above handles this conversion. [VERIFIED]

### Where to Insert `age_under_18`

**Type signature** — add after `age_18_or_older`:
```typescript
age_under_18: number | null;    // NEW
```

**SQL column list** — add `age_under_18` after `age_18_or_older`:
```sql
INSERT INTO volunteers (full_name, email, cell_phone, home_phone, address_city, address_state,
  age_18_or_older, age_under_18, status, ...)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ...)   -- 21 params (was 20)
```

**Values binding** — add after the `age_18_or_older` ternary:
```typescript
data.age_18_or_older ? 1 : (data.age_18_or_older === false ? 0 : null),
data.age_under_18,    // NEW — already an integer or null from POST mapping
```

**updateVolunteer function** (line ~4905) — add `age_under_18?: number | null` to the type signature. The existing loop handles it generically (no special conversion needed for integers). [VERIFIED — the loop only special-cases `age_18_or_older` for boolean→int conversion; integers pass through as-is]

**VolunteerRow interface** (line ~4784) — add:
```typescript
age_under_18: number | null;
```

**getVolunteers SELECT** (line ~4833) — add `age_under_18` to the column list.

---

## 4. SCHEMA — DDL for New Column

### Current `volunteers` Table [VERIFIED with .schema]

Has `age_18_or_older BOOLEAN` (stored as INTEGER 1/0/NULL). No `age_under_18` column exists.

### Proposed DDL

```sql
ALTER TABLE volunteers ADD COLUMN age_under_18 INTEGER;
```

- Nullable by default (no NOT NULL constraint) ✓
- No default needed (existing rows get NULL, which is correct — they weren't asked for a specific age) ✓
- SQLite `ALTER TABLE ADD COLUMN` is safe here: no NOT NULL without default, no PRIMARY KEY, no UNIQUE constraint ✓

### Project Schema Convention [VERIFIED]

The project uses **ad-hoc `ALTER TABLE ADD COLUMN` with try/catch** in `localDatabase.ts` initialization. Pattern:

```typescript
try { db.exec(`ALTER TABLE tablename ADD COLUMN col_name TYPE`); } catch {}
```

This is idempotent — the `catch` swallows the "duplicate column name" error on subsequent runs. Examples from the codebase (localDatabase.ts):

- Line 116: `try { db.exec('ALTER TABLE behavior_notes ADD COLUMN good_with_cats TEXT'); } catch {}`
- Line 448: `try { db.exec('ALTER TABLE animal_metadata ADD COLUMN fiv_status TEXT'); } catch (_) { /* column already exists */ }`

**No separate migration files.** The convention is to add the try/catch block in the initialization section of `localDatabase.ts`.

For volunteers, the migration line would be:
```typescript
try { db.exec(`ALTER TABLE volunteers ADD COLUMN age_under_18 INTEGER`); } catch {}
```

Placed near other volunteer-related initialization (find the `CREATE TABLE volunteers` block or the end of the init section).

---

## 5. BACKFILL TARGET — 5 Pending Applicants

### Parsed Values from form_data [VERIFIED with SELECT]

| ID | Name | `form_data.personal.is_18_or_older` | → `age_18_or_older` column | `form_data.personal.age_if_under_18` | → `age_under_18` column |
|----|------|-------------------------------------|---------------------------|--------------------------------------|------------------------|
| 464 | Jeremy Levine | `"yes"` | **1** | `""` (empty) | **NULL** |
| 468 | Christia Ninan | `"no"` | **0** | `"17"` | **17** |
| 469 | Everly Tejada | `"no"` | **0** | `"16"` | **16** |
| 470 | Hailey Veloz | `"no"` | **0** | `"17"` | **17** |
| 471 | Amber Veloz | `"yes"` | **1** | `""` (empty) | **NULL** |

### Exact Post-Backfill State

```sql
-- After backfill, these rows should read:
-- id=464: age_18_or_older=1, age_under_18=NULL
-- id=468: age_18_or_older=0, age_under_18=17
-- id=469: age_18_or_older=0, age_under_18=16
-- id=470: age_18_or_older=0, age_under_18=17
-- id=471: age_18_or_older=1, age_under_18=NULL
```

**Note:** Beyond these 5 pending, there are 27 total rows with NULL `age_18_or_older` in the database. All web_form submissions likely have the same mismatch. A broader backfill could parse `form_data` JSON for all 27 NULL rows. [UNCERTAIN — not all 27 may be web_form; some could be incomplete OCR or manual entry with genuinely unknown age]

---

## 6. DASHBOARD RENDER — Current Dropdown → Read-Only Fields

### Current Code (dashboard/index.html) [VERIFIED]

**HTML (line 5726-5727):**
```html
<div class="vol-field" style="flex:0 0 120px">
  <label>18 or older?</label>
  <select id="vf-age_18_or_older" onchange="volToggleAge()">
    <option value="">Unknown</option>
    <option value="true">Yes</option>
    <option value="false">No</option>
  </select>
</div>
<div class="vol-field" id="vf-age_under_18_wrap" style="flex:0 0 120px; display:none">
  <label>How old?</label>
  <input type="text" id="vf-age_under_18" placeholder="e.g. 16">
</div>
```

**Population (line 12885-12887):**
```javascript
setVal('vf-age_18_or_older', p.age_18_or_older);
setVal('vf-age_under_18', p.age_under_18);
volToggleAge();
```

Note: `setVal` reads from `data.personal` (the parsed `form_data` JSON), NOT from the top-level `volRecord.age_18_or_older` column. For web form submissions, `data.personal.age_18_or_older` is `undefined` (the field is called `is_18_or_older`), so the dropdown shows "Unknown" regardless of what the applicant submitted. This is the dashboard-side manifestation of the field name mismatch.

**Save/collect (line 13024-13025):**
```javascript
age_18_or_older: document.getElementById('vf-age_18_or_older').value === 'true' ? true
  : document.getElementById('vf-age_18_or_older').value === 'false' ? false : null,
age_under_18: gv('vf-age_under_18'),
```

### Replacement — Two Read-Only Display Fields

Replace the `<select>` and `<input>` with display-only spans:

```html
<div class="vol-field" style="flex:0 0 120px">
  <label>18 or older?</label>
  <span id="vf-age_18_or_older_display" class="vol-readonly-value"></span>
</div>
<div class="vol-field" id="vf-age_under_18_wrap" style="flex:0 0 120px; display:none">
  <label>Age</label>
  <span id="vf-age_under_18_display" class="vol-readonly-value"></span>
</div>
```

**Population logic** — read from `volRecord` (the top-level column values from the GET response), not from `form_data.personal`:

```javascript
// Read from the column, not from form_data.personal (which has mismatched field names)
const age18display = document.getElementById('vf-age_18_or_older_display');
const ageWrap = document.getElementById('vf-age_under_18_wrap');
const ageDisplay = document.getElementById('vf-age_under_18_display');

if (volRecord.age_18_or_older === 1 || volRecord.age_18_or_older === true) {
  age18display.textContent = 'Yes';
  ageWrap.style.display = 'none';
} else if (volRecord.age_18_or_older === 0 || volRecord.age_18_or_older === false) {
  age18display.textContent = 'No';
  ageWrap.style.display = '';
  ageDisplay.textContent = volRecord.age_under_18 != null ? String(volRecord.age_under_18) : '';
} else {
  age18display.textContent = '';  // blank, not "Unknown" or "N/A"
  ageWrap.style.display = 'none';
}
```

**Remove from save/collect block** — delete lines 13024-13025 (the `age_18_or_older` and `age_under_18` collection). These are submission-time values and must not be editable from the dashboard.

**Remove `volToggleAge()` function** (lines 12648-12651) — no longer needed.

**Confirmed display-only:** The target design uses `<span>` elements, not inputs. No `<select>`, no `<input>`, no `onchange`. The fields are populated from the database column, not from form input. [VERIFIED — design spec, not existing code]

---

## 7. Other Readers/Writers of `age_18_or_older` [VERIFIED with grep]

Full grep of `age_18_or_older`, `age_under_18`, and `age_if_under_18` across `/home/shelter/shelter-apps/server/src/`:

| File | Line | Usage | Affected by this fix? |
|------|------|-------|-----------------------|
| server.ts:9557 | OCR prompt: "For age_under_18: only populate when age_18_or_older is false" | No — OCR prompt instruction, uses correct field names |
| server.ts:9579 | OCR JSON schema: `"age_18_or_older": <true\|false\|null>` | No — defines OCR output schema |
| server.ts:9580 | OCR JSON schema: `"age_under_18": "<string or null>"` | No — defines OCR output schema |
| server.ts:9928 | POST intake: `age_18_or_older: p.age_18_or_older ?? null` | **YES — fix target #1** |
| server.ts:10861 | PATCH update: `updates.age_18_or_older = p.age_18_or_older ?? vol.age_18_or_older` | **YES — fix target #2** |
| localDatabase.ts:4792 | VolunteerRow interface: `age_18_or_older: boolean \| null` | **YES — add age_under_18** |
| localDatabase.ts:4833 | getVolunteers SELECT column list | **YES — add age_under_18** |
| localDatabase.ts:4872 | insertVolunteer type signature | **YES — add age_under_18 param** |
| localDatabase.ts:4890 | INSERT column list | **YES — add age_under_18 column** |
| localDatabase.ts:4895 | INSERT VALUES binding | **YES — add age_under_18 value** |
| localDatabase.ts:4911 | updateVolunteer type signature | **YES — add age_under_18** |
| localDatabase.ts:4927 | updateVolunteer special-case for boolean→int | No — age_under_18 is int, no conversion needed |

**Additional consumers outside server/src/:**

| File | Usage | Affected? |
|------|-------|----|
| dashboard/index.html:5726 | Age dropdown `<select>` | **YES — replace with read-only** |
| dashboard/index.html:5727 | Age input `<input>` | **YES — replace with read-only** |
| dashboard/index.html:12648 | `volToggleAge()` function | **YES — remove** |
| dashboard/index.html:12885 | `setVal('vf-age_18_or_older', ...)` | **YES — replace with column-based display** |
| dashboard/index.html:13024 | Save collect: `age_18_or_older: ...` | **YES — remove** |
| forms/volunteer-application-template.html:252 | PDF template: `{{is_18_or_older_label}}` | No — label only, reads from form config not DB |
| scripts/generate-volunteer-pdf.js:131-132 | PDF gen: label replacement | No — label only |
| matcher-web/app.js, custom-search/app.js, matcher-preview/app.js | Contain `age_18_or_older` | Check before impl — likely in volunteer list rendering |

**Compiled dist/:** `server/dist/server.js` and `server/dist/localDatabase.js` contain compiled versions — these are overwritten by `npm run build` and do not need manual editing.

---

## Summary of Change Surface

| # | File | What | Lines |
|---|------|------|-------|
| 1 | server.ts | POST: fix field-name mapping + add age_under_18 | ~9928 |
| 2 | server.ts | PATCH: remove age_18_or_older overwrite from dashboard edits | ~10861 |
| 3 | localDatabase.ts | Schema migration: `ALTER TABLE volunteers ADD COLUMN age_under_18 INTEGER` | init section |
| 4 | localDatabase.ts | VolunteerRow interface: add `age_under_18` | ~4792 |
| 5 | localDatabase.ts | getVolunteers SELECT: add `age_under_18` | ~4833 |
| 6 | localDatabase.ts | insertVolunteer: add param + column + value | ~4872-4895 |
| 7 | localDatabase.ts | updateVolunteer: add to type signature | ~4911 |
| 8 | dashboard/index.html | Replace dropdown + input with read-only spans | 5726-5727 |
| 9 | dashboard/index.html | Replace setVal population with column-based display | 12885-12887 |
| 10 | dashboard/index.html | Remove age_18_or_older + age_under_18 from save collect | 13024-13025 |
| 11 | dashboard/index.html | Remove volToggleAge() | 12648-12651 |
| 12 | SQL backfill | UPDATE 5 pending rows from form_data JSON | one-time |
| 13 | matcher-web/app.js, custom-search/app.js, matcher-preview/app.js | **Check** for age_18_or_older usage | TBD |
