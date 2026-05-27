# Report: visual.sh migration to GitHub screenshots repo — diagnosis + proposed shape

**Date:** 2026-05-27 15:07 ET
**Scope:** Dashboard 11, item (d) — diagnose visual.sh, propose edit shape for GitHub migration. No implementation.

---

## Step 1 — visual.sh inventory

**Location:** `/home/rover/scripts/visual.sh` (rover-owned, 8944 bytes, 3 subcommands) [VERIFIED]

### References to legacy paths/URLs

| Line | Variable/Reference | Current value |
|------|--------------------|---------------|
| 10 | Comment (header) | `https://rover-reports.4lgshelterapp.duckdns.org/screenshots/index.txt` |
| 13 | `SCREENSHOTS_DIR` | `/home/shelter/rover-reports/screenshots` |
| 14 | `BASE_URL` | `https://rover-reports.4lgshelterapp.duckdns.org/screenshots` |
| 15 | `INDEX_FILE` | `${SCREENSHOTS_DIR}/index.txt` (derived from SCREENSHOTS_DIR) |

### Functions that output URLs

- `take_screenshot()` — prints `${BASE_URL}/${filename}` to stdout (line ~89)
- `cmd_measure()` — prints `${BASE_URL}/${filename}` to stdout (line ~142)
- `take_element_screenshot()` — prints `${BASE_URL}/${filename}` to stdout (line ~195)
- `index_add()` — writes `${BASE_URL}/${filename}` into index.txt (line ~24)

All four derive from `BASE_URL`. Changing that single variable updates all output URLs.

### No other path/hostname references

- No hardcoded hostnames beyond the three lines above
- No git logic currently exists in the script
- No retention/prune logic in the script (handled externally)
- Script runs as rover (ownership: `rover rover`)

---

## Step 2 — Proposed visual.sh edit shape

### Output directory

**Recommendation: flat (repo root), no subdirectory.**

Rationale: The repo IS the screenshots directory — it exists solely for this purpose. A `screenshots/` subdirectory inside a screenshots repo is redundant nesting. Flat means simpler paths, simpler retention `find`, and the index.txt lives at the repo root alongside the images. The GitHub raw URL is shorter too.

- `SCREENSHOTS_DIR` → `/home/rover/rover-reports-screenshots-repo`
- `INDEX_FILE` → `/home/rover/rover-reports-screenshots-repo/index.txt`

### New URL pattern

- `BASE_URL` → `https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main`
- Output URLs become: `https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/2026-05-27-150000-descriptor-desktop.png`
- Index URL: `https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/index.txt`

### Git add + commit + push logic

Add a `git_push()` helper function near the top of the script (after the variable declarations). Called at the end of each subcommand dispatch, after index_add has run.

```
git_push() {
    cd "$SCREENSHOTS_DIR"
    git add -A
    git commit -m "Screenshots: ${DATESTAMP}" || return 0  # nothing to commit is OK
    if ! git push origin main 2>/dev/null; then
        echo "WARNING: git push failed — screenshots saved locally but not pushed" >&2
    fi
}
```

- **Non-fatal push failure** — matches health-check.sh pattern. Screenshot is still saved locally; push failure prints a warning to stderr but doesn't exit non-zero (so the calling agent gets the file path and can use the local file).
- **No sudo -u rover needed** — script already runs as rover.
- **Commit message** — uses DATESTAMP for uniqueness. Multiple screenshots in the same second share a commit (unlikely but handled by git add -A).
- **Called once per invocation** at the end of dispatch, not inside each take_screenshot call. This means the dual-viewport screenshot mode (desktop + mobile when no viewport specified) gets one commit with both files, not two.

### Index regeneration

No change to `index_add()` logic — it still prepends to index.txt. The git_push at end of dispatch commits the updated index.txt alongside the new screenshot(s).

### Header comment update

Line 10 changes from the legacy URL to the GitHub raw URL.

### Summary of changes

~8 lines modified (3 variable declarations + 1 header comment), ~8 lines added (git_push function + 1 call site at end of dispatch). No structural changes to screenshot/measure/element logic.

