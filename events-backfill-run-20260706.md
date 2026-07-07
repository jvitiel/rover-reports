# Events ES Backfill Run — 2026-07-07

## Per-Target Results

| Local ID | wp_post_id | Title | Response Status | es_post_id | Classification | Stored |
|----------|------------|-------|----------------|------------|---------------|--------|
| 22 | 438 | Volunteer Orientation | created | 464 | CREATE | ✓ |
| 21 | 437 | Volunteer Orientation | created | 465 | CREATE | ✓ |
| 23 | 440 | Find Your New Best Friend! | created | 466 | CREATE | ✓ |
| 20 | 371 | Volunteer Orientaton | created | 467 | CREATE | ✓ |
| 19 | 323 | Volunteer Orientaton | adopted | 366 | ADOPT | ✓ |
| 18 | 310 | Volunteer Orientation | created | 468 | CREATE | ✓ |
| 16 | 307 | Volunteer Orientation | created | 469 | CREATE | ✓ |
| 14 | 297 | Test Event | created | 470 | CREATE | ✓ |
| 13 | 254 | Late Winter Bow Wow | created | 471 | CREATE | ✓ |

All 9 targets completed. Zero halts. 8 CREATE + 1 ADOPT. All HTTP 200. [VERIFIED]

## Final All-9 SELECT

```sql
SELECT id, wp_post_id, wp_post_id_es, title FROM dashboard_events
WHERE id IN (22,21,23,20,19,18,16,14,13) ORDER BY id;
```

```
13|254|471|Late Winter Bow Wow
14|297|470|Test Event
16|307|469|Volunteer Orientation
18|310|468|Volunteer Orientation
19|323|366|Volunteer Orientaton
20|371|467|Volunteer Orientaton
21|437|465|Volunteer Orientation
22|438|464|Volunteer Orientation
23|440|466|Find Your New Best Friend!
```

All 9 rows have wp_post_id_es populated. [VERIFIED]

## Sample Link + Spanish Checks

### EN 438 ↔ ES 464 (CREATE)

```
EN title: Volunteer Orientation
ES title: Orientación para Voluntarios
ES content: ¿Listo para ser voluntario y ayudar a nuestros residentes del refugio a encontrar sus hogares permanentes?...
ES event_location_name: Refugio de Animales RG Cares
ES event_date: 2026-07-25 (matches EN)
pll_get_post(438,'es') = 464  ✓
pll_get_post(464,'en') = 438  ✓
lang(EN) = en, lang(ES) = es
shared post_translations term: YES (31)
```

[VERIFIED]

### EN 440 ↔ ES 466 (CREATE)

```
EN title: Find Your New Best Friend!
ES title: ¡Encuentra a Tu Nuevo Mejor Amigo!
ES content: Ven a conocer algunos animales adoptables que están buscando hogares amorosos para siempre...
ES event_location_name: Nyack Public Library
ES event_date: 2026-07-11 (matches EN)
pll_get_post(440,'es') = 466  ✓
pll_get_post(466,'en') = 440  ✓
lang(EN) = en, lang(ES) = es
shared post_translations term: YES (33)
```

[VERIFIED]

### EN 254 ↔ ES 471 (CREATE)

```
EN title: Late Winter Bow Wow
ES title: Finales de Invierno Bow Wow
ES content: Ven a ayudarnos a recaudar fondos para los perros en el refugio
ES event_location_name: Times square
ES link_text: Probar enlace NYT
ES event_date: 2026-03-19 (matches EN)
pll_get_post(254,'es') = 471  ✓
pll_get_post(471,'en') = 254  ✓
lang(EN) = en, lang(ES) = es
shared post_translations term: YES (38)
```

[VERIFIED]

### EN 323 ↔ ES 366 (ADOPT)

```
EN title: Volunteer Orientaton
ES title: Orientación para Voluntarios
ES content: ¿Listo para ser voluntario y ayudar a los residentes de nuestro refugio...
ES event_location_name: RG Cares Animal Shelter
ES event_date: 2026-05-31 (matches EN)
pll_get_post(323,'es') = 366  ✓
pll_get_post(366,'en') = 323  ✓
lang(EN) = en, lang(ES) = es
shared post_translations term: YES (23)
```

Pre-existing link from hand-created pair. Route correctly returned `adopted` without creating a duplicate. [VERIFIED]

## /es/eventos/ Render Check

The production Spanish events page at `https://www.fourlegsgoodnynj.org/es/eventos/` now renders:

**Upcoming section ("Próximos Eventos"):**
- **¡Encuentra a Tu Nuevo Mejor Amigo!** (ES 466) — with flyer image, full Spanish description
- **Orientación para Voluntarios** (ES 465, date 2026-07-12) — full Spanish content
- **Orientación para Voluntarios** (ES 464, date 2026-07-25) — full Spanish content

**Past events section:**
- Orientación para Voluntarios (multiple past dates) — all in Spanish
- All rendered with Spanish content, titles, and descriptions

Previously this page showed zero events (the original diagnosis). Now all 3 upcoming + past events render in Spanish. [VERIFIED — curl output shows Spanish titles, descriptions, and the "Próximos Eventos" section populated]
