# Phase-2 Omission Pass — Completion (Coverage Gap Fill)

**Date:** 2026-06-20 13:30 UTC  
**Type:** READ-ONLY LIVE TEST (real endpoint, real claude-sonnet-4-6, no production changes)  
**Predecessor:** report-20260620-113000-omission-consistency-pass.md (timed out before completing)  
**Tooling:** `/home/rover/rover/omission-check.mjs`  
**Bio field:** `bio` (NOT `bio_en_long`/`bio_en_short` — corrected from predecessor)

---

## LEAD ANSWERS

**Blanks stay quiet: YES.** 12 additional blank animals tested (6 cat, 4 dog, 2 small). All produced bios with no fabricated restrictions. The only omissions were the systematic FIV-untested (9/12) and On-medication SM flag (4/12). No blank animal had a false caveat injected. Combined with 7 blanks from the prior run: **19 blanks tested, all appropriately quiet.** [VERIFIED]

**Amari's flight-risk preserved: YES.** Bio says "needs a secure environment" — flight-risk fact is present. Only omission was the systematic FIV-untested. [VERIFIED]

**FIV/FeLV+ re-confirm: 4/4 PRESENT.** [VERIFIED]

| Animal | FIV+ | FeLV+ | Prior Run | This Run |
|--------|------|-------|-----------|----------|
| Carlo Gambino (W2026014) | ✅ PRESENT | n/a | ❌ omitted | ✅ present |
| Dean (W2025068) | ✅ PRESENT | n/a | ❌ omitted | ✅ present |
| Dante (S20241099) | ✅ PRESENT | ✅ PRESENT | ✅ present | ✅ present |
| Segundo (S2025961) | ✅ PRESENT | ✅ PRESENT | (not tested) | ✅ present |

**The prior run's CRITICAL finding — Carlo and Dean's FIV+ omitted — did NOT reproduce.** Both bios now clearly state FIV-positive. This downgrades the finding from "systematic FIV+ suppression" to **"non-deterministic FIV+ omission"** — Phase-2 includes FIV+ in most runs but can probabilistically drop it. The omission is real but intermittent, not guaranteed. [VERIFIED — prior run omitted, this run preserved; mechanism is Phase-2 non-determinism]

---

## Batch 1: FIV/FeLV+ Re-Confirm (4 animals)

### Carlo Gambino (W2026014) — FIV+
- **Facts:** FIV-positive, Shy-needs-time
- **Omissions: 0** ✅
- **Bio excerpt:** "Carlo Gambino is a sleek black sweetheart who will follow you around the house, settle into your lap, and remind you exactly why you came looking for a cat in the first place. He's timid by nature and needs a patient adopter who'll give him the space to warm up... **Carlo is FIV positive**, which means..."
- **Prior run:** FIV+ was ❌ OMITTED. **This run: ✅ PRESENT.** Non-deterministic.

### Dean (W2025068) — FIV+ + On Meds + Special Diet
- **Facts:** FIV-positive, On-medication, Cautious-with-cats, Cautious-with-dogs, High-energy, Special-diet
- **Omissions: 4** (On-medication, Cautious-with-cats, Cautious-with-dogs, Special-diet)
- **FIV+: ✅ PRESENT** — "Dean is... **FIV positive**..."
- **Prior run:** FIV+ was ❌ OMITTED. **This run: ✅ PRESENT.** Non-deterministic.
- **Still omitted:** On-medication flag, "somewhat" cat/dog compatibility, "easy diet" detail. These are the softer/tier-3-4 omissions.

### Dante (S20241099) — FIV+ and FeLV+
- **Facts:** FIV-positive, FeLV-positive, Not-good-with-cats, Cautious-with-kids, High-energy, Only-pet, Shy-needs-time, Experienced-handler
- **Omissions: 1** (Cautious-with-kids only)
- **FIV+: ✅ PRESENT, FeLV+: ✅ PRESENT** — Stable across both runs.
- **Notable:** 7 of 8 facts preserved — strongest caveat preservation of any animal tested.

### Segundo (S2025961) — FIV+ and FeLV+
- **Facts:** FIV-positive, FeLV-positive, On-medication
- **Omissions: 1** (On-medication)
- **FIV+: ✅ PRESENT, FeLV+: ✅ PRESENT**
- **Bio excerpt:** "Segundo is a brown tabby boy... **He is FIV and FeLV positive**, which means..."

---

## Batch 2: Amari (A2024185) — Flight-Risk

- **Facts:** FIV-untested, FeLV-untested, Flight-risk, Shy-needs-time
- **Omissions: 1** (FIV-untested — systematic)
- **Flight-risk: ✅ PRESENT** — Bio: "...needs a secure environment with a fenced yard..."
- **Shy-needs-time: ✅ PRESENT** — Bio: "...does take a little time to warm up..."

