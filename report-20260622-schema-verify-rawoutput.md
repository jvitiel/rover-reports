# Schema Verification Raw Output: crop_url + crop_locked

**Date:** 2026-06-22 21:05 UTC  
**Mode:** Read-only, DB mode=ro  
**Scope:** Two additive columns on `animal_media`: `crop_url` (35c8701), `crop_locked` (dc626a3)

---

## 1. Schema

### PRAGMA table_info(animal_media)

```
0|id|TEXT|0||1
1|shelter_code|TEXT|0||0
2|intake_id|INTEGER|0||0
3|media_type|TEXT|1||0
4|source|TEXT|1||0
5|file_path|TEXT|1||0
6|file_url|TEXT|0||0
7|caregiver|TEXT|0||0
8|captured_at|TEXT|1||0
9|transcript|TEXT|0||0
10|sidecar_path|TEXT|0||0
11|video_source|TEXT|0||0
12|source_media_id|TEXT|0||0
13|video_generator|TEXT|0||0
14|duration_seconds|REAL|0||0
15|tag_marketing|INTEGER|0|0|0
16|tag_health_concern|INTEGER|0|0|0
17|tag_behavioral|INTEGER|0|0|0
18|tag_featured|INTEGER|0|0|0
19|ai_tags|TEXT|0||0
20|ai_tagged_at|TEXT|0||0
21|created_at|TEXT|1|datetime('now','localtime')|0
22|name|TEXT|0||0
23|species|TEXT|0||0
24|strip_position|INTEGER|0|0|0
25|hidden|INTEGER|0|0|0
26|hidden_at|TEXT|0||0
27|content_hash|TEXT|0||0
28|sm_push_skipped_reason|TEXT|0||0
29|thumbnail_url|TEXT|0||0
30|crop_url|TEXT|0||0
31|crop_locked|INTEGER|0|0|0
```

### .schema animal_media

```sql
CREATE TABLE animal_media (
  id TEXT PRIMARY KEY,
  shelter_code TEXT,
  intake_id INTEGER,
  media_type TEXT NOT NULL,
  source TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  caregiver TEXT,
  captured_at TEXT NOT NULL,
  transcript TEXT,
  sidecar_path TEXT,
  video_source TEXT,
  source_media_id TEXT,
  video_generator TEXT,
  duration_seconds REAL,
  tag_marketing INTEGER DEFAULT 0,
  tag_health_concern INTEGER DEFAULT 0,
  tag_behavioral INTEGER DEFAULT 0,
  tag_featured INTEGER DEFAULT 0,
  ai_tags TEXT,
  ai_tagged_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
, name TEXT, species TEXT, strip_position INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0, hidden_at TEXT, content_hash TEXT, sm_push_skipped_reason TEXT, thumbnail_url TEXT, crop_url TEXT, crop_locked INTEGER DEFAULT 0);
CREATE INDEX idx_media_animal ON animal_media(shelter_code);
CREATE INDEX idx_media_intake ON animal_media(intake_id);
CREATE INDEX idx_media_source ON animal_media(source);
CREATE INDEX idx_media_type ON animal_media(media_type);
CREATE INDEX idx_media_captured ON animal_media(captured_at);
CREATE INDEX idx_media_marketing ON animal_media(tag_marketing) WHERE tag_marketing = 1;
CREATE INDEX idx_media_shelter_code_content_hash ON animal_media (shelter_code, content_hash);
```

## 2. Three Counts

```sql
SELECT COUNT(*) FROM animal_media;
```
**Result:** `1846`

```sql
SELECT COUNT(*) FROM animal_media WHERE crop_url IS NOT NULL;
```
**Result:** `690`

```sql
SELECT COUNT(*) FROM animal_media WHERE crop_locked = 1;
```
**Result:** `0`

## 3. Sweep Clauses — Verbatim from cropSweep.ts

### Crop-candidate query (cropSweep.ts:57-64)

```typescript
  const cropCandidates = db.prepare(`
    SELECT am.id, am.shelter_code, am.crop_url, am.source_media_id
    FROM animal_media am
    WHERE am.strip_position = 1
      AND am.media_type = 'photo'
      AND am.hidden = 0
      AND am.crop_locked = 0
      ${scopeClause}
  `).all(...scopeParams) as {
```

`crop_locked = 0` present: **YES**

### Clear-set query (cropSweep.ts:167-174)

```typescript
  const clearRows = db.prepare(`
    SELECT id, shelter_code, crop_url
    FROM animal_media
    WHERE strip_position != 1
      AND crop_url IS NOT NULL
      AND crop_locked = 0
      ${clearClause}
  `).all(...clearParams) as {
```

`crop_locked = 0` present: **YES**

