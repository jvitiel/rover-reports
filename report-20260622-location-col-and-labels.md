# Location Column + Filter Labels — Diagnosis

**Date:** 2026-06-23 02:23 UTC  
**Mode:** Read-only

---

## PROJECT 1 — Location Column in Profiles Table

### 1. Strip Location Source

**dashboard/index.html:7210-7211:**
```javascript
const location = animal.location || animal.smData?.location || '';
const locationHtml = location ? `<span class="location-badge">📍 ${escapeHtml(location)}</span>` : '';
```

The field is `animal.location` — a plain string from the SM API. No prefix stripping, no transform. Examples: `"Dog Kennel"`, `"Foster::Karen Meyers-Njenga"`, `"Cat Room"`. The `"Foster::"` prefix is NOT stripped for display — it renders as-is with the 📍 pin. (If John sees just "Karen Meyers-Njenga" without the "Foster::" prefix, that's because some locations come from SM without the prefix — the field value varies by animal.)

### 2. Profiles Table Render

**Table header — dashboard/index.html:5350-5358:**
```html
<th class="sortable" onclick="sortProfilesBy('name')">Name <span class="sort-arrow" id="pf-sort-name"></span></th>
<th class="sortable" onclick="sortProfilesBy('species')">Species <span class="sort-arrow" id="pf-sort-species"></span></th>
<th class="sortable" onclick="sortProfilesBy('bioState')">Bio State <span class="sort-arrow" id="pf-sort-bioState"></span></th>
<th class="sortable" onclick="sortProfilesBy('profileCount')">Profiles ...</th>
... (+ Most Recent, Author, Words, Score)
```

**Data source — server.ts:1362-1369 (profiles-summary endpoint):**
```javascript
return {
  shelterCode: sm.shelterCode,
  name: sm.name,
  species: sm.species,
  location: sm.location,       // ← ALREADY IN THE DATA
  isAvailable: sm.isAvailable,
  bioState: computeBioState(...),
  ...
};
```

**`a.location` is ALREADY in `profilesCache.animals`.** It's used for the location filter at line 15431-15434:
```javascript
if (profilesLocationFilter === 'shelter') {
  animals = animals.filter(a => !isFosterLocation(a.location) && ...);
} else if (profilesLocationFilter === 'foster') {
  animals = animals.filter(a => isFosterLocation(a.location));
}
```

**No API change needed.** The per-row data object already has `a.location`.

**Row render — dashboard/index.html:15481-15488:**
```javascript
return `<tr>
  <td class="name-cell" title="${escapeHtml(a.shelterCode)}">${escapeHtml(a.name)}</td>
  <td class="species-cell">${escapeHtml(a.species || '—')}</td>
  <td>${a.bioState || '—'}</td>          ← INSERT LOCATION COLUMN BEFORE THIS
  <td>${a.profileCount}</td>
  ...
```

**Insert point:** New `<td>` between the Species cell (line 15483) and Bio State cell (line 15484). In the header, new `<th>` between Species (line 5352) and Bio State (line 5353).

### 3. Sorting

**sortProfilesBy — dashboard/index.html:15399-15407:**
```javascript
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

**Comparator — dashboard/index.html:15445-15455:**
```javascript
animals = [...animals].sort((a, b) => {
  let va = a[profilesSortCol];
  let vb = b[profilesSortCol];
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  if (profilesSortCol === 'bioState') {
    return dir * ((bioStateOrder[va] ?? -1) - (bioStateOrder[vb] ?? -1));
  }
  if (typeof va === 'string') return dir * va.localeCompare(vb);
  return dir * (va - vb);
});
```

The sort uses `a[profilesSortCol]` as a dynamic property lookup. Since `location` is a string, it would automatically use `va.localeCompare(vb)` — **alphabetical sort works out of the box.** Just need:
- Header: `<th class="sortable" onclick="sortProfilesBy('location')">Location <span class="sort-arrow" id="pf-sort-location"></span></th>`
- Row: `<td>${escapeHtml(a.location || '—')}</td>`

No new sort logic needed.

### 4. Width

**dashboard/index.html:2464-2474 (.profiles-table-wrapper):**
```css
.profiles-table-wrapper {
  width: fit-content;
  padding-right: 32px;
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  ...
}
```

**`width: fit-content`** — the wrapper sizes to the table's natural width. Adding a column makes the table wider, and the wrapper follows. The parent `.profiles-main` has no max-width constraint (it's a flex child). **The table will grow to accommodate the new column automatically.** The `colspan="8"` in the loading/empty-state `<td>` (line 5361, 15472) should be bumped to `colspan="9"`.

---

## PROJECT 2 — Relabel Two Filter Buttons (Media Tab)

### Button Markup

**dashboard/index.html:5263:**
```html
<button class="profiles-filter-btn active" onclick="setAdoptionStatusFilter('adoptable')" id="af-adoptable">Adoptable &amp; Pending</button>
```

**dashboard/index.html:5264:**
```html
<button class="profiles-filter-btn" onclick="setAdoptionStatusFilter('pending')" id="af-pending">Pending Only</button>
```

### Filter Logic Confirmation

**setAdoptionStatusFilter — dashboard/index.html:7055-7067:**
```javascript
function setAdoptionStatusFilter(state) {
  currentAdoptionStatusFilter = state;
  document.querySelectorAll('#adoptionStatusPill .profiles-filter-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(state === 'all' ? 'af-all' : state === 'pending' ? 'af-pending' : 'af-adoptable');
  if (activeBtn) activeBtn.classList.add('active');
  ...
}
```

The logic uses the `state` argument (`'all'`/`'pending'`/`'adoptable'`) and element IDs (`af-all`/`af-pending`/`af-adoptable`), **NOT the button label text.** Changing the display text is purely cosmetic — filter behavior is unaffected.

**Changes:**
- Line 5263: `Adoptable &amp; Pending` → `Adoptable &amp; Pending Adoption`
- Line 5264: `Pending Only` → `Pending Adoptions Only`

Both are static HTML label strings, not i18n. No JS references the label text.
