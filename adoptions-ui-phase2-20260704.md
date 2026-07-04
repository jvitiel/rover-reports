# Adoptions UI Phase 2: 15-Column Interactive Table

## PART 1 — GET Response Projection (server.ts)

Added 6 camelCase fields to the `.map()` in `GET /api/adoption-applications`:

```js
return {
  id: app.id,
  submittedAt: app.submitted_at,
  applicantName: app.applicant_name,
  animalNamesInterested: app.animal_names_interested || null,
  animalType: app.animal_type,
  languageSubmitted: app.language_submitted,
  status: app.status,
  vetRef: app.vet_ref,        // NEW
  persRef: app.pers_ref,      // NEW
  incomplete: app.incomplete,  // NEW
  concerns: app.concerns,      // NEW
  notes: app.notes || null,    // NEW
  adopted: app.adopted || null, // NEW
  pdfUrl: pdfFile ? `/adoption-pdfs/${pdfFile}` : null,
};
```

[VERIFIED — `SELECT *` already returns all columns; only the `.map()` projection was missing]

### TypeScript Type Fix (types.ts)

The `AdoptionApplication` interface was missing the 6 fields added in Phase 1's DB migration. Added:

```ts
// Review tracking (Phase 1)
vet_ref?: number;
pers_ref?: number;
incomplete?: number;
concerns?: number;
notes?: string;
adopted?: string;
```

[VERIFIED — build failed without this; `tsc` exit 0 after adding]

---

## PART 2 — Dashboard 15-Column Table

### 2a. Cache

```js
let adoptionsCache = null;
```

`loadAdoptionsData()` stores `json.data` into `adoptionsCache`. Each `<tr>` rendered with `data-id="${a.id}"`. Sort/search/PATCH all operate against `adoptionsCache`. [VERIFIED]

### 2b. 15-Column Header

```html
<tr>
  <th class="sortable" onclick="sortAdoptionsBy('submittedAt')">Date <span class="sort-arrow" id="ad-sort-submittedAt"></span></th>
  <th class="sortable" onclick="sortAdoptionsBy('applicantName')">Applicant <span class="sort-arrow" id="ad-sort-applicantName"></span></th>
  <th class="sortable" onclick="sortAdoptionsBy('animalName')">Animal(s) <span class="sort-arrow" id="ad-sort-animalName"></span></th>
  <th class="sortable" onclick="sortAdoptionsBy('species')">Species <span class="sort-arrow" id="ad-sort-species"></span></th>
  <th class="sortable" onclick="sortAdoptionsBy('vetRef')">Vet Ref <span class="sort-arrow" id="ad-sort-vetRef"></span></th>
  <th class="sortable" onclick="sortAdoptionsBy('persRef')">Pers Ref <span class="sort-arrow" id="ad-sort-persRef"></span></th>
  <th class="sortable" onclick="sortAdoptionsBy('incomplete')">Incomplete <span class="sort-arrow" id="ad-sort-incomplete"></span></th>
  <th class="sortable" onclick="sortAdoptionsBy('concerns')">Concerns <span class="sort-arrow" id="ad-sort-concerns"></span></th>
  <th>Notes</th>
  <th>PDF</th>
  <th class="sortable" onclick="sortAdoptionsBy('status')">Pending <span class="sort-arrow" id="ad-sort-status"></span></th>
  <th>In Progress</th>
  <th>Declined</th>
  <th>Approved</th>
  <th class="sortable" onclick="sortAdoptionsBy('adopted')">Adopted <span class="sort-arrow" id="ad-sort-adopted"></span></th>
</tr>
```

All 4 status columns share a single `sortAdoptionsBy('status')` on the Pending header (with arrow on `ad-sort-status`). Clicking it sorts by status precedence order. [VERIFIED]

### 2c. sortAdoptionsBy

```js
let adoptionsSortCol = 'submittedAt';
let adoptionsSortAsc = false; // newest first by default
const ADOPTIONS_STATUS_ORDER = { pending: 0, in_progress: 1, declined: 2, approved: 3 };

function sortAdoptionsBy(col) {
  if (adoptionsSortCol === col) {
    adoptionsSortAsc = !adoptionsSortAsc;
  } else {
    adoptionsSortCol = col;
    adoptionsSortAsc = true;
  }
  renderAdoptionsTable();
}
```

**Type-aware sort in `renderAdoptionsTable()`:**
- `status` → precedence map `ADOPTIONS_STATUS_ORDER`
- `animalName` → maps to `animalNamesInterested` field
- `species` → maps to display label via `ADOPTIONS_SPECIES_LABEL`
- `adopted` → coalesces to empty string for comparison
- Strings → `localeCompare`
- Numbers (boolean flags 0/1) → numeric `va - vb`
- Nulls → always sort last

Arrow update: `document.querySelectorAll('[id^="ad-sort-"]')` (scoped to adoptions arrows only). [VERIFIED]

### 2d. Row Render (15 cells)

```js
`<tr data-id="${a.id}">
  <td>${dateStr}</td>
  <td>${escapeHtml(a.applicantName || '')}</td>
  <td class="adoptions-animal-cell" title="${escapeHtml(animalFull)}">${escapeHtml(animalDisplay)}</td>
  <td>${speciesStr}</td>
  <td><input type="checkbox" ${ckVet} onchange="adoptionToggle(${a.id},'vet_ref',this)"></td>
  <td><input type="checkbox" ${ckPers} onchange="adoptionToggle(${a.id},'pers_ref',this)"></td>
  <td><input type="checkbox" ${ckInc} onchange="adoptionToggle(${a.id},'incomplete',this)"></td>
  <td><input type="checkbox" ${ckCon} onchange="adoptionToggle(${a.id},'concerns',this)"></td>
  <td style="text-align:center">${notesIndicator}</td>
  <td>${pdfCell}</td>
  <td><input type="radio" name="status-${a.id}" value="pending" ${stPending} onchange="adoptionStatusChange(${a.id},'pending')"></td>
  <td><input type="radio" name="status-${a.id}" value="in_progress" ${stInProgress} onchange="adoptionStatusChange(${a.id},'in_progress')"></td>
  <td><input type="radio" name="status-${a.id}" value="declined" ${stDeclined} onchange="adoptionStatusChange(${a.id},'declined')"></td>
  <td><input type="radio" name="status-${a.id}" value="approved" ${stApproved} onchange="adoptionStatusChange(${a.id},'approved')"></td>
  <td>${adoptedText}</td>
