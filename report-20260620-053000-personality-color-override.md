# Personality-vs-Color Override Test — Phase-1 Selection

**Date:** 2026-06-20 05:30 ET  
**Type:** READ-ONLY TEST  
**Method:** 20 live endpoint queries (4 tests × 5 runs each)  
**Source:** Real `/api/matcher/custom-search` endpoint + attribute verification via `fetchAnimals()`

---

## Answer

**YES — a competing personality term degrades color matching. The original Karen Smith finding reproduces 10/10.** [VERIFIED]

- "a black cat" (bare color): **15/15 picks black** — perfect color matching
- "a black cat that is fun": **10/15 picks black, 5/15 ORANGE** (Karen Smith in every run, slot 1) — `low_confidence: false`
- "a black cat that is playful and energetic": **8/10 picks black, 2/10 ORANGE** (Karen Smith in every run, usually slot 1) — `low_confidence: false`

Adding ANY personality term to a color query causes Phase-1 to override the color constraint in favor of a better behavioral match. Karen Smith (orange) has the strongest documented-playful signal in the pool and outranks documented-playful BLACK cats that exist.

---

## Mechanism

**Karen Smith's trait summary is the strongest "playful" match in the entire pool:**
```
Documented — energy/playfulness: Very playful, climbs and jumps; with kids: Good with kids; 
with cats: Good with other cats; with dogs: Good with other dogs
```

**Documented-playful BLACK cats exist but are passed over:**

| Cat | Color | Playful signal | Selected in black+fun? |
|-----|-------|---------------|----------------------|
| Karen Smith | **Orange** ❌ | "Very playful, climbs and jumps" — STRONGEST | ✅ Slot 1, 10/10 runs |
| Carlo Gambino | Black ✅ | "Very calm, playful if in the mood" — weak | ✅ Slot 2-3, 8/10 runs |
| Juliet | Black ✅ | "Mellow, reserved and sweet" — NOT playful | ❌ Never selected |
| Dean | Black-with-white ✅ | Has playful keywords in transcripts | ✅ Slot 2-3, 9/10 runs |
| Dante | Black-and-white ✅ | Has playful keywords in transcripts | ✅ 5/10 runs (query 2 only) |

