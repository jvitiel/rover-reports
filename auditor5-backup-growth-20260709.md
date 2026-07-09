# Auditor 5 — Backup Growth Diagnosis — 2026-07-09

**Date:** 2026-07-09 19:20 UTC
**Author:** Rover (automated, read-only)

---

## 1. WHAT EACH SCRIPT ARCHIVES

### backup-data.sh

**Includes** (relative to `/home/shelter/shelter-apps`):
- `data/` (EXCLUDING `data/animal-media/`)
- `adoption-pdfs/`
- `rg-attachments/`
- `intake-audio/` (if exists)
- `intake-photos/` (if exists)

**Excludes:**
- `--exclude='data/animal-media'`

```
tar -czf "$ARCHIVE" \
  -C /home/shelter/shelter-apps \
  --exclude='data/animal-media' \
  $TAR_DIRS
```

[VERIFIED — full script source inspected]

### backup-media.sh

**Includes** (relative to `/home/shelter/shelter-apps/data`):
- `animal-media/` (the entire directory)

**Excludes:** nothing.

```
tar -czf "$ARCHIVE" \
  -C /home/shelter/shelter-apps/data \
  animal-media
```

[VERIFIED — full script source inspected]

---

## 2. TOP CONTENTS — OLD vs NEW DATA TARBALLS

### data-20260705-031501.tar.gz — Top 25 files by size

```
$ tar -tvzf /home/shelter/backups/data-20260705-031501.tar.gz | awk '{print $3, $6}' | sort -rn | head -25 ; echo "exit=$?"
35729408 data/shelter.db
4311415 data/featured-videos/mildred_vid.mp4
4124152 data/shelter.db-wal
2785922 data/featured-videos/aspen_vid.mp4
2494314 data/featured-videos/zelda_vid.mp4
2123317 data/featured-videos/yoko_vid.mp4
1753596 data/volunteer-files/552c5c8c-2169-45db-ae26-00ffea0a964e/page-1.png
1138387 data/animal-recordings/S2026073/1776953240932_staff_Lily.webm
1017305 data/library-photos/S20241099/S20241099-library-1779210149868-39660a.jpg
1017305 data/library-photos/S20241099/S20241099-library-1779209851739-83bf47.jpg
901989 data/animal-recordings/A2024047/1776522186214_staff_Mia.webm
860833 data/animal-recordings/W2026034/1777556311420_staff_Lily.webm
835762 data/library-photos/A2026067/A2026067-library-1779497653849-778189.jpg
793854 data/library-photos/S2023445/S2023445-library-1782404621359-4da83d.jpg
764789 data/animal-recordings/S2026237/1777126182405_staff_Calista.webm
763294 data/animal-recordings/S2026073/1776348386085_staff_Lily.webm
721054 data/volunteer-files/552c5c8c-2169-45db-ae26-00ffea0a964e/upload-0.pdf
715657 data/animal-recordings/S2026266/1777121193209_staff_Taylor.webm
686369 data/library-photos/B2026006/B2026006-library-1782243813092-7e9ad1.jpg
657365 data/animal-recordings/S2026087/1776804455211_staff_Rachel_u.webm
653377 data/library-photos/A2026051/A2026051-library-1776522570930-e46128.jpg
651639 data/library-photos/A2025234/A2025234-library-1778713741047-46cf38.jpg
624991 data/library-photos/W2026014/W2026014-library-1778180178593-b0aebf.jpg
620993 data/library-photos/A2026067/A2026067-library-1779497672529-eff7e5.jpg
595071 data/library-photos/S2026643/S2026643-library-1782616823682-60b516.jpg
exit=0
```

### data-20260709-031501.tar.gz — Top 25 files by size

