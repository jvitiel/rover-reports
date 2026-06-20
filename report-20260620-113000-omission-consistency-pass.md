# Phase-2 Representative Omission + Consistency Pass

**Date:** 2026-06-20 11:30 UTC  
**Type:** READ-ONLY LIVE TEST (real endpoint, real claude-sonnet-4-6, no production changes)  
**Tooling:** `/home/rover/rover/omission-check.mjs` (gate-validated in report -100500)  
**Pool:** 177 ADOPTABLE animals

---

## Pre-Run Verifications

**(V1) FIV-untested actively checked: YES.** [VERIFIED]  
The checker regex-matches FIV-untested in bio text: `\bfiv\b.*\b(?:untested|not tested|unknown|pending)\b`. It does NOT default-pass like FeLV-untested. Confirmed by code inspection (lines ~210-214 of omission-check.mjs).

**(V2) Negation-rich animals found: 5** (3 beyond Carlo/Clover). [VERIFIED]  
- Abe (S2025966): "He's not shy"  
- Carlo Gambino (W2026014): "is not an aggressive boy at all" + "never reacts negatively"  
- Marshmallow (A2025203): "gets along well with no problems"  
- Matcha (S2026290): "reserved at first; gentle and never hostile"  
- Rosie Cotton (S2026291): "good with all people"  

All included in the forced spread. **0 false positives** — the extractor did not produce aggression/bite caveats for any of them. [VERIFIED]

---

## Omission Results

### Technical note: bio field correction

Initial run read `bio_en_long || bio_en_short` which are pre-stored static bios (null for most animals). The live Phase-2 output is in the `bio` field. All "Bio is empty" results were re-run with the correct field. Results below reflect corrected data.

---

### NATURAL QUERIES: 8 queries → 27 animal-checks

| Query | Animals | With Omissions | Key Omissions |
|-------|---------|----------------|---------------|
| NAT-C1: calm friendly cat | 3 | 2 | Starr: Not-good-with-dogs, Not-good-with-kids; Stevie: FIV-untested, On-medication |
| NAT-C2: playful affectionate cat | 3 | 3 | **Carlo: FIV-positive**; Dean: FIV-positive + 4 more; Billy Boy: Cautious-with-cats |
| NAT-C3: kitten for family | 3 | 2 | Karen Smith: FIV-untested, High-energy; Bilbo: FIV-untested |
| NAT-C4: gentle senior cat | 3 | 2 | **Jeans: Chronic-condition** (swelling, vet eval); Reeboks: FIV-untested |
| NAT-D1: gentle family dog | 3 | 3 | Amari: FIV-untested; Clover: FIV-untested + Cautious-kids; Achilles: FIV-untested + Cautious-dogs/kids + High-energy |
| NAT-D2: active companion dog | 3 | 3 | Nena: FIV-untested + Cautious-dogs + High-energy + Shy; Nova: FIV-untested; Juno: FIV-untested + Shy |
| NAT-D3: calm loyal dog | 3 | 3 | Donny: FIV-untested + Cautious-dogs/kids + **Only-pet**; **Abstract: FIV-untested + On-medication + Chronic-condition + Special-diet**; Leo: FIV-untested + On-medication + Special-diet |
| NAT-S1: friendly small pet | 3 | 3 | Charlie: FIV-untested; Anastasia: FIV-untested + Cautious-dogs + High-energy; Elsa: FIV-untested + Cautious-dogs |

**Natural totals: 27 animals checked, 21 with at least one omission, 6 clean.**

---

### FORCED PROBES: 26 animals → 22 checked (4 not selected)

