# Profiles Tab: Age Column + Words Removal — Diagnosis Report

**Date:** 2026-06-23  
**Type:** Read-only diagnosis  
**Scope:** Dashboard profiles table — add Age column, delete Words column

---

## 1. AGE DATA + FORMAT

### 1a. Does profiles-summary already include age?

**No.** The `/api/dashboard/profiles-summary` endpoint (server.ts:1362–1381) returns `dateOfBirth` but does NOT return the `age` string field. The SM animal object has both:

- `age` — a preformatted string from ShelterManager (`raw.ANIMALAGE`)  
  Source: `shelterManagerService.ts:57` → `age: raw.ANIMALAGE || 'Unknown'`
- `dateOfBirth` — an ISO date string from SM (`raw.DATEOFBIRTH`)  
  Source: `shelterManagerService.ts:66` → `dateOfBirth: raw.DATEOFBIRTH || ''`

The profiles-summary endpoint maps `sm.dateOfBirth` but not `sm.age`:  
Source: `server.ts:1368` → `dateOfBirth: sm.dateOfBirth || null,`

**The `age` field must be added** to the profiles-summary response, OR age must be computed client-side from `dateOfBirth` (already present).

### 1b. Raw age format — real examples across range

The `age` field is a string from SM in the format `"N years M months."` or `"N weeks."` or `"N months."` (trailing period):

| Code | Name | `age` value | `dateOfBirth` |
|------|------|-------------|---------------|
| S2026181 | Shamrock | `5 weeks.` | (young kitten) |
| S2026623 | Little Angel | `2 weeks.` | (neonate) |
| S2026154 | Anna | `8 months.` | (under 1 year) |
| S2026310 | Sorcha | `2 years 0 months.` | (adult) |
| A2023267 | Cookie | `8 years 6 months.` | (senior) |
| R2024018 | Ava | `8 years 11 months.` | (senior) |

Pattern: SM always produces `"X years Y months."` for ≥1yr, `"X months."` for ≥1mo, `"X weeks."` for <1mo. Trailing period always present.

### 1c. Existing age-format functions

**Matcher — `truncateAgeToYears()`** (`matcher-web/app.js:559–573`):
```js
function truncateAgeToYears(ageText) {
  if (!ageText) return '';
  const yearsMatch = ageText.match(/^(\d+)\s*years?/i);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1], 10);
    return `${years} ${years === 1 ? i18n('card.age_yr') : i18n('card.age_yrs')}`;
  }
  const monthsMatch = ageText.match(/^(\d+)\s*months?/i);
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1], 10);
    return `${months} ${months === 1 ? i18n('card.age_mo') : i18n('card.age_mos')}`;
  }
  return ageText;
}
```

This **truncates to the leading unit only**: "8 years 6 months." → "8 yrs"; "8 months." → "8 mos". Under-1-year animals show months or fall through to raw text. **Weeks are NOT handled** — a "5 weeks." input falls through to the raw string.

**Staff-PWA — `adopterTruncateAge()`** (`staff-pwa/app.js:3468–3480`):
```js
function adopterTruncateAge(ageText) {
  if (!ageText) return '';
  const yearsMatch = ageText.match(/^(\d+)\s*years?/i);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1], 10);
    return `${years} ${years === 1 ? 'yr' : 'yrs'}`;
  }
  const monthsMatch = ageText.match(/^(\d+)\s*months?/i);
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1], 10);
    return `${months} ${months === 1 ? 'mo' : 'mos'}`;
  }
  return ageText;
}
```

Same logic, hardcoded English (no i18n). Same gap: weeks fall through.

**Standard display format:** "X yrs" or "X mos". Under-1-year showing months. Under-1-month falls through to raw "N weeks." string (with trailing period — cosmetic issue).

**Server-side `normalizeAgeEn()`** (`server.ts:12542–12552`) handles years, months, AND weeks — used for bio generation, not display:
```js
function normalizeAgeEn(raw: string): string {
  const s = raw.replace(/\.\s*$/, '').trim();
  const yearMatch = s.match(/^(\d+)\s+years?/);
  if (yearMatch) return parseInt(yearMatch[1]) === 1 ? '1 year' : `${yearMatch[1]} years`;
  const monthMatch = s.match(/^(\d+)\s+months?/);
  if (monthMatch) return parseInt(monthMatch[1]) === 1 ? '1 month' : `${monthMatch[1]} months`;
  const weekMatch = s.match(/^(\d+)\s+weeks?/);
  if (weekMatch) return parseInt(weekMatch[1]) === 1 ? '1 week' : `${weekMatch[1]} weeks`;
  return s;
}
```

