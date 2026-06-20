# Does low_confidence Track Relevance or Only Inventory Gaps?

**Date:** 2026-06-20 07:40 ET  
**Type:** READ-ONLY TEST  
**Method:** 12 live endpoint queries (6 tests × 2 runs each)  
**Source:** Real `/api/matcher/custom-search` endpoint

---

## Answer

**`low_confidence` tracks INVENTORY GAPS (physically impossible attributes), NOT relevance or selection correctness.** It fires when Phase-1 detects the ask is literally impossible (40-lb cat that barks, green cat, hairless-and-fluffy) but stays FALSE when the selection is wrong per SEL-RULE5 (orange cat returned for "black cat" request). The honesty signal does not cover selection errors. [VERIFIED]

**Test 6 (the key one): "a black cat that is fun" → `low_confidence: false`, preamble: none.** Orange Karen Smith in slot 1. Phase-1 confidently returns a wrong-color match with no warning to the adopter. [VERIFIED]

---

## Results Matrix

| # | Query | low_confidence | Correct? | What it detects |
|---|-------|---------------|----------|-----------------|
| 1 | "purple flying unicorn that speaks French" | **false** ❌ | NO — nonsense ask, 3 random cats | Nothing — total nonsense undetected |
| 2 | "40-pound cat that barks like a dog" | **true** ✅ | YES — acknowledged impossible | Physically impossible attributes |
| 3 | "tiny giant hairless and fluffy" | **true** ✅ | YES — acknowledged contradictory | Contradictory physical attributes |
| 4 | "bright green cat" | **true** ✅ | YES — acknowledged no green cats | Absent color in inventory |
| 5 | "cat that can do backflips on command" | **split** (1× false, 1× true) | Inconsistent | Sometimes catches impossible behavior |
| 6 | "a black cat that is fun" | **false** ❌ | NO — orange Karen Smith in slot 1 | **Does NOT catch wrong-color match** |

### What low_confidence catches vs misses:

