# Stage 2b Scoping — Generation write sites + client bio panel map

**Date:** 2026-06-15 16:18 UTC
**Scope:** Read-only diagnosis. No writes, no edits.

---

## PART 1 — THE THREE GENERATION WRITE SITES

### a. POST /api/bio/generate/:animalId (server.ts:2131-2160)

The endpoint calls `generateAnimalBio()` which returns `{ bioEnLong, bioEsLong, bioEnShort, bioEsShort }` from a single GPT-4o call. Then:

```typescript
// server.ts:2145-2157
const bio = saveAnimalBio({
  animalId,
  shelterCode: animal.shelterCode,
  bioEnLong,
  bioEsLong,
  statusLong: 'draft',
  approvedAtLong: null,
  bioEnShort,
  bioEsShort,
  statusShort: 'draft',
  approvedAtShort: null,
}, { source: generationSource, generatedBy: 'gpt-4o' });

res.json({ success: true, data: bio });
```

**Writes ALL-DRAFT to `animal_bios`** (delete-then-insert via `saveAnimalBio`). Returns the full `AnimalBio` object as `data`. The `generationSource` is either `'full_generate'` (profile path) or `'sm_generate'` (SM comment fallback). [VERIFIED]

### b. POST /api/bio/:bioId/regenerate/:size (server.ts:2195-2249)

Calls `regenerateSingleBio()` which returns `{ bioEn, bioEs }` for one size. Then:

```typescript
// server.ts:2236-2240
let success: boolean;
if (size === 'long') {
  success = updateAnimalBioLong(bioId, bioEn, bioEs, { source: 'regenerate_long', generatedBy: 'gpt-4o' });
} else {
  success = updateAnimalBioShort(bioId, bioEn, bioEs, { source: 'regenerate_short', generatedBy: 'gpt-4o' });
}
// ...
const bio = getAnimalBioById(bioId);
res.json({ success: true, data: bio });
```

**`updateAnimalBioLong` / `updateAnimalBioShort`** (localDatabase.ts:1418-1449) each UPDATE the targeted size's content + reset its status to 'draft' + clear approved_at:

```sql
-- updateAnimalBioLong (localDatabase.ts:1420-1424)
UPDATE animal_bios
SET bio_en_long = ?, bio_es_long = ?, status_long = 'draft', approved_at_long = NULL,
    last_source = COALESCE(?, last_source)
WHERE id = ?

-- updateAnimalBioShort (localDatabase.ts:1438-1442) — symmetric for short
```

**Writes DRAFT for the targeted size only into `animal_bios`.** The OTHER size's content and status are untouched. Returns the full `AnimalBio` object as `data`. [VERIFIED]

### c. Track C upgradeAgedOutGeneric — has_sm_comment branch (server.ts:11809-11832)

```typescript
// server.ts:11821-11832
const saved = saveAnimalBio({
  animalId: animal.shelterCode,
  shelterCode: animal.shelterCode,
  bioEnLong,
  bioEsLong,
  statusLong: 'draft',
  approvedAtLong: null,
  bioEnShort,
  bioEsShort,
  statusShort: 'draft',
  approvedAtShort: null,
}, { source: 'sm_generate', generatedBy: 'gpt-4o' });
return { action: 'ai_seed_draft', bioId: saved.id };
```

**Writes ALL-DRAFT to `animal_bios`** via `saveAnimalBio` (delete-then-insert). Same destructive overwrite pattern as (a). [VERIFIED]

### Summary: all three write DRAFT status into animal_bios

| Site | Write method | Status written | Destructive? |
|------|-------------|----------------|-------------|
| generate endpoint | `saveAnimalBio` (delete+insert) | both draft | Yes — replaces entire row |
| regenerate endpoint | `updateAnimalBioLong/Short` (update) | targeted size draft | Partial — other size untouched |
| Track C has_sm_comment | `saveAnimalBio` (delete+insert) | both draft | Yes — replaces entire row |

[VERIFIED]

---

## PART 2 — THE CLIENT BIO PANEL

### d. renderBioContent(animalId, bio) — dashboard/index.html:7530-7620

Takes a single `bio` object (the `AnimalBio` shape from `animal_bios`). Renders:

**Per size (long/short):**
1. **Header:** size title + status badge (`bio.statusLong`/`bio.statusShort` → "✓ Approved" or "📝 Draft")
2. **Content grid:** Two textareas side-by-side (🇺🇸 English, 🇪🇸 Spanish) populated from `bio.bioEnLong`/`bio.bioEsLong` (or short equivalents), with word counts
3. **Action buttons:**
   - "💾 Re-translate and Save Edits" → `saveBio(animalId, bio.id, size)`
   - "✓ Approve for Public Use" → `approveBio(animalId, bio.id, size)` — disabled when `status === 'approved'` or animal unavailable
   - "🔄 Regenerate" → `regenerateBio(animalId, size)`
