# do-backup.sh wrapper — usage, naming, WAL safety

**Date:** 2026-06-15 22:57 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Q1: What do-backup.sh does

**Path:** `/home/shelter/scripts/do-backup.sh`

**Arguments:** `<source-path> [custom-name]`

**Behavior:**
1. Validates source file is readable
2. Generates timestamp: `YYYYMMDD-HHMMSS`
3. If custom-name provided: output filename = `{custom-name}-{TIMESTAMP}.db`
4. If no custom-name: strips extension, appends timestamp, re-adds extension (e.g. `shelter-20260615-225700.db`)
5. Copies source to `/home/shelter/backups/{filename}`
6. Sets ownership `shelter:shelter`, mode `644`
7. Echoes the full destination path to stdout

**No integrity check.** The wrapper does a bare `cp` — no `sqlite3 .backup`, no `PRAGMA integrity_check`, no checksum. [VERIFIED]

---

## Q2: Exact command for pre-schema-migration backup

```bash
sudo -u shelter /home/shelter/scripts/do-backup.sh /home/shelter/shelter-apps/data/shelter.db pre-source-columns
```

This will produce: `/home/shelter/backups/pre-source-columns-YYYYMMDD-HHMMSS.db` [VERIFIED — wrapper concatenates `${custom-name}-${TIMESTAMP}.db`]

**Note:** The DB path is `/home/shelter/shelter-apps/data/shelter.db`, NOT `/home/shelter/shelter.db` (the latter does not exist). [VERIFIED via `ls`]

---

## Q3: Earlier backup precedent

The backup `shelter.db.pre-adult-intake.20260615-185251` was **NOT created by this wrapper**. [VERIFIED]

- Wrapper's naming pattern: `{custom-name}-{TIMESTAMP}.db` → would produce `pre-adult-intake-20260615-185251.db` (hyphens, `.db` extension at end)
- Actual filename: `shelter.db.pre-adult-intake.20260615-185251` (dot-separated, no trailing `.db`)

This backup was created manually by John (likely `cp` + manual rename). [INFERRED from naming mismatch]

**What the wrapper output will look like:**

```
$ sudo -u shelter /home/shelter/scripts/do-backup.sh /home/shelter/shelter-apps/data/shelter.db pre-source-columns
/home/shelter/backups/pre-source-columns-20260615-225700.db
```

Just the destination path echoed — no integrity line, no confirmation message beyond the path. [VERIFIED]

---

## Q4: WAL safety

**The live DB uses WAL mode.** [VERIFIED — `PRAGMA journal_mode;` returns `wal`]

**The wrapper uses bare `cp`, which is NOT fully WAL-safe.** [VERIFIED]

With WAL mode, a bare `cp` copies the main DB file but does NOT checkpoint the WAL first. This means:
- If the WAL file (`shelter.db-wal`) has uncommitted pages, the backup may be missing recent writes
- The copy is generally consistent (SQLite WAL readers see a consistent snapshot) but the backup file alone — without the WAL file — may be slightly behind

**For a pre-migration backup, this is acceptable** because:
1. The migration will be run immediately after the backup, so the time window is seconds
2. The backup captures the pre-migration schema state, which is the goal
3. Both the daily backup script (`backup-sqlite.sh`) and this wrapper use the same `cp` approach [VERIFIED]

**For a truly atomic backup**, `sqlite3 ... ".backup /path/to/dest.db"` would be safer (it checkpoints WAL automatically). But the existing wrapper doesn't do this, and the precedent backup was also a `cp`. [VERIFIED]
