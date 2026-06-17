# SM-Seed Partial Draft Investigation

**Date:** 2026-06-17 00:10 UTC  
**Scope:** Read-only diagnosis. No changes made.

---

## 1. Achilles' Bio Row (A2025088) — Exact State

Achilles' data is in `animal_bios` (NOT `animal_bio_drafts`). [VERIFIED]

```sql
SELECT shelter_code, last_source, source_long, source_short,
  status_long, status_short, generated_at,
  LENGTH(bio_en_long), LENGTH(bio_es_long),
  LENGTH(bio_en_short), LENGTH(bio_es_short)
FROM animal_bios WHERE shelter_code = 'A2025088';
```

| Field | Value |
|-------|-------|
| shelter_code | A2025088 |
| last_source | sm_copy |
| source_long | from_sm |
| source_short | NULL (not empty string — NULL) |
| promoted_long | N/A (animal_bios has no promoted columns) |
| promoted_short | N/A |
| status_long | draft |
| status_short | draft |
| bio_en_long | **511 chars** (POPULATED) |
| bio_es_long | **0 chars** (EMPTY STRING) |
| bio_en_short | **0 chars** (EMPTY STRING) |
| bio_es_short | **0 chars** (EMPTY STRING) |

[VERIFIED via direct sqlite3 query]

The `bio_en_long` content is the raw SM description: "Meet Achilles, a young, energetic, and playful dog ready to bring joy and laughter to your home..." — verbatim ANIMALCOMMENTS text, not AI-generated. [VERIFIED]

History table confirms single creation event:

```
id=109 | source=sm_copy | generated_by=sm_copy | generated_at=2026-06-12 16:48:19
```

[VERIFIED]

---

## 2. The SM-Copy Path vs SM-Generate Path

**Achilles was NOT created by the `has_sm_comment` AI-seed branch.** Two distinct SM-bio paths exist:

### Path A: `sm_copy` (RETIRED — commit 8d009d5, June 15)

Endpoint: `POST /api/bio/from-sm/:animalId` (removed in commit 8d009d5)

```typescript
// server.ts (pre-retirement, visible in git show 8d009d5):
// Create new bio with SM content in long English field
existingBio = saveAnimalBio({
  animalId,
  shelterCode: animal.shelterCode,
  bioEnLong: smBio,       // ← RAW SM text copied verbatim
  bioEsLong: '',          // ← EMPTY
  statusLong: 'draft',
  approvedAtLong: null,
  bioEnShort: '',         // ← EMPTY
  bioEsShort: '',         // ← EMPTY
  statusShort: 'draft',
  approvedAtShort: null,
}, { source: 'sm_copy', generatedBy: 'sm_copy' });
```

This path:
- Copies `animal.description` (SM ANIMALCOMMENTS) verbatim into `bio_en_long` only
- Sets all 3 other fields to empty strings by design
- No AI generation, no translation, no short bio generation
- Writes to `animal_bios` (not `animal_bio_drafts`)
- **Achilles was created by this path on June 12** [VERIFIED via history]

[VERIFIED — code from `git show 8d009d5`, file server/src/server.ts, lines removed in diff]

### Path B: `sm_generate` (ACTIVE — has_sm_comment branch)

Location: server.ts line ~11827 (inside `upgradeAgedOutGeneric`)

```typescript
if (bucket === 'has_sm_comment') {
  // AI-seed from SM comment — draft only, NOT approved
  const { bioEnLong, bioEsLong, bioEnShort, bioEsShort } = await generateAnimalBio({
    name: animal.name,
    species: animal.species,
    breed: animal.breed,
    age: animal.age,
    sex: animal.sex,
    color: animal.color,
    transcripts: animal.description,       // SM comment as input
    mergedAttributes: '{}',                // empty attributes
  });
  const draft = saveAnimalBioDraft(animal.shelterCode, 
    { bioEnLong, bioEsLong, bioEnShort, bioEsShort }, 
    { source: 'sm_generate' });
  return { action: 'ai_seed_draft', bioId: draft.id };
}
```

