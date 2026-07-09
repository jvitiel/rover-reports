# Auditor 5 — Cron TZ Diagnosis — 2026-07-09

**Date:** 2026-07-09 19:10 UTC
**Author:** Rover (automated, read-only)
**Report path:** `/home/rover/rover-reports-repo/` (current primary path; `/home/shelter/rover-reports/` is legacy per AGENTS.md)

---

## 1. SERVER CLOCK

```
$ timedatectl ; echo "exit=$?"
               Local time: Thu 2026-07-09 19:07:05 UTC
           Universal time: Thu 2026-07-09 19:07:05 UTC
                 RTC time: Thu 2026-07-09 19:07:05
                Time zone: Etc/UTC (UTC, +0000)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
exit=0
```

```
$ date ; echo "exit=$?"
Thu Jul  9 07:07:05 PM UTC 2026
exit=0
```

```
$ date -u ; echo "exit=$?"
Thu Jul  9 07:07:05 PM UTC 2026
exit=0
```

```
$ cat /etc/timezone ; echo "exit=$?"
Etc/UTC
exit=0
```

Server timezone is `Etc/UTC`. `date` and `date -u` produce identical output. [VERIFIED]

---

## 2. HOW THE BACKUP FILENAME TIMESTAMP IS GENERATED

### /home/shelter/scripts/backup-sqlite.sh

```
$ grep -n 'date' /home/shelter/scripts/backup-sqlite.sh ; echo "exit=$?"
12:DATE=$(date +%Y-%m-%d)
13:TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
exit=0
```

Uses `date` (local). Does NOT use `date -u`. [VERIFIED]
Header comment: "Daily SQLite backup script for shelter databases" — no ET/UTC annotation on the date call.

### /home/shelter/scripts/backup-data.sh

```
$ grep -n 'date' /home/shelter/scripts/backup-data.sh ; echo "exit=$?"
13:TIMESTAMP=$(date +%Y%m%d-%H%M%S)
17:  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >> "$LOG"
exit=0
```

- **Filename timestamp** (line 13): `date` (local) — produces the archive name `data-YYYYMMDD-HHMMSS.tar.gz`. [VERIFIED]
- **Log timestamps** (line 17): `date -u` (UTC). [VERIFIED]
- Header comment: "Daily data backup at 3:15am ET."

### /home/shelter/scripts/backup-weekly.sh

```
$ grep -n 'date' /home/shelter/scripts/backup-weekly.sh ; echo "exit=$?"
23:TIMESTAMP=$(date +%Y%m%d)
28:  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >> "$LOG"
105:apt update && apt upgrade -y
211:Point the existing domains at the new VPS IP, or update duckdns records.
exit=0
```

- **Filename timestamp** (line 23): `date` (local) — produces `weekly-YYYYMMDD.tar.gz`. [VERIFIED]
- **Log timestamps** (line 28): `date -u` (UTC). [VERIFIED]
- Header comment: "Weekly snapshot — Saturday 3:30am ET."
- Lines 105/211 are inside a heredoc (RESTORE.md), not timestamp generation.

### /home/shelter/scripts/backup-media.sh

```
$ grep -n 'date' /home/shelter/scripts/backup-media.sh ; echo "exit=$?"
12:TIMESTAMP=$(date +%Y%m%d)
16:  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >> "$LOG"
exit=0
```

- **Filename timestamp** (line 12): `date` (local). [VERIFIED]
- **Log timestamps** (line 16): `date -u` (UTC). [VERIFIED]

### Summary: all four scripts

| Script | Filename timestamp | Log timestamp |
|--------|-------------------|---------------|
| backup-sqlite.sh | `date` (local) | `date` (local) — via `$TIMESTAMP` |
| backup-data.sh | `date` (local) | `date -u` (UTC) |
| backup-weekly.sh | `date` (local) | `date -u` (UTC) |
| backup-media.sh | `date` (local) | `date -u` (UTC) |

Since the server TZ is UTC, `date` and `date -u` currently produce the same output. [VERIFIED]

---

## 3. WHEN THE JOBS ACTUALLY RAN — mtimes

### Weekly backups (last ~10 days)

```
$ ls -la --time-style=full-iso /home/shelter/backups/weekly-* | tail -10 ; echo "exit=$?"
-rw-r--r--  1 root root  30536417 2026-07-03 03:30:04.236051584 +0000 weekly-20260703.tar.gz
-rw-r--r--  1 root root  30536417 2026-07-04 03:30:04.060536769 +0000 weekly-20260704.tar.gz
-rw-r--r--  1 root root  30933397 2026-07-05 03:30:03.731843227 +0000 weekly-20260705.tar.gz
-rw-r--r--  1 root root  30933395 2026-07-06 03:30:04.443202282 +0000 weekly-20260706.tar.gz
-rw-r--r--  1 root root  30942565 2026-07-07 03:30:03.950835444 +0000 weekly-20260707.tar.gz
-rw-r--r--  1 root root  31078655 2026-07-08 03:30:03.947242207 +0000 weekly-20260708.tar.gz
-rw-r--r--  1 root root  31076874 2026-07-09 03:30:04.345155428 +0000 weekly-20260709.tar.gz
exit=0
```

