# Bio Pending Fix Phase 1 — Implementation Report

**Date:** 2026-06-16 23:45 UTC  
**Commit:** `308f2d2`  
**Scope:** server/src/localDatabase.ts + server/src/server.ts only. No client changes.

---

## Changes Made

### EDIT 1 — getAllAnimalBioDrafts (localDatabase.ts)

Added after `getAnimalBioDraft` (line ~1697):

```typescript
export function getAllAnimalBioDrafts(): Map<string, AnimalBioDraft> {
  const database = getDatabase();
  const rows = database.prepare('SELECT * FROM animal_bio_drafts').all() as Record<string, unknown>[];
  const map = new Map<string, AnimalBioDraft>();
  for (const row of rows) {
    const draft = rowToAnimalBioDraft(row);
    map.set(draft.shelterCode, draft);
  }
  return map;
}
```

Returns the same `AnimalBioDraft` shape as `getAnimalBioDraft` (via `rowToAnimalBioDraft`), keyed by `shelterCode`. [VERIFIED]

### EDIT 2 — Batch endpoint (server.ts ~1086)

Added draft loading before per-animal loop:

```typescript
// 3b. Batch-load all drafts for quick lookup
const allDraftsMap = getAllAnimalBioDrafts();
```

Per animal, added:
```typescript
const draftData = allDraftsMap.get(smAnimal.shelterCode) || null;
```

Passed `draftData` to `computeBioState` and added `draft: draftData` to the pushed animal object. [VERIFIED]

### EDIT 3 — computeBioState (server.ts ~2592)

Rewritten with Auditor-approved predicate and youth guard:

```typescript
function computeBioState(
  bio: { lastSource?: string; statusLong: string; statusShort: string } | null,
  shelterCode: string,
  description: string | undefined | null,
  dateOfBirth: string | undefined | null,
  draft?: { promotedLong: boolean; promotedShort: boolean; sourceLong: string | null; sourceShort: string | null } | null,
): 'approved' | 'pending' | 'youth' | 'needed' {
  const age = ageInDays(dateOfBirth);
  const isYouth = age !== null && age <= 84;

  const hasUnpromotedRealDraft = !!draft && (
    (!draft.promotedLong && (draft.sourceLong === 'from_profile' || draft.sourceLong === 'from_sm')) ||
    (!draft.promotedShort && (draft.sourceShort === 'from_profile' || draft.sourceShort === 'from_sm'))
  );

  const hasApprovedRealBio = !!bio && !isGenericSource(bio.lastSource) &&
    (bio.statusLong === 'approved' || bio.statusShort === 'approved');

  const brokenPipeline = hasRealStaffContentForLabel(shelterCode, description) && !hasApprovedRealBio;

  // 1. PENDING — only for non-youth
  if (!isYouth && (hasUnpromotedRealDraft || brokenPipeline)) return 'pending';

  // 2. APPROVED — non-generic approved bio AND no unpromoted real draft waiting
  if (hasApprovedRealBio && !hasUnpromotedRealDraft) return 'approved';

  // 3. YOUTH
  if (isYouth) return 'youth';

  // 4. NEEDED
  return 'needed';
}
```

### computeBioState Call Sites

| Location | File:Line | Draft arg |
|----------|-----------|-----------|
| Batch endpoint (behavior-notes) | server.ts:1245 | `draftData` (from allDraftsMap) |
| Profiles summary endpoint | server.ts:1356 | `null` (no draft context needed for profile list labels) |

Both call sites updated. No other callers exist. [VERIFIED]

---

## 19-Animal Test — ALL PENDING [VERIFIED]

```
A2023287: bioState=pending draft=YES
G2026002: bioState=pending draft=YES
R2023007: bioState=pending draft=YES  ← Charlie (was 'approved')
R2023065: bioState=pending draft=YES
R2025003: bioState=pending draft=YES
R2025005: bioState=pending draft=YES
R2025037: bioState=pending draft=YES
R2026007: bioState=pending draft=YES
S2024718: bioState=pending draft=YES
S2025131: bioState=pending draft=YES
S2025877: bioState=pending draft=YES
S2025883: bioState=pending draft=YES
S2025966: bioState=pending draft=YES  ← Abe (was 'approved')
S2026031: bioState=pending draft=YES
S2026079: bioState=pending draft=YES
S2026154: bioState=pending draft=YES
S2026155: bioState=pending draft=YES
S2026357: bioState=pending draft=YES
S2026560: bioState=pending draft=YES
```

All 19/19 now return `bioState=pending` with `draft=YES`. Charlie (R2023007) and Abe (S2025966) — the two that were incorrectly 'approved' — are now correctly 'pending'. [VERIFIED]

---

## Regression Spot-Checks [VERIFIED]

### (a) Fully approved real bio, no draft → still 'approved'

```
R2025053 (lastSource=backfill) → bioState=approved draft=NO ✓
```

[VERIFIED]

### (b) Youth animal → stays 'youth'

```
S2026526 (dob=2026-04-17, ~60 days) → bioState=youth ✓
```

Youth guard working — age ≤ 84 days, stays 'youth' regardless of staff content. [VERIFIED]

### (c) Generic-only adult, no profile → 'needed'

```
A2023030/Spooky (lastSource=generic_adult, 0 behavior_notes, no SM description) → bioState=needed ✓
```

[VERIFIED]

---

## Draft in Batch Response [VERIFIED]

Charlie (R2023007) sample from batch response:

```json
{
  "draft": {
    "sourceLong": "from_profile",
    "sourceShort": "from_profile",
    "promotedLong": false,
    "promotedShort": false,
    "bioEnShort": "Charlie, the dapper Hotot bunny with natural 'eyeliner'..."
  }
}
```

Full draft shape present with all AnimalBioDraft fields. [VERIFIED]

---

## Build & Service

- **Build:** clean (tsc, 0 errors) [VERIFIED]
- **Service:** active (running) since 23:43:45 UTC [VERIFIED]
- **Commit:** `308f2d2`
- **Diff:** `2 files changed, 45 insertions(+), 14 deletions(-)`
  - `server/src/localDatabase.ts | 11 +++++++++++`
  - `server/src/server.ts        | 48 ++++++++++++++++++++++++++++++++-------------`

No dashboard/index.html changes. No data writes. [VERIFIED]
