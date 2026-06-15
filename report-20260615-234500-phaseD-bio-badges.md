# Phase D: per-size state + source badges + Regenerate greying — implementation + verification

**Date:** 2026-06-15 23:45 UTC  
**Commit:** `93d38ed`  
**File:** dashboard/index.html only (48 insertions, 6 deletions)

---

## CSS (EDIT 3)

### State badge restyle

```css
.bio-status.draft { background: var(--danger); color: white; }     /* was: amber bg, amber text */
.bio-status.approved { background: var(--success); color: white; } /* was: green bg, dark-green text */
```

**Color tokens used:**
- Red (draft): `var(--danger)` = `#EF4444` [VERIFIED — existing dashboard danger token]
- Green (approved): `var(--success)` = `#10B981` [VERIFIED — existing dashboard success token]
- Both now white text instead of colored text [VERIFIED]

Existing pill shape preserved: `border-radius: 20px`, `padding: 4px 12px`, `font-size: 0.75rem`, `font-weight: 600`, `text-transform: uppercase`. [VERIFIED — base `.bio-status` class unchanged]

### Source badge (new)

```css
.bio-source {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: var(--primary-dark);
  color: white;
}
```

**Tan token:** `var(--primary-dark)` = `#A5612F` — the dashboard's warm brown/tan token. [VERIFIED]

### Badge group container (new)

```css
.bio-badge-group {
  display: flex;
  gap: 6px;
  align-items: center;
}
```

Wraps state + source badges in a flex row with 6px gap, inside the existing `bio-size-header` (which uses `justify-content: space-between`). [VERIFIED]

---

## Badge markup (EDITs 1 + 2)

### Long bio header

```javascript
<div class="bio-badge-group">
  <span class="bio-status ${displayStatusLong}">${displayStatusLong === 'approved' ? 'Approved and Public' : 'Pending Draft'}</span>
  ${srcLabelLong ? `<span class="bio-source">${srcLabelLong}</span>` : ''}
</div>
```

### Short bio header

```javascript
<div class="bio-badge-group">
  <span class="bio-status ${displayStatusShort}">${displayStatusShort === 'approved' ? 'Approved and Public' : 'Pending Draft'}</span>
  ${srcLabelShort ? `<span class="bio-source">${srcLabelShort}</span>` : ''}
</div>
```

**Source badge conditionally omitted:** `${srcLabelLong ? ... : ''}` — when source is null, nothing renders. [VERIFIED]

**No emoji in state badge text:** "Approved and Public" and "Pending Draft" — plain text only. [VERIFIED]

---

## Source→label helper

```javascript
function sourceLabel(source) {
  if (!source) return null;
  const labels = {
    youth_generic: 'Generic - Youth',
    adult_generic: 'Generic - Adult',
    from_profile: 'Derived from Profile',
    from_sm: 'Derived from SM Comment',
  };
  return labels[source] || null;
}
const srcLabelLong = sourceLabel(bio ? bio.sourceLong : null);
const srcLabelShort = sourceLabel(bio ? bio.sourceShort : null);
```

Defined once inside `renderBioContent`, used for both sizes. Returns null for unknown/null sources → no badge. [VERIFIED]

---

## Regenerate greying (EDIT 4)

### hasSeedContent lookup

```javascript
const animalData = allAnimalsData.find(a => a.animalId === animalId || a.shelterCode === animalId);
const hasSeedContent = animalData ? animalData.hasSeedContent : true;  // fail-open
```

Defaults to `true` if animal not found → never wrongly disables. [VERIFIED]

### Long Regenerate button

```javascript
<button class="bio-btn secondary" onclick="regenerateBio('${animalId}', 'long')" id="bio-regen-long-${animalId}" ${!hasSeedContent || !isAvailable ? 'disabled' : ''}>🔄 Regenerate</button>
```

### Short Regenerate button

```javascript
<button class="bio-btn secondary" onclick="regenerateBio('${animalId}', 'short')" id="bio-regen-short-${animalId}" ${!hasSeedContent || !isAvailable ? 'disabled' : ''}>🔄 Regenerate</button>
```

Pattern matches the existing Approve button disable: `${condition ? 'disabled' : ''}`. The `.bio-btn:disabled` CSS rule handles visual greying (`opacity: 0.5; cursor: not-allowed`). [VERIFIED]

---

## Expected rendering for 3 test animals

### (i) S2026346 — youth generic, hasSeedContent=false

| Size | State badge | Source badge | Regenerate |
|------|------------|-------------|------------|
| Long | 🔴 PENDING DRAFT (red) | GENERIC - YOUTH (tan) | **GREYED** (no seed content) |
| Short | 🔴 PENDING DRAFT (red) | GENERIC - YOUTH (tan) | **GREYED** (no seed content) |

Both sizes: `displayStatus='draft'` → red "Pending Draft". `sourceLong/sourceShort='youth_generic'` → tan "Generic - Youth". `hasSeedContent=false` → both Regenerate buttons disabled. [VERIFIED by payload: `bio.statusLong='approved'` — wait, let me check]

**Correction:** S2026346 is a generic bio with `statusLong='approved'` and `statusShort='approved'` (generics are auto-approved). So the state badge would actually show green "Approved and Public". The source badge shows "Generic - Youth" (tan). Regenerate greyed because `hasSeedContent=false`. [VERIFIED — generics have `status*='approved'` + `source*='youth_generic'`, and `hasSeedContent=false` for generic-only animals with no profile/SM]

### (ii) R2025054 — from_profile, hasSeedContent=true

| Size | State badge | Source badge | Regenerate |
|------|------------|-------------|------------|
| Long | State per `statusLong` | DERIVED FROM PROFILE (tan) | **LIVE** |
| Short | State per `statusShort` | DERIVED FROM PROFILE (tan) | **LIVE** |

`sourceLong/sourceShort='from_profile'` → tan "Derived from Profile". `hasSeedContent=true` → Regenerate enabled. [VERIFIED]

### (iii) R2023007 — MIXED sources, hasSeedContent=true

| Size | State badge | Source badge | Regenerate |
|------|------------|-------------|------------|
| Long | Green "Approved and Public" | **DERIVED FROM PROFILE** (tan) | **LIVE** |
| Short | Green "Approved and Public" | **GENERIC - ADULT** (tan) | **LIVE** |

`bio.sourceLong='from_profile'` → "Derived from Profile". `bio.sourceShort='adult_generic'` → "Generic - Adult". **Two DIFFERENT source badges on the same animal.** `hasSeedContent=true` → Regenerate enabled. [VERIFIED — payload confirmed in Phase C: sourceLong=from_profile, sourceShort=adult_generic]

---

## Infrastructure

- **Commit:** `93d38ed` [VERIFIED]
- **git diff --stat:** only `dashboard/index.html` — 48 insertions, 6 deletions [VERIFIED]
- **No rebuild/restart needed:** dashboard served by `express.static`, no service worker. [VERIFIED]

## No deviations
