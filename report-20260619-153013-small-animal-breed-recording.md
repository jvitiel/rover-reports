# Small-Animal Breed Recording: How Reliably Is Breed Recorded?

**Date:** 2026-06-19 15:30 ET  
**Pool:** 19 adoptable small animals from `fetchAnimals()`  
**Status:** READ-ONLY DIAGNOSIS — no code changes

---

## HEADLINE

**84.2% of smalls have a real specific breed** (16/19). But this is entirely driven by rabbits — the only species with meaningful breed data. [VERIFIED]

| Species | Count | Real Breed | Generic/Self-Named | % Real |
|---------|-------|-----------|-------------------|--------|
| **Rabbit** | 16 | **16** | 0 | **100%** |
| Chinchilla | 1 | 0 | 1 ("Chinchilla") | 0% |
| Ferret | 1 | 0 | 1 ("Ferret") | 0% |
| Guinea Pig | 1 | 0 | 1 ("Guinea Pig") | 0% |

**Rabbits: state breed — it's always recorded and meaningful.**  
**Chinchilla/Ferret/Guinea Pig: drop breed — the breed field just echoes the species name.** [VERIFIED]

---

## Full List

| Code | Species | Breed | Name | Age | Sex | Color |
|------|---------|-------|------|-----|-----|-------|
| R2026007 | Rabbit | **Lop Eared** | Anastasia | 1yr 2mo | F | White |
| S2026154 | Rabbit | **American** | Anna | 8mo | F | White |
| R2023065 | Rabbit | **American** | Butterscotch | 3yr 6mo | F | Brown |
| R2026003 | Rabbit | **Hotot** | Callie Rabbit | 1yr 4mo | F | White and Black |
| R2025003 | Rabbit | **American** | Caramel | 2yr 3mo | F | Brown |
| R2023007 | Rabbit | **Hotot** | Charlie | 3yr 8mo | M | White and Black |
| S2026190 | Rabbit | **American** | Clover | 25wk | M | White |
| R2024016 | Rabbit | **American** | Cookie | 2yr 9mo | M | Brown and White |
| R2025039 | Rabbit | **American** | Cookies and Cream | 2yr 10mo | F | Black and White |
| S2026155 | Rabbit | **American** | Elsa | 2yr 3mo | F | White |
| S2026403 | Chinchilla | ~~Chinchilla~~ | Fluffy | 4yr 1mo | M | Black and Grey |
| R2026006 | Rabbit | **Lion Head** | Hopper | 2yr 2mo | M | White and Brown |
| R2025054 | Rabbit | **Florida White** | Jasmine | 1yr 5mo | F | White |
| S2025877 | Ferret | ~~Ferret~~ | Kirby | 3yr 5mo | F | Brown and White |
| R2025037 | Rabbit | **American** | Maria | 5yr 11mo | F | Brown and White |
| S2026153 | Rabbit | **American** | Olaf | 1yr 9mo | M | White |
| R2025005 | Rabbit | **American** | Peanut Butter | 2yr 3mo | M | Brown |
| A2023287 | Rabbit | **Dwarf** | Snowie | 7yr 2mo | F | White |
| G2026002 | Guinea Pig | ~~Guinea Pig~~ | Tater Tot | 14wk | M | Tricolour |

---

## Rabbit Breed Distribution

| Breed | Count | % of Rabbits |
|-------|-------|-------------|
| American | 10 | 62.5% |
| Hotot | 2 | 12.5% |
| Lop Eared | 1 | 6.25% |
| Lion Head | 1 | 6.25% |
| Florida White | 1 | 6.25% |
| Dwarf | 1 | 6.25% |

All 6 rabbit breed values are real, recognizable breed names. "American" dominates (62.5%) but is still a real breed (American Rabbit), not a placeholder. [VERIFIED]

---

## Data Quirk: Breed = Species for Non-Rabbits

Fluffy's breed is "Chinchilla," Kirby's is "Ferret," Tater Tot's is "Guinea Pig." The breed field echoes the species name verbatim — the SM system records the species as the breed when no breed applies. This is a common pattern for animals where breed isn't a meaningful concept or isn't tracked by the shelter.

This means a prompt rule like "state breed if recorded" would produce "Fluffy is a Chinchilla Chinchilla" — the breed field must be **suppressed** when it equals the species. [VERIFIED]

---

## Recommendation for Prompt Rule

**Conditional:** State breed for rabbits (always meaningful). For chinchilla/ferret/guinea pig, suppress breed — the field echoes the species name. Implementation: in the per-animal payload builder, suppress the breed line when `breed.toLowerCase() === species.toLowerCase()`. This covers the current self-named pattern and any future small animal with the same quirk.
