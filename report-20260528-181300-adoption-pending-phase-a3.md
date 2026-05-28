# Adoption Pending — Phase A3: Dashboard UI Tri-State Button

**Date:** 2026-05-28 18:13 ET
**Status:** AWAITING MANUAL VERIFICATION — not committed yet

## Changes (dashboard/index.html only)

### CSS (3 additions)
- `.btn-adoption-status--adoptable` — green (#22C55E), hover #16A34A
- `.btn-adoption-status--pending` — red (#DC2626), hover #B91C1C
- `.strip-actions-col` / `.strip-actions-row` — flex column wrapper keeping Library + Upload on row 1, Adoption Status on row 2, left-aligned

### JS — display constants comment block
- Added before `renderAnimalCard()` with color codes, labels (EN), and behavior spec
- References Phase B (matcher-web) and Phase C (custom-search) for future consistency

### JS — `renderAdoptionStatusButton(shelterCode, isAvailable, adoptionPending)`
- Three states: green "Adoptable" (clickable), red "Adoption Pending" (clickable), grey "Not Adoptable" (disabled)
- Reads `adoptionPending` (camelCase) from behavior-notes response per A2

### JS — `toggleAdoptionPending(shelterCode, newPending, buttonEl)`
- Disables button + shows "Updating..." during fetch
- PUT /api/animals/:shelterCode/adoption-pending with `{ pending: boolean }`
- On success: updates `allAnimalsData` entry + swaps button HTML via `outerHTML`
- On failure: alert + re-enable button
- Pattern matches existing `approveBio` await-then-update approach

### HTML template — card layout change
- Library + Upload buttons wrapped in `.strip-actions-col > .strip-actions-row`
- Adoption status button rendered below that row via `renderAdoptionStatusButton()`
- Expand-icon ("+" button) untouched — remains outside `.animal-info`
- "NOT ADOPTABLE" badge next to animal name untouched

## Verification

### Automated [VERIFIED]
- JS syntax: `new Function()` parse check passed on all 4 script blocks, no errors
- Screenshot captured: https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/2026-05-28-221215-adoption-pending-a3-media-tab-1440x900.png

### Manual Verification Checklist (for John)

Load https://dashboard.4lgshelterapp.duckdns.org and navigate to the Media tab:

1. [ ] On an adoptable animal: green "Adoptable" button visible BELOW the Library button, left-justified with Library's left edge
2. [ ] Click the green button → flips to red "Adoption Pending"
3. [ ] Click the red button → flips back to green "Adoptable"
4. [ ] On an SM-unavailable animal (one with the existing "NOT ADOPTABLE" badge by the name): grey "Not Adoptable" button visible, non-clickable
5. [ ] The "+" expand-icon button on the far right hasn't moved
6. [ ] The existing "NOT ADOPTABLE" badge next to the animal name still shows on SM-unavailable animals (both indicators present)
7. [ ] The photo strip layout hasn't shifted
8. [ ] After toggling an animal to "Adoption Pending" and refreshing the page, the red state persists (round-trip through backend confirmed)
9. [ ] No console errors in browser DevTools

## Commit (pending John's confirmation)
```
cd /home/shelter/shelter-apps
git add -A && git commit -m "Phase A3: Adoption Pending — dashboard strip tri-state button"
```
