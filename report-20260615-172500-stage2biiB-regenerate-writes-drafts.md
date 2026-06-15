# Stage 2b-ii-B — Regenerate writes per-size draft to animal_bio_drafts

**Commit:** `f4d49bd` — `regenerate writes per-size draft to animal_bio_drafts keyed by shelterCode, preserves animal_bios (Stage 2b-ii-B)`  
**Scope:** `localDatabase.ts` + `server.ts` + `dashboard/index.html`

---

## New function: saveAnimalBioDraftSize (localDatabase.ts)

```typescript
export function saveAnimalBioDraftSize(
  shelterCode: string,
  size: 'long' | 'short',
  bioEn: string, bioEs: string,
  source: string,
): AnimalBioDraft
```

Computes a full draft row, then upserts via `INSERT ... ON CONFLICT(shelter_code) DO UPDATE`:

- **Regenerated size:** content = bioEn/bioEs, `promoted_{size}` = 0 (pending)
- **Other size:**
  - If existing draft has it: keep existing content + `promoted_{other}` flag
  - Else: copy from animal_bios (or '' if null), `promoted_{other}` = 1 (already live — panel shows animal_bios version for that size)

Does NOT touch animal_bios.

## Endpoint change: regenerate route key

**Before:** `POST /api/bio/:bioId/regenerate/:size` — looked up animal via `getAnimalBioById(bioId)`, wrote to animal_bios via `updateAnimalBioLong/Short`  
**After:** `POST /api/bio/:shelterCode/regenerate/:size` — resolves animal directly by shelterCode, writes per-size draft via `saveAnimalBioDraftSize`, returns `{ data: getAnimalBio(shelterCode), draft: getAnimalBioDraft(shelterCode) }`

Seed logic (profile → SM comment → 400) unchanged — same two-tier code, just no longer needs `existingBio` for the animal lookup.

No other file references the old `:bioId/regenerate` route (confirmed via grep).

## Client change: regenerateBio (dashboard/index.html)

```javascript
// Before:
const response = await fetch(`${API_BASE}/bio/${cached.data.id}/regenerate/${size}`, ...);
// After:
const shelterCode = getShelterCodeForBio(animalId);
const response = await fetch(`${API_BASE}/bio/${shelterCode}/regenerate/${size}`, ...);
```

Cache + render unchanged (already stores `{ data, draft }`).

## Untouched paths (verified)

Generate endpoint, Track C, youth-job, manual-youth-publish, no_content branch, saveAnimalBio, promoteDraftSize — all unchanged.

---

## Invariant spot-check: Abe (S2025966, approved/approved)

### Step 1 — BEFORE
```
id: d841d100-ab9f-4464-aa8f-9e903c725c04
bio_en_long[:60]: Meet Abe, affectionately known as Baby Aby—a delightful 9-ye
bio_en_short[:60]: Meet Abe, the ultimate lap cat! This social 9-year-old loves
status_long: approved / status_short: approved
approved_at_long: 2026-04-23T19:00:42.102Z / approved_at_short: 2026-04-16T18:44:11.299Z
animal_bio_drafts: 0 rows
```

### Step 2 — POST /api/bio/S2025966/regenerate/long

### Step 3(a) — DRAFT-LONG LANDED ✅
```
shelter_code=S2025966, promoted_long=0, promoted_short=1, last_source=regenerate_long
bio_en_long[:60]: "Meet Abe, our charming black and white feline with a heart a" (NEW)
```

### Step 3(b) — SHORT MARKED LIVE ✅
```
promoted_short=1
bio_en_short[:60]: "Meet Abe, the ultimate lap cat! This social 9-year-old loves"
^ Matches animal_bios short content — panel will show the live version for short
```

### Step 3(c) — APPROVED UNTOUCHED ✅
```
id: d841d100-ab9f-4464-aa8f-9e903c725c04 (SAME)
bio_en_long[:60]: Meet Abe, affectionately known as Baby Aby—a delightful 9-ye (SAME)
status_long: approved / status_short: approved (SAME)
approved_at_long: 2026-04-23T19:00:42.102Z (SAME)
```

### Step 3(d) — PUBLIC SERVES APPROVED ✅
GET /api/animals/S2025966 → description[:60]: "Meet Abe, affectionately known as Baby Aby—a delightful 9-ye"  
Approved text, NOT the draft ("Meet Abe, our charming black and white feline...").

### Step 3(e) — RESPONSE SHAPE ✅
Endpoint returned both `data` (approved bio, id d841d100...) and `draft` (new long, promotedLong=false, promotedShort=true).

### Step 4 — CLEANUP ✅
```
DELETE FROM animal_bio_drafts WHERE shelter_code='S2025966'
animal_bio_drafts: 0 rows
animal_bios: 115 rows
Abe: d841d100... | approved | approved (unchanged)
```

**Regenerate no longer destroys approved public bios. Per-size isolation confirmed.**

### Note: S2026311 (January) returned "Animal not found"
January (approved/approved/full_generate) is no longer in the SM animals list — likely adopted/removed from SM. `getAnimalById` requires the animal be in SM cache. Switched to Abe who is still active. This is expected behavior — regenerate requires the animal to be fetchable from SM for the seed data.
