# Weekly Health Check — 2026-11-09 10:00:01 UTC

## Verdict

🟡 **2 informational note(s):**
- ℹ️ DB: table active_sessions is empty
- ℹ️ Backups: ad-hoc files total 7.65GB (threshold: 1GB)

---

## System

| Metric | Value |
|--------|-------|
| Uptime | up 3 weeks, 6 days, 12 hours, 13 minutes (since 2026-10-12 21:46:48) |
| Memory | 1788MB / 3915MB used (2127MB available, 45%) |
| Swap | 297MB / 511MB (58%) |
| Disk | 41G / 79G (55%, 34G free) |
| Load avg | 0.03 0.04 0.01 (2 CPUs) |

## Network

| Check | Value |
|-------|-------|
| Unexpected public ports | none |
| SSH password auth | no |
| UFW firewall | Status: active |
| TLS cert expires | 81 days (Jan 30 08:58:29 2027 GMT) |
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
rover     780008  0.4  8.1 44143836 324972 ?     Ssl  Nov08   8:32 openclaw
shelter   376696  0.4  4.2 5631756 170412 ?      Sl   Oct29  67:26 /home/shelter/.claude/remote/ccd-cli/2.1.309-537ebbf12df5 --output-format stream-json --verbose --input-format stream-json --effort=medium --model=claude-opus-5-5 --permission-prompt-tool=stdio --resume=7179a1d4-9588-4ffe-98c3-4193e5add7ed --allowedTools=mcp__computer-use,mcp__ccd_session__spawn_task,mcp__ccd_session__dismiss_task,mcp__ccd_session__mark_chapter,mcp__ccd_session_mgmt__list_sessions,mcp__ccd_session_mgmt__get_session,mcp__ccd_session_mgmt__get_usage,mcp__ccd_host__get_storage_usage,mcp__ccd_session_mgmt__set_session_title,mcp__ccd_session_mgmt__send_message,mcp__ccd_session_mgmt__detach_session,mcp__ccd_sidebar__list_groups,mcp__ccd_sidebar__create_group,mcp__ccd_sidebar__set_view,mcp__ccd_sidebar__list_sections,mcp__ccd_sidebar__create_section,mcp__ccd_turn__wrap_up,mcp__ccd_turn__update_plan,mcp__ccd_session_mgmt__search_session_transcripts,mcp__ccd_session_mgmt__list_events,mcp__ccd_session_mgmt__export_transcript,mcp__ccd_session__read_widget_context,mcp__ccd_session__list_start_targets,mcp__ccd_view__show_pane,mcp__ccd_view__close_pane,mcp__ccd_view__get_layout,mcp__ccd_view__set_transcript_view,mcp__ccd_settings__get_settings,mcp__ccd_pr__get_status,mcp__ccd_window__open_session_in,mcp__ccd_window__close_split,mcp__ccd_window__set_sidebar_collapsed,mcp__ccd_window__get_window_layout --disallowedTools=SubscribePR,Edit(~/.claude/remote/**),Edit(~/.claude/remote/ccd-cli/**),Edit(~/.claude/remote/srv/**),Edit(~/.claude/remote/run/**),Edit(~/.claude/remote/plugins/**) --setting-sources=user,project,local --permission-mode=auto --include-partial-messages --plugin-dir=/home/shelter/.claude/remote/plugins/859401af/7c5187bdeb4e62f5 --thinking-display omitted --replay-user-messages --settings {"deniedMcpServers":[{"serverName":"Claude Browser"},{"serverName":"Claude Code Android Emulator"},{"serverName":"Claude Code iOS Simulator"},{"serverName":"Claude Preview"},{"serverName":"Claude_Browser"},{"serverName":"Claude_Code_Android_Emulator"},{"serverName":"Claude_Code_iOS_Simulator"},{"serverName":"Claude_Preview"},{"serverName":"Claude_for_Chrome"},{"serverName":"Framebuffer"},{"serverName":"Window Halo"},{"serverName":"Window_Halo"},{"serverName":"ccd_connectors"},{"serverName":"ccd_directory"},{"serverName":"ccd_host"},{"serverName":"ccd_pr"},{"serverName":"ccd_session"},{"serverName":"ccd_session_mgmt"},{"serverName":"ccd_settings"},{"serverName":"ccd_sidebar"},{"serverName":"ccd_turn"},{"serverName":"ccd_view"},{"serverName":"ccd_window"},{"serverName":"claude-in-chrome"},{"serverName":"claude_browser"},{"serverName":"claude_code_android_emulator"},{"serverName":"claude_code_ios_simulator"},{"serverName":"claude_for_chrome"},{"serverName":"claude_in_chrome"},{"serverName":"claude_preview"},{"serverName":"computer-use"},{"serverName":"computer_use"},{"serverName":"cowork"},{"serverName":"cowork-onboarding"},{"serverName":"cowork_onboarding"},{"serverName":"dev-debug"},{"serverName":"dev_debug"},{"serverName":"dispatch"},{"serverName":"framebuffer"},{"serverName":"mcp-registry"},{"serverName":"mcp_registry"},{"serverName":"plugins"},{"serverName":"remote-devices"},{"serverName":"remote_devices"},{"serverName":"scheduled-tasks"},{"serverName":"scheduled_tasks"},{"serverName":"session_info"},{"serverName":"skills"},{"serverName":"window_halo"}],"sandbox":{"filesystem":{"denyWrite":["~/.claude/remote","~/.claude/remote/ccd-cli","~/.claude/remote/srv","~/.claude/remote/run","~/.claude/remote/plugins"]}}}
shelter   254584  0.4  4.2 5630604 170332 ?      Sl   Oct24 107:22 /home/shelter/.claude/remote/ccd-cli/2.1.308-3f6ee6c72f6a --output-format stream-json --verbose --input-format stream-json --effort=medium --model=claude-opus-5-5 --permission-prompt-tool=stdio --allowedTools=mcp__computer-use,mcp__ccd_session__spawn_task,mcp__ccd_session__dismiss_task,mcp__ccd_session__mark_chapter,mcp__ccd_session_mgmt__list_sessions,mcp__ccd_session_mgmt__get_session,mcp__ccd_session_mgmt__get_usage,mcp__ccd_host__get_storage_usage,mcp__ccd_session_mgmt__set_session_title,mcp__ccd_session_mgmt__send_message,mcp__ccd_session_mgmt__detach_session,mcp__ccd_sidebar__list_groups,mcp__ccd_sidebar__create_group,mcp__ccd_sidebar__set_view,mcp__ccd_sidebar__list_sections,mcp__ccd_sidebar__create_section,mcp__ccd_turn__wrap_up,mcp__ccd_turn__update_plan,mcp__ccd_session_mgmt__search_session_transcripts,mcp__ccd_session_mgmt__list_events,mcp__ccd_session_mgmt__export_transcript,mcp__ccd_session__read_widget_context,mcp__ccd_session__list_start_targets,mcp__ccd_view__show_pane,mcp__ccd_view__close_pane,mcp__ccd_view__get_layout,mcp__ccd_view__set_transcript_view,mcp__ccd_settings__get_settings,mcp__ccd_pr__get_status,mcp__ccd_window__open_session_in,mcp__ccd_window__close_split,mcp__ccd_window__set_sidebar_collapsed,mcp__ccd_window__get_window_layout --disallowedTools=SubscribePR,Edit(~/.claude/remote/**),Edit(~/.claude/remote/ccd-cli/**),Edit(~/.claude/remote/srv/**),Edit(~/.claude/remote/run/**),Edit(~/.claude/remote/plugins/**) --setting-sources=user,project,local --permission-mode=auto --include-partial-messages --plugin-dir=/home/shelter/.claude/remote/plugins/859401af/d51a917a39cb0aa1 --session-id=b9fe5262-6408-4404-a259-bdf0fadf010a --thinking-display omitted --replay-user-messages --settings {"fastMode":false,"deniedMcpServers":[{"serverName":"Claude Browser"},{"serverName":"Claude Code Android Emulator"},{"serverName":"Claude Code iOS Simulator"},{"serverName":"Claude Preview"},{"serverName":"Claude_Browser"},{"serverName":"Claude_Code_Android_Emulator"},{"serverName":"Claude_Code_iOS_Simulator"},{"serverName":"Claude_Preview"},{"serverName":"Claude_for_Chrome"},{"serverName":"Framebuffer"},{"serverName":"Window Halo"},{"serverName":"Window_Halo"},{"serverName":"ccd_connectors"},{"serverName":"ccd_directory"},{"serverName":"ccd_host"},{"serverName":"ccd_pr"},{"serverName":"ccd_session"},{"serverName":"ccd_session_mgmt"},{"serverName":"ccd_settings"},{"serverName":"ccd_sidebar"},{"serverName":"ccd_turn"},{"serverName":"ccd_view"},{"serverName":"ccd_window"},{"serverName":"claude-in-chrome"},{"serverName":"claude_browser"},{"serverName":"claude_code_android_emulator"},{"serverName":"claude_code_ios_simulator"},{"serverName":"claude_for_chrome"},{"serverName":"claude_in_chrome"},{"serverName":"claude_preview"},{"serverName":"computer-use"},{"serverName":"computer_use"},{"serverName":"cowork"},{"serverName":"cowork-onboarding"},{"serverName":"cowork_onboarding"},{"serverName":"dev-debug"},{"serverName":"dev_debug"},{"serverName":"dispatch"},{"serverName":"framebuffer"},{"serverName":"mcp-registry"},{"serverName":"mcp_registry"},{"serverName":"plugins"},{"serverName":"remote-devices"},{"serverName":"remote_devices"},{"serverName":"scheduled-tasks"},{"serverName":"scheduled_tasks"},{"serverName":"session_info"},{"serverName":"skills"},{"serverName":"window_halo"}],"sandbox":{"filesystem":{"denyWrite":["~/.claude/remote","~/.claude/remote/ccd-cli","~/.claude/remote/srv","~/.claude/remote/run","~/.claude/remote/plugins"]}}}
shelter   321118  0.4  3.8 5630540 155672 ?      Sl   Oct27  80:43 /home/shelter/.claude/remote/ccd-cli/2.1.308-3f6ee6c72f6a --output-format stream-json --verbose --input-format stream-json --effort=medium --model=claude-opus-5-5 --permission-prompt-tool=stdio --allowedTools=mcp__computer-use,mcp__ccd_session__spawn_task,mcp__ccd_session__dismiss_task,mcp__ccd_session__mark_chapter,mcp__ccd_session_mgmt__list_sessions,mcp__ccd_session_mgmt__get_session,mcp__ccd_session_mgmt__get_usage,mcp__ccd_host__get_storage_usage,mcp__ccd_session_mgmt__set_session_title,mcp__ccd_session_mgmt__send_message,mcp__ccd_session_mgmt__detach_session,mcp__ccd_sidebar__list_groups,mcp__ccd_sidebar__create_group,mcp__ccd_sidebar__set_view,mcp__ccd_sidebar__list_sections,mcp__ccd_sidebar__create_section,mcp__ccd_turn__wrap_up,mcp__ccd_turn__update_plan,mcp__ccd_session_mgmt__search_session_transcripts,mcp__ccd_session_mgmt__list_events,mcp__ccd_session_mgmt__export_transcript,mcp__ccd_session__read_widget_context,mcp__ccd_session__list_start_targets,mcp__ccd_view__show_pane,mcp__ccd_view__close_pane,mcp__ccd_view__get_layout,mcp__ccd_view__set_transcript_view,mcp__ccd_settings__get_settings,mcp__ccd_pr__get_status,mcp__ccd_window__open_session_in,mcp__ccd_window__close_split,mcp__ccd_window__set_sidebar_collapsed,mcp__ccd_window__get_window_layout --disallowedTools=SubscribePR,Edit(~/.claude/remote/**),Edit(~/.claude/remote/ccd-cli/**),Edit(~/.claude/remote/srv/**),Edit(~/.claude/remote/run/**),Edit(~/.claude/remote/plugins/**) --setting-sources=user,project,local --permission-mode=auto --include-partial-messages --plugin-dir=/home/shelter/.claude/remote/plugins/859401af/d51a917a39cb0aa1 --session-id=5b39a2e8-bac4-4a3a-b598-3c98a71651e2 --thinking-display omitted --replay-user-messages --settings {"fastMode":false,"deniedMcpServers":[{"serverName":"Claude Browser"},{"serverName":"Claude Code Android Emulator"},{"serverName":"Claude Code iOS Simulator"},{"serverName":"Claude Preview"},{"serverName":"Claude_Browser"},{"serverName":"Claude_Code_Android_Emulator"},{"serverName":"Claude_Code_iOS_Simulator"},{"serverName":"Claude_Preview"},{"serverName":"Claude_for_Chrome"},{"serverName":"Framebuffer"},{"serverName":"Window Halo"},{"serverName":"Window_Halo"},{"serverName":"ccd_connectors"},{"serverName":"ccd_directory"},{"serverName":"ccd_host"},{"serverName":"ccd_pr"},{"serverName":"ccd_session"},{"serverName":"ccd_session_mgmt"},{"serverName":"ccd_settings"},{"serverName":"ccd_sidebar"},{"serverName":"ccd_turn"},{"serverName":"ccd_view"},{"serverName":"ccd_window"},{"serverName":"claude-in-chrome"},{"serverName":"claude_browser"},{"serverName":"claude_code_android_emulator"},{"serverName":"claude_code_ios_simulator"},{"serverName":"claude_for_chrome"},{"serverName":"claude_in_chrome"},{"serverName":"claude_preview"},{"serverName":"computer-use"},{"serverName":"computer_use"},{"serverName":"cowork"},{"serverName":"cowork-onboarding"},{"serverName":"cowork_onboarding"},{"serverName":"dev-debug"},{"serverName":"dev_debug"},{"serverName":"dispatch"},{"serverName":"framebuffer"},{"serverName":"mcp-registry"},{"serverName":"mcp_registry"},{"serverName":"plugins"},{"serverName":"remote-devices"},{"serverName":"remote_devices"},{"serverName":"scheduled-tasks"},{"serverName":"scheduled_tasks"},{"serverName":"session_info"},{"serverName":"skills"},{"serverName":"window_halo"}],"sandbox":{"filesystem":{"denyWrite":["~/.claude/remote","~/.claude/remote/ccd-cli","~/.claude/remote/srv","~/.claude/remote/run","~/.claude/remote/plugins"]}}}
shelter   602460  0.3  3.8 22455184 155116 ?     Ssl  Nov03  26:39 /usr/bin/node dist/server.js
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
| activity_archive | 31421 |
| adoptable_status_snapshot | 464 |
| adopter_preferences | 52 |
| adoption_applications | 286 |
| animal_bio_drafts | 44 |
| animal_bios | 760 |
| animal_bios_history | 1344 |
| animal_media | 4065 |
| animal_metadata | 1627 |
| behavior_notes | 172 |
| daily_activities | 1407 |
| daily_feeding | 436 |
| dashboard_events | 32 |
| dashboard_stories | 12 |
| featured_rotation_queue | 234 |
| featured_rotation_state | 1 |
| featured_slots | 6 |
| feeding_archive | 41564 |
| feeding_audit | 29763 |
| followup_eval_audit | 3 |
| intake_alert_recipients | 3 |
| matcher_audit | 2853 |
| overnight_intakes | 13 |
| profile_quality_scores | 171 |
| searcher_daily_metrics | 197 |
| sm_push_audit | 36 |
| staff_notifications | 7 |
| volunteer_commitments | 11 |
| volunteer_declines | 1 |
| volunteer_timeclock | 1355 |
| volunteers | 599 |
| wellbeing_alerts | 175223 |
| **DB file size** | **93.5MB** |

## Scheduler Freshness

| Scheduler | Latest | Stale | Weight |
|-----------|--------|-------|--------|
| Feeding archive (midnight ET) | 2026-11-07 | 2d | CRITICAL |
| Activity auto-close (23:55 ET) | 2026-11-08 | 1d | CRITICAL |
| SM photo sync (2am ET) | 2026-11-09 07:00:02 | 2h | CRITICAL |
| Adoptable check (9am ET) | 2026-11-08T14:00:00.234Z | 20h | CRITICAL |
| Generic bio (9:30am ET) | 2026-11-08T13:30:00.086Z | 0d | INFORMATIONAL |
| Searcher snapshot (00:10 ET) | 2026-11-08 | 1d | INFORMATIONAL |

## Backups

| Tier | Count | Most Recent |
|------|-------|-------------|
| weekly-*.tar.gz | 15 | weekly-20261109.tar.gz |
| data-*.tar.gz | 15 | data-20261109-031501.tar.gz |
| shelter-*.db | 15 | shelter-2026-11-09.db |
| media-*.tar.gz | 5 | media-20261108.tar.gz (1d ago) |
| Ad-hoc (non-tiered) | 13 | 7842.0MB total |

## Grok Resumption

| Check | Value |
|-------|-------|
| grok_imagine video count | 492 |
| Prior count (state file) | 492 |
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
