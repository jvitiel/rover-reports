# Events Backfill Reconciliation — 2026-07-07

## Step 1 — Target Identification

9 published dashboard_events with non-null wp_post_id (the WP-pushed, visible events):

```sql
SELECT id, title, event_date, wp_post_id, wp_post_id_es
FROM dashboard_events
WHERE status='published' AND wp_post_id IS NOT NULL
ORDER BY event_date DESC;
```

| Local ID | Title | event_date | wp_post_id | wp_post_id_es |
|----------|-------|------------|------------|---------------|
| 22 | Volunteer Orientation | 2026-07-25 | 438 | NULL |
| 21 | Volunteer Orientation | 2026-07-12 | 437 | NULL |
| 23 | Find Your New Best Friend! | 2026-07-11 | 440 | NULL |
| 20 | Volunteer Orientaton | 2026-06-13 | 371 | NULL |
| 19 | Volunteer Orientaton | 2026-05-31 | 323 | NULL |
| 18 | Volunteer Orientation | 2026-05-09 | 310 | NULL |
| 16 | Volunteer Orientation | 2026-04-11 | 307 | NULL |
| 14 | Test Event | 2026-04-04 | 297 | NULL |
| 13 | Late Winter Bow Wow | 2026-03-19 | 254 | NULL |

Count: 9. All wp_post_id_es are NULL (no backfill has run). [VERIFIED]

11 other rows exist (8 drafts with NULL wp_post_id + 3 drafts with wp_post_id) — excluded from this backfill. [VERIFIED]

## Step 2 — EN Post Existence

All 9 EN posts confirmed to exist in WP as `shelter_event` with `post_status=publish`:

| wp_post_id | WP title | WP event_date | Title match | Date match |
|------------|----------|---------------|-------------|------------|
| 438 | Volunteer Orientation | 2026-07-25 | ✓ | ✓ |
| 437 | Volunteer Orientation | 2026-07-12 | ✓ | ✓ |
| 440 | Find Your New Best Friend! | 2026-07-11 | ✓ | ✓ |
| 371 | Volunteer Orientaton | 2026-06-13 | ✓ | ✓ |
| 323 | Volunteer Orientaton | 2026-05-31 | ✓ | ✓ |
| 310 | Volunteer Orientation | 2026-05-09 | ✓ | ✓ |
| 307 | Volunteer Orientation | 2026-04-11 | ✓ | ✓ |
| 297 | Test Event | 2026-04-04 | ✓ | ✓ |
| 254 | Late Winter Bow Wow | 2026-03-19 | ✓ | ✓ |

Zero blocked targets (no null wp_post_id, no missing/trashed EN posts). [VERIFIED]

## Step 3 — Classification

| Local ID | wp_post_id | Title | Classification | Evidence |
|----------|------------|-------|----------------|----------|
| 22 | 438 | Volunteer Orientation | **CREATE** | pll_get_post(438,'es')=0; no unlinked ES on 2026-07-25 |
| 21 | 437 | Volunteer Orientation | **CREATE** | pll_get_post(437,'es')=0; no unlinked ES on 2026-07-12 |
| 23 | 440 | Find Your New Best Friend! | **CREATE** | pll_get_post(440,'es')=0; no unlinked ES on 2026-07-11 |
| 20 | 371 | Volunteer Orientaton | **CREATE** | pll_get_post(371,'es')=0; no unlinked ES on 2026-06-13 |
| 19 | 323 | Volunteer Orientaton | **ADOPT** | pll_get_post(323,'es')=366; reverse pll_get_post(366,'en')=323; shared term 23; bidirectional link confirmed |
| 18 | 310 | Volunteer Orientation | **CREATE** | pll_get_post(310,'es')=0; no unlinked ES on 2026-05-09 |
| 16 | 307 | Volunteer Orientation | **CREATE** | pll_get_post(307,'es')=0; no unlinked ES on 2026-04-11 |
| 14 | 297 | Test Event | **CREATE** | pll_get_post(297,'es')=0; no unlinked ES on 2026-04-04 |
| 13 | 254 | Late Winter Bow Wow | **CREATE** | pll_get_post(254,'es')=0; no unlinked ES on 2026-03-19 |

[VERIFIED — each classification from pll_get_post + orphan query output]

### Tally

| Classification | Count | Targets |
|---------------|-------|---------|
| CREATE | 8 | 438, 437, 440, 371, 310, 307, 297, 254 |
| ADOPT | 1 | 323 → 366 |
| ORPHAN | 0 | — |
| BLOCKED | 0 | — |

### ADOPT detail (event 323↔366)

```
pll_get_post(323, 'es') = 366
pll_get_post(366, 'en') = 323
pll_get_post_language(323) = 'en'
pll_get_post_language(366) = 'es'
shared post_translations term: 23 | a:2:{s:2:"en";i:323;s:2:"es";i:366;}
```

Bidirectional link confirmed. The backfill route will return `status=adopted, es_post_id=366` for this target (idempotent, no new post created). The dashboard should store `wp_post_id_es=366` for local row 19. [VERIFIED]

## Step 4 — Able-to-Fail Check

The orphan-detection query ran against real data for all 9 targets:

```php
$es_candidates = get_posts(array(
    'post_type'      => 'shelter_event',
    'posts_per_page' => -1,
    'post_status'    => 'any',       // ← the fix from the retest
    'meta_key'       => 'event_date',
    'meta_value'     => $en_event_date,
    'tax_query'      => array(array(
        'taxonomy' => 'language',
        'field'    => 'slug',
        'terms'    => 'es',
    )),
));
foreach ($es_candidates as $cand) {
    if (!pll_get_post($cand->ID, 'en')) {
        // → ORPHAN
    }
}
```

For each of the 9 targets, this query executed with the target's event_date. For the 8 CREATE targets, the query returned 0 es-language candidates on their respective dates. For the ADOPT target (323, date 2026-05-31), the query found ES post 366, but `pll_get_post(366, 'en')=323` (linked), so it was not flagged as orphan — correctly classified as ADOPT via the earlier `pll_get_post(323,'es')=366` check.

**If** an unlinked ES event existed on any of these dates (e.g., a hand-created ES event on 2026-07-11 not linked to anything), the `!pll_get_post($cand->ID, 'en')` check would return true, and the target would be classified ORPHAN. The `post_status => 'any'` ensures draft/pending orphans are also caught (validated in the retest report). None of the 9 triggered this path because no unlinked ES events exist on any of their dates. [VERIFIED]

## Step 5 — System Orphan Context

```
Total ES shelter_events: 1
Linked (have EN counterpart): 1  (post 366 → EN 323)
Unlinked (orphans): 0
```

The entire ES shelter_event population consists of exactly 1 post (366), and it is properly linked. Zero system-wide orphans. [VERIFIED]
