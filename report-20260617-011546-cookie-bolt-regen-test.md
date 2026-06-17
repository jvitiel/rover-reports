# Cookie & Bolt Regeneration Test (SM-Generate Path)

**Date:** 2026-06-17 01:15 UTC  
**Scope:** Two curl calls only. No code changes, no build, no restart, no SM write.

---

## A2023267 — Cookie

### Endpoint Response

```
POST /api/bio/generate/A2023267 → success: true
```

[VERIFIED]

### New animal_bio_drafts Row

| Field | Value |
|---|---|
| shelter_code | A2023267 |
| last_source | sm_generate |
| source_long | from_sm |
| source_short | from_sm |
| promoted_long | 0 (pending) |
| promoted_short | 0 (pending) |
| generated_at | 2026-06-17T01:15:23.403Z |
| bio_en_long | **927 chars** |
| bio_es_long | **994 chars** |
| bio_en_short | **247 chars** |
| bio_es_short | **265 chars** |

All 4 fields populated. Source is SM path (`sm_generate` / `from_sm`). No caregiver profile — confirmed SM-only generation. [VERIFIED]

### Content Preview (~25 words each)

| Field | Preview |
|---|---|
| bio_en_long | Meet Cookie, the delightful Pit Bull Terrier whose sweetness matches her name. At 8 years young, Cookie has been the longest resident at Rockland County... |
| bio_es_long | Conoce a Cookie, la encantadora Pit Bull Terrier cuya dulzura hace honor a su nombre. Con 8 años de edad, Cookie es la residente más... |
| bio_en_short | Cookie is the sweetest Pit Bull waiting for a forever family. She loves people, booty scratches, and adventures! Cookie's ideal home is one where she's... |
| bio_es_short | Cookie es la Pit Bull más dulce esperando una familia para siempre. ¡Ama a las personas, los rasca-traseros y las aventuras! Su hogar ideal es... |

All 4 are real AI-generated content from the SM ANIMALCOMMENTS. The long bio weaves in SM details (longest resident, 8 years, sweetness) into a polished narrative. The short bio captures key personality traits. Spanish translations are natural, not robotic. Not a raw echo of the SM text — significantly rewritten and expanded/compressed as appropriate. [VERIFIED]

### Existing animal_bios Row — UNCHANGED

| Field | Before | After |
|---|---|---|
| last_source | sm_copy | sm_copy |
| bio_en_long | 929 chars | 929 chars |
| bio_es_long | 0 | 0 |
| bio_en_short | 0 | 0 |
| bio_es_short | 0 | 0 |
| status_long | draft | draft |
| status_short | draft | draft |

Partial sm_copy row completely untouched. [VERIFIED]

---

## A2026050 — Bolt

### Endpoint Response

```
POST /api/bio/generate/A2026050 → success: true
```

[VERIFIED]

### New animal_bio_drafts Row

| Field | Value |
|---|---|
| shelter_code | A2026050 |
| last_source | sm_generate |
| source_long | from_sm |
| source_short | from_sm |
| promoted_long | 0 (pending) |
| promoted_short | 0 (pending) |
| generated_at | 2026-06-17T01:15:33.370Z |
| bio_en_long | **686 chars** |
| bio_es_long | **699 chars** |
| bio_en_short | **181 chars** |
| bio_es_short | **175 chars** |

All 4 fields populated. Source is SM path (`sm_generate` / `from_sm`). [VERIFIED]

### Content Preview (~25 words each)

| Field | Preview |
|---|---|
| bio_en_long | Meet Bolt, the delightfully energetic Husky with a heart full of adventure! At just over a year old, Bolt is a playful bundle of joy,... |
| bio_es_long | Conoce a Bolt, ¡el husky lleno de energía y aventuras! Con poco más de un año, Bolt es un torbellino juguetón, siempre listo para una... |
| bio_en_short | Meet Bolt, the playful Husky with a knack for adventure! He's social, loves a good run, and is perfect for energetic families. Ready to make... |
| bio_es_short | Conoce a Bolt, el husky juguetón amante de la aventura. Es sociable, le encanta correr y es ideal para familias enérgicas. ¿Listo para tener un... |

All 4 are real AI-generated content from SM description. Captures SM details (1 year old, playful, adventure buddy, social) in polished prose. Short bio is a tight summary. Spanish is natural. [VERIFIED]

### Existing animal_bios Row — UNCHANGED

| Field | Before | After |
|---|---|---|
| last_source | sm_copy | sm_copy |
| bio_en_long | 577 chars | 577 chars |
| bio_es_long | 0 | 0 |
| bio_en_short | 0 | 0 |
| bio_es_short | 0 | 0 |
| status_long | draft | draft |
| status_short | draft | draft |

[VERIFIED]

---

## Control Group — UNTOUCHED

```sql
SELECT shelter_code FROM animal_bio_drafts 
WHERE shelter_code IN ('S2024694','S20251236');
-- Result: (empty — 0 rows)
```

No new or changed draft rows for Isis or Blizzard. [VERIFIED]

---

## No SM Write

Both calls use `getAnimalById(shelterCode, true)` — read-only SM fetch. `generateAnimalBio()` calls GPT-4o (OpenAI). `saveAnimalBioDraft()` writes to local `animal_bio_drafts` only. No SM write endpoint called. [VERIFIED]

---

## SM-Generate Quality Assessment

| Metric | Cookie (A2023267) | Bolt (A2026050) | Profile-path comparison (Achilles/Dante) |
|---|---|---|---|
| All 4 fields populated | ✅ | ✅ | ✅ |
| EN long length | 927 chars | 686 chars | 756/860 chars |
| ES long length | 994 chars | 699 chars | 786/933 chars |
| EN short length | 247 chars | 181 chars | 245/211 chars |
| ES short length | 265 chars | 175 chars | 281/238 chars |
| Source material | SM comment only (929/577 chars) | SM comment only | Profile + SM |
| Raw echo of SM text? | No — rewritten | No — rewritten | No |
| Spanish quality | Natural, fluent | Natural, fluent | Natural, fluent |

**Assessment:** The `sm_generate` path produces complete, quality 4-field bios from SM text alone. Output lengths are comparable to the profile path. Content is genuinely rewritten — not raw SM text echoed back. Spanish translations are natural. No gaps, no empty fields, no quality issues compared to the `full_generate` path. The SM comment provides enough seed material for GPT-4o to produce polished adoption bios. [VERIFIED]

The only qualitative difference: profile-path bios (Achilles/Dante) include more granular behavioral details (energy level, good-with assessments, special features) because the caregiver profile is richer than an SM comment. SM-path bios are necessarily limited to what the SM comment contains. This is expected and acceptable — the SM bios read well as standalone adoption copy. [INFERRED — quality judgment based on content preview]

---

## Summary

| Animal | Draft Created | All 4 Fields | Source | Existing Bio | Control |
|---|---|---|---|---|---|
| A2023267 (Cookie) | ✅ | ✅ (927/994/247/265) | from_sm | Unchanged (sm_copy) | N/A |
| A2026050 (Bolt) | ✅ | ✅ (686/699/181/175) | from_sm | Unchanged (sm_copy) | N/A |
| S2024694 (Isis) | — | — | — | — | ✅ No draft |
| S20251236 (Blizzard) | — | — | — | — | ✅ No draft |