```
$ tar -tvzf /home/shelter/backups/data-20260709-031501.tar.gz | awk '{print $3, $6}' | sort -rn | head -25 ; echo "exit=$?"
37412864 data/shelter.db
36900864 data/shelter.db.pre-rg-drop-backup
36556800 data/shelter.db.pre-stories-backfill-backup
36556800 data/shelter.db.pre-es-migration-backup
36556800 data/shelter.db.pre-es-backfill-backup
4536152 data/shelter.db-wal
4311415 data/featured-videos/mildred_vid.mp4
2785922 data/featured-videos/aspen_vid.mp4
2494314 data/featured-videos/zelda_vid.mp4
2123317 data/featured-videos/yoko_vid.mp4
1985215 data/volunteer-files/d33a2eb8-1929-4d01-b5d8-328f4f52208c/page-04.png.bak-rotate
1985215 data/volunteer-files/d33a2eb8-1929-4d01-b5d8-328f4f52208c/page-04.png
1753596 data/volunteer-files/552c5c8c-2169-45db-ae26-00ffea0a964e/page-1.png
1138387 data/animal-recordings/S2026073/1776953240932_staff_Lily.webm
1017305 data/library-photos/S20241099/S20241099-library-1779210149868-39660a.jpg
1017305 data/library-photos/S20241099/S20241099-library-1779209851739-83bf47.jpg
901989 data/animal-recordings/A2024047/1776522186214_staff_Mia.webm
860833 data/animal-recordings/W2026034/1777556311420_staff_Lily.webm
835762 data/library-photos/A2026067/A2026067-library-1779497653849-778189.jpg
793854 data/library-photos/S2023445/S2023445-library-1782404621359-4da83d.jpg
764789 data/animal-recordings/S2026237/1777126182405_staff_Calista.webm
763294 data/animal-recordings/S2026073/1776348386085_staff_Lily.webm
721054 data/volunteer-files/552c5c8c-2169-45db-ae26-00ffea0a964e/upload-0.pdf
715657 data/animal-recordings/S2026266/1777121193209_staff_Taylor.webm
686369 data/library-photos/B2026006/B2026006-library-1782243813092-7e9ad1.jpg
exit=0
```

### Bytes by top-level directory — Jul 5

```
$ tar -tvzf /home/shelter/backups/data-20260705-031501.tar.gz | awk '{split($6,p,"/"); s[p[1]"/"p[2]]+=$3} END {for (k in s) printf "%15d %s\n", s[k], k}' | sort -rn ; echo "exit=$?"
       68341854 data/volunteer-files
       35729408 data/shelter.db
       35408899 data/animal-recordings
       23062453 data/library-photos
       14240056 data/animal-photos
       11714968 data/featured-videos
        4124152 data/shelter.db-wal
         436565 rg-attachments/3
         432431 intake-audio/15
         309446 adoption-pdfs/blank-english.pdf
         256027 intake-photos/15
         220906 adoption-pdfs/volunteer-application.pdf
         (... smaller entries omitted, full listing in Item 2 data above ...)
          32768 data/shelter.db-shm
exit=0
```

### Bytes by top-level directory — Jul 9

```
$ tar -tvzf /home/shelter/backups/data-20260709-031501.tar.gz | awk '{split($6,p,"/"); s[p[1]"/"p[2]]+=$3} END {for (k in s) printf "%15d %s\n", s[k], k}' | sort -rn ; echo "exit=$?"
       75856140 data/volunteer-files
       38129521 data/animal-recordings
       37412864 data/shelter.db
       36900864 data/shelter.db.pre-rg-drop-backup
       36556800 data/shelter.db.pre-stories-backfill-backup
       36556800 data/shelter.db.pre-es-migration-backup
       36556800 data/shelter.db.pre-es-backfill-backup
       23062453 data/library-photos
       14240056 data/animal-photos
       11714968 data/featured-videos
        4536152 data/shelter.db-wal
         436565 rg-attachments/3
         432431 intake-audio/15
         309446 adoption-pdfs/blank-english.pdf
         (... smaller entries omitted ...)
          32768 data/shelter.db-shm
exit=0
```

### Delta arithmetic

| Component | Jul 5 (bytes) | Jul 9 (bytes) | Delta (bytes) | Delta (MB) |
|-----------|--------------|--------------|---------------|------------|
| **Total tarball (uncompressed)** | 197,492,819 | 356,906,740 | **159,413,921** | **152.1** |
| shelter.db.pre-es-backfill-backup | 0 | 36,556,800 | 36,556,800 | 34.9 |
| shelter.db.pre-es-migration-backup | 0 | 36,556,800 | 36,556,800 | 34.9 |
| shelter.db.pre-stories-backfill-backup | 0 | 36,556,800 | 36,556,800 | 34.9 |
| shelter.db.pre-rg-drop-backup | 0 | 36,900,864 | 36,900,864 | 35.2 |
| **Subtotal: 4 pre-*-backup DB files** | **0** | **146,571,264** | **146,571,264** | **139.8** |
| data/volunteer-files | 68,341,854 | 75,856,140 | 7,514,286 | 7.2 |
| data/animal-recordings | 35,408,899 | 38,129,521 | 2,720,622 | 2.6 |
| data/shelter.db | 35,729,408 | 37,412,864 | 1,683,456 | 1.6 |
| data/shelter.db-wal | 4,124,152 | 4,536,152 | 412,000 | 0.4 |
| **Subtotal: organic growth** | — | — | **12,330,364** | **11.8** |
| **Accounted total** | — | — | **158,901,628** | **151.6** |

