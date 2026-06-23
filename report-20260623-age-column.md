# Profiles Tab: Age Column Implementation Report

**Date:** 2026-06-23  
**Commit:** `d5b4199`  
**File changed:** `dashboard/index.html` (1 file, 21 insertions, 3 deletions)

---

## 1. Age Formatter — `formatShortAge(dateOfBirth)`

Added at `dashboard/index.html:15407–15423`, right before `sortProfilesBy()`:

```js
function formatShortAge(dateOfBirth) {
  if (!dateOfBirth) return '—';
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return '—';
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (now.getDate() < dob.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years >= 1) {
    return months > 0 ? `${years} yr, ${months} mo` : `${years} yr`;
  }
  if (months >= 1) return `${months} mo`;
  const days = Math.floor((now - dob) / (1000 * 60 * 60 * 24));
  const weeks = Math.max(1, Math.floor(days / 7));
  return `${weeks} wk`;
}
```

### Format cases:
- **≥1 year:** `"X yr, Y mo"` — omits months when 0 (e.g. `"3 yr"` not `"3 yr, 0 mo"`)
- **1–11 months:** `"X mo"`
- **<1 month:** `"X wk"` (minimum 1 wk) — covers the gap the old `truncateAgeToYears` missed
- **Missing/invalid DOB:** `"—"` (em dash, consistent with other empty cells)

No server/API change — computed client-side from `dateOfBirth` (already in profiles-summary response at `server.ts:1368`).

---

## 2. Header + Cell Additions

### Header (`dashboard/index.html:5360`):
```html
<th class="sortable" onclick="sortProfilesBy('dateOfBirth')">Age <span class="sort-arrow" id="pf-sort-dateOfBirth"></span></th>
```
Inserted between Location (`5359`) and Bio State (`5361`).

### Body cell (inside `renderProfilesTable()`, ~`15517`):
```js
const ageStr = formatShortAge(a.dateOfBirth);
// ...
<td>${ageStr}</td>
```
Inserted between the Location `<td>` and the Bio State `<td>`.

---

## 3. Sort on dateOfBirth

The Age column header calls `sortProfilesBy('dateOfBirth')`. The existing generic comparator handles it:

- `dateOfBirth` is an ISO-8601 string (e.g. `"2017-01-15T00:00:00"`)
- Hits the `typeof va === 'string'` branch → `localeCompare`
- ISO strings compare lexicographically = chronologically ✓
- Nulls sort last (existing null guard) ✓

**Direction implemented:**
- First click (▲ ascending): **oldest first** (earliest DOB at top = highest age)
- Second click (▼ descending): **youngest first** (latest DOB at top = lowest age)
- Arrow direction matches actual sort order ✓

No comparator code changes needed.

---

## 4. Words Column Removal

### Removed:
- **Header:** `<th class="sortable" onclick="sortProfilesBy('mostRecentWordcount')">Words ...</th>` (was line 5364)
- **Body variable:** `const words = a.mostRecentWordcount != null ? a.mostRecentWordcount : '—';` — deleted
- **Body cell:** `<td>${words}</td>` — deleted

### Not removed (intentionally preserved):
- **Author sidebar** `<th>Avg Words</th>` at line 5385 — separate table, separate purpose
- **Server-side** `mostRecentWordcount` computation — still in API response, used by author sidebar

### No Words-specific sort handler exists outside the removed `<th>` onclick. The generic comparator (`a[profilesSortCol]`) has no hardcoded `'mostRecentWordcount'` branch.

---

## 5. Colspan Reconciliation

| Location | Value | Status |
|----------|-------|--------|
| Loading state (line 5370) | `colspan="9"` | Correct (+1 Age −1 Words = net 0) |
| Empty filter state (line 15504) | `colspan="9"` | Correct |
| Error state (line 15376) | `colspan="9"` | Correct |

Column count: Name, Species, Location, **Age**, Bio State, Profiles, Most Recent, Author, Score = **9 columns** ✓

---

## 6. Verification — Live Dashboard

### Example ages from real data (profiles-summary API):

| Animal | DOB | Displayed Age | Category |
|--------|-----|---------------|----------|
| Sleepie (S2026487) | 2009-05-25 | **17 yr** | Senior |
| Donny (S2026134) | 2010-02-25 | **16 yr, 3 mo** | Senior |
| Jo March (S2026363) | 2026-03-28 | **2 mo** | Young (<1 yr) |
| Luna Boy (S2026690) | 2026-06-22 | **1 wk** | Very young (<1 mo) |

- No "0 yr, X mo" produced (correct: `years >= 1` guard with months > 0 check)
- No unformatted fall-through for weeks
- No crash on missing/invalid DOB (returns "—")
- All 508 animals have dateOfBirth — no "—" in current dataset

### Sort:
- Clicking Age header sorts by dateOfBirth correctly (oldest ↔ youngest toggle)
- Other column sorts (Name, Species, Location, Bio State, Profiles, Score) unaffected

### Width:
- Table width remains neutral — `fit-content` with `table-layout: auto`
- Age column is narrow (~50-60px for "17 yr" or "2 mo")
- Words column was similarly narrow — net swap is width-neutral
- No bleed into right sidebar panels

### Author sidebar:
- "Avg Words" column in author summary table unchanged ✓

---

## 7. Deviations

None. All changes confined to `dashboard/index.html`. No server.ts, matcher, or staff-pwa files touched.
