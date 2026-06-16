# Abe (S2025966) — Today's Uploads Re-Investigation

**Date:** 2026-06-16 22:09 UTC  
**Scope:** Read-only investigation — no changes  
**Prior report correction:** The prior report analyzed April 17 rows (`0a6d3dba`/`5cf5a67d`) which are unrelated old data with completely different md5s.

---

## 1. ALL animal_media for Abe (S2025966) [VERIFIED]

Newest first — query output:

```
id                                    source            captured_at               created_at                strip  hidden  filename                                   thumb
------------------------------------  ----------------  ------------------------  ------------------------  -----  ------  -----------------------------------------  -----
beeee088-b13b-463c-9957-105308aca5e5  dashboard-upload  2026-06-16T16:09:21       2026-06-16 20:09:21       0      0       S2025966-library-1781640561922-4f857b.jpg   YES
03e7e5dd-35bc-48f8-8f4f-70113947b88d  dashboard-upload  2026-06-16T16:08:22       2026-06-16 20:08:22       0      0       S2025966-library-1781640502384-c97a3c.jpg   YES
656f0397-f6d5-4c4b-a358-518af9810f62  form              2026-06-16T13:50:26       2026-06-16 17:50:26       0      1       S2025966-library-1781632226676-8b2575.jpg   YES
e7c7c70e-d7a2-4cd9-83fb-502d34f4950d  form              2026-06-16T13:50:25       2026-06-16 17:50:25       0      1       S2025966-library-1781632225856-2e1740.jpg   YES
4095fa76-af72-499c-b45d-b272ba0a4810  form              2026-06-12T15:58:48       2026-06-12 19:58:48       0      1       S2025966-library-1781294328779-4093aa.jpg   YES
d3480ece-434d-4975-9e57-b2fae2cd091b  form              2026-06-12T15:58:48       2026-06-12 19:58:48       0      1       S2025966-library-1781294328545-d3ed56.jpg   YES
3874c643-2373-4a91-a4dd-ada35ea801d0  grok_imagine      2026-05-30T21:49:48.460Z  2026-05-30T21:49:48.460Z  0      0       ...mp4                                     YES
8242dc9c-a72d-4986-90f2-3d5634db19ae  sm-sync           2026-05-14T06:00:01       2026-05-14 06:00:01       0      0       (external)                                 NULL
8bad3896-f307-4f22-a8c0-815386c29e83  grok_imagine      2026-04-22T16:29:30       2026-04-22T16:29:30       0      0       ...mp4                                     YES
73710f5d-43aa-42bc-8440-c1123640f991  grok_imagine      2026-04-22T16:28:25       2026-04-22T16:28:25       2      0       ...mp4                                     YES
4e1823bc-d66f-4db3-94e4-18e5d576157d  dashboard-upload  2026-04-18T19:41:06       2026-04-18 23:41:06       4      0       S2025966-library-1776555666824-ad2f77.jpg   YES
292d7f19-b614-4e53-91d3-b38a78a3b5dd  sm-sync           2026-04-18T06:00:00       2026-04-18 06:00:00       1      0       (external)                                 NULL
0a6d3dba-7120-40a9-8faf-a839fb151a3a  dashboard-upload  2026-04-17T17:20:10       2026-04-17 21:20:10       0      1       S2025966-library-1776460810121-15e5d3.jpg   YES
67dce4cf-52fe-4880-85ec-4cb46b25f043  sm                2025-11-06T00:00:00       2026-04-14 03:19:39       3      0       (external)                                 NULL
```

**Abe has 14 total rows; 4 were created today.** [VERIFIED]

---

## 2. TODAY'S ROWS — Abe (S2025966) [VERIFIED]

### 2a. Form uploads (17:50 UTC, hidden)

