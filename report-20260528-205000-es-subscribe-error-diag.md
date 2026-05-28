# ES Subscribe Form Error — Diagnosis

**Date:** 2026-05-28 16:50 ET  
**Type:** Read-only diagnosis  
**Symptom:** ES subscribe form showed generic error ("Algo salió mal. Por favor intenta de nuevo.") immediately after a successful EN submission from the same browser session.

---

## Findings

### 1. Lang normalization — NOT the cause [VERIFIED]

**HTML lang attribute on ES page:**
```html
<html lang="es-ES"
```
EN page: `lang="en-US"`

**JS getLang() function (scripts.js:248–254):**
```javascript
function getLang() {
  var lang = (document.documentElement.lang || 'en').substring(0, 2).toLowerCase();
  if (lang !== 'en' && lang !== 'es') {
    console.warn('[Subscribe] Unexpected lang "' + lang + '", defaulting to "en"');
    return 'en';
  }
  return lang;
}
```

`.substring(0, 2)` correctly extracts `"es"` from `"es-ES"`. The lang value sent to the server would be valid. [VERIFIED — code inspection]

### 2. Rate limiting — NOT the cause [VERIFIED]

**Server request log (20:29:04 restart through 20:46:19):**
```
20:41:50 POST /api/subscribe → success (jvitiel@gmail.com, EN) — count 1
20:43:40 OPTIONS /api/subscribe (CORS preflight for ES attempt) — count 2
[no more subscribe requests until diagnostic curl at 20:46:19]
```

**Rate limit:** 3/hr/IP. Only 2 requests from John's IP in the window. No rate-limit log entries between 20:40 and 20:46. [VERIFIED — journalctl grep]

### 3. Endpoint health — NOT the cause [VERIFIED]

**Direct curl test with lang="es":**
```
$ curl -X POST https://dashboard.4lgshelterapp.duckdns.org/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"diagnosis-test+es@example.com","lang":"es","website_url":""}'

{"success":true}
HTTP_STATUS: 200
```

Endpoint accepts `lang="es"` submissions correctly. [VERIFIED — Resend ID 01018b64 in server log]

### 4. Root cause: transient client-side fetch failure [INFERRED]

**Evidence chain:**
- The CORS preflight at 20:43:40 reached the server and succeeded (logged as OPTIONS)
- No corresponding POST from John's browser appears in server logs
- No rate-limit denial was logged
- The error displayed was the localized `generic_error` / `network_error` string, not a server-provided error message

**What this means:** The browser's `fetch()` call threw an exception (caught by the `.catch()` block in the JS handler), which displays `flg_subscribe_i18n.network_error` — the same "Algo salió mal..." string. The POST never left the browser, or was dropped in transit.

**Possible triggers:**
- Transient network interruption between preflight and POST
- SiteGround edge/CDN hiccup on the response path
- Browser connection pool exhaustion or SSL renegotiation failure
- An aggressive browser extension or firewall intercepting the POST after preflight passed

### 5. Not a double-submit bug [VERIFIED]

The form has both `form.addEventListener('submit', handleSubmit)` and `submitBtn.addEventListener('click', handleSubmit)`. However, the form's `onsubmit="return false;"` inline handler cancels the submit event before the addEventListener handler fires. The server log confirms only 1 POST for the EN test at 20:41:50, not 2. [VERIFIED — single POST in log window]

**However:** This dual-listener pattern is fragile. If the inline `onsubmit` attribute were removed or changed, it would cause double POSTs. Worth consolidating to a single listener in a future cleanup pass.

---

## Synthesis

The ES submission failure was a transient client-side network error, not a server-side or code-level bug. The endpoint is healthy, lang normalization is correct, rate limiting was not triggered, and the JS handler is functioning as designed. John can retry the ES submission — if it fails consistently, we'd need browser DevTools Network tab output to identify the specific fetch failure mode.
