# Volunteer Date Off-by-One — Read-Only Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only. No writes, no code changes.

---

## 1. Store Side — Confirmed

**server.ts:10157–10161** (the f9cc240 fix):
```ts
if (p.todays_date) {
  const parsed = new Date(p.todays_date);
  if (!isNaN(parsed.getTime())) {
    updates.submitted_at = parsed.toISOString();
  }
}
```

For input `"2026-06-09"` (what the `type="date"` picker produces):
- `new Date("2026-06-09")` = midnight UTC (per ECMA-262: date-only ISO strings without `T`/`Z` are treated as UTC)
- `.toISOString()` = `"2026-06-09T00:00:00.000Z"`

Stored value: `2026-06-09T00:00:00.000Z` (midnight UTC). ✅ Confirmed.

---

## 2. Render Side — Confirmed

**dashboard/index.html:14215:**
```js
const dateStr = v.submitted_at ? new Date(v.submitted_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '';
```

`toLocaleDateString()` converts to the **browser's local timezone**. For a user in Eastern (UTC-4 EDT / UTC-5 EST):
- `new Date("2026-06-09T00:00:00.000Z")` = Jun 8 2026 20:00:00 EDT
- `.toLocaleDateString(...)` = **`06/08/26`** ← one day earlier

✅ Confirmed: midnight UTC renders as the previous day in any timezone west of UTC.

---

## 3. How Do Existing Records Behave?

### Slash dates (OCR, 22 records) — CORRECT ✅
```js
new Date("5/9/26")  // → Sat May 09 2026 00:00:00 GMT-0400 (Eastern Daylight Time)
```
Slash dates are parsed as **local time** (per ECMA-262: non-ISO formats use local). Midnight local → same day in local timezone → displays correctly.

### Full ISO timestamps with Z (web_form/manual_entry, 14 records) — CORRECT ✅
```js
new Date("2026-05-10T21:22:46.844Z")  // → Sun May 10 2026 17:22:46 GMT-0400
```
9:22pm UTC = 5:22pm ET = same day. These have enough time-of-day offset to survive the timezone conversion.

### Date-only ISO (bulk_import_2026, 391 records) — OFF BY ONE ❌
```js
new Date("2023-11-02")  // → Wed Nov 01 2023 20:00:00 GMT-0400 (Eastern Daylight Time)
new Date("2025-05-04")  // → Sat May 03 2025 20:00:00 GMT-0400
new Date("2026-03-17")  // → Mon Mar 16 2026 20:00:00 GMT-0400
```
Date-only ISO strings are parsed as UTC midnight. In Eastern, that's 8pm the previous day → **displays as the previous day**.

**This is a pre-existing bug affecting 391 records (89% of all volunteers).** It exists in the table since the bulk import and predates the f9cc240 fix. The fix just inherited the same pattern.

---

## 4. The Fix Options

### Option A — Store noon UTC instead of midnight (store-side fix)

Change server.ts:10160 from:
```ts
updates.submitted_at = parsed.toISOString();
```
to:
```ts
// Store as date-only string (YYYY-MM-DD) — avoids timezone shift on render
updates.submitted_at = p.todays_date;
```

**Wait — that doesn't work either.** `new Date("2026-06-09")` in the browser is STILL UTC midnight, so it still shows off-by-one.

Better: store noon UTC:
```ts
const d = p.todays_date; // "2026-06-09"
updates.submitted_at = d + 'T12:00:00.000Z'; // noon UTC = 8am ET = same day everywhere
```

Noon UTC survives timezone conversion for any timezone from UTC-11 to UTC+12.

**Fixes new edits only.** The 391 bulk-import records still show off-by-one.

### Option B — Fix on the render side (display-side fix)

Change dashboard:14215 from:
```js
const dateStr = v.submitted_at ? new Date(v.submitted_at).toLocaleDateString('en-US', ...) : '';
```
to:
```js
const dateStr = v.submitted_at ? (() => {
  const d = v.submitted_at.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y,m,day] = d.split('-');
    return new Date(+y, +m-1, +day).toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'2-digit' });
  }
  return new Date(v.submitted_at).toLocaleDateString('en-US', { month:'2-digit', day:'2-digit', year:'2-digit' });
})() : '';
```

Or a cleaner helper function. Extract the date portion from the ISO string and construct a local Date, avoiding the UTC-to-local shift.

**Fixes ALL records** (new edits AND 391 existing bulk-import records) at once. But needs changing 4 render sites (14215, 15203, plus the 2 non-volunteer submitted_at renders at 11131, 11198 which are for different tables — RG requests, not volunteers).

### Option C — Store without Z suffix

```ts
updates.submitted_at = parsed.toISOString().replace('Z', '');
// "2026-06-09T00:00:00.000" — no Z = parsed as local time
```

`new Date("2026-06-09T00:00:00.000")` is local midnight → same day → correct. But inconsistent with existing data format.

### Recommendation

**Option B (render-side fix) is the right answer.** It fixes the 391 pre-existing off-by-one records AND new edits in one change. A small helper function (`volParseDate`) applied at the render sites keeps it clean. The store side can stay as `.toISOString()` (canonical, correct for storage).

**However**, if the scope is just "fix the new PATCH path" and the 391 bulk-import records aren't a priority, **Option A (noon UTC)** is the simplest single-line change on the store side. It's a band-aid — the 391 existing records stay off-by-one — but it fixes the immediate bug (newly-edited dates show correct day).

**Pragmatic recommendation:** Do BOTH:
1. Store-side: change `.toISOString()` to `p.todays_date + 'T12:00:00.000Z'` (1 line, prevents future off-by-one)
2. Render-side: add a `volParseDate(dateStr)` helper that extracts `YYYY-MM-DD` and constructs a local Date (fixes all 391 + any future edge cases)

The render fix is ~10 lines (helper + 2 volunteer render sites at 14215 and 15203). The 2 non-volunteer render sites (11131, 11198) are for RG requests — different table, separate concern, don't touch.

---

## 5. Where the Render Fix Goes

**Volunteer table render — dashboard/index.html:14215:**
```js
const dateStr = v.submitted_at ? new Date(v.submitted_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '';
```

**Other-talents modal — dashboard/index.html:15203:**
```js
const date = v.submitted_at ? new Date(v.submitted_at).toLocaleDateString() : '—';
```

**Sort comparator — dashboard/index.html:14303:**
```js
case 'submitted': return v.submitted_at || '';
```
This is string sort, not Date sort. Unaffected by the render fix.

**Default sort — dashboard/index.html:11111:**
```js
data.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
```
This compares timestamps numerically. A few hours off doesn't change relative order. Unaffected.

---

## Summary

| Aspect | Finding |
|--------|---------|
| Root cause | `new Date("2026-06-09").toISOString()` → midnight UTC → renders as previous day in Eastern |
| Scope | ALL 391 bulk-import + 14 web-form records with date-only ISO or midnight UTC are affected (pre-existing) |
| Slash dates | Unaffected (parsed as local time) |
| Recommended fix | Render-side helper + store noon UTC (both) |
| Render sites | 2 volunteer (14215, 15203); sort (14303, 11111) unaffected |
| Store fix | 1 line: `p.todays_date + 'T12:00:00.000Z'` instead of `.toISOString()` |
