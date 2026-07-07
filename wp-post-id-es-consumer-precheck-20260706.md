# wp_post_id_es Consumer Pre-Check — 2026-07-07

## dashboard_stories

### SELECTs (positional risk check)

| File:Line | Query | Consumption | Risk |
|-----------|-------|-------------|------|
| localDatabase.ts:2753 | `SELECT * FROM dashboard_stories WHERE id = ?` | `.get(id) as Record<string, unknown>` → `rowToStory(row)` | **SAFE** — column-name-keyed |
| localDatabase.ts:2761 | `SELECT * FROM dashboard_stories ORDER BY published_at DESC` | `.all() as Record<string, unknown>[]` → `.map(rowToStory)` | **SAFE** — column-name-keyed |
| localDatabase.ts:2771 | `SELECT * FROM dashboard_stories WHERE status = 'published'` | `.all() as Record<string, unknown>[]` → `.map(rowToStory)` | **SAFE** — column-name-keyed |
| localDatabase.ts:2815 | `SELECT COUNT(*) as count FROM dashboard_stories WHERE ...` | `.get() as { count: number }` | **SAFE** — named aggregate |
| localDatabase.ts:2822 | `SELECT id FROM dashboard_stories WHERE ...` | `.all() as { id: number }[]` | **SAFE** — named column |
| localDatabase.ts:2865 | `SELECT * FROM dashboard_stories WHERE featured_on_homepage = 1 ...` | `.all() as Record<string, unknown>[]` → `rowToStory` | **SAFE** — column-name-keyed |

[VERIFIED — all SELECT * results cast to `Record<string, unknown>` and consumed via `rowToStory()` which accesses columns by name: `row.id`, `row.wp_post_id`, `row.title`, etc.]

`rowToStory` signature (localDatabase.ts:2633):
```typescript
function rowToStory(row: Record<string, unknown>): DashboardStory {
  return {
    id: row.id as number,
    wp_post_id: row.wp_post_id as number | null,
    title: row.title as string,
    // ... all by name
  };
}
```

An extra trailing column (`wp_post_id_es`) will appear in `Record<string, unknown>` but will be ignored by `rowToStory` until it's explicitly added. **No breakage.** [VERIFIED]

### INSERT (column-list check)

| File:Line | Query | Risk |
|-----------|-------|------|
| localDatabase.ts:2663 | `INSERT INTO dashboard_stories (wp_post_id, title, story_date, ..., status) VALUES (?, ?, ?, ..., ?)` | **SAFE** — explicit column list (18 named columns, 18 placeholders) |

