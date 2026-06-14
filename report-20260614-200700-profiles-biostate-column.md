# Profiles Tab — Bio State Column + Filter

**Date:** 2026-06-14 20:07 ET  
**Type:** Implementation  
**Commit:** `213e4e9` — `dashboard: add plain Bio State column + filter to profiles tab; remove count red shading + Old Bios box`  

---

## Changes (dashboard/index.html only)

### STEP 1 — Bio State column (plain text, between Species and Profiles)

**Header (after L5194):**
```html
<th class="sortable" onclick="sortProfilesBy('bioState')">Bio State <span class="sort-arrow" id="pf-sort-bioState"></span></th>
```

**Row render (after species-cell):**
```html
<td>${a.bioState || '—'}</td>
```

**Colspans:** All three `colspan="7"` instances updated to `colspan="8"` (loading state, empty state, error state).

### STEP 2 — Sort precedence

```javascript
const bioStateOrder = { needed: 0, pending: 1, youth: 2, approved: 3 };
// In sort comparator:
if (profilesSortCol === 'bioState') {
  return dir * ((bioStateOrder[va] ?? -1) - (bioStateOrder[vb] ?? -1));
}
```

Ascending: needed → pending → youth → approved. Descending flips. All other columns' sorting unchanged.

### STEP 3 — Bio State filter (5 options)

**Markup (after Location filter group):**
```html
<div class="profiles-filter-group">
  <label>Bio State</label>
  <button class="profiles-filter-btn active" onclick="setProfilesBioStateFilter('all')" id="pf-bio-all">All</button>
  <button class="profiles-filter-btn" onclick="setProfilesBioStateFilter('needed')" id="pf-bio-needed">Needed</button>
  <button class="profiles-filter-btn" onclick="setProfilesBioStateFilter('pending')" id="pf-bio-pending">Pending</button>
  <button class="profiles-filter-btn" onclick="setProfilesBioStateFilter('youth')" id="pf-bio-youth">Youth</button>
  <button class="profiles-filter-btn" onclick="setProfilesBioStateFilter('approved')" id="pf-bio-approved">Approved</button>
</div>
```

**State + handler:**
```javascript
let profilesBioStateFilter = 'all';

function setProfilesBioStateFilter(val) {
  profilesBioStateFilter = val;
  document.querySelectorAll('[id^="pf-bio-"]').forEach(b => b.classList.remove('active'));
  document.getElementById('pf-bio-' + val).classList.add('active');
  renderProfilesTable();
}
```

**Filter step (in renderProfilesTable, after location filter, before sort):**
```javascript
if (profilesBioStateFilter !== 'all') {
  animals = animals.filter(a => a.bioState === profilesBioStateFilter);
}
```

### STEP 4 — Profiles count red shading removed

Deleted:
```javascript
const countClass = a.profileCount === 0 ? ' class="profiles-count-zero"' : '';
```

Changed `<td${countClass}>` to plain `<td>`. The `.profiles-count-zero` CSS rule left in place (harmless). Score column and `getScoreCellClass()` completely untouched. [VERIFIED]

### STEP 5 — Old Bios profiles box removed

Deleted the entire `profiles-searcher-card` containing:
```html
<h3>📅 Old Bios</h3>
<div id="oldBiosProfilesList" ...>...</div>
```

`fetchOldGenericBios()` is NOT removed — it still populates the media tab badge (`#oldBiosBadge`). The function already null-checks `#oldBiosProfilesList`:
```javascript
const list = document.getElementById('oldBiosProfilesList');
if (list) { ... }
```
So removing the DOM element causes it to silently skip the profiles population. No error. [VERIFIED]

## Verification

- **fetchOldGenericBios():** 0 lines changed in diff [VERIFIED]
- **getScoreCellClass / Score column:** 0 lines changed in diff [VERIFIED]
- **No media-tab changes:** diff is entirely in profiles filter markup, table header, row render, sort, and sidebar [VERIFIED]
- **No server files:** only dashboard/index.html staged and committed [VERIFIED]
- **colspan:** all 3 instances updated from 7 to 8, zero remaining colspan="7" in file [VERIFIED]

---

*Implemented by Rover. Dashboard is static — changes are live on page refresh, no build/restart needed.*
