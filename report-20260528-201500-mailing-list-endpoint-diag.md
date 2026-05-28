# Mailing List Endpoint — Pre-Implementation Diagnostic

**Date:** 2026-05-28 16:15 ET  
**Type:** Read-only code inspection  
**Purpose:** Map existing public POST endpoint patterns before scoping POST /api/subscribe

---

## 1. Existing Public Form Endpoints

### Contact Form: `POST /api/contact` (server.ts:11146)

```typescript
app.post('/api/contact', contactFormLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, category, subject, message, website_url } = req.body || {};

    // Honeypot: if filled, silently succeed
    if (website_url && String(website_url).trim() !== '') {
      console.log('[Contact] Honeypot triggered, silent skip');
      res.json({ ok: true });
      return;
    }

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100) {
      res.status(400).json({ ok: false, error: 'Name is required (1-100 characters)' });
      return;
    }

    // Validate email
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ ok: false, error: 'A valid email address is required' });
      return;
    }

    // Validate category
    if (!category || !VALID_CONTACT_CATEGORIES.includes(category)) {
      res.status(400).json({ ok: false, error: `Category must be one of: ${VALID_CONTACT_CATEGORIES.join(', ')}` });
      return;
    }

    // Validate subject
    if (!subject || typeof subject !== 'string' || subject.trim().length < 1 || subject.trim().length > 150) {
      res.status(400).json({ ok: false, error: 'Subject is required (1-150 characters)' });
      return;
    }

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length < 1 || message.trim().length > 5000) {
      res.status(400).json({ ok: false, error: 'Message is required (1-5000 characters)' });
      return;
    }

    const sent = await sendContactFormEmail(
      name.trim(), email.trim(), category, subject.trim(), message.trim()
    );

    if (!sent) {
      res.status(500).json({ ok: false, error: 'Failed to send message. Please try again later.' });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});
```

### Volunteer Form: `POST /api/volunteers` (server.ts:7967)

Much more complex — 130+ lines handling:
- Paper OCR, manual entry, AND web_form submission sources
- Spanish→English translation pipeline
- File directory processing from tempId
- Database INSERT via `insertVolunteer()`
- Two fire-and-forget emails (reviewer + applicant confirmation)
- Availability normalization and validation

Response shape: `{ success: true, data: { id } }` or `{ success: false, error: "..." }`

---

## 2. Resend Notification Wiring

### Client initialization (emailService.ts:1–27)

```typescript
import { Resend } from 'resend';
const SECRETS_PATH = process.env.SECRETS_PATH || '/home/shelter/.config/shelter-secrets.json';
let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const secrets = JSON.parse(readFileSync(SECRETS_PATH, 'utf-8'));
    resend = new Resend(secrets.resend.apiKey);
  }
  return resend;
}

const FROM_EMAIL = 'No-Reply@4lg.org';
const TO_EMAIL = 'flgnynjai@gmail.com';
```

**API key source:** `shelter-secrets.json` → `resend.apiKey`. Lazy-loaded singleton.

### Contact form email (emailService.ts:1333–1408)

```typescript
export async function sendContactFormEmail(name, email, category, subject, message): Promise<boolean> {
  const route = CONTACT_ROUTING[category]; // Maps category to { email, label }
  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,                           // 'No-Reply@4lg.org'
    to: [route.email],                          // Category-specific (e.g., info@4lg.org)
    replyTo: `${name} <${email}>`,
    subject: `[Four Legs Good Contact / ${route.label}] ${subject}`,
    text: textBody,                             // Plain text only, no HTML
  });
  return !error;
}
```

### Volunteer reviewer email (emailService.ts:~1160–1225)

```typescript
const { data, error } = await getResend().emails.send({
  from: FROM_EMAIL,         // 'No-Reply@4lg.org'
  to: [TO_EMAIL],           // 'flgnynjai@gmail.com'
  subject: `New Volunteer Application: ${vol.full_name}`,
  html: htmlBody,           // Rich HTML email
  text: textBody,
});
```

### Pattern summary
- No shared `sendEmail()` helper — each email function calls `getResend().emails.send()` inline
- Contact form: text-only, routed to category-specific addresses
- Volunteer: HTML + text, hardcoded to TO_EMAIL (flgnynjai@gmail.com)
- Both return `boolean` (true = sent, false = error)

---

## 3. Validation Pattern

### Email validation
Hand-rolled regex in each handler:
```javascript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```
No library (no validator.js, no zod). Inline checks.