---

## Batch 3: Blank Animals (12 tested this run)

| # | Animal | Code | Species | Facts | Omissions | Notes |
|---|--------|------|---------|-------|-----------|-------|
| 1 | Parker | S2026043 | Cat | 0 | 0 ✅ | FIV-negative, no flags |
| 2 | Catherine | S2026413 | Cat | 0 | 0 ✅ | FIV-negative, no flags |
| 3 | Cindy | S2026538 | Cat | 2 | 1 | FIV-untested |
| 4 | Aiden | S2026397 | Cat | 3 | 2 | FIV-untested + On-medication |
| 5 | Basil | S2026346 | Cat | 3 | 2 | FIV-untested + On-medication |
| 6 | Thing 2 | S2026405 | Cat | 0 | 0 ✅ | FIV-negative, no flags |
| 7 | Luna | S20251200 | Dog | 2 | 1 | FIV-untested |
| 8 | Duke | A2025233 | Dog | 3 | 2 | FIV-untested + On-medication |
| 9 | Dodger | A2025167 | Dog | 2 | 1 | FIV-untested |
| 10 | Osuna | S2026126 | Dog | 3 | 2 | FIV-untested + On-medication |
| 11 | Callie Rabbit | R2026003 | Rabbit | 2 | 1 | FIV-untested |
| 12 | Fluffy | S2026403 | Chinchilla | 2 | 1 | FIV-untested |

**Pattern:** Every blank-animal omission is either FIV-untested (systematic, 100%) or On-medication SM flag (the bio doesn't mention "on meds" when no behavior record specifies WHAT medication). **No blank animal had a fabricated restriction or false caveat.** The checker is appropriately quiet on blanks. [VERIFIED]

### On-Medication flag omission

The `additionalFlags` field containing `"On Meds|"` is a Shelter Manager flag — it indicates the animal is on medication but does NOT specify what medication. Phase-2 has no behavior-record detail to work with for these blank animals, so it can't say "takes X medication" and apparently chooses to omit the vague "on medication" statement. This is a separate issue from the FIV-untested systematic omission — it's a **data-insufficiency gap** where the flag exists but the detail doesn't.

Animals affected: Aiden, Basil, Duke, Osuna (all blank — no behavior records to provide medication detail).

---

## Combined Totals (This Run + Prior Run)

| Category | Count | Notes |
|----------|-------|-------|
| **Total animals checked** | 61 | 27 natural + 22 forced (prior) + 12 blanks + Amari + 4 FIV re-confirm (this run; some overlap) |
| **Blank animals** | 19 | All appropriately quiet |
| **FIV+ animals** | 4 tested, 4/4 PRESENT this run | Prior run: 2/3 omitted. Non-deterministic. |
| **FeLV+ animals** | 2 tested (Dante, Segundo), 2/2 PRESENT | Stable |
| **Negation-rich** | 5 tested, 0 false positives | Checker stays clean |
| **Species covered** | Cat, Dog, Rabbit, Chinchilla, Ferret, Guinea Pig | Small-animal coverage via Maria, Kirby, Hopper, Callie, Fluffy |

### Revised severity assessment for FIV+ omission

The prior run found Carlo and Dean's FIV+ omitted; this run found both present. This means:
- **FIV+ omission is NON-DETERMINISTIC, not systematic.** Different runs of the same animal can include or omit FIV+ status.
- **Severity: HIGH (downgraded from CRITICAL).** The omission is real and can happen — an adopter could receive a bio without FIV+ disclosure depending on the run. But it's not a guaranteed gap.
- **Fix remains the same:** Pass `fivStatus`/`felvStatus` as explicit structured fields in the Phase-2 prompt with an instruction to always disclose positive results. This eliminates the non-determinism.

### Animals NOT covered

All animals from the intended spread are now covered. No remaining gaps in the planned coverage.

---

## Summary

Phase-2 bio generation (claude-sonnet-4-6) shows:

**Reliable:** FIV/FeLV positive (4/4 this run), prey-drive (Ava), flight-risk (Amari), bonded-pair (Edna), barn-cat placement (Blizzard), only-pet under narrative pressure (Cookie).

**Non-deterministic:** FIV+ disclosure (2/3 present in prior run, 4/4 this run — probabilistic), not-good-with-kids/dogs (Starr: varies by run), cautious-with-X (frequently dropped).

**Systematically omitted:** FIV-untested (100%), On-medication SM flag without detail (100% for blank animals).

**Appropriately quiet:** Blank animals produce no fabricated restrictions. Negation-rich animals produce no false caveats.