## 4. Migration Files

### crop_url migration

**Path:** `/home/shelter/shelter-apps/scripts/migration-20260621-crop-url.sql`

```sql
-- Migration: Add crop_url column to animal_media
-- Date: 2026-06-21
-- Applied manually (ALTER TABLE is additive, no rollback needed)
-- crop_url stores the full URL to the 800x800 YOLO-cropped JPEG, matching thumbnail_url format.
-- NULL = no crop generated yet.
ALTER TABLE animal_media ADD COLUMN crop_url TEXT;
```

**Live schema comparison:** PRAGMA shows `30|crop_url|TEXT|0||0` — type TEXT, nullable, no default. `.schema` shows `crop_url TEXT` at end of column list. **Matches migration file.**

### crop_locked migration

**Path:** `/home/shelter/shelter-apps/scripts/migration-20260622-crop-locked.sql`

```sql
-- Migration: add crop_locked flag to animal_media
-- Date: 2026-06-22
-- Purpose: Allow manual crops to be protected from automatic sweep overwrite.
-- Additive: default 0, no row data modified.

ALTER TABLE animal_media ADD COLUMN crop_locked INTEGER DEFAULT 0;
```

**Live schema comparison:** PRAGMA shows `31|crop_locked|INTEGER|0|0|0` — type INTEGER, nullable, default 0. `.schema` shows `crop_locked INTEGER DEFAULT 0` at end of column list. **Matches migration file.**

**Drift:** None. Both live columns match their migration files exactly.

## 5. Write-Path Preservation

### INSERTs into animal_media

**localDatabase.ts:4825 — insertAnimalMedia:**
```sql
INSERT INTO animal_media (id, shelter_code, intake_id, media_type, source, file_path, file_url, caregiver, captured_at, transcript, sidecar_path, name, species, tag_marketing, strip_position, source_media_id, content_hash)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
```
**Explicit column list.** Does not mention `crop_url` or `crop_locked`. Both default correctly: `crop_url` → NULL, `crop_locked` → 0. **Safe.**

**server.ts:4138 — video generation INSERT:**
```sql
INSERT INTO animal_media (
  id, shelter_code, intake_id, media_type, source, file_path, file_url,
  captured_at, duration_seconds, source_media_id, video_source, video_generator,
  strip_position, hidden, created_at, thumbnail_url
) VALUES (?, ?, ?, 'video', 'grok_imagine', ?, ?, ?, ?, ?, 'grok_imagine', 'grok-imagine-video', 0, 0, ?, ?)
```
**Explicit column list.** Does not mention `crop_url` or `crop_locked`. Both default correctly. **Safe.**

### UPDATEs to animal_media

**localDatabase.ts:2012 — hideMedia:**
```sql
UPDATE animal_media SET hidden = 1, hidden_at = ? WHERE id = ?
```
**Explicit SET columns.** Does not touch `crop_url` or `crop_locked`. **Safe.**

**localDatabase.ts:2019 — unhideMedia:**
```sql
UPDATE animal_media SET hidden = 0, hidden_at = NULL WHERE id = ?
```
**Explicit SET columns.** **Safe.**

**localDatabase.ts:4865 — addPhotoToStrip (auto-fill):**
```sql
UPDATE animal_media SET strip_position = ? WHERE id = ?
```
**Explicit SET column.** **Safe.**

**localDatabase.ts:4945-4984 — addPhotoToStrip (cascade positions):**
Multiple statements, all of form:
```sql
UPDATE animal_media SET strip_position = N WHERE id = ?
-- or
UPDATE animal_media SET strip_position = N
  WHERE shelter_code = ? AND strip_position = M AND media_type = 'photo'
```
**All explicit SET strip_position only.** **Safe.**

**localDatabase.ts:4996 — addPhotoToStrip (batch position):**
```sql
UPDATE animal_media SET strip_position = ? WHERE id = ?
```
**Explicit SET column.** **Safe.**

**localDatabase.ts:5002 — addPhotoToStrip (evict to library):**
```sql
UPDATE animal_media SET strip_position = 0 WHERE id = ?
```
**Explicit SET column.** **Safe.**

**localDatabase.ts:5008 — addPhotoToStrip (final position set):**
```sql
UPDATE animal_media SET strip_position = ? WHERE id = ?
```
**Explicit SET column.** **Safe.**

**localDatabase.ts:5022 — removeFromStrip:**
```sql
UPDATE animal_media SET strip_position = 0 WHERE id = ?
```
**Explicit SET column.** **Safe.**

**localDatabase.ts:5026 — removeFromStrip (cascade):**
```sql
UPDATE animal_media SET strip_position = strip_position - 1
  WHERE shelter_code = ? AND strip_position > ? AND strip_position <= 6 AND media_type = 'photo'
```
**Explicit SET column.** **Safe.**

