# Volunteer Duplicate Candidates — Legacy-Timeclock vs Other Sources

**Date:** 2026-06-26 22:09 UTC
**Scope:** 10 `legacy-timeclock` profiles matched against 426 profiles from other sources
**Test rows excluded:** 0 (no `__TEST_DATA_PHASE21__` rows exist)

---

## Summary

| Result | Count |
|--------|-------|
| Legacy profiles examined | 10 |
| With candidate match | **3** |
| Without match (unique) | **7** |
| Multi-match (ambiguous) | 0 |
| Total candidate pairs | 3 |

All 3 matches are near-email + name matches. No exact email matches, no phone matches (legacy rows have no phones). All 3 bulk_import counterparts are significantly richer.

---

## Candidate Pair 1 — Emely / Emelyn Mazariego

**Confidence: HIGH** (near-identical email + last name match)
**Basis:** email `emelym0827` vs `emelym27` (differs by `08`), last name identical, first name variant (Emely/Emelyn)

| Field | Legacy #422 | Match #221 |
|-------|-------------|------------|
| full_name | Emely Mazariego | Emelyn Mazariego |
| email | emelym0827@icloud.com | emelym27@icloud.com |
| cell_phone | — | 845-390-8840 |
| home_phone | — | — |
| address_city | — | Pomona |
| address_state | — | NY |
| age_18_or_older | — | 1 (yes) |
| tags | — | [] |
| submission_source | legacy-timeclock | bulk_import_2026 |
| submitted_at | 2026-05-14 | 2026-03-28 |
| status | approved | approved |
| **completeness** | **1** (email only) | **8** |
| timeclock shifts | 1 | 0 |

**Richer record: #221 (bulk_import)** by 8 to 1.
**Note:** Legacy #422 has 1 timeclock shift linked to it; #221 has 0. A merge would need to reassign the shift's `volunteer_id`.

---

## Candidate Pair 2 — Melissa Ortega / Melissa Huitzil Ortega

**Confidence: HIGH** (near-identical email + last name match)
**Basis:** email `meli31ho` vs `meli3ho` (differs by `1`), last name Ortega in both, match has middle name "Huitzil"

| Field | Legacy #423 | Match #261 |
|-------|-------------|------------|
| full_name | Melissa Ortega | Melissa Huitzil Ortega |
| email | meli31ho@icloud.com | meli3ho@icloud.com |
| cell_phone | — | 347-992-4667 |
| home_phone | — | — |
| address_city | — | Pearl River |
| address_state | — | NY |
| age_18_or_older | — | 0 (under 18) |
| tags | — | ["under_18"] |
| submission_source | legacy-timeclock | bulk_import_2026 |
| submitted_at | 2026-05-14 | 2025-06-09 |
| status | approved | approved |
| **completeness** | **1** (email only) | **7** |
| timeclock shifts | 1 | 0 |

**Richer record: #261 (bulk_import)** by 7 to 1.
**Note:** Legacy #423 has 1 timeclock shift linked to it; #261 has 0. Same merge caveat.

---

## Candidate Pair 3 — Daria Koziol / Daria Kozoil

**Confidence: HIGH** (near-identical email + near-identical name — single letter transposition)
**Basis:** email `dariakoziol10` vs `dariakozoil10` (transposed `i`/`o`), name Koziol vs Kozoil (same transposition)

| Field | Legacy #424 | Match #181 |
|-------|-------------|------------|
| full_name | Daria Koziol | Daria Kozoil |
| email | dariakoziol10@gmail.com | dariakozoil10@gmail.com |
| cell_phone | — | 973-415-4855 |
| home_phone | — | — |
| address_city | — | Garfield |
| address_state | — | NJ |
| age_18_or_older | — | 0 (under 18) |
| tags | — | ["under_18"] |
| submission_source | legacy-timeclock | bulk_import_2026 |
| submitted_at | 2026-05-14 | 2026-01-29 |
| status | approved | approved |
| **completeness** | **1** (email only) | **8** |
| timeclock shifts | 2 | 0 |

**Richer record: #181 (bulk_import)** by 8 to 1.
**Note:** Legacy #424 has 2 timeclock shifts linked to it; #181 has 0. Same merge caveat. One of the two records has the name misspelled — unclear which is canonical without original documents.

---

## No-Match Legacy Profiles (7 — presumed unique)

These 7 `legacy-timeclock` profiles had no email, phone, or name match (exact or fuzzy) against any other source:

| id | full_name | email | completeness |
|----|-----------|-------|-------------|
| 416 | Sandi Schmidt | nyackwinecellar@aol.com | 1 |
| 417 | Kevin O'Donnell | irafrontman@gmail.com | 1 |
| 418 | Christina McGregor | jakebudha@yahoo.com | 1 |
| 419 | Diana Alcantara | dianaalcantara2603@gmail.com | 1 |
| 420 | Brian Masucci | brianthemas@gmail.com | 1 |
| 421 | Karina Barreto | karinabarreto2526@gmail.com | 1 |
| 425 | Nancy Stetter | nstetter23@aol.com | 1 |

All have completeness 1 (email only). These appear to be volunteers who were active in the legacy timeclock system but were not included in the 2026 bulk import. They may represent former volunteers, infrequent volunteers, or people who volunteered under a different arrangement.

---

## Cross-Pair Analysis

### Is bulk_import generally richer?
**Yes, overwhelmingly.** All 3 matched bulk_import profiles have completeness 7–8 (phone, city, state, age, tags, original_files). All 3 legacy profiles have completeness 1 (email only, no other fields populated). The legacy-timeclock import captured only name + email.

### Timeclock shift reassignment needed?
**Yes for all 3 pairs.** The legacy profiles have linked `volunteer_timeclock` records (1, 1, and 2 shifts respectively). The bulk_import counterparts have 0 shifts. If duplicate profiles are merged by keeping the bulk_import row and removing the legacy row, the timeclock shifts' `volunteer_id` must be updated first to point at the surviving row.

### Ambiguous multi-matches?
**None.** Each legacy profile matched at most one other row.

---

## Action Items (for human review only — no automated action taken)

1. **Confirm the 3 pairs are the same person** — the email/name evidence is strong but John should verify
2. **Decide which email spelling is canonical** for each pair (especially Daria Koziol/Kozoil)
3. **If merging:** reassign `volunteer_timeclock.volunteer_id` from legacy id → bulk_import id, then deactivate or delete the legacy profile
4. **The 7 no-match profiles** are unique people with email-only data — decide whether to keep as-is, enrich, or archive
