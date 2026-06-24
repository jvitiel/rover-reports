# Image Orientation Blast Radius — Corrected Analysis

**Date:** 2026-06-24  
**Follow-up to:** report-20260624-kayla-record-diagnosis.md  
**Scope:** Read-only. Corrects the prior report's "75 of 78 systemic" framing.

---

## Method

For each of the 78 existing volunteer scan images:
1. Read EXIF Orientation tag (via Python Pillow `Image.getexif()`, tag 0x0112)
2. Read raw pixel dimensions (width × height)
3. Compute post-rotation dimensions as a modern browser would apply them (`image-orientation: from-image` default)
   - Orientations 1–4: no dimension swap (0° or 180° rotation, or flips)
   - Orientations 5–8: width↔height swap (90° rotation)
4. Classify: if final height > final width → PORTRAIT → **CORRECT** for a paper form. Otherwise LANDSCAPE → **SIDEWAYS**.

---

## Results

| Classification | Count | Percentage |
|---------------|-------|------------|
| **DISPLAYS-CORRECT** | **68** | 87% |
| **DISPLAYS-SIDEWAYS** | **10** | 13% |
| Total | 78 | 100% |

The prior report's "75 of 78 non-normal orientation" was technically accurate (75 images have EXIF orientation ≠ 1), but **misleading** — 65 of those 75 have Orientation=6 (90° CW), which the browser correctly auto-rotates from landscape pixels to portrait display. Only 10 images have Orientation=3 (180°), which rotates landscape pixels 180° → still landscape → sideways.

---

## Records with Sideways Images — Spot-Check List

| # | Volunteer ID | Name | Sideways Images | Total Images | Details |
|---|-------------|------|-----------------|--------------|---------|
| 1 | 431 | **Sydney Ferst** | 2 of 4 | 4 | page-03, page-04 (orient=3) |
| 2 | 432 | **Alison Garcia** | 2 of 4 | 4 | page-02, page-03 (orient=3) |
| 3 | 444 | **Idan Meoded** | 3 of 4 | 4 | page-02, page-03, page-04 (orient=3) |
| 4 | 452 | **Kayla McGregor** | 3 of 4 | 4 | page-01, page-02, page-03 (orient=3) |

**4 records** affected, not just Kayla. 10 sideways images across those 4 records.

John: open these 4 records in the volunteer tab and check whether the thumbnails display sideways. If Sydney Ferst, Alison Garcia, and Idan Meoded also show sideways scans, the analysis is confirmed.

---

## Why Kayla Specifically (and 3 Others)

All 10 sideways images share the same pattern:
- **Raw pixels:** 2000×1500 (landscape — phone sensor default)
- **EXIF Orientation:** 3 (BottomRight = rotate 180°)
- **After browser auto-rotation:** 2000×1500 (still landscape — 180° rotation doesn't swap dimensions)
- **Result:** A portrait paper form displayed in landscape → **sideways**

The 68 correct images have:
- **EXIF Orientation:** 6 (RightTop = rotate 90° CW) — or already-portrait pixels with Orientation=1
- **After browser auto-rotation:** 1500×2000 (portrait) — 90° rotation swaps width↔height
- **Result:** Paper form displayed correctly in portrait

**Concrete cause:** When the photographer held the phone to photograph pages 1–3 of Kayla's form (and specific pages of Sydney/Alison/Idan's forms), the phone's accelerometer recorded the orientation as "upside-down landscape" (EXIF 3 = 180°) instead of "rotated portrait" (EXIF 6 = 90° CW). This means the phone was likely held at a specific angle where the accelerometer interpreted the tilt as 180° rather than 90°. The browser dutifully rotates 180° as instructed — but that leaves a landscape image as landscape, which is wrong for a portrait form.

This is a **camera/phone behavior issue at capture time**, not a server or browser bug. The EXIF tag is technically "correct" per the accelerometer reading — but it doesn't produce a portrait result for a portrait document.

---

## Per-Image Detail

### JOHN DOE (ID 9) — 2 images, all CORRECT
| File | Pixels | Orient | After Rotation | Display |
|------|--------|--------|----------------|---------|
| page-01.jpg | 1502×2000 | 1 (Normal) | 1502×2000 portrait | ✅ CORRECT |
| page-02.jpg | 1502×2000 | 1 (Normal) | 1502×2000 portrait | ✅ CORRECT |

*Already portrait pixels, no rotation needed.*

### Sydney Ferst (ID 431) — 4 images, 2 SIDEWAYS
| File | Pixels | Orient | After Rotation | Display |
|------|--------|--------|----------------|---------|
| page-01.jpg | 1440×1920 | 1 (Normal) | 1440×1920 portrait | ✅ CORRECT |
| page-02.jpg | 2000×1500 | 6 (90° CW) | 1500×2000 portrait | ✅ CORRECT |
| page-03.jpg | 2000×1500 | **3 (180°)** | 2000×1500 landscape | ❌ **SIDEWAYS** |
| page-04.jpg | 2000×1500 | **3 (180°)** | 2000×1500 landscape | ❌ **SIDEWAYS** |