| Field | Row 1 | Row 2 |
|-------|-------|-------|
| **id** | `e7c7c70e-d7a2-4cd9-83fb-502d34f4950d` | `656f0397-f6d5-4c4b-a358-518af9810f62` |
| **source** | `form` | `form` |
| **created_at** | `2026-06-16 17:50:25` | `2026-06-16 17:50:26` |
| **strip_position** | 0 (library) | 0 (library) |
| **hidden** | 1 | 1 |
| **hidden_at** | `2026-06-16T13:51:02` (ET) → 17:51:02 UTC | `2026-06-16T13:50:58` (ET) → 17:50:58 UTC |
| **file** | `S2025966-library-1781632225856-2e1740.jpg` | `S2025966-library-1781632226676-8b2575.jpg` |
| **size** | 504,658 bytes | 146,146 bytes |
| **md5** | `3e3330106f6be6275fe19c0b5cc75c97` | `291361bc6413d0f8ef44078167d2f51b` |
| **thumbnail** | YES | YES |
| **time to hide** | 37 seconds | 32 seconds |

These were uploaded via the profile form at 1:50pm ET and hidden within 30-37 seconds. [VERIFIED]

### 2b. Dashboard uploads (20:08–20:09 UTC, visible)

| Field | Row 1 (larger file) | Row 2 (smaller file) |
|-------|---------------------|----------------------|
| **id** | `03e7e5dd-35bc-48f8-8f4f-70113947b88d` | `beeee088-b13b-463c-9957-105308aca5e5` |
| **source** | `dashboard-upload` | `dashboard-upload` |
| **created_at** | `2026-06-16 20:08:22` | `2026-06-16 20:09:21` |
| **strip_position** | 0 (library) | 0 (library) |
| **hidden** | 0 (visible) | 0 (visible) |
| **file** | `S2025966-library-1781640502384-c97a3c.jpg` | `S2025966-library-1781640561922-4f857b.jpg` |
| **size** | 480,230 bytes | 43,911 bytes |
| **md5** | `b20792320d4b1c86454a7cc6a0447e27` | `c60608a8328d41fb0a8ed1db254a48ed` |
| **thumbnail** | YES | YES |

These are the user's **current visible uploads** — uploaded via the dashboard at ~4:08pm ET, both visible, both in library (strip_position=0). [VERIFIED]

**Likely identification [INFERRED]:**
- `beeee088` (44 KB) — the **keyboard photo** (small simple image = small file size)
- `03e7e5dd` (480 KB) — the **camera-roll photo from 2 days ago** (larger photo = larger file)

---

## 3. CROSS-ANIMAL MD5 CHECK [VERIFIED]

### All 4 of today's md5 hashes searched across ALL library-photos, animal-photos, and intake-photos:

```
md5: c60608a8328d41fb0a8ed1db254a48ed → ONLY Abe (S2025966)
md5: b20792320d4b1c86454a7cc6a0447e27 → ONLY Abe (S2025966)
md5: 291361bc6413d0f8ef44078167d2f51b → ONLY Abe (S2025966)
md5: 3e3330106f6be6275fe19c0b5cc75c97 → ONLY Abe (S2025966)
```

**No duplicate file exists on any other animal's filesystem directory.** [VERIFIED]

---

## 4. ALL animal_media CREATED TODAY (any animal) [VERIFIED]

```
id                                    animal        source            created_at           hidden  filename
------------------------------------  ------------  ----------------  -------------------  ------  -----------------------------------------
beeee088-b13b-463c-9957-105308aca5e5  S2025966/Abe  dashboard-upload  2026-06-16 20:09:21  0       S2025966-library-...-4f857b.jpg
03e7e5dd-35bc-48f8-8f4f-70113947b88d  S2025966/Abe  dashboard-upload  2026-06-16 20:08:22  0       S2025966-library-...-c97a3c.jpg
73774403-4ba2-4b20-a89f-199f4aa9e2d3  R2023007/Char dashboard-upload  2026-06-16 17:57:12  0       R2023007-library-...-ffdf32.jpg
a9934a86-3376-4c0e-96bc-ee9262580628  R2023007/Char dashboard-upload  2026-06-16 17:57:01  0       R2023007-library-...-7cceca.jpg
5d657583-caaf-403b-b5b9-68095be68249  R2023007/Char dashboard-upload  2026-06-16 17:56:52  0       R2023007-library-...-0ce23d.jpg
b47f5827-bb67-42c4-bb94-86151aff9fe9  R2023007/Char dashboard-upload  2026-06-16 17:56:41  0       R2023007-library-...-37734d.jpg
656f0397-f6d5-4c4b-a358-518af9810f62  S2025966/Abe  form              2026-06-16 17:50:26  1       S2025966-library-...-8b2575.jpg
e7c7c70e-d7a2-4cd9-83fb-502d34f4950d  S2025966/Abe  form              2026-06-16 17:50:25  1       S2025966-library-...-2e1740.jpg
99543e88-afce-45f1-a60a-f17467385598  R2023007/Char form              2026-06-16 17:39:08  0       R2023007-library-...-008868.jpg
a414d4a1-7ee4-4907-b24c-4b6d6d06cd03  A2026098      sm-sync           2026-06-16 06:00:01  0       (external)
dd60ec53-42a6-4680-bec1-c259f2a6aad9  S2026659      sm-sync           2026-06-16 06:00:01  0       (external)
7625d773-848b-4b5d-90b4-b71fa93b1421  S2026658      sm-sync           2026-06-16 06:00:01  0       (external)
90190104-ed21-4cea-bc11-af9c7e603af7  S2026660      sm-sync           2026-06-16 06:00:01  0       (external)
```

