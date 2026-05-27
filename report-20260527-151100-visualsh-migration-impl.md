# Report: visual.sh migration to GitHub screenshots repo — implementation

**Date:** 2026-05-27 15:11 ET
**Scope:** Dashboard 11, item (d) — migrate visual.sh output from legacy Caddy path to GitHub screenshots repo.

---

## Changes made

### 1. `/home/rover/scripts/visual.sh`

**Variables updated:**
- `SCREENSHOTS_DIR`: `/home/shelter/rover-reports/screenshots` → `/home/rover/rover-reports-screenshots-repo`
- `BASE_URL`: `https://rover-reports.4lgshelterapp.duckdns.org/screenshots` → `https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main`
- Header comment URL updated to match

**New function added — `git_push()`:**
```bash
git_push() {
    cd "$SCREENSHOTS_DIR"
    git add -A
    git commit -m "Screenshots: ${DATESTAMP}" || return 0
    if ! git push origin main 2>/dev/null; then
        echo "WARNING: git push failed — screenshots saved locally but not pushed"
    fi
}
```
- Called once at end of dispatch (after subcommand completes)
- Non-fatal push failure — warning goes to stdout (visible to calling agent)
- Single commit per invocation (dual-viewport mode gets one commit with both files)

### 2. `/home/rover/scripts/screenshots-retention.sh` (new file)

- Deletes `.png` and `*-measure.txt` files older than 1440 minutes (24h)
- Rebuilds `index.txt` from surviving files (newest first)
- git add -A + commit + push (both with `|| true` for no-op safety)
- Executable, rover-owned

### 3. `/home/rover/rover/AGENTS.md` (line ~150)

- URL: `rover-reports.4lgshelterapp.duckdns.org/screenshots/index.txt` → `raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/index.txt`
- Retention: `14-day` → `24-hour`

### 4. Rover's crontab

- Replaced: `0 4 * * * /home/rover/scripts/visual-cleanup.sh`
- With: `0 4 * * * /home/rover/scripts/screenshots-retention.sh >> /home/rover/screenshots-retention.log 2>&1`
- Old `visual-cleanup.sh` file left in place (targets legacy directory, harmless)

---

## Verification test

**Command:** `visual.sh screenshot https://dashboard.4lgshelterapp.duckdns.org migration-test desktop`

| Check | Result |
|-------|--------|
| Screenshot file in repo | `2026-05-27-191112-migration-test-desktop.png` (618KB) [VERIFIED] |
| Git commit | `e48f41d Screenshots: 2026-05-27-191112` — 2 files (png + index.txt) [VERIFIED] |
| Git push | Clean push to origin/main [VERIFIED] |
| Raw URL (PNG) | HTTP/2 200 [VERIFIED] |
| Raw URL (index.txt) | HTTP/2 200 [VERIFIED] |
| Index content | Correct entry: timestamp, type=screenshot, descriptor=migration-test, full GitHub raw URL [VERIFIED] |
| AGENTS.md line ~150 | Updated URL + retention text [VERIFIED] |
| Crontab | New retention entry at 0 4 * * * [VERIFIED] |

---

## Discovery note

Existing `visual-cleanup.sh` was already running at `0 4 * * *` in rover's crontab — this was the legacy 14-day retention script targeting `/home/shelter/rover-reports/screenshots/`. Replaced the cron entry (not the file) with the new script.

## Remaining retirement queue

- (e) Retire the rover-reports Caddy block (all operational references now migrated to GitHub)
