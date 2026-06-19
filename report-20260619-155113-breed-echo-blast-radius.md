# Breed-Echo Suppression Blast Radius: Cat/Dog Impact Check

**Date:** 2026-06-19 15:51 ET  
**Type:** READ-ONLY DIAGNOSIS  
**Scope:** All adoptable cats (105) and dogs (39) via `fetchAnimals()`

---

## Blast-Radius Answer

**0 cats and 0 dogs have breed.toLowerCase() === species.toLowerCase().** [VERIFIED]

The breed-echo suppression shipped in commit `9518396` (placed in the shared payload path) changes nothing for cats or dogs. The "harmless for cats/dogs" claim is confirmed.

---

## Detail

### Affected animals (breed == species after trim + toLowerCase)

| Species | Count | Affected |
|---------|-------|----------|
| Cat | 105 | **0** [VERIFIED] |
| Dog | 39 | **0** [VERIFIED] |
| **Total** | **144** | **0** |

### Empty/sentinel/literal-species breed values

**0** cats or dogs have an empty breed, a sentinel value (`not specified`, `unknown`, `n/a`, `none specified`, `none`), or the literal string `"Cat"`/`"Dog"` as their breed. [VERIFIED]

The SM quirk where the breed field echoes the species name is exclusive to the small-animal species (chinchilla, ferret, guinea pig). It does not occur for cats or dogs.

### Normal-breed payload confirmation

The suppression only fires when `breed.toLowerCase() === species.toLowerCase()`. For normal breeds (which is every cat and every dog), the breed line still renders:

- **Cat example:** Abe (Louie) `S2025966` — Species: Cat, Breed: `Domestic Short Hair` → breed line renders ✓ [VERIFIED]
- **Dog example:** Abstract `S2026133` — Species: Dog, Breed: `Terrier/Mixed Breed` → breed line renders ✓ [VERIFIED]

### Unique breed values

**Cat breeds (3 unique):** Domestic Long Hair, Domestic Medium Hair, Domestic Short Hair

**Dog breeds (23 unique):** Basenji/Shepherd, Bichon Frise, Boxer/Mixed Breed, Chihuahua, Chihuahua/Mixed Breed, German Shepherd Dog, German Shepherd Dog/Mixed Breed, Havanese/Terrier, Husky, Husky/Mixed Breed, Labrador Retriever, Labrador Retriever/Mixed Breed, Labrador Retriever/Pit Bull Terrier, Labrador Retriever/Terrier, Maltese/Mixed Breed, Maltese/Poodle, Mixed Breed, Pekingese/Mixed Breed, Pit Bull Terrier, Spaniel/Dachshund, Terrier, Terrier/Mixed Breed, Terrier/Pit Bull Terrier

None of these match `"cat"` or `"dog"` (case-insensitive). The closest theoretical risk — a breed literally named "Cat" or "Dog" — does not exist in the dataset.

---

## Conclusion

The all-species generalization of breed-echo suppression is confirmed harmless. No cat or dog bio output changed with commit `9518396`. The suppression fires only for the three small-animal species where SM records species-as-breed (Chinchilla, Ferret, Guinea Pig).
