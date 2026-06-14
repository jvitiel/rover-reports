# Dashboard: Unified Species Classification (classifySpecies)

**Date:** 2026-06-14 12:48 ET  
**Type:** Implementation — client-only fix  
**Commit:** `602f8a4` — `dashboard: unify species classification into classifySpecies(), fixing smalls catch-all on profiles tab`  

---

## STEP 1 — Enumeration (all species classification sites in dashboard/index.html)

```
857:    .species-badge.cat { ... }                                    — CSS class (cosmetic)
858:    .species-badge.dog { ... }                                    — CSS class (cosmetic)
5175-5177: profiles filter buttons ('dog'/'cat'/'smalls')             — UI labels only
6741-6743: updateTileCounts — cats/dogs/smalls filtering              — ★ CHANGED (catch-all, was correct)
6769-6771: media tab species filter (currentSpeciesFilter)            — catch-all (already correct)
6966-6968: renderAnimalCard CSS class + emoji                         — catch-all (already correct)
8584-8588: search auto-filter (filterBySpecies)                       — catch-all (already correct)
14541: availability filter group labels                               — UI labels only
15137-15139: matchesSpeciesFilter                                     — ★ CHANGED (was Rabbit||Ferret allow-list)
```

**Only two sites had materially different logic.** Lines 6769-6771, 6966-6968, and 8584-8588 already use the includes-based catch-all pattern and produce correct results for Chinchilla/Guinea Pig. No additional sites needed fixing.

## STEP 2 — Shared helper added

```javascript
function classifySpecies(species) {
  const s = (species || '').toLowerCase();
  if (s.includes('cat')) return 'cat';
  if (s.includes('dog')) return 'dog';
  return 'small'; // catch-all: rabbit, ferret, chinchilla, guinea pig, anything else
}
```

Placed at line 6740, immediately before `updateTileCounts`.

## STEP 3 — Both sites updated

### Diff:

```diff
+    function classifySpecies(species) {
+      const s = (species || '').toLowerCase();
+      if (s.includes('cat')) return 'cat';
+      if (s.includes('dog')) return 'dog';
+      return 'small'; // catch-all: rabbit, ferret, chinchilla, guinea pig, anything else
+    }
+
     function updateTileCounts(filtered) {
-      const cats = filtered.filter(a => (a.species || '').toLowerCase().includes('cat'));
-      const dogs = filtered.filter(a => (a.species || '').toLowerCase().includes('dog'));
-      const smalls = filtered.filter(a => !cats.includes(a) && !dogs.includes(a));
+      const cats = filtered.filter(a => classifySpecies(a.species) === 'cat');
+      const dogs = filtered.filter(a => classifySpecies(a.species) === 'dog');
+      const smalls = filtered.filter(a => classifySpecies(a.species) === 'small');
 
     function matchesSpeciesFilter(species) {
       if (profilesSpeciesFilter === 'all') return true;
-      if (profilesSpeciesFilter === 'dog') return species === 'Dog';
-      if (profilesSpeciesFilter === 'cat') return species === 'Cat';
-      if (profilesSpeciesFilter === 'smalls') return species === 'Rabbit' || species === 'Ferret';
-      return true;
+      if (profilesSpeciesFilter === 'smalls') return classifySpecies(species) === 'small';
+      return classifySpecies(species) === profilesSpeciesFilter;
     }
```

## STEP 4 — Deployment

- Dashboard is served via `express.static` at server.ts:9408 — plain static file, no build step
- No service worker registered in dashboard/index.html
- No cache-bust or version bump needed
- Change is live immediately upon file save

## Verification

```
classifySpecies('Chinchilla')  → 'small' ✅
classifySpecies('Guinea Pig')  → 'small' ✅
classifySpecies('Cat')         → 'cat'   ✅
classifySpecies('Dog')         → 'dog'   ✅
classifySpecies('Rabbit')      → 'small' ✅
classifySpecies('Ferret')      → 'small' ✅
classifySpecies(null)          → 'small' ✅
classifySpecies('')            → 'small' ✅
```

Fluffy (S2026403, Chinchilla) and Tater Tot (G2026002, Guinea Pig) will now appear under the Profiles tab Smalls filter. Media tab count (19) and Profiles tab count (19) will match.

## Deviations

None. Three other species-classification sites (6769-6771, 6966-6968, 8584-8588) already use the correct catch-all pattern. They could be routed through `classifySpecies()` for consistency in a future pass, but their behavior is already correct and wasn't in scope.

---

*Implemented by Rover.*