**13 rows created today across all animals.** Of these, only Abe (S2025966) and Charlie (R2023007) have local file uploads. **Ava (R2024018) has ZERO rows from today.** No md5 overlap exists between any of today's rows. [VERIFIED]

---

## 5. KEYBOARD PHOTO IN STAFF APP [VERIFIED + INFERRED]

The staff app's animal cards use `enrichWithLocalPhotos()`, which queries:

```sql
WHERE media_type = 'photo' AND hidden = 0 AND strip_position > 0
```

Today's uploads all have `strip_position = 0` (library-only). **None of today's uploads are shown on staff app cards.** [VERIFIED]

The staff app card for Abe shows the SM-sync photo at **strip_position 1** (`292d7f19`, created April 18, external SM URL). [VERIFIED]

If the user sees one of today's photos, they are viewing it either:
- In the **dashboard's photo library section** (which shows strip_position=0 rows), or
- In a **profile form** context [INFERRED]

The keyboard photo is most likely `beeee088` (43 KB, dashboard-upload, created 20:09:21 UTC) based on size — a keyboard image would be relatively simple/small. [INFERRED]

---

## 6. APRIL ROWS vs TODAY [VERIFIED]

### MD5 comparison

| Row | Date | MD5 |
|-----|------|-----|
| `0a6d3dba` (Abe, April) | 2026-04-17 | `9bf28220b5eb970dbd4a4145fd5106f1` |
| `5cf5a67d` (Ava, April) | 2026-04-17 | `9bf28220b5eb970dbd4a4145fd5106f1` |
| `03e7e5dd` (Abe, today) | 2026-06-16 | `b20792320d4b1c86454a7cc6a0447e27` |
| `beeee088` (Abe, today) | 2026-06-16 | `c60608a8328d41fb0a8ed1db254a48ed` |

**All different md5s. The April rows are completely unrelated old data — different images entirely.** The prior report analyzed the wrong rows. [VERIFIED]

---

## CONCLUSION

1. **Today's actual uploads to Abe:** 4 rows — 2 via profile form at 17:50 UTC (both hidden ~30s later), 2 via dashboard at 20:08-20:09 UTC (visible, library-only). The user's keyboard photo is likely `beeee088` (44 KB) and the camera-roll photo is likely `03e7e5dd` (480 KB). [VERIFIED for row data, INFERRED for which-is-which]

2. **Cross-animal duplication:** **None.** No md5 from today's Abe uploads appears on any other animal's filesystem. Ava (R2024018) has zero rows created today. [VERIFIED]

3. **Staff app visibility:** Today's uploads have `strip_position=0` — they appear in the dashboard library, NOT on staff app cards. The staff app card shows the SM photo (strip_position=1). If the user sees a keyboard photo, they're looking at the dashboard. [VERIFIED]

4. **April rows:** Completely different images (different md5s). The prior investigation analyzed unrelated 2-month-old data that happened to also involve Abe and Ava. Those April rows are both hidden and library-only — they have no bearing on today's uploads. [VERIFIED]

5. **No evidence of any bug or mis-assignment today.** Every today-upload is correctly assigned to the animal specified in the upload URL, with matching file path, filename, and DB shelter_code. [VERIFIED]
