# Architecture Facts Inventory — 2026-10-11

Read-only structural audit for external architecture review.

---

## A. GIT STATE (`/home/shelter/shelter-apps`)

- **Remote:** None configured (no `git remote -v` output) [VERIFIED: `git remote -v` returned empty]
- **Uncommitted changes:** 19 untracked files (all `.backup-*`, `.bak-*` suffixed, plus one `yolov8n.pt`). No modified tracked files. Working tree is **clean for tracked files**, dirty with untracked artifacts. [VERIFIED: `git status -s | wc -l` → 19, all `??` prefixed]
- **Total commits:** 934 [VERIFIED: `git log --oneline | wc -l`]
- **Latest 3 commits:**
  1. `5decf17` Extend availability normalization: open-ended ranges + period words (9-5 anchors)
  2. `3c126e9` Normalize volunteer submitted_at to ISO at intake (INSERT + PATCH); fix American-date parsing
  3. `2d255bf` Add email address to volunteer application alert recipients
- **`dist/` committed?** No — 0 files tracked under `dist/`. `.gitignore` contains `server/dist/`. [VERIFIED: `git ls-files dist/ | wc -l` → 0, confirmed in `.gitignore`]

---

## B. SIZE / MODULES

- **Tracked files:** 6,562 [VERIFIED: `git ls-files | wc -l`]
- **Total LOC (tracked .ts/.js/.html/.css/.py/.json):** 77,176 lines [VERIFIED: `git ls-files | grep -E ... | xargs wc -l | tail -1`]
- **`server/src/server.ts`:** 14,172 lines [VERIFIED: `wc -l`]
- **`dashboard/index.html`:** 15,567 lines [VERIFIED: `wc -l`]

### Top-level directories (25):
adoption-pdfs/, assets/, caregiver-pwa/, coordinator-pwa/, custom-search/, dashboard/, data/, docs/, dogwalker-pwa/, forms/, intake-audio/, intake-photos/, matcher-preview/, matcher-web/, public/, rg-attachments/, scripts/, server/, staff-pwa/, staff-pwa-backup/, staging-staff/, static/, test-activity/, volunteer-pwa/

### Module existence check:
| Directory | Status |
|-----------|--------|
| staff-pwa | EXISTS |
| staging-staff | EXISTS |
| volunteer-app | MISSING (named `volunteer-pwa`) |
| dashboard | EXISTS |
| server | EXISTS |
| matcher-web | EXISTS |
| matcher-preview | EXISTS |
| **RG CARES portal** | **Not a standalone app.** `rg-portal.html.removed-passC` (untracked, removed) and `public/rg-cares-logo.png` exist. No dedicated app directory. |

[VERIFIED: `ls -d */`, `find -iname '*rg*cares*'`]

---

## C. TESTS

- **App-owned test files:** 0 (zero). All 154 `*.test.*` / `*.spec.*` files are inside `server/node_modules/`. [VERIFIED: `find . -not -path '*/node_modules/*' \( -name '*.test.*' -o -name '*.spec.*' \)` returned empty]
- **Test directories (excl node_modules):** None [VERIFIED: `find` for `__tests__`, `tests`, `test` dirs returned empty]
- **Test runner in package.json:**
  - `server/package.json` — no test script [VERIFIED]
  - `docs/package.json` — placeholder only: `"test": "echo \"Error: no test specified\" && exit 1"` [VERIFIED]
- **CI configuration:** None. No `.github/workflows/`, no `.gitlab-ci.yml`. [VERIFIED: `ls` returned "not found" for both]

---

## D. REPO DOCS

Present in repo root or `docs/`:
- `README.md` (root)
- `docs/` directory containing:
  - `README.md`, `INDEX.md`, `CONTRACTS.md`, `DECISIONS.md`, `DOCUMENTATION_SUMMARY.txt`
  - App-specific docs: `caregiver-app.md`, `coordinator-app.md`, `dogwalker-app.md`, `matcher-app.md`
  - `wordpress-admin-guide.pdf`, `build_wordpress_admin_guide.py`, `capture-screenshots.js`
  - `screenshots/` directory

**Not present in repo:** `CLAUDE.md`, `ARCHITECTURE*`, `AGENTS.md` (these live in the Rover workspace `/home/rover/rover/`, not in the shelter-apps repo). [VERIFIED: `ls` for those names in repo root]

---

## E. BACKUPS

### backup-sqlite.sh (daily 3:00am ET)
- **Archives:** All `.db` files from `/home/shelter/shelter-apps/data/`
- **Method:** `cp` (file copy, not `sqlite3 .backup`)
- **Destination:** `/home/shelter/backups/` (local VPS path)
- **Retention:** 14 days
- **Leaves VPS:** NO [VERIFIED: no scp/rsync/upload commands in script]

