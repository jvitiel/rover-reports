# Slot-1 Fix Manifest — Globe-Always-Wins — 2026-06-21

**Read-only manifest. Zero writes made. All data from read-only DB queries + SM API.**

## Summary

| Bucket | Description | Count |
|--------|-------------|-------|
| A | Already correct | 303 |
| B | Needs swap, target present in DB | 157 |
| C | Needs swap, target missing from DB | 15 |
| D | No WEBSITEMEDIAID / not in SM feed | 246 |
| **Total SM animals with WEBSITEMEDIAID** | | **475** |
| A + B + C | | 475 |

Bucket B breakdown:
- Non-SM photos being displaced (manual choices): **5**
- Target photo from library (pos=0): **136**
- Target photo from strip pos 2–6 (multi-slot move): **21**
- No current slot-1 (fresh fill): **0**

### Reconciliation with Prior Diagnosis

Prior diagnosis reported 158 mismatches. This manifest reports B=157, C=15 (total 172).
- **B vs prior 158**: Delta of −1. The prior query counted all slot-1 rows with `source_media_id ≠ WEBSITEMEDIAID` directly. One animal likely changed SM preference between the two API fetches (minutes apart). [INFERRED — timing delta]
- **C (15 animals)**: These were not counted in the prior diagnosis because they have no slot-1 row at all — the prior query only examined existing slot-1 rows. These are newly added SM animals whose photos haven't synced yet.

---

## Bucket A — Already Correct (303 animals)

These animals have slot-1 `source_media_id` matching SM's `WEBSITEMEDIAID`. No action needed.

<details><summary>Click to expand shelter_code list</summary>

- A2023278
- A2023287
- A2023301
- A2024047
- A2024053
- A2024185
- A2025018
- A2025063
- A2025088
- A2025100
- A2025111
- A2025114
- A2025141
- A2025203
- A2025211
- A2025234
- A2026040
- A2026059
- A2026071
- A2026089
- A2026092
- A2026097
- A2026101
- A2026104
- A2026105
- B2026001
- B2026002
- B2026003
- B2026004
- B2026005
- B2026006
- B2026010
- B2026011
- B2026012
- C2023029
- G2026002
- R2023007
- R2023065
- R2023066
- R2024016
- R2024025
- R2024035
- R2025003
- R2025005
- R2025037
- R2025039
- R2025046
- R2025054
- R2026003
- R2026005
- R2026007
- R2026008
- R2026009
- S2023297
- S2023445
- S2024005
- S20241035
- S20241099
- S20241161
- S2024265
- S2024694
- S20251050
- S20251200
- S20251236
- S2025131
- S2025189
- S2025206
- S2025231
- S2025310
- S2025503
- S2025546
- S2025639
- S2025877
- S2025951
- S2025956
- S2025966
- S2026014
- S2026043
- S2026047
- S2026079
- S2026081
- S2026092
- S2026093
- S2026102
- S2026106
- S2026112
- S2026131
- S2026145
- S2026146
- S2026147
- S2026148
- S2026149
- S2026153
- S2026154
- S2026162
- S2026166
- S2026177
- S2026180
- S2026190
- S2026191
- S2026209
- S2026225
- S2026226
- S2026237
- S2026238
- S2026239
- S2026240
- S2026244
- S2026247
- S2026267
- S2026268
- S2026277
- S2026278
- S2026279
- S2026280
- S2026282
- S2026290
- S2026298
- S2026299
- S2026301
- S2026314
- S2026341
- S2026342
- S2026343
- S2026344
- S2026345
- S2026369
- S2026370
- S2026373
- S2026377
- S2026378
- S2026379
- S2026380
- S2026381
- S2026382
- S2026383
- S2026384
- S2026389
- S2026391
- S2026399
- S2026400
- S2026403
- S2026407
- S2026412
- S2026419
- S2026422
- S2026423
- S2026424
- S2026425
- S2026426
- S2026427
- S2026428
- S2026429
- S2026430
- S2026431
- S2026438
- S2026439
- S2026442
- S2026444
- S2026446
- S2026458
- S2026463
- S2026464
- S2026466
- S2026469
- S2026470
- S2026471
- S2026472
- S2026473
- S2026474
- S2026476
- S2026477
- S2026478
- S2026479
- S2026480
- S2026481
- S2026482
- S2026487
- S2026488
- S2026489
- S2026490
- S2026491
- S2026493
- S2026494
- S2026497
- S2026498
- S2026504
- S2026512
- S2026513
- S2026518
- S2026519
- S2026520
- S2026521
- S2026522
- S2026523
- S2026524
- S2026525
- S2026526
- S2026527
- S2026528
- S2026529
- S2026530
- S2026531
- S2026532
- S2026533
- S2026534
- S2026535
- S2026536
- S2026537
- S2026538
- S2026544
- S2026545
- S2026546
- S2026547
- S2026548
- S2026549
- S2026550
- S2026551
- S2026552
- S2026553
- S2026554
- S2026555
- S2026556
- S2026557
- S2026558
- S2026559
- S2026561
- S2026564
- S2026566
- S2026567
- S2026568
- S2026569
- S2026571
- S2026572
- S2026573
- S2026574
- S2026578
- S2026597
- S2026598
- S2026599
- S2026600
- S2026604
- S2026605
- S2026608
- S2026609
- S2026610
- S2026612
- S2026616
- S2026617
- S2026618
- S2026619
- S2026620
- S2026621
- S2026622
- S2026623
- S2026624
- S2026625
- S2026626
- S2026627
- S2026628
- S2026629
- S2026630
- S2026631
- S2026633
- S2026634
- S2026635
- S2026636
- S2026639
- S2026640
- S2026641
- S2026642
- S2026645
- S2026647
- S2026654
- S2026655
- S2026656
- S2026658
- S2026659
- S2026660
- S2026664
- S2026665
- S2026666
- S2026667
- W2026014
- W2026042
- W2026049
- W2026055
- W2026056
- W2026058
- W2026060
- W2026061
- W2026062
- W2026064
- W2026065
- W2026066
- W2026067
- W2026068
- W2026069
- W2026071
- W2026072
- W2026073
- W2026074
- W2026075

</details>

---

## Bucket B — Needs Swap, Target Present (157 animals)

[VERIFIED — all data from read-only sqlite3 queries + SM API `json_shelter_animals` response]

### ⚠️ Non-SM Photos Being Displaced (5 animals)

