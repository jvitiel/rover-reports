# Adoption Pending — Phase A1: Schema Migration

**Date:** 2026-05-28 17:54 ET
**Scope:** Schema-only migration on shelter.db. No source code changes.

## Pre-Migration Baseline

- Row count: 609
- Backup: `/home/shelter/backups/shelter.db.pre-adoption-pending-20260528-215350` (15,167,488 bytes, matches live DB) [VERIFIED]

## Migration Applied

```sql
ALTER TABLE animal_metadata ADD COLUMN adoption_pending INTEGER DEFAULT 0;
```

Silent success (no errors).

## Post-Migration Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Column in schema | `adoption_pending INTEGER DEFAULT 0` | Present | ✓ [VERIFIED] |
| Row count | 609 | 609 | ✓ [VERIFIED] |
| SUM(adoption_pending) | 0 | 0 | ✓ [VERIFIED] |
| MIN(adoption_pending) | 0 | 0 | ✓ [VERIFIED] |
| MAX(adoption_pending) | 0 | 0 | ✓ [VERIFIED] |
| Dashboard fetch (upsert exercise) | Clean return | Clean return | ✓ [VERIFIED] |
| SUM post-upsert | 0 | 0 | ✓ [VERIFIED] — CASE 1 safe confirmed in practice |
| shelter-app status | active (running) | active (running) since 20:29 UTC | ✓ [VERIFIED] |

## Final Schema

```sql
CREATE TABLE animal_metadata (
  shelter_code TEXT PRIMARY KEY,
  animal_id TEXT,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  breed TEXT,
  age TEXT,
  date_of_birth TEXT,
  sex TEXT,
  fiv_status TEXT,
  felv_status TEXT,
  updated_at TEXT NOT NULL,
  adoption_pending INTEGER DEFAULT 0
);
CREATE INDEX idx_animal_metadata_animal_id ON animal_metadata(animal_id);
```

## Notes

- No source files modified. No git commits.
- Upsert in `shelterManagerService.ts` does not include `adoption_pending` in its SET clause, so SM sync will never overwrite manual adoption_pending flags. This was pre-verified in the upsert audit report (report-20260528-214153-animal-metadata-upsert-verification.md).
- Phase A2 (backend endpoint + DECISIONS.md) and A3 (frontend UI) ship independently.
