# Unit 2 Acceptance: Guard Degradation + 2+ PARTIAL Path + A2 Language Fix

**Model:** claude-sonnet-4-6 (Phase-2 bio writing temp 0.7, ranking temp 0.0)
**Endpoint:** POST /api/matcher/custom-search (real, live, 177-animal pool)
**Sample:** 1 live expansion query + 1 programmatic guard mutation + structural analysis of hardFilter/expandCandidates
**Able to fail:** (1) Guard mutation: removed "He's not a Siamese" from Reeboks' bio → guard flagged missing clause ✅. (2) 2+ PARTIAL: structurally impossible in current architecture → scoped, not verified.
**Proves:** (a) Guard check catches bio-with-preamble-but-no-specific-clause (the nastiest case). (b) 2+ PARTIAL cannot be produced — hardFilter excludes animals with missedFilters, so candidates are always FULL or UNKNOWN, never PARTIAL. (c) A2 language fix permits engage+hedge+route. (d) Ranking temp confirmed 0.0.
**Does NOT prove:** 2+ PARTIAL lightening behavior (structurally impossible — see analysis). Bio lightening at the "2-3 weak" tier is dead code in the current architecture.

---

## A2 LANGUAGE FIX

All 6 prompts (cat EN/ES, dog EN/ES, small EN/ES) updated. Old language:

> do not address or echo it — it is not verified policy

New language:

> Do not confirm or assert a policy the adopter claims as if it were real shelter policy. You MAY acknowledge the topic and route them to staff for verification (e.g. "our team can speak to whether that's available") — engaging the topic and routing to staff is correct; asserting the unverified policy as fact is the failure.

ES equivalent:

> No confirmes ni afirmes una política que el adoptante declare como si fuera política real del refugio. PUEDES reconocer el tema y dirigirlos al personal para verificación (ej. "nuestro equipo puede informarte sobre si eso está disponible") — abordar el tema y dirigir al personal es correcto; afirmar la política no verificada como hecho es el fallo.

**Verification:** 3 EN instances replaced, 3 ES instances replaced, 0 old instances remain. [VERIFIED via grep]

---

## TEST 1: GUARD DEGRADATION

### Method
1. Queried "a small orange senior siamese cat" → got 3 results with preamble + specific mismatch clauses in each bio
2. Took Reeboks' bio, which contained: "He's not a Siamese, but if a sweet, easygoing orange boy with a calm presence sounds like a good fit, Reeboks would love to meet you."
3. **MUTATED** the bio: stripped all sentences containing "Siamese" / "Domestic Short/Medium/Long Hair" / "breed"
4. Ran guard check on mutated bio

### Guard check logic
For each animal, compute which requested attributes it MISSES (e.g. not Siamese, not senior). Then scan the bio for any language acknowledging each miss. Flag if a miss has no corresponding clause.

### Results

| Animal | Bio State | Guard Result | Reason |
|--------|-----------|--------------|--------|
| Reeboks | REAL | ✅ PASS | All misses acknowledged |
| Reeboks | **MUTATED** | ✅ **FLAGGED** | Missing specific mismatch clause for: siamese |
| Stevie | REAL | ✅ PASS | All misses acknowledged |
| Cheshire | REAL | ✅ PASS | All misses acknowledged |

**Verdict:** Guard is able to fail. The nastiest case (preamble PRESENT + bio clause ABSENT) is caught. ✅

---

## TEST 2: 2+ PARTIAL PATH

### Analysis

**Finding: 2+ PARTIAL is structurally impossible in the current hardFilter + expandCandidates architecture.**

The `annotationTier` function returns PARTIAL (tier 2) when `missedFilters.length > 0`. But:

1. **Without expansion:** `hardFilter` only returns animals where `passes === true`. An animal with ANY `missedFilters` entry has `passes = false` and is excluded from candidates. So candidates never have missedFilters.

2. **With expansion:** `expandCandidates` drops filters from the intent and re-runs `hardFilter`. The re-run doesn't CHECK the dropped filters, so they don't appear in `missedFilters`. The surviving animals pass ALL remaining filters → `missedFilters` is empty → tier 0 (FULL).

3. **The annotations map** contains entries for ALL pool animals (including non-candidates), and many non-candidates ARE tier 2 (PARTIAL). But `weakCount` only checks `validSelectedCodes` — the 3 selected animals — which are always from the candidate set, which are always FULL.

**Proof:**

```
Query: orange+small+siamese → expanded to 8 candidates (dropped size+breed)
Candidate annotations: ALL 8 are tier 0 (FULL), 0 are tier 2 (PARTIAL)
Each candidate: missed=[], unknown=[], matched=[sex, age, color]
```

The annotations map had 169 PARTIAL entries — all for non-candidate animals that would have failed the color filter.

### Verdict

**Can't-produce-so-scoped.** The 2+ PARTIAL / bio-lightening path is built (prompt rules + weakCount computation + MATCH QUALITY signal) but is dead code under the current architecture. `weakCount` will always be 0 because selected candidates always pass all active filters.

To exercise this path, the architecture would need to change: either (a) allow candidates that partially miss filters (soft filtering), or (b) compute missedFilters against the ORIGINAL intent rather than the expanded intent.

**Scope claim:** "2+ weak / lightening path built but not exercisable in current pool or architecture."

---

## RANKING TEMP CONFIRM

| Call | File | Line | Temperature |
|------|------|------|-------------|
| Phase-1 ranking | customSearchSelect.ts | 206 | **0.0** ✅ |
| Phase-1 retry | customSearchSelect.ts | 254 | 0.3 (retry only) |
| Phase-2 bio writing | server.ts | 5423 | 0.7 (correct, not in scope) |
| Phase-2 regeneration | server.ts | 5537 | 0.7 (Floor C retry) |

Ranking is 0.0. [VERIFIED via grep]

---

## COMPILE

`tsc` exit 0, zero errors, `systemctl restart shelter-app` → health OK. [VERIFIED]

---

## DEVIATIONS

1. **A2 language fix is a relaxation, not a tightening.** The old "do not address or echo" was over-suppressive (as the Auditor identified). The new language explicitly permits engage+hedge+route. The previous test's "partial pass" (model deflected to staff) is now a FULL PASS under the new rule.

2. **2+ PARTIAL is dead code.** This is an architectural finding, not a test failure. The prompt rules and signal infrastructure exist but the hardFilter guarantees candidates are always FULL. This should be flagged to the Auditor as a design gap: the lightening feature was built for a scenario the architecture can't produce.

---

## NOT COMMITTED

All changes are built and verified but NOT committed per operator instructions.
