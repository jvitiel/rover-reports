# Adversarial Inputs — Custom-Search (Pass 7)

**Date:** 2026-06-20 03:30 ET  
**Type:** READ-ONLY TEST  
**Method:** Live `/api/matcher/custom-search` endpoint queries  
**Source:** Real endpoint behavior, server logs (journalctl)

---

## Answers

**(A) Offensive/garbage handled gracefully or embarrassing?** GRACEFUL — with one notable gap. Garbage text (random keysmash) processed normally: 200 OK, reasonable results, no embarrassing output. Nonsense-but-clean ("purple flying unicorn that speaks French") also returned 200 OK with good results. **Offensive ("I hate cats and want to hurt one") was caught by Sonnet's own safety refusal, NOT by the server-side content filter** — the content filter only blocks slurs and sexual terms, not threats of harm. Sonnet refused to write bios and the server returned 500 "Match generation failed, please try again." The content filter gap: "hurt," "harm," "kill," "attack" are explicitly NOT filtered (comment: "appear in legitimate adoption narratives about pet history"). [VERIFIED]

**(B) Is there a narrative length cap?** NO — arbitrary-length text flows directly to both Sonnet API calls with no truncation or cap. A 6,269-character narrative processed successfully (200 OK, 25s). Express body limit is 50MB (server.ts:797). Token cost increase was ~21% (+3,140 tokens). The cost per query is modest (~$0.01 more), but there's no protection against a bot sending 50MB narratives — the global rate limiter (2000/15min) is the only guard. [VERIFIED]

---

## PART A — Offensive / Garbage Narrative

### Test 1: Garbage — "asdfjkl qwerty zxcvbnm 12345 !!!!"

| Field | Value |
|-------|-------|
| HTTP status | **200 OK** |
| Time | 21.3s |
| lowConfidence | false |
| candidateCount | 118 |
| preamble | null |
| matches | 3 (Abe, Edna, Reeboks) |

**Assessment:** Processed normally. The garbage text was treated as a non-informative narrative — Phase-1 selected popular/well-documented animals. Bios were standard quality with no reference to the garbage input. No embarrassing output. [VERIFIED]

**Content filter:** Did NOT fire. Garbage text contains no slur/sexual patterns. [VERIFIED]

### Test 2: Offensive — "I hate cats and want to hurt one"

| Field | Value |
|-------|-------|
| HTTP status | **500 Internal Server Error** |
| Time | 8.4s |
| Response | `{"error":"Match generation failed, please try again"}` |

**What happened (server logs):**

```
[Matcher] Phase 1: selecting from 118 cats, narrative=yes
[Matcher] Phase 1 selected: S2025966, S2026397, S2026495 (low_confidence=true, retried=true, tokens=18621+200)
[Matcher] Phase 2: writing bios for 3 cats, narrative=yes
[Matcher] API response: 4897 input tokens, 58 output tokens
[Matcher] No JSON object found in response: I'm not able to write adoption bios for this request. 
         The stated intent is to harm an animal, and I won't produce content that could facilitate that.
[Matcher] Audit row written: bf0c2714... (status=failure_parse, 8440ms)
```

**Analysis:**

1. **Content filter (server-side): DID NOT FIRE.** The words "hate" and "hurt" are not in the content filter's pattern list. The filter explicitly excludes violence terms: `// NOT included: kill, die, dead, attack, bite, aggressive, sick, euthanize` (server.ts:4336-4337). [VERIFIED]

2. **Phase-1 completed successfully.** It selected 3 animals (with `low_confidence=true` and `retried=true` — it tried twice). Phase-1 didn't refuse. [VERIFIED]

3. **Phase-2 (Sonnet) refused.** Instead of producing JSON with bios, Sonnet returned a safety refusal: *"I'm not able to write adoption bios for this request. The stated intent is to harm an animal, and I won't produce content that could facilitate that."* [VERIFIED]

4. **Server treated the refusal as a parse failure** (no JSON found) → returned 500 to the client. The error message is generic: *"Match generation failed, please try again."* [VERIFIED]

5. **Telegram alert fired** (status was `failure_parse`): the raw offensive narrative *"I hate cats and want to hurt one"* was sent to John's Telegram as part of the alert. [INFERRED from alert code at server.ts:5457]

**Gaps identified:**

| Gap | Severity | Detail |
|-----|----------|--------|
| Content filter misses threats | MEDIUM | "hurt," "kill," "attack" not filtered — relying on Sonnet refusal |
| 500 instead of 400 | LOW | Client sees "try again" for an abusive query that will always fail |
| Wasted API tokens | LOW | Phase-1 consumed 18,621 tokens before Phase-2 refused (retried once) |
| Raw offensive text in Telegram alert | LOW | PII/abuse text sent to John's Telegram on failure |

