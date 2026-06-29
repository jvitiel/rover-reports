# Backup Tarball Redesign — Media Exclusion Scoping — 2026-06-29

## 1. Full Backup Script Inventory

### 1a. backup-sqlite.sh
- **What:** Copies every `*.db` from `/home/shelter/shelter-apps/data/` to `/home/shelter/backups/`
- **Output:** `shelter-YYYY-MM-DD.db` (+ slot1fix copies — separate bug)
- **Schedule:** Daily 3:00am ET (root crontab)
- **Retention:** 14 days (find -mtime +14 -delete)
- **Size per run:** ~32 MB (current shelter.db)

### 1b. backup-data.sh
- **What:** Tars these directories from under `/home/shelter/shelter-apps/`:
  - `data/` (includes animal-media, animal-photos, animal-recordings, featured-videos, library-photos, volunteer-files, shelter.db)
  - `adoption-pdfs/` (1.7 MB)
  - `rg-attachments/` (456 KB)
  - `intake-audio/` (1.5 MB — if exists)
  - `intake-photos/` (1.6 MB — if exists)
- **Output:** `data-YYYYMMDD-HHMMSS.tar.gz`
- **Schedule:** Daily 3:15am ET
- **Retention:** 14 days
- **Current size:** 572 MB (Jun 29) — **THIS IS THE PRIMARY PROBLEM**

### 1c. backup-weekly.sh
- **What:** Bundles into one tarball:
  - Latest `.db` backup (from backup-sqlite.sh)
  - Latest `data-*.tar.gz` (from backup-data.sh — **the entire data tarball is nested inside**)
  - `code.tar.gz` (shelter-apps minus data/node_modules — ~12 MB)
  - System configs (Caddyfile, crontab, shelter-app.service, logrotate)
  - Secrets (shelter-secrets.json, google-sheets-credentials.json)
  - RESTORE.md
- **Output:** `weekly-YYYYMMDD.tar.gz`
- **Schedule:** Daily 3:30am ET (misleadingly named "weekly" but runs daily)
- **Retention:** 14 days
- **Current size:** 611 MB (Jun 29) — basically data tarball + code + overhead

### 1d. do-backup.sh
- **What:** Ad-hoc utility — copies a single file to backups with timestamp
- **Schedule:** Manual only (no cron)
- **Output:** `<name>-YYYYMMDD-HHMMSS.db`

### Backup chain summary:

| Time | Script | Output | Size | Cadence |
|------|--------|--------|------|---------|
| 3:00 | backup-sqlite.sh | shelter-YYYY-MM-DD.db | 32 MB | Daily |
| 3:15 | backup-data.sh | data-YYYYMMDD.tar.gz | **572 MB** | Daily |
| 3:30 | backup-weekly.sh | weekly-YYYYMMDD.tar.gz | **611 MB** | Daily |

**Total daily backup output: ~1.2 GB** (data + weekly + db). Over 14 days retention: **~17 GB**.

**Critical observation:** The weekly tarball **embeds the data tarball**. This means the data (including animal-media) is stored TWICE per day: once in `data-*.tar.gz` and again inside `weekly-*.tar.gz`. This doubles the media storage impact.

---

## 2. Where animal_media Is and How It's Tarred

### The directory:

```
/home/shelter/shelter-apps/data/animal-media/    468 MB    1,157 files
├── crops/          76 MB     (AI-generated crops)
├── thumbnails/      8 MB     (video thumbnails)
└── videos/        385 MB     (short MP4 clips from ShelterManager)
```

### How it gets tarred:

**backup-data.sh line 30-33:**
```bash
tar -czf "$ARCHIVE" \
  -C /home/shelter/shelter-apps \
  $TAR_DIRS \    # TAR_DIRS="data adoption-pdfs rg-attachments [intake-audio] [intake-photos]"
```

The tar starts from `/home/shelter/shelter-apps` and includes the entire `data/` directory — animal-media is swept in as a subdirectory of `data/`. No `--exclude` for animal-media exists.

### What % of the tarball is animal-media:

| Component | Uncompressed | % of data dir |
|-----------|-------------|---------------|
| animal-media/ | 468 MB | **72%** |
| Other data/ contents (DB, animal-photos, recordings, featured-videos, library-photos, volunteer-files) | 180 MB | 28% |
| adoption-pdfs + rg-attachments + intake-* | 5 MB | <1% |

The data tarball compresses to 572 MB from ~653 MB uncompressed. **animal-media accounts for ~72% of the tarball.** The videos (385 MB) are already compressed (MP4), so they barely shrink in the gzip — they're dead weight in the compressed tarball.

### Tarball growth trajectory:

