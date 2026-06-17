# Local Adoptable Toggle Mechanism — Diagnosis

**Date:** 2026-06-17 00:32 UTC  
**Scope:** Read-only diagnosis. No changes made.

---

## 1. The Local Adoptable Field — NONE EXISTS

**There is no local adoptable override.** The `isAvailable` flag is read live from ShelterManager on every API call. [VERIFIED]

```typescript
// shelterManagerService.ts:49
const isAvailable = raw.ADOPTABLE === 1;
```

Every endpoint that needs availability (`/api/dashboard/behavior-notes`, `/api/animals`, etc.) calls `fetchAnimals()` or `getAnimalById()`, which hits SM's API and reads `ADOPTABLE` from the response. [VERIFIED — shelterManagerService.ts:49, 68-69]

The only local table that stores adoptable state is `adoptable_status_snapshot`, which is used exclusively by the daily email-alert diff detector (`runAdoptableStatusCheck`, server.ts:11166). It is never read by the dashboard or any bio pipeline. [VERIFIED — server.ts:11177-11237]

**There is no path that flips adoptable locally with no SM write.** The dashboard has no "Adoptable" toggle button. The `isAvailable` value is display-only, read from SM on each request. To change it, you must change it in SM. [VERIFIED]

---

## 2. What Fires on the Toggle — NOTHING (bio generation is not hooked to status changes)

Bio generation is triggered by exactly 3 events. None are status-change-related:

| Trigger | Location | When |
|---|---|---|
| Manual button | `POST /api/bio/generate/:animalId` (server.ts:2101) | Staff clicks "Generate" in dashboard |
| Profile save hook | Behavior notes save handler (server.ts:5080-5094) | Caregiver submits profile → background `generateBioDraftForAnimal()` |
| Daily job | `upgradeAdultIntake()` → `generateBioDraftForAnimal()` (server.ts:11965) | Daily 9:30am pass for has_profile animals that crossed 84 days |

[VERIFIED — grep for `generateBioDraftForAnimal` shows exactly 4 call sites: the function definition (2052), manual endpoint (2119), profile save (5082), and daily job (11965)]

**There is no on-status-change handler, no adoptable-toggle hook, and no event system that fires bio generation when availability changes.** Flipping adoptable locally (even if it were possible) would not trigger any bio pipeline. [VERIFIED]

---

## 3. Existing-Bio Guard — DOES NOT APPLY to the manual generate endpoint

### `generateBioDraftForAnimal(shelterCode)` — NO existing-bio guard

```typescript
// server.ts:2052-2098
async function generateBioDraftForAnimal(shelterCode: string): Promise<AnimalBioDraft | null> {
  const animal = await getAnimalById(shelterCode, true);
  if (!animal) return null;
  // Checks seed data (behavior_notes or SM comment)
  // Generates all 4 fields via GPT-4o
  // Writes to animal_bio_drafts via saveAnimalBioDraft (UPSERT)
  // ← NO CHECK for existing animal_bios row
}
```

[VERIFIED — server.ts:2052-2098, no `getAnimalBio()` call anywhere in the function]

### `POST /api/bio/generate/:animalId` — NO existing-bio guard

```typescript
// server.ts:2101-2127
app.post('/api/bio/generate/:animalId', async (req, res) => {
  const animal = await getAnimalById(animalId, true);
  if (!animal) return 404;
  const merged = getBehaviorNotes(animal.shelterCode);
  if (!merged && !hasStaffSMComment(animal)) return 400;
  const draft = await generateBioDraftForAnimal(animal.shelterCode);
  res.json({ success: true, data: getAnimalBio(animal.shelterCode), draft });
  // ← NO CHECK for existing animal_bios row
});
```

[VERIFIED — server.ts:2101-2127]

### Daily job — HAS existing-bio guard (but irrelevant here)

```typescript
// server.ts:11904
const existingBio = getAnimalBio(animal.shelterCode);
if (existingBio) continue;  // ← SKIPS animals with animal_bios row
```

[VERIFIED — server.ts:11904-11905]

**Conclusion:** The manual generate endpoint and `generateBioDraftForAnimal` function would NOT skip Achilles despite his existing partial `animal_bios` row. They write to the separate `animal_bio_drafts` table (UPSERT on `shelter_code`). The existing partial `animal_bios` row stays untouched. [VERIFIED]

---

## 4. Sync Clobber — NOT APPLICABLE

Since there is no local adoptable state to toggle, there is no sync-clobber scenario. `isAvailable` is always read live from SM — there is nothing local to overwrite. [VERIFIED]

---

## 5. The Exact Single-Animal Operation

**The adoptable toggle approach is unnecessary.** There is a simpler, direct path:

```bash
curl -X POST http://localhost:3000/api/bio/generate/A2025088
```

This single call:

1. Looks up Achilles from SM (`getAnimalById('A2025088', true)`) — Achilles is in SM [VERIFIED via prior test]
2. Finds behavior_notes (count=1) → uses profile path (`full_generate`) [VERIFIED — sqlite3 query from prior report]
3. Calls `generateAnimalBio()` → GPT-4o produces all 4 fields (EN+ES long+short)
4. Calls `saveAnimalBioDraft('A2025088', ...)` → UPSERTS into `animal_bio_drafts` with `promoted_long=0, promoted_short=0` [VERIFIED — localDatabase.ts:1708-1738]
5. Returns the draft in the response for immediate inspection

**What it does NOT do:**
- Does NOT touch the existing partial `animal_bios` row (sm_copy with only EN long) [VERIFIED]
- Does NOT auto-approve anything — draft lands as pending [VERIFIED]
- Does NOT affect any other animal — the endpoint takes a single `animalId` parameter [VERIFIED]
- Does NOT write to SM [VERIFIED]

**Staff follow-up:** After the draft is generated, staff opens Achilles in the dashboard → bio panel shows the new pending draft content → clicks "Approve for Public Use" per size → `promoteDraftSize` copies draft to `animal_bios` (approved). [VERIFIED — established in bio-pending-phase1/phase2 reports]

---

## Conclusions

**(a) No local-only adoptable toggle exists.** `isAvailable` is read live from SM on every request. No local override, no toggle endpoint, no writable local state. [VERIFIED]

**(b) Toggling adoptable does NOT fire bio generation.** Bio generation is triggered only by: manual Generate button, profile save hook, and daily intake job. No status-change hook exists. [VERIFIED]

**(c) The existing-bio guard does NOT apply to the manual path.** `generateBioDraftForAnimal` and `POST /api/bio/generate/:animalId` have no check for existing `animal_bios` rows. They write to the separate `animal_bio_drafts` table unconditionally. Achilles' partial `animal_bios` row would be untouched. [VERIFIED]

**(d) Sync clobber is not applicable.** No local state to clobber. [VERIFIED]

**(e) The exact operation:** `curl -X POST http://localhost:3000/api/bio/generate/A2025088` — generates a complete 4-field pending draft for Achilles only, using his caregiver profile as seed, writing to `animal_bio_drafts` (pending, not approved), leaving the existing partial `animal_bios` row untouched, affecting no other animals. [VERIFIED]
