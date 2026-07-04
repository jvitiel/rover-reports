# W1a: Dashboard Write Conversion + Born-Gated Adoption PATCH

## PART 1 — Dashboard fetch→gatedFetch Conversion

### Call-Site Count: 23 (not 24)

The W1 caller-completeness report listed 24. Actual unique `fetch()` call-sites: **23**. The discrepancy: the report's table counted "POST + DELETE .../commitments" as a single row with "Lines 15356, 15367" suggesting 2 POST sites — but 15367 is a `DELETE`, already separately counted. Same for declines. The net is 23 unique `fetch()` → `gatedFetch()` conversions. [VERIFIED]

### All 23 Converted Call-Sites

| # | Line | Endpoint | Method | Confirmed gatedFetch |
|---|------|----------|--------|---------------------|
| 1 | 13857 | `/api/volunteers/upload` | POST | ✅ |
| 2 | 14595 | `/api/volunteers/rotate-image` (volRotateImage) | POST | ✅ |
| 3 | 14623 | `/api/volunteers/rotate-image` (volRotateFromLightbox) | POST | ✅ |
| 4 | 14142 | `/api/volunteers/${volEditingId}` (save pending) | PATCH | ✅ |
| 5 | 14215 | `/api/volunteers/${volEditingId}` (save approved) | PATCH | ✅ |
| 6 | 14249 | `/api/volunteers/${volEditingId}` (archive) | DELETE | ✅ |
| 7 | 14289 | `/api/volunteers/${volEditingId}/policy-reviewed` | PATCH | ✅ |
| 8 | 14314 | `/api/volunteers/${volEditingId}/approval` (check on) | PATCH | ✅ |
| 9 | 14362 | `/api/volunteers/${volEditingId}/approval` (check off) | PATCH | ✅ |
| 10 | 14334 | `/api/volunteers/${volEditingId}/tags` | PATCH | ✅ |
| 11 | 15345 | `/api/volunteers/${vid}/approval` (grid Y→G) | PATCH | ✅ |
| 12 | 15356 | `/api/volunteers/${vid}/commitments` (grid G→R add) | POST | ✅ |
| 13 | 15367 | `/api/volunteers/${vid}/commitments` (grid R→W remove) | DELETE | ✅ |
| 14 | 15376 | `/api/volunteers/${vid}/declines` (grid R→W add) | POST | ✅ |
| 15 | 15388 | `/api/volunteers/${vid}/declines` (grid W→Y remove) | DELETE | ✅ |
| 16 | 15397 | `/api/volunteers/${vid}/approval` (grid W→Y clear) | PATCH | ✅ |
| 17 | 15065 | `/api/volunteers/timeclock/manual` | POST | ✅ |
| 18 | 11886 | `/api/intakes/${intakeId}/status` (review button) | POST | ✅ |
| 19 | 11909 | `/api/intakes/${currentIntakeId}/status` (detail panel) | POST | ✅ |
| 20 | 13160 | `/api/dashboard/intake/${intakeId}/health-assessment` | POST | ✅ |
| 21 | 13261 | `/api/dashboard/intake/${intakeId}/seizure-record` | POST | ✅ |
| 22 | 11968 | `/api/intake-recipients` | POST | ✅ |
| 23 | 11995 | `/api/intake-recipients/${id}` | DELETE | ✅ |

[ALL VERIFIED — each line confirmed by grep showing `gatedFetch` at that exact location]

### What Was NOT Converted

- `POST /api/intake/:id/voice` — public caller (intake-form.html), excluded per W1 scope [VERIFIED — intake-form.html untouched]
- Public submits (`POST /api/adoption-application`, `POST /api/volunteers`, `POST /api/contact`) — not in scope [VERIFIED]
- PWA code (staff-pwa, volunteer-pwa, dogwalker-pwa, caregiver-pwa, coordinator-pwa) — not in scope [VERIFIED — no PWA files in diff]
- `POST /api/volunteers/timeclock/auto-close` — internal/cron, not in scope [VERIFIED]

---

## PART 2 — Born-Gated PATCH /api/adoption-applications/:id

### Route Handler

