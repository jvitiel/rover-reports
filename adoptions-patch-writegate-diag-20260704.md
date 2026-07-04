# Adoption Applications PATCH Endpoint + Write-Gate — Diagnosis

## 1. Gate Middleware Internals

**Token loading** — symbol `piiGateToken`, top-level const [VERIFIED]:

```ts
const piiGateToken: string = (() => {
  try {
    const s = JSON.parse(readFileSync(SECRETS_PATH, 'utf-8'));
    return s.piiGateToken || '';
  } catch { return ''; }
})();
```

**Path predicate** — symbol `isGatedPath` [VERIFIED]:

```ts
function isGatedPath(p: string): boolean {
  return (
    p === '/api/volunteers'
    || p.startsWith('/api/volunteers/')
    || p === '/api/adoption-applications'
    || p === '/api/dashboard/behavior-notes'
  );
}
```

**Middleware** — registered as `app.use(...)` at line 841, AFTER `globalLimiter` (line 803), `express.json` (line 804), and a request-logging middleware (line 814). BEFORE all API route definitions. [VERIFIED]

```ts
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' || !isGatedPath(req.path)) {
    return next();                   // ← SHORT-CIRCUIT: non-GET always passes
  }
  if (!piiGateToken) {               // fail-open kill-switch
    // sampled warn, then next()
    return next();
  }
  // constant-time token comparison
  const provided = Buffer.from(req.header('X-Gate-Token') || '');
  const expected = Buffer.from(piiGateToken);
  const ok = provided.length === expected.length && timingSafeEqual(provided, expected);
  if (ok) return next();
  // 401 with sampled per-IP warn
  return res.status(401).json({ error: 'gate' });
});
```

**⚠️ Key issue:** The guard condition is `req.method !== 'GET'` — any PATCH/PUT/POST/DELETE skips the gate entirely via `return next()`. A `PATCH /api/adoption-applications/:id` today would be **ungated**. [VERIFIED]

**Fix approach:** Change the method check to allow both GET and PATCH through the gate enforcement (not the short-circuit). Recommended: replace `req.method !== 'GET'` with a check that passes GET and PATCH to gate logic, while still short-circuiting other methods (POST, PUT, DELETE, OPTIONS) so they reach their handlers ungated. [INFERRED]

Alternatively, since `isGatedPath` already scopes which paths are checked, the method guard could be broadened to `!['GET', 'PATCH'].includes(req.method)` — any PATCH to a non-gated path would still short-circuit via `!isGatedPath(req.path)`. [INFERRED]

**⚠️ Path matching subtlety for `:id` param routes:** `isGatedPath` checks `p === '/api/adoption-applications'` (exact match). A PATCH to `/api/adoption-applications/12` would NOT match that exact check. It WOULD match `p.startsWith('/api/adoption-applications/')` — but that predicate doesn't exist today (unlike volunteers which has both exact and startsWith). **`isGatedPath` must be extended** to add `|| p.startsWith('/api/adoption-applications/')` for the `:id` subpath to be gated. [VERIFIED]

## 2. Public POST Paths That Must Stay Open

| Path | Method | Purpose | Gated? | Collision risk with PATCH gate? |
|------|--------|---------|--------|-------------------------------|
| `/api/adoption-application` | POST | Public form submit | No — not in `isGatedPath`, singular "application" | **None** — different path entirely (`adoption-application` singular vs `adoption-applications` plural). POST method also excluded by method check. [VERIFIED] |
| `/api/volunteers` | POST | Public volunteer form submit | No — POST method short-circuits before token check | **None** — POST is excluded by `req.method !== 'GET'` short-circuit. Even if we add PATCH to the method check, POST still passes through. [VERIFIED] |

**Path-shape collision risk:** Zero. The public submission endpoint is `/api/adoption-application` (singular, POST). The gated PATCH endpoint is `/api/adoption-applications/:id` (plural, PATCH). Different path, different method. [VERIFIED]

## 3. Client Write Helper

**Current `gatedGet`** — symbol `async function gatedGet(url)` [VERIFIED]:

