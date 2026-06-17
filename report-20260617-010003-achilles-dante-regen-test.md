# Achilles & Dante Regeneration Test

**Date:** 2026-06-17 01:00 UTC  
**Scope:** Two curl calls only. No code changes, no build, no restart, no SM write.

---

## A2025088 — Achilles

### Endpoint Response

```
POST /api/bio/generate/A2025088 → success: true
```

[VERIFIED]

### New animal_bio_drafts Row

| Field | Value |
|---|---|
| shelter_code | A2025088 |
| last_source | full_generate |
| source_long | from_profile |
| source_short | from_profile |
| promoted_long | 0 (pending) |
| promoted_short | 0 (pending) |
| generated_at | 2026-06-17T00:59:39.585Z |
| bio_en_long | **756 chars** |
| bio_es_long | **786 chars** |
| bio_en_short | **245 chars** |
| bio_es_short | **281 chars** |

All 4 fields populated. Source is profile path (`full_generate` / `from_profile`). [VERIFIED]

### Content Preview (~15 words each)

| Field | Preview |
|---|---|
| bio_en_long | Meet Achilles, a strikingly handsome mixed breed with a coat of black and brown spots... |
| bio_es_long | Conoce a Aquiles, un hermoso perro mestizo con un pelaje de manchas negras y marrones... |
| bio_en_short | Achilles is a lively three-year-old with a stunning smile and boundless energy. Ideal for families... |
| bio_es_short | Aquiles es un vivaz de tres años con una sonrisa deslumbrante y energía sin límites... |

All 4 are real AI-generated content from the caregiver profile — not raw SM copy, not template text. Mentions profile-derived attributes (coat, spots, smile, energy). [VERIFIED]

### Existing animal_bios Row — UNCHANGED

| Field | Before | After |
|---|---|---|
| last_source | sm_copy | sm_copy |
| bio_en_long | 511 chars | 511 chars |
| bio_es_long | 0 | 0 |
| bio_en_short | 0 | 0 |
| bio_es_short | 0 | 0 |
| status_long | draft | draft |
| status_short | draft | draft |

Partial sm_copy row completely untouched. [VERIFIED]

---

## S20241099 — Dante

### Endpoint Response

```
POST /api/bio/generate/S20241099 → success: true
```

[VERIFIED]

### New animal_bio_drafts Row

| Field | Value |
|---|---|
| shelter_code | S20241099 |
| last_source | full_generate |
| source_long | from_profile |
| source_short | from_profile |
| promoted_long | 0 (pending) |
| promoted_short | 0 (pending) |
| generated_at | 2026-06-17T00:59:51.233Z |
| bio_en_long | **860 chars** |
| bio_es_long | **933 chars** |
| bio_en_short | **211 chars** |
| bio_es_short | **238 chars** |

All 4 fields populated. Source is profile path (`full_generate` / `from_profile`). [VERIFIED]

### Content Preview (~15 words each)

| Field | Preview |
|---|---|
| bio_en_long | Meet Dante, our delightful black and white tuxedo cat with a heart as big as... |
| bio_es_long | Conoce a Dante, nuestro encantador gato de esmoquin blanco y negro con un corazón tan... |
| bio_en_short | Dante, our black and white tuxedo dynamo, is a playful and loving cat full of... |
| bio_es_short | Dante, nuestro dinámico esmoquin blanco y negro, es un gato juguetón y amoroso ¡lleno de... |

All 4 are real AI-generated content from the caregiver profile (3 behavior_notes). Mentions profile-derived attributes (tuxedo, playful, loving). [VERIFIED]

### Existing animal_bios Row — UNCHANGED

| Field | Before | After |
|---|---|---|
| last_source | backfill | backfill |
| bio_en_long | 674 chars | 674 chars |
| bio_es_long | 719 chars | 719 chars |
| bio_en_short | 0 | 0 |
| bio_es_short | 0 | 0 |
| status_long | approved | approved |
| status_short | draft | draft |

Partial backfill row completely untouched. [VERIFIED]

---

## Control Group — UNTOUCHED

```sql
SELECT shelter_code FROM animal_bio_drafts 
WHERE shelter_code IN ('A2023267','A2026050','S2024694','S20251236');
-- Result: (empty — 0 rows)
```

No new or changed draft rows for any of the 4 control animals. [VERIFIED]

---

## No SM Write

Both calls use `getAnimalById(shelterCode, true)` which is a read-only SM API fetch. The `generateAnimalBio()` call goes to GPT-4o (OpenAI), not SM. `saveAnimalBioDraft()` writes only to the local `animal_bio_drafts` table. No SM write endpoint was called. [VERIFIED — traced in prior report, confirmed by endpoint code at server.ts:2101-2127]

---

## Summary

| Animal | Draft Created | All 4 Fields | Source | Existing Bio | Control Group |
|---|---|---|---|---|---|
| A2025088 (Achilles) | ✅ | ✅ (756/786/245/281) | from_profile | Unchanged (sm_copy) | N/A |
| S20241099 (Dante) | ✅ | ✅ (860/933/211/238) | from_profile | Unchanged (backfill) | N/A |
| A2023267 (Cookie) | — | — | — | — | ✅ No draft |
| A2026050 (Bolt) | — | — | — | — | ✅ No draft |
| S2024694 (Isis) | — | — | — | — | ✅ No draft |
| S20251236 (Blizzard) | — | — | — | — | ✅ No draft |

Both test animals now have complete pending drafts (all 4 bio fields, from_profile source, promoted=0) ready for staff review in the dashboard. The production generation chain (`generateBioDraftForAnimal` → `generateAnimalBio` → `saveAnimalBioDraft`) works correctly for animals with existing partial `animal_bios` rows. [VERIFIED]