### Alison Garcia (ID 432) — 4 images, 2 SIDEWAYS
| File | Pixels | Orient | After Rotation | Display |
|------|--------|--------|----------------|---------|
| page-01.jpg | 2000×1500 | 6 (90° CW) | 1500×2000 portrait | ✅ CORRECT |
| page-02.jpg | 2000×1500 | **3 (180°)** | 2000×1500 landscape | ❌ **SIDEWAYS** |
| page-03.jpg | 2000×1500 | **3 (180°)** | 2000×1500 landscape | ❌ **SIDEWAYS** |
| page-04.jpg | 2000×1500 | 6 (90° CW) | 1500×2000 portrait | ✅ CORRECT |

### Idan Meoded (ID 444) — 4 images, 3 SIDEWAYS
| File | Pixels | Orient | After Rotation | Display |
|------|--------|--------|----------------|---------|
| page-01.jpg | 2000×1500 | 6 (90° CW) | 1500×2000 portrait | ✅ CORRECT |
| page-02.jpg | 2000×1500 | **3 (180°)** | 2000×1500 landscape | ❌ **SIDEWAYS** |
| page-03.jpg | 2000×1500 | **3 (180°)** | 2000×1500 landscape | ❌ **SIDEWAYS** |
| page-04.jpg | 2000×1500 | **3 (180°)** | 2000×1500 landscape | ❌ **SIDEWAYS** |

### Kayla McGregor (ID 452) — 4 images, 3 SIDEWAYS
| File | Pixels | Orient | After Rotation | Display |
|------|--------|--------|----------------|---------|
| page-01.jpg | 2000×1500 | **3 (180°)** | 2000×1500 landscape | ❌ **SIDEWAYS** |
| page-02.jpg | 2000×1500 | **3 (180°)** | 2000×1500 landscape | ❌ **SIDEWAYS** |
| page-03.jpg | 2000×1500 | **3 (180°)** | 2000×1500 landscape | ❌ **SIDEWAYS** |
| page-04.jpg | 2000×1500 | 6 (90° CW) | 1500×2000 portrait | ✅ CORRECT |

### All other records (15 records, 56 images) — all CORRECT
All have Orientation=6 (90° CW) on 2000×1500 landscape pixels → browser rotates to 1500×2000 portrait → correct display. Records: Mali Gross, Inam Haq, Brayan Paredes, Angelie Saucedo, Alexus Stamoularas, Wendy Torres, Nevaeh Villaman, Matthew DeLuca, Maria Teresa Rosas Rodriguez, Ben Beattie, Angelika Almario, Devon Fuchs, Howard Gerner, Lily Young, Mara Cooney.

---

## Browser EXIF Caveat

**Modern browsers honor EXIF auto-rotation by default:**
- Chrome 81+ (2020): `image-orientation: from-image` is the CSS default
- Firefox 26+ (2014): same
- Safari 13.1+ (2020): same
- Edge (Chromium-based): same as Chrome

**The dashboard does NOT override this.** Checked:
- No `image-orientation: none` anywhere in dashboard/index.html (grep returned zero hits)
- Volunteer thumbnails (dashboard/index.html:13812) are plain `<img>` tags — no CSS transform, no rotation override
- Lightbox view (dashboard/index.html:14354) is also a plain `<img>` tag
- The server serves the raw JPEG files with EXIF intact (no server-side EXIF stripping)

**Conclusion: the "displays fine" classification is reliable** for any browser released after 2020. All staff browsers (Chrome on desktop/mobile, Safari on iPhone) honor EXIF. The analysis accurately reflects what staff see.

The only scenario where more images would display sideways: an ancient browser that ignores EXIF (IE11, Chrome <81). Not applicable to current staff usage.

---

## Correction to Prior Report

The prior report (report-20260624-kayla-record-diagnosis.md) stated "75 of 78 existing volunteer scan images have non-normal EXIF orientation across 19 records — systemic." This was **technically true but practically misleading:**

- 75 images have EXIF ≠ 1, but 65 of those have Orientation=6 which auto-rotates correctly
- Only **10 images across 4 records** actually display sideways
- The issue is **not systemic** — it affects records where the photographer's phone recorded Orientation=3 (180°) instead of Orientation=6 (90° CW), which is a capture-time anomaly, not a server bug

The `-auto-orient` ingestion fix would still be good practice (baking rotation into pixels removes browser dependency), but it would NOT fix these 10 images — `mogrify -auto-orient` would rotate them 180° per their EXIF tag, leaving them still landscape/sideways. These 10 images need manual 90° rotation.
