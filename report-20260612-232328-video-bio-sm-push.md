# Video & Bio SM Push Feasibility — Diagnostic Report

**Date:** 2026-06-12 23:23 ET
**Scope:** Read-only diagnosis — no writes, no test imports, no pushes

---

## PART A — LOCAL VIDEO INVENTORY

### A1. Schema [VERIFIED]

Videos live in `animal_media` (no separate video table). Key columns:

```
animal_media:
  id TEXT PRIMARY KEY
  shelter_code TEXT           -- animal linkage
  media_type TEXT NOT NULL    -- 'video' for videos, 'photo' for photos
  source TEXT NOT NULL
  file_path TEXT NOT NULL     -- local path or URL
  file_url TEXT               -- public-facing URL
  duration_seconds REAL
  hidden INTEGER DEFAULT 0
  content_hash TEXT
  sm_push_skipped_reason TEXT
  tag_marketing INTEGER DEFAULT 0
  tag_featured INTEGER DEFAULT 0
  thumbnail_url TEXT
```

### A2. Video Row Inventory [VERIFIED]

**Total video rows:** 58

- **54 local files** (file_path = `/home/shelter/shelter-apps/data/animal-media/videos/*.mp4`)
- **4 URL-based** (hosted featured videos pointing to `https://dashboard.4lgshelterapp.duckdns.org/data/featured-videos/`)

**Videos per animal (38 animals total, unhidden only):**

| Multi-video? | Count | Animals |
|---|---|---|
| 3 videos | 3 | A2026061, A2026067, S2025966 |
| 2 videos | 9 | A2024185, S20241035, S20241225, S2025961, S2026028, S2026133, S2026134, S2026143, W2026027 |
| 1 video | 26 | (remaining) |

**⚠ Petfinder allows 1 video max per animal.** 12 animals have >1 video — a selection mechanism would be needed (e.g., use the most recent, or the one tagged `tag_marketing=1`).

**File format breakdown:**

| Format | Count |
|---|---|
| MP4 (local) | 54 |
| MP4 (URL, featured) | 4 |

100% MP4 — no other formats.

### A3. Disk Files vs Petfinder Bar [VERIFIED]

**Files on disk:** 54 (matches DB local-file count exactly — zero mismatches)

**File type verification (`file` command):** All 54 → `ISO Media, MP4 Base Media v1 [ISO 14496-12:2003]`

**Size distribution (Petfinder cap = 25 MB):**

| Metric | Value |
|---|---|
| Smallest | 1.05 MB (93575e91...) |
| Largest | 8.48 MB (347fa038...) |
| Under 25 MB | **54 (100%)** |
| Over 25 MB | **0** |

**Petfinder eligibility (format in mp4/mov/avi/wmv/webm AND size ≤ 25 MB):**

| Result | Count |
|---|---|
| PASS | 54 |
| FAIL | 0 |

**All 54 local video files pass the Petfinder bar.** Zero failures. No format or size issues.

**URL-based featured videos (4):** Also MP4, all under 5 MB (checked on disk at `/home/shelter/shelter-apps/data/featured-videos/`). These would pass too, but they're stored as URLs not local paths — push would need to reference the URL or resolve the local file.

---

## PART B — SM csv_import CAPABILITY

### B4. SM csv_import Field Reference [VERIFIED]

**Source:** SM official docs (`csvimportfields.rst`) AND SM source code (`asm3/csvimport.py` — the `VALID_FIELDS` list).

#### ANIMALIMAGE (photo) — YES, writable [VERIFIED]

From the docs:
> `ANIMALIMAGE` — A photo for the animal, it can either be an absolute HTTP URL to a JPG image OR a base64 encoded JPG expressed as a data URI.

Present in the `VALID_FIELDS` list in `csvimport.py`. Our existing photo push code (`shelterManagerPush.ts`) uses this field successfully — 36 successful pushes logged in `sm_push_audit`, most recent 2026-05-14.

The existing push code builds the CSV as:
```
Header: ANIMALCODE,ANIMALNAME,ANIMALIMAGE
Row:    S2026230,SomeName,https://staff.4lgshelterapp.duckdns.org/data/animal-media/photos/uuid.jpg
```

