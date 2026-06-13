# SM WEBSITEVIDEOURL Live Instance Diagnosis

**Date:** 2026-06-12 23:39 ET
**Scope:** Strictly read-only — no writes, no csv_import, no uploads, no field changes

---

## PART A — WEBSITEVIDEOURL IN OUR LIVE SM

### A1. Full Field List from Live SM [VERIFIED]

Called `json_shelter_animals` against `service.sheltermanager.com/asmservice` with account RGCares / user JVitiello. Returned **479 animals**, each with **346 fields**.

**WEBSITEVIDEOURL is present** in the response schema. Three video-related fields exist:

```
WEBSITEVIDEOMIMETYPE: None
WEBSITEVIDEONOTES: None
WEBSITEVIDEOURL: None
```

Other media-related fields returned (from first animal, S2025966 "Abe (Louie)"):

```
ANIMALPHOTO: 4441
DOCMEDIADATE: '2025-11-09T13:52:59.204529'
DOCMEDIAID: 7261
DOCMEDIANAME: '7261.jpg'
PHOTOURLS: ['https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&mediaid=8613&ts=...', ...]
RECENTLYCHANGEDIMAGES: 0
WEBSITEIMAGECOUNT: 3
WEBSITEMEDIADATE: '2026-04-17T09:06:32.436280'
WEBSITEMEDIAID: 8613
WEBSITEMEDIANAME: '8613.jpg'
WEBSITEMEDIANOTES: 'Screenshot 2026-04-17 at 9.06.15 AM.png'
```

Also present on each animal: `PETFINDERBREED`, `PETFINDERBREED2`, `PETFINDERSPECIES` (Petfinder mapping fields). [VERIFIED]

### A2. WEBSITEVIDEOURL Population Across All Animals [VERIFIED]

**Populated: 0 / 479** — No animal in the RGCares SM instance has WEBSITEVIDEOURL set.

Also checked `json_adoptable_animals` (the Petfinder-relevant subset): **0 / 142 adoptable animals** have WEBSITEVIDEOURL populated.

`WEBSITEVIDEOMIMETYPE`: Zero distinct non-null values across all 479 animals. [VERIFIED]
`WEBSITEVIDEONOTES`: Zero non-empty values across all 479 animals. [VERIFIED]

**No example values to show** — the field has never been used in RGCares.

---

## PART B — CAN WEBSITEVIDEOURL BE SET PROGRAMMATICALLY?

### B3. WEBSITEVIDEOURL in csv_import Accepted Fields [VERIFIED]

**ABSENT.** WEBSITEVIDEOURL is NOT in the SM csv_import accepted-field list.

Checked the live SM help reference at `sheltermanager.com/repo/asm3_help/csvimportfields.html` — zero occurrences of "WEBSITEVIDEOURL". Also confirmed absent from the `VALID_FIELDS` list in the SM source code (`asm3/csvimport.py`). [VERIFIED — grep of live help page returned 0 matches]

The csv_import overwrite-on-existing-animal fields are:

```
ANIMALCOMMENTS / ANIMALDESCRIPTION / ANIMALWARNING
ANIMALDECEASEDDATE / ANIMALDECEASEDNOTES / ANIMALDECEASEDREASON
ANIMALDOB
ANIMALEUTHANIZED
ANIMALFLAGS
ANIMALHEALTHPROBLEMS
ANIMALLOCATION / ANIMALUNIT
ANIMALMICROCHIP / ANIMALMICROCHIPDATE
ANIMALNEUTERED / ANIMALNEUTEREDDATE
ANIMALPICKUPADDRESS / ANIMALPICKUPLOCATION
```

No video field of any kind. ANIMALIMAGE (photo) is accepted but it's JPG-only, not video.

### B4. SM Service Write Methods Available [VERIFIED]

The SM service API exposes exactly **one write method** accessible via the service endpoint:

| Method | Purpose | Notes |
|---|---|---|
| `csv_import` | Import/update records via CSV | Only method that writes. Requires `IMPORT_CSV_FILE` permission. |

That's it. There is no:
- `animal_update` method
- `upload_animal_image` method (this is NOT an SM service method — it exists only in the web UI)
- `set_field` method
- Any other programmatic write method

**All other service methods are read-only** (json_adoptable_animals, json_shelter_animals, xml_*, html_*, media_image, etc.).

**Conclusion: There is no SM service API method that can set WEBSITEVIDEOURL.** [VERIFIED]

