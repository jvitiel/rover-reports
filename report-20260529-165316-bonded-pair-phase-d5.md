# Bonded Pair Feature — Phase D5: Custom-Search Stacked Status Badges

**Date:** 2026-05-29 16:53 ET
**Phase:** D5 (custom-search Dean-style cards)
**Commit:** 4a9cdbe
**Status:** ✅ Complete — visually confirmed by John in EN and ES

## Changes

### custom-search/app.js

**TRANSLATIONS additions:**
- `card.bonded_pair`: 'Bonded Pair' (en) / 'Pareja Vinculada' (es)

**Card template (createElement-based):**
- Both badges wrapped in `.card-status-badges` container using flex `column-reverse`
- Template renders Adoption Pending first, Bonded Pair second → visual order: Bonded Pair on top, Adoption Pending below
- Column-reverse benefit: single badge anchors to bottom slot naturally (no empty space above)
- New class `.result-bonded-pair` for bonded badge, existing `.result-adoption-pending` kept

**Display-constants comment block:**
- Documents surface-specific color (#C9613F coral, different from matcher-web's #C75450), column-reverse pattern, no h3 compensation needed

### custom-search/styles.css

- `.result-name`: align-items changed from `baseline` to `center`
- `.card-status-badges`: flex column-reverse, align-items flex-end, gap 4px
- `.result-bonded-pair`: unified styling with `.result-adoption-pending` (22px, #C9613F, weight 500)

## Verification Note

During John's initial verification, Dante (S20241099, both flags true) showed Adoption Pending but NOT Bonded Pair. Root cause: **browser cache** — John was viewing a cached pre-D5 version of app.js. Server-side confirmed correct (`bondedPair: true` in `/api/matcher/custom-search` response). Client-side code confirmed correct (`match.bondedPair` camelCase matches API field). After cache clear (hard refresh), both badges rendered correctly. Not a code bug.

## Bonded Pair Feature — Complete Across All Surfaces

| Phase | Surface | Commit | Key detail |
|-------|---------|--------|-----------|
| D1 | Schema | DB-only | `bonded_pair INTEGER DEFAULT 0` on animal_metadata |
| D2 | Backend | acacb1d | PUT endpoint + setter + three GET pass-throughs |
| D3b | Dashboard | 8e6a2f4 | Avatar removal (64px recovered) |
| D3c | Dashboard | f8a30e6 | Individual/Bonded Pair button (134px, binary toggle) |
| D4 | Matcher-web | f67105f | Stacked badges (16px, conditional margin compensation) |
| D5 | Custom-search | 4a9cdbe | Stacked badges (22px coral, column-reverse) |
