# Weekly Health Check — 2026-07-01 04:02:57 UTC

## Verdict

🔴 **1 critical flag(s):**
- ⚠️ 3 pending security updates

**3 informational note(s):**
- ℹ️ DB: table active_sessions is empty
- ℹ️ DB: table volunteer_declines is empty
- ℹ️ DB: NEW table detected since last run: featured_rotation_state

---

## System

| Metric | Value |
|--------|-------|
| Uptime | up 15 weeks, 2 days, 7 hours, 15 minutes (since 2026-03-15 20:47:16) |
| Memory | 1061MB / 3915MB used (2854MB available, 27%) |
| Swap | 85MB / 511MB (16%) |
| Disk | 35G / 79G (46%, 41G free) |
| Load avg | 0.04 0.01 0.00 (2 CPUs) |

## Network

| Check | Value |
|-------|-------|
| Unexpected public ports | none |
| SSH password auth | no |
| UFW firewall | Status: active |
| TLS cert expires | 33 days (Aug  4 01:48:56 2026 GMT) |
| HSTS header present | yes |
| Pending security updates | 3 |

## Services

| Service | Status |
|---------|--------|
| shelter-app | active |
| rover | active |
| caddy | active |
| pm2 processes | 0 |

## Top 5 Processes by Memory

```
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
rover     105776  0.7 11.9 54778808 478308 ?     Ssl  Jun28  32:09 openclaw
shelter   150976  0.9  5.6 22435568 225112 ?     Ssl  03:52   0:05 /usr/bin/node dist/server.js
root      124752  0.0  1.0 108352 43620 ?        S<s  Jun29   0:23 /usr/lib/systemd/systemd-journald
caddy        725  0.0  0.8 1277208 34340 ?       Ssl  Mar15  51:02 /usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
root      151062  0.1  0.2  15000 10568 ?        Ss   04:02   0:00 sshd: root@pts/2
```

## HTTP Health Probes

| Endpoint | Status |
|----------|--------|
| API (localhost:3000) | 200 |
| Dashboard | 200 |
| Staff PWA | 200 |
| Matcher | 200 |

## Database (39 tables)

| Table | Rows |
|-------|------|
| active_sessions | 0 |
| activity_archive | 9245 |
| adoptable_status_snapshot | 492 |
| adopter_preferences | 52 |
| adoption_applications | 12 |
| animal_bio_drafts | 28 |
| animal_bios | 298 |
| animal_bios_history | 698 |
| animal_media | 2001 |
| animal_metadata | 888 |
| behavior_notes | 147 |
| daily_activities | 1265 |
| daily_feeding | 407 |
| dashboard_events | 19 |
| dashboard_stories | 9 |
| featured_rotation_queue | 76 |
| featured_rotation_state | 1 |
| featured_slots | 6 |
| feeding_archive | 14483 |
| feeding_audit | 11084 |
| followup_eval_audit | 3 |
| intake_alert_recipients | 3 |
| matcher_audit | 837 |
| overnight_intakes | 13 |
| profile_quality_scores | 136 |
| rg_attachments | 5 |
| rg_email_routing | 6 |
| rg_messages | 25 |
| rg_requesters | 2 |
| rg_requests | 4 |
| rg_sessions | 1 |
| searcher_daily_metrics | 65 |
| sm_push_audit | 36 |
| staff_notifications | 7 |
| volunteer_commitments | 11 |
| volunteer_declines | 0 |
| volunteer_timeclock | 559 |
| volunteers | 447 |
| wellbeing_alerts | 53962 |
| **DB file size** | **32.3MB** |

## Scheduler Freshness