- csv_import doesn't accept WEBSITEVIDEOURL as a field
- No other write method exists in the service API
- The only way to set WEBSITEVIDEOURL is through the SM web UI (manually, per-animal, in the animal media section)

---

## PART C — OUR CODEBASE

### C5. Grep for WEBSITEVIDEOURL / Video-URL SM Field [VERIFIED]

```
$ grep -rn "WEBSITEVIDEOURL\|websiteVideoUrl\|websitevideourl\|WebsiteVideoUrl" \
    /home/shelter/shelter-apps/server/src/ \
    /home/shelter/shelter-apps/dashboard/index.html

(no output — zero matches)

$ grep -rni "WEBSITEVIDEO" /home/shelter/shelter-apps/server/src/

(no output — zero matches)
```

**Our codebase does not read, normalize, store, or reference WEBSITEVIDEOURL at all.** [VERIFIED]

`normalizeAnimal` in `shelterManagerService.ts` reads `WEBSITEMEDIAID` (for the primary photo) but nothing video-related from SM. The `video_url` fields in our API responses come from our local `animal_media` table, not from SM.

The only "video" references in `server.ts` are to local video files (resolveVideoThumbnailUrl, videoMap from local animal_media table, video generation endpoints). None touch SM's WEBSITEVIDEOURL. [VERIFIED]

---

## PART D — PETFINDER PUBLISHER CONFIG

### D6. RGCares Petfinder Publisher [UNCERTAIN]

**This is NOT determinable read-only from the VPS/API.**

The SM service API does not expose any endpoint to view publisher configuration. The publisher setup (SM's built-in Petfinder FTP publisher, which is the mechanism that would use WEBSITEVIDEOURL + the youtube/vimeo URL check to populate the photo6 slot) is configured inside SM's web UI under `Publishing → Set Publishing Options`.

**What we can observe:**
- PETFINDERBREED, PETFINDERBREED2, PETFINDERSPECIES fields are populated on all animals, indicating Petfinder mapping IS configured in SM [VERIFIED]
- WEBSITEVIDEOURL is empty on all 479 animals, so even if the publisher is active, no video URLs are being sent to Petfinder [VERIFIED]

**What we cannot determine:**
- Whether the built-in Petfinder FTP publisher is enabled and running
- What FTP credentials are configured
- Whether a third-party integration handles the Petfinder feed instead
- The publisher schedule/frequency

**This needs confirmation from John or Gayle (SM admin).** Specifically:
1. Is SM's built-in Petfinder publisher enabled for RGCares?
2. If yes, is it the FTP-based publisher (the one that sends WEBSITEVIDEOURL as photo6)?
3. Or is Petfinder fed through a different mechanism (direct API, manual, etc.)?

---

## SUMMARY

| Question | Answer | Tag |
|---|---|---|
| WEBSITEVIDEOURL field exists in SM response? | YES — present on all 479 animals | [VERIFIED] |
| Any animal has it populated? | NO — 0/479 total, 0/142 adoptable | [VERIFIED] |
| WEBSITEVIDEOURL in csv_import? | NO — not an accepted field | [VERIFIED] |
| Any SM API write method can set it? | NO — csv_import is the only write method; it doesn't accept this field | [VERIFIED] |
| Our codebase reads it from SM? | NO — zero references | [VERIFIED] |
| Petfinder publisher config visible? | NO — not determinable read-only from VPS | [UNCERTAIN] |

### The Video-to-Petfinder Path

Based on the ASM source (prior report) plus this live verification:

1. **SM's Petfinder publisher** reads WEBSITEVIDEOURL and, if the URL contains `youtube.com/`, `youtu.be/`, or `vimeo.com/`, sends it as the photo6 slot in the Petfinder FTP upload.
2. **WEBSITEVIDEOURL cannot be set programmatically** through any SM service API method. It can only be set through the SM web UI.
3. **RGCares has never used WEBSITEVIDEOURL** — zero animals have it populated.

This means video-to-Petfinder via SM requires either:
- **Manual entry** in SM web UI (paste YouTube/Vimeo URLs per animal) — labor-intensive, not automatable
- **Direct SM database access** — not available via the service API; would require self-hosted SM or a feature request
- **Direct Petfinder API** — bypasses SM entirely; requires separate Petfinder API credentials and a custom integration
- **YouTube upload + SM manual link** — upload our mp4s to YouTube, then paste URLs into SM per animal

None of these are automatable through the existing SM service API infrastructure.
