# Events EN→ES Test Artifact — 2026-07-07

## Scenario 1 — Forward CREATE via push-event

Dispatched via `wp eval` with `wp_set_current_user(4)` + `rest_do_request` POST to `/4lg/v1/push-event`.

Body: title "ZZTEST-EN Adoption", content "Test description for EN event", event_date "2020-06-15", + 4 `_es` fields (title_es "ZZTEST-ES Adopción", content_es "Descripción de prueba para evento ES", event_location_name_es "Biblioteca de Prueba", link_text_es "Más Información").

**Response:**

```json
{
    "success": true,
    "post_id": 449,
    "action": "created",
    "es_post_id": 450,
    "es_status": "created"
}
HTTP: 200
```

EN_ID=449, ES_ID=450. `action=created`, `es_post_id` present, `es_status=created`. [VERIFIED]

**Note:** Both posts created with `post_status=publish` (push-event hardcodes `post_status => 'publish'` in `$post_data`; ES inherits `$en_post->post_status`). Past event_date (2020-06-15) means neither renders on the upcoming-events page. [VERIFIED]

---

## Scenario 2 — Verify Linked Pair + ES Content

### Polylang linkage

```
pll_get_post(449, 'es') = 450     ✓
pll_get_post(450, 'en') = 449     ✓
pll_get_post_language(449) = 'en' ✓
pll_get_post_language(450) = 'es' ✓
```

[VERIFIED]

### Shared post_translations term

```
EN 449 post_translations term: 27 | a:2:{s:2:"en";i:449;s:2:"es";i:450;}
ES 450 post_translations term: 27 | a:2:{s:2:"en";i:449;s:2:"es";i:450;}
```

Both share term_id 27 with serialized `{en:449, es:450}`. [VERIFIED]

### ES post content

| Field | Expected | Actual | Match |
|-------|----------|--------|-------|
| post_title | ZZTEST-ES Adopción | ZZTEST-ES Adopción | ✓ |
| post_content | Descripción de prueba para evento ES | Descripción de prueba para evento ES | ✓ |
| meta event_location_name | Biblioteca de Prueba | Biblioteca de Prueba | ✓ |
| meta link_text | Más Información | Más Información | ✓ |
| meta event_date (verbatim) | 2020-06-15 | 2020-06-15 | ✓ |
| meta event_time_start (verbatim) | 10:00 AM | 10:00 AM | ✓ |
| meta event_location (verbatim) | 123 Test St, Nowhere, NY | 123 Test St, Nowhere, NY | ✓ |

All 4 translated fields match `_es` input. All verbatim-copied meta matches EN source. [VERIFIED]

---

## Scenario 3 — Idempotency (able-to-fail)

Called `/4lg/v1/link-es-translation` with `en_post_id=449` (already has ES link to 450).

**ES shelter_event count BEFORE:** 2

**Response:**

```json
{
    "status": "adopted",
    "es_post_id": 450,
    "success": true
}
HTTP: 200
```

**ES shelter_event count AFTER:** 2

**ABLE-TO-FAIL statement:** Without the idempotency check (`pll_get_post` returning existing 450), this call would have created a second ES post. The `adopted` status + same es_post_id (450) + unchanged count (2→2) proves the guard works. **PASS.** [VERIFIED]

---

## Scenario 4 — Orphan Guard (able-to-fail)

### Scenario 4a — Draft orphan (FAILED)

Setup: EN2=451 (draft, event_date 2020-07-20, lang=en). Orphan=452 (draft, event_date 2020-07-20, lang=es, NOT linked to anything). `pll_get_post(452,'en') = 0` confirmed unlinked.

**ES count BEFORE:** 3

**Response:**

```json
{
    "status": "created",
    "es_post_id": 453,
    "success": true
}
HTTP: 200
```

**ES count AFTER:** 4

**FAIL.** Guard did not fire. Root cause: `get_posts()` in the orphan-detection query defaults to `post_status=publish`. The draft orphan (452) was invisible to the query. A new ES post (453) was created and linked to EN2 (451), leaving orphan 452 still unlinked. [VERIFIED]

**Fix needed:** Add `'post_status' => 'any'` to the `get_posts` call in the orphan-detection block of `flg_create_and_link_es_event`. [INFERRED]

### Scenario 4b — Published orphan (PASSED)

Setup: EN3=454 (draft, event_date 2020-08-25, lang=en). Published orphan=455 (publish, event_date 2020-08-25, lang=es, NOT linked).

**ES count BEFORE:** 5

**Response:**

```json
{
    "status": "orphan_conflict",
    "message": "Unlinked ES event on the same event_date; refusing to create a duplicate",
    "orphan_es_post_id": 455,
    "success": false
}
HTTP: 409
```

**ES count AFTER:** 5

**ABLE-TO-FAIL statement:** Without the orphan guard, this call would have created a duplicate ES event on 2020-08-25. The `orphan_conflict` status + correct `orphan_es_post_id` (455) + unchanged count (5→5) proves the guard works for published orphans. **PASS.** [VERIFIED]

---

## Scenario 5 — Auth Gate

```
$ curl -sS -o /dev/null -w '%{http_code}' -X POST \
  'https://www.fourlegsgoodnynj.org/wp-json/4lg/v1/link-es-translation' \
  -H 'Content-Type: application/json' -d '{"en_post_id":1}'
401
```

Route live, `edit_posts` cap enforced, unauthenticated requests rejected. [VERIFIED]

---

## Cleanup

All 7 test posts trashed via `wp post update <id> --post_status=trash`:

```
Success: Updated post 449.  (EN, was publish → trash)
Success: Updated post 450.  (ES, was publish → trash)
Success: Updated post 451.  (EN2, was draft → trash)
Success: Updated post 452.  (orphan ES, was draft → trash)
Success: Updated post 453.  (ES2, was draft → trash)
Success: Updated post 454.  (EN3, was draft → trash)
Success: Updated post 455.  (pub orphan ES, was publish → trash)
```

**Verification:** All 7 confirmed `post_status=trash`. Zero ZZTEST posts remain published or draft. [VERIFIED]

---

## Summary

| Scenario | Result | Detail |
|----------|--------|--------|
| 1. Forward CREATE | **PASS** | EN 449 + ES 450 created, es_post_id returned |
| 2. Linkage + content | **PASS** | Bidirectional pll link, shared term 27, all fields match |
| 3. Idempotency | **PASS** | adopted + same id + count unchanged (2→2) |
| 4a. Orphan guard (draft) | **FAIL** | get_posts misses draft orphans; needs post_status=any |
| 4b. Orphan guard (published) | **PASS** | orphan_conflict + count unchanged (5→5) |
| 5. Auth gate | **PASS** | 401 on unauthenticated POST |
| Cleanup | **PASS** | All 7 trashed, zero published |

**Known bug:** Orphan-detection query in `flg_create_and_link_es_event` uses `get_posts()` without `post_status => 'any'`, so draft/pending orphan ES events slip through. Fix: add `'post_status' => 'any'` to the `$es_candidates` query.
