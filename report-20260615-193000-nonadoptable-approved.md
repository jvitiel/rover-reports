# Non-adoptable "approved" bios — source confirmation

**Date:** 2026-06-15 19:30 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Context

After the adult-intake run, the dashboard "Adoptable & Pending → approved" tile didn't move (73), but the "All → approved" tile shows 302. The question: where do the extra ~229 come from?

## Answer: 226 youth + 3 legacy approved + 73 adoptable approved = 302

The "approved" tile counts `bioState === 'approved' || bioState === 'youth'`. The delta between "All" (302) and "Adoptable" (73) is **229 non-adoptable animals**:

| bioState | Non-adoptable | Adoptable | All |
|----------|--------------|-----------|-----|
| approved | 3 | 29 | 32 |
| youth | 226 | 44 | 270 |
| **Tile total** | **229** | **73** | **302** |
| pending | 21 | 40 | 61 |
| needed | 92 | 37 | 129 |
| **Population** | **342** | **150** | **492** |

The ~229 is overwhelmingly **youth** (226 non-adoptable kittens/puppies under 84 days), not approved bios.

---

## Q1: Non-adoptable with bioState='approved'

**3 animals.** Not ~229 — the ~229 includes 226 youth.

## Q2: last_source breakdown of the 3

| Source | Count |
|--------|-------|
| backfill | 2 |
| full_generate | 1 |
| **generic_adult** | **0** |

**Zero are generic_adult.** None came from today's adult-intake run.

Additionally confirmed: of all 70 generic_adult bio rows in the database, **0 are on non-adoptable animals**. Every generic_adult bio is on an adoptable animal.

## Q3: Approval dates

| Date | Count |
|------|-------|
| 2026-04-22 | 1 |
| 2026-04-28 | 1 |
| 2026-06-01 | 1 |

**All 3 predate today (2026-06-15).** None were created by today's run.

## Q4: Adoption status

| Flag | Count |
|------|-------|
| adoptionPending | 0 |
| isAvailable=false | 3 |

Locations suggest these animals left the adoptable population through adoption or transfer:

| Code | Name | Location |
|------|------|----------|
| R2025053 | Aladdin | Adoption::Gianna Camille Sahirul |
| S2026291 | Rosie Cotton | Annex |
| S2026237 | Zelda | Catio |

Aladdin appears adopted (Adoption:: prefix). Rosie Cotton and Zelda are in shelter locations but marked non-available by SM.

## Q5: Sample — all 3

| Code | Name | isAvailable | bioState | lastSource | approvedAtLong |
|------|------|-------------|----------|------------|----------------|
| R2025053 | Aladdin | false | approved | backfill | 2026-04-22 |
| S2026291 | Rosie Cotton | false | approved | full_generate | 2026-06-01 |
| S2026237 | Zelda | false | approved | backfill | 2026-04-28 |

---

## The 226 youth non-adoptable

These are the bulk of the "All minus Adoptable" delta. They're non-available kittens/puppies aged ≤84 days — `computeBioState` returns 'youth' (Rule 3), and the tile counts youth as "approved":

- **216 cats**, 9 dogs, 1 rabbit
- Top locations: Cat Room 4, URI/ISO, various fosters
- No bios needed — they're young, non-available, and correctly labeled 'youth'

## Conclusion

**Confirmed: the non-adoptable "approved" animals are 3 pre-existing staff-authored bios (April–June) on animals that left the adoptable population. Zero are from today's adult-intake run. The apparent ~229 gap is dominated by 226 non-adoptable youth counted under the "approved+youth" tile metric.**
