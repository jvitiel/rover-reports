# Health-Check Script Review — 2026-06-29

Scoping three improvements: (1) rolling dated reports, (2) week-over-week deltas, (3) expanded coverage.

---

## 1. Current Report Writing (Improvement 1: Rolling Dated Reports)

**Finding: This is already partially implemented.**

The script writes two files every run:
```bash
REPORT_LATEST="$REPORT_DIR/health-check-latest.md"   # overwritten each run
REPORT_DATED="$REPORT_DIR/health-check-$(date +%Y%m%d).md"  # timestamped copy
```

It then prunes dated copies older than 56 days:
```bash
find "$REPORT_DIR" -name "health-check-*.md" ! -name "health-check-latest.md" -mtime +56 -delete
```

Current dated files on disk (6 reports, weekly cadence confirmed):
```
health-check-20260527.md  4.4K  May 27
health-check-20260601.md  4.4K  Jun  1
health-check-20260608.md  4.3K  Jun  8
health-check-20260615.md  4.3K  Jun 15
health-check-20260622.md  4.3K  Jun 22
health-check-20260629.md  4.3K  Jun 29
health-check-latest.md    4.3K  Jun 29 (current)
```

**The gap:** The Telegram message always links to the fixed `health-check-latest.md` URL. To link to the dated file instead:
- Change `REPORT_URL` to use `health-check-$(date +%Y%m%d).md`
- The `latest` file could become a convenience symlink or be dropped entirely

**Nothing else references the "latest" filename** — only the script itself (3 lines) and a staging copy at `/home/rover/rover/staging/health-check.sh`. No external bookmarks, no Caddy routes, no other scripts depend on it.

### What would change:
- 1 line: `REPORT_URL=...health-check-$(date +%Y%m%d).md`
- Optionally keep or drop the `latest` file (low stakes either way)
- Already done: dated copies, 56-day pruning

---

## 2. Week-over-Week State (Improvement 2: Deltas)

**Finding: No prior-run state exists anywhere.**

The script collects metrics, writes the report, and exits. It does not persist any values for future comparison. There is no state file, no JSON, no last-run cache. The original spec explicitly deferred comparison to human readers.

### What's needed:
A small state file (e.g., `/home/shelter/scripts/.health-check-state.json`) written at the end of each run containing:
```json
{
  "date": "2026-06-29",
  "mem_avail_mb": 1200,
  "disk_pct": 62,
  "db_size_mb": 31.2,
  "animal_media_count": 5432,
  "animal_metadata_count": 123
}
```

Next run reads it, computes deltas, includes them in both the report and the Telegram summary:
```
Disk: 62% (↑16 from last week) | DB: 31.2MB (↑2.1) | Memory: 1200MB free (↓300)
```

**Write access:** The script runs as root, so `/home/shelter/scripts/` is fine. The file would be ~200 bytes.

---

## 3. Coverage Gaps (Improvement 3: Expanded Checks)

### 3a. Services

**Script checks:** shelter-app, rover, caddy (3 services)

**All running services (systemctl):**
| Service | Checked? |
|---------|----------|
| shelter-app | ✅ |
| rover | ✅ |
| caddy | ✅ |
| ssh | ❌ (should check) |
| cron | ❌ (should check — backup/health-check depend on it) |
| systemd-journald | ❌ (low priority, always up) |
| unattended-upgrades | ❌ (could note if stopped) |
| All others | System services, not shelter-relevant |

**No new shelter-specific services exist.** Featured rotation, bio pipeline, searcher, and matcher all run inside the shelter-app process (see 3d below), not as separate systemd units. The custom-search directory exists but has no service.

**Recommendation:** Add ssh and cron to the service check list. Both are critical infrastructure.

### 3b. Database Tables

**Script counts 9 tables.** The database now has **38 tables.**

