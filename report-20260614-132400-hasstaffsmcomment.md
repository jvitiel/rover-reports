# Server: Centralize SM-Comment Check + Define hasRealStaffContent

**Date:** 2026-06-14 13:24 ET  
**Type:** Implementation — behavior-neutral consolidation  
**Commit:** `d3b86d3` — `server: centralize SM-comment check into hasStaffSMComment(); define hasRealStaffContent()`  

---

## Helpers added (server.ts ~L2528)

```typescript
function hasStaffSMComment(animal: { description?: string } | null): boolean {
  return !!(animal && animal.description && animal.description.trim());
}

function hasRealStaffContent(animal: { shelterCode: string; description?: string } | null): boolean {
  if (!animal) return false;
  return getBehaviorNotesCount(animal.shelterCode) > 0 || hasStaffSMComment(animal);
}
```

## Sites routed through hasStaffSMComment()

### 1. sm_copy guard (L2034)

```diff
     const smBio = animal.description?.trim() || '';
-    if (!smBio) {
+    if (!hasStaffSMComment(animal)) {
```

**Behavior-identical:** `!smBio` is truthy exactly when `animal.description?.trim()` is falsy — same as `!hasStaffSMComment(animal)`. The `smBio` variable is kept for the copy operation below.

### 2. Generate fallback (L2109)

```diff
-    } else if (animal.description?.trim()) {
+    } else if (hasStaffSMComment(animal)) {
```

**Behavior-identical:** `animal.description?.trim()` is truthy exactly when `hasStaffSMComment(animal)` is true.

### 3. Generic-bio exclusion (L11255)

```diff
-    if (animal.description?.trim()) continue;
+    if (hasStaffSMComment(animal)) continue;
```

**Behavior-identical:** Same trim semantics.

## Site intentionally NOT routed

**bioStatus computation (L1208):** Uses `hasValue(smAnimal.description)` which is a stricter check — also rejects sentinels like 'Unknown', 'Not specified', 'N/A', 'None specified'. Routing this through `hasStaffSMComment()` (pure trim) would weaken the filter. No current animals have these sentinel values in ANIMALCOMMENTS, but the semantic difference is real and should be preserved. Left as-is.

## hasRealStaffContent — defined, not wired

`hasRealStaffContent()` is defined at L2546 with zero callers. It combines `getBehaviorNotesCount() > 0` (caregiver profile) with `hasStaffSMComment()` (SM comment). The provenance-narrowing seam for later AI-push exclusion is documented in its JSDoc. It will be wired into bioStatus/label computation in a later step.

## Verification

```
Animals returned: 152
Stock placeholder verified: Anastasia (R2026007)
Approved bio verified: Abe (Louie) (S2025966) — description matches bioEnLong: True
SM comment fallback verified: Abstract (S2026133)
```

Build: clean (tsc, 0 errors)  
Restart: active (running) since Sun 2026-06-14 17:23:33 UTC

## Deviations

- L1208 (`hasValue(smAnimal.description)`) intentionally not routed — stricter semantics (sentinel filtering) would be weakened by hasStaffSMComment's pure trim check.

---

*Implemented by Rover.*
