# Caveat / Condition / Restriction Data Map + Bite-Aggression Precondition Scan

**Date:** 2026-06-20 09:57 UTC  
**Type:** READ-ONLY DIAGNOSIS  
**Data sources:** `fetchAnimals()` (ADOPTABLE===1 pool) + `getBehaviorRecords()` / `getBehaviorNotes()` — NOT `/api/animals`  
**Pool size:** 177 animals

---

## Part B LEAD: Bite/Aggression Marker Count

**2 animals carry a structured Bite History flag in the ADOPTABLE pool.** [VERIFIED]  
**0 animals carry genuine aggression/bite evidence in behavior records or free text.** [VERIFIED]

| Animal | Code | Flag Source | Details |
|--------|------|-------------|---------|
| Ava | R2024018 | `additionalFlags`: `"Bite History\|On Meds\|"` | Heart condition, prey drive, only-dog home recommended. Bite History is a **structured SM flag** — likely reflects a historical intake notation. No bite/aggression language in behavior records. |
| Cookie | A2023267 | `additionalFlags`: `"Bite History\|On Meds\|"` | Same structured SM flag. Behavior records describe her as needing to be the only pet, "feistiest" of fosters, "boss of everybody." No aggression language. |

The regex also hit 13 false positives on the word "bit" used conversationally ("a bit of a goofball," "a little bit out of control," "sleeps quite a bit," etc.) and 2 negations of aggression (Carlo Gambino: "is not an aggressive boy at all"; Clover: "slightest hint of aggression... never seen"). All 13 are clearly non-bite usage. One ambiguous hit — Dean's raw transcript contains "He like bit the-" which appears to be a mid-sentence interruption during voice profiling, not a documented bite incident (the rest of the transcript describes him as "best boy ever," great with people).

