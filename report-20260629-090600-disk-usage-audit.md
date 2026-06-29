# Disk Usage Audit — 2026-06-29

## 1. Overall Disk State

```
Filesystem   Size   Used   Avail   Use%
/dev/sda      79G    46G     29G    62%
```

The climb from 32% (Jun 8) to 62% (Jun 29) represents approximately **24 GB of growth** in 21 days (~1.1 GB/day).

## 2. Top-Level Breakdown

| Path | Size | Notes |
|------|------|-------|
| /home | 25G | Shelter backups + Rover Python/OC data |
| /usr | 6.5G | Includes 1.2G legacy clawdbot node_modules |
| /opt | 5.8G | crop-venv (5.4G) |
| /var | 3.6G | Mostly journald (2.9G) |
| /tmp | 139M | Minimal |
| /boot | 200M | Normal |

## 3. Detailed Consumer Analysis

### 3a. /home/shelter/backups/ — 13 GB (THE #1 CONSUMER)

This is the prime suspect and accounts for more than half the growth.

| Category | Count | Total Size |
|----------|-------|------------|
| Weekly tarballs (weekly-YYYYMMDD.tar.gz) | 15 | 6.2 GB |
| Data tarballs (data-YYYYMMDD.tar.gz) | 15 | 5.7 GB |
| Daily DB snapshots (shelter-YYYY-MM-DD.db) | 15 | 390 MB |
| slot1fix DB snapshots | 8 | 220 MB |
| Pre-migration/change DB snapshots | 11 | 261 MB |
| Code/HTML/CSS/JS backup files | 118 | 19 MB |
| Misc (dirs, logs, configs) | ~20 | ~200 MB |

**Critical finding: the tarballs are growing rapidly.** Each weekly tarball has nearly doubled in size over the month:
- Jun 15: 333 MB → Jun 22: 430 MB → Jun 29: 611 MB

Each data tarball similarly:
- Jun 15: 305 MB → Jun 22: 394 MB → Jun 29: 572 MB

This means even with 14-day rotation working correctly (15 files present = correct), the total backup footprint still grows because each new backup is larger than the one it replaces. The growth is driven by animal_media/photos accumulating in the app data directory (654 MB in shelter-apps/data/).

**slot1fix snapshots:** 8 copies of a ~28 MB DB, created daily since Jun 21 — these appear to be from a buggy/duplicate backup script entry that keeps writing `shelter-backup-slot1fix-20260621-YYYY-MM-DD.db` with a fixed prefix. These accumulate without pruning (220 MB, growing 28 MB/day).

**Pre-migration snapshots:** 11 files totaling 261 MB from various schema changes (May–Jun). These are never pruned — they just accumulate.

### 3b. /home/rover/ — 9.8 GB

| Component | Size | Notes |
|-----------|------|-------|
| .local/lib (Python packages) | 5.3 GB | PyTorch, etc. — installed for crop/ML work |
| .cache/pip | 2.8 GB | Pip download cache — safely clearable |
| .cache/ms-playwright | 622 MB | Browser binaries — needed if playwright used |
| .openclaw-rover/agents | 295 MB | OC agent data |
| .openclaw-rover/browser | 283 MB | OC browser data |
| .openclaw-rover/memory | 108 MB | OC session memory |
| rover-reports-repo | 176 MB | Reports + git history |
| rover-reports-screenshots-repo | 89 MB | Screenshots repo |
| .npm | 254 MB | NPM cache |

### 3c. /opt/crop-venv/ — 5.4 GB

A Python virtual environment for the image crop service. Contains PyTorch + Triton (libtriton.so alone is 441 MB). This is a **duplicate** of much of what's in /home/rover/.local/lib — both contain torch/triton.

### 3d. /usr/lib/node_modules/clawdbot/ — 1.2 GB

Legacy clawdbot installation. Service is stopped and disabled since Apr 25. The node_modules include a 426 MB CUDA library (`libggml-cuda.so`).

