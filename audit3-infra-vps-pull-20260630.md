# Auditor 3 — VPS/OS Infrastructure Pull

**Date:** 2026-07-01 01:37 UTC

---

## 1. OS + Patch State

| Field | Value |
|-------|-------|
| Kernel | 6.8.0-106-generic x86_64 |
| Distro | Ubuntu 24.04.3 LTS (noble) |
| Upgradable packages | 63 |
| Security-tagged upgradable | 3 (libnss3, libsqlite3-0, sqlite3 — all noble-security) |
| unattended-upgrades | enabled (`systemctl is-enabled` → enabled) |
| APT auto-upgrade config | `Update-Package-Lists "1"`, `Unattended-Upgrade "1"` |
| Reboot required | **YES** — `/var/run/reboot-required` exists |

[VERIFIED — `uname -a`, `lsb_release -a`, `apt list --upgradable`, `systemctl is-enabled unattended-upgrades`, `cat /etc/apt/apt.conf.d/20auto-upgrades`, `ls /var/run/reboot-required`]

---

## 2. Full Listening Sockets

| Proto | Local Address | Port | Binding | Process (if visible) |
|-------|--------------|------|---------|---------------------|
| udp | 0.0.0.0 | 35067 | **PUBLIC** | (no attribution — root-only) |
| udp | 0.0.0.0 | 5353 | **PUBLIC** | (no attribution — root-only) |
| udp | 127.0.0.54 | 53 | loopback | (no attribution — root-only) |
| udp | 127.0.0.53 | 53 | loopback | (no attribution — root-only) |
| udp | * | 443 | **PUBLIC** | (no attribution — root-only) — Caddy QUIC/HTTP3 |
| udp | [::] | 53989 | **PUBLIC** | (no attribution — root-only) |
| udp | [::] | 5353 | **PUBLIC** | (no attribution — root-only) |
| tcp | 127.0.0.1 | 2019 | loopback | (no attribution — root-only) — Caddy admin API |
| tcp | 127.0.0.54 | 53 | loopback | (no attribution — root-only) |
| tcp | 0.0.0.0 | 22 | **PUBLIC** | (no attribution — root-only) — SSH |
| tcp | 127.0.0.53 | 53 | loopback | (no attribution — root-only) |
| tcp | 127.0.0.1 | 3000 | loopback | (no attribution — root-only) — shelter-app |
| tcp | 127.0.0.1 | 18790 | loopback | openclaw (pid 105776) — rover |
| tcp | * | 80 | **PUBLIC** | (no attribution — root-only) — Caddy HTTP |
| tcp | [::] | 22 | **PUBLIC** | (no attribution — root-only) — SSH v6 |
| tcp | * | 443 | **PUBLIC** | (no attribution — root-only) — Caddy HTTPS |
| tcp | [::1] | 18790 | loopback | openclaw (pid 105776) — rover v6 |

[VERIFIED — `ss -tulnp`]

**Notable:** UDP 5353 (mDNS) on 0.0.0.0 and [::] — standard Avahi/systemd-resolved; typically blocked by UFW if not in allow rules. UDP 35067 and 53989 are ephemeral — likely Caddy QUIC return ports or systemd-resolved.

---

## 3. Firewall

**NEEDS JOHN.** `sudo ufw status verbose` requires an interactive password prompt; rover has no passwordless sudo for ufw. 

Command for John to run:
```
sudo ufw status verbose
```

[VERIFIED — `sudo ufw status verbose` returned "a terminal is required to read the password"]

---

## 4. Scheduled Tasks

### rover crontab

| Schedule | Command |
|----------|---------|
| `*/15 * * * *` | `/home/rover/scripts/memory-snapshot.sh` |
| `0 4 * * *` | `/home/rover/scripts/screenshots-retention.sh` |
| `0 6 * * *` | `sudo -u shelter python3 /home/shelter/shelter-apps/scripts/score-profiles.py` |

[VERIFIED — `crontab -l`]

### shelter crontab

No crontab for shelter. [VERIFIED — `sudo -u shelter crontab -l`]

### root crontab

**NEEDS JOHN.** `sudo crontab -l` requires interactive password.

Command for John to run:
```
sudo crontab -l
```

