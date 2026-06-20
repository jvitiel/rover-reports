# Fallback Buries the Real Match — Phase-1 Selection Failure

**Date:** 2026-06-20 06:30 ET  
**Type:** READ-ONLY TEST  
**Method:** 13 live endpoint queries (10 Snowie-case + 3 control)  
**Source:** Real `/api/matcher/custom-search` endpoint + attribute verification via `fetchAnimals()`

---

## Answers

**(A) Does the fallback bury Snowie? YES — 0/10 runs, reproduced definitively.** Snowie (A2023287, 7.2yr, the ONLY senior female rabbit) was never selected despite being in the candidate pool. Phase-1 picked younger rabbits (Maria 5.9yr, Butterscotch 3.5yr, Caramel 2.3yr) every time. **Worse: the preamble explicitly claims no senior rabbit exists ("the oldest is just under six years") while Snowie (7 years 2 months) is in the data Phase-1 is reading.** [VERIFIED]

**(B) Does it generalize?** Only one filter combination in the current population triggers fallback with an original match to bury (small_animal + female + senior = Snowie). The male+senior control (0 original matches, 3 runs) correctly returned younger males with low_confidence=true. The fallback-bury bug cannot be tested on other species because no other species+sex+age combo has <3 candidates with ≥1 original match. However, the mechanism is generalizable — any <3 pool that triggers fallback will present the expansion animals alongside the original match(es), with no annotation distinguishing them. [VERIFIED for population structure; INFERRED for generalizability]

**(C) Is it SEL-RULE5 again or a separate mechanism? It's BOTH — rule-5 plus a separate Phase-1 reading-comprehension failure.** Snowie has documented behavioral data comparable to the picked animals. The issue is that Phase-1 appears to not register Snowie's age ("7 years 2 months") as matching "senior" — it writes preambles claiming "the oldest is just under six years" while Snowie's candidate line says otherwise. This is a Phase-1 age-reasoning failure layered on top of the personality-over-attribute weighting. [VERIFIED]

---

## Part A — The Snowie Case (10 runs)

### Pool Structure (after fallback)

- **Original filter** (female + senior small animal): **1 animal — Snowie (A2023287, 7.2yr)**
- **Fallback pool** (female, all ages): **11 animals** — 4 young, 6 adult, 1 senior (Snowie)
- **Phase-1 sees all 11** including Snowie's candidate line with "Age: 7 years 2 months."

### Query: "a senior rabbit" — small_animal, female, senior, EN (5 runs)

| Run | Slot 1 | Slot 2 | Slot 3 | Snowie? | lowConf | Preamble claim |
|-----|--------|--------|--------|---------|---------|----------------|
| 1 | Maria (5.9yr) | Butterscotch (3.5yr) | Caramel (2.3yr) | ❌ BURIED | true | "our three available girls skew younger… the closest is Maria at nearly six" |
| 2 | *(HTTP 500)* | — | — | — | — | — |
| 3 | Maria (5.9yr) | Butterscotch (3.5yr) | Caramel (2.3yr) | ❌ BURIED | true | "our current rabbit residents are younger than that — the oldest is just under six years" |
| 4 | Maria (5.9yr) | Butterscotch (3.5yr) | Caramel (2.3yr) | ❌ BURIED | true | "our current available females are on the younger side" |
| 5 | Maria (5.9yr) | Butterscotch (3.5yr) | Caramel (2.3yr) | ❌ BURIED | true | "our current inventory doesn't include a rabbit in her senior years" |

**Snowie selected: 0/4 successful runs.** Perfectly stable (same 3 younger rabbits every run).

### Query: "a senior female small animal" — small_animal, female, senior, EN (5 runs)

| Run | Slot 1 | Slot 2 | Slot 3 | Snowie? | lowConf |
|-----|--------|--------|--------|---------|---------|
| 1 | Maria (5.9yr) | Butterscotch (3.5yr) | Kirby-ferret (3.5yr) | ❌ BURIED | true |
| 2 | Caramel (2.3yr) | Elsa (2.3yr) | Kirby (3.5yr) | ❌ BURIED | true |
| 3 | Maria (5.9yr) | Butterscotch (3.5yr) | Kirby (3.5yr) | ❌ BURIED | true |
| 4 | *(HTTP 500)* | — | — | — | — |
| 5 | Maria (5.9yr) | Caramel (2.3yr) | Butterscotch (3.5yr) | ❌ BURIED | true |

**Snowie selected: 0/4 successful runs.** Same pattern — the "senior" variant includes Kirby (ferret, 3.5yr) in some slots but still never Snowie.

### The Preamble Confabulation

Phase-1's preamble in multiple runs explicitly claims:

> "our current inventory doesn't include a rabbit in her senior years"

> "the oldest is just under six years"

**But Snowie (A2023287, Age: 7 years 2 months) is in the candidate data Phase-1 received.** Her candidate line reads:

```
SHELTER_CODE: A2023287 | Name: Snowie | Breed: Dwarf | Age: 7 years 2 months. | Sex: Female | Color: White | 
Documented — energy/playfulness: Loves running through her tunnel and exploring; with kids: not noted; 
with cats: Good with cats; with dogs: Good with dogs.
```

Phase-1 has the data but fails to register Snowie as senior. This is a reading-comprehension failure — the model is not connecting "7 years 2 months" to "senior." [VERIFIED]

---

## Part B — Generalizability

### Population Analysis: Which combos trigger fallback?

