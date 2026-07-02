# Public Timeclock Fix Implementation — 2026-07-02

## Step 0: Does vclock.html render 14-day history?

**YES.** vclock.html has a full `renderHistory()` function (symbol `function renderHistory(history)`) that builds a table with Date/In/Out/Duration columns, and the status handler calls `renderHistory(data.history || [])`. The public status endpoint therefore includes the history array.

## Step 1: Public endpoints added

Three new endpoints registered under `/api/public/timeclock/` in `server/src/server.ts`, placed immediately before the existing gated `// Endpoint 1: GET /api/volunteers/timeclock/recent` block and after the shared helpers `timeclockVerifyVolunteer` and `timeclockDurationMinutes` (which they reuse).

### Name truncation helper

```ts
/** Truncate "Jane Smith" → "Jane S." ; single-token names pass through unchanged. */
function publicNameTruncate(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || '';
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0];
  return `${first} ${lastInitial}.`;
}
```

- Multi-word names: first token + first char of last token + `.` (e.g. "Jane Smith" → "Jane S.", "Mary Jane Watson" → "Mary W.")
- Single-word names: returned as-is, no trailing initial
- Empty string: returns empty

### GET /api/public/timeclock/recent

Same SQL as the gated `/api/volunteers/timeclock/recent` (30-day window, approved volunteers, grouped by id, ordered by last_activity_at DESC). Response field `name` is `publicNameTruncate(full_name)` — truncation is server-side in the JSON output.

Response shape: `{ success, volunteers: [{ id, name, last_activity_at }] }`

### GET /api/public/timeclock/search?q=\<query\>

Same SQL as the gated `/api/volunteers/timeclock/search` (LIKE match, approved, LIMIT 20, ORDER BY full_name ASC). Response field `name` is `publicNameTruncate(full_name)`.

Response shape: `{ success, volunteers: [{ id, name }] }`

### GET /api/public/timeclock/status?volunteer_id=\<id\>

Same logic as gated `/api/volunteers/timeclock/status`: verifies volunteer via `timeclockVerifyVolunteer`, returns open shift state + 14-day history with duration_minutes. No name field in this response, so no truncation needed. History array included per Step 0 finding.

Response shape: `{ success, state, open_shift_id, open_shift_check_in_at, history: [{ id, check_in_at, check_out_at, auto_closed, duration_minutes }] }`

## Step 2: vclock.html repointed

Three URL changes, each a single-string substitution:

| Old path | New path |
|----------|----------|
| `/api/volunteers/timeclock/recent` | `/api/public/timeclock/recent` |
| `/api/volunteers/timeclock/search?q=...` | `/api/public/timeclock/search?q=...` |
| `/api/volunteers/timeclock/status?volunteer_id=...` | `/api/public/timeclock/status?volunteer_id=...` |

**POST `/api/volunteers/timeclock/punch` — UNCHANGED.** The punch call remains at its original path. It passes through the gate because the gate only intercepts GET requests (`req.method !== 'GET'` → `next()`).

**No token added.** vclock.html remains a fully anonymous public page.

## Step 3: Gated routes untouched

`isGatedPath` — unchanged. Still gates:
- `/api/volunteers` and `/api/volunteers/*`
- `/api/adoption-applications`
- `/api/dashboard/behavior-notes`

`/api/public/*` does NOT match `isGatedPath` — confirmed by code inspection: `p.startsWith('/api/volunteers/')` does not match `/api/public/timeclock/*`.

All nine gated timeclock endpoints (`/api/volunteers/timeclock/{recent,search,status,punch,history,all,auto-close,report,manual}`) are byte-for-byte unchanged in the diff. The piiGateMiddleware is byte-for-byte unchanged.

## Step 4: Build

```
$ cd /home/shelter/shelter-apps/server && npm run build
> shelter-apps@2.0.0 build
> tsc
(exit 0 — no errors, no warnings)
```

## Verification

### Global rate limiter covers /api/public/*

`app.use(globalLimiter)` is at line 803 in server.ts. The public endpoints are registered at ~line 9778+. Express middleware ordering: `app.use(globalLimiter)` applies to all subsequent routes. The public endpoints are well after it, so the 2000-req/15min/IP limiter applies. Confirmed.

### git diff --stat

```
server/src/server.ts | 108 +++++++++++++++++++++++++++++++++++++++++++++++++++
 vclock.html          |   6 +--
 2 files changed, 111 insertions(+), 3 deletions(-)
```

Exactly 2 files, as expected.

### Commit

```
cbddf3b Add public /api/public/timeclock/* endpoints (server-side first+initial, minimized)
         for anonymous QR scanner; repoint vclock.html; gated volunteers/timeclock reads unchanged
```

### Post-restart testing required

The new `/api/public/timeclock/*` endpoints only exist in the compiled dist but are not live until `systemctl restart shelter-app`. After restart, verify:
- `GET /api/public/timeclock/recent` returns 200 with truncated names
- `GET /api/public/timeclock/search?q=a` returns 200 with truncated names
- `GET /api/public/timeclock/status?volunteer_id=<valid>` returns 200 with history
- All three without any token
- Gated equivalents still return 401 without token
- vclock.html loads and the volunteer list appears
