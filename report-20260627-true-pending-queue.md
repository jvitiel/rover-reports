# True Pending Bio Queue (Post-Fix Projection)

**Date:** 2026-06-27 19:58 UTC  
**Type:** Read-only diagnosis  
**Purpose:** Show the real review workload once both bugs are fixed and 3 stale drafts cleaned

---

## Summary Numbers

| Metric | Count |
|--------|-------|
| **Adoptable pending** (staff default view) | **8** |
| **Unavailable pending** | **21** |
| **Total pending** | **29** |
| Youth with drafts (will age into pending) | 3 |

Current dashboard shows 11 adoptable pending (Media tab) or 0 (Profiles tab). Post-fix, both tabs would agree on **8 adoptable pending** — the 3-count drop is the stale drafts (Kirby, Mambo, Peanut Butter) correctly moving to "approved."

---

## 1. The True Pending Set

### ADOPTABLE — 8 animals (all are REVISION: approved bio exists, newer draft awaiting review)

| # | Code | Name | Species | Pending Reason | Draft Source | Draft Date | Bio Approved |
|---|------|------|---------|----------------|-------------|------------|-------------|
| 1 | A2025203 | Marshmallow | Dog | Revision | from_profile | 2026-06-27 | 2026-05-22 (long) |
| 2 | B2026001 | Arnold | Cat | Revision | from_profile | 2026-06-27 | 2026-06-27 |
| 3 | R2023007 | Charlie | Rabbit | Revision | from_profile | 2026-06-16 | 2026-06-15 |
| 4 | R2026008 | Willow the Rabbit | Rabbit | Revision (long only) | from_profile | 2026-06-27 | 2026-06-27 |
| 5 | S2024718 | Bailey | Dog | Revision | from_profile | 2026-06-25 | 2026-06-15 |
| 6 | S2025966 | Abe (Louie) | Cat | Revision | from_profile | 2026-06-16 | 2026-04-23 |
| 7 | S2026047 | Buckley | Cat | Revision | from_profile | 2026-06-27 | 2026-04-25 |
| 8 | S2026081 | Gigi | Dog | Revision | from_sm | 2026-06-25 | 2026-06-15 |

All 8 have live public bios already. The drafts are newer profile-based or SM-based revisions waiting for staff to review and promote. **No adoptable animal is missing a bio entirely.**

### UNAVAILABLE — 21 animals

#### NO_BIO: no bio at all, draft is first bio (11 animals)

| # | Code | Name | Species | Draft Source | Draft Date |
|---|------|------|---------|-------------|------------|
| 1 | A2024017 | Murphy (Brus) | Dog | from_sm | 2026-06-26 |
| 2 | A2025063 | Sparky | Dog | from_sm | 2026-06-26 |
| 3 | S2024005 | Stormy | Dog | from_sm | 2026-06-26 |
| 4 | S2024265 | Koko | Dog | from_sm | 2026-06-26 |
| 5 | S2026131 | Sky | Dog | from_sm | 2026-06-26 |
| 6 | S2026166 | Prince | Dog | from_sm | 2026-06-26 |
| 7 | S2026219 | Jellybean | Cat | from_profile | 2026-06-25 |
| 8 | S2026244 | Lucy Furr | Cat | from_sm | 2026-06-26 |
| 9 | S2026247 | Imp | Cat | from_sm | 2026-06-26 |
| 10 | S2026555 | Chip | Cat | from_sm | 2026-06-26 |
| 11 | S2026556 | Dale | Cat | from_sm | 2026-06-26 |

#### BROKEN_PIPELINE: real staff content but no approved real bio, no draft (12 animals)

These are pending via the `brokenPipeline` path in `computeBioState` — they have caregiver profiles or meaningful SM descriptions but no approved non-generic bio has been produced. No draft exists for them, so there's nothing to promote; they need a bio to be generated first.

