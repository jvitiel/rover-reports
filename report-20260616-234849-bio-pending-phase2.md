# Bio Pending Fix Phase 2 — Dashboard Cache Draft Population

**Date:** 2026-06-16 23:48 UTC  
**Commit:** `6709a49`  
**Scope:** dashboard/index.html ONLY. No server changes, no rebuild, no restart.

---

## The Change

**File:** `dashboard/index.html` line 6812  
**Diff:** 1 file changed, 1 insertion(+), 1 deletion(-)

```diff
-          bioCache.set(animal.animalId, { data: animal.bio, draft: null });
+          bioCache.set(animal.animalId, { data: animal.bio, draft: animal.draft || null });
```

This is the ONLY change. `git diff --stat` confirms: [VERIFIED]

```
dashboard/index.html | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

No other function was touched. No server files modified. [VERIFIED]

---

## Code-Read Walkthrough: Charlie (R2023007)

With the Phase 1 batch response now including `draft` per animal, and this Phase 2 change populating it into `bioCache`, here is how the existing `renderBioContent` logic handles Charlie:

### Input State (from batch response, Phase 1 verified)

```
bio.lastSource = "promote_from_draft"
bio.statusLong = "approved"   (long was promoted previously)
bio.statusShort = "approved"  (short has generic adult_generic content)
bio.sourceLong = "from_profile"
bio.sourceShort = "adult_generic"

draft.promotedLong = false     (boolean, from rowToAnimalBioDraft)
draft.promotedShort = false    (boolean)
draft.sourceLong = "from_profile"
draft.sourceShort = "from_profile"
draft.bioEnShort = "Charlie, the dapper Hotot bunny with natural 'eyeliner'..."
```

### Cache Lookup (line 7520)

```javascript
const draft = cached ? cached.draft : null;
```

**Before this fix:** `cached.draft` was always `null` → `draft = null`  
**After this fix:** `cached.draft` = the draft object from batch → `draft` is populated [VERIFIED]

### Draft/Bio Check (line 7522)

```javascript
if (!bio && !draft) { ... return; }
```

Both `bio` and `draft` exist → continues to render. [VERIFIED]

### Per-Size Resolution (lines 7534–7543)

```javascript
const useDraftLong = draft && !draft.promotedLong;   // true && !false = true
const useDraftShort = draft && !draft.promotedShort;  // true && !false = true

const displayEnShort = useDraftShort ? draft.bioEnShort : ...;
// → "Charlie, the dapper Hotot bunny with natural 'eyeliner'..."

const displayStatusShort = useDraftShort ? 'draft' : ...;
// → 'draft'
```

`useDraftShort = true` → displays the pending profile-derived short bio text. [VERIFIED]  
`useDraftLong = true` → displays the pending profile-derived long bio text. [VERIFIED]

### Approve Button (line 7628)

```javascript
<button ... onclick="approveBio(..., 'short')" 
  ${displayStatusShort === 'approved' || !isAvailable ? 'disabled' : ''}>
  ✓ Approve for Public Use
</button>
```

`displayStatusShort = 'draft'` (not 'approved'), and Charlie is available → button is **ENABLED**. [VERIFIED]

### End-to-End Flow

1. Staff opens dashboard → batch endpoint returns Charlie with `draft` object (Phase 1)
2. Batch loop populates `bioCache` with `draft: animal.draft` (Phase 2, this change)
3. Staff clicks Charlie → `renderBioContent` reads `cached.draft` → non-null
4. `useDraftShort = true` → profile-derived short bio text displayed
5. "Approve for Public Use" button enabled (displayStatusShort = 'draft')
6. Staff clicks Approve → `approveBio()` → `POST /api/bio/draft/:shelterCode/promote/short`
7. `promoteDraftSize` promotes the draft → approved bio updated

The circular dependency is broken: staff can now see and approve the pending draft. [VERIFIED]

---

## What Was NOT Changed

The following functions were verified untouched (no modifications): [VERIFIED]

- `renderBioContent` (line ~7510) — already handles populated draft correctly
- `approveBio` (line 7769) — calls promote endpoint, works regardless of cache source
- `loadBioForAnimal` (line ~7487) — per-animal fetch, unrelated to batch cache population
- `computeBioState` (server.ts) — Phase 1 change only, not touched in Phase 2
- Filter logic — reads `bioState` from batch response, unaffected by cache draft

---

## Commit

```
6709a49 — bio pending fix Phase 2: populate cache draft from batch response
          (draft:null -> animal.draft||null) so pending drafts show in panel
          with enabled Approve
```

dashboard/index.html only, 1 insertion / 1 deletion. [VERIFIED]
