# Server: Unified Bio-Text Fallback (resolveBioText)

**Date:** 2026-06-14 13:09 ET  
**Type:** Implementation — server-side consolidation  
**Commit:** `f7ef33d` — `server: unify bio-text fallback into resolveBioText (approved -> SM -> stock placeholder)`  

---

## What changed

Three divergent bio-text fallback computations consolidated into a single shared resolver `resolveBioText()`.

### The resolver (server.ts, after truncateBio at ~L2528)

```typescript
function resolveBioText(animal: { name?: string; description?: string } | null, bio: AnimalBio | null): {
  bioEnLong: string; bioEnShort: string; bioEsLong: string; bioEsShort: string;
} {
  const name = animal?.name || 'Unknown';
  const smDescription = animal?.description || '';
  const stockPlaceholder = `To meet ${name !== 'Unknown' ? name : 'me'}, please visit Four Legs Good Animal Rescue.`;

  // Long English: approved → SM → stock placeholder
  // Short English: approved → truncated SM → stock placeholder
  // Spanish: approved only (no SM Spanish fallback)
  ...
}
```

### Site 1 — GET /api/animals (list) ~L923

**Before:** Inline fallback with `displayBio`, `smDesc`, separate `bioEnLong`/`bioEnShort` computations. Long fell back to SM then empty. Short fell back to `smDesc.slice(0, 200)` then empty.

**After:** `const resolved = resolveBioText(animal, bio);` — both long and short now fall through to stock placeholder. Short SM truncation upgraded from raw `.slice(0,200)` to `truncateBio()` (word-boundary-aware with ellipsis).

### Site 2 — GET /api/animals/:id (single) ~L983

**Before:** Inline `displayBio` with approved → SM → empty. No short bio in response.

**After:** `const resolved = resolveBioText(animal, bio);` — now falls through to stock placeholder instead of empty.

### Site 3 — buildFeaturedAnimalData (featured-slot enrichment) ~L2603

**Before:** Full inline fallback chain (approved → SM → stock placeholder) — already had the target behavior.

**After:** `resolveBioText({ name, description: animal?.description || '' }, bio)` — passes explicit `name` from the local variable (which may come from cached metadata when `animal` is null). Behavior unchanged.

## Behavioral change (intended)

| Scenario | Before (Sites 1 & 2) | After (all sites) |
|----------|---------------------|-------------------|
| Approved bio exists | Approved bio text | Approved bio text (unchanged) |
| No approved bio, SM comment exists | SM comment | SM comment (unchanged) |
| No approved bio, no SM comment | Empty string `""` | Stock placeholder: "To meet [name], please visit Four Legs Good Animal Rescue." |

Site 3 already had this behavior. Now all three are consistent.

## Verification

### Animal with NO bio and NO SM comment (stock placeholder):
```
Anastasia (R2026007):
  /api/animals list:  bio_en_long = "To meet Anastasia, please visit Four Legs Good Animal Rescue."
  /api/animals/:id:   description = "To meet Anastasia, please visit Four Legs Good Animal Rescue."
  bio_en_short = "To meet Anastasia, please visit Four Legs Good Animal Rescue."
```

### Animal WITH approved bio (unchanged):
```
Abe (Louie) (S2025966):
  description = "Meet Abe, affectionately known as Baby Aby—a delightful 9-year-old..."
  description == bio.bioEnLong: True
```

### Featured slots (Site 3, unchanged):
```
Slot 1: Ava (R2024018) — approved bio text returned correctly
```

### Build + restart:
```
tsc: clean build (0 errors)
shelter-app: active (running) since Sun 2026-06-14 17:08:21 UTC
```

## Not touched (per instructions)

- `/api/bios` and `/api/bios/:animalId` (WordPress direct reads — no fallback)
- Dashboard bio payload (line ~1235 — sends raw `animal_bios` object)
- No generic/real distinction added
- No DOB/age logic
- No client files
- No schema changes

## Deviations

None.

---

*Implemented by Rover.*
