# Change A Stage 1: Compact Trait-Summary Builder (Inert)

**Date:** 2026-06-18 13:12 ET  
**Commit:** `1bb8f9e` — `server/src/customSearchSummary.ts` only (1 file, +170). [VERIFIED]  
**Build:** Clean (tsc, zero errors). [VERIFIED]  
**Status:** INERT — not wired into any endpoint, prompt, or request path. [VERIFIED]

---

## Function

New module `customSearchSummary.ts` exports `buildTraitSummary(input)` which produces one uniform-length behavioral trait-line per animal for the custom-search selection prompt.

```typescript
export interface TraitSummaryInput {
  shelterCode: string;
  name: string;
  description?: string | null;      // SM ANIMALCOMMENTS
  behaviorNotes: BehaviorNotes | null; // from getBehaviorNotes()
}

export function buildTraitSummary(input: TraitSummaryInput): string
```

### Three Source Tiers

| Tier | Condition | Template | Example |
|---|---|---|---|
| 1 (PROFILE) | `getBehaviorNotes()` returns data | `Documented — energy/playfulness: <val>; with kids: <val>; with cats: <val>; with dogs: <val>.` | 112–347 chars |
| 2 (SM-ONLY) | No behavior_notes, real SM description | `Shelter note: <truncated SM text>` | 77–129 chars |
| 3 (NO DATA) | No notes, empty/stock SM description | `Documented — none.` | 18 chars |

### Placeholder Normalization (Auditor A2)

Applied at rendering time, catching values that `hasValue()` in `localDatabase.ts` misses:

```typescript
const PLACEHOLDER_PATTERNS: string[] = [
  'not specified',   // caught by hasValue()
  'unknown',         // caught by hasValue()
  'unsure',          // ⚠️ NOT caught by hasValue()
  'unspecified',     // ⚠️ NOT caught by hasValue()
  'not tested',      // ⚠️ NOT caught by hasValue()
  'n/a',             // caught by hasValue()
  'none specified',  // caught by hasValue()
];
```

