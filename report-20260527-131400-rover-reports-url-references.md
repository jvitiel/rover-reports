# Report: rover-reports URL reference updates (text-only)

**Date:** 2026-05-27 13:14 ET
**Scope:** Dashboard 11, item (a) — update documentation URLs from legacy Caddy hostname to GitHub raw URLs.

## Changes

### TOOLS.md (line ~110, Report Mirroring section)

**Before:**
```
When Rover produces a diagnosis or analysis report, it is written to `/home/shelter/rover-reports/`
with the naming pattern `report-YYYYMMDD-HHMMSS-slug.md` and served as plaintext at
https://rover-reports.4lgshelterapp.duckdns.org/<filename>.
```

**After:**
```
When Rover produces a diagnosis or analysis report, it is written to `/home/rover/rover-reports-repo/`
with the naming pattern `report-YYYYMMDD-HHMMSS-slug.md`, committed, and pushed to GitHub.
The plaintext URL is https://raw.githubusercontent.com/jvitiel/rover-reports/main/<filename>.
```

Two changes in one edit:
1. Write path: `/home/shelter/rover-reports/` → `/home/rover/rover-reports-repo/`
2. Serve URL: `rover-reports.4lgshelterapp.duckdns.org` → `raw.githubusercontent.com/jvitiel/rover-reports/main`

### AGENTS.md (line ~150, visual.sh screenshot discovery)

**No change.** Line currently references `rover-reports.4lgshelterapp.duckdns.org/screenshots/index.txt`. This URL migrates in item (d) when screenshots move to a GitHub repo. Confirmed unchanged — timestamp still May 26 22:02.

## Verification

- `ls -lt /home/rover/rover/*.md` confirms only TOOLS.md was modified [VERIFIED]
- AGENTS.md timestamp unchanged at May 26 22:02 [VERIFIED]
- No production code, scripts, Caddyfile, or secrets touched [VERIFIED]

## Remaining items from retirement queue

- (b) health-check.sh REPORT_URL references — production script edit
- (c) Caddy block removal — infra change
- (d) Screenshot migration to GitHub repo — new repo + visual.sh + AGENTS.md URL update
