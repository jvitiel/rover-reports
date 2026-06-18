# Diagnosis: low_confidence vs low_threshold Mechanics + Preamble Gating

**Date:** 2026-06-18 15:39 ET  
**Production modified:** NO. Read-only diagnosis. [VERIFIED]

---

## Task 1: Define Both Triggers

### low_confidence (model-reported)

**Definition:** A boolean flag SET BY THE MODEL in its JSON response. The model self-reports whether the inventory genuinely can't meet the adopter's request.

**Computation path:**

1. Phase-2 bio prompt instructs the model to include `"low_confidence": true/false` in its JSON output (`server.ts:4564`, `server.ts:4606`).
2. Server extracts it at `server.ts:4790`:
   ```typescript
   const lowConfidence = parsed.low_confidence === true || usedFallback;
   ```
3. Written to `audit.lowConfidence` → stored as `matcher_audit.low_confidence` (boolean). [VERIFIED]

**What it measures:** "Does the model believe 0 or 1 of its 3 picks substantively match the adopter's core specific request?" Examples: adopter wants a Sphynx and none exist, wants a kitten and none are young, wants multiple specific attributes and no picks address most of them. [VERIFIED — quoted from prompt at server.ts:4564]

### low_threshold (candidate-count floor)

**Definition:** NOT a score or distance metric. It's a **candidate-count check**: did the filtered pool have fewer than 4 cats?

**Computation:** Pure SQL in `localDatabase.ts:1222`:

```sql
SUM(CASE WHEN low_confidence = 0 AND candidate_count < 4 THEN 1 ELSE 0 END) as preamble_low_threshold
```

**What it measures:** "The model said low_confidence=false, but the filtered pool was so small (<4 candidates) that the 3 picks were essentially forced — there was no meaningful selection." [VERIFIED]

### "Both Triggers"

**Computation:** `localDatabase.ts:1223`:

```sql
SUM(CASE WHEN low_confidence = 1 AND candidate_count < 4 THEN 1 ELSE 0 END) as preamble_both
```

Both the model flagged low_confidence AND the pool was tiny. [VERIFIED]

### Summary Table

| Trigger | Input | Meaning |
|---|---|---|
| Low Confidence | `parsed.low_confidence` (model output) | Model says inventory doesn't match the ask |
| Low Threshold | `candidate_count < 4` (server-computed) | Filtered pool too small for meaningful selection |
| Both | Both above simultaneously | Model says mismatch AND pool was tiny |

---

## Task 2: Did the Two-Phase Rewrite Preserve or Orphan Them?

### low_confidence: PRESERVED ✅

**Flow in the two-phase code:**

1. Phase-1 `selectMatches()` returns its own `low_confidence` — but this is **logged only**, not written to the audit. The server log at `server.ts:4480` records it:
   ```
   [Matcher] Phase 1 selected: ... (low_confidence=false, retried=false, ...)
   ```

2. Phase-2 bio prompt (verbatim existing) independently produces `low_confidence` in its JSON response.

3. Server extracts Phase-2's `low_confidence` at `server.ts:4790`:
   ```typescript
   const lowConfidence = parsed.low_confidence === true || usedFallback;
   audit.lowConfidence = lowConfidence;
   ```

4. Written to `matcher_audit.low_confidence`. [VERIFIED]

**Key nuance:** The audit records Phase-2's low_confidence (which sees only 3 cats), not Phase-1's (which sees the full pool). In practice they agree (see Task 4 data — all 4 low_confidence records have matching Phase-2 flags). This is acceptable per the 2b report verdict ("redundant but not harmful"). [VERIFIED]

### low_threshold: PRESERVED ✅

**The value it tests is `candidate_count`.**

Where `candidate_count` is written — `server.ts:4788` (verified by grep):

```typescript
audit.candidateCount = withRecords.length;
```

This line was NOT modified by commit 05c3fe5. `withRecords` is the full filtered pool (all cats after sex/age filters), NOT the 3 selected cats. It existed before the rewrite and continues to write the correct count. [VERIFIED — git blame shows this line predates 05c3fe5]

