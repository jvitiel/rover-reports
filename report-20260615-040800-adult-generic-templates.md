# Track C Step 1 — Adult Generic Bio Templates + renderAdultGenericBios (Inert)

**Date:** 2026-06-15 04:08 UTC  
**Type:** Implementation (additive, inert — zero callers)  
**Commit:** `816f67d` — `server: add adult generic bio templates + ES value maps + renderAdultGenericBios (inert, Track C step 1)`  
**File:** server/src/server.ts only (+97 lines)  

---

## What Was Added (server.ts:11301-11397)

### Helper Functions

| Function | Lines | Purpose |
|----------|-------|---------|
| `normalizeAgeEn(raw)` | 11303-11313 | "3 years 5 months." → "3 years"; "6 months." → "6 months"; "13 weeks." → "13 weeks" |
| `normalizeAgeEs(raw)` | 11315-11325 | Same logic → "3 años", "6 meses", "13 semanas" |
| `translateColorEs(original)` | 11337-11362 | Tokenize + dictionary → Spanish; unmapped → English fallback |
| `renderAdultGenericBios(animal)` | 11376-11397 | Pure function → {bioEnLong, bioEnShort, bioEsLong, bioEsShort} |

### Maps/Constants

| Constant | Line | Content |
|----------|------|---------|
| `SIZE_ES` | 11326 | small→pequeño, medium→mediano, large→grande |
| `COLOR_DICT_ES` | 11328-11335 | 19-entry dictionary (black→negro, tabby→atigrado, tuxedo→esmoquin, etc.) |
| `AdultGenericAnimal` | 11366-11374 | Interface: name, breed, sex, color, size, age |

### Color Translation Logic

- Normalize: lowercase, replace `:`, `-`, `/` with spaces
- Connectors: `and`/`&` → `y`; `with` → `con`
- Dilute special-case: remove `dilute` token, map remainder, append `diluido` if all mapped
- Fallback: ANY unmapped non-connector token → return original English unchanged

### Color Map Coverage (39 distinct SM values)

| Outcome | Count | Examples |
|---------|-------|---------|
| Fully mapped | 34 | Brown and White → Marrón y blanco; Tuxedo: Black and White → Esmoquin negro y blanco |
| English fallback | 5 | Tabico, Various, Dilute Tabico, Orange / Red & White, Chocolate* |

*Chocolate maps to itself (chocolate→chocolate) — visually identical, technically mapped.

---

## Rendered Samples (9 real animals, full output)

### (a) Luna — Female, Terrier/Mixed Breed, Brown and White, medium, "2 years 0 months."

**EN Long:** Meet Luna! Luna is a female Terrier/Mixed Breed, approximately 2 years old, with a Brown and White coat and a medium build. Luna is waiting to find a warm home and loving family they can call their own. The best way to see what makes them special is to come say hello — please contact Four Legs Good Animal Rescue to arrange a visit.

**EN Short:** Meet Luna, a female Terrier/Mixed Breed with a Brown and White coat who is approximately 2 years old. Luna is hoping for a loving home to call their own! Come say hello at Four Legs Good Animal Rescue.

**ES Long:** ¡Conoce a Luna! Luna es Terrier/Mixed Breed (hembra), de aproximadamente 2 años, con pelaje Marrón y blanco y de tamaño mediano. Luna está esperando encontrar un hogar cálido y una familia cariñosa a quien llamar suyos. La mejor manera de descubrir lo que la hace especial es venir a conocerla — comunícate con Four Legs Good Animal Rescue para coordinar una visita.

**ES Short:** ¡Conoce a Luna, Terrier/Mixed Breed (hembra) con pelaje Marrón y blanco, de aproximadamente 2 años! Luna está buscando un hogar lleno de amor a quien llamar suyo. ¡Ven a saludarla a Four Legs Good Animal Rescue!

### (b) Abe (Louie) — Male, Domestic Short Hair, Black with white, medium, "9 years 7 months."

