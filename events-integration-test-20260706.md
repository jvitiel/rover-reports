# Events EN→ES Integration Test — 2026-07-07

## Step 1 — Create Test Event via Dashboard Code Path

POST to `localhost:3000/api/events` with title "ZZINTEG-TEST 1783392147", past event_date "2020-01-15", event_location_name "Test Community Center", link_text "Learn More", and description.

Server logs confirm the full code path executed:

```
[Events] Creating WordPress post: "ZZINTEG-TEST 1783392147"
[Parser] Translating 4 fields EN→ES
[Parser] Successfully translated fields EN→ES
[Events] Translated 4 fields EN→ES
[Events] ES post created and linked: 463
[Database] Created event #24: "ZZINTEG-TEST 1783392147"
```

[VERIFIED — journalctl output]

## Step 2 — Round-Trip Verification

### 2a — Push-event response contained es_post_id

EN post_id=462, es_post_id=463, es_status="created". [VERIFIED — server log `ES post created and linked: 463`]

### 2b — dashboard_events.wp_post_id_es populated

```sql
SELECT id, wp_post_id, wp_post_id_es, title FROM dashboard_events WHERE id = 24;
=> 24|462|463|ZZINTEG-TEST 1783392147
```

`wp_post_id_es=463` — stored correctly. [VERIFIED]

### 2c — ES post has Spanish content + Polylang-linked

**ES post 463 content:**

| Field | Value |
|-------|-------|
| post_title | ZZINTEG-TEST 1783392147 |
| post_content | Evento de prueba de integración para verificación de ida y vuelta EN-ES. Seguro para eliminar. |
| event_location_name | Centro Comunitario de Prueba |
| link_text | Aprender más |
| event_date (verbatim) | 2020-01-15 |

Content, location_name, and link_text are all Spanish translations. Title preserved as identifier (translator kept the test marker). event_date copied verbatim from EN. [VERIFIED]

**Polylang linkage:**

```
pll_get_post(462, 'es') = 463  ✓
pll_get_post(463, 'en') = 462  ✓
pll_get_post_language(462) = 'en'
pll_get_post_language(463) = 'es'
EN term: 30 | a:2:{s:2:"en";i:462;s:2:"es";i:463;}
ES term: 30 | a:2:{s:2:"en";i:462;s:2:"es";i:463;}
```

Bidirectional link via shared post_translations term 30. [VERIFIED]

### 2d — EN event created normally

EN post 462: title "ZZINTEG-TEST 1783392147", post_status "publish", post_type "shelter_event". Dashboard response `wp_synced: true`. [VERIFIED]

## Step 3 — Edit Re-Translation

PUT to `localhost:3000/api/events/24` with updated title "ZZINTEG-TEST Updated Adoption Fair", new description, new event_location_name "Updated Library Center".

Server logs:

```
[Parser] Translating 4 fields EN→ES
[Parser] Successfully translated fields EN→ES
[Events] Re-translated 4 fields EN→ES for edit
[Events] ES post 463 updated
```

[VERIFIED — journalctl output]

**Post-edit content comparison:**

| Field | EN 462 (updated) | ES 463 (re-translated) |
|-------|-------------------|----------------------|
| post_title | ZZINTEG-TEST Updated Adoption Fair | ZZINTEG-TEST Feria de Adopción Actualizada |
| post_content | Updated: Come meet wonderful animals... | Actualizado: Ven a conocer a maravillosos animales... |
| event_location_name | Updated Library Center → Centro de la Biblioteca Actualizado | Centro de la Biblioteca Actualizado |
| link_text | Learn More | Aprender Más |

ES post content updated with fresh Spanish translations matching the edited EN content. [VERIFIED]

## Step 4 — Cleanup

### WP posts trashed

```
Success: Updated post 462.  (EN → trash)
Success: Updated post 463.  (ES → trash)
```

Both confirmed `post_status=trash`. Zero ZZINTEG posts in publish or draft. [VERIFIED]

### Dashboard row deleted

```sql
DELETE FROM dashboard_events WHERE id = 24;
=> 0 ZZINTEG rows remaining
```

[VERIFIED]
