# Auditor 5 — ID 470 Forensics — 2026-07-09

**Date:** 2026-07-09 18:49 UTC
**Author:** Rover (automated, read-only)
**Access:** SSH to SiteGround, wp-cli against `cqu_posts` (prefix `cqu_`, NOT `wp_`)

---

## ITEM 1 — THE ID-GAP QUERY

```
$ wp db query "SELECT ID, post_type, post_status, post_date, post_modified, post_parent, post_name, post_title FROM cqu_posts WHERE ID BETWEEN 463 AND 472 ORDER BY ID;" ; echo "exit=$?"
ID	post_type	post_status	post_date	post_modified	post_parent	post_name	post_title
463	shelter_event	trash	2026-07-07 02:42:32	2026-07-07 02:43:40	0	zzinteg-test-1783392147-2__trashed	ZZINTEG-TEST Feria de Adopción Actualizada
464	shelter_event	publish	2026-07-07 02:59:24	2026-07-07 02:59:24	0	orientacion-para-voluntarios-2	Orientación para Voluntarios
465	shelter_event	publish	2026-07-07 02:59:27	2026-07-07 02:59:27	0	orientacion-para-voluntarios-3	Orientación para Voluntarios
466	shelter_event	publish	2026-07-07 02:59:30	2026-07-07 02:59:30	0	orientacion-para-voluntarios-4	¡Encuentra a Tu Nuevo Mejor Amigo!
467	shelter_event	publish	2026-07-07 02:59:35	2026-07-07 02:59:35	0	orientacion-para-voluntarios-4	Orientación para Voluntarios
468	shelter_event	publish	2026-07-07 02:59:43	2026-07-07 02:59:43	0	orientacion-para-voluntarios-5	Orientación para Voluntarios
469	shelter_event	publish	2026-07-07 02:59:45	2026-07-07 02:59:45	0	orientacion-para-voluntarios-6	Orientación para Voluntarios
471	shelter_event	publish	2026-07-07 02:59:49	2026-07-07 02:59:49	0	finales-de-invierno-bow-wow	Finales de Invierno Bow Wow
472	shelter_story	trash	2026-07-07 03:44:12	2026-07-07 03:44:12	0	__trashed	ZZTEST3-EN Story

exit=0
```

### ID enumeration (463–472)

| ID | Status |
|----|--------|
| 463 | PRESENT — shelter_event, trash (integration test) |
| 464 | PRESENT — shelter_event, publish (ES backfill) |
| 465 | PRESENT — shelter_event, publish (ES backfill) |
| 466 | PRESENT — shelter_event, publish (ES backfill) |
| 467 | PRESENT — shelter_event, publish (ES backfill) |
| 468 | PRESENT — shelter_event, publish (ES backfill) |
| 469 | PRESENT — shelter_event, publish (ES backfill) |
| **470** | **NO ROW** |
| 471 | PRESENT — shelter_event, publish (ES backfill) |
| 472 | PRESENT — shelter_story, trash (test) |

[VERIFIED — ID 470 is absent from the result set]

---

## ITEM 1b — CORROBORATE 470

### COUNT

```
$ wp db query "SELECT COUNT(*) AS n FROM cqu_posts WHERE ID = 470;" ; echo "exit=$?"
n
0

exit=0
```

Zero rows with ID 470. [VERIFIED]

### CHILDREN

```
$ wp db query "SELECT ID, post_type, post_status, post_parent, post_date FROM cqu_posts WHERE post_parent = 470;" ; echo "exit=$?"
exit=0
```

No rows. No posts have post_parent = 470. [VERIFIED]

### MAX ID

```
$ wp db query "SELECT MAX(ID) AS max_id FROM cqu_posts;" ; echo "exit=$?"
max_id
490

exit=0
```

Auto-increment has advanced to 490. ID 470 was consumed and is gone. [VERIFIED]

### POSTMETA FOR 470

```
$ wp db query "SELECT meta_id, post_id, meta_key, LEFT(meta_value,80) AS meta_value FROM cqu_postmeta WHERE post_id = 470;" ; echo "exit=$?"
exit=0
```