### 3e. /var/log + journald — 3.6 GB

Journald alone: 2.9 GB. No individual log file over 50 MB found outside of backups.

### 3f. /home/shelter/shelter-apps/ — 1.3 GB

| Component | Size |
|-----------|------|
| data/ (DB + media) | 654 MB |
| server/ (source + dist) | 332 MB |
| .git | 290 MB |

This is legitimate app content.

### 3g. /home/shelter/rover-reports/ — 103 MB

Includes 30 MB of screenshots. Auto-pruned after 7 days. Not a concern.

## 4. Growth Attribution

### GB breakdown of the ~24 GB growth (32% → 62%):

| Category | Est. GB | Type |
|----------|---------|------|
| Backup tarball growth (each backup larger + 15 days retained) | ~6–8 GB | **Creep** (structural — tarballs grow as media grows) |
| slot1fix duplicate DB backups (since Jun 21) | 0.2 GB | **Creep** (bug — no pruning) |
| Pre-migration snapshots never pruned | 0.3 GB | **Creep** |
| Rover Python libs + pip cache + playwright | ~8 GB | **One-time install** (Jun 21 dates suggest recent) |
| crop-venv (/opt) | ~5.4 GB | **One-time install** (Jun 22) |
| Journald log growth | ~1–2 GB | **Creep** (unbounded) |
| Legitimate app/DB/media growth | ~1–2 GB | **Legitimate** |

## 5. Verdict

**The 32% → 62% climb is overwhelmingly CREEP, not legitimate app growth.**

The actual shelter app + database grew modestly (~1–2 GB). The remaining ~22 GB comes from:

1. **Backup tarballs (13 GB total, ~6–8 GB of growth):** The backups include animal photos/media, which are growing. Each new daily backup is larger than the previous. With 15 days of weekly + data tarballs retained, the backup dir now dwarfs the actual app. The rotation is working (old ones get pruned) but total footprint grows because individual backups grow.

2. **Python/ML toolchain (8+ GB):** PyTorch installed in TWO places — /home/rover/.local/lib AND /opt/crop-venv. Plus 2.8 GB of pip cache. These were installed around Jun 21–22 for image cropping.

3. **Legacy clawdbot (1.2 GB):** Dead weight since Apr 25.

4. **Journald (2.9 GB):** Unbounded, never vacuumed.

### Reclaimable Space (safe, no data loss):

| Action | Reclaimable |
|--------|-------------|
| Clear pip cache (`pip cache purge`) | ~2.8 GB |
| Remove legacy clawdbot (`/usr/lib/node_modules/clawdbot/`) | ~1.2 GB |
| Vacuum journald (e.g., retain 500 MB) | ~2.4 GB |
| Remove slot1fix duplicate DB series (8 files) | 220 MB |
| Remove pre-migration DB snapshots older than 60 days (Apr files) | ~150 MB |
| Deduplicate Python/torch (pick one of rover/.local or crop-venv) | ~5 GB |

**Total safely reclaimable: ~11–12 GB** (would drop from 62% back to ~47%).

### Structural fix needed:

The backup tarballs will keep growing as media accumulates. Options:
- Exclude animal_media from weekly/data tarballs (back it up separately, less frequently)
- Reduce retention from 14 days to 7 days
- Compress with zstd instead of gzip for better ratios

### Unexpected findings:

- **slot1fix backup loop:** A backup entry with prefix `shelter-backup-slot1fix-20260621` is writing a new ~28 MB DB copy every day without pruning. Looks like a one-time debug backup that accidentally stayed in the cron rotation.
- **Duplicate PyTorch:** Two full torch installations (5.3 GB + 5.4 GB). The crop-venv is the intended one; the rover .local copy may be leftover from an earlier pip install.

---

*Report generated 2026-06-29 09:06 UTC. Read-only — no changes made.*