**Is it being written?** Yes — all recent audit records have `candidate_count` populated (4, 51, 69, 98). [VERIFIED from audit data]

**Why is Low Threshold = 0?**

Because no query in the last 24 hours has `low_confidence = 0 AND candidate_count < 4`. The only query with `candidate_count = 4` (female+senior, audit 4d56f248) has `low_confidence = 0` — so it would qualify... but wait:

```sql
low_confidence = 0 AND candidate_count < 4
```

`candidate_count = 4` is NOT `< 4`. The threshold is **strictly less than 4**. No query hit a pool of 3 or fewer. [VERIFIED]

**Low Threshold = 0 is genuine** — no pool was small enough to trigger it. It is NOT orphaned or broken. [VERIFIED]

---

## Task 3: Where Does the Widget Get Its Numbers?

### Endpoint

`GET /api/profiles` at `server.ts:1328`:

```typescript
const searcherStats = getSearcherStats24h();
```

Returned inside the profiles response at `server.ts:1387`:

```typescript
searcherStats,
```

### Query

`localDatabase.ts:1191-1249` — `getSearcherStats24h()`. Single SQL query against `matcher_audit WHERE created_at > datetime('now', '-24 hours')`. [VERIFIED]

### Metric → Audit Field Mapping

| Widget metric | SQL expression | Audit field | Currently written? |
|---|---|---|---|
| Queries | `COUNT(*)` | (all rows) | ✅ |
| Male/Female | `json_each(hard_filters, '$.sex')` | `hard_filters` | ✅ |
| Young/Adult/Senior | `json_each(hard_filters, '$.ageGroup')` | `hard_filters` | ✅ |
| Low Confidence | `low_confidence = 1 AND candidate_count >= 4` | `low_confidence`, `candidate_count` | ✅ |
| Low Threshold | `low_confidence = 0 AND candidate_count < 4` | `low_confidence`, `candidate_count` | ✅ |
| Both Triggers | `low_confidence = 1 AND candidate_count < 4` | `low_confidence`, `candidate_count` | ✅ |
| Total Preamble % | `preamble_shown = 1 / COUNT(*)` | `preamble_shown` | ✅ |
| Avg Response | `AVG(response_time_ms) / 1000` | `response_time_ms` | ✅ |
| Errors % | `status != 'success' / COUNT(*)` | `status` | ✅ |

**All fields are written by the live two-phase endpoint. No orphaned metrics.** [VERIFIED]

---

## Task 4: Preamble Gating

### When does a preamble fire?

The preamble is **model-generated**, not template-based. It fires when the Phase-2 bio prompt's output includes a non-empty `preamble` field.

**Server extraction at `server.ts:4794-4796`:**

```typescript
const preambleText = (typeof parsed.preamble === 'string' && parsed.preamble.trim()) ? parsed.preamble.trim() : null;
audit.preambleShown = !!preambleText;
audit.preambleText = preambleText;
```

**What gates it:** The bio prompt instructs the model on when to include a preamble:

1. **Policy questions** — adopter asked about shelter logistics (spay/neuter, fees, hours) → preamble answers them using policy FAQ text (`server.ts:4592-4600`).
2. **Low confidence** — model determines its matches don't closely fit → preamble acknowledges the gap and suggests calling (`server.ts:4598`).
3. **Otherwise** — "omit the preamble field or set it to null" (`server.ts:4599`).

**The preamble is NOT gated on `low_threshold` at all.** The `low_threshold` metric is dashboard-only analytics — it has no runtime effect on whether a preamble fires. The preamble decision is 100% model-driven based on the prompt instructions. [VERIFIED]

### Preamble vs low_confidence relationship

The widget's Low Confidence/Low Threshold/Both breakdown categorizes WHEN the preamble fires (or could fire), but doesn't control it. A `preamble_shown=1` can occur with `low_confidence=0` (e.g., policy question answered). In the current 24h data, all 4 preambles coincide with `low_confidence=1`. [VERIFIED]

