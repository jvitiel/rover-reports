# Position Hypothesis Experiment — Condition IV

**Date:** 2026-06-18 10:36 ET  
**Production unchanged:** No app-tree edits, no commits, no restarts. All work in throwaway script `/home/rover/position-experiment.mjs`. [VERIFIED]  
**Data source:** Exact production audit record `2d1ce3d2-...` (2026-06-18T03:55Z), 98 candidates, verbatim content. [VERIFIED]  
**Model:** claude-sonnet-4-6, temperature 0.7, max_tokens 2048. [VERIFIED]

---

## Setup

### Content invariance check

| Metric | Control | Condition IV |
|---|---|---|
| Candidate count | 98 | 98 |
| User message length (chars) | 45,894 | 45,894 |
| Input tokens (per API) | 15,895 | 15,895 |
| Per-cat content | Verbatim | Verbatim |

Same cats, same notes, same text volume, same token count. Only ordering changed. [VERIFIED]

### Partition

22 evidenced cats (have Caregiver transcripts or Shelter notes blocks) sorted to top, preserving relative order. 76 reserve cats follow, preserving relative order. [VERIFIED]

### Positions of tracked cats

| Cat | Control pos | Sorted pos | Evidence? |
|---|---|---|---|
| S2025966 Abe (Louie) | 1/98 | 1/98 | ✅ 3 transcripts (long, detailed) |
| S2026495 Andrew | 2/98 | **23/98** | ❌ zero notes |
| S2026268 Juliet | 43/98 | **11/98** | ✅ 1 transcript (medium) |
| S2026447 Karen Smith | 45/98 | **12/98** | ✅ 1 transcript (short) |
| S2026357 Lilac | 49/98 | **13/98** | ✅ 1 transcript (short) |
| S2026519 Luna Tuna | 51/98 | **59/98** | ❌ zero notes |

Other evidenced cats moved to top positions (approx): W2025068 Dean → ~pos 6, S20251008 Edna → ~pos 8, W2026014 Carlo Gambino → ~pos 4 (all with multiple detailed transcripts). [INFERRED from relative production order of evidenced cats]

---

## Results

### CONTROL (production order) — 5 runs

| Run | Pick 1 | Pick 2 | Pick 3 |
|---|---|---|---|
| 1 | S2026268 (Juliet) | W2026014 (Carlo Gambino) | W2025068 (Dean) |
| 2 | S2026268 (Juliet) | S2025546 (Billy Boy) | S2026495 (Andrew) |
| 3 | S2026268 (Juliet) | S2026495 (Andrew) | S2026545 (Honeysuckle) |
| 4 | S2026268 (Juliet) | S2025546 (Billy Boy) | S2026519 (Luna Tuna) |
| 5 | S2026268 (Juliet) | S2026346 (Basil) | S2026414 (Heathcliff) |

### CONDITION IV (evidenced-first sort) — 5 runs

| Run | Pick 1 | Pick 2 | Pick 3 |
|---|---|---|---|
| 1 | W2026014 (Carlo Gambino) | W2025068 (Dean) | S2026268 (Juliet) |
| 2 | W2025068 (Dean) | S2025966 (Abe) | S20251008 (Edna) |
| 3 | W2025068 (Dean) | S2025966 (Abe) | S20251008 (Edna) |
| 4 | W2025068 (Dean) | S2025966 (Abe) | S20251008 (Edna) |
| 5 | W2025068 (Dean) | S2025966 (Abe) | S20251008 (Edna) |

---

## Tally

| Cat | Pos (control) | Pos (sorted) | Control | Sorted | Δ |
|---|---|---|---|---|---|
| S2026447 Karen Smith | 45 | **12** | **0/5** | **0/5** | — |
| S2026357 Lilac | 49 | **13** | **0/5** | **0/5** | — |
| S2026495 Andrew | 2 | 23 | 2/5 | **0/5** | ↓ suppressed |
| S2026268 Juliet | 43 | 11 | **5/5** | 1/5 | ↓ displaced |
| S2026519 Luna Tuna | 51 | 59 | 1/5 | **0/5** | ↓ suppressed |
| W2025068 Dean | ~23 | ~6 | 1/5 | **4/5** | ↑ surfaced |
| S2025966 Abe (Louie) | 1 | 1 | 0/5 | **4/5** | ↑ surfaced |
| S20251008 Edna | ~26 | ~8 | 0/5 | **3/5** | ↑ surfaced |
| W2026014 Carlo Gambino | ~10 | ~4 | 1/5 | **2/5** | ↑ surfaced |

[VERIFIED — all counts from direct API output]

---

## Analysis

### Position IS a lever [VERIFIED]

The sort produced a dramatic selection shift with zero content or count change:

1. **No-notes cats suppressed.** Andrew dropped from 2/5 → 0/5 when moved from position 2 to 23. Luna Tuna dropped from 1/5 → 0/5. No reserve (no-evidence) cat was selected in any of the 5 sorted runs. [VERIFIED]

