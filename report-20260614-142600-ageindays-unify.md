# ageInDays Unification — Implementation Report

**Date:** 2026-06-14 14:26 ET  
**Type:** Implementation  
**Commit:** `c948919` — `server: unify age-in-days math (whole days) across computeBioState and old-generic-bios; 84d inclusive = youth`  

---

## Shared Helper (STEP 1)

```typescript
/**
 * Whole-day age from dateOfBirth. Time-of-day independent (floor).
 * Returns null if dateOfBirth is missing or unparseable.
 */
function ageInDays(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dobMs = new Date(dateOfBirth).getTime();
  if (isNaN(dobMs)) return null;
  return Math.floor((Date.now() - dobMs) / (1000 * 60 * 60 * 24));
}
```

## computeBioState Diff (STEP 2)

```diff
-  // 3. Youth: age <= 84 days
-  if (dateOfBirth) {
-    const dobMs = new Date(dateOfBirth).getTime();
-    if (!isNaN(dobMs)) {
-      const ageDays = (Date.now() - dobMs) / (1000 * 60 * 60 * 24);
-      if (ageDays <= 84) return 'youth';
-    }
-  }
+  // 3. Youth: age <= 84 days (whole floored days via shared ageInDays)
+  const age = ageInDays(dateOfBirth);
+  if (age !== null && age <= 84) return 'youth';
```

**Before:** fractional days (84.76 > 84 → not youth).  
**After:** whole floored days (84 ≤ 84 → youth). Time-of-day independent.

## old-generic-bios Diff (STEP 3)

```diff
     for (const animal of animals) {
       if (!genericCodes.has(animal.shelterCode)) continue;
-      if (!animal.dateOfBirth) continue;
-      const dobMs = new Date(animal.dateOfBirth).getTime();
-      if (isNaN(dobMs)) continue;
-      const ageDays = Math.floor((today - dobMs) / 86400000);
+      const ageDays = ageInDays(animal.dateOfBirth);
+      if (ageDays === null) continue;
       if (ageDays > GENERIC_BIO_MAX_AGE_DAYS) {
```

Also removed unused `const today = Date.now();`.

**Before and after:** both used `Math.floor`, so semantics unchanged. Now shares the helper.

## Boundary Consistency

| Age (whole days) | computeBioState | old-generic-bios | Consistent? |
|------------------|-----------------|------------------|-------------|
| 84 | youth (84 ≤ 84) | not aged-out (84 not > 84) | ✓ |
| 85 | needed (85 > 84) | aged-out (85 > 84) | ✓ |

An 84-day animal is youth AND not-aged-out. An 85-day animal is needed AND aged-out. The two boundaries are now identical via the shared `ageInDays()` function.

## STEP 4 — Other Age Sites (enumerated, NOT modified)

| # | Location | Function | Age source | Cutoff | Semantics |
|---|----------|----------|------------|--------|-----------|
| 1 | L11313 | `findGenericBioCandidates()` | `dateOfBirth` → `Math.floor` | `> GENERIC_BIO_MAX_AGE_DAYS` (84) | ≤84d = candidate for generic bio. Same `Math.floor` semantics as `ageInDays()`. Could be routed through `ageInDays()` in a future commit. |
| 2 | L4191-4195 | `deriveAgeGroup()` | `ageInYears` (SM field) | `<2` / `<7` / `≥7` | Young/Adult/Senior buckets for custom-search searcher. Different unit (years, not days) and different purpose. NOT a candidate for `ageInDays()`. |
| 3 | L4384 | searcher call site | calls `deriveAgeGroup(a.ageInYears)` | — | Same as #2 |

**No shared dependency issues.** Routing computeBioState and old-generic-bios through `ageInDays()` does not change any third site's behavior. `findGenericBioCandidates` already uses identical `Math.floor` math and could optionally be routed through `ageInDays()` later for dedup, but the semantics are already aligned.

## Verification

### Orchid (S2026358) and Peony (S2026356)
- Both: `bioState = youth`, `dateOfBirth = 2026-03-22T00:00:00`, `lastSource = generic`
- `ageInDays` = 84 (whole days), 84 ≤ 84 → youth ✓
- Previously: fractional 84.76 > 84 → needed ✗ (now fixed)

### old-generic-bios endpoint
- Count: 0 ✓ (Orchid/Peony at 84 days, not > 84)

### Full adoptable distribution (152 animals)
| Label | Count |
|-------|-------|
| approved | 29 |
| pending | 41 |
| youth | 48 |
| needed | 34 |
| **TOTAL** | **152** |

Shift from pre-fix: youth 46→48 (+2 Orchid, Peony), needed 36→34 (-2). ✓

---

*Implemented by Rover.*
