# Bio Row Model — Approved vs Draft Coexistence Analysis

**Date:** 2026-06-15
**Scope:** Read-only diagnosis. No writes, no edits, no GPT.

---

## PART 1 — THE BIO ROW SHAPE

### a. Schema (SQLite)

```
0  id              TEXT  PK
1  generated_at    TEXT  NOT NULL
2  bio_en_long     TEXT  NOT NULL  DEFAULT ''
3  bio_es_long     TEXT  NOT NULL  DEFAULT ''
4  status_long     TEXT  NOT NULL  DEFAULT 'draft'
5  approved_at_long TEXT
6  bio_en_short    TEXT  NOT NULL  DEFAULT ''
7  bio_es_short    TEXT  NOT NULL  DEFAULT ''
8  status_short    TEXT  NOT NULL  DEFAULT 'draft'
9  approved_at_short TEXT
10 shelter_code    TEXT
11 last_source     TEXT
```

### TypeScript type (types.ts:144-162)

```typescript
export type BioStatus = 'draft' | 'approved';  // types.ts:141

export interface AnimalBio {
  id: string;
  animalId: string;
  shelterCode?: string;
  bioEnLong: string;       // content field
  bioEsLong: string;       // content field
  statusLong: BioStatus;   // status field
  approvedAtLong: string | null;
  bioEnShort: string;      // content field
  bioEsShort: string;      // content field
  statusShort: BioStatus;  // status field
  approvedAtShort: string | null;
  generatedAt: string;
  lastSource?: string;
}
```

**There is ONE bio row per animal** (enforced by `saveAnimalBio` which does `DELETE ... WHERE shelter_code = ?` before `INSERT`). Content and status fields coexist in the same row. There is no separate "draft" vs "approved" copy — long and short are independent pairs (each has its own status), but there's only one `bioEnLong` value at a time. [VERIFIED — localDatabase.ts:1366-1367]

---

## PART 2 — WHAT THE PUBLIC ACTUALLY READS

### b. resolveBioText — the public gate (server.ts:2636-2669)

```typescript
// Long English — server.ts:2646-2651
if (bio && bio.statusLong === 'approved' && bio.bioEnLong) {
  bioEnLong = bio.bioEnLong;
} else if (smDescription) {
  bioEnLong = smDescription;
} else {
  bioEnLong = stockPlaceholder;
}

// Short English — server.ts:2654-2659
if (bio && bio.statusShort === 'approved' && bio.bioEnShort) {
  bioEnShort = bio.bioEnShort;
} else if (smDescription) {
  bioEnShort = truncateBio(smDescription, 200);
} else {
  bioEnShort = stockPlaceholder;
}

// Spanish — server.ts:2663-2664
const bioEsLong = (bio && bio.statusLong === 'approved' && bio.bioEsLong) ? bio.bioEsLong : '';
const bioEsShort = (bio && bio.statusShort === 'approved' && bio.bioEsShort) ? bio.bioEsShort : '';
```

**Definitive answer: if status is 'draft', the public does NOT see the bio text.** It falls through to the SM description or stock placeholder. The check is `bio.statusLong === 'approved' && bio.bioEnLong` — both conditions must be true. [VERIFIED]

`resolveBioText` is called by:
- `GET /api/animals` (server.ts:926) — the list endpoint consumed by all public PWAs (matcher, volunteer, dogwalker, staff)
- `GET /api/animals/:id` (server.ts:986) — single animal detail
- `buildFeaturedAnimalData` (server.ts:2708) — featured/homepage animals

All public bio display goes through this single gate. [VERIFIED]

### c. Dashboard/staff views

The dashboard bio panel calls `GET /api/bio/:animalId` (server.ts:2251) which returns the **raw bio object** with all fields and statuses — no filtering by approval status. The dashboard renders bioEnLong/bioEnShort regardless of status, showing draft content for staff review. [VERIFIED — the endpoint returns `getAnimalBio(animalId)` directly]

The `GET /api/bios/approved` endpoint (server.ts:2460) is used by the dashboard's approved-bios list and selects rows where `status_long = 'approved' OR status_short = 'approved'` (localDatabase.ts:1535-1537), but returns both draft and approved fields in each row — the client-side rendering distinguishes them. [VERIFIED]

**Summary: public = approved-gated; dashboard = shows everything for review.** [VERIFIED]

---

## PART 3 — WHAT GENERATION DOES TO AN EXISTING APPROVED BIO

### d. saveAnimalBio's destructive overwrite (localDatabase.ts:1360-1393)

```typescript
// localDatabase.ts:1366-1367
const shelterCode = bio.shelterCode || bio.animalId;
database.prepare(`DELETE FROM animal_bios WHERE shelter_code = ?`).run(shelterCode);
```

