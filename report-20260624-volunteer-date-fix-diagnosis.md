# Volunteer "Invalid Date" — Fix Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only. No writes, no code changes, DB mode=ro.

---

## 1. The Edit/Save Path — Field Mismatch

### Date input UI

**dashboard/index.html:6290** — free-text `<input type="text">`, NOT a date picker:
```html
<div class="vol-field" style="flex:0 0 200px"><label>Date on Form</label><input type="text" id="vf-todays_date"></div>
```

### Populating on open

**dashboard/index.html:13749** — reads from `form_data.personal.todays_date`:
```js
setVal('vf-todays_date', p.todays_date);
```

### Collecting on save

**dashboard/index.html:13865** — writes to `formData.personal.todays_date`:
```js
todays_date: gv('vf-todays_date'),
```

### Save action

**dashboard/index.html:13946–13951** — PATCHes the endpoint with `{ formData, status, notes }`:
```js
await fetch(`/api/volunteers/${volEditingId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ formData, status: 'pending', notes }),
});
```

### PATCH endpoint

**server.ts:10122–10181** — writes these fields from `formData.personal`:
```js
// server.ts:10148-10157
const p = formData.personal || {};
updates.full_name = p.full_name || vol.full_name;
updates.email = p.email ?? vol.email;
updates.cell_phone = p.cell_phone ?? vol.cell_phone;
updates.home_phone = p.home_phone ?? vol.home_phone;
updates.address_city = p.city ?? vol.address_city;
updates.address_state = p.state ?? vol.address_state;
updates.age_18_or_older = p.age_18_or_older ?? vol.age_18_or_older;
updates.form_data = JSON.stringify(formData);  // ← todays_date goes HERE (inside JSON blob)
```

**`submitted_at` is NEVER written by PATCH.** The `updateVolunteer` function (localDatabase.ts:5378–5410) doesn't even have `submitted_at` in its type signature.

### The mismatch

| Action | Field written | Field read by table |
|--------|--------------|-------------------|
| Edit + Save | `form_data.personal.todays_date` (JSON blob) | — |
| Table render | — | `submitted_at` (column) |

The edit saves `todays_date` into the JSON blob. The table reads `submitted_at` (the column). Two different fields. Edits never reach what the table displays.

---

## 2. Date Input: Free-Text (Not a Picker)

**dashboard/index.html:6290:**
```html
<input type="text" id="vf-todays_date">
```

This is `type="text"` — a plain free-text field with no browser date picker, no format constraint, no validation. Whatever the user types is stored verbatim in `form_data.personal.todays_date`.

**Implication:** If the fix writes `todays_date` to `submitted_at`, it must normalize/validate the value to a parseable date format. A user could type anything ("June 9th 2026", "last Tuesday", "idk").

---

## 3. Everything That Reads submitted_at (Don't Break These)

### A. Volunteer table — date column render
**dashboard/index.html:14215:**
```js
const dateStr = v.submitted_at ? new Date(v.submitted_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '';
```
This is the line that produces "Invalid Date" for Kayla. It reads `submitted_at` and passes it to `new Date()`.

### B. Volunteer table — sort
**dashboard/index.html:14303:**
```js
case 'submitted': return v.submitted_at || '';
```
String sort on `submitted_at`. ISO dates sort correctly as strings. Slash dates (`5/9/26`) sort incorrectly but don't crash.

### C. Volunteer table — default sort order
**dashboard/index.html:11111:**
```js
data.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
```
Sorts by `submitted_at` DESC (newest first). An "Invalid Date" sorts to the bottom (NaN comparison). ISO format sorts correctly.

### D. Other-talents modal
**dashboard/index.html:15203:**
```js
const date = v.submitted_at ? new Date(v.submitted_at).toLocaleDateString() : '—';
```
Same pattern — reads `submitted_at`, passes to `new Date()`.

### E. Server-side: localDatabase.ts
**localDatabase.ts:2192:**
```sql
ORDER BY submitted_at DESC
```
The volunteer listing query sorts by `submitted_at DESC` in SQL. ISO strings sort correctly. OCR strings like "June 9th 2026" sort alphabetically (wrong order but doesn't crash).

### F. Server-side: DB index
**localDatabase.ts:2047:**
```sql
submitted_at, language_submitted, status,
```
Selected in the list query — passed through to the API response.

**Summary:** `submitted_at` is read in 5 places (3 dashboard renders + 1 sort + 1 SQL ORDER BY). All use `new Date(submitted_at)` for display, so all need a JS-parseable value. Fixing `submitted_at` to contain parseable dates fixes all of them simultaneously.

---

## 4. Format Good Records Use

### Bulk import records (majority):
```
2023-11-02    (ISO date, no time)
2025-05-04
2026-03-17
```

### Web form records:
```
2026-05-10T21:22:46.844Z    (full ISO-8601 with time)
2026-05-10T21:26:57.733Z
```

### Manual entry records:
```
2026-05-10T22:27:39.561Z    (full ISO-8601 with time)
```

### Paper OCR records (the problematic ones):
```
June 9th 2026    ← Kayla, BROKEN (ordinal "th")
5/9/26           ← works (JS parses slash dates)
06/13/2026       ← works
4.27.26          ← works (JS parses dot dates)
```

**All good values are either ISO dates (`YYYY-MM-DD`) or ISO timestamps (`YYYY-MM-DDTHH:mm:ss.sssZ`).** Both parse reliably in `new Date()`. The fix should write ISO format.

---

## 5. Recommended Fix (Option A)

**Option A: Make PATCH write `submitted_at` when the date is edited.**

### Why not Option B (read `todays_date` instead)
Changing the table to read `form_data.personal.todays_date` would break:
- SQL `ORDER BY submitted_at DESC` (would need schema change or JOIN)
- The default `data.sort()` at line 11111
- Every `new Date(v.submitted_at)` render
- Bulk-import records which have no `form_data` at all

Option B is wrong. `submitted_at` is the canonical date field.

### The fix (3 parts)

**Part 1 — PATCH writes `submitted_at` (server.ts:~10157):**

After the existing `updates.form_data = JSON.stringify(formData);` line, add:
```js
if (p.todays_date) {
  const parsed = new Date(p.todays_date);
  if (!isNaN(parsed.getTime())) {
    updates.submitted_at = parsed.toISOString();
  }
}
```

This normalizes the free-text input to ISO format and writes it to `submitted_at`. If the value doesn't parse, it silently skips (no regression — the old bad value stays, but at least doesn't get worse).

**Part 2 — `updateVolunteer` type signature (localDatabase.ts:5378):**

Add `submitted_at?: string;` to the type. The function already handles arbitrary keys via the `for...of Object.entries` loop (localDatabase.ts:5399), so the SQL generation works automatically — just the TypeScript type needs the field added.

**Part 3 — Date input handling (dashboard, optional but recommended):**

Change the input from `type="text"` to `type="date"` (dashboard/index.html:6290):
```html
<input type="date" id="vf-todays_date">
```
This gives a browser date picker that produces `YYYY-MM-DD` format natively — no free-text ambiguity. When populating on open, the OCR value ("June 9th 2026") won't fill a date picker — it'll show empty, which is correct (user sees it's unparsed and enters the right date).

Alternatively, keep `type="text"` but add normalization before save (try `new Date(value)`, reject if NaN). The `type="date"` approach is simpler and prevents the problem at input.

### Proving the fix

Once Part 1+2 are in, John opens Kayla's record, types `2026-06-09` (or picks it from the date picker), saves. The PATCH now writes `submitted_at = "2026-06-09T00:00:00.000Z"`. The table reads `submitted_at`, parses it, shows `06/09/26`. Bug fixed. Same action proves the fix and fixes Kayla's record.

---

## 6. Future OCR Ingestion (Note Only — Don't Fix Now)

**server.ts:9488:**
```js
submitted_at: p.todays_date || now,
```

The OCR prompt extracts raw handwritten text (`"June 9th 2026"`) and stores it verbatim in `submitted_at`. No normalization.

**Future improvement:** Normalize at ingestion:
```js
const parsedDate = new Date(p.todays_date);
submitted_at: !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : now,
```

This would catch most OCR date formats (`6/9/26`, `06/13/2026`, etc.) and fall back to `now` for truly unparseable ones (ordinals, spelled-out dates). Would prevent future "Invalid Date" in the table.

**Not fixing now** — separate concern, and the edit-path fix (Part 1) already gives staff a way to correct bad dates after the fact.

---

## Summary

| Finding | Detail |
|---------|--------|
| Root cause | PATCH writes `form_data.personal.todays_date` (JSON blob); table reads `submitted_at` (column). Two different fields. |
| Date input | `type="text"` — free text, no validation, no normalization |
| submitted_at consumers | 5 reads: table render (14215), default sort (11111), column sort (14303), other-talents modal (15203), SQL ORDER BY (localDatabase.ts:2192) |
| Good format | ISO: `2026-06-09` or `2026-06-09T00:00:00.000Z` |
| Fix | PATCH writes normalized `submitted_at` from `todays_date`; add `submitted_at` to updateVolunteer type; optionally change input to `type="date"` |
| John's test | Edit Kayla → enter `2026-06-09` → save → table shows `06/09/26` instead of "Invalid Date" |
| Future | Normalize OCR `todays_date` to ISO at ingestion (separate improvement) |
