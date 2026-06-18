# Post-Deploy Alert Diagnosis: failure_validation e619c67d

**Date:** 2026-06-18 15:22 ET  
**Production modified:** NO. Read-only diagnosis. [VERIFIED]

---

## Task 1: The Audit Record

```
id:             e619c67d-bf09-43b9-a2ea-d0edd02c03ee
created_at:     2026-06-18T19:07:19.108Z (15:07 ET)
status:         failure_validation
error_class:    validation
error_message:  ageGroup is required and must be a non-empty array
hard_filters:   {"sex":[],"ageGroup":[]}
narrative:      (null)
candidate_count: (null)
response_time_ms: 1
input_tokens:   (null)
output_tokens:  (null)
result_shelter_codes: []
result_bios:    []
```

**Timestamp:** 19:07:19 UTC. **Server PID:** 4138368 (the OLD server process, running the pre-2c code). [VERIFIED]

**Deploy timeline:**
- 19:07:19 — this alert (PID 4138368, OLD code)
- 19:10:54 — shelter-app stopped (old PID)
- 19:11:30 — shelter-app restarted (new PID 4140714, 2c code)
- 19:12:17 — first Phase-1 log on new server

**The alert fired on the OLD server, 3+ minutes BEFORE the 2c deploy.** The 2c code was not running when this request arrived. [VERIFIED]

**What sent it:** The request body is `{"sex":[],"ageGroup":[]}` with null narrative — an empty/default form submission. The server does not log IP or user-agent for this endpoint. Surrounding log context:

```
19:07:11  GET /api/sessions/active/dog         ← dogwalker app heartbeat
19:07:19  POST /api/matcher/custom-search      ← the empty request
19:07:21  GET /staff/                          ← someone loading staff PWA
19:07:28  POST /api/matcher/custom-search      ← real request (succeeded, 15.4s)
```

The empty POST at 19:07:19 is followed 9 seconds later by a successful custom-search POST (audit 24f88333, status=success, 98 candidates, 15.4s). This pattern suggests a user on the custom-search page who submitted the form before selecting any checkboxes — the client-side validation normally blocks this (see Task 4), but the empty request reached the server. Most likely cause: a **direct API call or tool** (not the web UI), or the page was loaded with checkboxes pre-cleared and submitted programmatically. [INFERRED]

---

## Task 2: Is the ageGroup Validation Pre-Existing or New?

**Validation code at `server/src/server.ts:4365`:**

```typescript
    if (!Array.isArray(ageGroup) || ageGroup.length === 0) {
      audit.status = 'failure_validation';
      audit.errorClass = 'validation';
      audit.errorMessage = 'ageGroup is required and must be a non-empty array';
      res.status(400).json({ error: errStrings.ageRequired });
      return;
    }
```

**Git blame:**
```
95427ac0 (Rover 2026-05-24 21:18:54 +0000 4342) — error string definition
a1b437f6 (Rover 2026-04-29 01:17:23 +0000 4368) — validation logic + audit write
```

**Pre-existing — from April 29 and May 24.** Commit 05c3fe5 (2c) did not add, move, or modify this validation. [VERIFIED]

**Flow position:** Validation at line 4365. Phase-1 selection starts at line 4467. The validation runs at REQUEST-VALIDATION time, before fetchAnimals(), before Phase-1, before any Anthropic API call. An empty-ageGroup request never reaches Phase-1 or Phase-2. [VERIFIED]

---

## Task 3: Full 2c Diff (commit 05c3fe5)

### customSearchSelect.ts (1 line changed)

```diff
-OUTPUT FORMAT — respond with ONLY this JSON, no other text:
+OUTPUT FORMAT — respond with ONLY this JSON object, no explanatory text before or after it:
```

JSON reinforcement only — prompt wording change. [VERIFIED]

### server.ts (62 insertions, 20 deletions)

**1. Imports added (line 11-12):**
```typescript
+import { selectMatches, buildSystemPrompt as buildSelectionSystemPrompt, buildUserMessage as buildSelectionUserMessage } from './customSearchSelect.js';
+import { buildTraitSummary } from './customSearchSummary.js';
```

Note: `buildTraitSummary` is imported but not directly called in server.ts — it's called inside `selectMatches()` via `buildUserMessage()`. The import is unused in server.ts itself. This is cosmetic (no runtime effect; tsc doesn't error because it's a value import). [VERIFIED — SOFT, no functional impact]

**2. Phase-1 selection block inserted (lines 4447-4501):**

```typescript
+    // PHASE 1: SELECTION via compact trait-summary lines
+    const behaviorNotesMap = new Map<string, ReturnType<typeof getBehaviorNotes>>();
+    for (const animal of withRecords) {
+      behaviorNotesMap.set(animal.shelterCode, getBehaviorNotes(animal.shelterCode));
+    }
+
+    const secrets: ShelterSecrets = JSON.parse(readFileSync(SECRETS_PATH, 'utf-8'));
+    if (!secrets.anthropic?.apiKey) { ... return; }
+
+    const selectionResult = await selectMatches({ candidates: withRecords, behaviorNotesMap, narrative, lang }, secrets.anthropic.apiKey);
+    const selectedCodes = selectionResult.shelter_codes;
+
+    // Validate selected codes exist in candidate pool
+    const candidateCodeSet = new Set(withRecords.map(a => a.shelterCode));
+    const validSelectedCodes = selectedCodes.filter(c => candidateCodeSet.has(c));
+    if (validSelectedCodes.length === 0) { ... return; }
+
+    // PHASE 2: BIO WRITING for selected cats only
+    const selectedAnimals = validSelectedCodes.map(c => withRecords.find(a => a.shelterCode === c)!).filter(Boolean);
```

