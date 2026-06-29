# Slot1fix Backup Loop Diagnosis — 2026-06-29

## 1. The Files

8 files in `/home/shelter/backups/` matching the slot1fix pattern:

| File | Size | Date |
|------|------|------|
| shelter-backup-slot1fix-20260621-2026-06-22.db | 28 MB | Jun 22 03:00 |
| shelter-backup-slot1fix-20260621-2026-06-23.db | 28 MB | Jun 23 03:00 |
| shelter-backup-slot1fix-20260621-2026-06-24.db | 28 MB | Jun 24 03:00 |
| shelter-backup-slot1fix-20260621-2026-06-25.db | 28 MB | Jun 25 03:00 |
| shelter-backup-slot1fix-20260621-2026-06-26.db | 28 MB | Jun 26 03:00 |
| shelter-backup-slot1fix-20260621-2026-06-27.db | 28 MB | Jun 27 03:00 |
| shelter-backup-slot1fix-20260621-2026-06-28.db | 28 MB | Jun 28 03:00 |
| shelter-backup-slot1fix-20260621-2026-06-29.db | 28 MB | Jun 29 03:00 |

- **Count:** 8
- **Total size:** 220 MB (8 × 27.5 MB)
- **Date range:** Jun 22 → Jun 29 (today) — **loop is active**
- **All files are identical** (28,827,648 bytes each — exact copies of the same frozen source)

## 2. Root Cause — NOT a Bad Cron Entry

**The problem is not in the crontab.** There is no "slot1fix" cron entry anywhere.

The cause is a **stale `.db` file left in the data directory** that gets swept up by the daily backup script's glob:

**Source file:**
```
/home/shelter/shelter-apps/data/shelter-backup-slot1fix-20260621.db
-rw-r--r-- 1 root shelter 28827648 Jun 21 04:15
```

**How it gets backed up daily:**

`backup-sqlite.sh` (line from saved root crontab: `0 3 * * * /home/shelter/scripts/backup-sqlite.sh`) contains this glob:

```bash
for db_file in "$SOURCE_DIR"/*.db; do
    ...
    backup_file="$BACKUP_DIR/${db_name}-${DATE}.db"
    cp "$db_file" "$backup_file"
```

It backs up **every `.db` file** in `/home/shelter/shelter-apps/data/`. Since `shelter-backup-slot1fix-20260621.db` sits there alongside `shelter.db`, it gets copied daily as `shelter-backup-slot1fix-20260621-YYYY-MM-DD.db`.

The 14-day retention cleanup (`find -mtime +14 -delete`) hasn't kicked in yet because the oldest copy is only 8 days old. Once it does, it will cap at ~14 copies (~385 MB) — but the real fix is removing the source.

**Confirmed in backup.log** — every entry since Jun 22 shows two backups per day: the real shelter.db and the slot1fix file.

## 3. What It Originally Was

Per `/home/rover/rover/memory/2026-06-21.md`, the file was a **pre-migration safety backup** created on June 21 before the "Slot-1 Canary Execution" — a batch fix to `strip_position` values in `animal_media`. The backup was taken at 04:15 UTC, the migration ran at ~04:30–04:45 UTC and completed successfully (152 records corrected).

**It was a one-time safety net** that should have been moved to `/home/shelter/backups/` after the migration succeeded. Instead, it was left in the live data directory.

It is **completely redundant**:
- The daily backup `shelter-2026-06-21.db` (taken at 03:00, before the migration) covers the same pre-migration state
- The migration completed successfully 8 days ago with full verification
- Every subsequent daily backup captures the post-migration state

## 4. The Fix (Do NOT Execute — Describe Only)

**Step 1 — Remove the source file from the data directory:**
```bash
sudo rm /home/shelter/shelter-apps/data/shelter-backup-slot1fix-20260621.db
```
This stops the loop. No cron entry to edit — the cron is correct; it's the stale file that's wrong.

**Step 2 — Clean the accumulated copies:**
```bash
sudo rm /home/shelter/backups/shelter-backup-slot1fix-20260621-*.db
```
This reclaims 220 MB.

**Alternative to rm** (per AGENTS.md safety preference):
```bash
sudo trash /home/shelter/shelter-apps/data/shelter-backup-slot1fix-20260621.db
sudo trash /home/shelter/backups/shelter-backup-slot1fix-20260621-*.db
```

## 5. Sanity — No Impact on Legitimate Backups

The three legitimate backup jobs are completely separate:

| Job | Cron | Script | Affected? |
|-----|------|--------|-----------|
| Daily SQLite | `0 3 * * *` | backup-sqlite.sh | **No** — removing the source file just means the glob finds only `shelter.db` again (its original behavior) |
| Daily data | `15 3 * * *` | backup-data.sh | **No** — separate script, tars the whole data dir |
| Weekly archive | `30 3 * * *` | backup-weekly.sh | **No** — separate script, bundles everything |

Removing the slot1fix source file restores backup-sqlite.sh to its intended behavior: one backup per day (shelter.db only), not two.

**No cron entries need to be modified.** The cron schedule is correct. The script logic is correct (it just globs all `.db` files). The only problem is a stale file sitting where it shouldn't be.

---

*Read-only diagnosis. No files modified. Generated 2026-06-29 14:25 UTC.*
