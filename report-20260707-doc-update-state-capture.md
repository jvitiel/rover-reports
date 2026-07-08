# Documentation State Capture — 2026-07-08 00:40 UTC

## 1. Current Table List (34 tables)

All 6 `rg_*` tables confirmed absent. [VERIFIED]

| Table | Row count |
|-------|-----------|
| active_sessions | 1 |
| activity_archive | 10,329 |
| adoptable_status_snapshot | 482 |
| adopter_preferences | 52 |
| adoption_applications | 11 |
| animal_bio_drafts | 16 |
| animal_bios | 326 |
| animal_bios_history | 779 |
| animal_media | 2,120 |
| animal_metadata | 951 |
| behavior_notes | 147 |
| daily_activities | 990 |
| daily_feeding | 320 |
| dashboard_events | 20 |
| dashboard_stories | 11 |
| featured_rotation_queue | 76 |
| featured_rotation_state | 1 |
| featured_slots | 6 |
| feeding_archive | 15,580 |
| feeding_audit | 11,867 |
| followup_eval_audit | 3 |
| intake_alert_recipients | 3 |
| matcher_audit | 938 |
| overnight_intakes | 13 |
| profile_quality_scores | 146 |
| searcher_daily_metrics | 72 |
| sm_push_audit | 36 |
| sqlite_sequence | 16 |
| staff_notifications | 7 |
| volunteer_commitments | 11 |
| volunteer_declines | 0 |
| volunteer_timeclock | 571 |
| volunteers | 450 |
| wellbeing_alerts | 58,987 |

## 2. Cron Jobs

### Root crontab

UNREADABLE — `sudo crontab -l` requires a password in this context. [UNCERTAIN]

### Rover crontab (3 jobs)

| Schedule | Command |
|----------|---------|
| `*/15 * * * *` | `/home/rover/scripts/memory-snapshot.sh` |
| `0 4 * * *` | `/home/rover/scripts/screenshots-retention.sh` |
| `0 6 * * *` | `sudo -u shelter python3 /home/shelter/shelter-apps/scripts/score-profiles.py` |

[VERIFIED]

### Shelter crontab

No crontab for shelter. [VERIFIED]

### In-process scheduled jobs (setInterval in server.ts)

| Job | Schedule | Description |
|-----|----------|-------------|
| `refreshAvailableDogsCache` | Every 2 minutes | Background dogwalker cache refresh |
| `runActivityAutoClose` | Interval (in-code) | Auto-close stale activity entries |
| `runNightlySMPhotoSync` | Every 24 hours | Nightly ShelterManager photo sync |
| `runMidnightFeedingJob` | Every 24 hours | Midnight feeding job reset |
| `runAdoptableStatusCheck` | Every 24 hours | Adoptable status snapshot check |
| `runGenericBioJob` | Every 24 hours | Auto-generate generic bios |
| `runDailySearcherSnapshot` | Every 24 hours | Daily searcher metrics snapshot |

**RG deadline reminder (`checkDeadlineReminders`) — CONFIRMED GONE.** grep returns zero matches in live server.ts. [VERIFIED]

## 3. Services

| Unit | Status |
|------|--------|
| `shelter-app.service` | **active** (running) |
| `caddy.service` | **active** (running) |
| `rover.service` | **active** (running) — "Rover (OpenClaw Gateway, profile=rover)" |

[VERIFIED]

## 4. External APIs Configured

### Secret key names (values REDACTED)

| Key name | Present |
|----------|---------|
| `alertsBotChatId` | ✅ |
| `alertsBotToken` | ✅ |
| `anthropic` | ✅ |
| `github_rover_reports_pat` | ✅ |
| `github_rover_reports_screenshots_pat` | ✅ |
| `googleSheets` | ✅ |
| `openai` | ✅ |
| `piiGateToken` | ✅ |
| `resend` | ✅ |
| `shelterManager` | ✅ |
| `shelterManagerWrite` | ✅ |
| `wordpress` | ✅ |
| `xai` | ✅ |

[VERIFIED — key names only, zero values exposed]

### Live in code vs. key-only

