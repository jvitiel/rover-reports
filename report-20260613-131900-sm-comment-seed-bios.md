# SM-Comment-Seeded Bio Eligible Animals (Adoptable, Substantive SM Comments)
**Generated:** 2026-06-13 13:19 ET (read-only diagnosis)

## Source of Truth & Methodology

**Table:** `animal_bios_history` — column `source = 'sm_generate'` marks bios generated from ANIMALCOMMENTS seed.

**Code path** (server.ts ~L2125): When an animal has no caregiver `behavior_notes` but has a non-empty SM `ANIMALCOMMENTS` (field: `animal.description`), the bio generator uses the SM comment as the transcript input and records `source = 'sm_generate'`.

**Filters applied:**
1. Adoptable (`isAvailable = true` from SM API)
2. Has non-empty ANIMALCOMMENTS in ShelterManager
3. Has NO caregiver `behavior_notes` records (would use `full_generate` path instead)
4. ANIMALCOMMENTS content is **substantive** — excludes 41 animals whose SM comment is our own generic bio template text ("Meet [name]! This adorable kitten is so young that we're still getting to know their personality…"), which was backfilled to SM from our generic bio job

## Query

Cross-reference of SM API `/api/animals` (for `description` / `isAvailable`) against SQLite `behavior_notes` table (for exclusion) and template-text detection.

```python
# Animals from SM API where:
#   description.strip() is non-empty
#   shelterCode NOT IN behavior_notes table
#   isAvailable == True
#   description does NOT contain generic template markers
```

## Results: 23 Animals (19 Dogs, 4 Cats)

### Dogs (19)

| Name | Species |
|------|---------|
| Bolt | Dog |
| Cookie | Dog |
| Dodger | Dog |
| Duke | Dog |
| Gigi | Dog |
| Isis the Goddess | Dog |
| Jasper | Dog |
| Jax | Dog |
| Juno | Dog |
| Kobe | Dog |
| Leo (Petey) | Dog |
| Mambo | Dog |
| Milo | Dog |
| Muppett | Dog |
| Nanook | Dog |
| Nova | Dog |
| Osuna | Dog |
| Ryder | Dog |
| Tex | Dog |

### Cats (4)

| Name | Species |
|------|---------|
| Blizzard | Cat |
| Iron | Cat |
| Lucky | Cat |
| Munster | Cat |

## Count vs Expectation

**Actual: 23 (19 dogs + 4 cats).** Expected ~24 (19 dogs + 5 cats).

Dogs match exactly at 19. Cats are 4 vs expected 5 — off by one. Possible explanations:
- One cat may have been adopted or made unavailable since the count was last checked
- One cat may have had caregiver behavior_notes added since the last count
- The original count may have included one borderline case

## Note on Generation Status

Of these 23 animals, only **1** (Iron) has actually had a bio generated through the `sm_generate` path. The remaining 22 are eligible but have not yet had the "Generate Bio" button clicked on the dashboard. The sm_generate code path (commit `f89b01d`, 2026-06-12) enabled the capability but does not batch-generate.
