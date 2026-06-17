# Partial Bio Fix Plan — Per-Animal Diagnosis

**Date:** 2026-06-17 00:20 UTC  
**Scope:** Read-only diagnosis. No changes made.

---

## 1. Source Data Per Animal

| shelter_code | Name | behavior_notes | SM Description | SM Length | Current Source |
|---|---|---|---|---|---|
| A2025088 | Achilles | **1** (profile) | YES | 511 chars | sm_copy |
| A2023267 | Cookie | 0 | YES | 929 chars | sm_copy |
| A2026050 | Bolt | 0 | YES | 577 chars | sm_copy |
| A2024112 | Aspen | 0 | **GONE FROM SM** | N/A | backfill |
| S2026110 | Floof (Mom) | 0 | **GONE FROM SM** | N/A | backfill |
| S20241099 | Dante | **3** (profile) | YES | 672 chars | backfill |
| S2024694 | Isis the Goddess | 0 | YES | 770 chars | manual_edit_long |
| S20251236 | Blizzard | 0 | YES | 63 chars | regenerate_short |

[VERIFIED — behavior_notes via sqlite3 COUNT, SM descriptions via batch endpoint + generate endpoint 404 test]

**Key findings:**
- A2025088 (Achilles) has a caregiver profile AND SM description — best regeneration input [VERIFIED]
- S20241099 (Dante) has 3 behavior_notes AND SM description — best regeneration input [VERIFIED]
- A2024112 and S2026110 are completely removed from ShelterManager — `getAnimalById()` returns null, `POST /api/bio/generate/:animalId` returns 404 "Animal not found" [VERIFIED]
- 4 others (Cookie, Bolt, Isis, Blizzard) have SM descriptions only, no profile [VERIFIED]

---

## 2. Current Content Per Animal

### Full Detail Table

| shelter_code | en_long | es_long | en_short | es_short | Status L/S |
|---|---|---|---|---|---|
| A2025088 | 511 chars | 0 | 0 | 0 | draft/draft |
| A2023267 | 929 chars | 0 | 0 | 0 | draft/draft |
| A2026050 | 577 chars | 0 | 0 | 0 | draft/draft |
| A2024112 | 1186 chars | 0 | 0 | 0 | draft/draft |
| S2026110 | 1655 chars | 0 | 0 | 0 | **approved**/draft |
| S20241099 | 674 chars | 719 chars | 0 | 0 | **approved**/draft |
| S2024694 | 770 chars | 863 chars | 0 | 0 | **approved**/draft |
| S20251236 | 63 chars | 0 | 244 chars | 267 chars | **approved**/draft |

[VERIFIED]

### Content Previews (first ~15 words of populated fields)

**A2025088 (Achilles) — sm_copy, EN long only:**
> Meet Achilles, a young, energetic, and playful dog ready to bring joy and laughter to your home.

Raw SM ANIMALCOMMENTS verbatim. Not AI-generated. [VERIFIED]

**A2023267 (Cookie) — sm_copy, EN long only:**
> Cookie, is as sweet as her name, is 8+ years old and the Rockland County shelter's longest resident.

Raw SM ANIMALCOMMENTS verbatim. [VERIFIED]

**A2026050 (Bolt) — sm_copy, EN long only:**
> Hi there! I'm Bolt, your future adventure buddy! I'm only 1 year old, super playful...

Raw SM ANIMALCOMMENTS verbatim. [VERIFIED]

**A2024112 (Aspen) — backfill, EN long only:**
> Meet ASPEN! This 3 year old husky is not just a loyal companion, but a major goofball...

AI-generated style (1186 chars). Origin: backfill from legacy animal_bios (March 17, Phase 13c migration). [VERIFIED]

**S2026110 (Floof) — backfill, EN long only, LONG APPROVED:**
> Floof is a stunning medium-haired black and white beauty with a story of resilience, love, and second chances.

