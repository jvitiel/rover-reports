# Volunteer "Invalid Date" Fix — Implementation

**Date:** 2026-06-24  
**Commit:** f9cc240  
**Scope:** 3 files (server.ts, localDatabase.ts, dashboard/index.html), 8 insertions, 1 deletion.

---

## Part 1 — PATCH Writes submitted_at (Normalized ISO)

**server.ts:10156–10161** (new, after `updates.form_data = JSON.stringify(formData);`):

```ts
if (p.todays_date) {
  const parsed = new Date(p.todays_date);
  if (!isNaN(parsed.getTime())) {
    updates.submitted_at = parsed.toISOString();
  }
}
```

When the date field is edited:
- Parseable value (e.g. `2026-06-09` from the date picker) → normalized to ISO (`2026-06-09T00:00:00.000Z`) → written to `submitted_at`
- Unparseable value → `isNaN` guard skips → `submitted_at` not touched → no regression

---

## Part 2 — Type Signature

**localDatabase.ts:5391** (new line added to `updateVolunteer` parameter type):

```ts
submitted_at?: string;
```

The entries-loop at localDatabase.ts:5399 already generates `SET key = ?` for any key in the data object — no other DB or SQL change needed.

---

## Part 3 — Date Input → Picker

**dashboard/index.html:6290:**

Before:
```html
<input type="text" id="vf-todays_date">
```

After:
```html
<input type="date" id="vf-todays_date">
```

`type="date"` gives a browser date picker that produces `YYYY-MM-DD` natively. The `setVal` function (dashboard:13723–13730) sets `el.value = val || ''` — for a date input, a non-YYYY-MM-DD string (like `"June 9th 2026"`) silently results in an empty field (no error). This is correct: staff see the field is empty and pick the right date.

---

## Build + Restart

- `npm run build` (tsc): exit 0, clean.
- `systemctl restart shelter-app`: active.
- Dashboard static: 200, 617977 bytes.

---

## Verification

### Test record: JOHN DOE (id=9)

Original `submitted_at`: `5/9/26` (paper_ocr). Used as throwaway test.

### Test 1: PATCH with parseable date
```bash
curl -X PATCH /api/volunteers/9 -d '{"formData":{"personal":{"full_name":"JOHN DOE","todays_date":"2026-06-09"}}}'
```
- **Result:** `submitted_at` written as `2026-06-09T00:00:00.000Z` ✅
- ISO format matches what good records (web_form, manual_entry) use.

### Test 2: Unparseable value skipped
```bash
curl -X PATCH /api/volunteers/9 -d '{"formData":{"personal":{"full_name":"JOHN DOE","todays_date":"garbage nonsense"}}}'
```
- **Result:** `submitted_at` preserved as `2026-06-09T00:00:00.000Z` (not overwritten) ✅
- No crash, no error — `isNaN` guard works.

### Test 3: API returns ISO value
```
GET /api/volunteers/9 → submitted_at: "2026-06-09T00:00:00.000Z"
```
Dashboard `new Date("2026-06-09T00:00:00.000Z").toLocaleDateString(...)` → `06/09/26` ✅ (not "Invalid Date")

### Test 4: List sort unaffected
```
GET /api/volunteers → 436 volunteers returned, sorted by submitted_at DESC
```
No crash, correct order. ✅

### Test 5: Kayla untouched
```sql
SELECT submitted_at FROM volunteers WHERE id = 452 → "June 9th 2026"
```
Not modified. John tests by editing her date in the dashboard. ✅

### Cleanup
JOHN DOE `submitted_at` restored to original value `5/9/26`.

---

## Deviations

None.

---

## Commit

```
f9cc240 volunteer: PATCH writes normalized ISO submitted_at on date edit, date input switched to type=date picker
 3 files changed, 8 insertions(+), 1 deletion(-)
```

Only `server/src/server.ts`, `server/src/localDatabase.ts`, `dashboard/index.html` committed (explicit `git add`, not `git add -A`).

---

## John's Test

Open Kayla McGregor (id 452) in the dashboard volunteer tab → edit view → "Date on Form" field will be empty (the date picker can't display "June 9th 2026") → pick June 9, 2026 → Save. The table should now show `06/09/26` instead of "Invalid Date". The `submitted_at` column in the DB will be `2026-06-09T00:00:00.000Z`.
