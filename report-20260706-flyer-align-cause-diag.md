# Flyer Alignment Cause Diagnosis — 2026-07-06

## Q1 — Real Geometry at Three Viewports

All measurements via Playwright `getBoundingClientRect()` against the live production page. Event 440 ("Find Your New Best Friend!") is the only upcoming event with a photo. Events 437 and 438 ("Volunteer Orientation") have no photo.

### Left-edge x-coordinates (px)

| Element | 1280px vw | 900px vw | 680px vw |
|---------|-----------|----------|----------|
| Container (.container) | 190 | 32 | 32 |
| **Event 440 — date badge** | 214 | 56 | 56 |
| **Event 440 — .event-photo** | 308 | 150 | 150 |
| **Event 440 — photo img** | 308 | 150 | 150 |
| **Event 440 — h3 title** ("Find Your…") | 612 | 454 | 454 |
| Event 437 — date badge | 214 | 56 | 56 |
| **Event 437 — h3 title** ("Volunteer…") | 308 | 150 | 150 |
| Event 438 — date badge | 214 | 56 | 56 |
| **Event 438 — h3 title** ("Volunteer…") | 311 | 153 | 153 |

[VERIFIED — all values from Playwright getBoundingClientRect at stated viewports]

### Flyer-img vs Volunteer-title divergence

| Viewport | Photo img x | Volunteer title x (437) | Divergence |
|----------|-------------|------------------------|------------|
| 1280px | 308 | 308 | **0px** |
| 900px | 150 | 150 | **0px** |
| 680px | 150 | 150 | **0px** |

**The flyer left edge and the Volunteer Orientation title left edge are perfectly aligned at every viewport tested.** The divergence is zero. [VERIFIED]

### What IS misaligned

The photo-event's OWN title ("Find Your New Best Friend!") is pushed far right of the Volunteer title:

| Viewport | Event 440 title x | Volunteer title x | Offset |
|----------|-------------------|-------------------|--------|
| 1280px | 612 | 308 | **+304px** |
| 900px | 454 | 150 | **+304px** |
| 680px | 454 | 150 | **+304px** |

The offset is a constant 304px = 280px (photo width) + 24px (flex gap). This is the photo column consuming horizontal space in the flex row, pushing `.event-details` rightward. [VERIFIED]

### Width squeeze on event-440 details

| Viewport | Row width | Details width | Details as % of row |
|----------|-----------|---------------|---------------------|
| 1280px | 852px | 454px | 53% |
| 900px | 788px | 390px | 49% |
| 680px | 568px | **170px** | **30%** |

At 680px, the 280px photo + 70px badge + 2×24px gaps = 398px of fixed content, leaving only 170px (30%) for the entire text column. [VERIFIED]

## Q2 — Decisive Resize Test (In-Memory Only)

In-memory Playwright style override: set event-440 flyer `<img>` to `width: 140px; height: 100px`. No disk/server changes.

### 680px viewport

| Metric | Before (280×200) | After (140×100) | Change |
|--------|-------------------|------------------|--------|
| Photo img x | 150 | 150 | **no change** |
| Photo container width | 280 | 140 | −140px |
| Event 440 title x | 454 | 314 | −140px |
| Volunteer title x | 150 | 150 | no change |
| **Photo ↔ Volunteer divergence** | **0px** | **0px** | **no change** |

### 1280px viewport

| Metric | Before (280×200) | After (140×100) | Change |
|--------|-------------------|------------------|--------|
| Photo img x | 308 | 308 | **no change** |
| Photo container width | 280 | 140 | −140px |
| Event 440 title x | 612 | 472 | −140px |
| Volunteer title x | 308 | 308 | no change |
| **Photo ↔ Volunteer divergence** | **0px** | **0px** | **no change** |

[VERIFIED — all values from Playwright in-memory override, server untouched]

**Verdict:** Reverting the image size does NOT change alignment — divergence is 0px both before and after. The photo left edge is at x=150 (680px vw) regardless of image width. The resize did NOT cause a misalignment between the photo and the Volunteer title. **The resize is not a regression.** [VERIFIED]

