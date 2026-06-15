# Bio badge source + state map — design data

**Date:** 2026-06-15 22:42 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Q1: Schema — animal_bios + animal_bio_drafts

### animal_bios

```sql
CREATE TABLE animal_bios (
  id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  bio_en_long TEXT NOT NULL DEFAULT '',
  bio_es_long TEXT NOT NULL DEFAULT '',
  status_long TEXT NOT NULL DEFAULT 'draft',
  approved_at_long TEXT,
  bio_en_short TEXT NOT NULL DEFAULT '',
  bio_es_short TEXT NOT NULL DEFAULT '',
  status_short TEXT NOT NULL DEFAULT 'draft',
  approved_at_short TEXT,
  shelter_code TEXT,
  last_source TEXT
);
CREATE UNIQUE INDEX idx_bio_shelter_code_unique ON animal_bios(shelter_code);
```

**Status is PER-SIZE:** `status_long` and `status_short` are independent columns. A long bio can be 'approved' while the short is 'draft'. [VERIFIED]

**last_source is ONCE per row**, not per size. A single `last_source` column covers the entire animal_bios row. When you regenerate long only, `last_source` becomes `'regenerate_long'` even though the short bio's source hasn't changed. [VERIFIED]

**approved_at is PER-SIZE:** `approved_at_long` and `approved_at_short` are independent. [VERIFIED]

### animal_bio_drafts

```sql
CREATE TABLE animal_bio_drafts (
  id TEXT PRIMARY KEY,
  shelter_code TEXT NOT NULL UNIQUE,
  generated_at TEXT NOT NULL,
  bio_en_long TEXT NOT NULL DEFAULT '',
  bio_es_long TEXT NOT NULL DEFAULT '',
  bio_en_short TEXT NOT NULL DEFAULT '',
  bio_es_short TEXT NOT NULL DEFAULT '',
  promoted_long INTEGER NOT NULL DEFAULT 0,
  promoted_short INTEGER NOT NULL DEFAULT 0,
  last_source TEXT
);
```

Same pattern: `last_source` is ONCE per row, `promoted_long`/`promoted_short` are per-size. [VERIFIED]

---

## Q2: Complete last_source value inventory

### Currently in animal_bios (live DB)

| last_source | Count | Meaning / Path |
|-------------|-------|----------------|
| `generic` | 49 | Youth generic (Pass 1 — `runGenericBioJob`, deterministic template, auto-approved) |
| `generic_adult` | 70 | Adult generic (Pass 2 age-crossing + Pass 3 adult-intake, deterministic template, auto-approved) |
| `full_generate` | 23 | AI-generated from caregiver profile (generate endpoint or profile-save trigger) |
| `sm_generate` | 4 | AI-generated from SM ANIMALCOMMENTS only (age-crossing has_sm_comment path) |
| `backfill` | 27 | Legacy backfill (pre-dual-state historical import) |
| `sm_copy` | 3 | Retired "Use as Starting Point" button (copied SM text verbatim, endpoint now deleted) |
| `manual_edit_long` | 2 | Staff hand-edited the long bio via Save button |
| `manual_edit_short` | 0 | Staff hand-edited the short bio (path exists, no rows yet) |
| `regenerate_long` | 3 | AI-regenerated long bio only (regenerate endpoint) |
| `regenerate_short` | 2 | AI-regenerated short bio only (regenerate endpoint) |
| `promote_from_draft` | 0 | Written by `promoteDraftSize` when approving a draft (path exists, no rows yet in bios) |

### Currently in animal_bio_drafts

| last_source | Count | Meaning / Path |
|-------------|-------|----------------|
| `full_generate` | 17 | AI-generated from profile (profile-save trigger or generate endpoint) |
| `regenerate_short` | 1 | Regenerated short draft |

### Source values written by code paths (server.ts)