These animals have a non-SM photo (dashboard-upload, activity, etc.) in slot 1 that would be displaced by the globe-always-wins rule. **Review these for intentional manual overrides.**

| shelter_code | current slot-1 source | current mediaid | target mediaid | operation |
|-------------|----------------------|-----------------|----------------|-----------|
| A2026061 | activity | none | 8534 | demote 18e94f84… from pos1→library; promote 0adcb92f… from library→pos1 |
| S20251008 | dashboard-upload | none | 8637 | demote 76d8f12f… from pos1→library; promote a0388408… from library→pos1 |
| S2025963 | activity | none | 5813 | demote 3beeab32… from pos1→library; move ee17f3f7… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| S2026028 | activity | none | 7818 | demote bd2cb064… from pos1→library; move 7207f1df… from pos4→pos1 (cascade: pos1 gap filled by shift) |
| S2026078 | activity | none | 8055 | demote a487b2aa… from pos1→library; move 166394ff… from pos2→pos1 (cascade: pos1 gap filled by shift) |

### Multi-Slot Moves (21 animals)

These animals have the target globe photo already on the strip (pos 2–6). The fix would move it to pos 1 and cascade.

| shelter_code | current slot-1 mediaid | target mediaid | target current pos | operation |
|-------------|----------------------|----------------|-------------------|-----------|
| A2023267 | 899 | 7614 | 3 | demote 9712b1c2… from pos1→library; move b2ded1e3… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| A2024048 | 8484 | 7852 | 2 | demote 772279ee… from pos1→library; move 7daa41e6… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| A2025167 | 6492 | 6949 | 2 | demote 43286eef… from pos1→library; move b8d2d4d5… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| A2026036 | 8147 | 8339 | 2 | demote 346b4d64… from pos1→library; move a44a4734… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| A2026048 | 8294 | 8366 | 2 | demote a7f37096… from pos1→library; move 8a1678fc… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| R2024018 | 3076 | 5587 | 3 | demote a79f4dd6… from pos1→library; move 8e269dc0… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| R2025053 | 7727 | 8070 | 3 | demote d6930c8b… from pos1→library; move 9003ea74… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| S2024718 | 2888 | 4524 | 3 | demote f6f73589… from pos1→library; move 1cdfd210… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| S2025833 | 7149 | 7147 | 2 | demote 5b653bd6… from pos1→library; move 10eae58a… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| S2025961 | 7209 | 8570 | 3 | demote 4fe05926… from pos1→library; move f59759a9… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| S2025963 | none | 5813 | 2 | demote 3beeab32… from pos1→library; move ee17f3f7… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| S2026028 | none | 7818 | 4 | demote bd2cb064… from pos1→library; move 7207f1df… from pos4→pos1 (cascade: pos1 gap filled by shift) |
| S2026045 | 8479 | 8478 | 2 | demote 83dec2d0… from pos1→library; move 4857c794… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| S2026078 | none | 8055 | 2 | demote a487b2aa… from pos1→library; move 166394ff… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| S2026126 | 8476 | 8608 | 5 | demote 0dda1508… from pos1→library; move a69e9861… from pos5→pos1 (cascade: pos1 gap filled by shift) |
| S2026133 | 8185 | 8183 | 3 | demote 0111643c… from pos1→library; move 6d7df471… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| S2026134 | 8392 | 8393 | 6 | demote b3c30c8a… from pos1→library; move e09277bd… from pos6→pos1 (cascade: pos1 gap filled by shift) |
| S2026144 | none | 8316 | 2 | demote a0bbc5b5… from pos1→library; move fa7785a3… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| S2026155 | 8344 | 8352 | 2 | demote ccf8ad74… from pos1→library; move 74f87163… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| S2026276 | 9009 | 9047 | 3 | demote 31c30f8c… from pos1→library; move f6455a27… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| S2026320 | 8667 | 8986 | 6 | demote ba4d8c60… from pos1→library; move f737f36a… from pos6→pos1 (cascade: pos1 gap filled by shift) |

### Full Bucket B Manifest

