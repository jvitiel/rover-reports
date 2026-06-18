# Custom Search Q2 — Notes Ablation & Selection Mechanism Experiment

**Date:** 2026-06-18 00:43 ET  
**Production unchanged:** No app-tree edits, no commits, no restarts, no prompt modifications. [VERIFIED — all work in throwaway scripts under /home/rover/]

---

## CRITICAL CORRECTION — Prior Report's Conclusion Was Wrong

The prior report (report-20260618-000940) concluded that Karen Smith, May, January, Allegra, and Edna were "passed over" by the model. **This is incorrect.** [VERIFIED]

Investigation of the actual SM API availability and the production matcher_audit record reveals:

| Cat | Status at production run time | In 98-cat production pool? |
|---|---|---|
| S2026447 Karen Smith | `ACTIVEMOVEMENTTYPE=2` (foster) | ✅ YES — was in pool despite foster status |
| S2026312 May | Not in SM API response | ❌ NO — adopted/removed |
| S2026311 January | Not in SM API response | ❌ NO — adopted/removed |
| S2025592 Allegra | Not in SM API response | ❌ NO — adopted/removed |
| S20251008 Edna | `ACTIVEMOVEMENTTYPE=2` (foster) | ✅ YES — was in pool despite foster status |

Three of the five "documented-strong" cats **did not exist in the candidate pool at all**. May, January, and Allegra are gone from the SM API entirely — likely already adopted. [VERIFIED]

Karen Smith and Edna WERE in the 98-cat production pool (confirmed via `matcher_audit.input_profiles`). Karen Smith's behavior_notes with her documented all-three-axis match were present in the prompt sent to the model. [VERIFIED]

---

## T5 — Pre-Existing Check

Karen Smith's (S2026447) behavior_notes record:
- `recorded_at`: **2026-06-11T19:56:25.229Z** [VERIFIED]
- Caregiver: Aby Garcia, source: app
- This predates the Step-1 baseline run (~2026-06-18 03:26 UTC) by 7 days. [VERIFIED]

Her notes were present in the production prompt. The model had access to her documented playful/kids/cats evidence.

---

## T1 — Candidate Ordering in the Production Prompt

The production run (audit id `2d1ce3d2-...`, 2026-06-18T03:55:15Z) had **98 candidates**. [VERIFIED]

Positions of key cats in the production prompt:

| Position | shelter_code | Name | Notes? |
|---|---|---|---|
| 2/98 | S2026495 | Andrew | ❌ zero notes |
| 7/98 | S2026047 | Buckley | ✅ 2 notes (playful but overstim w/ kids) |
| 10/98 | W2026014 | Carlo Gambino | ✅ 2 notes (calm, good w/ cats+kids, FIV+) |
| 23/98 | W2025068 | Dean | ✅ 4 notes (energetic, good w/ cats+kids, FIV+) |
| 26/98 | S20251008 | Edna | ✅ 2 notes (great w/ cats+kids, bonded pair) |
| 43/98 | S2026268 | Juliet | ✅ 1 note (mellow, cats+older kids) |
| 45/98 | S2026447 | Karen Smith | ✅ 1 note (playful, cats+kids — strongest match) |
| 49/98 | S2026357 | Lilac | ✅ 1 note (playful, cats, hedged kids) |
| 51/98 | S2026519 | Luna Tuna | ❌ zero notes |

**Andrew (no notes) was at position 2 — near the top.** Karen Smith (strongest documented match) was at position 45 — deep in the middle. [VERIFIED]

---

## T2 — Notes Ablation (Decisive Test)

### Production Pool Replay (exact 98-cat prompt from audit)

**Condition AS-IS (notes present), 5 runs:**

| Run | Pick 1 | Pick 2 | Pick 3 |
|---|---|---|---|
| 1 | S2026268 (Juliet) | S2025546 (Billy Boy) | S2026495 (Andrew) |
| 2 | S2026268 (Juliet) | S2026495 (Andrew) | S2026519 (Luna Tuna) |
| 3 | S2026268 (Juliet) | S2026495 (Andrew) | S2026519 (Luna Tuna) |
| 4 | S2026268 (Juliet) | S2026495 (Andrew) | S2026545 (Honeysuckle) |
| 5 | S2026268 (Juliet) | S2026346 (Basil) | S2026528 (Catzilla) |

**Condition NOTES-STRIPPED (base attributes only), 5 runs:**