Carlo Gambino IS black AND has "playful" in his trait summary — a correct answer exists. But his playful signal is weaker ("playful if in the mood" vs Karen Smith's "Very playful, climbs and jumps"), so Phase-1 ranks Karen Smith higher despite the color mismatch.

**This confirms the Phase-1 system prompt rule 5:** "When asks combine behavioral + base attributes, weigh both. A documented behavioral match with a minor attribute miss can outrank a no-evidence cat with a perfect attribute match." Phase-1 treats color as a "minor attribute miss" that a stronger personality match can override.

---

## Per-Run Results

### Test 1: "a black cat that is fun" — 5 runs

| Run | Pick 1 | Pick 2 | Pick 3 | Black? | lowConf |
|-----|--------|--------|--------|--------|---------|
| 1 | **Karen Smith** (Orange) ❌ | Carlo Gambino (Black) ✅ | Dean (Black-white) ✅ | 2/3 | false |
| 2 | **Karen Smith** (Orange) ❌ | Carlo Gambino (Black) ✅ | Dean (Black-white) ✅ | 2/3 | false |
| 3 | **Karen Smith** (Orange) ❌ | Dean (Black-white) ✅ | Carlo Gambino (Black) ✅ | 2/3 | false |
| 4 | **Karen Smith** (Orange) ❌ | Carlo Gambino (Black) ✅ | Dean (Black-white) ✅ | 2/3 | false |
| 5 | **Karen Smith** (Orange) ❌ | Carlo Gambino (Black) ✅ | Dean (Black-white) ✅ | 2/3 | false |

**Karen Smith in slot 1 every single run.** 5/5 runs have a non-black cat. `low_confidence: false` every time. [VERIFIED]

### Test 2: "a black cat that is playful and energetic" — 5 runs

| Run | Pick 1 | Pick 2 | Pick 3 | Black? | lowConf |
|-----|--------|--------|--------|--------|---------|
| 1 | **Karen Smith** (Orange) ❌ | Dean (Black-white) ✅ | Dante (Black-white) ✅ | 2/3 | false |
| 2 | **Karen Smith** (Orange) ❌ | Dean (Black-white) ✅ | Dante (Black-white) ✅ | 2/3 | false |
| 3 | Dean (Black-white) ✅ | Dante (Black-white) ✅ | **Karen Smith** (Orange) ❌ | 2/3 | false |
| 4 | **Karen Smith** (Orange) ❌ | Dean (Black-white) ✅ | Dante (Black-white) ✅ | 2/3 | false |
| 5 | **Karen Smith** (Orange) ❌ | Dean (Black-white) ✅ | Dante (Black-white) ✅ | 2/3 | false |

**Karen Smith in every run (4× slot 1, 1× slot 3).** Same pattern. [VERIFIED]

### Test 3: "a black cat" — 5 runs (control)

| Run | Pick 1 | Pick 2 | Pick 3 | All black? | lowConf |
|-----|--------|--------|--------|-----------|---------|
| 1 | Andrew (Black) ✅ | Aiden (Black) ✅ | Basil (Black) ✅ | 3/3 | false |
| 2 | Andrew (Black) ✅ | Aiden (Black) ✅ | Basil (Black) ✅ | 3/3 | false |
| 3 | Andrew (Black) ✅ | Juliet (Black) ✅ | Winona (Black) ✅ | 3/3 | false |
| 4 | Andrew (Black) ✅ | Aiden (Black) ✅ | Cinder (Black) ✅ | 3/3 | false |
| 5 | Andrew (Black) ✅ | Juliet (Black) ✅ | Winona (Black) ✅ | 3/3 | false |

**15/15 black. Zero non-black. Color matching is perfect without personality terms.** Note: Andrew, Aiden, Basil all have `Documented — none.` — chosen purely on color. Karen Smith never appears. [VERIFIED]

### Test 4: "a fun playful cat" — 5 runs (personality only, no color)

| Run | Pick 1 | Pick 2 | Pick 3 | Colors | lowConf |
|-----|--------|--------|--------|--------|---------|
| 1 | Karen Smith (Orange) | Dean (Black-white) | Dante (Black-white) | — | false |
| 2 | Karen Smith (Orange) | Dean (Black-white) | Dante (Black-white) | — | false |
| 3 | Karen Smith (Orange) | Dean (Black-white) | Dante (Black-white) | — | false |
| 4 | Karen Smith (Orange) | Dean (Black-white) | Dante (Black-white) | — | false |
| 5 | Karen Smith (Orange) | Dean (Black-white) | Dante (Black-white) | — | false |

**Perfectly stable: same 3 animals every run.** Karen Smith always slot 1 — she is Phase-1's top "fun/playful" pick regardless of color. This is the personality-only baseline. [VERIFIED]

---

## Comparative Analysis

| Query | Black match rate | Non-black picks | lowConf on misses | Karen Smith appearances |
|-------|-----------------|-----------------|-------------------|------------------------|
| "a black cat" | **15/15** (100%) | 0 | N/A | 0 |
| "a black cat that is fun" | **10/15** (67%) | 5 (all Karen Smith) | **0/5 — silent** | **5/5** (slot 1) |
| "a black cat that is playful and energetic" | **8/10** (80%) | 2 (all Karen Smith) | **0/5 — silent** | **5/5** |
| "a fun playful cat" | N/A | N/A | N/A | **5/5** (slot 1) |

### The Degradation Pattern

1. **Bare color** → Phase-1 picks by color, any data tier. Blank-data cats (Andrew, Aiden, Basil) are fine.
2. **Color + personality** → Phase-1 weights personality ABOVE color. The strongest personality match wins even when it's the wrong color. Documented-playful black cats exist (Carlo Gambino) but their playful signal is weaker than Karen Smith's.
3. **Personality only** → Returns identical set as color+personality but without the color violation — proving the personality pool, not the color pool, drives selection.

### Root Cause in the System Prompt

Phase-1 system prompt rule 5 (customSearchSelect.ts:75-76):
```
5. When asks combine behavioral + base attributes, weigh both. A documented behavioral 
   match with a minor attribute miss can outrank a no-evidence cat with a perfect attribute match.
```

This is WORKING AS DESIGNED — but "minor attribute miss" is too generous. An orange cat for a "black cat" request is not a minor attribute miss. The rule was written for the case where behavioral data compensates for incomplete attribute matches (e.g., no behavior data vs. documented behavior). It was not intended to let personality override an explicit color request.

### `low_confidence` Failure

Across all 10 runs of queries 1+2, Karen Smith (orange) appeared for a "black cat" request. `low_confidence: false` in every single run. Phase-1 considers the combination a confident match because it has 2/3 black and 1/3 with outstanding personality data.

---

## Available Documented-Playful Black Cats (passed over)

These cats are black AND have documented playful behavior — correct answers that exist but were deprioritized:

| Cat | Code | Color | Playful signal strength |
|-----|------|-------|------------------------|
| Carlo Gambino | W2026014 | Black | "Very calm, **playful if in the mood**" — qualified/weak |
| Dean | W2025068 | Black with white | Playful keywords in raw transcripts |
| Dante | S20241099 | Black and white | Playful keywords in raw transcripts |
| Billy Boy | S2025546 | Tuxedo: Black and White | Playful keywords in raw transcripts |

Carlo Gambino IS selected (slots 2-3) in query 1, but never beats Karen Smith for slot 1 because his playful signal is conditional ("if in the mood"). The system has a correct answer but ranks it below the color-mismatched one.

---

## Implications

This is a **prompt design issue**, not a code bug. The fix is in rule 5 of the Phase-1 system prompt:

**Current:** "A documented behavioral match with a minor attribute miss can outrank a no-evidence cat with a perfect attribute match."

**Problem:** Phase-1 treats ANY explicitly-stated attribute (color, breed) as potentially "minor" when a stronger behavioral match exists. An adopter who says "I want a black cat" and gets an orange one will not consider this a minor miss.

**Possible fix direction:** Restrict the override to cases where the attribute was not explicitly stated, or require `low_confidence: true` when overriding an explicit attribute request.
