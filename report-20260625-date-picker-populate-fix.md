# Date Picker Populate Fix — Implementation

**Date:** 2026-06-25  
**Commit:** ccbec68  
**Scope:** dashboard/index.html only (20 insertions, 1 deletion).

---

## Change

**dashboard/index.html:13764** — before:
```js
setVal('vf-todays_date', p.todays_date);
```

After (13764–13783):
```js
// Populate date picker from submitted_at (YYYY-MM-DD) instead of raw todays_date
const sa = volRecord && volRecord.submitted_at;
if (sa) {
  const iso = sa.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    setVal('vf-todays_date', iso);
  } else {
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

Logic:
1. ISO/noon-UTC (`"2026-06-09T12:00:00.000Z"`) → `split('T')[0]` = `"2026-06-09"` → picker filled ✅
2. Date-only ISO (`"2023-11-02"`) → matches regex directly → picker filled ✅
3. Slash dates (`"6/1/26"`, `"06/13/2026"`) → `new Date()` local-parse → getFullYear/Month/Date → `"2026-06-01"` → picker filled ✅
4. Unparseable (`"June 9th 2026"`) → `isNaN` → empty (staff picks manually) ✅
5. Null/missing → empty ✅

`volRecord` is the second parameter to `volPopulateEditForm` (dashboard:13736), already available — no API change needed.

---

## Save Path — Unchanged

**dashboard/index.html:13899:**
```js
todays_date: gv('vf-todays_date'),
```

The `type="date"` picker produces `YYYY-MM-DD` on save. The PATCH stores noon UTC. No change needed.

---

## Verification

### Picker values match list view (Eastern timezone)

| `submitted_at` | List view | Picker |
|----------------|-----------|--------|
| `2026-06-09T12:00:00.000Z` (noon UTC) | `06/09/26` | `2026-06-09` ✅ |
| `06/13/2026` (OCR slash) | `06/13/26` | `2026-06-13` ✅ |
| `6/1/26` (OCR slash short) | `06/01/26` | `2026-06-01` ✅ |
| `5/31/26` (OCR slash) | `05/31/26` | `2026-05-31` ✅ |
| `2023-11-02` (bulk import) | `11/02/23` | `2023-11-02` ✅ |
| `2026-05-10T21:22:46.844Z` (web form) | `05/10/26` | `2026-05-10` ✅ |
| `null` | `(empty)` | `(empty)` ✅ |

Every record type: the picker now shows the same day the list view shows.

### Dashboard loads
200, 619375 bytes. No JS errors.

---

## Deviations

None.

---

## Commit

```
ccbec68 dashboard: populate date picker from submitted_at as YYYY-MM-DD (fixes empty picker for OCR/bulk records)
 1 file changed, 20 insertions(+), 1 deletion(-)
```

Only `dashboard/index.html` committed (explicit `git add`, not `git add -A`).
