# Weekly Health Check — 2026-09-07 10:00:01 UTC

## Verdict

🟡 **4 informational note(s):**
- ℹ️ DB: table active_sessions is empty
- ℹ️ DB: table volunteer_declines is empty
- ℹ️ Backups: ad-hoc files total 5.75GB (threshold: 1GB)
- ℹ️ Grok video generation resumed: count 345 → 356 — consider tightening media backup cadence

---

## System

| Metric | Value |
|--------|-------|
| Uptime | up 25 weeks, 13 hours, 12 minutes (since 2026-03-15 20:47:16) |
| Memory | 930MB / 3915MB used (2985MB available, 23%) |
| Swap | 78MB / 511MB (15%) |
| Disk | 34G / 79G (46%, 41G free) |
| Load avg | 0.00 0.00 0.00 (2 CPUs) |

## Network

| Check | Value |
|-------|-------|
| Unexpected public ports | none |
| SSH password auth | no |
| UFW firewall | Status: active |
| TLS cert expires | 84 days (Dec  1 09:48:56 2026 GMT) |
| HSTS header present | yes |
| Pending security updates | 0 |

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
rover    1558965  0.5  8.3 44136432 335540 ?     Ssl  Sep06   9:44 openclaw
shelter  1157394  0.3  4.6 22490020 187056 ?     Ssl  Aug11 117:44 /usr/bin/node dist/server.js
root     1512372  0.0  1.6 132280 66080 ?        S<s  Sep03   0:48 /usr/lib/systemd/systemd-journald
root     1575609  0.0  1.0 479364 43252 ?        Ssl  09:56   0:00 /usr/libexec/fwupd/fwupd
caddy        725  0.0  0.8 1278296 35724 ?       Ssl  Mar15 105:51 /usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
```

## HTTP Health Probes

| Endpoint | Status |
|----------|--------|
| API (localhost:3000) | 200 |
| Dashboard | 200 |
| Staff PWA | 200 |
| Matcher | 200 |

## Database (33 tables)

| Table | Rows |
|-------|------|
| active_sessions | 0 |
| activity_archive | 21096 |
| adoptable_status_snapshot | 503 |
| adopter_preferences | 52 |
| adoption_applications | 121 |
| animal_bio_drafts | 23 |
| animal_bios | 546 |
| animal_bios_history | 1102 |
| animal_media | 3210 |
| animal_metadata | 1262 |
| behavior_notes | 153 |
| daily_activities | 1171 |
| daily_feeding | 419 |
| dashboard_events | 26 |
| dashboard_stories | 11 |
| featured_rotation_queue | 191 |
| featured_rotation_state | 1 |
| featured_slots | 6 |
| feeding_archive | 28571 |
| feeding_audit | 21475 |
| followup_eval_audit | 3 |
| intake_alert_recipients | 3 |
| matcher_audit | 1809 |
| overnight_intakes | 13 |
| profile_quality_scores | 152 |
| searcher_daily_metrics | 134 |
| sm_push_audit | 36 |
| staff_notifications | 7 |
| volunteer_commitments | 11 |
| volunteer_declines | 0 |
| volunteer_timeclock | 842 |
| volunteers | 515 |
| wellbeing_alerts | 115865 |
| **DB file size** | **63.7MB** |

## Scheduler Freshness

| Scheduler | Latest | Stale | Weight |
|-----------|--------|-------|--------|
| Feeding archive (midnight ET) | 2026-09-05 | 2d | CRITICAL |
| Activity auto-close (23:55 ET) | 2026-09-06 | 1d | CRITICAL |
| SM photo sync (2am ET) | 2026-09-07 06:00:02 | 3h | CRITICAL |
| Adoptable check (9am ET) | 2026-09-06T13:00:00.058Z | 21h | CRITICAL |
| Generic bio (9:30am ET) | 2026-09-06T12:30:10.920Z | 0d | INFORMATIONAL |
| Searcher snapshot (00:10 ET) | 2026-09-06 | 1d | INFORMATIONAL |

## Backups

| Tier | Count | Most Recent |
|------|-------|-------------|
| weekly-*.tar.gz | 15 | weekly-20260907.tar.gz |
| data-*.tar.gz | 15 | data-20260907-031501.tar.gz |
| shelter-*.db | 15 | shelter-2026-09-07.db |
| media-*.tar.gz | 5 | media-20260906.tar.gz (1d ago) |
| Ad-hoc (non-tiered) | 13 | 5892.9MB total |

## Grok Resumption

| Check | Value |
|-------|-------|
| grok_imagine video count | 356 |
| Prior count (state file) | 345 |
| Resumption detected | yes (+11) |

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
| blank-spanish.pdf | 444 | shelter:shelter |
| volunteer-application-es.pdf | 444 | shelter:shelter |
| blank-english.pdf | 444 | shelter:shelter |

## Crontabs

### Root
```
# ALL SCHEDULES BELOW ARE UTC. This cron (Vixie 3.0pl1-184ubuntu2) does NOT
# honor CRON_TZ. Verified 2026-07-09 against 7 days of backup mtimes.
# Daily SQLite backup at 03:00 UTC (11:00pm ET)
0 3 * * * /home/shelter/scripts/backup-sqlite.sh
# Weekly error log summary — Monday 9am UTC
0 9 * * 1 /home/shelter/scripts/weekly-error-summary.sh
# Weekly staging sync - Sunday 02:30 UTC (Sat 10:30pm ET)
30 2 * * 0 /home/shelter/scripts/staging-sync.sh
# Daily data backup at 03:15 UTC (11:15pm ET)
15 3 * * * /home/shelter/scripts/backup-data.sh
# Daily combined snapshot at 03:30 UTC (11:30pm ET)
30 3 * * * /home/shelter/scripts/backup-weekly.sh
# Weekly media backup - Sunday 03:45 UTC (Sat 11:45pm ET)
45 3 * * 0 /home/shelter/scripts/backup-media.sh
# Prune Rover reports older than 7 days - daily 08:00 UTC (4am EDT / 3am EST)
0 8 * * * /home/shelter/scripts/rover-reports-prune.sh
# Auto-close volunteer timeclock shifts >8 hours old, hourly at :05
5 * * * * curl -sS -X POST http://localhost:3000/api/volunteers/timeclock/auto-close >> /var/log/timeclock-auto-close.log 2>&1
# Weekly health check - Monday 10:00 UTC (6am ET)
0 10 * * 1 /home/shelter/scripts/health-check.sh
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
