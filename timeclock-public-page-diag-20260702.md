# vclock.html Public Timeclock — Gate Regression Diagnosis

## 1. LOCATION + SERVE

- **File:** `/home/shelter/shelter-apps/vclock.html` [VERIFIED]
- **Express route:** `app.get('/vclock', ...)` serves via `res.sendFile(path.join(ROOT_DIR, 'vclock.html'))` — symbol at string `// Serve volunteer timeclock QR form` in `server.ts` [VERIFIED]
- **Caddy:** lives inside the `dashboard.4lgshelterapp.duckdns.org` site block, routed as a `@standalone` path (Caddyfile matcher `@standalone path /intake /vclock ...`) — passes straight through to Express without the dashboard SPA rewrite [VERIFIED]
- **Public URL:** `https://dashboard.4lgshelterapp.duckdns.org/vclock` [VERIFIED]
- **No authentication:** the page contains zero references to tokens, auth, cookies, localStorage, sessionStorage, login, or credentials. It is a fully anonymous public page opened by QR scan on any phone. [VERIFIED — `grep -in` for all auth-related terms returned zero hits]

## 2. EVERY API CALL vclock.html MAKES

### (a) GET reads — now 401'd by piiGateMiddleware

All three use the bare `apiGet(url)` helper (symbol `function apiGet(url)` in `vclock.html`), which is a plain `fetch(url)` with no custom headers:

| # | Endpoint | Method | Purpose | Gate status |
|---|----------|--------|---------|-------------|
| 1 | `GET /api/volunteers/timeclock/recent` | GET | Screen 1 load: list volunteers with recent activity (last 30 days) | **401 without token** [VERIFIED] |
| 2 | `GET /api/volunteers/timeclock/search?q=<query>` | GET | Screen 1 search: find volunteer by name | **401 without token** [VERIFIED] |
| 3 | `GET /api/volunteers/timeclock/status?volunteer_id=<id>` | GET | Screen 2: check-in/out state + 14-day shift history | **401 without token** [VERIFIED] |

### (b) POST write — still works

| # | Endpoint | Method | Purpose | Gate status |
|---|----------|--------|---------|-------------|
| 4 | `POST /api/volunteers/timeclock/punch` | POST | Record check-in or check-out | **Passes gate** (gate is GET-only: `req.method !== 'GET'` → `next()`) [VERIFIED — returns 200] |

## 3. RESPONSE SHAPES + PII EXPOSURE SCOPE

### Endpoint 1: `GET /api/volunteers/timeclock/recent`

**Response shape:**
```
{ success: bool, volunteers: [{ id: int, name: string, last_activity_at: string }] }
```

**Row scope:** All approved volunteers with timeclock activity in last 30 days. Returns up to the full set (no LIMIT). Current count: **40 volunteers** returned. [VERIFIED]

**PII exposed:** Volunteer `id`, `full_name`, and last activity timestamp. No contact info, no hours totals — but full names of all recently-active volunteers are disclosed to anyone with the URL.

### Endpoint 2: `GET /api/volunteers/timeclock/search?q=<query>`

**Response shape:**
```
{ success: bool, volunteers: [{ id: int, name: string }] }
```

**Row scope:** Up to **20** approved volunteers matching the search string. Searched against `full_name LIKE %q%` across the entire approved roster (419 approved volunteers total). [VERIFIED]

**PII exposed:** Volunteer `id` and `full_name`. A determined caller could enumerate all 419 approved volunteer names by iterating single-letter queries.

### Endpoint 3: `GET /api/volunteers/timeclock/status?volunteer_id=<id>`

**Response shape:**
```
{
  success: bool,
  state: "checked_in" | "checked_out",
  open_shift_id: int | null,
  open_shift_check_in_at: string | null,
  history: [{
    id: int,
    check_in_at: string,
    check_out_at: string | null,
    auto_closed: int,
    duration_minutes: int | null
  }]
}
```

**Row scope:** Single volunteer's open shift + last 14 days of shift history. [VERIFIED]

