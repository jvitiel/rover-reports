# Phase-2 Prompt Revision — Pre-Draft Diagnosis

**Date:** 2026-06-20 16:31 UTC  
**Type:** READ-ONLY diagnosis (no changes, no commits)

---

## LEAD

1. **FIV/FeLV IS currently passed as structured input to Phase-2** — `FIV: ${animal.fivStatus}` and `FeLV: ${animal.felvStatus}` at server.ts:4695-4696 (cats only). The OMIT-FIV issue is NOT a missing-input problem — Phase-2 SEES the structured field and sometimes doesn't mention it in the bio. The fix is a must-disclose prompt rule + a code-enforced floor, not adding a missing field. [VERIFIED]

2. **Yes — there is a post-generation point for the code floor.** After `parsed = JSON.parse(jsonText)` at server.ts:5385, the parsed bio text (`parsed.matches[i].bio`) and the animal's known FIV/FeLV status (`selectedAnimals[i].fivStatus`) are both in scope. The validation loop at server.ts:5395-5423 already iterates over `parsed.matches` with `validCodes` checks — a FIV/FeLV disclosure check could be inserted in the same post-parse section. [VERIFIED]

3. **Yes — weak count and codeDerivedLowConfidence are available at Phase-2 assembly.** `codeDerivedLowConfidence` is computed at server.ts:4660, `usedFallbackOverride` set at 4669. The Phase-2 system prompt is built starting at server.ts:4743. The weak count (PARTIAL tier count) is computable from `validSelectedCodes` + `candidateSet.annotations` in the same scope — currently not named as a variable but all data is available. [VERIFIED]

---

## 1. PHASE-2 INPUT ASSEMBLY

**Where:** server.ts:4675-4722 — the `for (const animal of selectedAnimals)` loop builds `shortlistEntries[]`.

**Fields currently passed per animal:**

```
SHELTER_CODE: ${animal.shelterCode}           // server.ts:4680
Name: ${animal.name}                           // :4681
Species: ${animal.species}                     // :4682
Breed: ${breedVal}                             // :4688 (conditional, suppressed if echoes species)
Age: ${animal.age}                             // :4690
Sex: ${animal.sex}                             // :4691
Color: ${animal.color}                         // :4692
FIV: ${animal.fivStatus}                       // :4695 (cats only)
FeLV: ${animal.felvStatus}                     // :4696 (cats only)
DOCUMENTED BEHAVIORAL DATA: none|present       // :4699
[caregiver transcripts, last 3]                // :4702-4711
[Shelter notes: description]                   // :4714-4717
```