**(a) Phase-1 → Phase-2 handoff:** Phase-1 returns `shelter_codes[3]`. These are validated against `candidateCodeSet` (the full pool). Invalid codes are filtered out. If all 3 are invalid (should never happen with a functioning model), the endpoint returns an error. Otherwise `selectedAnimals` is populated from `withRecords` in the order of `validSelectedCodes` — preserving Phase-1's ranking. [VERIFIED — correct]

**(b) validCodes/selectedAnimals fix:** 
```diff
-    const validCodes = new Set(withRecords.map(a => a.shelterCode));
+    const validCodes = new Set(selectedAnimals.map(a => a.shelterCode));
```
This narrows the Phase-2 response validation to check only the 3 selected cats (not the full 98-cat pool). Correct: Phase-2 only receives 3 cats, so it can only return those 3 codes. If it returned a code not in the selected set, that would be a Phase-2 hallucination and should fail validation. [VERIFIED — correct]

**(c) Secrets read:** The old code read secrets at line ~4638 (right before the API call). The new code reads secrets once at line ~4454 (before Phase-1), then reuses `secrets.anthropic.apiKey` for Phase-2 via the same `apiBody` construction. The old secrets+apiKey guard block was removed (lines 4638-4647). The new guard is at lines 4454-4461. There is exactly one secrets read and one guard — no duplication, no gap. [VERIFIED — correct]

**(d) Control flow — can it return empty/blank?**

All paths:
1. `validSelectedCodes.length === 0` → returns 500 error. [VERIFIED]
2. Phase-2 API fails (`!apiResponse.ok`) → returns 500 error. [VERIFIED — existing code unchanged]
3. Phase-2 returns no JSON → returns 500 error. [VERIFIED — existing code unchanged]
4. Phase-2 returns invalid matches → returns 500 error. [VERIFIED — existing code unchanged]
5. Phase-2 returns valid matches → builds `responseMatches` from `selectedAnimals` + `recordsMap`, returns full response. [VERIFIED]

No path returns an empty or blank response without an explicit error status. The `.filter(Boolean)` on `selectedAnimals` is a safety net (the `!` assertion + find should always succeed since codes are validated against `withRecords`), but even if it somehow filtered to fewer than 3, Phase-2 would produce fewer bios, and the prompt instruction "if fewer than three cats are provided, return matches for all of them" handles it. [VERIFIED — no empty-response path]

---

## Task 4: Can Real UI Traffic Trigger This?

**Client-side validation in `custom-search/app.js:312`:**

```javascript
  if (ageGroup.length === 0) {
    document.getElementById('age-error').classList.add('visible');
    valid = false;
  }
  if (!valid) return;
```

The client validates both `sex` and `ageGroup` before fetch. A normal user interacting with the web form **cannot** submit an empty-ageGroup request — the JS blocks it and shows an error message. [VERIFIED]

**What CAN trigger it:**
- A direct `curl` or API tool call with `{"sex":[],"ageGroup":[]}`
- A browser extension or script bypassing the form
- A service worker or fetch preflight (though the custom-search app has no service worker that POSTs to this endpoint)
- A health check or monitoring probe hitting the endpoint

The server-side validation exists precisely as a defense-in-depth guard for these cases. It's working as designed. [VERIFIED]

---

## Task 5: Any Other Post-Deploy Errors?

**Matcher audit entries from 19:00 UTC onward:**

| Audit ID (prefix) | Time (UTC) | Status | Server | Candidates | Response (ms) |
|---|---|---|---|---|---|
| e619c67d | 19:07:19 | failure_validation | OLD (4138368) | — | 1 |
| 24f88333 | 19:07:43 | success | OLD | 98 | 15,431 |
| 22b6e79d | 19:08:12 | success | OLD | 98 | 16,453 |
| 5cb231a1 | 19:12:37 | success | NEW (4140714) | 98 | 20,322 |
| ceb51d69 | 19:12:59 | success | NEW | 98 | 21,671 |
| b5fcad21 | 19:13:17 | success | NEW | 69 | 17,391 |
| e08f5bfb | 19:13:43 | success | NEW | 98 | 26,328 |
| 4d56f248 | 19:14:01 | success | NEW | 4 | 18,105 |
| 01a0134b | 19:14:19 | success | NEW | 51 | 18,267 |
| baab6040 | 19:14:44 | success | NEW | 98 | 24,288 |
| d14d3bd8 | 19:15:41 | success | NEW | 98 | 23,084 |

**Zero errors on the new server.** 8/8 two-phase requests succeeded. The only error was the pre-deploy empty-ageGroup validation on the old server. [VERIFIED]

**Server journal scan (`journalctl -u shelter-app` from 19:00 onward):** no `error`, `failure_`, or `500` entries related to custom-search beyond the single e619c67d validation. [VERIFIED]

---

## Summary

| Question | Answer |
|---|---|
| Was the alert caused by the 2c deploy? | **No.** The request hit the OLD server (PID 4138368) 3+ minutes before the restart. [VERIFIED] |
| Is the ageGroup validation new? | **No.** Pre-existing since April 29. Not touched by 05c3fe5. [VERIFIED] |
| Does the 2c diff have any issues? | **One cosmetic:** unused `buildTraitSummary` import in server.ts (no runtime effect). All control flow correct. [VERIFIED] |
| Can real UI users trigger this? | **No.** Client-side validation blocks empty-ageGroup submission. Only direct API calls bypass it. [VERIFIED] |
| Any other post-deploy errors? | **None.** 8/8 two-phase requests succeeded. [VERIFIED] |