This path:
- Calls `generateAnimalBio()` which produces all 4 fields (EN+ES long+short) via GPT-4o
- Writes to `animal_bio_drafts` (not `animal_bios`)
- Source = `sm_generate`
- **This path was never triggered for Achilles** (Achilles already had an `animal_bios` row from sm_copy, so the `existingBio` guard would skip it)

[VERIFIED — server.ts:11827-11838]

### Comparison: from_profile path

The `from_profile` path (commit f89b01d, `POST /api/bio/generate/:animalId` with behavior notes) also calls `generateAnimalBio()` → produces all 4 fields. Abe's complete draft came from the `from_profile` path written to `animal_bio_drafts` (the newer table). [VERIFIED]

---

## 3. Root Cause

**The sm_copy path (Path A) only populates `bio_en_long` by design.** It is a raw verbatim copy of the SM ANIMALCOMMENTS field into the English long bio, with no AI generation, no Spanish translation, and no short-bio generation. The 3 empty fields are not failures — they were never attempted. [VERIFIED]

This is answer **(a)** from the prompt: the SM-copy path generates only `bio_en_long` by design/incompleteness. It was a quick-and-dirty feature (copy SM text as a starting point) that was retired on June 15 (commit 8d009d5) because it was "incompatible with dual-state bio model."

