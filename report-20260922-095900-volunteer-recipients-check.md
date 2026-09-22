# Volunteer Alert Recipient Path — Read-Only Verification

## 1. Constant + Contents

`VOLUNTEER_TO_EMAILS` defined at `emailService.ts:31`:

```
const VOLUNTEER_TO_EMAILS = ['v•••@4lg.org', 'f•••@gmail.com'];
```

**2 addresses** [VERIFIED from emailService.ts:31]

## 2. Send Path

`VOLUNTEER_TO_EMAILS` is used as the `to:` recipient at `emailService.ts:899` inside `sendVolunteerReviewerEmail()` (defined at line 752).

- **Subject pattern:** `New Volunteer Application: ${vol.full_name}`
- **Attachments:** None — plain HTML + text email (no PDF).
- **Distinct from adoption:** Yes. The adoption alert uses `ADOPTION_TO_EMAILS` (emailService.ts:30) via a separate `sendAdoptionReviewerEmail()` function. These are independent send calls.

## 3. All Consumers

```
emailService.ts:31  — definition (const VOLUNTEER_TO_EMAILS = [...])
emailService.ts:899 — usage (to: VOLUNTEER_TO_EMAILS)
```

**2 matches total.** No other consumers anywhere in `server/src/`.

## 4. Duplicate Check

`g•••@aol.com` appears **only** in `ADOPTION_TO_EMAILS` (emailService.ts:30). It is **not present** in the `VOLUNTEER_TO_EMAILS` array.