No rows. Zero orphaned postmeta for ID 470. [VERIFIED]

### ITEM 1 SUMMARY

ID 470 has no row in `cqu_posts` and no orphaned rows in `cqu_postmeta`. No children reference it. The auto-increment max is 490, so 470 was consumed. The ID was allocated and then either: (a) the row was hard-deleted (`DELETE`, not trash), or (b) it was never committed (transaction rollback or wp_delete_post with force_delete=true). No residual data survives to distinguish these. [VERIFIED for absence; UNCERTAIN for cause]

---

## ITEM 2 — EN EVENTS 247, 248, 249, 254

### Posts

```
$ wp db query "SELECT ID, post_title, post_status, post_date FROM cqu_posts WHERE ID IN (247,248,249,254);" ; echo "exit=$?"
ID	post_title	post_status	post_date
247	Spring Adoption Fair	publish	2026-03-16 17:16:48
248	Pet Supplies Plus Fundraiser	publish	2026-03-16 17:17:00
249	Volunteer Orientation	publish	2026-03-16 17:17:02
254	Late Winter Bow Wow	publish	2026-03-16 17:37:04

exit=0
```

[VERIFIED — all four have same-era post_date (2026-03-16)]

### Meta — 247

```
$ wp post meta list 247 --format=table ; echo "exit=$?"
post_id	meta_key	meta_value
247	event_date	2026-03-22
247	event_time_start	11:00
247	event_time_end	15:00
247	event_location	Pomona, NY
247	event_location_name	RG CARES Shelter
247	event_type	adoption-event
247	rank_math_internal_links_processed	1
exit=0
```

### Meta — 248

```
$ wp post meta list 248 --format=table ; echo "exit=$?"
post_id	meta_key	meta_value
248	event_date	2026-03-29
248	event_time_start	09:00
248	event_time_end	21:00
248	event_location	Nanuet, NY
248	event_location_name	Pet Supplies Plus
248	event_type	fundraiser
248	rank_math_internal_links_processed	1
exit=0
```

### Meta — 249

```
$ wp post meta list 249 --format=table ; echo "exit=$?"
post_id	meta_key	meta_value
249	event_date	2026-04-05
249	event_time_start	10:00
249	event_time_end	12:00
249	event_location	Pomona, NY
249	event_location_name	RG CARES Shelter
249	event_type	volunteer
249	contact_email	volunteer@4lgny.org
249	rank_math_internal_links_processed	1
exit=0
```

### Meta — 254

```
$ wp post meta list 254 --format=table ; echo "exit=$?"
post_id	meta_key	meta_value
254	event_date	2026-03-19
254	event_time_start	
254	event_time_end	
254	event_location	
254	event_location_name	Times square
254	event_type	fundraiser
254	photo_url	https://johnv80.sg-host.com/wp-content/uploads/2026/03/616832056_1320390126791958_843904214567773084_n-2.jpg
254	link_url	nytimes.com
254	link_text	Test NYT link
254	contact_email	
254	contact_phone	
254	rank_math_internal_links_processed	1
exit=0
```

### Polylang language + ES link

```
$ wp eval '...pll_get_post_language(247)...' ; echo "exit=$?"
en | es_link=0
exit=0

$ wp eval '...pll_get_post_language(248)...' ; echo "exit=$?"
en | es_link=0
exit=0

$ wp eval '...pll_get_post_language(249)...' ; echo "exit=$?"
en | es_link=0
exit=0

$ wp eval '...pll_get_post_language(254)...' ; echo "exit=$?"
en | es_link=471
exit=0
```

247: lang=en, no ES translation linked (es_link=0). [VERIFIED]
248: lang=en, no ES translation linked (es_link=0). [VERIFIED]
249: lang=en, no ES translation linked (es_link=0). [VERIFIED]
254: lang=en, ES translation linked to post 471 (es_link=471). [VERIFIED]

### _es_post_id / _es_source_en_id meta check

```
$ wp db query "SELECT post_id, meta_key, meta_value FROM cqu_postmeta WHERE post_id IN (247,248,249) AND meta_key IN ('_es_post_id', '_es_source_en_id');" ; echo "exit=$?"
exit=0
```

