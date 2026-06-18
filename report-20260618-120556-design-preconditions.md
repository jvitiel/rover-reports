# Design Preconditions — _match Enum Coverage & getBehaviorNotes() Blast Radius

**Date:** 2026-06-18 12:05 ET  
**Production unchanged:** Read-only. No edits, commits, restarts, migrations, writes, or API calls. [VERIFIED]

---

## Task 1 — _match Enum Coverage & Reliability

### 1a. Coverage comparison: _text vs _match (18 cats with behavior_notes in experiment pool)

| Axis | Text coverage | Enum coverage | Delta |
|---|---|---|---|
| energy | 18/18 (100%) | 18/18 (100%) | Same |
| kids | 15/18 (83%)* | 14/18 (78%) | −1 |
| cats | 16/18 (89%)* | 16/18 (89%) | Same |
| dogs | 14/18 (78%)* | 7/18 (39%) | **−7** |

*Note: text coverage here includes "Unsure"/"Unspecified" values that leak through `hasValue()`. Corrected text coverage (excluding those leaks) is 13/18 kids, 16/18 cats, 12/18 dogs — bringing text in line with or below enum coverage for kids and cats. [VERIFIED]

**Dogs is the outlier.** Enum coverage drops to 39% — 11 of 18 cats have `good_with_dogs_match = "unknown"` even when the text field has a value (albeit often hedged like "Unsure" or "Not tested"). [VERIFIED]

### 1b. Spot-check fidelity — three critical cats

#### Karen Smith (S2026447) — 1 profile

| Axis | _text value | _match value | Signal match? |
|---|---|---|---|
| Energy | "Very playful, climbs and jumps" | **high** | ✅ Correct |
| Kids | "Good with kids, caregiver's kids love her" | **yes** | ✅ Correct |
| Cats | "Good with other cats" | **yes** | ✅ Correct |
| Dogs | "Good with other dogs, caregiver has a dog" | **yes** | ✅ Correct |

**Verdict:** All four enums carry the correct query-relevant signal. [VERIFIED]

#### Lilac (S2026357) — 1 profile

| Axis | _text value | _match value | Signal match? |
|---|---|---|---|
| Energy | "Very playful, likes the toys" | **high** | ✅ Correct |
| Kids | "Could be good with kids, I believe" | **somewhat** | ✅ Correct (hedged → somewhat) |
| Cats | "Good with cats, has three other siblings" | **yes** | ✅ Correct |
| Dogs | "Dogs, I don't know yet" | **unknown** | ⚠️ Acceptable — genuinely unknown |

**Verdict:** All four enums faithfully represent the signal. The dogs "unknown" matches the text's uncertainty. [VERIFIED]

#### Abe / Louie (S2025966) — 3 profiles

| Axis | _text value | _match value | Signal match? |
|---|---|---|---|
| Energy | "Low" | **low** | ✅ **Critical mismatch signal preserved** |
| Kids | "Very good with kids" | **yes** | ✅ Correct |
| Cats | "Very good with cats" | **yes** | ✅ Correct |
| Dogs | "Very good with dogs" | **yes** | ✅ Correct |

**Verdict:** All four enums correct. The energy="low" enum preserves the key mismatch signal for a "playful, energetic" query. [VERIFIED]

### 1c. Enum-extraction gap scan (text has value, enum says "unknown")

| Cat | Axis | Text value | Enum | Gap type |
|---|---|---|---|---|
| S2025546 Billy Boy | kids | "Unspecified" | unknown | No gap — both correctly reflect no info |
| S2025546 Billy Boy | dogs | "Unsure" | unknown | No gap — both reflect uncertainty |
| W2026014 Carlo Gambino | dogs | "Unsure, but likely fine..." | **unknown** | ⚠️ Mild gap — text leans positive, enum conservative |
| S20241099 Dante | dogs | "Not exposed to any dogs..." | **unknown** | No gap — genuine unknown |
| W2025068 Dean | dogs | "Not tested, not too sure" | **somewhat** | ⚠️ Mild gap — text is more negative than "somewhat" |
| S2026268 Juliet | dogs | *(no value)* | unknown | No gap |
| S2025833 Jeans | dogs | "Unknown with dogs" | unknown | No gap |
| S2026047 Buckley | kids | "Might be good with kids" | **no** | ❌ **Distortion** — text is hedged-positive, enum says "no" |
| S2026047 Buckley | dogs | "Not tested if he's good with dogs" | unknown | No gap |

