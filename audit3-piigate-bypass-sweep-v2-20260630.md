# PII-Gate Phase 2 Bypass Sweep (v2) — dashboard/index.html

Static source inspection, 2026-07-01 03:26 UTC. No changes made.

---

## Grep Commands Run

All searches executed against `/home/shelter/shelter-apps/dashboard/index.html`:

| # | Command | Purpose | Hits |
|---|---------|---------|------|
| 1 | `grep -n '/api/volunteers'` | All /api/volunteers references | 25 |
| 2 | `grep -n '/api/adoption-applications'` | All /api/adoption-applications references | 1 |
| 3 | `grep -n 'behavior-notes'` | All behavior-notes references | 3 |
| 4 | `grep -n 'gatedGet('` | All gatedGet call sites | 9 (1 definition + 8 calls) |
| 5 | `grep -n 'window\.open'` | All window.open calls | 3 |
| 6 | `grep -n 'location\.\(href\|assign\|replace\).*\(volunteers\|adoption\|behavior\)'` | Navigation to gated paths | 0 |
| 7 | `grep -n 'EventSource.*\(volunteers\|adoption\|behavior\)'` | SSE to gated paths | 0 |
| 8 | `grep -n 'XMLHttpRequest.*\(volunteers\|adoption\|behavior\)'` | XHR to gated paths | 0 |
| 9 | `grep -n 'sendBeacon.*\(volunteers\|adoption\|behavior\)'` | Beacon to gated paths | 0 |
| 10 | `grep -n '\(href\|src\)=.*\(volunteers\|adoption-applications\|behavior-notes\)'` | Static href/src attributes | 0 |
| 11 | `grep -n '\.src\s*=.*\(volunteers\|adoption\|behavior\)'` | Dynamic .src assignment | 0 |
| 12 | `grep -n 'action=.*\(volunteers\|adoption\|behavior\)'` | Form actions | 0 |
| 13 | `grep -n 'download.*\(volunteers\|adoption\|behavior\)'` | Download attributes | 0 |

Every hit from greps 1–3 was then inspected via `sed -n` to confirm the HTTP method used.

---

## Confirmation 1: All 8 Phase-1 gatedGet() Reads

| # | gatedGet() call target | grep basis |
|---|------------------------|-----------|
| 1 | `/api/dashboard/behavior-notes` | `gatedGet(\`${API_BASE}/dashboard/behavior-notes\`)` — grep 3 hit, grep 4 confirmed [VERIFIED] |
| 2 | `/api/volunteers?...` (list with filters) | url built as `'/api/volunteers?'` + params, then `gatedGet(url)` — grep 1 + grep 4 confirmed [VERIFIED] |
| 3 | `/api/volunteers/${id}` (single record) | `gatedGet(\`/api/volunteers/${id}\`)` — grep 4 confirmed [VERIFIED] |
| 4 | `/api/volunteers/timeclock/all?...` | `gatedGet('/api/volunteers/timeclock/all?start_date=...')` — grep 4 confirmed [VERIFIED] |
| 5 | `/api/volunteers/timeclock/search?q=...` | `gatedGet('/api/volunteers/timeclock/search?q=...')` — grep 4 confirmed [VERIFIED] |
| 6 | `/api/volunteers/availability-grid?...` | gridUrl built as `'/api/volunteers/availability-grid?...'`, then `gatedGet(gridUrl)` — grep 1 + grep 4 confirmed [VERIFIED] |
| 7 | `/api/volunteers/with-other-talents` | `gatedGet('/api/volunteers/with-other-talents')` — grep 4 confirmed [VERIFIED] |
| 8 | `/api/adoption-applications` | `gatedGet('/api/adoption-applications')` — grep 2 + grep 4 confirmed [VERIFIED] |

**All 8 Phase-1 gated GET reads route through gatedGet(). Zero plain-fetch stragglers to any gated GET path.** [VERIFIED]

---

## Confirmation 2: BYPASS Readers

| # | Mechanism | Path | Classification | grep basis |
|---|-----------|------|---------------|-----------|
| 1 | `window.open(url, '_blank')` | `/api/volunteers/timeclock/report?volunteer_id=...&start_date=...&end_date=...` | **BYPASS** | grep 5 hit at line 14717; url built at line 14716 as `'/api/volunteers/timeclock/report?...'`; sed confirmed [VERIFIED] |

The other two `window.open` calls target non-gated paths: `pdf.output('bloburl')` (blob URL, not an API path) and `photoUrl` (photo file URL). Neither hits a gated endpoint. [VERIFIED via sed inspection]