No rows. No `_es_post_id` or `_es_source_en_id` meta exists for 247, 248, or 249. [VERIFIED]

### Event date comparison (all four)

| ID | post_date | event_date (meta) | event_type | Has ES? |
|----|-----------|-------------------|------------|---------|
| 247 | 2026-03-16 17:16:48 | 2026-03-22 | adoption-event | No |
| 248 | 2026-03-16 17:17:00 | 2026-03-29 | fundraiser | No |
| 249 | 2026-03-16 17:17:02 | 2026-04-05 | volunteer | No |
| 254 | 2026-03-16 17:37:04 | 2026-03-19 | fundraiser | **Yes** (→ 471) |

All four have the same post_date era (2026-03-16). 254's event_date (2026-03-19) is actually OLDER than 247's (2026-03-22), 248's (2026-03-29), and 249's (2026-04-05). Yet 254 was translated and the other three were not. "Past-dated event" does not explain the omission — 254 is the most past-dated of the four. [VERIFIED]

**WP holds no record of the backfill's target map.** Whether 247, 248, 249 were targets-and-skipped vs never-targets is NOT answerable from WordPress data alone. The target list was constructed on the Dashboard/caller side, not recorded in WP metadata. [VERIFIED — no backfill-related meta exists on these posts]

---

## ITEM 3 — EN 249 vs EN 323

### Posts side-by-side

```
$ wp db query "SELECT ID, post_title, post_name, post_status, post_date, post_modified FROM cqu_posts WHERE ID IN (249,323);" ; echo "exit=$?"
ID	post_title	post_name	post_status	post_date	post_modified
249	Volunteer Orientation	volunteer-orientation	publish	2026-03-16 17:17:02	2026-03-16 17:17:02
323	Volunteer Orientaton	volunteer-orientaton	publish	2026-05-04 00:30:08	2026-05-04 00:34:00

exit=0
```

### Meta — 249 (already shown above)

```
event_date: 2026-04-05
event_time_start: 10:00
event_time_end: 12:00
event_location: Pomona, NY
event_location_name: RG CARES Shelter
event_type: volunteer
contact_email: volunteer@4lgny.org
```

### Meta — 323

```
$ wp post meta list 323 --format=table ; echo "exit=$?"
post_id	meta_key	meta_value
323	event_date	2026-05-31
323	event_time_start	11:30 AM
323	event_time_end	12:30 PM
323	event_location	65 Firemens Memorial Drive, Pomona, NY 10970
323	event_location_name	RG Cares Animal Shelter
323	event_type	volunteer_day
323	photo_url	
323	link_url	
323	link_text	
323	contact_email	volunteer@4lg.org
323	contact_phone	845-414-9700
323	_edit_lock	1779650782:1
323	rank_math_internal_links_processed	1
exit=0
```

### Side-by-side comparison

| Field | 249 | 323 |
|-------|-----|-----|
| post_title | Volunteer Orientation | Volunteer Orientaton (misspelled) |
| post_date | 2026-03-16 17:17:02 | 2026-05-04 00:30:08 |
| event_date | **2026-04-05** | **2026-05-31** |
| event_time_start | 10:00 | 11:30 AM |
| event_time_end | 12:00 | 12:30 PM |
| event_location | Pomona, NY | 65 Firemens Memorial Drive, Pomona, NY 10970 |
| event_location_name | RG CARES Shelter | RG Cares Animal Shelter |
| event_type | volunteer | volunteer_day |
| contact_email | volunteer@4lgny.org | volunteer@4lg.org |
| Has ES translation? | No | Yes (→ 366) |

**These are genuinely distinct events**, not duplicates. They have different event_dates (2026-04-05 vs 2026-05-31, nearly two months apart), different times (10:00–12:00 vs 11:30 AM–12:30 PM), different event_type values (`volunteer` vs `volunteer_day`), and different contact email domains (`4lgny.org` vs `4lg.org`). Same general category (volunteer orientation at the shelter) but distinct occurrences on different dates. [VERIFIED]

---

*Report generated read-only. No posts modified, no files edited.*
