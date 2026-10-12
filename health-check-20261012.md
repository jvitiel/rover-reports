# Weekly Health Check — 2026-10-12 10:00:01 UTC

## Verdict

🟡 **3 informational note(s):**
- ℹ️ DB: table active_sessions is empty
- ℹ️ DB: table volunteer_declines is empty
- ℹ️ Backups: ad-hoc files total 6.69GB (threshold: 1GB)

---

## System

| Metric | Value |
|--------|-------|
| Uptime | up 30 weeks, 13 hours, 12 minutes (since 2026-03-15 20:47:16) |
| Memory | 1401MB / 3915MB used (2514MB available, 35%) |
| Swap | 167MB / 511MB (32%) |
| Disk | 39G / 79G (52%, 36G free) |
| Load avg | 0.00 0.00 0.00 (2 CPUs) |

## Network

| Check | Value |
|-------|-------|
| Unexpected public ports | none |
| SSH password auth | no |
| UFW firewall | Status: active |
| TLS cert expires | 49 days (Dec  1 09:48:56 2026 GMT) |
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
rover    2306397  0.5  9.0 44197556 363212 ?     Ssl  Oct11   9:52 openclaw
shelter  2395633  0.6  6.3 5595148 254416 ?      Sl   04:06   2:18 /home/shelter/.claude/remote/ccd-cli/2.1.295-8b2928c330c4 --output-format stream-json --verbose --input-format stream-json --effort=medium --model=claude-opus-5-5 --permission-prompt-tool=stdio --allowedTools=mcp__computer-use,mcp__ccd_session__spawn_task,mcp__ccd_session__dismiss_task,mcp__ccd_session__mark_chapter,mcp__ccd_session_mgmt__list_sessions,mcp__ccd_session_mgmt__get_session,mcp__ccd_session_mgmt__get_usage,mcp__ccd_host__get_storage_usage,mcp__ccd_session_mgmt__set_session_title,mcp__ccd_session_mgmt__send_message,mcp__ccd_session_mgmt__detach_session,mcp__ccd_sidebar__list_groups,mcp__ccd_sidebar__create_group,mcp__ccd_sidebar__set_view,mcp__ccd_sidebar__list_sections,mcp__ccd_sidebar__create_section,mcp__ccd_session_mgmt__search_session_transcripts,mcp__ccd_session_mgmt__list_events,mcp__ccd_session_mgmt__export_transcript,mcp__ccd_session__read_widget_context,mcp__ccd_session__list_start_targets,mcp__ccd_view__show_pane,mcp__ccd_view__close_pane,mcp__ccd_view__get_layout,mcp__ccd_view__set_transcript_view,mcp__ccd_settings__get_settings,mcp__ccd_pr__get_status,mcp__ccd_window__open_session_in,mcp__ccd_window__close_split,mcp__ccd_window__set_sidebar_collapsed,mcp__ccd_window__get_window_layout --disallowedTools=SubscribePR,Edit(~/.claude/remote/**),Edit(~/.claude/remote/ccd-cli/**),Edit(~/.claude/remote/srv/**),Edit(~/.claude/remote/run/**),Edit(~/.claude/remote/plugins/**) --setting-sources=user,project,local --permission-mode=plan --include-partial-messages --plugin-dir=/home/shelter/.claude/remote/plugins/859401af/37b4819791515999 --thinking-display omitted --replay-user-messages --settings {"fastMode":false,"deniedMcpServers":[{"serverName":"Claude Browser"},{"serverName":"Claude Code Android Emulator"},{"serverName":"Claude Code iOS Simulator"},{"serverName":"Claude Preview"},{"serverName":"Claude_Browser"},{"serverName":"Claude_Code_Android_Emulator"},{"serverName":"Claude_Code_iOS_Simulator"},{"serverName":"Claude_Preview"},{"serverName":"Claude_for_Chrome"},{"serverName":"Framebuffer"},{"serverName":"Window Halo"},{"serverName":"Window_Halo"},{"serverName":"ccd_connectors"},{"serverName":"ccd_directory"},{"serverName":"ccd_host"},{"serverName":"ccd_pr"},{"serverName":"ccd_session"},{"serverName":"ccd_session_mgmt"},{"serverName":"ccd_settings"},{"serverName":"ccd_sidebar"},{"serverName":"ccd_turn"},{"serverName":"ccd_view"},{"serverName":"ccd_window"},{"serverName":"claude-in-chrome"},{"serverName":"claude_browser"},{"serverName":"claude_code_android_emulator"},{"serverName":"claude_code_ios_simulator"},{"serverName":"claude_for_chrome"},{"serverName":"claude_in_chrome"},{"serverName":"claude_preview"},{"serverName":"computer-use"},{"serverName":"computer_use"},{"serverName":"cowork"},{"serverName":"cowork-onboarding"},{"serverName":"cowork_onboarding"},{"serverName":"dev-debug"},{"serverName":"dev_debug"},{"serverName":"dispatch"},{"serverName":"framebuffer"},{"serverName":"mcp-registry"},{"serverName":"mcp_registry"},{"serverName":"plugins"},{"serverName":"remote-devices"},{"serverName":"remote_devices"},{"serverName":"scheduled-tasks"},{"serverName":"scheduled_tasks"},{"serverName":"session_info"},{"serverName":"skills"},{"serverName":"window_halo"}],"sandbox":{"filesystem":{"denyWrite":["~/.claude/remote","~/.claude/remote/ccd-cli","~/.claude/remote/srv","~/.claude/remote/run","~/.claude/remote/plugins"]}}}
shelter  2329244  0.5  5.4 5595208 220156 ?      Sl   Oct11   5:45 /home/shelter/.claude/remote/ccd-cli/2.1.295-8b2928c330c4 --output-format stream-json --verbose --input-format stream-json --effort=medium --model=claude-opus-5-5 --permission-prompt-tool=stdio --allowedTools=mcp__computer-use,mcp__ccd_session__spawn_task,mcp__ccd_session__dismiss_task,mcp__ccd_session__mark_chapter,mcp__ccd_session_mgmt__list_sessions,mcp__ccd_session_mgmt__get_session,mcp__ccd_session_mgmt__get_usage,mcp__ccd_host__get_storage_usage,mcp__ccd_session_mgmt__set_session_title,mcp__ccd_session_mgmt__send_message,mcp__ccd_session_mgmt__detach_session,mcp__ccd_sidebar__list_groups,mcp__ccd_sidebar__create_group,mcp__ccd_sidebar__set_view,mcp__ccd_sidebar__list_sections,mcp__ccd_sidebar__create_section,mcp__ccd_session_mgmt__search_session_transcripts,mcp__ccd_session_mgmt__list_events,mcp__ccd_session_mgmt__export_transcript,mcp__ccd_session__read_widget_context,mcp__ccd_session__list_start_targets,mcp__ccd_view__show_pane,mcp__ccd_view__close_pane,mcp__ccd_view__get_layout,mcp__ccd_view__set_transcript_view,mcp__ccd_settings__get_settings,mcp__ccd_pr__get_status,mcp__ccd_window__open_session_in,mcp__ccd_window__close_split,mcp__ccd_window__set_sidebar_collapsed,mcp__ccd_window__get_window_layout --disallowedTools=SubscribePR,Edit(~/.claude/remote/**),Edit(~/.claude/remote/ccd-cli/**),Edit(~/.claude/remote/srv/**),Edit(~/.claude/remote/run/**),Edit(~/.claude/remote/plugins/**) --setting-sources=user,project,local --permission-mode=default --include-partial-messages --plugin-dir=/home/shelter/.claude/remote/plugins/859401af/37b4819791515999 --thinking-display omitted --replay-user-messages --settings {"fastMode":false,"deniedMcpServers":[{"serverName":"Claude Browser"},{"serverName":"Claude Code Android Emulator"},{"serverName":"Claude Code iOS Simulator"},{"serverName":"Claude Preview"},{"serverName":"Claude_Browser"},{"serverName":"Claude_Code_Android_Emulator"},{"serverName":"Claude_Code_iOS_Simulator"},{"serverName":"Claude_Preview"},{"serverName":"Claude_for_Chrome"},{"serverName":"Framebuffer"},{"serverName":"Window Halo"},{"serverName":"Window_Halo"},{"serverName":"ccd_connectors"},{"serverName":"ccd_directory"},{"serverName":"ccd_host"},{"serverName":"ccd_pr"},{"serverName":"ccd_session"},{"serverName":"ccd_session_mgmt"},{"serverName":"ccd_settings"},{"serverName":"ccd_sidebar"},{"serverName":"ccd_turn"},{"serverName":"ccd_view"},{"serverName":"ccd_window"},{"serverName":"claude-in-chrome"},{"serverName":"claude_browser"},{"serverName":"claude_code_android_emulator"},{"serverName":"claude_code_ios_simulator"},{"serverName":"claude_for_chrome"},{"serverName":"claude_in_chrome"},{"serverName":"claude_preview"},{"serverName":"computer-use"},{"serverName":"computer_use"},{"serverName":"cowork"},{"serverName":"cowork-onboarding"},{"serverName":"cowork_onboarding"},{"serverName":"dev-debug"},{"serverName":"dev_debug"},{"serverName":"dispatch"},{"serverName":"framebuffer"},{"serverName":"mcp-registry"},{"serverName":"mcp_registry"},{"serverName":"plugins"},{"serverName":"remote-devices"},{"serverName":"remote_devices"},{"serverName":"scheduled-tasks"},{"serverName":"scheduled_tasks"},{"serverName":"session_info"},{"serverName":"skills"},{"serverName":"window_halo"}],"sandbox":{"filesystem":{"denyWrite":["~/.claude/remote","~/.claude/remote/ccd-cli","~/.claude/remote/srv","~/.claude/remote/run","~/.claude/remote/plugins"]}}}
shelter  2373864  0.0  5.2 22423460 208924 ?     Sl   Oct11   0:41 node /home/shelter/shelter-pilot/server/dist/server.js
shelter  2023818  0.2  4.4 22706732 180068 ?     Ssl  Sep24  71:28 /usr/bin/node dist/server.js
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
| activity_archive | 26664 |
| adoptable_status_snapshot | 494 |
| adopter_preferences | 52 |
| adoption_applications | 236 |
| animal_bio_drafts | 28 |
| animal_bios | 646 |
| animal_bios_history | 1209 |
| animal_media | 3663 |
| animal_metadata | 1503 |
| behavior_notes | 157 |
| daily_activities | 1082 |
| daily_feeding | 410 |
| dashboard_events | 28 |
| dashboard_stories | 12 |
| featured_rotation_queue | 219 |
| featured_rotation_state | 1 |
| featured_slots | 6 |
| feeding_archive | 35832 |
| feeding_audit | 25737 |
| followup_eval_audit | 3 |
| intake_alert_recipients | 3 |
| matcher_audit | 2440 |
| overnight_intakes | 13 |
| profile_quality_scores | 156 |
| searcher_daily_metrics | 169 |
| sm_push_audit | 36 |
| staff_notifications | 7 |
| volunteer_commitments | 11 |
| volunteer_declines | 0 |
| volunteer_timeclock | 1058 |
| volunteers | 560 |
| wellbeing_alerts | 149785 |
| **DB file size** | **80.6MB** |

## Scheduler Freshness

| Scheduler | Latest | Stale | Weight |
|-----------|--------|-------|--------|
| Feeding archive (midnight ET) | 2026-10-10 | 2d | CRITICAL |
| Activity auto-close (23:55 ET) | 2026-10-11 | 1d | CRITICAL |
| SM photo sync (2am ET) | 2026-10-12 06:00:01 | 4h | CRITICAL |
| Adoptable check (9am ET) | 2026-10-11T13:00:00.070Z | 21h | CRITICAL |
| Generic bio (9:30am ET) | 2026-10-11T12:30:00.132Z | 0d | INFORMATIONAL |
| Searcher snapshot (00:10 ET) | 2026-10-11 | 1d | INFORMATIONAL |

## Backups

| Tier | Count | Most Recent |
|------|-------|-------------|
| weekly-*.tar.gz | 16 | weekly-20261012.tar.gz |
| data-*.tar.gz | 16 | data-20261012-031501.tar.gz |
| shelter-*.db | 15 | shelter-2026-10-12.db |
| media-*.tar.gz | 5 | media-20261011.tar.gz (1d ago) |
| Ad-hoc (non-tiered) | 13 | 6851.1MB total |

## Grok Resumption

| Check | Value |
|-------|-------|
| grok_imagine video count | 403 |
| Prior count (state file) | 403 |
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
