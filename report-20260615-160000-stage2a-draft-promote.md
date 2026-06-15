# Stage 2a — Draft read + version-checked promote transaction

**Commit:** `9359fe4` — `server: add draft read + version-checked promote transaction + promote endpoint + draft field on GET /api/bio (Stage 2a, inert)`
**Scope:** `server/src/localDatabase.ts` + `server/src/server.ts` — purely additive, inert

## What was added

### localDatabase.ts

**`AnimalBioDraft` type** — typed interface for `animal_bio_drafts` rows.

**`getAnimalBioDraft(shelterCode)`** — read-only query: `SELECT * FROM animal_bio_drafts WHERE shelter_code = ?`. Returns typed object or null.

**`promoteDraftSize(shelterCode, size, expectedGeneratedAt)`** — atomic, version-checked promotion in a `database.transaction()`:
1. Read draft row. If none → `{ success:false, error:'NO_DRAFT' }`.
2. Version check: if `draft.generatedAt !== expectedGeneratedAt` → `{ success:false, error:'DRAFT_CHANGED' }`. No writes occur.
3. Check if animal_bios row exists for this shelter_code:
   - **Exists:** UPDATE only the promoted size's columns (bio content + status='approved' + approved_at + last_source='promote_from_draft'). The other size is untouched.
   - **New:** INSERT with promoted size approved, other size at defaults (empty, draft).
4. Record `animal_bios_history` row via `insertBioHistory` (source='promote_from_draft').
5. Set `promoted_{size}=1` on the draft row.
6. If both `promoted_long=1` AND `promoted_short=1` → DELETE the draft row.
Return `{ success:true, data: resulting animal_bios row }`.

### server.ts

**`POST /api/bio/draft/:shelterCode/promote/:size`** — endpoint wrapper for `promoteDraftSize`. Reads `expectedGeneratedAt` from request body. Returns 409 on version mismatch. Clears WordPress featured cache if applicable.

**`GET /api/bio/:animalId` extended** — now returns `draft` field (from `getAnimalBioDraft`) alongside existing `data` field. `draft: null` when no draft exists.

**Legacy approve endpoints untouched** — `POST /api/bio/:bioId/approve/long` and `POST /api/bio/:bioId/approve/short` remain exactly as-is.

## Verification A — Inert check (real animals)

| Animal | data.statusLong | data.statusShort | draft |
|--------|----------------|-----------------|-------|
| Blizzard (S20251236) | approved | draft | null |
| Orchid (S2026358) | approved | approved | null |
| Abe (S2025966) | approved | approved | null |

All existing fields unchanged. `draft: null` on all (drafts table empty). No real animal data modified.

## Verification B — Synthetic promote test (TEST_PROMOTE_0001)

### B1: Inserted test draft
```
id=test-draft-001, shelter_code=TEST_PROMOTE_0001, generated_at=2026-06-15T16:00:00Z
bio_en_long='Test EN long', bio_es_long='Test ES long'
bio_en_short='Test EN short', bio_es_short='Test ES short'
promoted_long=0, promoted_short=0
```

### B2: Promote long ✅
- NEW animal_bios row created: bio_en_long='Test EN long', status_long='approved', last_source='promote_from_draft'
- Short columns: empty, status='draft' (defaults)
- History row: source='promote_from_draft', notes='Promoted long from draft (generated_at=2026-06-15T16:00:00Z)'
- Draft row: promoted_long=1, promoted_short=0 (still present)

### B3: Version check ✅
- Called with `expectedGeneratedAt='WRONG_TIMESTAMP'`
- Response: `{ success:false, error:'DRAFT_CHANGED', message:'This draft was regenerated...' }`
- HTTP 409, no writes occurred

### B4: Promote short ✅
- animal_bios row updated: bio_en_short='Test EN short', status_short='approved'
- Long columns UNTOUCHED (still 'Test EN long', approved)
- Draft row DELETED (both promoted_long=1 and promoted_short=1)

### B5: Cleanup ✅
| Table | Pre-cleanup | Post-cleanup |
|-------|-------------|-------------|
| animal_bios | 116 | 115 |
| animal_bio_drafts | 0 | 0 |
| test history rows | 2 | 0 |

All test data removed. No real animal affected.

Build: clean (tsc exit 0). Service: restarted, active.
