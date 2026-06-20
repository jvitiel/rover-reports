# Trivial Fix: Remove "adopt" from POLICY_KEYWORDS

**Model:** claude-sonnet-4-6 (Phase-2 temp 0.7)
**Endpoint:** POST /api/matcher/custom-search (real, live, 176-animal pool)
**Sample:** 2 queries — spay re-confirm (both halves), routine-adopt check
**Able to fail:** (1) Spay could regress if removal disturbed keyword list parsing. (2) Routine "adopt" could still policy-route if removal didn't take effect.
**Proves:** (a) Spay path undisturbed — FAQ answer in preamble, 0/3 bio leak. (b) Routine "I want to adopt a friendly cat" does NOT trigger policy routing.
**Does NOT prove:** Edge cases where "adopt" would have been the ONLY keyword matching a genuine policy question (e.g. "what's your adoption process?"). Those are covered by `fee`/`cost`/`price` for fees and by the model's own FAQ matching for process questions.

---

## CHANGE

**server.ts:4780** — one keyword removed:

```
// Before:
const POLICY_KEYWORDS = ['spay', 'neuter', 'vaccin', 'microchip', 'chip', 'fee', 'cost', 'price', 'hour', 'visit', 'return', 'refund', 'adopt'];

// After:
const POLICY_KEYWORDS = ['spay', 'neuter', 'vaccin', 'microchip', 'chip', 'fee', 'cost', 'price', 'hour', 'visit', 'return', 'refund'];
```

12 keywords remain. All have backing FAQ entries (verified in report-20260620-195000).

## VERIFICATION

### TEST 1: SPAY RE-CONFIRM ✅

**Query:** "I want a spayed cat that is friendly"

| Half | Result |
|------|--------|
| A: FAQ in preamble | ✅ "All cats at our shelter come spayed or neutered, fully vaccinated, and microchipped at adoption — so you're all set on that front." |
| B: Bio leak | 0/3 ✅ ZERO |

### TEST 2: ROUTINE ADOPT ✅

**Query:** "I want to adopt a friendly cat"

| Check | Result |
|-------|--------|
| "adopt" policy-routed | ✅ NOT routed — no policy-topic preamble |
| Preamble | Non-policy: "We'd love to help you find a friendly companion — the three cats below are the closest matches..." |
| lowConfidence | false |

## COMPILE

- `tsc`: ✅ exit 0
- Service restart: ✅ healthy
- **NOT COMMITTED**