AI-generated style (1655 chars). Long approved Apr 11. [VERIFIED]

**S20241099 (Dante) — backfill, EN+ES long, LONG APPROVED:**
> EN: Meet Dante!!, a sweet two-year-old gentleman who was found wandering the streets of Spring Valley...
> ES: ¡Conozcan a Dante!, un dulce caballero de dos años que fue encontrado deambulando por las calles de Spring Valley...

AI-generated (674/719 chars). Long approved Mar 17. Has 3 behavior_notes. [VERIFIED]

**S2024694 (Isis) — manual_edit_long, EN+ES long, LONG APPROVED:**
> EN: Meet Isis a sweet and cuddly companion who is being foster by a wonderful volunteer. Isis is the perfect low maintenance...
> ES: Conoce a Isis, una dulce y cariñosa compañera que está siendo acogida por un maravilloso voluntario...

**HUMAN-EDITED.** History shows: sm_copy → approve → manual_edit ×3 → translate_es → manual_edit → approve. 770/863 chars. Staff deliberately wrote and approved this content. [VERIFIED]

**S20251236 (Blizzard) — regenerate_short, mixed content:**
> EN long (63 chars): "Not meant to be a household pet, but would be a great barn cat." (SM copy, approved)
> EN short (244 chars): "Meet Blizzard, the cool cat with a heart full of adventure! This tabby grey and white Domestic Short Hair prefers the ba..."
> ES short (267 chars): "¡Conoce a Blizzard, el gato aventurero con un corazón lleno de emoción!..."

Long = raw SM text (approved). Short EN+ES = GPT regenerated (draft). Missing: long ES only. [VERIFIED]

### History for key animals

**S2024694 (Isis) — 7 history events:**
```
sm_copy → approve_long → manual_edit_long × 3 → translate_es_long → manual_edit_long → approve_long
```
Heavy human intervention. Long content is staff-authored. [VERIFIED]

**S20251236 (Blizzard) — 7 history events:**
```
sm_copy × 2 → manual_edit_long × 3 → approve_long → regenerate_short
```
Long was human-edited then approved. Short was AI-regenerated. [VERIFIED]

---

## 3. Cross-Check: Overlap with 19 from_profile Drafts

```sql
SELECT shelter_code FROM animal_bio_drafts
WHERE shelter_code IN ('A2025088','A2023267','A2026050','A2024112','S2026110','S20241099','S2024694','S20251236');
-- Result: (empty — 0 rows)
```

**Zero overlap.** None of the 8 partial-bio animals have an existing `animal_bio_drafts` row. They cannot be fixed via normal draft approval — new content must be generated or the records must be cleaned up. [VERIFIED]

---

## 4. Regeneration Mechanism

### The cleanest existing path: `generateBioDraftForAnimal(shelterCode)`

**Location:** server.ts line 2052

```typescript
async function generateBioDraftForAnimal(shelterCode: string): Promise<AnimalBioDraft | null> {
  const animal = await getAnimalById(shelterCode, true);  // includeUnavailable=true
  if (!animal) return null;

  const merged = getBehaviorNotes(animal.shelterCode);
  // ... determines source: profile → 'full_generate', SM comment → 'sm_generate'
  
  const { bioEnLong, bioEsLong, bioEnShort, bioEsShort } = await generateAnimalBio({ ... });
  return saveAnimalBioDraft(shelterCode, { bioEnLong, bioEsLong, bioEnShort, bioEsShort }, { source: generationSource });
}
```

**Properties:**
- Produces all 4 fields (EN+ES long+short) via GPT-4o [VERIFIED — server.ts:2088-2094]
- Writes to `animal_bio_drafts` with `promoted_long=0, promoted_short=0` (pending, not approved) [VERIFIED — localDatabase.ts:1726-1738]
- Uses behavior_notes if available (full_generate), falls back to SM comment (sm_generate), returns null if neither [VERIFIED — server.ts:2057-2084]
- Includes `includeUnavailable=true` so it works on non-adoptable animals [VERIFIED — server.ts:2053]
- Returns null if animal not found in SM at all (A2024112, S2026110 case) [VERIFIED — tested via curl]
- Already used by: the generate button endpoint, the adult-intake-bio pass, and behavior-notes save hook [VERIFIED — grep shows 4 call sites]

