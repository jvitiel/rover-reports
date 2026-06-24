# Adoptions Tab PDF Link Bug — Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only. PDF link opens dashboard instead of PDF.

---

## 1. The Link Markup

**dashboard/index.html:15409–15410** (inside `loadAdoptionsData()`):

```js
const pdfCell = a.pdfUrl
    ? `<a href="${a.pdfUrl}" target="_blank" rel="noopener" title="Open PDF">📄 View PDF</a>`
    : '—';
```

The href is set directly from `a.pdfUrl`. The markup itself is correct — `target="_blank"`, proper escaping.

---

## 2. What pdfUrl Actually Contains

From `GET /api/adoption-applications`:

```
'/adoption-pdfs/9-John_Vitiello-2026-05-14.pdf'
'/adoption-pdfs/8-John_Vitiello-2026-05-13.pdf'
'/adoption-pdfs/7-Email_Test-2026-03-15.pdf'
```

**Leading slash present** — these are absolute paths from the domain root. The values themselves are correct.

---

## 3. The Dashboard's Routing — THE ROOT CAUSE

The dashboard is served via Caddy at `dashboard.4lgshelterapp.duckdns.org`. The Caddyfile (lines 126–148) has an SPA-style rewrite:

```caddyfile
# Standalone pages (pass through without rewrite)                    # :138
@standalone path /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/*
reverse_proxy @standalone localhost:3000

# Dashboard paths (rewrite to /dashboard prefix)                     # :146
@dashboard not path /api/* /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/*
rewrite @dashboard /dashboard{uri}
reverse_proxy localhost:3000
```

**`/adoption-pdfs/*` is NOT in either exclusion list.** So when a browser on `dashboard.4lgshelterapp.duckdns.org` requests `/adoption-pdfs/9-John_Vitiello-2026-05-14.pdf`:

1. Caddy's `@standalone` matcher does NOT match (adoption-pdfs not listed)
2. Caddy's `@dashboard` matcher DOES match (adoption-pdfs not excluded)
3. Caddy rewrites the URL to `/dashboard/adoption-pdfs/9-John_Vitiello-2026-05-14.pdf`
4. Express serves `dashboard/index.html` (the SPA catch-all) with `Content-Type: text/html`
5. Browser renders the dashboard HTML instead of the PDF

**Evidence:**

| Request path | Via | Content-Type | Result |
|---|---|---|---|
| `/adoption-pdfs/9-...pdf` | Direct to Express (:3000) | `application/pdf` | ✅ PDF |
| `/adoption-pdfs/9-...pdf` | Via Caddy (dashboard domain) | `text/html; charset=UTF-8` | ❌ Dashboard HTML |

---

## 4. The Working URL vs What the Link Produces

- **Working URL** (Stage 1 curl, direct to Express): `http://localhost:3000/adoption-pdfs/9-John_Vitiello-2026-05-14.pdf` → `application/pdf`, 200
- **Browser URL** (through Caddy): `https://dashboard.4lgshelterapp.duckdns.org/adoption-pdfs/9-John_Vitiello-2026-05-14.pdf` → rewritten to `/dashboard/adoption-pdfs/...` → serves dashboard HTML

The href value `/adoption-pdfs/9-John_Vitiello-2026-05-14.pdf` is **correct**. The problem is entirely in the **Caddy routing** — the path isn't excluded from the dashboard SPA rewrite.

---

## 5. The Fix (Caddyfile only)

Add `/adoption-pdfs/*` to **both** matchers in the Caddyfile:

**@standalone** (line 138) — add `/adoption-pdfs/*` so it passes through to Express:
```caddyfile
@standalone path /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/* /adoption-pdfs/*
```

**@dashboard** (line 146) — add `/adoption-pdfs/*` to the not-path exclusion so it doesn't get rewritten:
```caddyfile
@dashboard not path /api/* /intake /vclock /rg-portal /profile-form /intake-photos/* /intake-audio/* /public/* /data/* /adoption-pdfs/*
```

This is the same pattern used for `/data/*` and `/public/*` — paths that need to pass through to Express without the SPA rewrite. The Caddyfile itself documents this requirement in the comment at lines 141–143:

> "Any path added to @standalone must also be added to @dashboard's not-path list below."

**No frontend or endpoint change needed.** The href and pdfUrl are correct; only the Caddy routing needs the new path added.
