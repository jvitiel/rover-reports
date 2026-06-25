# Date Picker Shows Empty — Read-Only Diagnosis

**Date:** 2026-06-25  
**Scope:** Read-only. No writes, no code changes.

---

## 1. Populate-on-Open

**dashboard/index.html:14343–14356** — `volOpenDetail(id)`:
```js
const vol = data.data;
const formData = vol.form_data ? JSON.parse(vol.form_data) : { ... };
volPopulateEditForm(formData, vol);
```

**dashboard/index.html:13736–13738** — `volPopulateEditForm(data, volRecord)`:
```js
const p = data.personal || {};
const setVal = (id, val) => {
  ...
  else { el.value = val === true ? '✓' : (val || ''); }
  ...
};
```

**dashboard/index.html:13764:**
```js
setVal('vf-todays_date', p.todays_date);
```

`p` is `formData.personal` — the JSON blob from the `form_data` column. `p.todays_date` is whatever the OCR extracted or the user last saved into `form_data.personal.todays_date`.

---

## 2. What p.todays_date Actually Contains

| Record | Source | `form_data.personal.todays_date` | `submitted_at` |
|--------|--------|----------------------------------|----------------|
| JOHN DOE (9) | paper_ocr | `"2026-06-09"` ← John edited via picker | `5/9/26` |
| Kayla McGregor (452) | paper_ocr | `"2026-06-09"` ← John edited via picker | `2026-06-09T12:00:00.000Z` |
| Molly Gross (430) | paper_ocr | `"5/31/26"` ← raw OCR | `5/31/26` |
| Idan Meoded (444) | paper_ocr | `"06/13/2026"` ← raw OCR | `06/13/2026` |
| Devon Fuchs (446) | paper_ocr | `"6/1/26"` ← raw OCR | `6/1/26` |
| Thalia Adams (11) | bulk_import | `null`/empty | `2023-11-02` |
| John Vitiello (408) | web_form | `null`/empty | `2026-05-10T21:22:46.844Z` |

**Key findings:**
- Records John already edited via the picker: `todays_date = "2026-06-09"` (YYYY-MM-DD) → **displays correctly** in `type="date"` ✅
- Raw OCR records: `todays_date = "5/31/26"`, `"06/13/2026"`, `"6/1/26"` → **NOT YYYY-MM-DD** → `type="date"` shows empty ❌
- Bulk-import / web-form records: `todays_date` is `null`/empty → shows empty (correct — no date on form)

---

## 3. Why It Shows mm/dd/yyyy

A `type="date"` input **only accepts values in `YYYY-MM-DD` format** (per HTML spec). When `setVal` sets `el.value = "5/31/26"`, the browser rejects it silently and shows the empty placeholder `mm/dd/yyyy`.

**This is correct behavior for a date picker** — it can't display `"5/31/26"` or `"June 9th 2026"` as a date. But it means OCR records that haven't been re-saved always show an empty date field.

---

## 4. The Right Source + Fix

### Which source to populate from?

**Use `submitted_at`** (the canonical column), not `form_data.todays_date`:
- `submitted_at` is what the table displays — consistency between what the table shows and what the edit form shows
- After the noon-UTC fix, `submitted_at` values are either:
  - `"YYYY-MM-DDT12:00:00.000Z"` (noon UTC) — `.split('T')[0]` gives correct `YYYY-MM-DD`
  - `"YYYY-MM-DD"` (bulk import, date-only) — already YYYY-MM-DD
  - `"5/9/26"` / `"06/13/2026"` (OCR slash) — needs parsing
  - `"June 9th 2026"` (broken OCR) — won't parse, show empty (correct)

### The fix

In `volPopulateEditForm`, instead of:
```js
setVal('vf-todays_date', p.todays_date);
```

Use `volRecord.submitted_at` (the second parameter, the full volunteer row) and convert to YYYY-MM-DD:

```js
// Convert submitted_at to YYYY-MM-DD for the date picker
const sa = volRecord && volRecord.submitted_at;
if (sa) {
  const iso = sa.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    setVal('vf-todays_date', iso);
  } else {
    // Slash/other format — try parsing
    const d = new Date(sa);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setVal('vf-todays_date', `${yyyy}-${mm}-${dd}`);
    } else {
      setVal('vf-todays_date', '');
    }
  }
} else {
  setVal('vf-todays_date', '');
}
```

**Key detail:** For slash dates like `"5/9/26"`, `new Date("5/9/26")` parses as local midnight May 9 2026 → `.getFullYear()/.getMonth()/.getDate()` return the correct local values → `"2026-05-09"` → picker displays correctly.

For `"June 9th 2026"` → `new Date()` returns Invalid Date → show empty → staff picks the correct date manually.

**Where:** dashboard/index.html:13764 (the `setVal('vf-todays_date', p.todays_date)` line). Replace with the conversion block. `volRecord` is already available — it's the second argument to `volPopulateEditForm` (dashboard:13736).

### Note on the save path

The save path (dashboard:13880) still reads `gv('vf-todays_date')` which gets the picker's value in `YYYY-MM-DD` format. The PATCH then stores it as noon UTC. This is correct — no change needed to the save path.

---

## Summary

| Aspect | Finding |
|--------|---------|
| Root cause | `setVal` feeds raw `form_data.personal.todays_date` (slash date, OCR text, or null) into `type="date"` input, which only accepts `YYYY-MM-DD` |
| Affected | All OCR records that haven't been re-saved via the picker (raw slash/text dates in `todays_date`) |
| Not affected | Records John already edited (picker produced YYYY-MM-DD), bulk-import (null — correctly empty) |
| Fix | Populate from `volRecord.submitted_at` instead of `p.todays_date`, converted to YYYY-MM-DD |
| Where | dashboard/index.html:13764, ~10 lines replacing the one `setVal` call |
| Save path | Unchanged (picker produces YYYY-MM-DD, PATCH stores noon UTC) |
