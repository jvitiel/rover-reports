# Thumbnail Phase 2 — Backfill Design

**Date:** 2026-06-16 21:10 UTC  
**Scope:** Read-only design — no code changes, no thumbnail generation

---

## 1. Backfill Query + Counts

### Query [VERIFIED]

```sql
SELECT id, file_path, source
FROM animal_media
WHERE media_type = 'photo'
  AND (thumbnail_url IS NULL OR thumbnail_url = '')
  AND file_path IS NOT NULL
  AND file_path != ''
```

### Count by source [VERIFIED]

| Source | Count |
|---|---|
| activity | 71 |
| dashboard-upload | 60 |
| intake | 19 |
| feeding | 15 |
| form | 5 |
| profiler | 2 |
| **Total** | **172** |

**Note:** The prior design report estimated 243 based on a broader query. The actual backfill count is **172** — the difference is that some `animal_media` photo records with local files already have `thumbnail_url` set (the one test upload from Phase 1 was cleaned up, but the query is tighter). [VERIFIED]

**SM records excluded:** 1,442 records with `source IN ('sm', 'sm-sync')` all have empty `file_path` — correctly excluded by the `file_path != ''` filter. [VERIFIED]

---

## 2. file_path Integrity

### Spot check (5 random records) [VERIFIED]

| Status | Source | Path |
|---|---|---|
| ✓ OK | form | `data/library-photos/S2025966/S2025966-library-1781632226676-8b2575.jpg` |
| ✓ OK | intake | `intake-photos/44/photo.jpg` |
| ✓ OK | activity | `data/animal-photos/S2026078/1775918046407_staff_Marizol.jpg` |
| ✓ OK | activity | `data/animal-photos/W2026035/1777124526902_staff_Lily.jpg` |
| ✓ OK | dashboard-upload | `data/library-photos/A2026051/A2026051-library-1776522570930-e46128.jpg` |

All paths are absolute (`/home/shelter/shelter-apps/...`), readable by the shelter user, and `generatePhotoThumbnail` can read them directly. [VERIFIED]

### Full missing-file check [VERIFIED]

```
Total checked: 172
Missing files: 2
```

**Missing files:**

| media_id | Path |
|---|---|
| `b3792e5f-...` | `/home/shelter/shelter-apps/intake-photos/27/photo.jpg` |
| `071bb3fe-...` | `/home/shelter/shelter-apps/intake-photos/28/photo.jpg` |

