# Profiles Tab "Entered" Column — Diagnosis

## 1. DATA AVAILABILITY

### 1a. API Endpoint & Row Shape

The Profiles tab fetches from `GET /api/dashboard/profiles-summary` [VERIFIED via grep at `loadProfilesData()` in `dashboard/index.html`].

Response shape per animal (from live API call):

```json
{
  "shelterCode": "S2025966",
  "name": "Abe (Louie)",
  "species": "Cat",
  "location": "Foster::Holland Cox",
  "isAvailable": true,
  "bioState": "approved",
  "dateOfBirth": "2016-11-06T00:00:00",
  "profileCount": 3,
  "mostRecentDate": "2026-06-10T16:13:27.678Z",
  "mostRecentAuthor": "Aby Garcia",
  "mostRecentWordcount": 79,
  "mostRecentScore": 8,
  "scoreDetails": { "q1Color": true, ... }
}
```

[VERIFIED via `curl http://127.0.0.1:3000/api/dashboard/profiles-summary | jq '.data.animals[0]'`]

### 1b. Is an SM entry/intake date already in the profiles-summary response?

**No.** The response does NOT include `dateIntake`, `dateAvailableForAdoption`, or any other intake date field. [VERIFIED via live API response inspection and grep of the server-side response builder at server.ts around the `profiles-summary` handler — the return object maps only: `shelterCode`, `name`, `species`, `location`, `isAvailable`, `bioState`, `dateOfBirth`, `profileCount`, `mostRecentDate`, `mostRecentAuthor`, `mostRecentWordcount`, `mostRecentScore`, `scoreDetails`.]

### 1c. Where the SM intake date lives

The SM-sourced intake date is already available in the server, just not exposed in this endpoint. Two plausible SM date fields exist:

| # | Field in SM API | Mapped to in server | Sample value | Format | Semantics |
|---|-----------------|---------------------|--------------|--------|-----------|
| 1 | `DATEBROUGHTIN` | `sm.dateIntake` | `2025-11-06T00:00:00` | ISO-8601 datetime (time always `T00:00:00`) | **Date the animal was brought into / entered the shelter** — this is SM's intake date. [VERIFIED via `normalizeAnimal()` in `shelterManagerService.ts`: `dateIntake: raw.DATEBROUGHTIN \|\| ''`] |
| 2 | `DATEAVAILABLEFORADOPTION` | `sm.dateAvailableForAdoption` | `2025-11-20T10:21:07.686752` | ISO-8601 datetime (has nonzero time component, sub-second precision) | **Date the animal became available for adoption** — typically days/weeks after intake (after hold period, vetting). [VERIFIED via same `normalizeAnimal()` function] |

Both are fetched from SM via `json_shelter_animals` API call [VERIFIED via `shelterManagerService.ts`] and cached in the `smAnimals` object that the `profiles-summary` handler already receives (it does `const smAnimals = await fetchAnimals({ includeUnavailable: true })`). Neither is stored in the local DB's `animal_metadata` table — that table has no intake/entry date column [VERIFIED via `.schema animal_metadata`].

The `/api/animals` endpoint already exposes BOTH fields per animal [VERIFIED via live `curl /api/animals?limit=1`], and a separate endpoint in `server.ts` at a different route also maps `dateIntake: smAnimal.dateIntake` [VERIFIED via grep, line 1306]. The `profiles-summary` handler simply omits them from its return object.

### 1d. Verdict

**The SM intake date (`DATEBROUGHTIN` → `dateIntake`) is already fetched by the server and present in the `smAnimals` array that the profiles-summary handler uses. It is NOT in the API response — it needs a one-line addition to the response builder.** This is a minimal backend change (add `dateIntake: sm.dateIntake || null` to the return object) plus a frontend column addition. No new DB tables, no sync changes, no new API calls needed.

---

## 2. COLUMN + SORT PATTERN

### 2a. Table header and row rendering

**Header row** (from `dashboard/index.html`, inside `<table class="profiles-table" id="profilesTable">`):

```html
<tr>
  <th class="sortable" onclick="sortProfilesBy('name')">Name <span class="sort-arrow" id="pf-sort-name"></span></th>
  <th class="sortable" onclick="sortProfilesBy('species')">Species <span class="sort-arrow" id="pf-sort-species"></span></th>
  <th class="sortable" onclick="sortProfilesBy('location')">Location <span class="sort-arrow" id="pf-sort-location"></span></th>
  <th class="sortable" onclick="sortProfilesBy('dateOfBirth')">Age <span class="sort-arrow" id="pf-sort-dateOfBirth"></span></th>
  <th class="sortable" onclick="sortProfilesBy('bioState')">Bio State <span class="sort-arrow" id="pf-sort-bioState"></span></th>
  <th class="sortable" onclick="sortProfilesBy('profileCount')">Profiles <span class="sort-arrow" id="pf-sort-profileCount"></span></th>
  <th class="sortable" onclick="sortProfilesBy('mostRecentDate')">Most Recent <span class="sort-arrow" id="pf-sort-mostRecentDate"></span></th>
  <th class="sortable" onclick="sortProfilesBy('mostRecentAuthor')">Author <span class="sort-arrow" id="pf-sort-mostRecentAuthor"></span></th>
  <th class="sortable" onclick="sortProfilesBy('mostRecentScore')">Score <span class="sort-arrow" id="pf-sort-mostRecentScore"></span></th>
</tr>
```

[VERIFIED via read of dashboard/index.html]

