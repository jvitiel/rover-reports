# Adoption Pending — Phase C: Custom-Search Cards Show Pending Status

**Date:** 2026-05-28 20:36 ET
**Commit:** d3ef122 — "Phase C: Adoption Pending — custom-search cards show pending status"
**Visual sign-off:** John confirmed on custom-search in both EN and ES at 00:36 UTC (Yoko/A2023228).

## C1 Diagnostic (Verified Pre-Implementation)

- Meet-link color: `#C9613F` (warm coral) — used as warning color for surface-appropriate variation [VERIFIED]
- Font hierarchy: `.result-name` 34px, `.result-bio` 19px, `.meet-link` 17px — warning sized at 22px [VERIFIED]
- Font-family: `Source Serif 4` / `Source Serif Pro` / Georgia / serif — inherited from card [VERIFIED]
- i18n: same TRANSLATIONS dict + `i18n()` / `template()` pattern as matcher-web [VERIFIED]
- Response shape: built in `.map()` at server.ts:4592, returns at lines 4614-4628 [VERIFIED]

## C2 Implementation

### 1. server/src/server.ts — /api/matcher/custom-search pass-through
- Batch-loads `adoption_pending` from `animal_metadata` for matched shelter_codes before the `.map()`
- Uses parameterized IN clause (max 3 results, lightweight query)
- Adds `adoptionPending: boolean` to each match's return object
- [VERIFIED] via curl POST — field present in response keys

### 2. custom-search/app.js — i18n entries
- EN: `'card.adoption_pending': 'Adoption Pending'`
- ES: `'card.adoption_pending': 'Adopción Pendiente'`

### 3. custom-search/app.js — card render (DOM construction)
- `<h3 class="result-name">` converted to flex container with two children:
  - `<span class="result-name-text">` (animal name, left)
  - `<span class="result-adoption-pending">` (warning, right, conditional on `match.adoptionPending`)
- Display constants comment block documents surface-specific color variation

### 4. custom-search/styles.css — CSS additions
- `.result-name`: added `display: flex; align-items: baseline; justify-content: space-between; gap: 16px`
- `.result-adoption-pending`: `color: #C9613F; font-size: 22px; font-weight: 500; white-space: nowrap`

### Surface-Specific Design Variation (Intentional)
| Surface | Color | Style | Rationale |
|---------|-------|-------|-----------|
| Dashboard (A3) | #C75450 muted brick red | Button | Matches dashboard's warm earth palette |
| Matcher-web (B) | #C75450 muted brick red | Text warning | Consistent with dashboard |
| Custom-search (C) | #C9613F warm coral | Text warning | Matches "Meet [Name]" link color in Dean-style cards |

## Verification

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Build (tsc) | No errors | Clean exit 0 | ✓ [VERIFIED] |
| shelter-app restart | active (running) | active since 00:26 UTC | ✓ [VERIFIED] |
| /api/matcher/custom-search has adoptionPending | Present in keys | Present | ✓ [VERIFIED] |
| EN custom-search card (Yoko) | Coral "Adoption Pending" right-justified | Confirmed by John | ✓ [VERIFIED] |
| ES custom-search card (Yoko) | Coral "Adopción Pendiente" right-justified | Confirmed by John | ✓ [VERIFIED] |
| Test cleanup | 0 leftover pending flags | 0 | ✓ [VERIFIED] |

## Complete Feature Summary — All Phases

| Phase | Scope | Commit | Status |
|-------|-------|--------|--------|
| A1 | Schema migration (adoption_pending column) | n/a (DB only) | ✓ Done |
| A2 | Backend endpoint + setter + dashboard pass-through | bada172 | ✓ Done |
| A3 | Dashboard strip tri-state button | baea10c | ✓ Done |
| A4 | Media tab filter pill | 6c8f5c4 | ✓ Done |
| B | Matcher-web card warning + /api/animals pass-through | 2671a73 | ✓ Done |
| C | Custom-search card warning + /api/matcher/custom-search pass-through | d3ef122 | ✓ Done |

**Adoption Pending feature is complete across all three surfaces.**