**FIV/FeLV status:** YES, passed as structured fields — `FIV: positive` / `FIV: negative` / `FIV: untested`. Gated on `speciesLower === 'cat'` (dogs and small animals don't get these lines). [VERIFIED]

**Current pool:** 7 FIV+ cats, 2 FeLV+ cats (Dante and Segundo are both FIV+/FeLV+). [VERIFIED]

---

## 2. WHERE TO INJECT FIV/FeLV MUST-DISCLOSE

**Not needed as input injection — already present.** The fix goes in the Phase-2 PROMPT, not the input assembly.

**Prompt injection point:** The mismatch-acknowledgment section of each system prompt. There are 6 system prompts (EN/ES × cat/dog/small):

| Prompt | Line | Species |
|--------|------|---------|
| `systemMessageEn` | 4743 | cat |
| `systemMessageEs` | 4841 | cat |
| `systemMessageDogEn` | 4940 | dog |
| `systemMessageDogEs` | 5041 | dog |
| `systemMessageSmallEn` | 5142 | small |
| `systemMessageSmallEs` | 5231 | small |

FIV/FeLV must-disclose rule only needs to go in the **cat prompts** (EN: 4743, ES: 4841), since `fivStatus`/`felvStatus` are only passed for cats. [VERIFIED]

---

## 3. CODE-ENFORCED FLOOR POINT

**Post-generation point:** server.ts:5385-5423 — after `parsed = JSON.parse(jsonText)` and before `audit.status = 'success'`.

At this point, both are in scope:
- `parsed.matches[i].bio` — the generated bio text
- `selectedAnimals[i].fivStatus` / `selectedAnimals[i].felvStatus` — the known status

**Current validation loop** (server.ts:5395-5423):
```typescript
for (const m of parsed.matches) {
  if (typeof m.shelter_code !== 'string' || typeof m.bio !== 'string') { ... }
  if (!validCodes.has(m.shelter_code)) { ... }
}
```

**Floor check insertion:** After the existing validation loop, before `audit.status = 'success'` (server.ts:5425). For each match, if the animal's `fivStatus === 'positive'` or `felvStatus === 'positive'`, check that the bio text contains "FIV" or "FeLV" respectively (case-insensitive). If missing: either regenerate (expensive) or flag in audit + append a disclosure sentence to the bio (cheap, deterministic). [VERIFIED]

---

## 4. PREAMBLE GENERATION

**Preamble is MODEL-WRITTEN** by Phase-2 (Sonnet), not code-generated. [VERIFIED]

**Where specified:** In each system prompt's "SHELTER POLICIES" section. For cat EN, this is server.ts:4827-4837.

**Current triggers (from the prompt):**
1. Adopter asked policy questions → preamble answers them using verbatim policy text
2. `low_confidence` is true → preamble folds in match-quality note ("these are the closest available, call for alternatives")
3. No policy questions AND strong matches → "omit the preamble field or set it to null"

**Key quote** (server.ts:4833-4836):
```
- When your matches don't closely match what the adopter asked for (low_confidence
  is true), fold a match-quality note into the same preamble paragraph: mention
  that these are the closest animals available and invite them to call for alternatives.
- If the adopter raised no policy questions and your matches are strong, omit the
  preamble field or set it to null.
```

**Post-generation handling:** server.ts:5438-5440:
```typescript
const preambleText = (typeof parsed.preamble === 'string' && parsed.preamble.trim())
  ? parsed.preamble.trim() : null;
```

The `low_confidence` value Phase-2 returns is **discarded** — code-derived `codeDerivedLowConfidence` (server.ts:4660) is authoritative (B2 deviation fix). But the prompt still tells Phase-2 to self-assess `low_confidence` and gate the preamble on it. The code override only affects the **response field**, not the preamble the model already wrote.

**Implication for A2 + weak-tiering:** The preamble is currently gated on Phase-2's self-assessed `low_confidence`, not code-derived weak count. To add the "2-3 weak → general preamble" behavior, the prompt needs an explicit code-injected signal (e.g., a line in the user message: `MATCH QUALITY: 2 of 3 are weak matches`). [VERIFIED]

---

## 5. WEAK COUNT AT PHASE-2

**Computed at:** server.ts:4660-4669 (`codeDerivedLowConfidence`), and the tier sort block at server.ts:4627-4655 (`tierOf`, `blankOf`).

**Phase-2 assembly at:** server.ts:4675-4728 (shortlist entries + user message).

**Gap:** `codeDerivedLowConfidence` is a boolean; the actual weak COUNT (how many of the 3 are PARTIAL) is not currently computed as a named variable. But `validSelectedCodes`, `candidateSet.annotations`, and `annotationTier()` are all in scope at that point. Adding:
```typescript
const weakCount = validSelectedCodes.filter(c => {
  const d = candidateSet.annotations.get(c);
  return d ? annotationTier(d) === 2 : false;
}).length;
```
...is one line, immediately before the user message assembly. [VERIFIED]

---

## 6. CURRENT MISMATCH-ACKNOWLEDGMENT LANGUAGE

**Cat EN** (server.ts:4765-4775):

```
If the adopter's narrative mentions any specific attribute (color, age including
"kitten," breed, declawed status, distinctive features, household-fit factors like
kids/dogs/cats/other pets, lifestyle preferences) and a provided cat doesn't match
that attribute, acknowledge the gap briefly in that cat's bio while anchoring what
the cat IS. Don't fabricate a match. Don't omit when the adopter raised it. Don't
shift to clinical or testing language. Keep this light — one sentence per miss at
most, woven naturally.
```

**Examples in prompt** (server.ts:4777-4781):
```
- Adopter asked for orange, cat is grey: "Puccini's coat is a soft grey rather than
  the orange you mentioned, but his easy-going temperament and kitten-like playfulness
  might still be exactly what you're looking for."
- Adopter asked for kitten, cat is 2+: "At 2 years old, Dean is past the kitten phase
  but still has plenty of playful energy and many years of companionship ahead."
- Adopter asked for declawed: "Macy has all his claws. If a declawed cat is essential
  for your situation, shelter staff can discuss options when you call."
- Adopter asked for bonded pair: "Emma is happy as the only cat in your home..."
- Adopter asked about health: "Our search records don't note any health concerns..."
```

**This is the text that weak-tiering lightening will modify:** currently always "one sentence per miss at most, woven naturally" regardless of weak count. The spec wants this at full strength for 0-1 weak, and a lighter version ("one brief clause") for 2-3 weak (where the preamble carries the general message).

**Same language exists in all 6 prompts** (cat EN/ES, dog EN/ES, small EN/ES) at lines 4765, 4962, 5170 (EN) and their ES counterparts. All 6 must be updated together. [VERIFIED]

---

## Summary: What Goes Where

| Change | Type | Location | Notes |
|--------|------|----------|-------|
| A2: Preamble boundary | Prompt rule | 6 system prompts (SHELTER POLICIES section) | Restrict preamble content to policy FAQ + code-signaled match-quality. Block narrative injection. |
| Floor C: FIV/FeLV must-disclose | Prompt rule + code floor | Cat prompts (2) + post-parse validation (server.ts:5425) | Prompt: "FIV+/FeLV+ MUST appear in bio." Code: check bio contains "FIV"/"FeLV" after generation. |
| Weak-tiering: preamble at 2-3 | Code signal + prompt rule | User message injection + 6 system prompts | Inject `MATCH QUALITY: N of 3 are weak` before Phase-2. Prompt: "When 2+ weak, write general preamble." |
| Weak-tiering: bio lightening | Prompt variation | 6 system prompts (mismatch section) | Conditional: 0-1 weak → current "one sentence per miss." 2-3 weak → "one brief clause." |
| Weak-tiering: guard | Prompt rule | 6 system prompts | "Even when preamble carries general message, each bio MUST still contain one clause for its specific mismatch." |