What the resize DID cause: the event-440 text column shrank from 310px (at 140×100) to 170px (at 280×200) at the 680px viewport — a 45% width loss. This makes the photo-event row look visually broken/cramped compared to the spacious text-only rows below it. [VERIFIED]

## Q3 — Width-Sensitive Element Analysis

The photo-img left edge IS simply `badge-width + gap` at all viewports. There is no divergence to explain — the measurement confirms the box model prediction. [VERIFIED]

Computed styles at 680px for the relevant elements:

**`.event-strip` (row, event 440):**
- `display: flex; flex-direction: row; flex-wrap: nowrap`
- `gap: 24px; justify-content: normal; align-items: flex-start`
- `width: 568px` (fills container content area: 680 − 2×32 container margin − 2×24 container padding = 568)
- `padding: 24px 0px; margin: 0px`
- No overflow, no wrapping
[VERIFIED]

**`.event-date-badge`:**
- `width: 70px; min-width: 70px; box-sizing: border-box`
- `padding: 16px 20px` (included in the 70px due to border-box)
- `flex-shrink: 0; margin: 0px`
[VERIFIED]

**`.event-photo`:**
- `width: 280px` (sized by its child img, flex-shrink: 0 prevents shrinking)
- `flex-shrink: 0; flex-grow: 0; flex-basis: auto`
- `padding: 0px; margin: 0px; align-self: auto`
- No justify, no centering, no min-width
[VERIFIED]

**`.event-details`:**
- `width: 170px` (remaining space: 568 − 70 − 280 − 2×24 = 170)
- `flex: 1 1 0%` (flex-grow: 1, flex-shrink: 1, flex-basis: 0%)
- `min-width: 0px; padding: 0px; margin: 0px`
[VERIFIED]

The layout is a simple flex row with no wrapping. The photo's `flex-shrink: 0` makes it a rigid 280px block. The details column absorbs all remaining width. At narrow viewports, the remaining width becomes unusably small.

## Q4 — Cause and Minimal Fix

### Cause

**The flyer left edge is NOT misaligned with the Volunteer title.** They share x=150 at 680px (and x=308 at 1280px). The perceived problem is the **visual imbalance** caused by the 280px photo consuming 49% of the 568px row at the 680px viewport, leaving only 170px (30%) for the text column. The event-440 text is squeezed into a narrow strip while the Volunteer events below span the full content width (474px). This makes the photo-event row look "indented" or broken by comparison, even though the photo's left edge is correctly placed. [VERIFIED]

**The resize from 140→280 did not change alignment** (photo left edge is viewport-independent). It DID change the visual balance: at 140px the text got 310px (55%), at 280px it gets 170px (30%). The cramped text column is the real issue John is seeing. [VERIFIED]

### Minimal fix

**(b) A genuine layout restructure** — but a small one. The fix is to move the photo from being a **sibling** of `.event-details` (3-column flex: badge | photo | text) to being a **child** inside `.event-details` (2-column flex: badge | content, where content = photo stacked above title). This gives the photo the full content-column width to work with and keeps all text aligned with the Volunteer title below.

Specifically:
- Move the `<?php if ($photo_url) : ?>` block INSIDE the `.event-details` div, BEFORE the type badge/h3.
- The photo then sits at the content-column left edge (x≈150 at 680px) with the title directly below it at the same x — exactly the alignment John described wanting.
- The `.event-photo` container and `<img>` would need their width adjusted (likely `width: 100%` or a `max-width`) to fit the content column rather than being a fixed 280px.

This is a **template-only change** to `page-events.php` (confirmed in the prior origin diagnosis — the layout is 100% template-authored). No Dashboard push-path change needed. [VERIFIED]

A CSS-only fix (e.g., `flex-wrap: wrap` on `.event-strip`) would not achieve the desired layout because the photo needs to stack specifically within the content column, not wrap to a full-width row below the badge.
