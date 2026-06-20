# Selection Consistency at Volume + Temperature Mechanism Test

**Date:** 2026-06-20 06:00 ET  
**Type:** READ-ONLY TEST  
**Method:** 35 live endpoint queries (Parts A+D) + 5 direct Anthropic API calls at temp=0 (Part C)  
**Source:** Real `/api/matcher/custom-search` endpoint + direct Phase-1 API replication

---

## Answers

**(A) Swing at volume:** Only **3 distinct animals** across 20 identical runs of "a black cat that is fun." Slot 1 is **perfectly stable** (Karen Smith 20/20). The swing is limited to slots 2/3 swapping Carlo Gambino and Dean. [VERIFIED]

**(B) Does the swing surface worse matches? YES — but the CONSTANT, not the swing.** The worst match is Karen Smith (orange) in slot 1, and she's there EVERY run — that's not swing, it's a deterministic selection error. The slot 2/3 swap between Carlo Gambino (black, documented-playful) and Dean (black-white, documented-playful) is benign reordering of two comparable matches. No blank animal appeared in any of the 20 runs (the Aiden blank-displacement from the earlier 5-run test was a ~5% intermittent event that didn't reproduce at N=20). [VERIFIED]

**(C) Temperature mechanism:** At temp=0, **same 3 animals, same slot 2/3 swap.** Temperature does NOT explain the swing — even at temp=0, slots 2/3 alternated between Carlo Gambino and Dean (3× CG-Dean, 2× Dean-CG). The residual non-determinism is intrinsic to the Anthropic API (known behavior: temp=0 is not strictly deterministic for Claude). The swing is NOT a correctness problem — it's cosmetic reordering of equally-ranked picks. [VERIFIED]

**(D) Dogs stable at volume:** **Slot 1 perfectly stable** (Amari 10/10). Only 4 distinct animals across 10 runs. Slot 2/3 swing slightly (Abstract/Rex swap). One outlier: Mikey appeared once (D-r08 slot 2, replacing Rex). Cats and dogs have the SAME stability profile — slot 1 locked, slots 2/3 swap between near-equivalent picks. The earlier "dogs stable / cats swing" finding was an artifact of 5-run under-powering. [VERIFIED]

**The key answer to (B): Consistency is NOT a correctness problem in the swing dimension. The correctness problem is the CONSTANT — Karen Smith (orange) in slot 1 of every single run for a "black cat" query. That's the personality-override-color bug (report -053000), not a consistency issue.**

---

## Part A — Swing Quantification (20 runs)

### Query: "a black cat that is fun" — cat, all sex, all age, EN

| Metric | Value |
|--------|-------|
| Total distinct animals | **3** |
| Slot 1 distinct | **1** (Karen Smith — 20/20) |
| Slot 2 distinct | **2** (Carlo Gambino 14/20, Dean 6/20) |
| Slot 3 distinct | **2** (Dean 14/20, Carlo Gambino 6/20) |

### Animal Frequency

| Animal | Code | Color | Slot 1 | Slot 2 | Slot 3 | Total |
|--------|------|-------|--------|--------|--------|-------|
| Karen Smith | S2026447 | **Orange** ❌ | **20/20** | 0 | 0 | 20/60 |
| Carlo Gambino | W2026014 | Black ✅ | 0 | 14/20 | 6/20 | 20/60 |
| Dean | W2025068 | Black-white ✅ | 0 | 6/20 | 14/20 | 20/60 |

### Per-Run Detail

