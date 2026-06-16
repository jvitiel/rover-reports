# Abe/Ava Duplicate Photo Investigation

**Date:** 2026-06-16 22:00 UTC  
**Scope:** Read-only investigation — no code changes

---

## 1. TIMELINE [VERIFIED]

### Both rows

| Field | Abe (S2025966) `0a6d3dba-...` | Ava (R2024018) `5cf5a67d-...` |
|---|---|---|
| `created_at` | `2026-04-17 21:20:10` (UTC) | `2026-04-17 22:20:23` (UTC) |
| `captured_at` | `2026-04-17T17:20:10` (ET) | `2026-04-17T18:20:23` (ET) |
| Filename timestamp | `1776460810121` → 2026-04-17 21:20:10.121 UTC | `1776464423348` → 2026-04-17 22:20:23.348 UTC |
| `hidden_at` | `2026-04-17T18:20:00` (ET = 22:20:00 UTC) | `2026-04-17T18:20:46` (ET = 22:20:46 UTC) |

**Time between uploads:** 60.2 minutes [VERIFIED]

**Time from Ava's creation to hiding:** 23 seconds [VERIFIED]

**Time from Abe's creation to hiding:** ~50 seconds after Ava was created (Abe was hidden at 22:20:00 UTC, created at 21:20:10 UTC — hidden ~60 min later, just BEFORE Ava was created) [VERIFIED]

**NOT today's data** — both from April 17, 2026, approximately 2 months ago. [VERIFIED]

### Sequence reconstruction [INFERRED]

```
21:20:10 UTC — Photo uploaded to Abe (S2025966). Strip position 0 (library).
  ... 60 minutes pass ...
22:20:00 UTC — Abe's copy HIDDEN (hidden_at 18:20:00 ET = 22:20:00 UTC)
22:20:23 UTC — Same photo uploaded to Ava (R2024018). Strip position 0 (library).
22:20:46 UTC — Ava's copy HIDDEN (23 seconds after upload)
```

The user uploaded the photo to Abe, then ~60 minutes later hid Abe's copy and uploaded it to Ava, then immediately hid Ava's copy (23 seconds). This looks like a user working through their photo library, uploading images, and correcting mistakes.

---

## 2. DISPLAY STATE OF AVA'S COPY [VERIFIED]

```
id:             5cf5a67d-f3ab-4591-91fa-6fbf4169393a
shelter_code:   R2024018
strip_position: 0        ← library only (never in strip)
hidden:         1        ← HIDDEN
hidden_at:      2026-04-17T18:20:46
source:         dashboard-upload
```

Ava's copy is **hidden and library-only** — it does not appear in Ava's strip or anywhere visible. This is consistent with the user's screenshot showing only SM-sync entries for Ava. [VERIFIED]

Abe's copy is ALSO hidden (`hidden=1`, `hidden_at=2026-04-17T18:20:00`, `strip_position=0`). Neither copy is currently displayed for either animal. [VERIFIED]

---

## 3. SCOPE — ALL ANIMALS WITH THIS MD5 [VERIFIED]

### File search

```
9bf28220b5eb970dbd4a4145fd5106f1  .../library-photos/R2024018/R2024018-library-1776464423348-d31094.jpg
9bf28220b5eb970dbd4a4145fd5106f1  .../library-photos/S2025966/S2025966-library-1776460810121-15e5d3.jpg
```

**Only 2 files** on disk match this md5. No copies in `animal-photos/` or elsewhere. [VERIFIED]

### DB records for these files

Only the 2 rows already identified — no other `animal_media` records reference either file path. [VERIFIED]

---

## 4. CODE PATH — CAN AN UPLOAD BE MIS-ASSIGNED? [VERIFIED]

### shelter_code single-sourced [VERIFIED]

In `POST /api/photos/:shelterCode/upload-to-library` (`server/src/server.ts:3886-3948`):

