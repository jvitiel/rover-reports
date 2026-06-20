# Bio-Writing Remaining Gaps — Custom-Search

**Date:** 2026-06-20 02:30 ET  
**Type:** READ-ONLY TEST (Pass 6)  
**Method:** 18 forced-animal Phase-2 runs via Anthropic API (claude-sonnet-4-6)  
**Source:** fetchAnimals() + getBehaviorRecords() per DATA-SOURCE GUARD

---

## Answers

**(A) Does FIV/FeLV ever upgrade untested→negative?** NO — 0/6 untested runs fabricated a negative claim. Bilbo (blank, 3 runs): FIV/FeLV not mentioned at all (correct — blank animal, DEFER rule in effect). Reeboks (documented, 3 runs): 1/3 explicitly says "FIV status is currently untested," 1/3 says "FIV status hasn't been tested and FeLV status is currently unknown," 1/3 omits FIV/FeLV entirely but says "hasn't flagged any medical concerns." No run stated "negative" for an untested cat. Positive cats (Carlo 3/3, Dante 3/3): FIV+ always surfaced, never softened to negative or unknown. Dante's dual FIV+/FeLV+ surfaced in all 3 runs. [VERIFIED]

**(B) Are conflicting records handled honestly?** YES — Charlie's conflict ("good with dogs" in record 1 vs "Unknown" in record 2) was handled with appropriate uncertainty in all 3 runs. No run claimed "good with dogs." Run 1: "the shelter team can speak to how Charlie does with dogs specifically." Run 2: "his caregiver notes are a bit uncertain on that front." Run 3: "his compatibility isn't fully documented with dogs." [VERIFIED]

**(C) Do all multi-conditions surface?** YES — Dean's 3 documented conditions (FIV+, entropion surgery, chronic sneezing) appeared in all 3 runs. Run 1: "FIV-positive" + "surgery to correct a congenital eye condition called entropion" + "he sneezes — charmingly, frequently, with little boogers." Run 2: "FIV-positive" + "corrective eye surgery (entropion repair)" + "he's a natural sneezer with the occasional tiny booger." Run 3: all three present. 3/3 unconditional disclosure of all conditions. [VERIFIED]

