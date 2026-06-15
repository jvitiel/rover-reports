# Profile-save auto-trigger — background draft generation

**Commit:** `e6d1b39` — `server: profile save fires background draft generation via extracted generateBioDraftForAnimal (profile-save trigger)`  
**Scope:** `server/src/server.ts` only

---

## Step 1 — Extracted function: generateBioDraftForAnimal

```typescript
async function generateBioDraftForAnimal(shelterCode: string): Promise<AnimalBioDraft | null> {
  // 1. Resolve animal via getAnimalById
  // 2. Build two-tier seed: profile (getBehaviorNotes) → SM comment (hasStaffSMComment) → null (no-op)
  // 3. Call generateAnimalBio (GPT-4o, 4 windows)
  // 4. Write via saveAnimalBioDraft (upsert, resets both promoted flags)
  // Returns draft, or null if no seed available
}
```

POST /api/bio/generate/:animalId refactored to call this function. Endpoint behavior unchanged: still returns 404/400 for invalid animal/no seed, still returns `{ success, data, draft }`.

## Step 2 — Hook on /api/caregiver/save

After `saveBehaviorNotes()` succeeds and the HTTP response is sent (`res.json({ success: true, data: { saved: true } })`), a background generation fires:

```typescript
// Double-fire guard: module-level Set<string>
const bioGenerationInFlight = new Set<string>();

// In /api/caregiver/save, AFTER res.json():
if (!bioGenerationInFlight.has(resolvedCode)) {
  bioGenerationInFlight.add(resolvedCode);
  generateBioDraftForAnimal(resolvedCode)
    .then(draft => console.log(`[profile-trigger] ... generated/skipped`))
    .catch(err => console.error(`[profile-trigger] ... failed:`, err))
    .finally(() => bioGenerationInFlight.delete(resolvedCode));
} else {
  console.log(`[profile-trigger] generation already in-flight for ${resolvedCode}, skipping`);
}
```

- **Not awaited** — response returns immediately (29ms / 16ms measured)
- **Cannot crash process** — .catch() handles all errors
- **Double-fire guard** — Set prevents concurrent generation for same animal; second rapid save is a no-op while first runs
- **Applies to both front-ends** — staff-pwa and profile-form both hit /api/caregiver/save (shared endpoint)

## Untouched

Regenerate, Track C, auto-approved generics, promote/approve, all client files, recorder save response shape.

---

## Verification: Abe (S2025966, approved/approved)

### Step 1 — BEFORE
```
animal_bios: id=d841d100..., status_long=approved, status_short=approved, approved_at_long=2026-04-23T19:00:42.102Z
animal_bio_drafts: 0 rows
behavior_notes: 3 existing rows (original Abe profiles)
```

### Step 2 — POST /api/caregiver/save (test profile, caregiver=TEST_ROVER)
- Response: `{"success":true,"data":{"saved":true}}`
- Response time: **29ms** (not waiting on GPT)

### Step 3 — Draft appeared (after ~8s background wait)
```
shelter_code=S2025966, promoted_long=0, promoted_short=0, last_source=full_generate
bio_en_long[:60]: "Meet Abe, affectionately known as Baby Aby, a charming 9-yea" (NEW)
bio_en_short[:60]: "Meet Abe, the lap-loving, window-gazing tuxedo cat who's gre" (NEW)
```

### Step 4 — Invariant: animal_bios UNTOUCHED
```
id: d841d100... (SAME), status_long=approved (SAME), approved_at_long=2026-04-23T19:00:42.102Z (SAME)
bio_en_long[:60]: "Meet Abe, affectionately known as Baby Aby—a delightful 9-ye" (SAME)
```
Public API (GET /api/animals/S2025966): serves approved text, not draft. ✅

### Step 5 — Second save (caregiver=TEST_ROVER_2)
- Response time: **16ms**
- Draft regenerated with new content ("Louie" variant)
- Journal log: two `[profile-trigger] background bio draft generated` lines, NO errors, NO unhandled rejections

### Step 6 — Cleanup
```
Deleted: test draft (S2025966) + 2 test behavior_notes rows (TEST_ROVER, TEST_ROVER_2)
animal_bio_drafts: 0 rows
animal_bios: 115 rows
Abe: d841d100... | approved | approved (unchanged)
Abe behavior_notes: 3 rows (original, no test rows remaining)
```

**Test behavior_notes created:** Yes — 2 rows with caregiver 'TEST_ROVER' and 'TEST_ROVER_2'. Both deleted in cleanup. Abe's original 3 behavior_notes rows confirmed intact.
