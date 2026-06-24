# Kayla McGregor Record Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only. Two problems on volunteer record #452 (source = paper_ocr).

---

## PROBLEM 1: "Invalid Date"

### 1. Stored Value

```sql
SELECT id, full_name, submitted_at, submission_source FROM volunteers WHERE id = 452;
```
| Column | Value |
|--------|-------|
| id | 452 |
| full_name | Kayla McGregor |
| **submitted_at** | **`June 9th 2026`** |
| submission_source | paper_ocr |
| created_at | 2026-06-22 21:14:34 |

The `submitted_at` column contains the raw handwritten text `June 9th 2026` — verbatim OCR extraction, not a parseable date.

### 2. Why "Invalid Date"

The volunteer table renderer (dashboard/index.html:14208):
```js
const dateStr = v.submitted_at
  ? new Date(v.submitted_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
  : '';
```

`new Date('June 9th 2026')` → **Invalid Date**. JavaScript's `Date` constructor cannot parse the ordinal suffix "9th". Formats like `June 9 2026` or `6/9/2026` would work, but `June 9th 2026` does not.

### 3. Why Manual Edits Don't Stick — READ/WRITE FIELD MISMATCH

**The dashboard TABLE reads:** `submitted_at` (the top-level DB column, line 14208)

**The dashboard EDIT FORM edits:** `vf-todays_date` (an input field labeled "Date on Form", line 6285), which maps to `formData.personal.todays_date` (line 13858)

**The PATCH endpoint writes:** `updates.form_data = JSON.stringify(formData)` (server.ts:10109) — it saves `todays_date` into the `form_data` JSON blob. It does **NOT** update the `submitted_at` column.

**The table reads `submitted_at`, but the edit saves to `form_data.personal.todays_date`.** They are different fields. John edits the date, saves successfully, but the table still reads the original untouched `submitted_at = 'June 9th 2026'`.

The PATCH endpoint (server.ts:10074–10150) handles `full_name`, `email`, `cell_phone`, `home_phone`, `address_city`, `address_state`, `age_18_or_older`, `training_start_date`, `status`, `notes` — but **not `submitted_at`**. The date field has no write path to the column the table reads.

### 4. OCR Ingestion Path

The OCR prompt (server.ts:9131) instructs: "Extract exactly what is written" for `todays_date`. The model returns the raw handwritten text.

The POST endpoint (server.ts:9488):
```ts
submitted_at: p.todays_date || now,
```

Whatever the OCR extracts goes directly into `submitted_at` with no date normalization. "June 9th 2026" was the handwritten text → stored verbatim.

### 5. How Many Others Affected

```sql
SELECT id, full_name, submitted_at FROM volunteers
WHERE submitted_at NOT LIKE '____-__-__%' AND submitted_at IS NOT NULL;
```

**22 records** have non-ISO `submitted_at` values. Of these, only **1** (Kayla McGregor, `June 9th 2026`) fails JavaScript `new Date()` parsing — the ordinal suffix "9th" breaks it.

The other 21 use slash/dot formats (`5/9/26`, `05/30/26`, `4.27.26`, etc.) which JavaScript parses successfully. They display valid dates in the dashboard. Examples:

| ID | Name | submitted_at | JS Parses? |
|----|------|-------------|------------|
| 438 | ALEXUS STAMOULARAS | 4.27.26 | ✅ (4/27/2026) |
| 446 | Devon Fuchs | 6/1/26 | ✅ (6/1/2026) |
| **452** | **Kayla McGregor** | **June 9th 2026** | **❌ Invalid Date** |

**Currently 1 broken record.** But any future OCR extraction with ordinals ("1st", "2nd", "3rd", "th") or spelled-out months with suffixes will also break. The systemic issue is the lack of date normalization at ingestion.

---

## PROBLEM 2: Sideways Images

### 6. Image Storage + Rendering

**Files:** `/home/shelter/shelter-apps/data/volunteer-files/da10d71e-ddbe-476b-8d09-b25f1f540ad5/`
- page-01.jpg, page-02.jpg, page-03.jpg, page-04.jpg

**Thumbnail render** (dashboard/index.html:13811–13812):
```js
volFileUrls.forEach((url, i) => {
  thumbsEl.innerHTML += `<img class="vol-scan-thumb" src="${url}" alt="Page ${i+1}" onclick="volOpenScan('${url}')">`;
});
```

