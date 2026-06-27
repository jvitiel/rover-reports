# Adoptable Animals with Precise-Age Phrasing — Regen Candidates

**Date:** 2026-06-27 21:38 UTC  
**Type:** Read-only inventory  
**Purpose:** Identify live bios generated under the old prompt that contain precise-age language, now that the age-phrasing fix (commit 1182b60) is live

---

## Summary

| Category | Count | Action hint |
|----------|-------|-------------|
| **Senior (7+)** | 20 | KEEP age, regen to round/reframe with dignity |
| **Adult (1–7)** | 44 | DROP age, regen to lead with personality |
| **Young (<1)** | 0 | — |
| **Total** | **64** | |

---

## Seniors (7+) — 20 animals

Age is a selling point for seniors. Regen should KEEP age but round it and use dignity vocabulary ("at 10," "golden years," "distinguished"). Most just need the precise phrasing swapped to a rounded number.

| # | Code | Name | Species | SM Age | Offending phrase | Field | Source | KEEP/DROP |
|---|------|------|---------|--------|-----------------|-------|--------|-----------|
| 1 | A2023267 | Cookie | Dog | 8y6m | "8 years young" | long | promote_from_draft | KEEP — round to "at 8" or "nearly 9," drop "young" |
| 2 | A2023287 | Snowie | Rabbit | 7y2m | "7 years young" | long | promote_from_draft | KEEP — round to "at 7," drop "young" |
| 3 | A2024048 | Leo (Petey) | Dog | 8y2m | "8 years old" | long | promote_from_draft | KEEP — "at 8" acceptable |
| 4 | A2025203 | Marshmallow | Dog | 10y8m | "10-year-old" | long | full_generate | KEEP — "at 10" ⚠️ has wrong-animal caregiver note (Record 2) — regen will produce incorrect personality |
| 5 | R2024018 | Ava | Dog | 8y11m | "8 years and 9 months" | long | backfill | KEEP — round to "nearly 9" |
| 6 | R2024025 | Lucky | Cat | 12y11m | "12 years and 10 months" | long | sm_generate | KEEP — round to "nearly 13" |
| 7 | S2023297 | Iron | Cat | 7y6m | "5 years old" | both | sm_generate | KEEP — ⚠️ bio says 5 but SM says 7.5; bio is factually wrong |
| 8 | S2024694 | Isis the Goddess | Dog | 8y11m | "9 years young" / "nearly 9 year" | long | promote_from_draft | KEEP — round to "nearly 9," drop "young" |
| 9 | S20251008 | Edna | Cat | 9y7m | "9-year-old" | short | backfill | KEEP — round to "nearly 10" |
| 10 | S2025310 | Jax | Dog | 10y1m | "10 years young" | long | promote_from_draft | KEEP — "at 10," drop "young" |
| 11 | S2025833 | Jeans | Cat | 12y9m | "12-year-old" | long | full_generate | KEEP — "at 12" or "nearly 13" |
| 12 | S2025883 | Reeboks | Cat | 10y9m | "10 years young" | long | promote_from_draft | KEEP — "at 10" or "nearly 11," drop "young" |
| 13 | S2025961 | Segundo | Cat | 8y10m | "8 years and 8 months" | long | backfill | KEEP — round to "nearly 9" |
| 14 | S2025966 | Abe (Louie) | Cat | 9y7m | "9-year-old" | both | backfill | KEEP — round to "nearly 10" |
| 15 | S2026028 | Macy | Cat | 7y5m | "7 years old" | long | manual_edit_short | KEEP — "at 7" acceptable |
| 16 | S2026126 | Osuna | Dog | 7y4m | "7-year-old" | long | promote_from_draft | KEEP — "at 7" acceptable |
| 17 | S2026133 | Abstract | Dog | 8y4m | "8-year-old" | long | manual_edit_short | KEEP — "at 8" acceptable |
| 18 | S2026134 | Donny | Dog | 16y4m | "16 years young" | long | backfill | KEEP — "at 16," drop "young" |
| 19 | S2026557 | Buddy | Cat | 15y0m | "15-year-old" | long | promote_from_draft | KEEP — "at 15" acceptable |
| 20 | S2026558 | Holly | Cat | 10y0m | "10 years old" | both | promote_from_draft | KEEP — "at 10" acceptable |

---

## Adults (1–7) — 44 animals

Age adds nothing for adults. Regen should DROP age entirely and lead with personality, breed traits, or quirks. The new prompt instructs this by default.

