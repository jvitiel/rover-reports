# Slot-1 Globe-Wins Correction — Read-Only Dry Run
**Date:** 2026-06-21 ~04:20 UTC
**Mode:** Read-only (DB opened mode=ro). Zero writes to DB, sync code, or any service.

## 1. Live SM Feed
- SM feed animals total: 507
- With non-null WEBSITEMEDIAID: 475

## 2. Live Counts
- **In-scope for correction:** 152
- **Delta vs prior manifest (152):** 0
- **LIBRARY swaps** (globe at strip_position=0): 134
- **STRIP swaps** (globe at strip_position 2–6): 18

### Excluded: Slot-1 is non-SM (human/non-SM picks)
Count: 5

| shelter_code | source | source_media_id |
|---|---|---|
| A2026061 | activity |  |
| S20251008 | dashboard-upload |  |
| S2025963 | activity |  |
| S2026028 | activity |  |
| S2026078 | activity |  |

### Excluded: Globe photo not yet in DB (Bucket-C equivalent)
Count: 1

| shelter_code | websiteMediaId |
|---|---|
| S2026668 | 9488 |

### Already correct (slot-1 = globe photo)
Count: 303

## 3. Per-Animal Swap Modeling & Assertion Results

| # | shelter_code | swap_type | globe_pos | globe_mediaid | slot1_mediaid | assertion | issues |
|---|---|---|---|---|---|---|---|
| 1 | A2023030 | LIBRARY | 0 | 8732 | 7947 | ✅ PASS |  |
| 2 | A2023267 | STRIP | 3 | 7614 | 899 | ✅ PASS |  |
| 3 | A2024017 | LIBRARY | 0 | 8942 | 4167 | ✅ PASS |  |
| 4 | A2024048 | STRIP | 2 | 7852 | 8484 | ✅ PASS |  |
| 5 | A2025138 | LIBRARY | 0 | 8941 | 7812 | ✅ PASS |  |
| 6 | A2025167 | STRIP | 2 | 6949 | 6492 | ✅ PASS |  |
| 7 | A2025233 | LIBRARY | 0 | 8629 | 7642 | ✅ PASS |  |
| 8 | A2026025 | LIBRARY | 0 | 8938 | 8033 | ✅ PASS |  |
| 9 | A2026036 | STRIP | 2 | 8339 | 8147 | ✅ PASS |  |
| 10 | A2026048 | STRIP | 2 | 8366 | 8294 | ✅ PASS |  |
| 11 | A2026050 | LIBRARY | 0 | 8731 | 8311 | ✅ PASS |  |
| 12 | A2026098 | LIBRARY | 0 | 9423 | 9418 | ✅ PASS |  |
| 13 | R2024018 | STRIP | 3 | 5587 | 3076 | ✅ PASS |  |
| 14 | R2024034 | LIBRARY | 0 | 8648 | 4723 | ✅ PASS |  |
| 15 | R2025053 | STRIP | 3 | 8070 | 7727 | ✅ PASS |  |
| 16 | R2026006 | LIBRARY | 0 | 9306 | 8454 | ✅ PASS |  |
| 17 | S2024718 | STRIP | 3 | 4524 | 2888 | ✅ PASS |  |
| 18 | S2025708 | LIBRARY | 0 | 8937 | 7972 | ✅ PASS |  |
| 19 | S2025810 | LIBRARY | 0 | 8564 | 6976 | ✅ PASS |  |
| 20 | S2025833 | STRIP | 2 | 7147 | 7149 | ✅ PASS |  |
| 21 | S2025883 | LIBRARY | 0 | 9337 | 7140 | ✅ PASS |  |
| 22 | S2025961 | STRIP | 3 | 8570 | 7209 | ✅ PASS |  |
| 23 | S2026031 | LIBRARY | 0 | 8849 | 8481 | ✅ PASS |  |
| 24 | S2026045 | STRIP | 2 | 8478 | 8479 | ✅ PASS |  |
| 25 | S2026126 | STRIP | 5 | 8608 | 8476 | ✅ PASS |  |
| 26 | S2026132 | LIBRARY | 0 | 8631 | 8182 | ✅ PASS |  |
| 27 | S2026133 | STRIP | 3 | 8183 | 8185 | ✅ PASS |  |
| 28 | S2026134 | STRIP | 6 | 8393 | 8392 | ✅ PASS |  |
| 29 | S2026144 | STRIP | 2 | 8316 | None | ✅ PASS |  |
| 30 | S2026155 | STRIP | 2 | 8352 | 8344 | ✅ PASS |  |
| 31 | S2026158 | LIBRARY | 0 | 8692 | 8254 | ✅ PASS |  |
| 32 | S2026219 | LIBRARY | 0 | 8573 | 8414 | ✅ PASS |  |
| 33 | S2026262 | LIBRARY | 0 | 9143 | 9027 | ✅ PASS |  |
| 34 | S2026276 | STRIP | 3 | 9047 | 9009 | ✅ PASS |  |
| 35 | S2026291 | LIBRARY | 0 | 9216 | 8615 | ✅ PASS |  |
| 36 | S2026292 | LIBRARY | 0 | 9385 | 8620 | ✅ PASS |  |
| 37 | S2026293 | LIBRARY | 0 | 9386 | 8621 | ✅ PASS |  |
| 38 | S2026294 | LIBRARY | 0 | 9384 | 8622 | ✅ PASS |  |
| 39 | S2026295 | LIBRARY | 0 | 9215 | 8623 | ✅ PASS |  |
| 40 | S2026296 | LIBRARY | 0 | 9383 | 8624 | ✅ PASS |  |
| 41 | S2026302 | LIBRARY | 0 | 9021 | 8639 | ✅ PASS |  |
| 42 | S2026303 | LIBRARY | 0 | 9020 | 8640 | ✅ PASS |  |
| 43 | S2026306 | LIBRARY | 0 | 9022 | 8642 | ✅ PASS |  |
| 44 | S2026320 | STRIP | 6 | 8986 | 8667 | ✅ PASS |  |
| 45 | S2026346 | LIBRARY | 0 | 9128 | 8738 | ✅ PASS |  |
| 46 | S2026347 | LIBRARY | 0 | 9123 | 9046 | ✅ PASS |  |
| 47 | S2026348 | LIBRARY | 0 | 9127 | 8734 | ✅ PASS |  |
| 48 | S2026349 | LIBRARY | 0 | 9126 | 8742 | ✅ PASS |  |
| 49 | S2026350 | LIBRARY | 0 | 9124 | 8741 | ✅ PASS |  |
| 50 | S2026353 | LIBRARY | 0 | 9288 | 9038 | ✅ PASS |  |
| 51 | S2026359 | LIBRARY | 0 | 9241 | 8757 | ✅ PASS |  |
| 52 | S2026363 | LIBRARY | 0 | 9308 | 8764 | ✅ PASS |  |
| 53 | S2026364 | LIBRARY | 0 | 9307 | 8765 | ✅ PASS |  |
| 54 | S2026365 | LIBRARY | 0 | 9309 | 8766 | ✅ PASS |  |
| 55 | S2026366 | LIBRARY | 0 | 9006 | 8767 | ✅ PASS |  |
| 56 | S2026367 | LIBRARY | 0 | 9033 | 8768 | ✅ PASS |  |
| 57 | S2026368 | LIBRARY | 0 | 9113 | 8769 | ✅ PASS |  |
| 58 | S2026371 | LIBRARY | 0 | 9032 | 8772 | ✅ PASS |  |
| 59 | S2026392 | LIBRARY | 0 | 9234 | 8819 | ✅ PASS |  |
| 60 | S2026393 | LIBRARY | 0 | 9235 | 8818 | ✅ PASS |  |
| 61 | S2026394 | LIBRARY | 0 | 9236 | 8820 | ✅ PASS |  |
| 62 | S2026395 | LIBRARY | 0 | 9459 | 8826 | ✅ PASS |  |
| 63 | S2026396 | LIBRARY | 0 | 9458 | 8827 | ✅ PASS |  |
| 64 | S2026397 | LIBRARY | 0 | 9457 | 8828 | ✅ PASS |  |
| 65 | S2026398 | LIBRARY | 0 | 9063 | 8829 | ✅ PASS |  |
| 66 | S2026401 | LIBRARY | 0 | 9065 | 8833 | ✅ PASS |  |
| 67 | S2026402 | LIBRARY | 0 | 9064 | 8832 | ✅ PASS |  |
| 68 | S2026404 | LIBRARY | 0 | 9350 | 9206 | ✅ PASS |  |
| 69 | S2026405 | LIBRARY | 0 | 9351 | 9207 | ✅ PASS |  |
| 70 | S2026413 | LIBRARY | 0 | 9480 | 8885 | ✅ PASS |  |
| 71 | S2026414 | LIBRARY | 0 | 9479 | 8886 | ✅ PASS |  |
| 72 | S2026416 | LIBRARY | 0 | 9089 | 8866 | ✅ PASS |  |
| 73 | S2026417 | LIBRARY | 0 | 9088 | 8864 | ✅ PASS |  |
| 74 | S2026418 | LIBRARY | 0 | 9090 | 8865 | ✅ PASS |  |
| 75 | S2026420 | LIBRARY | 0 | 9186 | 8877 | ✅ PASS |  |
| 76 | S2026421 | LIBRARY | 0 | 9185 | 8878 | ✅ PASS |  |
| 77 | S2026436 | LIBRARY | 0 | 9146 | 8969 | ✅ PASS |  |
| 78 | S2026437 | LIBRARY | 0 | 9145 | 8968 | ✅ PASS |  |
| 79 | S2026440 | LIBRARY | 0 | 9237 | 9016 | ✅ PASS |  |
| 80 | S2026441 | LIBRARY | 0 | 9238 | 9014 | ✅ PASS |  |
| 81 | S2026443 | LIBRARY | 0 | 9026 | 9013 | ✅ PASS |  |
| 82 | S2026445 | LIBRARY | 0 | 9219 | 8977 | ✅ PASS |  |
| 83 | S2026447 | LIBRARY | 0 | 9220 | 8978 | ✅ PASS |  |
| 84 | S2026448 | LIBRARY | 0 | 9221 | 8979 | ✅ PASS |  |
| 85 | S2026451 | LIBRARY | 0 | 9474 | 8990 | ✅ PASS |  |
| 86 | S2026452 | LIBRARY | 0 | 9478 | 8991 | ✅ PASS |  |
| 87 | S2026453 | LIBRARY | 0 | 9477 | 8992 | ✅ PASS |  |
| 88 | S2026454 | LIBRARY | 0 | 9476 | 8993 | ✅ PASS |  |
| 89 | S2026457 | LIBRARY | 0 | 9102 | 8997 | ✅ PASS |  |
| 90 | S2026468 | LIBRARY | 0 | 9375 | 9058 | ✅ PASS |  |
| 91 | S2026483 | LIBRARY | 0 | 9402 | 9082 | ✅ PASS |  |
| 92 | S2026484 | LIBRARY | 0 | 9406 | 9086 | ✅ PASS |  |
| 93 | S2026485 | LIBRARY | 0 | 9404 | 9083 | ✅ PASS |  |
| 94 | S2026486 | LIBRARY | 0 | 9403 | 9085 | ✅ PASS |  |
| 95 | S2026492 | LIBRARY | 0 | 9192 | 9100 | ✅ PASS |  |
| 96 | S2026495 | LIBRARY | 0 | 9436 | 9117 | ✅ PASS |  |
| 97 | S2026499 | LIBRARY | 0 | 9464 | 9121 | ✅ PASS |  |
| 98 | S2026500 | LIBRARY | 0 | 9463 | 9116 | ✅ PASS |  |
| 99 | S2026501 | LIBRARY | 0 | 9391 | 9135 | ✅ PASS |  |
| 100 | S2026502 | LIBRARY | 0 | 9392 | 9134 | ✅ PASS |  |
| 101 | S2026503 | LIBRARY | 0 | 9470 | 9136 | ✅ PASS |  |
| 102 | S2026505 | LIBRARY | 0 | 9435 | 9131 | ✅ PASS |  |
| 103 | S2026506 | LIBRARY | 0 | 9434 | 9133 | ✅ PASS |  |
| 104 | S2026507 | LIBRARY | 0 | 9370 | 9138 | ✅ PASS |  |
| 105 | S2026508 | LIBRARY | 0 | 9372 | 9141 | ✅ PASS |  |
| 106 | S2026509 | LIBRARY | 0 | 9471 | 9139 | ✅ PASS |  |
| 107 | S2026510 | LIBRARY | 0 | 9472 | 9142 | ✅ PASS |  |
| 108 | S2026511 | LIBRARY | 0 | 9353 | 9147 | ✅ PASS |  |
| 109 | S2026514 | LIBRARY | 0 | 9156 | 9148 | ✅ PASS |  |
| 110 | S2026515 | LIBRARY | 0 | 9157 | 9149 | ✅ PASS |  |
| 111 | S2026516 | LIBRARY | 0 | 9255 | 9150 | ✅ PASS |  |
| 112 | S2026517 | LIBRARY | 0 | 9254 | 9152 | ✅ PASS |  |
| 113 | S2026539 | LIBRARY | 0 | 9330 | 9169 | ✅ PASS |  |
| 114 | S2026540 | LIBRARY | 0 | 9332 | 9172 | ✅ PASS |  |
| 115 | S2026541 | LIBRARY | 0 | 9331 | 9171 | ✅ PASS |  |
| 116 | S2026542 | LIBRARY | 0 | 9329 | 9170 | ✅ PASS |  |
| 117 | S2026543 | LIBRARY | 0 | 9253 | 9174 | ✅ PASS |  |
| 118 | S2026560 | LIBRARY | 0 | 9298 | 9214 | ✅ PASS |  |
| 119 | S2026562 | LIBRARY | 0 | 9244 | 9242 | ✅ PASS |  |
| 120 | S2026563 | LIBRARY | 0 | 9245 | 9243 | ✅ PASS |  |
| 121 | S2026570 | LIBRARY | 0 | 9299 | 9265 | ✅ PASS |  |
| 122 | S2026577 | LIBRARY | 0 | 9282 | 9272 | ✅ PASS |  |
| 123 | S2026579 | LIBRARY | 0 | 9281 | 9268 | ✅ PASS |  |
| 124 | S2026580 | LIBRARY | 0 | 9284 | 9270 | ✅ PASS |  |
| 125 | S2026581 | LIBRARY | 0 | 9280 | 9273 | ✅ PASS |  |
| 126 | S2026582 | LIBRARY | 0 | 9303 | 9267 | ✅ PASS |  |
| 127 | S2026583 | LIBRARY | 0 | 9279 | 9269 | ✅ PASS |  |
| 128 | S2026584 | LIBRARY | 0 | 9283 | 9271 | ✅ PASS |  |
| 129 | S2026606 | LIBRARY | 0 | 9388 | 9286 | ✅ PASS |  |
| 130 | S2026611 | LIBRARY | 0 | 9320 | 9311 | ✅ PASS |  |
| 131 | S2026613 | LIBRARY | 0 | 9338 | 9312 | ✅ PASS |  |
| 132 | S2026614 | LIBRARY | 0 | 9319 | 9314 | ✅ PASS |  |
| 133 | S2026615 | LIBRARY | 0 | 9333 | 9316 | ✅ PASS |  |
| 134 | S2026637 | LIBRARY | 0 | 9398 | 9359 | ✅ PASS |  |
| 135 | S2026638 | LIBRARY | 0 | 9399 | 9360 | ✅ PASS |  |
| 136 | S2026643 | LIBRARY | 0 | 9400 | 9376 | ✅ PASS |  |
| 137 | S2026648 | LIBRARY | 0 | 9397 | 9378 | ✅ PASS |  |
| 138 | S2026657 | LIBRARY | 0 | 9446 | 9416 | ✅ PASS |  |
| 139 | W2025068 | LIBRARY | 0 | 8751 | 6453 | ✅ PASS |  |
| 140 | W2026044 | LIBRARY | 0 | 9030 | 8793 | ✅ PASS |  |
| 141 | W2026045 | LIBRARY | 0 | 9380 | 8794 | ✅ PASS |  |
| 142 | W2026046 | LIBRARY | 0 | 9251 | 8797 | ✅ PASS |  |
| 143 | W2026047 | LIBRARY | 0 | 9250 | 8796 | ✅ PASS |  |
| 144 | W2026048 | LIBRARY | 0 | 9252 | 8795 | ✅ PASS |  |
| 145 | W2026050 | LIBRARY | 0 | 9460 | 8798 | ✅ PASS |  |
| 146 | W2026051 | LIBRARY | 0 | 9469 | 8799 | ✅ PASS |  |
| 147 | W2026052 | LIBRARY | 0 | 9248 | 8811 | ✅ PASS |  |
| 148 | W2026053 | LIBRARY | 0 | 9249 | 8812 | ✅ PASS |  |
| 149 | W2026054 | LIBRARY | 0 | 9246 | 8813 | ✅ PASS |  |
| 150 | W2026057 | LIBRARY | 0 | 9110 | 8821 | ✅ PASS |  |
| 151 | W2026063 | LIBRARY | 0 | 9347 | 9229 | ✅ PASS |  |
| 152 | W2026070 | LIBRARY | 0 | 9341 | 9262 | ✅ PASS |  |