| # | shelter_code | cur_slot1_id | cur_mediaid | cur_source | target_id | target_mediaid | target_source | target_pos | file_url? | non-SM? | operation |
|---|-------------|-------------|-------------|------------|-----------|---------------|---------------|------------|-----------|---------|-----------|
| 1 | A2023030 | 7c313fb8-587… | 7947 | sm | ab4ee52f-7f0… | 8732 | sm-sync | 0 | Y | N | demote 7c313fb8… from pos1→library; promote ab4ee52f… from library→pos1 |
| 2 | A2023267 | 9712b1c2-b9d… | 899 | sm | b2ded1e3-941… | 7614 | sm | 3 | Y | N | demote 9712b1c2… from pos1→library; move b2ded1e3… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| 3 | A2024017 | 4ee8c04a-c65… | 4167 | sm | 614fc638-fc2… | 8942 | sm-sync | 0 | Y | N | demote 4ee8c04a… from pos1→library; promote 614fc638… from library→pos1 |
| 4 | A2024048 | 772279ee-7cf… | 8484 | sm | 7daa41e6-bda… | 7852 | sm | 2 | Y | N | demote 772279ee… from pos1→library; move 7daa41e6… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| 5 | A2025138 | ecdaf6cb-fa7… | 7812 | sm | 79dbca25-9fe… | 8941 | sm-sync | 0 | Y | N | demote ecdaf6cb… from pos1→library; promote 79dbca25… from library→pos1 |
| 6 | A2025167 | 43286eef-b72… | 6492 | sm | b8d2d4d5-1b0… | 6949 | sm | 2 | Y | N | demote 43286eef… from pos1→library; move b8d2d4d5… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| 7 | A2025233 | 057ef28f-84d… | 7642 | sm | cacd83ff-62f… | 8629 | sm-sync | 0 | Y | N | demote 057ef28f… from pos1→library; promote cacd83ff… from library→pos1 |
| 8 | A2026025 | ea2d27bc-357… | 8033 | sm | 1bbaa000-a1f… | 8938 | sm-sync | 0 | Y | N | demote ea2d27bc… from pos1→library; promote 1bbaa000… from library→pos1 |
| 9 | A2026036 | 346b4d64-e48… | 8147 | sm | a44a4734-117… | 8339 | sm | 2 | Y | N | demote 346b4d64… from pos1→library; move a44a4734… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| 10 | A2026048 | a7f37096-b75… | 8294 | sm | 8a1678fc-e23… | 8366 | sm | 2 | Y | N | demote a7f37096… from pos1→library; move 8a1678fc… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| 11 | A2026050 | 833ffa38-4eb… | 8311 | sm | 67d80d5d-35c… | 8731 | sm-sync | 0 | Y | N | demote 833ffa38… from pos1→library; promote 67d80d5d… from library→pos1 |
| 12 | A2026061 | 18e94f84-9e9… | none | activity | 0adcb92f-6a3… | 8534 | sm-sync | 0 | Y | Y | demote 18e94f84… from pos1→library; promote 0adcb92f… from library→pos1 |
| 13 | A2026098 | a07461c1-851… | 9418 | sm-sync | a414d4a1-7ee… | 9423 | sm-sync | 0 | Y | N | demote a07461c1… from pos1→library; promote a414d4a1… from library→pos1 |
| 14 | R2024018 | a79f4dd6-9b7… | 3076 | sm | 8e269dc0-b24… | 5587 | sm | 3 | Y | N | demote a79f4dd6… from pos1→library; move 8e269dc0… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| 15 | R2024034 | 4eb469d6-25e… | 4723 | sm | e40c6bf2-486… | 8648 | sm-sync | 0 | Y | N | demote 4eb469d6… from pos1→library; promote e40c6bf2… from library→pos1 |
| 16 | R2025053 | d6930c8b-a16… | 7727 | sm | 9003ea74-cff… | 8070 | sm | 3 | Y | N | demote d6930c8b… from pos1→library; move 9003ea74… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| 17 | R2026006 | ec1fed27-5a5… | 8454 | sm | cc020057-774… | 9306 | sm-sync | 0 | Y | N | demote ec1fed27… from pos1→library; promote cc020057… from library→pos1 |
| 18 | S2024718 | f6f73589-eb3… | 2888 | sm | 1cdfd210-477… | 4524 | sm | 3 | Y | N | demote f6f73589… from pos1→library; move 1cdfd210… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| 19 | S20251008 | 76d8f12f-ad6… | none | dashboard-upload | a0388408-afe… | 8637 | sm-sync | 0 | Y | Y | demote 76d8f12f… from pos1→library; promote a0388408… from library→pos1 |
| 20 | S2025708 | 80f90e57-8da… | 7972 | sm | a8611632-e09… | 8937 | sm-sync | 0 | Y | N | demote 80f90e57… from pos1→library; promote a8611632… from library→pos1 |
| 21 | S2025810 | 69161e6d-1ef… | 6976 | sm | d9331a4c-49d… | 8564 | sm-sync | 0 | Y | N | demote 69161e6d… from pos1→library; promote d9331a4c… from library→pos1 |
| 22 | S2025833 | 5b653bd6-92c… | 7149 | sm | 10eae58a-64e… | 7147 | sm | 2 | Y | N | demote 5b653bd6… from pos1→library; move 10eae58a… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| 23 | S2025883 | a12e8c63-38d… | 7140 | sm | 2679b394-967… | 9337 | sm-sync | 0 | Y | N | demote a12e8c63… from pos1→library; promote 2679b394… from library→pos1 |
| 24 | S2025961 | 4fe05926-24a… | 7209 | sm | f59759a9-a61… | 8570 | sm-sync | 3 | Y | N | demote 4fe05926… from pos1→library; move f59759a9… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| 25 | S2025963 | 3beeab32-5fe… | none | activity | ee17f3f7-78c… | 5813 | sm | 2 | Y | Y | demote 3beeab32… from pos1→library; move ee17f3f7… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| 26 | S2026028 | bd2cb064-fa2… | none | activity | 7207f1df-9ce… | 7818 | sm | 4 | Y | Y | demote bd2cb064… from pos1→library; move 7207f1df… from pos4→pos1 (cascade: pos1 gap filled by shift) |
| 27 | S2026031 | c77413ed-27c… | 8481 | sm | 24736119-de3… | 8849 | sm-sync | 0 | Y | N | demote c77413ed… from pos1→library; promote 24736119… from library→pos1 |
| 28 | S2026045 | 83dec2d0-b3d… | 8479 | sm | 4857c794-f66… | 8478 | sm | 2 | Y | N | demote 83dec2d0… from pos1→library; move 4857c794… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| 29 | S2026078 | a487b2aa-304… | none | activity | 166394ff-ce6… | 8055 | sm | 2 | Y | Y | demote a487b2aa… from pos1→library; move 166394ff… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| 30 | S2026126 | 0dda1508-0ec… | 8476 | sm | a69e9861-684… | 8608 | sm-sync | 5 | Y | N | demote 0dda1508… from pos1→library; move a69e9861… from pos5→pos1 (cascade: pos1 gap filled by shift) |
| 31 | S2026132 | 6ddacd83-1dd… | 8182 | sm | 023fd8cd-825… | 8631 | sm-sync | 0 | Y | N | demote 6ddacd83… from pos1→library; promote 023fd8cd… from library→pos1 |
| 32 | S2026133 | 0111643c-cfe… | 8185 | sm | 6d7df471-dc7… | 8183 | sm | 3 | Y | N | demote 0111643c… from pos1→library; move 6d7df471… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| 33 | S2026134 | b3c30c8a-6a5… | 8392 | sm | e09277bd-45e… | 8393 | sm | 6 | Y | N | demote b3c30c8a… from pos1→library; move e09277bd… from pos6→pos1 (cascade: pos1 gap filled by shift) |
| 34 | S2026144 | a0bbc5b5-39a… | none | sm | fa7785a3-25e… | 8316 | sm | 2 | Y | N | demote a0bbc5b5… from pos1→library; move fa7785a3… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| 35 | S2026155 | ccf8ad74-9ce… | 8344 | sm | 74f87163-00e… | 8352 | sm | 2 | Y | N | demote ccf8ad74… from pos1→library; move 74f87163… from pos2→pos1 (cascade: pos1 gap filled by shift) |
| 36 | S2026158 | 39ff69cf-4ff… | 8254 | sm | 9dd8a0e6-c29… | 8692 | sm-sync | 0 | Y | N | demote 39ff69cf… from pos1→library; promote 9dd8a0e6… from library→pos1 |
| 37 | S2026219 | fb363854-a84… | 8414 | sm | 2e4aaccd-c29… | 8573 | sm-sync | 0 | Y | N | demote fb363854… from pos1→library; promote 2e4aaccd… from library→pos1 |
| 38 | S2026262 | 41de65e3-d08… | 9027 | sm-sync | 01c160f6-eb3… | 9143 | sm-sync | 0 | Y | N | demote 41de65e3… from pos1→library; promote 01c160f6… from library→pos1 |
| 39 | S2026276 | 31c30f8c-c44… | 9009 | sm-sync | f6455a27-0c5… | 9047 | sm-sync | 3 | Y | N | demote 31c30f8c… from pos1→library; move f6455a27… from pos3→pos1 (cascade: pos1 gap filled by shift) |
| 40 | S2026291 | 606eb978-daf… | 8615 | sm-sync | 65c9acf7-fb3… | 9216 | sm-sync | 0 | Y | N | demote 606eb978… from pos1→library; promote 65c9acf7… from library→pos1 |
| 41 | S2026292 | 20a77af1-900… | 8620 | sm-sync | eecb7fe3-35b… | 9385 | sm-sync | 0 | Y | N | demote 20a77af1… from pos1→library; promote eecb7fe3… from library→pos1 |
| 42 | S2026293 | 0c6bc0c2-846… | 8621 | sm-sync | d513707e-4ba… | 9386 | sm-sync | 0 | Y | N | demote 0c6bc0c2… from pos1→library; promote d513707e… from library→pos1 |
| 43 | S2026294 | 8184160a-891… | 8622 | sm-sync | c82d276c-ab3… | 9384 | sm-sync | 0 | Y | N | demote 8184160a… from pos1→library; promote c82d276c… from library→pos1 |
| 44 | S2026295 | a8cbb978-d2f… | 8623 | sm-sync | 141f116b-1b2… | 9215 | sm-sync | 0 | Y | N | demote a8cbb978… from pos1→library; promote 141f116b… from library→pos1 |
| 45 | S2026296 | 5fffa8a2-c8a… | 8624 | sm-sync | 9160200e-38c… | 9383 | sm-sync | 0 | Y | N | demote 5fffa8a2… from pos1→library; promote 9160200e… from library→pos1 |
| 46 | S2026302 | 5fb11c1d-428… | 8639 | sm-sync | 1eecac28-785… | 9021 | sm-sync | 0 | Y | N | demote 5fb11c1d… from pos1→library; promote 1eecac28… from library→pos1 |
| 47 | S2026303 | d60d5914-6f9… | 8640 | sm-sync | 429736db-9b5… | 9020 | sm-sync | 0 | Y | N | demote d60d5914… from pos1→library; promote 429736db… from library→pos1 |
| 48 | S2026306 | 762e58e4-aa8… | 8642 | sm-sync | 2dcd069a-5b5… | 9022 | sm-sync | 0 | Y | N | demote 762e58e4… from pos1→library; promote 2dcd069a… from library→pos1 |
| 49 | S2026320 | ba4d8c60-ce1… | 8667 | sm-sync | f737f36a-6a5… | 8986 | sm-sync | 6 | Y | N | demote ba4d8c60… from pos1→library; move f737f36a… from pos6→pos1 (cascade: pos1 gap filled by shift) |
| 50 | S2026346 | b07c02d0-e45… | 8738 | sm-sync | 75af903a-17f… | 9128 | sm-sync | 0 | Y | N | demote b07c02d0… from pos1→library; promote 75af903a… from library→pos1 |
| 51 | S2026347 | ae8759d0-6d7… | 9046 | sm-sync | d0abc6f0-d38… | 9123 | sm-sync | 0 | Y | N | demote ae8759d0… from pos1→library; promote d0abc6f0… from library→pos1 |
| 52 | S2026348 | 09ef8ec2-899… | 8734 | sm-sync | d86e2290-0cb… | 9127 | sm-sync | 0 | Y | N | demote 09ef8ec2… from pos1→library; promote d86e2290… from library→pos1 |
| 53 | S2026349 | eda1b313-68e… | 8742 | sm-sync | 8fc7e1dd-080… | 9126 | sm-sync | 0 | Y | N | demote eda1b313… from pos1→library; promote 8fc7e1dd… from library→pos1 |
| 54 | S2026350 | 053b7a4a-ca1… | 8741 | sm-sync | 2659b3a7-ee1… | 9124 | sm-sync | 0 | Y | N | demote 053b7a4a… from pos1→library; promote 2659b3a7… from library→pos1 |
| 55 | S2026353 | 8a95865a-0b4… | 9038 | sm-sync | 59c18be2-68c… | 9288 | sm-sync | 0 | Y | N | demote 8a95865a… from pos1→library; promote 59c18be2… from library→pos1 |
| 56 | S2026359 | 6b161352-233… | 8757 | sm-sync | f1b85431-ffd… | 9241 | sm-sync | 0 | Y | N | demote 6b161352… from pos1→library; promote f1b85431… from library→pos1 |
| 57 | S2026363 | c682e602-880… | 8764 | sm-sync | 00159180-e3c… | 9308 | sm-sync | 0 | Y | N | demote c682e602… from pos1→library; promote 00159180… from library→pos1 |
| 58 | S2026364 | 4303b573-ee9… | 8765 | sm-sync | 1e68040a-05c… | 9307 | sm-sync | 0 | Y | N | demote 4303b573… from pos1→library; promote 1e68040a… from library→pos1 |
| 59 | S2026365 | 3b83d5cd-f87… | 8766 | sm-sync | 4d59f271-b44… | 9309 | sm-sync | 0 | Y | N | demote 3b83d5cd… from pos1→library; promote 4d59f271… from library→pos1 |
| 60 | S2026366 | 8e7a7fc8-9cb… | 8767 | sm-sync | 50d8e09c-625… | 9006 | sm-sync | 0 | Y | N | demote 8e7a7fc8… from pos1→library; promote 50d8e09c… from library→pos1 |
| 61 | S2026367 | bd41eff5-b9b… | 8768 | sm-sync | 90911ef8-edd… | 9033 | sm-sync | 0 | Y | N | demote bd41eff5… from pos1→library; promote 90911ef8… from library→pos1 |
| 62 | S2026368 | 29e0c964-7dc… | 8769 | sm-sync | 81dd15a9-2c4… | 9113 | sm-sync | 0 | Y | N | demote 29e0c964… from pos1→library; promote 81dd15a9… from library→pos1 |
| 63 | S2026371 | 56ac1619-62e… | 8772 | sm-sync | 3bddddb7-0e9… | 9032 | sm-sync | 0 | Y | N | demote 56ac1619… from pos1→library; promote 3bddddb7… from library→pos1 |
| 64 | S2026392 | 79ff453e-82c… | 8819 | sm-sync | c45d01fb-506… | 9234 | sm-sync | 0 | Y | N | demote 79ff453e… from pos1→library; promote c45d01fb… from library→pos1 |
| 65 | S2026393 | 729d4a3b-072… | 8818 | sm-sync | 150ebb79-eae… | 9235 | sm-sync | 0 | Y | N | demote 729d4a3b… from pos1→library; promote 150ebb79… from library→pos1 |
| 66 | S2026394 | 8f0b6e78-ac4… | 8820 | sm-sync | 30a5635f-707… | 9236 | sm-sync | 0 | Y | N | demote 8f0b6e78… from pos1→library; promote 30a5635f… from library→pos1 |
| 67 | S2026395 | 656511fd-8fb… | 8826 | sm-sync | 4d915aa3-535… | 9459 | sm-sync | 0 | Y | N | demote 656511fd… from pos1→library; promote 4d915aa3… from library→pos1 |
| 68 | S2026396 | ee218561-b70… | 8827 | sm-sync | 59c22cbd-8a9… | 9458 | sm-sync | 0 | Y | N | demote ee218561… from pos1→library; promote 59c22cbd… from library→pos1 |
| 69 | S2026397 | 098a68b4-3cf… | 8828 | sm-sync | c19762e2-1db… | 9457 | sm-sync | 0 | Y | N | demote 098a68b4… from pos1→library; promote c19762e2… from library→pos1 |
| 70 | S2026398 | 29eaae7f-9c5… | 8829 | sm-sync | 2b5542db-e72… | 9063 | sm-sync | 0 | Y | N | demote 29eaae7f… from pos1→library; promote 2b5542db… from library→pos1 |
| 71 | S2026401 | 572de6c9-bf4… | 8833 | sm-sync | 60114e15-fc5… | 9065 | sm-sync | 0 | Y | N | demote 572de6c9… from pos1→library; promote 60114e15… from library→pos1 |
| 72 | S2026402 | 9fafd249-c6c… | 8832 | sm-sync | 3768c079-383… | 9064 | sm-sync | 0 | Y | N | demote 9fafd249… from pos1→library; promote 3768c079… from library→pos1 |
| 73 | S2026404 | 1b7b50d8-dd2… | 9206 | sm-sync | 1f235d6d-7f3… | 9350 | sm-sync | 0 | Y | N | demote 1b7b50d8… from pos1→library; promote 1f235d6d… from library→pos1 |
| 74 | S2026405 | 7d1e5d6a-6ba… | 9207 | sm-sync | 06c9ec19-0b5… | 9351 | sm-sync | 0 | Y | N | demote 7d1e5d6a… from pos1→library; promote 06c9ec19… from library→pos1 |
| 75 | S2026413 | ed8695e7-3d7… | 8885 | sm-sync | ae52b090-362… | 9480 | sm-sync | 0 | Y | N | demote ed8695e7… from pos1→library; promote ae52b090… from library→pos1 |
| 76 | S2026414 | 30767bca-a8f… | 8886 | sm-sync | 0dcece89-187… | 9479 | sm-sync | 0 | Y | N | demote 30767bca… from pos1→library; promote 0dcece89… from library→pos1 |
| 77 | S2026416 | a6114703-1d7… | 8866 | sm-sync | 516faa2c-159… | 9089 | sm-sync | 0 | Y | N | demote a6114703… from pos1→library; promote 516faa2c… from library→pos1 |
| 78 | S2026417 | 35f95e34-f8b… | 8864 | sm-sync | 92a7f33d-f83… | 9088 | sm-sync | 0 | Y | N | demote 35f95e34… from pos1→library; promote 92a7f33d… from library→pos1 |
| 79 | S2026418 | fa614c6f-030… | 8865 | sm-sync | 2e67a441-98e… | 9090 | sm-sync | 0 | Y | N | demote fa614c6f… from pos1→library; promote 2e67a441… from library→pos1 |
| 80 | S2026420 | ecdcf7cf-a3b… | 8877 | sm-sync | 0597b463-785… | 9186 | sm-sync | 0 | Y | N | demote ecdcf7cf… from pos1→library; promote 0597b463… from library→pos1 |
| 81 | S2026421 | 74711f83-564… | 8878 | sm-sync | 6578d5f9-bf4… | 9185 | sm-sync | 0 | Y | N | demote 74711f83… from pos1→library; promote 6578d5f9… from library→pos1 |
| 82 | S2026436 | 44b97140-fdd… | 8969 | sm-sync | 9fbf56c1-887… | 9146 | sm-sync | 0 | Y | N | demote 44b97140… from pos1→library; promote 9fbf56c1… from library→pos1 |
| 83 | S2026437 | 4d64ba97-a92… | 8968 | sm-sync | 6cc4ae70-938… | 9145 | sm-sync | 0 | Y | N | demote 4d64ba97… from pos1→library; promote 6cc4ae70… from library→pos1 |
| 84 | S2026440 | 64995ab0-baa… | 9016 | sm-sync | 2befc936-060… | 9237 | sm-sync | 0 | Y | N | demote 64995ab0… from pos1→library; promote 2befc936… from library→pos1 |
| 85 | S2026441 | a4c49fa0-a48… | 9014 | sm-sync | b7292538-7d3… | 9238 | sm-sync | 0 | Y | N | demote a4c49fa0… from pos1→library; promote b7292538… from library→pos1 |
| 86 | S2026443 | f44740cf-003… | 9013 | sm-sync | bb9a6133-307… | 9026 | sm-sync | 0 | Y | N | demote f44740cf… from pos1→library; promote bb9a6133… from library→pos1 |
| 87 | S2026445 | 0357b153-e89… | 8977 | sm-sync | d25a058b-0b5… | 9219 | sm-sync | 0 | Y | N | demote 0357b153… from pos1→library; promote d25a058b… from library→pos1 |
| 88 | S2026447 | d21f7c90-779… | 8978 | sm-sync | 87445ffa-707… | 9220 | sm-sync | 0 | Y | N | demote d21f7c90… from pos1→library; promote 87445ffa… from library→pos1 |
| 89 | S2026448 | 2b381ef2-111… | 8979 | sm-sync | e6618c05-f8e… | 9221 | sm-sync | 0 | Y | N | demote 2b381ef2… from pos1→library; promote e6618c05… from library→pos1 |
| 90 | S2026451 | 863266e2-08e… | 8990 | sm-sync | 1e171711-589… | 9474 | sm-sync | 0 | Y | N | demote 863266e2… from pos1→library; promote 1e171711… from library→pos1 |
| 91 | S2026452 | bc172c31-06c… | 8991 | sm-sync | ed7683a1-6c6… | 9478 | sm-sync | 0 | Y | N | demote bc172c31… from pos1→library; promote ed7683a1… from library→pos1 |
| 92 | S2026453 | c2bce56f-c1d… | 8992 | sm-sync | a311dbfe-c32… | 9477 | sm-sync | 0 | Y | N | demote c2bce56f… from pos1→library; promote a311dbfe… from library→pos1 |
| 93 | S2026454 | afe14e54-bbe… | 8993 | sm-sync | c7ead0d7-1b3… | 9476 | sm-sync | 0 | Y | N | demote afe14e54… from pos1→library; promote c7ead0d7… from library→pos1 |
| 94 | S2026457 | 350fefe5-076… | 8997 | sm-sync | b98481df-4b2… | 9102 | sm-sync | 0 | Y | N | demote 350fefe5… from pos1→library; promote b98481df… from library→pos1 |
| 95 | S2026468 | 3dfac24e-0e5… | 9058 | sm-sync | 3eaa3f17-d49… | 9375 | sm-sync | 0 | Y | N | demote 3dfac24e… from pos1→library; promote 3eaa3f17… from library→pos1 |
| 96 | S2026483 | 3f2a0d6b-13d… | 9082 | sm-sync | 32fedf16-b01… | 9402 | sm-sync | 0 | Y | N | demote 3f2a0d6b… from pos1→library; promote 32fedf16… from library→pos1 |
| 97 | S2026484 | fba3d2f4-d45… | 9086 | sm-sync | d1bc8e0a-f8a… | 9406 | sm-sync | 0 | Y | N | demote fba3d2f4… from pos1→library; promote d1bc8e0a… from library→pos1 |
| 98 | S2026485 | 90670c1a-2cb… | 9083 | sm-sync | 0243bef1-e40… | 9404 | sm-sync | 0 | Y | N | demote 90670c1a… from pos1→library; promote 0243bef1… from library→pos1 |
| 99 | S2026486 | 15dd695e-060… | 9085 | sm-sync | 7c0149e7-bd9… | 9403 | sm-sync | 0 | Y | N | demote 15dd695e… from pos1→library; promote 7c0149e7… from library→pos1 |
| 100 | S2026492 | 87e52f06-811… | 9100 | sm-sync | bb5478cb-1f0… | 9192 | sm-sync | 0 | Y | N | demote 87e52f06… from pos1→library; promote bb5478cb… from library→pos1 |
| 101 | S2026495 | 6fdc90ac-8f4… | 9117 | sm-sync | 5c27651d-770… | 9436 | sm-sync | 0 | Y | N | demote 6fdc90ac… from pos1→library; promote 5c27651d… from library→pos1 |
| 102 | S2026499 | 67787037-d1e… | 9121 | sm-sync | 991a774f-8ba… | 9464 | sm-sync | 0 | Y | N | demote 67787037… from pos1→library; promote 991a774f… from library→pos1 |
| 103 | S2026500 | 04e4d240-678… | 9116 | sm-sync | 6c0a680f-806… | 9463 | sm-sync | 0 | Y | N | demote 04e4d240… from pos1→library; promote 6c0a680f… from library→pos1 |
| 104 | S2026501 | 0534ab1a-b0a… | 9135 | sm-sync | 93c99fe7-d42… | 9391 | sm-sync | 0 | Y | N | demote 0534ab1a… from pos1→library; promote 93c99fe7… from library→pos1 |
| 105 | S2026502 | 64f57916-fd4… | 9134 | sm-sync | a40e8d46-9c3… | 9392 | sm-sync | 0 | Y | N | demote 64f57916… from pos1→library; promote a40e8d46… from library→pos1 |
| 106 | S2026503 | e6e1c41a-679… | 9136 | sm-sync | 4e166492-ee0… | 9470 | sm-sync | 0 | Y | N | demote e6e1c41a… from pos1→library; promote 4e166492… from library→pos1 |
| 107 | S2026505 | fe565113-9b1… | 9131 | sm-sync | 3ad0d0fc-2dc… | 9435 | sm-sync | 0 | Y | N | demote fe565113… from pos1→library; promote 3ad0d0fc… from library→pos1 |
| 108 | S2026506 | d8f5455f-6e4… | 9133 | sm-sync | 1e805655-cac… | 9434 | sm-sync | 0 | Y | N | demote d8f5455f… from pos1→library; promote 1e805655… from library→pos1 |
| 109 | S2026507 | b9985af1-77e… | 9138 | sm-sync | 137fc85d-2c4… | 9370 | sm-sync | 0 | Y | N | demote b9985af1… from pos1→library; promote 137fc85d… from library→pos1 |
| 110 | S2026508 | 63d68396-dca… | 9141 | sm-sync | d87713bf-79c… | 9372 | sm-sync | 0 | Y | N | demote 63d68396… from pos1→library; promote d87713bf… from library→pos1 |
| 111 | S2026509 | c3477e5b-1ff… | 9139 | sm-sync | 52605be8-84c… | 9471 | sm-sync | 0 | Y | N | demote c3477e5b… from pos1→library; promote 52605be8… from library→pos1 |
| 112 | S2026510 | d94e13f3-ea5… | 9142 | sm-sync | 12d67c9d-950… | 9472 | sm-sync | 0 | Y | N | demote d94e13f3… from pos1→library; promote 12d67c9d… from library→pos1 |
| 113 | S2026511 | b354991a-fab… | 9147 | sm-sync | e2b554fd-82f… | 9353 | sm-sync | 0 | Y | N | demote b354991a… from pos1→library; promote e2b554fd… from library→pos1 |
| 114 | S2026514 | 9cf8c2f8-d58… | 9148 | sm-sync | c2bf5f54-dc0… | 9156 | sm-sync | 0 | Y | N | demote 9cf8c2f8… from pos1→library; promote c2bf5f54… from library→pos1 |
| 115 | S2026515 | 8b6e8024-10b… | 9149 | sm-sync | fd3c5b2f-f4e… | 9157 | sm-sync | 0 | Y | N | demote 8b6e8024… from pos1→library; promote fd3c5b2f… from library→pos1 |
| 116 | S2026516 | 8ce771a3-527… | 9150 | sm-sync | 35dd8e55-9bc… | 9255 | sm-sync | 0 | Y | N | demote 8ce771a3… from pos1→library; promote 35dd8e55… from library→pos1 |
| 117 | S2026517 | 47497699-e8b… | 9152 | sm-sync | c8e3a3ff-092… | 9254 | sm-sync | 0 | Y | N | demote 47497699… from pos1→library; promote c8e3a3ff… from library→pos1 |
| 118 | S2026539 | 82aa68a6-fdc… | 9169 | sm-sync | eba95743-60d… | 9330 | sm-sync | 0 | Y | N | demote 82aa68a6… from pos1→library; promote eba95743… from library→pos1 |
| 119 | S2026540 | 2ce9c6a4-491… | 9172 | sm-sync | 2f83f8eb-1cb… | 9332 | sm-sync | 0 | Y | N | demote 2ce9c6a4… from pos1→library; promote 2f83f8eb… from library→pos1 |
| 120 | S2026541 | c6239ee6-364… | 9171 | sm-sync | d0674aa1-ee2… | 9331 | sm-sync | 0 | Y | N | demote c6239ee6… from pos1→library; promote d0674aa1… from library→pos1 |
| 121 | S2026542 | 1c726168-6c0… | 9170 | sm-sync | ef38be8e-57e… | 9329 | sm-sync | 0 | Y | N | demote 1c726168… from pos1→library; promote ef38be8e… from library→pos1 |
| 122 | S2026543 | 00f3b82c-4db… | 9174 | sm-sync | 13e82462-8fe… | 9253 | sm-sync | 0 | Y | N | demote 00f3b82c… from pos1→library; promote 13e82462… from library→pos1 |
| 123 | S2026560 | 9c14608d-773… | 9214 | sm-sync | fc25c2a8-c4b… | 9298 | sm-sync | 0 | Y | N | demote 9c14608d… from pos1→library; promote fc25c2a8… from library→pos1 |
| 124 | S2026562 | e30ee96f-f69… | 9242 | sm-sync | d8ddb25c-548… | 9244 | sm-sync | 0 | Y | N | demote e30ee96f… from pos1→library; promote d8ddb25c… from library→pos1 |
| 125 | S2026563 | 30325112-2b0… | 9243 | sm-sync | f41afa5d-d48… | 9245 | sm-sync | 0 | Y | N | demote 30325112… from pos1→library; promote f41afa5d… from library→pos1 |
| 126 | S2026570 | a6376e29-e08… | 9265 | sm-sync | bee84f10-dec… | 9299 | sm-sync | 0 | Y | N | demote a6376e29… from pos1→library; promote bee84f10… from library→pos1 |
| 127 | S2026577 | ff2bca19-39c… | 9272 | sm-sync | a93f3005-284… | 9282 | sm-sync | 0 | Y | N | demote ff2bca19… from pos1→library; promote a93f3005… from library→pos1 |
| 128 | S2026579 | b0a06a34-5db… | 9268 | sm-sync | 3dd41899-df7… | 9281 | sm-sync | 0 | Y | N | demote b0a06a34… from pos1→library; promote 3dd41899… from library→pos1 |
| 129 | S2026580 | e901a4e1-bd9… | 9270 | sm-sync | 5bf0a946-208… | 9284 | sm-sync | 0 | Y | N | demote e901a4e1… from pos1→library; promote 5bf0a946… from library→pos1 |
| 130 | S2026581 | 46f5de7c-42b… | 9273 | sm-sync | 1e30ceb3-cd4… | 9280 | sm-sync | 0 | Y | N | demote 46f5de7c… from pos1→library; promote 1e30ceb3… from library→pos1 |
| 131 | S2026582 | c84c4939-ad5… | 9267 | sm-sync | 9128aecc-6e1… | 9303 | sm-sync | 0 | Y | N | demote c84c4939… from pos1→library; promote 9128aecc… from library→pos1 |
| 132 | S2026583 | f6e0b167-373… | 9269 | sm-sync | 414c45f4-8aa… | 9279 | sm-sync | 0 | Y | N | demote f6e0b167… from pos1→library; promote 414c45f4… from library→pos1 |
| 133 | S2026584 | a1168f23-ea9… | 9271 | sm-sync | e4b702cf-17d… | 9283 | sm-sync | 0 | Y | N | demote a1168f23… from pos1→library; promote e4b702cf… from library→pos1 |
| 134 | S2026606 | bd8a89e2-053… | 9286 | sm-sync | bd816b68-b50… | 9388 | sm-sync | 0 | Y | N | demote bd8a89e2… from pos1→library; promote bd816b68… from library→pos1 |
| 135 | S2026611 | 5d70aae2-7ba… | 9311 | sm-sync | 2f5a45e3-7ea… | 9320 | sm-sync | 0 | Y | N | demote 5d70aae2… from pos1→library; promote 2f5a45e3… from library→pos1 |
| 136 | S2026613 | 0742287f-c9f… | 9312 | sm-sync | 8813d48b-17b… | 9338 | sm-sync | 0 | Y | N | demote 0742287f… from pos1→library; promote 8813d48b… from library→pos1 |
| 137 | S2026614 | 55a0edf1-038… | 9314 | sm-sync | f8f47548-87d… | 9319 | sm-sync | 0 | Y | N | demote 55a0edf1… from pos1→library; promote f8f47548… from library→pos1 |
| 138 | S2026615 | 95039db4-9c3… | 9316 | sm-sync | f63946d3-28d… | 9333 | sm-sync | 0 | Y | N | demote 95039db4… from pos1→library; promote f63946d3… from library→pos1 |
| 139 | S2026637 | 02deb0ee-8a7… | 9359 | sm-sync | 93908bcc-4d5… | 9398 | sm-sync | 0 | Y | N | demote 02deb0ee… from pos1→library; promote 93908bcc… from library→pos1 |
| 140 | S2026638 | a5feda55-1ee… | 9360 | sm-sync | fcad23e0-21a… | 9399 | sm-sync | 0 | Y | N | demote a5feda55… from pos1→library; promote fcad23e0… from library→pos1 |
| 141 | S2026643 | 55c3b17f-2cb… | 9376 | sm-sync | 52093242-042… | 9400 | sm-sync | 0 | Y | N | demote 55c3b17f… from pos1→library; promote 52093242… from library→pos1 |
| 142 | S2026648 | 94df032b-771… | 9378 | sm-sync | facbd3e2-fee… | 9397 | sm-sync | 0 | Y | N | demote 94df032b… from pos1→library; promote facbd3e2… from library→pos1 |
| 143 | S2026657 | 7a0a9248-8ca… | 9416 | sm-sync | 0f5e3458-926… | 9446 | sm-sync | 0 | Y | N | demote 7a0a9248… from pos1→library; promote 0f5e3458… from library→pos1 |
| 144 | W2025068 | 1461fd05-d51… | 6453 | sm | 59b13a15-749… | 8751 | sm-sync | 0 | Y | N | demote 1461fd05… from pos1→library; promote 59b13a15… from library→pos1 |
| 145 | W2026044 | e3850dc4-258… | 8793 | sm-sync | f3b96a33-947… | 9030 | sm-sync | 0 | Y | N | demote e3850dc4… from pos1→library; promote f3b96a33… from library→pos1 |
| 146 | W2026045 | b94349e6-040… | 8794 | sm-sync | 970ec16e-dab… | 9380 | sm-sync | 0 | Y | N | demote b94349e6… from pos1→library; promote 970ec16e… from library→pos1 |
| 147 | W2026046 | e4af16a1-0c8… | 8797 | sm-sync | f305a7e2-688… | 9251 | sm-sync | 0 | Y | N | demote e4af16a1… from pos1→library; promote f305a7e2… from library→pos1 |
| 148 | W2026047 | 82b82db0-057… | 8796 | sm-sync | 5093b29c-34c… | 9250 | sm-sync | 0 | Y | N | demote 82b82db0… from pos1→library; promote 5093b29c… from library→pos1 |
| 149 | W2026048 | a014f2c2-10c… | 8795 | sm-sync | 0e5112c6-0d9… | 9252 | sm-sync | 0 | Y | N | demote a014f2c2… from pos1→library; promote 0e5112c6… from library→pos1 |
| 150 | W2026050 | abad9bc2-477… | 8798 | sm-sync | 5aa0411d-e5d… | 9460 | sm-sync | 0 | Y | N | demote abad9bc2… from pos1→library; promote 5aa0411d… from library→pos1 |
| 151 | W2026051 | 5f8256a3-1aa… | 8799 | sm-sync | 7028eded-acc… | 9469 | sm-sync | 0 | Y | N | demote 5f8256a3… from pos1→library; promote 7028eded… from library→pos1 |
| 152 | W2026052 | 5dcd9d90-9d4… | 8811 | sm-sync | eb9d1a3b-dbb… | 9248 | sm-sync | 0 | Y | N | demote 5dcd9d90… from pos1→library; promote eb9d1a3b… from library→pos1 |
| 153 | W2026053 | 6bfb48a6-c66… | 8812 | sm-sync | 009b8da9-12a… | 9249 | sm-sync | 0 | Y | N | demote 6bfb48a6… from pos1→library; promote 009b8da9… from library→pos1 |
| 154 | W2026054 | c5311986-95c… | 8813 | sm-sync | 69cd856e-966… | 9246 | sm-sync | 0 | Y | N | demote c5311986… from pos1→library; promote 69cd856e… from library→pos1 |
| 155 | W2026057 | 02760fd4-225… | 8821 | sm-sync | 52ebdccf-1f9… | 9110 | sm-sync | 0 | Y | N | demote 02760fd4… from pos1→library; promote 52ebdccf… from library→pos1 |
| 156 | W2026063 | 196fc673-539… | 9229 | sm-sync | 6275bb1d-1ee… | 9347 | sm-sync | 0 | Y | N | demote 196fc673… from pos1→library; promote 6275bb1d… from library→pos1 |
| 157 | W2026070 | f8d78482-b9f… | 9262 | sm-sync | 5e4f3a1c-69f… | 9341 | sm-sync | 0 | Y | N | demote f8d78482… from pos1→library; promote 5e4f3a1c… from library→pos1 |

