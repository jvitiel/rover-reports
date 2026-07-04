# Adoption Application Email Notification — Recipient Diagnosis

## 1. The Send Path

**Handler:** `POST /api/adoption-application` in `/home/shelter/shelter-apps/server/src/server.ts`, symbol `app.post('/api/adoption-application', ...)` [VERIFIED]

**Staff notification call:** `sendApplicationEmail(savedApp, pdfPath)` — imported from `emailService.ts` [VERIFIED]

**Applicant confirmation call:** `sendApplicantConfirmationEmail(savedApp, pdfPath)` — same file [VERIFIED]

Flow: validate → save to DB → generate PDF → call `sendApplicationEmail` (staff) → call `sendApplicantConfirmationEmail` (applicant) → respond.

## 2. Current Recipients — Staff Notification

**Definition:** Hardcoded constant at top of `/home/shelter/shelter-apps/server/src/emailService.ts`, symbol `ADOPTION_TO_EMAILS` [VERIFIED]:

```ts
const ADOPTION_TO_EMAILS = ['adopt@4lg.org', 'gentlesouls@aol.com', 'flgnynjai@gmail.com'];
```

**Current TO list (3 addresses):**
1. `adopt@4lg.org`
2. `gentlesouls@aol.com`
3. `flgnynjai@gmail.com`

**No CC, no BCC** — the Resend `.send()` call uses only `to: ADOPTION_TO_EMAILS`. [VERIFIED]

**Where defined:** Hardcoded constant in source code. Not in env vars, not in `shelter-secrets.json`, not in a DB table. [VERIFIED]

## 3. Distinct Emails

Two separate emails are sent per submission:

| Email | Function | Recipients | Purpose |
|-------|----------|------------|---------|
| Staff notification | `sendApplicationEmail()` | `ADOPTION_TO_EMAILS` (adopt@4lg.org, gentlesouls@aol.com, flgnynjai@gmail.com) | Notify staff; includes PDF attachment |
| Applicant confirmation | `sendApplicantConfirmationEmail()` | `[app.applicant_email]` — the submitter's own email address | Thank-you receipt; includes PDF copy |

The `info@4lg.org` addition targets the **staff notification** only. The applicant confirmation is a separate function with a separate recipient (the applicant themselves) and should not be touched. [VERIFIED]

## 4. Is info@4lg.org Already There?

**No.** `info@4lg.org` does not appear in `ADOPTION_TO_EMAILS`. [VERIFIED]

The `@4lg.org` address currently on the list is `adopt@4lg.org` only. `info@4lg.org` exists elsewhere in the codebase (in `CONTACT_ROUTING` for the contact form, symbol `CONTACT_ROUTING.general`) but is **not** on the adoption notification list. [VERIFIED]

No `fourlegsgood*` or other variant addresses appear in `ADOPTION_TO_EMAILS`. [VERIFIED]

## 5. Mechanism to Add

**Type:** Code edit — single-line constant change.

**File:** `/home/shelter/shelter-apps/server/src/emailService.ts`

**Symbol:** `ADOPTION_TO_EMAILS`

**Current value:**
```ts
const ADOPTION_TO_EMAILS = ['adopt@4lg.org', 'gentlesouls@aol.com', 'flgnynjai@gmail.com'];
```

**Change to:**
```ts
const ADOPTION_TO_EMAILS = ['adopt@4lg.org', 'gentlesouls@aol.com', 'flgnynjai@gmail.com', 'info@4lg.org'];
```

**Post-edit:** Requires `cd /home/shelter/shelter-apps/server && npm run build && sudo systemctl restart shelter-app` to take effect. [VERIFIED — standard shelter-app restart per Rule 5]
