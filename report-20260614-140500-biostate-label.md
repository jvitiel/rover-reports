# bioState Label — Implementation Report

**Date:** 2026-06-14 14:05 ET  
**Type:** Implementation  
**Commit:** `0bb36d1` — `server: compute bioState label (approved/pending/youth/needed) + emit dateOfBirth in dashboard payloads`  

---

## STEP 1 — Sentinel-Aware Helper

```typescript
/**
 * Sentinel-aware staff-content check for the bioState label.
 * Like hasRealStaffContent, but uses STRICTER SM description filtering:
 * rejects 'Unknown', 'Not specified', 'N/A', 'None specified' (same sentinel
 * list as the hasValue() closure at ~L1121 used by bioStatus).
 * A junk SM comment must NOT count as real content for label purposes.
 */
function hasRealStaffContentForLabel(shelterCode: string, description?: string | null): boolean {
  if (getBehaviorNotesCount(shelterCode) > 0) return true;
  if (!description || typeof description !== 'string') return false;
  const t = description.trim().toLowerCase();
  return t !== '' && t !== 'not specified' && t !== 'unknown' && t !== 'n/a' && t !== 'none specified';
}
```

**Sentinels filtered:** `''` (empty/whitespace), `'not specified'`, `'unknown'`, `'n/a'`, `'none specified'` — same list as `hasValue()` at L1121. [VERIFIED by inspection]

## STEP 2 — computeBioState() Label Function

```typescript
function computeBioState(
  bio: { lastSource?: string; statusLong: string; statusShort: string } | null,
  shelterCode: string,
  description: string | undefined | null,
  dateOfBirth: string | undefined | null,
): 'approved' | 'pending' | 'youth' | 'needed' {
  // 1. Approved: non-generic bio with at least one approved status
  if (bio && bio.lastSource !== 'generic' &&
      (bio.statusLong === 'approved' || bio.statusShort === 'approved')) {
    return 'approved';
  }
  // 2. Pending: real staff content present (sentinel-aware)
  if (hasRealStaffContentForLabel(shelterCode, description)) {
    return 'pending';
  }
  // 3. Youth: age <= 84 days
  if (dateOfBirth) {
    const dobMs = new Date(dateOfBirth).getTime();
    if (!isNaN(dobMs)) {
      const ageDays = (Date.now() - dobMs) / (1000 * 60 * 60 * 24);
      if (ageDays <= 84) return 'youth';
    }
  }
  // 4. Needed: everything else
  return 'needed';
}
```

## STEP 3 — Payload Diffs

### behavior-notes (animals.push block)

```diff
         bioStatus,
+        bioState: computeBioState(fullBio, smAnimal.shelterCode, smAnimal.description, smAnimal.dateOfBirth),
+        dateOfBirth: smAnimal.dateOfBirth || null,
         adoptionPending: adoptionPendingMap.get(smAnimal.shelterCode) || false,
```

### profiles-summary

Added bio lookup:
```diff
+    // 2b. Get all bios for bioState label computation
+    const allBiosForProfiles = getAllAnimalBios();
+    const biosMapForProfiles = new Map(allBiosForProfiles.map(b => [b.shelterCode, b]));
```

Added to per-animal return:
```diff
+      const bioForLabel = biosMapForProfiles.get(sm.shelterCode) || null;
+
       return {
         shelterCode: sm.shelterCode,
         ...
         isAvailable: sm.isAvailable,
+        bioState: computeBioState(bioForLabel, sm.shelterCode, sm.description, sm.dateOfBirth),
+        dateOfBirth: sm.dateOfBirth || null,
         profileCount,
```

## Verification — Per-Species Breakdown (Adoptable Only, 152 animals)

| Species | approved | pending | youth | needed | Total |
|---------|----------|---------|-------|--------|-------|
| Cat | 18 | 5 | 46 | 24 | 93 |
| Chinchilla | 0 | 0 | 0 | 1 | 1 |
| Dog | 7 | 25 | 0 | 8 | 40 |
| Ferret | 0 | 1 | 0 | 0 | 1 |
| Guinea Pig | 0 | 1 | 0 | 0 | 1 |
| Rabbit | 4 | 9 | 0 | 3 | 16 |
| **TOTAL** | **29** | **41** | **46** | **36** | **152** |

Both endpoints return identical distributions. [VERIFIED]

### vs. Earlier Estimate (report-20260614-110710)

| Label | Earlier estimate | Actual | Delta | Why |
|-------|-----------------|--------|-------|-----|
| approved | 29 | 29 | 0 | Exact match |
| pending | 89 | 41 | -48 | Earlier used pure-trim SM check; stricter sentinel filter + youth split reduces this |
| youth | 0 | 46 | +46 | Earlier had no youth computation; 46 cats ≤84 days now correctly classified |
| needed | 34 | 36 | +2 | Small shift from sentinel filtering |

The approved count matches exactly. The shift is from (a) the youth category now being computed (46 young cats), and (b) the stricter sentinel-aware SM filter moving some animals from pending to needed.

### Integrity Checks

- **Generic bios labeled 'approved':** 0 [VERIFIED]
- **Missing/unparseable dateOfBirth:** 0 of 152 adoptable [VERIFIED]
- **All youth ≤84 days:** 46/46 verified [VERIFIED]
- **All approved have non-generic bio:** 29/29 verified [VERIFIED]
- **bioStatus field unchanged:** yes, still present with distribution approved=77, none=52, sm=23 [VERIFIED]
- **approved + youth = 75** (future media "has bio" count)

---

*Implemented by Rover.*
