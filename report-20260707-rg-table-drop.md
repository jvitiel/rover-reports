# RG Table Drop + Schema-Init Removal + Dead Export Cleanup

## Step 1 — Frozen Table List

Narrow pattern (`rg\_%` ESCAPE `\`) and broad pattern (`rg%`) returned identical results — no surprise rg-prefixed tables. [VERIFIED]

| # | Table | Row count |
|---|-------|-----------|
| 1 | rg_attachments | 5 |
| 2 | rg_email_routing | 6 |
| 3 | rg_messages | 25 |
| 4 | rg_requesters | 2 |
| 5 | rg_requests | 4 |
| 6 | rg_sessions | 1 |

Note: `rg_email_routing` is a 6th table not in the original expected-5 list. Zero callers post-Pass-C. Included in drop set.

## Step 2 — DROP (by explicit name)

```sql
DROP TABLE rg_requesters;    -- OK
DROP TABLE rg_requests;      -- OK
DROP TABLE rg_messages;      -- OK
DROP TABLE rg_attachments;   -- OK
DROP TABLE rg_sessions;      -- OK
DROP TABLE rg_email_routing; -- OK
```

Post-drop verify:
```
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'rg\_%' ESCAPE '\';
→ (empty result set)
```
[VERIFIED — all 6 tables gone]

## Step 3 — Schema-Init Removal (localDatabase.ts initDatabase())

Removed the entire `// ============ RG Cares Information Request Tables ============` block containing:

| Block | Content |
|-------|---------|
| rg_requesters | CREATE TABLE (6 cols) + CREATE UNIQUE INDEX idx_rg_requester_email |
| rg_requests | CREATE TABLE (11 cols) + 3× CREATE INDEX (status, deadline, requester) |
| rg_messages | CREATE TABLE (6 cols) + CREATE INDEX idx_rg_message_request |
| rg_attachments | CREATE TABLE (7 cols) + CREATE INDEX idx_rg_attachment_message |
| rg_email_routing | CREATE TABLE (5 cols) + CREATE INDEX idx_rg_routing_category |
| rg_sessions | CREATE TABLE (4 cols) + CREATE INDEX idx_rg_session_expires |

Total: 6 CREATE TABLE + 8 CREATE INDEX statements (~88 lines including comments). [VERIFIED — grep for any rg_ table name in the initDatabase region returns zero]

## Step 4 — Dead RG Export Removal

### localDatabase.ts — RG functions block removed (lines 2985–3434, ~450 lines)

| Name | Callers | Action |
|------|---------|--------|
| hashPin | 0 | REMOVE [VERIFIED] |
| verifyPin | 0 | REMOVE [VERIFIED] |
| createRGRequester | 0 | REMOVE [VERIFIED] |
| getRGRequesterById | 0 | REMOVE [VERIFIED] |
| getRGRequesterByEmail | 0 | REMOVE [VERIFIED] |
| getAllRGRequesters | 0 | REMOVE [VERIFIED] |
| updateRGRequester | 0 | REMOVE [VERIFIED] |
| resetRGRequesterPin | 0 | REMOVE [VERIFIED] |
| rowToRGRequester | 0 (internal) | REMOVE [VERIFIED] |
| createRGSession | 0 | REMOVE [VERIFIED] |
| deleteExpiredRGSessions | 0 | REMOVE [VERIFIED] |
| validateRGSession | 0 | REMOVE [VERIFIED] |
| deleteRGSession | 0 | REMOVE [VERIFIED] |
| createRGRequest | 0 | REMOVE [VERIFIED] |
| getRGRequestById | 0 | REMOVE [VERIFIED] |
| getAllRGRequests | 0 | REMOVE [VERIFIED] |
| getStaffRGRequests | 0 | REMOVE [VERIFIED] |
| updateRGRequestStatus | 0 | REMOVE [VERIFIED] |
| assignRGRequest | 0 | REMOVE [VERIFIED] |
| markRGRequestReminderSent | 0 | REMOVE [VERIFIED] |
| getRequestsDueForReminder | 0 | REMOVE [VERIFIED] |
| rowToRGRequest | 0 (internal) | REMOVE [VERIFIED] |
| addRGMessage | 0 | REMOVE [VERIFIED] |
| getRGMessageById | 0 | REMOVE [VERIFIED] |
| getRGMessagesByRequestId | 0 | REMOVE [VERIFIED] |
| rowToRGMessage | 0 (internal) | REMOVE [VERIFIED] |
| addRGAttachment | 0 | REMOVE [VERIFIED] |
| getRGAttachmentById | 0 | REMOVE [VERIFIED] |
| getRGAttachmentsByMessageId | 0 | REMOVE [VERIFIED] |
| rowToRGAttachment | 0 (internal) | REMOVE [VERIFIED] |
| getRGEmailRoutingForCategory | 0 | REMOVE [VERIFIED] |
| getAllRGEmailRouting | 0 | REMOVE [VERIFIED] |
| addRGEmailRouting | 0 | REMOVE [VERIFIED] |
| rowToRGEmailRouting | 0 (internal) | REMOVE [VERIFIED] |
| seedRGTestData | 0 | REMOVE [VERIFIED] |

Also removed: `import { createHash } from 'crypto'` (only caller was hashPin) and 10 RG type names from the types.js import line. [VERIFIED]

### types.ts — RG type block removed (~76 lines)

| Name | Callers | Action |
|------|---------|--------|
| RGRequestStatus | 0 | REMOVE [VERIFIED] |
| RGRequestPriority | 0 | REMOVE [VERIFIED] |
| RGRequestCategory | 0 | REMOVE [VERIFIED] |
| RGSenderType | 0 | REMOVE [VERIFIED] |
| RGRequester | 0 | REMOVE [VERIFIED] |
| RGRequest | 0 | REMOVE [VERIFIED] |
| RGMessage | 0 | REMOVE [VERIFIED] |
| RGAttachment | 0 | REMOVE [VERIFIED] |
| RGEmailRouting | 0 | REMOVE [VERIFIED] |
| RGLoginResponse | 0 | REMOVE [VERIFIED] |
| RGRequestWithUrgency | 0 | REMOVE [VERIFIED] |
| **IntakeStatus** | **1** (server.ts intake route) | **KEEP** [VERIFIED] |

### emailService.ts — 5 RG email functions removed (~344 lines)

| Name | Callers | Action |
|------|---------|--------|
| sendRGNewRequestEmail | 0 | REMOVE [VERIFIED] |
| sendRGDeadlineReminderEmail | 0 | REMOVE [VERIFIED] |
| sendRGStaffResponseEmail | 0 | REMOVE [VERIFIED] |
| sendRGResolvedEmail | 0 | REMOVE [VERIFIED] |
| sendRGFollowUpEmail | 0 | REMOVE [VERIFIED] |

Post-removal: zero `RG` or `rg_` references remain in emailService.ts. [VERIFIED]

## Step 5 — Build + Restart

- `tsc`: exit 0, zero errors [VERIFIED]
- `systemctl restart shelter-app`: active (running) [VERIFIED]

## Verification

### Durability proof — post-restart table check

```
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'rg\_%' ESCAPE '\';
→ (empty result set)
```

**Tables did NOT come back after restart.** The CREATE-init removal held. This is the durability proof. [VERIFIED]

### Non-RG tables untouched

| Table | Row count | Status |
|-------|-----------|--------|
| volunteers | 448 | ✅ unchanged |
| dashboard_events | 20 | ✅ unchanged |
| dashboard_stories | 11 | ✅ unchanged |
| animal_media | 2120 | ✅ unchanged |
| adoption_applications | 11 | ✅ unchanged |

[VERIFIED]

### File sizes

| File | Lines removed |
|------|--------------|
| localDatabase.ts | ~540 (schema-init + functions + imports) |
| types.ts | ~76 (RG type block) |
| emailService.ts | ~344 (5 email functions + section header) |

## RG Removal Complete — Full Tally

| Pass | What | Commit |
|------|------|--------|
| A | Staff routes (/api/rg/staff/*) | 5de3702 |
| B-1 | Dashboard RGC UI (1,069 lines) | b233bf0 |
| B-2 | PIN code + modal HTML (68 lines) | e5645d5 |
| C | Portal routes + HTML + helpers (1,663 lines) | e35edca |
| D | Tables + schema-init + dead exports (~960 lines) | this commit |

**RG Cares is fully removed from the codebase and database.** Only cosmetic remnant: Caddy path matchers still list `/rg-portal` (harmless, separate cleanup).