| Service | Key present | Live in server.ts | What it does |
|---------|------------|------------------|--------------|
| **Anthropic (Claude)** | ✅ `anthropic` | ✅ 21 refs | Volunteer OCR, bio generation, translation |
| **OpenAI (Whisper)** | ✅ `openai` | ✅ via `transcriptionService.ts` | Audio transcription for behavior notes |
| **xAI (Grok Imagine)** | ✅ `xai` | ✅ `generateVideo`/`downloadVideo` imported + called | Video generation for animal media |
| **Resend** | ✅ `resend` | ✅ 28 refs in emailService.ts | Transactional email (adoption, intake, volunteer, contact) |
| **ShelterManager** | ✅ `shelterManager` + `shelterManagerWrite` | ✅ via `shelterManagerService.ts` | Animal data sync (read + write) |
| **Google Sheets** | ✅ `googleSheets` | ✅ via `googleSheetsService.ts` | Walk logs, activity logs, feeding logs, kennel assignments |
| **WordPress** | ✅ `wordpress` | ✅ REST API calls | Push stories, events, media, cache clear |
| **Telegram alerts** | ✅ `alertsBotToken` + `alertsBotChatId` | ✅ (via alert scripts) | Backup failure + system alerts |
| **GitHub** | ✅ `github_rover_reports_pat` | ✅ (via git push) | Report publishing |
| **MediaPet** | ❌ no key | ❌ zero code refs | NOT in use |

**Settled:** Grok/xAI IS live for video generation (imported and called in current server.ts). Google Sheets IS still called (walk/activity/feeding logs). MediaPet is NOT used anywhere. [VERIFIED]

## 5. Email Config

```
FROM_EMAIL = 'No-Reply@4lg.org'
SANDBOX_MODE = false  (production sender, not sandbox)
```

Live domain sender `4lg.org` via Resend. [VERIFIED — server/src/emailService.ts:29,34-35]

## 6. OpenClaw / Rover Specifics

| Item | Value |
|------|-------|
| Systemd unit | `rover.service` |
| ExecStart | `/usr/bin/openclaw --profile rover gateway` |
| User | `rover:rover` |
| WorkingDirectory | `/home/rover/rover` |
| Config file | `/home/rover/.openclaw-rover/openclaw.json` |
| Gateway port | **18790** |
| Model | `anthropic/claude-opus-4-6` (via `agents.defaults.model.primary`) |
| Webchat port | Not separately configured (served via gateway) |

[VERIFIED — no tokens/secrets exposed]

## 7. Dashboard Tabs (10 tabs, in order)

| # | Tab ID | Label |
|---|--------|-------|
| 1 | animals | 📷 Media |
| 2 | profiles | 📋 Profiles |
| 3 | adoptions | 📝 Adoptions |
| 4 | stories | 📖 Web Stories |
| 5 | events | 📅 Web Events |
| 6 | activities | 🚶 Activities |
| 7 | feeding | 🍖 Feeding |
| 8 | wellbeing | 💚 Wellbeing |
| 9 | intake | 🚨 Overnight Intake |
| 10 | volunteers | 🤝 Volunteers |

**RG Cares tab — CONFIRMED GONE.** Not present in the tab button list. [VERIFIED — dashboard/index.html:4794–4803]

## 8. WordPress CPTs Pushed To

| CPT | REST base | Push operations |
|-----|-----------|----------------|
| `shelter_story` | `shelter-stories` | CREATE (POST), UPDATE (PUT), DELETE, featured toggle |
| `shelter_event` | `shelter-events` | CREATE (via `4lg/v1/push-event`), UPDATE (PUT), DELETE |
| Media | `wp/v2/media` | Upload (POST) for story/event images |

Custom 4LG endpoints also called:
- `4lg/v1/clear-animals-cache` — animal cache bust
- `4lg/v1/clear-stories-cache` — stories cache bust
- `4lg/v1/clear-events-cache` — events cache bust
- `4lg/v1/set-story-featured` — featured story toggle
- `4lg/v1/push-event` — event create with meta
- `4lg/v1/link-es-translation` — EN→ES translation link (stories + events)

All targeting `https://johnv80.sg-host.com/wp-json/`. [VERIFIED]