**For a bulk script:** A script could call `generateBioDraftForAnimal(shelterCode)` for each animal. Results land as pending drafts in `animal_bio_drafts`. Staff reviews and approves via normal Approve button flow. The existing `animal_bios` rows (with partial content) remain untouched until staff promotes the draft.

**Limitation:** Cannot generate for A2024112 (Aspen) and S2026110 (Floof) — they're gone from SM, so `getAnimalById` returns null. [VERIFIED]

### Alternative: `POST /api/bio/generate/:animalId`

Same function underneath (calls `generateBioDraftForAnimal`). Could be triggered via curl per-animal. No script needed for small counts — just curl calls. Same limitations. [VERIFIED — server.ts:2101-2127]

---

## 5. Per-Animal Classification

| # | shelter_code | Name | Action | Rationale |
|---|---|---|---|---|
| 1 | **A2025088** | Achilles | **(a) REGENERATE from profile** | Has behavior_notes (profile) + SM description. `generateBioDraftForAnimal` will use profile path (full_generate). All 4 fields produced. No human-edited content at risk — current content is raw SM copy. [VERIFIED] |
| 2 | **A2023267** | Cookie | **(a) REGENERATE from SM** | No profile, has SM description (929 chars). `generateBioDraftForAnimal` will use SM path (sm_generate). Current content is raw SM copy — no human edits at risk. [VERIFIED] |
| 3 | **A2026050** | Bolt | **(a) REGENERATE from SM** | No profile, has SM description (577 chars). Same as Cookie. Current content is raw SM copy. [VERIFIED] |
| 4 | **A2024112** | Aspen | **(b) CANNOT REGENERATE** | Gone from SM entirely. `getAnimalById` returns null. No profile. Current content is AI-generated backfill (1186 chars EN long only), status draft. **Cannot produce new content.** Options: delete the partial row (animal has no public bio), or leave as-is if animal is permanently gone. [VERIFIED] |
| 5 | **S2026110** | Floof (Mom) | **(b) CANNOT REGENERATE** | Gone from SM entirely. No profile. Current long is AI-generated (1655 chars), already approved. **Cannot produce new content.** The approved long bio has empty ES translation — already a live gap but animal appears to be gone. Options: delete or leave as-is. [VERIFIED] |
| 6 | **S20241099** | Dante | **(a) REGENERATE from profile** | Has 3 behavior_notes (profile) + SM description. `generateBioDraftForAnimal` will use profile path. Current long EN+ES is AI-generated (approved Mar 17). New draft would produce all 4 fields → staff approves → replaces approved bio. Regeneration is safe: existing long is AI content, not human-authored. [VERIFIED] |
| 7 | **S2024694** | Isis the Goddess | **(c) DO NOT AUTO-REGENERATE** | Long EN+ES is **human-edited** (3 manual edits + translation, approved May 15). **Must not overwrite.** Only the short is missing. Recommended: regenerate SHORT only (not full regeneration). The existing `POST /api/bio/:shelterCode/regenerate/short` endpoint generates just short EN+ES and updates the existing `animal_bios` row. But it writes directly to `animal_bios` (not drafts) with status='draft' — staff would still need to approve. However, it does NOT preserve the human-edited long. Need to verify it only touches short fields. [VERIFIED history, UNCERTAIN on regenerate-short field isolation] |
| 8 | **S20251236** | Blizzard | **(c) HAND-REVIEW** | Mixed state: long EN is raw SM text (63 chars, approved), short EN+ES is AI-regenerated (draft), long ES is missing. The SM text is very short ("Not meant to be a household pet, but would be a great barn cat."). Only long ES is missing — could translate the approved long EN. But the SM text may not be suitable as a public bio at all (63 chars, reads like an internal note). Staff should decide: regenerate everything from SM, or leave the SM note as-is and only add ES translation. [VERIFIED] |