| Scenario | Fired? | Category |
|----------|--------|----------|
| Impossible physical attribute (40 lbs, barks) | ✅ true | Inventory gap (attribute can't exist) |
| Contradictory attributes (hairless + fluffy) | ✅ true | Logical impossibility |
| Non-existent color (green) | ✅ true | Inventory gap (color absent) |
| Total nonsense (purple unicorn) | ❌ false | **MISS** — not recognized as unmatchable |
| Impossible behavior (backflips) | ⚠️ split | Inconsistent detection |
| Wrong-color match via SEL-RULE5 | ❌ false | **MISS** — selection error invisible |
| Fallback expansion (Snowie case) | ✅ true | Inventory gap (forced by `usedFallback` flag) |

---

## Detailed Results

### Test 1: "a purple flying unicorn that speaks French" — NONSENSE

| Run | low_confidence | Preamble | Picks |
|-----|---------------|----------|-------|
| 1 | **false** | none | Abe (black-white), Edna (white-black), Reeboks (orange) |
| 2 | **false** | none | Abe, Edna, Reeboks |

**NOT DETECTED.** Phase-1 treats the nonsense narrative as "no meaningful preference" and returns its default documented-cat picks (Abe/Edna/Reeboks — the same cats selected for many no-preference queries). No warning to the adopter. The response reads as if the shelter confidently matched their request. [VERIFIED]

**Note:** These are the same 3 cats returned for many other queries (code filter, count override, backflip) — they appear to be Phase-1's "default" picks when it has no meaningful matching signal.

### Test 2: "a cat that is 40 pounds and barks like a dog" — IMPOSSIBLE

| Run | low_confidence | Preamble |
|-----|---------------|----------|
| 1 | **true** ✅ | "We don't currently have any cats matching that description — the cats in our care are, as cats tend to be, firmly in the…" |
| 2 | **true** ✅ | "The cats currently in our care are, of course, cats — so none of them weigh 40 pounds or bark!" |

**CORRECTLY DETECTED.** Phase-1 recognized the attributes are physically impossible for cats and flagged honestly. The preamble is clear and helpful. [VERIFIED]

### Test 3: "a tiny giant cat that is both hairless and very fluffy" — CONTRADICTORY

| Run | low_confidence | Preamble |
|-----|---------------|----------|
| 1 | **true** ✅ | "The cats currently in our care don't quite match — none are hairless, and none are unusually fluffy…" |
| 2 | **true** ✅ | Same |

**CORRECTLY DETECTED.** Phase-1 caught the logical contradiction. [VERIFIED]

### Test 4: "a bright green cat" — ABSENT COLOR

| Run | low_confidence | Preamble | Picks |
|-----|---------------|----------|-------|
| 1 | **true** ✅ | "don't include a green cat — that's not a color that comes up in feline coats!" | Karen Smith, Gretchen Wieners, Frodo (all orange-ish) |
| 2 | **true** ✅ | "green isn't a natural coat color for cats" | Same picks |

**CORRECTLY DETECTED.** Phase-1 recognized green isn't a real cat color. Interesting: it selected orange cats — the "brightest" color available, as if trying to approximate "bright green." [VERIFIED]

### Test 5: "a cat that can do backflips on command" — IMPOSSIBLE BEHAVIOR

| Run | low_confidence | Preamble |
|-----|---------------|----------|
| 1 | **false** ❌ | none |
| 2 | **true** ✅ | "No cats currently in our care can do backflips on command" |

**INCONSISTENT.** Run 1 failed to catch the impossibility; run 2 caught it. This is temperature-driven inconsistency at the detection boundary — "backflips" is borderline absurd (a very playful cat MIGHT do something vaguely flippy). Phase-1's impossibility detection is probabilistic, not deterministic. [VERIFIED]

### Test 6: "a black cat that is fun" — THE SEL-RULE5 CASE

| Run | low_confidence | Preamble | Slot 1 | Slot 1 color |
|-----|---------------|----------|--------|-------------|
| 1 | **false** ❌ | none | Karen Smith | **Orange** ❌ |
| 2 | **false** ❌ | none | Karen Smith | **Orange** ❌ |

**NOT DETECTED.** Phase-1 returns orange Karen Smith for a "black cat" request with full confidence. No preamble. No warning. The adopter has no indication that the top pick doesn't match their color request. [VERIFIED]

**This is the critical finding.** The `low_confidence` signal doesn't fire on the SEL-RULE5 personality-over-color override because Phase-1 doesn't consider it a MISMATCH — it considers the personality match (Karen Smith = "very playful") a BETTER answer than a color match. From Phase-1's perspective, the selection IS confident. The prompt's rule 5 ("A documented behavioral match with a minor attribute miss can outrank…") explicitly permits this.

---

## Analysis: What low_confidence Actually Measures

### The low_confidence prompt instruction (customSearchSelect.ts:78-80):

```
LOW CONFIDENCE:
- Set low_confidence to true ONLY when the inventory genuinely cannot meet 
  the adopter's core request — e.g., they want a specific breed and none 
  exist, or they want a kitten and none are under 1 year, or none of your 
  3 picks substantively match the key ask.
```

The key phrase is **"the inventory genuinely cannot meet the adopter's core request."** Phase-1 interprets this as:
- ✅ No green cats → inventory can't meet color request → true
- ✅ 40-lb barking cat → inventory can't meet physical request → true  
- ❌ "Black cat that is fun" → inventory HAS black cats AND fun cats → false (even though it selected a fun non-black cat over a less-fun black cat)

Phase-1 does NOT consider "I had black cats but chose an orange one instead" as an inventory gap. And rule 5 tells it that the orange pick IS a substantive match (on personality). So low_confidence stays false.

### The three-tier detection model:

| Tier | What it catches | low_confidence |
|------|----------------|---------------|
| **Physically impossible** | 40-lb cat, green cat, barking cat | ✅ true |
| **Inventory absent** | Specific breed/age not in pool | ✅ true (also forced by `usedFallback`) |
| **Selection error** | Wrong color/size/coat via rule-5 override | ❌ **false** — invisible |

### Why this matters:

The adopter sees:
- 3 cats with bios
- `low_confidence: false`
- No preamble warning

They have NO SIGNAL that the top cat doesn't match their color request. For "a black cat," Karen Smith's bio will describe an orange tabby — the adopter has to READ the bio to discover the mismatch. The system doesn't flag it.

Compare to the fallback case (Snowie, report -063000): when fallback fires, the server forces `low_confidence: true` and the preamble explicitly says "we dropped your age filter." That's honest. But when rule-5 overrides a color request, there's no equivalent honesty mechanism.

---

## Summary

| Question | Answer |
|----------|--------|
| Does low_confidence track relevance? | **NO** — tracks inventory gaps only |
| Does it fire on SEL-RULE5 wrong-color? | **NO** — false both runs, no preamble |
| Does it fire on total nonsense? | **NO** — "purple unicorn" returns false |
| Does it fire on physical impossibility? | **YES** — 40-lb cat, green cat, contradictions |
| Is detection deterministic? | **NO** — "backflips" split 1× false / 1× true |

### Fix Direction

The low_confidence definition needs expansion. Currently it fires only on "inventory genuinely cannot meet the request." It should also fire when:

1. **A stated physical attribute is not satisfied by any pick:** If the adopter says "black" and none of the 3 picks are black → low_confidence: true with preamble explaining the color gap.
2. **Total nonsense is detected:** If the narrative contains no matchable signal → low_confidence: true.

This would require the prompt to CHECK its own picks against the stated attributes BEFORE setting low_confidence — essentially a self-audit step. The current prompt asks Phase-1 to set low_confidence based on inventory assessment, not pick assessment.