The newer `sm_generate` path (Path B) that runs through `generateAnimalBio()` would produce all 4 fields, but it writes to `animal_bio_drafts` and has never been triggered for Achilles because Achilles already has an `animal_bios` row. [INFERRED — the daily job's `findAgedOutGenerics` checks for existing bios]

---

## 4. Scope — All Partial Drafts

### animal_bios — 8 partial rows

```sql
SELECT shelter_code, last_source, source_long, source_short,
  CASE WHEN LENGTH(bio_en_long) > 0 THEN 'Y' ELSE 'N' END as en_long,
  CASE WHEN LENGTH(bio_es_long) > 0 THEN 'Y' ELSE 'N' END as es_long,
  CASE WHEN LENGTH(bio_en_short) > 0 THEN 'Y' ELSE 'N' END as en_short,
  CASE WHEN LENGTH(bio_es_short) > 0 THEN 'Y' ELSE 'N' END as es_short
FROM animal_bios
WHERE (some populated) AND (some empty);
```

| shelter_code | last_source | source_long | en_long | es_long | en_short | es_short | Pattern |
|---|---|---|---|---|---|---|---|
| A2023267 | sm_copy | from_sm | Y | N | N | N | SM copy: EN long only |
| A2026050 | sm_copy | from_sm | Y | N | N | N | SM copy: EN long only |
| **A2025088** | **sm_copy** | **from_sm** | **Y** | **N** | **N** | **N** | **SM copy: EN long only** |
| A2024112 | backfill | from_profile | Y | N | N | N | Backfill: EN long only |
| S2026110 | backfill | from_profile | Y | N | N | N | Backfill: EN long only |
| S20241099 | backfill | from_profile | Y | Y | N | N | Backfill: EN+ES long only |
| S2024694 | manual_edit_long | from_sm | Y | Y | N | N | Edited: EN+ES long only |
| S20251236 | regenerate_short | from_sm | Y | N | Y | Y | Regen: long-ES missing |

[VERIFIED]

### Breakdown by source

- **sm_copy: 3/3 partial** — ALL sm_copy rows have only `bio_en_long`. This is 100% systemic to the sm_copy path. [VERIFIED]
- **backfill: 3 partial** — These are from a separate backfill process; 2 have EN-long only, 1 has EN+ES long. [VERIFIED]
- **manual_edit/regenerate: 2 partial** — Modified after initial creation; different incompleteness patterns. [VERIFIED]

### animal_bio_drafts — 0 partial rows

```sql
-- All 19 from_profile drafts are complete (all 4 fields populated)
SELECT COUNT(*) as total, 
  SUM(CASE WHEN all_4_populated THEN 1 ELSE 0 END) as complete
FROM animal_bio_drafts;
-- Result: 19 total, 19 complete
```

**Every `from_profile` draft in `animal_bio_drafts` is fully populated.** Zero partial drafts in this table. [VERIFIED]

---

## 5. Approval Safety — EMPTY BIOS CAN GO PUBLIC

### For Achilles specifically

Achilles has `draft=null` in the batch response (no `animal_bio_drafts` row). [VERIFIED]

In the dashboard `renderBioContent`:
- `draft = null` → `useDraftShort = false`
- `displayStatusShort = bio.statusShort = 'draft'`
- Approve button: `disabled if displayStatusShort === 'approved'` → `'draft' !== 'approved'` → **BUTTON IS ENABLED** [VERIFIED by code read]

When staff clicks "Approve for Public Use" on Achilles' short bio:
1. `approveBio()` → `useDraft = false` (no draft) → **legacy path** [VERIFIED — dashboard:7779-7780]
2. Legacy path: `POST /api/bio/${bioId}/approve/short` [VERIFIED — dashboard:7800]
3. Server: `approveAnimalBioShort(bioId)` → `UPDATE animal_bios SET status_short = 'approved'` [VERIFIED — localDatabase.ts:1574-1585]

**There is NO guard against empty content in any of these functions:**

```typescript
// localDatabase.ts:1574 — approveAnimalBioShort
export function approveAnimalBioShort(id: string): boolean {
  const database = getDatabase();
  const approvedAt = new Date().toISOString();
  const stmt = database.prepare(`
    UPDATE animal_bios 
    SET status_short = 'approved', approved_at_short = ?
    WHERE id = ?
  `);
  // ← NO CHECK: bio_en_short could be '' (empty string)
  const result = stmt.run(approvedAt, id);
  ...
}
```

[VERIFIED — localDatabase.ts:1574-1590]

### What happens downstream

If short bio is approved with empty content:
- `GET /api/bios/approved` (WordPress integration) → returns `bio_en_short: '', short_approved: true` [VERIFIED — server.ts:2469]
- WordPress receives an approved empty string for the short bio
- No downstream guard in the API response [VERIFIED — server.ts:2442-2477]

### promoteDraftSize (for completeness)

`promoteDraftSize` (localDatabase.ts:1810) also has no empty-content guard. It copies draft fields directly:

```sql
INSERT INTO animal_bios (..., bio_en_short, bio_es_short, ...) 
VALUES (..., ?, ?, ...)  -- draft.bioEnShort, draft.bioEsShort (could be '')
```

[VERIFIED — localDatabase.ts:1858-1868]

However, all 19 current `animal_bio_drafts` rows are complete, so this risk is theoretical for the promote path. The immediate risk is the **legacy approve path** for the 8 partial `animal_bios` rows. [VERIFIED]

---

## Conclusions

**(a) Achilles' exact state:** `animal_bios` row with `last_source=sm_copy`, only `bio_en_long` populated (511 chars, raw SM ANIMALCOMMENTS text), 3 other fields empty strings. No `animal_bio_drafts` row. [VERIFIED]

**(b) What sm_copy does differently:** It is a direct verbatim copy of SM ANIMALCOMMENTS into `bio_en_long` only — no AI generation, no translation, no short bio. The newer `sm_generate` path calls `generateAnimalBio()` which produces all 4 fields, but Achilles was created by the old path before it was retired. [VERIFIED]

**(c) Root cause:** The `POST /api/bio/from-sm/:animalId` endpoint (retired June 15) only populated `bio_en_long` by design. It was a quick feature that copied SM text as-is with no generation step. [VERIFIED]

**(d) Scope:** 8 partial bios in `animal_bios` (3 sm_copy, 3 backfill, 2 edited). ALL 3 sm_copy rows show the same pattern (EN long only). Zero partial drafts in `animal_bio_drafts` (all 19 from_profile drafts are complete). [VERIFIED]

**(e) Safety risk: YES — empty bios can be approved to public.** No empty-content guard exists in `approveAnimalBioShort`, `approveAnimalBioLong`, or `promoteDraftSize`. Staff can click "Approve for Public Use" on Achilles' empty short bio, and `status_short='approved'` + `bio_en_short=''` would be served to WordPress. The Approve button is currently enabled for these empty fields. [VERIFIED]
