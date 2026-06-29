# Backup Redesign Phase 2c — Script Edits — 2026-06-29

## Path: HAND TO JOHN

Rover can `sudo` to *run* backup scripts but cannot write to `/home/shelter/scripts/` (root-owned, no root file-write sudoers entry). Edited scripts are staged in `/tmp/`. John must copy them.

## Commands for John

```bash
# 1. Create .bak safety copies
sudo cp /home/shelter/scripts/backup-data.sh /home/shelter/scripts/backup-data.sh.bak-pre-mediaexclude
sudo cp /home/shelter/scripts/backup-weekly.sh /home/shelter/scripts/backup-weekly.sh.bak-pre-deembed

# 2. Install edited scripts
sudo cp /tmp/backup-data-edited.sh /home/shelter/scripts/backup-data.sh
sudo cp /tmp/backup-weekly-edited.sh /home/shelter/scripts/backup-weekly.sh
sudo chown root:root /home/shelter/scripts/backup-data.sh /home/shelter/scripts/backup-weekly.sh
sudo chmod 755 /home/shelter/scripts/backup-data.sh /home/shelter/scripts/backup-weekly.sh

# 3. Also install backup-media.sh (from Phase 1)
sudo cp /home/rover/backup-media.sh /home/shelter/scripts/backup-media.sh
sudo chown root:root /home/shelter/scripts/backup-media.sh
sudo chmod 755 /home/shelter/scripts/backup-media.sh
```

After John runs these, Rover will execute the verification steps (manual backup runs + all 6 checks).

---

## Edit 1 — backup-data.sh: Exclude animal-media

**One line added. Nothing else changed.**

`diff` output:
```
33a34
>   --exclude='data/animal-media' \
```

### Before (lines 32-36):
```bash
tar -czf "$ARCHIVE" \
  -C /home/shelter/shelter-apps \
  $TAR_DIRS \
  2>>"$LOG"
```

### After (lines 32-37):
```bash
tar -czf "$ARCHIVE" \
  -C /home/shelter/shelter-apps \
  --exclude='data/animal-media' \
  $TAR_DIRS \
  2>>"$LOG"
```

---

## Edit 2 — backup-weekly.sh: De-embed data and sqlite

### Changes made:
1. **Removed** `LATEST_SQLITE` and `LATEST_DATA` find/check/copy — the weekly no longer embeds the sqlite backup or the data tarball (both are separate daily artifacts)
2. **Removed** the clawdbot/clawd section (CLAUDE.md no longer exists — already logging warnings every run)
3. **Updated** header comments to reflect new bundle contents
4. **Updated** log line to remove sqlite/data references
5. **Rewrote** RESTORE.md heredoc for 4-artifact restore procedure

### PRESERVED (critical — verified):
- **Secrets:** `shelter-secrets.json` (line 74) and `google-sheets-credentials.json` (line 75) — both cp lines IDENTICAL to original
- **Code tarball:** tar command IDENTICAL to original
- **System configs:** all 4 config cp lines IDENTICAL (Caddyfile, crontab, shelter-app.service, logrotate)
- **Alert function:** IDENTICAL
- **Retention/prune logic:** IDENTICAL (14 days, `weekly-*.tar.gz` pattern)

---

## Verification Results

*(To be completed after John installs the edited scripts)*

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 1 | backup-data.sh runs and produces data-*.tar.gz | ✅ | PENDING |
| 2 | `tar -tzf ... \| grep animal-media` → empty | 0 matches | PENDING |
| 2b | `tar -tzf ... \| grep 'animal-photos\|animal-recordings\|library-photos\|volunteer-files\|featured-videos'` → all present | ≥5 dirs | PENDING |
| 3 | New data tarball size | ~120 MB | PENDING |
| 4 | backup-weekly.sh runs and produces weekly-*.tar.gz | ✅ | PENDING |
| 5a | `tar -tzf ... \| grep 'shelter-secrets\|google-sheets'` → present | 2 files | PENDING |
| 5b | `tar -tzf ... \| grep 'data-.*\.tar\.gz'` → empty | 0 matches | PENDING |
| 6 | New weekly tarball size | ~13 MB | PENDING |

---

## Revert commands (if any verification fails):

```bash
sudo cp /home/shelter/scripts/backup-data.sh.bak-pre-mediaexclude /home/shelter/scripts/backup-data.sh
sudo cp /home/shelter/scripts/backup-weekly.sh.bak-pre-deembed /home/shelter/scripts/backup-weekly.sh
```

---

*Generated 2026-06-29 20:30 UTC. Awaiting John's sudo install before verification.*
