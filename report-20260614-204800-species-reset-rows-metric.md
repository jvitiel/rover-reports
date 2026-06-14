# Media Tab — Species Reset + Rows Metric

**Date:** 2026-06-14 20:48 ET  
**Type:** Implementation  
**Commit:** `8d0a07d` — `dashboard: media tab — species click clears bioState; add Showing/N/Rows displayed metric`  

---

## ITEM 1 — Species click clears bioState

```diff
     function filterBySpecies(species) {
       currentSpeciesFilter = species;
+      // Reset bioState filter to 'all' on species change (leave adoption toggle as-is)
+      currentBioStateFilter = 'all';
+      document.querySelectorAll('#bioStateFilterRow .bio-state-btn').forEach(btn => btn.classList.remove('active'));
+      const bfAll = document.getElementById('bf-all');
+      if (bfAll) bfAll.classList.add('active');
       updateFilterUI();
       renderFilteredAnimals();
     }
```

**Resets bioState only.** `currentAdoptionStatusFilter` and the adoption toggle UI are NOT touched — the adoption filter persists across species changes. [VERIFIED — no `currentAdoptionStatusFilter` or `#adoptionStatusPill` references in this function]

## ITEM 2 — Rows-displayed metric

### Markup (after #adoptionStatusPill, before .search-qr-section):

```html
<div class="rows-showing-metric">
  <span class="rows-showing-label">Showing</span>
  <span class="rows-showing-number" id="rowsShowingCount">—</span>
  <span class="rows-showing-label">Rows</span>
</div>
```

### CSS:

```css
.rows-showing-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0 10px;
  flex-shrink: 0;
}
.rows-showing-label {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--gray-400);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.rows-showing-number {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--gray-700);
  line-height: 1.2;
}
```

### Update in renderFilteredAnimals():

```javascript
// Update rows-showing metric
const rowsEl = document.getElementById('rowsShowingCount');
if (rowsEl) rowsEl.textContent = filtered.length;
```

Placed after sorting and before the empty-state check — `filtered.length` at this point reflects ALL applied filters (species → bioState → adoption). Updates on every filter change path. [VERIFIED]

## Screenshot Verification

Headless Chrome (1600×900, virtual-time-budget 8000ms). All checks pass:

1. ✅ Metric block visible in grey space right of "Pending Only" — reads "SHOWING / 149 / ROWS"
2. ✅ Fits within Pending Only button height — compact 3-line stack
3. ✅ Number = 149 (adoptable animal count, matching filtered.length)
4. ✅ No overlap with search toolbar below or thumbnails to the right
5. ✅ bioState buttons still in toolbar area

## Untouched (confirmed)

- **setBioStateFilter / setAdoptionStatusFilter**: 0 function-body lines changed [VERIFIED]
- **Tiles / search toolbar / thumbnails / Find/Print**: 0 lines changed [VERIFIED]
- **fetchOldGenericBios**: 0 lines changed [VERIFIED]
- **No server files**: dashboard/index.html only [VERIFIED]

---

*Implemented by Rover.*