**Total assertion failures: 0**

## 4. Image Render Spot-Check (Top 15 by mediaid)

| shelter_code | mediaid | HTTP status | content-type | bytes | valid |
|---|---|---|---|---|---|
| S2026413 | 9480 | 200 | image/jpeg | 175129 | ✅ |
| S2026414 | 9479 | 200 | image/jpeg | 121544 | ✅ |
| S2026452 | 9478 | 200 | image/jpeg | 161884 | ✅ |
| S2026453 | 9477 | 200 | image/jpeg | 156334 | ✅ |
| S2026454 | 9476 | 200 | image/jpeg | 237918 | ✅ |
| S2026451 | 9474 | 200 | image/jpeg | 176985 | ✅ |
| S2026510 | 9472 | 200 | image/jpeg | 225087 | ✅ |
| S2026509 | 9471 | 200 | image/jpeg | 260772 | ✅ |
| S2026503 | 9470 | 200 | image/jpeg | 295873 | ✅ |
| W2026051 | 9469 | 200 | image/jpeg | 250967 | ✅ |
| S2026499 | 9464 | 200 | image/jpeg | 135117 | ✅ |
| S2026500 | 9463 | 200 | image/jpeg | 106586 | ✅ |
| W2026050 | 9460 | 200 | image/jpeg | 235549 | ✅ |
| S2026395 | 9459 | 200 | image/jpeg | 162688 | ✅ |
| S2026396 | 9458 | 200 | image/jpeg | 194017 | ✅ |

**Render check failures: 0**

## 5. Empty/Null Globe file_url
Count: 0

## 6. Verification
- Database opened with `mode=ro` — zero writes possible
- No sync code, dashboard, photos, config, or service modified
- All data recomputed from live SM feed + live DB state
- Prior manifest row list NOT reused — fully recomputed