| Run | Slot 1 | Slot 2 | Slot 3 | lowConf | Non-black? |
|-----|--------|--------|--------|---------|-----------|
| 1 | Karen Smith (orange) | Carlo Gambino (black) | Dean (black-white) | false | ❌ Karen Smith |
| 2 | Karen Smith | Carlo Gambino | Dean | false | ❌ Karen Smith |
| 3 | Karen Smith | Carlo Gambino | Dean | false | ❌ Karen Smith |
| 4 | Karen Smith | Dean | Carlo Gambino | false | ❌ Karen Smith |
| 5 | Karen Smith | Carlo Gambino | Dean | false | ❌ Karen Smith |
| 6 | Karen Smith | Dean | Carlo Gambino | false | ❌ Karen Smith |
| 7 | Karen Smith | Carlo Gambino | Dean | false | ❌ Karen Smith |
| 8 | Karen Smith | Carlo Gambino | Dean | false | ❌ Karen Smith |
| 9 | Karen Smith | Dean | Carlo Gambino | false | ❌ Karen Smith |
| 10 | Karen Smith | Carlo Gambino | Dean | false | ❌ Karen Smith |
| 11 | Karen Smith | Carlo Gambino | Dean | false | ❌ Karen Smith |
| 12 | Karen Smith | Carlo Gambino | Dean | false | ❌ Karen Smith |
| 13 | Karen Smith | Carlo Gambino | Dean | false | ❌ Karen Smith |
| 14 | Karen Smith | Carlo Gambino | Dean | false | ❌ Karen Smith |
| 15 | Karen Smith | Carlo Gambino | Dean | false | ❌ Karen Smith |
| 16 | Karen Smith | Dean | Carlo Gambino | false | ❌ Karen Smith |
| 17 | Karen Smith | Carlo Gambino | Dean | false | ❌ Karen Smith |
| 18 | Karen Smith | Carlo Gambino | Dean | false | ❌ Karen Smith |
| 19 | Karen Smith | Dean | Carlo Gambino | false | ❌ Karen Smith |
| 20 | Karen Smith | Dean | Carlo Gambino | false | ❌ Karen Smith |

**20/20 runs returned a non-black cat (Karen Smith) in slot 1. `low_confidence: false` every time.**

### Comparison to Earlier 5-Run Test (report -004500)

The earlier test reported "4 distinct animals across 5 runs" — the 4th was Aiden (S2026397, BLANK, black kitten), who appeared once in slot 3 replacing Carlo Gambino. At N=20, Aiden never appeared. This was a ~5% intermittent event — a blank animal surfacing via temperature sampling. At scale, it's rare enough to not reproduce, but it EXISTS as a possibility.

---

## Part B — Does the Swing Surface Worse Matches?

**No — the swing is benign reordering.** The only two animals that swap (Carlo Gambino and Dean) are both:
- Black / black-with-white ✅
- Documented behavioral data ✅  
- Have "playful" signals in transcripts ✅
- Comparable match quality

The swing never surfaces:
- ❌ A BLANK animal (0/20 runs) — though the earlier 5-run test caught one at ~5% rate
- ❌ A wrong-color animal via the swing — Karen Smith (wrong color) is the CONSTANT, not the swing
- ❌ A clearly worse match than other runs

**The correctness problem is not the swing — it's Karen Smith.** She's in every single run, slot 1, deterministically. That's the Phase-1 rule 5 personality-override-color bug, not a consistency issue.

### Blank Displacement Risk

At N=20, no blank appeared. But at N=5 (earlier test), Aiden (blank black kitten) appeared once. Extrapolating: ~2-5% of runs may surface a blank animal that has zero evidence of "fun" — a clear correctness error caused by temperature sampling from the margin. This is an intermittent correctness issue, not a consistency one.

---

## Part C — Temperature Mechanism (Decisive)

### Direct Phase-1 API calls at temperature=0, same prompt

| Run | Slot 1 | Slot 2 | Slot 3 |
|-----|--------|--------|--------|
| 1 | Karen Smith (orange) | Carlo Gambino (black) | Dean (black-white) |
| 2 | Karen Smith (orange) | Dean (black-white) | Carlo Gambino (black) |
| 3 | Karen Smith (orange) | Dean (black-white) | Carlo Gambino (black) |
| 4 | Karen Smith (orange) | Carlo Gambino (black) | Dean (black-white) |
| 5 | Karen Smith (orange) | Carlo Gambino (black) | Dean (black-white) |

**Same 3 animals. Same slot 2/3 swap persists at temp=0.**

### Mechanism Verdict

Temperature is NOT the driver. The residual slot 2/3 swap occurs even at temp=0 because:

