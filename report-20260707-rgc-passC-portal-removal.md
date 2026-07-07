# RGC Pass C — Requester Portal Removal

## Routes Removed (7 portal routes + 1 serving route)

| # | Method | Path | server.ts span (pre-edit) | Purpose |
|---|--------|------|--------------------------|---------|
| 1 | POST | `/api/rg/login` | 11587–11620 | Requester PIN login, creates rg_sessions |
| 2 | POST | `/api/rg/logout` | 11623–11627 | Requester logout, deletes rg_sessions |
| 3 | GET | `/api/rg/requests` | 11632–11640 | List requester's own requests |
| 4 | POST | `/api/rg/requests` | 11643–11704 | Create new request (rg_requests + rg_messages + rg_attachments) |
| 5 | GET | `/api/rg/requests/:id` | 11707–11729 | View single request + messages |
| 6 | POST | `/api/rg/requests/:id/messages` | 11732–11784 | Add message to request (rg_messages + rg_attachments) |
| 7 | GET | `/api/rg/attachments/:id` | 11787–11815 | Download attachment file |
| 8 | GET | `/rg-portal` | 11472–11475 | Serve rg-portal.html file |

Total: 8 route handlers removed. [VERIFIED — grep for `app.(get|post|put|patch|delete).*'/api/rg` in server.ts returns zero hits]

## Portal-Only Helpers/Constants Removed (from server.ts)

| Name | Type | Usages (pre-edit) | Action | Grep basis |
|------|------|-------------------|--------|------------|
| `RG_ATTACHMENTS_DIR` | const | Routes 4, 6, 7 + mkdir init block | REMOVE | All 4 uses within removed portal code [VERIFIED] |
| `RG_ALLOWED_MIME_TYPES` | const | `rgUpload` filter only | REMOVE | Single use in `rgUpload` [VERIFIED] |
| `rgUpload` | multer instance | Routes 4, 6 | REMOVE | 2 uses, both in removed routes [VERIFIED] |
| `rgAuthMiddleware` | function | Routes 2–7 | REMOVE | 6 uses, all in removed routes [VERIFIED] |
| `saveRGAttachment` | async function | Routes 4, 6 | REMOVE | 2 call sites, both in removed routes [VERIFIED] |
| `rgLoginLimiter` | rateLimit | Route 1 | REMOVE | Single use in `/api/rg/login` [VERIFIED] |
| `checkDeadlineReminders` | async function | setInterval call | REMOVE | Only caller is the hourly setInterval [VERIFIED] |
| `setInterval(checkDeadlineReminders, ...)` | timer | Startup block | REMOVE | Invokes removed function [VERIFIED] |
| `seedRGTestData()` | call | Startup block | REMOVE | Seeds rg_* tables; function still exists in localDatabase.ts but call removed [VERIFIED] |
| RG_ATTACHMENTS_DIR mkdir block | init | Startup block | REMOVE | Creates directory for removed attachment system [VERIFIED] |

## Imports Removed (from server.ts)

### From `./localDatabase.js` (18 names removed):

| Name | Usages outside import | Action |
|------|----------------------|--------|
| getRGRequesterById | Routes 4, 6 only | REMOVE [VERIFIED] |
| getRGRequesterByEmail | Route 1 only | REMOVE [VERIFIED] |
| verifyPin | Route 1 only | REMOVE [VERIFIED] |
| createRGSession | Route 1 only | REMOVE [VERIFIED] |
| validateRGSession | rgAuthMiddleware only | REMOVE [VERIFIED] |
| deleteRGSession | Route 2 only | REMOVE [VERIFIED] |
| createRGRequest | Route 4 only | REMOVE [VERIFIED] |
| getRGRequestById | Routes 5, 6 only | REMOVE [VERIFIED] |
| getAllRGRequests | Route 3 only | REMOVE [VERIFIED] |
| markRGRequestReminderSent | checkDeadlineReminders only | REMOVE [VERIFIED] |
| getRequestsDueForReminder | checkDeadlineReminders only | REMOVE [VERIFIED] |
| addRGMessage | Route 6 only | REMOVE [VERIFIED] |
| getRGMessageById | Route 7 only | REMOVE [VERIFIED] |
| getRGMessagesByRequestId | Routes 4, 5 only | REMOVE [VERIFIED] |
| addRGAttachment | Routes 4, 6 only | REMOVE [VERIFIED] |
| getRGAttachmentById | Route 7 only | REMOVE [VERIFIED] |
| getRGEmailRoutingForCategory | Routes 4, 6 + checkDeadlineReminders only | REMOVE [VERIFIED] |
| seedRGTestData | Startup call only | REMOVE [VERIFIED] |

### From `./emailService.js` (3 names removed):