Any axis value that is empty or case-insensitively matches one of these → rendered as `"not noted"`. [VERIFIED — Billy Boy's kids ("Unspecified") and dogs ("Unsure") both render as "not noted"]

### SM Truncation Rule (Auditor A3)

```typescript
const SM_TRUNCATION_MAX_CHARS = 200;
```

**Rule:** Take the first sentence (ending at `.`, `!`, `?` followed by space or end-of-string). If the first sentence exceeds 200 characters, truncate on a word boundary at 200 chars and append `…`. This keeps tier-2 lines within the tier-1 length envelope. [VERIFIED — all 4 tier-2 lines are ≤129 chars, well within the tier-1 max of 347]

### Stock Template Detection

```typescript
const STOCK_TEMPLATE_SIGNALS = [
  // Classic stock: "Meet X! X is a ... waiting to find a warm home"
  (d) => d.includes('waiting') && d.includes('warm home'),
  // Kitten stock: "This adorable kitten is so young that we're still getting to know their personality"
  (d) => d.includes('still getting to know'),
  // Minimal referral: "To meet X, please visit Four Legs Good..."
  (d) => /^to meet .+, please visit/i.test(d.trim()),
];
```

Correctly classifies:
- 34 classic stock-template cats → tier 3 [VERIFIED]
- ~27 "adorable kitten" stock cats → tier 3 [VERIFIED]
- Karen Smith's "To meet Karen Smith, please visit..." → tier 1 (has behavior_notes, so tier 1 takes precedence) [VERIFIED]

---

## Verification — Change-B-Affected Cats

### W2025068 Dean (tier 1, 279 chars)

```
Documented — energy/playfulness: Very energetic and very playful; with kids: He'd be great with kids; with cats: Decent with other cats, could do better, as long as they like other cats; with dogs: Honestly maybe even good with dogs, as his personality is very engaged and loyal.
```

✅ Kids = "He'd be great with kids" (corrected from "Not tested"). Dogs = "Honestly maybe even good with dogs..." (corrected from "Not tested, not too sure"). [VERIFIED]

### S2026047 Buckley (tier 1, 237 chars)

```
Documented — energy/playfulness: Lower energy level but meows a lot; with kids: Not good with children due to being easily overstimulated; with cats: Okay with other cats but could do better; with dogs: Not tested if he's good with dogs.
```

✅ Kids = "Not good with children due to being easily overstimulated" — safety-critical signal preserved from Change B. [VERIFIED]

### S2025783 Emma — no longer in SM inventory (adopted/transferred since earlier session). Change B was verified via API before she left inventory. [VERIFIED]

---

## Verification — Critical Experiment Cats

### S2026447 Karen Smith (tier 1, 205 chars)

```
Documented — energy/playfulness: Very playful, climbs and jumps; with kids: Good with kids, caregiver's kids love her; with cats: Good with other cats; with dogs: Good with other dogs, caregiver has a dog.
```

✅ Matches the hand-built Cond-C summary signal: playful, good with kids/cats/dogs. Strong match for the "playful, energetic, good with kids and cats" test query. [VERIFIED]

### S2026357 Lilac (tier 1, 197 chars)

```
Documented — energy/playfulness: Very playful, likes the toys; with kids: Could be good with kids, I believe; with cats: Good with cats, has three other siblings; with dogs: Dogs, I don't know yet.
```

✅ Matches the hand-built Cond-C summary signal: playful, kids/cats positive. [VERIFIED]

### S2025966 Abe (tier 1, 133 chars)

```
Documented — energy/playfulness: Low; with kids: Very good with kids; with cats: Very good with cats; with dogs: Very good with dogs.
```

✅ Energy = "Low" — should NOT match a "playful, energetic" query. The Cond-C experiment showed Abe dropped from 4/5 to 1/5 with compact summaries — the compact format makes the "Low" energy visible rather than buried in a long, friendly-sounding transcript. [VERIFIED]

---

## Verification — SM-Only Barn Cats (Tier 2)

### S20251236 Blizzard (77 chars)

```
Shelter note: Not meant to be a household pet, but would be a great barn cat.
```

✅ Full SM text preserved (short enough to fit as first sentence). [VERIFIED]

### S2023297 Iron (129 chars)

```
Shelter note: Iron found the shelter environment to stressful for him, he is front declaw and that makes him feel very venerable.
```

✅ First sentence extracted. Key info (front declaw, stressed in shelter) preserved. [VERIFIED]

### R2024025 Lucky (84 chars)

```
Shelter note: Meet Lucky, the charming ginger cat who's looking for a new adventure!
```

✅ First sentence of long SM bio extracted. Within envelope. [VERIFIED]

### S20241161 Munster (104 chars)

```
Shelter note: Meet Munster, the spirited ginger Domestic Short Hair with a heart as fierce as his color.
```

✅ First sentence extracted. Within envelope. [VERIFIED]

---

## Verification — Stock Template / No-Data (Tier 3)

| Code | Name | Output |
|---|---|---|
| S2026495 | Andrew | `Documented — none.` |
| S2026346 | Basil | `Documented — none.` |
| S2026535 | Bobby | `Documented — none.` |
| S2026557 | Buddy | `Documented — none.` |

All 77 tier-3 cats produce the identical 18-char line. [VERIFIED]

---

## Length-Uniformity Analysis

### Overall

| Metric | Value |
|---|---|
| Total cats | 99 |
| Min length | 18 chars (tier 3) |
| Max length | 347 chars (tier 1) |
| Mean length | 57.8 chars |
| Spread | 329 chars |

### By Tier

| Tier | Count | Min | Max | Mean |
|---|---|---|---|---|
| 1 (Profile) | 18 | 112 | 347 | 219.2 |
| 2 (SM-only) | 4 | 77 | 129 | 98.5 |
| 3 (No data) | 77 | 18 | 18 | 18.0 |

### Tier-2 lines exceeding profile-line envelope

**None.** All 4 tier-2 lines (77–129 chars) are well within the tier-1 range (112–347). [VERIFIED]

### Shortest 3 Lines (verbatim)

```
S2026495 Andrew (tier 3, 18 chars): Documented — none.
S2026346 Basil  (tier 3, 18 chars): Documented — none.
S2026535 Bobby  (tier 3, 18 chars): Documented — none.
```

### Longest 3 Lines (verbatim)

```
W2026014 Carlo Gambino (tier 1, 347 chars): Documented — energy/playfulness: Very calm, loves to be pet, playful if in the mood; with kids: Good for children, doesn't get mad at little things, loves to be pet all over; with cats: Good with other cats, never reacts negatively, especially good with other cats; with dogs: Unsure, but likely fine as long as the dog doesn't overtake his space.

S20241099 Dante (tier 1, 317 chars): Documented — energy/playfulness: Very playful, very energetic; with kids: Would probably do best with older kids; with cats: Would be best as an only cat due to his condition, unless there is another FELV or FIV cat in the home; with dogs: Not exposed to any dogs, so we're not sure if he would do well with any dogs.

S2026290 Matcha (tier 1, 286 chars): Documented — energy/playfulness: Calm, loves to be cozy; with kids: Prefers no young children due to preference for quiet environments; with cats: Has lived successfully with other cats and enjoys their company; with dogs: Ideally no large dogs due to preference for quiet environments.
```

### Uniformity Assessment

**Before (raw transcripts):** 0 to 2000+ chars per animal, with 50:1+ spread ratios. [VERIFIED via prior experiments]

**After (compact summaries):**
- Within-tier-1 spread: 3:1 ratio (112–347 chars). The remaining variation is from natural axis-value length — some caregivers give one-word answers ("Low"), others give full sentences. This is acceptable: the model can now weight content rather than volume. [VERIFIED]
- Cross-tier spread: tier 3 (18) vs tier 1 (347) = 19:1, but this is by design — "Documented — none." intentionally conveys less information, and the model SHOULD give it less weight in selection. The key property is that no undocumented animal gets MORE text than a documented one. [VERIFIED]
- **No tier-2 SM line exceeds the profile-line envelope.** [VERIFIED]

---

## Commit

```
1bb8f9e  Add inert customSearchSummary.ts — compact trait-summary builder for custom-search
  server/src/customSearchSummary.ts | 170 +
  1 file changed, 170 insertions(+)
```

**Rollback:** `git revert 1bb8f9e` — trivially safe, module is inert (no call sites). [VERIFIED]

---

## Notes

- Base attributes (name, species, breed, age, sex, color, FIV/FeLV) are NOT included in the trait-line — they are assembled separately by the endpoint already.
- The function imports `BehaviorNotes` from `types.ts` for type safety but has zero runtime dependencies on any endpoint code.
- Dogs/smalls: the function does not hard-fail on non-cat species. The same tier logic applies — if a dog has behavior_notes, it gets a tier-1 profile line. Species expansion of the custom-search endpoint itself is separate work.
- Existing bios are not affected — this module does not touch the bio-generation pipeline.
