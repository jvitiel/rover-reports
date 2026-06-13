# SM-Comment-Seeded Bio Generation Report
**Generated:** 2026-06-13 09:13 ET (read-only diagnosis)

## Source of Truth

**Table:** `animal_bios_history`
**Distinguishing column:** `source`
**SM-comment-seed value:** `source = 'sm_generate'`

The `source` column in `animal_bios_history` tracks the generation pathway for every bio mutation. The relevant values for this analysis:

| source | Meaning |
|--------|---------|
| `full_generate` | Bio generated from caregiver behavior_notes (profile data) |
| `sm_generate` | Bio generated using SM ANIMALCOMMENTS as seed (no caregiver profile exists) |
| `generic` | Template-based bio for animals with NO behavior_notes AND NO ANIMALCOMMENTS |
| `sm_copy` | Direct copy of SM ANIMALCOMMENTS text into bio field |

The `sm_generate` path was enabled by commit `f89b01d` on 2026-06-12 21:40 UTC ("Bio generator: fall back to SM ANIMALCOMMENTS when no caregiver profile exists").

## Query

```sql
SELECT DISTINCT h.shelter_code, m.name, m.species
FROM animal_bios_history h
JOIN animal_metadata m ON m.shelter_code = h.shelter_code
WHERE h.source = 'sm_generate'
ORDER BY
  CASE WHEN m.species = 'Dog' THEN 0 WHEN m.species = 'Cat' THEN 1 ELSE 2 END,
  m.name ASC;
```

## Results: Animals with SM-Comment-Seeded Bios

| Name | Species |
|------|---------|
| Iron | Cat |

**Actual count: 1** (expected ~24)

## Discrepancy Analysis

**Material discrepancy: 1 found vs ~24 expected.**

The commit `f89b01d` enabled the `sm_generate` code path as a fallback in the per-animal bio generator endpoint (`POST /api/bio/generate/:animalId`). This is a click-to-generate feature on the dashboard — it does NOT batch-generate. Only one animal (Iron, S2023297) was actually generated through this path after enablement.

The other recent batch work on 2026-06-12 was the **generic bio job** (commits `e10fc99` through `4a920dd`), which generated 41 template-based bios for animals with NO behavior_notes AND NO ANIMALCOMMENTS. These are explicitly the opposite of SM-comment-seeded — the generic path **skips** any animal that has ANIMALCOMMENTS content.

### Eligible but not yet generated

64 animals currently have ANIMALCOMMENTS in ShelterManager but no caregiver behavior_notes — these are eligible for the `sm_generate` path but have not had bios generated yet:

**Dogs (19):**
Bolt, Cookie, Dodger, Duke, Gigi, Isis the Goddess, Jasper, Jax, Juno, Kobe, Leo (Petey), Mambo, Milo, Muppett, Nanook, Nova, Osuna, Ryder, Tex

**Cats (45):**
Basil, Blizzard, Cardinal, Catherine, Chipotle Mayo, Chives, Cinder, Dale Jr., Danica, Dill, Drizzle, Flame, Flora, Goldfinch, Gretchen Wieners, Heathcliff, Honey Mustard, Iron, Jo March, Ketchup, Kurt, Kyle, Leonardo, Lucky, Meadow, Meadowlark, Meg March, Moonbeam, Munster, Oats, Orchid, Parsley, Peekaboo, Peony, Petal, Puddle, Regina George, Rosemary, Sprout, Stardust, Starlight, Sunny, Thing 1, Thing 2, Wren

John's expected ~24 (19 dogs + 5 cats) matches the **dog count** of the eligible pool (19 dogs) but not the cat count (45 cats, not 5). The 19+5=24 expectation may be based on a subset or a different filter criterion not reflected in the `animal_bios_history` table.
