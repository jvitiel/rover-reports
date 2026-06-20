# Phase-2 Omission-Check Controls — Build & Gate Results

**Date:** 2026-06-20 10:05 UTC  
**Type:** TEST TOOLING BUILD + GATE RUN (read-only, no production changes, no commits)  
**Tooling location:** `/home/rover/rover/omission-check.mjs`

---

## GATE RESULT: ✅ PASSED

**Control B (extraction recall gate): 8/8 PASSED** — all 6 positive extractions succeeded, both negation checks clean. [VERIFIED]  
**Control A (bio-side mutation): 5/5 PASSED** — every mutated bio correctly flagged the missing fact. [VERIFIED]

The extractor catches all hard phrasings from the data map, including implicit "only pet" (Cookie), barn-cat placement from ANIMALCOMMENTS (Blizzard), corrupted-name bonded pair (Edna), and prey drive (Ava). No false positives on negated aggression (Carlo Gambino, Clover). The omission checker is ready for the representative pass.

---

## Control B — Record-Side Extraction Recall (per-phrasing)

| # | Animal | Phrasing | Expected | Result | Matched Phrase |
|---|--------|----------|----------|--------|----------------|
| 1 | Cookie (A2023267) | "she is the only pet, she loves to be the star" | Only-pet | ✅ EXTRACTED | `"only pet"` |
| 2 | Ava (R2024018) | "cannot be around other animals due to prey drive" | Prey-drive | ✅ EXTRACTED | `"Cannot be around other animals"` |
| 3 | Blizzard (S20251236) | ANIMALCOMMENTS: "Not meant to be a household pet, great barn cat" | Placement-type | ✅ EXTRACTED | `"Not meant to be a household pet"` |
| 4 | Edna (S20251008) | "Bonded to eight, should go together" | Bonded-pair | ✅ EXTRACTED | `"Bonded to eight, should go together"` |
| 5 | Starr (S20241035) | "prefers to be only cat, does not like other cats" | Only-pet + Not-good-with-cats | ✅ BOTH EXTRACTED | `"only cat"` + enum match |
| 6 | Buckley (S2026047) | "not good with children due to easily overstimulated" | Not-good-with-kids + Overstimulated | ✅ BOTH EXTRACTED | enum match + `"easily overstimulated"` |
| 7 | Carlo Gambino (W2026014) | "is not an aggressive boy at all" | NO aggression caveat | ✅ CLEAN | No false positive |
| 8 | Clover (A2026061) | "slightest hint of aggression... never seen" | NO aggression caveat | ✅ CLEAN | No false positive |

[VERIFIED — all run against live fetchAnimals() + getBehaviorRecords() data]

### Full fact sets extracted (for audit):
- **Cookie:** FIV-untested, FeLV-untested, On-medication, Only-pet, Experienced-handler
- **Ava:** FIV-untested, FeLV-untested, On-medication, Not-good-with-cats, Not-good-with-dogs, Chronic-condition-or-meds, Special-diet, Medication-routine, Only-pet, Prey-drive
- **Blizzard:** FIV-untested, FeLV-untested, Placement-type
- **Edna:** Chronic-condition-or-meds, Bonded-pair
- **Starr:** Not-good-with-cats, Not-good-with-dogs, Not-good-with-kids, Only-pet, Shy-needs-time
- **Buckley:** Cautious-with-cats, Not-good-with-kids, Shy-needs-time, Overstimulated
- **Carlo Gambino:** FIV-positive, Shy-needs-time (correct — no aggression)
- **Clover:** FIV-untested, FeLV-untested, Cautious-with-kids (correct — no aggression)

---

## Control A — Bio-Side Mutation (per-case)