```js
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

**What's needed:** A general-purpose `gatedFetch(url, options)` that mirrors the same `_tokenReady` await + token-attach + 401-retry logic, but accepts arbitrary `method`, `body`, and `headers`. Pattern:

```js
async function gatedFetch(url, options = {}) {
  await _tokenReady;
  if (_piiGateToken) {
    options.headers = { ...(options.headers || {}), 'X-Gate-Token': _piiGateToken };
  }
  let resp = await fetch(url, options);
  if (resp.status === 401) {
    await fetchToken();
    if (_piiGateToken) {
      options.headers = { ...(options.headers || {}), 'X-Gate-Token': _piiGateToken };
    }
    resp = await fetch(url, options);
  }
  return resp;
}
```

The token-readiness / retry logic generalizes cleanly — no structural change needed, just accepting `options` instead of building a GET-only opts object. `gatedGet` can optionally be refactored to call `gatedFetch` under the hood, or left as-is. [INFERRED]

**PATCH call pattern from dashboard:**
```js
const resp = await gatedFetch(`/api/adoption-applications/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'approved', vet_ref: 1 }),
});
```

## 4. Existing Update Patterns

**Best mirror: `PATCH /api/volunteers/:id`** — symbol `app.patch('/api/volunteers/:id', ...)` [VERIFIED]:

```ts
app.patch('/api/volunteers/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const vol = getVolunteerById(id);
    if (!vol) {
      res.status(404).json({ success: false, error: 'Volunteer not found' });
      return;
    }
    const { formData, status, notes, approvedBy } = req.body;
    // ... validate + build updates ...
    // ... DB write ...
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

Pattern: parseInt `:id` → existence check (404 if not found) → destructure body → validate → DB write → 200/success. [VERIFIED]

**Orphaned `updateAdoptionApplicationStatus`** — symbol in `localDatabase.ts` [VERIFIED]:

```ts
export function updateAdoptionApplicationStatus(id: number, status: string): boolean {
  const database = getDatabase();
  const result = database.prepare(`UPDATE adoption_applications SET status = ? WHERE id = ?`).run(status, id);
  return result.changes > 0;
}
```

**Assessment:** This function updates only `status`. For 7 writable fields it would need to be replaced with a new parameterized multi-field update function. Building a new `updateAdoptionApplication(id, fields)` function is cleaner than trying to extend this single-column function. The orphaned function can be left in place or removed — it has zero callers. [INFERRED]

**Recommended new DB function shape:**

```ts
export function updateAdoptionApplication(id: number, fields: {
  status?: string;
  vet_ref?: number;
  pers_ref?: number;
  incomplete?: number;
  concerns?: number;
  notes?: string | null;
  adopted?: string | null;
}): boolean {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) { sets.push(`${key} = ?`); values.push(val); }
  }
  if (sets.length === 0) return true;
  values.push(id);
  const result = getDatabase().prepare(
    `UPDATE adoption_applications SET ${sets.join(', ')} WHERE id = ?`
  ).run(...values);
  return result.changes > 0;
}
```

All writes use bound parameters (`?`) — no interpolation. The column names are from a fixed allowlist (the destructured keys), not from user input. [INFERRED]

## 5. Update Target Shape

**Columns the PATCH will write (from PRAGMA table_info):**

| Column | DB Type | Constraint | Validation Rule |
|--------|---------|-----------|-----------------|
| `status` | TEXT NOT NULL DEFAULT 'new' | NOT NULL | Must be one of: `'pending'`, `'in_progress'`, `'declined'`, `'approved'` |
| `vet_ref` | INTEGER NOT NULL DEFAULT 0 | NOT NULL | Must be 0 or 1 |
| `pers_ref` | INTEGER NOT NULL DEFAULT 0 | NOT NULL | Must be 0 or 1 |
| `incomplete` | INTEGER NOT NULL DEFAULT 0 | NOT NULL | Must be 0 or 1 |
| `concerns` | INTEGER NOT NULL DEFAULT 0 | NOT NULL | Must be 0 or 1 |
| `notes` | TEXT (nullable) | — | Free text, or null |
| `adopted` | TEXT (nullable) | — | Free text (animal names), or null |

[VERIFIED — all from `PRAGMA table_info(adoption_applications)`]

**Row PK:** `id` — INTEGER PRIMARY KEY AUTOINCREMENT. The `:id` route param maps to this. [VERIFIED]

**Bound parameters:** All writes MUST use `?` placeholders — no string interpolation of user input into SQL. The column-name set in the update builder is a fixed code-side allowlist, not derived from request body keys. [VERIFIED — consistent with all existing patterns in codebase]

## 6. Gate-State Probe Interaction

**Health-check probe** — in `/home/shelter/scripts/health-check.sh` [VERIFIED]:

```bash
GATE_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
  http://127.0.0.1:3000/api/volunteers 2>/dev/null || echo "000")
```

This is an **anonymous GET** to `/api/volunteers`. It expects a `401` response to confirm the gate is active. [VERIFIED]

**Impact of adding PATCH to the method check:** None. The probe uses GET, which remains gated. Adding PATCH to the allowed-methods set for gate enforcement does not change GET behavior. The probe will continue to receive 401 and report `piiGate: ACTIVE`. [VERIFIED]

**Impact of extending `isGatedPath`:** The probe tests `/api/volunteers`, which is already in `isGatedPath`. Adding `/api/adoption-applications/` startsWith does not affect the volunteers path. [VERIFIED]

## Summary of Changes Needed for PATCH Endpoint

1. **`isGatedPath`** — add `|| p.startsWith('/api/adoption-applications/')` so `:id` subpaths are gated
2. **Method check** — change `req.method !== 'GET'` to `!['GET', 'PATCH'].includes(req.method)` (or equivalent) so PATCH requests to gated paths are enforced
3. **`localDatabase.ts`** — add `updateAdoptionApplication(id, fields)` with parameterized multi-field UPDATE
4. **`server.ts`** — add `app.patch('/api/adoption-applications/:id', ...)` route mirroring the volunteers PATCH pattern
5. **`dashboard/index.html`** — add `gatedFetch(url, options)` helper; wire to table UI
