# Stage 2b-i — Client bio panel consumes draft field + Approve routing

**Commit:** `3613368` — `dashboard: bio panel consumes draft field, Approve routes promote-vs-legacy, rename re-translate button (Stage 2b-i, inert)`  
**Scope:** `dashboard/index.html` only. No server changes.

---

## Changes

### Change 1 — bioCache stores {data, draft}

All `bioCache.set()` calls now store `{ data: <AnimalBio|null>, draft: <AnimalBioDraft|null> }`.

- Batch pre-populate (line 6790): `{ data: animal.bio, draft: null }`
- `loadBioForAnimal`: `{ data: result.data, draft: result.draft || null }`
- All mutation handlers (generate, regenerate, saveBio, copyFromSM): `{ data: result.data, draft: result.draft || null }`

### Change 2 — renderBioContent displays draft when present

Per size, draft content wins when an unpromoted draft exists:

```javascript
const useDraftLong = draft && !draft.promotedLong;
const displayEnLong = useDraftLong ? draft.bioEnLong : (bio ? bio.bioEnLong : '');
const displayStatusLong = useDraftLong ? 'draft' : (bio ? bio.statusLong : 'draft');
// symmetric for short
```

When `draft` is null (current state for all animals), falls through to `bio.*` — identical to pre-change behavior.

### Change 3 — Approve routing (promote vs legacy)

```javascript
if (useDraft) {
  // New path: POST /api/bio/draft/:shelterCode/promote/:size
  // body: { expectedGeneratedAt: draft.generatedAt }
  // On 409 DRAFT_CHANGED: alert message, re-fetch via loadBioForAnimal
  // On success: re-fetch to refresh data+draft state
} else {
  // Legacy path: POST /api/bio/:bioId/approve/:size (unchanged)
}
```

### Change 4 — Button rename

"💾 Re-translate and Save Edits" → "💾 Re-translate Edits and Save" (both long and short sections).

---

## Verification A — Inert check (animal_bio_drafts is empty)

| Animal | shelter_code | data.statusLong | data.statusShort | draft | Renders as before? |
|--------|-------------|----------------|-----------------|-------|-------------------|
| Abe | S2025966 | approved | approved | null | ✅ (textareas show approved content, both badges "✓ Approved") |
| Blizzard | S20251236 | approved | draft | null | ✅ (long approved, short draft, content from animal_bios) |
| S2026291 | S2026291 | approved | draft | null | ✅ (long approved, short draft, content from animal_bios) |

All render identically to before. Only visible difference: tan button now reads "Re-translate Edits and Save".

Legacy approve path unaffected (no draft → `useDraft = false` → legacy `POST /api/bio/:bioId/approve/:size`).

## Verification B — Synthetic draft (proves new rendering + routing)

**Before (draft inserted):**
```
INSERT INTO animal_bio_drafts VALUES ('test-draft-abe', 'S2025966', '2026-06-15T18:00:00Z',
  'DRAFT TEST long EN', 'DRAFT TEST long ES', 'DRAFT TEST short EN', 'DRAFT TEST short ES',
  0, 0, 'sm_generate');
```

API response with draft present:
- `data.statusLong`: approved, `data.bioEnLong[:50]`: "Meet Abe, affectionately known as Baby Aby—a delig"
- `draft.bioEnLong`: "DRAFT TEST long EN", `draft.promotedLong`: false
- `draft.bioEnShort`: "DRAFT TEST short EN", `draft.promotedShort`: false

Render logic trace:
- `useDraftLong = draft && !draft.promotedLong` → `true`
- `displayEnLong = draft.bioEnLong` → "DRAFT TEST long EN" ✅
- `displayStatusLong = 'draft'` → badge "📝 Draft" ✅
- Same for short ✅
- Approve button would call promote path (not clicked in this test)

**After (draft deleted):**
- `draft`: null → falls back to `data.bioEnLong` → "Meet Abe, affectionately known as Baby Aby..."
- Badges: "✓ Approved" for both sizes ✅

**Abe's animal_bios row unchanged throughout:**
- ID: `d841d100-ab9f-4464-aa8f-9e903c725c04`
- status_long: approved, status_short: approved
- bio_en_long[:50]: "Meet Abe, affectionately known as Baby Aby—a delig"

**Final counts:**
- animal_bios: 115 (unchanged)
- animal_bio_drafts: 0 (cleaned up)

**Bug caught and fixed during implementation:** `rowToAnimalBioDraft` converts `promoted_long`/`promoted_short` to booleans (`true`/`false`), not integers. Initial code used `=== 0` which would never match. Fixed to `!draft.promotedLong` / `!draft.promotedShort`.
