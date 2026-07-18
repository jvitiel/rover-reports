# Adoptions Tab Table — Column-Change Diagnosis

Read-only inspection of `/home/shelter/shelter-apps/dashboard/index.html`.

---

## 1. STRUCTURE

### Full `<thead>` (15 columns, verbatim)

```html
<table class="profiles-table" id="adoptionsTable" style="display:none">
  <thead>
    <tr>
      <th class="sortable" onclick="sortAdoptionsBy('submittedAt')">Date <span class="sort-arrow" id="ad-sort-submittedAt"></span></th>
      <th class="sortable" onclick="sortAdoptionsBy('applicantName')">Applicant <span class="sort-arrow" id="ad-sort-applicantName"></span></th>
      <th class="sortable" onclick="sortAdoptionsBy('animalName')">Animal(s) <span class="sort-arrow" id="ad-sort-animalName"></span></th>
      <th class="sortable" onclick="sortAdoptionsBy('species')">Species <span class="sort-arrow" id="ad-sort-species"></span></th>
      <th class="sortable" onclick="sortAdoptionsBy('vetRef')">Vet Ref <span class="sort-arrow" id="ad-sort-vetRef"></span></th>
      <th class="sortable" onclick="sortAdoptionsBy('persRef')">Pers Ref <span class="sort-arrow" id="ad-sort-persRef"></span></th>
      <th class="sortable" onclick="sortAdoptionsBy('incomplete')">Incomp <span class="sort-arrow" id="ad-sort-incomplete"></span></th>
      <th class="sortable" onclick="sortAdoptionsBy('concerns')">Concerns <span class="sort-arrow" id="ad-sort-concerns"></span></th>
      <th>Notes</th>
      <th>PDF</th>
      <th class="sortable" onclick="sortAdoptionsBy('status')">Pending <span class="sort-arrow" id="ad-sort-status"></span></th>
      <th class="sortable" onclick="sortAdoptionsBy('status')">In Prog <span class="sort-arrow" id="ad-sort-status-ip"></span></th>
      <th class="sortable" onclick="sortAdoptionsBy('status')">Declined <span class="sort-arrow" id="ad-sort-status-dec"></span></th>
      <th class="sortable" onclick="sortAdoptionsBy('status')">Approved <span class="sort-arrow" id="ad-sort-status-app"></span></th>
      <th class="sortable" onclick="sortAdoptionsBy('adopted')">Adopted <span class="sort-arrow" id="ad-sort-adopted"></span></th>
    </tr>
  </thead>
  <tbody id="adoptionsTableBody"></tbody>
</table>
```
[VERIFIED — lines 4980-5000 of dashboard/index.html]

### Representative row rendering (from `renderAdoptionsTable()`, line 14834+)

```javascript
return `<tr data-id="${a.id}">
  <td>${dateStr}</td>
  <td>${escapeHtml(a.applicantName || '')}</td>
  <td class="adoptions-animal-cell" title="${escapeHtml(animalFull)}">${escapeHtml(animalDisplay)}</td>
  <td>${speciesStr}</td>
  <td><input type="checkbox" ${ckVet} onchange="adoptionToggle(${a.id},'vet_ref',this)"></td>
  <td><input type="checkbox" ${ckPers} onchange="adoptionToggle(${a.id},'pers_ref',this)"></td>
  <td><input type="checkbox" ${ckInc} onchange="adoptionToggle(${a.id},'incomplete',this)"></td>
  <td><input type="checkbox" ${ckCon} onchange="adoptionToggle(${a.id},'concerns',this)"></td>
  <td style="text-align:center;cursor:pointer" onclick="openAdoptionNotesModal(${a.id})">${notesIndicator}</td>
  <td>${pdfCell}</td>
  <td><input type="radio" name="status-${a.id}" value="pending" ${stPending} onchange="adoptionStatusChange(${a.id},'pending')"></td>
  <td><input type="radio" name="status-${a.id}" value="in_progress" ${stInProgress} onchange="adoptionStatusChange(${a.id},'in_progress')"></td>
  <td><input type="radio" name="status-${a.id}" value="declined" ${stDeclined} onchange="adoptionStatusChange(${a.id},'declined')"></td>
  <td><input type="radio" name="status-${a.id}" value="approved" ${stApproved} onchange="adoptionStatusChange(${a.id},'approved')"></td>
  <td onclick="openAdoptionAdoptedEditModal(${a.id})" style="cursor:pointer">${adoptedText}</td>