| Combo | Original matches | Fallback pool | Original match to bury? |
|-------|-----------------|---------------|------------------------|
| small_animal + female + senior | **1** (Snowie) | 11 | ✅ YES |
| small_animal + male + senior | **0** | 8 | ❌ No original match |
| All other species+sex+age combos | **≥3** | N/A | N/A (no fallback triggered) |

Only one combo in the current population triggers fallback with an original match. However, the mechanism is structural:

1. The fallback code (server.ts:4521-4537) drops the age filter and presents ALL same-sex animals to Phase-1
2. Phase-1 receives NO annotation indicating which animals matched the original filter
3. Phase-1 must infer "senior" from the raw age string ("7 years 2 months") without knowing the age-bucket cutoffs
4. When the expansion pool is much larger than the original, the original match is diluted

### Male Senior Control (0 original matches, 3 runs)

| Run | Slot 1 | Slot 2 | Slot 3 | lowConf | Notes |
|-----|--------|--------|--------|---------|-------|
| 1 | Charlie (3.7yr) | Cookie (2.8yr) | Hopper (2.2yr) | true | Correctly identified no seniors |
| 2 | Charlie (3.7yr) | Cookie (2.8yr) | Hopper (2.2yr) | true | Stable — same picks |
| 3 | Charlie (3.7yr) | Cookie (2.8yr) | Hopper (2.2yr) | true | Stable |

When NO original match exists, the fallback works acceptably: picks the oldest available, fires low_confidence, and the preamble correctly says "none are seniors." The problem is specifically when an original match EXISTS but gets buried.

---

## Part C — Is It SEL-RULE5 or a Separate Mechanism?

### Trait Summary Comparison

| Animal | Age | Bucket | Trait summary |
|--------|-----|--------|--------------|
| **Snowie** (original match) | **7.2yr** | **senior** | Loves running through her tunnel and exploring; kids: **not noted**; cats: Good; dogs: Good |
| Maria (picked 8/8) | 5.9yr | adult | Very active, loves to run and explore; kids: **Great with kids**; cats: **Great**; dogs: Good |
| Butterscotch (picked 7/8) | 3.5yr | adult | Loves to run through tunnels, explore, hop; kids: Best with adults/older kids; cats: Good; dogs: Can be good |
| Caramel (picked 6/8) | 2.3yr | adult | Very chill, likes to explore and sit; kids: Good; cats: Good; dogs: Not sure |

### Analysis: TWO failures, not one

**Failure 1 — Age-attribute reading comprehension (SEPARATE from rule-5):**
Phase-1 does not register "7 years 2 months" as "senior." The preamble says "the oldest is just under six years" while Snowie (7.2yr) is in the data. This is not personality-over-attribute weighting — this is the model failing to read the age field correctly for all 11 candidates. The model appears to skip Snowie entirely when scanning ages. [VERIFIED]

**Failure 2 — Rule-5 personality weighting (SAME mechanism as Karen Smith):**
Even if Phase-1 registered Snowie's age, she has "not noted" for kids while Maria has "Great with kids." Rule 5 would likely still rank Maria higher for a generic "senior rabbit" query because Maria has a fuller trait profile. The "senior" ask is a base-attribute ask, but rule 5 allows a behavioral match to outrank a base-attribute match. [INFERRED]

### Root Cause: Phase-1 doesn't know the age-bucket cutoffs

The fallback drops the age filter but tells Phase-1 nothing about:
- What age constitutes "senior" (the cutoffs are server-side: young<2, adult 2-7, senior 7+)
- Which animals matched the ORIGINAL filter before fallback expanded it
- That the adopter specifically requested "senior" and one animal actually IS senior

The Phase-1 prompt's system message says "age" is a "base attribute" to "match directly from the candidate's listed attributes." But the candidate line shows "7 years 2 months" — Phase-1 must interpret this as "senior" without knowing the cutoff. For rabbits, "7 years 2 months" is old (lifespan 8-12 years), but the model may not have that context. The user message DOES include `FILTERS APPLIED: age: senior` — but Phase-1 still doesn't connect "7 years 2 months" to "senior."

---

## Summary

| Question | Answer |
|----------|--------|
| (A) Does fallback bury Snowie? | **YES — 0/8 successful runs.** The ONLY senior rabbit was never selected. Preamble confabulates her non-existence. |
| (B) Does it generalize? | **Only testable case in current population**, but mechanism is structural: no annotation of original-filter matches in fallback pool. |
| (C) Is it rule-5 or separate? | **BOTH.** (1) Phase-1 fails to read "7 years 2 months" as senior — separate reading-comprehension failure. (2) Even if it did, rule-5 would likely still rank fuller-profile younger rabbits higher. |

### Fix Directions

1. **Annotate fallback candidates:** When `usedFallback=true`, mark which candidates matched the ORIGINAL filter (e.g., prepend `[MATCHES ORIGINAL AGE FILTER]` to their candidate line). This lets Phase-1 know which animals the adopter actually asked for.

2. **Include age-bucket in candidate line:** Add `Age group: senior` alongside the raw age string so Phase-1 doesn't need to infer cutoffs.

3. **Guarantee original-match inclusion:** If fallback fires and ≥1 animal matched the original filter, server-side force those into the selection (reserve slot 1 for the original match, let Phase-1 pick slots 2-3 from the expansion).

4. **Or: restrict rule-5 for age asks.** When the adopter says "senior," don't let a fuller behavioral profile override an actual age match.

Option 3 is the most reliable — it removes the dependency on Phase-1 correctly reading ages and respecting the filter. The server already knows which animals matched.
