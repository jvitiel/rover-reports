# Diagnosis: Preamble Redefinition — FAQ Check, Applies-to-All-3, Sort, One Signal

**Read-only diagnosis. No changes, no commits.**

---

## LEAD

**(A1) FAQ check still works.** The FAQ is loaded from `shelter-policy-faq{-dog|-small}{-es}.json`, formatted as a key-value bullet list, and injected into all 6 system prompts as `${policyBlock}`. There is NO code-side matching of narrative against FAQ keys — the model decides whether the adopter's question matches a FAQ topic. The mechanism is purely prompt-based: the FAQ text is in the system prompt, the adopter narrative is in the user message, and the model's preamble rules tell it to use FAQ answers verbatim. The rebuild did not affect this — the `policyBlock` loading code (server.ts:4745-4754) was not touched; it feeds the same template slots in all 6 prompts. The spay/neuter case ("do your cats come spayed?") IS handled: `spay_vax_chip` is a FAQ key, the model sees it, and the preamble rules say to use it. [VERIFIED]

**(B3) Code-countable vs model-judged:**
- Hard miss: **code-countable** — re-run `hardFilter` with original intent against selected 3 gives per-animal missedFilters. But currently uniform (expansion drops an entire filter category, so all candidates miss the same filters). Mixed misses are theoretically possible but rare in practice. [VERIFIED]
- Soft unmet: **model-judged only** — softTerms are string labels ("playful", "good with kids") passed to the Phase-1 LLM for ranking. No code can evaluate whether a specific animal satisfies a soft term. [VERIFIED]
- FAQ shelter-level: **inherently all-3** — FAQ answers are shelter-wide truths, not per-animal. Correct framing. [VERIFIED]
- Off-topic: **inherently all-3** — not about any animal. Correct framing. [VERIFIED]

**(C4) Existing sort can carry the new "weaker" definition** — with a one-line change. The sort uses `tierOf()` as primary key (0/1/2). This could be replaced with a finer `intentMissCount()` that counts how many original-intent filters each animal misses. The sort infrastructure (stable sort, secondary blank key) is already correct. The limitation: soft unmet can't feed this sort (model-judged, not code-known). [VERIFIED]

---

## A — THE FAQ CHECK

### A1: Mechanism

**Loading (server.ts:4745-4754):**
```typescript
const faqSuffix = speciesLower === 'dog' ? '-dog' : speciesLower === 'small_animal' ? '-small' : '';
const policyFilename = lang === 'es' ? `shelter-policy-faq${faqSuffix}-es.json` : `shelter-policy-faq${faqSuffix}.json`;
const policyPath = path.join(__dirname, '..', 'config', policyFilename);
const policies = JSON.parse(readFileSync(policyPath, 'utf-8'));
policyBlock = Object.entries(policies).map(([k, v]) => `- ${k}: "${v}"`).join('\n');
```

**Files (4 total, no `-small-es` variant exists):**
- `shelter-policy-faq.json` (cat EN) — 9 keys
- `shelter-policy-faq-dog.json` (dog EN) — 9 keys
- `shelter-policy-faq-es.json` (cat ES) — 9 keys
- `shelter-policy-faq-dog-es.json` (dog ES) — 9 keys

**NOTE: No `shelter-policy-faq-small.json` or `shelter-policy-faq-small-es.json` exists.** The code would look for `shelter-policy-faq-small.json` when `speciesLower === 'small_animal'`, hit the catch block, and set `policyBlock = '(policy file unavailable)'`. The small-animal prompts have a hardcoded PLACEHOLDER FAQ section instead. [VERIFIED — `ls` shows no `-small` files]

**Injection:** `${policyBlock}` is interpolated into all 6 system prompts at the "Policy answers" section (lines 4848, 4955, 5064, 5172, 5281, 5390). [VERIFIED]

**Matching:** There is NO code that matches the adopter's narrative against FAQ keys. The model receives the FAQ as part of the system prompt and the narrative as part of the user message. The prompt rules instruct the model to:
1. Only address policy topics the adopter raised that are covered by the FAQ
2. Use FAQ text verbatim for substance
3. May acknowledge uncovered topics and route to staff

This is entirely model-judged. The code does not know whether a FAQ key was triggered. [VERIFIED]

### A2: Spay/neuter case

The spay/neuter case IS handled today. `spay_vax_chip` is the first FAQ key:

> "Cats come spayed/neutered, fully vaccinated, and microchipped at adoption."

If an adopter asks "are your cats spayed?", the model sees this FAQ entry, recognizes it covers the question, and uses it in the preamble. This is a SATISFIED FAQ answer (true shelter-wide), and the model correctly places it in the preamble, not per-bio. [VERIFIED via prompt rules: "address them in a 'preamble' field"]