---

## Step 3 — Retention script + cron proposal

### Script: `/home/rover/scripts/screenshots-retention.sh`

```bash
#!/bin/bash
# Daily retention sweep for rover-reports-screenshots-repo
# Removes screenshots older than 24 hours
# Cron: 0 4 * * * (daily 4am UTC, rover's crontab)

set -uo pipefail

REPO_DIR="/home/rover/rover-reports-screenshots-repo"
cd "$REPO_DIR"

# Delete .png and .txt measure files older than 24h (keep index.txt and README.md)
find . -maxdepth 1 \( -name "*.png" -o -name "*-measure.txt" \) -mmin +1440 -delete

# Regenerate index.txt from surviving files
# (simpler than trying to prune lines from index.txt — just rebuild it)
> index.txt  # truncate
for f in $(ls -t *.png *-measure.txt 2>/dev/null); do
    # We lose the original timestamp/type/descriptor metadata, but the filename encodes it
    echo "$(stat -c '%Y' "$f" | xargs -I{} date -d @{} -u +%Y-%m-%dT%H:%M:%SZ) | file | $(basename "$f" | sed 's/\.[^.]*$//') | https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/$f"
done > index.txt

git add -A
git commit -m "Retention sweep: $(date -u +%Y-%m-%d)" || true  # nothing to commit is OK
git push origin main || true
```

**Wait — simpler approach.** The retention script doesn't need to regenerate index.txt. When files are deleted, their index.txt entries become dead links. But since the index is rebuilt from scratch by visual.sh's `index_add()` (newest first, prepend), old entries naturally scroll down and the dead links only persist until the next `index_add` overwrites the file.

Actually, that's wrong — `index_add` prepends, it doesn't truncate. So stale entries accumulate. Two options:

**Option A (recommended): Retention script truncates index.txt to only reference surviving files.**
This is what the script above does. Minor complexity but keeps the index clean.

**Option B: Retention script just deletes files and lets index.txt have dead links.**
Simpler but messy — any agent fetching the index gets 404s for pruned files.

**Recommending Option A.** The index rebuild is ~4 lines and keeps the contract clean.

### Cron entry

```
crontab -e  # as rover
0 4 * * * /home/rover/scripts/screenshots-retention.sh >> /var/log/screenshots-retention.log 2>&1
```

- Runs as rover (owns the repo)
- 4am UTC daily
- Log to /var/log/ for debugging (file needs to exist — create once with `touch`)

---

## Step 4 — AGENTS.md line ~150 update

### Current (5 lines of context):

```
16. Use `/home/rover/scripts/visual.sh` for layout work:
    - `visual.sh screenshot <url> <descriptor> [<viewport>]` — full-page screenshot
    - `visual.sh measure <url> <selector> <descriptor>` — DOM metrics (computed styles, bounding box, parent chain)
    - `visual.sh element <url> <selector> <descriptor> [<viewport>]` — element screenshot

    Discovery index: `https://rover-reports.4lgshelterapp.duckdns.org/screenshots/index.txt`. 14-day retention. Any agent can fetch the index, find a descriptor, and retrieve the file.
```

### Proposed change (line 150 only):

```
    Discovery index: `https://raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/index.txt`. 24-hour retention. Any agent can fetch the index, find a descriptor, and retrieve the file.
```

Two changes in one line:
1. URL: `rover-reports.4lgshelterapp.duckdns.org/screenshots/index.txt` → `raw.githubusercontent.com/jvitiel/rover-reports-screenshots/main/index.txt`
2. Retention: `14-day` → `24-hour` (matching the new cron retention policy)

---

## Implementation plan (3 files + 1 cron entry, pending approval)

1. `/home/rover/scripts/visual.sh` — edit 3 variables + header comment, add git_push function + call site
2. `/home/rover/scripts/screenshots-retention.sh` — new file
3. `/home/rover/rover/AGENTS.md` line ~150 — URL + retention text
4. `crontab -e` (rover) — add retention cron entry