| # | Code | Name | Species | Notes |
|---|------|------|---------|-------|
| 1 | A2025234 | Jinx | Dog | |
| 2 | R2024034 | Buddy | Dog | |
| 3 | R2026005 | Riley | Cat | |
| 4 | S20251050 | Bella Luna | Cat | |
| 5 | S2025231 | Ben | Cat | |
| 6 | S2025810 | Harold | Cat | |
| 7 | S2025963 | Pebble | Cat | |
| 8 | S2026078 | Mia | Cat | |
| 9 | S2026162 | Oxford | Cat | |
| 10 | S2026237 | Zelda | Cat | Has partial bio (long approved, short draft) |
| 11 | S2026359 | Dandelion | Cat | |
| 12 | S2026570 | Poppy | Dog | |

---

## 2. Split by Adoptable

| Filter | Pending Count | What Staff See |
|--------|--------------|----------------|
| **Adoptable only** (default) | **8** | All 8 are revisions — every adoptable animal already has a public bio |
| All animals | 29 | 8 revisions + 11 no-bio + 12 broken-pipeline (all non-adoptable) |

**Key takeaway for staff:** The adoptable pending queue contains zero animals missing a bio. All 8 are improvement drafts on animals that already have live approved bios. This is lower-priority review work, not urgent gaps.

---

## 3. Exclusions Confirmed

- ✅ **3 stale drafts excluded:** Kirby (S2025877), Mambo (S2026158), Peanut Butter (R2025005) are NOT in this list. After cleanup, they correctly move to "approved."
- ✅ **No generic-sourced noise:** All drafts in this list have `source_long`/`source_short` of `from_profile` or `from_sm` — real staff content or SM descriptions, not generic placeholders.
- ✅ **2 not-in-SM animals excluded:** S2026357 and S2026560 have draft rows and generic_adult bios in the DB but are no longer in ShelterManager (likely adopted/transferred). They don't appear in either API endpoint.

---

## 4. Priority Triage (Adoptable Only)

### No urgent gaps

All 8 adoptable pending animals already have live approved bios. The pending drafts are revisions — nice to review but not blocking any animal from having a public bio.

### Suggested review order (by staleness of current bio)

| Priority | Code | Name | Current Bio Age | Draft Waiting Since |
|----------|------|------|----------------|-------------------|
| 1 | S2025966 | Abe (Louie) | 65 days (backfill Apr 23) | Jun 16 (11 days) |
| 2 | S2026047 | Buckley | 63 days (backfill Apr 25) | Jun 27 (today) |
| 3 | S2024718 | Bailey | 12 days (promoted Jun 15) | Jun 25 (2 days) |
| 4 | R2023007 | Charlie | 12 days (promoted Jun 15) | Jun 16 (11 days) |
| 5 | S2026081 | Gigi | 12 days (promoted Jun 15) | Jun 25 (2 days) |
| 6 | A2025203 | Marshmallow | 36 days (full_generate May 22) | Jun 27 (today) |
| 7 | B2026001 | Arnold | 0 days (promoted today) | Jun 27 (today) |
| 8 | R2026008 | Willow | 0 days (promoted today) | Jun 27 (today) |

Abe and Buckley have the oldest bios (backfill from April) — their newer profile-based drafts would be the biggest quality improvement.

---

## Appendix: Youth Approaching Pending

3 adoptable youth animals have unpromoted real drafts and will age into "pending" when they pass 84 days:

| Code | Name | Species | Current Age | Becomes Pending |
|------|------|---------|-------------|----------------|
| S2026454 | Scarecrow | Cat | 75 days | 2026-07-07 (10 days) |
| S2026502 | Chipotle Mayo | Cat | 73 days | 2026-07-09 (12 days) |
| S2026571 | Handsome | Cat | 61 days | 2026-07-21 (24 days) |

These currently show as "youth" (correct — they're under 84 days). Once they age past the threshold, they'll appear as pending with generic placeholder bios and real profile-based drafts ready to promote. Currently have generic/generic_adult bios.
