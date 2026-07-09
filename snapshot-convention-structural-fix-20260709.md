# Structural Fix: Snapshot-Location Convention + Health-Check Detector

**Date:** 2026-07-09 20:10 UTC
**Author:** Rover (automated)
**Auditor 5 finding:** pre-migration DB snapshots in `data/` inflated nightly tarballs by ~56MB

---

## 1. Install Confirmation

```
$ diff /home/shelter/scripts/health-check.sh /tmp/health-check-patched.sh
(no output — files identical)
diff exit=0

$ ls -la /home/shelter/scripts/health-check.sh
-rwxr-xr-x 1 root root 25268 Jul  9 20:08 /home/shelter/scripts/health-check.sh
```

Patched health-check.sh installed, root:root 755. [VERIFIED]

---

## 2. AGENTS.md — Rule 14 (Snapshot Location)

**File:** `/home/rover/rover/AGENTS.md` [VERIFIED]

### Added text (verbatim)

```
14. **Snapshot location.** Pre-migration and ad-hoc DB snapshots MUST be written to
    `/home/shelter/backups/pre-migration/`, NEVER into `/home/shelter/shelter-apps/data/`
    or any directory archived by a backup script. Canonical command:
        sudo -u shelter sqlite3 /home/shelter/shelter-apps/data/shelter.db \
          ".backup '/home/shelter/backups/pre-migration/shelter.db.pre-<change>-backup'"
    **Why:** `data/` is archived nightly by `backup-data.sh`. Snapshots left there are
    swept into every tarball, inflating each by ~35MB per snapshot. The weekly health check
    (`health-check.sh`) will FAIL if a stray DB snapshot is found in `data/`.
```

### Renumbered rules (surrounding context intact)

| Before | After | Rule |
|--------|-------|------|
| 14 | 15 | Telegram (interactive) |
| 15 | 16 | Alerts (automated) |
| 16 | 17 | Visual debugging |

Rules 1–13 unchanged. Rules 15–17 text unchanged, only numbers incremented. [VERIFIED]

---

## 3. Health-Check Assertion (added block)

Inserted at line 382 of `/home/shelter/scripts/health-check.sh`, immediately before the `# --- Crontabs (report only) ---` section:

```bash
# --- Stray DB snapshots in data/ (structural convention, AGENTS.md rule 14) ---
STRAY_SNAPSHOTS=""
while IFS= read -r sfile; do
  [ -n "$sfile" ] && STRAY_SNAPSHOTS="${STRAY_SNAPSHOTS}$(basename "$sfile") "
done < <(find /home/shelter/shelter-apps/data -maxdepth 1 -type f -name 'shelter.db.*' \
  ! -name 'shelter.db-wal' ! -name 'shelter.db-shm' 2>/dev/null)
if [ -n "$STRAY_SNAPSHOTS" ]; then
  flag_critical "Stray DB snapshot(s) in data/: ${STRAY_SNAPSHOTS}— move to /home/shelter/backups/pre-migration/ (AGENTS.md rule 14)"
fi
```

Uses `flag_critical` — the existing severity mechanism. Surfaces in the Telegram summary the same way all other critical flags do. No new severity mechanism introduced. [VERIFIED]

---

## 4. Able-to-Fail Proof

### Run 1 — Baseline (clean `data/`)

```
$ ls /home/shelter/shelter-apps/data/shelter.db*
/home/shelter/shelter-apps/data/shelter.db
/home/shelter/shelter-apps/data/shelter.db-shm
/home/shelter/shelter-apps/data/shelter.db-wal

RESULT: PASS (0 critical flags — data/ clean)
exit=0
```

**PASS.** The live `shelter.db`, `-wal`, and `-shm` do NOT trigger the check — they are correctly excluded. [VERIFIED]

### Run 2 — Dummy planted

```
$ sudo -u shelter bash -c 'echo test > /home/shelter/shelter-apps/data/shelter.db.ZZTEST-backup'
plant exit=0

$ ls -la /home/shelter/shelter-apps/data/shelter.db.ZZTEST-backup
-rw-rw-r-- 1 shelter shelter 5 Jul  9 20:10 ...shelter.db.ZZTEST-backup

RESULT: FAIL (1 critical flag(s))
  ⚠️ Stray DB snapshot(s) in data/: shelter.db.ZZTEST-backup — move to /home/shelter/backups/pre-migration/ (AGENTS.md rule 14)
exit=1
```