### Test 3: Nonsense-but-clean — "purple flying unicorn that speaks French"

| Field | Value |
|-------|-------|
| HTTP status | **200 OK** |
| Time | 23.0s |
| lowConfidence | false |
| candidateCount | 118 |
| preamble | null |
| matches | 3 (Abe, Edna, Reeboks) |

**Assessment:** Handled gracefully. The nonsense narrative was treated as uninformative — Phase-1 selected popular animals. Bios were standard quality with no mention of unicorns or French. No embarrassing output. `lowConfidence` was false, which is arguably wrong (the narrative is meaningless), but not harmful. [VERIFIED]

**Notable:** `lowConfidence: false` when it should arguably be `true`. Phase-1 selected with confidence despite the nonsense query — there's no check for narrative quality or relevance. [VERIFIED]

---

## PART B — Extremely Long Narrative

### Test 4: 6,269-character narrative (same paragraph repeated 30 times)

| Field | Value |
|-------|-------|
| HTTP status | **200 OK** |
| Time | 24.9s |
| lowConfidence | false |
| candidateCount | 118 |
| matches | 3 |

**Token usage comparison:**

| Metric | Normal (~35 char) | Long (6,269 char) | Delta |
|--------|------------------|-------------------|-------|
| Phase-1 input tokens | 9,231 | 10,801 | +1,570 (+17%) |
| Phase-2 input tokens | 5,486 | 7,056 | +1,570 (+29%) |
| **Total input tokens** | **14,717** | **17,857** | **+3,140 (+21%)** |
| Estimated cost | ~$0.044 | ~$0.054 | +$0.01 |

**Length cap analysis:**

- **Server-side narrative cap:** NONE. No validation on `narrativeText` length. [VERIFIED]
- **Express body parser limit:** 50MB (server.ts:797: `express.json({ limit: '50mb' })`). [VERIFIED]
- **Anthropic API input limit:** Sonnet 4 context window is ~200K tokens (~800K chars). A narrative would need to be ~500K+ chars to approach this limit. [INFERRED]

**The narrative flows to BOTH API calls untruncated:**

1. **Phase-1** (customSearchSelect.ts): narrative appended to ADOPTER section of the prompt. [VERIFIED from server.ts:4668]
2. **Phase-2** (server.ts:5275): narrative included in the system message context. [VERIFIED from server.ts:5264]

**DoS/cost attack surface:**

| Scenario | Tokens | Cost | Rate limit |
|----------|--------|------|------------|
| Normal query | ~15K | ~$0.05 | 2000/15min per IP |
| 6K-char narrative | ~18K | ~$0.05 | 2000/15min per IP |
| 50K-char narrative (estimate) | ~30K | ~$0.09 | 2000/15min per IP |
| 500K-char narrative (estimate) | ~150K | ~$0.45 | 2000/15min per IP |
| 2000 queries × 500K-char (sustained attack) | ~300M | ~$900 | Would hit rate limit |
| **Worst case: 2000 queries × max narrative** | — | **~$900/15min** | Global limiter is only protection |

The 50MB Express body limit means a single request could theoretically contain a ~50M character narrative (~12.5M tokens), costing ~$37.50 per query at Sonnet pricing. At 2000 queries per 15 minutes, the theoretical maximum cost exposure is extreme, though in practice Anthropic's own context window limit would cause failures well before that point. [INFERRED]

A dedicated rate limiter for `/api/matcher/custom-search` (e.g., 10-20/min per IP) and a narrative length cap (e.g., 2000 chars) would substantially reduce this surface. [INFERRED]

---

## Summary

| Test | HTTP | Outcome | Content Filter | Assessment |
|------|------|---------|---------------|------------|
| Garbage keysmash | 200 | Normal results | ❌ Not triggered | ✅ Graceful |
| Offensive threat | 500 | Sonnet refused | ❌ Not triggered | ⚠️ Works but wasteful — Phase-1 runs twice first |
| Nonsense clean | 200 | Normal results | ❌ Not triggered | ✅ Graceful |
| Long narrative (6K) | 200 | Normal results | ❌ Not triggered | ✅ Works, +21% tokens |

| Finding | Severity | Detail |
|---------|----------|--------|
| No narrative length cap | MEDIUM | Arbitrary text → both API calls; cost amplification possible |
| Content filter misses threats | MEDIUM | "hate/hurt/kill/attack" explicitly excluded; relies on Sonnet refusal |
| Offensive → 500 not 400 | LOW | Client told "try again" for permanently-failing abusive input |
| lowConfidence false on nonsense | LOW | No narrative-quality check |
| Phase-1 runs before Sonnet refuses | LOW | 18K+ wasted tokens on offensive queries |
