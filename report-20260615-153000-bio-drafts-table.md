# SOP 3 Stage 1 — CREATE TABLE animal_bio_drafts

**Date:** 2026-06-15 15:30 UTC
**Scope:** Schema-only. No application code, no writes to new table, no changes to existing tables.

## Step A — Backup

```
Backup method: sqlite3 .backup (online, consistent)
Backup file:   /tmp/shelter-pre-drafts-2026-06-15.db
Copy:          /home/rover/shelter-pre-drafts-2026-06-15.db
Size:          21,295,104 bytes
Live DB size:  21,282,816 bytes
Status:        ✅ Non-zero, same ballpark as live DB
```

Also: today's scheduled backup exists at `/home/shelter/backups/weekly-20260615.tar.gz` (348,714,336 bytes, 03:30 UTC).

## Step B — DDL

```sql
CREATE TABLE animal_bio_drafts (
  id TEXT PRIMARY KEY,
  shelter_code TEXT NOT NULL UNIQUE,
  generated_at TEXT NOT NULL,
  bio_en_long TEXT NOT NULL DEFAULT '',
  bio_es_long TEXT NOT NULL DEFAULT '',
  bio_en_short TEXT NOT NULL DEFAULT '',
  bio_es_short TEXT NOT NULL DEFAULT '',
  promoted_long INTEGER NOT NULL DEFAULT 0,
  promoted_short INTEGER NOT NULL DEFAULT 0,
  last_source TEXT
);
```

Executed against `/home/shelter/shelter-apps/data/shelter.db` as user `shelter`. No errors.

## Step C — Verification

### PRAGMA table_info(animal_bio_drafts)

```
0|id|TEXT|0||1              ← PK
1|shelter_code|TEXT|1||0    ← NOT NULL, UNIQUE
2|generated_at|TEXT|1||0    ← NOT NULL
3|bio_en_long|TEXT|1|''|0   ← NOT NULL DEFAULT ''
4|bio_es_long|TEXT|1|''|0   ← NOT NULL DEFAULT ''
5|bio_en_short|TEXT|1|''|0  ← NOT NULL DEFAULT ''
6|bio_es_short|TEXT|1|''|0  ← NOT NULL DEFAULT ''
7|promoted_long|INTEGER|1|0|0   ← NOT NULL DEFAULT 0
8|promoted_short|INTEGER|1|0|0  ← NOT NULL DEFAULT 0
9|last_source|TEXT|0||0     ← nullable
```

✅ All 10 columns present. Types, NOT NULLs, defaults, PK, and UNIQUE match the DDL exactly.

### Row counts

| Table | Count |
|-------|-------|
| animal_bio_drafts | 0 |
| animal_bios | 115 |

### animal_bios schema — unchanged

```
0|id|TEXT|0||1
1|generated_at|TEXT|1||0
2|bio_en_long|TEXT|1|''|0
3|bio_es_long|TEXT|1|''|0
4|status_long|TEXT|1|'draft'|0
5|approved_at_long|TEXT|0||0
6|bio_en_short|TEXT|1|''|0
7|bio_es_short|TEXT|1|''|0
8|status_short|TEXT|1|'draft'|0
9|approved_at_short|TEXT|0||0
10|shelter_code|TEXT|0||0
11|last_source|TEXT|0||0
```

✅ Identical to pre-change schema. No columns added or modified.

### Service restart

- `systemctl restart shelter-app` → active
- `GET /api/animals` → responds with valid JSON
- No errors in startup

**Rollback if needed:** `DROP TABLE animal_bio_drafts;` — zero data loss (table is empty/inert).
