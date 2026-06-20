# Spay/Neuter FAQ Routing Fix — Build + Verification

**Model:** claude-sonnet-4-6 (Phase-2 bio writing temp 0.7, ranking temp 0.0)
**Endpoint:** POST /api/matcher/custom-search (real, live, 176-animal pool)
**Sample:** 4 queries — spay re-test (2-half able-to-fail), flying-cat regression, strong regression, SEL-RULE5 regression
**Able to fail:** Before this fix, "a spayed cat that is friendly" → generic preamble (no FAQ answer) + 2/3 bios leaked spay/neuter. After fix, both halves must pass: (A) preamble carries FAQ answer, (B) 0/3 bios mention spay. Both PASSED.
**Proves:** (a) Policy topics extracted as soft terms are reclassified at signal-assembly time → model receives `POLICY TOPICS RAISED` (preamble-only) instead of `SOFT TERMS` (per-animal). (b) When only policy topics are raised and animal preferences are fully met, gate says "do NOT write match-quality preamble, DO write policy-answer preamble." (c) No regression on flying-cat, strong query, or SEL-RULE5.
**Does NOT prove:** (a) Other policy keywords (vaccination, microchip, fees, hours) — only spay tested. (b) Mixed case (policy topic + preference + hard miss) — not tested. (c) ES translation of FAQ routing — not tested this round.

---

## ROOT CAUSE

The intent extractor bucketed "spayed" as a SOFT TERM. The PREAMBLE SIGNAL then told the model: `SOFT TERMS stated: [spayed, friendly]. Assess per-animal...` — which instructed the model to treat spay/neuter as a per-animal preference. The model followed the user-message instruction over the system-prompt rule. The system-prompt "policy-topic category" rule was insufficient because:
1. The user message (PREAMBLE SIGNAL) instruction was more immediate/specific
2. The model correctly followed the more specific instruction over the general rule

## FIX (two layers)

### Layer 1: Signal-assembly code (server.ts:4780-4827)

Split soft terms into `policyTopics` and `preferences` at signal-assembly time using a keyword list:

```typescript
const POLICY_KEYWORDS = ['spay', 'neuter', 'vaccin', 'microchip', 'chip',
  'fee', 'cost', 'price', 'hour', 'visit', 'return', 'refund', 'adopt'];
const policyTopics = intent.softTerms.filter(t =>
  POLICY_KEYWORDS.some(k => t.toLowerCase().includes(k)));
const preferences = intent.softTerms.filter(t =>
  !POLICY_KEYWORDS.some(k => t.toLowerCase().includes(k)));
```

Three-way gate logic:
1. **No topics, no misses** → `INTENT STATUS: fully met` + gate: do NOT write preamble
2. **Policy topics only, no misses** → `INTENT STATUS: fully met (animal preferences satisfied). Adopter also raised policy topics.` + `POLICY TOPICS RAISED: [spayed]` + gate: do NOT write match-quality, DO write policy-answer preamble, bios clean
3. **Misses and/or preferences** → `INTENT STATUS: not fully met` + existing hard-miss/expansion/soft-terms lines + gate: write general preamble. Policy topics (if any) get their own `POLICY TOPICS RAISED` line with "preamble only" instruction.

### Layer 2: Prompt rule (all 6 prompts, server.ts:4938, 5056, 5176, 5295, 5418, 5541)

Policy-topic category rule (belt to the signal's suspenders):
> "Some topics the adopter raises are answered by the SHELTER POLICY block below (spay/neuter, vaccination, microchip, fees, hours, the adoption process). These are shelter-wide facts true of ALL animals. When the adopter raises one, answer it from the policy block IN THE PREAMBLE ONLY — never mention it in individual bios, because it applies to every animal equally. Do not treat a policy topic as a per-animal preference. Even if the PREAMBLE SIGNAL categorized the topic as a SOFT TERM, if you can see it is answered by a policy entry below, handle it as a policy topic: preamble answer, zero bios."

---

## VERIFICATION RESULTS

### TEST 1: SPAY/NEUTER RE-TEST ✅ (both halves)

**Query:** "I want a spayed cat that is friendly"

| Half | Before fix | After fix |
|------|-----------|-----------|
| A: FAQ answer in preamble | ❌ generic "closest matches" | ✅ "All cats at our shelter come spayed or neutered, fully vaccinated, and microchipped at adoption — so you're all set on that front." |
| B: Bio leak count | 2/3 leaked | 0/3 ✅ ZERO |

Full preamble: "All cats at our shelter come spayed or neutered, fully vaccinated, and microchipped at adoption — so you're all set on that front. The three cats below are the closest matches we have right now, and we think you'll love getting to know them. If none feel quite right, give us a call at (845) 414-9700 and we can talk through what else might be coming available."

Individual bios: Abe (Louie) ✅ clean, Edna ✅ clean, Carlo Gambino ✅ clean.

### TEST 2: FLYING-CAT REGRESSION ✅

**Query:** "a cat that can fly"
- Preamble fires: ✅
- Fly in preamble: ✅
- Fly in bios: ✅ clean
- **NO REGRESSION**

### TEST 3: STRONG QUERY REGRESSION ✅

**Query:** "a black cat"
- Preamble: ✅ null
- lowConfidence: ✅ false
- **NO REGRESSION**

### TEST 4: SEL-RULE5 ALL-BLACK ✅

**Query:** "a black cat"
- Abe (Louie): Black with white ✅
- Edna: White with black ✅
- Billy Boy: Tuxedo: Black and White ✅
- **NO REGRESSION**

---

## BACKLOG NOTE: DURABLE EXTRACTOR FIX

The current fix handles policy topic routing at **signal-assembly** time using a keyword list. The durable fix is to modify the **intent extractor** to bucket policy topics as a THIRD category (alongside hard attributes and soft terms) at extraction time. This would:
1. Eliminate the keyword list (model-judged instead of regex)
2. Handle novel policy topics not in the keyword list
3. Surface the category in the intent extraction log for debugging
4. Allow the extractor to return structured `{hardAttributes, softTerms, policyTopics}`

**Not built this round.** Logged as backlog item.

---

## COMPILE

- `tsc`: ✅ exit 0, zero errors
- Service restart: ✅ healthy
- **NOT COMMITTED**