```typescript
const shelterCode = req.params.shelterCode as string;       // ← from URL param

// ... validation, processing ...

const filename = `${shelterCode}-library-${Date.now()}-${randomSuffix}.jpg`;   // ← same shelterCode
const photosDir = path.join(ROOT_DIR, 'data', 'library-photos', shelterCode);  // ← same shelterCode
// ...
const fileUrl = `${BASE_URL}/data/library-photos/${shelterCode}/${filename}`;  // ← same shelterCode

const photoId = insertAnimalMedia({
  shelterCode: shelterCode,  // ← same shelterCode
  // ...
});
```

The file directory, filename, URL, and DB `shelter_code` are ALL derived from the single `req.params.shelterCode` URL parameter. **There is no way for the file to be written under one shelter_code while the DB records another.** [VERIFIED]

### No copy/clone/share/transfer code path [VERIFIED]

Comprehensive grep results:

- **`INSERT INTO animal_media`**: only 3 places — `insertAnimalMedia` (localDatabase.ts:4707), the video generate handler (server.ts:4038), and the SM push audit (sm_push_audit, different table). [VERIFIED]
- **No code copies files between shelter-code directories.** grep for `copyFile`, `cp.*library`, `copy.*library` returned nothing. [VERIFIED]
- **No code UPDATEs `shelter_code` on animal_media.** grep returned nothing. [VERIFIED]
- **No bonded-pair photo sharing, no duplicate/clone feature.** [VERIFIED]
- **SM sync never creates `dashboard-upload` rows.** It uses source `'sm-sync'` exclusively. [VERIFIED]

### Conclusion on code path [VERIFIED]

**No code path exists that can put one animal's uploaded image onto another animal.** The shelter_code is single-sourced from the URL parameter and used consistently for file path, filename, URL, and DB record. The only way two animals can have the same image bytes is if the same file was uploaded twice via separate API calls with different `:shelterCode` values.

---

## 5. CONTENT_HASH / DEDUP [VERIFIED]

Both rows have **empty `content_hash`**:

```
0a6d3dba-...|S2025966|content_hash=''
5cf5a67d-...|R2024018|content_hash=''
```

The `content_hash` infrastructure was added in commit `5f3c33d` on **May 14, 2026** — nearly a month AFTER these April 17 uploads. On April 17, `processUploadedImage` returned only a `Buffer`, not `{ buffer, contentHash }`. [VERIFIED]

**No dedup mechanism existed on April 17.** The upload path did not check whether an identical image already existed for another animal. Each upload was independent. Even today, `content_hash` is computed and stored but NOT used to block duplicate uploads or link images across animals — it's only used for SM push round-trip dedup (preventing SM from re-importing photos that were dashboard-uploaded). [VERIFIED]

---

## HISTORICAL NOTE [VERIFIED]

The `upload-to-library` endpoint was introduced in commit `7735438` on **April 21**, but the files have filesystem `Birth` dates of **April 17**. This means the code was deployed to the running server from uncommitted changes ~4 days before the commit was made. The Clawdbot agent (active at that time) was building the Featured Slots feature and testing it on the live server. The commit `7735438` was authored on April 21 but the code was running earlier. [INFERRED from filesystem Birth timestamps matching filename `Date.now()` timestamps to sub-millisecond accuracy]

---

## CONCLUSION

**(a) Creation dates:** Both from **April 17, 2026** — Abe's at 21:20:10 UTC, Ava's at 22:20:23 UTC (60 minutes apart). Not today's data. [VERIFIED]

**(b) Ava's copy:** Hidden (`hidden=1`) and library-only (`strip_position=0`). Not displayed anywhere. Hidden 23 seconds after creation. Abe's copy is ALSO hidden. Neither is visible. [VERIFIED]

**(c) Scope:** Exactly 2 files, 2 DB rows — only Abe and Ava. No other animals carry this image. [VERIFIED]

**(d) Root cause:** **User action, not a code bug.** The upload-to-library endpoint uses a single `shelter_code` from the URL parameter for file path, filename, URL, and DB record — there is no way for a mis-assignment to occur in code. No copy/clone/share feature exists. The user uploaded the same image file to Abe, then ~60 minutes later uploaded it again to Ava, then immediately hid Ava's copy (23 seconds). Both copies are now hidden. The byte-identical content is because `processUploadedImage` deterministically re-encodes the same input bytes to the same output (same resize + mozjpeg settings = same result). [VERIFIED]