---

## Bucket C — Needs Swap, Target Missing from DB (15 animals)

These animals have a WEBSITEMEDIAID in SM but the corresponding photo row does not exist in `animal_media`. They cannot be fixed until the next SM Photo Sync ingests the photo.

[VERIFIED — `SELECT ... FROM animal_media WHERE shelter_code=? AND source_media_id=?` returned no rows for each]

| shelter_code | WEBSITEMEDIAID | reason |
|-------------|---------------|--------|
| S2026668 | 9488 | WEBSITEMEDIAID 9488 not found in animal_media (not yet synced) |
| S2026669 | 9487 | no slot-1 and target not in DB |
| S2026671 | 9483 | no slot-1 and target not in DB |
| S2026672 | 9486 | no slot-1 and target not in DB |
| S2026673 | 9485 | no slot-1 and target not in DB |
| S2026675 | 9484 | no slot-1 and target not in DB |
| S2026677 | 9489 | no slot-1 and target not in DB |
| S2026678 | 9490 | no slot-1 and target not in DB |
| S2026681 | 9495 | no slot-1 and target not in DB |
| S2026682 | 9491 | no slot-1 and target not in DB |
| S2026683 | 9492 | no slot-1 and target not in DB |
| S2026684 | 9500 | no slot-1 and target not in DB |
| S2026685 | 9496 | no slot-1 and target not in DB |
| S2026686 | 9498 | no slot-1 and target not in DB |
| S2026687 | 9493 | no slot-1 and target not in DB |

All 15 animals have high mediaids (9483–9500), indicating recently added photos. They will be ingested by the next nightly SM Photo Sync run and can be fixed in the subsequent correction pass. [INFERRED — from mediaid range vs existing DB range]

---

## Bucket D — Excluded (246 animals)

- No WEBSITEMEDIAID in SM feed: 32
- Slot-1 exists but animal not in current SM feed (archived/unavailable): 214

These are excluded from the fix entirely. No action taken.

---

## Confirmation

- **Zero database writes made.** All queries used `mode=ro` connection string. [VERIFIED]
- **Zero file modifications.** No photos, configs, or services touched. [VERIFIED]
- **SM API call**: one `json_shelter_animals` read-only fetch. [VERIFIED]