**Lightbox render** (dashboard/index.html:14354–14357):
```js
overlay.innerHTML = `<button class="vol-lightbox-close">&times;</button><img src="${url}" alt="Scan">`;
```

Plain `<img>` tags, no CSS `image-orientation`, no `transform: rotate()`. No EXIF handling in the HTML.

### 7. EXIF Orientation Analysis

| File | EXIF Orientation | Meaning | Raw Pixels | After Browser Auto-Rotate | Display Result |
|------|-----------------|---------|------------|--------------------------|----------------|
| page-01.jpg | **3** (BottomRight) | Rotate 180° | 2000×1500 landscape | Still 2000×1500 landscape (flipped) | **SIDEWAYS** ❌ |
| page-02.jpg | **3** (BottomRight) | Rotate 180° | 2000×1500 landscape | Still 2000×1500 landscape (flipped) | **SIDEWAYS** ❌ |
| page-03.jpg | **3** (BottomRight) | Rotate 180° | 2000×1500 landscape | Still 2000×1500 landscape (flipped) | **SIDEWAYS** ❌ |
| page-04.jpg | **6** (RightTop) | Rotate 90° CW | 2000×1500 landscape | Becomes 1500×2000 portrait | **CORRECT** ✅ |

**Explanation:** These are phone photos of a paper form held in portrait. The phone sensor captures landscape pixels (2000×1500) and writes an EXIF orientation tag indicating how to rotate for correct viewing.

- Pages 1–3: EXIF says "rotate 180°" — the browser rotates, but the result is still landscape (upside-down landscape → right-side-up landscape). The form is still sideways because the camera was held at 90° to the form. The EXIF tag is **wrong** — it should be 6 (90° CW) or 8 (90° CCW) for these images.
- Page 4: EXIF says "rotate 90° CW" → landscape becomes portrait → correct for a paper form.

The browser IS applying the EXIF orientation (modern browsers default to `image-orientation: from-image`). The problem is that pages 1–3 have the **wrong EXIF orientation tag** — the photographer held the phone differently for those shots, and the phone's accelerometer recorded a 180° rotation instead of 90°.

### 8. Where the Fix Belongs

**At ingestion** (server.ts:9271):
```ts
execSync(`convert "${filePath}" -resize "2000x2000>" -quality 85 "${filePath}"`, { timeout: 15000 });
```

The ImageMagick `convert` command resizes but does **NOT** include `-auto-orient`. Adding `-auto-orient` would:
1. Read the EXIF orientation tag
2. Physically rotate the pixel data to match
3. Reset the orientation tag to 1 (Normal)

This bakes the rotation into the image file so it displays correctly everywhere, regardless of browser EXIF support.

**Recommended fix:** Add `-auto-orient` to the convert command:
```ts
execSync(`convert "${filePath}" -auto-orient -resize "2000x2000>" -quality 85 "${filePath}"`, { timeout: 15000 });
```

**However:** For Kayla's pages 1–3, `-auto-orient` would rotate 180° (per the EXIF tag), which would make them right-side-up but still landscape (sideways). The EXIF tag itself is wrong for those images. Those 3 images need manual 90° rotation to fix. The `-auto-orient` fix prevents future occurrences where the EXIF tag is correct.

**Display-side fix** (optional, belt-and-suspenders): Add CSS `image-orientation: from-image` to `.vol-scan-thumb` and lightbox `<img>`. This is already the browser default in modern browsers, so it's redundant but explicit.

### 9. How Many Others Affected

**75 of 78 existing volunteer scan images** (96%) have non-normal EXIF orientation (orientation ≠ 1), across **19 records**.

Of these, how many display incorrectly depends on whether their EXIF tag is accurate:
- If EXIF is correct (e.g., Orientation=6 for a portrait photo): browser auto-rotates correctly → displays fine
- If EXIF is wrong (like Kayla's pages 1–3): browser applies the wrong rotation → still sideways

Without checking every image, we can't tell how many have incorrect EXIF tags. But the `-auto-orient` fix at ingestion would at least bake in whatever rotation the tag specifies, eliminating the dependency on browser support and making any remaining wrong-tag images easier to identify (they'd be physically rotated wrong, not just displayed wrong).

The 75 images with non-normal orientation are already stored. To fix them retroactively:
```bash
mogrify -auto-orient /home/shelter/shelter-apps/data/volunteer-files/*/page-*.jpg
```
This would bake in the EXIF rotation for all existing images. Images with correct EXIF tags would display the same as before; images with wrong tags would at least have the rotation baked in (making manual correction easier).
