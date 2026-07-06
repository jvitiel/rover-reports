# Read-Gate Follow-Up Diagnosis — 2026-07-06

## CHECK A — RG-Staff Routes: Dead-Code Confirmation

### A1. Route definitions in server/src/server.ts

| Line | Method | Path |
|------|--------|------|
| 11629 | GET | `/api/rg/staff/requests` |
| 11640 | GET | `/api/rg/staff/requests/:id` |
| 11665 | POST | `/api/rg/staff/requests/:id/messages` |
| 11710 | POST | `/api/rg/staff/requests/:id/assign` |
| 11728 | POST | `/api/rg/staff/requests/:id/status` |
| 11758 | POST | `/api/rg/staff/requests/:id/reopen` |
| 11775 | GET | `/api/rg/staff/attachments/:id` |
| 11810 | GET | `/api/rg/staff/requesters` |
| 11829 | POST | `/api/rg/staff/requesters` |
| 11862 | PUT | `/api/rg/staff/requesters/:id` |
| 11889 | POST | `/api/rg/staff/requesters/:id/reset-pin` |
| 11911 | GET | `/api/rg/staff/stats` |

No imported route modules — all 12 routes defined inline in server.ts. [VERIFIED via grep]

### A2. Caller grep results

| Surface | Hits |
|---------|------|
| staff-pwa/ | no callers found [VERIFIED] |
| staging-staff/ | no callers found [VERIFIED] |
| matcher-web/ | no callers found [VERIFIED] |
| volunteer-app/ | no callers found [VERIFIED] |
| **dashboard/** | **12 hits** — all in `dashboard/index.html`, lines 11234–11670 [VERIFIED] |
| dogwalker/ | no callers found [VERIFIED] |
| caregiver/ | no callers found [VERIFIED] |
| coordinator/ | no callers found [VERIFIED] |
| /home/rover scripts | backup files only (rover/backups/dashboard-pre-*.html, server-pre-*.ts) — not live [VERIFIED] |
| /home/shelter/scripts + cron | no callers found [VERIFIED] |

Dashboard callers (all in `dashboard/index.html`):
- Line 11234: `fetch(${API_BASE}/rg/staff/stats)` — loads stats on RGC tab open
- Line 11243: `fetch(${API_BASE}/rg/staff/requests)` — loads request list
- Line 11369: `fetch(${API_BASE}/rg/staff/requests/${requestId})` — loads single request detail
- Line 11439: `<a href="${API_BASE}/rg/staff/attachments/${att.id}">` — bare link to download attachment
- Line 11476: `fetch(…/assign)` — assign staff (POST)
- Line 11503–11504: `fetch(…/reopen)` or `fetch(…/status)` — status change (POST)
- Line 11544: `fetch(…/messages)` — send message (POST)
- Line 11569: `fetch(${API_BASE}/rg/staff/requesters)` — load contacts list
- Line 11622: `fetch(…/requesters)` — create contact (POST)
- Line 11645: `fetch(…/requesters/${contactId})` — update contact (PUT)
- Line 11670: `fetch(…/requesters/${contactId}/reset-pin)` — reset PIN (POST)

**Critical note:** The RG Cares tab button is hidden: `<button class="tab-btn" onclick="handleRgcTabClick()" id="tab-rgc" style="display: none">📬 RG Cares</button>` (line 5279). [VERIFIED] The tab is present in HTML but not visible to users. All 12 callers are exclusively inside the RGC tab logic. No external reference reaches these routes outside this hidden section.

### A3. Backing table row counts

```
sqlite> SELECT 'rg_requesters' as tbl, COUNT(*) as cnt FROM rg_requesters
        UNION ALL SELECT 'rg_requests', COUNT(*) FROM rg_requests
        UNION ALL SELECT 'rg_messages', COUNT(*) FROM rg_messages
        UNION ALL SELECT 'rg_attachments', COUNT(*) FROM rg_attachments
        UNION ALL SELECT 'rg_sessions', COUNT(*) FROM rg_sessions;
```

| Table | Row count |
|-------|-----------|
| rg_requesters | 2 |
| rg_requests | 4 |
| rg_messages | 25 |
| rg_attachments | 5 |
| rg_sessions | 1 |

[VERIFIED via `sudo -u shelter sqlite3`]

**⚠ All 5 tables are non-empty.** Data appears to be test/seed data (requester names are "Test Requester 1" and "Test Requester 2", emails are `test1@rgcares.test` and `test2@rgcares.test`), but **possible real requester data — separate data-cleanup question.** Not touched.

### A4. Dead-code assessment

The RG-staff routes have exactly ONE live consumer: `dashboard/index.html`. That consumer's tab is `display: none` — hidden from users. No other app, script, or cron calls these routes. The routes are **functionally dead** — the code exists and executes if called directly, but no user-facing path reaches them through the UI. [VERIFIED]

---

## CHECK B — /api/walk-log: Dead-Code Confirmation

### B1. Route definition

`server/src/server.ts` line 3962:
```
app.get('/api/walk-log', async (_req: Request, res: Response) => {
```
Backing: calls `getAllWalkLogData()` from `googleSheetsService.ts` line 961. Data source is Google Sheets (not local SQLite). [VERIFIED via source read]

### B2. Caller grep results

| Surface | Hits |
|---------|------|
| staff-pwa/ | no callers found [VERIFIED] |
| staging-staff/ | no callers found [VERIFIED] |
| matcher-web/ | no callers found [VERIFIED] |
| volunteer-app/ | no callers found [VERIFIED] |
| dashboard/ | no callers found [VERIFIED] |
| dogwalker/ | no callers found [VERIFIED] |
| caregiver/ | no callers found [VERIFIED] |
| coordinator/ | no callers found [VERIFIED] |
| /home/rover scripts | no callers found [VERIFIED] |
| /home/shelter/scripts + cron | no callers found [VERIFIED] |

**Zero callers across all surfaces.** [VERIFIED via grep across all app dirs, scripts, and cron]

### B3. Backing data source

Google Sheets (not local SQLite). The `getAllWalkLogData()` function fetches from a configured Google Sheets spreadsheet. No local table to count. The anon curl from the earlier enumeration returned real data with 5 walk-log entries containing walker names. [VERIFIED — data exists in the external sheet]

### B4. Dead-code assessment

`/api/walk-log` has **zero callers** in any client app, script, or cron job. It is **completely dead code** — an orphaned endpoint with no consumer. [VERIFIED]

---

## CHECK C — /api/intake-recipients Caller Map

### C1. Exhaustive caller enumeration

| Surface | Hits | Details |
|---------|------|---------|
| staff-pwa/ | no callers found [VERIFIED] | — |
| staging-staff/ | no callers found [VERIFIED] | — |
| matcher-web/ | no callers found [VERIFIED] | — |
| volunteer-app/ | no callers found [VERIFIED] | — |
| **dashboard/** | **5 GET callers + 2 write callers** [VERIFIED] | See breakdown below |
| dogwalker/ | no callers found [VERIFIED] | — |
| caregiver/ | no callers found [VERIFIED] | — |
| coordinator/ | no callers found [VERIFIED] | — |
| /home/rover scripts | no callers found [VERIFIED] | — |
| /home/shelter/scripts + cron | no callers found [VERIFIED] | — |
| **server-side email dispatch** | **3 callers of `getIntakeAlertRecipients()`** [VERIFIED] | See breakdown below |

#### Dashboard callers (all in `dashboard/index.html`)

| File:Line | Call type | Classification | Basis |
|-----------|-----------|----------------|-------|
| dashboard/index.html:11710 | `fetch(${API_BASE}/intake-recipients)` (GET) | **(a) overnight-intake app flow** | Inside `loadIntakeData()` function which is the data-loader for the Overnight Intake tab. The Intake tab is unconditionally visible (not hidden like RGC). This GET loads the recipient list for display in the intake management UI. |
| dashboard/index.html:11973 | `document.getElementById('intakeRecipientsList')` (DOM ref) | **(a) overnight-intake app flow** | CSS class `.intake-recipients-list` and DOM container — rendering target for recipient list inside the Intake tab. |
| dashboard/index.html:12003 | `gatedFetch(${API_BASE}/intake-recipients, {method:'POST'})` | **(a) overnight-intake app flow** | "Add recipient" button handler — gated POST to create a new recipient. Write path, not a GET exposure. |
| dashboard/index.html:12016 | `fetch(${API_BASE}/intake-recipients)` (GET) | **(a) overnight-intake app flow** | Refresh-after-add: re-fetches the recipient list after a successful POST to re-render the UI. |
| dashboard/index.html:12030 | `gatedFetch(${API_BASE}/intake-recipients/${id}, {method:'DELETE'})` | **(a) overnight-intake app flow** | "Remove recipient" button handler — gated DELETE. Write path. |
| dashboard/index.html:12038 | `fetch(${API_BASE}/intake-recipients)` (GET) | **(a) overnight-intake app flow** | Refresh-after-delete: re-fetches the recipient list after a successful DELETE. |
| dashboard/index.html:4528 | `.intake-recipients-list { }` (CSS) | **(a) overnight-intake app flow** | Styling for the recipient list container. |

**All 7 dashboard references are part of the Overnight Intake tab's recipient management UI.** None appear in any other tab or standalone feature. [VERIFIED]

#### Server-side email dispatch callers (internal, not via HTTP)

| File:Line | Call | Classification | Basis |
|-----------|------|----------------|-------|
| server.ts:12071 | `getIntakeAlertRecipients()` | **(b) CURRENTLY-LIVE production path** | Called in the POST `/api/overnight-intake` handler's 90-second email timer. When a new intake is submitted, this reads active recipients from `intake_alert_recipients` table and emails them. This fires today on any intake submission. |
| server.ts:12377 | `getIntakeAlertRecipients()` | **(b) CURRENTLY-LIVE production path** | Called in the voice-note upload path for intake — sends email with transcript attached. Fires today when an intake includes a voice note. |
| server.ts:12462 | `getIntakeAlertRecipients()` | **(b) CURRENTLY-LIVE production path** | Called in the server startup sweep — checks for any intake records with `email_sent_at IS NULL` and sends pending alert emails. Fires every time the server restarts. |

**Key distinction:** The server-side email dispatch (`getIntakeAlertRecipients()` in localDatabase.ts:3694) reads directly from the `intake_alert_recipients` SQLite table via `SELECT * FROM intake_alert_recipients WHERE active = 1`. It does NOT call the HTTP `GET /api/intake-recipients` endpoint. Gating the GET endpoint would not break email dispatch. [VERIFIED via source trace]

#### Summary

- **GET /api/intake-recipients** has 3 GET callers, all in `dashboard/index.html`, all inside the Overnight Intake tab (classification: intake app flow)
- The Overnight Intake tab is **unconditionally visible** in the dashboard (unlike RGC which is `display: none`). The intake feature is live.
- Server-side email dispatch uses a direct DB call (`getIntakeAlertRecipients()`), not the HTTP endpoint. Gating the GET would not affect email sending.
- POST and DELETE on intake-recipients already use `gatedFetch` (gate-protected). Only the GET calls use plain `fetch`.

---

## CHECK D — intake-audio Gate Verification (INFERRED → VERIFIED)

### D1. Real file identified

```
sqlite> SELECT id, voice_note_url FROM overnight_intakes WHERE voice_note_url IS NOT NULL LIMIT 1;
44|/intake-audio/44/voice_1778693566569.webm
```

On-disk path: `/home/shelter/shelter-apps/intake-audio/44/voice_1778693566569.webm` — 78,542 bytes, WebM format. [VERIFIED via `ls -la`]

### D2. Anonymous curl (no token) — expect 401

```
curl -sSw "\nHTTP_CODE:%{http_code} CONTENT_TYPE:%{content_type} SIZE:%{size_download}" \
  "https://dashboard.4lgshelterapp.duckdns.org/api/docs/intake-audio/44/voice_1778693566569.webm" \
  -o /dev/null
```

Result:
```
HTTP_CODE:401 CONTENT_TYPE:application/json; charset=utf-8 SIZE:16
```

**401 — blocked.** [VERIFIED]

### D3. Authenticated curl (with gate token) — expect 200 + audio bytes

Token obtained:
```
curl -sS "https://dashboard.4lgshelterapp.duckdns.org/api/gate-token"
→ {"token":"18318b14f90ac76820c1eff263507f0f493b1a38621f95fc2dd416d0d40db309"}
```

Authenticated request:
```
curl -sSw "\nHTTP_CODE:%{http_code} CONTENT_TYPE:%{content_type} SIZE:%{size_download}" \
  -H "X-Gate-Token: 18318b14f90ac76820c1eff263507f0f493b1a38621f95fc2dd416d0d40db309" \
  "https://dashboard.4lgshelterapp.duckdns.org/api/docs/intake-audio/44/voice_1778693566569.webm" \
  -o /tmp/intake-audio-test.webm
```

Result:
```
HTTP_CODE:200 CONTENT_TYPE:audio/webm SIZE:78542
```

File verification:
```
file /tmp/intake-audio-test.webm → WebM
ls -la /tmp/intake-audio-test.webm → 78542 bytes (matches source file exactly)
```

**200 with real audio content (audio/webm, 78,542 bytes, WebM format) — NOT an SPA shell.** [VERIFIED]

### D4. Gate status upgrade

`GET /api/docs/intake-audio/:id/:file` gate status: **INFERRED → VERIFIED**. Anonymous access returns 401; authenticated access returns real audio bytes with correct content-type. The `/api/docs/` prefix catch in `isGatedPath()` (line ~838: `p.startsWith('/api/docs/')`) correctly gates this route. [VERIFIED]
