# Thumbnail Phase 2b — Backfill Script (Written, NOT Run)

**Date:** 2026-06-16 21:30 UTC  
**Commit:** `7ca7da1` — `thumbnails Phase 2b: add one-time DB-driven photo thumbnail backfill script (NOT YET RUN; pending Auditor SOP-3 + backup)`  
**Scope:** New file only — `server/src/scripts/backfill-photo-thumbnails.ts`

---

## git diff --stat [VERIFIED]
```
 server/src/scripts/backfill-photo-thumbnails.ts | 85 +++++++++++++++++++++++++
 1 file changed, 85 insertions(+)
```

---

## Complete Script Source [VERIFIED]

```typescript
/**
 * One-time idempotent backfill: generate photo thumbnails for existing local-file records.
 *
 * - DB-driven (SELECT from animal_media) — never walks the filesystem.
 * - ADDITIVE only: writes new thumbnail files + sets thumbnail_url. Never modifies or deletes originals.
 * - Idempotent: the WHERE clause filters on thumbnail_url IS NULL, so re-runs skip already-done rows.
 * - Continues past individual failures (missing file, sharp error) — never aborts the whole run.
 *
 * How to run (from the server directory, as the shelter user):
 *   cd /home/shelter/shelter-apps/server
 *   sudo -u shelter npx tsx src/scripts/backfill-photo-thumbnails.ts
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { initDatabase, getDatabase, setMediaThumbnailUrl } from '../localDatabase.js';
import { generatePhotoThumbnail } from '../imageProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const BASE_URL = process.env.BASE_URL || 'https://dogwalker.4lgshelterapp.duckdns.org';
const THUMBNAILS_DIR = path.join(ROOT_DIR, 'data', 'animal-media', 'thumbnails');

interface BackfillRow {
  id: string;
  file_path: string;
  source: string;
}

async function main() {
  initDatabase();
  const db = getDatabase();

  const rows = db.prepare(`
    SELECT id, file_path, source
    FROM animal_media
    WHERE media_type = 'photo'
      AND (thumbnail_url IS NULL OR thumbnail_url = '')
      AND file_path IS NOT NULL
      AND file_path != ''
  `).all() as BackfillRow[];

  const total = rows.length;
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  console.log(`[backfill] Found ${total} photo records needing thumbnails`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Check file exists on disk
    if (!existsSync(row.file_path)) {
      console.log(`SKIP (missing file): ${row.id} ${row.file_path}`);
      skipCount++;
      continue;
    }

    try {
      const url = await generatePhotoThumbnail(row.file_path, row.id, BASE_URL, THUMBNAILS_DIR);
      setMediaThumbnailUrl(row.id, url);
      successCount++;
    } catch (err) {
      console.log(`FAIL: ${row.id} ${row.file_path} ${err}`);
      failCount++;
      continue;
    }

    // Progress every 20 records
    if ((i + 1) % 20 === 0) {
      console.log(`[backfill] Progress: ${i + 1}/${total} (${successCount} ok, ${skipCount} skipped, ${failCount} failed)`);
    }
  }

  console.log(`Backfill complete: ${successCount} succeeded, ${skipCount} skipped (missing file), ${failCount} failed, ${total} total`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(2);
});
```

---

## Confirmations

### DB-driven, no filesystem walk [VERIFIED]

The script uses a single `SELECT ... FROM animal_media WHERE ...` query. There is no `fs.readdir`, `fs.readdirSync`, `glob`, `find`, or any directory-scanning call. The 68 orphan on-disk files not tracked in `animal_media` will not be touched. [VERIFIED by code read]

### Additive-only [VERIFIED]

The script only:
1. Writes NEW thumbnail files to `data/animal-media/thumbnails/` via `generatePhotoThumbnail`
2. Sets `thumbnail_url` on existing rows via `setMediaThumbnailUrl` (UPDATE)

It never deletes files, never modifies original photos, never changes `file_path` or `file_url`, never removes DB rows. [VERIFIED by code read]

### Idempotent [VERIFIED]

The WHERE clause filters `thumbnail_url IS NULL OR thumbnail_url = ''`. Once a row's `thumbnail_url` is set by `setMediaThumbnailUrl`, it won't appear in subsequent runs. `sharp.toFile()` overwrites existing thumbnail files safely if a partial prior run left orphan thumbnails. [VERIFIED by code read + sharp behavior]

### ROOT_DIR / BASE_URL derivation [VERIFIED]

```typescript
const ROOT_DIR = path.resolve(__dirname, '../../..');
const BASE_URL = process.env.BASE_URL || 'https://dogwalker.4lgshelterapp.duckdns.org';
```

- `__dirname` resolves to `server/src/scripts/` → `../../..` = repo root (`/home/shelter/shelter-apps/`) — matches `server.ts:247` [VERIFIED]
- `BASE_URL` reads same env var with same fallback as `server.ts:352` [VERIFIED]
- `THUMBNAILS_DIR = path.join(ROOT_DIR, 'data', 'animal-media', 'thumbnails')` — matches the upload handler's caller in commit `e1a8b86` [VERIFIED]

---

## Dry-Run Counts (read-only) [VERIFIED]

### Records needing backfill: **172**

Matches the Phase 2 design report expectation of ~172. [VERIFIED]

### Missing files on disk: **2**

```
MISSING: b3792e5f-... → /home/shelter/shelter-apps/intake-photos/27/photo.jpg
MISSING: 071bb3fe-... → /home/shelter/shelter-apps/intake-photos/28/photo.jpg
```

Both are intake photos, as expected from the Phase 2 design report. The script will log `SKIP (missing file)` for these and continue. [VERIFIED]

### Expected outcome when run:
- 170 succeeded
- 2 skipped (missing file)
- 0 failed
- 172 total

---

## Script Was NOT Executed [VERIFIED]

The script was written to disk and committed only. No `npx tsx`, `node`, or any execution command was run against it. No thumbnails were generated. No DB rows were modified. The dry-run counts above used a direct `sqlite3` query and a shell loop with `[ ! -f ]` — neither invoked the script.

---

## Deviations

None.
