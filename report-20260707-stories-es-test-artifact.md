# Stories EN→ES Test Artifact — 2026-07-07

## T1 — Forward CREATE via rest_after_insert_shelter_story Hook

Request: POST `/wp/v2/shelter-stories` with `{ status:'draft', title:'ZZTEST3-EN Story', content:'Test story body EN', title_es:'ZZTEST3-ES Historia', content_es:'Cuerpo de prueba ES', link_text_es:'Leer más' }`

```
HTTP: 201
id: 472
es_post_id: 473
title: ZZTEST3-EN Story
status: draft
```

`es_post_id` present and non-null in the REST response (registered field works). EN=472, ES=473. [VERIFIED]

## T2 — Linked Pair + Translated Content

```
pll_get_post(472, 'es') = 473       ✓
pll_get_post(473, 'en') = 472       ✓
pll_get_post_language(472) = en     ✓
pll_get_post_language(473) = es     ✓
EN post_translations term IDs: 39
ES post_translations term IDs: 39   (shared ✓)
ES title: ZZTEST3-ES Historia       (== title_es ✓)
ES content: Cuerpo de prueba ES     (== content_es ✓)
ES link_text: Leer más              (== link_text_es ✓)
_es_post_id meta on EN: 473         ✓
```

Bidirectional Polylang link, shared translation term 39, all 3 translated fields match input. [VERIFIED]

## T3 — Idempotency (able-to-fail)

Request: POST `/4lg/v1/link-es-translation` with `{ en_post_id:472, post_type:'shelter_story', ... }`

```
ES stories BEFORE: 6
HTTP: 200
status: adopted
es_post_id: 473
success: true
ES stories AFTER: 6
```

Able-to-fail condition: a non-idempotent path would create a second ES story, incrementing count from 6 to 7. Count held at 6. [VERIFIED]

## T4 — Orphan-Guard (able-to-fail)

Setup: ORPHAN=474 (unlinked ES story titled "ZZTEST3-ORPHAN Historia"), EN2=475 (EN, no ES link).

Request: POST `/4lg/v1/link-es-translation` with `{ en_post_id:475, post_type:'shelter_story', title_es:'ZZTEST3-ORPHAN Historia', ... }`

```
ES stories BEFORE: 7
HTTP: 409
status: orphan_conflict
orphan_es_post_id: 474
es_post_id present: false
message: Unlinked ES story with matching title; refusing to create a duplicate
ES stories AFTER: 7
```

Able-to-fail condition: without the orphan guard, a duplicate ES story with the same title would be created, incrementing count from 7 to 8. Count held at 7. Correct orphan ID surfaced. [VERIFIED]

## T5 — Verbatim Meta Copy (incl. untranslated animal_species)

Setup: EN3=476 with meta `animal_species='Cat'`, `story_type='rescue'`, `animal_name='Whiskers'`.

Request: POST `/4lg/v1/link-es-translation` with `{ en_post_id:476, post_type:'shelter_story', title_es:'ZZTEST3-ES3 Historia de Gato', content_es:'Contenido de historia de gato ES3', link_text_es:'Leer artículo' }`

```
HTTP: 200
status: created
ES3: 477
ES3 title: ZZTEST3-ES3 Historia de Gato  (translated ✓)
ES3 animal_species: Cat                    (VERBATIM, not "Gato" ✓)
ES3 story_type: rescue                     (verbatim ✓)
ES3 animal_name: Whiskers                  (verbatim ✓)
ES3 link_text: Leer artículo              (translated ✓)
ES3 content: Contenido de historia de gato ES3  (translated ✓)
```

`animal_species` copied verbatim as "Cat", confirming the contract decision to NOT translate it. All 3 translatable fields carry Spanish; all 3 verbatim meta fields carry EN originals. [VERIFIED]

## Cleanup

```
Trashed: 472, 473, 474, 475, 476, 477 (all 6)
grep ZZTEST3 in publish/draft: (none found — clean)
```

Zero test artifacts remain in publish or draft. [VERIFIED]

## Summary

| Test | Result | Able-to-fail |
|------|--------|-------------|
| T1 Forward CREATE | PASS (EN 472 + ES 473, es_post_id in response) | — |
| T2 Link + content | PASS (bidirectional, term 39, all 3 fields) | — |
| T3 Idempotency | PASS (adopted, 6→6) | Non-idempotent → 6→7 |
| T4 Orphan-guard | PASS (409, 7→7, orphan 474 surfaced) | No guard → 7→8 |
| T5 Verbatim meta | PASS (Cat not Gato, rescue, Whiskers) | — |

5/5 PASS. All test posts trashed. [VERIFIED]