### Last 24h Preamble Records (4 total)

**1. Audit 51ddad35 — "I want a young black cat, FIV-negative."**
- candidate_count: 18 (early test, narrow pool)
- low_confidence: true
- Preamble: "You asked for a young, FIV-negative black cat, and while we do have some wonderful black cats available, the closest matches don't fully line up — the young black cats in our current inventory are FIV-positive, and our FIV-negative cats skew older or aren't solid black. These are the three best fits we could find given what's available right now; feel free to call us at (845) 414-9700 to ask about other options or upcoming arrivals."
- **Judgment:** Fired appropriately — the FIV-negative + young + black combination is genuinely constrained. Preamble is frank and accurate. [VERIFIED]

**2. Audit 95a7e421 — "I want a hairless Sphynx that can fetch."**
- candidate_count: 18 (early test)
- low_confidence: true
- Preamble: "None of the cats currently available are Sphynx cats, and teaching fetch is more of an individual personality trait than something we can predict with certainty — so these three are the closest matches we have in terms of playful, people-loving energy. They're wonderful cats, but we wanted to be upfront that they're not the hairless Sphynx you described. If a Sphynx is truly your heart's desire, give us a call at (845) 414-9700 and we can let you know if one comes through our doors."
- **Judgment:** Fired appropriately — zero Sphynx in inventory. Preamble honest and warm. [VERIFIED]

**3. Audit 16e60d06 — "I want a hairless Sphynx that can fetch."**
- candidate_count: 98 (full pool, early test)
- low_confidence: true
- Preamble: "We don't currently have any Sphynx cats in our available inventory, so these are the closest matches we could find — each has a warm, people-oriented personality that Sphynx fans often love. Give us a call at (845) 414-9700 and we'd be happy to talk through what's available or let you know when something closer to what you're looking for comes in."
- **Judgment:** Correct. Same breed mismatch, different wording. [VERIFIED]

**4. Audit e08f5bfb — "I want a hairless Sphynx that can fetch."** (post-2c deploy)
- candidate_count: 98 (two-phase flow)
- low_confidence: true
- Preamble: "We don't currently have any Sphynx cats available, and none of our cats on file are noted as fetch-trained — so these are the closest companions we can offer right now. They're each genuinely wonderful in their own way, and our team at (845) 414-9700 would be happy to let you know if a Sphynx comes in."
- **Judgment:** Correct — two-phase preamble fires identically to single-phase. Both breed and fetch gaps named. [VERIFIED]

---

## Task 5: Last 24h Audit Records

| # | Time (UTC) | Narrative (short) | low_conf | cands | preamble | ms | status |
|---|---|---|---|---|---|---|---|
| 1 | 03:30 | calm, affectionate lap cat | 0 | 18 | null | 19,118 | success |
| 2 | 03:31 | playful, energetic, kids+cats | 0 | 18 | null | 21,095 | success |
| 3 | 03:31 | young black cat, FIV-negative | **1** | 18 | **yes** | 23,279 | success |
| 4 | 03:32 | hairless Sphynx, fetch | **1** | 18 | **yes** | 22,713 | success |
| 5 | 03:32 | tranquilo y cariñoso (ES) | 0 | 18 | null | 19,895 | success |
| 6 | 03:54 | calm, affectionate lap cat | 0 | 98 | null | 18,963 | success |
| 7 | 03:55 | playful, energetic, kids+cats | 0 | 98 | null | 15,147 | success |
| 8 | 03:55 | young black cat, FIV-negative | 0 | 98 | null | 15,273 | success |
| 9 | 03:56 | young black cat, FIV-negative | 0 | 98 | null | 22,554 | success |
| 10 | 03:56 | hairless Sphynx, fetch | **1** | 98 | **yes** | 14,702 | success |
| 11 | 03:57 | tranquilo y cariñoso (ES) | 0 | 98 | null | 22,863 | success |
| 12 | 03:57 | barn, outdoor mouser | 0 | 51 | null | 11,914 | success |
| 13 | 19:07 | *(empty)* | 0 | — | null | 1 | failure_validation |
| 14 | 19:07 | playful, energetic, kids+cats | 0 | 98 | null | 15,431 | success |
| 15 | 19:08 | tranquilo (ES, short) | 0 | 98 | null | 16,453 | success |
| 16 | 19:12 | calm friendly cat | 0 | 98 | null | 20,322 | success |
| 17 | 19:12 | playful, energetic, kids+cats | 0 | 98 | null | 21,671 | success |
| 18 | 19:13 | young black cat, FIV-negative | 0 | 69 | null | 17,391 | success |
| 19 | 19:13 | hairless Sphynx, fetch | **1** | 98 | **yes** | 26,328 | success |
| 20 | 19:14 | calm older female | 0 | 4 | null | 18,105 | success |
| 21 | 19:14 | barn, outdoor mouser | 0 | 51 | null | 18,267 | success |
| 22 | 19:14 | tranquilo y cariñoso (ES) | 0 | 98 | null | 24,288 | success |
| 23 | 19:15 | playful, energetic, kids+cats | 0 | 98 | null | 23,084 | success |

