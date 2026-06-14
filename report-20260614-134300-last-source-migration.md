# animal_bios.last_source Migration — Executed

**Date:** 2026-06-14 13:43 ET  
**Type:** Schema migration + backfill  
**Commit:** `25acf84` — `db: add animal_bios.last_source (backfilled from history), maintained on content writes`  

---

## Backup

```
/home/shelter/backups/shelter-pre-last-source-20260614.db
20,971,520 bytes, owned shelter:shelter
```

Created via `sqlite3 .backup` before any code changes were deployed. [VERIFIED]

## Schema + Backfill (localDatabase.ts, initializeDatabase)

```typescript
// Add last_source column to animal_bios (Track B — bio state model)
try { db.exec(`ALTER TABLE animal_bios ADD COLUMN last_source TEXT`); } catch {}
// Backfill last_source from history for any rows still NULL (idempotent)
db.exec(`
  UPDATE animal_bios SET last_source = (
    SELECT h.source FROM animal_bios_history h
    WHERE h.shelter_code = animal_bios.shelter_code
      AND h.source NOT IN ('approve_long','approve_short','translate_es_long','translate_es_short','delete')
    ORDER BY h.rowid DESC LIMIT 1
  ) WHERE last_source IS NULL
`);
```

## Write-Path Diffs

### saveAnimalBio() — INSERT now includes last_source

```diff
     INSERT INTO animal_bios (
       id, shelter_code,
       bio_en_long, bio_es_long, status_long, approved_at_long,
       bio_en_short, bio_es_short, status_short, approved_at_short,
-      generated_at
-    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
+      generated_at, last_source
+    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   `);
   stmt.run(
     id, shelterCode,
     bio.bioEnLong, bio.bioEsLong, bio.statusLong, bio.approvedAtLong,
     bio.bioEnShort, bio.bioEsShort, bio.statusShort, bio.approvedAtShort,
-    generatedAt
+    generatedAt, historyMeta?.source || null
   );
```

### updateAnimalBioLong() — UPDATE now sets last_source

```diff
     UPDATE animal_bios 
-    SET bio_en_long = ?, bio_es_long = ?, status_long = 'draft', approved_at_long = NULL
+    SET bio_en_long = ?, bio_es_long = ?, status_long = 'draft', approved_at_long = NULL,
+        last_source = COALESCE(?, last_source)
     WHERE id = ?
-  const result = stmt.run(bioEnLong, bioEsLong, id);
+  const result = stmt.run(bioEnLong, bioEsLong, historyMeta?.source || null, id);
```

### updateAnimalBioShort() — same pattern

```diff
     UPDATE animal_bios 
-    SET bio_en_short = ?, bio_es_short = ?, status_short = 'draft', approved_at_short = NULL
+    SET bio_en_short = ?, bio_es_short = ?, status_short = 'draft', approved_at_short = NULL,
+        last_source = COALESCE(?, last_source)
     WHERE id = ?
-  const result = stmt.run(bioEnShort, bioEsShort, id);
+  const result = stmt.run(bioEnShort, bioEsShort, historyMeta?.source || null, id);
```

### Unchanged functions (confirmed by inspection):

- `approveAnimalBioLong()` — no last_source in UPDATE ✓
- `approveAnimalBioShort()` — no last_source in UPDATE ✓
- `updateAnimalBioEsLong()` — no last_source in UPDATE ✓
- `updateAnimalBioEsShort()` — no last_source in UPDATE ✓
- `deleteAnimalBio()` — row deleted, N/A ✓

## Read-Path

```typescript
// rowToAnimalBio() — added:
lastSource: (row.last_source as string) || undefined,

// types.ts AnimalBio interface — added:
lastSource?: string;     // e.g. 'generic', 'full_generate', 'sm_copy', etc.
```

## Verification

### Column exists:
```
PRAGMA table_info(animal_bios) → 11|last_source|TEXT|0||0 ✓
```

### Distribution (113 total):
```
generic          | 50
backfill         | 27
full_generate    | 23
sm_generate      |  3
sm_copy          |  3
regenerate_long  |  3
manual_edit_long |  3
regenerate_short |  1
```
Matches expected values exactly. ✓

### Zero NULLs:
```
SELECT COUNT(*) FROM animal_bios WHERE last_source IS NULL → 0 ✓
```

### Ownership:
```
-rw-r--r-- 1 shelter shelter 20971520 Jun 14 17:43 shelter.db
-rw-r--r-- 1 shelter shelter    32768 Jun 14 17:43 shelter.db-shm
-rw-r--r-- 1 shelter shelter  4593832 Jun 14 17:43 shelter.db-wal
```
All shelter:shelter. ✓

### Service status:
```
Active: active (running) since Sun 2026-06-14 17:42:57 UTC ✓
```

## Deviations

None.

---

*Implemented by Rover.*
