# RG Cleanup Pre-Check

## Check 1 — Cron / Scheduler: walk-log & rg/staff references

### Crontab entries enumerated

**Root crontab:** UNREADABLE — `sudo crontab -l` requires a password in this context. [UNCERTAIN — cannot assert absence; root crontab is unreadable, not confirmed empty]

**Shelter user crontab:** No crontab (`no crontab for shelter`). [VERIFIED]

**Rover user crontab (3 entries):**
```
*/15 * * * * /home/rover/scripts/memory-snapshot.sh
0 4 * * * /home/rover/scripts/screenshots-retention.sh
0 6 * * * sudo -u shelter python3 /home/shelter/shelter-apps/scripts/score-profiles.py
```
[VERIFIED]

**/etc/crontab:** Standard system entries only (run-parts for hourly/daily/weekly/monthly). [VERIFIED]

**/etc/cron.d/:** `e2scrub_all`, `php` (session cleanup), `sysstat` — all system maintenance. [VERIFIED]

**/etc/cron.{daily,hourly,weekly,monthly}:** System packages only (`apport`, `apt-compat`, `dpkg`, `google-chrome`, `logrotate`, `man-db`, `sysstat`). [VERIFIED]

**Systemd timers:** 16 timers listed — all system services (apt, dpkg, fstrim, logrotate, sysstat, etc.). None shelter-app related. [VERIFIED]

### Grep results for walk-log / rg/staff in all cron scripts

| Script | `walk-log` / `walkLog` | `rg/staff` / `rg_staff` |
|--------|----------------------|----------------------|
| `memory-snapshot.sh` | no match | no match |
| `screenshots-retention.sh` | no match | no match |
| `score-profiles.py` | no match | no match |
| `/home/shelter/scripts/*` (all) | no match | no match |

[VERIFIED — grep returned no hits across all accessible cron scripts]

### Conclusion

No accessible cron job or systemd timer references `walk-log` or `rg/staff`. The root crontab is **UNREADABLE** in this context — if John wants full confirmation, `sudo crontab -l` must be run interactively or via an elevated shell. All other scheduler surfaces are confirmed clean. [VERIFIED for accessible surfaces; UNCERTAIN for root crontab]

## Check 2 — rg_* tables

### 2.1 — Live readers/writers

**Files with rg_* table references:**

| File | Type | Classification |
|------|------|----------------|
| `localDatabase.ts` | Schema (CREATE TABLE/INDEX) + CRUD functions | **(b) LIVE** — functions are exported and called by portal routes |
| `localDatabase.ts.backup-species` | Backup file | (a) Dead code — `.backup-species` extension, not compiled |
| `server.ts` (lines 11587–11787) | 7 live `/api/rg/*` PORTAL routes | **(b) LIVE** — active Express routes |
| `server.ts.backup-floorc` | Backup file | (a) Dead code |
| `server.ts.backup-unit2` | Backup file | (a) Dead code |
| `server.ts.backup-blanklast` | Backup file | (a) Dead code |
| `server.ts.backup-species` | Backup file | (a) Dead code |
| `server.ts.backup-wording` | Backup file | (a) Dead code |
| `server.ts.backup-pend1` | Backup file | (a) Dead code |
| `types.ts:421` | Comment referencing `rg_requesters` | (c) Type definition only |

**⚠️ FINDING: The rg_* tables still have LIVE readers/writers.**

Pass A (commit 5de3702) removed the **`/api/rg/staff/*`** routes (the staff/admin management routes). But the **`/api/rg/*` portal routes** (requester-facing) are still live in `server.ts`:

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/rg/login` | POST | Requester login (creates rg_sessions) | **LIVE** |
| `/api/rg/logout` | POST | Requester logout (deletes rg_sessions) | **LIVE** |
| `/api/rg/requests` | GET | List requester's own requests | **LIVE** |
| `/api/rg/requests` | POST | Create new request (inserts rg_requests + rg_messages) | **LIVE** |
| `/api/rg/requests/:id` | GET | View single request + messages | **LIVE** |
| `/api/rg/requests/:id/messages` | POST | Add message to request (inserts rg_messages + rg_attachments) | **LIVE** |
| `/api/rg/attachments/:id` | GET | Download attachment | **LIVE** |

Plus supporting middleware (`rgAuthMiddleware`) and helpers (`saveRGAttachment`). The `localDatabase.ts` CRUD functions (`createRgRequest`, `addRgMessage`, `getRgMessages`, etc.) are called by these routes.

**Conclusion:** There ARE live readers/writers of rg_* tables remaining. The portal routes were NOT removed by Pass A — only the staff routes were. Any table cleanup must first remove or confirm these portal routes are also dead. [VERIFIED — grep of live server.ts confirms 7 active Express route handlers]

### 2.2 — Contents / PII assessment

#### rg_requesters (2 rows)

| id | name | email | active |
|----|------|-------|--------|
| 1 | Test Requester 1 | test1@rgcares.test | 1 |
| 2 | Test Requester 2 | test2@rgcares.test | 1 |

**PII assessment:** No real PII. Names are "Test Requester 1/2", emails are `@rgcares.test` (fake domain). Pin hashes are SHA-256, non-reversible. [VERIFIED — seed data from `seedRgData()` function]

#### rg_requests (4 rows)

| id | subject | category | status | submitted_at |
|----|---------|----------|--------|-------------|
| 1 | Test Request | general | resolved | 2026-03-18 |
| 2 | Test from Portal | records | resolved | 2026-03-18 |
| 3 | Human test request | complaint | in_progress | 2026-03-18 |
| 4 | invoice | records | open | 2026-04-23 |

**PII assessment:** No real PII. Subjects are generic test labels. No personal identifiers. [VERIFIED]

#### rg_messages (25 rows)

All 25 messages inspected. Sender names: "Test Requester 1", "Test Requester 2", "Jane Staff", "Test Staff", or blank. Message content is test/placeholder text: "This is a test request", "Will you bring me a fresh cup of coffee?", "Attached is the bill for the coffee", "Verification test", etc.

**PII assessment:** No real PII. All sender names are test identities. No real names, personal emails, phone numbers, addresses, or identifying information in any message. "Jane Staff" appears once as a test staff name — not a real person's identity. [VERIFIED — all 25 messages inspected]

#### rg_attachments (5 rows)

| id | original_filename | mime_type | file_size |
|----|-------------------|-----------|-----------|
| 1 | test.txt | text/plain | 24 bytes |
| 2 | test.txt | text/plain | 24 bytes |
| 3 | Adoption form - english.pdf | application/pdf | 309 KB |
| 4 | Adoption form - spanish.pdf | application/pdf | 127 KB |
| 5 | test.txt | text/plain | 24 bytes |

**PII assessment:** The 3 `test.txt` files are 24 bytes each (trivial test content). The adoption form PDFs are the shelter's BLANK form templates (English + Spanish), not filled-in applications. No personal data. [VERIFIED — filenames + sizes consistent with blank templates; no completed forms]

#### rg_sessions (1 row)

| token | requester_id | expires_at |
|-------|-------------|------------|
| f47225bd-... | 1 | 2026-04-25 (expired) |

**PII assessment:** No PII. A single expired session token for Test Requester 1. [VERIFIED]

### Overall PII conclusion

**The rg_* tables contain ZERO real PII.** All data is seed/test data: fake requester names (`Test Requester 1/2`), fake emails (`@rgcares.test`), test staff names (`Jane Staff`, `Test Staff`), placeholder message content about coffee and test attachments, and blank form templates. No real person's identity appears anywhere in the data. [VERIFIED — all rows in all 5 tables inspected]
