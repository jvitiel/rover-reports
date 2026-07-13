# Adoptable Alert Email — Recipient Configuration Diagnosis

**Date:** 2026-07-13 13:03 ET (17:03 UTC)
**Type:** Read-only diagnosis
**Goal:** Understand how the adoptable-alert email is sent and how to add Martha.underwood17@gmail.com

---

## 1. The Email — Trigger & Send Path

**Trigger:** Daily scheduler at **9:00 AM ET** via `scheduleDailyAdoptableCheck()` (server.ts:12832–12856). Uses `setTimeout` + `setInterval` (same pattern as the generic-bio job). Also callable manually via `POST /api/dashboard/adoptable-alert/run` (rate-limited: 5/hr).

**Function chain:**
- `scheduleDailyAdoptableCheck()` → `runAdoptableStatusCheck()` (server.ts:12742)
- Fetches all animals from SM API, compares against `adoptable_status_snapshot` table
- Identifies animals newly flipped to `isAvailable === true` (was_adoptable was 0 or absent)
- Calls `sendAdoptableAlertEmail(payload, ADOPTABLE_ALERT_RECIPIENT)` (server.ts:12787)

**Send call** (emailService.ts:1071–1078): [VERIFIED]
```typescript
const { data, error } = await getResend().emails.send({
  from: FROM_EMAIL,       // 'No-Reply@4lg.org'
  to: [recipient],        // wraps the single string in an array
  subject: 'New adoptable animals need dashboard confirmation',
  text: textBody,
});
```

Note: the function signature takes `recipient: string` (singular), not an array. The caller passes `ADOPTABLE_ALERT_RECIPIENT`. [VERIFIED]

---

## 2. Recipient Config — Where flgnynjai@gmail.com Lives

**Mechanism:** Hardcoded constant in server.ts, line 736. [VERIFIED]

```typescript
const ADOPTABLE_ALERT_RECIPIENT = 'flgnynjai@gmail.com';  // server.ts:736
```

This is a **single string**, not an array/list. It is NOT in secrets.json, NOT in an env var, NOT in a DB table. It's a plain `const` in the server source. [VERIFIED]

The `sendAdoptableAlertEmail` function wraps it in `[recipient]` (a one-element array) when passing to Resend's `to` field. No `cc` or `bcc` fields are set. [VERIFIED]

---

## 3. Send Mechanism

- **Provider:** Resend (via `getResend()` — reads API key from shelter-secrets.json) [VERIFIED]
- **From:** `No-Reply@4lg.org` (constant `FROM_EMAIL`, emailService.ts:29) [VERIFIED]
- **To:** `[recipient]` — single-element array [VERIFIED]
- **cc/bcc:** Not set in the send call [VERIFIED]
- **Format:** Plain text only (no HTML) [VERIFIED]

Resend's `emails.send()` API accepts `to` as a string or string array, and supports optional `cc` and `bcc` fields (also string or string[]). The current code uses none of those optional fields.

---

## 4. Blast Radius — Other Emails Using the Same Config

`ADOPTABLE_ALERT_RECIPIENT` is used ONLY by the adoptable alert. It is **completely isolated** from the other email recipient lists. [VERIFIED]

Here is the complete email recipient map:

| Email Type | Recipient Constant | Location | Recipients |
|---|---|---|---|
| **Adoptable alert** | `ADOPTABLE_ALERT_RECIPIENT` | server.ts:736 | `'flgnynjai@gmail.com'` (single string) |
| Adoption applications | `ADOPTION_TO_EMAILS` | emailService.ts:30 | `['adopt@4lg.org', 'gentlesouls@aol.com', 'flgnynjai@gmail.com', 'info@4lg.org']` |
| Volunteer applications | `VOLUNTEER_TO_EMAILS` | emailService.ts:31 | `['volunteer@4lg.org', 'flgnynjai@gmail.com']` |
| Featured rotation | `FEATURED_TO_EMAILS` | emailService.ts:32 | `['Martha.underwood17@gmail.com', 'flgnynjai@gmail.com']` |
| Test editions | hardcoded array | server.ts:13154 | `['flgnynjai@gmail.com']` (test-only endpoint) |

**Blast radius of adding Martha to ADOPTABLE_ALERT_RECIPIENT: zero.** Changing that constant affects only the adoptable alert email. No other email reads it. [VERIFIED]

Note: Martha is already a recipient on the `FEATURED_TO_EMAILS` list (emailService.ts:32), so she has a precedent as an email recipient in this system.

---

## 5. Frequency & Shape

**Frequency:** Once daily at 9:00 AM ET. Batched — all animals that became adoptable since the last run are listed in a single email. If no newly adoptable animals, no email is sent. [VERIFIED]

**Content (plain text):**
```
Subject: New adoptable animals need dashboard confirmation

The following animals are now marked as available for adoption in
ShelterManager and are publicly visible on the website:

Casper — S2026594
Ghost — S2026593
Ivory — S2026595
[... sorted alphabetically]

Please confirm that the public photos on the dashboard media tab
look good and that the generated bio is acceptable for each animal.
```

**Retry behavior:** If the email fails to send, the snapshot is NOT updated for those newly-adoptable animals, so the next run will retry them. [VERIFIED]

---

## 6. The Cleanest Add — Proposed Edit (DO NOT IMPLEMENT)

**Edit point:** server.ts, line 736.

**Method:** Convert `ADOPTABLE_ALERT_RECIPIENT` from a single string to an array, and update the one send call to pass the array directly (since Resend's `to` already accepts `string[]`).

**Specific change (2 locations):**

**Location A — server.ts:736 (the constant):**
```typescript
// BEFORE:
const ADOPTABLE_ALERT_RECIPIENT = 'flgnynjai@gmail.com';

// AFTER:
const ADOPTABLE_ALERT_RECIPIENTS = ['flgnynjai@gmail.com', 'Martha.underwood17@gmail.com'];
```

**Location B — emailService.ts:1056 (the function signature):**
```typescript
// BEFORE:
export async function sendAdoptableAlertEmail(
  animals: { name: string; shelterCode: string }[],
  recipient: string
): Promise<boolean> {
  // ...
  to: [recipient],

// AFTER:
export async function sendAdoptableAlertEmail(
  animals: { name: string; shelterCode: string }[],
  recipients: string[]
): Promise<boolean> {
  // ...
  to: recipients,
```

**Location C — server.ts:12787 (the call site):**
```typescript
// BEFORE:
emailSent = await sendAdoptableAlertEmail(payload, ADOPTABLE_ALERT_RECIPIENT);

// AFTER:
emailSent = await sendAdoptableAlertEmail(payload, ADOPTABLE_ALERT_RECIPIENTS);
```

Also update the two `recipient: ADOPTABLE_ALERT_RECIPIENT` references in the return objects (server.ts:12773, 12828) to use the new name.

**Alternative (simpler, 1-line change):** Keep the function signature as-is, just change line 736 and wrap both emails in the `to: [recipient]` array. But this is misleading (a constant named `RECIPIENT` singular holding an array via `to: [r1, r2]` built inline). The rename approach above is cleaner.

**Why `to` not `cc`/`bcc`:** Both recipients are primary stakeholders who need the alert for action. `cc` would work but `to` with two recipients is the simplest and matches how the other email lists work (ADOPTION_TO_EMAILS, FEATURED_TO_EMAILS are all `to` arrays). [INFERRED — John should confirm preference]

**Total blast radius:** Zero. Only the adoptable alert is affected.