[VERIFIED — `sudo crontab -l` returned password prompt error]

### /etc/cron.d/

| File | Owner | Notes |
|------|-------|-------|
| e2scrub_all | root | Filesystem scrub (standard) |
| php | root | PHP session cleanup (standard) |
| sysstat | root | System activity reports (standard) |

No custom shelter/rover cron.d entries. [VERIFIED — `ls -la /etc/cron.d/`]

### /etc/cron.{daily,hourly,weekly,monthly}/

- **daily:** apport, apt-compat, dpkg, google-chrome, logrotate, man-db, sysstat (all standard)
- **hourly:** (empty)
- **weekly:** man-db (standard)
- **monthly:** (empty)

No custom entries in any periodic directory. [VERIFIED — `ls` of all four directories]

### systemd timers

17 timers listed — all are standard Ubuntu system timers (apt-daily, logrotate, fstrim, dpkg-db-backup, etc.) plus phpsessionclean. No custom shelter/rover timers. [VERIFIED — `systemctl list-timers --all`]

---

## 5. Accounts + Login Capability

### Accounts with login shells

| Username | UID | Shell | Home |
|----------|-----|-------|------|
| root | 0 | /bin/bash | /root |
| shelter | 1000 | /bin/bash | /home/shelter |
| rover | 1001 | /bin/bash | /home/rover |

All other 34 accounts have /usr/sbin/nologin or /bin/false. [VERIFIED — `cat /etc/passwd`, `grep -c nologin\|false`]

### Privilege

- **sudo group members:** (none) — the sudo group exists but has no members. [VERIFIED — `getent group sudo` showed `sudo:x:27:` with empty member list]
- **UID-0 accounts:** root only. [VERIFIED — `awk -F: '$3==0' /etc/passwd`]

### /etc/shadow (empty password check)

**NEEDS JOHN.** Cannot read /etc/shadow as rover.

Command for John to run:
```
sudo awk -F: '$2=="" {print $1}' /etc/shadow
```

### Login history