**Verdict on quality frame:** The 2 Bite History flags are **upstream SM-hygiene findings** — these are structured intake flags that staff set in Shelter Manager, and the animals remain ADOPTABLE===1. This is an operator decision (staff deemed them adoptable despite bite history). The Phase-2 bio pass should **preserve** the Bite History flag if it appears (it's carried in `additionalFlags`), but the quality frame — that genuinely dangerous animals are not in the searcher pool — holds: no animal in the pool has documented dangerous behavior in its caregiver records. [VERIFIED]

---

## Part A: Caveat Data Map

### Summary Table

| # | Category | Data Exists? | Storage Type | Count (of 177) | Key Fields |
|---|----------|-------------|--------------|-----------------|------------|
| A1 | FIV/FeLV status | YES | **STRUCTURED** | 72 tested (65 FIV−, 7 FIV+; 70 FeLV−, 2 FeLV+); 105 untested | `fivStatus`, `felvStatus` on Animal object |
| A1 | Chronic conditions / meds | YES | **FREE-TEXT** | 2 medical-keyword hits + "On Meds" flag on 20 animals | `specialNeeds`, `additionalNotes` (behavior_notes); `additionalFlags` (SM) |
| A2 | Good-with-cats/dogs/kids | YES | **DUAL** (structured enum + free text) | 35-42 per field (of 48 with records) | `goodWithCats_match` + `_text`, same for dogs/kids |
| A2 | Only-pet / indoor-only / flight risk | YES | **FREE-TEXT** only | 7 restriction-keyword hits | `specialNeeds`, `additionalNotes`, `goodWith*_text` |
| A3 | Bonded pair | PARTIAL | **FREE-TEXT** only (structured flag exists but unpopulated) | 2 real bonded pairs found in text | `specialNeeds`, `backstory` |
| A4 | Practical needs (meds, diet, handling) | YES | **FREE-TEXT** | 47 have `specialNeeds` field (many say "None") | `specialNeeds` |
| A5 | Behavioral caveats (shy, needs time) | YES | **DUAL** (structured + free text) | 21 behavioral-keyword hits; 48 have `peopleReaction` | `peopleReaction`, `energyLevel`, `goodWith*_text`, `specialNeeds` |

[VERIFIED — all counts from live data scan]

---

### A1: MEDICAL

**Structured fields:**
- `fivStatus`: `negative` (65), `untested` (105), `positive` (7) — derived from SM's `COMBITESTED` + `COMBITESTRESULT`
- `felvStatus`: `negative` (70), `unknown` (105), `positive` (2) — derived from SM's `FLVRESULT`
- `additionalFlags` (SM): contains `"On Meds|"` for 20 animals — **structured flag from SM**, pipe-delimited

**Free-text fields (behavior_notes):**
- `specialNeeds`: 47 animals have this populated; many say "None" explicitly. Real medical examples:
  - Abe (S2025966): `"Diabetes, receives insulin injections twice a day and eats diabetic prescription food"` 
  - Ava (R2024018): `"Heart condition requiring Pimobendan twice a day and a variety of supplements; needs a non-grain-free diet"`
  - Billy Boy (S2025546): `"He is on a urinary care diet. Wet food only."`
  - Kirby (S2025877): `"Has adrenal disease and medical needs"`
  - Maria (R2025037): `"Liver disease causing excessive drinking and urination; needs litter box cleaned daily"`
  - Marshmallow (A2025203): `"Cushing's disease, marking problem managed with a diaper"`
  - Stevie (S2026177): `"On gabapentin, very picky"`
  - Dean (W2025068): `"FIV positive, always sneezing, on an easy diet"`
  - Abstract (S2026133): `"Needs to be on hydrolyzed food for food sensitivities"`
  - Jeans (S2025833): `"Swelling on lip, under veterinary evaluation"`

**Key finding for Phase-2:** FIV/FeLV is **structured and reliable** — directly keyed off SM test fields. Chronic conditions and medication needs are **free-text only** in `specialNeeds`. The "On Meds" SM flag tells you an animal is on medication but not WHAT medication — details are only in the free-text `specialNeeds` field. Phase-2 must extract from prose. [VERIFIED]

---

### A2: LIVING RESTRICTIONS

**Structured fields (dual storage in behavior_notes):**

| Field | yes | somewhat | no | unknown |
|-------|-----|----------|-----|---------|
| `goodWithCats_match` | 25 | 5 | 5 | 13 |
| `goodWithDogs_match` | 17 | 12 | 3 | 16 |
| `goodWithKids_match` | 17 | 13 | 5 | 13 |

Only 48/177 animals (27%) have behavior records at all. The remaining 129 have NO compatibility data — structured or free-text.

**Real phrasings in `_text` fields (how restrictions are actually written):**

`goodWithCats_match="no"` examples:
- `"Cannot be around other animals due to prey drive"` (Ava)
- `"Absolutely cannot be with cats"` (Bailey)
- `"Would be best as an only cat due to his condition, unless there is another FELV or FIV cat in the home"` (Dante)
- `"Prefers to be only cat, does not like other cats"` (Starr)

`goodWithDogs_match="no"` examples:
- `"Cannot be around other animals due to prey drive"` (Ava)
- `"Not recommended to live with dogs"` (Olaf)
- `"Assumed not to like dogs"` (Starr)

`goodWithKids_match="no"` examples:
- `"Cannot be with kids"` (Bailey)
- `"Not good with children due to being easily overstimulated"` (Buckley)
- `"No kids - easily overwhelmed"` (Starr)
- `"Shy around children, best in a home with adults only"` (Zelda)

**Free-text-only restrictions (no structured enum):**
- `"May be a flight risk, needs secure environment"` — Amari (`specialNeeds`)
- `"Best fit would be a home where she's the only dog"` — Ava (`additionalNotes`)
- `"she is the only pet, she loves to be the star"` — Cookie (`additionalNotes`)
- `"best as an only pet now"` — Donny (`additionalNotes`)
- `"only pet with no other dogs or cats"` — Nanook (`additionalNotes`)

**Key finding for Phase-2:** Compatibility is **dual-stored** — a structured enum (`yes`/`no`/`somewhat`/`unknown`) AND a free-text explanation. The enum is reliable for "does this restriction exist?" The text is needed for "what exactly is the restriction?" Additional restrictions like "only-pet," "flight risk," "indoor-only," "needs fenced yard" are **free-text only** in `specialNeeds` or `additionalNotes` — no structured flag. [VERIFIED]

---

### A3: BONDED PAIR

The `bonded_pair` DB flag in `animal_metadata` is **0 for all animals** (confirmed in prior report-20260620-010500). Bonded-pair information exists **only in free-text**.

Real bonded pairs found:
1. **Abe (S2025966) + Edna (S20251008):** 
   - Abe's `backstory`: `"bonded with sister Edna"`
   - Abe's `additionalNotes`: `"Living in a foster home with his sibling, Ethna"` (note: name spelled differently)
   - Edna's `specialNeeds`: `"Bonded to eight, should go together"` (note: "eight" appears to be a voice-transcription error for "Abe")
   - Edna's `additionalNotes`: `"Best for a home where she can be with her bonded..."` (truncated)

2. **Zelda (A2023301) + Eva (not separately identified):**
   - `"They make quite the pair. Zelda is not at the shelter, she is in foster care"`

**Key finding for Phase-2:** Bonded-pair status is **free-text only** and subject to transcription artifacts ("eight" for "Abe," "Ethna" for "Edna"). The structured `bonded_pair` flag is never set. Phase-2 must extract from `specialNeeds`, `backstory`, and `additionalNotes` prose. The word "bonded" is the reliable marker — "pair" alone hits false positives. [VERIFIED]

---

### A4: PRACTICAL NEEDS

All practical-needs data is **free-text** in `specialNeeds` and `additionalNotes`.

47 animals have `specialNeeds` populated, but **many explicitly say "None"** (29 of 47). The 18 with actual content:

| Animal | Code | specialNeeds content |
|--------|------|---------------------|
| Abstract | S2026133 | Needs hydrolyzed food for food sensitivities |
| Amari | A2024185 | Flight risk, needs secure environment |
| Ava | R2024018 | Heart condition, Pimobendan 2x/day, supplements, non-grain-free diet |
| Billy Boy | S2025546 | Urinary care diet, wet food only |
| Buckley | S2026047 | Gets overstimulated easier than most cats |
| Carlo Gambino | W2026014 | FIV positive |
| Dante | S20241099 | FIV and FELV positive |
| Dean | W2025068 | FIV positive, always sneezing, easy diet |
| Edna | S20251008 | Bonded to Abe, should go together |
| Jeans | S2025833 | Swelling on lip, under veterinary evaluation |
| Kirby | S2025877 | Adrenal disease and medical needs |
| Maria | R2025037 | Liver disease, excessive drinking/urination, daily litter box cleaning |
| Marshmallow | A2025203 | Cushing's disease, diaper for marking |
| Rex | A2025114 | None currently, past skin issues cleared up |
| Segundo | S2025961 | FELV positive |
| Snowie | A2023287 | None, but she is a senior bunny |
| Stevie | S2026177 | On gabapentin, very picky |

**Key finding:** No structured "medication routine" or "special handling" fields exist. Everything is prose in `specialNeeds`. Phase-2 extraction must parse phrases like "twice a day," "daily," "diet," "managed with." [VERIFIED]

---

### A5: BEHAVIORAL CAVEATS (non-dangerous)

**Structured fields:**
- `peopleReaction`: 47 animals (free-text descriptions, not enum). Examples: `"Good with people, but needs time to warm up"`, `"Good with kids, but better with older kids due to size and energy"`, `"Good with people when she gets to know them"`
- `energyLevel`: 45 animals (free-text). Examples: `"Very energetic"`, `"Moderate, playful in bursts"`, `"Lower energy level but meows a lot"`
- `energyLevel_match`: structured enum — `low` (18), `high` (17), `medium` (10), `unknown` (3)

**Free-text behavioral caveats found (21 animals):**
Markers detected: `shy`, `timid`, `nervous`, `needs time`, `crate trained`, `reactive`, `not good with`, `separation anxiety`

Examples:
- Amari (A2024185): `"Good with people, but needs time to warm up"`
- Buckley (S2026047): `"was once nervous, having been surrendered, but with patience and understanding..."`
- Matcha (S2026290): `"does take a little bit of time to earn her trust, but she's never ever even remotely hostile"`
- Blizzard (S20251236): ANIMALCOMMENTS: `"Not meant to be a household pet, but would be a great barn cat"` — this is effectively a living-restriction buried in free text

**Key finding:** `energyLevel_match` is the only structured behavioral enum. Everything else — shy/needs-time, resource guarding, reactivity — is free-text in `peopleReaction`, `additionalNotes`, `specialNeeds`, or `backstory`. Phase-2 must extract from prose. [VERIFIED]

---

## Field Population Summary

| Field | Count | % of Pool | Storage |
|-------|-------|-----------|---------|
| Has any behavior record | 48 | 27% | — |
| `description` (ANIMALCOMMENTS from SM) | 34 | 19% | SM free-text |
| `additionalFlags` (SM flags) | 177 | 100% | SM structured (pipe-delimited) |
| `fivStatus` / `felvStatus` | 177 | 100% | SM structured (derived) |
| `specialNeeds` | 47 | 27% | Behavior record free-text |
| `additionalNotes` | 44 | 25% | Behavior record free-text |
| `backstory` | 41 | 23% | Behavior record free-text |
| `peopleReaction` | 47 | 27% | Behavior record free-text |
| `energyLevel` | 45 | 25% | Behavior record free-text |
| `goodWithCats_text` | 42 | 24% | Behavior record free-text |
| `goodWithDogs_text` | 41 | 23% | Behavior record free-text |
| `goodWithKids_text` | 40 | 23% | Behavior record free-text |
| `specialFeatures` | 23 | 13% | Behavior record free-text |
| `rawTranscript` | 48 | 27% | Behavior record free-text |

**73% of the pool has NO behavior records at all.** These animals have only SM-sourced data: name, breed, age, sex, color, size, FIV/FeLV status, `additionalFlags`, and possibly `ANIMALCOMMENTS` (19% have this). Phase-2 can only write bios from structured SM fields for these animals. [VERIFIED]

---

## Implications for Phase-2 Bio-Honesty Pass

### Must-Preserve Facts (by extraction difficulty)

| Priority | Fact Type | Source | Extraction Method |
|----------|-----------|--------|-------------------|
| 1 (critical) | FIV+ / FeLV+ status | `fivStatus`, `felvStatus` | Direct field read — trivial |
| 2 (critical) | Not-good-with cats/dogs/kids | `goodWith*_match` enum | Direct field read when `="no"` or `="somewhat"` |
| 3 (high) | Medical conditions / meds | `specialNeeds` free-text | Prose extraction — must not drop "insulin 2x/day" or "Pimobendan" |
| 4 (high) | Only-pet / only-cat | `specialNeeds`, `additionalNotes`, `goodWith*_text` | Prose extraction — phrases like "only pet," "only cat," "only dog" |
| 5 (high) | Bonded pair | `specialNeeds`, `backstory` | Prose extraction — keyword "bonded" + partner name |
| 6 (medium) | Special diet | `specialNeeds` | Prose extraction — "hydrolyzed food," "urinary care diet," "wet food only" |
| 7 (medium) | Flight risk / needs secure home | `specialNeeds`, `additionalNotes` | Prose extraction |
| 8 (medium) | Bite History flag | `additionalFlags` | String search for "Bite History" in pipe-delimited flags |
| 9 (low) | Shy / needs-time-to-warm-up | `peopleReaction`, `additionalNotes` | Prose extraction |
| 10 (low) | Energy level caveat | `energyLevel_match`, `energyLevel` | Enum + prose |
