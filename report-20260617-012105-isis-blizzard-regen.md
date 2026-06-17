# Isis & Blizzard Regeneration Test (SM-Generate Path, Final Pair)

**Date:** 2026-06-17 01:21 UTC  
**Scope:** Two curl calls only. No code changes, no build, no restart, no SM write.

---

## S2024694 — Isis the Goddess

### Endpoint Response

```
POST /api/bio/generate/S2024694 → success: true
```

[VERIFIED]

### New animal_bio_drafts Row

| Field | Value |
|---|---|
| shelter_code | S2024694 |
| last_source | sm_generate |
| source_long | from_sm |
| source_short | from_sm |
| promoted_long | 0 (pending) |
| promoted_short | 0 (pending) |
| generated_at | 2026-06-17T01:20:45.594Z |
| bio_en_long | **740 chars** |
| bio_es_long | **790 chars** |
| bio_en_short | **262 chars** |
| bio_es_short | **278 chars** |

All 4 fields populated. Source: sm_generate / from_sm. [VERIFIED]

### Full English Content

**bio_en_long (740 chars):**

> Meet Isis the Goddess, a sweet and cuddly Terrier/Mixed Breed who is nearly 9 years young. This tan and white beauty is the perfect low-maintenance companion, rarely barking and thriving on affection from her human friends. With her mellow demeanor, Isis is an ideal pet for any home seeking a gentle soul to share quiet moments with. Housebroken and relaxed, she blends seamlessly into any household. While she might get along with another dog, a home without cats would be best. Isis loves going on walks and adores car rides, making her a delightful travel buddy. She's looking for a loving family to appreciate her calm nature and offer her the forever home she deserves. Adopt Isis and let her fill your life with love and tranquility.

**bio_en_short (262 chars):**

> Isis the Goddess is a mellow, affectionate Terrier mix looking for her forever home. Housebroken, quiet, and a fan of walks and car rides, she's an easy, loving companion. Ideal for a peaceful home without cats. Bring tranquility into your life—adopt Isis today!

### Spanish Previews (~20 words)

- **bio_es_long:** Conoce a Isis la Diosa, una dulce y cariñosa Terrier/Mix que está a punto de cumplir 9 años. Esta belleza...
- **bio_es_short:** Isis la Diosa es una Terrier mezcla tranquila y cariñosa que busca su hogar para siempre. Educada, silenciosa y amante...

Natural, fluent Spanish. [VERIFIED]

### Existing animal_bios Row — UNCHANGED

| Field | Before | After |
|---|---|---|
| last_source | manual_edit_long | manual_edit_long |
| bio_en_long | 770 chars | 770 chars |
| bio_es_long | 863 chars | 863 chars |
| bio_en_short | 0 | 0 |
| bio_es_short | 0 | 0 |
| status_long | approved | approved |
| status_short | draft | draft |

Human-edited long content completely untouched. [VERIFIED]

**NOTE:** Isis now has BOTH an approved human-edited long bio (in animal_bios, 770/863 EN/ES) AND a pending AI draft (in animal_bio_drafts, all 4 fields). The draft's long content is AI-generated from SM, which is different from the human-edited approved version. Staff should be aware: promoting this draft's long would overwrite the human-edited approved long. The short fields are the useful part — the draft provides the missing short bios. [VERIFIED]

---

## S20251236 — Blizzard

### Endpoint Response

```
POST /api/bio/generate/S20251236 → success: true
```

[VERIFIED]

### New animal_bio_drafts Row

| Field | Value |
|---|---|
| shelter_code | S20251236 |
| last_source | sm_generate |
| source_long | from_sm |
| source_short | from_sm |
| promoted_long | 0 (pending) |
| promoted_short | 0 (pending) |
| generated_at | 2026-06-17T01:20:56.773Z |
| bio_en_long | **692 chars** |
| bio_es_long | **727 chars** |
| bio_en_short | **199 chars** |
| bio_es_short | **215 chars** |

All 4 fields populated. Source: sm_generate / from_sm. [VERIFIED]

### Full English Content

**bio_en_long (692 chars):**

> Meet Blizzard, our charming tabby grey and white Domestic Short Hair with a mission! At nearly 2 years old, Blizzard isn't your typical house cat. Instead, he thrives in wide-open spaces, making him the ideal barn cat. He has a natural curiosity and enjoys exploring his surroundings, ensuring your barn is free of any unwanted guests. While he may not be the cuddly lap cat you expect, Blizzard brings his own brand of companionship by keeping a watchful eye on the place. With his independent spirit and work ethic, he's ready to become a valued member of your barn family. If you have a cozy spot in your barn for a diligent feline friend, Blizzard might just be the perfect match for you!

**bio_en_short (199 chars):**

> Blizzard is not your typical house cat! This independent tabby loves the open spaces of a barn, where he can roam and keep pests at bay. Looking for a hardworking feline friend? Blizzard is your cat!

