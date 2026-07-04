# Adoption PATCH Write-Gate — Pre-Build Check

## 1. GET Subpaths Under /api/adoption-applications/

**Zero routes exist** under `/api/adoption-applications/` (plural + slash). [VERIFIED — grep for `adoption-applications/` in server.ts returned no hits]

The only routes on this table are:
| Path | Method | Purpose |
|------|--------|---------|
| `/api/adoption-application` (singular) | POST | Public form submit |
| `/api/adoption-application` (singular) | OPTIONS | CORS preflight for above |
| `/api/adoption-applications` (plural, exact) | GET | Dashboard list (gated) |

No `:id` subpaths exist today. The new `PATCH /api/adoption-applications/:id` will be the first. [VERIFIED]

**PDFs are NOT served via an API route.** They are served via `express.static`:
```ts
app.use('/adoption-pdfs', express.static(getPdfDirectory()));
```
The path is `/adoption-pdfs/<filename>`, NOT `/api/adoption-applications/<id>/pdf`. Completely outside the `/api/` namespace. [VERIFIED]

## 2. How "View PDF" Is Accessed

**Mechanism:** Plain `<a href>` tag with `target="_blank"`. No `gatedGet`, no token, no fetch — a bare hyperlink. [VERIFIED]

```js
const pdfCell = a.pdfUrl
  ? `<a href="${a.pdfUrl}" target="_blank" rel="noopener" title="Open PDF">📄 View PDF</a>`
  : '—';
```

The URL is of the form `/adoption-pdfs/12-Test_Verification-2026-06-30.pdf` — a static file path. [VERIFIED]

### ⚠️ SECURITY FLAG: Adoption PDFs Are Anonymously Downloadable

The `/adoption-pdfs/` path is served via `express.static` and is:
- **NOT in `isGatedPath`** — no token check applies [VERIFIED]
- **NOT behind any auth middleware** — it's a static mount [VERIFIED]
- Explicitly listed in the Caddy `@standalone` matcher, proxied directly to Express without rewrite [VERIFIED]
- Listed in the `staticPrefixes` rate-limiter exclusion array — not even rate-limited [VERIFIED]

**Tested:**
```
Anonymous GET http://127.0.0.1:3000/adoption-pdfs/12-Test_Verification-2026-06-30.pdf → 200
Anonymous GET https://dashboard.4lgshelterapp.duckdns.org/adoption-pdfs/12-Test_Verification-2026-06-30.pdf → 200
```

**Anyone who can guess or enumerate the filename pattern `{id}-{Name}-{date}.pdf` can download adoption application PDFs containing full PII (name, address, phone, email, references, vet info) with no authentication.** The id is sequential (12–16 currently), the name is in the filename, and the date is the submission date — all guessable or brute-forceable.

**This is a pre-existing ungated PII read exposure — not introduced by the PATCH work.** Flagged for Auditor routing. No fix applied per diagnosis-only constraint. [VERIFIED]

## 3. CORS for PATCH

### Dashboard origin model

The dashboard is served **same-origin** relative to API calls. Caddy rewrites all non-standalone paths under `dashboard.4lgshelterapp.duckdns.org` to `/dashboard{uri}` and proxies to the same Express server on `:3000`. API calls go to `/api/*` on the same hostname. **No cross-origin request occurs.** [VERIFIED]

Because it's same-origin, CORS headers are technically not required — the browser does not send preflight for same-origin requests regardless of method or custom headers. [VERIFIED]

### CORS config (defense-in-depth confirmation)

The `cors()` middleware is configured with `origin` callback + `credentials: true`, but **no explicit `methods` or `allowedHeaders`**. [VERIFIED]

The `cors` npm package defaults apply:
- **Allowed methods:** `GET, HEAD, PUT, PATCH, POST, DELETE` [VERIFIED]
- **Allowed headers:** Reflected from `Access-Control-Request-Headers` (whatever the browser requests is echoed back) [VERIFIED]

**Live preflight test confirmed:**
```
OPTIONS /api/adoption-applications/12
  Origin: https://dashboard.4lgshelterapp.duckdns.org
  Access-Control-Request-Method: PATCH
  Access-Control-Request-Headers: Content-Type, X-Gate-Token

Response: 204 No Content
  Access-Control-Allow-Origin: https://dashboard.4lgshelterapp.duckdns.org
  Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
  Access-Control-Allow-Headers: Content-Type, X-Gate-Token
  Access-Control-Allow-Credentials: true
```
[VERIFIED]

**Conclusion:** PATCH with `X-Gate-Token` and `Content-Type: application/json` will pass CORS/preflight. No CORS changes needed. Even in the same-origin case (which skips preflight entirely), the defense-in-depth headers are correct. [VERIFIED]