Tables the script checks (9):
1. animal_media ✅
2. animal_metadata ✅
3. daily_activities ✅
4. feeding_archive ✅
5. activity_archive ✅
6. wellbeing_alerts ✅
7. volunteer_timeclock ✅
8. adoption_applications ✅
9. overnight_intakes ✅

**Missing tables (29):**
| Table | Added ~when | Priority |
|-------|------------|----------|
| featured_rotation_queue | Jun 2026 | HIGH — active feature |
| featured_slots | Jun 2026 | HIGH — active feature |
| animal_bio_drafts | Jun 2026 | HIGH — active feature |
| animal_bios | Jun 2026 | HIGH — active feature |
| animal_bios_history | Jun 2026 | MEDIUM — audit trail |
| staff_notifications | Jun 2026 | HIGH — active feature |
| behavior_notes | Jun 2026 | HIGH — active feature |
| rg_email_routing | May 2026 | MEDIUM |
| rg_messages | May 2026 | MEDIUM |
| rg_requesters | May 2026 | MEDIUM |
| rg_requests | May 2026 | MEDIUM |
| rg_sessions | May 2026 | MEDIUM |
| rg_attachments | May 2026 | MEDIUM |
| intake_alert_recipients | Jun 2026 | MEDIUM |
| searcher_daily_metrics | Jun 2026 | MEDIUM |
| profile_quality_scores | Jun 2026 | MEDIUM |
| adoptable_status_snapshot | Jun 2026 | MEDIUM |
| matcher_audit | Jun 2026 | LOW |
| sm_push_audit | Jun 2026 | LOW |
| followup_eval_audit | Jun 2026 | LOW |
| dashboard_events | May 2026 | LOW |
| dashboard_stories | May 2026 | LOW |
| active_sessions | ? | LOW |
| adopter_preferences | Jun 2026 | MEDIUM |
| daily_feeding | ? | MEDIUM |
| feeding_audit | Jun 2026 | LOW |
| volunteer_commitments | Jun 2026 | MEDIUM |
| volunteer_declines | Jun 2026 | LOW |
| volunteers | May 2026 | HIGH — core data |

**Recommendation:** Don't count all 38 — pick ~15–18 operationally important ones. At minimum add: featured_rotation_queue, featured_slots, animal_bio_drafts, animal_bios, staff_notifications, behavior_notes, volunteers, intake_alert_recipients, adopter_preferences. Consider a dynamic approach: `SELECT name FROM sqlite_master WHERE type='table'` and count all, flagging any new unknown tables.

### 3c. Scheduled Jobs — In-App vs Cron

**Cron-based (visible to crontab dump):**
- Root crontab: backup-sqlite.sh (3am), backup-data.sh (3:15am), backup-weekly.sh (3:30am), health-check.sh (Mon 10am), weekly-error-summary.sh (Mon 9am), rover-reports-prune.sh (4am daily)
- Rover crontab: (would need to check, but script dumps it)

**In-app schedulers (INVISIBLE to crontab dump) — 7 discovered:**

| Scheduler | Schedule | Line |
|-----------|----------|------|
| `scheduleMidnightFeedingJob()` | Midnight ET daily | L12554 |
| `scheduleActivityAutoClose()` | 23:55 ET daily | L12287 |
| `scheduleNightlySMPhotoSync()` | Nightly (time TBD) | L12527 |
| `scheduleDailyAdoptableCheck()` | Daily (time TBD) | L12683 |
| `scheduleGenericBioJob()` | 9:30am ET daily | L13128 |
| `scheduleDailySearcherSnapshot()` | 00:10 ET daily | L13158 |
| `checkDeadlineReminders` | Every 60 minutes | L12004 |

Plus an on-demand `runCropSweep` imported from cropSweep.ts (runs post-SM-sync, not on a fixed schedule).

**This is a significant blind spot.** The health check dumps crontabs but has zero visibility into in-app schedulers. If shelter-app restarts and a scheduler fails to re-initialize, or if a daily job silently stops running, the health check won't notice.