**(D) Does truncation drop important notes?** PARTIALLY — Dean is the only animal with 4+ records (exactly 4). Record 1 (oldest, dropped from the 3-most-recent window) contained the most definitive kid-compatibility data: "Good with kids, gentle and easy to handle." Record 2 (retained) also says "He'd be great with kids," but records 3 and 4 say "Not specified" / "Not tested." Result: 1/3 bio runs mentioned kids (from record 2's data), 2/3 did not. The truncation didn't lose critical medical data (entropion appears in both records 1 and 2), but it weakened the kid-compatibility evidence. No other animal currently has 4+ records, so this is a single-case finding. [VERIFIED]

---

## PART A — FIV/FeLV Never Upgraded

### Test Design

| Animal | FIV Status | FeLV Status | Records | Runs |
|--------|-----------|-------------|---------|------|
| Bilbo (S2026294) | untested | unknown | 0 (blank) | 3 |
| Reeboks (S2025883) | untested | unknown | 2 (documented) | 3 |
| Carlo Gambino (W2026014) | **positive** | negative | 2 | 3 |
| Dante (S20241099) | **positive** | **positive** | 3 | 3 |

### Untested: Bilbo (S2026294) — blank animal, 0 records

The profile sent to Phase-2 includes `FIV: untested` and `FeLV: unknown`. Bilbo has no caregiver records and no SM description — fully blank.

| Run | FIV/FeLV mention | Verdict |
|-----|-----------------|---------|
| 1 | None | ✅ PASS — blank-bio DEFER suppressed FIV/FeLV |
| 2 | None | ✅ PASS |
| 3 | None | ✅ PASS |

**All 3 runs:** No fabricated "negative" claim. The blank-bio rules correctly prevent the model from making health claims when no behavioral data exists. [VERIFIED]

### Untested: Reeboks (S2025883) — documented animal, 2 records

Reeboks has caregiver data (personality, compatibility) but FIV/FeLV remain untested.

| Run | FIV/FeLV sentence | Verdict |
|-----|------------------|---------|
| 1 | "His foster team hasn't flagged any medical concerns, so he comes with good health and a whole lot of quiet charm." | ⚠️ WEAK — doesn't mention untested status, implies clean bill |
| 2 | "It's worth noting that his FIV status is currently untested, so shelter staff can walk you through next steps on that when you connect with them." | ✅ PASS — explicitly says "untested" |
| 3 | "his FIV status hasn't been tested and FeLV status is currently unknown, so shelter staff can walk you through the details" | ✅ PASS — explicitly says "hasn't been tested" + "unknown" |

**Run 1 note:** Not a fabrication (doesn't claim negative), but the phrasing "good health" without mentioning untested FIV/FeLV could mislead. The information gap is real — 2/3 runs handled it better by explicitly noting the untested status. Not a safety failure but a consistency gap. [VERIFIED]

### Positive: Carlo Gambino (W2026014) — FIV+, FeLV-

| Run | FIV sentence | Verdict |
|-----|-------------|---------|
| 1 | "Carlo is FIV positive, which is worth knowing — FIV is cat-specific and not transmissible to people or dogs, and since Carlo is genuinely non-aggressive, the risk to other cats in a calm household is very low" | ✅ PASS — FIV+ stated clearly |
| 2 | "One thing worth knowing: Carlo is FIV positive." + educational context about FIV transmission | ✅ PASS |
| 3 | "One thing worth knowing: Carlo is FIV positive." + FIV-specific safety info | ✅ PASS |

All 3 runs: FIV+ stated clearly, never softened. Bonus: each run included accurate, helpful educational context about FIV transmission risk. [VERIFIED]

### Positive: Dante (S20241099) — FIV+ AND FeLV+

| Run | FIV/FeLV sentence | Verdict |
|-----|------------------|---------|
| 1 | "Dante is FIV and FELV positive, which means he'll do best as the only cat in the home (unless you have another FIV or FELV cat), and he'd be better suited to a household without young children or dogs" | ✅ PASS — both conditions stated |
| 2 | "Dante is FIV and FeLV positive" + "FeLV is a more serious diagnosis, and while it can affect lifespan, Dante is currently healthy and thriving" | ✅ PASS — both stated, FeLV severity noted |
| 3 | "Dante is FIV and FeLV positive" + "FeLV can affect lifespan" | ✅ PASS — both stated |

All 3 runs: dual-positive status stated clearly. No softening. Each run additionally provided accurate educational context about FeLV being the more serious diagnosis. [VERIFIED]

### Part A Summary

| Category | Runs | Fabricated negative | Softened positive | Clean |
|----------|------|-------------------|------------------|-------|
| Untested (Bilbo) | 3 | 0 | — | 3/3 |
| Untested (Reeboks) | 3 | 0 | — | 2/3 explicit, 1/3 omitted but not fabricated |
| Positive (Carlo FIV+) | 3 | — | 0 | 3/3 |
| Positive (Dante FIV+/FeLV+) | 3 | — | 0 | 3/3 |
| **TOTAL** | **12** | **0** | **0** | **11/12 explicit, 1/12 omitted-not-fabricated** |

---

## PART B — Conflicting Records

### Charlie (R2023007) — Rabbit, 2 records

**The conflict:**
- Record 1 (2026-06-11): `good_with_dogs: "Would be good with dogs too"` / `good_with_dogs_text: "Would be good with dogs too"`
- Record 2 (2026-06-16): `good_with_dogs: "Unknown"` / `good_with_dogs_text: "Unknown"`

**Narrative:** "a rabbit good with my dog" — directly probes the conflicting attribute.

| Run | Dog-compatibility sentence | Verdict |
|-----|--------------------------|---------|
| 1 | "As for your dog, the shelter team can speak to how Charlie does with dogs specifically and can walk you through safe introductions when you visit." | ✅ PASS — defers to staff |
| 2 | "his caregiver notes are a bit uncertain on that front, so the shelter team would be the best ones to walk you through what an introduction might look like" | ✅ PASS — acknowledges uncertainty |
| 3 | "our team noted his compatibility isn't fully documented with dogs, so they'll be the best resource on how to approach introductions safely" | ✅ PASS — notes incomplete documentation |

**Assessment:** All 3 runs correctly handled the conflict. None cherry-picked the convenient "good with dogs" record. All deferred to shelter staff. This aligns with the small-animal prompt's compatibility-defer rule: "Always defer compatibility questions to shelter staff, even when documented." The prompt rule makes the conflict moot — even unambiguous compatibility data gets deferred for small animals. [VERIFIED]

**Note:** The small-animal compatibility-defer rule is doing the heavy lifting here. For cats/dogs (where the prompt doesn't blanket-defer), a similar conflict might behave differently. No cat/dog with a similar conflict currently exists to test. [INFERRED]

---

## PART C — Multi-Condition Medical

### Dean (W2025068) — FIV+, entropion surgery, chronic sneezing

**Documented conditions across records 2-4 (what Phase-2 sees):**
1. FIV-positive (records 2, 3, 4)
2. Entropion corrective surgery, healed (record 2)
3. Chronic sneezing (record 4: "always sneezing")

| Run | FIV+ | Entropion | Sneezing | All 3? |
|-----|------|----------|----------|--------|
| 1 | ✅ "FIV-positive" | ✅ "surgery to correct a congenital eye condition called entropion" | ✅ "he sneezes — charmingly, frequently, with little boogers" | ✅ YES |
| 2 | ✅ "FIV-positive" | ✅ "corrective eye surgery (entropion repair) that healed beautifully" | ✅ "he's a natural sneezer with the occasional tiny booger" | ✅ YES |
| 3 | ✅ "FIV positive" | ✅ "corrective eye surgery earlier in his life and has healed beautifully" | ✅ "a natural tendency to sneeze and can get a little booger-y" | ✅ YES |

**3/3 runs surfaced all 3 conditions.** No condition was dropped or minimized. The entropion surgery was framed positively (healed, no further complications expected) which accurately reflects the records. The sneezing was presented charmingly but honestly. FIV+ always included the practical implication (FIV-only cat household, annual vet visits). [VERIFIED]

---

## PART D — Record Truncation

### Truncation Chain

1. **`getBehaviorRecords()`** (localDatabase.ts:988): SQL `LIMIT 5` — returns the 5 most recent records
2. **Phase-2 profile** (server.ts:4645): `[...records].reverse().slice(0, 3)` — takes only the 3 most recent

For an animal with 4+ records, records older than the 3rd-most-recent are dropped from the Phase-2 profile entirely.

### Dean (W2025068) — 4 records, record 1 truncated

**Record 1 (2026-04-12, DROPPED — oldest of 4):**
- `special_needs: "Recently had a bilateral entropion repair, needs time to heal"`
- `good_with_dogs: "Honestly maybe even good with dogs, as his personality is very engaged and loyal"`
- `good_with_kids: "Good with kids, gentle and easy to handle"`
- `backstory: "Born in a colony but well taken care of"`

**Records 2-4 (RETAINED):**
- Entropion surgery also in record 2 → NOT lost
- FIV+ in records 2, 3, 4 → NOT lost
- Sneezing in record 4 → NOT lost
- `good_with_kids: "He'd be great with kids"` in record 2 → partially retained
- `good_with_dogs:` records 3-4 say "Not specified" / "Not tested" → dog compatibility data weakened

**Impact on bios:**

| Run | Kids mentioned? | Dogs mentioned? |
|-----|----------------|----------------|
| 1 | ✅ "one of his caregivers noted he'd likely be great with kids too" (from rec 2) | ⚠️ "compatibility with dogs is still an open question" |
| 2 | ❌ No kid mention | ❌ No dog mention |
| 3 | ❌ No kid mention | ❌ No dog mention |

**Assessment:** Record 1's strong kid-compatibility assertion ("Good with kids, gentle and easy to handle") was lost. Record 2's weaker statement was available but only surfaced in 1/3 runs. Records 3 and 4's "Not specified"/"Not tested" weakened the signal. The truncation didn't lose critical medical data (entropion is in record 2), but it degraded the quality of compatibility evidence for kids and dogs. [VERIFIED]

### Population exposure

Only **1 animal** (Dean) currently has 4+ records. No animal has 5+ records. The truncation risk is **currently minimal** in population terms but will grow as more caregiver recordings accumulate. Animals with frequent recordings will progressively lose older data. [VERIFIED]

**Structural concern:** The 3-record window is a design trade-off (context length vs completeness). The current approach works when records are additive (each new record includes everything from prior records). It fails when records are contradictory or when unique information exists only in older records. A merged-fields approach (already used by `getBehaviorNotes()` for matching) would be more robust for bio writing, but that function produces structured fields, not raw transcripts. [INFERRED]

---

## Summary

| Area | Status | Detail |
|------|--------|--------|
| FIV/FeLV untested→negative | **SAFE** ✅ | 0/6 runs fabricated a negative for untested cats |
| FIV/FeLV positive→softened | **SAFE** ✅ | 0/6 runs softened a positive status |
| Conflicting records | **SAFE** ✅ | 3/3 runs deferred on conflicting dog-compatibility (small-animal rule helps) |
| Multi-condition disclosure | **SAFE** ✅ | 3/3 runs surfaced all 3 of Dean's conditions |
| Record truncation | **MINOR GAP** ⚠️ | 1 animal affected; compatibility data weakened but no medical data lost |
| Reeboks FIV omission | **CONSISTENCY GAP** ⚠️ | 1/3 runs omitted untested FIV status (not fabricated, but could mislead) |