| # | Code | Name | Species | SM Age | Offending phrase | Field | Source | KEEP/DROP |
|---|------|------|---------|--------|-----------------|-------|--------|-----------|
| 1 | A2023301 | Zelda (Annex Cat) | Cat | 4y0m | "nearly four years old" | long | backfill | DROP |
| 2 | A2024053 | Nanook | Dog | 3y8m | "3-year-old" | long | promote_from_draft | DROP |
| 3 | A2024185 | Amari | Dog | 3y2m | "3-year-old" | long | manual_edit_short | DROP |
| 4 | A2025018 | Ryder | Dog | 2y1m | "two-year-old" | long | promote_from_draft | DROP |
| 5 | A2025088 | Achilles | Dog | 3y0m | "three-year-old" | both | promote_from_draft | DROP |
| 6 | A2025100 | Jasper | Dog | 6y0m | "6 years old" / "6-year-old" | both | sm_generate | DROP |
| 7 | A2025114 | Rex | Dog | 6y0m | "nearly six years old" | long | full_generate | DROP |
| 8 | A2025138 | Juno | Dog | 4y11m | "4-year-old" | long | promote_from_draft | DROP |
| 9 | A2025167 | Dodger | Dog | 1y9m | "1 year and 9 months" | both | promote_from_draft | DROP |
| 10 | A2025233 | Duke | Dog | 3y0m | "3-year-old" | both | promote_from_draft | DROP |
| 11 | A2026025 | Tex | Dog | 1y4m | "just over a year" | long | promote_from_draft | DROP |
| 12 | A2026036 | Milo | Dog | 3y4m | "3 years and 4 months" | long | promote_from_draft | DROP |
| 13 | A2026050 | Bolt | Dog | 1y3m | "just over a year" | long | promote_from_draft | DROP |
| 14 | A2026061 | Clover | Dog | 5y2m | "5 years old" / "5-year-old" | both | regenerate_long | DROP |
| 15 | B2026001 | Arnold | Cat | 3y5m | "3 years and 5 months" | long | promote_from_draft | DROP |
| 16 | R2023007 | Charlie | Rabbit | 3y8m | "3 years and 8 months" / "3 years old" | both | promote_from_draft | DROP |
| 17 | R2023065 | Butterscotch | Rabbit | 3y6m | "3 years and 6 months" | long | promote_from_draft | DROP |
| 18 | R2024016 | Cookie | Rabbit | 2y9m | "2 years and 8 months" | long | full_generate | DROP |
| 19 | R2025003 | Caramel | Rabbit | 2y3m | "just over two year" | long | promote_from_draft | DROP |
| 20 | R2025005 | Peanut Butter | Rabbit | 2y3m | "two-year-old" / "2 years old" | both | manual_edit_long | DROP |
| 21 | R2025054 | Jasmine | Rabbit | 1y5m | "1 year and 4 months" / "just over a year" | both | manual_edit_long | DROP |
| 22 | R2026006 | Hopper | Rabbit | 2y2m | "2-year-old" | both | full_generate | DROP |
| 23 | R2026007 | Anastasia | Rabbit | 1y3m | "just over a year" | long | promote_from_draft | DROP |
| 24 | S20241035 | Starr | Cat | 5y9m | "5-year-old" | long | backfill | DROP |
| 25 | S20241099 | Dante | Cat | 3y8m | "3 years and 8 months" | long | promote_from_draft | DROP |
| 26 | S20241161 | Munster | Cat | 4y7m | "4 years and 7 months" | long | sm_generate | DROP |
| 27 | S2024718 | Bailey | Dog | 2y8m | "2 years old" | long | promote_from_draft | DROP |
| 28 | S20251236 | Blizzard | Cat | 2y0m | "2 years old" / "nearly 2 year" | long | promote_from_draft | DROP |
| 29 | S2025131 | Scottie | Dog | 3y5m | "3-year-old" | long | promote_from_draft | DROP |
| 30 | S2025546 | Billy Boy | Cat | 5y5m | "5 years old" | long | manual_edit_long | DROP |
| 31 | S2025877 | Kirby | Ferret | 3y5m | "3 years and 5 months" | long | manual_edit_short | DROP |
| 32 | S2026031 | Oreo | Dog | 1y11m | "1 year and 10 months" | short | promote_from_draft | DROP |
| 33 | S2026047 | Buckley | Cat | 2y1m | "1 year and 11 months" | long | backfill | DROP |
| 34 | S2026079 | Nena | Dog | 1y4m | "just over a year" | long | promote_from_draft | DROP |
| 35 | S2026081 | Gigi | Dog | 3y4m | "3 years old" | long | promote_from_draft | DROP |
| 36 | S2026153 | Olaf | Rabbit | 1y9m | "1 year and 8 months" | long | full_generate | DROP |
| 37 | S2026155 | Elsa | Rabbit | 2y3m | "just over two year" | long | promote_from_draft | DROP |
| 38 | S2026158 | Mambo | Dog | 1y3m | "1 year old" | both | manual_edit_short | DROP |
| 39 | S2026177 | Stevie | Cat | 5y3m | "5 years old" | long | full_generate | DROP |
| 40 | S2026268 | Juliet | Cat | 1y9m | "1 year and 8 months" | long | promote_from_draft | DROP |
| 41 | S2026519 | Luna Tuna | Cat | 1y3m | "just over a year" | long | promote_from_draft | DROP |
| 42 | S2026527 | Mothra | Cat | 1y6m | "1 year and 6 months" | long | promote_from_draft | DROP |
| 43 | W2026072 | Confetti | Cat | 5y0m | "5-year-old" | long | promote_from_draft | DROP |
| 44 | W2026074 | Nocturne | Cat | 1y6m | "1 year and 6 months" | long | promote_from_draft | DROP |

---

## Flags / Notes

- **A2025203 (Marshmallow):** Has a wrong-animal caregiver note (Record 2, filed 2026-06-27). Regen will produce incorrect personality until the bad record is removed. See report-20260627-bio-behavioral-input.md.
- **S2023297 (Iron):** Bio says "5 years old" but SM age is 7y6m. Bio is factually stale — was likely generated when the animal was younger, or the SM age is wrong.
- **S2026047 (Buckley):** Bio says "1 year and 11 months" but SM age is now 2y1m. Age has drifted since bio was written.
- Several bios show small age drift (bio says X, SM now says X+a few months) — expected since bios are point-in-time snapshots.
