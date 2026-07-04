# Adoptions-Tab UI Re-Diagnosis

## 1. Current Adoptions Table Render

### Header (5 columns)

```html
<table class="profiles-table" id="adoptionsTable" style="display:none">
  <thead>
    <tr>
      <th>Date</th>
      <th>Applicant</th>
      <th>Animal(s)</th>
      <th>Species</th>
      <th>PDF</th>
    </tr>
  </thead>
  <tbody id="adoptionsTableBody"></tbody>
</table>
```

No sort headers, no search input, no checkboxes. Uses class `profiles-table` (shared CSS). [VERIFIED]

### Row Renderer — `loadAdoptionsData()`

```js
async function loadAdoptionsData() {
  // ... loading/empty state ...
  const resp = await gatedGet('/api/adoption-applications');
  const json = await resp.json();
  const rows = json.data || [];
  // ...
  const speciesLabel = { cat: 'Cat', dog: 'Dog', small_animal: 'Small Animal' };
  tbody.innerHTML = rows.map(a => {
    const dateStr = a.submittedAt
      ? new Date(a.submittedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
      : '—';
    const pdfCell = a.pdfUrl
      ? `<a href="#" onclick="event.preventDefault(); openGatedPdf(${a.id})" title="Open PDF">📄 View PDF</a>`
      : '—';
    return `<tr>
      <td>${dateStr}</td>
      <td>${escapeHtml(a.applicantName || '')}</td>
      <td>${escapeHtml(a.animalNamesInterested || '—')}</td>
      <td>${speciesLabel[a.animalType] || a.animalType || '—'}</td>
      <td>${pdfCell}</td>
    </tr>`;
  }).join('');
}
```

**Key facts:**
- Fetches via `gatedGet` (read-gate token) [VERIFIED]
- `a.id` available in each row (used by `openGatedPdf`) [VERIFIED]
- No data-id attribute on `<tr>` — UI build must add one for PATCH targeting [INFERRED]
- `rows` is the full array — will become the sort/filter source (needs caching, like `profilesCache`) [INFERRED]

### Sort State

**None.** No sort headers, no sort function, no cached data array. The Adoptions table is render-once from the API response. [VERIFIED]

---

## 2. API Response

### GET /api/adoption-applications

**Problem:** The GET route's `.map()` does NOT include the 6 new fields. It returns:

```js
{
  id, submittedAt, applicantName, animalNamesInterested, animalType,
  languageSubmitted, status, pdfUrl
}
```

**Missing from response:** `vet_ref`, `pers_ref`, `incomplete`, `concerns`, `notes`, `adopted`. [VERIFIED]

The `getAdoptionApplications()` DB function does `SELECT *`, so the columns exist in the query result. The GET route's `.map()` just doesn't pass them through. **UI build must add these 6 fields to the GET response `.map()`.** [VERIFIED]

### DB Schema (columns 87-92, added in Phase 1)

```
87|vet_ref|INTEGER|1|0|0        (0/1 boolean, default 0)
88|pers_ref|INTEGER|1|0|0       (0/1 boolean, default 0)
89|incomplete|INTEGER|1|0|0     (0/1 boolean, default 0)
90|concerns|INTEGER|1|0|0       (0/1 boolean, default 0)
91|notes|TEXT|0||0               (nullable text)
92|adopted|TEXT|0||0             (nullable text)
```
[VERIFIED via PRAGMA table_info]

### PATCH /api/adoption-applications/:id Response

On success: `{ success: true, data: <full row from SELECT *> }`

The `data` object uses **snake_case DB column names** (e.g., `vet_ref`, `pers_ref`, `submitted_at`, `applicant_name`), unlike the GET response which uses camelCase (`submittedAt`, `applicantName`). **The UI must handle this mismatch** — either normalize in the PATCH response or handle both conventions client-side. [VERIFIED]

---

## 3. Sort Pattern — Profiles Tab

### State Variables

```js
let profilesSortCol = 'name';
let profilesSortAsc = true;
```

### Sort Trigger (header onclick)

```html
<th class="sortable" onclick="sortProfilesBy('name')">Name <span class="sort-arrow" id="pf-sort-name"></span></th>
```

### Sort Function