</tr>`
```

- **Animal(s):** Capped at 30 chars with `…` truncation; full text in `title=""` for hover. CSS class `adoptions-animal-cell` applies `text-overflow: ellipsis`. [VERIFIED]
- **Notes:** Display-only 📝 indicator if non-empty, blank otherwise. No click handler (Phase 3). [VERIFIED]
- **Adopted:** Display-only text. No popup yet (Phase 3). [VERIFIED]
- **Status radios:** Mutually exclusive via shared `name="status-${a.id}"` group per row. [VERIFIED]

### 2e. Gated PATCH Wiring

**Checkbox toggle — `adoptionToggle(id, field, checkbox)`:**

```js
async function adoptionToggle(id, field, checkbox) {
  const val = checkbox.checked ? 1 : 0;
  const resp = await gatedFetch(`/api/adoption-applications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [field]: val }),
  });
  // ...on success: update adoptionsCache[field] locally (snake→camelCase map)
  // ...on failure: revert checkbox + alert
}
```

Body uses **snake_case** field names (`vet_ref`, `pers_ref`, `incomplete`, `concerns`) matching the PATCH handler's validation. Cache update maps to **camelCase** (`vetRef`, `persRef`, etc.) via explicit `camelMap`. [VERIFIED]

**Radio status change — `adoptionStatusChange(id, newStatus)`:**

```js
async function adoptionStatusChange(id, newStatus) {
  const resp = await gatedFetch(`/api/adoption-applications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });
  // ...on success: update adoptionsCache[id].status locally
  // ...on failure: alert + re-render to revert radios
}
```

Both mirror the existing W1a volunteer PATCH pattern exactly: `gatedFetch(url, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...}) })`. [VERIFIED]

### 2f. Scoped CSS

```css
/* Adoptions table — scoped overrides (do not affect shared .profiles-table base) */
#adoptionsTable .adoptions-animal-cell {
  max-width: 30ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#adoptionsTable th { white-space: nowrap; font-size: 0.8rem; }
#adoptionsTable td { font-size: 0.85rem; }
#adoptionsTable input[type="checkbox"],
#adoptionsTable input[type="radio"] { cursor: pointer; }
.adoptions-search-bar { ... }
```

All `#adoptionsTable`-prefixed — cannot affect the Profiles table or any other `.profiles-table` consumer. [VERIFIED]

**Horizontal scroll:** Added `wrapper-scroll-x` class to the adoptions `<div class="profiles-table-wrapper">` wrapper. This enables `overflow-x: auto` for the 15-column layout. The existing `.profiles-table-wrapper.wrapper-scroll-x` CSS rule is shared but only activates when the class is present on the wrapper element. [VERIFIED]

### 2g. Applicant Search Bar

```html
<input type="text" class="adoptions-search-bar" id="adoptionsSearchInput"
  placeholder="Search by applicant name…" oninput="filterAdoptions()">
```

```js
function filterAdoptions() {
  renderAdoptionsTable();
}

// Inside renderAdoptionsTable():
const searchVal = (document.getElementById('adoptionsSearchInput').value || '').toLowerCase();
if (searchVal) {
  rows = rows.filter(a => (a.applicantName || '').toLowerCase().includes(searchVal));
}
```

Mirrors the timeclock search pattern: substring match on `applicantName`, re-renders from `adoptionsCache`. Clearing the input restores all rows. Stats line shows "Showing N of M" when filtered. [VERIFIED]

---

## Untouched Components

| Component | Location | Status |
|-----------|----------|--------|
| PATCH handler | `app.patch('/api/adoption-applications/:id')` in server.ts | **UNTOUCHED** [VERIFIED — no lines changed in that block] |
| `isGatedWrite` | server.ts | **UNTOUCHED** [VERIFIED] |
| `isGatedPath` | server.ts | **UNTOUCHED** [VERIFIED] |
| `gatedFetch` | `async function gatedFetch` in dashboard | **UNTOUCHED** [VERIFIED] |
| `.profiles-table` base CSS | Lines 2481+ in dashboard | **UNTOUCHED** [VERIFIED — only `#adoptionsTable`-scoped rules added] |

---

## Build Result

```
> shelter-apps@2.0.0 build
> tsc
Process exited with code 0.
```
Dashboard is static HTML — no build step. [VERIFIED]

## git diff --stat

```
 dashboard/index.html | 241 +++++++++++++++++++++++++++++++++++++++++++++------
 server/src/server.ts |   6 ++
 server/src/types.ts  |   8 ++
 3 files changed, 228 insertions(+), 27 deletions(-)
```

3 files: dashboard (table rebuild), server.ts (GET projection), types.ts (interface fix). [VERIFIED]

## Commit

```
[master 9f92722] Adoptions UI Phase 2: project new fields in GET, 15-col sortable table with
  checkbox/radio gated PATCH wiring, Animal(s) cap, applicant search
  (notes/adopted popups deferred to Phase 3)
 3 files changed, 228 insertions(+), 27 deletions(-)
```