</tr>`;
```
[VERIFIED — lines 14857-14876 of dashboard/index.html]

### Width mechanism

- **`table-layout: auto`** — set on `.profiles-table` (line 2483). The browser auto-sizes all columns based on content. [VERIFIED]
- **No per-column fixed widths** — no `<th>` has a `width`, `min-width`, or `max-width` attribute or inline style. [VERIFIED]
- **One scoped override exists:** `#adoptionsTable .adoptions-animal-cell { max-width: 20ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }` (line 2517-2521) — only the Animal(s) column has a width constraint via a CSS class. [VERIFIED]
- **All `th` and `td`** have `white-space: nowrap` from the base `.profiles-table` rule (line 2498), so columns shrink to content width. The scoped override `#adoptionsTable th { white-space: nowrap; font-size: 0.8rem; }` re-applies this at larger font. [VERIFIED]

**To set character-based widths consistently:** Add scoped CSS rules under `#adoptionsTable` using `max-width: Nch; overflow: hidden; text-overflow: ellipsis;` — the same pattern already used for `.adoptions-animal-cell`. Since `table-layout: auto`, `max-width` on cells works as a soft cap; the browser can still grow cells if needed but ellipsis-truncates when content exceeds the cap. For a hard cap, change to `table-layout: fixed` + `width: Nch` on each `<th>`, but this would require width on ALL columns and is a bigger change.

---

## 2. Per-Column Edit Points

### 2a. APPLICANT

| Item | Value |
|------|-------|
| **`<th>`** | `<th class="sortable" onclick="sortAdoptionsBy('applicantName')">Applicant ...` (line 4985) |
| **Cell** | `<td>${escapeHtml(a.applicantName || '')}</td>` (line 14859) |
| **Current width** | Auto (no constraint). Content is the applicant's full name, rendered as plain text. |
| **Data field** | `a.applicantName` — comes from the API response, mapped from `applicant_name` column. |

[VERIFIED]

### 2b. SPECIES

| Item | Value |
|------|-------|
| **`<th>`** | `<th class="sortable" onclick="sortAdoptionsBy('species')">Species ...` (line 4987) |
| **Cell** | `<td>${speciesStr}</td>` (line 14861) |
| **Current width** | Auto (no constraint). |
| **Data field** | `speciesStr` is computed from a **local label map** on line 14720: |

```javascript
const ADOPTIONS_SPECIES_LABEL = { cat: 'Cat', dog: 'Dog', small_animal: 'Small Animal' };
```

Used at line 14841:
```javascript
const speciesStr = ADOPTIONS_SPECIES_LABEL[a.animalType] || a.animalType || '—';
```

And also used in the sort comparator at lines 14796-14797:
```javascript
va = ADOPTIONS_SPECIES_LABEL[a.animalType] || a.animalType;
vb = ADOPTIONS_SPECIES_LABEL[b.animalType] || b.animalType;
```

[VERIFIED]

**Where "Small Animal" comes from:** It is a hardcoded string in `ADOPTIONS_SPECIES_LABEL` on line 14720 of `dashboard/index.html`. It is NOT a shared function. It is NOT the server-side `SPECIES_LABEL` map (which uses uppercase: `'SMALL ANIMALS'`). It is NOT the PDF generator's `animalTypeMap` (which also maps to `'Small Animal'` but is in `pdfGenerator.ts` line 159).

