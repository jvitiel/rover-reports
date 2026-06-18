# Change A Stage 1 Fix: SM Truncation Rule

**Date:** 2026-06-18 13:20 ET  
**Commit:** `6e68f58` — `server/src/customSearchSummary.ts` only (1 file, +8 −13). [VERIFIED]  
**Build:** Clean (tsc, zero errors). [VERIFIED]  
**Status:** INERT — no call sites, no endpoint wiring. [VERIFIED]

---

## Change

**Before:** First-sentence extraction — take text up to first `.`/`!`/`?`, then apply 200-char cap only if that sentence exceeds it. For Lucky and Munster, the first sentence is marketing fluff with zero placement signal; the real "barn cat" / "not indoor" info is in later sentences and gets dropped entirely.

**After:** Fixed character budget — take up to 200 chars on a word boundary. If the description is shorter, use it whole (no ellipsis). If longer, truncate and append `…`.

```typescript
function truncateSMDescription(description: string): string {
  const text = description.trim();

  // Fits within budget — use whole description
  if (text.length <= SM_TRUNCATION_MAX_CHARS) {
    return text;
  }

  // Truncate on word boundary at SM_TRUNCATION_MAX_CHARS
  let truncated = text.substring(0, SM_TRUNCATION_MAX_CHARS);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > SM_TRUNCATION_MAX_CHARS * 0.6) {
    truncated = truncated.substring(0, lastSpace);
  }
  return truncated + '…';
}
```

No changes to tier-1, tier-3, stock-template detection, or placeholder normalization.

---

## 4 SM-Only Tier-2 Lines (verbatim)

### S20251236 Blizzard (77 chars) — unchanged

```
Shelter note: Not meant to be a household pet, but would be a great barn cat.
```

Whole description (63 chars body) fits within budget. ✅ [VERIFIED]

### S2023297 Iron (211 chars)

```
Shelter note: Iron found the shelter environment to stressful for him, he is front declaw and that makes him feel very venerable. he got sick and didn't like to be handle, he got very depress. he is been foster…
```

Previously: first sentence only (129 chars). Now includes sentences 2–3 ("got sick", "been foster"). "He would love a quite home" (sentence 4) is at char ~255, beyond budget — dropped but the core behavioral signal (stressed, declawed, sick history, now fostered) is fully captured. ✅ [VERIFIED]

### R2024025 Lucky (207 chars)

```
Shelter note: Meet Lucky, the charming ginger cat who's looking for a new adventure! At 12 years and 10 months, Lucky is a seasoned explorer with a heart full of curiosity. While he may not be suited to the…
```

Previously: first sentence only (84 chars, pure marketing). Now includes "While he may not be suited to the…" — the start of the critical "not suited to the traditional indoor lifestyle" signal. "Barn cat" (sentence 4, ~350 chars) still beyond budget. Significant improvement over marketing-only. ✅ [VERIFIED]

### S20241161 Munster (211 chars)

```
Shelter note: Meet Munster, the spirited ginger Domestic Short Hair with a heart as fierce as his color. At 4 years and 7 months old, Munster is a natural adventurer, perfectly suited for life as a barn cat. He…
```

Previously: first sentence only (104 chars, pure marketing). Now includes **"perfectly suited for life as a barn cat"** — the key placement signal fully captured. ✅ [VERIFIED]

---

## Length Recheck

### Overall

| Metric | Before fix | After fix |
|---|---|---|
| Min | 18 | 18 |
| Max | 347 | 347 |
| Mean | 57.8 | 61.0 |

### By Tier

| Tier | Count | Min | Max | Mean |
|---|---|---|---|---|
| 1 (Profile) | 18 | 112 | 347 | 219.2 |
| 2 (SM-only) | 4 | 77 | 211 | 176.5 |
| 3 (No data) | 77 | 18 | 18 | 18.0 |

### Tier-2 vs Tier-1 envelope

Tier-2 max (211) < Tier-1 max (347). **No tier-2 line exceeds the profile-line envelope.** [VERIFIED]

### Shortest 3

| Code | Name | Tier | Chars | Line |
|---|---|---|---|---|
| S2026495 | Andrew | 3 | 18 | `Documented — none.` |
| S2026346 | Basil | 3 | 18 | `Documented — none.` |
| S2026535 | Bobby | 3 | 18 | `Documented — none.` |

### Longest 3

| Code | Name | Tier | Chars |
|---|---|---|---|
| W2026014 | Carlo Gambino | 1 | 347 |
| S20241099 | Dante | 1 | 317 |
| S2026290 | Matcha | 1 | 286 |

All unchanged from before — tier-1, not tier-2. [VERIFIED]

---

## Rollback

`git revert 6e68f58` — trivially safe, module is inert (zero call sites). [VERIFIED]