**Recommendation:** For each in-app scheduler, check its observable output:
- Feeding: `MAX(date) FROM feeding_archive` (already done ✅)
- Activity: `MAX(date) FROM activity_archive` (already done ✅)
- SM Photo Sync: check `MAX(updated_at) FROM animal_media WHERE source='sm'`
- Adoptable Alert: harder — check logs or add a last-run timestamp
- Generic Bio: check `MAX(created_at) FROM animal_bios` or `animal_bio_drafts`
- Searcher Snapshot: check `MAX(date) FROM searcher_daily_metrics`
- Deadline Reminders: check via `staff_notifications` recent count

### 3d. HTTP Health Probes

**Finding: The script does ZERO HTTP health probes.**

It checks `systemctl is-active shelter-app` — this confirms the process is running but NOT that it's serving requests. A crashed Express handler, a stuck event loop, or a broken route would pass the systemd check.

**Endpoints worth probing:**
| Endpoint | URL | What it tests |
|----------|-----|---------------|
| Dashboard | https://dashboard.4lgshelterapp.duckdns.org | Caddy + shelter-app |
| Staff PWA | https://staff.4lgshelterapp.duckdns.org | Static serving |
| Matcher | https://matcher.4lgshelterapp.duckdns.org | Static serving |
| API health | http://127.0.0.1:3000/api/animals (or a lightweight endpoint) | Express is responding |
| Searcher | https://dashboard.4lgshelterapp.duckdns.org/custom-search/ (if applicable) | Search app |

A simple `curl -sf -o /dev/null -w '%{http_code}' <url>` with a 10-second timeout per endpoint would catch most failures.

### 3e. Thresholds

| Metric | Current Threshold | Current Value | Recommendation |
|--------|------------------|---------------|----------------|
| Disk usage | 70% | 62% | Lower to 60% (we just hit 62% and it's accelerating) |
| Memory available | 500 MB | ~1200 MB | OK for now |
| Swap usage | 80% | low | OK |
| Backup staleness | 48h | current | OK |
| Feeding archive staleness | 3 days | OK | OK |
| Activity archive staleness | 9 days | OK | Could tighten to 7 |
| Ad-hoc backup size | 1 GB | ~14 GB flagged | Threshold may need revisiting |

---

## 4. Other Stale/Outdated Items

| Item | Status |
|------|--------|
| Clawdbot references | ✅ None found — script is clean |
| Path references | ✅ All paths current |
| PM2 check | ⚠️ Still checks for pm2 processes — pm2 was never used; this is harmless but vestigial |
| `shelter-secrets.json` mode check | ⚠️ Expects mode 600 but file is actually mode 644 (per AGENTS.md verified state). The check fires a flag every week. Either the expectation or the file mode should be reconciled. |
| Staging copy | `/home/rover/rover/staging/health-check.sh` exists — uses old `rover-reports.4lgshelterapp.duckdns.org` URL (stale). Not deployed, but could cause confusion if someone deploys from staging. |

---

## Summary of Scoped Changes

| Improvement | Effort | Key Changes |
|-------------|--------|-------------|
| 1. Dated report URL in Telegram | Trivial | 1 line: change REPORT_URL to use dated filename |
| 2. Week-over-week deltas | Small | Add state file write + read + delta formatting (~30 lines) |
| 3a. Add ssh/cron service checks | Trivial | 2 more `systemctl is-active` lines |
| 3b. Expand DB table counts | Small | Add ~10 more `db_count` calls |
| 3c. In-app scheduler staleness | Medium | 4–5 new SQL queries checking MAX dates on output tables |
| 3d. HTTP health probes | Medium | 4–5 curl checks with status code validation |
| 3e. Adjust disk threshold | Trivial | Change 70 → 60 |
| 4. Fix secrets mode expectation | Trivial | Change 600 → 644 or document the discrepancy |

---

*Read-only scoping report. No changes made. Generated 2026-06-29 13:23 UTC.*
