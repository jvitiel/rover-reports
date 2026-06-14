# Media Tab — bioState Layout (Pass 2)

**Date:** 2026-06-14 20:34 ET  
**Type:** Implementation (pass 2 of 2 — layout only)  
**Commit:** `8aefdfa` — `dashboard: media tab pass 2 — 2x3 bioState filter grid in toolbar, drop Featured label, tile label 'approved'`  

---

## Changes (dashboard/index.html only)

### STEP 1 — "Featured on Homepage" label removed

Deleted the `.profiles-header-label` element (3 `<span>` children: Featured/on/Homepage). The `.profiles-header-right` thumbnail grid remains unchanged.

### STEP 2 — 2×3 bioState grid in toolbar

**Removed:** Provisional `#bioStateFilterRow` (pass 1) and its inline `<style>` block from between the frozen header and `#content`.

**Added:** Inside `.search-qr-section`, after `.search-qr-buttons`, replacing the `.old-bios-badge` slot:

```html
<span class="old-bios-badge" id="oldBiosBadge" style="display:none;">Old Bios: —</span>
<div id="bioStateFilterRow" class="bio-state-grid">
  <span class="bio-state-label">Bio State</span>
  <button class="bio-state-btn active" id="bf-all" onclick="setBioStateFilter('all')">All</button>
  <button class="bio-state-btn" id="bf-needed" onclick="setBioStateFilter('needed')">Needed</button>
  <button class="bio-state-btn" id="bf-pending" onclick="setBioStateFilter('pending')">Pending</button>
  <button class="bio-state-btn" id="bf-youth" onclick="setBioStateFilter('youth')">Youth</button>
  <button class="bio-state-btn" id="bf-approved" onclick="setBioStateFilter('approved')">Approved</button>
</div>
```

**Note:** `#oldBiosBadge` is hidden with `display:none` rather than deleted because `fetchOldGenericBios()` still references it. Endpoint retirement (which removes both the badge and the fetch function) is a parked later step.

**CSS (new, after .old-bios-badge rules):**
```css
.bio-state-grid {
  display: grid;
  grid-template-columns: auto auto auto;
  gap: 4px 6px;
  padding-left: 10px;
  border-left: 1px solid var(--gray-300);
  margin-left: 6px;
  align-items: center;
}
.bio-state-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.bio-state-btn {
  padding: 4px 10px;
  border: 1px solid var(--gray-300);
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.78rem;
  white-space: nowrap;
}
.bio-state-btn:hover { background: var(--gray-100); }
.bio-state-btn.active {
  background: var(--gray-200);
  font-weight: 600;
  border-color: var(--gray-500);
}
```

Grid layout: 3 columns × 2 rows. Row 1: [Bio State label] [All] [Needed]. Row 2: [Pending] [Youth] [Approved].

### STEP 3 — Tile label reword

```diff
-      document.getElementById('dataAll').textContent = allData > 0 ? `${allData} with data` : '';
+      document.getElementById('dataAll').textContent = allData > 0 ? `${allData} approved` : '';
```
Same for dataCats, dataDogs, dataSmalls. Number unchanged (still approved+youth from pass 1).

## Screenshot Verification (headless Chrome)

Captured with `google-chrome --headless --screenshot --window-size=1600,900 --virtual-time-budget=8000`. All 5 checks pass:

1. ✅ "Featured on Homepage" text label gone
2. ✅ 2×3 bioState grid visible in toolbar between Print QR and thumbnails
3. ✅ Tiles show "N approved" (All: 74, Dogs: 7, Cats: 63, Smalls: 4)
4. ✅ Provisional bioState row (below toolbar) gone
5. ✅ Grid fits without wrapping or overlapping thumbnails

## Untouched (confirmed)

- **Pass-1 logic** (setBioStateFilter, setAdoptionStatusFilter, filter step, symmetric reset): 0 function-body lines changed [VERIFIED]
- **Find Animal / Print QR Code buttons**: 0 lines changed [VERIFIED]
- **fetchOldGenericBios()**: 0 lines changed [VERIFIED]
- **Thumbnails / .profiles-header-right**: 0 lines changed [VERIFIED]
- **No server files**: dashboard/index.html only [VERIFIED]

---

*Implemented by Rover. Pass 2 of 2 — layout complete.*