| Name | Usages outside import | Action |
|------|----------------------|--------|
| sendRGNewRequestEmail | Route 4 only | REMOVE [VERIFIED] |
| sendRGDeadlineReminderEmail | checkDeadlineReminders only | REMOVE [VERIFIED] |
| sendRGFollowUpEmail | Route 6 only | REMOVE [VERIFIED] |

### From `./types.js` (2 names removed, 1 kept):

| Name | Action | Reason |
|------|--------|--------|
| RGRequestCategory | REMOVE | Used only in removed routes + checkDeadlineReminders [VERIFIED] |
| RGRequestStatus | REMOVE | Used only in removed routes [VERIFIED] |
| IntakeStatus | KEEP | Used by Overnight Intake route (line 11739 post-edit) [VERIFIED] |

## Dead Code Retained (out of scope — separate cleanup)

The following are now dead code but were NOT removed in this pass:

- **localDatabase.ts**: All `*RG*` exported functions (~400 lines) — still reference RG types, still export, but no callers remain in server.ts. Harmless; tsc compiles cleanly. Removal is a separate localDatabase cleanup pass.
- **types.ts**: RG type definitions (lines 401–476) — referenced by localDatabase.ts. Cannot remove without also cleaning localDatabase.ts.
- **emailService.ts**: `sendRGNewRequestEmail`, `sendRGDeadlineReminderEmail`, `sendRGStaffResponseEmail`, `sendRGResolvedEmail`, `sendRGFollowUpEmail` — exported but no callers. Harmless dead exports.
- **localDatabase.ts**: Schema `CREATE TABLE IF NOT EXISTS rg_*` in `initDatabase()` — ensures tables exist on startup. Harmless (tables already exist, will be dropped separately).
- **rg-cares-logo.png** in `/public/` — also used by `intake-form.html` (non-RG), so KEPT. [VERIFIED — grep shows 2 references: rg-portal.html (removed) + intake-form.html (live)]

## Files Removed

| File | Method | Size |
|------|--------|------|
| `rg-portal.html` | Renamed to `.removed-passC` | 37,212 bytes |

The file is a self-contained single-page app (login form, request list, request detail, message thread UI, attachment upload) — entirely RG-portal-specific with no shared code. [VERIFIED]

## Caddy Reference (flagged for follow-up — NOT edited)

`/etc/caddy/Caddyfile` lines 122 and 124 reference `/rg-portal` in path matchers:

```
@standalone path /intake /vclock /rg-portal /profile-form ...
@dashboard not path /api/* /intake /vclock /rg-portal /profile-form ...
```

These are routing rules that bypass the dashboard SPA for standalone pages. With `/rg-portal` removed from Express, requests to that path now 404 (Express returns 404 before the Caddy rule matters). The stale reference is cosmetic — it causes no errors, no security issue, no routing problem. **Recommend removing `/rg-portal` from both Caddy lines in a separate Caddy cleanup pass.**

## Verification

### All 7 portal routes → 404

| Method | Path | HTTP Status |
|--------|------|-------------|
| POST | `/api/rg/login` | 404 ✅ |
| POST | `/api/rg/logout` | 404 ✅ |
| GET | `/api/rg/requests` | 404 ✅ |
| POST | `/api/rg/requests` | 404 ✅ |
| GET | `/api/rg/requests/1` | 404 ✅ |
| POST | `/api/rg/requests/1/messages` | 404 ✅ |
| GET | `/api/rg/attachments/1` | 404 ✅ |
| GET | `/rg-portal` | 404 ✅ |

[VERIFIED — curl output]

### Non-RG routes unaffected

| Method | Path | HTTP Status |
|--------|------|-------------|
| GET | `/api/animals` | 200 ✅ |
| GET | `/intake` | 200 ✅ |

[VERIFIED — curl output]

### Zero remaining portal route definitions

```
grep "app.(get|post|put|patch|delete).*'/api/rg" server.ts → exit code 1 (no matches)
```

[VERIFIED]

### rg_* tables untouched

| Table | Row count | Status |
|-------|-----------|--------|
| rg_requesters | 2 | PRESENT ✅ |
| rg_requests | 4 | PRESENT ✅ |
| rg_messages | 25 | PRESENT ✅ |
| rg_attachments | 5 | PRESENT ✅ |
| rg_sessions | 1 | PRESENT ✅ |
| rg_email_routing | (present) | PRESENT ✅ |

No DROP, ALTER, or DELETE was executed. Tables retained for separate backup-first drop. [VERIFIED]

### Build

- `tsc`: passed, zero errors [VERIFIED]
- `systemctl restart shelter-app`: succeeded [VERIFIED]
- server.ts: 14,326 → 13,994 lines (332 lines removed) [VERIFIED]

## Status

**Committed.** Portal routes 404, non-RG routes intact, rg_* tables untouched. Caddy stale `/rg-portal` reference flagged for follow-up.
