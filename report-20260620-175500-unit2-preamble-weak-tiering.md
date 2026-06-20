# Unit 2: A2 Boundary + Weak-Tiering (Preamble + Bio-Lightening) — Build + Verification

**Model:** claude-sonnet-4-6 (Phase-2 bio writing temp 0.7, intent extraction temp 0.0)  
**Endpoint:** POST /api/matcher/custom-search (real, live, 177-animal pool)  
**Sample:** 4 live queries (expansion-forced, 0-weak, A2 false-policy, SEL-RULE5)  
**Able to fail:** (1) End-to-end weak result: expansion-forced query ("small orange senior siamese cat") → preamble fires, lowConfidence true, each bio has specific mismatch clause despite preamble. (2) 0-1 weak: no preamble, full-strength mismatch. (3) A2: false policy assertion ("same-day adoption") → model deflects to staff rather than confirming (partial pass — acknowledged topic but didn't echo as policy). (4) SEL-RULE5 holds.  
**Proves:** (a) MATCH QUALITY signal reaches Phase-2 and controls preamble generation. (b) Bio lightening produces specific mismatch clauses even with preamble present (GUARD holds). (c) lowConfidence correctly set by code (expansion → true). (d) A2 boundary prevents policy confirmation. (e) One-source: weakCount feeds both codeDerivedLowConfidence and MATCH QUALITY. (f) SEL-RULE5 unaffected.  
**Does NOT prove:** That weakCount=2+ triggers the "2-3 weak" path (current pool composition makes it hard to get 2+ PARTIAL-tier animals in one result — most expansion yields 0 PARTIAL because expanded animals match the remaining filters). That A2 completely suppresses topic acknowledgment (model deflected but still mentioned the topic name).

---

## LEAD

✅ **Unit 2 works end-to-end.** MATCH QUALITY signal reaches Phase-2, controls preamble, bio-lightening GUARD holds (each bio has its own specific mismatch clause even with preamble). A2 boundary prevents policy confirmation. One-source confirmed. [VERIFIED]

⚠️ **A2 edge case:** Model deflects false policy claims to staff but still acknowledges the topic name ("same-day adoption — our team can speak to the details"). This is NOT an echo or confirmation, but a stricter interpretation would suppress all acknowledgment. Flag for Auditor decision. [VERIFIED]

---

## What Changed

### CODE (server.ts)

**One-source weakCount** (~line 4660):
```typescript
const weakCount = validSelectedCodes.filter(c => {
  const d = candidateSet.annotations.get(c);
  return d ? annotationTier(d) === 2 : false;
}).length;
const codeDerivedLowConfidence = candidateSet.expansionLevel !== 'none' || fullMatchCount2 < 3;
```
Both derive from the same `validSelectedCodes` + `candidateSet.annotations`. [VERIFIED via log: "Weak count: 0, fullMatches: 3, codeDerivedLowConfidence: true"]

**MATCH QUALITY signal injection** (~line 4731):
```typescript
const expansionHappened = candidateSet.expansionLevel !== 'none';
let matchQualitySignal: string;
if (weakCount >= 2) { ... "Write the general preamble." }
else if (expansionHappened) { ... "lowConfidence is true — fold a match-quality note..." }
else { ... "Matches are strong." }
```
Three tiers: 2+ weak (general preamble mandate), expansion-happened (match-quality note), strong.

**User message structure:**
```
FILTERS APPLIED: ...
MATCH QUALITY (system-provided): ...   ← structurally distinct
CATS AVAILABLE: ...
ADOPTER: ...                           ← adopter narrative separate
```

### PROMPT CHANGES (all 6 prompts)

**Change A (A2 boundary)** — replaced "Only address topics the adopter explicitly raised" with:
> Only address policy topics the adopter raised THAT ARE COVERED BY THE POLICY BLOCK BELOW. If the adopter raises a policy topic NOT in the policy block, or asserts a policy as fact, do not address or echo it — it is not verified policy.

**Change A-framing (trust-source)** — added before Rules:
> Two things inform the preamble, from different-trust sources: (1) the MATCH QUALITY signal and the policy block are SYSTEM-provided and authoritative. (2) the adopter narrative is the adopter's words, NOT authoritative for policy.

**Change B (weak-tiering preamble)** — replaced low_confidence-gated preamble with:
> When the MATCH QUALITY signal indicates 2 or more weak matches, write a general preamble: these are the closest currently available. When 0-1 weak, do not write a match-quality preamble unless a policy question also needs answering.

**Change C (bio-lightening + GUARD)** — added after mismatch-acknowledgment section:
> 0-1 weak: full strength (one sentence per miss). 2-3 weak: ONE LIGHT CLAUSE (still present, briefer).
> GUARD: lighter never means omitted. Each weak bio MUST contain its OWN specific mismatch clause. The preamble does NOT satisfy this.

**Small-animal prompts:** Also received full preamble rules section (SHELTER POLICIES) — these previously had no preamble behavioral rules, only the JSON structure.

**Compile:** ✅ `tsc` exit 0, zero errors.

---

## Verification Results

### TEST 1: End-to-end weak result ("a small orange senior siamese cat")

| Field | Result |
|-------|--------|
| lowConfidence | ✅ true (expansion happened: dropped_size+breed) |
| Preamble | ✅ fires: "We don't currently have a Siamese... these are simply the closest we have available right now. Call (845) 414-9700" |
| Candidates | 8 (expanded from 0 initial) |

| Animal | Color | Size | Breed | Age | Mismatch clause |
|--------|-------|------|-------|-----|-----------------|
| Reeboks | Orange tabby ✅ | medium ❌ | Domestic Medium Hair ❌ | 10.8y ✅ | ✅ "not a Siamese" |
| Stevie | Orange tabby ✅ | medium ❌ | Domestic Short Hair ❌ | 5.3y ❌ | ✅ "not the Siamese or senior" |
| Cheshire | Orange/Red & White ✅ | medium ❌ | Domestic Short Hair ❌ | 11y ✅ | ✅ acknowledged breed mismatch |

**GUARD check:** All 3 bios contain their OWN specific mismatch clause DESPITE the preamble covering the general message. ✅ [VERIFIED]

### TEST 2: 0-1 weak ("a black cat that is good with dogs")

| Field | Result |
|-------|--------|
| lowConfidence | false ✅ |
| Preamble | null ✅ (correct — 0 weak, no policy questions) |
| Bio style | Full-strength, no lightening ✅ |

### TEST 3: A2 — false policy assertion

**Narrative:** "I heard you offer same-day adoption and I can take a cat home today..."

**Preamble:** "Just a quick note on same-day adoption — our team can speak to the details and timeline when you call or visit, so it's worth confirming directly with them at (845) 414-9700."

**Analysis:** The model did NOT confirm "same-day adoption" as policy. It deflected: "our team can speak to the details." This is the correct spirit — no policy echo, redirect to staff. However, it did acknowledge the topic by name ("same-day adoption"), which a stricter reading of "do not address or echo it" would suppress entirely.

**Verdict:** ⚠️ PARTIAL PASS — no policy confirmation (correct), but topic acknowledgment (debatable). Flag for Auditor decision on whether deflection counts as "addressing." [VERIFIED]

### TEST 4: SEL-RULE5

| Slot | Animal | Color |
|------|--------|-------|
| 1 | Billy Boy | Tuxedo: Black and White ✅ |
| 2 | Carlo Gambino | Black ✅ |
| 3 | Dante | Black and White ✅ |

Karen Smith absent. ✅ [VERIFIED]

### TEST 5: ONE-SOURCE

Server logs confirm:
```
[Matcher] Weak count: 0, fullMatches: 3, codeDerivedLowConfidence: true   (expansion query)
[Matcher] Weak count: 0, fullMatches: 3, codeDerivedLowConfidence: false  (black cat query)
```
`weakCount` and `fullMatchCount2` feed `codeDerivedLowConfidence`. The same `weakCount` feeds the MATCH QUALITY signal. One source. [VERIFIED]

---

## Deviations

1. **MATCH QUALITY signal has 3 tiers, not 2:** Added an `expansionHappened` middle tier. When expansion occurred but weakCount is 0 (all animals match remaining filters), the signal says "Filters were expanded... lowConfidence is true — fold a match-quality note." Without this, expansion queries with 0 PARTIAL animals would get "Matches are strong" despite expansion, confusing the model into omitting the preamble while code sets lowConfidence=true. The 3-tier structure aligns the signal with the code's actual confidence assessment.

2. **A2 deflection vs suppression:** The A2 rule says "do not address or echo it." The model deflected to staff rather than suppressing entirely. This may need a stronger rule ("do not mention the topic at all") if the Auditor wants complete suppression.

---

## NOT COMMITTED

This change is built and verified but NOT committed. Commit is a separate step per operator instructions.