| Value | Writer | Line(s) |
|-------|--------|---------|
| `generic` | `saveAnimalBio(...)` in `runGenericBioJob` Pass 1 | 11505, 11596 |
| `generic_adult` | `saveAnimalBio(...)` in `upgradeAgedOutGeneric` + `upgradeAdultIntake` | 11790, 11927 |
| `full_generate` | `saveAnimalBioDraft(...)` via `generateBioDraftForAnimal` (profile path) | 2089 |
| `sm_generate` | `saveAnimalBioDraft(...)` via `generateBioDraftForAnimal` (SM path) + age-crossing has_sm_comment | 2089, 11806 |
| `regenerate_long` | `saveAnimalBioDraftSize(...)` in regenerate endpoint | 2182 |
| `regenerate_short` | `saveAnimalBioDraftSize(...)` in regenerate endpoint | 2182 |
| `manual_edit_long` | `updateAnimalBioLong(...)` in save-long endpoint | 2221 |
| `manual_edit_short` | `updateAnimalBioShort(...)` in save-short endpoint | 2247 |
| `promote_from_draft` | `promoteDraftSize(...)` in approve/promote endpoint | localDatabase.ts:1733–1753 |
| `sm_copy` | Retired `POST /api/bio/from-sm` (endpoint deleted) | (removed) |
| `backfill` | Historical import (no current code path) | (legacy) |

[VERIFIED — all values confirmed by grep of server.ts + localDatabase.ts + live DB query]

---

## Q3: Is the original seed type recoverable after regenerate?

**No — it is lost.** [VERIFIED]

When regenerate writes `regenerate_long` or `regenerate_short` as `last_source`, it overwrites the previous value. The `animal_bio_drafts` table has a single `last_source` column, no `original_source` or `seed_type` field. The `animal_bios_history` table records previous states, but:

- `last_source` in history reflects the source AT THE TIME of that history entry
- There is no field distinguishing "this was originally profile-seeded" vs "SM-seeded"
- After regeneration, the draft's `last_source` is `regenerate_long` or `regenerate_short` — the original seed type (profile vs SM) is not stored anywhere in the current row

**Implication for badging:** A regenerated bio cannot badge as "From Profile" or "From SM" without either (a) walking the history table backward to find the original source, or (b) checking the current animal's data at display time (does it have a profile now? does it have SM comment now?). Option (b) is simpler but tells you the current state of the animal, not what the bio was actually generated from.

**Practical alternative:** Badge regenerated bios as "AI Generated" (since both regenerate paths use AI). The distinction between profile-seeded and SM-seeded AI is secondary — both are AI-generated content requiring approval.

---

## Q4: What bio fields the client currently receives

The `bio: fullBio` field in the per-animal payload is the full `AnimalBio` object from `rowToAnimalBio()` (localDatabase.ts:1545–1561):

```typescript
{
  id: string,
  animalId: string,        // = shelter_code
  shelterCode: string,
  bioEnLong: string,
  bioEsLong: string,
  statusLong: BioStatus,   // 'draft' | 'approved'    ← PER-SIZE ✓
  approvedAtLong: string | null,
  bioEnShort: string,
  bioEsShort: string,
  statusShort: BioStatus,  // 'draft' | 'approved'    ← PER-SIZE ✓
  approvedAtShort: string | null,
  generatedAt: string,
  lastSource: string | undefined,  // ← ONCE per row, NOT per-size
}
```

The draft object (`AnimalBioDraft`) also has a single `lastSource`. [VERIFIED]

**Per-size status: YES — `statusLong` and `statusShort` are already in the payload.** [VERIFIED]

**Per-size source: NO — `lastSource` is a single field, not per-size.** To badge source per-size, the server would need to either:
- Add `lastSourceLong` / `lastSourceShort` columns (schema change), or
- Derive source badges from the single `lastSource` heuristically (e.g. `regenerate_long` → long was regenerated, short was not), or
- Use a simpler per-animal source badge (not per-size)

**`hasSeedContent` (for regenerate-button greying): NOT currently in payload.** Must be added. [VERIFIED]

---

## Q5: Existing state badge markup + CSS

### Long bio state badge (dashboard/index.html:7545)

