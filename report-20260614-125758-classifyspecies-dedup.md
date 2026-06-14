# Dashboard: Route Remaining Species Sites Through classifySpecies()

**Date:** 2026-06-14 12:57 ET  
**Type:** Implementation — behavior-neutral dedup  
**Commit:** `7bb9050` — `dashboard: route remaining species-classification sites through classifySpecies() helper`  
**Follows:** `602f8a4` (classifySpecies helper + fix for profiles tab)

---

## Sites Changed

### Site 1 — Media tab species filter (~L6772)

```diff
         filtered = allAnimalsData.filter(a => {
-          const species = (a.species || '').toLowerCase();
-          if (currentSpeciesFilter === 'dog') return species.includes('dog');
-          if (currentSpeciesFilter === 'cat') return species.includes('cat');
-          if (currentSpeciesFilter === 'small') return !species.includes('dog') && !species.includes('cat');
-          return true;
+          if (currentSpeciesFilter === 'small') return classifySpecies(a.species) === 'small';
+          return classifySpecies(a.species) === currentSpeciesFilter;
         });
```

Also removed dead `return true;` that became unreachable.

### Site 2 — renderAnimalCard CSS class + emoji (~L6968)

```diff
-      const speciesClass = animal.species?.toLowerCase().includes('cat') ? 'cat' 
-        : animal.species?.toLowerCase().includes('dog') ? 'dog' : 'other';
-      const emoji = speciesClass === 'cat' ? '🐱' : speciesClass === 'dog' ? '🐕' : '🐾';
+      const speciesBucket = classifySpecies(animal.species);
+      const speciesClass = speciesBucket === 'small' ? 'other' : speciesBucket;
+      const emoji = speciesBucket === 'cat' ? '🐱' : speciesBucket === 'dog' ? '🐕' : '🐾';
```

Note: CSS class remains `'other'` (matching `.species-badge.other` at L859), mapped from `classifySpecies()` return value `'small'`.

### Site 3 — Search auto-filter (~L8585)

```diff
-          const species = (matchInAll.species || '').toLowerCase();
-          if (species.includes('dog')) {
-            filterBySpecies('dog');
-          } else if (species.includes('cat')) {
-            filterBySpecies('cat');
-          } else {
+          const bucket = classifySpecies(matchInAll.species);
+          if (bucket === 'small') {
             filterBySpecies('small');
+          } else {
+            filterBySpecies(bucket);
           }
```

## Verification

Programmatic equivalence test for all three sites across Cat, Dog, Chinchilla, Guinea Pig, Rabbit, Ferret, null, and empty string:

```
=== Site 1: media filter ===
All match ✅
=== Site 2: renderAnimalCard ===
All match ✅
=== Site 3: search auto-filter ===
All match ✅
```

No count, emoji, CSS class, or filter output changes. Behavior-neutral dedup confirmed.

## Not Changed (per instructions)

- Profiles filter buttons (~L5175) — UI labels only
- Availability filter labels (~L14541) — UI labels only
- `.species-badge` CSS definitions (~L857-859) — styles only

## Deviations

None.

---

*Implemented by Rover.*