**Gap:** The small-animal FAQ is a hardcoded PLACEHOLDER in the prompt, not loaded from a file. It contains `[PLACEHOLDER — UNCONFIRMED — BLOCKS UI LAUNCH]` markers. Small-animal policyBlock will be `'(policy file unavailable)'`. [VERIFIED]

### A3: Rebuild impact

The Phase-1 rebuild (commit 08a8a7c) did not touch the FAQ loading code. Lines 4745-4754 are unchanged. The template slots in all 6 prompts still interpolate `${policyBlock}`. [VERIFIED via git diff]

---

## B — APPLIES-TO-ALL-3 vs 1-2

### B3: Per-source countability

**Source 1 — Hard miss:** CODE-COUNTABLE. The mechanism:

Re-run `hardFilter(selectedAnimals, originalIntent, sex, age)` to get per-animal `missedFilters` against the FULL original intent (not the relaxed/expanded intent). This tells you exactly which of the 3 missed which filters.

Tested with "small orange senior siamese cat" (expansion dropped size+breed):
```
S2025503 Cheshire → missed: [size, breed], unknown: []
S2026295 Frodo    → missed: [size, breed], unknown: []
S2025883 Reeboks  → missed: [size, breed], unknown: []
```
All 3 miss the same filters because expansion drops an entire category. Mixed misses are possible in theory (e.g., if after dropping breed, one candidate happens to be small while others aren't), but the current pool makes this uniform in practice. [VERIFIED]

The code currently does NOT perform this re-run. It would need to be added (~3 lines) to get per-animal original-intent misses. [INFERRED — straightforward extension of existing `hardFilter` function]

**Source 2 — Soft unmet:** MODEL-JUDGED ONLY. softTerms are string labels extracted by the intent LLM (e.g., "playful", "good with kids", "hypoallergenic"). They are passed to Phase-1 for ranking but are NEVER evaluated by code against animal attributes. No structured data exists to programmatically determine whether an animal satisfies "good with kids." [VERIFIED — softTerms flow: intentExtractor → customSearchSelect user message → LLM ranking. No code evaluation path exists.]

For "applies to all 3 vs 1-2": the code cannot count this. Options:
1. Treat all soft unmet as "applies to all 3" (conservative — always preamble, never per-bio). Simple but sometimes wrong.
2. Ask the Phase-2 model to judge per-animal (current approach — model sees softTerms in the narrative and animal data, decides per-bio).
3. Add a code step that searches animal text for soft terms (fragile, NLP-hard).

**Source 3 — FAQ shelter-level:** INHERENTLY ALL-3. FAQ answers are about the shelter, not specific animals. "Cats come spayed/neutered" is true for all cats. This source always goes to preamble only, never per-bio. Correct framing. [VERIFIED]

**Source 4 — Off-topic/no-FAQ-answer:** INHERENTLY ALL-3. "Do you have a money-back guarantee?" is not about any animal. Always preamble (acknowledge + route to staff). Correct framing. [VERIFIED]

---

## C — THE SORT

### C4: Can existing sort carry "weaker = more intent-missed"?

**Current sort (server.ts:4646-4650):**
```typescript
validSelectedCodes.sort((a, b) => {
  const td = tierOf(a) - tierOf(b);
  if (td !== 0) return td;
  return blankOf(a) - blankOf(b);
});
```

`tierOf` returns 0 (FULL), 1 (UNKNOWN), or 2 (PARTIAL) based on the EXPANDED-intent annotations. As established, candidates are always tier 0 after expansion — so this sort is currently a no-op for the tier dimension, only the blank dimension matters.

**To carry "intent-miss count":** Replace `tierOf` with a function that counts `missedFilters.length` from a re-run of `hardFilter` with the original intent. E.g.:

```typescript
const intentMissOf = (code: string): number => {
  const d = originalIntentAnnotations.get(code);
  return d ? d.missedFilters.length : 99;
};
```

Then sort: `intentMissOf ASC → blankOf ASC → Phase-1 order preserved`.

**Assessment:** The sort infrastructure CAN carry this. It's a one-function swap. The sort is already stable (preserves Phase-1 order within equal keys). [VERIFIED]

**Limitation:** This only ranks on HARD misses. Soft unmet cannot feed this sort because soft satisfaction is model-judged. An animal that misses 0 hard filters but doesn't satisfy "good with kids" would sort identically to one that does satisfy it. [VERIFIED]

---

## D — ONE SIGNAL

### D5: Can all sources feed ONE assembly point?

**Assembly point location:** server.ts:4730-4742 (after Phase-1 selection, before Phase-2 prompt construction). At this point, all four sources are in scope:

| Source | Available at assembly point | Variable |
|--------|---------------------------|----------|
| Hard miss | ✅ | `candidateSet.annotations` + `candidateSet.droppedFilters` + original `intent` (all in scope) |
| Soft unmet | ✅ (as strings) | `intent.softTerms` (in scope) |
| FAQ match | ❌ (model-judged) | `policyBlock` is in scope, but whether adopter triggered any FAQ is unknown until model responds |
| Off-topic | ❌ (model-judged) | `narrativeText` is in scope, but whether it contains off-topic is unknown until model responds |

**Can the code compute per-preamble-point "what it is + how many of 3 it applies to"?**

- Hard miss: **YES.** Re-run `hardFilter` with original intent on the 3 selected animals. Per animal: `missedFilters` gives which hard attributes this animal lacks. Per preamble point: if all 3 miss "breed=siamese" → preamble only. If 2/3 miss → preamble + those 2 get soft clause.
- Soft unmet: **PARTIALLY.** The code knows WHAT the soft terms are (`intent.softTerms`) but not which animals satisfy them. The signal can say "soft terms were: playful, good with kids" but cannot say "2/3 satisfy playful."
- FAQ: **NO.** Whether a FAQ was triggered is unknown until the model writes the preamble. The code can pass the FAQ block and let the model decide.
- Off-topic: **NO.** Same — model judgment needed.

**Proposed one-signal structure:**

The code can build a `PREAMBLE SIGNAL` block (injected into the user message alongside the existing `MATCH QUALITY` block) containing:

```
PREAMBLE SIGNAL (system-provided):
HARD MISSES:
- breed: missed by all 3 (Reeboks, Stevie, Cheshire) — preamble only, bios stay clean
- size: missed by 2/3 (Reeboks, Cheshire) — preamble + those 2 get soft clause
SOFT TERMS: [playful, good with kids] — model judges per-animal
FAQ: [policy block provided] — model judges if adopter triggered any
EXPANSION: dropped_size+breed
```

This gives the model a deterministic hard-miss breakdown (code-provided) plus the soft terms and FAQ for model judgment. The "how many of 3" is code-computed for hard misses, model-computed for soft and FAQ.

**Where:** The assembly point at server.ts:4730-4742 has everything it needs: `validSelectedCodes`, `candidateSet`, `intent`, `policyBlock`, `narrativeText`. A new block after `weakCount` computation (~line 4670) could build the signal, and it would be injected into `userMessage` alongside the existing `matchQualitySignal`. [VERIFIED]

---

## SUMMARY TABLE

| Question | Answer | Tag |
|----------|--------|-----|
| A1: FAQ check works? | Yes — FAQ loaded from JSON, injected into system prompt, model matches narrative to FAQ topics. No code-side matching. Rebuild didn't affect it. | [VERIFIED] |
| A2: Spay/neuter handled? | Yes — `spay_vax_chip` FAQ key, model uses in preamble. Small-animal FAQ is PLACEHOLDER (no JSON file). | [VERIFIED] |
| B3: Hard miss countable? | Yes — re-run `hardFilter` with original intent on selected 3. Currently uniform (expansion drops whole categories) but per-animal differences theoretically possible. | [VERIFIED] |
| B3: Soft unmet countable? | No — model-judged only. Code knows the terms but not which animals satisfy them. | [VERIFIED] |
| B3: FAQ shelter-level all-3? | Yes — inherently all-3, correct framing. | [VERIFIED] |
| B3: Off-topic all-3? | Yes — inherently all-3, correct framing. | [VERIFIED] |
| C4: Sort carries new "weaker"? | Yes — swap `tierOf` with `intentMissOf` (hard-miss count). One-function change. Cannot rank on soft unmet (model-judged). | [VERIFIED] |
| D5: One assembly point? | Yes — server.ts:4670-4742. Hard miss is code-computed per-animal. Soft/FAQ/off-topic are model-judged. Signal can carry both. | [VERIFIED] |

---

## GAPS & FLAGS

1. **Small-animal FAQ file missing.** `shelter-policy-faq-small.json` and `shelter-policy-faq-small-es.json` don't exist. The code falls to `'(policy file unavailable)'`. The small-animal prompts have a hardcoded PLACEHOLDER instead. This means the "Policy answers" interpolation for small animals is the string `(policy file unavailable)` — which the model sees as an instruction that no FAQ is available.

2. **Soft-unmet per-animal is a design decision.** Code can't count it. Three options: (a) always all-3 (preamble only), (b) model-judged per-bio (current), (c) add structured evaluation (complex). This needs an operator call.

3. **Hard-miss uniformity.** Expansion drops whole categories, so all 3 typically miss the same filters. "Applies to all 3 vs 1-2" for hard misses will almost always be "all 3." Mixed misses require a pool where some candidates coincidentally match a dropped filter — rare but possible.

4. **FAQ triggering is invisible to code.** The code cannot know whether the model used a FAQ answer until after the response. This means the "preamble point list" for FAQ/off-topic sources can only be computed post-hoc, not pre-signal.