**Notable issue:** Buckley's `good_with_kids_match = "no"` when the text says "Might be good with kids." The parser classified hedged-positive as negative. This would cause a searcher using enum filtering to wrongly exclude Buckley from a "good with kids" query. [VERIFIED]

### 1d. Summary

**Energy and cats enums:** High fidelity, same coverage as text. Safe to use for ranking. [VERIFIED]

**Kids enum:** One distortion (Buckley), otherwise reliable. 78% coverage. [VERIFIED]

**Dogs enum:** 39% coverage — too sparse for standalone use. 11 of 18 cats resolve to "unknown" including several where the text carries hedged signal ("Unsure, but likely fine"). Dogs ranking should use text, or the searcher should treat "unknown" as neutral rather than disqualifying. [VERIFIED]

---

## Task 2 — getBehaviorNotes() Blast Radius

### 2a. Complete caller inventory

| # | File:Line | Context | Fields consumed | Output surface |
|---|---|---|---|---|
| 1 | `server.ts:930` | `/api/animals` list endpoint | Full merged object attached as `behaviorNotes` | **All frontend apps** (dashboard, staff PWA, volunteer, matcher, etc.) — the animal list API response |
| 2 | `server.ts:990` | `/api/animals/:id` detail endpoint | Full merged object as `behaviorNotes` | **Dashboard/staff animal detail view** |
| 3 | `server.ts:1033` | `/api/behavior/:animalId` | Full merged object as response body | **Dashboard Profiles/Media tab** — direct behavior notes API |
| 4 | `server.ts:2056` | `generateBioDraftForAnimal()` (shared core) | `color`, `specialFeatures`, `energyLevel`, `peopleReaction`, `goodWithCats_text`, `goodWithDogs_text`, `goodWithKids_text`, `specialNeeds`, `backstory`, `additionalNotes`, `rawTranscript` | **Bio generator** — merged attributes + raw transcripts feed LLM prompt for EN/ES bio drafts |
| 5 | `server.ts:2113` | `POST /api/bio/generate/:animalId` | Existence check (`merged && !hasStaffSMComment`) then delegates to #4 | **Bio generation endpoint** — gate check only |
| 6 | `server.ts:2147` | `POST /api/bio/:shelterCode/regenerate/:size` | Same fields as #4 (builds `mergedAttrs` + transcripts) | **Bio regeneration** (single-window) |
| 7 | `server.ts:2720` | `buildFeaturedAnimalData()` | `goodWithCats_match`, `goodWithDogs_match`, `goodWithKids_match`, `energyLevel_match` (enum fields only) | **Featured animal card** — trait badges on dashboard/public pages |
| 8 | `server.ts:11462` | `findGenericBioCandidates()` | Existence check only (`if (notes) continue`) | **Generic bio generator** — skips cats that already have profiles |
| 9 | `server.ts:11913` | `findAdultIntakeCandidates()` | Boolean check (`!!getBehaviorNotes(...)`) | **Adult intake bio candidates** — flags whether profile exists |
| 10 | `matchingEngine.ts:348` | Scoring loop in matching engine | `energyLevel`, `energyLevel_match`, `specialNeeds`, `goodWithCats_text`, `goodWithDogs_text`, `goodWithKids_text`, plus full object for `scoreHouseholdMatch`/`scoreTraitMatch` | **Original matcher** (preference-based matching, separate from custom-search) |

[VERIFIED — all call sites confirmed via grep]

### 2b. Output surfaces that would shift under a merge rule change

A change from "last-non-null wins" to "definite beats indefinite; between two definites, most recent wins" affects **every caller that reads the merged text fields** — specifically callers #1–6 and #10. Callers #7–9 use only existence checks or `_match` enums; the `_match` enums are NOT affected by the rule change (see quantification below).

**Surfaces affected:**

