# Phase B: write-path per-size source maintenance — implementation + verification

**Date:** 2026-06-15 23:15 UTC  
**Commit:** `7e948f9`  
**File:** server/src/localDatabase.ts only (37 insertions, 15 deletions)

---

## Action→Origin mapping (implemented once, used by all writers)

```typescript
function mapSourceToOrigin(source: string | null | undefined): string | null {
  if (!source) return null;
  const map: Record<string, string> = {
    generic: 'youth_generic',
    generic_adult: 'adult_generic',
    full_generate: 'from_profile',
    sm_generate: 'from_sm',
  };
  return map[source] ?? null;
}
```

[VERIFIED — defined once at localDatabase.ts:1643, called by saveAnimalBio and saveAnimalBioDraft]

---

## EDIT 1: AnimalBioDraft interface + rowToAnimalBioDraft

Added `sourceLong: string | null` and `sourceShort: string | null` to the interface, mapped from `row.source_long` and `row.source_short` in the row mapper. [VERIFIED]

---

## EDIT 2: saveAnimalBio (DELETE+INSERT, both sizes)

Changed INSERT column list and VALUES:

```sql
INSERT INTO animal_bios (
  id, shelter_code,
  bio_en_long, bio_es_long, status_long, approved_at_long,
  bio_en_short, bio_es_short, status_short, approved_at_short,
  generated_at, last_source, source_long, source_short
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

Both `source_long` and `source_short` get `mapSourceToOrigin(historyMeta?.source)` — same value for both sizes (generic writes both identically). [VERIFIED]

---

## EDIT 3: saveAnimalBioDraft (UPSERT, both sizes)

Changed INSERT column list, VALUES, and ON CONFLICT SET:

```sql
INSERT INTO animal_bio_drafts (
  id, shelter_code, generated_at,
  bio_en_long, bio_es_long, bio_en_short, bio_es_short,
  promoted_long, promoted_short, last_source, source_long, source_short
) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
ON CONFLICT(shelter_code) DO UPDATE SET
  ...
  last_source = excluded.last_source,
  source_long = excluded.source_long,
  source_short = excluded.source_short
```

Both source columns set to `mapSourceToOrigin(meta.source)`. [VERIFIED]

---

## EDIT 4: promoteDraftSize (INSERT ON CONFLICT, one size per call)

### Long promote:

```sql
INSERT INTO animal_bios (
  ..., shelter_code, last_source, source_long
) VALUES (?, ?, ?, ?, 'approved', ?, '', '', 'draft', NULL, ?, 'promote_from_draft', ?)
ON CONFLICT(shelter_code) DO UPDATE SET
  ...,
  last_source = 'promote_from_draft',
  source_long = excluded.source_long
```

Bound param: `draft.sourceLong`. source_short NOT in SET → preserved. [VERIFIED]

### Short promote:

```sql
INSERT INTO animal_bios (
  ..., shelter_code, last_source, source_short
) VALUES (?, ?, '', '', 'draft', NULL, ?, ?, 'approved', ?, ?, 'promote_from_draft', ?)
ON CONFLICT(shelter_code) DO UPDATE SET
  ...,
  last_source = 'promote_from_draft',
  source_short = excluded.source_short
```

Bound param: `draft.sourceShort`. source_long NOT in SET → preserved. [VERIFIED]

---

## PRESERVE paths — confirmed UNTOUCHED

### saveAnimalBioDraftSize (regenerate)

SET clause (unchanged):
```sql
ON CONFLICT(shelter_code) DO UPDATE SET
  generated_at, bio_en_long, bio_es_long, bio_en_short, bio_es_short,
  promoted_long, promoted_short, last_source
```

**source_long and source_short absent** — preserved on UPDATE, NULL on INSERT. [VERIFIED — function not modified in this commit]

### updateAnimalBioLong (manual edit)

SET clause (unchanged):
```sql
SET bio_en_long = ?, bio_es_long = ?, status_long = 'draft', approved_at_long = NULL,
    last_source = COALESCE(?, last_source)
```

**source_long and source_short absent** — preserved. [VERIFIED — function not modified]

### updateAnimalBioShort (manual edit)

SET clause (unchanged):
```sql
SET bio_en_short = ?, bio_es_short = ?, status_short = 'draft', approved_at_short = NULL,
    last_source = COALESCE(?, last_source)
```

**source_long and source_short absent** — preserved. [VERIFIED — function not modified]

---

## Live functional tests

### (a) saveAnimalBio — generic rows

Not re-triggered live (no generic candidate right now), but Phase A backfill confirmed correct mapping. Code-read verification: `mapSourceToOrigin('generic')` → `'youth_generic'`, `mapSourceToOrigin('generic_adult')` → `'adult_generic'`. Next daily job run (9:30am ET) will exercise this path for any new generics. [VERIFIED by code-read]

### (b) saveAnimalBioDraft — full generation

Triggered live: `POST /api/bio/generate/R2023007`

**API response:**
```json
{
  "draft_source_long": "from_profile",
  "draft_source_short": "from_profile",
  "draft_last_source": "full_generate"
}
```

**DB verification:**
```
shelter_code|last_source|source_long|source_short
R2023007|full_generate|from_profile|from_profile
```

[VERIFIED — saveAnimalBioDraft correctly mapped full_generate → from_profile for both sizes]

### (c) promoteDraftSize — promote long only

Triggered live: `POST /api/bio/draft/R2023007/promote/long`

**BEFORE promote (animal_bios):**
```
source_long=adult_generic  source_short=adult_generic  status_long=approved  status_short=approved
```

**AFTER promote (animal_bios):**
```
source_long=from_profile   source_short=adult_generic  status_long=approved  status_short=approved
last_source=promote_from_draft
```

- `source_long` changed: `adult_generic` → `from_profile` (carried from draft's source_long) [VERIFIED]
- `source_short` preserved: stayed `adult_generic` (not in SET clause) [VERIFIED]
- `last_source` changed to `promote_from_draft` (expected) [VERIFIED]

### (d) PRESERVE — regenerate

Triggered live: `POST /api/bio/R2023007/regenerate/long` (before promote test)

**BEFORE regenerate:** `source_long=from_profile, source_short=from_profile`
**AFTER regenerate:** `source_long=from_profile, source_short=from_profile, last_source=regenerate_long`

`last_source` changed to `regenerate_long` but both per-size source columns preserved. [VERIFIED]

---

## Infrastructure

- **Build:** tsc exit 0, clean [VERIFIED]
- **Service:** active (running) since 23:11:26 UTC [VERIFIED]
- **Commit:** `7e948f9` [VERIFIED]
- **git diff --stat:** only `server/src/localDatabase.ts` — 37 insertions, 15 deletions [VERIFIED]

---

## No deviations

All four edits landed as specified. Three PRESERVE paths confirmed untouched. All four live tests passed (one by code-read, three exercised against the running server with DB verification).
