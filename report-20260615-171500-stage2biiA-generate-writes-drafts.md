# Stage 2b-ii-A — Generate endpoint + Track C SM-seed write drafts

**Commit:** `6b351b5` — `server: generate endpoint + Track C SM-seed write drafts to animal_bio_drafts, return {data,draft} (Stage 2b-ii-A)`  
**Scope:** `localDatabase.ts` + `server.ts` only

---

## New function: saveAnimalBioDraft (localDatabase.ts)

```typescript
export function saveAnimalBioDraft(
  shelterCode: string,
  content: { bioEnLong: string; bioEsLong: string; bioEnShort: string; bioEsShort: string },
  meta: { source: string },
): AnimalBioDraft {
  // INSERT ... ON CONFLICT(shelter_code) DO UPDATE SET
  // all 4 content windows, generated_at=now, last_source=source,
  // promoted_long=0, promoted_short=0 (fresh generation resets both)
  // Does NOT touch animal_bios.
}
```

## Flip 1 — POST /api/bio/generate/:animalId (server.ts ~2145)

**Before:** `saveAnimalBio({...statusLong:'draft', statusShort:'draft'...})` → destructive delete+insert into animal_bios  
**After:** `saveAnimalBioDraft(animal.shelterCode, {bioEnLong, bioEsLong, bioEnShort, bioEsShort}, {source: generationSource})` → upsert into animal_bio_drafts only  
**Response:** `{ success:true, data: getAnimalBio(shelterCode), draft: getAnimalBioDraft(shelterCode) }` — data is the unchanged approved bio (or null), draft is the new pending draft.

## Flip 2 — Track C upgradeAgedOutGeneric has_sm_comment branch (server.ts ~11810)

**Before:** `saveAnimalBio({...all draft...})` with source `sm_generate`  
**After:** `saveAnimalBioDraft(animal.shelterCode, {...}, { source: 'sm_generate' })`  
Returns `{ action: 'ai_seed_draft', bioId: draft.id }`

## Untouched paths (verified)

| Path | Still calls | Lines |
|------|------------|-------|
| Regenerate endpoint | `updateAnimalBioLong/Short` | 2224-2226 |
| Youth generic (runGenericBioJob Pass 1) | `saveAnimalBio` | 11524 |
| Manual youth publish | `saveAnimalBio` | 11590 |
| Track C no_content branch | `saveAnimalBio` | 11784 |

---

## Invariant spot-check: Abe (S2025966, approved/approved)

### Step 1 — BEFORE
```
id: d841d100-ab9f-4464-aa8f-9e903c725c04
bio_en_long[:60]: Meet Abe, affectionately known as Baby Aby—a delightful 9-ye
status_long: approved / status_short: approved
approved_at_long: 2026-04-23T19:00:42.102Z / approved_at_short: 2026-04-16T18:44:11.299Z
last_source: backfill
animal_bio_drafts: 0 rows
```

### Step 2 — POST /api/bio/generate/S2025966
Response includes both `data` and `draft`:
- `data.id`: d841d100... (same) | `data.statusLong`: approved | `data.bioEnLong[:60]`: "Meet Abe, affectionately known as Baby Aby—a delightful 9-ye"
- `draft.id`: 1a9b79ea... (new) | `draft.bioEnLong[:60]`: "Meet the charming Abe, affectionately known as Louie in his" | `draft.promotedLong`: false / `draft.promotedShort`: false

### Step 3(a) — DRAFT LANDED ✅
```
animal_bio_drafts: shelter_code=S2025966, promoted_long=0, promoted_short=0,
last_source=full_generate, bio_en_long[:60]="Meet the charming Abe, affectionately known as Louie in his"
```

### Step 3(b) — APPROVED UNTOUCHED ✅
```
id: d841d100-ab9f-4464-aa8f-9e903c725c04 (SAME)
bio_en_long[:60]: Meet Abe, affectionately known as Baby Aby—a delightful 9-ye (SAME)
status_long: approved / status_short: approved (SAME)
approved_at_long: 2026-04-23T19:00:42.102Z (SAME)
last_source: backfill (SAME)
```

### Step 3(c) — PUBLIC SERVES APPROVED ✅
GET /api/animals/S2025966 → `description[:60]`: "Meet Abe, affectionately known as Baby Aby—a delightful 9-ye"  
This is the APPROVED text, NOT the draft ("Meet the charming Abe..."). `resolveBioText` serves from animal_bios only.

### Step 3(d) — RESPONSE SHAPE ✅
Generate endpoint returns both `data` (Abe's approved bio) and `draft` (the new pending draft).

### Step 4 — CLEANUP ✅
```
DELETE FROM animal_bio_drafts WHERE shelter_code='S2025966'
animal_bio_drafts: 0 rows
animal_bios: 115 rows
Abe: d841d100... | approved | approved (unchanged)
```

**A new generation no longer destroys an approved public bio.**
