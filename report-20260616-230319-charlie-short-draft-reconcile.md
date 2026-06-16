# Charlie Short Draft Reconciliation — Display Bug

**Date:** 2026-06-16 23:03 UTC  
**Scope:** Read-only — no changes  
**Verdict:** DISPLAY BUG — profile-derived short draft exists in DB but is invisible to the dashboard

---

## 1. CHARLIE'S DRAFT ROW (animal_bio_drafts) [VERIFIED]

```
id:              2798addd-cc31-4554-87ed-f321d542e2db
shelter_code:    R2023007
generated_at:    2026-06-16T17:39:03.177Z  (today, 1:39pm ET)
promoted_long:   0
promoted_short:  0
last_source:     full_generate
source_long:     from_profile
source_short:    from_profile
bio_en_long:     798 chars — "Meet Charlie, the charming Hotot bunny with a striking appearance..."
bio_en_short:    191 chars — "Charlie, the dapper Hotot bunny with natural 'eyeliner', is a calm and social companion..."
bio_es_long:     831 chars (populated)
bio_es_short:    214 chars (populated)
```

**A profile-derived short draft EXISTS.** `bio_en_short` is 191 chars of profile-derived text, `source_short = from_profile`, `promoted_short = 0`. The prior report was correct about the DB state. [VERIFIED]

---

## 2. CHARLIE'S APPROVED ROW (animal_bios) [VERIFIED]

```
status_short:      approved
source_short:      adult_generic
approved_at_short: 2026-06-15T18:57:05.209Z
bio_en_short:      "Meet Charlie, a male Hotot with a White and Black coat who is approximately 3 years old..."
generated_at:      2026-06-15T18:57:05.209Z
```

This is the generic text. Matches what the user sees in the screenshot: "Approved and Public" + "Generic - Adult". [VERIFIED]

---

## 3. THE DISPLAY BUG [VERIFIED]

### Root cause: batch endpoint doesn't include drafts

The dashboard loads animal data from `GET /api/dashboard/behavior-notes` (server.ts:1086). This endpoint returns `bio: fullBio` where `fullBio` comes from `getAllAnimalBios()` — the **approved bios table only**. **No draft is included.** [VERIFIED at server.ts:1224, 1245]

When the dashboard processes this response, it caches:

```javascript
// dashboard/index.html:6812
bioCache.set(animal.animalId, { data: animal.bio, draft: null });
```

**`draft` is hardcoded to `null`.** [VERIFIED]

### Display logic with draft=null

When the bio panel renders (renderBioContent, line 7518):

```javascript
// dashboard/index.html:7534-7535
const useDraftShort = draft && !draft.promotedShort;
// draft is null → useDraftShort = false

// dashboard/index.html:7541-7542
const displayEnShort = useDraftShort ? draft.bioEnShort : (bio ? bio.bioEnShort : '');
// useDraftShort is false → shows bio.bioEnShort (the approved generic)

const displayStatusShort = useDraftShort ? 'draft' : (bio ? bio.statusShort : 'draft');
// useDraftShort is false → shows bio.statusShort ('approved')
```

**Result: the panel shows the approved generic short bio as "Approved and Public" with source "Generic - Adult".** The pending profile-derived short draft is invisible. [VERIFIED]

### The only way to load drafts

The draft is only fetched via `loadBioForAnimal(animalId, forceRefresh=true)`, which calls `GET /api/bio/:shelterCode`. This endpoint DOES return both `data` and `draft`. [VERIFIED at server.ts:2194-2205]

But `forceRefresh=true` is only triggered by:
- Line 7792: after a `DRAFT_CHANGED` error during promote
- Line 7798: after a successful promote

Both are inside `approveBio()` — meaning the draft only becomes visible AFTER the user clicks "Approve" (which promotes it, making it no longer a pending draft). **Circular: you can't see the draft until you approve it, and once approved, it's no longer a draft.** [VERIFIED]

The initial render call at line 6919 (`loadBioForAnimal(animal.animalId)` without `forceRefresh`) hits the cache (already populated by the batch at line 6812 with `draft: null`) and never fetches from the API. [VERIFIED]