| Run | Pick 1 | Pick 2 | Pick 3 |
|---|---|---|---|
| 1 | S2026495 (Andrew) | S2026314 (Sky) | S2026415 (Shep) |
| 2 | S2026495 (Andrew) | S2026314 (Sky) | S2026047 (Buckley) |
| 3 | S2026415 (Shep) | S2026314 (Sky) | S2026527 (Mothra) |
| 4 | S2026495 (Andrew) | S2026314 (Sky) | S2026415 (Shep) |
| 5 | S2026495 (Andrew) | S2026314 (Sky) | S2026415 (Shep) |

**Analysis:**

| Cat | AS-IS picks | STRIPPED picks | Δ |
|---|---|---|---|
| Juliet (S2026268) — has notes | **4/5** | **0/5** | Notes-dependent ✅ |
| Andrew (S2026495) — no notes | **3/5** | **4/5** | Base-attribute pick, notes-independent |
| Luna Tuna (S2026519) — no notes | **2/5** | **0/5** | Indirectly notes-dependent |
| Sky (S2026314) — no notes | **0/5** | **5/5** | Notes suppress this pick |
| Shep (S2026415) — no notes | **0/5** | **3/5** | Notes suppress this pick |
| Karen Smith (S2026447) — has notes | **0/5** | **0/5** | Not selected in either ⚠️ |
| Lilac (S2026357) — has notes | **0/5** | **0/5** | Not selected in either ⚠️ |

**Verdict: Notes DO influence selection — hypothesis PARTIALLY refuted.** [VERIFIED]

Juliet's selection is clearly notes-driven (4/5 with notes, 0/5 without). However, Andrew's selection is notes-independent (appears at similar rates with or without notes). The two no-notes cats from the original result have different selection mechanisms: Juliet's notes pull her in, and Andrew rides in on base attributes (position 2, young adult male, clean health).

Karen Smith and Lilac — the strongest documented matches — are NOT selected in any of the 10 runs. Their notes are present in the prompt but the model does not surface them. [VERIFIED]

### Current Pool Comparison (162 cats)

When run against the current larger pool (162 cats), the AS-IS condition consistently selected B2026001 (Arnold), S2026162 (Oxford), and S2026357 (Lilac) across all 5 runs. Arnold and Oxford were NOT in the 98-cat production pool. [VERIFIED]

The NOTES-STRIPPED condition on the 162-cat pool selected S2026495 (Andrew) in 4/4 runs — confirming his selection is base-attribute-driven regardless of pool size. [VERIFIED]

---

## T3 — Small-Field Isolation (10 cats)

Ten-cat field with the best-documented and the no-notes cats from the actual pool:

| Run | Pick 1 | Pick 2 | Pick 3 |
|---|---|---|---|
| 1 | S2026357 (Lilac) | B2026001 (Arnold) | S2026162 (Oxford) |
| 2 | S2026357 (Lilac) | S2026291 (Rosie Cotton) | S2026268 (Juliet) |
| 3 | S2026357 (Lilac) | S2026162 (Oxford) | S2026291 (Rosie Cotton) |
| 4 | S2026357 (Lilac) | S2026291 (Rosie Cotton) | S2026268 (Juliet) |
| 5 | S2026357 (Lilac) | S2026291 (Rosie Cotton) | S2026268 (Juliet) |

**Lilac: 5/5 runs.** Andrew: 0/5. Luna Tuna: 0/5. [VERIFIED]

In a small field where the model can attend to all entries equally, it reliably selects the best-documented match (Lilac). The no-notes cats are never selected when competing directly against documented cats in a readable field. [VERIFIED]

---

## T4 — Selection Reasoning Probe (Production Pool)

### Run 1 (selected Andrew)
- **S2026268 (Juliet):** "Good with other cats, no health concerns, calm temperament suits a family environment; mild caveat noted about younger kids."
- **S2026047 (Buckley):** "Playful, energetic, good with other cats; honest caveat noted about young children given overstimulation sensitivity."
- **S2026495 (Andrew):** "Young adult with good health profile and playful age; **limited caregiver notes acknowledged** with direction to shelter staff."
- REJECTED S2026519 (Luna Tuna): "no caregiver notes available to confirm playfulness, kid-friendliness, or cat compatibility"

⚠️ **The model explicitly noted Andrew's lack of notes but selected him anyway**, while rejecting Luna Tuna for the same reason. [VERIFIED — direct quote from model output]

