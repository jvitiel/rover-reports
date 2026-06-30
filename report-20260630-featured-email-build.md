# Featured Six Weekly Email — Build Report

**Date:** 2026-06-30 21:55 UTC  
**Commit:** `7651e56` — "Featured Six weekly staff email: state-anchored edition counter + DST-safe Wednesday scheduler + recipient array (Auditor-reviewed)"

---

## Precheck

- Process count: **1** (single `dist/server.js` process, PID 143384)
- Backup: `/home/shelter/backups/pre-featured-email-20260630-215146.db` (32MB) ✓

---

## Changes Applied

### CHANGE 1 — emailService.ts
- **FEATURED_TO_EMAILS** constant added (line 32): `['Martha.underwood17@gmail.com', 'flgnynjai@gmail.com']`
- **sendFeaturedRotationEmail** signature widened: `recipient: string` → `recipients: string[]`; `to: recipients` in Resend call; return type includes `error?: string`
- **test-four-editions** caller updated: hardcoded recipient wrapped as `['flgnynjai@gmail.com']`

### CHANGE 2 — localDatabase.ts (state table)
- `featured_rotation_state` table created with `CHECK (id = 1)` singleton constraint
- Seed row: `anchor_instant='2026-07-08T20:00:00Z'`, `last_sent_edition=NULL`, `last_sent_at=NULL`

### CHANGE 3 — server.ts (runWeeklyFeaturedEmail)
- Reads state row, computes `currentEdition = floor((now - anchor) / 7 days)`
- Before-anchor guard: logs and returns
- Idempotency guard: `last_sent_edition >= currentEdition` → skip
- Sends to `FEATURED_TO_EMAILS` via widened `sendFeaturedRotationEmail`
- Stamps `last_sent_edition` + `last_sent_at` ONLY on success (atomic conditional UPDATE)
- Stamps `last_featured_at` on the 6 featured animals in queue
- Failed send → does NOT stamp → retry next fire

### CHANGE 4 — server.ts (scheduleWeeklyFeaturedEmail)
- DST-safe Pattern B: `toLocaleString('en-US', { timeZone: 'America/New_York' })` for real ET wall-clock
- `msUntilNextWed4pmET()` computes ms to next Wednesday 16:00 ET (handles Wed-past-4pm → next Wed)
- Recursive `setTimeout` in `finally` block (survives throws)
- Registered at startup after `scheduleDailySearcherSnapshot()`
- `FEATURED_TO_EMAILS` imported from emailService

---

## Build + Restart

- `npm run build`: clean (tsc exit 0, no warnings)
- `systemctl restart shelter-app`: active ✓
- Journal confirms: `[Featured Email] Scheduler armed`, next fire `2026-07-01T20:00:00Z` (22.1h — this will no-op, before Jul 8 anchor)
- State table confirmed: `1|2026-07-08T20:00:00Z||` (NULL/NULL)
- DB ownership: `shelter:shelter` ✓

---

## Manual Test Results

### Test 1 — Edition 0 Send
- **Endpoint:** `POST /api/dashboard/featured-rotation/test-edition-zero`
- **Result:** `success: true`, `skipped: false`
- **Recipients:** `['Martha.underwood17@gmail.com', 'flgnynjai@gmail.com']` — ONE email to BOTH recipients (single Resend API call)
- **Resend ID:** `19ac839a-38d9-47fe-b48e-17aeb7a25e2e`
- **Animals:** `currentSix` is empty for edition 0 (expected — edition 0 is the pre-rotation baseline; the email template renders "Coming Next Week" as the primary section)
- **State after:** `last_sent_edition=0`, `last_sent_at=2026-06-30T21:54:44.077Z` ✓

### Test 2 — Idempotency Skip
- **Same endpoint, second invocation**
- **Result:** `success: true`, `skipped: true`, `reason: "edition 0 already sent (last_sent_edition=0)"`
- **No email sent** ✓ — idempotency proven

### Cleanup
- **Temp endpoint removed:** `test-edition-zero` deleted from source, grep confirms 0 matches
- **Rebuilt + restarted** after removal — clean build, service active
- **State reset:** `UPDATE featured_rotation_state SET last_sent_edition = NULL, last_sent_at = NULL WHERE id = 1`
- **Confirmed:** `1|2026-07-08T20:00:00Z||` (NULL/NULL) — Jul 8 edition-0 send will NOT be blocked ✓

---

## Commit

```
7651e56 Featured Six weekly staff email: state-anchored edition counter + DST-safe Wednesday scheduler + recipient array (Auditor-reviewed)
 3 files changed, 128 insertions(+), 9 deletions(-)
 - server/src/emailService.ts   (13 +/-)
 - server/src/localDatabase.ts  (11 +)
 - server/src/server.ts         (113 +/-)
```

Named paths only (no `git add -A`). State row is data, not committed.

---

## Status: AWAITING AUDITOR CONFIRMATION

The scheduler is armed for Jul 8 (Wednesday 4pm ET = 2026-07-08T20:00:00Z). It will fire edition 0 at that time. No real edition has been sent yet (test email was edition 0, state was reset to NULL).

**Before Jul 8:** John should relay this report to the Auditor for final confirmation. The feature is NOT live-blessed until Auditor confirms.
