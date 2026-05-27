# Report: health-check.sh GitHub-pipeline transition — implementation

**Date:** 2026-05-27 13:25 ET
**Scope:** Dashboard 11, item (b) — migrate health-check.sh from legacy Caddy to GitHub push workflow.

---

## Changes made

**File:** `/home/shelter/shelter-apps/scripts/health-check.sh` (git-tracked copy, commit 57a44ee)

### Diff summary (+13, -8 lines)

1. **Header comments (lines 5-7):** Updated paths from `/home/shelter/rover-reports/` to `/home/rover/rover-reports-repo/`. Added new comment line with GitHub raw URL base.

2. **REPORT_DIR (line 11):** `/home/shelter/rover-reports` → `/home/rover/rover-reports-repo`

3. **REPORT_URL (line 16):** `https://rover-reports.4lgshelterapp.duckdns.org/health-check-latest.md` → `https://raw.githubusercontent.com/jvitiel/rover-reports/main/health-check-latest.md`

4. **Removed chown block (was lines 374-375):** No longer needed — repo is rover-owned, script runs as root.

5. **Moved retention prune (line 374):** Now runs BEFORE git block so deletions are committed in the same push.

6. **Added git block (lines 376-382):**
   ```bash
   if ! sudo -u rover bash -c 'cd /home/rover/rover-reports-repo && git add -A && git commit -m "Health check YYYY-MM-DD" && git push origin main' 2>/dev/null; then
     flag "⚠️ Git push failed for health-check report"
     FLAG_COUNT=${#FLAGS[@]}
   fi
   ```
   - Uses `sudo -u rover` to avoid git dubious-ownership error (script runs as root, repo owned by rover)
   - Non-fatal: push failure adds a flag but doesn't prevent Telegram alert
   - `git add -A` picks up both new report files AND pruned deletions

### What did NOT change

- All data-gathering logic (system, services, network, database, backups, security)
- Flag thresholds
- Telegram message construction
- send-alert.sh invocation
- Send log write
- Footer comment (still references `/home/shelter/scripts/health-check.sh`)

---

## Production copy status

**Not yet updated.** Production copy at `/home/shelter/scripts/health-check.sh` is root-owned in a root-owned directory. Rover lacks write access.

**John needs to run:**
```
sudo cp /home/shelter/shelter-apps/scripts/health-check.sh /home/shelter/scripts/health-check.sh
```

After that, both copies will be identical and the next Monday 10am UTC cron run will use the GitHub pipeline.

## Verification checklist

- [x] Git-tracked copy updated and committed (57a44ee) [VERIFIED]
- [x] Diff shows exactly the expected changes — no collateral edits [VERIFIED]
- [ ] Production copy updated (BLOCKED — needs `sudo cp` from John)
- [ ] Dry-run test after production copy installed

## Remaining items

- (c) Caddy block removal — infra change (after all references migrated)
- (d) Screenshot migration to GitHub repo — new repo + visual.sh + AGENTS.md URL update