Weekly runs daily at 03:30 UTC consistently. Filename date matches mtime date. [VERIFIED]
TOOLS.md says schedule is "3:30am ET". 03:30 UTC = 11:30 PM ET (EDT) = 10:30 PM ET (EST). [VERIFIED — these are UTC mtimes]

### Data backups (last ~10 days)

```
$ ls -la --time-style=full-iso /home/shelter/backups/data-* | tail -10 ; echo "exit=$?"
-rw-r--r-- 1 root root 164863276 2026-07-01 03:15:08.663346823 +0000 data-20260701-031501.tar.gz
-rw-r--r-- 1 root root 164701750 2026-07-02 03:15:08.433958281 +0000 data-20260702-031501.tar.gz
-rw-r--r-- 1 root root 166488488 2026-07-03 03:15:08.398946702 +0000 data-20260703-031501.tar.gz
-rw-r--r-- 1 root root 166833956 2026-07-04 03:15:08.522478475 +0000 data-20260704-031501.tar.gz
-rw-r--r-- 1 root root 167286609 2026-07-05 03:15:09.141725391 +0000 data-20260705-031501.tar.gz
-rw-r--r-- 1 root root 167808322 2026-07-06 03:15:08.713541579 +0000 data-20260706-031501.tar.gz
-rw-r--r-- 1 root root 189030856 2026-07-07 03:15:11.284090940 +0000 data-20260707-031501.tar.gz
-rw-r--r-- 1 root root 217935847 2026-07-08 03:15:13.053991367 +0000 data-20260708-031501.tar.gz
-rw-r--r-- 1 root root 222745783 2026-07-09 03:15:13.757018054 +0000 data-20260709-031501.tar.gz
exit=0
```

Data runs daily at 03:15 UTC consistently. Filename timestamp `031501` matches the mtime. [VERIFIED]
TOOLS.md says schedule is "3:15am ET". 03:15 UTC = 11:15 PM ET (EDT). [VERIFIED]

### SQLite backups (last ~5 days)

```
$ ls -la --time-style=full-iso /home/shelter/backups/shelter-202607* | tail -6 ; echo "exit=$?"
-rw-r--r-- 1 root root 35729408 2026-07-05 03:00:01.930122694 +0000 shelter-2026-07-05.db
-rw-r--r-- 1 root root 36200448 2026-07-06 03:00:01.629352424 +0000 shelter-2026-07-06.db
-rw-r--r-- 1 root root 36556800 2026-07-07 03:00:01.669929203 +0000 shelter-2026-07-07.db
-rw-r--r-- 1 root root 36917248 2026-07-08 03:00:02.017974762 +0000 shelter-2026-07-08.db
-rw-r--r-- 1 root root 37412864 2026-07-09 03:00:01.775316530 +0000 shelter-2026-07-09.db
exit=0
```

SQLite runs daily at 03:00 UTC consistently. [VERIFIED]
TOOLS.md says schedule is "3:00am ET". 03:00 UTC = 11:00 PM ET (EDT). [VERIFIED]

---

## 4. DOES THIS CRON HONOR CRON_TZ

### Cron implementation

```
$ dpkg -l | grep -iE 'cron|cronie' ; echo "exit=$?"
ii  cron                 3.0pl1-184ubuntu2   amd64   process scheduling daemon
ii  cron-daemon-common   3.0pl1-184ubuntu2   all     process scheduling daemon's configuration files
exit=0
```

Package: `cron` version `3.0pl1-184ubuntu2` (Vixie cron, Ubuntu 24.04 Noble). [VERIFIED]

### CRON_TZ in man page

```
$ man 5 crontab | grep -i -A3 CRON_TZ ; echo "exit=$?"
exit=1
```

No mention of `CRON_TZ` in the man page. [VERIFIED]

### CRON_TZ in cron binary

```
$ strings /usr/sbin/cron | grep -i 'CRON_TZ' ; echo "exit=$?"
exit=1
```

No `CRON_TZ` string in the cron binary. [VERIFIED]

### cron.d and /etc/crontab — TZ settings

```
$ grep -rn 'CRON_TZ\|TZ=' /etc/crontab /etc/cron.d/ ; echo "exit=$?"
exit=1
```

No `CRON_TZ` or `TZ=` in `/etc/crontab` or `/etc/cron.d/`. [VERIFIED]

### Root crontab

