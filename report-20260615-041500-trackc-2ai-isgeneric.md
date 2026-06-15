# Track C Step 2a-i — isGenericSource helper + computeBioState update

**Commit:** `1f40190` — `server: add isGenericSource, route computeBioState Rule 1 through it (Track C 2a-i, neutral)`
**Base:** `2a8f963`
**Scope:** `server/src/server.ts` only

## Changes

Added `isGenericSource(lastSource)` helper that returns true for `'generic'` or `'generic_adult'`. Updated computeBioState Rule 1 to use `!isGenericSource(bio.lastSource)` instead of `bio.lastSource !== 'generic'`.

No `generic_adult` rows exist yet (created in Track C step 2b), so this is behavior-neutral.

## Diff

```diff
+function isGenericSource(lastSource: string | null | undefined): boolean {
+  return lastSource === 'generic' || lastSource === 'generic_adult';
+}
+
 function computeBioState(
   ...
   // 1. Approved: non-generic bio with at least one approved status
-  if (bio && bio.lastSource !== 'generic' &&
+  if (bio && !isGenericSource(bio.lastSource) &&
```

## Verification — bioState distribution (adoptable only)

| State | Pre-deploy | Post-deploy |
|-------|-----------|-------------|
| approved | 28 | 28 |
| pending | 41 | 41 |
| youth | 44 | 44 |
| needed | 36 | 36 |
| **total** | **149** | **149** |

Identical. No animal changed bioState label. Behavior-neutral confirmed.

Build: clean (tsc exit 0). Service: restarted, active.
