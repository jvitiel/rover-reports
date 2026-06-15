# Ungate staff-initiated bio paths for non-adoptable animals

**Commit:** `e1621a4` — `server: ungate staff-initiated bio paths (profile-trigger, generate, regenerate) for non-adoptable animals`  
**Scope:** `server/src/server.ts` only (3 insertions, 3 deletions)

---

## Changes

Three `getAnimalById` calls changed from default `includeUnavailable=false` to `includeUnavailable=true`:

### 1. generateBioDraftForAnimal (line 2094)
```typescript
// BEFORE:
const animal = await getAnimalById(shelterCode);
// AFTER:
const animal = await getAnimalById(shelterCode, true); // includeUnavailable: staff-initiated path, works on non-adoptable
```
Effect: profile-save trigger now produces a draft for non-adoptable animals instead of silently returning null.

### 2. POST /api/bio/generate/:animalId (line 2147)
```typescript
// BEFORE:
const animal = await getAnimalById(animalId);
// AFTER:
const animal = await getAnimalById(animalId, true); // includeUnavailable: manual generate works on non-adoptable
```
Effect: dashboard "Generate Bios" button now works on non-available animals (no longer 404s).

### 3. POST /api/bio/:shelterCode/regenerate/:size (line 2181)
```typescript
// BEFORE:
const animal = await getAnimalById(shelterCode);
// AFTER:
const animal = await getAnimalById(shelterCode, true); // includeUnavailable: manual regenerate works on non-adoptable
```
Effect: dashboard "Regenerate" button now works on non-available animals (no longer 404s).

## NOT changed (automatic paths — still adoptable-only)

| Path | Gate | Status |
|------|------|--------|
| findGenericBioCandidates (Pass 1) | `fetchAnimals({ includeUnavailable: false })` | **Unchanged** |
| findAgedOutGenerics (Pass 2) | `fetchAnimals({ includeUnavailable: false })` | **Unchanged** |
| findAdultIntakeCandidates (Pass 3) | `fetchAnimals({ includeUnavailable: false })` | **Unchanged** |

---

## Verification — Buddy (R2024034, non-adoptable Dog)

### Before
- `isAvailable`: **false** (non-adoptable)
- `animal_bios` row: **0** (no bio)
- `animal_bio_drafts` row: **0** (no draft)
- Counts: animal_bios=183, animal_bio_drafts=18

### Step 2: Manual generate
```
POST /api/bio/generate/R2024034
→ success: true
→ draft.id: 9e07af86-404f-...
→ draft.shelterCode: R2024034
→ draft.lastSource: full_generate
→ draft.promotedLong: false, promotedShort: false
→ EN long: "Meet Buddy, the spirited Yorkshire Terrier mix with a heart as big as his playfu..."
```
**No longer 404s.** Draft created for non-adoptable animal. ✅

animal_bios: 183 (unchanged — generate writes drafts, not bios)  
animal_bio_drafts: 19 (+1 test draft)

### Step 3: Automatic pass exclusion
```
POST /api/dashboard/adult-intake/run { dryRun: true }
→ total candidates: 0
→ R2024034 in candidates: false
```
Non-adoptable Buddy correctly excluded from automatic pass. ✅

### Step 4: Cleanup
```sql
DELETE FROM animal_bio_drafts WHERE shelter_code='R2024034';
```
- animal_bios: **183** (same as before)
- animal_bio_drafts: **18** (same as before)
- R2024034 rows: 0 bios, 0 drafts ✅
