# Smalls Count Discrepancy: Media Tab (19) vs Profiles Tab (17)

**Date:** 2026-06-14 11:19 ET  
**Type:** Read-only diagnosis  
**Status:** No changes made  

---

## PART 1 — SPECIES BUCKETING ON EACH TAB

### 1a. Media tab: `updateTileCounts` (dashboard/index.html lines 6740–6758)

```javascript
function updateTileCounts(filtered) {
  const cats = filtered.filter(a => (a.species || '').toLowerCase().includes('cat'));
  const dogs = filtered.filter(a => (a.species || '').toLowerCase().includes('dog'));
  const smalls = filtered.filter(a => !cats.includes(a) && !dogs.includes(a));
  // ...
}
```

**Definition:** Catch-all — anything that is NOT a cat and NOT a dog is counted as "smalls." [VERIFIED]

### 1b. Profiles tab: `matchesSpeciesFilter` (dashboard/index.html lines 15135–15141)

```javascript
function matchesSpeciesFilter(species) {
  if (profilesSpeciesFilter === 'all') return true;
  if (profilesSpeciesFilter === 'dog') return species === 'Dog';
  if (profilesSpeciesFilter === 'cat') return species === 'Cat';
  if (profilesSpeciesFilter === 'smalls') return species === 'Rabbit' || species === 'Ferret';
  return true;
}
```

**Definition:** Explicit allow-list — only `Rabbit` or `Ferret` qualify as "smalls." [VERIFIED]

### 1c. Divergence

**The two definitions diverge.** Media tab uses a catch-all (not-cat-not-dog). Profiles tab uses a hard-coded allow-list (`Rabbit` | `Ferret`). Any species that is not Cat, Dog, Rabbit, or Ferret will count on the media tab but be invisible on the profiles tab's Smalls filter. [VERIFIED]

---

## PART 2 — IS FLUFFY IN THE DATA?

### 2d. Profiles-summary response

Both gap animals ARE present in the `GET /api/dashboard/profiles-summary` response:

```
S2026403: name=Fluffy, species=Chinchilla, isAvailable=true, profileCount=0
G2026002: name=Tater Tot, species=Guinea Pig, isAvailable=true, profileCount=1
```

[VERIFIED — queried endpoint directly]

They are present but filtered out because their `species` values (`Chinchilla`, `Guinea Pig`) are not in the `Rabbit || Ferret` allow-list.

### 2e. Under "All species" view

Yes. When `profilesSpeciesFilter === 'all'`, `matchesSpeciesFilter()` returns `true` for all species. Both Fluffy and Tater Tot would show under the All-species view. They are only hidden when the Smalls button is active. [VERIFIED by code inspection]

---

## PART 3 — THE EXACT GAP

### Media tab "smalls" (not-cat-not-dog): 19 animals

```
Anastasia (R2026007) — Rabbit
Anna (S2026154) — Rabbit
Butterscotch (R2023065) — Rabbit
Callie Rabbit (R2026003) — Rabbit
Caramel (R2025003) — Rabbit
Charlie (R2023007) — Rabbit
Clover (S2026190) — Rabbit
Cookie (R2024016) — Rabbit
Cookies and Cream (R2025039) — Rabbit
Elsa (S2026155) — Rabbit
Fluffy (S2026403) — Chinchilla          ← NOT in Profiles
Hopper (R2026006) — Rabbit
Jasmine (R2025054) — Rabbit
Kirby (S2025877) — Ferret
Maria (R2025037) — Rabbit
Olaf (S2026153) — Rabbit
Peanut Butter (R2025005) — Rabbit
Snowie (A2023287) — Rabbit
Tater Tot (G2026002) — Guinea Pig       ← NOT in Profiles
```

### Profiles tab "Smalls" (Rabbit || Ferret): 17 animals

Same list minus Fluffy and Tater Tot.

### The exact 2 animals in the gap:

| Animal | Shelter Code | SPECIESNAME | Why missing from Profiles |
|--------|-------------|-------------|--------------------------|
| **Fluffy** | S2026403 | **Chinchilla** | Not in `Rabbit \|\| Ferret` allow-list |
| **Tater Tot** | G2026002 | **Guinea Pig** | Not in `Rabbit \|\| Ferret` allow-list |

Gap is exactly 2 animals: 19 − 17 = 2. ✓ [VERIFIED]

---

## PART 4 — RAW SM FIELDS FOR ADULT GENERIC

Pulled the complete raw SM API response for Fluffy (S2026403, Chinchilla). Key findings:

### NEUTERED (spay/neuter)

**Present in raw SM response.** [VERIFIED]

```
NEUTERED: 0
NEUTEREDNAME: No
NEUTEREDDATE: None
```

The field exists and is populated. For Fluffy it's `0` (not neutered). The raw API also provides `NEUTEREDDATE` and `NEUTEREDBYVETID`. **Not mapped by `normalizeAnimal()` today** — would need to be added. [VERIFIED]

### WEIGHT

**Present in raw SM response but not reliably populated.** [VERIFIED]

```
WEIGHT: 0.0
```

The field exists but contains `0.0` for Fluffy. Across all 152 adoptable animals via the normalized API, weight is 0/152 (0%) populated (all zeroes or absent). SM stores weight but the shelter hasn't entered it for any animal. **Not useful for adult generics today.** [VERIFIED]

### Other notable raw fields available (not currently in normalizeAnimal):

| Field | Value (Fluffy) | Notes |
|-------|---------------|-------|
| `NEUTERED` / `NEUTEREDNAME` | `0` / `No` | Spay/neuter status — available and populated |
| `DECLAWED` / `DECLAWEDNAME` | `0` / `No` | Available |
| `ISGOODWITHCATS` / `ISGOODWITHCATSNAME` | `2` / `Unknown` | SM compatibility fields (usually 0=Yes, 1=No, 2=Unknown) |
| `ISGOODWITHDOGS` / `ISGOODWITHDOGSNAME` | `2` / `Unknown` | Same |
| `ISGOODWITHCHILDREN` / `ISGOODWITHCHILDRENNAME` | `2` / `Unknown` | Same |
| `HASSPECIALNEEDS` / `HASSPECIALNEEDSNAME` | `0` / `No` | Available |
| `HEALTHPROBLEMS` | `` (empty) | Available but rarely populated |
| `MARKINGS` | `` (empty) | Available but empty |
| `COATTYPENAME` | `Short` | Coat type — available |
| `TIMEONSHELTER` | `5 weeks.` | Time on shelter — available, human-readable |
| `PETFINDERSPECIES` | `Small&Furry` | Petfinder classification |
| `AGEGROUP` | `1 to 5 years` | SM age group bucket |
| `ENERGYLEVEL` | `0` | SM energy level (0 = not set) |

The `RawShelterAnimal` interface (types.ts:163) has a `[key: string]: unknown` index signature, so all raw SM fields pass through — they're just not mapped to typed properties by `normalizeAnimal()`. [VERIFIED]

---

## Root Cause Summary

The 19-vs-17 discrepancy is caused by **divergent species classification logic** between the two tabs:

- **Media tab** (line 6743): catch-all `!cats.includes(a) && !dogs.includes(a)` — includes ALL non-cat-non-dog species
- **Profiles tab** (line 15139): explicit allow-list `species === 'Rabbit' || species === 'Ferret'` — excludes Chinchilla, Guinea Pig, and any other exotic species

The fix is to make the Profiles filter match the Media tab's catch-all definition, OR to expand the allow-list to include all species the shelter actually has.

---

*Report generated by Rover. Read-only diagnosis — no changes made.*
