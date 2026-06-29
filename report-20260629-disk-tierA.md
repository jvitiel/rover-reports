# Disk Cleanup — Tier A (Rover-Owned Caches) — 2026-06-29

## Scope

Tier A only: rover's pip and npm caches. No backups, no app files, no DB files, no system packages touched.

## Results

| Cache | Before | After | Reclaimed |
|-------|--------|-------|-----------|
| ~/.cache/pip | 2.8 GB | 1.9 MB | **~2.8 GB** |
| ~/.npm | 254 MB | 175 MB | **~79 MB** |

Note: npm cache clean --force removed cached tarballs but npm retains some index/metadata (~175 MB in _npx). This is expected.

## Disk Before/After

| Metric | Before | After |
|--------|--------|-------|
| Used | 44 GB | 41 GB |
| Free | 31 GB | 34 GB |
| Usage % | 59% | **55%** |

Total reclaimed: ~2.9 GB. No errors.

## What was NOT touched

- /home/shelter/backups/ (Tier B)
- /usr/lib/node_modules/clawdbot/ (Tier B)
- /opt/crop-venv/ (Tier C)
- /home/rover/.local/lib/ (Tier C — torch)
- Any .db file
- Any shelter-app file

---

*Generated 2026-06-29 14:14 UTC.*
