# Stories Backfill Reconciliation — 2026-07-07

## 6 Targets (dashboard_stories WHERE status='published')

| Local ID | Title | wp_post_id | wp_post_id_es | EN Exists | Type | Status | Classification | ES Post | Evidence |
|----------|-------|-----------|--------------|-----------|------|--------|---------------|---------|----------|
| 3 | Cheshire Found His People | 223 | NULL | YES | shelter_story | publish | **ADOPT** | 365 "Cheshire Encontró a Su Gente" | pll(223,es)=365, pll(365,en)=223, shared term 22 |
| 4 | Pets Alive to the Rescue! | 237 | NULL | YES | shelter_story | publish | **ADOPT** | 364 "¡Pets Alive al Rescate!" | pll(237,es)=364, pll(237,en)=237→skip, pll(364,en)=237, shared term 21 |
| 5 | Time for Tinka | 266 | NULL | YES | shelter_story | publish | **ADOPT** | 363 "El Momento de Tinka" | pll(266,es)=363, pll(363,en)=266, shared term 20 |
| 6 | Love for Louise | 288 | NULL | YES | shelter_story | publish | **ADOPT** | 362 "Amor para Louise" | pll(288,es)=362, pll(362,en)=288, shared term 19 |
| 7 | Better Days for B and B | 291 | NULL | YES | shelter_story | publish | **ADOPT** | 361 "Mejores Días para B y B" | pll(291,es)=361, pll(361,en)=291, shared term 18 |
| 16 | Test story | 448 | NULL | YES | shelter_story | publish | **CREATE** | — | pll(448,es)=0 |

[VERIFIED — all pll lookups via wp eval on production]

## Classification Tally

- **ADOPT: 5** (IDs 3, 4, 5, 6, 7) — all 5 hand-made ES stories (361–365) already Polylang-linked to their EN counterparts. Backfill route will detect existing link via `pll_get_post`, return `adopted`, and store the es_post_id into `wp_post_id_es`.
- **CREATE: 1** (ID 16, "Test story" wp 448) — no linked ES, no orphan match. Backfill route will translate 3 fields, create ES post, link via Polylang, return `created` + `es_post_id`.
- **ORPHAN: 0**
- **BLOCKED: 0**

## Able-to-Fail Statement

The orphan guard queries: `get_posts({ post_type: shelter_story, post_status: any, title: <title_es>, tax_query: language=es })` then checks each candidate for `!pll_get_post(candidate, 'en')`. If an unlinked ES story with an exact title match existed, it would return `orphan_conflict` (409) instead of creating a duplicate.

For the 5 ADOPT targets, the orphan query never fires — `pll_get_post` returns the linked ES post first, short-circuiting to `adopted`. For the 1 CREATE target ("Test story"), the orphan query fires against the title_es (the translated title). No unlinked ES shelter_story exists with that title → CREATE proceeds. [VERIFIED — 0 unlinked ES stories system-wide, so no orphan match is possible for any target]

## System Context

```
Total ES shelter_story posts: 5
Linked: 5 (361→291, 362→288, 363→266, 364→237, 365→223)
Unlinked: 0
```

Zero unlinked ES stories system-wide. No orphan risk for any target. [VERIFIED]
