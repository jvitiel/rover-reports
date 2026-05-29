# Bonded Pair Feature — Phase D3c: Dashboard Strip Button

**Date:** 2026-05-29 15:26 ET
**Phase:** D3c (dashboard button + alignment fix)
**Commit:** f8a30e6
**Status:** ✅ Complete — visually confirmed by John

## Changes (dashboard/index.html only)

### CSS additions
- `.btn-bonded-status` — 134px width, margin-top: 4px (matches `.btn-adoption-status` alignment)
- `.btn-bonded-status--individual` — green #5C9974, hover #4D8662
- `.btn-bonded-status--bonded` — red #C75450, hover #A8453F

### Button render function
- `renderBondedPairButton(shelterCode, bondedPair)` — binary toggle, no grey/disabled state
- Green "Individual" (bondedPair=false) → click → red "Bonded Pair" (bondedPair=true)
- Always clickable on ALL animals (adoptable + non-adoptable)

### Click handler
- `toggleBondedPair(shelterCode, newBonded, buttonEl)` — mirrors `toggleAdoptionPending()` pattern exactly
- PUT `/api/animals/:shelterCode/bonded-pair` with `{ bonded: boolean }`
- Disables button during request, shows "Updating...", updates `allAnimalsData` local state, swaps button via `outerHTML`

### Strip HTML
- Both buttons wrapped in inline flex row (`display: flex; align-items: center; gap: 8px; margin-top: 4px`)
- Adoption Pending (150px) + Bonded Pair (134px) + gaps = 308px total on row 2
- 8px breathing room to "+" expand icon — fits exactly with avatar removed (D3b)

### Display constants comment block
- Added parallel block for Bonded Pair alongside existing Adoption Pending block
- Documents colors, labels (EN + ES for D4/D5), and binary behavior

### Alignment fix
- `.btn-bonded-status` gained `margin-top: 4px` to match `.btn-adoption-status`'s existing margin-top
- Root cause: flex `align-items: center` distributed unequal margins, causing 2px vertical offset
- Post-fix measurement: delta = 0px [VERIFIED via getBoundingClientRect]

## Layout measurements [VERIFIED]

| Element | Width | Gap to next |
|---------|-------|-------------|
| Adoption Pending btn | 150px | 16px (8px flex gap + 8px margin-left) |
| Bonded Pair btn | 134px | 8px to expand icon |
| Row 2 total | 308px | — |

## Screenshots

- Default state (all green): https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/2026-05-29-191724-d3c-bonded-button-test-desktop.png
- Red state (Spooky toggled): https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/2026-05-29-191909-d3c-bonded-red-state-desktop.png
- Aligned closeup: https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/2026-05-29-192408-d3c-aligned-buttons-elem-desktop.png

## Dashboard Bonded Pair — complete

- D1: schema migration (bonded_pair column, DB-only)
- D2: backend endpoint + setter + three pass-throughs (acacb1d)
- D3b: avatar removal (8e6a2f4)
- D3c: button + alignment (f8a30e6)
