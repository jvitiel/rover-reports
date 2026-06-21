# Slot-1 Selection Diagnosis — Wrong Photo in Main Display — 2026-06-21

## Q1: Slot-1 Assignment Logic

Slot-1 assignment for SM-synced animals happens in **two stages** during the nightly SM Photo Sync job (server.ts:12000-12119):

### Stage 1: Photo Ingest (server.ts:12022-12088)

Photos from `allPhotoUrls` (SM's `PHOTOURLS` array) are inserted one at a time via `insertAnimalMedia()`. The source is `'sm-sync'`:

```typescript
// server.ts:12067-12078
insertAnimalMedia({
  shelterCode: animal.shelterCode,
  mediaType: 'photo',
  source: 'sm-sync',        // ← this source
  filePath: '',
  fileUrl: url,
  // ...
});
```
[VERIFIED — server.ts:12067-12078]

`insertAnimalMedia` (localDatabase.ts:4848-4852) has an auto-fill mechanism that assigns strip positions, but it ONLY fires for `source === 'sm'`, `source === 'profiler'`, or `tagMarketing === true`:

```typescript
// localDatabase.ts:4848-4852
const shouldAutoFill = 
  params.source === 'profiler' || 
  params.source === 'sm' ||          // ← NOT 'sm-sync'
  params.tagMarketing;
```
[VERIFIED — localDatabase.ts:4848-4852]

**`'sm-sync'` photos do NOT auto-fill strip positions.** They are inserted at `strip_position = 0` (library). [VERIFIED — localDatabase.ts:4826, the INSERT statement hardcodes `0` for strip_position]

### Stage 2: websiteMediaId Promotion (server.ts:12090-12114)

After all photos are inserted, the sync tries to promote the SM-preferred photo to slot 1:

```typescript
// server.ts:12090-12114
const websiteMediaId = animal.websiteMediaId;
if (websiteMediaId) {
  const slot1Row = db.prepare(`
    SELECT id FROM animal_media
    WHERE shelter_code = ? AND strip_position = 1
    LIMIT 1
  `).get(animal.shelterCode);

  if (slot1Row) {
    console.log(`[SM Photo Sync] Slot 1 occupied for ${animal.shelterCode}, skipping websiteMediaId fill`);
  } else {
    const matchingRow = db.prepare(`
      SELECT id FROM animal_media
      WHERE shelter_code = ? AND source_media_id = ?
      LIMIT 1
    `).get(animal.shelterCode, String(websiteMediaId));

    if (matchingRow) {
      addPhotoToStrip(matchingRow.id, 1);
    }
  }
}
```
[VERIFIED — server.ts:12090-12114]

### The Bug: Slot-1 Promotion Is One-Shot

The websiteMediaId block **skips if slot 1 is already occupied**. It never checks whether the *current* slot-1 photo matches the *current* WEBSITEMEDIAID. This means:

1. First sync: Photo A is the SM-preferred photo → synced, promoted to slot 1. ✅
2. Staff changes preferred photo in SM from A to B.
3. Next sync: Photo B is synced to library (strip_position=0). websiteMediaId block sees slot 1 occupied by A → **skips**. Photo B stays in library. ❌

**The rule: slot-1 gets the SM-preferred photo on first sync only. Subsequent SM preference changes are silently ignored.**

There is also a secondary source of mismatches: some animals have older `source='sm'` photos (from an earlier sync mechanism) that DID auto-fill strip positions. These occupy slots before `sm-sync` photos arrive, and the websiteMediaId block sees slot-1 already taken.

---

## Q2: SM Preferred-Photo Field

### Raw SM API Response for S2026454 (Scarecrow)

Relevant media fields from `json_shelter_animals` response:

```
ANIMALPHOTO: 5452
DOCMEDIADATE: 2026-06-19T17:25:14.152714
DOCMEDIAID: 9476
DOCMEDIANAME: 9476.jpg
PHOTOURLS: ["https://service.sheltermanager.com/asmservice?account=gw3095&method=media_image&mediaid=9476&ts=1781889914.0"]
RECENTLYCHANGEDIMAGES: 2
WEBSITEIMAGECOUNT: 1
WEBSITEMEDIADATE: 2026-06-19T17:25:14.152714
WEBSITEMEDIAID: 9476
WEBSITEMEDIANAME: 9476.jpg
WEBSITEMEDIANOTES: IMG_5391.jpeg
WEBSITEVIDEOMIMETYPE: None
WEBSITEVIDEONOTES: None
WEBSITEVIDEOURL: None
```
[VERIFIED — live API call to `json_shelter_animals`, S2026454]

### Distinguishing Fields

| Field | Meaning |
|-------|---------|
| **`WEBSITEMEDIAID`** | The mediaid of the photo marked for web/public display (globe icon in SM). This is the SM-preferred photo. |
| **`WEBSITEMEDIANAME`** | Filename of the preferred photo |
| **`WEBSITEMEDIADATE`** | Timestamp of the preferred photo |
| **`ANIMALPHOTO`** | A different ID (not mediaid) — appears to be the first media attachment sequence number. NOT the preferred photo marker. |
| **`PHOTOURLS`** | Array of published photo URLs. The preferred photo is always first (see Q4). |

The `json_shelter_animals` endpoint does NOT expose per-photo `EXCLUDEFROMPUBLISH` or `WEBSITEPHOTO` flags — it only returns the aggregate `PHOTOURLS` array (which contains only the publish-approved photos) and `WEBSITEMEDIAID` (which identifies the preferred one). Photos excluded from publish are simply absent from `PHOTOURLS`.

[VERIFIED — full field dump of S2026454, no EXCLUDEFROMPUBLISH/WEBSITEPHOTO fields present]

The response does NOT include individual media records with per-photo flags. To see per-photo publish/exclude status, a separate SM API call (e.g., `animal_media` method) would be needed, but we don't currently make that call. [INFERRED — based on field absence in json_shelter_animals]

---

## Q3: Concrete Mismatch on S2026454

### SM State

- `WEBSITEMEDIAID`: **9476** (the SM-preferred photo)
- `PHOTOURLS`: `[mediaid=9476]` (only one published photo)

### Our DB State

| strip_position | source_media_id | source | Status |
|----------------|----------------|--------|--------|
| 0 (library) | **9476** | sm-sync | ← **SM PREFERRED — stuck in library** |
| 1 (slot-1) | **8993** | sm-sync | ← **WRONG — displayed as main photo** |

[VERIFIED — `SELECT ... FROM animal_media WHERE shelter_code='S2026454'`]

**Verdict**: Our slot-1 shows mediaid 8993 (an older/removed photo). The SM-preferred photo (mediaid 9476) sits in the library at strip_position=0. mediaid 8993 is NOT in SM's current `PHOTOURLS` array — SM removed it from publish, but our DB still shows it as the primary photo.

---

## Q3b: Systemic Check

### 4 Additional Animals

**A2023030:**
| pos | mediaid | source | |
|-----|---------|--------|-|
| 0 | 8732 | sm-sync | ← SM PREFERRED (in library) |
| 0 | 8733 | sm-sync | |
| 1 | 7947 | sm | ← SLOT-1 (wrong) |

**A2024048:**
| pos | mediaid | source | |
|-----|---------|--------|-|
| 1 | 8484 | sm | ← SLOT-1 (wrong) |
| 2 | **7852** | sm | ← SM PREFERRED (at position 2!) |
| 3-6 | various | sm | |
| 0 | 5 more | sm-sync | in library |

**S2026294:**
| pos | mediaid | source | |
|-----|---------|--------|-|
| 1 | 8622 | sm-sync | ← SLOT-1 (wrong, created 2026-04-18) |
| 0 | **9384** | sm-sync | ← SM PREFERRED (created 2026-06-13, stuck in library) |

**A2025233:**
| pos | mediaid | source | |
|-----|---------|--------|-|
| 0 | **8629** | sm-sync | ← SM PREFERRED (in library) |
| 0 | 8630 | sm-sync | |
| 1 | 7642 | sm | ← SLOT-1 (wrong) |
| 2 | 7641 | sm | |

[VERIFIED — sqlite3 queries per animal, cross-referenced with SM API WEBSITEMEDIAID]

### Blast Radius

| Category | Count |
|----------|-------|
| Total slot-1 photo rows | 675 |
| Match SM preferred (correct) | 303 |
| **MISMATCH (wrong photo in slot 1)** | **158** |
| Not in current SM response (archived/unavailable) | 214 |
| No WEBSITEMEDIAID in SM | 0 |

**Of the 461 animals currently in SM with a WEBSITEMEDIAID: 158 (34.3%) have the wrong photo in slot 1.**

[VERIFIED — programmatic comparison: all slot-1 source_media_id vs SM WEBSITEMEDIAID for all 675 slot-1 rows]

Breakdown of wrong-slot-1 by source:
| source of wrong slot-1 | Count |
|------------------------|-------|
| sm-sync | 120 |
| sm (older sync) | 15 |
| dashboard-upload | 1 |
| activity | 2 |

The majority (120/158) are sm-sync photos that were correct when first promoted but became wrong when SM's preferred photo changed. The remaining 38 are from older `source='sm'` auto-fill that pre-empted the websiteMediaId promotion.

---

## Q4: PHOTOURLS Ordering

**PHOTOURLS[0] is ALWAYS the WEBSITEMEDIAID (SM-preferred photo).**

| Condition | Count |
|-----------|-------|
| PHOTOURLS[0] mediaid == WEBSITEMEDIAID | **475** |
| PHOTOURLS[0] mediaid != WEBSITEMEDIAID | **0** |
| No WEBSITEMEDIAID | 32 |

[VERIFIED — programmatic check across all 507 SM animals]

This means:
- The correct photo is always available as `PHOTOURLS[0]` → `normalizeAnimal` sets it as `photoUrl` (shelterManagerService.ts:46)
- The correct photo is also identified by `WEBSITEMEDIAID` → `normalizeAnimal` exposes it as `websiteMediaId` (shelterManagerService.ts:79-83)
- **No additional SM API field or call is needed.** Both the ordered array and the explicit ID are already fetched and available.

---

## Q5: Fix Surface (Read-Only — No Changes Made)

### Root Cause

The websiteMediaId promotion block (server.ts:12090-12114) is **fire-once**: it only promotes when slot 1 is empty. When SM changes the preferred photo, the sync never corrects slot 1.

### Fix Location

**server.ts:12093-12114** — the `websiteMediaId` block in `runNightlySMPhotoSync()`.

The fix requires changing the logic from:
- "If slot 1 empty, promote websiteMediaId" (current)

To:
- "If slot 1 exists but its `source_media_id` ≠ current `websiteMediaId`, swap: demote current slot-1 to library, promote the correct photo to slot 1" (needed)

### Signal Availability

**All needed data is already fetched:**
- `animal.websiteMediaId` — available on the normalized animal object (shelterManagerService.ts:79-83) [VERIFIED]
- `source_media_id` on the current slot-1 row — available via the existing DB query (server.ts:12093-12097) [VERIFIED — query exists but only checks for row existence, not mediaid match]
- The correct photo's `animal_media.id` — available via the existing `source_media_id` lookup (server.ts:12104-12106) [VERIFIED]

**No additional SM API field or endpoint is required.** The fix is purely in the sync logic: compare existing slot-1's `source_media_id` against current `websiteMediaId`, and swap if mismatched.

### Supporting Functions Already Exist

- `removePhotoFromStrip(mediaId)` (localDatabase.ts:4992-5008) — sets `strip_position = 0` and shifts remaining positions [VERIFIED]
- `addPhotoToStrip(mediaId, position)` (localDatabase.ts:4936-4990) — sets `strip_position` to specified position with cascade [VERIFIED]

Both are already imported and used in the sync path. The fix is a conditional branch addition, not new infrastructure.

### Scope Consideration

The fix should also handle the case where the correct photo's `animal_media` row doesn't exist yet (e.g., newly uploaded to SM but not yet synced). In the current code flow, photo ingest runs BEFORE the websiteMediaId block, so the row should already exist by the time the promotion check runs — but a guard is prudent.
