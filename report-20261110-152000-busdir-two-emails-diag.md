# Business-Director Recipient — Two Automated Emails Diagnosis

**Date:** 2026-11-10 (read-only diagnosis)

---

## EMAIL 1 — Weekly Website Update (Featured Six)

### Recipient list

**Constant:** `FEATURED_TO_EMAILS`
**Definition:** `emailService.ts:32`
**Contents (2 addresses):**

| # | Address (masked) |
|---|-----------------|
| 1 | M•••@gmail.com |
| 2 | f•••@gmail.com |

[VERIFIED — emailService.ts:32]

### Send site

**Function:** `sendFeaturedRotationEmail()` — `emailService.ts:1126`
**Called from:** `runWeeklyFeaturedEmail()` — `server.ts:13336`
**`to:` reference:** `FEATURED_TO_EMAILS` passed as `recipients` parameter at `server.ts:13336`

[VERIFIED — server.ts:13336 → emailService.ts:1126]

### Trigger

**Scheduler:** `scheduleWeeklyFeaturedEmail()` — `server.ts:13394`
**Schedule:** Every Wednesday at 4:00 PM ET (DST-safe via `msUntilNextWed4pmET()` at `server.ts:13363`)
**Arms on startup:** `server.ts:13407` — `scheduleWeeklyFeaturedEmail()`

### Recipient type

Hardcoded exported array in `emailService.ts:32`. Not from config/env/DB.

### businessdirector check

- `b•••@4lg.org` — **NOT present**
- `busdir@4lg.org` — **NOT present**

Neither spelling appears in `FEATURED_TO_EMAILS`.

---

## EMAIL 2 — New Adoptable Animals Need Dashboard Confirmation

### Recipient list

**Constant:** `ADOPTABLE_ALERT_RECIPIENTS`
**Definition:** `server.ts:677`
**Contents (2 addresses):**

| # | Address (masked) |
|---|-----------------|
| 1 | f•••@gmail.com |
| 2 | M•••@gmail.com |

[VERIFIED — server.ts:677]

### Send site

**Function:** `sendAdoptableAlertEmail()` — `emailService.ts:1088`
**Called from:** `runAdoptableStatusCheck()` — `server.ts:12744`
**`to:` reference:** `ADOPTABLE_ALERT_RECIPIENTS` passed as `recipients` parameter at `server.ts:12744`

[VERIFIED — server.ts:12744 → emailService.ts:1088]

### Trigger

**Scheduler:** `scheduleDailyAdoptableCheck()` — `server.ts:12797`
**Schedule:** Daily at 9:00 AM ET (via `msUntilNextEastern(9, 0)`)
**Manual trigger also available:** `POST /api/dashboard/adoptable-alert/run` — `server.ts:12819`

### Recipient type

Hardcoded array in `server.ts:677`. Not from config/env/DB.

### businessdirector check

- `b•••@4lg.org` — **NOT present**
- `busdir@4lg.org` — **NOT present**

Neither spelling appears in `ADOPTABLE_ALERT_RECIPIENTS`.

---

## Cross-check: Distinct from ADOPTION_TO_EMAILS / VOLUNTEER_TO_EMAILS

| Constant | File:Line | Count | Has b•••@4lg.org? |
|----------|-----------|-------|-------------------|
| `ADOPTION_TO_EMAILS` | emailService.ts:30 | 5 | **YES** |
| `VOLUNTEER_TO_EMAILS` | emailService.ts:31 | 4 | **YES** |
| `FEATURED_TO_EMAILS` | emailService.ts:32 | 2 | No |
| `ADOPTABLE_ALERT_RECIPIENTS` | server.ts:677 | 2 | No |

**All four lists are distinct variables.** `FEATURED_TO_EMAILS` and `ADOPTABLE_ALERT_RECIPIENTS` do NOT reuse `ADOPTION_TO_EMAILS` or `VOLUNTEER_TO_EMAILS`. Modifying either target list will not affect adoption/volunteer emails.

Note: `ADOPTABLE_ALERT_RECIPIENTS` lives in `server.ts`, not `emailService.ts` — different file from the other three.

---

## Deploy path

**Unchanged:** `tsc` → `dist/`, `node dist/server.js`, `systemctl restart shelter-app`
[VERIFIED — server/package.json scripts.build = "tsc", scripts.start = "node dist/server.js"]

---

*Read-only diagnosis. No changes made.*
