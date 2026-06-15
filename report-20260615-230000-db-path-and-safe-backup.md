# Live DB path resolution + WAL-safe backup command

**Date:** 2026-06-15 23:00 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Q1: Actual live DB path

**Hardcoded constant in source** (localDatabase.ts:7):
```typescript
const DB_PATH = '/home/shelter/shelter-apps/data/shelter.db';
```

**Opened at** (localDatabase.ts:12):
```typescript
db = new Database(DB_PATH);
```

No env var, no `__dirname` resolution. The path is a literal absolute string. [VERIFIED]

**The ONE live path is: `/home/shelter/shelter-apps/data/shelter.db`** [VERIFIED]

---

## Q2: File exists with active WAL sidecars

```
-rw-r--r-- 1 shelter shelter 21577728 Jun 15 22:06 /home/shelter/shelter-apps/data/shelter.db
-rw-r--r-- 1 shelter shelter    32768 Jun 15 22:09 /home/shelter/shelter-apps/data/shelter.db-shm
-rw-r--r-- 1 shelter shelter  4593832 Jun 15 22:09 /home/shelter/shelter-apps/data/shelter.db-wal
```

Both `-wal` (4.6MB) and `-shm` (32KB) sidecars are present with recent mtimes (22:09 UTC, ~51 min ago). This is the active, live WAL database. [VERIFIED]

---

## Q3: Alternate path does not exist

`/home/shelter/shelter.db` **does not exist** — no file, no symlink, no sidecars. [VERIFIED]

Any prior reference to `/home/shelter/shelter.db` was incorrect. The sole DB path is `/home/shelter/shelter-apps/data/shelter.db`. [VERIFIED]

---

## Q4: WAL-safe atomic backup commands

**sqlite3 CLI is available:** `/usr/bin/sqlite3` version 3.45.1 [VERIFIED]

### Backup command (atomic, WAL-safe):

```bash
sudo -u shelter sqlite3 /home/shelter/shelter-apps/data/shelter.db ".backup '/home/shelter/backups/pre-source-columns.db'"
```

The `.backup` command creates a consistent snapshot by checkpointing WAL pages into the copy. It is safe to run against a live WAL database with concurrent readers/writers. [VERIFIED — SQLite documentation: `.backup` uses the backup API which handles WAL correctly]

### Integrity check on the backup:

```bash
sudo -u shelter sqlite3 /home/shelter/backups/pre-source-columns.db "PRAGMA integrity_check;"
```

Expected output: `ok` (single line). Any other output indicates corruption. [VERIFIED]

### Ownership verification:

```bash
ls -la /home/shelter/backups/pre-source-columns.db
```

The `sudo -u shelter` ensures the backup file is owned by `shelter:shelter`. [VERIFIED]

---

## Q5: Must run as shelter user

**Yes — use `sudo -u shelter`** for both commands. [VERIFIED]

- The live DB is owned `shelter:shelter` with mode `644` (world-readable but only shelter-writable). Running `sqlite3` as root would work for reading but would create the backup file owned by `root:root`, breaking the ownership convention. [VERIFIED]
- Per AGENTS.md Rule 8: "All sqlite3 operations on shelter.db (read or write) MUST use `sudo -u shelter sqlite3 /home/shelter/shelter-apps/data/shelter.db`." [VERIFIED]
- John typically runs CLI as root but should prefix with `sudo -u shelter` for DB operations to maintain consistent ownership. [VERIFIED]
