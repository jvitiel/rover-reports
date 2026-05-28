# POST /api/subscribe — Implementation

**Date:** 2026-05-28 16:22 ET  
**Type:** Implementation  
**Commit:** e5c92f0 on shelter-apps master

---

## Files Modified

### server/src/server.ts
- **Import:** Added `sendSubscribeNotificationEmail` to emailService import (line 84)
- **Rate limiter:** Added `subscribeLimiter` (3/hr/IP) in the rate-limiter block, matching `contactFormLimiter` pattern exactly
- **Handler:** Added `POST /api/subscribe` adjacent to `/api/contact`, with:
  - Honeypot check (`website_url`, silent success)
  - Email validation (same regex as contact form)
  - Lang validation (`en` or `es` only)
  - Resend notification via `sendSubscribeNotificationEmail()`
  - Console logging for success and error paths

### server/src/emailService.ts
- **Function:** Added `sendSubscribeNotificationEmail(email, lang)` after `sendContactFormEmail()`
- Text-only email (no HTML), sent to `TO_EMAIL` (`flgnynjai@gmail.com`) from `FROM_EMAIL` (`No-Reply@4lg.org`)
- Subject: "Mailing list submission"
- Body includes email address, site language version, and timestamp
- Logging pattern matches existing functions (`console.error`/`console.log`)

---

## Response Shape

```
Success:     200 { success: true }
Honeypot:    200 { success: true }                              (silent, no email sent)
Bad email:   400 { success: false, error: "A valid email address is required" }
Bad lang:    400 { success: false, error: "lang must be \"en\" or \"es\"" }
Send fail:   500 { success: false, error: "Failed to send notification. Please try again later." }
Catch:       500 { success: false, error: "Internal server error" }
Rate limit:  429 { success: false, error: "Too many requests. Please try again shortly." }
```

---

## Test Results

| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| 1. Valid request | `{"email":"phase-test@example.com","lang":"en"}` | `{"success":true}` | `{"success":true}` | ✅ |
| 2. Invalid email | `{"email":"not-an-email","lang":"en"}` | 400 + error | `{"success":false,"error":"A valid email address is required"}` | ✅ |
| 3. Missing lang | `{"email":"phase-test@example.com"}` | 400 + error | `{"success":false,"error":"lang must be \"en\" or \"es\""}` | ✅ |
| 4. Honeypot | (rate-limited before reaching handler) | — | Rate limiter fired first (middleware > handler) | ⚠️ Code correct, untestable in same window |
| 5. Rate limit | 4th request in window | 429 | `{"success":false,"error":"Too many requests. Please try again shortly."}` HTTP 429 | ✅ |

### Email delivery
- Resend ID: `75f056e8-6a3c-4a0b-9e18-7e9b0e451915` [VERIFIED — server log]
- **Manual check needed:** John should verify the notification email arrived at flgnynjai@gmail.com for `phase-test@example.com`

### Honeypot note
The honeypot check (`website_url`) is structurally correct — it runs before validation inside the handler. However, the rate limiter is Express middleware that fires before the handler runs, so test 4 was rate-limited before reaching the honeypot code path. The honeypot will work correctly in production where rate limiting hasn't been exhausted. The code path is: middleware (rate limit) → handler (honeypot → validation → email).

---

## No changes to
- CORS / ALLOWED_ORIGINS (both WP origins already allowlisted)
- Contact form handler
- Volunteer form handler
- Any client-side files
- Any DB schema or code