| Animal | Fact Removed | Intact → Present? | Mutated → Present? | Result |
|--------|-------------|-------------------|-------------------|--------|
| Dante (S20241099) | FIV-positive | true ✅ | false ✅ | ✅ PASS |
| Ava (R2024018) | Prey-drive | true ✅ | false ✅ | ✅ PASS |
| Abe (S2025966) | Chronic-condition-or-meds | true ✅ | false ✅ | ✅ PASS |
| Starr (S20241035) | Not-good-with-kids | true ✅ | false ✅ | ✅ PASS |
| Blizzard (S20251236) | Placement-type | true ✅ | false ✅ | ✅ PASS |

[VERIFIED — synthetic bios built from real record data, mutation removes fact-specific text]

### Initial failures and fixes (documented for transparency):
- **Ava (Prey-drive):** Initial failure — prey-drive checker regex included `only\s+(?:pet|dog)` which overlapped with the Only-pet fact's sentence in the same bio. Fix: removed `only pet/dog` from prey-drive checker (it belongs to the Only-pet checker's domain).
- **Abe (Chronic-condition-or-meds):** Initial failure — synthetic bio used generic fallback "has a medical condition" when the actual condition (diabetes) was in ANIMALCOMMENTS, not `specialNeeds`. The mutation removed "diabetes/insulin" but the generic text still matched. Fix: (a) checker now requires a specific condition name, not generic "medical/condition"; (b) synthetic bio builder now uses the actual matched phrase from extraction.

Both fixes applied, both controls re-run, all pass. Control B also re-verified after changes — still 8/8. [VERIFIED]

---

## Tooling Architecture

### File: `/home/rover/rover/omission-check.mjs`

**`extractFacts(animal, merged, records)`** — Returns array of `{category, fact, source, sourceField, matchedPhrase}`:
- FIELD facts (mechanical): FIV/FeLV status, On-Meds flag, goodWith*_match enums, energyLevel_match
- TEXT facts (prose extraction): 11 pattern families covering chronic conditions, special diet, medication routine, only-pet (incl. implicit), flight risk, prey drive, bonded pair, shy/needs-time, overstimulated, placement type, experienced handler
- Sources read: `fivStatus`, `felvStatus`, `additionalFlags`, `description` (ANIMALCOMMENTS), and behavior_notes fields (`specialNeeds`, `additionalNotes`, `backstory`, `peopleReaction`, `goodWithCats_text`, `goodWithDogs_text`, `goodWithKids_text`)

**`checkOmissions(facts, bioText)`** — Returns array of `{...fact, present, evidence}`:
- Per-fact regex matching against the bio text
- Concept-level matching (e.g., "adults only" satisfies Not-good-with-kids)
- FeLV-untested default-passes (105/177 animals — too common to be a distinguishing caveat)

**CLI:**
```bash
node omission-check.mjs control-b    # Run extraction recall gate
node omission-check.mjs control-a    # Run bio-side mutation test  
node omission-check.mjs extract <code>  # Dump facts for one animal
```

### Design decisions:
1. **FeLV-untested default pass:** 105/177 animals are FeLV-untested. Requiring explicit "FeLV not tested" in every bio would produce noise, not signal. The checker passes this by default.
2. **Bite History handling:** Per operator decision, Bite History flag (Ava, Cookie) is NOT checked as a fact to surface. The checker verifies the HANDLING NEED (only-pet, only-dog, experienced-home) instead.
3. **Bonded-pair keyed on "bonded" alone:** Partner name resolution is not required (Edna's partner name is corrupted as "eight" in voice transcription). The word "bonded" plus context ("together", "pair", or "bonded to <name>") is sufficient.
4. **Negation awareness:** The extractor does not have explicit negation detection — it relies on the patterns being specific enough that negated phrasings don't match. Confirmed clean on "is not an aggressive boy at all" and "never seen... aggression."

---

## Next Step

**GATE PASSED.** The representative omission pass can proceed — the extractor catches all hard phrasings from the data map, and the checker correctly flags missing facts in mutated bios. The tooling is in `/home/rover/rover/omission-check.mjs`, exported as ES modules for the representative pass to import.
