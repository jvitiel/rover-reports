# Bio Generator: Regenerate Path Missing SM-Comment Fallback

**Date:** 2026-06-14 09:07 ET  
**Type:** Root-cause diagnosis  
**Status:** Read-only — no fixes applied  

---

## 1. The Error Source

The string "No caregiver data available" appears in two places in `server/src/server.ts`:

| Line | Endpoint | Guard | Context |
|------|----------|-------|---------|
| **2131** | `POST /api/bio/generate/:animalId` | `else` branch after checking `merged` (profile) AND `animal.description` (SM comment) | Error fires only when **both** sources are empty. This is the **generate** path — it has the SM fallback. [VERIFIED] |
| **2195** | `POST /api/bio/:bioId/regenerate/:size` | `if (!merged)` — hard guard on `getBehaviorNotes()` returning null | Error fires when caregiver profile is absent, **regardless** of whether SM ANIMALCOMMENTS exists. This is the **regenerate** path — **no SM fallback**. [VERIFIED] |

### Regenerate handler (lines 2169–2243, full):

```typescript
// Regenerate just long or short bio (not both)
app.post('/api/bio/:bioId/regenerate/:size', async (req: Request, res: Response) => {
  try {
    const bioId = req.params.bioId;
    const size = req.params.size;
    
    // ... size validation, bio lookup, animal lookup ...
    
    // Get merged behavior notes
    const merged = getBehaviorNotes(animal.shelterCode);  // ← line 2193
    if (!merged) {                                         // ← line 2194
      res.status(400).json({ success: false, error: 'No caregiver data available' });
      return;                                              // ← HARD STOP, no SM fallback
    }
    
    // ... builds mergedAttrs from merged, calls regenerateSingleBio() ...
  }
});
```

The guard at **line 2194** is the pre-f89b01d pattern: `if (!merged) → error`. Commit f89b01d only modified the **generate** endpoint (line 2089), not the regenerate endpoint (line 2169). [VERIFIED via `git diff f89b01d~1..f89b01d`]

---

## 2. The SM-Comment Fallback (commit f89b01d)

Commit `f89b01d` (2026-06-12) added a three-branch decision tree to the **generate** endpoint only:

```typescript
// server/src/server.ts, lines 2100–2131 (inside POST /api/bio/generate/:animalId)

const merged = getBehaviorNotes(animal.shelterCode);

if (merged) {
  // Profile path — caregiver behavior notes exist
  transcripts = merged.rawTranscript;
  mergedAttributesJson = JSON.stringify(mergedAttrs, null, 2);
  generationSource = 'full_generate';
} else if (animal.description?.trim()) {
  // SM fallback — no profile, but ANIMALCOMMENTS has content
  transcripts = animal.description;
  mergedAttributesJson = '{}';
  generationSource = 'sm_generate';
} else {
  // Truly empty — no profile AND no SM comment
  res.status(400).json({ ... error: 'No caregiver data available for this animal' });
  return;
}
```

### Which code paths invoke it:

| Path | Endpoint | Has SM fallback? |
|------|----------|-----------------|
| Initial generate (✨ Generate Bios) | `POST /api/bio/generate/:animalId` (line 2089) | **YES** — added by f89b01d [VERIFIED] |
| Regenerate (🔄 Regenerate) | `POST /api/bio/:bioId/regenerate/:size` (line 2169) | **NO** — still uses pre-f89b01d hard guard [VERIFIED] |
| Copy SM bio (📋 Use as Starting Point) | `POST /api/bio/from-sm/:animalId` (line 2038) | N/A — copies SM text directly, doesn't generate via GPT [VERIFIED] |
| Seed display in UI (bioStatus badge) | Computed in `/api/dashboard/behavior-notes` response (line 1204) | N/A — display only, reads `animal.description` [VERIFIED] |

**The regenerate endpoint does NOT call the same seed-building function.** It has its own inline code that hard-requires `getBehaviorNotes()` to return a non-null value. The generate endpoint's three-branch fallback was never replicated to regenerate.

---

## 3. Seed-Display vs Regenerate Divergence

### What populates the seed shown in the UI:

The `bioStatus` badge displayed on each animal card is computed server-side in the `/api/dashboard/behavior-notes` endpoint (lines 1204–1212):

```typescript
let bioStatus: 'none' | 'sm' | 'draft' | 'approved' = 'none';
if (bio && (bio.statusLong === 'approved' || bio.statusShort === 'approved')) {
  bioStatus = 'approved';
} else if (hasValue(smAnimal.description)) {       // ← reads ANIMALCOMMENTS
  bioStatus = 'sm';
}
```

The SM ANIMALCOMMENTS text itself is displayed in the dashboard UI inside the "ShelterManager Bio (ANIMALCOMMENTS)" section (dashboard/index.html line 7326), reading from `smData.description` which is set from `smAnimal.description` (line 1225).