**EN Long:** Meet Abe (Louie)! Abe (Louie) is a male Domestic Short Hair, approximately 9 years old, with a Black with white coat and a medium build. [...]

**ES Long:** ¡Conoce a Abe (Louie)! Abe (Louie) es Domestic Short Hair (macho), de aproximadamente 9 años, con pelaje Negro con blanco y de tamaño mediano. [...]

✅ Age "9 years 7 months." → "9 years" / "9 años" (months dropped)  
✅ Color "Black with white" → "Negro con blanco"  
✅ Male → macho, lo/conocerlo

### (c) Catzilla — Male, Domestic Short Hair, Tuxedo: Black and White, medium, "13 weeks."

**EN Long:** Meet Catzilla! Catzilla is a male Domestic Short Hair, approximately 13 weeks old, with a Tuxedo: Black and White coat and a medium build. [...]

**ES Long:** ¡Conoce a Catzilla! Catzilla es Domestic Short Hair (macho), de aproximadamente 13 semanas, con pelaje Esmoquin negro y blanco y de tamaño mediano. [...]

✅ Age "13 weeks." → "13 weeks" / "13 semanas"  
✅ Color "Tuxedo: Black and White" → "Esmoquin negro y blanco" (tuxedo=esmoquin, not duplicated)

### (d) Amari — Female, Havanese/Terrier, Cream, small, "3 years 2 months."

**ES Long:** [...] con pelaje Crema y de tamaño pequeño. [...]

✅ Size "small" → "pequeño"  
✅ Color "Cream" → "Crema"

### (e) Cardinal — Tabico (FALLBACK)

**ES Long:** [...] con pelaje Tabico y de tamaño mediano. [...]

✅ "Tabico" not in dictionary → English fallback preserved

### (e) Ember — Various (FALLBACK)

**ES Long:** [...] con pelaje Various y de tamaño mediano. [...]

✅ "Various" not in dictionary → English fallback preserved

### (e) Meadow — Dilute Tabico (FALLBACK)

**ES Long:** [...] con pelaje Dilute Tabico y de tamaño mediano. [...]

✅ "Dilute Tabico" → tabico unmapped → full English fallback (not "Tabico diluido")

### (f) Danica — Dilute Calico (MAPPED)

**ES Long:** [...] con pelaje Calicó diluido y de tamaño mediano. [...]

✅ "Dilute Calico" → calico maps → "Calicó diluido"

### (f) Zelda (Annex Cat) — Dilute Tortie (MAPPED)

**ES Long:** [...] con pelaje Carey diluido y de tamaño mediano. [...]

✅ "Dilute Tortie" → tortie maps → "Carey diluido"

---

## Verification

- [x] tsc --noEmit: clean compile (exit 0) [VERIFIED]
- [x] grep renderAdultGenericBios: 1 definition + internal refs only, 0 external callers [VERIFIED]
- [x] grep normalizeAgeEn/Es, translateColorEs, SIZE_ES, COLOR_DICT_ES: all internal only [VERIFIED]
- [x] runGenericBioJob, findGenericBioCandidates, computeBioState, resolveBioText, youth templates: 0 lines changed [VERIFIED]
- [x] No client files changed [VERIFIED]
- [x] No schema changes [VERIFIED]
- [x] git diff --cached --stat: server/src/server.ts | 97 insertions, 1 file [VERIFIED]

## Untouched (confirmed)

- Youth templates (GENERIC_BIO_TEMPLATES, L11262-11288): 0 lines changed [VERIFIED]
- renderGenericBios (L11289-11299): 0 lines changed [VERIFIED]
- findGenericBioCandidates (L11400+): 0 lines changed [VERIFIED]
- runGenericBioJob, scheduleGenericBioJob: 0 lines changed [VERIFIED]
- computeBioState, resolveBioText: 0 lines changed [VERIFIED]
- No dashboard/client files [VERIFIED]

---

*Implemented by Rover. Track C step 1 complete — step 2 (wiring into the daily job + age-crossing detection) is separate.*