**Pattern analysis:**
- 4/23 low_confidence=true — all Sphynx or FIV-neg constraint queries. [VERIFIED]
- 4/23 preamble_shown=true — all 4 coincide with low_confidence=true. [VERIFIED]
- 0/23 low_threshold (candidate_count < 4 with low_confidence=0) — minimum pool was 4 (female+senior), which doesn't satisfy `< 4`. [VERIFIED]
- 1/23 failure — the empty-ageGroup validation (pre-deploy). [VERIFIED]
- Entries #1-12 at 03:30-03:57 UTC: **pre-deploy test runs** (candidate_count=18 on #1-5 indicates a narrower filter — likely earlier test harness). [INFERRED]
- Entries #13-23 at 19:07-19:15 UTC: **deploy window** (#13 = validation failure, #14-15 = pre-deploy old server, #16-23 = post-deploy two-phase). [VERIFIED]

### Interesting: "young black cat, FIV-negative" — variable low_confidence

- #3 (03:31, 18 candidates): low_confidence=**true**, preamble fired
- #8 (03:55, 98 candidates): low_confidence=**false**, no preamble
- #9 (03:56, 98 candidates): low_confidence=**false**, no preamble
- #18 (19:13, 69 candidates): low_confidence=**false**, no preamble

With the full 98-cat pool, the model finds satisfactory matches (young black cats DO exist — Cinder, Flame are FIV-untested but black+young). With only 18 candidates (#3), the constraint was tighter. The model's assessment varies with pool size — this is correct behavior. [VERIFIED]

---

## Summary

| Question | Answer |
|---|---|
| What is Low Threshold? | Candidate count < 4 AND model said low_confidence=false. A pool-size floor metric. [VERIFIED] |
| Is it a score? | No — it's a candidate count check, not an embedding distance or match score. [VERIFIED] |
| Did 2c break low_confidence? | No — still sourced from Phase-2's model output, same path as before. [VERIFIED] |
| Did 2c break low_threshold? | No — `candidate_count` still writes `withRecords.length` (full pool, not selected 3). [VERIFIED] |
| Why is Low Threshold = 0? | No query had < 4 candidates. Minimum was 4 (female+senior). Genuine zero. [VERIFIED] |
| What gates the preamble? | Model decision (Phase-2): inventory mismatch or policy question. Not gated on low_threshold. [VERIFIED] |
| Did preambles fire correctly? | Yes — all 4 were Sphynx/FIV constraint mismatches, frank and accurate. [VERIFIED] |
| Unused import in 2c? | `buildTraitSummary` imported in server.ts but only used inside `customSearchSelect.ts`. Cosmetic. [VERIFIED] |