All 20 most recent logins are `root` from IP `24.189.251.114` (John's home IP). No other user or IP has logged in. Most recent: Mon Jun 29 20:01. [VERIFIED — `last -20`]

`lastlog` shows only root with a login record; shelter and rover have never logged in interactively. [VERIFIED — `lastlog | grep -v Never`]

---

## 6. SSH Configuration

### sshd_config

| Setting | Value |
|---------|-------|
| PermitRootLogin | prohibit-password |
| PubkeyAuthentication | yes (commented = default yes) |
| PasswordAuthentication | no |
| Config file mtime | 2026-05-18 22:33:41 UTC |

**No change since last audit (2026-05-18).** [VERIFIED — `grep` of sshd_config, `stat`]

### Authorized keys

**root:** NEEDS JOHN — `/root/.ssh/authorized_keys` is permission-denied for rover.

Command for John to run:
```
ssh-keygen -lf /root/.ssh/authorized_keys
```

**shelter:** NEEDS JOHN — `/home/shelter/.ssh/authorized_keys` is permission-denied for rover.

Command for John to run:
```
sudo ssh-keygen -lf /home/shelter/.ssh/authorized_keys
```

**rover:** No `authorized_keys` file exists — rover cannot be logged into via SSH. [VERIFIED — `ls -la /home/rover/.ssh/authorized_keys` → No such file]

rover's SSH directory contains only an outbound keypair (for SiteGround access):
- `id_ed25519` (mode 600, owner rover) — private key
- `id_ed25519.pub` (mode 644, owner rover) — fingerprint: `SHA256:6Q44EPl//v+nQvD6Ltuxd6nYxa5wxLufAdervIcUzg0 rover@vps-shelter-sg-theme-access (ED25519)` [VERIFIED — `ssh-keygen -lf`]
- `known_hosts` / `known_hosts.old` — SiteGround host keys

---

## 7. Secrets at Rest

### Credential file inventory

| Path | Mode | Owner | Top-level keys |
|------|------|-------|---------------|
| `/home/shelter/.config/shelter-secrets.json` | -rw------- (600) | shelter:shelter | shelterManager, openai, googleSheets, resend, wordpress, xai, anthropic, alertsBotToken, alertsBotChatId, shelterManagerWrite, github_rover_reports_pat, github_rover_reports_screenshots_pat |
| `/home/shelter/.config/google-sheets-credentials.json` | -rw------- (600) | shelter:shelter | (Google service account credentials) |
| `/home/shelter/.config/rover-gateway-token.txt` | -rw------- (600) | shelter:shelter | (single token value) |
| `/home/shelter/.config/secrets.json` | -rw------- (600) | shelter:shelter | (legacy secrets file, 370 bytes) |
| `/home/shelter/.config/server.env` | -rw------- (600) | shelter:shelter | (empty file, 0 bytes) |
| `/home/rover/.openclaw-rover/openclaw.json` | -rw------- (600) | rover:rover | (OpenClaw gateway config) |
| `/home/rover/.openclaw-rover/telegram-bot-token.txt` | -rw------- (600) | rover:rover | (single token value) |
| `/home/rover/.ssh/id_ed25519` | -rw------- (600) | rover:rover | (SSH private key) |
| `/home/shelter/backups/shelter-secrets-pre-credential-swap-20260523-220811.json` | -rw------- (600) | shelter:shelter | (pre-swap backup of secrets) |

**⚠️ One file is group/world-readable:**

| Path | Mode | Owner | Issue |
|------|------|-------|-------|
| `/home/shelter/shelter-apps/server/.env` | **-rw-rw-r-- (664)** | shelter:shelter | Group+world readable — but file is **empty** (0 bytes), so no actual secret exposure. |

[VERIFIED — `ls -la` on all files listed above]

### systemd unit environment

- `shelter-app.service`: `Environment=NODE_ENV=production` only. No `EnvironmentFile=`. [VERIFIED — `systemctl cat shelter-app`]
- `rover.service`: `Environment=HOME=/home/rover`, `Environment=NODE_ENV=production` only. No `EnvironmentFile=`. [VERIFIED — `systemctl cat rover`]

**No credential file is group- or world-readable (except the empty .env).** All secrets are mode 600. [VERIFIED]

---

## 8. Backups at Rest

### Backup location and types

All backups are in `/home/shelter/backups/` (mode drwxr-xr-x, shelter:shelter).

| Type | Latest file | Size | Mode | Owner |
|------|------------|------|------|-------|
| Daily SQLite | shelter-2026-06-30.db | 33MB | -rw-r--r-- (644) | root |
| Data tarball | data-20260630-031501.tar.gz | 165MB | -rw-r--r-- (644) | root |
| Weekly tarball | weekly-20260630.tar.gz | 30MB | -rw-r--r-- (644) | root |
| Media tarball | media-20260629.tar.gz | 487MB | -rw-rw-r-- (664) | shelter |
| Pre-migration snapshots | pre-featured-email-20260630-215146.db | 34MB | -rw-r--r-- (644) | shelter |

### Sensitive content in backups

**(a) Secrets/credential files:**
- **weekly tarball** (`weekly-20260630.tar.gz`) contains `./secrets/google-sheets-credentials.json` and `./secrets/shelter-secrets.json` — **full credential files are in the weekly backup**. The tarball itself is mode 644 (world-readable on the VPS). [VERIFIED — `tar -tzf`]
- Data tarball does not contain secrets files. [VERIFIED — grep of tar listing]

**(b) SQLite DB with applicant/volunteer PII:**
- **Data tarball** contains `data/shelter.db` — the full live database with adoption applications and volunteer data. Tarball is mode 644. [VERIFIED — `tar -tzf`]
- Daily SQLite backups (`shelter-YYYY-MM-DD.db`) are also mode 644 — full DB copies with PII. [VERIFIED — `ls -la`]

**(c) Volunteer files:**
- **Data tarball** contains `data/volunteer-files/` with scanned application page images (page-01.jpg through page-04.jpg for multiple submissions). Tarball is mode 644. [VERIFIED — `tar -tzf`]

**⚠️ ALL backup files (tarballs, DB copies) are world-readable (mode 644 or 664).** The parent directory `/home/shelter/backups/` is world-executable (drwxr-xr-x), meaning any user on the box can read the backups. The backups contain: full credentials (weekly), full PII database (data + daily), and volunteer application scans (data).

However: only root, shelter, and rover have login shells, and the backups directory's parent `/home/shelter` is mode drwxr-x--x (750-ish — world has execute but not read, so cannot list contents, but can traverse if path is known). [VERIFIED — `ls -la /home/shelter/`]

---

## 9. Intrusion Controls

### fail2ban

**Not installed.** `systemctl status fail2ban` → "Unit fail2ban.service could not be found." [VERIFIED]

### Brute-force pressure (counts only)

| Log file | "Failed password" | "Invalid user" |
|----------|-------------------|----------------|
| auth.log (current) | 0 | 2,830 |
| auth.log.1 | 0 | 7,786 |
| auth.log.2.gz | 0 | 11,997 |
| **Total** | **0** | **22,613** |

Zero failed-password attempts (consistent with PasswordAuthentication=no — password auth is disabled, so no password failures are possible). 22,613 "Invalid user" attempts across the three most recent log files — SSH scanners attempting non-existent usernames. [VERIFIED — `grep -c` across auth.log*]

---

## 10. OC/Rover Service Surface

### systemd unit (rover.service)

```ini
[Service]
Type=simple
ExecStart=/usr/bin/openclaw --profile rover gateway
User=rover
Group=rover
WorkingDirectory=/home/rover/rover
Environment=HOME=/home/rover
Restart=always
RestartSec=5
Environment=NODE_ENV=production
```

No `EnvironmentFile=`. No secrets referenced in the unit — OpenClaw reads its config from `/home/rover/.openclaw-rover/openclaw.json` (mode 600, rover:rover) at runtime. [VERIFIED — `systemctl cat rover`]

### Network binding

Port 18790 is bound to 127.0.0.1 (IPv4) and [::1] (IPv6) — loopback only. [VERIFIED — `ss -tlnp | grep 18790`]

### External access

Caddy reverse-proxies `rover.4lgshelterapp.duckdns.org` → `localhost:18790`. The OpenClaw gateway handles its own authentication (webchat sessions, Telegram bot token). There is no additional auth layer in the Caddy block (no basic_auth directive). [VERIFIED — Caddyfile inspection]

---

## DIVERGENCES FROM HARDENED BASELINE

| # | Finding | Severity | Notes |
|---|---------|----------|-------|
| 1 | **Reboot required** — `/var/run/reboot-required` exists | Medium | Kernel/library update pending reboot; 3 security-tagged packages upgradable |
| 2 | **fail2ban not installed** | Medium | 22,613 invalid-user SSH probes with no automated blocking; PasswordAuthentication=no mitigates password brute-force, but scanner noise is unbounded |
| 3 | **Backup files are world-readable (mode 644)** and contain full credentials + PII database + volunteer scans | High | Weekly tarball includes shelter-secrets.json; data tarball includes shelter.db with applicant PII and volunteer file scans. Any process on the box can read them if it knows the path. |
| 4 | **UFW status not verified** — needs root (NEEDS JOHN) | Unknown | Last verified 2026-05-18 as active with default-deny; needs re-verification |
| 5 | **Root crontab not verified** — needs root (NEEDS JOHN) | Unknown | Weekly tarball includes `configs/root-crontab.txt` suggesting root has scheduled tasks; cannot verify current state |
| 6 | **Root + shelter authorized_keys not verified** — needs root (NEEDS JOHN) | Unknown | Cannot confirm which SSH keys are authorized for root and shelter |
| 7 | **/etc/shadow not readable** — needs root (NEEDS JOHN) | Unknown | Cannot verify no accounts have empty passwords |
| 8 | UDP 5353 (mDNS) publicly bound | Low | Standard Avahi/systemd-resolved; should be blocked by UFW if active (unverified — item 4) |
| 9 | No sudo group members | Info | root login is direct SSH key only; no privilege escalation path via sudo — intentional but notable |

**Baseline-compliant:** SSH is key-only (PasswordAuthentication no, PermitRootLogin prohibit-password). Express (shelter-app :3000) is loopback-only. OpenClaw (rover :18790) is loopback-only. Caddy admin API (:2019) is loopback-only. All credential files are mode 600. No unexpected accounts or login activity.
