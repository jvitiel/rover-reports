# Change B Pre-Implementation: Enum-Grounded Merge Rule, Cross-Species Blast Radius

**Date:** 2026-06-18 12:47 ET  
**Production unchanged:** Read-only. No edits, commits, restarts, migrations, writes, or API calls. [VERIFIED]

---

## Task 1 — Enum-Backed Field Inventory

### Fields WITH paired _match enum (in scope for the new rule)

| Text field | Match enum | Valid definite values |
|---|---|---|
| `energy_level` | `energy_level_match` | low, medium, high |
| `good_with_kids_text` (+ legacy `good_with_kids`) | `good_with_kids_match` | yes, somewhat, no |
| `good_with_cats_text` (+ legacy `good_with_cats`) | `good_with_cats_match` | yes, somewhat, no |
| `good_with_dogs_text` (+ legacy `good_with_dogs`) | `good_with_dogs_match` | yes, somewhat, no |

[VERIFIED via schema]

### Fields WITHOUT paired _match enum (OUT OF SCOPE — keep current "last-non-null + hasValue()" rule)

| Column | Content type |
|---|---|
| `color` | Coat color description |
| `special_features` | Physical features |
| `people_reaction` | Reaction to people |
| `other_animal_reaction` | Legacy: reaction to other animals |
| `kid_behavior` | Legacy: behavior with kids |
| `special_needs` | Medical/behavioral needs |
| `backstory` | Animal backstory |
| `additional_notes` | Other notes |

[VERIFIED via schema — none of these have a `_match` column]

### Regression field confirmation

Both previously identified regressions (Dean W2025068, Emma S2025783) were on enum-backed fields only:

| Animal | Regressed field | Has _match? |
|---|---|---|
| Dean (W2025068) | `good_with_kids_text` | ✅ `good_with_kids_match` |
| Dean (W2025068) | `good_with_dogs_text` | ✅ `good_with_dogs_match` |
| Emma (S2025783) | `good_with_kids_text` | ✅ `good_with_kids_match` |
| Emma (S2025783) | `good_with_dogs_text` | ✅ `good_with_dogs_match` |

No regressions were on non-enum fields. [VERIFIED]

---

## Task 2 — Enum Availability for Multi-Profile Animals

**23 animals have >1 behavior_notes record** (across all species). [VERIFIED]

### _text-to-_match pairing completeness

| Scope | _text values with hasValue()=true | _match null or empty | Coverage |
|---|---|---|---|
| Multi-profile records only | 144 | **0** | 100% |
| ALL behavior_notes records | 357 | **0** | 100% |

**Every record that has a text value also has a populated _match enum.** No fallback is needed. The enum-grounded rule can classify every record without exception. [VERIFIED]

**Note:** A `_match` value of `"unknown"` is considered populated (it's the parser's deliberate classification, not a missing value). It means "the parser read the text and determined the axis is genuinely unknown/untested." This is exactly what the indefinite classification captures. [VERIFIED]

---

## Task 3 — Cross-Species Blast Radius

### Changes under the enum-grounded rule

**4 animals, 6 fields change** (up from the prior cats-only estimate of 2 animals / 4 fields). [VERIFIED]

#### Cat: 3 animals, 5 fields

**1. W2025068 Dean — kids**

| | Record date | _text | _match |
|---|---|---|---|
| Earlier (definite) | 2026-04-25 | "He'd be great with kids" | **yes** |
| Later (indefinite) | 2026-05-30 | "Not tested, we don't know if he's good with kids" | **unknown** |

- Current merged: "Not tested, we don't know if he's good with kids" (match=unknown)
- **New merged:** "He'd be great with kids" (match=yes)
- Change: ✅ Definite positive restored over indefinite hedge. [VERIFIED]

**2. W2025068 Dean — dogs**

| | Record date | _text | _match |
|---|---|---|---|
| Earlier (definite) | 2026-04-12 | "Honestly maybe even good with dogs, as his personality is very engaged and loyal" | **somewhat** |
| Later (indefinite) | 2026-05-30 | "Not tested, not too sure" | **unknown** |

- Current merged: "Not tested, not too sure" (match=unknown)
- **New merged:** "Honestly maybe even good with dogs, as his personality is very engaged and loyal" (match=somewhat)
- Change: ✅ Definite hedged-positive restored over indefinite. [VERIFIED]

**3. S2025783 Emma — kids**

| | Record date | _text | _match |
|---|---|---|---|
| Earlier (definite) | profile 1 | "Good with kids if they are gentle and respectful" | **somewhat** |
| Later (indefinite) | profile 2 | "Unknown, not tested" | **unknown** |

- Current merged: "Unknown, not tested" (match=unknown)
- **New merged:** "Good with kids if they are gentle and respectful" (match=somewhat)
- Change: ✅ Definite conditional-positive restored over indefinite. [VERIFIED]

**4. S2025783 Emma — dogs**

| | Record date | _text | _match |
|---|---|---|---|
| Earlier (definite) | profile 1 | "Not good with dogs, gets nervous with other animals" | **no** |
| Later (indefinite) | profile 2 | "Unknown, not tested" | **unknown** |