**New "Entered" column would be inserted between Location (`sortProfilesBy('location')`) and Age (`sortProfilesBy('dateOfBirth')`).**

**Row rendering** (from `renderProfilesTable()` function — Location and Age cells):

```javascript
const rows = animals.map(a => {
  // ...
  const ageStr = formatShortAge(a.dateOfBirth);
  // ...
  return `<tr>
    <td class="name-cell" title="${escapeHtml(a.shelterCode)}">...</td>
    <td class="species-cell">${escapeHtml(a.species || '—')}</td>
    <td class="location-cell" title="${escapeHtml(a.location || '')}">${escapeHtml(stripFosterPrefix(a.location))}</td>
    <!-- NEW "Entered" <td> would go here -->
    <td>${ageStr}</td>
    <td>${a.bioState...}</td>
    ...
  </tr>`;
});
```

[VERIFIED via read of `renderProfilesTable()` in dashboard/index.html]

Also update the colspan in the loading/empty-state `<tr>` from 9 to 10.

### 2b. Sort mechanism

**Sort handler** (`sortProfilesBy` function):

```javascript
function sortProfilesBy(col) {
  if (profilesSortCol === col) {
    profilesSortAsc = !profilesSortAsc;  // toggle direction on re-click
  } else {
    profilesSortCol = col;
    profilesSortAsc = true;  // new column starts ascending
  }
  renderProfilesTable();
}
```

**Sort comparator** (inside `renderProfilesTable()`):

```javascript
animals = [...animals].sort((a, b) => {
  let va = a[profilesSortCol];
  let vb = b[profilesSortCol];
  // Nulls always sort last
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  // Special cases for bioState and location
  if (profilesSortCol === 'bioState') { /* custom order map */ }
  if (profilesSortCol === 'location') { return dir * stripFosterPrefix(va).localeCompare(stripFosterPrefix(vb)); }
  // Generic: string → localeCompare, number → numeric subtract
  if (typeof va === 'string') return dir * va.localeCompare(vb);
  return dir * (va - vb);
});
```

[VERIFIED via read of the sort block in dashboard/index.html]

**Date sort behavior:** The `dateIntake` value is an ISO-8601 string like `"2025-11-06T00:00:00"`. The generic string comparator (`localeCompare`) **will sort ISO-8601 date strings chronologically correctly** because ISO-8601 is lexicographically ordered. No custom date comparator needed — it will Just Work with the existing sort logic, as long as the column key matches the field name on the animal object (e.g. `sortProfilesBy('dateIntake')`).

The `dateOfBirth` column (Age) already works this way — it sorts by the raw `dateOfBirth` ISO string via `localeCompare`. [VERIFIED: `dateOfBirth` is a string field, and no special-case sort exists for it in the comparator, so it falls through to the `typeof va === 'string'` branch.]

---

## 3. WIDTH + OVERFLOW CSS

### 3a. Current CSS for the table and wrapper

```css
.profiles-table-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  overflow: hidden;           /* ← blocks horizontal scroll currently */
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  border-right: 2px solid var(--accent);
  border-bottom: 2px solid var(--accent);
  width: fit-content;
  max-width: 100%;
}
.profiles-table {
  border-collapse: collapse;
  font-size: 0.8rem;
  table-layout: auto;         /* columns size to content */
}
.profiles-table th,
.profiles-table td {
  font-size: 0.75rem;
  font-weight: normal;
  color: var(--gray-700);
  text-align: center;
  padding: 5px 6px;
  vertical-align: middle;
  border: 1px solid var(--gray-200);
  white-space: nowrap;        /* prevents cell wrapping */
}
```

[VERIFIED via read of CSS block in dashboard/index.html]

**Current state:** The wrapper has `overflow: hidden` and `max-width: 100%`. There is NO horizontal scrollbar currently. `width: fit-content` makes the wrapper shrink to the table's natural width, and `max-width: 100%` caps it at the parent's width. The `overflow: hidden` clips anything wider. The `white-space: nowrap` on cells means adding a column will widen the table, and if it exceeds `max-width: 100%`, the extra content will be clipped (not scrollable).

**Parent container:** The wrapper sits inside `.profiles-main { flex: 1; min-width: 0; }` which is inside `.profiles-content-layout { display: flex; gap: 16px; }`. The sidebar is `flex: 0 0 280px`. So the main area takes remaining width minus 280px sidebar.

**To add horizontal scroll:** Change `overflow: hidden` to `overflow-x: auto` (or `overflow: auto`) on `.profiles-table-wrapper`. Keep `max-width: 100%` so the wrapper doesn't exceed parent width. The table with `table-layout: auto` and `white-space: nowrap` will naturally exceed the wrapper width, triggering the scrollbar.

### 3b. Shared CSS classes

**Yes — the `.profiles-table-wrapper` and `.profiles-table` classes are shared with the Adoptions tab.** [VERIFIED via grep: the Adoptions tab at line 5425 uses `<div class="profiles-table-wrapper"><table class="profiles-table" id="adoptionsTable">`.]

Changing `overflow: hidden` → `overflow-x: auto` on `.profiles-table-wrapper` will also affect the Adoptions table. This is likely fine (the Adoptions table is narrower — 5 columns — and won't trigger a scrollbar unless the viewport is very narrow). But if isolation is needed, scope the change with `#profilesTable` parent selector or add a modifier class.

No other tabs outside Profiles and Adoptions use these classes. [VERIFIED via grep count: 3 occurrences of `profiles-table-wrapper` in the file — 1 CSS definition, 1 Profiles tab, 1 Adoptions tab.]