| Scheduler | Latest | Stale | Weight |
|-----------|--------|-------|--------|
| Feeding archive (midnight ET) | 2026-06-29 | 2d | CRITICAL |
| Activity auto-close (23:55 ET) | 2026-06-30 | 1d | CRITICAL |
| SM photo sync (2am ET) | 2026-06-30 06:00:02 | 22h | CRITICAL |
| Adoptable check (9am ET) | 2026-06-30T13:00:00.024Z | 15h | CRITICAL |
| Generic bio (9:30am ET) | 2026-06-30T13:30:00.015Z | 0d | INFORMATIONAL |
| Searcher snapshot (00:10 ET) | 2026-06-29 | 2d | INFORMATIONAL |

## Backups

| Tier | Count | Most Recent |
|------|-------|-------------|
| weekly-*.tar.gz | 16 | weekly-20260701.tar.gz |
| data-*.tar.gz | 17 | data-20260701-031501.tar.gz |
| shelter-*.db | 16 | shelter-2026-07-01.db |
| media-*.tar.gz | 1 | media-20260629.tar.gz (1d ago) |
| Ad-hoc (non-tiered) | 21 | 762.8MB total |

## Grok Resumption

| Check | Value |
|-------|-------|
| grok_imagine video count | 113 |
| Prior count (state file) | 113 |
| Resumption detected | no |

## Security

| Check | Value | Expected |
|-------|-------|----------|
| shelter-secrets.json mode | 600 | 600 |
| rover groups |  rover adm systemd-journal shelter | no sudo |
| /etc/sudoers.d/rover | EXISTS | EXISTS |
| World-writable data dirs | none | none |

## Forms (444 sweep)

| File | Mode | Owner |
|------|------|-------|
| seizure_record.py | 444 | shelter:shelter |
| health_assessment.py | 444 | shelter:shelter |
| volunteer-application.pdf | 444 | shelter:shelter |
| volunteer-application-es.pdf | 444 | shelter:shelter |

## Crontabs

### Root
```
# Daily SQLite backup at 3am
0 3 * * * /home/shelter/scripts/backup-sqlite.sh
# Weekly error log summary — Monday 9am UTC
0 9 * * 1 /home/shelter/scripts/weekly-error-summary.sh
# Weekly staging sync — Sunday 2:30am ET
CRON_TZ=America/New_York
30 2 * * 0 /home/shelter/scripts/staging-sync.sh
# Daily data backup at 3:15am ET
15 3 * * * /home/shelter/scripts/backup-data.sh
# Daily combined snapshot at 3:30am ET
30 3 * * * /home/shelter/scripts/backup-weekly.sh
# Weekly media backup — Sunday 3:45am ET
45 3 * * 0 /home/shelter/scripts/backup-media.sh
# Prune Rover reports older than 7 days, daily 4am ET
0 8 * * * /home/shelter/scripts/rover-reports-prune.sh
# Auto-close volunteer timeclock shifts >8 hours old, hourly at :05
5 * * * * curl -sS -X POST http://localhost:3000/api/volunteers/timeclock/auto-close >> /var/log/timeclock-auto-close.log 2>&1
0 10 * * 1 /home/shelter/scripts/health-check.sh
CRON_TZ=UTC
# Archive old OC sessions before weekly restart — Sunday 2:40am UTC
40 2 * * 0 find /home/rover/.openclaw-rover/agents/main/sessions/ -maxdepth 1 -name "*.jsonl.reset.*" -mtime +7 -exec mv {} /home/rover/.openclaw-rover/agents/main/sessions/archive/ \;
# Weekly OC restart to clear accumulated session memory — Sunday 2:45am UTC
45 2 * * 0 systemctl restart rover >> /var/log/rover-restart.log 2>&1
```

### Rover
```
*/15 * * * * /home/rover/scripts/memory-snapshot.sh
0 4 * * * /home/rover/scripts/screenshots-retention.sh >> /home/rover/screenshots-retention.log 2>&1
0 6 * * * sudo -u shelter python3 /home/shelter/shelter-apps/scripts/score-profiles.py >> /home/shelter/logs/score-profiles.log 2>&1
```

---
*Generated by /home/shelter/scripts/health-check.sh*
