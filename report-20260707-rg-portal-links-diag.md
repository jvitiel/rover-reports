# RG Portal — Dead Reference Diagnosis (Public Site)

## Q1 — Theme References

```
grep -rn 'rg-portal|rg_portal|/api/rg|requester.portal|rg.portal|RG Portal|RG-portal' ~/www/.../4lg-theme/
→ (exit code 1 — zero matches)
```

**Zero theme references to the dead portal.** [VERIFIED]

## Q2 — Page/Post Content References

### WP page ID 294: "RG Cares Portal" (draft)

| Field | Value |
|-------|-------|
| ID | 294 |
| Title | RG Cares Portal |
| Slug | `rg-portal` |
| Type | page |
| Status | **draft** |
| Polylang lang | English |
| ES translation | **none** (no Polylang link, no ES counterpart) |
| Revision | ID 395 (inherits from 294) |

**Content:** A full embedded single-page app — the entire RG Cares requester portal HTML/CSS/JS inside a `<!-- wp:html -->` block. Includes:
- Login form (email + 6-digit PIN)
- Request list, new request form, thread view, follow-up form
- File upload/download
- `API_BASE = 'https://dashboard.4lgshelterapp.duckdns.org/api/rg'` — points to the now-removed portal routes
- RG Cares logo references (`rg-cares-logo.png`)
- ~1,200 lines of embedded HTML/CSS/JS

**Classification: REMOVE** — this is the dead portal. The backend routes (`/api/rg/*`) were removed in Pass C. The page is in draft status (not published, visitors get 404), but it's stale dead code referencing removed endpoints. [VERIFIED]

### WP page ID 8: "How to Help" (publish) — FALSE POSITIVE

The query matched because the page's volunteer form `<script>` posts to `https://dashboard.4lgshelterapp.duckdns.org/api/volunteers`. This is the **live volunteer application endpoint**, NOT an RG portal reference.

**Classification: KEEP** — no portal reference; false positive from the broad `dashboard.4lgshelterapp` match. [VERIFIED — grep for `rg-portal`, `/api/rg`, `requester portal` within this page's content returns zero matches]

### WP page ID 345: "Cómo Ayudar" (publish) — FALSE POSITIVE

ES translation of page 8. Same volunteer form, same `api/volunteers` endpoint.

**Classification: KEEP** — no portal reference; same false positive. [VERIFIED]

### Nav menus

No nav menus exist in this WordPress installation (`cqu_term_taxonomy WHERE taxonomy = 'nav_menu'` returned zero rows). Navigation is handled by the theme's `header.php` with hardcoded links.

**Zero nav menu items reference the portal.** [VERIFIED]

### Postmeta / Options

```
SELECT ... FROM cqu_postmeta WHERE meta_value LIKE '%rg-portal%' → (empty)
SELECT ... FROM cqu_options WHERE option_value LIKE '%rg-portal%' → (empty)
```

**Zero postmeta or option values reference the portal.** [VERIFIED]

## Q3 — Buttons / Banners / QR Codes

### Buttons/anchors linking to portal

The only portal-linking markup is inside draft page 294 itself (the embedded portal app with login form, request buttons, etc.). No other page contains a button, CTA, or anchor linking to `/rg-portal` or the `/api/rg/*` endpoints. [VERIFIED — grep across all published/draft content]

### QR codes

```
SELECT ... FROM cqu_posts WHERE post_type = 'attachment' AND (post_title LIKE '%qr%' OR guid LIKE '%qr%') → (empty)
SELECT ... FROM cqu_posts WHERE post_content LIKE '%qr%' OR post_content LIKE '%QR%' → (empty)
```

**Zero QR code images in the media library. Zero QR references in any page/post content.** [VERIFIED]

## Q4 — EN/ES Parity

| Reference | EN | ES | Action |
|-----------|----|----|--------|
| Page 294 "RG Cares Portal" (draft) | ✅ exists (slug `rg-portal`) | ❌ no ES translation | REMOVE EN page only (nothing to remove on ES side) |
| Page 10 "/rg-cares/" (publish, KEEP) | ✅ exists | Not checked (out of scope — this page STAYS) | KEEP |

The dead portal page has no ES counterpart — no ES-side cleanup needed. [VERIFIED — Polylang term_relationships shows page 294 is tagged `en` only; no `pll_` postmeta linking to an ES translation]

## Q5 — Dead-End Behavior + Boundary

### `/rg-portal` → 404 (dead)

```
curl -sSIL https://www.fourlegsgoodnynj.org/rg-portal
→ HTTP/2 404
```

The page is in `draft` status. WordPress correctly returns 404 to anonymous visitors. (Note: the summary context from Caddy cleanup said it "falls through to the dashboard SPA shell" — that was about the *dashboard* subdomain `dashboard.4lgshelterapp.duckdns.org/rg-portal`, not the public WordPress site `www.fourlegsgoodnynj.org/rg-portal`. The public site correctly 404s.) [VERIFIED]

### `/rg-cares/` → 200 (KEEP)

```
curl -sSI https://www.fourlegsgoodnynj.org/rg-cares/
→ HTTP/2 200
→ page ID 10 "RG CARES Animal Shelter"
```

This is the live public information page about the RG Cares facility. It is NOT the portal. It **stays**. [VERIFIED]

### Boundary summary

| URL | Status | What it is | Action |
|-----|--------|-----------|--------|
| `/rg-portal` | 404 (draft) | Dead portal page (ID 294) | **REMOVE** |
| `/rg-cares/` | 200 (publish) | Live facility info page (ID 10) | **KEEP** |

## Summary of Findings

| # | Location | Reference | Classification | EN/ES |
|---|----------|-----------|----------------|-------|
| 1 | WP page ID 294 "RG Cares Portal" (draft) | Full embedded portal app + `/api/rg/*` API calls | **REMOVE** — dead portal | EN only, no ES counterpart |
| 2 | WP revision ID 395 | Revision of page 294 | **REMOVE** — will be deleted with parent | EN only |
| — | Theme files | (none found) | — | — |
| — | Nav menus | (none exist) | — | — |
| — | Other pages/posts | (none found) | — | — |
| — | QR codes | (none found) | — | — |
| — | Postmeta/options | (none found) | — | — |

**One dead reference to clean up: WP page ID 294 (and its revision 395).** Everything else is clean. The `/rg-cares/` page (ID 10) is completely separate and untouched.
