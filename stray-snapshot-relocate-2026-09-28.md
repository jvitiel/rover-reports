# Stray DB Snapshot Relocation — 2026-09-28

## Before (in /home/shelter/shelter-apps/data/)

```
-rw-r--r-- 1 root shelter 75239424 Sep 24 16:46 shelter.db.bak-2026-09-24-datenorm
-rw-r--r-- 1 root shelter 75272192 Sep 24 18:28 shelter.db.bak-2026-09-24-availbackfill
```

## After (in /home/shelter/backups/pre-migration/)

```
-rw-r--r-- 1 root shelter 75239424 Sep 24 16:46 shelter.db.bak-2026-09-24-datenorm
-rw-r--r-- 1 root shelter 75272192 Sep 24 18:28 shelter.db.bak-2026-09-24-availbackfill
```

Sizes and timestamps preserved (mv, not cp).

## Verification

**data/ has no stray .bak files:**
```
$ ls /home/shelter/shelter-apps/data/shelter.db.bak-*
ls: cannot access '/home/shelter/shelter-apps/data/shelter.db.bak-*': No such file or directory
```

**shelter.db intact:**
```
-rw-r--r-- 1 shelter shelter 77627392 Sep 28 04:00 /home/shelter/shelter-apps/data/shelter.db
```

Same owner (shelter:shelter), same size (77627392), same timestamp (Sep 28 04:00) as before the move. Not touched.

## [VERIFIED]

Both snapshot files relocated to `/home/shelter/backups/pre-migration/` per rule 14. No files deleted. No copies left behind. `shelter.db` untouched.
