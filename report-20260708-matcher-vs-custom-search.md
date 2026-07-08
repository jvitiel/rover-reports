# Matcher vs. Custom-Search — Two Distinct Apps Disambiguation

## Summary

These are TWO DIFFERENT apps at two different subdomains, sharing the same Express server (shelter-app on port 3000) but serving different client directories and calling different API endpoints.

| | **matcher.4lgshelterapp.duckdns.org** | **custom-search.4lgshelterapp.duckdns.org** |
|---|---|---|
| **App name** | "Browse Your Perfect Pet" | "Find Your New Best Friend" |
| **Function** | Animal photo/profile **browser** | AI-powered adoption **search** (Claude) |
| **Client dir** | `/home/shelter/shelter-apps/matcher-preview/` | `/home/shelter/shelter-apps/custom-search/` |
| **API endpoint** | `GET /api/animals` (browse all) | `POST /api/matcher/custom-search` (AI match) |
| **AI model** | None — no LLM call | `claude-sonnet-4-6` (intent extraction + bio writing) |
| **User interaction** | Browse/filter cards, expand modal, photo gallery | Form input (species/sex/age + narrative), "Find My Pet" button |
| **Wait experience** | Instant (static data) | Loading videos (wait-1/2/3.mp4) during AI response |
| **HTTP status** | 200 [VERIFIED] | 200 [VERIFIED] |

---

## A) matcher.4lgshelterapp.duckdns.org

### Caddy Route (lines 97–107)

```
matcher.4lgshelterapp.duckdns.org {
    import security_headers
    import block_db
    @api path /api/*
    reverse_proxy @api localhost:3000
    @data path /data/*
    reverse_proxy @data localhost:3000
    @notapi not path /api/* /data/*
    rewrite @notapi /matcher{uri}
    reverse_proxy localhost:3000
}
```

Non-API requests are rewritten to `/matcher{uri}` → served by Express. [VERIFIED]

### Serving Code (server.ts:11608, 11617)

```ts
app.use('/matcher', express.static(path.join(ROOT_DIR, 'matcher-preview')));
// ...
app.get('/matcher/*', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'matcher-web', 'index.html'));
});
```

- Static assets: `/home/shelter/shelter-apps/matcher-preview/` (newer version with Source+Serif+4 font, time-of-day greetings)
- SPA fallback: `/home/shelter/shelter-apps/matcher-web/index.html` (older version, slight diffs — missing greetings translations, different CSS)
- In practice, `matcher-preview/index.html` wins for `/matcher/` because `express.static` serves it before the wildcard fallback fires. [VERIFIED]

### What It Does

A **visual animal browser/gallery**. No AI, no search narrative.

- Calls `GET /api/animals` to fetch all available animals
- Calls `GET /api/photos/{shelterCode}` for photo galleries
- Displays animal cards with photo, name, breed, species
- Modal detail view with photo gallery, video (if available), lightbox
- EN/ES language toggle
- Filters: species, but no AI-powered matching
- Title: "Browse Your Perfect Pet"

[VERIFIED — matcher-preview/app.js:581, 1140; zero references to `/api/matcher/custom-search`]

### Note: matcher-web vs. matcher-preview

Two directories exist with nearly identical content:

| Dir | Differences |
|-----|-------------|
| `matcher-preview/` | Newer — has Source+Serif+4 font, time-of-day greetings (morning/afternoon/evening), slightly different CSS padding |
| `matcher-web/` | Older — missing greetings translations, slightly different layout |

`matcher-preview/` serves static assets (wins for index.html); `matcher-web/` serves only as SPA fallback for sub-paths. [VERIFIED via diff]

---

## B) custom-search.4lgshelterapp.duckdns.org

### Caddy Route (lines 89–96)

```
custom-search.4lgshelterapp.duckdns.org {
    import security_headers
    @api path /api/*
    reverse_proxy @api localhost:3000
    @notapi not path /api/*
    rewrite @notapi /custom-search{uri}
    reverse_proxy localhost:3000
}
```

Non-API requests rewritten to `/custom-search{uri}`. Note: no `block_db`, no `/data/*` route. [VERIFIED]

### Serving Code (server.ts:11610–11616)

```ts
app.use('/custom-search', (req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
}, express.static(path.join(ROOT_DIR, 'custom-search')));
```

Custom no-cache middleware for HTML pages, then static serve from `/home/shelter/shelter-apps/custom-search/`. [VERIFIED]

### What It Does

The **AI-powered adoption search** — THIS is the "Searcher" app.

- User fills out a form: species, sex, age group, free-text narrative ("I want a playful cat good with kids")
- Calls `POST /api/matcher/custom-search` with filters + narrative
- Server-side pipeline:
  1. **Phase 1 — Intent extraction** (`intentExtractor.ts`): Claude `claude-sonnet-4-6` parses narrative into structured filters (color, size, breed, coat, softTerms)
  2. **Phase 2 — Bio writing**: Claude writes personalized adoption bios for matched animals
  3. **Phase 3 — Preamble/confidence**: low-confidence handling, preamble generation
- While waiting: plays rotating wait videos (wait-1/2/3.mp4) from `/custom-search/videos/`
- Results: animal cards with AI-written bios, photos, videos (if available via `GET /api/photos/{shelterCode}`)
- Title: "Find Your New Best Friend"
- EN/ES: `?lang=es` parameter, separate FAQ files per species+language

[VERIFIED — custom-search/app.js:370–372; server.ts:6024, 6138, 6623 for model calls]

### FAQ/Policy Files (used by custom-search only)

| File | Entries | Language | Species |
|------|---------|----------|---------|
| `server/config/shelter-policy-faq.json` | 9 | EN | Cat |
| `server/config/shelter-policy-faq-es.json` | 9 | ES | Cat |
| `server/config/shelter-policy-faq-dog.json` | 9 | EN | Dog |
| `server/config/shelter-policy-faq-dog-es.json` | 9 | ES | Dog |

Keys: spay_vax_chip, vet, adoption_fees, return_policy, follow_up, + 4 more. No small-animal FAQ exists. [VERIFIED]

### Data Tables

| Table | Rows | Written by |
|-------|------|-----------|
| `matcher_audit` | 938 | Custom-search endpoint (per-query audit trail) |
| `searcher_daily_metrics` | 72 | `runDailySearcherSnapshot()` — aggregates matcher_audit daily |

Both tables are populated by the custom-search API endpoint flow. The matcher/browser app does NOT write to either. [VERIFIED]

---

## Shared Infrastructure

Both apps:
- Are in the CORS allow-list (server.ts:641–645) [VERIFIED]
- Share the same Express server (shelter-app, port 3000) [VERIFIED]
- Can call `GET /api/photos/{shelterCode}` for animal photos [VERIFIED]

The dashboard Profiles tab displays searcher stats (from `searcher_daily_metrics`) and offers a CSV export at `GET /api/dashboard/searcher-metrics/export`. [VERIFIED — dashboard/index.html:4943, 4962]
