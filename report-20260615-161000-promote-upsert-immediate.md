# promoteDraftSize — INSERT ON CONFLICT + IMMEDIATE transaction

**Commit:** `17b235e` — `db: promoteDraftSize uses INSERT ON CONFLICT + immediate transaction (Auditor-ruled), fix comment`
**Scope:** `server/src/localDatabase.ts` only

## Changes

### 1. Transaction mode: DEFERRED → IMMEDIATE
```typescript
// Before:
const txn = database.transaction(() => { ... });
return txn();

// After:
const promoteTxn = database.transaction((sc, sz, expectedAt) => { ... });
return promoteTxn.immediate(shelterCode, size, expectedGeneratedAt);
```
Write lock is now held from BEGIN. Comment updated to match.

### 2. Upsert: SELECT-then-branch → INSERT ON CONFLICT
```sql
-- size='long':
INSERT INTO animal_bios (
  id, generated_at, bio_en_long, bio_es_long, status_long, approved_at_long,
  bio_en_short, bio_es_short, status_short, approved_at_short,
  shelter_code, last_source
) VALUES (?, ?, ?, ?, 'approved', ?, '', '', 'draft', NULL, ?, 'promote_from_draft')
ON CONFLICT(shelter_code) DO UPDATE SET
  bio_en_long = excluded.bio_en_long,
  bio_es_long = excluded.bio_es_long,
  status_long = 'approved',
  approved_at_long = excluded.approved_at_long,
  last_source = 'promote_from_draft'
```
Backed by `idx_bio_shelter_code_unique`. INSERT path sets defaults for unpromoted size. ON CONFLICT updates ONLY the promoted size. Symmetric for size='short'.

### Unchanged
Version check, history write, per-size flag update, conditional delete — all identical.

## Synthetic test (TEST_PROMOTE_0002)

| Step | Action | Result |
|------|--------|--------|
| B1 | Insert draft | ✅ Draft created |
| B2 | Promote long | ✅ **INSERT path** — new animal_bios row: long approved, short empty/draft, last_source='promote_from_draft'. History row written. Draft: promoted_long=1, promoted_short=0. |
| B3 | Version check (wrong timestamp) | ✅ DRAFT_CHANGED, 409, no writes |
| B4 | Promote short | ✅ **ON CONFLICT DO UPDATE path** — existing row updated: short now approved. **Long columns unchanged** (same id `8e9e1c7f...`, same bioEnLong='V2 EN long', same approvedAtLong from B2). Draft DELETED (both flags 1). |
| B5 | Cleanup | ✅ animal_bios: 115 (back to pre-test), animal_bio_drafts: 0 |

No real animal touched. Build clean, service active.
