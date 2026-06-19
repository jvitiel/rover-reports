# Phase-2 Model Diagnosis: Gate Test Used Wrong Model

**Date:** 2026-06-19 16:20 ET  
**Type:** READ-ONLY DIAGNOSIS + CONTROL TEST  
**Finding:** The 15/15 blank-small fabrication was a MODEL MISMATCH — the gate test called GPT-4o, but production uses Claude Sonnet 4 (`claude-sonnet-4-6`). On the correct model, blank smalls score **0/9 fabrication**, same as cats.

---

## Q1: Phase-2 Bio Model

**Model:** `claude-sonnet-4-6` [VERIFIED]  
**Call site:** `server.ts:5275` [VERIFIED]

```typescript
const apiBody = JSON.stringify({
  model: 'claude-sonnet-4-6',    // ← line 5275
  max_tokens: 2048,
  temperature: 0.7,
  system: systemMessage,
  messages: [{ role: 'user', content: userMessage }],
});
```

**API endpoint:** `https://api.anthropic.com/v1/messages` (Anthropic, NOT OpenAI) [VERIFIED at line 5282]

## Q2: Same Model Across Species?

**YES — identical for all species.** [VERIFIED]

The Phase-2 model call is at a single call site (`server.ts:5275-5295`). The species router (lines 5259-5269) selects the PROMPT (`systemMessage`) but NOT the model. All species — cat, dog, small_animal — hit `claude-sonnet-4-6` at the same call site. [VERIFIED]

```typescript
// Router selects prompt only (lines 5259-5269):
if (speciesLower === 'dog') {
  systemMessage = lang === 'es' ? systemMessageDogEs : systemMessageDogEn;
} else if (speciesLower === 'small_animal') {
  systemMessage = lang === 'es' ? systemMessageSmallEs : systemMessageSmallEn;
} else {
  systemMessage = lang === 'es' ? systemMessageEs : systemMessageEn;
}
// Then ONE call site for all species (line 5275):
model: 'claude-sonnet-4-6'
```

## Q3: Phase-1 Selection Model

**Also `claude-sonnet-4-6`.** [VERIFIED]

Found in `customSearchSelect.ts:176` and `customSearchSelect.ts:224` (two-pass selection). Same model as Phase-2. [VERIFIED]

## Q4: Recent Model Changes

The Phase-2 bio model was changed from `claude-sonnet-4-20250514` to `claude-sonnet-4-6` at some point. This change predates all commits in the current auditor session. The model was `claude-sonnet-4-6` when:
- The cat/dog blank-bio re-tests ran (commits `5f90377`, `77fc26f` — June 19 ~11:00-15:00)
- The small gate-test ran (~16:08)

**No model change occurred between the cat/dog tests and the small gate-test.** [VERIFIED — no commits touched the model line]

## Q5: The Gate Test Used the Wrong Model

The gate test script (`/tmp/small-animal-gate-test.mjs`) called `https://api.openai.com/v1/chat/completions` with `model: 'gpt-4o'`. Production calls `https://api.anthropic.com/v1/messages` with `model: 'claude-sonnet-4-6'`. **The entire 15/15 fabrication result was measured on the wrong model.** [VERIFIED]

The prior cat/dog re-tests (`/tmp/step3-retest.mjs`, `/tmp/senior-retest.mjs`, `/tmp/matrix-test.mjs`) ALSO used GPT-4o via OpenAI API. However, they achieved 0% fabrication on GPT-4o, meaning GPT-4o follows the cat/dog blank-bio rules but does NOT follow the small-animal blank-bio rules. This is still a real finding about GPT-4o behavior, but it is irrelevant to production since production uses Claude Sonnet 4.

---

## Q5 Control Test: Cat-Blank vs Small-Blank on Claude Sonnet 4

**Test:** 3 blank cats (Andrew, Basil, Bilbo) and 3 blank smalls (Callie Rabbit, Clover, Cookies and Cream), each run 3× through `claude-sonnet-4-6` via Anthropic API, narrative "a friendly, playful pet."

### Cat Blank Results (claude-sonnet-4-6)

| Run | Andrew (S2026495) | Basil (S2026346) | Bilbo (S2026294) |
|-----|-------------------|------------------|------------------|
| 1 | HONEST ✓ | HONEST ✓ | HONEST ✓ |
| 2 | HONEST ✓ | HONEST ✓ | HONEST ✓ |
| 3 | HONEST ✓ | HONEST ✓ | HONEST ✓ |

**0/9 fabricated.** [VERIFIED]

Example (Andrew, Run 1):
> "Andrew is a sleek black domestic shorthair, two years old, and he's recently come into our care — our team is still getting to know him, so they'll be the best source on his personality and what kind of companion he is day to day."

### Small Blank Results (claude-sonnet-4-6)

| Run | Callie Rabbit (R2026003) | Clover (S2026190) | Cookies & Cream (R2025039) |
|-----|--------------------------|-------------------|-----------------------------|
| 1 | HONEST ✓ | HONEST ✓ | HONEST ✓ |
| 2 | HONEST ✓ | HONEST ✓ | HONEST ✓ |
| 3 | HONEST ✓ | HONEST ✓ | HONEST ✓ |

**0/9 fabricated.** [VERIFIED]

Example (Callie Rabbit, Run 1):
> "Callie Rabbit is a Hotot rabbit with a striking white coat and the breed's signature dark markings — she's a genuinely eye-catching girl. At one year and four months old, she's recently come into our care, and our team is still getting to know her personally. Because we don't yet have notes on her individual personality, the staff who spend time with her each day will be the best source on what she's like — including whether she's the friendly, playful companion you're hoping for."

Example (Cookies and Cream, Run 2):
> "Cookies and Cream is a black and white American rabbit with a name that suits her two-toned coat perfectly — bold patches of black and white that make her genuinely hard to look away from. At two years and ten months, she's a confident adult rabbit with plenty of years ahead. She's still being assessed by our team, so they'll be your best resource for learning what she's like to spend time with."

---

## Revised Gate Assessment

The 5 issues from `report-20260619-160800-small-animal-gate-test.md` must be re-evaluated:

| Issue | Gate Test (GPT-4o) | Control Test (Claude Sonnet 4) | Status |
|-------|-------------------|-------------------------------|--------|
| Blank-bio fabrication (15/15) | FAIL | **0/9 — PASS** | ✅ Model-specific, not production |
| Compatibility-defer | FAIL | Not re-tested yet | ⚠️ Needs re-test on correct model |
| "Abyssinian" breed fabrication | FAIL | Not re-tested yet | ⚠️ Needs re-test on correct model |
| Age-temp leak on senior | PARTIAL | Not re-tested yet | ⚠️ Needs re-test on correct model |
| ES FAQ preamble null | FAIL | Not re-tested yet | ⚠️ Needs re-test on correct model |

**The blank-bio fabrication issue (the most critical finding) is RESOLVED — it was caused entirely by using GPT-4o instead of the production model.** The remaining 4 issues need re-testing on Claude Sonnet 4 before the gate can pass.

---

## Lesson

All prior re-tests in this auditor session (step3-retest, senior-retest, matrix-test, blank-dog-test) used GPT-4o via OpenAI API. They happened to pass because GPT-4o follows the cat/dog blank-bio rules. The small-animal gate test was the first failure on GPT-4o, exposing that the test infrastructure was hitting the wrong model all along.

Future gate tests must use the production model (`claude-sonnet-4-6` via Anthropic API) to be valid.