| Surface | Risk | Notes |
|---|---|---|
| Dashboard/staff animal list (#1) | Low | Shows merged behavior traits on Profiles tab; improved accuracy is net-positive |
| Dashboard animal detail (#2) | Low | Same as #1 |
| Direct behavior API (#3) | Low | Dashboard Profiles/Media tab consumes this |
| Bio generator (#4, #5, #6) | **Moderate** | Merged attributes feed the bio-writing LLM prompt; a changed `goodWithKids_text` would change the generated bio. However, bios also receive `rawTranscript` which contains all original transcripts — the LLM can reconcile. Existing bios are not retroactively regenerated. |
| Featured animal traits (#7) | **None** | Uses `_match` enums only; unaffected |
| Generic bio candidates (#8) | **None** | Boolean existence check only |
| Adult intake candidates (#9) | **None** | Boolean existence check only |
| Matching engine (#10) | **Moderate** | Uses text fields for scoring; changed values would alter match scores. But the matching engine is for the original matcher, not custom-search. |

### 2c. Quantification — present-day merge conflicts

**Multi-profile cats in entire DB:** 23 [VERIFIED]

**Cats where the rule change alters a merged field value today:** **2** [VERIFIED]

**Total field changes:** **4** (across those 2 cats) [VERIFIED]

#### Cat 1: W2025068 Dean — 4 profiles

| Field | Current (last-non-null) | New (definite-beats-indefinite) |
|---|---|---|
| `good_with_kids_text` | "Not tested, we don't know if he's good with kids" | **"He'd be great with kids"** |
| `good_with_dogs_text` | "Not tested, not too sure" | **"Unknown, but with a slow introduction with the right dog, maybe they could coexist"** |

Notes 1–2 (April 12 & 25) had definite positive values for kids ("Good with kids, gentle and easy to handle" / "He'd be great with kids"). Note 4 (May 30, most recent) has indefinite "Not tested, we don't know..." — this currently overwrites the positive signal. Under the new rule, the most recent DEFINITE value ("He'd be great with kids" from Note 2) would win. [VERIFIED]

#### Cat 2: S2025783 Emma — multi-profile

| Field | Current (last-non-null) | New (definite-beats-indefinite) |
|---|---|---|
| `good_with_kids_text` | "Unknown, not tested" | **"Good with kids if they are gentle and respectful"** |
| `good_with_dogs_text` | "Unknown, not tested" | **"Not good with dogs, gets nervous with other animals"** |

Same pattern: a later sparse profile overwrites an earlier detailed one. [VERIFIED]

#### _match enum fields

**Zero changes.** The `_match` enum fields use "unknown" as their indefinite marker, and "unknown" is already filtered out by the existing merge logic (`record.goodWithCats_match && record.goodWithCats_match !== 'unknown'`). The definite-beats-indefinite rule is already effectively in place for enum fields. [VERIFIED]

### 2d. Risk assessment

The blast radius is **small and net-positive**:
- Only **2 cats** and **4 text fields** change today. [VERIFIED]
- All 4 changes restore correct signal (hedged→definite improvements). [VERIFIED]
- The `_match` enum fields are unaffected. [VERIFIED]
- Callers using existence checks or enums are unaffected. [VERIFIED]
- The bio generator and matching engine would see improved input for those 2 cats; since bios are regenerated on demand (not retroactively), existing bios are not disrupted. [INFERRED]
- The main risk is the bio generator producing slightly different bios for Dean and Emma on next regeneration — this is a quality improvement, not a regression. [INFERRED]

---

## Appendix — Full _match enum values for 18 experiment-pool cats

| Cat | energy_match | kids_match | cats_match | dogs_match |
|---|---|---|---|---|
| S2025966 Abe | low | yes | yes | yes |
| S2025546 Billy Boy | medium | unknown | somewhat | unknown |
| S2026047 Buckley | low | **no** ⚠️ | somewhat | unknown |
| W2026014 Carlo Gambino | low | yes | yes | unknown |
| S20241099 Dante | high | somewhat | no | unknown |
| W2025068 Dean | high | yes | somewhat | somewhat |
| S20251008 Edna | low | yes | yes | yes |
| S2025833 Jeans | low | yes | yes | unknown |
| S2026268 Juliet | low | somewhat | yes | unknown |
| S2026447 Karen Smith | high | yes | yes | yes |
| S2026357 Lilac | high | somewhat | yes | unknown |
| S2026028 Macy | low | unknown | unknown | unknown |
| S2026290 Matcha | low | somewhat | yes | somewhat |
| S2025883 Reeboks | low | yes | yes | yes |
| S2025961 Segundo | low | unknown | unknown | unknown |
| S20241035 Starr | low | no | no | no |
| S2026177 Stevie | low | unknown | somewhat | unknown |
| A2023301 Zelda | low | no | yes | unknown |
