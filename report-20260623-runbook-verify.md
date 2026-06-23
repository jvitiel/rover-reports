# Runbook Verification Report

**Date:** 2026-06-23  
**Type:** Read-only verification  
**Scope:** Verify runbook (dated 2026-05-18) claims against live box

---

## 1. DuckDNS Updater

**Claim:** Runbook references a DuckDNS token for break-glass IP updates.

**Reality: NO active DuckDNS updater exists.**

- `find / -name 'duck*.sh'` — no results
- `grep -r 'duckdns.org/update'` across all script dirs — no results
- No DuckDNS entries in any crontab (root April 20 backup, rover crontab, shelter crontab, /etc/cron.d, /etc/crontab)
- No systemd timer for DuckDNS

**Verdict: MATCHES** the "static IP + wildcard DNS, no updater" model. The DuckDNS token is purely break-glass (manual IP re-point if Linode IP ever changes). The runbook should say "you'll likely never use this" rather than implying automated updates.

---

## 2. Services

**Claim:** Three services: shelter-app, caddy, rover.

**Reality:**

| Service | Enabled | Active |
|---------|---------|--------|
| shelter-app | ✅ enabled | ✅ active |
| caddy | ✅ enabled | ✅ active |
| rover | ✅ enabled | ✅ active (running as `Rover (OpenClaw Gateway, profile=rover)`) |

**Verdict: MATCHES.** All three exist, are enabled, and active. No additional services (clawdbot is retired/removed).

---

## 3. Cron Jobs

**Claim (runbook table):** SQLite backup 3am, data backup 3:15am, weekly backup 3:30am Sat, staging sync Sun 2:30am ET, error summary Mon 9am UTC, health check Mon 10am UTC, reports prune daily 4am ET, OC archive/restart daily, timeclock auto-close hourly.

**Root crontab** (from April 20 backup at `/home/shelter/backups/root-crontab-20260420-032139.txt`):
```
0 3 * * *   /home/shelter/scripts/backup-sqlite.sh
0 9 * * 1   /home/shelter/scripts/weekly-error-summary.sh
30 2 * * *  /home/shelter/scripts/staging-sync.sh    # CRON_TZ=America/New_York
15 3 * * *  /home/shelter/scripts/backup-data.sh
30 3 * * *  /home/shelter/scripts/backup-weekly.sh
```

**Note:** This is from April 20. Per memory logs, after this date John manually added to root crontab:
- Timeclock auto-close (hourly, `curl -X POST .../api/volunteers/timeclock/auto-close`) — added 2026-05-12
- Health-check.sh (Mon 10am UTC) — staged 2026-05-18, deployment pending/confirmed by John
- Reports-prune (daily 4am ET) — script exists, deployment timing uncertain

**Rover crontab** (live, verified):
```
*/15 * * * *  /home/rover/scripts/memory-snapshot.sh
0 4 * * *     /home/rover/scripts/screenshots-retention.sh
0 6 * * *     sudo -u shelter python3 /home/shelter/shelter-apps/scripts/score-profiles.py
```

**Shelter crontab:** Empty (no crontab for shelter).

**In-process scheduled jobs** (server.ts, not cron):
- Nightly SM photo sync (`scheduleNightlySMPhotoSync`, server.ts:12300)
- Midnight feeding roster reset (`scheduleMidnightFeedingJob`, server.ts:12327)
- Daily adoptable alert (`scheduleDailyAdoptableCheck`, server.ts:12452)
- Daily generic bio job (`scheduleGenericBioJob`, server.ts:12776)
- Daily searcher snapshot (`scheduleDailySearcherSnapshot`, server.ts:12806)

**OC cron jobs (Gateway scheduler):** None (0 jobs).

### Diff vs runbook:

| Runbook item | Status | Notes |
|-------------|--------|-------|
| SQLite backup 3am | ✅ Confirmed | Root crontab |
| Data backup 3:15am | ✅ Confirmed | Root crontab |
| Weekly backup 3:30am Sat | ⚠️ DIFFERS | Root crontab runs DAILY at 3:30am, not Saturday-only. Script header says "Saturday 3:30am" but cron is `30 3 * * *` (daily) |
| Staging sync Sun 2:30am ET | ⚠️ DIFFERS | Root crontab runs DAILY (`30 2 * * *`), not Sunday-only. Script has idle-gate (skips if staging modified in 7 days) |
| Error summary Mon 9am UTC | ✅ Confirmed | Root crontab `0 9 * * 1` |
| Health check Mon 10am UTC | ❓ UNCERTAIN | Script exists, was staged May 18. Can't verify root crontab post-April-20. Likely deployed by John. |
| Reports prune daily 4am ET | ❓ UNCERTAIN | Script exists at `/home/shelter/scripts/rover-reports-prune.sh`. Can't verify root crontab. |
| OC archive/restart | ❓ UNCERTAIN | Can't verify root crontab. No OC gateway cron jobs. |
| Timeclock auto-close hourly | ❓ UNCERTAIN | Was in rover crontab May 12, moved to root per memory log. Can't verify root crontab. |