### What code runs on regenerate:

The regenerate endpoint (line 2169) calls `getBehaviorNotes(animal.shelterCode)` which queries the `behavior_notes` table — a completely different data source from SM ANIMALCOMMENTS. It does not check `animal.description` at all.

### The divergence:

| Data point | Seed display / bioStatus | Regenerate endpoint |
|------------|-------------------------|-------------------|
| Source checked | `animal.description` (SM ANIMALCOMMENTS) | `getBehaviorNotes()` (behavior_notes table) |
| What Blizzard has | ✅ SM description: "Not meant to be a household pet, but would be a great barn cat." | ❌ 0 rows in behavior_notes |
| Result | Shows "Bio: SM" badge + displays ANIMALCOMMENTS text | Throws "No caregiver data available" |

This is the exact divergence causing the bug: the UI shows SM data as a seed (correct), but regenerate requires caregiver data (wrong — doesn't fall back to SM). [VERIFIED]

---

## 4. Blizzard's Actual State

### Animal record:
- **shelter_code:** S20251236 [VERIFIED]
- **animalId (SM numeric):** 4659 [VERIFIED]
- **Name:** Blizzard [VERIFIED]
- **Species:** Cat [VERIFIED]
- **Breed:** Domestic Short Hair [VERIFIED]
- **isAvailable:** true [VERIFIED]

### SM ANIMALCOMMENTS:
```
Not meant to be a household pet, but would be a great barn cat.
```
(63 characters) [VERIFIED — queried via `/api/animals/4659`]

### Caregiver data:
```sql
SELECT COUNT(*) FROM behavior_notes WHERE shelter_code='S20251236';
-- Result: 0
```
**No caregiver data exists.** [VERIFIED]

### animal_bios row:
```
id: 6c20ae9e-37e8-4efb-b167-0038cc4c5e07
shelter_code: S20251236
status_long: draft
status_short: draft
generated_at: 2026-06-12T13:54:20.948Z
bio_en_long: "Not meant to be a household pet, but would be a great barn cat."
```
[VERIFIED]

### Bio history:
```
sm_copy | sm_copy     | 2026-06-12 13:54:20   (initial copy from SM)
sm_copy | sm_copy     | 2026-06-14 12:57:17   (re-copy)
manual_edit_long | human | 2026-06-14 12:57:28
manual_edit_long | human | 2026-06-14 12:57:32
```
Bio was created via "📋 Use as Starting Point" (sm_copy), not via GPT generation. [VERIFIED]

### Confirmation:
- ✅ SM comment present (63 chars)
- ✅ Caregiver data absent (0 behavior_notes rows)
- ✅ Regenerate guard fires at line 2194 → "No caregiver data available"
- ✅ bioStatus shows "sm" in the UI (because `hasValue(smAnimal.description)` is true)

---

## 5. Scope

### Is this regenerate-only?

**YES — regenerate-only.** [VERIFIED]

- **Initial generate** (`POST /api/bio/generate/:animalId`): Has SM fallback since f89b01d. For animals with SM comment but no caregiver data, it would succeed with `generationSource = 'sm_generate'`. [VERIFIED by code inspection, lines 2124–2128]

- **Regenerate** (`POST /api/bio/:bioId/regenerate/:size`): Hard-requires caregiver data. No SM fallback. Fails with "No caregiver data available" for any animal with SM comment but no behavior_notes. [VERIFIED by code inspection, lines 2193–2196]

- **Copy SM bio** (`POST /api/bio/from-sm/:animalId`): Independent path, copies SM text directly. Works fine. [VERIFIED]

### How many animals are affected?

**91 out of 152 adoptable animals** have SM ANIMALCOMMENTS but no caregiver data. [VERIFIED via API query]

Of those 91:
- Any that already have a bio row (via sm_copy or prior generate) would show 🔄 Regenerate buttons, and clicking them would fail
- Any that don't have a bio row would see ✨ Generate Bios, which would succeed via the SM fallback

```sql
-- 104 total bio rows exist in animal_bios
```

The exact count of the 91 that also have bio rows (and would therefore hit regenerate) was not queried to avoid a complex join, but Blizzard is a confirmed instance.

---

## Root Cause Summary

Commit f89b01d added the SM-comment fallback to the **generate** endpoint but did **not** apply the same fallback to the **regenerate** endpoint. The regenerate handler (lines 2169–2243) still uses the pre-f89b01d pattern: `if (!merged) → error`. 

The fix would need to replicate the three-branch decision (profile → SM fallback → error) from the generate endpoint into the regenerate endpoint, so that `regenerateSingleBio()` receives `animal.description` as `transcripts` and `'{}'` as `mergedAttributes` when no caregiver profile exists but SM ANIMALCOMMENTS has content.

---

*Report generated by Rover. Read-only diagnosis — no changes made.*
