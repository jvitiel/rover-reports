# Rover-Reports Caddy Block Retirement Survey

**Date:** 2026-05-27 12:33 ET (16:33 UTC)
**Scope:** Read-only. Find all references to `rover-reports.4lgshelterapp.duckdns.org` and categorize each.

---

## Step 1: shelter-apps repo

```
/home/shelter/shelter-apps/scripts/health-check.sh:15:REPORT_URL="https://rover-reports.4lgshelterapp.duckdns.org/health-check-latest.md"
```

**1 match.** The `REPORT_URL` variable is used in the Telegram alert message sent after each weekly health check — it includes the URL so John can click through to the full report.

**Category: 🔴 Live operational.** The health check cron runs every Monday at 10am UTC. The Telegram message will contain a dead link after the Caddy block is removed. The REPORT_URL needs updating to the GitHub raw URL (or removed if we stop writing health check reports to the legacy path).

Note: the health-check script also writes reports to `/home/shelter/rover-reports/` (REPORT_DIR on line 10), and the `rover-reports-prune.sh` cron prunes that directory. The local directory itself is separate from the Caddy block question — files will still exist locally, just won't be web-accessible.

---

## Step 2: rover workspace (excluding rover-reports-repo and .git)

**Actionable files (not memory/session logs):**

| File | Line | Category |
|------|------|----------|
| `AGENTS.md:149` | `screenshots/index.txt` discovery index URL | 🔴 Live operational |
| `TOOLS.md:110` | Report mirroring protocol description | 🔴 Live operational |
| `staging/Caddyfile:171` | Staged Caddyfile from May 18 security headers work | Self-referential |
| `staging/health-check.sh:15` | Staged health-check.sh (same URL as production) | Self-referential |
| `Caddyfile.20260525-205521.bak:166` | Backup Caddyfile | Historical |
| `Caddyfile.20260525-182455.bak:158` | Backup Caddyfile | Historical |

**eval-scratch scripts (5 files):**

| File | Category |
|------|----------|
| `bakeoff.py:296` | Historical (one-off analysis script) |
| `bakeoff_r2.py:226` | Historical |
| `bakeoff_r3.py:182` | Historical |
| `fiv_felv_diagnosis.py:288` | Historical |
| `sm_filter_audit.py:317` | Historical |

**Memory/session logs:** ~80+ matches across daily logs and session transcripts. All are historical references — report URLs cited in conversation history, diagnosis links, handoff reports. **Category: Historical reference.** No action needed.

---

## Step 3: system config (/etc/, /usr/local/)

```
/etc/caddy/Caddyfile:171:rover-reports.4lgshelterapp.duckdns.org {
/etc/caddy/Caddyfile.bak:139:rover-reports.4lgshelterapp.duckdns.org {
```

**2 matches.**

- `/etc/caddy/Caddyfile:171` — the live Caddy block itself. **Category: Self-referential.** This is the thing being retired.
- `/etc/caddy/Caddyfile.bak:139` — backup copy. **Category: Self-referential.**

---

## Step 4: shelter scripts and configs

```
/home/shelter/scripts/health-check.sh:15:REPORT_URL="https://rover-reports.4lgshelterapp.duckdns.org/health-check-latest.md"
```

**1 match.** Same as step 1 (production copy of the script). **Category: 🔴 Live operational.**

---

## Step 5: crontabs

### rover crontab
```
*/15 * * * * /home/rover/scripts/memory-snapshot.sh
0 4 * * * /home/rover/scripts/visual-cleanup.sh
0 6 * * * sudo -u shelter python3 /home/shelter/shelter-apps/scripts/score-profiles.py >> /home/shelter/logs/score-profiles.log 2>&1
```
**No references to rover-reports hostname.**

### root crontab
```
0 3 * * * /home/shelter/scripts/backup-sqlite.sh
0 9 * * 1 /home/shelter/scripts/weekly-error-summary.sh
CRON_TZ=America/New_York
30 2 * * 0 /home/shelter/scripts/staging-sync.sh
15 3 * * * /home/shelter/scripts/backup-data.sh
30 3 * * * /home/shelter/scripts/backup-weekly.sh
0 8 * * * /home/shelter/scripts/rover-reports-prune.sh
5 * * * * curl -sS -X POST http://localhost:3000/api/volunteers/timeclock/auto-close >> /var/log/timeclock-auto-close.log 2>&1
0 10 * * 1 /home/shelter/scripts/health-check.sh
CRON_TZ=UTC
40 2 * * 0 find ... (session archive)
45 2 * * 0 systemctl restart rover
```
**No direct references to the hostname in crontab entries.** However:
- `health-check.sh` (line 15) references the URL internally [VERIFIED — see steps 1 and 4]
- `rover-reports-prune.sh` operates on `/home/shelter/rover-reports/` (the local directory, not the hostname) — it will continue to work regardless of the Caddy block

---

## Summary: Categorized Matches

### 🔴 Live Operational (would break or produce dead links)

| Location | Usage | Impact |
|----------|-------|--------|
| `/home/shelter/scripts/health-check.sh:15` | REPORT_URL in Telegram alert | Dead link in weekly health check Telegram messages |
| `/home/shelter/shelter-apps/scripts/health-check.sh:15` | Git-tracked copy of same | Same (if deployed) |
| `/home/rover/rover/AGENTS.md:149` | `visual.sh` screenshot discovery index URL | Agents following AGENTS.md will try to fetch screenshots from dead URL |
| `/home/rover/rover/TOOLS.md:110` | Report mirroring protocol description | Describes the old rover-reports URL as the primary report path |

### Historical Reference (comments, logs, memory — no action needed)

| Count | Location |
|-------|----------|
| ~80+ | `/home/rover/rover/memory/*.md` — daily logs citing report URLs |
| ~50+ | `/home/rover/.openclaw-rover/agents/main/sessions/*.jsonl*` — session transcripts |
| 5 | `/home/rover/eval-scratch/*.py` — one-off analysis scripts |
| 2 | `/home/rover/rover/backups/AGENTS-pre-split-*.md` — old AGENTS.md backups |

### Self-Referential (part of the Caddy block itself or its staging copies)

| Location | Notes |
|----------|-------|
| `/etc/caddy/Caddyfile:171` | The block being retired |
| `/etc/caddy/Caddyfile.bak:139` | Backup of the Caddyfile |
| `/home/rover/rover/staging/Caddyfile:171` | Staged Caddyfile from May 18 |
| `/home/rover/rover/staging/health-check.sh:15` | Staged script copy |
| `/home/rover/rover/Caddyfile.*.bak` | Two Caddyfile backup copies |

---

## Pre-Retirement Checklist

Before commenting the Caddy block, these **live operational** references need updating:

1. **health-check.sh** (both copies) — change REPORT_URL to the GitHub raw URL pattern, or remove the URL from the Telegram message entirely if the health check reports will only be read locally
2. **AGENTS.md:149** — update the `visual.sh` screenshot discovery index URL (or note that screenshots are no longer web-served, which changes the visual debugging workflow)
3. **TOOLS.md:110** — update the report mirroring description to reflect the new GitHub raw URL protocol (already in use for regular reports per AGENTS.md report-and-URL-pattern section)

The `rover-reports-prune.sh` cron and the `/home/shelter/rover-reports/` directory can stay as-is — the prune script operates locally and the health check still writes there. Only the web-serving Caddy block goes away.
