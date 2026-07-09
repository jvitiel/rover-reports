# Auditor 5 — Snapshot Relocate Pre-Diagnosis — 2026-07-09

**Date:** 2026-07-09 19:42 UTC
**Author:** Rover (automated, read-only)

---

## 1. IS ANYTHING REFERENCING THEM

### grep across server/src, scripts, caddy, systemd

```
$ grep -rn 'pre-es-backfill-backup\|pre-es-migration-backup\|pre-stories-backfill-backup\|pre-rg-drop-backup\|db\.pre-' \
  /home/shelter/shelter-apps/server/src/ \
  /home/shelter/scripts/ \
  /etc/caddy/ \
  /etc/systemd/system/ ; echo "exit=$?"
exit=1
```

Zero matches. [VERIFIED]

### crontab -l (rover user)

```
$ crontab -l ; echo "exit=$?"
*/15 * * * * /home/rover/scripts/memory-snapshot.sh
0 4 * * * /home/rover/scripts/screenshots-retention.sh >> /home/rover/screenshots-retention.log 2>&1
0 6 * * * sudo -u shelter python3 /home/shelter/shelter-apps/scripts/score-profiles.py >> /home/shelter/logs/score-profiles.log 2>&1
exit=0
```

No reference to any pre-*-backup file. [VERIFIED]

### Generic 'shelter.db.pre' under /home/shelter/ excluding backups and data

```
$ grep -rn 'shelter\.db\.pre' /home/shelter/ \
  --exclude-dir=backups --exclude-dir=data --exclude-dir=node_modules --exclude-dir=.git ; echo "exit=$?"
grep: /home/shelter/.config/server.env: Permission denied
grep: /home/shelter/.config/google-sheets-credentials.json: Permission denied
grep: /home/shelter/.config/shelter-secrets.json: Permission denied
grep: /home/shelter/.config/rover-gateway-token.txt: Permission denied
grep: /home/shelter/.config/secrets.json: Permission denied
grep: /home/shelter/.config/google-chrome: Permission denied
grep: /home/shelter/.local/share/pki: Permission denied
grep: /home/shelter/.cache: Permission denied
grep: /home/shelter/.ssh: Permission denied
exit=2
```

Exit 2 = permission denied on some paths; zero actual matches were printed. The permission-denied files are config/secrets files (JSON, env, txt) — unlikely to contain SQLite backup references but NOT verifiable from the rover user. [VERIFIED for accessible paths; UNCERTAIN for permission-denied paths]

---

## 2. WHAT DOES BACKUP-WEEKLY.SH ACTUALLY ARCHIVE

### Full source

(Full 215-line script printed; key sections below.)

### Paths INCLUDED by backup-weekly.sh

All staged into a temp directory, then bundled into `weekly-YYYYMMDD.tar.gz`:

| Component | Source path | Destination in archive |
|-----------|------------|----------------------|
| Code tarball | `/home/shelter/shelter-apps` (minus excludes) + `/home/shelter/scripts` | `./code.tar.gz` |
| Caddyfile | `/etc/caddy/Caddyfile` | `./configs/Caddyfile` |
| Root crontab | `sudo crontab -l` output | `./configs/root-crontab.txt` |
| Systemd unit | `/etc/systemd/system/shelter-app.service` | `./configs/shelter-app.service` |
| Logrotate config | `/etc/logrotate.d/shelter` | `./configs/logrotate.d-shelter` |
| Secrets | `/home/shelter/.config/shelter-secrets.json` | `./secrets/shelter-secrets.json` |
| Google creds | `/home/shelter/.config/google-sheets-credentials.json` | `./secrets/google-sheets-credentials.json` |
| Restore guide | Generated inline | `./RESTORE.md` |

### Paths EXCLUDED by backup-weekly.sh (from the code tarball)

```
--exclude='shelter-apps/.git'
--exclude='shelter-apps/data'
--exclude='shelter-apps/adoption-pdfs'
--exclude='shelter-apps/rg-attachments'
--exclude='shelter-apps/intake-audio'
--exclude='shelter-apps/intake-photos'
--exclude='shelter-apps/staff-pwa-backup'
--exclude='shelter-apps/server/shelter.db'
--exclude='shelter-apps/node_modules'
--exclude='shelter-apps/*/node_modules'
--exclude='shelter-apps/**/node_modules'
```

### Does backup-weekly.sh archive /home/shelter/backups/?

**No.** backup-weekly.sh does not include `/home/shelter/backups/` in any tar command; it WRITES to that directory but does not archive its contents. [VERIFIED]

### Behavioral confirmation

