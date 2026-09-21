# Weekly Health Check — 2026-09-21 10:00:01 UTC

## Verdict

🟡 **4 informational note(s):**
- ℹ️ DB: table active_sessions is empty
- ℹ️ DB: table volunteer_declines is empty
- ℹ️ Backups: ad-hoc files total 6.14GB (threshold: 1GB)
- ℹ️ Grok video generation resumed: count 357 → 384 — consider tightening media backup cadence

---

## System

| Metric | Value |
|--------|-------|
| Uptime | up 27 weeks, 13 hours, 12 minutes (since 2026-03-15 20:47:16) |
| Memory | 931MB / 3915MB used (2984MB available, 23%) |
| Swap | 32MB / 511MB (6%) |
| Disk | 35G / 79G (47%, 40G free) |
| Load avg | 0.48 0.10 0.03 (2 CPUs) |

## Network

| Check | Value |
|-------|-------|
| Unexpected public ports | none |
| SSH password auth | no |
| UFW firewall | Status: active |
| TLS cert expires | 70 days (Dec  1 09:48:56 2026 GMT) |
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
rover    1851043  0.4  8.4 44133656 338960 ?     Ssl  Sep20   9:12 openclaw
shelter  1825621  0.2  6.4 22474988 260144 ?     Ssl  Sep18  12:06 /usr/bin/node dist/server.js
root     1688320  0.0  3.1 213284 126456 ?       S<s  Sep11   2:09 /usr/lib/systemd/systemd-journald
caddy        725  0.0  0.9 1278552 36736 ?       Ssl  Mar15 116:56 /usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
root           1  0.0  0.2  22540 11160 ?        Ss   Mar15  25:11 /usr/lib/systemd/systemd --system --deserialize=89
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
| activity_archive | 23399 |
| adoptable_status_snapshot | 471 |
| adopter_preferences | 52 |
| adoption_applications | 165 |
| animal_bio_drafts | 24 |
| animal_bios | 593 |
| animal_bios_history | 1150 |
| animal_media | 3366 |
| animal_metadata | 1329 |
| behavior_notes | 153 |
| daily_activities | 1131 |
| daily_feeding | 395 |
| dashboard_events | 27 |
| dashboard_stories | 12 |
| featured_rotation_queue | 203 |
| featured_rotation_state | 1 |
| featured_slots | 6 |
| feeding_archive | 31415 |
| feeding_audit | 23230 |
| followup_eval_audit | 3 |
| intake_alert_recipients | 3 |
| matcher_audit | 2057 |
| overnight_intakes | 13 |
| profile_quality_scores | 152 |
| searcher_daily_metrics | 148 |
| sm_push_audit | 36 |
| staff_notifications | 7 |
| volunteer_commitments | 11 |
| volunteer_declines | 0 |
| volunteer_timeclock | 910 |
| volunteers | 533 |
| wellbeing_alerts | 128880 |
| **DB file size** | **70.3MB** |

## Scheduler Freshness

| Scheduler | Latest | Stale | Weight |
|-----------|--------|-------|--------|
| Feeding archive (midnight ET) | 2026-09-19 | 2d | CRITICAL |
| Activity auto-close (23:55 ET) | 2026-09-20 | 1d | CRITICAL |
| SM photo sync (2am ET) | 2026-09-21 06:00:01 | 4h | CRITICAL |
| Adoptable check (9am ET) | 2026-09-20T13:00:00.002Z | 21h | CRITICAL |
| Generic bio (9:30am ET) | 2026-09-20T12:30:00.019Z | 0d | INFORMATIONAL |
| Searcher snapshot (00:10 ET) | 2026-09-20 | 1d | INFORMATIONAL |

## Backups

| Tier | Count | Most Recent |
|------|-------|-------------|
| weekly-*.tar.gz | 15 | weekly-20260921.tar.gz |
| data-*.tar.gz | 16 | data-20260921-031501.tar.gz |
| shelter-*.db | 16 | shelter-2026-09-21.db |
| media-*.tar.gz | 5 | media-20260920.tar.gz (1d ago) |
| Ad-hoc (non-tiered) | 13 | 6287.4MB total |

## Grok Resumption

| Check | Value |
|-------|-------|
| grok_imagine video count | 384 |
| Prior count (state file) | 357 |
| Resumption detected | yes (+27) |

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
