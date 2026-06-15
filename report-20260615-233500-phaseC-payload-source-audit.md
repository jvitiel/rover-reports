# Phase C: payload per-size source + hasSeedContent — design audit

**Date:** 2026-06-15 23:35 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Q1: AnimalBio interface + rowToAnimalBio — MISSING sourceLong/sourceShort

### AnimalBio interface (types.ts:144–163)

```typescript
export interface AnimalBio {
  id: string;
  animalId: string;
  shelterCode?: string;
  bioEnLong: string;
  bioEsLong: string;
  statusLong: BioStatus;
  approvedAtLong: string | null;
  bioEnShort: string;
  bioEsShort: string;
  statusShort: BioStatus;
  approvedAtShort: string | null;
  generatedAt: string;
  lastSource?: string;
  // NO sourceLong, NO sourceShort
}
```

### rowToAnimalBio (localDatabase.ts:1624–1641)

```typescript
function rowToAnimalBio(row: Record<string, unknown>): AnimalBio {
  return {
    id: row.id as string,
    animalId: row.shelter_code as string,
    shelterCode: row.shelter_code as string,
    bioEnLong: (row.bio_en_long as string) || '',
    bioEsLong: (row.bio_es_long as string) || '',
    statusLong: (row.status_long as BioStatus) || 'draft',
    approvedAtLong: (row.approved_at_long as string) || null,
    bioEnShort: (row.bio_en_short as string) || '',
    bioEsShort: (row.bio_es_short as string) || '',
    statusShort: (row.status_short as BioStatus) || 'draft',
    approvedAtShort: (row.approved_at_short as string) || null,
    generatedAt: row.generated_at as string,
    lastSource: (row.last_source as string) || undefined,
    // NO source_long, NO source_short mapping
  };
}
```

**Phase B added `sourceLong`/`sourceShort` to `AnimalBioDraft` interface + `rowToAnimalBioDraft` ONLY.** The `AnimalBio` interface (types.ts) and `rowToAnimalBio` (localDatabase.ts) were NOT updated. This is a **Phase C prerequisite**. [VERIFIED]

---

## Q2: Payload construction — bio: fullBio

`animals.push()` block (server.ts:1227–1250):

```typescript
animals.push({
  animalId: smAnimal.id,
  shelterCode: smAnimal.shelterCode,
  name: smAnimal.name,
  species: smAnimal.species,
  location: smAnimal.location,
  records,
  merged,
  isAvailable: smAnimal.isAvailable,
  hasCaregiverData,
  bioStatus,
  bioState: computeBioState(...),
  dateOfBirth: smAnimal.dateOfBirth || null,
  adoptionPending: ...,
  bondedPair: ...,
  smData,
  bio: fullBio,      // ← full AnimalBio object from getAnimalBio()
  photos: { strip, library, totalCount },
});
```

`fullBio` is the return value of `getAnimalBio(smAnimal.shelterCode)` (via `fullBiosMap` at line 1223), which calls `rowToAnimalBio`. **The bio object IS the full AnimalBio return.** Once `sourceLong`/`sourceShort` are added to the interface + mapper, they ride along automatically — no explicit payload field needed. [VERIFIED]

---

## Q3: hasSeedContent — in-scope variables

At the `animals.push()` point (inside the `for (const smAnimal of smAnimals)` loop):

| Variable | Type | Available | Definition |
|----------|------|-----------|------------|
| `hasCaregiverData` | `boolean` | Yes | `records.length > 0` (server.ts:1142) |
| `smAnimal.description` | `string \| undefined` | Yes | SM ANIMALCOMMENTS (server.ts:1140, from `smAnimals` array) |
| `smData.description` | `string \| undefined` | Yes | Copy of `smAnimal.description` (server.ts:1215) |

**Computation:**
```typescript
const hasSeedContent = hasCaregiverData || !!(smAnimal.description && smAnimal.description.trim());
```

Both inputs are in scope at the push point. This matches the exact condition the regenerate endpoint checks (`getBehaviorNotes` ≈ `hasCaregiverData`; `hasStaffSMComment` ≈ `description.trim()`). [VERIFIED]

---

## Q4: Client data flow — payload to renderer

1. Dashboard `loadData()` fetches `/api/dashboard/behavior-notes` → stores response as `allAnimalsData` (line 6461)
2. For each animal, `bioCache.set(animal.animalId, { data: animal.bio, draft: null })` (line 6794) — `animal.bio` is the full AnimalBio object
3. `renderBioContent(animalId, cached)` receives the cached `{ data, draft }` — accesses `cached.data.statusLong`, etc.
4. For `hasSeedContent`, it wouldn't come from `bio` — it's a top-level per-animal field. The renderer can access it via `allAnimalsData.find(a => a.animalId === animalId)` or via a card data attribute (like the existing `data-available` pattern). [VERIFIED]

---

## Conclusions

**(a)** `AnimalBio` interface (types.ts) and `rowToAnimalBio` (localDatabase.ts) do NOT yet expose `sourceLong`/`sourceShort`. Phase C must add both fields to the interface and the mapper — two files. [VERIFIED]

**(b)** Per-size source rides along automatically via `bio: fullBio` once the mapper exposes them. No explicit payload field needed for source. [VERIFIED]

**(c)** `hasSeedContent` needs an explicit new field in the payload (it's not on the bio object — it's derived from caregiver records + SM description). In-scope variables: `hasCaregiverData` (boolean) + `smAnimal.description` (string). Computation: `hasCaregiverData || !!(smAnimal.description && smAnimal.description.trim())`. [VERIFIED]

**(d)** Bio source fields reach the client via `bioCache.get(animalId).data.sourceLong` / `.sourceShort`. `hasSeedContent` reaches via `allAnimalsData.find(...)` or a card `data-has-seed` attribute. [VERIFIED]