```js
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

### Sort Comparator (inside renderProfilesTable)

```js
const dir = profilesSortAsc ? 1 : -1;
animals = [...animals].sort((a, b) => {
  let va = a[profilesSortCol];
  let vb = b[profilesSortCol];
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  // bioState: custom precedence order
  if (profilesSortCol === 'bioState') {
    return dir * ((bioStateOrder[ea] ?? -1) - (bioStateOrder[eb] ?? -1));
  }
  if (typeof va === 'string') return dir * va.localeCompare(vb);
  return dir * (va - vb);
});
```

**Arrow update:**
```js
document.querySelectorAll('[id^="pf-sort-"]').forEach(el => el.textContent = '');
const arrowEl = document.getElementById('pf-sort-' + profilesSortCol);
if (arrowEl) arrowEl.textContent = profilesSortAsc ? '▲' : '▼';
```

**Boolean/enum handling:** The sort treats numbers as `va - vb` (so 0/1 booleans sort correctly). Enum sort (like `bioState`) uses a custom precedence map `{ priority: 0, needed: 1, ... }`. The Adoptions `status` column needs a similar map: `{ pending: 0, in_progress: 1, declined: 2, approved: 3 }`. [VERIFIED]

---

## 4. Gated PATCH Pattern (from W1a)

Example — PATCH volunteer record:

```js
await gatedFetch(`/api/volunteers/${volEditingId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ formData, status: 'pending', notes }),
});
```

`gatedFetch` attaches `X-Gate-Token` on any method, does single 401→retry. For the adoption PATCH, the pattern will be:

```js
const resp = await gatedFetch(`/api/adoption-applications/${appId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ vet_ref: 1 }),  // example single-field update
});
const result = await resp.json();
```

[VERIFIED — gatedFetch is method-agnostic, already tested with PATCH/POST/DELETE in W1a]

---

## 5. Popup/Modal Pattern

### Pin-Modal (reusable overlay pattern)

```html
<div class="pin-modal-overlay" id="pinModal">
  <div class="pin-modal">
    <h3>🔒 Enter PIN</h3>
    <input type="password" id="pinInput" ...>
    <div class="pin-error" id="pinError">Incorrect PIN</div>
    <div class="pin-modal-buttons">
      <button class="cancel-btn" onclick="hidePinModal()">Cancel</button>
      <button class="submit-btn" onclick="submitPin()">Unlock</button>
    </div>
  </div>
</div>
```

**CSS:**
```css
.pin-modal-overlay { display: none; position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; }
.pin-modal-overlay.active { display: flex; }
.pin-modal { background: white; border-radius: 12px; padding: 24px 32px; min-width: 280px; ... }
```

**Show/hide:** Toggle `.active` class on the overlay. [VERIFIED]

### Health Assessment Modal (extended variant)

Uses the same `pin-modal-overlay` class with `pin-modal` expanded to `width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto;` for larger form content. Contains grid layout for fields. [VERIFIED]

Both patterns are suitable for the notes popup (free-text textarea + save/cancel) and the adopted popup (text input + save/cancel). [INFERRED]

---

## 6. Search Pattern

**No in-table search exists** in the Profiles tab or Adoptions tab. [VERIFIED]

The **Timeclock tab** has a search filter pattern:

```js
let tcSearchFilter = '';

function tcRenderTable() {
  const filter = tcSearchFilter.toLowerCase();
  const filtered = filter
    ? tcShiftsCache.filter(s => s.volunteer_name.toLowerCase().includes(filter))
    : tcShiftsCache;
  // render filtered rows...
}
```

The input triggers `tcSearchFilter = input.value; tcRenderTable();`. Simple `.includes()` substring match. [VERIFIED]

This is the pattern to mirror for the applicant search bar: cache the API data, filter by applicant name substring, re-render. [INFERRED]

---

## 7. Row Identity

`a.id` (integer) is available in the row render (used by `openGatedPdf(${a.id})`). For PATCH calls from checkbox/status/notes/adopted, the row's `data-id` attribute or a closure over `a.id` can carry the id. [VERIFIED]

---

## Summary — What the UI Build Needs

1. **Server GET route fix:** Add `vet_ref`, `pers_ref`, `incomplete`, `concerns`, `notes`, `adopted` to the GET `/api/adoption-applications` response `.map()` — use camelCase keys (`vetRef`, `persRef`, etc.) to match existing response convention, OR use snake_case consistently (the PATCH returns snake_case). [VERIFIED — must decide convention]

2. **Table header:** Expand from 5 columns to 15: Date, Applicant, Animal(s), Species, Status, Vet Ref, Pers Ref, Incomplete, Concerns, Notes, Adopted, PDF (and any others). Add `class="sortable" onclick="sortAdoptionsBy('...')"` to each.

3. **Row renderer:** Add checkbox cells (vet_ref, pers_ref, incomplete, concerns), status dropdown, notes/adopted popup triggers, with `data-id="${a.id}"` on each `<tr>`.

4. **Sort:** Mirror `sortProfilesBy` pattern with `adoptionsSortCol`/`adoptionsSortAsc`/`adoptionsCache`. Custom status order map.

5. **Search:** Mirror timeclock search pattern — `<input>` above table, filter by `applicantName.includes(query)`, re-render.

6. **PATCH on change:** Checkboxes → immediate `gatedFetch` PATCH on click. Status dropdown → PATCH on change. Notes/adopted → popup with save button → PATCH.

7. **Response convention mismatch:** GET returns camelCase (`applicantName`), PATCH returns snake_case (`applicant_name`). Either normalize the PATCH response server-side or handle both in the client.
