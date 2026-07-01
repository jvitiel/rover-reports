# PII-Read Gate — Phase 1 (Client Header, No Enforcement)

**Date:** 2026-07-01 03:05 UTC

---

## CHANGE 1 — GET /api/gate-token (server/src/server.ts)

Added immediately after the existing `GET /api/health` handler:

```typescript
// PII-read gate token (Phase 1: serves token to dashboard; no enforcement yet)
app.get('/api/gate-token', (_req: Request, res: Response) => {
  try {
    const secrets = JSON.parse(readFileSync(SECRETS_PATH, 'utf-8'));
    res.json({ token: secrets.piiGateToken || null });
  } catch {
    res.json({ token: null });
  }
});
```

**Guardrails confirmed:**
- Returns exactly `{ token: <value> }` or `{ token: null }` — no other fields, no secrets object spread [VERIFIED — handler source above]
- Reuses existing `SECRETS_PATH` + `readFileSync` pattern (same as `getWpAuth()`) [VERIFIED]
- No auth middleware attached — plain `app.get()` [VERIFIED]
- Not added to any limiter skip/exempt list — falls under globalLimiter [VERIFIED — grep for 'gate-token' in skip function returned 0 matches]
- Gracefully returns `{ token: null }` if `piiGateToken` is missing or file read fails [VERIFIED]

---

## CHANGE 2 — dashboard/index.html: X-Gate-Token Header on Gated GETs

### Approach: centralized `gatedGet()` helper

Added immediately after `const API_BASE = '/api';`:

```javascript
// Phase 1 PII-read gate: fetch token once at startup, attach to gated GETs.
// No server enforcement yet — header is sent but not checked.
let _piiGateToken = null;
(async () => { try { const r = await fetch('/api/gate-token'); const d = await r.json(); _piiGateToken = d.token; } catch {} })();
function gatedGet(url) {
  const opts = {};
  if (_piiGateToken) opts.headers = { 'X-Gate-Token': _piiGateToken };
  return fetch(url, opts);
}
```

**Token storage:** module-scope JS variable (`_piiGateToken`), NOT localStorage, NOT sessionStorage. [VERIFIED]

### Call sites converted from `fetch()` → `gatedGet()`

| # | Endpoint | Location |
|---|----------|----------|
| 1 | `GET /api/dashboard/behavior-notes` | `gatedGet(\`${API_BASE}/dashboard/behavior-notes\`)` |
| 2 | `GET /api/volunteers` (list) | `gatedGet(url)` (after url-building block with status/search/tags params) |
| 3 | `GET /api/volunteers/:id` | `gatedGet(\`/api/volunteers/${id}\`)` |
| 4 | `GET /api/volunteers/timeclock/all` | `gatedGet('/api/volunteers/timeclock/all?start_date=...')` |
| 5 | `GET /api/volunteers/timeclock/search` | `gatedGet('/api/volunteers/timeclock/search?q=...')` |
| 6 | `GET /api/volunteers/availability-grid` | `gatedGet(gridUrl)` |
| 7 | `GET /api/volunteers/with-other-talents` | `gatedGet('/api/volunteers/with-other-talents')` |
| 8 | `GET /api/adoption-applications` | `gatedGet('/api/adoption-applications')` |

**8 of 9 gated GETs converted.** The 9th (`GET /api/volunteers/timeclock/report`) uses `window.open(url, '_blank')` for CSV/print export — headers cannot be attached to `window.open()`. This endpoint will need separate handling in Phase 2 if it returns PII.

### Predicate precision (G2) confirmed

**Gated (header attached):** Only the 8 GET reads listed above — all match `/api/volunteers` (plural) or `/api/volunteers/...` (plural + subpath) or `/api/adoption-applications` or `/api/dashboard/behavior-notes`.

**NOT gated (no header):**
- `/api/notifications/staff` GET — explicitly deferred per prompt [VERIFIED — grep shows no gatedGet on notifications]
- `/api/notifications/staff/archive` GET — deferred [VERIFIED]
- `/api/volunteer/...` (singular) session endpoints — not touched [VERIFIED — zero gatedGet calls to singular `/api/volunteer/`]
- All POST/PUT/PATCH/DELETE calls — not touched [VERIFIED — all 17 remaining fetch calls to `/api/volunteers` paths confirmed as writes with explicit method]

---

## Explicit Confirmations

1. **NO enforcement/401/middleware was added.** The server has no code that reads, validates, or rejects based on X-Gate-Token. The only 401 references in the diff are pre-existing RG Cares auth. [VERIFIED — grep for '401' and 'X-Gate-Token' in server.ts shows only the pre-existing rgAuthMiddleware 401s]

2. **No other files touched.** `git diff --stat` shows exactly 2 files changed:
   - `dashboard/index.html` — 27 insertions, 8 deletions (helper + 8 fetch→gatedGet)
   - `server/src/server.ts` — 10 insertions, 0 deletions (gate-token endpoint)
   
   No PWA files, no CORS config, no RG module, no limiter-skip list, no service worker, no Caddyfile. [VERIFIED]

3. **Build result:** `npm run build` (tsc) exited 0, clean compilation, no errors or warnings. [VERIFIED]

4. **Service NOT restarted.** Build only — John handles restart. [VERIFIED]
