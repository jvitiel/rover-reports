# Location Column Added to Profiles Table

**Date:** 2026-06-23 02:30 UTC  
**Commit:** `637872f`  
**File:** `dashboard/index.html` (+5 -3)

---

## Strip Display Transform

**dashboard/index.html:7210:**
```javascript
const location = animal.location || animal.smData?.location || '';
const locationHtml = location ? `<span class="location-badge">📍 ${escapeHtml(location)}</span>` : '';
```

**Verbatim, no transform.** The strip renders `animal.location` as-is. Raw data includes prefixes like `"Foster::Karen Meyers-Njenga"` — the strip shows the full string including the `Foster::` prefix. The new column matches this behavior exactly.

## Changes

### Header (dashboard/index.html:5352, new line)
```html
<th class="sortable" onclick="sortProfilesBy('location')">Location <span class="sort-arrow" id="pf-sort-location"></span></th>
```
Inserted between Species and Bio State. Same `sortable` class, `onclick`, and `sort-arrow` span as all other headers.

### Cell (dashboard/index.html:15483, new line)
```html
<td>${escapeHtml(a.location || '')}</td>
```
Inserted between the species-cell and bioState cell. Uses `escapeHtml` for safety; falls back to empty string if null.

### Sort
`sortProfilesBy('location')` → the existing comparator at ~15453 does:
```javascript
if (typeof va === 'string') return dir * va.localeCompare(vb);
```
Since `a.location` is always a string, this gives alphabetical sort automatically. No new sort logic needed.

### Colspans
Three `colspan="8"` bumped to `colspan="9"`:
- Line 5362 (loading state)
- Line 15368 (error state)
- Line 15470 (empty filter state)

### Width
`.profiles-table-wrapper` uses `width: fit-content` — the table widens to accommodate the new column. No layout constraint change needed.

## Verification

- Location column appears between Species and Bio State ✅
- Header "Location" with sort arrow ✅
- Example rows:
  - Abstract / S2026133 → `Foster::Karen Meyers-Njenga` ✅
  - Achilles / A2025088 → `Dog Kennel` ✅
  - Amari / A2024185 → `4LG Foster House` ✅
- Clicking Location header sorts alphabetically (asc); clicking again reverses (desc); arrow indicator updates ✅
- Other column sorting still works ✅
- Table widened cleanly into grey space; no clipping or overlap ✅
- Media strip, profiles filter, all other columns unchanged ✅
- Dashboard serves HTTP 200 ✅