**Is it shared?** No. `ADOPTIONS_SPECIES_LABEL` is:
- Defined once, at line 14720 of `dashboard/index.html`
- Referenced only twice in that same file (render + sort)
- Not referenced by any other file (staff-pwa, staging-staff, server, etc.)

Changing `small_animal: 'Small Animal'` to `small_animal: 'Small'` in this one map affects ONLY this table's display and sort. The PDF (`pdfGenerator.ts:159`) has its own independent `animalTypeMap` and would continue to show "Small Animal" in PDFs. The server's `SPECIES_LABEL` (uppercase, for matcher) is also independent. [VERIFIED — grep confirmed no other file references `ADOPTIONS_SPECIES_LABEL`]

### 2c. CONCERNS

| Item | Value |
|------|-------|
| **`<th>`** | `<th class="sortable" onclick="sortAdoptionsBy('concerns')">Concerns ...` (line 4991) — yes, literally "Concerns" (plural) |
| **Cell** | `<td><input type="checkbox" ${ckCon} onchange="adoptionToggle(${a.id},'concerns',this)"></td>` (line 14865) |
| **Current width** | Auto (no constraint). The cell is just a checkbox; the header text "Concerns" is the widest element. |

To change header → "Concern" (singular): edit the `<th>` text at line 4991. The `onchange` handler sends `'concerns'` (snake_case DB column name) — that does NOT change; it's the API field name, not the display label. The sort key is also `'concerns'` (JS property name) — also unchanged. [VERIFIED]

### 2d. PENDING — CRITICAL ANALYSIS

**"Pending" is a COLUMN HEADER, not a status value.**

The `<th>` at line 4993:
```html
<th class="sortable" onclick="sortAdoptionsBy('status')">Pending <span class="sort-arrow" id="ad-sort-status"></span></th>
```

The cell contains a radio button:
```html
<td><input type="radio" name="status-${a.id}" value="pending" ${stPending} onchange="adoptionStatusChange(${a.id},'pending')"></td>
```

The column header text "Pending" is a **cosmetic label** that visually labels the radio button column. The actual status value used in code is always the lowercase string `'pending'` — passed via `value="pending"` and `adoptionStatusChange(id, 'pending')`.

**The status enum values are:**
```javascript
const VALID_STATUSES = ['pending', 'in_progress', 'declined', 'approved'];  // server.ts:9518
const ADOPTIONS_STATUS_ORDER = { pending: 0, in_progress: 1, declined: 2, approved: 3 };  // dashboard:14721
```
[VERIFIED]

**Dependencies on the string "pending":**
- Backend: `status: 'pending'` is the default for new applications (server.ts:9218). VALID_STATUSES includes `'pending'` (server.ts:9518). The API validates against this list. [VERIFIED]
- Dashboard JS: `ADOPTIONS_STATUS_ORDER` maps `pending: 0` for sort ordering. Radio button `value="pending"` and `stPending = a.status === 'pending'`. [VERIFIED]
- The dashboard column header text "Pending" is PURELY cosmetic. Renaming the header to "Pend" changes only what the user sees above the radio button. It does NOT affect the `value` attribute, the `adoptionStatusChange` call, the sort order, or the backend status enum. [VERIFIED]

**Safe to rename header to "Pend":** Yes. Edit the `<th>` text only (line 4993). Do not touch the radio `value="pending"` or the `adoptionStatusChange(id, 'pending')` call. [VERIFIED]

### 2e. ANIMAL(S)

| Item | Value |
|------|-------|
| **`<th>`** | `<th class="sortable" onclick="sortAdoptionsBy('animalName')">Animal(s) ...` (line 4986) |
| **Cell** | `<td class="adoptions-animal-cell" title="${escapeHtml(animalFull)}">${escapeHtml(animalDisplay)}</td>` (line 14860) |
| **Current width** | `max-width: 20ch` via CSS class `.adoptions-animal-cell` (line 2517-2521). Already has `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` — the only column with a width constraint. |
| **Data field** | `a.animalNamesInterested` — truncated to 30 chars in JS with ellipsis: |

