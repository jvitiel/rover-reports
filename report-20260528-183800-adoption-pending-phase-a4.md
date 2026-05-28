# Adoption Pending — Phase A4: Media Tab Filter Pill

**Date:** 2026-05-28 18:38 ET
**Status:** AWAITING MANUAL VERIFICATION — not committed yet

## What Changed (dashboard/index.html only)

### Replaced "SHOWING Adoptables" toggle with segmented pill control
- Reuses existing `.profiles-filter-group` / `.profiles-filter-btn` CSS from Profiles tab (no new CSS needed)
- Three segments: **All** | **Adoptable & Pending** (default) | **Pending Only**
- Sits in the same position as the old toggle — rightmost in the count-card stats bar
- Label "Show" matches Profiles tab pattern

### Filter predicates (compose multiplicatively with species filter)
- **All**: no filter — shows all animals regardless of availability or pending status
- **Adoptable & Pending** (default): `isAvailable !== false` — same as old "Adoptables" default
- **Pending Only**: `adoptionPending === true` — shows only animals flagged via A3 button, regardless of isAvailable

### Tile counts update per filter
- Count cards (All/Dogs/Cats/Smalls) reflect the currently-filtered pool, same as before

### State persistence
- Resets to "Adoptable & Pending" on page reload (matches old toggle behavior — no localStorage)

## Discovery (Step 1)

### Existing "SHOWING" toggle (replaced)
- `<button class="stat-card compact clickable" id="adoptableToggle">` with "Showing" / "Adoptables" text
- Binary toggle reading DOM text to determine state
- Filter in `renderFilteredAnimals()` checked `showAll` boolean from DOM text content

### Profiles tab LOCATION pill (reference component)
- `.profiles-filter-group` container (white bg, rounded, shadow) with `.profiles-filter-btn` segments
- `.active` class sets accent background + white text
- Label tag with uppercase small text
- No new CSS needed — exact same classes work in the Media tab context

## Verification

### Automated [VERIFIED]
- JS syntax: `new Function()` parse check passed on all 4 script blocks
- Test animal S2025592 temporarily toggled to pending for screenshot, then cleaned up

### Screenshot (default "Adoptable & Pending" state)
https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/2026-05-28-223739-a4-filter-pill-default-state-1440x900.png

### Manual Verification Checklist (for John)

1. [ ] Refresh dashboard → Media tab. New segmented pill visible where "SHOWING Adoptables" used to be.
2. [ ] Pill matches Profiles tab style (compact, white background, rounded, accent highlight on active segment).
3. [ ] Default state: "Adoptable & Pending" highlighted.
4. [ ] Click "All" → shows all animals (total count matches All card number).
5. [ ] Click "Adoptable & Pending" → shows only SM-adoptable animals (same count as before A4).
6. [ ] Click "Pending Only" → shows only animals you've marked Adoption Pending (may be 0 initially).
7. [ ] Species filter composes: e.g., "DOGS" + "Pending Only" → only pending dogs.
8. [ ] Count cards (All/Dogs/Cats/Smalls) on the left haven't changed position.
9. [ ] FEATURED ON HOMEPAGE section on the right hasn't shifted.
10. [ ] Search bar still works.

## Commit (pending John's confirmation)
```
cd /home/shelter/shelter-apps && git add -A && git commit -m "Phase A4: Adoption Pending — Media tab filter pill (All / Adoptable & Pending / Pending Only)"
```
