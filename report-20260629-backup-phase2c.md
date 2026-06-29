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

## Verification Results — 2026-06-29 20:24 UTC

Scripts installed by John at 20:22 UTC. Manual runs executed immediately after.

### Step 1 — backup-data.sh manual run

✅ **PASS** — completed in 6 seconds, produced `data-20260629-202330.tar.gz`

### Step 2 — Surgical-exclude check

✅ **PASS**

| Check | Expected | Actual |
|-------|----------|--------|
| `grep animal-media` in data tarball | 0 matches | **0** ✅ |
| animal-photos/ | present | **354 entries** ✅ |
| animal-recordings/ | present | **478 entries** ✅ |
| library-photos/ | present | **106 entries** ✅ |
| volunteer-files/ | present | **193 entries** ✅ |
| featured-videos/ | present | **5 entries** ✅ |

animal-media excluded; all 5 non-media dirs preserved.

### Step 3 — Data tarball size

✅ **PASS** — **157 MB** (down from 572 MB — 72% reduction)

### Step 4 — backup-weekly.sh manual run

✅ **PASS** — completed in 2 seconds, produced `weekly-20260629.tar.gz`

No clawdbot warnings in log — dead section cleanly removed. Log shows:
```
Creating code tarball...
Collecting system configs...
Copying secrets...
Creating combined tarball...
Created weekly-20260629.tar.gz (30M) with:
  - Code, configs, secrets, RESTORE.md
```

### Step 5 — Secrets-stay + de-embed check

✅ **PASS**

| Check | Expected | Actual |
|-------|----------|--------|
| `secrets/shelter-secrets.json` in weekly | present | ✅ **present** |
| `secrets/google-sheets-credentials.json` in weekly | present | ✅ **present** |
| Embedded `data-*.tar.gz` in weekly | absent | ✅ **0 matches** |
| Embedded `shelter-*.db` in weekly | absent | ✅ **0 matches** |

### Step 6 — Weekly tarball size

✅ **PASS** — **30 MB** (down from 611 MB — 95% reduction)

### Media coverage intact

✅ `media-20260629.tar.gz` (465 MB, 1157 files) still present in `/home/shelter/backups/`

---

## Overall: ALL 6 CHECKS PASS ✅

## Size comparison

| Artifact | Before | After | Change |
|----------|--------|-------|--------|
| Daily data tarball | 572 MB | **157 MB** | -72% |
| Weekly bundle | 611 MB | **30 MB** | -95% |
| Weekly media (new) | — | 465 MB | (weekly, not daily) |
| Daily sqlite | 32 MB | 32 MB | unchanged |

**Projected 14-day footprint:** ~2.8 GB data + 420 MB weekly + 1.9 GB media (4 weeks) + 450 MB sqlite = **~5.6 GB** (down from ~13 GB — **57% reduction**).

---

## Revert commands (preserved, not needed):

```bash
sudo cp /home/shelter/scripts/backup-data.sh.bak-pre-mediaexclude /home/shelter/scripts/backup-data.sh
sudo cp /home/shelter/scripts/backup-weekly.sh.bak-pre-deembed /home/shelter/scripts/backup-weekly.sh
```

---

*Generated 2026-06-29 20:30 UTC. Verification completed 2026-06-29 20:24 UTC. All checks passed.*