**FAIL.** Detector fired, named the offending file, pointed to the convention. [VERIFIED]

### Run 3 — Dummy removed, re-run

```
$ rm /home/shelter/shelter-apps/data/shelter.db.ZZTEST-backup
rm exit=0

$ ls /home/shelter/shelter-apps/data/shelter.db*
/home/shelter/shelter-apps/data/shelter.db
/home/shelter/shelter-apps/data/shelter.db-shm
/home/shelter/shelter-apps/data/shelter.db-wal

RESULT: PASS (0 critical flags — data/ clean)
exit=0
```

**PASS.** Returns to clean after dummy removed. [VERIFIED]

### Live DB not flagged

Runs 1 and 3 both show `shelter.db`, `shelter.db-shm`, and `shelter.db-wal` present in `data/` and the check passes — the exclusion pattern (`! -name 'shelter.db-wal' ! -name 'shelter.db-shm'`) works correctly. The `find -name 'shelter.db.*'` glob does not match `shelter.db` itself (no dot-suffix). [VERIFIED]

---

## 5. No Backup Scripts Modified

```
$ ls -la /home/shelter/scripts/backup-*.sh
-rwxr-xr-x 1 root root  1433 Jun 29 20:22 backup-data.sh
-rwxr-xr-x 1 root root  1298 Jun 29 20:22 backup-media.sh
-rwxr-xr-x 1 root root  1683 Apr 19 16:48 backup-sqlite.sh
-rwxr-xr-x 1 root root  9077 Jun 29 20:22 backup-weekly.sh
```

All four backup scripts have mtimes predating this session (Jun 29 / Apr 19). None modified. [VERIFIED]

---

## 6. Relocated Snapshots Intact

```
$ ls /home/shelter/backups/pre-migration/shelter.db.pre-*
shelter.db.pre-es-backfill-backup       (36,556,800 bytes, Jul  7 02:57)
shelter.db.pre-es-backfill-backup-shm   (32,768 bytes, Jul  9 19:39)
shelter.db.pre-es-backfill-backup-wal   (0 bytes, Jul  9 19:39)
shelter.db.pre-es-migration-backup      (36,556,800 bytes, Jul  7 01:47)
shelter.db.pre-es-migration-backup-shm  (32,768 bytes, Jul  9 19:39)
shelter.db.pre-es-migration-backup-wal  (0 bytes, Jul  9 19:39)
shelter.db.pre-rg-drop-backup           (36,900,864 bytes, Jul  7 20:22)
shelter.db.pre-rg-drop-backup-shm       (32,768 bytes, Jul  9 19:39)
shelter.db.pre-rg-drop-backup-wal       (0 bytes, Jul  9 19:39)
shelter.db.pre-stories-backfill-backup  (36,556,800 bytes, Jul  7 03:56)
shelter.db.pre-stories-backfill-backup-shm (32,768 bytes, Jul  9 19:39)
shelter.db.pre-stories-backfill-backup-wal (0 bytes, Jul  9 19:39)
```

4 snapshots + 8 companions, all present, sizes and mtimes unchanged from relocation. Nothing deleted or altered. [VERIFIED]

---

## 7. data/ Final State

```
$ ls -la /home/shelter/shelter-apps/data/shelter.db*
-rw-r--r-- 1 shelter shelter 37806080 Jul  9 19:12 shelter.db
-rw-r--r-- 1 shelter shelter    32768 Jul  9 20:04 shelter.db-shm
-rw-r--r-- 1 shelter shelter  4569112 Jul  9 20:02 shelter.db-wal
```

Only the live DB and its WAL/SHM. ZZTEST dummy removed. No other artifacts. [VERIFIED]

---

## 8. Git

AGENTS.md is in `/home/rover/rover/` (rover's workspace repo). health-check.sh is in `/home/shelter/scripts/` (not under git). Only AGENTS.md was committed.

---

*Two changes: convention encoded (AGENTS.md rule 14) + detector installed (health-check.sh flag_critical). Able-to-fail proven: FAIL with dummy, PASS when clean.*
