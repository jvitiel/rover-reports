# Weak-Match Tiering Spec — Reconciliation Against Rebuilt Phase-1

**Date:** 2026-06-20 16:05 UTC  
**Type:** READ-ONLY reconciliation (no changes, no commits)

---

## LEAD: Covered vs Unbuilt

| Spec requirement | Status | Where |
|-----------------|--------|-------|
| **Weak detection** (which animals are weak) | ✅ **ALREADY BUILT** | `hardFilter.ts: annotationTier()` → PARTIAL=2. `candidateSet.annotations` available before Phase-2. |
| **Weak count** (how many of the 3 are weak) | ✅ **ALREADY BUILT** | Computable from `validSelectedCodes` + `candidateSet.annotations` at the assembly point (server.ts ~4617). |
| **Sort: weak-to-bottom** | ✅ **ALREADY BUILT** | `server.ts:4613: validSelectedCodes.sort((a,b) => tierOf(a) - tierOf(b))` — FULL(0) > UNKNOWN(1) > PARTIAL(2). |
| **Sort: blank-last** | ❌ **UNBUILT** | No blank-last deterministic sort exists. `isBlankAnimal()` is defined (line 4643) but only used to inject a marker into the Phase-2 shortlist entry — never used for sorting. |
| **Preamble: 2-3 weak → general message** | ❌ **UNBUILT** | Phase-2 generates preambles for POLICY questions and when IT judges low_confidence. No weak-count-gated preamble logic exists. |
| **Bio lightening: 0-1 weak → full clause, 2-3 weak → light clause** | ❌ **UNBUILT** | Phase-2 always writes the SAME mismatch acknowledgment regardless of weak count ("one sentence per miss, woven naturally"). No variation by weak count. |
| **Guard: lighter bio ≠ omit** | N/A (bio lightening not built yet) | Will need to be enforced when bio lightening is built. |

**Summary: 3 of 7 requirements already built by the rebuild. 4 remain unbuilt.**

---

## 1. "WEAK" DETECTION — ✅ ALREADY BUILT

**"Weak" maps cleanly to [PARTIAL] tier (annotationTier = 2).** [VERIFIED]

A weak animal is one whose `MatchDetail` has `missedFilters.length > 0` — it was included via expansion because the hard filter dropped a stated attribute. This is exactly the spec's definition: "returned because the pool was thin / expansion dropped a stated filter."

**How a weak animal is identifiable in code RIGHT NOW, before Phase-2 runs:**

```typescript
// server.ts, lines 4608-4617 (in the tier re-sort block, before Phase-2)
const tierOf = (code: string): number => {
  const detail = candidateSet.annotations.get(code);
  return detail ? annotationTier(detail) : 2;
};
// annotationTier() from hardFilter.ts:
//   0 = FULL (missedFilters empty, unknownFilters empty)
//   1 = UNKNOWN (missedFilters empty, unknownFilters non-empty)
//   2 = PARTIAL (missedFilters non-empty) ← THIS IS "WEAK"
```

**The code knows the weak count at the assembly point:**

```typescript
// Computable at server.ts ~4617, before Phase-2:
const weakCount = validSelectedCodes.filter(c => tierOf(c) === 2).length;
```

This value is not currently computed as a named variable, but all the data structures are in scope. Adding `const weakCount = ...` is one line. [VERIFIED]

---

## 2. SORT — ✅ PARTIALLY BUILT (weak-to-bottom done, blank-last missing)

### Weak-to-bottom: DONE

**Current sort** (server.ts line 4613):
```typescript
validSelectedCodes.sort((a, b) => tierOf(a) - tierOf(b));
```

This sorts FULL(0) first, UNKNOWN(1) second, PARTIAL(2) last. PARTIAL = weak. So weak animals are already sorted to the bottom. Within-tier ordering is preserved from Phase-1's LLM ranking (JavaScript's `Array.sort` is stable in V8/Node.js). [VERIFIED]

**Does this satisfy the spec's sort?** Partially:
- ✅ "Weak animals sorted to the bottom" — yes, PARTIAL tier is last.
- ✅ "Otherwise preserve Phase-1's best-first order" — yes, stable sort preserves within-tier order.
- ❌ "Blank-last as a deterministic floor" — NOT DONE.

### Blank-last: NOT DONE

`isBlankAnimal()` is defined at line 4643 but is only used to inject a `DOCUMENTED BEHAVIORAL DATA: none` marker into the Phase-2 shortlist entry (line 4674). It is **never used for sorting.** [VERIFIED]

No post-Phase-2 sort exists either — `parsed.matches` is returned in the order Phase-2 produced them (which is the order the shortlist entries were passed in, since the Phase-2 prompt says "write one bio for each of the three, in the order provided").

