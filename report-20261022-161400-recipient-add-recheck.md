# Re-verify Adoption + Volunteer Alert Recipient Arrays

**Date:** 2026-10-22  
**Purpose:** Pre-edit verification before adding b•••@4lg.org to both arrays  

---

## 1. ADOPTION_TO_EMAILS

**Location:** `/home/shelter/shelter-apps/server/src/emailService.ts` line 30 [VERIFIED line:30]

```
const ADOPTION_TO_EMAILS = ['a•••@4lg.org', 'g•••@aol.com', 'f•••@gmail.com', 'a•••@gmail.com'];
```

**Count:** 4 addresses [VERIFIED line:30]

**Send-call reference:** line 156 — `to: ADOPTION_TO_EMAILS` inside the adoption-application-submission email (PDF-attached staff alert) [VERIFIED line:156]

---

## 2. VOLUNTEER_TO_EMAILS

**Location:** `/home/shelter/shelter-apps/server/src/emailService.ts` line 31 [VERIFIED line:31]

```
const VOLUNTEER_TO_EMAILS = ['v•••@4lg.org', 'f•••@gmail.com', 'g•••@aol.com'];
```

**Count:** 3 addresses [VERIFIED line:31]

**Send-call reference:** line 899 — `to: VOLUNTEER_TO_EMAILS` inside the volunteer reviewer alert email [VERIFIED line:899]

---

## 3. No Duplicate

`b•••@4lg.org` is **NOT** present in either array. grep for `businessdirector` returned no matches in emailService.ts. [VERIFIED]

---

## 4. Deploy Path Unchanged

- `package.json` scripts: `"build": "tsc"`, `"start": "node dist/server.js"` [VERIFIED]
- systemd unit ExecStart: `/usr/bin/node dist/server.js` [VERIFIED]
- Build path: tsc → dist, running unit: shelter-app executing node dist/server.js — unchanged.

---

## 5. Refactor Check

Neither array has moved out of emailService.ts. Both remain top-level `const` declarations (lines 30–31). No env-var or config-driven refactor. The send paths are unchanged since the last edits (adoption: c70cd36, volunteer: 2d255bf). No structural changes to the email dispatch flow.
