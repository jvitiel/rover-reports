# Bio-generation paths — adoptability gate map

**Date:** 2026-06-15 19:40 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Path-by-path analysis

### 1. findGenericBioCandidates (Youth Pass 1 — daily job)

```typescript
const animals = await fetchAnimals({ includeUnavailable: false }); // adoptable only
```

**GATED — adoptable only.** Cannot write a youth generic for a non-adoptable animal. This is why the 226 non-adoptable youth have no bio — Pass 1 never sees them.

### 2. findAgedOutGenerics + upgradeAgedOutGeneric (Pass 2 — age-crossing, daily job)

```typescript
async function findAgedOutGenerics(): Promise<AgedOutGeneric[]> {
  const animals = await fetchAnimals({ includeUnavailable: false }); // adoptable only
```

**GATED — adoptable only.** If an animal got a youth generic while adoptable, then became non-available, then aged past 84 days — Pass 2 would NOT auto-upgrade it because `fetchAnimals({ includeUnavailable: false })` excludes non-available animals from the candidate set.

The `upgradeAgedOutGeneric` function itself has no adoptability check (it trusts the candidate list), but the selection function gates it.

### 3. findAdultIntakeCandidates (adult-intake pass)

```typescript
async function findAdultIntakeCandidates(): Promise<AdultIntakeCandidate[]> {
  const animals = await fetchAnimals({ includeUnavailable: false });
```

**GATED — adoptable only.**

### 4. Profile-save trigger (generateBioDraftForAnimal via /api/caregiver/save)

```typescript
async function generateBioDraftForAnimal(shelterCode: string): Promise<AnimalBioDraft | null> {
  const animal = await getAnimalById(shelterCode);  // ← default includeUnavailable=false
  if (!animal) return null;
```

`getAnimalById` signature (shelterManagerService.ts:150):
```typescript
export async function getAnimalById(id: string, includeUnavailable = false): Promise<Animal | null>
```

**GATED — adoptable only (unintentionally).** `getAnimalById(shelterCode)` passes `includeUnavailable=false` by default. If a staff member saves a profile for a non-adoptable animal, the trigger fires but `getAnimalById` returns `null`, so `generateBioDraftForAnimal` silently returns `null` — no draft is generated.

This is likely **not desired** — the prompt notes "We WANT this ungated." A fix would be `getAnimalById(shelterCode, true)` in `generateBioDraftForAnimal`.

### 5. Manual generate endpoint (POST /api/bio/generate/:animalId)

```typescript
const animal = await getAnimalById(animalId);  // includeUnavailable=false by default
```

**GATED — returns 404 for non-adoptable.** Manual-only invocation (dashboard button click), so this is low-risk but means staff can't generate bios for non-available animals from the dashboard.

### 6. Manual regenerate endpoint (POST /api/bio/:shelterCode/regenerate/:size)

```typescript
const animal = await getAnimalById(shelterCode);  // includeUnavailable=false by default
```

**GATED — returns 404 for non-adoptable.** Manual-only.

---

## Summary table

| Path | Automatic? | Adoptability gate | Can touch non-adoptable? |
|------|-----------|-------------------|-------------------------|
| Pass 1 (youth generic) | ✅ Daily job | `fetchAnimals({ includeUnavailable: false })` | **No** |
| Pass 2 (age-crossing) | ✅ Daily job | `fetchAnimals({ includeUnavailable: false })` | **No** |
| Pass 3 (adult-intake) | ✅ On-demand endpoint | `fetchAnimals({ includeUnavailable: false })` | **No** |
| Profile-save trigger | ✅ Auto on save | `getAnimalById(code)` default=false | **No** (silent no-op) |
| Generate endpoint | ❌ Manual | `getAnimalById(id)` default=false | **No** (404) |
| Regenerate endpoint | ❌ Manual | `getAnimalById(code)` default=false | **No** (404) |

**No automatic path can currently touch a non-adoptable animal.** All three daily-job passes use `fetchAnimals({ includeUnavailable: false })`. The profile-save trigger and manual endpoints additionally gate via `getAnimalById` default.

**Paths that may NEED the gate removed:**
- Profile-save trigger (path 4): staff writing a profile on a non-adoptable animal should probably still produce a draft → change to `getAnimalById(shelterCode, true)`
- Manual generate/regenerate (paths 5–6): staff may want to generate/regenerate for non-available animals from the dashboard → change to `getAnimalById(id, true)`

**Paths that should KEEP the gate:**
- All three automatic daily-job passes (1, 2, 3): should only process adoptable animals

---

## Rosie Cotton (S2026291) — provenance

| Event | Timestamp | Source |
|-------|-----------|--------|
| Bio generated | 2026-06-01 16:37:25 UTC | `full_generate` (draft/draft) |
| Long approved | 2026-06-01 16:37:27 UTC | `approve_long` (approved/draft) |

Both events are manual — a staff member clicked "Generate Bios" then approved the long bio 2 seconds later on June 1. Rosie Cotton has a caregiver profile (raw_transcript starts: "Rosie is a wonderful cat. She's a calico with a stark white...").

The bio was generated and approved while Rosie Cotton was still adoptable. She subsequently became non-available (currently `isAvailable=false`, location: Annex). The generate endpoint would have returned 404 if she'd been non-available at the time — confirming this was a pre-unavailability manual action.

**No automatic path generated this bio.**