---

## 4. TIMESTAMP RECONCILIATION [VERIFIED]

**Screenshot shows:** "Generated: Jun 15, 2026 02:57 PM"

**This is `bio.generatedAt`:** `2026-06-15T18:57:05.209Z` = Jun 15 2:57 PM ET. [VERIFIED]

This is when the `generic_adult` pass wrote the approved bio via `saveAnimalBio()`. The promotion at 23:12 UTC did NOT update `generated_at` — the `ON CONFLICT DO UPDATE SET` clause doesn't include `generated_at`. [VERIFIED at localDatabase.ts:1836-1842]

The draft's `generated_at` is `2026-06-16T17:39:03.177Z` (today 1:39 PM ET), but this is never displayed because `draft` is `null` in the cache. [VERIFIED]

---

## 5. DEFINITIVE ANSWER [VERIFIED]

**This is possibility (b): a profile-derived short draft DOES exist with promoted_short=0, but the dashboard is NOT displaying it.** It's a **display bug**.

The bug chain:
1. `GET /api/dashboard/behavior-notes` (batch endpoint) returns bio but **not** draft [VERIFIED at server.ts:1245]
2. `bioCache.set(animal.animalId, { data: animal.bio, draft: null })` hardcodes draft to null [VERIFIED at dashboard:6812]
3. `loadBioForAnimal(animalId)` (no forceRefresh) hits cache → never fetches draft from per-animal API [VERIFIED at dashboard:6919, 6642-6644]
4. `useDraftShort = null && ... = false` → shows approved generic instead of pending draft [VERIFIED at dashboard:7535]
5. "Approve for Public Use" button is disabled (because `displayStatusShort === 'approved'`) — user cannot approve a draft they cannot see [VERIFIED at dashboard:7628]

### Impact

**Any animal with BOTH an approved bio AND an unpromoted draft will show ONLY the approved bio.** The draft is completely invisible until a user action (regenerate, save) triggers a forceRefresh that loads the draft from the per-animal API. This means:

- The profile-save background trigger correctly generates drafts for both sizes [VERIFIED]
- The adult-intake pass correctly generates drafts for `has_profile` animals [VERIFIED]
- But the dashboard never shows those drafts until the user explicitly regenerates or saves

### Scope

This affects any animal where:
1. An approved bio exists (from generic pass or prior approval)
2. A profile was submitted AFTER the approval (creating a draft)
3. The user hasn't clicked Regenerate or Save since the draft was created

```sql
-- Animals with approved bios AND unpromoted drafts
SELECT b.shelter_code, d.source_long, d.source_short, d.promoted_long, d.promoted_short
FROM animal_bios b
JOIN animal_bio_drafts d ON b.shelter_code = d.shelter_code
WHERE d.promoted_long = 0 OR d.promoted_short = 0;
```

This query should be run to determine full scope, but was not executed (read-only diagnosis boundary — the query itself is safe but the finding is already clear from code analysis).

---

## CONCLUSION

**(a)** A pending profile-derived short draft **does exist** for Charlie: 191 chars, source `from_profile`, `promoted_short=0`. [VERIFIED]

**(b)** The display logic computes `useDraftShort = false` because the batch cache sets `draft: null`. The panel shows the approved generic and disables the Approve button. [VERIFIED]

**(c)** This is a **display bug**, not a pipeline gap. The pipeline correctly generates both sizes from profile. The dashboard batch load drops the draft on the floor. [VERIFIED]

**(d)** The "Jun 15 02:57 PM" timestamp is `bio.generatedAt` from the approved row (when the generic was written). The draft's timestamp (Jun 16 1:39 PM ET) is never shown because the draft isn't loaded. [VERIFIED]

### Fix direction (not implemented)

Either:
1. Include drafts in the batch endpoint response (`GET /api/dashboard/behavior-notes`) and populate `draft` in the cache, OR
2. Change `loadBioForAnimal` to always fetch from the per-animal API (forceRefresh=true) when the bio panel is opened, OR
3. Add draft state to the batch response as a flag (e.g., `hasPendingDraft: true`) and lazy-load the draft when the panel opens