4. **Delete button** at the bottom

**The function reads ONLY the `bio` parameter (the `data` field from animal_bios).** It does not access any `draft` field. The signature is `renderBioContent(animalId, bio)` where `bio` is the cached `result.data`. [VERIFIED]

### e. Client handlers

**`generateBio(animalId)`** (dashboard/index.html:7641-7660):
```javascript
const response = await fetch(`${API_BASE}/bio/generate/${shelterCode}`, { method: 'POST' });
const result = await response.json();
bioCache.set(animalId, result.data);
renderBioContent(animalId, result.data);
```
Caches `result.data` (the animal_bios row), renders it. [VERIFIED]

**`regenerateBio(animalId, size)`** (dashboard/index.html:7662-7685):
```javascript
const response = await fetch(`${API_BASE}/bio/${cached.id}/regenerate/${size}`, { method: 'POST' });
const result = await response.json();
bioCache.set(animalId, result.data);
renderBioContent(animalId, result.data);
```
Same pattern — caches and renders `result.data`. [VERIFIED]

**`approveBio(animalId, bioId, size)`** (dashboard/index.html:7746-7763):
```javascript
const response = await fetch(`${API_BASE}/bio/${bioId}/approve/${size}`, { method: 'POST' });
const result = await response.json();
bioCache.set(animalId, result.data);
renderBioContent(animalId, result.data);
```
Same pattern. [VERIFIED]

**`loadBioForAnimal(animalId)`** (dashboard/index.html:7622-7636):
```javascript
const response = await fetch(`${API_BASE}/bio/${shelterCode}`);
const result = await response.json();
if (result.success && result.data) {
  bioCache.set(animalId, result.data);
  renderBioContent(animalId, result.data);
}
```
Fetches from GET /api/bio, caches `result.data`, renders it. **Does NOT read `result.draft` at all.** [VERIFIED]

### f. Does the dashboard display the `draft` field?

**No.** The dashboard currently displays ONLY `animal_bios` content (the `data` field). The `draft` field added in Stage 2a is returned by GET /api/bio but completely ignored by:
- `loadBioForAnimal` — only reads `result.data`
- `bioCache` — only stores `result.data`
- `renderBioContent` — only renders the `bio` parameter (which is `result.data`)
- All mutation handlers (generate, regenerate, approve) — all cache and render `result.data`

[VERIFIED]

---

## PART 3 — DISPLAY MODEL CHECK

### g. What the panel would need to show

Given GET /api/bio now returns:
- `data`: the `animal_bios` row (the live/public state)
- `draft`: the `animal_bio_drafts` row (the pending generation, if any)

**Per size (long/short), the panel would need to display one of these states:**

**State 1: Approved (no pending draft)**
- `data.statusLong === 'approved'` AND (`draft === null` OR `draft.promotedLong === true`)
- Show: the approved text in the textareas, "✓ Approved" badge, Regenerate button (would create a new draft)

**State 2: Approved + pending draft (the new dual-state)**
- `data.statusLong === 'approved'` AND `draft !== null` AND `draft.promotedLong === false`
- Show: **two views** —
  - The approved/live text (read-only, labeled "🔒 Currently Public")
  - The draft text from `draft.bioEnLong` / `draft.bioEsLong` (editable, labeled "📝 Pending Draft")
  - Action buttons: "✓ Approve Draft for Public Use" (calls promote with `draft.generatedAt`), "🔄 Regenerate" (regenerates the draft), "❌ Discard Draft"
  - This is the key new UI element: staff see what's live and what's pending side by side

**State 3: Draft only (no approved version)**
- `data === null` OR `data.statusLong === 'draft'` (legacy draft in animal_bios, no approved version exists)
- Show: the draft text in editable textareas, "📝 Draft" badge, Approve button, Regenerate button
- For legacy drafts (still in animal_bios), the existing approve endpoint works
- For new drafts (in animal_bio_drafts), the promote endpoint is used

**State 4: No bio at all**
- `data === null` AND `draft === null`
- Show: "Generate Bios" button (or auto-generate depending on the redesign)

**Current panel structure** that would need adaptation:
- The textareas (`bio-en-long-${animalId}`, etc.) currently show animal_bios content — they'd need to show draft content when a draft exists
- The status badges currently read `bio.statusLong` — they'd need to reflect the composite state (approved+pending vs draft-only)
- The action buttons reference `bio.id` (the animal_bios row id) — promote uses `shelterCode` + `draft.generatedAt` instead
- `bioCache` currently stores only the animal_bios row — it would need to store both `{ data, draft }` or maintain a separate draftCache

[VERIFIED — structural analysis based on code inspection]
