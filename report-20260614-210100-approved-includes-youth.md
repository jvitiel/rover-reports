# Media Tab — Approved Filter Includes Youth

**Date:** 2026-06-14 21:01 ET  
**Type:** Implementation  
**Commit:** `55f2a5d` — `dashboard: media tab Approved filter includes youth (matches approved+youth tile gauge)`  

---

## The Fix

```diff
       // Apply bioState filter (ANDs with species)
-      if (currentBioStateFilter !== 'all') {
-        filtered = filtered.filter(a => a.bioState === currentBioStateFilter);
-      }
+      // 'approved' includes youth (matches the approved+youth tile gauge)
+      if (currentBioStateFilter === 'approved') {
+        filtered = filtered.filter(a => a.bioState === 'approved' || a.bioState === 'youth');
+      } else if (currentBioStateFilter !== 'all') {
+        filtered = filtered.filter(a => a.bioState === currentBioStateFilter);
+      }
```

## Reconciliation

| Metric | Value | Source |
|--------|-------|--------|
| All tile "approved" number | 74 | approved+youth count from `updateTileCounts()` |
| Approved filter row count | 74 | `filtered.length` after `bioState === 'approved' \|\| 'youth'` |
| Youth filter row count | 46 | `filtered.length` after `bioState === 'youth'` (exact match, unchanged) |

The tile gauge and the Approved filter now agree: both count approved+youth in the same pool. [VERIFIED via API — 74 approved+youth, 46 youth-only in 149 adoptable]

## Untouched

- Needed/Pending/Youth filter cases: exact-match, unchanged [VERIFIED]
- 'all' case: no-filter, unchanged [VERIFIED]
- Tile gauge, buttons, setBioStateFilter, rows metric: 0 lines changed [VERIFIED]
- No server files [VERIFIED]

---

*Implemented by Rover.*
