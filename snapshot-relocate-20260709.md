# Snapshot Relocate — 2026-07-09

**Date:** 2026-07-09 19:58–20:00 UTC
**Author:** Rover (automated)

---

## UTC Time Check

```
$ date -u
Thu Jul  9 07:58:07 PM UTC 2026
```

19:58 UTC — outside the 03:00–03:30 backup window. [VERIFIED]

---

## Pre-Move State

### Four files — size + sha256

| File | Size (bytes) | sha256 |
|------|-------------|--------|
| shelter.db.pre-es-backfill-backup | 36,556,800 | `2d0b35a7d7ab8613d01abbb0175b371afc79eb9c8153e54bae026bce042a0bde` |
| shelter.db.pre-es-migration-backup | 36,556,800 | `5771162719f3a122d6268a443a016e139878c6d9bfa0ec2c5cf8036f1b61513c` |
| shelter.db.pre-stories-backfill-backup | 36,556,800 | `d97f6d5a0beb6955ab29498947d6055dc47d53b131a49902ca3f21f5c9519698` |
| shelter.db.pre-rg-drop-backup | 36,900,864 | `526fda11cfa2ea4b6edb686bd976492a1eb7f2aebe657f288a9ea52a692662d7` |

All four existed at `/home/shelter/shelter-apps/data/`. None open per `lsof` (exit=0, no output). [VERIFIED]

### Live DB (pre-move baseline for untouched verification)

| File | Size | Mtime |
|------|------|-------|
| shelter.db | 37,806,080 | 2026-07-09 19:12:28.641920939 +0000 |
| shelter.db-shm | 32,768 | 2026-07-09 19:30:06.559846549 +0000 |
| shelter.db-wal | 4,569,112 | 2026-07-09 19:30:06.559846549 +0000 |

---

## Destination Directory

```
$ sudo -u shelter mkdir -p /home/shelter/backups/pre-migration
$ ls -ld /home/shelter/backups/pre-migration
drwxrwxr-x 2 shelter shelter 4096 Jul  9 19:58 /home/shelter/backups/pre-migration
```

Owner: `shelter:shelter`, mode 775 (inherits setgid from parent). [VERIFIED]

---

## Move Operations

```
$ mv /home/shelter/shelter-apps/data/shelter.db.pre-es-backfill-backup /home/shelter/backups/pre-migration/    exit=0
$ mv /home/shelter/shelter-apps/data/shelter.db.pre-es-migration-backup /home/shelter/backups/pre-migration/   exit=0
$ mv /home/shelter/shelter-apps/data/shelter.db.pre-stories-backfill-backup /home/shelter/backups/pre-migration/ exit=0
$ mv /home/shelter/shelter-apps/data/shelter.db.pre-rg-drop-backup /home/shelter/backups/pre-migration/        exit=0
```

Same filesystem (`491c8dc3cec425e2`) — atomic renames. [VERIFIED]

Additionally moved 8 SQLite WAL/SHM companion files (created by Auditor 5 integrity checks at 19:39 UTC):
- 4 × `-shm` (32,768 bytes each)
- 4 × `-wal` (0 bytes each)

All 8 moved with exit=0. [VERIFIED]

---

## Post-Move Verification

### 4a. Files at new location — sha256 match

| File | Post-move sha256 | Match? |
|------|-----------------|--------|
| pre-es-backfill-backup | `2d0b35a7d7ab8613d01abbb0175b371afc79eb9c8153e54bae026bce042a0bde` | ✅ MATCH [VERIFIED] |
| pre-es-migration-backup | `5771162719f3a122d6268a443a016e139878c6d9bfa0ec2c5cf8036f1b61513c` | ✅ MATCH [VERIFIED] |
| pre-stories-backfill-backup | `d97f6d5a0beb6955ab29498947d6055dc47d53b131a49902ca3f21f5c9519698` | ✅ MATCH [VERIFIED] |
| pre-rg-drop-backup | `526fda11cfa2ea4b6edb686bd976492a1eb7f2aebe657f288a9ea52a692662d7` | ✅ MATCH [VERIFIED] |

All four byte-identical after move. [VERIFIED]

### 4b. data/ now clean

```
$ ls /home/shelter/shelter-apps/data/shelter.db*
/home/shelter/shelter-apps/data/shelter.db
/home/shelter/shelter-apps/data/shelter.db-shm
/home/shelter/shelter-apps/data/shelter.db-wal
```

Only the live shelter.db and its WAL/SHM remain. All pre-migration snapshots and their companions are gone. [VERIFIED]

### 4c. Live DB untouched

| File | Pre-move mtime | Post-move mtime | Pre-move size | Post-move size |
|------|---------------|----------------|--------------|---------------|
| shelter.db | 19:12:28.641920939 | 19:12:28.641920939 | 37,806,080 | 37,806,080 |
| shelter.db-shm | 19:30:06.559846549 | 19:30:06.559846549 | 32,768 | 32,768 |
| shelter.db-wal | 19:30:06.559846549 | 19:30:06.559846549 | 4,569,112 | 4,569,112 |

All three identical — mtime and size unchanged. [VERIFIED]

### 4d. Service active

```
$ systemctl is-active shelter-app
active
exit=0
```

[VERIFIED]

### 4e. Trivial DB read

```
$ sudo -u shelter sqlite3 /home/shelter/shelter-apps/data/shelter.db "SELECT COUNT(*) FROM volunteers;"
451
exit=0
```

App database reads succeed. [VERIFIED]

### 4f. Integrity check on relocated snapshot

```
$ sudo -u shelter sqlite3 /home/shelter/backups/pre-migration/shelter.db.pre-rg-drop-backup "PRAGMA integrity_check;"
ok
exit=0
```

Relocated snapshot intact. [VERIFIED]

---

## Expected Effect

The four DB snapshots totaled **146,571,264 bytes uncompressed** (139.8 MB). With the ~8 WAL/SHM companions (~131 KB), the total removed from the data tarball input is ~146.7 MB uncompressed.

The next nightly `data-*.tar.gz` (at 03:15 UTC) should drop from ~223 MB compressed to approximately the pre-Jul-7 baseline of ~167 MB compressed — a reduction of ~56 MB per nightly tarball. Across the 14-day retention window, this saves ~784 MB of backup storage.

Nothing was deleted. All four snapshots (including the sole surviving RG data copy) are preserved at `/home/shelter/backups/pre-migration/`.

---

*Four files moved, zero deleted. Live DB and service untouched.*
