# Searcher Retry + Relabel — 2026-07-08

## Build & Restart

- `tsc` build: **clean, exit code 0**. [VERIFIED]
- `systemctl restart shelter-app`: **active**. [VERIFIED]

## (A) Retry Helper — `anthropicRetry.ts`

```typescript
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;
const JITTER_MS = 250;

function isTransient(status: number): boolean {
  return status === 429 || status >= 500;
}

function backoffMs(attempt: number): number {
  const base = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = (Math.random() * 2 - 1) * JITTER_MS;
  return Math.max(0, base + jitter);
}

export async function fetchWithTransientRetry(
  doFetch: () => Promise<Response>,
  label: string,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const resp = await doFetch();
    if (resp.ok) return resp;

    const status = resp.status;
    const errText = await resp.text();

    if (!isTransient(status)) {
      throw new Error(`Anthropic API error: ${status} ${errText}`);
    }

    lastError = new Error(`Anthropic API error: ${status} ${errText}`);

    if (attempt < MAX_RETRIES) {
      const delay = backoffMs(attempt);
      console.warn(`[${label}] Transient error ${status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
      await sleep(delay);
    }
  }

  throw lastError!;
}
```

**Constraints confirmed:**
- Max 2 retries (3 total attempts): `attempt <= MAX_RETRIES` where `MAX_RETRIES = 2`. [VERIFIED]
- Backoff ~1s then ~2s with ±250ms jitter: `BASE_DELAY_MS * 2^attempt ± JITTER_MS`. [VERIFIED]
- Retries 429, 529, and all 5xx: `status === 429 || status >= 500`. [VERIFIED]
- Does NOT retry 4xx: `!isTransient(status)` → throws immediately for 400/401/422/etc. [VERIFIED]
- Throws after final attempt: `throw lastError!` outside the loop. [VERIFIED]

## Wrapped Call Sites

### Phase 1 — `customSearchSelect.ts`

Both fetch calls (initial selection + JSON-parse retry) wrapped:

```typescript
// Line 212 — first attempt
const resp1 = await fetchWithTransientRetry(
  () => fetch(ANTHROPIC_API_URL, { ... }),
  'Phase1Select',
);

// Line 258 — JSON-parse retry attempt
const resp2 = await fetchWithTransientRetry(
  () => fetch(ANTHROPIC_API_URL, { ... }),
  'Phase1Select-retry',
);
```
[VERIFIED — customSearchSelect.ts lines 212 and 258]

### Phase 2 — `server.ts`

Bio-writing fetch wrapped, inline `!apiResponse.ok` error handler removed (transient errors now retry; final failures throw to outer catch):

```typescript
// Line 6032
const apiResponse = await fetchWithTransientRetry(
  () => fetch('https://api.anthropic.com/v1/messages', { ... }),
  'Phase2Bio',
);
```
[VERIFIED — server.ts line 6032]

### Intent Extraction — UNCHANGED

`intentExtractor.ts` has zero references to `fetchWithTransientRetry` or `anthropicRetry`. Its existing graceful fallback (returns default intent on error) is preserved. [VERIFIED — grep returns 0 matches]

## (B) Relabel

| Location | Before | After |
|---|---|---|
| Alert text (line 6282) | `⚠️ Matcher error — ${audit.status}` | `⚠️ Searcher error — ${audit.status}` |
| Catch log (line 6267) | `[Matcher] Custom search error:` | `[Searcher] Custom search error:` |
| Audit log (line 6273) | `[Matcher] Audit row written:` | `[Searcher] Audit row written:` |
| Alert error log (line 6296) | `[Matcher] Telegram alert failed:` | `[Searcher] Telegram alert failed:` |
| Audit error log (line 6300) | `[Matcher] Failed to write audit row:` | `[Searcher] Failed to write audit row:` |

[VERIFIED — all 5 occurrences changed]

Routes (`/api/matcher/custom-search`), DB function (`insertMatcherAudit`), DB column names, and photo-browser matcher alerts — all unchanged. [VERIFIED]

## Single Alert After Final Failure

The alert fires in the `finally` block (line 6275+), which executes once after the outer `catch` has set `audit.status`. The retry loop runs entirely inside `fetchWithTransientRetry` — it only throws after exhausting all retries. Per-attempt retries log a `console.warn` but do NOT fire a Telegram alert. The alert path is outside and after the retry loop. [VERIFIED]

## No Collateral

- Photo-browser matcher (`GET /api/animals`, line 1014): no changes. [VERIFIED — git diff shows no hunks near line 1014]
- Media-selection query: no changes (the `strip_position = 2` fix from prior commit is preserved). [VERIFIED]
- Intent extraction: no changes. [VERIFIED]
- Schema: no changes. [VERIFIED]
- Other endpoints: no changes. [VERIFIED — all server.ts hunks are at import line 15 and lines 6029–6300, within custom-search handler]

## Commit

```
cce109c SEARCHER: retry transient Anthropic errors on Phase 1 + Phase 2
        (429/529/5xx, 2 retries, backoff+jitter, single alert after final fail)
        + relabel error 'Matcher'->'Searcher'
```

Files: `server/src/anthropicRetry.ts` (new), `server/src/customSearchSelect.ts`, `server/src/server.ts`. [VERIFIED]
