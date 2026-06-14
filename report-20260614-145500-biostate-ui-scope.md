# bioState UI Build — Scoping Report

**Date:** 2026-06-14 14:55 ET  
**Type:** Read-only scoping for UI implementation  
**Status:** No changes made  

---

## PART 1 — MEDIA TAB TOOLBAR

### 1a. Toolbar HTML + CSS

The toolbar is the `.search-qr-section` container inside `.profiles-header-left`:

```html
<!-- dashboard/index.html:5125-5132 -->
<div class="search-qr-section">
  <input type="text" id="qrAnimalId" class="qr-input" placeholder="Shelter code or name"
         onkeypress="handleSearchKeypress(event)">
  <div class="search-qr-buttons">
    <button class="qr-btn find-btn" onclick="findAnimal()" id="findBtn">🔍 Find Animal</button>
    <button class="qr-btn print-btn" onclick="printQRCode()" id="qrPrintBtn">🏷️ Print QR Code</button>
  </div>
  <span class="old-bios-badge" id="oldBiosBadge">Old Bios: —</span>
</div>
```

CSS (dashboard/index.html:1750-1833):

```css
.search-qr-section {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 12px 16px;
  border-radius: 10px;
  box-shadow: var(--shadow-md);
  border-right: 2px solid var(--primary);
  border-bottom: 2px solid var(--primary);
}

.search-qr-section .qr-input {
  width: 180px;
  padding: 10px 14px;
  font-size: 0.9rem;
  border: 2px solid var(--gray-300);
  border-radius: 6px;
}

.search-qr-buttons {
  display: flex;
  gap: 8px;
}

.search-qr-buttons .qr-btn {
  padding: 10px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-qr-buttons .qr-btn.find-btn {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
}

.search-qr-buttons .qr-btn.print-btn {
  background: white;
  color: var(--gray-700);
  border: 2px solid var(--gray-300);
}

.old-bios-badge {
  font-size: 1.5rem;
  color: #000000;
  white-space: nowrap;
  padding-left: 8px;
  border-left: 1px solid var(--gray-300);
  margin-left: 4px;
}
.old-bios-badge.has-old {
  color: #FF0000;
  font-weight: 600;
}
```

[VERIFIED — all from live file]

### 1b. "Featured on Homepage" element

Sits to the RIGHT of `.profiles-header-left` in a sibling flex row:

```html
<!-- dashboard/index.html:5135-5139 -->
<div class="profiles-header-label">
  <span>Featured</span>
  <span>on</span>
  <span>Homepage</span>
</div>
```

Layout hierarchy:
```
.profiles-header (flex, gap: 16px)
  ├─ .profiles-header-left   (flex: 1 1 auto) — contains stats-bar + adoption filter + search-qr-section
  ├─ .profiles-header-label  (flex: 0 0 auto) — "Featured on Homepage" text
  └─ .profiles-header-right  (flex: 0 0 auto) — 3×2 featured animal grid
```

