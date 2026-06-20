# Diagnosis: Hard Filter Source Fields — SM-Only Confirmation

**Read-only diagnosis. No changes, no commits.**

---

## LEAD

**CONFIRMED: Code hard-checks only base SM fields. All temperament/compatibility/soft data comes from transcripts and is model-judged, never code-filtered against.**

One exception to note (not a refutation): `adoption_pending` exclusion at pool construction comes from `animal_metadata` (local bridge table, not SM), but this is a binary pool EXCLUSION, not a hard-attribute match. It removes animals from the pool entirely before any filtering starts. [VERIFIED]

---

## 1. HARD FILTER FIELDS (hardFilter.ts)

Six attributes filtered. Every one is a base SM structured field.

| Filter | Animal Field | SM Source Field | Code Check | Tag |
|--------|-------------|-----------------|------------|-----|
| **sex** | `animal.sex` | `SEXNAME` | Exact match (lowercased) against form selection | [VERIFIED] |
| **age** | `animal.ageInYears` | Derived: `calculateAgeInYears(DATEOFBIRTH)` → bucketed by `deriveAgeGroup()` | Bucket match against form selection (young/adult/senior) | [VERIFIED] |
| **color** | `animal.color` | `BASECOLOURNAME` | Substring match (lowercased) against intent color array | [VERIFIED] |
| **size** | `animal.size` | `normalizeSize(SIZENAME)` | Exact match (lowercased) against intent size array | [VERIFIED] |
| **breed** | `animal.breed` | `BREEDNAME` | Substring match (lowercased) against intent breed array | [VERIFIED] |
| **coat** | `animal.breed` (inferred) | `BREEDNAME` (parsed: "Domestic Short Hair" → "short") | Regex extraction of hair length from breed string, then match | [VERIFIED] |

**Derivations:**
- `ageInYears`: computed from `DATEOFBIRTH` via `calculateAgeInYears()` in shelterManagerService.ts. This is a numeric derivation from a base SM date field, not model-derived. [VERIFIED]
- `size`: `normalizeSize(SIZENAME)` — direct normalization of SM's SIZENAME field. [VERIFIED]
- `coat`: extracted from `BREEDNAME` via regex `/\b(short|medium|long)\s*hair/i` — no separate SM coat field exists; coat info is embedded in the SM breed string (e.g., "Domestic Short Hair"). [VERIFIED]

**Confirmed: hardFilter.ts touches ONLY base SM structured fields.** No behavior notes, no compatibility data, no transcript-derived data. [VERIFIED]

---

## 2. COMPATIBILITY/TEMPERAMENT FIELDS

### Fields that exist on the animal object

The `Animal` interface has a `behaviorNotes?: BehaviorNotes` field, and `BehaviorNotes` contains:

| Field | Type | Source |
|-------|------|--------|
| `goodWithCats_text` / `goodWithCats_match` | string / CompatibilityMatch | **Caregiver profiler app** (voice recording → model transcription → saved to `behavior_notes` table in shelter.db) |
| `goodWithDogs_text` / `goodWithDogs_match` | string / CompatibilityMatch | Same — caregiver profiler |
| `goodWithKids_text` / `goodWithKids_match` | string / CompatibilityMatch | Same — caregiver profiler |
| `energyLevel` / `energyLevel_match` | string / EnergyLevelMatch | Same — caregiver profiler |
| `peopleReaction` | string | Same — caregiver profiler |
| `specialNeeds` | string | Same — caregiver profiler |
| `rawTranscript` | string | Same — caregiver profiler |

**Population source:** ALL from `behavior_notes` table in shelter.db, populated by the caregiver profiler app (voice recordings transcribed by model, structured by model, saved via `/api/caregiver/save`). NOT from SM. NOT from any SM API field. [VERIFIED — traced through `getBehaviorRecords()` → SQL query against `behavior_notes` table]

### How they're used in the matcher

1. **Phase-1 (ranking):** `buildTraitSummary()` in `customSearchSummary.ts` reads `behaviorNotes` and produces a TEXT LINE like `"Documented — energy/playfulness: calm; with kids: great; with cats: unknown; with dogs: not tested."` This text is included in the candidate list sent to the Phase-1 LLM for ranking. The LLM judges soft-term fit based on this text. NO code filtering. [VERIFIED]

2. **Phase-2 (bio writing):** `getBehaviorRecords()` retrieves the last 3 caregiver transcripts, which are formatted as text in the shortlist entries sent to Phase-2. The model reads these transcripts and uses them to write bios. NO code filtering. [VERIFIED]

3. **Dashboard API (`/api/animals/:id`):** Lines 2789-2792 read `goodWithCats_match`, `goodWithDogs_match`, `goodWithKids_match`, `energyLevel_match` for display in the staff dashboard UI. This is a DISPLAY endpoint, not part of the matcher path. [VERIFIED]

### Code filtering against compatibility fields

**NONE.** No code path in the matcher (hardFilter.ts, customSearchSelect.ts, intentExtractor.ts, or the matcher section of server.ts) checks, filters, or matches against any compatibility or temperament field. These fields are exclusively passed as text for model judgment. [VERIFIED — grep for `goodWith`, `energyLevel`, `compatibility`, `behaviorNotes` across all 4 matcher files returns only the text-formatting usage in customSearchSelect.ts]

---

## 3. ANY NON-SM FIELD CODE-CHECKED?

Scanned all code paths in the matcher flow (server.ts:4480-5650). Two non-SM data sources are code-checked:

| Source | Field | Check Type | SM? | Purpose |
|--------|-------|-----------|-----|---------|
| `animal_metadata` (local bridge table) | `adoption_pending` | Binary pool exclusion (line 4505-4511) | **NO — local DB** | Remove adoption-pending animals before any filtering |
| SM (via `fetchAnimals()`) | `fivStatus`, `felvStatus` | Post-generation bio validation (Floor C, line 5518-5519) | **YES — derived from SM's COMBITESTED/COMBITESTRESULT/FLVRESULT** | Verify bio mentions FIV+/FeLV+ status |

**Assessment:**
- `adoption_pending` is the ONE non-SM field the code acts on. It's a pool exclusion, not a hard-filter attribute match. The `animal_metadata` table is a local bridge table maintained by the shelter app (not synced from SM). [VERIFIED]
- Floor C's `fivStatus`/`felvStatus` check IS SM-sourced (derived from SM's COMBITESTED/COMBITESTRESULT/FLVRESULT), and it's a POST-generation validation, not a filter. [VERIFIED]

**No structured field derived by a model from a transcript is code-checked anywhere in the matcher.** [VERIFIED]

---

## SUMMARY

> "Code hard-checks only base SM fields; all temperament/compatibility/soft data comes from transcripts and is model-judged, never hard-coded against."

**CONFIRMED.** [VERIFIED]

With one caveat: `adoption_pending` (local bridge table, not SM, not model-derived) is used for binary pool exclusion. This is not a hard-filter attribute match and not model-derived — it's a manual staff flag stored in the local `animal_metadata` table.