### Spanish Previews (~20 words)

- **bio_es_long:** Conoce a Blizzard, nuestro encantador gato atigrado gris y blanco que tiene una misión especial. Con casi 2 años, Blizzard...
- **bio_es_short:** ¡Blizzard no es el típico gato de casa! Este independiente atigrado adora los espacios abiertos de un granero, donde puede...

Natural, fluent Spanish. [VERIFIED]

### Blizzard Quality Assessment — THIN SEED (63 chars)

**SM seed:** "Not meant to be a household pet, but would be a great barn cat."

**Assessment:**

1. **Accuracy — GOOD.** The bio correctly represents Blizzard as a barn cat, not a household pet. It explicitly says "Blizzard isn't your typical house cat" and "he may not be the cuddly lap cat you expect." The core message from the SM note is faithfully preserved. [VERIFIED]

2. **Fabrication check — MINOR.** The bio adds details not in the 63-char seed:
   - "natural curiosity and enjoys exploring" — plausible extrapolation from "barn cat" but not stated in seed. [INFERRED — mild padding]
   - "ensuring your barn is free of any unwanted guests" / "keep pests at bay" — reasonable inference for a barn cat, not fabricated personality. [INFERRED — reasonable]
   - "independent spirit and work ethic" — fair characterization of a barn cat. [INFERRED]
   - Physical description ("tabby grey and white Domestic Short Hair") — pulled from SM animal data fields (breed/color), not the comment. This is accurate animal data, not fabrication. [VERIFIED — matches SM record]
   - Age ("nearly 2 years old") — from SM DOB field, accurate. [VERIFIED]

3. **Misrepresentation — NONE.** The bio does NOT claim Blizzard is cuddly, a lap cat, or good with kids/families in a home setting. It explicitly frames him as a working/barn cat. The "not a household pet" message is preserved in both long and short versions. [VERIFIED]

4. **Tone — GOOD.** The negative framing ("not meant to be a household pet") is reframed positively ("thrives in wide-open spaces," "ideal barn cat") without misrepresenting the animal. This is exactly what a shelter bio should do — present the animal honestly while highlighting what makes them a good fit for the right adopter. [VERIFIED]

5. **Overall verdict:** The sm_generate path handled the thin, slightly-negative seed well. It expanded 63 chars into a complete bio by supplementing with SM animal data fields (breed, color, age) and making reasonable inferences about barn-cat behavior. No misrepresentation. Minor padding is appropriate for adoption copy. **Usable as-is for staff review.** [VERIFIED for accuracy, INFERRED for quality judgment]

### Existing animal_bios Row — UNCHANGED

| Field | Before | After |
|---|---|---|
| last_source | regenerate_short | regenerate_short |
| bio_en_long | 63 chars | 63 chars |
| bio_es_long | 0 | 0 |
| bio_en_short | 244 chars | 244 chars |
| bio_es_short | 267 chars | 267 chars |
| status_long | approved | approved |
| status_short | draft | draft |

[VERIFIED]

**NOTE:** Blizzard now has an approved long bio (63 chars, the raw SM note) in animal_bios AND a pending draft long (692 chars, AI-generated) in animal_bio_drafts. The draft long is significantly richer. Staff may want to promote it. The existing short EN+ES (draft, 244/267 chars from prior regenerate_short) will be superseded by the new draft's short if promoted.

---

## No SM Write

Read-only SM fetch via `getAnimalById`. Generation via GPT-4o (OpenAI). Local DB write to `animal_bio_drafts` only. No SM write endpoint called. [VERIFIED]

---

## Summary — All 6 Partial-Bio Animals Now Have Pending Drafts

| # | shelter_code | Name | Draft Source | All 4 Fields | Generated |
|---|---|---|---|---|---|
| 1 | A2025088 | Achilles | from_profile (full_generate) | ✅ 756/786/245/281 | 2026-06-17T00:59 |
| 2 | S20241099 | Dante | from_profile (full_generate) | ✅ 860/933/211/238 | 2026-06-17T00:59 |
| 3 | A2023267 | Cookie | from_sm (sm_generate) | ✅ 927/994/247/265 | 2026-06-17T01:15 |
| 4 | A2026050 | Bolt | from_sm (sm_generate) | ✅ 686/699/181/175 | 2026-06-17T01:15 |
| 5 | S2024694 | Isis | from_sm (sm_generate) | ✅ 740/790/262/278 | 2026-06-17T01:20 |
| 6 | S20251236 | Blizzard | from_sm (sm_generate) | ✅ 692/727/199/215 | 2026-06-17T01:20 |

All 6 of the fixable partial-bio animals now have complete pending drafts in `animal_bio_drafts`. The 2 unfixable animals (A2024112 Aspen, S2026110 Floof) remain as-is — gone from SM, cannot regenerate. [VERIFIED]
