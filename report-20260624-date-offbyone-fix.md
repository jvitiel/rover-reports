# Volunteer Date Off-by-One Fix — Implementation

**Date:** 2026-06-25  
**Commit:** df08153  
**Scope:** 2 files (server.ts, dashboard/index.html), 19 insertions, 3 deletions.

---

## Store Fix — Noon UTC (server.ts:10158–10162)

Before:
```ts
if (p.todays_date) {
  const parsed = new Date(p.todays_date);
  if (!isNaN(parsed.getTime())) {
    updates.submitted_at = parsed.toISOString();
  }
}
```

After:
```ts
if (p.todays_date) {
  const parsed = new Date(p.todays_date);
  if (!isNaN(parsed.getTime())) {
    // Store as noon UTC so timezone conversion can't cross a day boundary
    updates.submitted_at = p.todays_date.split('T')[0] + 'T12:00:00.000Z';
  }
}
```

Noon UTC (12:00Z) converts to 8am ET / 7am CT / 4am PT — same calendar day in all US timezones. The `isNaN` guard still rejects unparseable input.

---

## Render Helper — volParseDate (dashboard/index.html:13441–13453)

New helper added at the top of the Volunteers Tab section:

```js
// Parse volunteer dates without UTC-to-local timezone shift.
// ISO date-only ("2023-11-02") and midnight-UTC ("2026-06-09T00:00:00.000Z") are
// constructed as local dates so they don't slide to the previous day west of UTC.
// Slash dates and full timestamps fall back to new Date() (already correct).
function volParseDate(s, opts) {
  if (!s) return opts ? '' : '—';
  const datePart = s.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [y, m, d] = datePart.split('-');
    const local = new Date(+y, +m - 1, +d);
    return local.toLocaleDateString('en-US', opts || undefined);
  }
  return new Date(s).toLocaleDateString('en-US', opts || undefined);
}
```

Logic:
1. If input matches `YYYY-MM-DD` (with or without a `T...` suffix): extract the date portion, construct a **local** Date object → no UTC shift → correct day.
2. Otherwise (slash dates `5/9/26`, spelled-out `June 9th 2026`): fall back to `new Date(s)` → slash dates already parse as local midnight (correct); broken strings produce "Invalid Date" (existing behavior).

---

## Render Sites Updated (2 of 2 volunteer sites)

### Table render — dashboard/index.html:14229

Before:
```js
const dateStr = v.submitted_at ? new Date(v.submitted_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '';
```

After:
```js
const dateStr = v.submitted_at ? volParseDate(v.submitted_at, { month: '2-digit', day: '2-digit', year: '2-digit' }) : '';
```

### Other-talents modal — dashboard/index.html:15217

Before:
```js
const date = v.submitted_at ? new Date(v.submitted_at).toLocaleDateString() : '—';
```

After:
```js
const date = v.submitted_at ? volParseDate(v.submitted_at) : '—';
```

### NOT touched (confirmed):
- RG-request render at dashboard:11131 (`formatRelativeTime(request.submitted_at)`) — different table ✅
- RG-request detail at dashboard:11198 (`new Date(request.submitted_at).toLocaleString()`) — different table ✅
- Sort comparator at dashboard:14317 (`v.submitted_at || ''`) — string sort, unaffected ✅
- Default sort at dashboard:11111 (`new Date(b.submitted_at) - new Date(a.submitted_at)`) — numeric comparison, unaffected ✅

---

## Build + Restart

- `npm run build` (tsc): exit 0, clean.
- `systemctl restart shelter-app`: active.
- Dashboard static: 200, 618676 bytes.

---

## Verification (Eastern timezone simulation)

### Test 1: New edit stores noon UTC
PATCH JOHN DOE (id=9) with `todays_date: "2026-06-09"`:
- Stored: `2026-06-09T12:00:00.000Z` ✅ (noon UTC, not midnight)
- volParseDate renders: `06/09/26` ✅ (same day entered)

### Test 2: Existing bulk-import records (391) — the 391 fix
| Stored value | Old render (ET) | New render (ET) |
|-------------|----------------|-----------------|
| `2023-11-02` | `11/01/23` ❌ | `11/02/23` ✅ |
| `2025-05-04` | `05/03/25` ❌ | `05/04/25` ✅ |
| `2026-03-17` | `03/16/26` ❌ | `03/17/26` ✅ |

### Test 3: Full ISO timestamps (web_form) — fallback, unchanged
| Stored value | Render |
|-------------|--------|
| `2026-05-10T21:22:46.844Z` | `05/10/26` ✅ (same as before) |

The helper extracts `2026-05-10`, constructs local date → same result. No regression.

### Test 4: Slash dates (OCR) — fallback, unchanged
| Stored value | Render |
|-------------|--------|
| `5/9/26` | `05/09/26` ✅ |
| `06/13/2026` | `06/13/26` ✅ |

Slash dates don't match the `YYYY-MM-DD` regex → fall back to `new Date()` → local midnight → correct.

### Test 5: Kayla's record
John already edited Kayla's date using the picker (stored `2026-06-08T00:00:00.000Z` via the old midnight-UTC code). With volParseDate, this now displays as `06/08/26` (correct — no off-by-one). If John re-edits to June 9, the new noon-UTC store will write `2026-06-09T12:00:00.000Z`.

### Cleanup
JOHN DOE (id=9) restored to original `submitted_at: '5/9/26'`.

---

## Deviations

None. Kayla's record was already edited by John (not by this implementation) — her `submitted_at` changed from `"June 9th 2026"` to `"2026-06-08T00:00:00.000Z"` before this session. The off-by-one fix means her date now displays correctly as `06/08/26`.

---

## Commit

```
df08153 volunteer: fix date off-by-one — store noon UTC, render helper extracts date portion as local (fixes 391 bulk-import records)
 2 files changed, 19 insertions(+), 3 deletions(-)
```

Only `server/src/server.ts` and `dashboard/index.html` committed (explicit `git add`, not `git add -A`).