[VERIFIED — INSERT names all columns explicitly; adding `wp_post_id_es` to the table will not affect this INSERT until it's explicitly added to the column list]

### UPDATE (column-list check)

The `updateStory` function (localDatabase.ts:~2700) uses `UPDATE dashboard_stories SET wp_post_id = ?, title = ?, ...` with explicit column names. **SAFE.** [VERIFIED]

### Schema introspection

No `PRAGMA table_info(dashboard_stories)` calls exist anywhere in the codebase. [VERIFIED — grep returned zero matches]

---

## dashboard_events

### SELECTs (positional risk check)

| File:Line | Query | Consumption | Risk |
|-----------|-------|-------------|------|
| localDatabase.ts:2996 | `SELECT * FROM dashboard_events WHERE id = ?` | `.get(id) as Record<string, unknown>` → `rowToEvent(row)` | **SAFE** — column-name-keyed |
| localDatabase.ts:3007 | `SELECT * FROM dashboard_events ORDER BY event_date DESC` | `.all() as Record<string, unknown>[]` → `.map(rowToEvent)` | **SAFE** — column-name-keyed |
| localDatabase.ts:3014 | `SELECT * FROM dashboard_events WHERE status = 'published'` | `.all() as Record<string, unknown>[]` → `.map(rowToEvent)` | **SAFE** — column-name-keyed |
| localDatabase.ts:3028 | `SELECT * FROM dashboard_events WHERE status = 'published' AND event_date >= ?` | `.all() as Record<string, unknown>[]` → `.map(rowToEvent)` | **SAFE** — column-name-keyed |
| localDatabase.ts:3046 | `SELECT * FROM dashboard_events WHERE status = 'published' AND event_date < ?` | `.all() as Record<string, unknown>[]` → `.map(rowToEvent)` | **SAFE** — column-name-keyed |

[VERIFIED — all SELECT * results cast to `Record<string, unknown>` and consumed via `rowToEvent()` which accesses columns by name]

`rowToEvent` signature (localDatabase.ts:2880):
```typescript
function rowToEvent(row: Record<string, unknown>): DashboardEvent {
  return {
    id: row.id as number,
    wp_post_id: row.wp_post_id as number | null,
    title: row.title as string,
    // ... all by name
  };
}
```

**No breakage.** [VERIFIED]

### INSERT (column-list check)

| File:Line | Query | Risk |
|-----------|-------|------|
| localDatabase.ts:2909 | `INSERT INTO dashboard_events (wp_post_id, title, event_date, ..., status) VALUES (?, ?, ?, ..., ?)` | **SAFE** — explicit column list (17 named columns, 17 placeholders) |

[VERIFIED — INSERT names all columns explicitly]

### UPDATE (column-list check)

The `updateEvent` function uses `UPDATE dashboard_events SET wp_post_id = ?, title = ?, ...` with explicit column names. **SAFE.** [VERIFIED]

### Schema introspection

No `PRAGMA table_info(dashboard_events)` calls exist anywhere in the codebase. [VERIFIED — grep returned zero matches]

---

## ORM / Migration Framework

No ORM or query-builder framework in use. The codebase uses **raw better-sqlite3** (`database.prepare(...).get()/.all()/.run()`). [VERIFIED]

PRAGMA-based schema introspection exists only for `behavior_notes` (line 17) and `animal_bios` (line 221) — NOT for dashboard_stories or dashboard_events. [VERIFIED]

No migration framework (knex, sequelize, typeorm, prisma, drizzle) is used. Schema changes are inline `ALTER TABLE` or `CREATE TABLE IF NOT EXISTS` statements. [VERIFIED — grep for framework names returned zero matches]

---

## Current Schemas (PRAGMA table_info)

### dashboard_stories (19 columns)

| cid | name | type | notnull | dflt_value | pk |
|-----|------|------|---------|------------|-----|
| 0 | id | INTEGER | 0 | | 1 |
| 1 | wp_post_id | INTEGER | 0 | | 0 |
| 2 | title | TEXT | 1 | | 0 |
| 3 | story_date | TEXT | 0 | | 0 |
| 4 | story_type | TEXT | 0 | 'adoption' | 0 |
| 5 | animal_name | TEXT | 0 | | 0 |
| 6 | animal_species | TEXT | 0 | | 0 |
| 7 | animal_breed | TEXT | 0 | | 0 |
| 8 | story_text | TEXT | 0 | | 0 |
| 9 | link_url | TEXT | 0 | | 0 |
| 10 | link_text | TEXT | 0 | | 0 |
| 11 | photo_1_url | TEXT | 0 | | 0 |
| 12 | photo_2_url | TEXT | 0 | | 0 |
| 13 | photo_layout | TEXT | 0 | 'left' | 0 |
| 14 | featured_on_homepage | INTEGER | 0 | 0 | 0 |
| 15 | featured_at | TEXT | 0 | | 0 |
| 16 | published_at | TEXT | 0 | CURRENT_TIMESTAMP | 0 |
| 17 | updated_at | TEXT | 0 | CURRENT_TIMESTAMP | 0 |
| 18 | status | TEXT | 0 | 'published' | 0 |

[VERIFIED]

New column `wp_post_id_es INTEGER` would become cid 19. [INFERRED]

### dashboard_events (18 columns)

| cid | name | type | notnull | dflt_value | pk |
|-----|------|------|---------|------------|-----|
| 0 | id | INTEGER | 0 | | 1 |
| 1 | wp_post_id | INTEGER | 0 | | 0 |
| 2 | title | TEXT | 1 | | 0 |
| 3 | event_date | TEXT | 1 | | 0 |
| 4 | event_time_start | TEXT | 0 | | 0 |
| 5 | event_time_end | TEXT | 0 | | 0 |
| 6 | event_location | TEXT | 0 | | 0 |
| 7 | event_location_name | TEXT | 0 | | 0 |
| 8 | event_type | TEXT | 0 | 'other' | 0 |
| 9 | description | TEXT | 0 | | 0 |
| 10 | photo_url | TEXT | 0 | | 0 |
| 11 | link_url | TEXT | 0 | | 0 |
| 12 | link_text | TEXT | 0 | | 0 |
| 13 | contact_email | TEXT | 0 | | 0 |
| 14 | contact_phone | TEXT | 0 | | 0 |
| 15 | published_at | TEXT | 0 | CURRENT_TIMESTAMP | 0 |
| 16 | updated_at | TEXT | 0 | CURRENT_TIMESTAMP | 0 |
| 17 | status | TEXT | 0 | 'published' | 0 |

[VERIFIED]

New column `wp_post_id_es INTEGER` would become cid 18. [INFERRED]

---

## Verdict

| Table | Positional SELECT * risk | Column-less INSERT risk | Schema introspection risk | Safe to add? |
|-------|-------------------------|------------------------|--------------------------|-------------|
| dashboard_stories | **None** — all `Record<string, unknown>` + named access | **None** — explicit column list | **None** — no PRAGMA on this table | **YES** ✓ |
| dashboard_events | **None** — all `Record<string, unknown>` + named access | **None** — explicit column list | **None** — no PRAGMA on this table | **YES** ✓ |

[VERIFIED — all consumers use column-name-keyed access; all INSERTs/UPDATEs use explicit column lists; no schema introspection on either table]
