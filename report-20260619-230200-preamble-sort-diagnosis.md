# Preamble & Sort Current-State Diagnosis

**Date:** 2026-06-19 23:02 ET  
**Type:** READ-ONLY CODE DIAGNOSIS  
**Source:** `server/src/server.ts` + `server/src/customSearchSelect.ts`

---

## Summary

**PREAMBLE:** Currently **Sonnet-written** (part of the Phase-2 JSON response). Triggered by Sonnet's judgment based on prompt instructions: write a preamble when the adopter asks policy/logistics questions OR when `low_confidence` is true (weak matches). Omit/null when matches are strong and no policy questions. No server-side preamble construction whatsoever — the code reads `parsed.preamble` verbatim and passes it through. [VERIFIED]

**SORT:** Matches are currently ordered by **whatever order Sonnet returns them in the Phase-2 JSON `matches` array** — there is NO post-Phase-2 sort. The `responseMatches` are built via `.map()` over `parsed.matches` (preserving Sonnet's order), and the prompt instructs "present them in the order given" (Phase-2 receives Phase-1's best-first ordering). `isBlankAnimal` IS available at the response-assembly point (it's an inline function at server.ts:4609), but it is **not used** for sorting — only for the `DOCUMENTED BEHAVIORAL DATA` marker injected into Phase-2 input. [VERIFIED]

---

## PREAMBLE

### Q1: Where is the preamble generated?

**Sonnet generates it inside the Phase-2 response.** The JSON that Sonnet returns has three fields: `matches`, `low_confidence`, and `preamble`.

The code reads it at **server.ts:5378**:
```typescript
// Phase 18b: dynamic preamble from Sonnet
const preambleText = (typeof parsed.preamble === 'string' && parsed.preamble.trim()) ? parsed.preamble.trim() : null;
```

And returns it verbatim at **server.ts:5437-5442**:
```typescript
res.json({
  matches: responseMatches,
  candidateCount: withRecords.length,
  lowConfidence,
  preamble: preambleText,
});
```

There is **zero server-side preamble construction**. The server's only role is: (a) null-coalesce if Sonnet omits it, and (b) trim whitespace. [VERIFIED]

### Q2: Sonnet-written, not code-built

Confirmed: the preamble is part of the Phase-2 Anthropic API call. The prompt tells Sonnet the expected JSON schema at **server.ts:4769-4770** (cat EN example):
```json
{
  "low_confidence": false,
  "preamble": null,
  "matches": [...]
}
```

And instructions at **server.ts:4778**:
```
The preamble field is a string or null. When present, it should be 2-3 sentences maximum.
```

[VERIFIED]

### Q3: What triggers a preamble vs null?

Two triggers, both Sonnet-decided based on prompt instructions:

**Trigger 1 — Policy/FAQ questions.** At **server.ts:4753-4757** (cat EN):
```
When the adopter's narrative contains questions about shelter policies or logistics,
address them in a "preamble" field in your JSON response. The preamble is a brief
conversational paragraph (2-3 sentences max) that answers their questions before
they see the cat bios.
```

**Trigger 2 — Weak matches (low_confidence).** At **server.ts:4760-4761**:
```
- When your matches don't closely match what the adopter asked for (low_confidence
  is true), fold a match-quality note into the same preamble paragraph: mention that
  these are the closest animals available and invite them to call for alternatives.
```

**Null condition.** At **server.ts:4762**:
```
- If the adopter raised no policy questions and your matches are strong, omit the
  preamble field or set it to null.
```

This is replicated identically in all 6 prompts (cat/dog/small × EN/ES). [VERIFIED]

### Q4: How is low_confidence determined?

**Two independent low_confidence signals exist — only Phase-2's is used in the response.**

**Phase-1 (selection) low_confidence** — at **customSearchSelect.ts:76-78**:
```
- Set low_confidence to true ONLY when the inventory genuinely cannot meet the
  adopter's core request — e.g., they want a specific breed and none exist, or they
  want a kitten and none are under 1 year, or none of your 3 picks substantively
  match the key ask.
- Partial mismatches across picks (each missing one detail) → low_confidence: false.
```

But this Phase-1 `low_confidence` is **only logged** (server.ts:4585) and **never used in response logic**:
```typescript
console.log(`[Matcher] Phase 1 selected: ${selectedCodes.join(', ')} (low_confidence=${selectionResult.low_confidence}, ...)`);
```

**Phase-2 (bio-writing) low_confidence** — at **server.ts:4702-4704** (cat EN):
```
Also include a "low_confidence" boolean in your JSON response. Set it to true ONLY
if 0 or 1 of the 3 provided cats substantively matches the adopter's core specific
request. Partial mismatches across all three (where each cat misses one or two
specific things but is still a reasonable candidate) should set low_confidence to
false — the bio-level acknowledgment handles that case. Set low_confidence to true
when the inventory genuinely doesn't have what they asked for: e.g., they wanted a
specific breed and none of the provided cats are that breed, or they wanted a kitten
and none are under 1 year old, or they specified multiple specific attributes and
none of the provided cats address most of them.

When unsure, lean false — the bio-level acknowledgment is the primary tool for
honesty, the preamble is reserved for true inventory mismatches.
```

**The response's `lowConfidence` is assembled at server.ts:5373:**
```typescript
const lowConfidence = parsed.low_confidence === true || usedFallback;
```

Where `usedFallback` (server.ts:4517-4538) is true when the age filter was dropped due to <3 candidates:
```typescript
let usedFallback = false;
if (withRecords.length < 3) {
  // Fallback: keep sex filter, drop age filter to find at least 3 candidates
  const sameSexAllAges = speciesPool.filter(a => { ... });
  withRecords = sameSexAllAges;
  usedFallback = true;
}
```

So `lowConfidence` is: **(Phase-2 Sonnet says true) OR (age-filter was dropped)**. [VERIFIED]

**Why dog weak-match didn't trigger:** Phase-2 Sonnet judged that 0-1 of the 3 dogs matched "a tiny teacup dog that never barks" was false — it found small, quiet-ish dogs (Isis, Marshmallow, Scottie) and judged them as reasonable candidates, setting `low_confidence: false`. The Phase-1 `low_confidence` was likely true, but Phase-1's flag is not used. This is a **Sonnet judgment call**, not a code bug — two different Sonnet calls (Phase-1 and Phase-2) may disagree on whether the matches are weak enough. [INFERRED]

### Q5: Per-result weakness signal?

**No.** There is no per-match quality score, weakness flag, or confidence value. The only quality signals are:

1. `low_confidence` — a single boolean for the entire response (not per-match)
2. `DOCUMENTED BEHAVIORAL DATA: none|present` — injected into the Phase-2 input per animal (server.ts:4640-4641), but this is a **prompt input**, not a response output. The response contains only `{ shelter_code, bio }` per match.

The code has **no post-hoc per-result quality classification**. Phase-1 returns codes "ranked best-match first" (customSearchSelect.ts:61), but that ranking is lost once Phase-2 returns — Phase-2 may reorder in its JSON. [VERIFIED]

---

## SORT

### Q6: Post-Phase-2 match ordering

**There is NO post-Phase-2 sort.** The response matches come from a `.map()` over `parsed.matches` at **server.ts:5398**:

```typescript
const responseMatches = parsed.matches.map(m => {
  const animal = recordsMap.get(m.shelter_code) || withRecords.find(a => a.shelterCode === m.shelter_code)!;
  // ... enrich with photos, videos, bios, adoption_pending, bonded_pair ...
  return { shelter_code: m.shelter_code, bio: m.bio, name: animal.name, ... };
});
```

`.map()` preserves input order. The input is `parsed.matches` — whatever order Sonnet put them in Phase-2's JSON. No `.sort()` is called on `responseMatches` or `parsed.matches` at any point between parsing and `res.json()`. [VERIFIED]

The Phase-2 prompt instructs (server.ts:4697, cat EN):
```
Present them in the order given — do not reorder by match quality, and do not
drop any. All 3 appear, all 3 get bios.
```

So the intended order is: Phase-1 best-first → Phase-2 preserves → response preserves. In practice, Phase-2 usually maintains Phase-1 order but is not mechanically enforced. [VERIFIED]

### Q7: Is blank/weak status available at the sort point?

**`isBlankAnimal()` is available** — it's an inline function at **server.ts:4608-4613**:
```typescript
const DESCRIPTION_SENTINELS = new Set(['', 'not specified', 'unknown', 'n/a', 'none specified', 'none']);
function isBlankAnimal(shelterCode: string, description: string | null | undefined): boolean {
  const records = getBehaviorRecords(shelterCode);
  if (records.length > 0) return false;
  const desc = (description || '').trim().toLowerCase();
  return DESCRIPTION_SENTINELS.has(desc);
}
```

This function is in scope at the `responseMatches` assembly point (server.ts:5398) — it's defined earlier in the same `app.post` handler. However, it is **not called** during response assembly. It's only called once, at **server.ts:4640**, to build the `DOCUMENTED BEHAVIORAL DATA` marker for Phase-2 input.

**To add a blank-last sort, you would call `isBlankAnimal()` on each match in `responseMatches` and sort accordingly — the function and data are already available.** [VERIFIED]

### Q8: Phase-1 return ordering

Phase-1 explicitly orders best-first. At **customSearchSelect.ts:61**:
```
1. ALWAYS return exactly 3 shelter_codes, ranked best-match first.
```

The code in `selectMatches` returns `parsed.shelter_codes` (customSearchSelect.ts:148) which is the array Sonnet returned — so the order is Sonnet's best-match-first judgment. This array is then used at **server.ts:4594-4602** to build `selectedAnimals`:

```typescript
const selectedAnimals = validSelectedCodes.map(code =>
  withRecords.find(a => a.shelterCode === code)!
).filter(Boolean);
```

`.map()` over `validSelectedCodes` preserves Phase-1 order. `selectedAnimals` is then passed to Phase-2 as input, maintaining best-first. [VERIFIED]

---

## Architecture Summary

```
Phase-1 (customSearchSelect.ts)
  └─ Sonnet picks 3 codes, ranked best-first
  └─ Returns { shelter_codes: [...], low_confidence: bool }
  └─ low_confidence is LOGGED ONLY (not used in response)

Phase-2 (server.ts:5273-5299)
  └─ Sonnet writes bios for the 3 animals
  └─ Returns { matches: [...], low_confidence: bool, preamble: string|null }
  └─ BOTH low_confidence and preamble are Sonnet-written
  └─ "When unsure, lean false" — conservative threshold

Response assembly (server.ts:5373-5442)
  └─ lowConfidence = Phase-2.low_confidence OR usedFallback
  └─ preambleText = Phase-2.preamble (verbatim, trimmed)
  └─ responseMatches = parsed.matches.map(...) — NO SORT
  └─ isBlankAnimal() is in scope but NOT used for ordering
```

**Insertion points for new work:**
- **Weak-last sort:** Between `responseMatches` construction (5398) and `res.json()` (5437). Call `isBlankAnimal()` per match, sort documented-first.
- **Preamble tiering:** Either (a) add server-side logic between 5378 and 5437 to modify/override Sonnet's preamble, or (b) refine the prompt instructions to Sonnet for better tiering.
- **Phase-1 low_confidence propagation:** Currently wasted at 4585. Could be OR'd into the response's `lowConfidence` at 5373 to catch cases where Phase-1 sees weakness but Phase-2 doesn't.
