# PII-Gate Phase 2 — Server Enforcement + Client Fixes

Implemented 2026-07-01 ~03:30–03:50 UTC. Build clean, service NOT restarted.

---

## FILE 1: server/src/server.ts — piiGateMiddleware

### Crypto import
Added `timingSafeEqual` to existing `import { randomUUID, randomBytes } from 'crypto'`.

### Token loading (startup-cached)
```typescript
const piiGateToken: string = (() => {
  try {
    const s = JSON.parse(readFileSync(SECRETS_PATH, 'utf-8'));
    return s.piiGateToken || '';
  } catch { return ''; }
})();
```
Reuses existing `SECRETS_PATH` constant. Loaded ONCE at startup — "blank the key + restart" is the kill-switch.

### Sampling infrastructure
```typescript
const _gateNoTokenWarnedAt = { ts: 0 };
const _gateDenialLog = new Map<string, number>(); // IP → last-warned-ts
const GATE_SAMPLE_MS = 15 * 60 * 1000; // 15 minutes
const GATE_DENIAL_MAP_CAP = 2000;
```

### Gated-set predicate (G2, anchored)
```typescript
function isGatedPath(p: string): boolean {
  return (
    p === '/api/volunteers'
    || p.startsWith('/api/volunteers/')
    || p === '/api/adoption-applications'
    || p === '/api/dashboard/behavior-notes'
  );
}
```
Does NOT match: `/api/volunteer/` (singular — no trailing s), `/api/gate-token`, `/api/notifications/*`, any write method.

### Middleware (placed after body/CORS/limiter/request-logging, before API routes)
```typescript
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' || !isGatedPath(req.path)) {
    return next();
  }

  // Fail-open kill-switch: no token loaded → pass through with sampled warn
  if (!piiGateToken) {
    const now = Date.now();
    if (now - _gateNoTokenWarnedAt.ts > GATE_SAMPLE_MS) {
      _gateNoTokenWarnedAt.ts = now;
      log.warn('piiGate', 'no token loaded — gate DISABLED (fail-open)', { path: req.path });
    }
    return next();
  }

  // Constant-time comparison
  const provided = Buffer.from(req.header('X-Gate-Token') || '');
  const expected = Buffer.from(piiGateToken);
  const ok = provided.length === expected.length && timingSafeEqual(provided, expected);

  if (ok) {
    return next();
  }

  // Denial: sampled warn per source IP
  const now = Date.now();
  const ip = req.ip || 'unknown';
  const lastWarn = _gateDenialLog.get(ip) || 0;
  if (now - lastWarn > GATE_SAMPLE_MS) {
    if (_gateDenialLog.size >= GATE_DENIAL_MAP_CAP) {
      const cutoff = now - GATE_SAMPLE_MS;
      for (const [k, v] of _gateDenialLog) {
        if (v < cutoff) _gateDenialLog.delete(k);
      }
    }
    _gateDenialLog.set(ip, now);
    log.warn('piiGate', 'denied — invalid or missing token', { path: req.path, ip });
  }
  return res.status(401).json({ error: 'gate' });
});
```

### Sampling behavior
- **No-token warn (G3):** At most once per 15 minutes globally. Uses `log.warn` → `/var/log/shelter/warnings.log`. Message includes path, NEVER the token.
- **Denial warn (M6):** At most once per source IP per 15-minute window. Map keyed by IP with size cap (2000 entries; prunes stale on overflow). Message includes path + IP, NEVER the token.

### Untouched
- `/api/gate-token` handler: unchanged (still serves token to dashboard, reads from secrets at call time)
- CORS config: unchanged
- `globalLimiter` / rate-limit skip list: unchanged
- `rgAuthMiddleware`: unchanged
- No 401 added elsewhere

---

## FILE 2: dashboard/index.html — readiness fix + gated export

### (2a) fetchToken + _tokenReady + gatedGet replacement

Old Phase 1 (fire-and-forget IIFE + synchronous gatedGet):
```javascript
let _piiGateToken = null;
(async () => { try { const r = await fetch('/api/gate-token'); const d = await r.json(); _piiGateToken = d.token; } catch {} })();
function gatedGet(url) {
  const opts = {};
  if (_piiGateToken) opts.headers = { 'X-Gate-Token': _piiGateToken };
  return fetch(url, opts);
}
```

New Phase 2:
```javascript
let _piiGateToken = null;
async function fetchToken() {
  try {
    const r = await fetch('/api/gate-token');
    const d = await r.json();
    _piiGateToken = d.token || null;
  } catch { /* token stays null — fail-open */ }
}
const _tokenReady = Promise.race([
  fetchToken(),
  new Promise(resolve => setTimeout(resolve, 3000)),
]);
async function gatedGet(url) {
  await _tokenReady;
  const opts = {};
  if (_piiGateToken) opts.headers = { 'X-Gate-Token': _piiGateToken };
  let resp = await fetch(url, opts);
  if (resp.status === 401) {
    await fetchToken();
    const retry = {};
    if (_piiGateToken) retry.headers = { 'X-Gate-Token': _piiGateToken };
    resp = await fetch(url, retry);
  }
  return resp;
}
```

**Readiness:** `_tokenReady` always resolves within 3 seconds (race against timeout). `gatedGet` awaits it before every call.

**401 retry:** On 401, calls `fetchToken()` once to refresh, retries once. If still 401, returns that response — single bounded retry, no loop.

