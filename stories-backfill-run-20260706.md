# Stories ES Backfill Run — 2026-07-07

## Per-Target Results

| Local ID | wp_post_id | Title | HTTP | Status | es_post_id | Expected | Match | Stored |
|----------|-----------|-------|------|--------|-----------|----------|-------|--------|
| 3 | 223 | Cheshire Found His People | 200 | adopted | 365 | 365 | ✓ | ✓ |
| 4 | 237 | Pets Alive to the Rescue! | 200 | adopted | 364 | 364 | ✓ | ✓ |
| 5 | 266 | Time for Tinka | 200 | adopted | 363 | 363 | ✓ | ✓ |
| 6 | 288 | Love for Louise | 200 | adopted | 362 | 362 | ✓ | ✓ |
| 7 | 291 | Better Days for B and B | 200 | adopted | 361 | 361 | ✓ | ✓ |
| 16 | 448 | Test story | 200 | created | 480 | (new) | ✓ | ✓ |

All 6 targets completed. Zero halts. 5 ADOPT + 1 CREATE. [VERIFIED]

## Final All-6 SELECT

```sql
SELECT id, wp_post_id, wp_post_id_es, title FROM dashboard_stories
WHERE id IN (3,4,5,6,7,16) ORDER BY id;
```

```
3|223|365|Cheshire Found His People
4|237|364|Pets Alive to the Rescue!
5|266|363|Time for Tinka
6|288|362|Love for Louise
7|291|361|Better Days for B and B
16|448|480|Test story
```

All 6 rows have wp_post_id_es populated. 5 match expected ADOPT ids exactly. [VERIFIED]

## Sample Verification

### CREATE: EN 448 ↔ ES 480

```
pll_get_post(448, 'es') = 480     ✓
pll_get_post(480, 'en') = 448     ✓
lang(448) = en, lang(480) = es
shared post_translations term: 42  ✓
ES title: Historia de prueba
ES content: Esta es una prueba para ver si el inglés se traduce al español
ES animal_species: (empty — verbatim copy of EN empty, NOT translated)
ES story_type: adoption (verbatim ✓)
```

Bidirectional link, Spanish content, verbatim meta. [VERIFIED]

### ADOPT: EN 223 ↔ ES 365

```
pll_get_post(223, 'es') = 365     ✓
pll_get_post(365, 'en') = 223     ✓
shared post_translations term: 22  ✓
ES title: Cheshire Encontró a Su Gente
ES content: Cheshire era uno de los gatos más viejos del refugio...
```

Pre-existing hand-made pair. Adopted without creating. [VERIFIED]

### ADOPT: EN 291 ↔ ES 361

```
pll_get_post(291, 'es') = 361     ✓
pll_get_post(361, 'en') = 291     ✓
shared post_translations term: 18  ✓
ES title: Mejores Días para B y B
ES content: El 26 de octubre de 2023, llegó un momento silencioso pero abrumador al refugio...
```

Pre-existing hand-made pair. Adopted without creating. [VERIFIED]

## /es/historias-felices/ Render Check

Production ES stories page renders all 6 stories in Spanish:

```
Historia de prueba                    (ES 480 — CREATE)
Mejores Días para B y B               (ES 361 — ADOPT)
Amor para Louise                      (ES 362 — ADOPT)
El Momento de Tinka                   (ES 363 — ADOPT)
¡Pets Alive al Rescate!               (ES 364 — ADOPT)
Cheshire Encontró a Su Gente          (ES 365 — ADOPT)
```

All 6 visible with Spanish titles. [VERIFIED — curl output from /es/historias-felices/ h3 tags]
