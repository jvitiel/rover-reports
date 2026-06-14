# animal_bios.last_source Migration — Scope & Design

**Date:** 2026-06-14 13:31 ET  
**Type:** Read-only migration scoping  
**Status:** No changes made  

---

## PART 1 — THE BACKFILL

### 1a. Backfill query and "current source" rule

**The rule:** `last_source` = the most recent GENERATION-type history row (by rowid), excluding status-only rows. Status-only sources to exclude: `approve_long`, `approve_short`, `translate_es_long`, `translate_es_short`, `delete`.

**Rationale:** For the label computation, we care whether the CONTENT of the bio is generic vs real. Approving a generic bio doesn't make it real — the content is unchanged. The generation-type source (`generic`, `full_generate`, `sm_generate`, `sm_copy`, `manual_edit_long`, `regenerate_long`, `regenerate_short`, `backfill`) reflects what produced the current content.

**Backfill query:**

```sql
UPDATE animal_bios SET last_source = (
  SELECT h.source
  FROM animal_bios_history h
  WHERE h.shelter_code = animal_bios.shelter_code
    AND h.source NOT IN ('approve_long', 'approve_short', 'translate_es_long', 'translate_es_short', 'delete')
  ORDER BY h.rowid DESC
  LIMIT 1
);
```

**Why this works:** 33 of 113 bio rows have a latest history row that is a status change (`approve_long`, `approve_short`, `delete`). Without the exclusion filter, those 33 would get the wrong `last_source`. The exclusion filter correctly looks past status rows to find the generation event. [VERIFIED]

No bio row has ONLY status-type history rows (all 113 have at least one generation-type row). [VERIFIED]

**Distribution the backfill would produce (113 rows):**

| last_source | Count | Meaning |
|-------------|-------|---------|
| `generic` | 50 | Youth generic bio (system-generated template) |
| `backfill` | 27 | Legacy bios imported during initial deployment |
| `full_generate` | 23 | GPT-4o generated from caregiver profile |
| `sm_generate` | 3 | GPT-4o generated from SM ANIMALCOMMENTS |
| `sm_copy` | 3 | Verbatim copy of SM ANIMALCOMMENTS |
| `regenerate_long` | 3 | GPT-4o regeneration of long bio |
| `manual_edit_long` | 3 | Human-edited long bio |
| `regenerate_short` | 1 | GPT-4o regeneration of short bio |
| **TOTAL** | **113** | |

[VERIFIED — query run against live data]

**Ambiguous cases:** None found. The `backfill` source (27 rows) represents pre-history bios imported during initial schema setup — these are real bios (not generic) and should be treated as such by the label computation. `last_source = 'backfill'` → classified as REAL. [VERIFIED]

### 1b. Total rows and orphans

- **Total rows in animal_bios:** 113 [VERIFIED]
- **Rows with no history at all (orphans):** 0 [VERIFIED — LEFT JOIN found no unmatched rows]
- **Distinct shelter_codes in history:** 114 (one code has history but no current bio — result of a `delete`) [VERIFIED]

All 113 bio rows have at least one generation-type history row. No special handling needed for orphans.

---

## PART 2 — WRITE-PATHS THAT MUST SET last_source

### 2c. Complete enumeration of bio write paths

#### Content-changing writes (MUST set last_source):

| # | Function | File:Line | Called from (server.ts) | source value for last_source |
|---|----------|-----------|------------------------|------------------------------|
| 1 | `saveAnimalBio()` | localDatabase.ts:1348 | L2049 (sm_copy new bio) | `'sm_copy'` |
| 2 | `saveAnimalBio()` | localDatabase.ts:1348 | L2133 (generate) | `'full_generate'` or `'sm_generate'` |
| 3 | `saveAnimalBio()` | localDatabase.ts:1348 | L11326 (generic job, scheduled) | `'generic'` |
| 4 | `saveAnimalBio()` | localDatabase.ts:1348 | L11382 (generic job, API trigger) | `'generic'` |
| 5 | `updateAnimalBioLong()` | localDatabase.ts:1406 | L2045 (sm_copy update existing) | `'sm_copy'` |
| 6 | `updateAnimalBioLong()` | localDatabase.ts:1406 | L2212 (regenerate long) | `'regenerate_long'` |
| 7 | `updateAnimalBioLong()` | localDatabase.ts:1406 | L2259 (manual edit long) | `'manual_edit_long'` |
| 8 | `updateAnimalBioShort()` | localDatabase.ts:1422 | L2214 (regenerate short) | `'regenerate_short'` |
| 9 | `updateAnimalBioShort()` | localDatabase.ts:1422 | L2285 (manual edit short) | `'manual_edit_short'` |

