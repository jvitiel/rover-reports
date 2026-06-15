# SOP 3 — UNIQUE index on animal_bios.shelter_code

**Date:** 2026-06-15 16:05 UTC
**Scope:** Schema-only. No data writes, no application code.

## Backup confirmation

- `/home/rover/shelter-pre-drafts-2026-06-15.db` — 21,295,104 bytes, 15:30 UTC
- `/tmp/shelter-pre-drafts-2026-06-15.db` — 21,295,104 bytes, 15:30 UTC

## Step 1 — CREATE UNIQUE INDEX

```sql
CREATE UNIQUE INDEX idx_bio_shelter_code_unique ON animal_bios(shelter_code);
```
Succeeded with no errors (no duplicate shelter_codes).

## Step 2 — Verify

### PRAGMA index_list(animal_bios) after CREATE:
```
0|idx_bio_shelter_code_unique|1|c|0   ← UNIQUE
1|idx_bio_shelter_code|0|c|0          ← old non-unique (to be dropped)
2|sqlite_autoindex_animal_bios_1|1|pk|0
```

### Dup check: empty (no duplicates)

## Step 3 — DROP old non-unique index

```sql
DROP INDEX IF EXISTS idx_bio_shelter_code;
```

### PRAGMA index_list(animal_bios) after DROP:
```
0|idx_bio_shelter_code_unique|1|c|0   ← UNIQUE ✅
1|sqlite_autoindex_animal_bios_1|1|pk|0
```

Old index gone. Only unique index + PK auto-index remain.

## Step 4 — Service restart

- `systemctl restart shelter-app` → active
- `GET /api/animals` → responds with valid JSON

**Rollback if needed:** `DROP INDEX IF EXISTS idx_bio_shelter_code_unique; CREATE INDEX idx_bio_shelter_code ON animal_bios(shelter_code);`