The 4 pre-*-backup DB files account for 146.6 MB of the 152.1 MB uncompressed delta (96.4%). Organic growth (volunteer-files, animal-recordings, shelter.db, WAL) accounts for the remaining 11.8 MB. [VERIFIED — arithmetic from tarball listings]

---

## 3. OVERLAP CHECK

### Newest media tarball

```
$ ls -la --time-style=full-iso /home/shelter/backups/media-*.tar.gz | tail -5 ; echo "exit=$?"
-rw-rw-r-- 1 shelter shelter 487489208 2026-06-29 19:46:18.674539638 +0000 media-20260629.tar.gz
-rw-r--r-- 1 root    root    501903386 2026-07-05 03:45:18.296550272 +0000 media-20260705.tar.gz
exit=0
```

Newest: `/home/shelter/backups/media-20260705.tar.gz` [VERIFIED]

### Top-level paths in media tarball

```
$ tar -tzf /home/shelter/backups/media-20260705.tar.gz | cut -d/ -f1-3 | sort -u | head -20 ; echo "exit=$?"
animal-media/
animal-media/crops/
animal-media/crops/A2023030-8732.jpg
animal-media/crops/A2023124-1056.jpg
(... crops, thumbnails, videos ...)
exit=0
```

Media tarball root path: `animal-media/` (relative to `/home/shelter/shelter-apps/data/`).

### Overlap analysis

| Script | Base path | Includes | Excludes |
|--------|-----------|----------|----------|
| backup-data.sh | `-C /home/shelter/shelter-apps` | `data/` + others | `data/animal-media` |
| backup-media.sh | `-C /home/shelter/shelter-apps/data` | `animal-media/` | nothing |

backup-data.sh archives `data/` with `--exclude='data/animal-media'`.
backup-media.sh archives `animal-media/` from inside `data/`.

**The `data/animal-media` directory is excluded from backup-data.sh and is the sole content of backup-media.sh. No path is archived by both scripts.** [VERIFIED — confirmed by exclude flag in backup-data.sh and tarball contents showing no `animal-media` entries in data tarballs]

---

## 4. GROK OUTPUT SIZE

```
$ find /home/shelter/shelter-apps/data -type d -name 'grok_imagine' ; echo "exit=$?"
exit=1
```

**No `grok_imagine` directory exists on disk.** [VERIFIED]

The `animal-media/` directory contains three subdirectories:

```
$ ls -la /home/shelter/shelter-apps/data/animal-media/ ; echo "exit=$?"
drwxrwsr-x 2 shelter shelter 36864 Jul  9 06:00 crops
drwxrwsr-x 2 shelter shelter 24576 Jul  1 15:27 thumbnails
drwxrwsr-x 2 shelter shelter 12288 Jul  1 15:27 videos
exit=0
```

```
$ du -sh /home/shelter/shelter-apps/data/animal-media/*/ ; echo "exit=$?"
91M   crops/
8.1M  thumbnails/
392M  videos/
exit=0
```

The backup-media.sh header comment references "grok_imagine videos (385MB)" — this likely refers to the `videos/` subdirectory (392MB). But this directory is excluded from backup-data.sh via `--exclude='data/animal-media'` and therefore is NOT a factor in the data tarball growth. [VERIFIED — `grok_imagine` is not a directory name on disk; `videos/` is the likely referent; neither is in data tarballs]

---

## 5. DISK HEADROOM

```
$ df -h /home ; echo "exit=$?"
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda         79G   32G   43G  43% /
exit=0
```

```
$ du -sh /home/shelter/backups ; echo "exit=$?"
9.1G  /home/shelter/backups
exit=0
```

[VERIFIED]

---

*Report generated read-only. No backup files were modified, extracted, or deleted.*
