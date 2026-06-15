# Youth generic job — remove SM comment skip

**Commit:** `be26f73` — `server: youth generic job no longer skips animals with SM comments (every youth gets a generic)`
**Base:** `e586a89`
**Scope:** `server/src/server.ts` only

## Change

Removed Condition 4 (`hasStaffSMComment(animal) continue`) from `findGenericBioCandidates()`. Previously, youth animals with an SM comment (ANIMALCOMMENTS) were excluded from generic bio generation. Now every qualifying youth gets a generic bio regardless of SM comment presence.

Remaining conditions unchanged:
1. Adoptable (via fetchAnimals)
2. Age ≤ 84 days (via ageInDays)
3. No behavior_notes (caregiver profile)
4. No existing animal_bios row ← renumbered from 5

## Diff

```diff
-    // Condition 4: ANIMALCOMMENTS empty
-    if (hasStaffSMComment(animal)) continue;
-
-    // Condition 5: no existing animal_bios row
+    // Condition 4: no existing animal_bios row
```

## Dry-run candidate set

| | Count |
|---|---|
| Pre-change | 0 |
| Post-change | 0 |

**Zero new candidates with SM comments appeared.** All 45 current youth animals already have existing bio rows (from prior youth generic job runs), so the "no existing animal_bios row" condition catches them all. The policy change is correct but has no immediate effect on the current population — it will matter for future youth intakes that arrive with SM comments already populated.

Build: clean (tsc exit 0). Service: restarted, active. No bio writes performed.