```ts
app.patch('/api/adoption-applications/:id', (req: Request, res: Response) => {
```

**Validation:**
- `:id` parsed as integer (`parseInt(req.params.id as string, 10)`), 400 on NaN [VERIFIED]
- Record existence check (`SELECT id FROM adoption_applications WHERE id = ?`), 404 if missing [VERIFIED]
- `status`: must be one of `pending|in_progress|declined|approved` — rejects `new` or any other value, 400 [VERIFIED]
- Boolean fields (`vet_ref`, `pers_ref`, `incomplete`, `concerns`): must be exactly `0` or `1`, 400 otherwise [VERIFIED]
- Text fields (`notes`, `adopted`): must be string or null, 400 otherwise [VERIFIED]
- Empty update (no recognized fields): 400 [VERIFIED]

**SQL:** Bound-parameter `UPDATE` only — field names from a static allow-list, values via `?` placeholders. No string interpolation. [VERIFIED]

**Response:** Returns the updated row via `SELECT * FROM adoption_applications WHERE id = ?`. Logs which fields were updated. [VERIFIED]

### Gate Entry — isGatedWrite

```ts
function isGatedWrite(method: string, p: string): boolean {
  if (method === 'PATCH' && /^\/api\/adoption-applications\/\d+$/.test(p)) return true;
  return false;
}
```

**Middleware change:**
```ts
// BEFORE:
if (req.method !== 'GET' || !isGatedPath(req.path)) { return next(); }

// AFTER:
const isRead = req.method === 'GET' && isGatedPath(req.path);
const isWrite = isGatedWrite(req.method, req.path);
if (!isRead && !isWrite) { return next(); }
```

This means:
- GET requests to `isGatedPath` paths → gated (unchanged behavior) [VERIFIED]
- PATCH to `/api/adoption-applications/:id` → gated (new, born-gated) [VERIFIED]
- All other writes → pass through ungated (unchanged behavior) [VERIFIED]

### The 17 Existing W1 Paths Are NOT in isGatedWrite

`isGatedWrite` contains exactly ONE entry: `PATCH /api/adoption-applications/:id`. No volunteer, intake, timeclock, or other endpoint appears. The 17 W1 volunteer/intake endpoints pass through ungated as before — their dashboard clients now send the token (via gatedFetch), but the server ignores it on those paths (GET-only gate for them). **This is the intentional W1a no-op.** Enforcement is W1b. [VERIFIED]

### Public Submit NOT Gated

`POST /api/adoption-application` (note: singular, no trailing `:id`) does NOT match `isGatedWrite` because:
1. Method is `POST`, not `PATCH`
2. Path is `/api/adoption-application` (no `s`, no `/:id` suffix)
The regex `^/api/adoption-applications/\d+$` requires the `s` and a numeric suffix. [VERIFIED]

---

## Build Result

```
> shelter-apps@2.0.0 build
> tsc
Process exited with code 0.
```
Dashboard is static HTML — no build step. [VERIFIED]

## git diff --stat

```
 dashboard/index.html | 46 ++++++++++++-------------
 server/src/server.ts | 94 +++++++++++++++++++++++++++++++++++++++++++++++++++-
 2 files changed, 116 insertions(+), 24 deletions(-)
```

Exactly 2 files. [VERIFIED]

## Commit

```
[master cdbb74d] W1a: convert 23 dashboard write call-sites to gatedFetch (no-op, server not
  enforcing); add born-gated PATCH /api/adoption-applications/:id with validation
 2 files changed, 116 insertions(+), 24 deletions(-)
```

## Confirmations

- **17 existing W1 paths NOT in isGatedWrite** — server ignores token on those writes [VERIFIED]
- **Public submits untouched** — POST /api/adoption-application, POST /api/volunteers, POST /api/contact, POST /api/volunteers/timeclock/punch [VERIFIED]
- **PWA routes untouched** — no PWA files in diff [VERIFIED]
- **auto-close untouched** — endpoint and root cron caller unaffected [VERIFIED]
- **intake/:id/voice untouched** — public intake-form.html caller unaffected [VERIFIED]
- **Caddy NOT touched** [VERIFIED]
- **Service NOT restarted** [VERIFIED]