`.profiles-header-label` is `flex: 0 0 auto`, font-size 0.7rem, uppercase, centered vertically. It sits between the left column and the featured grid. The gap between `.profiles-header-left` and `.profiles-header-label` is 16px (from the parent's `gap: 16px`). [VERIFIED — CSS at L1386-1420]

### 1c. Rendered widths

Exact rendered pixel widths require a browser (CSS `padding: 10px 16px`, `font-size: 0.85rem`, `font-weight: 600` render font-dependently). Structural estimates:

| Element | Width basis | Estimate |
|---------|------------|----------|
| Input `.qr-input` | `width: 180px` + `padding: 10px 14px` + `border: 2px` = **212px** fixed | 212px [VERIFIED from CSS] |
| 🔍 Find Animal button | `padding: 10px 16px`, emoji + "Find Animal" text at 0.85rem/600 | ~130-140px [INFERRED] |
| 🏷️ Print QR Code button | Same padding, emoji + "Print QR Code" text + `border: 2px` | ~145-155px [INFERRED] |
| Old Bios badge | `font-size: 1.5rem`, text "Old Bios: 0", `padding-left: 8px`, `margin-left: 4px` + `border-left: 1px` | ~130-150px [INFERRED] |
| `.search-qr-section` internal gaps | 3 × `gap: 12px` (input→buttons, buttons→badge) | 36px |
| `.search-qr-section` padding | `padding: 12px 16px` → 32px horizontal | 32px |

**Total `.search-qr-section` estimated width:** ~660-710px.

The available gap up to `.profiles-header-label` is determined by `.profiles-header-left` being `flex: 1 1 auto` — it grows to fill. The badge and search section are at the bottom of `profiles-header-left` (which is `flex-direction: column`). The search-qr-section itself is a flex row that will grow to the full width of `profiles-header-left`. The Old Bios badge sits at the right end of that row.

**Space budget for repurposing the Old Bios badge area:** ~130-150px at current font size (1.5rem). If the badge is replaced with bioState metrics, the space is constrained by the flex row's total width (full width of profiles-header-left minus input and buttons ≈ remaining space). On a 1920px monitor, `profiles-header-left` is roughly 1100-1300px wide, leaving ~500-600px after input+buttons. [INFERRED — depends on featured grid and viewport]

### 1d. Old Bios badge markup + JS

**DOM (L5131):**
```html
<span class="old-bios-badge" id="oldBiosBadge">Old Bios: —</span>
```

**CSS (L1821-1831):**
```css
.old-bios-badge {
  font-size: 1.5rem;
  color: #000000;
  white-space: nowrap;
  padding-left: 8px;
  border-left: 1px solid var(--gray-300);
  margin-left: 4px;
}
.old-bios-badge.has-old {
  color: #FF0000;
  font-weight: 600;
}
```

**JS (L6361-6389):**
```javascript
async function fetchOldGenericBios() {
  try {
    const resp = await fetch(`${API_BASE}/dashboard/old-generic-bios`);
    const result = await resp.json();
    if (!result.success) return;
    const { count, animals } = result.data;
    // Media tab badge
    const badge = document.getElementById('oldBiosBadge');
    if (badge) {
      badge.textContent = `Old Bios: ${count}`;
      badge.classList.toggle('has-old', count > 0);
    }
    // Profiles tab sidebar list
    const list = document.getElementById('oldBiosProfilesList');
    if (list) {
      if (count === 0) {
        list.innerHTML = '<em style="color: var(--gray-400);">None</em>';
      } else {
        list.innerHTML = animals.map(a => {
          const weeks = Math.floor(a.ageDays / 7);
          return `<div style="padding: 3px 0;">${escapeHtml(a.name)} <span style="color:var(--gray-400);">(${weeks} weeks)</span></div>`;
        }).join('');
      }
    }
  } catch (e) {
    console.error('[Old Bios] fetch error:', e);
  }
}
```

**Call sites:**
- `loadData()` at L6407: `fetchOldGenericBios();` (fire-and-forget, after media tab data loads)
- `loadProfilesData()` at L15081: `fetchOldGenericBios();` (fire-and-forget, on profiles tab load)

[ALL VERIFIED]

---

## PART 2 — MEDIA CARD-GRID + EXISTING FILTERS

### 2e. Existing filter controls

**Species filter — stat-card tiles (L5099-5117):**
```html
<div class="stats-bar" id="statsBar">
  <div class="stat-card clickable compact" onclick="filterBySpecies('all')" data-filter="all">
    <div class="label">All</div>
    <div class="value" id="totalAnimals">—</div>
    <div class="data-count" id="dataAll"></div>
  </div>
  <!-- same pattern for dog/cat/small -->
</div>
```

**Adoption status toggle (L5119-5124):**
```html
<div class="profiles-filter-group" id="adoptionStatusPill" style="flex-shrink: 0;">
  <label>Show</label>
  <button class="profiles-filter-btn" onclick="setAdoptionStatusFilter('all')" id="af-all">All</button>
  <button class="profiles-filter-btn active" onclick="setAdoptionStatusFilter('adoptable')" id="af-adoptable">Adoptable &amp; Pending</button>
  <button class="profiles-filter-btn" onclick="setAdoptionStatusFilter('pending')" id="af-pending">Pending Only</button>
</div>
```

**State variables (L6343, L6835):**
```javascript
let currentSpeciesFilter = 'all';                    // L6343
let currentAdoptionStatusFilter = 'adoptable';       // L6835
```

**Filtering pipeline — `renderFilteredAnimals()` (L6768-6822):**
```javascript
function renderFilteredAnimals() {
  let filtered = allAnimalsData;

  // 1. Species filter
  if (currentSpeciesFilter !== 'all') {
    filtered = allAnimalsData.filter(a => {
      if (currentSpeciesFilter === 'small') return classifySpecies(a.species) === 'small';
      return classifySpecies(a.species) === currentSpeciesFilter;
    });
  }

  // 2. Adoption status filter
  if (currentAdoptionStatusFilter === 'adoptable') {
    filtered = filtered.filter(a => a.isAvailable !== false);
  } else if (currentAdoptionStatusFilter === 'pending') {
    filtered = filtered.filter(a => a.adoptionPending === true);
  }
  // 'all' → no filter

  // 3. Tile counts (from adoption-filtered-only pool, ignoring species)
  const tilePool = currentAdoptionStatusFilter === 'adoptable'
    ? allAnimalsData.filter(a => a.isAvailable !== false)
    : currentAdoptionStatusFilter === 'pending'
      ? allAnimalsData.filter(a => a.adoptionPending === true)
      : allAnimalsData;
  updateTileCounts(tilePool);

  // 4. Sort: caregiver data first, then name
  filtered.sort((a, b) => {
    if (a.hasCaregiverData !== b.hasCaregiverData) return a.hasCaregiverData ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  // 5. Render cards
  content.innerHTML = `<div class="animal-list">${filtered.map(a => renderAnimalCard(a)).join('')}</div>`;
  // ...
}
```

**Handler functions (L6829-6843):**
```javascript
function filterBySpecies(species) {       // L6829
  currentSpeciesFilter = species;
  updateFilterUI();
  renderFilteredAnimals();
}

function setAdoptionStatusFilter(state) { // L6837
  currentAdoptionStatusFilter = state;
  document.querySelectorAll('#adoptionStatusPill .profiles-filter-btn')
    .forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(
    state === 'all' ? 'af-all' : state === 'pending' ? 'af-pending' : 'af-adoptable');
  if (activeBtn) activeBtn.classList.add('active');
  renderFilteredAnimals();
}
```

[ALL VERIFIED]

### 2f. Where a bioState filter hooks in

A new bioState filter would add a third filter step in `renderFilteredAnimals()`, after species and before (or after) adoption status:

```javascript
// Insert between step 1 (species) and step 2 (adoption status):
if (currentBioStateFilter !== 'all') {
  filtered = filtered.filter(a => a.bioState === currentBioStateFilter);
}
```

This ANDs with species (each filter narrows the `filtered` array sequentially).

**Client-side availability of `bioState`:** Each animal in `allAnimalsData` carries `bioState` from the behavior-notes payload (commit `0bb36d1`). [VERIFIED — `curl` confirms `bioState` present on every animal object]. No client JS references `bioState` yet — it's in the data but unused. [VERIFIED — `grep -n bioState dashboard/index.html` returns empty]

### 2g. Symmetric reset points

**(i) bioState selection → reset adoption toggle:**
In the new `setBioStateFilter(state)` handler, add:
```javascript
if (state !== 'all') {
  currentAdoptionStatusFilter = 'adoptable'; // reset to default
  // update adoption toggle UI
}
```
The handler to modify is the new `setBioStateFilter()` function (to be created). The adoption toggle UI update uses the pattern at L6839-6842: remove `.active` from all `#adoptionStatusPill .profiles-filter-btn`, add `.active` to `#af-adoptable`.

**(ii) Adoption toggle off default → reset bioState:**
In `setAdoptionStatusFilter(state)` (L6837), add:
```javascript
if (state !== 'adoptable') {
  currentBioStateFilter = 'all'; // reset to default
  // update bioState filter UI
}
```

**State variables involved:**
- `currentBioStateFilter` (new, default `'all'`)
- `currentAdoptionStatusFilter` (existing, L6835, default `'adoptable'`)
- `filterBySpecies()` (L6829) — does NOT need to reset bioState (species is orthogonal)
- `setAdoptionStatusFilter()` (L6837) — needs reset logic added
- New `setBioStateFilter()` — needs reset logic

[VERIFIED — handler structure confirmed from code]

---

## PART 3 — PROFILES TAB

### 3h. Profiles table header, row render, sort, Old Bios box

**Table header (L5190-5201):**
```html
<table class="profiles-table" id="profilesTable">
  <thead>
    <tr>
      <th class="sortable" onclick="sortProfilesBy('name')">Name <span class="sort-arrow" id="pf-sort-name"></span></th>
      <th class="sortable" onclick="sortProfilesBy('species')">Species <span class="sort-arrow" id="pf-sort-species"></span></th>
      <th class="sortable" onclick="sortProfilesBy('profileCount')">Profiles <span class="sort-arrow" id="pf-sort-profileCount"></span></th>
      <th class="sortable" onclick="sortProfilesBy('mostRecentDate')">Most Recent <span class="sort-arrow" id="pf-sort-mostRecentDate"></span></th>
      <th class="sortable" onclick="sortProfilesBy('mostRecentAuthor')">Author <span class="sort-arrow" id="pf-sort-mostRecentAuthor"></span></th>
      <th class="sortable" onclick="sortProfilesBy('mostRecentWordcount')">Words <span class="sort-arrow" id="pf-sort-mostRecentWordcount"></span></th>
      <th class="sortable" onclick="sortProfilesBy('mostRecentScore')">Score <span class="sort-arrow" id="pf-sort-mostRecentScore"></span></th>
    </tr>
  </thead>
  <tbody id="profilesTableBody">
    <tr><td colspan="7" ...>Loading profiles...</td></tr>
  </tbody>
</table>
```

**Row render (inside `renderProfilesTable()`, L15188-15207):**
```javascript
const rows = animals.map(a => {
  const countClass = a.profileCount === 0 ? ' class="profiles-count-zero"' : '';
  const scoreClass = getScoreCellClass(a.mostRecentScore);
  const dateStr = a.mostRecentDate ? (() => {
    const [y,m,d] = a.mostRecentDate.slice(0,10).split('-');
    return `${m}/${d}/${y}`;
  })() : '—';
  const author = a.mostRecentAuthor || '—';
  const words = a.mostRecentWordcount != null ? a.mostRecentWordcount : '—';
  const scoreStr = a.mostRecentScore != null ? a.mostRecentScore + '/10' : '—';

  return `<tr>
    <td class="name-cell" title="${escapeHtml(a.shelterCode)}">${escapeHtml(a.name)}</td>
    <td class="species-cell">${escapeHtml(a.species || '—')}</td>
    <td${countClass}>${a.profileCount}</td>
    <td>${dateStr}</td>
    <td class="author-cell">${escapeHtml(author)}</td>
    <td>${words}</td>
    <td class="${scoreClass}">${scoreStr}</td>
  </tr>`;
});
```

**Sort logic (L15123-15130):**
```javascript
let profilesSortCol = 'profileCount';  // L15078
let profilesSortAsc = true;            // L15079

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

**Sort execution (inside `renderProfilesTable()`, L15160-15170):**
```javascript
const dir = profilesSortAsc ? 1 : -1;
animals = [...animals].sort((a, b) => {
  let va = a[profilesSortCol];
  let vb = b[profilesSortCol];
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  if (typeof va === 'string') return dir * va.localeCompare(vb);
  return dir * (va - vb);
});
```

The sort uses `a[profilesSortCol]` — direct property access. A new column with key `bioState` would sort alphabetically (string comparison via `.localeCompare`). To get label-order sorting (approved < pending < youth < needed), the sort comparator would need a precedence mapping. [VERIFIED]

**Old Bios profiles sidebar box (L5222-5226):**
```html
<div class="profiles-searcher-card">
  <h3>📅 Old Bios</h3>
  <div id="oldBiosProfilesList" style="font-size: 0.85rem; color: var(--gray-600);
       min-height: 112px; max-height: 140px; overflow-y: auto;">
    <em style="color: var(--gray-400);">Loading…</em>
  </div>
</div>
```

Populated by `fetchOldGenericBios()` (shared function, L6361-6389). [VERIFIED]

### 3i. New "Bio State" column placement

Insert between Species (col 2) and Profiles (col 3):

**Header insertion point (after L5194):**
```html
<th class="sortable" onclick="sortProfilesBy('species')">Species ...</th>
<!-- INSERT HERE -->
<th class="sortable" onclick="sortProfilesBy('bioState')">Bio State <span class="sort-arrow" id="pf-sort-bioState"></span></th>
<!-- existing -->
<th class="sortable" onclick="sortProfilesBy('profileCount')">Profiles ...</th>
```

**Row insertion point (after species-cell td in render, after L15200):**
```html
<td class="species-cell">${escapeHtml(a.species || '—')}</td>
<!-- INSERT HERE -->
<td class="${bioStateClass}">${a.bioState || '—'}</td>
<!-- existing -->
<td${countClass}>${a.profileCount}</td>
```

**colspan update:** The loading/empty `<td colspan="7">` elements (L5202, L15183) must change to `colspan="8"`. [VERIFIED]

**Sort wiring:** The existing `sortProfilesBy(col)` / `a[profilesSortCol]` mechanism auto-works for string columns. `bioState` is a string on the profiles-summary payload object. However, alphabetical sort gives `approved → needed → pending → youth` which is NOT the desired order (`approved → pending → youth → needed`). A precedence map is needed:

```javascript
// In the sort comparator, special-case bioState:
const bioStateOrder = { approved: 0, pending: 1, youth: 2, needed: 3 };
// Use bioStateOrder[va] vs bioStateOrder[vb] instead of localeCompare
```

[VERIFIED — sort uses generic `a[col]` which needs the special case]

### 3j. Red shading — which columns have it

**Two distinct red-shading systems exist:**

1. **Profiles column (profileCount = 0):** CSS class `profiles-count-zero` applied conditionally at L15190:
   ```javascript
   const countClass = a.profileCount === 0 ? ' class="profiles-count-zero"' : '';
   ```
   CSS (L2453): `.profiles-count-zero { background: #FEE2E2; font-weight: 600; }`

2. **Score column:** CSS class `profiles-score-red` applied via `getScoreCellClass()` at L15191:
   ```javascript
   const scoreClass = getScoreCellClass(a.mostRecentScore);
   ```
   Function (L15255-15261):
   ```javascript
   function getScoreCellClass(score) {
     if (score == null) return 'profiles-score-grey';
     if (score >= 8) return 'profiles-score-green';
     if (score >= 5) return 'profiles-score-yellow';
     if (score >= 2) return 'profiles-score-red';     // ← red for 2-4
     return 'profiles-score-grey';
   }
   ```
   CSS (L2449-2452):
   ```css
   .profiles-score-green { background: #D1FAE5; }
   .profiles-score-yellow { background: #FEF3C7; }
   .profiles-score-red { background: #FEE2E2; }
   .profiles-score-grey { background: var(--gray-100); color: var(--gray-500); }
   ```

**To remove red shading from the Profiles column only:** delete the `countClass` conditional at L15190 and remove the `${countClass}` from the `<td>` at L15200. Leave `getScoreCellClass()` and Score column intact. The new bioState column would use its own color scheme (e.g., green for approved, yellow for pending, blue for youth, red for needed). [VERIFIED]

### 3k. bioState in profiles-summary payload

**Confirmed present.** `curl` of `/api/dashboard/profiles-summary` returns `bioState` and `dateOfBirth` on every animal object (added in commit `0bb36d1`). No client JS references `bioState` yet from the profiles-summary data. [VERIFIED]

---

## PART 4 — OLD BIOS RETIREMENT

### 4l. Complete consumer enumeration

**Server-side endpoint:**

| # | Location | What |
|---|----------|------|
| 1 | server.ts:11472 | `app.get('/api/dashboard/old-generic-bios', ...)` — endpoint definition |

**Client-side consumers (all in dashboard/index.html):**

| # | Location | What |
|---|----------|------|
| 2 | L1821-1831 | `.old-bios-badge` + `.old-bios-badge.has-old` CSS |
| 3 | L5131 | `<span class="old-bios-badge" id="oldBiosBadge">Old Bios: —</span>` — media toolbar badge DOM |
| 4 | L5223-5225 | `<h3>📅 Old Bios</h3>` + `<div id="oldBiosProfilesList">` — profiles sidebar box DOM |
| 5 | L6361-6389 | `fetchOldGenericBios()` — shared JS function (fetches endpoint, populates both #3 and #4) |
| 6 | L6407 | `fetchOldGenericBios();` — call from `loadData()` (media tab load) |
| 7 | L15081 | `fetchOldGenericBios();` — call from `loadProfilesData()` (profiles tab load) |

**Other references:**
```
grep -rn "old-generic-bios" across all source files (excluding node_modules/dist):
  dashboard/index.html:6360 — comment
  dashboard/index.html:6363 — fetch URL
  server/src/server.ts:11472 — endpoint
```

No other file references the endpoint. No other app (staff-pwa, staging-staff, volunteer, dogwalker, matcher, caregiver, coordinator) fetches `/api/dashboard/old-generic-bios`. [VERIFIED]

**Is the endpoint safe to retire?**

**The endpoint is safe to retire entirely.** Its only consumer is `fetchOldGenericBios()` in `dashboard/index.html`, which populates two DOM elements (the media badge and profiles sidebar list). No cron job, no external integration, no other app calls it. The endpoint's functionality (detecting aged-out generic bios) is now superseded by `bioState = 'needed'` which identifies the same animals (plus more — animals with no bio at all, not just aged-out generics). [VERIFIED]

**Retirement plan (for implementation, not now):**
1. Remove DOM: `#oldBiosBadge` (L5131), Old Bios sidebar box (L5222-5226)
2. Remove CSS: `.old-bios-badge` rules (L1821-1831)
3. Remove JS: `fetchOldGenericBios()` function (L6361-6389) and both call sites (L6407, L15081)
4. Remove endpoint: `app.get('/api/dashboard/old-generic-bios', ...)` (server.ts:11472-11514)

All four steps can be done in a single commit. The `GENERIC_BIO_MAX_AGE_DAYS` constant (L11294) is also used by `findGenericBioCandidates()` (L11314), so it must NOT be removed even if the endpoint is retired. [VERIFIED]

---

*Report generated by Rover. Read-only scoping — no changes made.*
