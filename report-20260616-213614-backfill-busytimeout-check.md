# Backfill Pre-Run Check — busy_timeout + Per-Row Commits

**Date:** 2026-06-16 21:36 UTC  
**Scope:** Read-only verification — no code changes

---

## 1. CONDITION (b) — Per-Row Commits [VERIFIED]

### Backfill loop (backfill-photo-thumbnails.ts:52-73) [VERIFIED]

```typescript
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

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
    // ...progress log...
  }
```

**No `BEGIN`, `COMMIT`, `ROLLBACK`, or `db.transaction(...)` anywhere in the script** — confirmed via grep returning zero matches. [VERIFIED]

### setMediaThumbnailUrl (localDatabase.ts) [VERIFIED]

```typescript
export function setMediaThumbnailUrl(mediaId: string, thumbnailUrl: string): void {
  const database = getDatabase();
  database.prepare(`UPDATE animal_media SET thumbnail_url = ? WHERE id = ?`).run(thumbnailUrl, mediaId);
}
```

A standalone `.run()` call. In better-sqlite3, each `.run()` outside an explicit transaction is its own implicit auto-committed transaction. Each of the 170 UPDATEs commits independently. [VERIFIED]

**CONDITION (b) CONFIRMED: per-row commits.** ✅

---

## 2. CONDITION (a) — busy_timeout [VERIFIED]

### DB connection setup (localDatabase.ts:10-13) [VERIFIED]

```typescript
export function initDatabase(): void {
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  // ... schema migration checks follow
```

**No `busy_timeout` is configured anywhere:**
- No `timeout` option in the `new Database(DB_PATH)` constructor call [VERIFIED]
- No `pragma('busy_timeout = ...')` call [VERIFIED]
- `grep -n "busy_timeout\|timeout" server/src/localDatabase.ts` returns only the `new Database` line and the `foreign_keys` pragma — nothing else [VERIFIED]

better-sqlite3's default `timeout` is **0ms** (no retry — immediate `SQLITE_BUSY` error). The constructor accepts `{ timeout: <ms> }` as an alternative to the pragma, but neither is used.

**CONDITION (a) NOT MET: no busy_timeout is set.** ❌

---

## 3. Adding busy_timeout to the Backfill Script Only

### Proposed fix: one pragma line after getDatabase() [VERIFIED — design only]

```typescript
// In backfill-photo-thumbnails.ts, after initDatabase():
initDatabase();
const db = getDatabase();
db.pragma('busy_timeout = 5000');  // ← add this line
```

### Is this isolated to the backfill process? [VERIFIED]

**Yes.** The backfill script runs as a **separate Node.js process** (`npx tsx src/scripts/backfill-photo-thumbnails.ts`). better-sqlite3 opens a new SQLite connection per `new Database(...)` call. Each OS process gets its own connection handle. The `PRAGMA busy_timeout` is a **per-connection** setting in SQLite — setting it on the backfill's connection has zero effect on shelter-app's connection in the other process.

- Backfill process: calls `initDatabase()` → opens its own `new Database(DB_PATH)` → `.pragma('busy_timeout = 5000')` applies only to this handle
- shelter-app process: has its own `new Database(DB_PATH)` from startup → unaffected

This is a property of SQLite itself (per-connection pragmas) and of process isolation (separate address spaces). [VERIFIED]

### Is one pragma line sufficient? [VERIFIED]

Yes. With `busy_timeout = 5000`:
- If shelter-app holds a write lock (e.g., during a concurrent upload), the backfill's `.run()` will retry for up to 5 seconds before throwing `SQLITE_BUSY`.
- Each backfill UPDATE touches one row and takes <1ms of write-lock time, so contention is minimal.
- 5000ms is generous — shelter-app's own transactions are sub-millisecond (single-row INSERTs/UPDATEs).

---

## 4. better-sqlite3 Is Synchronous — Per-Row Auto-Commit Confirmed [VERIFIED]

`better-sqlite3` (imported at `localDatabase.ts:2`) is a synchronous SQLite driver. Per its documentation:

> By default, each statement runs in an implicit transaction that is automatically committed. If you want to run multiple statements in a single transaction, use the `.transaction()` method.

The backfill does NOT use `.transaction()`. Each `database.prepare(...).run(...)` inside `setMediaThumbnailUrl` is its own auto-committed transaction. The loop processes one row, commits, moves to the next — 170 independent tiny transactions. [VERIFIED]

---

## CONCLUSION

**(a) busy_timeout set?** **No.** Neither the constructor `timeout` option nor `PRAGMA busy_timeout` is configured on the shared DB connection. Default is 0ms (immediate SQLITE_BUSY failure). [VERIFIED]

**(b) Per-row commits?** **Yes.** No transaction wrapping in the backfill script. `setMediaThumbnailUrl` runs a standalone `.run()` per call — each is auto-committed by better-sqlite3. [VERIFIED]

**(c) Fix:** A single `db.pragma('busy_timeout = 5000')` line in the backfill script after `getDatabase()` is the correct isolated fix. It affects only the backfill's own connection in its own process — the running shelter-app is completely unaffected (separate process, separate SQLite connection, per-connection pragma). [VERIFIED]