### 1d. Sorting — numeric age value

**`dateOfBirth`** is already in the profiles-summary response (`server.ts:1368`). This is an ISO date string parseable to epoch, enabling numeric sort (youngest→oldest = largest→smallest DOB timestamp).

**`ageInDays()`** exists server-side (`server.ts:2631–2637`):
```js
function ageInDays(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dobMs = new Date(dateOfBirth).getTime();
  if (isNaN(dobMs)) return null;
  return Math.floor((Date.now() - dobMs) / (1000 * 60 * 60 * 24));
}
```

**The SM animal also has `ageInYears`** (float, `shelterManagerService.ts:58`), but it's not in the profiles-summary response.

**For client-side sort:** `dateOfBirth` is already available. Sorting on `new Date(a.dateOfBirth) - new Date(b.dateOfBirth)` gives correct numeric age ordering. Alternatively, the server could add an `ageDays` integer field.

---

## 2. INSERT POINT: Location → [AGE] → Bio State

### Header row (`dashboard/index.html:5357–5365`):
```html
<th class="sortable" onclick="sortProfilesBy('location')">Location <span class="sort-arrow" id="pf-sort-location"></span></th>
<!-- AGE COLUMN GOES HERE -->
<th class="sortable" onclick="sortProfilesBy('bioState')">Bio State <span class="sort-arrow" id="pf-sort-bioState"></span></th>
```

Location is column 3 (0-indexed: Name=0, Species=1, Location=2).  
Bio State is column 4 (currently index 3).  
Age inserts at index 3, pushing Bio State to index 4.

### Body row render (`dashboard/index.html:15496–15507`, inside `renderProfilesTable()`):
```js
return `<tr>
  <td class="name-cell" title="${escapeHtml(a.shelterCode)}">${escapeHtml(a.name)}</td>
  <td class="species-cell">${escapeHtml(a.species || '—')}</td>
  <td class="location-cell" title="${escapeHtml(a.location || '')}">${escapeHtml(stripFosterPrefix(a.location))}</td>
  <!-- AGE <td> GOES HERE -->
  <td>${a.bioState || '—'}</td>
  <td>${a.profileCount}</td>
  <td>${dateStr}</td>
  <td class="author-cell">${escapeHtml(author)}</td>
  <td>${words}</td>
  <td class="${scoreClass}">${scoreStr}</td>
</tr>`;
```

---

## 3. WORDS COLUMN REMOVAL

### Header (`dashboard/index.html:5364`):
```html
<th class="sortable" onclick="sortProfilesBy('mostRecentWordcount')">Words <span class="sort-arrow" id="pf-sort-mostRecentWordcount"></span></th>
```

### Body cell (`dashboard/index.html:15504`, inside `renderProfilesTable()`):
```js
const words = a.mostRecentWordcount != null ? a.mostRecentWordcount : '—';
// ...
<td>${words}</td>
```

### Data source:
`mostRecentWordcount` is computed server-side in profiles-summary (`server.ts:1354–1357`):
```js
let mostRecentWordcount: number | null = null;
if (p?.mostRecentTranscript) {
  mostRecentWordcount = p.mostRecentTranscript.trim().split(/\s+/).length;
}
```
Returned in the response object at `server.ts:1373`.

### Dependencies — what must update when Words is removed:

1. **Colspan counts:** Two empty-state `<td colspan="9">` in the profiles table:
   - Loading state: `dashboard/index.html:5369` → `<td colspan="9">`
   - Empty filter state: `dashboard/index.html:15492` → `<td colspan="9">`
   
   Net change: +1 (Age) −1 (Words) = **no colspan change needed** (stays at 9).

2. **Sort handler for Words:** `sortProfilesBy('mostRecentWordcount')` — the onclick is on the `<th>` being removed, so it goes away with it. The sort comparator in `sortProfilesBy()` is generic (uses `a[profilesSortCol]` dynamically), so no comparator code needs removing. However, if the current sort column IS `mostRecentWordcount` at removal time, the default `profilesSortCol = 'profileCount'` (`dashboard/index.html:15354`) handles that — no code path references `'mostRecentWordcount'` outside the `<th>` onclick.