#### Status-only writes (must NOT change last_source):

| # | Function | File:Line | Called from (server.ts) | Why no change |
|---|----------|-----------|------------------------|---------------|
| 10 | `approveAnimalBioLong()` | localDatabase.ts:1462 | L2364 | Status change only — bio content unchanged |
| 11 | `approveAnimalBioShort()` | localDatabase.ts:1480 | L2397 | Status change only — bio content unchanged |
| 12 | `updateAnimalBioEsLong()` | localDatabase.ts:1438 | L2312 | Spanish translation — doesn't change English source |
| 13 | `updateAnimalBioEsShort()` | localDatabase.ts:1450 | L2338 | Spanish translation — doesn't change English source |
| 14 | `deleteAnimalBio()` | localDatabase.ts:1502 | L2423 | Row is deleted — no bio row to carry last_source |

[ALL VERIFIED]

### 2d. Single funnel or multiple?

**Two funnel points:**

1. **`saveAnimalBio()`** — handles all INSERT (delete-then-insert pattern). Called with `historyMeta` that includes `source`. **This is the single INSERT path.** [VERIFIED]

2. **`updateAnimalBioLong()` / `updateAnimalBioShort()`** — handles content UPDATE. Called with `historyMeta` that includes `source`. **These are the UPDATE paths.** [VERIFIED]

**The source value is already available** at both funnel points via `historyMeta.source`. The migration just needs each function to also write `historyMeta.source` to `last_source` on the `animal_bios` row.