**`saveAnimalBio` deletes the existing row first, then inserts a new one.** The previously-approved content is GONE from the `animal_bios` table. It is preserved only in `animal_bios_history` (if historyMeta was provided at the time of the original save — the history table stores a snapshot of all four content fields + statuses at each write event). [VERIFIED]

So after `generateAnimalBio` → `saveAnimalBio` runs on an animal with an approved bio:
1. The existing approved row is deleted
2. A new row is inserted with `statusLong: 'draft', statusShort: 'draft'`
3. The public immediately loses the approved bio — `resolveBioText` falls back to SM description or placeholder
[VERIFIED — the generate endpoint at server.ts:2143-2155 hardcodes `statusLong: 'draft', approvedAtLong: null, statusShort: 'draft', approvedAtShort: null`]

### e. Specific paths

**Track C `upgradeAgedOutGeneric` — `no_content` branch:** Calls `saveAnimalBio` with `statusLong: 'approved', statusShort: 'approved'` (server.ts:11738-11749). This is a direct approved swap — the old youth generic (also approved) is replaced by the adult generic (also approved). Public sees the new adult text immediately. No gap. [VERIFIED]

**Track C `upgradeAgedOutGeneric` — `has_sm_comment` branch:** Calls `generateAnimalBio` then `saveAnimalBio` with `statusLong: 'draft', statusShort: 'draft'` (server.ts:11762-11773). **If the animal had an approved bio before this runs, that approved bio is deleted and replaced by a draft. The public immediately loses it.** [VERIFIED]

**`POST /api/bio/generate/:animalId` (the Generate button):** Same — `saveAnimalBio` with all-draft statuses (server.ts:2143-2155). **Replaces any existing approved bio with a draft.** [VERIFIED]

**`POST /api/bio/:bioId/regenerate/:size`:** Uses `updateAnimalBioLong` or `updateAnimalBioShort` (NOT `saveAnimalBio`), which updates only the targeted size pair and resets that size's status to draft. The OTHER size's content and status are untouched. **Regenerate-long resets long to draft while short stays whatever it was. Regenerate-short resets short to draft while long stays.** [VERIFIED — localDatabase.ts:1418-1432, 1435-1449]

---

## PART 4 — THE GAP

### f. Plain statement

**No. With the current single-row model, an animal CANNOT simultaneously show a previously-approved bio to the public AND hold a pending draft awaiting review.** `saveAnimalBio` (used by both the generate endpoint and Track C's `has_sm_comment` branch) deletes the existing row — approved content and all — and replaces it with a new draft row. The public immediately falls back to SM description or placeholder.

The ONLY non-destructive write path is `updateAnimalBioLong/Short` (used by regenerate), which preserves the other size pair. But even this resets the targeted size to draft.

### Minimal options for coexistence

1. **Separate draft columns in the same row.** Add `draft_en_long`, `draft_es_long`, `draft_en_short`, `draft_es_short` + `draft_status_long`, `draft_status_short` alongside the existing approved fields. Generation writes to draft columns only; approval copies draft → approved. Pro: no schema restructuring beyond new columns; single row per animal preserved. Con: column proliferation (8 new columns); every read/write path must be updated to target the correct column set.

2. **Two-row model (approved + draft).** Allow two rows per animal in `animal_bios`, distinguished by a `version` or `role` column (`'live'` vs `'draft'`). Generation writes a draft row; approval promotes it (copy to live, delete draft). Pro: clean separation; existing approved row untouched during generation. Con: all queries that assume one-row-per-animal (getAnimalBio, computeBioState, etc.) must be updated; unique constraint on shelter_code must be relaxed or made composite.

3. **Pending-bio staging table.** A separate `animal_bio_drafts` table holds generated-but-unapproved bios. The existing `animal_bios` table only ever holds the approved/live version. Approval moves the row from drafts → bios. Pro: zero changes to existing read paths; `animal_bios` remains a clean "what's public" table. Con: new table; generate/approve workflows need routing logic; dashboard must read from both tables to show the review UI.

4. **Status-aware non-destructive save.** Modify `saveAnimalBio` to NOT delete the existing row when the new write is draft-status. Instead, use `updateAnimalBioLong/Short`-style partial updates that leave approved content in place until explicitly overwritten by an approval action. Pro: minimal schema change. Con: the "approved content" and "draft content" occupy the same columns — you can't have BOTH a draft-long AND an approved-long simultaneously in a single-column model; you'd need to pick which version is in the column at any given time.

5. **Immutable-row with pointer.** Keep all versions in `animal_bios` (never delete), add an `is_live` boolean. Only one row per animal has `is_live = true` (the public version). Generation inserts a new non-live row; approval flips the pointer. Pro: full version history in the main table. Con: most queries need filtering; row growth over time.

Each option has different trade-offs between schema complexity, query surface area, and the number of existing code paths that need updating. Options 1 and 3 require the fewest changes to existing read paths (public endpoints don't need to change in option 3 at all). Option 4 is a dead end since it can't hold both versions of the same size simultaneously.