3. **Author sidebar "Avg Words" column** (`dashboard/index.html:5385`):
   ```html
   <tr><th>Author</th><th>Profiles</th><th>Avg Words</th><th>Avg Score</th></tr>
   ```
   This is the **author summary sidebar**, not the main profiles table. It uses `profilesCache.authors[].avgWords`. This is a separate table and should NOT be removed (it's a useful author metric). The Words column removal applies only to the per-animal main table.

4. **Server-side `mostRecentWordcount`:** The field can remain in the API response (used by the author sidebar's avgWords computation and potentially useful). Or it can be removed — but no urgency since it's lightweight.

5. **No filter, export, or other consumer** references `mostRecentWordcount` outside the main table `<th>`/`<td>` and the author sidebar.

---

## 4. SORT MECHANISM

The sort function (`dashboard/index.html:15407–15474`):

```js
let profilesSortCol = 'profileCount';
let profilesSortAsc = true;

function sortProfilesBy(col) {
  if (profilesSortCol === col) {
    profilesSortAsc = !profilesSortAsc;
  } else {
    profilesSortCol = col;
    profilesSortAsc = true;
  }
  renderProfilesTable();
}
```

Comparator inside `renderProfilesTable()` (`dashboard/index.html:15451–15472`):
```js
const dir = profilesSortAsc ? 1 : -1;
const bioStateOrder = { needed: 0, pending: 1, youth: 2, approved: 3 };
animals = [...animals].sort((a, b) => {
  let va = a[profilesSortCol];
  let vb = b[profilesSortCol];
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  if (profilesSortCol === 'bioState') {
    return dir * ((bioStateOrder[va] ?? -1) - (bioStateOrder[vb] ?? -1));
  }
  if (profilesSortCol === 'location') {
    return dir * stripFosterPrefix(va).localeCompare(stripFosterPrefix(vb));
  }
  if (typeof va === 'string') return dir * va.localeCompare(vb);
  return dir * (va - vb);
});
```

**Numeric sort feasibility for Age:**

Option A — **Sort on `dateOfBirth` (string, ISO date):** If the column key is `'dateOfBirth'`, the comparator hits the `typeof va === 'string'` branch and uses `localeCompare`. ISO date strings sort correctly with localeCompare (lexicographic = chronological for ISO-8601), so this works: oldest (smallest DOB) → newest. **This gives correct age sort without any comparator changes.**

Option B — **Add a numeric `ageDays` field:** Server computes `ageInDays(sm.dateOfBirth)` (integer), client sorts via `va - vb`. More explicit but requires server-side addition.

**Recommendation:** Option A is zero-comparator-change; the column onclick would be `sortProfilesBy('dateOfBirth')` and the display function formats the age string separately. Option B is cleaner semantically. Either works.

---

## 5. WIDTH

### Current width behavior:
```css
.profiles-table-wrapper {
  width: fit-content;         /* dashboard/index.html:2473 */
  padding-right: 32px;
}
.profiles-table {
  table-layout: auto;         /* dashboard/index.html:2479 */
}
```

`fit-content` + `table-layout: auto` means each column sizes to its content. Current 9 columns: Name (max 180px), Species (max 70px), Location (max 150px), Bio State, Profiles, Most Recent, Author (max 90px), **Words**, Score.

### Net change: +Age −Words
- **Words column** is a small integer (typically 2-4 digits, ~40-50px rendered).
- **Age column** with short format ("8 yrs", "5 mos", "12 wks") is similarly narrow (~50-60px).
- Net width delta: **roughly neutral**, possibly a few pixels narrower since the "Words" header text is wider than "Age".

The table stays at 9 columns, `fit-content` continues to work, no overflow or widening concern. The "X yr, Y mo" format requested is slightly wider than just "X yrs" (the current standard) — but still narrow enough for a single `nowrap` cell.

---

## Summary of Changes Needed

| Item | File | Lines | Change |
|------|------|-------|--------|
| Add `age` to API response | server.ts | ~1362 | Add `age: sm.age,` to return object |
| Add Age `<th>` | dashboard/index.html | after 5359 | New sortable header between Location and Bio State |
| Add Age `<td>` | dashboard/index.html | ~15499 (render fn) | New cell with formatted age |
| Add age format function | dashboard/index.html | JS section | `formatShortAge()` — parse "X years Y months." → "X yr, Y mo" |
| Remove Words `<th>` | dashboard/index.html | 5364 | Delete line |
| Remove Words `<td>` + variable | dashboard/index.html | 15500, 15504 | Delete `const words` + `<td>${words}</td>` |
| Colspans | dashboard/index.html | 5369, 15492 | **No change** (+1−1 = still 9) |
| Sort comparator | dashboard/index.html | 15451–15472 | No change if sorting on dateOfBirth (ISO string localeCompare works) |