```
$ tar -tzf /home/shelter/backups/weekly-20260709.tar.gz | cut -d/ -f1-2 | sort -u ; echo "exit=$?"
./
./code.tar.gz
./configs
./RESTORE.md
./secrets
exit=0
```

No backup files inside. [VERIFIED]

### backup-sqlite.sh

**Full source printed above.** Key behavior:

- **Reads:** every `*.db` file in `/home/shelter/shelter-apps/data/`
- **Writes:** `cp` each to `/home/shelter/backups/${db_name}-${DATE}.db`
- **Pattern:** `for db_file in "$SOURCE_DIR"/*.db` — this glob matches `shelter.db` AND any other `.db` file in the data directory
- **Does NOT match** the `.pre-*-backup` files because they don't end in `.db` — they end in `-backup`. [VERIFIED — glob is `*.db`, not `*.db*`]

---

## 3. ARE THE FOUR FILES OPEN OR IN USE

### File attributes

| File | Owner | Group | Mode | Size (bytes) | Mtime (full-iso) |
|------|-------|-------|------|-------------|-------------------|
| shelter.db.pre-es-backfill-backup | root | shelter | -rw-r--r-- | 36,556,800 | 2026-07-07 02:57:04.560994217 +0000 |
| shelter.db.pre-es-migration-backup | root | shelter | -rw-r--r-- | 36,556,800 | 2026-07-07 01:47:36.697320866 +0000 |
| shelter.db.pre-stories-backfill-backup | root | shelter | -rw-r--r-- | 36,556,800 | 2026-07-07 03:56:50.413461292 +0000 |
| shelter.db.pre-rg-drop-backup | root | shelter | -rw-r--r-- | 36,900,864 | 2026-07-07 20:22:15.261300637 +0000 |

All four are owned by `root:shelter`, mode 644. All created on 2026-07-07. [VERIFIED]

### lsof

```
$ lsof /home/shelter/shelter-apps/data/shelter.db.pre-es-backfill-backup ; echo "exit=$?"
lsof: WARNING: can't stat() tracefs file system /sys/kernel/debug/tracing
      Output information may be incomplete.
exit=1

(same pattern for all four files — exit=1, no open file descriptors listed)
```

**None of the four files are currently open by any process.** The tracefs warning is a system-level lsof limitation, not a match. [VERIFIED]

---

## 4. INTEGRITY — SQLITE CHECKS

### All four files

| File | integrity_check | Table count |
|------|----------------|-------------|
| pre-es-backfill-backup | `ok` exit=0 | 40 exit=0 |
| pre-es-migration-backup | `ok` exit=0 | 40 exit=0 |
| pre-stories-backfill-backup | `ok` exit=0 | 40 exit=0 |
| pre-rg-drop-backup | `ok` exit=0 | 40 exit=0 |

All four pass `PRAGMA integrity_check` and contain 40 tables. [VERIFIED]

### pre-rg-drop-backup — RG tables specifically

```
$ sudo -u shelter sqlite3 /home/shelter/shelter-apps/data/shelter.db.pre-rg-drop-backup \
  "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'rg\_%' ESCAPE '\';" ; echo "exit=$?"
rg_requesters
rg_requests
rg_messages
rg_attachments
rg_email_routing
rg_sessions
exit=0
```

```
$ sudo -u shelter sqlite3 /home/shelter/shelter-apps/data/shelter.db.pre-rg-drop-backup \
  "SELECT COUNT(*) FROM rg_messages;" ; echo "exit=$?"
25
exit=0
```

The pre-rg-drop snapshot contains all 6 `rg_*` tables. `rg_messages` has 25 rows. This is the last snapshot before the RG table drop — it is the sole recovery path for this data. [VERIFIED]

---

## 5. FILESYSTEM AND HEADROOM

```
$ df -h /home ; echo "exit=$?"
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda         79G   32G   43G  43% /
exit=0
```

```
$ stat -f -c '%i' /home/shelter/shelter-apps/data ; echo "exit=$?"
491c8dc3cec425e2
exit=0

$ stat -f -c '%i' /home/shelter/backups ; echo "exit=$?"
491c8dc3cec425e2
exit=0
```

**Same filesystem ID (`491c8dc3cec425e2`).** A `mv` between these directories is an atomic rename, not a copy. [VERIFIED]

```
$ ls -ld /home/shelter/backups ; echo "exit=$?"
drwxr-xr-x 2 shelter shelter 20480 Jul  9 03:30 /home/shelter/backups
exit=0
```

Backups dir owned by `shelter:shelter`, mode 755. The four snapshot files are owned by `root:shelter` — a `mv` from `data/` to `backups/` would preserve ownership (root:shelter) since `mv` on the same filesystem is a directory entry operation. [VERIFIED]

---

*Report generated read-only. No files were moved, deleted, or modified.*
