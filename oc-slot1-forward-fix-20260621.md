# Slot-1 Forward Fix: Unpublished Photos → Library

**Date:** 2026-06-21 ~05:25 UTC
**Commit:** `589ce34`
**File:** `server/src/server.ts` (1 file, 15 insertions, 3 deletions)

---

## Old Block (pre-edit, from commit `2138d48`)

Lines ~12132–12139:

```typescript
if (globeRow) {
    const N = globeRow.strip_position ?? 0; // globe's current position (0 = library)
    try {
      db.exec('BEGIN');
      // Demote current slot-1 to N, promote globe to 1
      db.prepare(`UPDATE animal_media SET strip_position = ? WHERE id = ? AND shelter_code = ?`).run(N, slot1Row.id, animal.shelterCode);
```

[VERIFIED: read from live `server.ts` at offset 12131–12138 before edit.]

**Problem:** Demotes the old slot-1 photo to `N` (the globe's vacated strip position) unconditionally. If the demoted photo is SM-unpublished, this leaves an unpublished photo on the public strip.

## PHOTOURLS Reuse

The animal's PHOTOURLS is already parsed at line 12023 in the same `for (const animal of animals)` loop:

```typescript
const photoUrls = (animal as any).allPhotoUrls || [];
```

[VERIFIED: `photoUrls` is in scope at the edit site — same loop body, declared ~70 lines earlier.]

`extractMediaId()` (imported from `shelterManagerService.ts`, line 23) extracts the string mediaid from each URL. No new SM fetch added.

## The Edit (diff)

```diff
           if (globeRow) {
             const N = globeRow.strip_position ?? 0;
+            // Determine demote target: if the old slot-1 photo is SM-unpublished, send to library (0)
+            // instead of N, so unpublished photos don't land on the public strip.
+            // Published set = mediaids extracted from this animal's PHOTOURLS (already available as photoUrls).
+            let demoteTo = N;
+            if (slot1Row.source_media_id) {
+              const publishedMediaIds = new Set(
+                photoUrls.map((u: string) => extractMediaId(u)).filter((id: string | null): id is string => id !== null)
+              );
+              if (!publishedMediaIds.has(slot1Row.source_media_id)) {
+                demoteTo = 0; // unpublished → library
+              }
+            }
             try {
               db.exec('BEGIN');
-              // Demote current slot-1 to N, promote globe to 1
-              db.prepare(`UPDATE animal_media SET strip_position = ? WHERE id = ? AND shelter_code = ?`).run(N, slot1Row.id, animal.shelterCode);
+              // Demote current slot-1 to demoteTo, promote globe to 1
+              db.prepare(`UPDATE animal_media SET strip_position = ? WHERE id = ? AND shelter_code = ?`).run(demoteTo, slot1Row.id, animal.shelterCode);
```

Log line also updated to show `demoteTo` and annotate `(unpublished→library)` when demoteTo differs from N.

### Decision rules

| Condition | demoteTo |
|---|---|
| `source_media_id` is null or empty | N (no reclassification — matches never-sweep rule) |
| `source_media_id` IS in published set | N (published photo stays on strip at globe's old position) |
| `source_media_id` NOT in published set | 0 (unpublished → library) |

### Assertion compatibility

When `demoteTo=0` this is a move-to-library, not a positional swap. The existing pre-commit assertions still hold:
- Globe at pos 1: ✅ (unchanged)
- No duplicate positions 1–6: ✅ (the demoted photo is at pos 0, outside 1–6; globe's vacated mid-strip slot may be empty — that's a gap, not a duplicate)
- No new reindex behavior was added — a gap at the globe's old strip position is tolerated. The existing code does not perform dense reindex and none was added.

## Build Result

```
$ npm run build
> tsc
(exit 0)
```

✅ Clean compile, zero errors. [VERIFIED: `tsc` exit code 0.]

## Controlled Test (Step 4)

No live DB access. Python-based logic mirror with 5 test cases:

| Case | slot1 source_media_id | In PHOTOURLS? | N | Expected demoteTo | Result |
|---|---|---|---|---|---|
| A (unpublished) | "1234" | No | 3 | 0 | ✅ PASS |
| B (published) | "5678" | Yes | 3 | 3 | ✅ PASS |
| C (null mediaid) | None | N/A | 2 | 2 | ✅ PASS |
| D (empty mediaid) | "" | N/A | 4 | 4 | ✅ PASS |
| E (globe at library) | "1234" | No | 0 | 0 | ✅ PASS |

**Able-to-fail evidence:** Test A proves the branch fires (demoteTo overridden from 3 to 0). Test B proves a published photo is NOT affected (demoteTo stays at 3). Both cases use the same function with different inputs — one hits the override, one doesn't.

## No-Live-Change Confirmation (Step 5)

Strip-position snapshots taken before and after all work for 5 animals (S2026454, A2023267, A2023030, S2026144, S2026668):

```
$ diff strip-snapshot-before.txt strip-snapshot-after.txt
(no output — identical)
```

✅ No live `animal_media` rows were modified. [VERIFIED: `diff` exit 0, both files identical.]

## Commit

```
589ce34 Slot-1 forward fix: demote unpublished photos to library instead of strip
 1 file changed, 15 insertions(+), 3 deletions(-)
```

Only `server/src/server.ts` committed via explicit `git add server/src/server.ts`.

## Deviations

None.