### backup-data.sh (daily 3:15am ET)
- **Archives:** `data/` (excluding `animal-media`), `adoption-pdfs/`, `rg-attachments/`, `intake-audio/` (if exists), `intake-photos/` (if exists)
- **Destination:** `/home/shelter/backups/data-TIMESTAMP.tar.gz` (local VPS path)
- **Retention:** 14 days
- **Leaves VPS:** NO [VERIFIED: no scp/rsync/upload commands in script]

### backup-weekly.sh (Saturday 3:30am ET)
- **Archives:**
  - **Source code** (`shelter-apps` minus data/node_modules/.git + `scripts/`)
  - System configs (Caddyfile, crontab, systemd unit, logrotate)
  - Secrets (shelter-secrets.json, google-sheets-credentials.json)
  - Generated RESTORE.md with full rebuild instructions
- **Destination:** `/home/shelter/backups/weekly-TIMESTAMP.tar.gz` (local VPS path)
- **Retention:** 14 days
- **Leaves VPS:** NO directly — but the RESTORE.md header notes "This is the archive John's PC pulls to USB" (external pull by John's PC at 2pm daily) [VERIFIED: script contents]
- **Includes source code:** YES — this is the only backup that includes shelter-apps source

### backup-media.sh (Sunday 3:45am ET)
- **Archives:** `data/animal-media/` (AI crops, thumbnails, grok_imagine videos)
- **Destination:** `/home/shelter/backups/media-TIMESTAMP.tar.gz` (local VPS path)
- **Retention:** 28 days
- **Leaves VPS:** NO [VERIFIED: no scp/rsync/upload commands in script]

### staging-sync.sh (Sunday 2:30am ET)
- **Direction:** `staff-pwa` → `staging-staff` (production → staging, one-way)
- **Behavior:** rsync with `--delete`, excludes `manifest.json`, `sw.js`, logo files. Rewrites sw.js cache name to staging convention.
- **Gate:** Skips if any staging file was modified in the last 7 days
- **Not a backup** — this is a drift-prevention sync

### Summary: Does any backup leave the VPS?
**No script pushes data off the VPS.** The only off-site copy is John's PC pulling `/home/shelter/backups/` daily at 2pm ET (external pull, not scripted on the VPS). All four backup scripts write exclusively to `/home/shelter/backups/` on the same disk.

### Does any backup include source code?
**Yes — `backup-weekly.sh` only.** It tarballs `shelter-apps` (minus data, node_modules, .git) plus `scripts/`. The daily backups (sqlite, data) do not include source.

---

## F. SECRETS INVENTORY

### Secret/config files (paths and permissions only — NO values):

| File | Path | Mode | Owner |
|------|------|------|-------|
| shelter-secrets.json | `/home/shelter/.config/shelter-secrets.json` | 600 | shelter:shelter |
| google-sheets-credentials.json | `/home/shelter/.config/google-sheets-credentials.json` | 600 | shelter:shelter |
| server/.env | `/home/shelter/shelter-apps/server/.env` | **tracked in git** | **empty file (0 bytes)** |
| secrets.json | `/home/shelter/.config/secrets.json` | — | — |
| rover-gateway-token.txt | `/home/shelter/.config/rover-gateway-token.txt` | — | — |
| get-secret.sh | `/home/shelter/scripts/get-secret.sh` | — | — |

[VERIFIED: `find`, `ls -la`, `wc -c`]

### Hardcoded credential pattern scan (app-owned files, excl node_modules):

**3 files** matched patterns (`Bearer`, `api_key`, `password`):

| File | Pattern context |
|------|----------------|
| `docs/CONTRACTS.md` | `Bearer` (API documentation examples — 5 occurrences) |
| `scripts/score-profiles.py` | `api_key()` (function call to retrieve key at runtime, not hardcoded) |
| `server/src/shelterManagerService.ts` | `password` (variable reference, constructs URL from config, not hardcoded) |

**No hardcoded secret values found.** All three files reference credentials via config/function lookup, not literal strings. [VERIFIED: `grep -oE` pattern context examination]

`server/.env` is **tracked in git but empty (0 bytes)**. It does not contain credentials. [VERIFIED: `wc -c` → 0, `cat` → empty]

---

## G. STAGING

From `staging-sync.sh`:
- **What it syncs:** Front-end PWA files (HTML, JS, CSS, icons) from `staff-pwa/` to `staging-staff/`
- **Direction:** Production → Staging (staff-pwa is production)
- **Exclusions:** `manifest.json`, `sw.js` (rewritten separately with staging cache name), logo files
- **Database:** Staging and production share the same SQLite database (`/home/shelter/shelter-apps/data/shelter.db`). The sync script only touches front-end files, not the DB. There is no separate staging database. [VERIFIED: script contents, no DB copy/reference in staging-sync.sh]

---

*Report generated 2026-10-11 by read-only inventory. No files were modified, no services restarted.*