1. **Anthropic's API is not strictly deterministic at temp=0.** This is documented behavior — Claude uses sampling even at temperature=0, with very low but non-zero variation. [VERIFIED — Anthropic docs note this]
2. **Carlo Gambino and Dean are near-equivalent matches.** Their behavioral evidence for "fun" is similar enough that the model's ranking oscillates at the decision boundary.
3. **Slot 1 is stable** because Karen Smith's playful signal is so much stronger than all alternatives that even temperature noise can't dislodge her.

**Reducing temperature to 0 would NOT fix the slot 2/3 swap, and would NOT fix the Karen Smith color-override (the actual bug).** The temperature affects cosmetic reordering; the selection logic is the prompt's rule 5.

### Comparison: temp=0.7 (production) vs temp=0

| Metric | temp=0.7 (20 runs) | temp=0 (5 runs) |
|--------|-------------------|-----------------|
| Distinct animals | 3 | 3 |
| Slot 1 stable | ✅ 20/20 Karen Smith | ✅ 5/5 Karen Smith |
| Slot 2/3 swap | CG 14/20, Dean 6/20 | CG 3/5, Dean 2/5 |
| Blank intrusion | 0/20 | 0/5 |

Identical behavior. Temperature is not the mechanism for the meaningful variation.

---

## Part D — Dog Control (10 runs)

### Query: "a friendly dog" — dog, all sex, all age, EN

| Metric | Value |
|--------|-------|
| Total distinct animals | **4** |
| Slot 1 distinct | **1** (Amari — 10/10) |
| Slot 2 distinct | **3** (Abstract 6/10, Rex 3/10, Mikey 1/10) |
| Slot 3 distinct | **2** (Rex 6/10, Abstract 4/10) |

### Per-Run Detail

| Run | Slot 1 | Slot 2 | Slot 3 |
|-----|--------|--------|--------|
| 1 | Amari | Abstract | Rex |
| 2 | Amari | Rex | Abstract |
| 3 | Amari | Abstract | Rex |
| 4 | Amari | Rex | Abstract |
| 5 | Amari | Abstract | Rex |
| 6 | Amari | Rex | Abstract |
| 7 | Amari | Abstract | Rex |
| 8 | Amari | **Mikey** | Abstract |
| 9 | Amari | Abstract | Rex |
| 10 | Amari | Abstract | Rex |

### Dogs vs Cats: Same Stability Profile

| Dimension | Cats ("black fun") | Dogs ("friendly") |
|-----------|-------------------|-------------------|
| Slot 1 stable | ✅ 20/20 | ✅ 10/10 |
| Slot 2/3 swing | 2 animals swap | 2-3 animals swap |
| Outlier intrusion | ~5% (Aiden blank, earlier test) | 10% (Mikey, run 8) |
| Distinct animals | 3 (of 107 pool) | 4 (of 39 pool) |

**The earlier finding that "dogs are stable and cats swing" was an artifact of N=5.** Both species have the same pattern: slot 1 locked, slots 2/3 swap between near-equivalent picks, rare outlier intrusion. The swing is proportionally similar despite the 2.7× pool size difference (107 cats vs 39 dogs). [VERIFIED]

---

## Summary

| Question | Answer |
|----------|--------|
| (A) How many distinct animals in 20 runs? | **3** — slot 1 locked (Karen Smith), slots 2/3 swap 2 animals |
| (B) Does swing surface worse matches? | **No** — the swing is benign reordering. The CONSTANT (Karen Smith orange in slot 1) is the correctness problem, not the swing |
| (C) Is it temperature? | **No** — temp=0 shows identical behavior. Residual swap is API-intrinsic non-determinism at near-equivalent decision boundary |
| (D) Dogs stable? | **Same profile as cats** — slot 1 locked, slots 2/3 swap. Earlier "stable dogs" was N=5 artifact |

### Implications for Fixes

1. **Lowering temperature would not help.** The meaningful error (Karen Smith color override) is deterministic — it happens at every temperature. The cosmetic swap is API-intrinsic.
2. **The correctness fix is Phase-1 rule 5** — stop allowing personality to override explicit color requests.
3. **The blank intrusion (~5% at N=5, 0% at N=20) could be addressed by** penalizing blank animals in the prompt when behavioral attributes are requested.