**PII exposed:** Individual shift times and durations for the requested volunteer. Requires knowing the `id`, but `id` is disclosed by endpoints 1 and 2.

### Pre-gate exposure summary

Before the gate, anyone with the QR URL could:
- See full names of all 40 recently-active volunteers (endpoint 1) [VERIFIED]
- Enumerate all 419 approved volunteer names via search (endpoint 2) [VERIFIED]
- Look up any volunteer's 14-day shift schedule by id (endpoint 3) [VERIFIED]

The gate accidentally fixed a real PII exposure. This matters for the fix design.

## 4. 401/200 CONFIRMATION

| Endpoint | Without token | With valid X-Gate-Token |
|----------|--------------|------------------------|
| `GET /api/volunteers/timeclock/recent` | **401** | **200** |
| `GET /api/volunteers/timeclock/search?q=a` | **401** | **200** |
| `GET /api/volunteers/timeclock/status?volunteer_id=11` | **401** | **200** |
| `POST /api/volunteers/timeclock/punch` (body: `{volunteer_id:11}`) | **200** (bypasses gate) | n/a |

[ALL VERIFIED — curl from localhost]

**Root cause confirmed:** The `isGatedPath` function (symbol `function isGatedPath(p: string)` in `server.ts`) matches all paths starting with `/api/volunteers/`, including all three timeclock GET endpoints. The middleware (symbol `app.use((req: Request, res: Response, next: NextFunction) =>` immediately after `isGatedPath`) returns `res.status(401).json({ error: 'gate' })` when `X-Gate-Token` is missing or invalid. vclock.html's `apiGet` sends no token → 401 → the `.catch` handler fires → `showError('screen1Error')` displays "Connection problem. Please try again."

**Timeline:**
- Gate enforcement committed: `182afcd` — 2026-07-01 03:44 UTC [VERIFIED — git log]
- shelter-app restarted (code went live): 2026-07-01 15:53 UTC [VERIFIED — systemctl ActiveEnterTimestamp]
- Last timeclock punch: 2026-06-30 [VERIFIED — sqlite MAX(date(check_in_at))]

## 5. FIX-SHAPING FACTS

### No existing narrow/ungated endpoint

All timeclock GET endpoints live under `/api/volunteers/timeclock/*`, which is inside the gated path prefix. There is no separate ungated endpoint that returns the minimal data the scan flow needs. No alternative route prefix (e.g., `/api/timeclock/*` or `/api/public/*`) exists. [VERIFIED — grep of all `app.get` and `app.post` calls containing "timeclock" in `server.ts`]

### Token injection is not appropriate

vclock.html is a bare public page with:
- No localStorage/sessionStorage usage [VERIFIED]
- No cookie handling [VERIFIED]
- No auth headers of any kind [VERIFIED]
- No login flow — it's designed for anonymous QR scan access [VERIFIED]

Injecting the gate token into vclock.html would defeat the gate's purpose: the token would be publicly visible in page source to anyone who opens the URL, equivalent to no gate at all.

### Fix design considerations [INFERRED]

The fix needs to reconcile two facts:
1. vclock.html is public and cannot hold a secret token
2. The data it reads (volunteer names, shift times) is PII that the gate was designed to protect

Options to evaluate (not a recommendation — diagnosis only):
- **Path-based gate exemption:** Exclude `/api/volunteers/timeclock/recent`, `/search`, and `/status` from `isGatedPath`. Restores functionality but re-exposes the pre-gate PII leak (names + schedules of all active volunteers to anyone with the QR URL).
- **Narrower public endpoints:** Create new minimal endpoints under an ungated path prefix (e.g., `/api/public/timeclock/*`) that return only what the scan flow strictly needs — potentially with reduced scope (e.g., search returns only id+first-name, no last name; status returns only state, no full history).
- **Session-based auth:** Add a lightweight session/PIN layer to vclock.html so it can authenticate and receive a scoped token. Changes the UX (no longer zero-tap after QR scan).
