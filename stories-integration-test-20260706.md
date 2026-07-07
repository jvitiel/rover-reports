# Stories Forward Create+Edit Integration Test — 2026-07-07

## STEP 1 — CREATE via Dashboard API

Request: `POST /api/stories` with title "ZZINTEG-STORY 1783396067", story_text, link_text="Read the full story", animal_species="Dog", story_type="rescue", animal_name="TestPet", animal_breed="Mutt".

```
Response: { success: true, id: 17, wp_post_id: 478, title: "ZZINTEG-STORY 1783396067" }
```

createWordPressStory ran: translated 3 fields EN→ES, POSTed to wp/v2/shelter-stories with _es fields, hook created ES post, es_post_id returned. [VERIFIED]

## STEP 2a — es_post_id Returned + Stored

```sql
SELECT id, wp_post_id, wp_post_id_es, title FROM dashboard_stories WHERE id = 17;
→ 17|478|479|ZZINTEG-STORY 1783396067
```

`wp_post_id_es=479` — stored from the create response's registered REST field. [VERIFIED]

## STEP 2b — ES Post: Spanish Content

```
ES title: ZZINTEG-STORY 1783396067
ES content: Cuerpo de prueba de integración para la ruta de creación de historia directa
ES link_text: Leer la historia completa
ES status: publish
```

All 3 translatable fields contain plausible Spanish. [VERIFIED]

## STEP 2c — Polylang Link

```
pll_get_post(478, 'es') = 479   ✓
pll_get_post(479, 'en') = 478   ✓
pll_get_post_language(478) = en  ✓
pll_get_post_language(479) = es  ✓
post_translations term: EN=41, ES=41 (shared ✓)
```

Bidirectional link, shared translation term 41. [VERIFIED]

## STEP 2d — Verbatim Meta (NOT translated)

```
ES animal_species: Dog       (verbatim, not "Perro" ✓)
ES animal_name: TestPet      (verbatim ✓)
ES story_type: rescue        (verbatim ✓)
ES animal_breed: Mutt        (verbatim ✓)
ES story_date: January 2025  (verbatim ✓)
```

All non-translatable meta copied verbatim per contract. [VERIFIED]

## STEP 2e — EN Post Created Normally

```
EN title: ZZINTEG-STORY 1783396067
EN status: publish
```

[VERIFIED]

## STEP 3 — EDIT Re-Translation

Request: `PUT /api/stories/17` with title "ZZINTEG-STORY EDITED", story_text "Updated integration test body after edit", link_text "Read the updated story".

```
EN title after edit: ZZINTEG-STORY EDITED
EN content after edit: Updated integration test body after edit

ES title after edit: ZZINTEG-HISTORIA EDITADA
ES content after edit: Cuerpo de prueba de integración actualizado después de la edición
ES link_text after edit: Leer la historia actualizada
```

Edit path: read wp_post_id_es=479 from DB, re-translated 3 fields, PUT ES post 479. Both EN and ES updated with fresh content. Same es_post_id (479), no new WP post created. [VERIFIED]

## STEP 4 — Cleanup

```
Trashed EN 478: Success
Trashed ES 479: Success
ZZINTEG in publish/draft: (none found)
Dashboard row 17: DELETED
ZZINTEG rows remaining: 0
```

Zero test artifacts remain in WP (publish/draft) or dashboard_stories. [VERIFIED]
