# Crop Editor Stage 2: Lock Column + Sweep-Skip

**Date:** 2026-06-22 20:55 UTC  
**Commit:** `dc626a3`  
**Files:** `scripts/migration-20260622-crop-locked.sql` (new), `server/src/cropSweep.ts` (+2)

---

## 1. Schema — Additive Column

**Migration (scripts/migration-20260622-crop-locked.sql):**
```sql
ALTER TABLE animal_media ADD COLUMN crop_locked INTEGER DEFAULT 0;
```

Applied to live DB:
```
$ PRAGMA table_info(animal_media) | grep crop_locked
31|crop_locked|INTEGER|0|0|0

$ SELECT COUNT(*), SUM(crop_locked) FROM animal_media
1846|0
```

All 1846 rows have `crop_locked = 0`. No other column altered. Row count unchanged.

## 2. Sweep-Skip Clauses

### Crop-candidate query (cropSweep.ts:57-65)

**Before:**
```sql
SELECT am.id, am.shelter_code, am.crop_url, am.source_media_id
FROM animal_media am
WHERE am.strip_position = 1
  AND am.media_type = 'photo'
  AND am.hidden = 0
  ${scopeClause}
```

**After:**
```sql
SELECT am.id, am.shelter_code, am.crop_url, am.source_media_id
FROM animal_media am
WHERE am.strip_position = 1
  AND am.media_type = 'photo'
  AND am.hidden = 0
  AND am.crop_locked = 0
  ${scopeClause}
```

### Clear-set query (cropSweep.ts:~170)

**Before:**
```sql
SELECT id, shelter_code, crop_url
FROM animal_media
WHERE strip_position != 1
  AND crop_url IS NOT NULL
  ${clearClause}
```

**After:**
```sql
SELECT id, shelter_code, crop_url
FROM animal_media
WHERE strip_position != 1
  AND crop_url IS NOT NULL
  AND crop_locked = 0
  ${clearClause}
```

Both the nightly full sweep (no `scopeClause`/`clearClause`) and the scoped drag-triggered sweep (with `AND shelter_code = ?`) use these same queries — both honor the lock.

## 3. Build

```
$ cd server && npm run build → tsc exit 0
$ systemctl is-active shelter-app → active
```

## 4. Verification

### (a) Inert-by-default (live)

With all rows `crop_locked = 0`, the new queries return identical results to the old:
```
Crop candidates: 691
Needs crop (NULL crop_url): 1 (S2026101, the 404)
Clear set: 0
```
Exactly the same as before the column was added ✅

### (b) Lock-skip crop (scratch DB)

Test mediaId: `01ef1f8d-7335-49c0-92ee-7a473aee6897` (A2024185 slot-1)

| State | Old query (no lock clause) | New query (crop_locked=0) |
|-------|---------------------------|--------------------------|
| crop_url=NULL, crop_locked=1 | 1 (would crop) | **0 (skipped)** ✅ |
| crop_url=NULL, crop_locked=0 | 1 (would crop) | **1 (would crop)** ✅ |

### (c) Clear-skip (scratch DB)

Test mediaId: `4169abb0-04c3-4e44-b61c-f280a91c5fef` (A2024185 slot-3, fake crop_url set)

| State | Old query (no lock clause) | New query (crop_locked=0) |
|-------|---------------------------|--------------------------|
| strip_position=3, crop_url set, crop_locked=1 | 1 (would clear) | **0 (protected)** ✅ |
| strip_position=3, crop_url set, crop_locked=0 | 1 (would clear) | **1 (would clear)** ✅ |

### (d) Live DB untouched

```
$ SELECT COUNT(*) FROM animal_media WHERE crop_locked != 0 → 0
$ SELECT COUNT(*) FROM animal_media → 1846
$ SELECT COUNT(*) FROM animal_media WHERE crop_url IS NOT NULL → 690
```

No row data changed. Scratch DB deleted after tests ✅