```javascript
<span class="bio-status ${displayStatusLong}">${displayStatusLong === 'approved' ? '✓ Approved' : '📝 Draft'}</span>
```

### Short bio state badge (dashboard/index.html:7570)

```javascript
<span class="bio-status ${displayStatusShort}">${displayStatusShort === 'approved' ? '✓ Approved' : '📝 Draft'}</span>
```

### CSS (dashboard/index.html:1117–1129)

```css
.bio-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.bio-status.draft { background: #FEF3C7; color: #D97706; }    /* amber/yellow */
.bio-status.approved { background: #D1FAE5; color: #065F46; }  /* green */
```

**Mechanism:** The CSS class (`draft` or `approved`) is set by the template variable `${displayStatusLong}` / `${displayStatusShort}`. The text is set by the ternary. Pill-shaped badge (border-radius: 20px), uppercase, flexbox-aligned. [VERIFIED]

### Per-size header layout (dashboard/index.html:1052–1057)

```css
.bio-size-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
```

The header is a flex row with title on the left and badge on the right (`justify-content: space-between`). A second badge would sit alongside the state badge in the right side of this flex row. [VERIFIED]

---

## Q6: Per-size card structure confirmation

**Yes, the bio panel has two independent per-size sections:** [VERIFIED]

```
<div class="bio-size-section">           ← LONG
  <div class="bio-size-header">
    <div class="bio-size-title">📄 Long Bio (100-150 words)</div>
    <span class="bio-status ${displayStatusLong}">...</span>      ← state badge
  </div>
  <div class="bio-grid">...</div>         ← textareas
  <div class="bio-actions">               ← Save / Approve / Regenerate buttons
</div>

<div class="bio-size-section">           ← SHORT
  <div class="bio-size-header">
    <div class="bio-size-title">📱 Short Bio (40-50 words)</div>
    <span class="bio-status ${displayStatusShort}">...</span>     ← state badge
  </div>
  <div class="bio-grid">...</div>
  <div class="bio-actions">
</div>
```

Each section has its own `displayStatusLong` / `displayStatusShort` and its own Regenerate button. At render time, the function has access to `bio.lastSource` (single value) and `bio.statusLong` / `bio.statusShort` (per-size). [VERIFIED]

A source badge would sit inside `<div class="bio-size-header">` after the state badge span. Multiple badges in the flex row would naturally flow left-to-right on the right side (could wrap in a small flex container for gap control). [VERIFIED]

---

## Conclusions

**(a) Is last_source and status per-size?**
- **Status:** YES — `statusLong` and `statusShort` are independent columns + payload fields. [VERIFIED]
- **last_source:** NO — single column per row, not per-size. Both tables (`animal_bios` and `animal_bio_drafts`) have one `last_source`. [VERIFIED]

**(b) Is regenerate's original seed recoverable for badging?**
- **No** — `last_source` is overwritten to `regenerate_long` / `regenerate_short`. No `original_source` field exists. Recovery requires either history-table walk or runtime re-check of animal's current profile/SM state. [VERIFIED]

**(c) Does the payload already carry per-size source+state, or must they be added?**
- **Per-size state:** Already carried (`statusLong`, `statusShort`). [VERIFIED]
- **Per-size source:** NOT carried — `lastSource` is single-valued. For per-size source badges, either add per-size source columns (schema change) or derive heuristically from the single value. [VERIFIED]
- **`hasSeedContent`:** NOT in payload — must be added for regenerate-button greying. [VERIFIED]

**(d) Current state-badge markup + CSS to restyle:**
- Markup: `<span class="bio-status ${status}">${text}</span>` [VERIFIED]
- CSS: `.bio-status` base (pill, 0.75rem, uppercase, 600 weight), `.bio-status.draft` (amber: bg #FEF3C7, text #D97706), `.bio-status.approved` (green: bg #D1FAE5, text #065F46) [VERIFIED]
- Location: inside `<div class="bio-size-header">` (flex row, space-between), right side [VERIFIED]