**NOT in runbook (new/undocumented):**
- Rover: `memory-snapshot.sh` every 15 min
- Rover: `screenshots-retention.sh` daily 4am UTC
- Rover: `score-profiles.py` daily 6am UTC
- Server: 5 in-process scheduled jobs (photo sync, feeding reset, adoptable alert, generic bio, searcher snapshot)

---

## 4. Backups

**All three tiers running and current:**

| Tier | Newest file | Date | Size |
|------|------------|------|------|
| SQLite daily | `shelter-2026-06-23.db` | Jun 23 03:00 | 29 MB |
| Data daily | `data-20260623-031501.tar.gz` | Jun 23 03:15 | 415 MB |
| Weekly/combined daily | `weekly-20260623.tar.gz` | Jun 23 03:30 | 454 MB |

**Verdict: MATCHES — backups are alive and current (today's snapshots present).** 14-day retention appears active (oldest weekly is Jun 9 = 14 days back).

**Note:** The "weekly" backup runs daily per the cron schedule (see §3 diff), not weekly. The name is misleading.

---

## 5. Crop Venv

**Exists:** `/opt/crop-venv/bin/python3` — symlink to `/usr/bin/python3`, created 2026-06-22.

**Referenced by:** `server.ts:3978` → `const CROP_PYTHON = '/opt/crop-venv/bin/python3';` (used by cropSweep for YOLO-based photo cropping).

**Verdict: UNDOCUMENTED dependency.** The runbook predates this (created Jun 22 per this session's work). It's an operational dependency: if the venv is missing or broken, cropSweep fails silently. An operator rebuilding the box would need to recreate it. Contains ultralytics + torch for YOLO object detection.

---

## 6. CORS Origin Count

**Runbook claim:** 16 approved origins.

**Actual count: 17 origins** (`server.ts:659–679`).

The 17 origins:
1. `https://dashboard.4lgshelterapp.duckdns.org`
2. `https://staff.4lgshelterapp.duckdns.org`
3. `https://staging-staff.4lgshelterapp.duckdns.org`
4. `https://volunteer.4lgshelterapp.duckdns.org`
5. `https://dogwalker.4lgshelterapp.duckdns.org`
6. `https://matcher.4lgshelterapp.duckdns.org`
7. `https://caregiver.4lgshelterapp.duckdns.org`
8. `https://coordinator.4lgshelterapp.duckdns.org`
9. `https://draft.4lgshelterapp.duckdns.org`
10. `https://custom-search.4lgshelterapp.duckdns.org`
11. `https://matcher-preview.4lgshelterapp.duckdns.org` ← **new since runbook**
12. `https://johnv80.sg-host.com`
13. `https://fourlegsgoodnynj.org`
14. `https://www.fourlegsgoodnynj.org`
15. `https://api.fourlegsgoodnynj.org`
16. `http://localhost:3000`
17. `http://localhost:5500`

**Verdict: DIFFERS — 17, not 16.** The `matcher-preview` origin was added this session (commit 5f35c7c, Jun 22). Also note `test-activity` is NOT in CORS (it's served by the same origin, no cross-origin needed).

---

## 7. SSH / Access

**SSH key-only:**
```
PasswordAuthentication no    # /etc/ssh/sshd_config (explicit)
PubkeyAuthentication          # not explicitly set → defaults to yes (Ubuntu default)
```

**UFW:** Active (confirmed by health-check-latest.md, Jun 22: "UFW firewall | Status: active"). Cannot read rule details without sudo elevation, but the health check script (`health-check.sh`) confirms active status weekly.

**Verdict: MATCHES.** SSH is password-disabled, key-only. UFW is active. Rule details (22/tcp, 80/tcp, 443/tcp) can't be independently verified without elevated access but are consistent with the operational state (all services reachable, no unexpected exposure per health check).

---

## 8. Secrets File

```
-rw------- 1 shelter shelter 1525 May 27 18:55 /home/shelter/.config/shelter-secrets.json
```

**Verdict: MATCHES.** File exists, owned by shelter:shelter, mode 600 (owner read/write only). No other users can read it. Contents not inspected (per instructions).

---

## Summary of Runbook Corrections Needed

| Item | Runbook says | Reality | Action |
|------|-------------|---------|--------|
| DuckDNS updater | Implied automated | No updater; break-glass only | Clarify in doc |
| Weekly backup schedule | Saturday 3:30am | **Daily** 3:30am | Correct schedule |
| Staging sync schedule | Sunday 2:30am ET | **Daily** 2:30am ET (idle-gated) | Correct schedule |
| CORS origins | 16 | **17** (matcher-preview added) | Update count |
| Crop venv | Not mentioned | `/opt/crop-venv` — operational dependency | Add to doc |
| Rover crontab jobs | Not mentioned | 3 jobs (memory-snapshot, screenshots-retention, score-profiles) | Add to doc |
| In-process server jobs | Not mentioned | 5 scheduled jobs (photo sync, feeding, adoptable alert, generic bio, searcher snapshot) | Add to doc |
| Health check / reports prune / timeclock / OC archive | Listed | Cannot verify in root crontab (no sudo access) | John to confirm |