### Risk Summary

| Risk Level | Animals | Count |
|---|---|---|
| ✅ Safe to regenerate (full draft) | A2025088, A2023267, A2026050, S20241099 | 4 |
| ⛔ Cannot regenerate (gone from SM) | A2024112, S2026110 | 2 |
| ⚠️ Human content — hand-review needed | S2024694, S20251236 | 2 |

---

## Conclusions

### Per-Animal Summary Table

| shelter_code | Name | Source Data | Content State | In Drafts? | Recommended Action |
|---|---|---|---|---|---|
| A2025088 | Achilles | profile + SM | EN long only (SM copy) | No | **(a)** Regenerate from profile → pending draft |
| A2023267 | Cookie | SM only (929ch) | EN long only (SM copy) | No | **(a)** Regenerate from SM → pending draft |
| A2026050 | Bolt | SM only (577ch) | EN long only (SM copy) | No | **(a)** Regenerate from SM → pending draft |
| A2024112 | Aspen | **NONE** (gone from SM) | EN long only (AI backfill, draft) | No | **(b)** Cannot regenerate. Delete or leave. |
| S2026110 | Floof | **NONE** (gone from SM) | EN long only (AI backfill, approved) | No | **(b)** Cannot regenerate. Delete or leave. |
| S20241099 | Dante | profile (3) + SM | EN+ES long (AI, approved) | No | **(a)** Regenerate from profile → pending draft |
| S2024694 | Isis | SM only (770ch) | EN+ES long (human-edited, approved) | No | **(c)** Short only. DO NOT overwrite long. |
| S20251236 | Blizzard | SM only (63ch) | Long EN approved (63ch SM), Short EN+ES draft, Long ES missing | No | **(c)** Hand-review. SM text may not be bio-suitable. |

### Cleanest Regeneration Mechanism

For the 4 safe-to-regenerate animals: call `generateBioDraftForAnimal(shelterCode)` (or `POST /api/bio/generate/:animalId` via curl). Each call:

1. Fetches animal from SM (includeUnavailable=true) [VERIFIED]
2. Checks behavior_notes → full_generate, or SM description → sm_generate [VERIFIED]
3. Generates all 4 fields via GPT-4o [VERIFIED]
4. Writes to `animal_bio_drafts` with promoted_long=0, promoted_short=0 → **pending, not approved** [VERIFIED]
5. Existing `animal_bios` rows (with partial content) remain untouched [VERIFIED]
6. Staff reviews and clicks "Approve for Public Use" via normal dashboard flow [VERIFIED]

Can be done as 4 curl calls — no script needed:
```bash
curl -X POST http://localhost:3000/api/bio/generate/A2025088
curl -X POST http://localhost:3000/api/bio/generate/A2023267
curl -X POST http://localhost:3000/api/bio/generate/A2026050
curl -X POST http://localhost:3000/api/bio/generate/S20241099
```

### Open Questions for John

1. **A2024112 (Aspen) and S2026110 (Floof):** Gone from SM. Delete their partial `animal_bios` rows? Or leave as-is (dead data, no public exposure since animals aren't in SM)?
2. **S2024694 (Isis):** Regenerate short only (preserving human-edited long)? The per-size regenerate endpoint (`POST /api/bio/:shelterCode/regenerate/short`) exists but writes directly to `animal_bios` — need to verify it only touches short fields.
3. **S20251236 (Blizzard):** The approved long EN is 63 chars of SM note ("Not meant to be a household pet, but would be a great barn cat.") — is this suitable as a public bio, or should the whole thing be regenerated? Only long ES is missing.