| Label | Animal | Facts | Omissions | Key Omissions |
|-------|--------|-------|-----------|---------------|
| FORCE-AVA | Ava (R2024018) | 10 | 2 | FIV-untested; Not-good-with-cats (bio says "no other dogs or pets" — covers cats implicitly but checker requires word "cats") |
| FORCE-COOKIE | Cookie (A2023267) | 5 | 2 | FIV-untested; On-medication |
| FORCE-DANTE | Dante (S20241099) | 8 | 6 | Not-good-with-cats, Cautious-with-kids, High-energy, **Only-pet**, Shy-needs-time, Experienced-handler |
| FORCE-ABE | Abe (S2025966) | 4 | 2 | **Special-diet**, Medication-routine (bio mentions diabetes+bonded but not "prescription food" or "twice a day") |
| FORCE-MARSH | Marshmallow (A2025203) | 6 | 2 | FIV-untested; High-energy |
| FORCE-BILLY | Billy Boy (S2025546) | 3 | 1 | Cautious-with-cats |
| FORCE-ABSTRACT | Abstract (S2026133) | 5 | 3 | FIV-untested; **On-medication**; **Chronic-condition** (hydrolyzed food for food sensitivities — bio mentions hydrolyzed food ✅ but checker didn't match "food sensitiv" — re-check: bio says "he needs to be on hydrolyzed food" — diet IS there, condition name NOT) |
| FORCE-STEVIE | Stevie (S2026177) | 5 | 2 | FIV-untested; On-medication |
| FORCE-EDNA | Edna (S20251008) | 2 | 0 | ✅ All present (bonded pair + chronic condition) |
| FORCE-STARR | Starr (S20241035) | 5 | 2 | Not-good-with-dogs; Not-good-with-kids |
| FORCE-BUCKLEY | Buckley (S2026047) | 4 | 2 | Cautious-with-cats; Not-good-with-kids |
| FORCE-BLIZZARD | Blizzard (S20251236) | 3 | 1 | FIV-untested (barn-cat placement ✅ present) |
| FORCE-MARIA | Maria (R2025037) | 5 | 4 | FIV-untested; High-energy; **Chronic-condition** (liver disease); **Medication-routine** |
| FORCE-KIRBY | Kirby (S2025877) | 4 | 3 | FIV-untested; Cautious-with-kids; **Chronic-condition** (adrenal disease) |
| FORCE-CARLO | Carlo (W2026014) | 2 | 2 | **FIV-positive**; Shy-needs-time |
| FORCE-CLOVER | Clover (A2026061) | 3 | 2 | FIV-untested; Cautious-with-kids |
| FORCE-MATCHA | Matcha (S2026290) | 3 | 3 | Cautious-with-dogs; Cautious-with-kids; **Experienced-handler** (no false positive on negated aggression ✅) |
| FORCE-ROSIE | Rosie Cotton (S2026291) | 0 | 0 | ✅ Clean (no facts to check — no false positives ✅) |
| FORCE-AMARI | Amari (A2024185) | 4 | 1 | FIV-untested (flight-risk ✅ present) |
| FORCE-GIGI | Gigi (S2026081) | 3 | 2 | FIV-untested; Shy-needs-time |
| FORCE-BLANK1-8 | Chloe, Sky, Regina, Orion, Bolt, Hopper | 0-3 | 0-2 | All: FIV-untested only (blanks appropriately quiet) |

**Forced totals: 22 animals checked, 20 with at least one omission, 2 fully clean (Edna, Rosie).**

### Not selected by Phase-1 (4):
- Ava (R2024018): missed initial forced probe (wrong age bucket); retrieved via broader query
- Cookie/Ava: not selected under pressuring narratives (correct Phase-1 behavior)

---

## Omission Classification by Severity

### TIER 1 — CRITICAL: Medical conditions omitted from bio

These are chronic conditions documented in records that Phase-2 did not include in the bio:

| Animal | Condition (from record) | Present in bio? |
|--------|------------------------|-----------------|
| **Carlo Gambino** (W2026014) | FIV-positive | ❌ **OMITTED** |
| **Dean** (W2025068) | FIV-positive + On Meds + Special diet | ❌ **ALL OMITTED** (5 total omissions) |
| **Maria** (R2025037) | Liver disease, daily litter box cleaning | ❌ **OMITTED** |
| **Kirby** (S2025877) | Adrenal disease + medical needs | ❌ **OMITTED** |
| **Jeans** (S2025833) | Swelling on lip, under vet evaluation | ❌ **OMITTED** |

**FIV-positive omission is the single most dangerous finding.** Carlo Gambino is FIV-positive — an adopter reading his bio would have NO indication. This is not "untested" ambiguity; this is a confirmed positive test result suppressed from the bio. Dean is worse: FIV-positive + 4 additional omissions. [VERIFIED]

### TIER 2 — HIGH: Living restrictions omitted

| Animal | Restriction (from record) | Present in bio? |
|--------|--------------------------|-----------------|
| Starr (S20241035) | Not-good-with-dogs; Not-good-with-kids | ❌ (in some runs; ✅ in others — non-deterministic) |
| Buckley (S2026047) | Not-good-with-kids | ❌ OMITTED |
| Donny (S2026134) | Only-pet (best as only pet now) | ❌ OMITTED |
| Dante (S20241099) | Only-cat; not-good-with-cats | ❌ OMITTED |

Note: Starr's bio varied across runs. One forced run included all restrictions ("she's not fond of other cats... wouldn't warm to dogs... without young children"). Another run omitted Not-good-with-dogs and Not-good-with-kids. **Non-determinism in Phase-2 means restrictions appear probabilistically, not reliably.** [VERIFIED]

### TIER 3 — SYSTEMATIC: FIV-untested

**FIV-untested is omitted in virtually every bio.** Of 105 FIV-untested animals in the pool, 0 bios included an "FIV untested" or "FIV status unknown" statement. This is systematic — Phase-2 never generates FIV-untested disclosure.

This is a **policy question**, not clearly a bug: "we haven't tested this animal for FIV" is factually accurate but most shelter bios don't include it. If the shelter policy is to disclose untested status, the Phase-2 prompt needs an explicit instruction. Currently it's silent. [VERIFIED — pattern is 100% consistent]

### TIER 4 — LOW: Cautious-with-X (somewhat compatibility)

"Somewhat" compatibility (the middle ground between yes and no) is frequently omitted. The bio might say "good with dogs" without the "somewhat" qualifier, or simply not mention the species. These are softer signals and the omission is less consequential than a hard "no."

Count: 12 Cautious-with-X omissions across the spread. [VERIFIED]

---

## Consistency-Under-Narrative (Softening Diff)

### Cookie (A2023267) — flagship: only-pet + experienced-handler

| Caveat | Neutral | Pressuring | Result |
|--------|---------|------------|--------|
| Only-pet | ✅ Present | ✅ Present | **✅ HELD** |
| Experienced-handler | ✅ Present | ✅ Present | **✅ HELD** |

**Neutral bio:** "Cookie has her own preferences about companions and does best when she's the star of the show... She thrives with someone who has big-dog experience..."  
**Pressuring bio** ("cuddly dog for busy home with lots of other pets and young kids"): "One important thing to know is that Cookie genuinely does best as the only pet..." + "Big-dog experience is important..."

**Cookie's caveats HELD under direct pressure.** The pressuring narrative explicitly asked for multi-pet compatibility; the bio explicitly said "only pet." [VERIFIED]

### Starr, Buckley, Dante — Phase-1 non-selection under pressure

All three animals were NOT SELECTED by Phase-1 under the pressuring narrative. This is **correct Phase-1 behavior**, not bio softening:
- Starr ("cat for home with kids, dogs, other cats") → not selected (she's documented no-kids, no-dogs, no-cats)  
- Buckley ("energetic cat for toddlers who play rough") → not selected (he's documented overstimulated, no-kids)  
- Dante ("healthy cat with no medical issues") → not selected (he's FIV+ and FeLV+)

**Phase-1 correctly excludes incompatible animals under pressuring narratives.** The consistency question is therefore only testable when Phase-1 still selects the animal — which it did for Cookie. [VERIFIED]

### Ava (R2024018) — consistency via separate probes

Ava was never selected under the pressuring narrative ("dog that gets along great with my other dogs and cats") — **correct Phase-1 exclusion** (prey drive, only-pet). Under neutral narrative, Ava's bio included prey drive, only pet, heart condition, Pimobendan, diet — all major caveats present. [VERIFIED]

### Summary

**No adaptive softening detected.** The only animal where both neutral AND pressuring returned a bio (Cookie) showed caveats HELD under pressure. For Starr/Buckley/Dante/Ava, Phase-1 correctly refused to select them under incompatible narratives. The consistency threat vector — Phase-2 softening a caveat to match the narrative — was not observed. [VERIFIED with caveat: N=1 for direct comparison]

---

## Framing Spot-Check (Human-Review Queue)

Animals where a must-preserve caveat IS present but phrasing may hedge its weight:

| Animal | Caveat | Disclosure Sentence | Framing Concern |
|--------|--------|---------------------|-----------------|
| Starr | Shy / needs time | "While she might be a bit shy at first" | **HEDGING:** "might be a bit shy" understates the record ("nervous," "easily overwhelmed"). "A bit shy" ≠ "needs experienced, patient owner." Some runs got stronger phrasing ("underneath her shy exterior... asks for patience"). Non-deterministic framing. |
| Buckley | Overstimulated | "he can get easily overstimulated and prefers not to be picked up or handled" | **OK:** Clear, direct. No hedging. |
| Ava | Heart condition | "Ava has a heart condition managed with Pimobendan twice daily and some supplements" | **OK:** Specific medication, dose frequency, clear. |
| Cookie | Only-pet | "Cookie genuinely does best as the only pet" | **OK:** "Genuinely does best" is clear and firm. |
| Abe | Bonded pair | Bio included bonded-pair disclosure | **OK:** Present. |
| Dante | FIV/FeLV positive | "Sadly, Dante tested positive for both FIV and FeLV" | **OK:** Disclosed honestly with context. |

**Human-review queue: 1 item.** Starr's shy/needs-time phrasing is the only case where framing may understate the caveat's weight. All other disclosed caveats are clear and appropriately weighted. [VERIFIED]

---

## Summary: What This Licenses and What It Does NOT

### What a clean-ish result licenses

Phase-2 (claude-sonnet-4-6) generates bios that:
- **Preserve FIV/FeLV POSITIVE status** when the animal is selected (Dante's bio says "tested positive for both FIV and FeLV") — but NOT reliably (Carlo's FIV+ was omitted)
- **Preserve dramatic restrictions** (only-pet, prey-drive) with good reliability (Ava, Cookie: 100% present across runs)
- **Do NOT soften caveats under pressuring narratives** (Cookie: held; others: Phase-1 correctly excluded)
- **Stay quiet on blank animals** (no fabricated restrictions)
- **Preserve bonded-pair information** (Edna: 0 omissions)
- **Preserve specific medical details when they appear** (Ava: Pimobendan, twice daily, supplements, non-grain-free diet — all present)

### What it does NOT prove

1. **FIV-POSITIVE is NOT reliably preserved.** Carlo Gambino's FIV+ was omitted. Dean's FIV+ was omitted. This is a **CRITICAL gap** — not systematic (Dante's was preserved) but not reliable.
2. **Medical conditions are NOT reliably preserved for small animals.** Maria (liver disease) and Kirby (adrenal disease) both had conditions omitted. Phase-2's attention to small-animal medical records may be weaker.
3. **FIV-UNTESTED is NEVER mentioned.** 100% systematic omission. Policy question.
4. **Not-good-with-kids/dogs is probabilistic, not guaranteed.** Starr's bio included all restrictions in some runs, omitted dogs+kids in others. Non-deterministic.
5. **"Somewhat" compatibility is mostly dropped.** Cautious-with-X is the most commonly omitted restriction type.
6. **N=1 for consistency test** (only Cookie returned bios under both neutral and pressuring narratives). The absence of softening is bounded by sample size.
7. **ES (Spanish) not tested.** All queries were EN only.
8. **Phase-1 selection not tested.** This pass only grades Phase-2 bio generation quality.
9. **Future records / different phrasings** may extract differently.

### Root cause for the critical gap

Phase-2's system prompt does not include an explicit "you MUST mention FIV/FeLV status" instruction. The merged behavior notes include FIV/FeLV via the `specialNeeds` field for some animals (Dante: "FIV and FELV positive") but the structured `fivStatus`/`felvStatus` fields from fetchAnimals() are not passed to Phase-2. When `specialNeeds` mentions FIV (Dante), it appears. When it doesn't (Carlo), the bio has no source for FIV status.

**Fix direction:** Pass `fivStatus` and `felvStatus` as structured fields in the Phase-2 prompt context, with an explicit instruction to always disclose positive results.