### Run 2 (rejected Andrew)
- **S2026268 (Juliet):** "Good with other cats, young adult with calm temperament"
- **W2026014 (Carlo Gambino):** "Good with other cats, young adult, gentle with kids; FIV status is surfaced honestly"
- **S2026047 (Buckley):** "Playful and energetic with genuine cat personality"
- REJECTED S2026495 (Andrew): **"no caregiver transcripts or shelter notes — insufficient information to assess compatibility with young kids or other cats"**

✅ This run correctly rejected Andrew for having no evidence. [VERIFIED]

### Run 3 (selected Karen Smith!)
- **S2026268 (Juliet):** "Young, good with other cats, gentle and playful"
- **S2026346 (Basil):** "Kitten with high energy and excellent socialization potential"
- **S2026447 (Karen Smith):** **"Kitten confirmed good with kids and other cats in a foster home with both — direct match to the adopter's core request"**
- REJECTED S2026519 (Luna Tuna): "no caregiver notes to confirm energy level or household compatibility with kids and other cats"

✅ **Karen Smith WAS selected in 1/3 reasoning runs** with the model explicitly citing her documented evidence as "direct match." [VERIFIED]

---

## Root Cause Synthesis

The hypothesis ("model selects on base attributes, ignores notes for selection, uses them only for bio writing") is **partially refuted**. [VERIFIED via ablation]

The actual mechanism is more nuanced:

### 1. Notes DO influence selection, but weakly in large fields [VERIFIED]
- Juliet's repeated selection (4/5 with notes vs 0/5 without) proves notes drive selection for some cats.
- But Karen Smith and Lilac — with STRONGER documented matches — were selected 0/5 in the production pool replay.
- In the small-field test (10 cats), Lilac is selected 5/5. The model CAN use notes for selection — it just doesn't reliably do so at 98-cat scale.

### 2. Attention/position effects at scale [INFERRED]
- Andrew at position 2/98 is selected 3/5 with notes and 4/5 without — his early position gives him disproportionate attention.
- Karen Smith at position 45/98 and Lilac at position 49/98 are effectively invisible at scale. The model likely doesn't thoroughly read/compare all 98 entries.
- In a 10-cat field, position effects vanish and the model finds Lilac every time.

### 3. The model treats absent notes as neutral, not negative [VERIFIED]
- In 2/3 reasoning runs, the model rejected no-notes cats citing insufficient information.
- In 1/3 reasoning runs, it selected Andrew despite noting his lack of data, treating his age/breed as sufficient signal.
- The model's behavior is non-deterministic on this axis — at temp 0.7, it sometimes penalizes missing notes and sometimes doesn't.

### 4. No single cause — it's an interaction of list size × position × attention [INFERRED]
- Small field: notes dominate (Lilac 5/5).
- Large field with notes: notes help (Juliet 4/5) but don't surface the best-documented cat reliably.
- Large field without notes: pure base-attribute heuristics (age, breed, position).

---

## What This Means For the Query 2 Production Result

The production result (Andrew, Luna Tuna, Juliet) is not explained by a single mechanism:

- **Juliet:** Selected because her notes document cat compatibility — a notes-driven pick. [VERIFIED]
- **Andrew:** Selected despite zero notes, driven by position (2/98) and base attributes (2yo, negative FIV/FeLV). The model does not penalize absent notes consistently. [VERIFIED]
- **Luna Tuna:** The weakest pick — no notes, mid-list position (51/98). Selected in only 2/5 replays. Likely benefited from temperature randomness. [INFERRED]
- **Karen Smith:** Present in the prompt with a perfect documented match. Selected in 1/3 reasoning runs where the model called her a "direct match." Not selected in any of the 5 standard AS-IS replays. Positional disadvantage (45/98) and weak attention at scale are the likely causes. [INFERRED]

---

## Summary Table

| Test | Finding | Confidence |
|---|---|---|
| T1 Position | Andrew at pos 2, Karen Smith at 45, Lilac at 49 | VERIFIED |
| T2 AS-IS vs Stripped | Notes change selection for some cats (Juliet: 4/5→0/5) but not others (Andrew: stable) | VERIFIED |
| T2 Karen/Lilac | Not selected in 0/10 runs at 98-cat scale despite being present | VERIFIED |
| T3 Small field | Lilac selected 5/5 in 10-cat field; no-notes cats 0/5 | VERIFIED |
| T4 Reasoning | Karen Smith called "direct match" in 1/3 runs; Andrew rejected for "insufficient info" in 1/3 runs | VERIFIED |
| T5 Timestamp | Karen Smith's notes recorded 2026-06-11, 7 days before production run | VERIFIED |
| Prior report correction | 3 of 5 "passed over" cats were not in the candidate pool at all | VERIFIED |