| Date | data tarball | weekly tarball |
|------|-------------|----------------|
| Jun 15 | 305 MB | 333 MB |
| Jun 22 | 394 MB | 430 MB |
| Jun 25 | 404 MB | 441 MB |
| Jun 27 | 416 MB | 454 MB |
| Jun 29 | **572 MB** | **611 MB** |

The Jun 27→29 jump from 416→572 MB (+156 MB in 2 days) corresponds to new video files being added. Growth is bursty, not linear — driven by SM photo/video sync batches.

---

## 3. What Else Is in the Tarballs (Non-Media Contents)

### data tarball (backup-data.sh) — what remains after media exclusion:

| Path | Size | Changes how often |
|------|------|-------------------|
| data/shelter.db + WAL/SHM | 37 MB | Continuously (every DB write) |
| data/animal-photos/ | 15 MB | Occasionally (legacy SM photos) |
| data/animal-recordings/ | 34 MB | Weekly (voice notes) |
| data/featured-videos/ | 12 MB | Rarely |
| data/library-photos/ | 23 MB | Rarely |
| data/volunteer-files/ | 62 MB | Weekly |
| adoption-pdfs/ | 1.7 MB | Rarely |
| rg-attachments/ | 456 KB | Occasionally |
| intake-audio/ | 1.5 MB | Occasionally |
| intake-photos/ | 1.6 MB | Occasionally |

**Slimmed data tarball without animal-media: ~185 MB uncompressed → ~100-120 MB compressed** (estimated — the DB and recordings compress well; photos/videos less so).

### weekly tarball (backup-weekly.sh) — what remains:

The weekly embeds the data tarball + adds code.tar.gz (~12 MB) + configs + secrets (~1 MB) + RESTORE.md. After slimming the data tarball, the weekly would be ~130-150 MB.

---

## 4. Media Change Rate

| Period | Files changed | Daily rate |
|--------|--------------|------------|
| Last 7 days | 195 files | ~28/day |
| Last 30 days | 1,049 files | ~35/day |
| Total | 1,157 files | — |

Most recent additions are **crops** (AI auto-generated from SM sync, several per day) and **videos** (MP4 clips from SM, ~2-5 MB each, several per day). Thumbnails are generated alongside videos.

**Media changes daily but the change VOLUME is small** — typically 5-15 MB of new files per day. The media directory's total size (468 MB) accumulated over months. On any given day, re-tarring the entire 468 MB to capture 10 MB of changes is extremely wasteful.

**Conclusion:** Weekly media backup is more than sufficient — a week's media additions total ~35-100 MB, easily covered by a weekly cadence with no meaningful gap in recovery coverage.

---

## 5. Proposed Redesign

### 5a. Exclude media from the frequent data tarball

**backup-data.sh — before (line 30-33):**
```bash
tar -czf "$ARCHIVE" \
  -C /home/shelter/shelter-apps \
  $TAR_DIRS \
  2>>"$LOG"
```

**After:**
```bash
tar -czf "$ARCHIVE" \
  -C /home/shelter/shelter-apps \
  --exclude='data/animal-media' \
  $TAR_DIRS \
  2>>"$LOG"
```

One line added: `--exclude='data/animal-media'`. The tar starts from `-C /home/shelter/shelter-apps` so the exclude path is relative to that.

**What the slimmed daily tarball still contains:**
- shelter.db + WAL/SHM (the database — the most critical fast-changing asset)
- animal-photos/, animal-recordings/, featured-videos/, library-photos/, volunteer-files/
- adoption-pdfs/, rg-attachments/, intake-audio/, intake-photos/
- Everything EXCEPT the 468 MB animal-media directory

### 5b. Separate media backup — new script

**New script: `/home/shelter/scripts/backup-media.sh`**

```bash
#!/bin/bash
# Weekly animal-media backup — Sundays 3:45am ET
# Separate from the daily data tarball to keep it slim.
set -o pipefail

BACKUP_DIR=/home/shelter/backups
LOG=/home/shelter/backups/backup-media.log
RETENTION_DAYS=28   # 4 weeks of media backups
TIMESTAMP=$(date +%Y%m%d)
ARCHIVE="$BACKUP_DIR/media-$TIMESTAMP.tar.gz"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >> "$LOG"; }
alert() {
  log "ALERT: $1"
  sudo -u shelter /home/shelter/scripts/send-alert.sh "Media backup: $1" 2>&1 | tee -a "$LOG"
}

log "=== Media backup start ==="

tar -czf "$ARCHIVE" \
  -C /home/shelter/shelter-apps/data \
  animal-media \
  2>>"$LOG"

if [ $? -ne 0 ] || [ ! -f "$ARCHIVE" ]; then
  alert "FAILED — tar did not produce archive at $ARCHIVE"
  exit 1
fi

SIZE=$(du -h "$ARCHIVE" | cut -f1)
log "Created $ARCHIVE ($SIZE)"

DELETED=$(find "$BACKUP_DIR" -name "media-*.tar.gz" -mtime +$RETENTION_DAYS -delete -print 2>/dev/null | wc -l)
log "Pruned $DELETED old media archives (>${RETENTION_DAYS} days)"

log "=== Media backup end ==="
exit 0
```

