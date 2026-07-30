# Adoption Application Submission Alert — Recipient Audit

## Send path confirmed

The adoption-application email with PDF attachment is sent by `sendAdoptionNotificationEmail()` in:

    /home/shelter/shelter-apps/server/src/emailService.ts

## Recipient definition

**Line 30** — hardcoded constant (no env-var indirection):

```typescript
const ADOPTION_TO_EMAILS = ['a•••@4lg.org', 'g•••@aol.com', 'f•••@gmail.com', 'i•••@4lg.org'];
```

[VERIFIED — emailService.ts:30]

## Send call

**Line 156** — the `to:` field in the Resend `.emails.send()` payload:

```typescript
to: ADOPTION_TO_EMAILS,
```

[VERIFIED — emailService.ts:156]

## Grep evidence

```
$ grep -n "ADOPTION_TO_EMAILS" /home/shelter/shelter-apps/server/src/emailService.ts
30:const ADOPTION_TO_EMAILS = ['a•••@4lg.org', 'g•••@aol.com', 'f•••@gmail.com', 'i•••@4lg.org'];
156:      to: ADOPTION_TO_EMAILS,
```

## Resolution method

The recipient list is a compile-time constant on line 30 of `emailService.ts`. It is not read from `.env`, config JSON, systemd environment, or database at runtime. The value in source is the value the running process uses (confirmed: no override mechanism exists for this constant).

## Recipients (4 addresses, masked)

| # | Address (masked) | Domain |
|---|------------------|--------|
| 1 | a•••@4lg.org | 4lg.org |
| 2 | g•••@aol.com | aol.com |
| 3 | f•••@gmail.com | gmail.com |
| 4 | i•••@4lg.org | 4lg.org |