**What's needed:** A secondary sort within each tier: blank animals last within their tier. This is a stable sort on `isBlankAnimal()` applied after the tier sort but before Phase-2 receives the shortlist. Approximately 3 lines of code.

---

## 3. PREAMBLE — ❌ UNBUILT

### Current preamble logic (Phase-2 prompt, server.ts lines 4787-4812):

```
When the adopter's narrative contains questions about shelter policies or logistics,
address them in a "preamble" field in your JSON response. The preamble is a brief
conversational paragraph (2-3 sentences max)...
- When your matches don't closely match what the adopter asked for (low_confidence
  is true), fold a match-quality note into the same preamble paragraph...
- If the adopter raised no policy questions and your matches are strong, omit the
  preamble field or set it to null.
```

**What Phase-2 currently does:**
1. Writes a preamble when the adopter asked policy questions (spay/neuter, adoption process, etc.)
2. Folds a match-quality note into the preamble when IT judges `low_confidence: true`
3. Omits preamble when no policy questions and strong matches

**What the spec wants:**
- 0-1 weak: NO preamble (current behavior for strong matches — ✅ happens naturally)
- 2-3 weak: a GENERAL preamble ("none are quite the match, call us")

**The gap:** Phase-2 generates preambles based on its own `low_confidence` judgment (which the code now overrides downstream) and policy questions. There is NO code-driven weak-count gate that tells Phase-2 "you MUST write a general mismatch preamble because 2+ animals are weak" vs "you MUST NOT write one because only 0-1 are weak."

The `low_confidence` the code computes (line 4622: `codeDerivedLowConfidence`) is close — it fires when expansion happened or <3 full matches. But it's only used downstream at line 5409 for the response field; it's NOT injected back into the Phase-2 prompt. Phase-2 still makes its own preamble judgment independently. [VERIFIED]

**What's needed:** Pass the weak count (or a weak-tier flag) into the Phase-2 user message or system prompt, with explicit rules:
- 0-1 weak: "Do NOT write a match-quality preamble" (bio handles mismatch per-animal)
- 2-3 weak: "Write a general preamble: these are the closest available, call (845) 414-9700"

---

## 4. BIO LIGHTENING — ❌ UNBUILT

### Current mismatch-acknowledgment behavior (Phase-2 prompt, server.ts ~4754-4764):

```
If the adopter's narrative mentions any specific attribute (color, age including
"kitten," breed, declawed status, distinctive features, household-fit factors...)
and a provided cat doesn't match that attribute, acknowledge the gap briefly in
that cat's bio while anchoring what the cat IS. Don't fabricate a match. Don't omit
when the adopter raised it. Don't shift to clinical or testing language. Keep this
light — one sentence per miss at most, woven naturally.
```

**Phase-2 always uses the SAME acknowledgment strength** — "one sentence per miss, woven naturally" — regardless of how many of the 3 animals are weak. There is no variation by weak count. [VERIFIED]

**What the spec wants:**
- 0-1 weak: FULL strength acknowledgment (current behavior — "one sentence per miss" is already strong) ✅
- 2-3 weak: ONE LIGHT CLAUSE for the specific mismatch (present, not omitted, but lighter)

**What's needed:** A prompt variation based on weak count:
- When `weakCount <= 1`: current prompt (full acknowledgment per bio)
- When `weakCount >= 2`: modified instruction — "For animals that don't match a stated attribute, include one brief light clause acknowledging the gap (still present, never omitted — the preamble carries the general message, the bio carries the animal-specific note at reduced weight)"

**The GUARD ("lighter ≠ omit")** must be explicit in the prompt: "Even when the preamble addresses the general mismatch, each weak bio MUST still contain one clause for its specific mismatch. The preamble is general; the bio is animal-specific. Both are required."

---

## Summary: Build Scope for Weak-Match Tiering

| Item | Effort | Where |
|------|--------|-------|
| 1. Compute `weakCount` | 1 line | server.ts, before Phase-2 |
| 2. Blank-last sub-sort | ~3 lines | server.ts, after tier sort |
| 3. Weak-count gate in Phase-2 prompt | ~10 lines prompt text | server.ts Phase-2 system prompt |
| 4. Preamble instruction (2-3 weak) | ~5 lines prompt text | server.ts Phase-2 system prompt |
| 5. Bio lightening instruction (2-3 weak) | ~5 lines prompt text | server.ts Phase-2 system prompt |
| 6. Guard clause | ~3 lines prompt text | server.ts Phase-2 system prompt |

**Total new code:** ~4 lines of TypeScript + ~23 lines of prompt text. The rebuild did the structural work (detection, primary sort, confidence); what remains is wiring the weak count into Phase-2's prompt and adding the blank-last sub-sort.