Both are intake photos. The backfill must handle these gracefully (log + skip, don't abort). **170 records have valid files; 2 will be skipped.** [VERIFIED]

---

## 3. Idempotency [VERIFIED]

**Re-runnability:** The query filters on `thumbnail_url IS NULL OR thumbnail_url = ''`. Once a row's `thumbnail_url` is set by `setMediaThumbnailUrl`, it won't appear in subsequent runs. The backfill is naturally idempotent. [VERIFIED by query logic]

**File overwrite:** `sharp.toFile()` overwrites existing files by default (sharp 0.34.5). If a thumbnail file already exists for a `mediaId` (e.g., from a partial prior run), it will be safely overwritten. No flag needed. [VERIFIED — sharp standard behavior]

---

## 4. Path Directories — Both Captured

### Records by directory [VERIFIED]

| Directory | Count |
|---|---|
| `data/animal-photos/` | 88 |
| `data/library-photos/` | 65 |
| `intake-photos/` | 19 |
| **Total** | **172** |

All three directories are captured by the query. `generatePhotoThumbnail` reads from `originalPath` (any absolute path) and writes to `data/animal-media/thumbnails/` — the source directory doesn't matter for reading. [VERIFIED]

### ⚠️ PATH BUG: intake-photos breaks generatePhotoThumbnail [VERIFIED]

**Critical finding:** `generatePhotoThumbnail` in `imageProcessor.ts` resolves the thumbnails directory via:

```typescript
const dataDir = originalPath.substring(0, originalPath.indexOf('/data/') + 5);
const thumbDir = path.join(dataDir, 'animal-media', 'thumbnails');
```

This works for paths containing `/data/`:
- `/home/shelter/shelter-apps/data/library-photos/...` → dataDir = `.../data/` ✓
- `/home/shelter/shelter-apps/data/animal-photos/...` → dataDir = `.../data/` ✓

**But intake photos are at `/home/shelter/shelter-apps/intake-photos/...`** — no `/data/` in the path. `indexOf('/data/')` returns -1, producing `dataDir = ''` and `thumbDir = 'animal-media/thumbnails'` (relative, wrong). This would fail or write to the wrong location.

**Fix needed before backfill:** Change `generatePhotoThumbnail` to accept the thumbnails directory (or ROOT_DIR) as a parameter instead of deriving it from the originalPath. The server.ts caller already has `ROOT_DIR` in scope. Alternatively, hard-code the well-known thumbnails dir path. This is a small fix to `imageProcessor.ts` + the caller in `server.ts`.

**Current upload-to-library handler is NOT affected** — its `filepath` always contains `/data/library-photos/`, so the extraction works. The bug only manifests for intake-photos paths (backfill-only). [VERIFIED]

---

## 5. Disk Space [VERIFIED]

```
Filesystem      Size  Used Avail Use%
/dev/sda         79G   25G   50G  34%
```

- Current thumbnails dir: 1.8MB (59 video thumbnails)
- Estimated backfill addition: 170 × ~15KB = ~2.5MB
- Post-backfill total: ~4.3MB
- Available: 50GB

Disk space is a non-issue. [VERIFIED]

---

## 6. Recommended Backfill Execution Shape

### Recommendation: One-time Node.js script [INFERRED]

**Shape:** A standalone `.ts` script in `server/src/scripts/` (where `test-push-batch.ts` and `test-push-single.ts` already live), invoked once via `npx tsx server/src/scripts/backfill-photo-thumbnails.ts` (or compiled and run via `node dist/scripts/...`).

**Why this over alternatives:**

| Approach | Pro | Con |
|---|---|---|
| **Standalone script** ✓ | Safe, inspectable, re-runnable, no restart needed | Must import DB + sharp setup |
| Admin API endpoint | Easy to trigger | Lives forever in codebase, auth questions |
| Startup inline | Runs automatically | Runs on EVERY restart, hard to control |

**Script structure (do not implement yet):**

```
1. Import: getDatabase, setMediaThumbnailUrl, generatePhotoThumbnail
2. Query: SELECT id, file_path FROM animal_media WHERE [backfill filter]
3. Loop over rows:
   a. Check file exists on disk → if not, log skip, increment skipCount
   b. try: generatePhotoThumbnail(filePath, id, BASE_URL)
   c.       setMediaThumbnailUrl(id, thumbUrl)
   d.       increment successCount
   e. catch: log error, increment failCount
   f. Log progress every 20 records
4. Print summary: {successCount} succeeded, {skipCount} skipped (missing file), {failCount} failed
```

**Where it lives:** `server/src/scripts/backfill-photo-thumbnails.ts`

**Execution:** From the server directory, as the shelter user:
```bash
cd /home/shelter/shelter-apps/server
sudo -u shelter npx tsx src/scripts/backfill-photo-thumbnails.ts
```

**Estimated runtime:** 170 images × ~100-200ms each (sharp read+resize+write) = ~20-35 seconds. [INFERRED]

**Pre-requisite fix:** The `generatePhotoThumbnail` path bug (§4) must be fixed first — either by changing the function signature to accept a `thumbDir` or `rootDir` parameter, or by using a well-known absolute path for the thumbnails directory.

---

## CONCLUSION

**(a) Backfill query + count:** 172 records (71 activity, 60 dashboard-upload, 19 intake, 15 feeding, 5 form, 2 profiler). SM's 1,442 records correctly excluded (empty `file_path`). [VERIFIED]

**(b) Missing-file records:** 2 intake photos (IDs `b3792e5f-...`, `071bb3fe-...`) have `file_path` set but file doesn't exist on disk. Backfill must skip these gracefully. [VERIFIED]

**(c) Idempotency:** Confirmed — `thumbnail_url IS NULL` filter means already-thumbnailed rows are skipped on re-run; `sharp.toFile()` overwrites cleanly. [VERIFIED]

**(d) Path bug:** `generatePhotoThumbnail` derives the thumbnails dir from `/data/` in the path, which fails for `intake-photos/` (no `/data/`). Must be fixed before backfill — does NOT affect current upload-to-library handler. [VERIFIED]

**(e) Disk space:** 50GB available, backfill adds ~2.5MB. Non-issue. [VERIFIED]

**(f) Execution shape:** One-time standalone script at `server/src/scripts/backfill-photo-thumbnails.ts`, run as shelter user, continues past failures, prints summary. Estimated ~30 seconds. [INFERRED]