```
$ cat /var/spool/cron/crontabs/root ; echo "exit=$?"
cat: /var/spool/cron/crontabs/root: Permission denied
exit=1
```

Cannot read root's crontab (rover user lacks permission). [VERIFIED — access denied, not absence]

The backup schedules are in root's crontab (backups are owned by root per `ls -la` output). The root crontab could contain `CRON_TZ` or `TZ=` settings, but this is NOT VERIFIABLE from the rover user. [UNCERTAIN — cannot inspect root crontab]

---

## 5. STAGING SYNC

### Script location and mtime

```
$ ls -la --time-style=full-iso /home/shelter/scripts/staging-sync.sh ; echo "exit=$?"
-rwxr-xr-x 1 root root 3067 2026-04-30 14:06:02.016444623 +0000 /home/shelter/scripts/staging-sync.sh
exit=0
```

[VERIFIED]

### Log location

staging-sync.sh writes to `/home/shelter/backups/staging-sync.log` (line 11 of script). [VERIFIED]

```
$ ls -la --time-style=full-iso /home/shelter/backups/staging-sync.log ; echo "exit=$?"
-rw-r--r-- 1 shelter shelter 5160 2026-07-05 02:30:01.134373887 +0000 staging-sync.log
exit=0
```

### Log contents (full)

```
[2026-04-19T16:03:52Z] === Sync run start ===
[2026-04-19T16:03:52Z] SKIPPED — staging has recent edits ...
[2026-04-19T16:03:52Z] === Sync run end (skipped) ===
[2026-04-19T16:04:12Z] === Sync run start ===
[2026-04-19T16:04:12Z] ALERT: FAILED — source directory missing: /home/shelter/shelter-apps/staff-pwa
[2026-04-20T02:30:01Z] === Sync run start ===
[2026-04-20T02:30:01Z] SKIPPED — staging has recent edits ...
[2026-04-20T02:30:01Z] === Sync run end (skipped) ===
[2026-04-20T03:22:51Z] === Weekly sync run start ===
[2026-04-20T03:22:51Z] SKIPPED — staging has edits within last 7 days ...
[2026-04-20T03:22:51Z] === Weekly sync run end (skipped) ===
[2026-04-26T02:30:01Z] === Weekly sync run start ===
[2026-04-26T02:30:01Z] SKIPPED — staging has edits within last 7 days ...
[2026-04-26T02:30:01Z] === Weekly sync run end (skipped) ===
[2026-05-03T02:30:01Z] === Weekly sync run start === ... SKIPPED
[2026-05-10T02:30:01Z] === Weekly sync run start === ... SKIPPED
[2026-05-17T02:30:01Z] === Weekly sync run start === ... SKIPPED
[2026-05-24T02:30:01Z] === Weekly sync run start === ... SKIPPED
[2026-05-31T02:30:01Z] === Weekly sync run start === ... SKIPPED
[2026-06-07T02:30:02Z] === Weekly sync run start === ... SYNCED — 0 files updated
[2026-06-14T02:30:01Z] === Weekly sync run start === ... SYNCED — 0 files updated
[2026-06-21T02:30:01Z] === Weekly sync run start === ... SYNCED — 0 files updated
[2026-06-28T02:30:01Z] === Weekly sync run start === ... SKIPPED (edits within last 7 days)
[2026-07-05T02:30:01Z] === Weekly sync run start === ... SYNCED — 0 files updated
```

Staging sync runs weekly (Sundays) at 02:30 UTC consistently. [VERIFIED]
TOOLS.md says schedule is "Sun 2:30am ET". 02:30 UTC = 10:30 PM ET (EDT, Saturday night). [VERIFIED]

Log timestamps are generated by `date -u` (UTC). The `02:30:01Z` timestamps are consistent across all runs. [VERIFIED]

---

## RAW DATA SUMMARY (no conclusions)

| Backup job | TOOLS.md schedule (ET) | Actual run time (UTC, from mtimes) | Filename uses |
|------------|----------------------|-----------------------------------|---------------|
| backup-sqlite.sh | 3:00am ET | 03:00 UTC | `date` (local=UTC) |
| backup-data.sh | 3:15am ET | 03:15 UTC | `date` (local=UTC) |
| backup-weekly.sh | 3:30am ET | 03:30 UTC | `date` (local=UTC) |
| staging-sync.sh | Sun 2:30am ET | 02:30 UTC (Sundays) | `date -u` (log only) |

| Fact | Value |
|------|-------|
| Server TZ | Etc/UTC |
| Cron daemon | Vixie cron 3.0pl1-184ubuntu2 |
| CRON_TZ in man page | Not found |
| CRON_TZ in cron binary | Not found |
| CRON_TZ/TZ= in /etc/crontab or /etc/cron.d/ | Not found |
| Root crontab readable | No (permission denied) |

---

*Report generated read-only. No crontabs, scripts, or configs were modified.*