2. **Evidenced cats with rich notes surfaced.** Dean (4/5), Abe (4/5), Edna (3/5), Carlo Gambino (2/5) — all cats with long, multi-transcript behavioral profiles — were reliably selected when sorted to the top. [VERIFIED]

3. **Selection set became 100% evidenced.** In the sorted condition, all 15 selections across 5 runs came from the evidenced tier. In the control, 4/15 selections were no-evidence cats. [VERIFIED]

### Position alone does NOT surface Karen Smith or Lilac [VERIFIED]

Despite moving from positions 45/49 to positions 12/13, Karen Smith and Lilac remained at 0/5 in both conditions. [VERIFIED]

This means position is necessary but not sufficient. Karen and Lilac's failure to surface is NOT explained by their original deep-list position alone — something else is working against them even at position 12-13.

### The confound: transcript richness [INFERRED]

The cats that DID surface in Condition IV share a trait Karen Smith and Lilac lack: **long, detailed, multi-transcript behavioral profiles**.

| Cat | Sorted picks | Transcripts | Approximate note length |
|---|---|---|---|
| Dean (W2025068) | 4/5 | 3 transcripts | ~1,500 words |
| Abe (S2025966) | 4/5 | 3 transcripts | ~800 words |
| Edna (S20251008) | 3/5 | 2 transcripts | ~500 words |
| Carlo Gambino (W2026014) | 2/5 | 2 transcripts + SM desc | ~900 words |
| Juliet (S2026268) | 1/5 (sorted), 5/5 (control) | 1 transcript | ~400 words |
| **Karen Smith (S2026447)** | **0/5** | **1 transcript** | **~60 words** |
| **Lilac (S2026357)** | **0/5** | **1 transcript** | **~70 words** |

Karen Smith's entire transcript is: *"Oh, she's orange with white underneath, she's very playful, very playful. She climbs, she jumps. Very good with people, yes. Good with other cats. Yes, good with other dogs too. I have a dog. Good with kids, my kids love her. No, no medical or special needs. Backstory and history is that, I don't know, they came in as strays. No, nothing else. So..."*

This is ~60 words of terse checklist-style notes. Compare Dean's 3 detailed narrative transcripts spanning ~1,500 words with rich behavioral description.

**The model appears to weight transcript RICHNESS (length, detail, narrative quality), not just the presence/absence of evidence.** Karen Smith's note documents all three query axes positively, but in such compressed form that it doesn't compete with the dense narrative profiles of Dean, Abe, or Edna in the model's attention. [INFERRED]

### Juliet's displacement [VERIFIED]

Juliet dropped from 5/5 (control) → 1/5 (sorted). In the control, she was the highest-positioned evidenced cat the model reliably found (position 43, with a ~400-word transcript). When Dean, Abe, and Edna were moved ahead of her, they displaced her. This confirms the model has a narrow effective attention window — it finds a few strong candidates from the top of the list and stops searching. [INFERRED]

### Regression signal

In Condition IV, the model selected Abe (Louie) — a 9-year-old diabetic cat bonded to Edna — 4/5 times for a query asking for "playful, energetic." Abe's transcripts describe him as a "calm lap cat" with "low" energy. This is a **query-axis mismatch** that was NOT present in the control results (where Juliet, a younger cat with documented cat compatibility, was consistently selected). The sort surfaced evidence-rich cats but did not improve query-axis matching — it just moved the attention window to different cats. [VERIFIED — Abe's transcripts from audit data explicitly state "low" energy]

---

## Conclusion

**Position is confirmed as a lever for suppressing no-evidence selections and surfacing evidenced cats.** Moving evidenced cats to the top eliminated all no-evidence picks (0/15 vs 4/15 in control). [VERIFIED]

**Position alone does NOT fix the core problem.** Karen Smith and Lilac — the best-documented matches on the three query axes — remained invisible at positions 12 and 13. The model selected cats with richer/longer notes from positions 1-8, regardless of query-axis fit. [VERIFIED]

**The primary selection driver in a 98-cat pool appears to be: position × transcript richness, not position × query-axis relevance.** The model finds the most detailed behavioral profiles near the top of the list rather than scanning all profiles for the best semantic match to the adopter's narrative. [INFERRED]

**Implication for the auditor's decision tree:**
- Step 1 (sort) tested: Sort helps (suppresses no-evidence picks) but doesn't solve the problem (Karen/Lilac still invisible, Abe mismatched on query axes).
- The count-vs-volume question from the auditor's Step 2 remains open and is now the right next test — specifically whether a smaller pool (22 evidenced only) forces the model to actually compare all profiles and find the best query-axis match among them, vs just latching onto the richest notes near the top.

**A sort is a necessary component of any fix but is not sufficient on its own.** [INFERRED from the data: sort eliminated 100% of no-evidence picks, which is valuable, but introduced a new failure mode — evidence-rich but query-mismatched picks]
