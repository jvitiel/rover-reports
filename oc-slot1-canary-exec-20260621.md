# Slot-1 Globe-Wins Canary Execution
**Date:** 2026-06-21 04:26:05 UTC
**Targets:** S2026454, A2023267 (canary — one LIBRARY, one STRIP)
**Scope:** strip_position column ONLY. No other columns or shelter_codes touched.

## S2026454

**Live WEBSITEMEDIAID:** 9476
**Current slot-1 row:** id=afe14e54-bbeb-4b1a-8f4c-e0363bfd4f05, source=sm-sync, source_media_id=8993
**Globe row:** id=c7ead0d7-1b3d-4e31-abf5-314fb9407e6d, current strip_position=0, source_media_id=9476
**Swap type:** LIBRARY (globe 0→1, slot-1 1→0)
**In-scope reconfirmed:** ✅ (slot-1 source=sm-sync, slot-1 smid=8993 != wmid=9476, globe row exists)

**Assertions:** ✅ All passed (exactly 1 row at pos 1 = globe, no strip duplicates, demoted at N)
**Transaction:** COMMITTED

### Post-swap strip

| position | media_id (DB) | source_media_id | source | file_url |
|---|---|---|---|---|
| 1 | c7ead0d7-1b3d-4e31-abf5-314fb9407e6d | 9476 | sm-sync | https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&... |

**Position 1 file_url:** `https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&mediaid=9476&ts=1781889914.0`
**Position 1 source_media_id:** 9476

## A2023267

**Live WEBSITEMEDIAID:** 7614
**Current slot-1 row:** id=9712b1c2-b9d5-405d-a399-3cb6f8de00b2, source=sm, source_media_id=899
**Globe row:** id=b2ded1e3-9416-4e17-a913-bd06cd1ca8fb, current strip_position=3, source_media_id=7614
**Swap type:** STRIP (globe 3→1, slot-1 1→3)
**In-scope reconfirmed:** ✅ (slot-1 source=sm, slot-1 smid=899 != wmid=7614, globe row exists)

**Assertions:** ✅ All passed (exactly 1 row at pos 1 = globe, no strip duplicates, demoted at N)
**Transaction:** COMMITTED

### Post-swap strip

| position | media_id (DB) | source_media_id | source | file_url |
|---|---|---|---|---|
| 1 | b2ded1e3-9416-4e17-a913-bd06cd1ca8fb | 7614 | sm | https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&... |
| 2 | a83cfdbc-6e16-414c-bfc9-bb1a2752bef4 | 1789 | sm | https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&... |
| 3 | 9712b1c2-b9d5-405d-a399-3cb6f8de00b2 | 899 | sm | https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&... |
| 4 | f36608aa-2ec6-43dd-9fbd-39d3bbc285d1 | 7858 | sm | https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&... |
| 5 | d3b0b297-710b-4848-9899-68be10410bf9 | 8 | sm | https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&... |
| 6 | dbb19db2-637a-43c3-aaf6-25c142048a9e | 3084 | sm | https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&... |

**Position 1 file_url:** `https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&mediaid=7614&ts=1765656961.0`
**Position 1 source_media_id:** 7614

## Matcher End-to-End Check (S2026454)

**S2026454 served photoUrl:** `https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&mediaid=9476&ts=1781889914.0`
**Contains mediaid 9476:** ✅ Yes — matcher is serving the correct globe photo

## Verification
- Only shelter_codes written: S2026454, A2023267
- Only column modified: strip_position
- Backup verified at: /home/shelter/shelter-apps/data/shelter-backup-slot1fix-20260621.db (28.8 MB)
