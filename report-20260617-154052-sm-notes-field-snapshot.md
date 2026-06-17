# SM Notes Field Snapshot — 2026-06-17

## 1. Confirmed SM Bio Source Field

**The SM bio source is `ANIMALCOMMENTS`** — the "Description" field in SM's Notes section. [VERIFIED]

### Code References

**Mapping (shelterManagerService.ts:62):**
```ts
description: raw.ANIMALCOMMENTS || '',
```
This maps the raw SM `ANIMALCOMMENTS` column to `animal.description` in our normalized `Animal` type.

**Bio seed usage (server.ts:2079–2081):**
```ts
} else if (hasStaffSMComment(animal)) {
    transcripts = animal.description;
    // ...
    generationSource = 'sm_generate';
```
When no caregiver data exists but the animal has a non-empty `description` (i.e. `ANIMALCOMMENTS`), it's used as the transcript input for `sm_generate` bio generation.

**sm_copy / fallback chain (server.ts:2637–2655):**
```ts
const smDescription = animal?.description || '';
// ...
} else if (smDescription) {
    bioEnLong = smDescription;
// ...
} else if (smDescription) {
    bioEnShort = truncateBio(smDescription, 200);
```
The `resolveBioText()` function (server.ts:2633) uses `animal.description` (= `ANIMALCOMMENTS`) as fallback when no approved bio exists.

**Guard function (server.ts:2539–2541):**
```ts
function hasStaffSMComment(animal: { description?: string } | null): boolean {
  return !!(animal && animal.description && animal.description.trim());
}
```

**Hypothesis confirmed:** The SM "Description" field (`ANIMALCOMMENTS`) is the bio source for both `sm_generate` (AI rewrites using it as seed) and `sm_copy` (direct passthrough fallback). [VERIFIED]

---

## 2. The Other Three Notes Fields — SM Column Mapping

| SM UI Field (Notes section) | SM API Column Name     | Stored locally? | Referenced in codebase? |
|-----------------------------|------------------------|-----------------|------------------------|
| Description                 | `ANIMALCOMMENTS`       | Yes (as `animal.description`) | Yes — bio seed, fallback, display |
| Markings                    | `MARKINGS`             | **No**          | **No** — not in any .ts file [VERIFIED] |
| Hidden Comments             | `HIDDENANIMALDETAILS`  | **No**          | **No** — not in any .ts file [VERIFIED] |
| Warning                     | `POPUPWARNING`         | **No**          | **No** — not in any .ts file [VERIFIED] |

All three fields (`MARKINGS`, `HIDDENANIMALDETAILS`, `POPUPWARNING`) are present in the SM API JSON response (confirmed via live API call) but are not consumed, stored, or exposed anywhere in the shelter app codebase. They arrive in the raw JSON due to the `[key: string]: unknown` index signature on `RawShelterAnimal` (types.ts:188) but `normalizeAnimal()` does not extract them.

**Note:** The user's hypothesis mentioned `ANIMALWARNING` — that field does not exist in SM's API. The actual column for the "Warning" field in SM's Notes section is `POPUPWARNING`. [VERIFIED via live API response — all 492 animals inspected for field names.]

---

## 3. Population Snapshot — Currently Adoptable Animals

**Scope:** Animals where `ADOPTABLE = 1` in the SM API response (the same filter used by `normalizeAnimal()` at shelterManagerService.ts:49 and the default `fetchAnimals()` cache at line 132). [VERIFIED]

**Total adoptable animals: 157** (98 cats, 40 dogs, 19 other)

| SM Field            | SM Column Name       | Populated Count | Total Adoptable | Percentage |
|---------------------|----------------------|----------------:|----------------:|-----------:|
| **Description**     | `ANIMALCOMMENTS`     | 34              | 157             | 21.7%      |
| **Markings**        | `MARKINGS`           | 7               | 157             | 4.5%       |
| **Hidden Comments** | `HIDDENANIMALDETAILS`| 0               | 157             | 0.0%       |
| **Warning**         | `POPUPWARNING`       | 0               | 157             | 0.0%       |

"Populated" = non-null and non-empty after trim.

For additional context, `HEALTHPROBLEMS` (a separate SM field not in the Notes section) is populated for 8/157 adoptable animals (5.1%).

### Markings Sample Content (first 3 of 7)
- Baki: "bully 3yrs friendly in his second home"
- Grace Kelly: "speckled belly"
- Jo March: "light brown on face, almost orangish"

The Markings data is physical-description text (appearance, coloring). The first example ("bully 3yrs friendly in his second home") appears to be staff shorthand entered in the wrong field.

---

## Conclusions

**(a) SM Bio Source:** Confirmed as `ANIMALCOMMENTS` (SM "Description" field). Used at shelterManagerService.ts:62 for mapping, server.ts:2079 for `sm_generate` seed, and server.ts:2637–2655 for `sm_copy` / fallback chain. [VERIFIED]

**(b) Fill Rates for the Three Additional Notes Fields:**
- **Markings** (`MARKINGS`): 4.5% — sparse, mostly physical descriptions
- **Hidden Comments** (`HIDDENANIMALDETAILS`): 0.0% — completely empty across all adoptable animals
- **Warning** (`POPUPWARNING`): 0.0% — completely empty across all adoptable animals
- **Reference: Description** (`ANIMALCOMMENTS`): 21.7% — already in use as bio seed

None of the three additional fields are currently stored or referenced in the shelter app codebase. Of the three, only Markings has any data at all, and at 4.5% fill rate (7 animals) it's minimal. Hidden Comments and Warning are entirely unused in SM for the current adoptable population.
