# Adoptions Tab Table Enhancement — Pre-Build Diagnosis

## 1. Render Source + Row Identity

**Endpoint:** `GET /api/adoption-applications` in `server.ts`, symbol `app.get('/api/adoption-applications', ...)` [VERIFIED]

**Server function:** calls `getAdoptionApplications()` from `localDatabase.ts` which runs `SELECT * FROM adoption_applications ORDER BY submitted_at DESC` [VERIFIED]

**Per-row object shape returned to frontend:**
```js
{
  id,                       // adoption_applications.id (INTEGER PK)
  submittedAt,              // submitted_at
  applicantName,            // applicant_name
  animalNamesInterested,    // animal_names_interested (nullable)
  animalType,               // animal_type
  languageSubmitted,        // language_submitted
  status,                   // status (currently always 'new')
  pdfUrl                    // constructed from PDF directory scan, nullable
}
```
[VERIFIED — symbol `data = applications.map(app => { ... })` in server.ts GET handler]

**Row primary key:** `id` (INTEGER, autoincrement PK on `adoption_applications`). Available to the frontend as `a.id` in the map callback. [VERIFIED]

## 2. Current Table Markup

**Table wrapper classes:** `div.profiles-table-wrapper > table.profiles-table#adoptionsTable` — **same CSS classes** as the Profiles tab table (`profiles-table-wrapper`, `profiles-table`). [VERIFIED]

**⚠️ Shared-class risk:** Any CSS targeting `.profiles-table th`, `.profiles-table td`, or `.profiles-table-wrapper` will affect BOTH the Profiles and Adoptions tables. Column-width changes (e.g. Animal(s) column max-width ~30ch) must be scoped by table id (`#adoptionsTable`) or use inline styles, not bare `.profiles-table` selectors. [VERIFIED]

**Current header row:**
```html
<thead>
  <tr>
    <th>Date</th>
    <th>Applicant</th>
    <th>Animal(s)</th>
    <th>Species</th>
    <th>PDF</th>
  </tr>
</thead>
```
[VERIFIED — symbol `<table class="profiles-table" id="adoptionsTable">`]

**Row rendering function:** `loadAdoptionsData()` — an async function that fetches via `gatedGet('/api/adoption-applications')`, parses `json.data`, and builds `<tr>` rows via `rows.map(a => ...)`. Rows are inserted as `tbody.innerHTML = rows.map(...).join('')`. [VERIFIED]

**Current row template:**
```js
`<tr>
  <td>${dateStr}</td>
  <td>${escapeHtml(a.applicantName || '')}</td>
  <td>${escapeHtml(a.animalNamesInterested || '—')}</td>
  <td>${speciesLabel[a.animalType] || a.animalType || '—'}</td>
  <td>${pdfCell}</td>
</tr>`
```
[VERIFIED]

## 3. Sort Pattern

**Adoptions table:** NO sorting currently. Headers are plain `<th>` without `sortable` class or onclick handlers. [VERIFIED]

**Profiles tab pattern to mirror:** `sortProfilesBy(col)` function + `renderProfilesTable()` re-render. Pattern:

```js
// State variables
let profilesSortCol = 'profileCount';
let profilesSortAsc = true;

// Toggle function
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
[VERIFIED]

**Header markup pattern:**
```html
<th class="sortable" onclick="sortProfilesBy('name')">Name <span class="sort-arrow" id="pf-sort-name"></span></th>
```
[VERIFIED]

**CSS:** `.profiles-table th.sortable` already styled with cursor:pointer + hover. Since Adoptions uses the same `.profiles-table` class, the `sortable` CSS will apply automatically — no new CSS needed for the sort cursor/hover. [VERIFIED]

**Sort comparison logic (relevant types):**
- Strings: `va.localeCompare(vb)` [VERIFIED]
- Numbers: `va - vb` [VERIFIED]
- Special: `bioState` uses a custom precedence map [VERIFIED]
- Nulls: always sort last (`if (va == null) return 1`) [VERIFIED]
- **No existing boolean sort** — booleans (0/1 integers) will sort correctly via numeric comparison (`va - vb`), since they're INTEGER 0/1 columns. The status enum needs a custom precedence map like bioState. [INFERRED]

**Arrow indicators:** After sort, clears all `[id^="pf-sort-"]` spans and sets the active one to `▲` or `▼`. The Adoptions table will need its own id prefix (e.g. `ad-sort-`). [VERIFIED]

## 4. Schema — Current Columns & New Columns Needed

**`PRAGMA table_info(adoption_applications)` — 87 columns total.** [VERIFIED]

**Existing columns that overlap with proposed names:**

| Proposed Name | Collision? | Existing Column | Current Use |
|---------------|-----------|-----------------|-------------|
| `status` | **YES — EXISTS** | `status TEXT NOT NULL DEFAULT 'new'` | Currently stores `'new'` on creation; never updated by dashboard. Values in DB: `'new'` only. |
| `notes` | No collision | — | — |
| `adopted` | No collision | — | — |
| `vet_ref` | No collision | — | — |
| `pers_ref` | No collision | — | — |
| `incomplete` | No collision | — | — |
| `concerns` | No collision | — | — |

**⚠️ `status` column already exists** with DEFAULT `'new'`. The proposed feature wants 4 states: `pending / in_progress / declined / approved`. This needs a migration to UPDATE existing rows from `'new'` → `'pending'` and change the DEFAULT. The existing `updateAdoptionApplicationStatus()` DB helper already writes to this column. The POST handler sets `status: 'new'` on insert. Both must be updated. [VERIFIED]

**New columns to add (6 columns, `status` is a modify):**

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `vet_ref` | INTEGER NOT NULL | 0 | Boolean flag |
| `pers_ref` | INTEGER NOT NULL | 0 | Boolean flag |
| `incomplete` | INTEGER NOT NULL | 0 | Boolean flag |
| `concerns` | INTEGER NOT NULL | 0 | Boolean flag |
| `notes` | TEXT | NULL | Free-text |
| `adopted` | TEXT | NULL | Animal name(s) when approved |

Plus: ALTER the existing `status` column's semantics (migrate `'new'` → `'pending'`, update DEFAULT in new-row creation code from `'new'` to `'pending'`).

**Row count:** 5 rows. Migration is trivial. [VERIFIED]

## 5. Write Path

**Existing update endpoint:** NONE exposed as an HTTP route. [VERIFIED — grep for PUT/PATCH/DELETE + "adoption" in server.ts found only `PUT /api/animals/:shelterCode/adoption-pending` which is the Profiles-tab toggle, not adoption_applications]

**Existing DB helpers:**
- `updateAdoptionApplicationStatus(id, status)` — updates `status` column only [VERIFIED]
- `markApplicationPdfGenerated(id)`, `markApplicationEmailSent(id)`, `markApplicationTranslated(id)` — internal flags only [VERIFIED]

**Need to build:** A new `PATCH /api/adoption-applications/:id` endpoint that accepts partial updates for: `status`, `vet_ref`, `pers_ref`, `incomplete`, `concerns`, `notes`, `adopted`. [INFERRED]

**PII gate:** `GET /api/adoption-applications` is gated via the `piiGate` middleware (checked at symbol `p === '/api/adoption-applications'` in the middleware path list). The new PATCH endpoint **must also be gated** with the same `X-Gate-Token` check. [VERIFIED]

**Dashboard `gatedGet` helper:** GET-only. [VERIFIED — symbol `async function gatedGet(url)` uses plain `fetch(url, opts)` with no method override]

**⚠️ A token-aware write helper is needed.** `gatedGet` hardcodes GET. The new PATCH calls need a `gatedFetch(url, options)` or `gatedPatch(url, body)` helper that attaches `X-Gate-Token` and sets `method: 'PATCH'`, `Content-Type: application/json`. Pattern:

```js
async function gatedFetch(url, options = {}) {
  await _tokenReady;
  if (_piiGateToken) {
    options.headers = { ...options.headers, 'X-Gate-Token': _piiGateToken };
  }
  let resp = await fetch(url, options);
  if (resp.status === 401) {
    await fetchToken();
    if (_piiGateToken) options.headers = { ...options.headers, 'X-Gate-Token': _piiGateToken };
    resp = await fetch(url, options);
  }
  return resp;
}
```
[INFERRED — modeled on existing `gatedGet`]

## 6. Existing Popup/Modal Pattern

**Primary modal pattern:** `.pin-modal-overlay` + `.pin-modal` — used for PIN entry, Health Assessment form, Seizure Record, and Report Date Picker. [VERIFIED]

**Pattern:**
```html
<!-- Overlay -->
<div class="pin-modal-overlay" id="myModal">
  <!-- Dialog box -->
  <div class="pin-modal" style="width: 90%; max-width: 600px;">
    <h3>Title</h3>
    <!-- Content: inputs, textareas, etc. -->
    <div class="pin-modal-buttons">
      <button class="cancel-btn" onclick="closeMyModal()">Cancel</button>
      <button class="submit-btn" onclick="submitMyModal()">Save</button>
    </div>
  </div>
</div>
```
[VERIFIED]

**Show/hide:**
```js
document.getElementById('myModal').classList.add('active');    // show
document.getElementById('myModal').classList.remove('active'); // hide
```
[VERIFIED — used at symbols `showPinModal`, `hidePinModal`, `showHealthAssessmentForm`, `closeReportDateModal`]

**CSS already exists:** `.pin-modal-overlay` (fixed fullscreen with backdrop), `.pin-modal` (centered card), `.pin-modal-buttons` (button row), `.cancel-btn` / `.submit-btn` styling. [VERIFIED]

**For Notes popup:** Reuse this pattern with a `<textarea>` inside.
**For Adopted popup:** Reuse with a `<input type="text">` for animal name(s).

**Alternative simpler pattern also present:** `report-date-modal-overlay` + `report-date-modal` — structurally identical to `pin-modal-overlay`, separate CSS class names but same visual behavior. The `pin-modal` classes are the more widely reused ones. [VERIFIED]

## 7. Search Pattern

**No existing in-table search/filter/scroll-to-row helper in the dashboard.** [VERIFIED — grep for `search`, `filter`, `scrollTo`, `highlightRow` found only: the QR code search box (unrelated, operates on animal cards not tables), and the filter pill buttons (species/bio state toggles, not text search)]

**Must build from scratch.** Suggested approach: an `<input type="text">` above the table that filters `rows` in the render function (case-insensitive match on `applicantName`), then highlights/scrolls to the first match. The Profiles tab has no equivalent to copy — this will be new UI. [INFERRED]

**Closest existing pattern for input styling:** The QR search input (`.search-qr-section .qr-input`) provides a styled text input with placeholder. The filter can be pure client-side since the full dataset is already loaded into the `rows` array. [VERIFIED]