**Drift risk is LOW** because:
- All content-changing writes (#1–#9) pass `historyMeta` with a `source` field
- All status-only writes (#10–#14) either don't touch content columns or delete the row
- No code writes directly to `animal_bios` outside these functions (confirmed by grep) [VERIFIED]

Exception: Lines 235–238 in `initializeDatabase()` do one-time migration `UPDATE` statements on `animal_bios` during schema upgrades. These are legacy migration code that doesn't run on current schema. Not a drift risk. [VERIFIED]

### 2e. Status-only paths and last_source

**Critical confirmation:** approve/translate paths must NOT overwrite `last_source`.

| Function | Currently writes to history | Would wrongly set last_source if naively added? |
|----------|-----------------------------|------------------------------------------------|
| `approveAnimalBioLong()` | `source: 'approve_long'` to history | **YES** — would overwrite `generic` with `approve_long`, making a generic bio look real |
| `approveAnimalBioShort()` | `source: 'approve_short'` to history | **YES** — same risk |
| `updateAnimalBioEsLong()` | `source: 'translate_es_long'` to history | **YES** — would overwrite with `translate_es_long` |
| `updateAnimalBioEsShort()` | `source: 'translate_es_short'` to history | **YES** — same risk |

**Solution:** Only set `last_source` in `saveAnimalBio()` and `updateAnimalBioLong()`/`updateAnimalBioShort()`. Do NOT set it in approve/translate/delete functions. These functions don't take `historyMeta` as a parameter (approve/translate hard-code their history source internally), so they naturally DON'T touch `last_source` unless we explicitly add it. [VERIFIED]

---

## PART 3 — SCHEMA & SAFETY

### 3f. ALTER TABLE approach

SQLite supports `ALTER TABLE ... ADD COLUMN` without table rebuild, as long as the column has a default value or is nullable.

```sql
ALTER TABLE animal_bios ADD COLUMN last_source TEXT;
```

- Nullable (no `NOT NULL`), default `NULL`
- No table rebuild required
- Existing rows get `NULL` until backfill runs
- The existing codebase pattern uses `try { db.exec('ALTER TABLE ... ADD COLUMN ...'); } catch {}` to make migrations idempotent

[VERIFIED — 15 prior ADD COLUMN migrations in localDatabase.ts use this exact pattern]

### 3g. Backup mechanism

**Script:** `/home/shelter/scripts/backup-sqlite.sh`

```bash
#!/bin/bash
# Daily SQLite backup script for shelter databases
SOURCE_DIR="/home/shelter/shelter-apps/data"
BACKUP_DIR="/home/shelter/backups"
RETENTION_DAYS=14
```

**Invocation before migration:**
```bash
sudo -u shelter /home/shelter/scripts/backup-sqlite.sh
```

This creates a timestamped `.backup` copy of `shelter.db` in `/home/shelter/backups/`. The migration step should invoke this first. [VERIFIED]

### 3h. Migration runner pattern

**There is NO migration framework.** Schema changes are applied inline in `initializeDatabase()` (localDatabase.ts), called at app startup. The pattern:

```typescript
// localDatabase.ts:226-233 — example from prior migration
try { db.exec(`ALTER TABLE animal_bios ADD COLUMN bio_en_long TEXT NOT NULL DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE animal_bios ADD COLUMN bio_es_long TEXT NOT NULL DEFAULT ''`); } catch {}
// ... etc.
```

The `try/catch {}` makes each migration idempotent — if the column already exists, the ALTER fails silently and the app continues. This runs on every app startup.

**Prior schema changes follow this exact pattern:** Lines 117-119 (behavior_notes columns), 146 (behavior_notes q1-q10), 168 (caregiver), 226-233 (animal_bios long/short split), 358-359 (animal_metadata FIV/FeLV). All are `try { ALTER TABLE ADD COLUMN } catch {}` inside `initializeDatabase()`. [VERIFIED]

**The backfill** (populating last_source from history) should also run in `initializeDatabase()`, guarded by a check (e.g., only run if any last_source is NULL).

---

## PART 4 — LABEL CONSUMPTION

### 4i. The predicate and history-join elimination

**Once `last_source` exists on `animal_bios`:**

```typescript
// At the label-computation site (server.ts ~L1202):
const isGeneric = bio && bio.lastSource === 'generic';
const isApprovedReal = bio && !isGeneric &&
  (bio.statusLong === 'approved' || bio.statusShort === 'approved');
```

**This removes the need for the history join.** Currently, the only way to determine if a bio is generic requires:

```sql
SELECT h.source
FROM animal_bios_history h
WHERE h.shelter_code = ?
  AND h.source NOT IN ('approve_long', 'approve_short', 'translate_es_long', 'translate_es_short', 'delete')
ORDER BY h.rowid DESC
LIMIT 1
```

...which is a per-animal sub-query or join. With `last_source` denormalized onto the bio row, it's a single column read — O(1) instead of O(history-depth). [VERIFIED]

**The `backfill` source (27 rows):** Under this predicate, `last_source = 'backfill'` ≠ `'generic'`, so backfill bios are classified as REAL. This is correct — they're pre-history bios that contain actual content, not generic templates. [VERIFIED]

**Complete classification:**

| last_source value | isGeneric? | Label effect |
|-------------------|-----------|--------------|
| `generic` | YES | Bio does NOT count as "approved real" |
| `full_generate` | NO | Bio IS "approved real" if status approved |
| `sm_generate` | NO | Same |
| `sm_copy` | NO | Same |
| `regenerate_long` | NO | Same |
| `regenerate_short` | NO | Same |
| `manual_edit_long` | NO | Same |
| `manual_edit_short` | NO | Same |
| `backfill` | NO | Same |

---

## Summary: Migration Steps (for implementation, NOT now)

1. Backup: `sudo -u shelter /home/shelter/scripts/backup-sqlite.sh`
2. Schema: Add `try { db.exec('ALTER TABLE animal_bios ADD COLUMN last_source TEXT'); } catch {}` to `initializeDatabase()` in localDatabase.ts
3. Backfill: Add idempotent backfill in `initializeDatabase()` — populate `last_source` from history for any row where `last_source IS NULL`
4. Write-path: Update `saveAnimalBio()` and `updateAnimalBioLong()`/`updateAnimalBioShort()` to write `historyMeta.source` to `last_source`
5. Do NOT update `approveAnimalBioLong/Short()`, `updateAnimalBioEsLong/Short()`, or `deleteAnimalBio()` — these must NOT change `last_source`
6. Read-path: Update `rowToAnimalBio()` to include `lastSource` in the returned AnimalBio object
7. Type: Add `lastSource?: string` to the AnimalBio interface in types.ts

---

*Report generated by Rover. Read-only scoping — no changes made.*
