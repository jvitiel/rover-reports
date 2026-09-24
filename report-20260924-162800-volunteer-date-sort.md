# Volunteer Submitted-Date Sort Inconsistency — Diagnosis

**Date:** 2026-09-24  
**Type:** Read-only diagnosis (SELECT only, no changes)  
**Subject:** Rows cluster at top of Volunteers tab regardless of sort direction on "Submitted" column

---

## 1. Column + Type

**Column:** `submitted_at` — SQLite type `TEXT`, affinity `TEXT`.  
**Schema:** `PRAGMA table_info(volunteers)` → column index 10, `submitted_at TEXT NOT NULL`.

The server query that feeds the volunteer list is in:  
`/home/shelter/shelter-apps/server/src/localDatabase.ts:4885`
```sql
ORDER BY submitted_at DESC
```

There is no date parsing — SQLite compares the raw TEXT values lexicographically.

---

## 2. Format by Source

| Source | Row count | ISO format count | Slash format count | Dot format count | Dominant stored format |
|--------|-----------|------------------|--------------------|------------------|----------------------|
| web_form | 87 | 87 | 0 | 0 | `2026-09-24T15:52:45.125Z` (full ISO 8601) |
| bulk_import_2026 | 391 | 391 | 0 | 0 | `2023-11-02` or `2024-03-07T12:00:00.000Z` (ISO date or ISO datetime) |
| legacy-timeclock | 10 | 10 | 0 | 0 | `2026-05-14 21:47:29` (ISO-ish space-separated) |
| manual_entry | 11 | 8 | 3 | 0 | Mixed: 8× ISO, 3× `M/DD/YY` |
| paper_ocr | 41 | 27 | 13 | 1 | **Mixed:** 27× ISO, 13× `M/DD/YY` or `MM/DD/YY` or `MM/DD/YYYY`, 1× `M.DD.YY` |

### Representative raw values per source

**web_form:**
- `2026-05-10T21:22:46.844Z` (id 408)
- `2026-09-24T15:52:45.125Z` (latest)

**bulk_import_2026:**
- `2023-11-02` (id 11)
- `2024-03-07T12:00:00.000Z` (id 13)
- `1900-01-03` (id 310 — anomaly, see §4)

**paper_ocr (ISO rows):**
- `2026-05-09T12:00:00.000Z` (id 9)
- `2026-05-29T12:00:00.000Z` (id 432)

**paper_ocr (slash rows — the problem):**
- `5/30/26` (id 436)
- `05/30/26` (id 437)
- `05/11/26` (id 445)
- `4.27.26` (id 438 — dot-separated variant)

**manual_entry (slash rows):**
- `5/31/26` (id 428, 429, 430)

**⚠ Formats that differ:** `paper_ocr` has 14 rows (13 slash + 1 dot) using `M/DD/YY` or `MM/DD/YY` or `M.DD.YY` format. `manual_entry` has 3 rows using `M/DD/YY`. All other sources use exclusively ISO-style dates starting with `2` (year-first). The slash/dot formatted dates start with digits `0`–`6`, which sort before `2` only for `0` and `1`, and after `2` for `4`–`6`.

---

## 3. The Sort Code

### Server-side (SQL)

File: `/home/shelter/shelter-apps/server/src/localDatabase.ts:4885`
```typescript
sql += ` ORDER BY submitted_at DESC`;
```

This is a raw `TEXT ORDER BY` — SQLite does lexicographic comparison on the stored text. No date casting or `strftime()`.

### Client-side (dashboard JS)

File: `/home/shelter/shelter-apps/dashboard/index.html:13491` (the `getVal` function inside `volSortRows`)
```javascript
case 'submitted': return v.submitted_at || '';
```

File: `/home/shelter/shelter-apps/dashboard/index.html:13502–13510` (the comparator)
```javascript
rows.sort((a, b) => {
  const va = getVal(a);
  const vb = getVal(b);
  if (!va && !vb) return 0;
  if (!va) return 1;
  if (!vb) return -1;
  if (va < vb) return -1 * dir;
  if (va > vb) return 1 * dir;
  return 0;
});
```

**Both server and client sort the raw `submitted_at` string.** No `new Date()` parsing, no normalization. The `<` / `>` operators compare strings character-by-character (Unicode code point order).

---

## 4. The 01/03/00 Anomaly

Row id 310, source `bulk_import_2026`:
```
submitted_at = '1900-01-03'
```

This is an ISO-format date but with year `1900` — likely a placeholder or sentinel for "unknown date" inserted during the bulk import. It is NOT `01/03/00` in slash format; the dashboard renders it as `01/03/00` because the display formatter truncates the ISO date. The raw stored value is valid ISO but obviously not a real submission date.

Because `1900-01-03` starts with `1`, it sorts before all `2026-*` dates lexicographically, placing it near the top in ASC order and near the bottom in DESC — consistent with string sort behavior, not the "stuck at top" cluster.

---

## 5. Verdict

**Both (c): mixed-format string sort AND malformed/placeholder dates.** [VERIFIED]

### Primary cause: string sort across mixed date formats

Evidence:
- `submitted_at` is `TEXT` with no date affinity (PRAGMA table_info, col 10)
- Server sorts with bare `ORDER BY submitted_at DESC` (`localDatabase.ts:4885`) — lexicographic
- Client sorts with `va < vb` on raw string (`dashboard/index.html:13502`) — lexicographic
- Slash-format dates (`5/30/26`, `05/11/26`) start with ASCII digits `0`–`6`
- ISO dates (`2026-05-10T...`) start with `2`
- In lexicographic order: `0...` < `1...` < `2...` < `4...` < `5...` < `6...`

So in **DESC** order: `6/8/26` > `5/31/26` > `5/30/26` > `5/28/26` > `05/...` > `2026-09-...` > `2026-05-...` > `1900-...`

The slash-format dates cluster at the **top** in DESC because `5`, `6` > `2` (first character). In ASC, `0`-prefixed slash dates (`05/...`) cluster at the top because `0` < `2`. Either direction, a subset of non-ISO rows floats to the wrong end.

### Secondary cause: format inconsistency by entry path

- `paper_ocr`: 14/41 rows use slash/dot format (entered via OCR parsing that preserved the paper form's American date format)
- `manual_entry`: 3/11 rows use slash format
- `web_form`: 100% ISO (server timestamps `new Date().toISOString()`)
- `bulk_import_2026`: 100% ISO (with one `1900-01-03` placeholder at id 310)

### Affected row count

17 rows (14 paper_ocr + 3 manual_entry) have non-ISO date formats that sort incorrectly. 1 row (id 310) has a `1900` placeholder date.

### Sort line citations

- Server: `localDatabase.ts:4885` — `ORDER BY submitted_at DESC` [VERIFIED]
- Client: `dashboard/index.html:13491` — `return v.submitted_at || ''` (no Date parse) [VERIFIED]
- Client: `dashboard/index.html:13502` — `va < vb` string comparison [VERIFIED]
