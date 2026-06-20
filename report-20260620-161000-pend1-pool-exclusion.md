# PEND-1: Adoption-Pending Pool Exclusion — Build + Verification

**Model:** claude-sonnet-4-6 (intent extraction temp 0.0, soft-ranking temp 0.0)  
**Endpoint:** POST /api/matcher/custom-search (real, live, 177-animal pool)  
**Sample:** 3 real queries (baseline, flagged, unflagged) — small-dog pool (only 3-4 animals, guarantees target appears/disappears in results)  
**Able to fail:** Amari (A2024185) appears in all 3 baseline small-dog results. After flagging adoption_pending=1, Amari must disappear from results AND candidateCount must drop by 1. After unflagging, Amari must reappear AND candidateCount must return to baseline. All 3 conditions verified.  
**Proves:** adoption_pending exclusion works at POOL CONSTRUCTION (before Phase-1 intent extraction or soft-ranking). Flagging removes an animal from the candidate pool entirely. Unflagging restores it. The exclusion is gated on a live DB query, not cached state.  
**Does NOT prove:** Behavior under concurrent flag/unflag operations. That the dashboard "Adoption Pending" button correctly sets the flag (verified only via PUT API, same endpoint the dashboard calls).

---

## LEAD

✅ **PEND-1 pool exclusion works end-to-end.** Adoption-pending animals are excluded at pool construction, before Phase-1 runs. [VERIFIED]

⚠️ **Currently 0 animals are flagged adoption_pending.** The fix is correct but inert until staff use the dashboard "Adoption Pending" button. This is expected — the feature was specced but the pool exclusion was never wired. [VERIFIED]

---

## What Changed

**File:** `server/src/server.ts`, pool construction block (~line 4500)

**Before:**
```typescript
const allAnimals = await fetchAnimals();
const speciesNames = SPECIES_FILTER[speciesLower];
const speciesPool = allAnimals.filter(a => {
  const sp = (a.species || '').trim();
  return speciesNames.some(n => n.toLowerCase() === sp.toLowerCase());
});
```

**After:**
```typescript
const allAnimals = await fetchAnimals();
const speciesNames = SPECIES_FILTER[speciesLower];

// Batch-load adoption_pending flags to exclude from pool construction
const pendingDb = getDatabase();
const pendingCodes = new Set(
  (pendingDb.prepare('SELECT shelter_code FROM animal_metadata WHERE adoption_pending = 1')
    .all() as { shelter_code: string }[])
    .map(r => r.shelter_code)
);
if (pendingCodes.size > 0) {
  console.log(`[Matcher] Excluding ${pendingCodes.size} adoption-pending animal(s) from pool: ${[...pendingCodes].join(', ')}`);
}

const speciesPool = allAnimals.filter(a => {
  if (pendingCodes.has(a.shelterCode)) return false; // adoption-pending exclusion
  const sp = (a.species || '').trim();
  return speciesNames.some(n => n.toLowerCase() === sp.toLowerCase());
});
```

**Design notes:**
- Reads `animal_metadata.adoption_pending` via the same `getDatabase()` used by the response-assembly code (line ~5425)
- Single batch query for all pending codes, not per-animal lookup
- Filter applied BEFORE Phase-1 intent extraction — pending animals never enter the candidate pool
- Logs excluded codes when any exist (operational visibility)

**Compile:** ✅ `tsc` exit 0, zero errors.

---

## Able-to-Fail Verification

**Test animal:** Amari (A2024185) — small dog, reliably appears in small-dog searches (pool has only 3-4 small dogs).

### Step 1: BASELINE
| Field | Value |
|-------|-------|
| Query | "a small dog" |
| Candidates | 4 |
| Results | Amari (A2024185), Marshmallow (A2025203), Nena (S2026079) |
| Amari present | ✅ YES |

### Step 2: FLAG adoption_pending=1
```
PUT /api/animals/A2024185/adoption-pending { pending: true }
→ 200 {"success":true}
```

### Step 3: SEARCH (flagged)
| Field | Value |
|-------|-------|
| Candidates | **3** (delta = 1 ✅) |
| Results | Marshmallow (A2025203), Nena (S2026079), Snowy (A2026092) |
| Amari present | ✅ **EXCLUDED** |

Snowy (a non-small dog) was pulled in by expansion to fill the 3rd slot — proving Amari was truly removed from the pool, not just re-ranked.

### Step 4: UNFLAG adoption_pending=0
```
PUT /api/animals/A2024185/adoption-pending { pending: false }
→ 200 {"success":true}
```

### Step 5: SEARCH (unflagged)
| Field | Value |
|-------|-------|
| Candidates | **4** (back to baseline ✅) |
| Results | Amari (A2024185), Marshmallow (A2025203), Nena (S2026079) |
| Amari present | ✅ **REAPPEARED** |

---

## Final State Confirmation

| Check | Value |
|-------|-------|
| Amari adoption_pending | **0** [VERIFIED via sqlite3] |
| Total animals with adoption_pending=1 | **0** [VERIFIED via sqlite3] |
| Dean (W2025068) adoption_pending | **0** [VERIFIED — test run 1 flagged/unflagged Dean; confirmed restored] |

---

## Deviations

None. The exclusion is at pool construction (before Phase-1), uses the same DB source as the existing response-decoration code, and the test animal was fully restored.

---

## NOT COMMITTED

This change is built and verified but NOT committed. Commit is a separate step after backup per operator instructions.
