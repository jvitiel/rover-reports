# Availability Backfill Dry-Run — Preview

**Date:** 2026-09-24  
**Type:** Read-only dry-run (SELECT only, PRAGMA query_only = ON)  
**Subject:** What the shipped `normalizeAvailabilityString` (dist/availabilityParse.js) produces for every currently-flagged availability cell

---

## Counts

- **Total flagged cells:** 85 (matches prior diagnosis)
- **Distinct volunteers with ≥1 flagged cell:** 27 (matches prior diagnosis)

---

## Per-Cell Table

| id  | day       | old raw text                         | new text                | new flag     | bucket              |
|-----|-----------|--------------------------------------|-------------------------|--------------|---------------------|
| 478 | monday    | `Before 11`                          | `9:00 AM - 11:00 AM`   | null         | RECOVERED-TO-HOURS  |
| 478 | tuesday   | `Before 11`                          | `9:00 AM - 11:00 AM`   | null         | RECOVERED-TO-HOURS  |
| 478 | wednesday | `Before 11`                          | `9:00 AM - 11:00 AM`   | null         | RECOVERED-TO-HOURS  |
| 478 | thursday  | `Before 11`                          | `9:00 AM - 11:00 AM`   | null         | RECOVERED-TO-HOURS  |
| 487 | saturday  | `Never`                              | `Never`                 | unparseable  | STILL-UNPARSEABLE   |
| 491 | monday    | `After 6pm`                          | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 491 | tuesday   | `After 6pm`                          | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 491 | wednesday | `After 6pm`                          | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 491 | thursday  | `After 6pm`                          | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 491 | friday    | `After 6pm`                          | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 491 | saturday  | `After noon`                         | `12:00 PM - 5:00 PM`   | null         | RECOVERED-TO-HOURS  |
| 491 | sunday    | `After noon`                         | `12:00 PM - 5:00 PM`   | null         | RECOVERED-TO-HOURS  |
| 494 | wednesday | `Some availability`                  | `Some availability`     | unparseable  | STILL-UNPARSEABLE   |
| 500 | monday    | `Before 10:45`                       | `9:00 AM - 10:45 AM`   | null         | RECOVERED-TO-HOURS  |
| 500 | wednesday | `Before 10:45`                       | `9:00 AM - 10:45 AM`   | null         | RECOVERED-TO-HOURS  |
| 502 | friday    | `after 12`                           | `12:00 PM - 5:00 PM`   | null         | RECOVERED-TO-HOURS  |
| 502 | saturday  | `after 12`                           | `12:00 PM - 5:00 PM`   | null         | RECOVERED-TO-HOURS  |
| 504 | tuesday   | `7:00 - 11am after 3:30`             | `7:00 - 11am after 3:30` | unparseable | STILL-UNPARSEABLE   |
| 504 | thursday  | `7:00 - 11am after 3:30`             | `7:00 - 11am after 3:30` | unparseable | STILL-UNPARSEABLE   |
| 504 | friday    | `Open availability`                  | `9:00 AM - 5:00 PM`    | interpreted  | INTERPRETED         |
| 504 | saturday  | `Open availability`                  | `9:00 AM - 5:00 PM`    | interpreted  | INTERPRETED         |
| 504 | sunday    | `Open availability`                  | `9:00 AM - 5:00 PM`    | interpreted  | INTERPRETED         |
| 508 | saturday  | `Prefer not - do Saturday`           | `Prefer not - do Saturday` | unparseable | STILL-UNPARSEABLE |
| 516 | monday    | `After 3:00`                         | `3:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 516 | tuesday   | `After 3:00`                         | `3:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 516 | wednesday | `After 3:00`                         | `3:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 516 | thursday  | `After 3:00`                         | `3:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 516 | friday    | `After 3:00`                         | `3:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 525 | friday    | `3:00 - whenever`                    | `3:00 - whenever`       | unparseable  | STILL-UNPARSEABLE   |
| 527 | saturday  | `Most of the day`                    | `Most of the day`       | unparseable  | STILL-UNPARSEABLE   |
| 527 | sunday    | `Most of the day`                    | `Most of the day`       | unparseable  | STILL-UNPARSEABLE   |
| 528 | monday    | `after 6 pm`                         | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 528 | tuesday   | `after 6 pm`                         | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 528 | wednesday | `after 6 pm`                         | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 528 | thursday  | `after 6 pm`                         | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 528 | friday    | `after 6 pm`                         | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 529 | tuesday   | `not availabe`                       | `not availabe`          | unparseable  | STILL-UNPARSEABLE   |
| 529 | saturday  | `not available`                      | `not available`         | unparseable  | STILL-UNPARSEABLE   |
| 529 | sunday    | `not available`                      | `not available`         | unparseable  | STILL-UNPARSEABLE   |
| 535 | sunday    | `10/13`                              | `10/13`                 | unparseable  | STILL-UNPARSEABLE   |
| 536 | monday    | `Any`                                | `9:00 AM - 5:00 PM`    | interpreted  | INTERPRETED         |
| 536 | tuesday   | `Any`                                | `9:00 AM - 5:00 PM`    | interpreted  | INTERPRETED         |
| 536 | wednesday | `Any`                                | `9:00 AM - 5:00 PM`    | interpreted  | INTERPRETED         |
| 536 | thursday  | `Any`                                | `9:00 AM - 5:00 PM`    | interpreted  | INTERPRETED         |
| 536 | friday    | `Any`                                | `9:00 AM - 5:00 PM`    | interpreted  | INTERPRETED         |
| 536 | saturday  | `Am`                                 | `9:00 AM - 12:00 PM`   | interpreted  | INTERPRETED         |
| 536 | sunday    | `Any`                                | `9:00 AM - 5:00 PM`    | interpreted  | INTERPRETED         |
| 539 | monday    | `From 9 am`                          | `9:00 AM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 539 | tuesday   | `From 2pm`                           | `2:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 539 | wednesday | `From 4pm`                           | `4:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 539 | thursday  | `From 2pm`                           | `2:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 544 | monday    | `After 5:30`                         | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 544 | tuesday   | `After 5:30`                         | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 544 | wednesday | `After 5:30`                         | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 544 | thursday  | `After 5:30`                         | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 544 | friday    | `After 5:30`                         | *(empty)*               | null         | RECOVERED-TO-BLANK  |
| 544 | saturday  | `After 12`                           | `12:00 PM - 5:00 PM`   | null         | RECOVERED-TO-HOURS  |
| 546 | saturday  | `occasionally`                       | `occasionally`          | unparseable  | STILL-UNPARSEABLE   |
| 546 | sunday    | `occasionally`                       | `occasionally`          | unparseable  | STILL-UNPARSEABLE   |
| 548 | saturday  | `depends on day, 1-3, some days 10-3`| *(same)*                | unparseable  | STILL-UNPARSEABLE   |
| 550 | monday    | `from 12:00 - 6:00`                  | `12:00 - 6:00`          | null         | RECOVERED-TO-HOURS  |
| 550 | tuesday   | `From 12:00pm' - 6:00`               | `12:00pm' - 6:00`       | unparseable  | STILL-UNPARSEABLE   |
| 550 | wednesday | `From 12:00 - 6:00`                  | `12:00 - 6:00`          | null         | RECOVERED-TO-HOURS  |
| 550 | saturday  | `From 12:00 - 6:00`                  | `12:00 - 6:00`          | null         | RECOVERED-TO-HOURS  |
| 551 | monday    | `After 4`                            | `4:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 551 | tuesday   | `After 4`                            | `4:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 551 | wednesday | `After 4`                            | `4:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 551 | thursday  | `After 4`                            | `4:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 551 | friday    | `After 4`                            | `4:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 552 | monday    | `From 9 am`                          | `9:00 AM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 552 | tuesday   | `From 2pm`                           | `2:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 552 | wednesday | `From 4pm`                           | `4:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 552 | thursday  | `From 2pm`                           | `2:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 552 | sunday    | `From 9 am`                          | `9:00 AM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 553 | monday    | `after 4`                            | `4:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 553 | saturday  | `after 4`                            | `4:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 553 | sunday    | `after 4`                            | `4:00 PM - 5:00 PM`    | null         | RECOVERED-TO-HOURS  |
| 555 | thursday  | `12:00 pm 2:00 pm`                   | `12:00 - 2:00`          | null         | RECOVERED-TO-HOURS  |
| 556 | monday    | `Early mornings`                     | `9:00 AM - 12:00 PM`   | interpreted  | INTERPRETED         |
| 556 | tuesday   | `Early mornings`                     | `9:00 AM - 12:00 PM`   | interpreted  | INTERPRETED         |
| 556 | wednesday | `Early mornings`                     | `9:00 AM - 12:00 PM`   | interpreted  | INTERPRETED         |
| 556 | thursday  | `Early mornings`                     | `9:00 AM - 12:00 PM`   | interpreted  | INTERPRETED         |
| 556 | friday    | `Early mornings`                     | `9:00 AM - 12:00 PM`   | interpreted  | INTERPRETED         |
| 559 | monday    | `Afternoons`                         | `12:00 PM - 5:00 PM`   | interpreted  | INTERPRETED         |
| 560 | monday    | `Afternoons`                         | `12:00 PM - 5:00 PM`   | interpreted  | INTERPRETED         |

---

## Bucket Totals [VERIFIED]

Produced by calling the shipped `normalizeAvailabilityString` from `dist/availabilityParse.js` on every currently-flagged cell.

| Bucket | Cells | Meaning |
|--------|-------|---------|
| **RECOVERED-TO-HOURS** | 37 | Flag clears, non-empty time range → will light grid cells |
| **RECOVERED-TO-BLANK** | 15 | Flag clears, empty text → correctly white (out-of-hours, e.g. "After 6pm") |
| **INTERPRETED** | 17 | Mapped to a known time range via expanded table |
| **STILL-UNPARSEABLE** | 16 | No change — genuinely human text |
| **TOTAL** | **85** | Matches prior diagnosis |

**Recovery rate: 69/85 cells (81%) will be fixed by the backfill.**

### Volunteer-level impact

| Metric | Count |
|--------|-------|
| Distinct volunteers with flagged cells | 27 |
| Volunteers becoming **fully clean** (all flagged cells recover) | **16** |
| Volunteers with ≥1 cell still unparseable | 11 |

---

## Still-Unparseable Distinct Strings

12 distinct strings that the backfill will NOT fix:

| Count | Raw string |
|-------|-----------|
| 2× | `7:00 - 11am after 3:30` (compound range with gap) |
| 2× | `Most of the day` (vague) |
| 2× | `not available` (negation) |
| 2× | `occasionally` (frequency) |
| 1× | `Never` (refusal) |
| 1× | `Some availability` (vague) |
| 1× | `Prefer not - do Saturday` (preference note) |
| 1× | `3:00 - whenever` (non-numeric end token) |
| 1× | `not availabe` (typo negation) |
| 1× | `10/13` (date, not time) |
| 1× | `depends on day, 1-3, some days 10-3` (conditional compound) |
| 1× | `From 12:00pm' - 6:00` (stray apostrophe in OCR) |

These are genuinely unstructured human text or OCR artifacts that require manual review.
