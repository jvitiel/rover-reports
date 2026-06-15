# Adult-at-intake bio gap — adoptable animals with no automatic bio path

**Date:** 2026-06-15 17:45 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## 1. Adoptable animals with NO animal_bios row

Of **150** adoptable animals, **81** have an `animal_bios` row and **69 do not**.

All 69 have SM comments (description non-empty). 20 of the 69 also have caregiver profiles (behavior_notes).

| Code | Name | Age (days) | SM? | Profile? |
|------|------|-----------|-----|----------|
| S2025206 | Lacey | 5,899 | Y | N |
| S2025503 | Cheshire | 4,013 | Y | N |
| S2025883 | Reeboks | 3,922 | Y | Y |
| S2025310 | Jax | 3,684 | Y | N |
| A2023278 | Honey | 3,180 | Y | N |
| ... | *(63 more — full list in raw data)* | ... | ... | ... |
| S2026357 | Lilac | 85 | Y | Y |
| S2026447 | Karen Smith | 59 | Y | Y |

**68** of the 69 are over 84 days old (adults). Only **1** (Karen Smith, 59 days) is youth-eligible.

## 2. The adult-at-intake gap

All 68 adult animals with no bio were **never youth-eligible** (they entered the shelter already over 12 weeks old, or the youth-generic job didn't exist when they were young). Neither daily job pass catches them:

- **findGenericBioCandidates** (youth pass) skips them — age > 84 days
- **findAgedOutGenerics** (age-crossing pass) skips them — no existing bio with `last_source='generic'`

These 68 animals have **no automatic path to any bio** — not a generic, not a draft, nothing. The only way they get a bio today is:

1. A staff member manually clicks "Generate Bios" on the dashboard (which now writes a draft via `saveAnimalBioDraft`)
2. A caregiver saves a profile for them (which now fires background draft generation via `generateBioDraftForAnimal`)

**20 of the 68 already have profiles** — these would have gotten a draft automatically if the profile-save trigger (commit `e6d1b39`) had existed when the profile was saved. They still have no bio because the trigger didn't exist at profile-save time.

## 3. Daily job selection conditions [VERIFIED]

### Pass 1 — findGenericBioCandidates (server.ts:11462)
```
Selection: adoptable AND age ≤ 84 days AND no behavior_notes AND no animal_bios row
```
- `fetchAnimals({ includeUnavailable: false })` → adoptable only
- `ageInDays(animal.dateOfBirth) > GENERIC_BIO_MAX_AGE_DAYS` → **skip if age > 84 days** [VERIFIED]
- `getBehaviorNotes(animal.shelterCode)` → skip if profile exists
- `getAnimalBio(animal.shelterCode)` → **skip if any animal_bios row exists** [VERIFIED]

**Youth only. Requires no existing bio AND age ≤ 84 days.** [VERIFIED]

### Pass 2 — findAgedOutGenerics (server.ts:11694)
```
Selection: adoptable AND has animal_bios row AND last_source='generic' AND age > 84 days
```
- `getAnimalBio(animal.shelterCode)` → **skip if NO bio** (`if (!bio) continue`) [VERIFIED]
- `bio.lastSource !== 'generic'` → **skip if source is anything other than 'generic'** [VERIFIED]
- `ageInDays(animal.dateOfBirth) <= GENERIC_BIO_MAX_AGE_DAYS` → skip if still youth-eligible

**Requires an EXISTING youth-generic bio to age out of. Animals that never had a bio are invisible to this pass.** [VERIFIED]

### Confirmation: no code path gives a first bio to an adult with no existing bio

**Confirmed.** No automatic path exists. [VERIFIED]

The gap: an adoptable animal that is >84 days old AND has no `animal_bios` row gets nothing from either daily job pass. The only triggers are manual (dashboard Generate button) or the new profile-save auto-trigger (commit `e6d1b39`, which only fires when a profile is saved going forward — it doesn't backfill).

## Summary

| Category | Count | Auto bio path? |
|----------|-------|---------------|
| Adoptable with bio | 81 | Already have one |
| Youth (≤84d) no bio | 1 | Youth-generic daily job |
| Adult (>84d) no bio, WITH profile | 20 | **None** (profile-save trigger is forward-only) |
| Adult (>84d) no bio, SM comment only | 48 | **None** |
| **Total gap (adult, no bio)** | **68** | **None** |
