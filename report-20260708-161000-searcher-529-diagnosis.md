# Searcher 529 Overloaded Diagnosis — 2026-07-08

## 1. Which Path Emitted the Alert

**The alert came from POST `/api/matcher/custom-search` (the AI SEARCHER / claude-sonnet bio-writer), NOT the photo-browser matcher (GET `/api/animals`).** [VERIFIED]

- The `⚠️ Matcher error — ${audit.status}` Telegram alert is emitted at **server.ts:6288**, inside the `finally` block of the `POST /api/matcher/custom-search` handler (line 4793).
- The "Matcher error" label is a display artifact: the endpoint URL is `/api/matcher/custom-search`, so logs/alerts say "Matcher" even though this is the AI Searcher feature.
- **GET `/api/animals`** (line 1014) is a pure data endpoint: it fetches animals from Shelter Manager, enriches with local photos/bios/metadata, and returns JSON. **No Anthropic API call exists in that path.** [VERIFIED — grep for `anthropic` near lines 1014–1068 returns zero hits]

## 2. Failure Labels and Error-Handling Block

The handler tracks failure status via an `audit` object initialized to `status: 'success'`. Specific failure labels:

| Label | Condition | Lines |
|---|---|---|
| `failure_validation` | Bad input (sex, ageGroup, species) | 4855–4920 |
| `failure_content` | Content filter blocked narrative | 4936 |
| `failure_api` (key missing) | No Anthropic API key in secrets | 4967 |
| `failure_no_candidates` | Zero animals pass hard filters | 5002 |
| `failure_parse` (Phase 1) | Phase 1 returned no valid shelter codes | 5051 |
| `failure_api` (Phase 2 HTTP) | Phase 2 Anthropic call returns !ok | 6043 |
| `failure_parse` (Phase 2) | Phase 2 response not valid JSON / bad structure | 6064–6105 |
| `success` | All phases complete | 6193 |
| **`failure_unknown`** | **Catch-all in outer `catch(error)`** | **6270** |

The `failure_unknown` catch block (lines 6269–6274):

```typescript
} catch (error: any) {
    audit.status = 'failure_unknown';
    audit.errorClass = error?.name || 'Error';
    audit.errorMessage = (error?.message || String(error)).substring(0, 500);
    console.error('[Matcher] Custom search error:', error);
    res.status(500).json({ error: 'Match generation failed, please try again' });
}
```

**529/overloaded_error is NOT caught specifically.** It falls through to generic error handling. In this case, the 529 hit Phase 1 (`selectMatches` in `customSearchSelect.ts`), which **throws** on any non-ok response (line 223: `throw new Error(\`Anthropic API error: ${resp1.status} ${errText}\`)`). That throw is caught by the outer `catch` and labeled `failure_unknown`. [VERIFIED]

The alert fires for all non-success, non-content-filter statuses (line 6282):
```typescript
if (audit.status !== 'success' && audit.status !== 'failure_content') {
```

## 3. Retry Behavior — THE KEY FINDING

**There is NO retry with backoff on transient Anthropic errors (429, 529, 5xx) anywhere in the custom-search pipeline.** [VERIFIED]

Three Anthropic API call sites exist in this path:

1. **Intent Extraction** (`intentExtractor.ts:177`): On `!resp.ok`, logs the error and returns a default intent (graceful fallback, no retry). [VERIFIED]

2. **Phase 1 Selection** (`customSearchSelect.ts:211`): On `!resp1.ok`, **throws immediately** (line 223). The only retry in this file (lines 238–291) is for **JSON parse failures** (bad response format), not HTTP errors. On HTTP error, it throws — no backoff, no retry. [VERIFIED]

3. **Phase 2 Bio Writing** (`server.ts:6030`): On `!apiResponse.ok`, sets `failure_api` and returns immediately. No retry. [VERIFIED]

**None of the three call sites implement retry/backoff for HTTP 429 or 5xx errors.**

The error message format in the audit row (`Anthropic API error: 529 {...}`) matches the Phase 1 throw at `customSearchSelect.ts:223`, confirming the 529 hit during Phase 1 selection. The throw propagated to the outer catch, hence `failure_unknown` (not `failure_api`, which is only set by the Phase 2 inline handler).

## 4. Audit Row: 8eeaed3c

```
id:               8eeaed3c-a158-4c83-b43b-c9c5d7a52653
created_at:       2026-07-08T18:28:01.559Z
hard_filters:     {"species":"cat","sex":["male","female"],"ageGroup":["young"]}
narrative:        Siamese kitten, Mercy
result_codes:     [] (empty — no results produced)
result_bios:      [] (empty)
status:           failure_unknown
error_class:      Error
error_message:    Anthropic API error: 529 {"type":"error","error":{"type":"overloaded_error",
                  "message":"Overloaded"},"request_id":"req_011Ccq4crZVQm2bfU3Moihjb"}
candidate_count:  102
response_time_ms: 6071 (6.1s)
input_tokens:     (null — Phase 2 never reached)
output_tokens:    (null)
rejected_codes:   [] (empty)
input_profiles:   [] (empty — Phase 2 never reached)
low_confidence:   0
preamble_shown:   0
preamble_text:    (null)
lang:             en
```

**No PII in any column** — all fields are shelter-animal search data. [VERIFIED]

The null tokens + empty input_profiles confirm the error occurred before Phase 2 (bio writing). The 102 candidate count confirms hard filtering completed successfully, and the 529 hit during Phase 1 selection (the `selectMatches` call).

## 5. Error Frequency (48-hour window)

| Status | Count | Percentage |
|---|---|---|
| success | 35 | 97.2% |
| failure_unknown | 1 | 2.8% |

**Total: 36 searches in 48 hours. 1 failure (this one). No other error types.** [VERIFIED]

The 529/overloaded is the **only** error in 48 hours. The dashboard's ~4.3% (1 of 23) was likely over a different window; over 48h it's 2.8% (1 of 36). Either way, a single occurrence — not a pattern.

## 6. User-Facing Impact

**On failure, the user saw:** `"Match generation failed, please try again"` (returned as JSON `{ error: "..." }` with HTTP 500). [VERIFIED — line 6273 in the catch block]

The front-end receives this error string. Depending on the custom-search UI implementation, this likely renders as a "try again" message. The user can retry immediately, and the next attempt would succeed if Anthropic is no longer overloaded.

**Alert frequency:** One Telegram alert per failure (fire-and-forget `send-alert.sh` spawn in the finally block, line 6282–6299). Every non-success, non-content-filter search generates its own alert. At current volume (~1 failure per 36 searches), this is not noisy. At higher failure rates, it would be — there is no deduplication or throttling on the alerts. [VERIFIED]

## Summary

1. **Confirmed:** The alert came from the AI Searcher (`POST /api/matcher/custom-search` / claude-sonnet), not the photo-browser (`GET /api/animals`). The "Matcher" label is a naming artifact. The photo-browser makes zero Anthropic calls.

2. **Confirmed:** The 529 hit Phase 1 (selection in `customSearchSelect.ts`), which throws on any HTTP error. The throw is caught by the outer handler and labeled `failure_unknown` — there is no specific handling for 529/overloaded.

3. **Confirmed:** There is NO retry/backoff on transient Anthropic errors (429/529/5xx) in any of the three API call sites (intent extraction, Phase 1 selection, Phase 2 bio writing). A single 529 = immediate failure + alert.

4. **Frequency:** 1 failure out of 36 searches in 48 hours (2.8%). The 529 is the only error type observed. This is a one-off transient, not a pattern.

5. **User impact:** User saw "Match generation failed, please try again" with HTTP 500. Retrying would likely succeed.
