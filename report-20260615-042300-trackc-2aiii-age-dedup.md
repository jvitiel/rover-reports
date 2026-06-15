# Track C 2a-iii — Age math dedup in findGenericBioCandidates

**Commit:** `cb579f5` — `server: route findGenericBioCandidates age math through ageInDays (Track C 2a-iii, neutral)`
**Base:** `1f40190`
**Scope:** `server/src/server.ts` only

## Change

Replaced the inline age computation in `findGenericBioCandidates`:
```diff
-    if (!animal.dateOfBirth) continue;
-    const dobMs = new Date(animal.dateOfBirth).getTime();
-    if (isNaN(dobMs)) continue;
-    const ageFromDobDays = Math.floor((today.getTime() - dobMs) / 86400000);
-    if (ageFromDobDays > GENERIC_BIO_MAX_AGE_DAYS) continue;
+    const ageFromDobDays = ageInDays(animal.dateOfBirth);
+    if (ageFromDobDays === null || ageFromDobDays > GENERIC_BIO_MAX_AGE_DAYS) continue;
```

Also removed the now-unused `const today = new Date();` line.

`ageInDays()` handles null/undefined dateOfBirth (returns null) and NaN from unparseable dates (returns null), covering the same guard logic that was inline. The math is identical: `Math.floor((now - dobMs) / 86400000)`.

## Verification — dry-run candidate set

| | Count | Shelter codes |
|---|---|---|
| Pre-deploy | 0 | (none) |
| Post-deploy | 0 | (none) |

Identical. Zero candidates in both runs — all current youth animals already have bios, SM comments, or behavior notes.

Build: clean (tsc exit 0). Service: restarted, active.