### Honeypot
Contact form: field named `website_url`. If non-empty, silently returns `{ ok: true }`.
Volunteer form: no honeypot (it's behind a multi-step form with file uploads).

### Schema source of truth
None. Both handlers do inline validation with `typeof` checks, `.trim()`, and length limits. No zod schemas, no types.ts interfaces for the request body. The `types.ts` file defines `ShelterSecrets` and `AdoptionApplication` but not contact or volunteer request shapes.

---

## 4. Rate Limiting

All limiters defined at server.ts:666–745. Common handler:
```typescript
const rateLimitHandler = (req, res, _next, _options) => {
  log.warn('rate-limit', ...);
  res.status(429).json({ success: false, error: 'Too many requests. Please try again shortly.' });
};
```

| Endpoint | Limiter | Window | Max | Scope |
|----------|---------|--------|-----|-------|
| `/api/contact` | `contactFormLimiter` | 1 hour | 3 | Per IP |
| `/api/volunteers` | `volunteerWebFormLimiter` | 1 hour | 3 | Per IP, only when `submissionSource === 'web_form'` |
| `/api/adoption` | `adoptionLimiter` | 1 hour | 3 | Per IP |
| Global | `globalLimiter` | 15 min | 2000 | Per IP |

All use `express-rate-limit`, all hardcoded values (not from config/env). All per-IP via `req.ip` (trust proxy enabled at line 341).

---

## 5. CORS Configuration

Global middleware (server.ts:752–772):
```typescript
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);   // Allow server-to-server
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(null, false);                       // Block unknown origins
  },
  credentials: true,
}));
```

### ALLOWED_ORIGINS (server.ts:644–664)
```typescript
const ALLOWED_ORIGINS = [
  // PWA subdomains (10 entries)
  'https://dashboard.4lgshelterapp.duckdns.org',
  'https://staff.4lgshelterapp.duckdns.org',
  // ... 8 more duckdns subdomains ...
  // WordPress staging and production
  'https://johnv80.sg-host.com',
  'https://fourlegsgoodnynj.org',
  'https://www.fourlegsgoodnynj.org',
  'https://api.fourlegsgoodnynj.org',
  // Local dev
  'http://localhost:3000',
  'http://localhost:5500',
];
```

**Both WP staging and production origins are already allowlisted.** No CORS changes needed for the new endpoint.

### Preflight handling
- `/api/contact`: relies on the global `cors()` middleware (no explicit OPTIONS handler)
- `/api/volunteers`: has an explicit `app.options('/api/volunteers', ...)` handler at line 8100 that redundantly sets headers (the global middleware already handles it)

---

## 6. Response Shapes

### Contact form (`/api/contact`)
```
Success:  200 { ok: true }
Honeypot: 200 { ok: true }                                    (silent success)
Bad input:400 { ok: false, error: "<specific message>" }
Send fail:500 { ok: false, error: "Failed to send message..." }
Catch:    500 { ok: false, error: "Internal server error" }
Rate limit:429 { success: false, error: "Too many requests..." }
```

### Volunteer form (`/api/volunteers`)
```
Success:  200 { success: true, data: { id: <number> } }
Bad input:400 { success: false, error: "<specific message>" }
Catch:    500 { success: false, error: "Failed to save volunteer" }
Rate limit:429 { success: false, error: "Too many requests..." }
```

**KEY DIVERGENCE:** Contact form uses `ok` as the boolean key. Volunteer form uses `success`. The rate limiter uses `success`. This is an inconsistency in the codebase.

---

## 7. Divergences Between Handlers

| Aspect | Contact Form | Volunteer Form |
|--------|-------------|----------------|
| **Complexity** | ~40 lines, single-purpose | ~130 lines, multi-source |
| **Response key** | `ok` | `success` |
| **Honeypot** | Yes (`website_url`) | No |
| **DB storage** | None (email-only) | Yes (SQLite INSERT) |
| **Email approach** | Dedicated `sendContactFormEmail()` | Two separate calls (reviewer + applicant) |
| **Rate limiter** | Always applied | Conditional (web_form only) |
| **Email format** | Text-only | HTML + text |
| **Validation** | Inline, same pattern | Inline, more complex |

**The contact form is the better template.** It's simpler, closer to the mailing-list use case (no DB, email-notification-only, public-facing, honeypot), and has the cleaner structure. The volunteer form is heavily overloaded with multi-source logic that doesn't apply.

---

## 8. Preliminary Reads

### 8a. Route name

**Recommendation: `/api/subscribe`**

Reasoning:
- `/api/contact` and `/api/volunteers` use short, verb-or-noun names. `/api/subscribe` fits the convention.
- `/api/mailing-list` uses a hyphenated compound noun — no existing endpoint follows that pattern.
- `/api/newsletter` implies a newsletter product that doesn't exist yet — `subscribe` is more generic and accurate.

### 8b. Placement

Immediately before `POST /api/contact` (currently at line 11143). Both are public website form endpoints. Group them together with a section comment.

### 8c. Schema

No new zod schema needed. The existing convention is inline validation in the handler. The request body is trivial: `{ email: string, lang?: string, website_url?: string }`. Inline validation matches the contact form pattern exactly.

### 8d. Other considerations

1. **Response key:** Use `ok` (matching `/api/contact`, the closer pattern) not `success`. The WP JS that will call this endpoint should be told which key to check.

2. **Email function:** Add a `sendSubscribeNotificationEmail()` to emailService.ts. Pattern: text-only (like contact), to `flgnynjai@gmail.com` (TO_EMAIL), subject like `[Four Legs Good] New Mailing List Subscriber`. Include the email address and lang preference.

3. **No DB storage specified** — the prompt says email notification only. If persistence is wanted later, a `mailing_list_subscribers` table would be straightforward but is out of scope here.

4. **Rate limiter:** Create a dedicated `subscribeLimiter` (same shape as `contactFormLimiter`: 3/hour/IP). Prevents spray-subscribing.

5. **Honeypot field:** Mirror contact form's `website_url` field name — the WP front-end subscribe form should include a hidden `website_url` input.

6. **No OPTIONS handler needed** — the global cors middleware covers it (same as `/api/contact`).

7. **`lang` field:** Accept but don't validate beyond string type. Store/forward for staff awareness of subscriber language preference. No translation pipeline needed (unlike volunteer form).
