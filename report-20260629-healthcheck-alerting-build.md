# Health-Check Alerting Redesign — Build — 2026-06-29

## Path: HAND TO JOHN

Script staged at `/tmp/health-check-v2.sh`. John installs:

```bash
sudo cp /home/shelter/scripts/health-check.sh /home/shelter/scripts/health-check.sh.bak-pre-alerting
sudo cp /tmp/health-check-v2.sh /home/shelter/scripts/health-check.sh
sudo chown root:root /home/shelter/scripts/health-check.sh
sudo chmod 755 /home/shelter/scripts/health-check.sh
```

---

## Changes Applied

### Part 1 — Three Query Fixes

| Fix | Before | After | Confirmed |
|-----|--------|-------|-----------|
| Activity staleness | `MAX(date) FROM activity_archive` / threshold >9 | `MAX(date) FROM daily_activities` / threshold >2 | Returns 2026-06-29 ✅ |
| animal_bios freshness | `MAX(created_at) FROM animal_bios` | `MAX(generated_at) FROM animal_bios` | Returns 2026-06-29T13:30 ✅ |
| searcher_daily_metrics | `MAX(date) FROM searcher_daily_metrics` | `MAX(snapshot_date) FROM searcher_daily_metrics` | Returns 2026-06-28 ✅ |

Activity label also changed: "Activity archive" → "Activity auto-close" in report + message.

### Part 2 — Flag Severity Split

Old: single `FLAGS=()` array + `flag()` function.
New: `FLAGS_CRITICAL=()` + `FLAGS_INFO=()` with `flag_critical()` + `flag_info()`. Legacy `flag()` kept as wrapper defaulting to CRITICAL.

### Full Categorization Table (36 call sites)

| Line | Flag text | Bucket |
|------|-----------|--------|
| 85 | Memory: only ${MEM_AVAIL}MB available (threshold: 500MB) | **CRITICAL** |
| 86 | Swap: ${SWAP_PCT}% used (threshold: 80%) | **CRITICAL** |
| 87 | Disk: ${DISK_PCT}% used (threshold: 60%) | **CRITICAL** |
| 97 | Service: shelter-app is $SVC_SHELTER | **CRITICAL** |
| 98 | Service: rover is $SVC_ROVER | **CRITICAL** |
| 99 | Service: caddy is $SVC_CADDY | **CRITICAL** |
| 100 | PM2: $PM2_COUNT pm2 processes running | **CRITICAL** |
| 107 | HTTP: $label returned $code (expected 200) | **CRITICAL** |
| 125 | Unexpected public port: ${port} (${proc}) | **CRITICAL** |
| 132 | SSH password auth is enabled | **CRITICAL** |
| 136 | UFW firewall is inactive | **CRITICAL** |
| 149 | TLS cert expires in ${CERT_DAYS_LEFT} days | **CRITICAL** |
| 155 | Security headers missing from Caddy responses | **CRITICAL** |
| 160 | ${SECURITY_UPDATES} pending security updates | **CRITICAL** |
| 169 | Process: ... using ${PROC_MEM}% RAM | **CRITICAL** |
| 184 | DB: table $tbl is empty | INFO |
| 185 | DB: table $tbl query ERROR | **CRITICAL** |
| 191 | DB: NEW table detected since last run: $tbl | INFO |
| 203 | Feeding archive last ran ${FEEDING_MAX_DATE} (>3 days stale) | **CRITICAL** |
| 211 | Activity auto-close last ran ${ACTIVITY_MAX_DATE} (>2 days stale) | **CRITICAL** |
| 224 | SM photo sync last ran ... (>48h stale) | **CRITICAL** |
| 235 | Adoptable check last ran ... (>48h stale) | **CRITICAL** |
| 246 | Generic bio last ran ... (>7 days stale) | INFO |
| 257 | Searcher snapshot last ran ... (>2 days stale) | INFO |
| 277 | Backup: $label most recent is ${age_hours}h old | **CRITICAL** |
| 280 | Backup: $label has 0 files | **CRITICAL** |
| 306 | Backups: ad-hoc files total ${ADHOC_SIZE_GB}GB | INFO |
| 317 | Media backup is ${MEDIA_AGE_DAYS} days old | INFO |
| 319 | No media-*.tar.gz found in backups | INFO |
| 334 | Grok video generation resumed: count ... | INFO |
| 339 | Security: shelter-secrets.json mode wrong | **CRITICAL** |
| 342 | Security: rover in sudo group | **CRITICAL** |
| 345 | Security: /etc/sudoers.d/rover missing | **CRITICAL** |
| 357 | ${fname} mode/owner wrong (forms) | **CRITICAL** |
| 366 | World-writable directory: ${wdir} | **CRITICAL** |
| 543 | Git push failed for health-check report | **CRITICAL** |

**28 CRITICAL, 8 INFO, 0 bare/uncategorized.**

### Part 3 — Message Body Redesign

Verdict: 🔴 critical / 🟡 notes / 🟢 all clear.

Always-present blocks: 📊 Vitals (disk/mem/DB with deltas, HTTP codes, services), 🕐 Scheduler summary, 📦 Backup summary.

Conditional blocks: ⚠️ Critical (only if crit>0), ℹ️ Notes (only if info>0).

---

## Verification Results

*(To be completed after John installs and runs twice)*

| Check | Expected | Run 1 | Run 2 |
|-------|----------|-------|-------|
| Activity freshness | ~0d (from daily_activities) | PENDING | PENDING |
| Bio freshness | real date (generated_at) | PENDING | PENDING |
| Searcher freshness | real date (snapshot_date) | PENDING | PENDING |
| Verdict | 🟡 (volunteer_declines empty = info note) | PENDING | PENDING |
| volunteer_declines under ℹ️ not ⚠️ | ℹ️ Notes section | PENDING | PENDING |
| Vitals block present | always | PENDING | PENDING |
| Scheduler summary present | always | PENDING | PENDING |
| Backup summary present | always | PENDING | PENDING |
| Deltas show | no (run 1), yes (run 2) | PENDING | PENDING |
| Grok silent | 113=113 | PENDING | PENDING |
| No ERRORs | 0 | PENDING | PENDING |

---

*Generated 2026-06-29 21:20 UTC. Awaiting John's install + two test runs.*
