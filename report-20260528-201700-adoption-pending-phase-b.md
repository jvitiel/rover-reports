# Adoption Pending — Phase B: Matcher-Web Cards Show Pending Status

**Date:** 2026-05-28 20:17 ET
**Commit:** 2671a73 — "Phase B: Adoption Pending — matcher-web cards show pending status"
**Visual sign-off:** John confirmed on matcher-web in both EN and ES at 00:16 UTC.

## What Shipped

### 1. server/src/server.ts — /api/animals pass-through
- Batch-loads `adoption_pending` from `animal_metadata` before the per-animal loop (same pattern as A2's behavior-notes pass-through)
- Adds `adoptionPending: boolean` (camelCase) to each animal in the response
- Null/missing metadata rows default to `false`
- [VERIFIED] via `curl /api/animals | jq` — field present, correct value for toggled animal

### 2. matcher-web/app.js — i18n entries
- EN: `'card.adoption_pending': 'Adoption Pending'`
- ES: `'card.adoption_pending': 'Adopción Pendiente'`
- Uses existing `TRANSLATIONS` dict + `i18n()` lookup pattern

### 3. matcher-web/app.js — card template
- `<h3>` replaced with flex container (`.animal-card-name`) holding name text + conditional warning
- Warning renders only when `animal.adoptionPending === true`
- Right-justified via `justify-content: space-between`
- Display constants comment block added referencing all three surfaces (A3/B/C)

### 4. matcher-web/styles.css — warning styling
- `.animal-card-name`: flex row, baseline-aligned, space-between
- `.adoption-pending-warning`: #C75450 (muted brick red matching A3), font-weight 600, same font-size as name, nowrap

## Phase B Diagnostic (B1) — Verified Pre-Implementation
- matcher-web is NOT a PWA (no service worker, no cache bump needed) [VERIFIED]
- matcher-web IS bilingual (TRANSLATIONS dict with en + es blocks, i18n() lookup) [VERIFIED]
- /api/animals merge happens in server.ts endpoint handler, not in fetchAnimals() [VERIFIED]
- Card render uses template strings via innerHTML [VERIFIED]

## Iteration
1. Initial: warning at 0.75em font-size (smaller than name)
2. Final: font-size override removed — warning matches name size per John's feedback

## Verification Matrix

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Build (tsc) | No errors | Clean exit 0 | ✓ [VERIFIED] |
| shelter-app restart | active (running) | active since 00:06 UTC | ✓ [VERIFIED] |
| /api/animals has adoptionPending key | Present | Present | ✓ [VERIFIED] |
| Pending animal returns true | adoptionPending: true | true (Abstract/S2026133) | ✓ [VERIFIED] |
| Non-pending animal returns false | adoptionPending: false | false | ✓ [VERIFIED] |
| EN matcher-web card | Red "Adoption Pending" next to name | Confirmed by John | ✓ [VERIFIED] |
| ES matcher-web card | Red "Adopción Pendiente" next to name | Confirmed by John | ✓ [VERIFIED] |
| Test cleanup | 0 leftover pending flags | 0 | ✓ [VERIFIED] |

## Screenshots
- EN: https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/2026-05-29-001527-phase-b-equal-size-en-1440x900.png
- ES: https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/2026-05-29-001540-phase-b-equal-size-es-1440x900.png

## Full Feature Progress

| Phase | Scope | Commit | Status |
|-------|-------|--------|--------|
| A1 | Schema migration | n/a (DB only) | ✓ Done |
| A2 | Backend endpoint + setter + dashboard pass-through | bada172 | ✓ Done |
| A3 | Dashboard strip tri-state button | baea10c | ✓ Done |
| A4 | Media tab filter pill | 6c8f5c4 | ✓ Done |
| B | Matcher-web card warning + /api/animals pass-through | 2671a73 | ✓ Done |
| C | Custom-search card warning | — | Pending |