#### ANIMALVIDEO — NO, does not exist [VERIFIED]

**There is no ANIMALVIDEO field in SM's csv_import.** Not in the docs, not in the `VALID_FIELDS` list in the source code. Searched the full field reference, the GitHub source, and web — zero hits.

SM csv_import supports exactly two media-type fields for animals:
- `ANIMALIMAGE` — JPG photo (URL or base64 data URI)
- `ANIMALPDFDATA` + `ANIMALPDFNAME` — PDF attachment

No video equivalent exists. Videos cannot be pushed to SM via csv_import.

#### ANIMALCOMMENTS / ANIMALDESCRIPTION (bio) — YES, writable [VERIFIED]

Both fields exist and are explicitly listed as **overwrite-on-existing-animal** fields:

> When processing animal records that already exist, there are certain key fields that will be overwritten on the existing animal from the CSV data if those columns exist in the CSV data and have a value for that row.
> These fields are: ANIMALCOMMENTS / ANIMALDESCRIPTION / ANIMALWARNING [...]
> This allows you to use a spreadsheet of data to update many animals on chipping/neutering days (for example), **or update many animal bios in one go.**

`ANIMALCOMMENTS` maps to the SM Description field (what our system reads as `raw.ANIMALCOMMENTS` and normalizes to `animal.description`). `ANIMALDESCRIPTION` is an alias for the same field.

A bio push CSV would look like:
```
Header: ANIMALCODE,ANIMALNAME,ANIMALCOMMENTS
Row:    S2026346,Basil,"Meet Basil! This adorable kitten..."
```

### B5. Credential Scope [VERIFIED]

**Write credentials:** `shelterManagerWrite` in `shelter-secrets.json`
- Account: RGCares
- Username: DWriter
- Password: [REDACTED]

**Proven working:** 36 successful `ANIMALIMAGE` pushes via `csv_import` method logged in `sm_push_audit` (most recent: 2026-05-14). The credentials POST to `https://service.sheltermanager.com/asmservice` with `method=csv_import`.

**Scope for video:** N/A — no video field exists in csv_import, so credential scope is moot for videos.

**Scope for bio (ANIMALCOMMENTS):** The same `csv_import` method and credentials that push photos would push bios. The csv_import method does not restrict which CSV fields a given user can write — if the user can call csv_import at all (which DWriter demonstrably can), they can write any recognized CSV field including ANIMALCOMMENTS. [INFERRED — SM docs don't mention per-field permissions for csv_import; the method is all-or-nothing based on user permissions; DWriter has proven csv_import access]

---

## SUMMARY

### Videos → Petfinder via SM

**BLOCKED.** SM csv_import has no video field. There is no way to push video files to SM via the csv_import API. Videos would need to be uploaded to Petfinder through a different channel:

1. **Direct Petfinder API** (bypassing SM entirely) — requires Petfinder API credentials and a separate integration
2. **SM web UI manual upload** — not automatable via our system
3. **SM feature request** — ask SM to add ANIMALVIDEO to csv_import (uncertain timeline)

The 54 local videos are all Petfinder-eligible (100% MP4, all under 25 MB, zero format/size failures), so the content is ready — the pipeline to get them there doesn't exist through SM.

### Bios → SM

**READY.** ANIMALCOMMENTS is a writable, overwrite-on-existing-animal field in csv_import. The existing photo-push infrastructure (`shelterManagerPush.ts`) provides the exact pattern: build CSV with ANIMALCODE + ANIMALNAME + field, base64-encode, POST to SM service. A bio push would use the same credentials, same endpoint, same method — only the CSV header changes from `ANIMALIMAGE` to `ANIMALCOMMENTS`. The SM docs explicitly call out "update many animal bios in one go" as a designed use case.

### Decision Points

1. **Video delivery to Petfinder:** Requires a non-SM path. Is a direct Petfinder API integration worth building? (12 animals have >1 video — selection logic also needed.)
2. **Bio push to SM:** Low-risk extension of existing photo push. Which bio text? The approved `bio_en_long` from `animal_bios`? When — on approval? On a schedule? Should it overwrite whatever's currently in SM ANIMALCOMMENTS?
