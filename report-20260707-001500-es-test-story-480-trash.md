# ES Test Story Post 480 — Trash Report

## Pre-Trash Confirmation

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| post_type | shelter_story | shelter_story | [VERIFIED] |
| title | "Historia de prueba" | "Historia de prueba" | [VERIFIED] |
| status | publish | publish | [VERIFIED] |
| language | es | In `lang=es` query results | [VERIFIED] |
| Linked to EN 448 | wp_post_id_es=480 for story #16 | Dashboard DB: `wp_post_id=448, wp_post_id_es=480` | [VERIFIED] |

Note: Polylang REST fields (`pll_lang`, `pll_translations`) returned null for this CPT — likely not exposed in the REST schema. Link confirmed via dashboard DB row and the fact that post 480 appears in `?lang=es` filtered results (Polylang's own filter).

Pre-trash published ES shelter_story count: **11** [VERIFIED via X-WP-Total header]

## Trash Action

```
DELETE /wp-json/wp/v2/shelter-stories/480 (no force parameter)
```

Response:
```json
{"id": 480, "status": "trash", "title": "Historia de prueba", "type": "shelter_story"}
```

[VERIFIED] — Post moved to trash (recoverable, not permanently deleted).

## Post-Trash Verification

| Check | Result | Status |
|-------|--------|--------|
| Unauthenticated GET /shelter-stories/480 | HTTP 401 (hidden from public) | [VERIFIED] |
| Authenticated GET /shelter-stories/480 | `{"id":480,"status":"trash"}` | [VERIFIED] |
| Published ES shelter_story count | **10** (was 11, decreased by exactly 1) | [VERIFIED via X-WP-Total header] |

## Page Verification

**`/es/historias-felices/`** — "Historia de prueba" no longer appears. Page shows only the 5 real stories: Mejores Días para B y B, Amor para Louise, El Momento de Tinka, and others. [VERIFIED via page fetch]

**`/es/` (home page)** — Happy Stories section shows "Amor para Louise" and "El Momento de Tinka" only. No test story. [VERIFIED via page fetch]

## Scope Confirmation

- EN post 448: untouched (still draft, as set by the original unpublish) [VERIFIED — not included in DELETE call]
- No other shelter_story post was trashed or modified — count decreased by exactly 1 (11→10) [VERIFIED]
- No dashboard DB writes performed [VERIFIED — no sqlite3 write commands executed]
- No code changes [VERIFIED]
