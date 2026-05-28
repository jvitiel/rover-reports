# Adoption Pending — Phase A4: Media Tab Filter Pill (Final)

**Date:** 2026-05-28 19:55 ET
**Commit:** 6c8f5c4 — "Phase A4: Adoption Pending — Media tab filter pill (All / Adoptable & Pending / Pending Only)"
**Visual sign-off:** John confirmed all items at 23:55 UTC.

## What Shipped (dashboard/index.html)

### Three-state segmented filter pill
- **All**: no filter — shows all animals regardless of availability or pending status
- **Adoptable & Pending** (default): `isAvailable !== false` — same as old "Adoptables"
- **Pending Only**: `adoptionPending === true` — shows only animals flagged via A3 button
- Filters compose multiplicatively with species filter (Dogs/Cats/Smalls/All)
- Tile counts update per filter state
- Resets to default on page reload (no localStorage persistence, matches old behavior)

### Position & Layout
- Sits inline with count cards in `.stats-bar`, between SMALLS card and FEATURED ON HOMEPAGE
- Multi-line segment labels (max-width: 82px) fit within the 276px of available row space
- `align-self: stretch` + `min-height: 100%` makes pill match count card height (77px)
- `flex-shrink: 0` prevents pill compression
- `min-width: 95px` on `.stat-card.compact` prevents count card reflow on data population

### Visual Polish
- 1px solid border on all segments (`var(--gray-300)`, active state `var(--accent)`)
- Equal height across all three segments — single-line "All" vertically centered
- Right padding (4px) inside pill container for balanced spacing
- `scrollbar-gutter: stable` on `.content-area` prevents layout shift when filtering reduces animal count (scrollbar disappearance no longer widens content)

### Reuses Profiles Tab CSS
- `.profiles-filter-group` container and `.profiles-filter-btn` segment classes
- All adoption-specific overrides scoped via `#adoptionStatusPill` — Profiles tab unaffected

## Iteration History (6 rounds)
1. Initial: pill inside `.stats-bar`, wrapped below cards due to flex-wrap reflow after data populated
2. Move below: pill in own `.adoption-filter-row` — solved flash but wrong position (John wanted inline)
3. Move back + min-width: pill back in `.stats-bar` with min-width on cards — still wrapped (330px pill > 276px available)
4. Multi-line segments: max-width: 82px on segments, labels wrap to two lines — pill fits at 260px ✓
5. Position confirmed, four polish items added (outlines, equal height, scrollbar-gutter, right padding)
6. John visual sign-off ✓

## Diagnostic: Rate Limiter Hit During Testing
- Global limiter (2000 req/15min) hit by John's IP during iterative A3/A4 testing
- Dashboard Media tab generates ~250-300 API requests per page load (behavior-notes + per-animal photo/bio loads for 127 animals)
- ~7 refreshes in 15 minutes exceeds the budget
- Resolved by waiting for the 15-minute window to expire
- Future consideration: add `/api/dashboard/*` to the rate limiter skip list

## Phase A Summary (Complete)

| Phase | Scope | Commit | Status |
|-------|-------|--------|--------|
| A1 | Schema migration (adoption_pending column) | n/a (DB only) | ✓ Done |
| A2 | Backend endpoint + setter + pass-through + DECISIONS.md | bada172 | ✓ Done |
| A3 | Dashboard strip tri-state button | baea10c | ✓ Done |
| A4 | Media tab filter pill | 6c8f5c4 | ✓ Done |

Dashboard side of Adoption Pending is complete end-to-end. Next: Phase B (matcher-web) and Phase C (custom-search) for read-side displays.