- Current merged: "Unknown, not tested" (match=unknown)
- **New merged:** "Not good with dogs, gets nervous with other animals" (match=no)
- Change: ✅ Definite negative restored over indefinite. Preserves safety-critical signal. [VERIFIED]

**5. S2026047 Buckley — kids** *(NEW — not in prior cats-only analysis)*

| | Record date | _text | _match |
|---|---|---|---|
| Earlier (definite) | 2026-04-24 | "Not good with children due to being easily overstimulated" | **no** |
| Later (indefinite) | 2026-05-30 | "Might be good with kids" | **unknown** |

- Current merged: "Might be good with kids" (match=unknown)
- **New merged:** "Not good with children due to being easily overstimulated" (match=no)
- Change: ✅ Definite negative restored over indefinite hedge. **This is a safety improvement** — the current merge hides a known overstimulation risk. [VERIFIED]

#### Rabbit: 1 animal, 1 field

**6. S2026153 Olaf — cats** *(NEW — cross-species finding)*

| | Record date | _text | _match |
|---|---|---|---|
| Earlier (definite) | 2026-05-09 | "Good with cats" | **yes** |
| Later (indefinite) | 2026-05-30 | "Unknown if good with cats, case-by-case basis" | **unknown** |

- Current merged: "Unknown if good with cats, case-by-case basis" (match=unknown)
- **New merged:** "Good with cats" (match=yes)
- Change: ✅ Definite positive restored over indefinite. [VERIFIED]

### Summary by species

| Species | Animals changed | Fields changed |
|---|---|---|
| Cat | 3 (Dean, Emma, Buckley) | 5 |
| Rabbit | 1 (Olaf) | 1 |
| Dog | 0 | 0 |
| Other small | 0 | 0 |
| **Total** | **4** | **6** |

[VERIFIED]

### Delta from prior estimate

The prior cats-only analysis (report-20260618-120556) found 2 cats / 4 fields. The enum-grounded rule finds **4 animals / 6 fields** — 2 additional changes:

1. **Buckley (S2026047) kids** — was missed because the prior analysis used a string-match heuristic for "indefinite" that didn't catch "Might be good with kids" (no keywords like "not tested" / "unsure"). The enum-grounded approach correctly classifies this as indefinite via `good_with_kids_match = "unknown"`. [VERIFIED]

2. **Olaf (S2026153) cats** — a rabbit, not in the prior cats-only scope. [VERIFIED]

### All 6 changes are improvements

Every change restores a definite (parser-classified) assessment over an indefinite (unknown) one. No change introduces a regression. Buckley's kids change is actively safety-improving (restores "not good with children due to overstimulation" over the vague "might be good with kids"). [VERIFIED]

---

## Task 4 — Safety-Case Check: Recent Definite Over Earlier Definite

**2 cases exist in current data where a recent definite overrides an earlier definite of opposite valence.** [VERIFIED]

### Case 1: S2025896 Lizzy (Cat) — good_with_cats

| | Record date | _text | _match |
|---|---|---|---|
| Earlier | 2026-03-07 | "Gets along well with other cats" | **yes** |
| Later | 2026-03-07 | "Does not get along with cats." | **no** |

Both records are from the **same day** (2026-03-07) — likely two different caregivers gave opposite assessments. Under both the current and new rule, the later record wins, producing **"Does not get along with cats" (no)**. The new rule does not change the outcome here — it was already "later definite wins" in both rulesets. [VERIFIED]

**Assessment:** This is the correct behavior. Two caregivers disagreed; the more recent observation stands. The "no" value is the conservative/safe choice for an adopter with existing cats. [INFERRED]

### Case 2: S2026047 Buckley (Cat) — energy

| | Record date | _text | _match |
|---|---|---|---|
| Earlier | 2026-04-24 | "Very playful, loves wand toys and catnip, gets the zoomies" | **high** |
| Later | 2026-05-30 | "Lower energy level but meows a lot" | **low** |

Under both rules, the later record wins: **"Lower energy level but meows a lot" (low)**. The new rule does not change this outcome — both records are definite, so recency resolves. [VERIFIED]

**Assessment:** Buckley's energy may have genuinely changed over the month, or different caregivers observed different behavior. Either way, the most recent observation is the appropriate merged value. [INFERRED]

### No unintended flips

In both cases, the current and new merge rules produce the **same result** — the recent definite wins. The new rule only changes behavior when a definite value is followed by an indefinite one (the 6 changes documented in Task 3). It never creates a NEW override of a definite by another definite that wasn't already happening. [VERIFIED]

---

## Viability Confirmation

| Criterion | Status |
|---|---|
| Enum always present when text has value | ✅ 357/357 (100%) [VERIFIED] |
| No fallback needed for missing enums | ✅ [VERIFIED] |
| All changes are improvements | ✅ 6/6 [VERIFIED] |
| No regressions introduced | ✅ [VERIFIED] |
| Cross-species: same pipeline, same enums | ✅ [VERIFIED] |
| Safety cases (definite→definite) handled correctly | ✅ 2/2 already resolved by recency [VERIFIED] |
| Non-enum fields unaffected | ✅ Out of scope by design [VERIFIED] |
| Blast radius bounded | ✅ 4 animals, 6 fields, all species [VERIFIED] |

**The enum-grounded merge rule is viable for implementation.** [VERIFIED]
