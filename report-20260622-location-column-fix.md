# Location Column Fixes

**Date:** 2026-06-23 02:42 UTC  
**Commit:** `08edd1e`  
**File:** `dashboard/index.html` (+16 -1)

---

## Fix 1: Strip "Foster::" Prefix

### Helper (dashboard/index.html:15421-15424)
```javascript
function stripFosterPrefix(loc) {
  const s = loc || '';
  return s.startsWith('Foster::') ? s.slice(8) : s;
}
```

### Cell render

**Before (~15484):**
```javascript
<td>${escapeHtml(a.location || '')}</td>
```

**After:**
```javascript
<td class="location-cell" title="${escapeHtml(a.location || '')}">${escapeHtml(stripFosterPrefix(a.location))}</td>
```

Displays stripped text; full raw value in `title` tooltip (hover shows e.g. "Foster::Dr. Janet Martino, MD").

### Media strip unchanged (dashboard/index.html:7211)
```javascript
const locationHtml = location ? `<span class="location-badge">📍 ${escapeHtml(location)}</span>` : '';
```
Still renders full verbatim value. Only the profiles-table column strips.

## Fix 2: Sort Matches Display

**Before (~15452):**
```javascript
if (typeof va === 'string') return dir * va.localeCompare(vb);
```
Sorted raw field — foster names grouped under "F" for "Foster::".

**After (~15452-15454):**
```javascript
if (profilesSortCol === 'location') {
  return dir * stripFosterPrefix(va).localeCompare(stripFosterPrefix(vb));
}
if (typeof va === 'string') return dir * va.localeCompare(vb);
```
Location sort now uses the displayed (stripped) text — "Dr. Janet Martino" sorts under D, "Kelli Moss" under K.

## Fix 3: Column Width Cap

**New CSS (dashboard/index.html:2519-2524):**
```css
.profiles-table td.location-cell {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}
```
Long names truncate with "…"; full text visible on hover via `title` attribute. Table no longer bleeds into right-side panels.

## Verification

### Foster rows (prefix stripped)
| Animal | Raw location | Column shows |
|--------|-------------|--------------|
| Abstract / S2026133 | `Foster::Karen Meyers-Njenga` | `Karen Meyers-Njenga` ✅ |
| Asher / S2026571 | `Foster::Dr. Janet Martino, MD` | `Dr. Janet Martino, MD` ✅ |
| Biscuit / A2026011 | `Foster::Jennifer Dunn (Bunny Dunn)` | `Jennifer Dunn (Bunny…` (truncated, full in tooltip) ✅ |

### Non-foster rows (unchanged)
| Animal | Raw location | Column shows |
|--------|-------------|--------------|
| Achilles / A2025088 | `Dog Kennel` | `Dog Kennel` ✅ |
| Amari / A2024185 | `4LG Foster House` | `4LG Foster House` ✅ |
| Aiden / A2025050 | `RW ISO` | `RW ISO` ✅ |

### Sort
- Ascending: "4LG Foster House" → "Cat Room 1" → "Dog Kennel" → "Dr. Janet Martino" → "Jennifer Dunn" → "Karen Meyers" → "RW ISO" ✅
- Foster names sort by their NAME (not by "Foster") ✅

### Width
- Column capped at 150px; long names show ellipsis with tooltip ✅
- Table no longer bleeds into right-side panels ✅

### Media strip
- Still shows full verbatim: "📍 Foster::Karen Meyers-Njenga" ✅
