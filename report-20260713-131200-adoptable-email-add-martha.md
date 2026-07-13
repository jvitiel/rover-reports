# Adoptable Alert — Add Martha as Second Recipient

**Date:** 2026-07-13 13:12 ET (17:12 UTC)
**Commit:** 6e8011c
**Files changed:** server/src/server.ts, server/src/emailService.ts

---

## Changes Made

### 1. Constant (server.ts:736)
```typescript
// BEFORE:
const ADOPTABLE_ALERT_RECIPIENT = 'flgnynjai@gmail.com';

// AFTER:
const ADOPTABLE_ALERT_RECIPIENTS = ['flgnynjai@gmail.com', 'Martha.underwood17@gmail.com'];
```

### 2. Return type (server.ts:12747)
```typescript
// BEFORE:
  recipient: string;

// AFTER:
  recipients: string[];
```

### 3. Cold-start return (server.ts:12773)
```typescript
// BEFORE:
return { ..., recipient: ADOPTABLE_ALERT_RECIPIENT };

// AFTER:
return { ..., recipients: ADOPTABLE_ALERT_RECIPIENTS };
```

### 4. Call site (server.ts:12787)
```typescript
// BEFORE:
emailSent = await sendAdoptableAlertEmail(payload, ADOPTABLE_ALERT_RECIPIENT);

// AFTER:
emailSent = await sendAdoptableAlertEmail(payload, ADOPTABLE_ALERT_RECIPIENTS);
```

### 5. Main return (server.ts:12828)
```typescript
// BEFORE:
recipient: ADOPTABLE_ALERT_RECIPIENT,

// AFTER:
recipients: ADOPTABLE_ALERT_RECIPIENTS,
```

### 6. Function signature + send call (emailService.ts:1056–1078)
```typescript
// BEFORE:
export async function sendAdoptableAlertEmail(
  animals: { name: string; shelterCode: string }[],
  recipient: string
): Promise<boolean> {
  // ...
  to: [recipient],
  // ...
  console.log(`[Email] Adoptable alert sent to ${recipient} for ...`);

// AFTER:
export async function sendAdoptableAlertEmail(
  animals: { name: string; shelterCode: string }[],
  recipients: string[]
): Promise<boolean> {
  // ...
  to: recipients,
  // ...
  console.log(`[Email] Adoptable alert sent to ${recipients.join(', ')} for ...`);
```

---

## Verification

### 1. tsc clean + build + restart [VERIFIED]
- `npx tsc --noEmit` — exit 0, zero errors
- `npm run build` — exit 0
- `sudo systemctl restart shelter-app` — service active

### 2. Changed lines [VERIFIED]
All 6 edit points confirmed via sed/grep (see output above).

### 3. Old constant name fully removed [VERIFIED]
```
$ grep -rn "ADOPTABLE_ALERT_RECIPIENT[^S]" server/src/ --include="*.ts"
(no output — zero matches)
```
No stale references to the old singular name remain anywhere in the source.

### 4. Recipient proof (static trace, no live send) [VERIFIED]
Value flow without triggering a real email:
1. `ADOPTABLE_ALERT_RECIPIENTS` = `['flgnynjai@gmail.com', 'Martha.underwood17@gmail.com']` (server.ts:736)
2. Passed directly to `sendAdoptableAlertEmail(payload, ADOPTABLE_ALERT_RECIPIENTS)` (server.ts:12787)
3. Function receives as `recipients: string[]` (emailService.ts:1058)
4. Passed directly to `to: recipients` in `getResend().emails.send()` (emailService.ts:1072)

No transformation, no filtering between the constant and Resend's `to:` field. Both addresses will receive every adoptable alert email. No live alert was sent to Martha during this verification.

### 5. Other email lists unchanged [VERIFIED]
```
ADOPTION_TO_EMAILS = ['adopt@4lg.org', 'gentlesouls@aol.com', 'flgnynjai@gmail.com', 'info@4lg.org']
VOLUNTEER_TO_EMAILS = ['volunteer@4lg.org', 'flgnynjai@gmail.com']
FEATURED_TO_EMAILS = ['Martha.underwood17@gmail.com', 'flgnynjai@gmail.com']
```
All three lists identical to pre-change values. Test endpoint (server.ts:13154) still uses its own hardcoded `['flgnynjai@gmail.com']`.

### 6. Blast radius [VERIFIED]
```
$ grep -rn "ADOPTABLE_ALERT_RECIPIENTS" server/src/ --include="*.ts"
server.ts:736    — definition
server.ts:12773  — cold-start return
server.ts:12787  — call site
server.ts:12828  — main return
```
Used ONLY by the adoptable alert path. No other email, endpoint, or function references this constant.

---

## Summary

Martha.underwood17@gmail.com is now a `to:` recipient alongside flgnynjai@gmail.com on the daily "New adoptable animals need dashboard confirmation" email. No other emails affected. The next time newly-adoptable animals are detected (daily 9:00 AM ET check), both recipients will receive the alert.
