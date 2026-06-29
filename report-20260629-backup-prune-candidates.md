# Backup Prune Candidates (>60 Days) — 2026-06-29

## Summary

| Category | Count | Size |
|----------|-------|------|
| **>60 days (prune candidates)** | 150 items (134 files + 16 dirs) | **~208 MB** |
| **≤60 days (keepers)** | 17 items | ~274 MB |

**Key finding:** Zero pre-migration DB snapshots are in the >60-day group. ALL pre-migration `.db` files are from May 24 or later (within 60 days). The >60-day candidates are entirely **code/config backup files** from April 12–25: `.ts`, `.html`, `.js`, `.css` snapshots of server.ts, localDatabase.ts, dashboard, matcher, staging-staff, plus a few config/txt files and directory snapshots.

---

## >60-Day Prune Candidates (All April 2026)

### By type (134 files):

| Extension | Count | Description |
|-----------|-------|-------------|
| .ts | 34 | Server/localDatabase pre-change snapshots |
| .html | 33 | Dashboard/matcher/staging-staff index snapshots |
| .js | 30 | App/SW/matcher JS snapshots |
| .css | 16 | Styles snapshots |
| .json | 4 | OpenClaw config pre-change snapshots |
| .txt | 3 | Crontab/state listings |
| (no ext) | 12 | Caddyfile/emailService/env/sudoers pre-change |
| .md | 1 | contracts-pre-additions |
| .sh | 1 | staging-sync backup |

### Directories (16):

| Directory | Date | Contents |
|-----------|------|----------|
| animal-photos-pre-drop-20260425-212040 | Apr 25 | Photo backups |
| cb-retirement-20260425-195745 | Apr 25 | Clawdbot retirement archive |
| matcher-web-arrows-relocate-20260422-190149 | Apr 22 | Matcher snapshot |
| matcher-web-filter-overhaul-20260422-025453 | Apr 22 | Matcher snapshot |
| matcher-web-gallery-arrows-20260422-185525 | Apr 22 | Matcher snapshot |
| matcher-web-no-logos-20260422-212738 | Apr 22 | Matcher snapshot |
| matcher-web-sex-abbreviate-20260422-030312 | Apr 22 | Matcher snapshot |
| openclaw-agents-pre-sessions-reset-20260425-170843 | Apr 25 | OC agent data |
| rover-migration-20260425-155115 | Apr 25 | Rover migration |
| rover-migration-20260425-163222 | Apr 25 | Rover migration |
| server-src-jurisdiction-20260424-174055 | Apr 24 | Server source snapshot |
| staff-pwa-aspect-fix-20260422-151211 | Apr 22 | Staff PWA snapshot |
| staff-pwa-pre-adopter-sync-20260422-194624 | Apr 22 | Staff PWA snapshot |
| staff-pwa-pre-push-20260418-225530 | Apr 18 | Staff PWA snapshot |
| staging-staff-aspect-fix-20260422-151211 | Apr 22 | Staging snapshot |
| sudoers.d-pre-allowlist-20260425-172350 | Apr 25 | Sudoers snapshot |

### Date range: April 12 – April 25, 2026 (65–78 days old)

---

## ≤60-Day Keepers (17 items, retained)

| Date | File | Size |
|------|------|------|
| 2026-05-06 | staff-pwa-pre-cutover-20260506-235603.tar.gz | 120 KB |
| 2026-05-23 | shelter-secrets-pre-credential-swap-20260523-220811.json | 1 KB |
| 2026-05-24 | staff-pwa-app.js-pre-profiler-cutover-20260524-035135.bak | 146 KB |
| 2026-05-24 | staff-pwa-index.html-pre-profiler-cutover-20260524-035135.bak | 17 KB |
| 2026-05-24 | staff-pwa-sw.js-pre-profiler-cutover-20260524-035135.bak | 3 KB |
| 2026-05-25 | shelter.db.20260525-231837.pre-es-stories-delete.bak | 14 MB |
| 2026-05-28 | shelter.db.pre-adoption-pending-20260528-215350 | 14 MB |
| 2026-05-29 | shelter.db.pre-bonded-pair-20260529-183219 | 15 MB |
| 2026-06-14 | shelter-pre-last-source-20260614.db | 20 MB |
| 2026-06-15 | shelter.db.pre-adult-intake.20260615-185251 | 20 MB |
| 2026-06-15 | pre-source-columns.db | 21 MB |
| 2026-06-16 | pre-thumbnail-backfill.db | 21 MB |
| 2026-06-26 | pre-featured-rotation-20260626-033020.db | 29 MB |
| 2026-06-26 | pre-seed-insert-20260626-034323.db | 29 MB |
| 2026-06-26 | pre-intake-recipient-deactivate-20260626-161651.db | 30 MB |
| 2026-06-27 | pre-stale-draft-cleanup-20260627-201523.db | 30 MB |
| 2026-06-28 | pre-notif-archive-fix-20260628-162916.db | 31 MB |

---

## Sanity Check

**Are any >60-day candidates uniquely important?**

No. All >60-day items are code/config snapshots from April. The changes they pre-date have been stable for 2+ months. The code is fully version-controlled in git (every change has commits), so these file-level snapshots are a secondary safety net at best. The git history is the canonical record.

**Notable items to consider before bulk-pruning:**
- `cb-retirement-20260425-195745/` — Clawdbot retirement archive (178 MB). This is historical but also archived in `/home/shelter/backups/` as a tarball in the weekly backups. Safe to prune.
- `sudoers.d-pre-allowlist-20260425-172350` and `sudoers-pre-allowlist-20260425-172350` — security config snapshots. Low value 2+ months later since the allowlist is stable.
- `openclaw-agents-pre-sessions-reset-20260425-170843` — OC agent session data. Stale.

**None of the >60-day candidates is a DB snapshot.** The only DB-level recovery path is in the ≤60-day keepers, which are all retained.

---

## Removal Command (Do NOT Execute)

```bash
# Remove all >60-day ad-hoc backup files and directories
# (excludes daily rotation .db, tarballs, slot1fix, and logs)
find /home/shelter/backups/ -maxdepth 1 \( -type f -o -type d \) \
  ! -newermt "2026-04-30" \
  -not -name "weekly-*" -not -name "data-*" \
  -not -name "shelter-20*-*-*.db" \
  -not -name "shelter-backup-slot1fix*" \
  -not -name "*.log" -not -name "backups" \
  -exec rm -rf {} +

# Reclaims: ~208 MB
```

---

*Read-only diagnosis. No files modified. Generated 2026-06-29 15:09 UTC.*
