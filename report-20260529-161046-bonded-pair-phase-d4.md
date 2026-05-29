# Bonded Pair Feature — Phase D4: Matcher-Web Stacked Status Badges

**Date:** 2026-05-29 16:10 ET
**Phase:** D4 (matcher-web badges)
**Commit:** f67105f
**Status:** ✅ Complete — visually confirmed by John in EN and ES

## Changes

### matcher-web/app.js

**TRANSLATIONS additions:**
- `card.bonded_pair`: 'Bonded Pair' (en) / 'Pareja Vinculada' (es)

**Card template:**
- Single badge span replaced with `.card-status-badges` flex column wrapper
- Bonded Pair badge on top, Adoption Pending below — each renders only when its flag is true
- Conditional classes `.animal-card-name--double-badge` and `.animal-card-info--double-badge` applied ONLY when both `bondedPair && adoptionPending` are true

**Display-constants comment block:**
- Documents sizing iterations (11px → 13px → 16px), one-badge vs two-badge analysis, and conditional compensation math

### matcher-web/styles.css

**Layout changes:**
- `.animal-card-name`: `align-items: baseline` → `align-items: center` (hosts flex column of badges)
- `.card-status-badges`: flex column, align-items flex-end, gap 1px, padding 4px 0
- `.status-badge`: color #C75450, font-weight 700, font-size 16px, line-height 1.2

**Two-badge compensation (conditional):**
- `.animal-card-info h3.animal-card-name--double-badge`: margin-bottom 10px → 0px (−10px)
- `.animal-card-info.animal-card-info--double-badge`: padding-top 14px → 8px (−6px), padding-bottom 16px → 15.3px (−0.7px)
- Total absorbed: 16.7px — card visible height unchanged [VERIFIED]

**One-badge cards:** badge column (27.2px) fits inside h3 default line-height (30.72px). No growth, no compensation, no conditional class. Default styling preserved.

## Sizing Iterations

| Iteration | Font-size | Issue | Resolution |
|-----------|-----------|-------|------------|
| 1 | 11px | Too small — John reported excessive whitespace around badges | Increased to 13px |
| 2 | 13px | Still small — John wanted bigger with 4px clear margin | Analyzed slack budget |
| 3 | 16px | Final — requires two-badge compensation but one-badge fits naturally | Conditional class approach |

## Card Height Verification [VERIFIED]

| State | Card height | h3 height | h3 MB | Info pad-top | Info pad-bot |
|-------|-----------|-----------|-------|-------------|-------------|
| No badge | 501.59px | 30.72px | 10px | 14px | 16px |
| One badge | 501.59px | 30.72px | 10px | 14px | 16px |
| Two badges | 501.59px | 47.38px | 0px | 8px | 15.3px |

All card heights identical at 501.59px across all four badge states.

## Test Animals Used

- No badges: Amari (default state)
- Pending only: Rocky (A2026067, pre-existing)
- Bonded only: Abstract (S2026133, test toggle)
- Both: Achilles (A2025088, test toggle)

## Screenshots

- EN 16px final: https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/2026-05-29-200902-d4-16px-final-en-desktop.png
- ES 16px final: https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/2026-05-29-200902-d4-16px-final-es-desktop.png
