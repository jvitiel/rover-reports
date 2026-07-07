# wp_post_id_es Migration — 2026-07-07

## Apply Path

Added two idempotent `ALTER TABLE ADD COLUMN` statements in `server/src/localDatabase.ts` (lines 479, 506), matching the existing house pattern (`try { ALTER } catch (_) { /* column already exists */ }`). The migration runs on service startup via the app's own better-sqlite3 DB init path.

Applied by: `npm run build` → `sudo systemctl restart shelter-app` → migration ran at startup (`[Database] Initialized SQLite database`). [VERIFIED]

Commit: `d9bb337` — `server/src/localDatabase.ts` only (1 file, 2 insertions).

## PRAGMA table_info — BEFORE

### dashboard_stories (19 columns, cid 0–18)

```
0|id|INTEGER|0||1
1|wp_post_id|INTEGER|0||0
...
18|status|TEXT|0|'published'|0
```

### dashboard_events (18 columns, cid 0–17)

```
0|id|INTEGER|0||1
1|wp_post_id|INTEGER|0||0
...
17|status|TEXT|0|'published'|0
```

[VERIFIED — PRAGMA output captured before restart]

## PRAGMA table_info — AFTER

### dashboard_stories (20 columns, cid 0–19)

```
0|id|INTEGER|0||1
1|wp_post_id|INTEGER|0||0
2|title|TEXT|1||0
3|story_date|TEXT|0||0
4|story_type|TEXT|0|'adoption'|0
5|animal_name|TEXT|0||0
6|animal_species|TEXT|0||0
7|animal_breed|TEXT|0||0
8|story_text|TEXT|0||0
9|link_url|TEXT|0||0
10|link_text|TEXT|0||0
11|photo_1_url|TEXT|0||0
12|photo_2_url|TEXT|0||0
13|photo_layout|TEXT|0|'left'|0
14|featured_on_homepage|INTEGER|0|0|0
15|featured_at|TEXT|0||0
16|published_at|TEXT|0|CURRENT_TIMESTAMP|0
17|updated_at|TEXT|0|CURRENT_TIMESTAMP|0
18|status|TEXT|0|'published'|0
19|wp_post_id_es|INTEGER|0||0
```

`wp_post_id_es`: type=INTEGER, notnull=0, dflt_value=NULL. ✓ [VERIFIED]

### dashboard_events (19 columns, cid 0–18)

```
0|id|INTEGER|0||1
1|wp_post_id|INTEGER|0||0
2|title|TEXT|1||0
3|event_date|TEXT|1||0
4|event_time_start|TEXT|0||0
5|event_time_end|TEXT|0||0
6|event_location|TEXT|0||0
7|event_location_name|TEXT|0||0
8|event_type|TEXT|0|'other'|0
9|description|TEXT|0||0
10|photo_url|TEXT|0||0
11|link_url|TEXT|0||0
12|link_text|TEXT|0||0
13|contact_email|TEXT|0||0
14|contact_phone|TEXT|0||0
15|published_at|TEXT|0|CURRENT_TIMESTAMP|0
16|updated_at|TEXT|0|CURRENT_TIMESTAMP|0
17|status|TEXT|0|'published'|0
18|wp_post_id_es|INTEGER|0||0
```

`wp_post_id_es`: type=INTEGER, notnull=0, dflt_value=NULL. ✓ [VERIFIED]

## Row Count + NULL Checks

| Check | Count |
|-------|-------|
| stories total | **11** (unchanged from before) |
| stories wp_post_id_es IS NOT NULL | **0** |
| events total | **20** (unchanged from before) |
| events wp_post_id_es IS NOT NULL | **0** |

All existing rows have `wp_post_id_es = NULL`. No data was populated. [VERIFIED]

## Service Status

```
$ systemctl is-active shelter-app.service
active
```

Service running cleanly after restart. [VERIFIED]