```javascript
const animalFull = a.animalNamesInterested || '—';
const animalDisplay = animalFull.length > 30 ? animalFull.slice(0, 28) + '…' : animalFull;
```
[VERIFIED — lines 14838-14839]

---

## 3. WIDTH MECHANISM

**Current state:** `table-layout: auto` on `.profiles-table`. No per-column widths on any `<th>`. One scoped CSS rule constrains the Animal(s) cell to `max-width: 20ch` with ellipsis. All other columns auto-size to content.

**How to set character-based widths consistently:**

Add scoped rules under `#adoptionsTable` following the existing `.adoptions-animal-cell` pattern:

```css
#adoptionsTable .adoptions-applicant-cell {
  max-width: Nch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Then add `class="adoptions-applicant-cell"` to the corresponding `<td>` in the row template. This is the exact pattern already used for the Animal(s) column.

Alternatively, for header-only narrowing (checkbox/radio columns where cell content is fixed-width), set `max-width` directly on the `<th>` via inline style or a scoped rule. The header is the widest element in those columns.

No `table-layout: fixed` change is needed for scoped narrowing. The `auto` layout respects `max-width` and `text-overflow: ellipsis` as already demonstrated by `.adoptions-animal-cell`. [VERIFIED]

---

## 4. BLAST RADIUS

### Is this table rendered elsewhere?

**No.** `#adoptionsTable` exists only in `dashboard/index.html`. The staff-pwa and staging-staff apps have zero references to `adoptionsTable` or adoption-tab-related code. The adoptions tab is dashboard-only. [VERIFIED — grep confirmed]

### Is the species-label logic shared?

**No.** `ADOPTIONS_SPECIES_LABEL` is defined and used only in `dashboard/index.html` (lines 14720, 14796-14797, 14841). Other maps exist independently:
- `pdfGenerator.ts:159` — `animalTypeMap: { small_animal: 'Small Animal' }` — used in PDF generation only
- `server.ts:4807` — `SPECIES_LABEL: { small_animal: 'SMALL ANIMALS' }` — used in the matcher AI prompt only

Changing `ADOPTIONS_SPECIES_LABEL` in the dashboard does not affect PDFs, matcher, or any other view. [VERIFIED]

### Is the status-label / header logic shared?

**No.** The column headers "Pending", "In Prog", "Declined", "Approved" are plain text in `<th>` tags. They are not referenced by any code. The status VALUES (`'pending'`, `'in_progress'`, `'declined'`, `'approved'`) are used by backend and frontend but are in `value` attributes and JS strings, not in the header text. Renaming headers is purely cosmetic. [VERIFIED]

### Other blast radius considerations:

- The `sortAdoptionsBy('concerns')` sort key is the JS property name `concerns`, not the header text. Renaming header "Concerns" → "Concern" does not affect sorting. [VERIFIED]
- The `adoptionToggle(id, 'concerns', this)` uses the snake_case DB column name. Not affected by header rename. [VERIFIED]
- No adoption-related CSS class names contain the word "Pending" or "Concerns". [VERIFIED]

---

## SUMMARY OF EDIT POINTS

| Change | File | Line(s) | What to edit | Blast radius |
|--------|------|---------|-------------|--------------|
| Applicant width | dashboard/index.html | 2517+ (CSS), 14859 (td class) | Add CSS rule + class on `<td>` | None |
| Species "Small" | dashboard/index.html | 14720 | `ADOPTIONS_SPECIES_LABEL` map value | None (map is local) |
| "Concerns" → "Concern" | dashboard/index.html | 4991 | `<th>` text only | None |
| "Pending" → "Pend" | dashboard/index.html | 4993 | `<th>` text only | None (header is cosmetic) |
| Animal(s) width | dashboard/index.html | 2517-2521 (CSS) | Adjust `max-width: 20ch` | None |