**Token storage:** Module-scope variable only — NOT localStorage/sessionStorage.

**8 existing gatedGet call sites:** Unchanged — they continue calling `gatedGet(url)`.

### (2b) Timeclock/report export: window.open → gated download

Old:
```javascript
function tcGenerateReport() {
  // ...validation...
  const url = '/api/volunteers/timeclock/report?...';
  window.open(url, '_blank');
  tcClosePrintModal();
}
```

New:
```javascript
async function tcGenerateReport() {
  // ...validation...
  const reportUrl = '/api/volunteers/timeclock/report?...';
  try {
    const resp = await gatedGet(reportUrl);
    if (!resp.ok) { alert('Report failed (HTTP ' + resp.status + ')'); return; }
    const blob = await resp.blob();
    const cd = resp.headers.get('Content-Disposition') || '';
    let fname = 'timeclock-report';
    const cdMatch = cd.match(/filename="?([^"]+)"?/);
    if (cdMatch) { fname = cdMatch[1]; }
    else {
      const ct = resp.headers.get('Content-Type') || '';
      if (ct.includes('pdf')) fname += '.pdf';
      else if (ct.includes('csv')) fname += '.csv';
      else if (ct.includes('html')) fname += '.html';
    }
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl; a.download = fname; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objUrl);
  } catch (err) { alert('Report error: ' + (err.message || err)); }
  tcClosePrintModal();
}
```

**Observed Content-Type:** The `/api/volunteers/timeclock/report` endpoint returns `application/pdf` with `Content-Disposition: inline; filename="volunteer-time-receipt-<name>-<start>-to-<end>.pdf"`. The Content-Disposition filename will be extracted by the regex; the PDF fallback in the else branch is a safety net.

**Download UX:** File downloads via temporary `<a download>` element with the server-provided filename. Object URL revoked after click. Error surfaces via `alert()`.

**Other window.open calls:** The other two (`pdf.output('bloburl')` and photo modal `photoUrl`) do NOT target gated paths — left unchanged.

---

## FILE 3: /home/shelter/scripts/health-check.sh — gate-active probe (G3)

**Status:** Root-owned file — Rover cannot write directly. Edited version staged at `/home/rover/rover/health-check-phase2.sh` for John to install via:
```bash
sudo cp /home/rover/rover/health-check-phase2.sh /home/shelter/scripts/health-check.sh
sudo chown root:root /home/shelter/scripts/health-check.sh
sudo chmod 755 /home/shelter/scripts/health-check.sh
```

### Added probe (after HTTP health probes, before network exposure section):
```bash
# --- PII gate state probe ---
GATE_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://127.0.0.1:3000/api/volunteers 2>/dev/null || echo "000")
if [ "$GATE_CODE" = "401" ]; then
  GATE_STATUS="piiGate: ACTIVE (unauth GET → 401)"
elif [ "$GATE_CODE" = "200" ]; then
  GATE_STATUS="piiGate: ⚠️ OPEN — unauth GET returned 200 (fail-open/disabled)"
  flag_info "$GATE_STATUS"
else
  GATE_STATUS="piiGate: unexpected code $GATE_CODE"
  flag_info "$GATE_STATUS"
fi
```

- 401 = healthy (gate active) — NOT flagged as critical or info, just reported in summary
- 200 = gate open/disabled — flagged as `flag_info` (informational, not critical)
- Other codes — flagged as `flag_info`
- Body discarded (`-o /dev/null`) — no PII emitted
- `$GATE_STATUS` appended to Telegram summary line after the HTTP status line

---

## Build + Verification

```
$ cd /home/shelter/shelter-apps/server && npm run build
> tsc
(exit 0 — clean)
```

### git diff --stat
```
dashboard/index.html | 70 +++++++++++++++++++++++++++++++++++++++--------
server/src/server.ts | 76 +++++++++++++++++++++++++++++++++++++++++++++++++++-
2 files changed, 134 insertions(+), 12 deletions(-)
```

### Commit
```
182afcd Phase 2: enforce piiGateToken on PII-read endpoints (GET gated set), add gatedGet readiness+retry, gate timeclock/report export
```
Narrow add: `git add server/src/server.ts dashboard/index.html` only. Health-check staged separately (root-owned).

### Confirmed untouched
- CORS config: 0 diff lines
- globalLimiter / rate-limit skip list: 0 diff lines
- rgAuthMiddleware: 0 diff lines
- /api/gate-token handler: unchanged (already present from Phase 1, now committed with Phase 2)
- All PWAs (staff-pwa, staging-staff, volunteer-pwa, dogwalker-pwa, etc.): 0 files changed
- Service NOT restarted

### Pre-restart checklist for John
1. Add `"piiGateToken": "<value>"` to `/home/shelter/.config/shelter-secrets.json`
2. Back up database
3. `cd /home/shelter/shelter-apps/server && npm run build && sudo systemctl restart shelter-app`
4. Install health-check: `sudo cp /home/rover/rover/health-check-phase2.sh /home/shelter/scripts/health-check.sh && sudo chown root:root /home/shelter/scripts/health-check.sh && sudo chmod 755 /home/shelter/scripts/health-check.sh`
5. Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/volunteers` should return 401
6. Verify dashboard loads and volunteer tab works (gatedGet fetches token, passes gate)
