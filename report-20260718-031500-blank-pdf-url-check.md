# Blank PDF URL Check — 2026-07-18

## Results

| Host | File | HTTP Status | Content-Type | Content-Length | Expected | Match? |
|------|------|------------|--------------|----------------|----------|--------|
| dogwalker | blank-english.pdf | 200 | application/pdf | 309,446 | 309,446 | ✅ |
| dogwalker | blank-spanish.pdf | 200 | application/pdf | 127,119 | 127,119 | ✅ |
| dashboard | blank-english.pdf | 200 | application/pdf | 309,446 | 309,446 | ✅ |
| dashboard | blank-spanish.pdf | 200 | application/pdf | 127,119 | 127,119 | ✅ |
| staff | blank-english.pdf | 200 | text/html | 19,054 | 309,446 | ❌ |
| staff | blank-spanish.pdf | 200 | text/html | 19,054 | 127,119 | ❌ |

[VERIFIED — curl -sIL output for all 6 URLs]

## Analysis

### Dogwalker host — PASS
`/public/*` is in the Caddy `@notapi` exclusion list, so these paths go directly to Express (not rewritten to `/dogwalker{uri}`). Express serves them via `express.static('/public', ...)`. Both files return `application/pdf` with correct byte sizes.

### Dashboard host — PASS
`/public/*` is in the Caddy `@standalone` matcher, so these paths go directly to Express. Same Express static mount serves them correctly. Both files return `application/pdf` with correct byte sizes.

### Staff host — FAIL
`/public/*` is NOT excluded from the staff host's Caddy rewrite. The request gets rewritten to `/staff/public/forms/blank-english.pdf`, hits the Express `app.get('/staff/*')` SPA catch-all, and serves `staff-pwa/index.html` (19,054 bytes of HTML). Same pattern as the original dogwalker `/adoption-pdfs/` bug.

## Which Host Should WordPress Point At?

**Dashboard** (`dashboard.4lgshelterapp.duckdns.org`) is the most appropriate:
- It serves `/public/forms/*.pdf` correctly [VERIFIED]
- It's the general-purpose host with the broadest path exclusion list (includes `/public/*`, `/adoption-pdfs/*`, `/data/*`, etc.)
- The dogwalker host also works, but "dogwalker" in a public-facing adoption PDF URL is semantically odd
- The staff host does NOT work (same SPA catch-all bug)

**Recommended URLs for WordPress buttons:**
- EN: `https://dashboard.4lgshelterapp.duckdns.org/public/forms/blank-english.pdf`
- ES: `https://dashboard.4lgshelterapp.duckdns.org/public/forms/blank-spanish.pdf`

**Dogwalker URLs also work** if the existing host is preferred:
- EN: `https://dogwalker.4lgshelterapp.duckdns.org/public/forms/blank-english.pdf`
- ES: `https://dogwalker.4lgshelterapp.duckdns.org/public/forms/blank-spanish.pdf`

## Verdict

**Option A is viable.** Repointing the WordPress button hrefs from `/adoption-pdfs/blank-*.pdf` to `/public/forms/blank-*.pdf` will work on both the dogwalker and dashboard hosts. Dashboard is the cleaner choice. No VPS-side changes needed — the files and serving path already exist and return correct `application/pdf` responses with matching byte sizes.