---

## Write-Method References (NOT gated — POST/PATCH/DELETE excluded by design)

Every remaining plain `fetch()` to a gated path uses an explicit write method. Phase 2 gates GET only; these are out of scope:

| Method | Path | Call sites | grep basis |
|--------|------|-----------|-----------|
| POST | `/api/volunteers/upload` | 1 | `method: 'POST', body: formData` [VERIFIED] |
| POST | `/api/volunteers` (create new) | 2 | `method: 'POST'` — pending + approved flows [VERIFIED] |
| PATCH | `/api/volunteers/${volEditingId}` (update) | 2 | `method: 'PATCH'` — pending + approved flows [VERIFIED] |
| DELETE | `/api/volunteers/${volEditingId}` (archive) | 1 | `method: 'DELETE'` [VERIFIED] |
| PATCH | `/api/volunteers/${volEditingId}/policy-reviewed` | 1 | `method: 'PATCH'` [VERIFIED] |
| PATCH | `/api/volunteers/${volEditingId}/approval` | 3 | `method: 'PATCH'` — 2 direct + 1 clear-on-save [VERIFIED] |
| PATCH | `/api/volunteers/${volEditingId}/tags` | 1 | `method: 'PATCH'` [VERIFIED] |
| POST | `/api/volunteers/rotate-image` | 2 | `method: 'POST'` [VERIFIED] |
| POST | `/api/volunteers/timeclock/manual` | 1 | `method: 'POST'` [VERIFIED] |
| PATCH | `/api/volunteers/${vid}/approval` (grid) | 2 | `method: 'PATCH'` — approve + clear [VERIFIED] |
| POST | `/api/volunteers/${vid}/commitments` | 1 | `method: 'POST'` [VERIFIED] |
| DELETE | `/api/volunteers/${vid}/commitments` | 1 | `method: 'DELETE'` [VERIFIED] |
| POST | `/api/volunteers/${vid}/declines` | 1 | `method: 'POST'` [VERIFIED] |
| DELETE | `/api/volunteers/${vid}/declines` | 1 | `method: 'DELETE'` [VERIFIED] |

Total: 20 plain-fetch call sites to gated paths, all write methods. [VERIFIED]

---

## Comment-Only References (no fetch)

The string `behavior-notes` appears in 2 additional lines (grep 3). Both are code comments (`// Cache-first: use batched data from behavior-notes response if available`) in `loadBioForAnimal` and `loadPhotosForAnimal`. Neither fetches — they reference cached data from gatedGet call #1 above. [VERIFIED via sed inspection]

---

## Non-Gated Exclusions (confirmed absent or out of scope)

| Path pattern | Status | grep basis |
|-------------|--------|-----------|
| `/api/volunteer/` (singular session endpoints) | Zero references in dashboard/index.html | `grep '/api/volunteer[^s]'` returned 0 [VERIFIED] |
| `/api/notifications/staff` and `/archive` | Zero references in dashboard/index.html | `grep '/api/notifications'` returned 0 [VERIFIED] |

---

## Negative-Result Bypass Mechanisms (all zero hits)

| Mechanism | grep # | Result |
|-----------|--------|--------|
| `location.href` / `location.assign` / `location.replace` to gated path | 6 | 0 hits [VERIFIED] |
| `new EventSource(...)` to gated path | 7 | 0 hits [VERIFIED] |
| `XMLHttpRequest` to gated path | 8 | 0 hits [VERIFIED] |
| `navigator.sendBeacon(...)` to gated path | 9 | 0 hits [VERIFIED] |
| `href=` or `src=` attribute to gated path | 10 | 0 hits [VERIFIED] |
| Dynamic `.src =` to gated path | 11 | 0 hits [VERIFIED] |
| `<form action=...>` to gated path | 12 | 0 hits [VERIFIED] |
| `download` attribute to gated path | 13 | 0 hits [VERIFIED] |

---

## SUMMARY

**BYPASS readers of gated PII paths in dashboard/index.html:**

| # | Mechanism | Path |
|---|-----------|------|
| 1 | `window.open` | `/api/volunteers/timeclock/report?...` |

**`/api/volunteers/timeclock/report` via `window.open` is the ONLY BYPASS reader.** All 8 Phase-1 gated GET reads go through `gatedGet()`. All 20 other plain-fetch call sites to gated paths are write methods (POST/PATCH/DELETE), excluded from the gate by design. No other bypass mechanism (navigation, SSE, XHR, beacon, static attributes, form actions, dynamic src assignment) targets any gated path.