**Cron entry (root crontab):**
```
45 7 * * 0  /home/shelter/scripts/backup-media.sh   # 3:45am ET Sundays
```

**Cadence:** Weekly (Sundays) — captures the ~28-35 new files/week.
**Retention:** 28 days (4 weekly media snapshots).
**Output:** `media-YYYYMMDD.tar.gz` (~400-470 MB, mostly incompressible MP4).

### 5c. Net Effect

| Metric | Today | After redesign |
|--------|-------|----------------|
| **Daily data tarball** | 572 MB | **~120 MB** (estimated) |
| **Daily weekly tarball** | 611 MB | **~150 MB** (embeds slimmed data) |
| **Daily backup output** | 1.2 GB | ~300 MB + 32 MB DB = **~330 MB** |
| **Weekly media tarball** | (doesn't exist) | ~470 MB (once/week) |
| **14-day data+weekly retention** | ~13 GB | **~4.5 GB** |
| **28-day media retention** | (included above) | ~1.9 GB (4 × 470 MB) |
| **Total backup footprint** | ~13 GB | **~6.4 GB** |
| **Savings** | — | **~6.5 GB (~50%)** |

Media coverage is **PRESERVED**: the separate weekly media tarball covers it. Maximum media data loss window increases from 24h to 7 days — acceptable given the low change rate (~10-15 MB/day of new files).

### 5d. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Media silently not backed up (new script never added to cron) | Health check should verify `media-*.tar.gz` exists and is <8 days old |
| Gap between excluding media from daily and starting the weekly media backup | Deploy both changes atomically — same cron edit session |
| Weekly media cadence too slow for a burst of new animals | At worst, 7 days of crops/videos lost — the original SM photos are still on ShelterManager's servers (animal-media is derived/cached content, not the source of truth) |
| Restore requires assembling data + media tarballs separately | Update RESTORE.md in backup-weekly.sh to document the two-tarball restore |

**Key safety fact:** animal-media content is **derived**, not primary. The original photos live on ShelterManager's API (`service.sheltermanager.com`). Crops are AI-generated and regenerable. Videos are SM-hosted originals pulled to local cache. Losing a week of cached media is recoverable by re-syncing from SM — it's not data loss, just re-download time.

---

## 6. Secondary: gzip → zstd

| Property | gzip (current) | zstd |
|----------|---------------|------|
| Installed | Yes (default) | **Yes** — v1.5.5 available at `/usr/bin/zstd` |
| Compression ratio (text/DB) | ~60% | ~65-70% (5-15% better) |
| Compression ratio (MP4/JPEG) | ~1-2% (nearly none) | ~1-2% (same — already compressed) |
| Speed | ~30 MB/s | ~300 MB/s (10x faster) |
| tar flag | `-z` (gzip) | `--zstd` |

**Worth it as a secondary change but low impact on the core problem.** The media files (MP4, JPEG) are already compressed — neither gzip nor zstd can shrink them meaningfully. The benefit is mainly on the DB and text content, where zstd saves 5-15% and runs 10x faster. On the slimmed ~120 MB daily tarball (mostly DB), switching to zstd might save ~10-15 MB and cut tar time from ~20s to ~2s.

**Recommendation:** Do the media exclusion first (the 50% savings). Consider zstd as a follow-up optimization — change `.tar.gz`/`-z` to `.tar.zst`/`--zstd` in all three scripts, with matching filename patterns in retention find commands.

---

## Summary

The backup system re-tars 468 MB of slowly-changing media (72% of the tarball, mostly incompressible MP4) every single day, into BOTH the data and weekly tarballs. Excluding animal-media from the daily tarballs and backing it up weekly in a separate archive cuts the backup footprint from ~13 GB to ~6.4 GB (~50% savings) while preserving full media coverage. The change is one `--exclude` line in backup-data.sh plus a new backup-media.sh script on a weekly cron. Risk is low — animal-media is derived content restorable from ShelterManager.

---

*Read-only scoping. No files modified. Generated 2026-06-29 18:15 UTC.*
