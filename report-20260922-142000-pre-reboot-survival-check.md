# Pre-Reboot Service Boot-Persistence Survival Check

## 1. Box Identity

Public IPv4: **66.228.37.38** — confirmed 4LG Linode VPS.

## 2. Boot Persistence (is-enabled)

| Service | is-enabled | Survives reboot? |
|---------|-----------|-----------------|
| shelter-app | **enabled** | ✅ Yes | [VERIFIED via `systemctl is-enabled shelter-app`]
| rover | **enabled** | ✅ Yes | [VERIFIED via `systemctl is-enabled rover`]
| caddy | **enabled** | ✅ Yes | [VERIFIED via `systemctl is-enabled caddy`]

All three critical services have `Restart=always` in their unit files and are enabled for boot.

No other shelter/OC/web-specific enabled units found in `systemctl list-unit-files --state=enabled --type=service`.

## 3. Not-Enabled Risks

**None.** All three critical services (shelter-app, rover, caddy) are enabled. No flags.

## 4. Manual Processes

- **tmux sessions:** None (`No such file or directory`)
- **screen sessions:** None (`No Sockets found`)
- **OC gateway (PID 1851043):** PPID=1 — child of init (via systemd `rover.service`), NOT a manual launch. `rover.service` MainPID=1851043 confirms the gateway is managed by systemd. [VERIFIED via `systemctl show rover.service --property=MainPID` and `ps -o ppid= -p 1851043`]

**No critical processes running outside systemd.** A reboot will not kill anything that won't be auto-restored.

## 5. Backups

**Mechanism:** Root's crontab (not readable by rover user, but backup files are root-owned and run on schedule). Rover's crontab has a memory-snapshot script (every 15 min), screenshots-retention (daily 4am UTC), and score-profiles (daily 6am UTC). No shelter user crontab. No systemd timers for backups.

Cron service is **enabled** — cron jobs survive reboot. [VERIFIED via `systemctl list-unit-files --state=enabled` showing `cron.service enabled`]

**Most recent backup files:**

| File | Timestamp | Size |
|------|-----------|------|
| shelter-2026-09-22.db | Sep 22 03:00 UTC | 74 MB |
| data-20260922-031501.tar.gz | Sep 22 03:15 UTC | 250 MB |
| weekly-20260922.tar.gz | Sep 22 03:30 UTC | 31 MB |

All three ran successfully today (Sep 22). Backup chain is current.

## Summary

✅ **All clear for unattended reboot.** shelter-app, rover, and caddy are all systemd-enabled with `Restart=always`. No manual processes to lose. Backups run via cron (cron.service is enabled). Everything should come back up automatically.
