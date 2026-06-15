# Phase B: write-path source audit — per-size source column design data

**Date:** 2026-06-15 23:08 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## 1. saveAnimalBio (localDatabase.ts:1439–1475)

**Writes:** animal_bios, BOTH sizes in one statement. DELETE + INSERT (not UPSERT).

```typescript
export function saveAnimalBio(bio: Omit<AnimalBio, 'id' | 'generatedAt'>, historyMeta?: BioHistoryMeta): AnimalBio {
  const database = getDatabase();
  const id = randomUUID();
  const generatedAt = new Date().toISOString();
  
  const shelterCode = bio.shelterCode || bio.animalId;
  database.prepare(`DELETE FROM animal_bios WHERE shelter_code = ?`).run(shelterCode);
  
  const stmt = database.prepare(`
    INSERT INTO animal_bios (
      id, shelter_code,
      bio_en_long, bio_es_long, status_long, approved_at_long,
      bio_en_short, bio_es_short, status_short, approved_at_short,
      generated_at, last_source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id, shelterCode,
    bio.bioEnLong, bio.bioEsLong, bio.statusLong, bio.approvedAtLong,
    bio.bioEnShort, bio.bioEsShort, bio.statusShort, bio.approvedAtShort,
    generatedAt, historyMeta?.source || null
  );
  
  if (historyMeta) {
    insertBioHistory(shelterCode, historyMeta);
  }
  
  return { id, generatedAt, ...bio };
}
```

**Key facts:**
- Uses DELETE + INSERT (not ON CONFLICT). The DELETE wipes the entire old row including any existing source_long/source_short. The INSERT must explicitly set both source columns or they'll be NULL. [VERIFIED]
- `historyMeta?.source` supplies last_source. Callers pass: `{ source: 'generic', generatedBy: 'system' }` for youth generic, `{ source: 'generic_adult', generatedBy: 'system' }` for adult generic. [VERIFIED — confirmed at server.ts:11505, 11596, 11790, 11927]
- The source value distinguishes generic vs generic_adult via the caller, not within saveAnimalBio itself. [VERIFIED]
- **Column list is explicit** — omitting source_long/source_short from the INSERT causes them to default to NULL. Must add them. [VERIFIED]

---

## 2. saveAnimalBioDraft (localDatabase.ts:1678–1710)

**Writes:** animal_bio_drafts, BOTH sizes in one statement. INSERT ON CONFLICT UPSERT.

```typescript
export function saveAnimalBioDraft(
  shelterCode: string,
  content: { bioEnLong: string; bioEsLong: string; bioEnShort: string; bioEsShort: string },
  meta: { source: string },
): AnimalBioDraft {
  ...
  database.prepare(`
    INSERT INTO animal_bio_drafts (
      id, shelter_code, generated_at,
      bio_en_long, bio_es_long, bio_en_short, bio_es_short,
      promoted_long, promoted_short, last_source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    ON CONFLICT(shelter_code) DO UPDATE SET
      generated_at = excluded.generated_at,
      bio_en_long = excluded.bio_en_long,
      bio_es_long = excluded.bio_es_long,
      bio_en_short = excluded.bio_en_short,
      bio_es_short = excluded.bio_es_short,
      promoted_long = 0,
      promoted_short = 0,
      last_source = excluded.last_source
  `).run(newId, shelterCode, now, content.bioEnLong, content.bioEsLong, content.bioEnShort, content.bioEsShort, meta.source);
  ...
}
```

**Key facts:**
- `meta.source` is the single source string. Callers pass `'full_generate'` or `'sm_generate'` via `generateBioDraftForAnimal`. [VERIFIED]
- The UPSERT's ON CONFLICT DO UPDATE has an explicit SET clause. source_long/source_short are NOT in the SET, so on conflict they are NOT touched (left at their prior value). On INSERT (new row), they default to NULL. Both paths need the new columns added. [VERIFIED]
- This writes both sizes fresh (full generation), so both source_long and source_short should be set to the same value (the mapped source). [VERIFIED]

---

## 3. saveAnimalBioDraftSize (localDatabase.ts:1712–1773)

**Writes:** animal_bio_drafts, conceptually ONE size but physically rewrites the full row via UPSERT.

```typescript
export function saveAnimalBioDraftSize(
  shelterCode: string,
  size: 'long' | 'short',
  bioEn: string,
  bioEs: string,
  source: string,
): AnimalBioDraft {
  ...
  // Regenerated size: new content, promoted=0
  // Other size: keep existing draft or copy from bios (promoted=1)
  if (size === 'long') {
    enLong = bioEn; esLong = bioEs; promotedLong = 0;
    // enShort/esShort/promotedShort preserved from existing or current
  } else {
    enShort = bioEn; esShort = bioEs; promotedShort = 0;
    // enLong/esLong/promotedLong preserved from existing or current
  }

  database.prepare(`
    INSERT INTO animal_bio_drafts (
      id, shelter_code, generated_at,
      bio_en_long, bio_es_long, bio_en_short, bio_es_short,
      promoted_long, promoted_short, last_source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(shelter_code) DO UPDATE SET
      generated_at = excluded.generated_at,
      bio_en_long = excluded.bio_en_long,
      bio_es_long = excluded.bio_es_long,
      bio_en_short = excluded.bio_en_short,
      bio_es_short = excluded.bio_es_short,
      promoted_long = excluded.promoted_long,
      promoted_short = excluded.promoted_short,
      last_source = excluded.last_source
  `).run(newId, shelterCode, now, enLong, esLong, enShort, esShort, promotedLong, promotedShort, source);
  ...
}
```

**Key facts:**
- Despite being "one size", it rewrites ALL columns via UPSERT (the other size's content/promoted is preserved by reading it from the existing draft or from animal_bios before the write). [VERIFIED]
- `last_source` is overwritten to the regenerate source (`regenerate_long`/`regenerate_short`). [VERIFIED]
- **For PRESERVE behavior:** source_long and source_short are NOT in the current column list. On INSERT (new row) they'll be NULL. On UPDATE (existing row via ON CONFLICT) they are NOT in the SET clause, so **they are preserved automatically** — the existing values survive the upsert. [VERIFIED]
- **No change needed for PRESERVE.** Simply omitting source_long/source_short from the INSERT column list and SET clause means they are NULL on new-row (correct — regenerate creating a brand-new draft for an animal without a prior draft), and preserved on existing-row update (correct — prior generation's source survives). [VERIFIED]
- However: when this is the INSERT path (no existing draft), the regenerated size's source should ideally be set. But this is an edge case — regenerate on an animal with no prior draft is unusual. The backfill-on-read approach (Phase A migration fills NULLs) handles this. [INFERRED]

---

## 4. updateAnimalBioLong (localDatabase.ts:1497–1513) and updateAnimalBioShort (localDatabase.ts:1514–1533)

**Writes:** animal_bios, ONE size each. UPDATE only (not INSERT).

### updateAnimalBioLong

```typescript
export function updateAnimalBioLong(id: string, bioEnLong: string, bioEsLong: string, historyMeta?: BioHistoryMeta): boolean {
  const stmt = database.prepare(`
    UPDATE animal_bios 
    SET bio_en_long = ?, bio_es_long = ?, status_long = 'draft', approved_at_long = NULL,
        last_source = COALESCE(?, last_source)
    WHERE id = ?
  `);
  const result = stmt.run(bioEnLong, bioEsLong, historyMeta?.source || null, id);
  ...
}
```

### updateAnimalBioShort

```typescript
export function updateAnimalBioShort(id: string, bioEnShort: string, bioEsShort: string, historyMeta?: BioHistoryMeta): boolean {
  const stmt = database.prepare(`
    UPDATE animal_bios 
    SET bio_en_short = ?, bio_es_short = ?, status_short = 'draft', approved_at_short = NULL,
        last_source = COALESCE(?, last_source)
    WHERE id = ?
  `);
  const result = stmt.run(bioEnShort, bioEsShort, historyMeta?.source || null, id);
  ...
}
```

**Key facts:**
- Both use UPDATE (not INSERT) with explicit SET clause. [VERIFIED]
- Neither touches source_long or source_short — those columns are absent from SET, so they are **automatically preserved**. [VERIFIED]
- **No change needed for PRESERVE.** The SET clause is per-column; absent columns are untouched by UPDATE. [VERIFIED]
- `last_source` is overwritten via COALESCE (to `manual_edit_long`/`manual_edit_short`). This is a row-level field and does get overwritten, but the per-size source_long/source_short survive untouched. [VERIFIED]

---

## 5. promoteDraftSize (localDatabase.ts:1777–1855)

**Writes:** animal_bios via INSERT ON CONFLICT, ONE size only. Also marks the draft's promoted flag.

### Long promote path (line ~1810):

```typescript
database.prepare(`
  INSERT INTO animal_bios (
    id, generated_at, bio_en_long, bio_es_long, status_long, approved_at_long,
    bio_en_short, bio_es_short, status_short, approved_at_short,
    shelter_code, last_source
  ) VALUES (?, ?, ?, ?, 'approved', ?, '', '', 'draft', NULL, ?, 'promote_from_draft')
  ON CONFLICT(shelter_code) DO UPDATE SET
    bio_en_long = excluded.bio_en_long,
    bio_es_long = excluded.bio_es_long,
    status_long = 'approved',
    approved_at_long = excluded.approved_at_long,
    last_source = 'promote_from_draft'
`).run(newId, now, draft.bioEnLong, draft.bioEsLong, now, sc);
```

### Short promote path (line ~1822):

```typescript
database.prepare(`
  INSERT INTO animal_bios (
    id, generated_at, bio_en_long, bio_es_long, status_long, approved_at_long,
    bio_en_short, bio_es_short, status_short, approved_at_short,
    shelter_code, last_source
  ) VALUES (?, ?, '', '', 'draft', NULL, ?, ?, 'approved', ?, ?, 'promote_from_draft')
  ON CONFLICT(shelter_code) DO UPDATE SET
    bio_en_short = excluded.bio_en_short,
    bio_es_short = excluded.bio_es_short,
    status_short = 'approved',
    approved_at_short = excluded.approved_at_short,
    last_source = 'promote_from_draft'
`).run(newId, now, draft.bioEnShort, draft.bioEsShort, now, sc);
```

**Key facts:**
- **INSERT path** (new row — no existing bio): writes one size only, other size is empty defaults. source_long/source_short are NOT in the column list, so they default to NULL. The promoted size's source should be set. [VERIFIED]
- **ON CONFLICT path** (existing bio row): the SET clause only touches the promoted size's content + status. source_long and source_short are NOT in the SET clause, so the non-promoted size's source is **preserved automatically**. But the promoted size's source also isn't being set — it needs to be added to the SET clause (carry from draft). [VERIFIED]
- **Draft's per-size source is readable:** At line ~1795, the function reads `const draft = rowToAnimalBioDraft(draftRow)`. The `AnimalBioDraft` interface does NOT currently include `sourceLong`/`sourceShort` (those fields were added to the DB columns in Phase A but the TypeScript interface and `rowToAnimalBioDraft` haven't been updated yet). **Phase B must update the interface + row mapper first.** [VERIFIED]
- **Which size to write:** When promoting long, set `source_long = draft.sourceLong`. When promoting short, set `source_short = draft.sourceShort`. The other size's source column is untouched (not in SET). [VERIFIED]

---

## 6. UPSERT safety — will omitted columns be clobbered?

| Writer | Mechanism | Risk of clobbering source_long/source_short |
|--------|-----------|----------------------------------------------|
| saveAnimalBio | DELETE + INSERT (explicit columns) | **YES** — DELETE destroys old row; INSERT with explicit columns sets unmentioned columns to NULL. Must add both source columns to the INSERT. [VERIFIED] |
| saveAnimalBioDraft | INSERT ON CONFLICT (explicit SET) | **No on UPDATE** — SET clause is explicit, absent columns preserved. **Yes on INSERT** — unmentioned columns default to NULL. Must add to INSERT column list. [VERIFIED] |
| saveAnimalBioDraftSize | INSERT ON CONFLICT (explicit SET) | **No on UPDATE** — absent from SET, preserved. **Yes on INSERT** — defaults to NULL. Acceptable for regenerate (edge case: first-ever draft via regenerate). [VERIFIED] |
| updateAnimalBioLong/Short | UPDATE only (explicit SET) | **No** — absent columns preserved. [VERIFIED] |
| promoteDraftSize | INSERT ON CONFLICT (explicit SET) | **No on UPDATE** — absent from SET for non-promoted size, preserved. Must add promoted size's source to SET. **Yes on INSERT** — must add to column list. [VERIFIED] |

---

## Conclusions

### saveAnimalBio (generic / generic_adult writer)
- **(a)** Both sizes in one INSERT
- **(b)** Yes — `historyMeta.source` carries the source string (`'generic'` or `'generic_adult'`). Can map to per-size values in the function body.
- **(c)** N/A — not a PRESERVE path
- **(d)** N/A

### saveAnimalBioDraft (full AI generation writer)
- **(a)** Both sizes in one UPSERT
- **(b)** Yes — `meta.source` carries `'full_generate'` or `'sm_generate'`. Can map to per-size values.
- **(c)** N/A — not a PRESERVE path
- **(d)** N/A

### saveAnimalBioDraftSize (regenerate writer) — PRESERVE
- **(a)** Physically both sizes (full row rewrite), logically one size
- **(b)** Yes — `source` param carries `'regenerate_long'`/`'regenerate_short'`
- **(c)** **PRESERVE is already clean** — source_long/source_short absent from SET clause on UPDATE path, so existing values survive. No change needed for PRESERVE behavior. On INSERT path (new draft), source_long/source_short will be NULL — acceptable edge case. [VERIFIED]
- **(d)** N/A

### updateAnimalBioLong / updateAnimalBioShort (manual edit) — PRESERVE
- **(a)** One size each (UPDATE only)
- **(b)** Yes — `historyMeta.source` carries `'manual_edit_long'`/`'manual_edit_short'`
- **(c)** **PRESERVE is already clean** — source_long/source_short absent from SET clause, untouched by UPDATE. No change needed. [VERIFIED]
- **(d)** N/A

### promoteDraftSize (approve/promote)
- **(a)** One size per call
- **(b)** Source is hardcoded `'promote_from_draft'` for last_source. Per-size source must be CARRIED from the draft's source_long/source_short.
- **(c)** N/A — not a PRESERVE path (actively setting the promoted size's source)
- **(d)** **Draft's per-size source is stored in DB** (Phase A populated source_long/source_short on animal_bio_drafts). **But the TypeScript interface `AnimalBioDraft` and `rowToAnimalBioDraft` do not yet map these columns.** Phase B must update the interface + mapper. Then `draft.sourceLong` / `draft.sourceShort` is readable, and the correct one is written to animal_bios in the promoted size's INSERT/SET clause. The non-promoted size is automatically preserved (absent from SET). [VERIFIED]