**localDatabase.ts:5044-5071 — reorderStripPhoto (multiple cascade+set):**
All of form:
```sql
UPDATE animal_media SET strip_position = strip_position + 1 WHERE ...
UPDATE animal_media SET strip_position = N WHERE ...
UPDATE animal_media SET strip_position = strip_position - 1 WHERE ...
UPDATE animal_media SET strip_position = ? WHERE id = ?
```
**All explicit SET strip_position only.** **Safe.**

**localDatabase.ts:5517 — setMediaThumbnailUrl:**
```sql
UPDATE animal_media SET thumbnail_url = ? WHERE id = ?
```
**Explicit SET column.** **Safe.**

**server.ts:7971 — dogwalker voice transcript:**
```sql
UPDATE animal_media SET transcript = ? WHERE file_url = ?
```
**Explicit SET column.** **Safe.**

**server.ts:8508 — staff voice transcript:**
```sql
UPDATE animal_media SET transcript = ? WHERE file_url = ?
```
**Explicit SET column.** **Safe.**

**server.ts:12120 — SM sync globe-swap (fill empty slot-1):**
```sql
UPDATE animal_media SET strip_position = 1 WHERE id = ?
```
**Explicit SET column.** **Safe.**

**server.ts:12160-12161 — SM sync globe-swap (mismatch swap):**
```sql
UPDATE animal_media SET strip_position = ? WHERE id = ? AND shelter_code = ?
UPDATE animal_media SET strip_position = 1 WHERE id = ? AND shelter_code = ?
```
**Explicit SET columns.** **Safe.**

**server.ts:13366 — marketing tag toggle:**
```sql
UPDATE animal_media SET tag_marketing = ? WHERE id = ?
```
**Explicit SET column.** **Safe.**

**cropSweep.ts:140 — write crop_url after worker:**
```sql
UPDATE animal_media SET crop_url = ? WHERE id = ?
```
**Explicit SET column.** **Safe.**

**cropSweep.ts:182 — clear stale crop_url:**
```sql
UPDATE animal_media SET crop_url = NULL WHERE id = ?
```
**Explicit SET column.** **Safe.**

### ON CONFLICT / REPLACE / upsert

**None found.** `grep -n 'INSERT.*animal_media\|REPLACE.*animal_media\|ON CONFLICT.*animal_media'` across server.ts returned only the two explicit-column INSERTs above.

### crop-worker.py

Does not write to the database directly. It outputs JSON to stdout; `cropSweep.ts` parses the output and performs the UPDATE (cropSweep.ts:140, listed above). **No direct DB access from Python.**

### Summary

**0 blanket/whole-row overwrites found.** Every INSERT uses an explicit column list. Every UPDATE uses explicit SET columns. No REPLACE or ON CONFLICT upserts exist. `crop_url` and `crop_locked` are never mentioned in any write path except `cropSweep.ts:140` (writes crop_url) and `cropSweep.ts:182` (clears crop_url). Neither column can be silently wiped by any existing write path.

## 6. Able-to-Fail

### Item 1 (schema)
**Would indicate a problem:** An unexpected/additional column changed, wrong type (e.g. crop_locked as TEXT), or NOT NULL without a default.
**Actual output:** `crop_url` is cid 30, TEXT, nullable, no default. `crop_locked` is cid 31, INTEGER, nullable, default 0. No other columns differ from the pre-migration schema. **No failure condition present.**

### Item 2 (counts)
**Would indicate a problem:** `crop_locked = 1` count > 0 (nothing is built to set it yet).
**Actual output:** `0`. **No failure condition present.**

### Item 3 (sweep clauses)
**Would indicate a problem:** `crop_locked = 0` present in the crop-candidate query but MISSING from the clear-set query.
**Actual output:** `crop_locked = 0` present in BOTH queries (cropSweep.ts:62 and cropSweep.ts:172). **No failure condition present.**

### Item 4 (migration drift)
**Would indicate a problem:** Live schema columns differ from what the migration files would produce (wrong type, unexpected default, missing column, extra column).
**Actual output:** Both `crop_url TEXT` and `crop_locked INTEGER DEFAULT 0` match their migration files exactly. **No failure condition present.**

### Item 5 (write-path preservation)
**Would indicate a problem:** Any write path using a blanket overwrite (INSERT without column list, UPDATE SET * or equivalent, REPLACE/upsert) that omits crop_url/crop_locked.
**Actual output:** 0 blanket overwrites found. All 2 INSERTs use explicit column lists. All 18 UPDATEs use explicit SET columns. 0 REPLACE/upsert statements. **No failure condition present.**
