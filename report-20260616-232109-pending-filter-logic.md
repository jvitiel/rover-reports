# Pending Filter Logic & Draft Visibility — Fix Design Diagnosis

**Date:** 2026-06-16 23:21 UTC  
**Scope:** Read-only — no changes

---

## 1. THE TWO "PENDING" CONTROLS [VERIFIED]

### 1a. Adoption Status Toggle — "Adoptable & Pending" / "Pending Only"

```html
<!-- dashboard/index.html:5199-5200 -->
<button onclick="setAdoptionStatusFilter('adoptable')" id="af-adoptable">Adoptable &amp; Pending</button>
<button onclick="setAdoptionStatusFilter('pending')" id="af-pending">Pending Only</button>
```

Predicate (dashboard:6878-6880):
```javascript
if (currentAdoptionStatusFilter === 'adoptable') {
    filtered = filtered.filter(a => a.isAvailable || a.adoptionPending);
} else if (currentAdoptionStatusFilter === 'pending') {
    filtered = filtered.filter(a => a.adoptionPending);
}
```

This filters on **adoption status** (adoptable vs adoption-pending) — completely unrelated to bio state. [VERIFIED]

### 1b. Bio State Filter — "Pending" button

```html
<!-- dashboard/index.html:5218 -->
<button class="bio-state-btn" id="bf-pending" onclick="setBioStateFilter('pending')">Pending</button>
```

Predicate (dashboard:6873-6874):
```javascript
} else if (currentBioStateFilter !== 'all') {
    filtered = filtered.filter(a => a.bioState === currentBioStateFilter);
}
```

This filters on `a.bioState === 'pending'` — the server-computed `bioState` field. **This is the control the user uses to find animals needing bio attention.** [VERIFIED]

---

## 2. bioState COMPUTATION [VERIFIED]

```typescript
// server/src/server.ts:2586-2605
function computeBioState(
  bio: { lastSource?: string; statusLong: string; statusShort: string } | null,
  shelterCode: string,
  description: string | undefined | null,
  dateOfBirth: string | undefined | null,
): 'approved' | 'pending' | 'youth' | 'needed' {
  // 1. Approved: non-generic bio with at least one approved status
  if (bio && !isGenericSource(bio.lastSource) &&
      (bio.statusLong === 'approved' || bio.statusShort === 'approved')) {
    return 'approved';
  }
  // 2. Pending: real staff content present (caregiver profile or meaningful SM comment)
  if (hasRealStaffContentForLabel(shelterCode, description)) {
    return 'pending';
  }
  // 3. Youth: age <= 84 days
  const age = ageInDays(dateOfBirth);
  if (age !== null && age <= 84) return 'youth';
  // 4. Needed: everything else
  return 'needed';
}

function isGenericSource(lastSource: string | null | undefined): boolean {
  return lastSource === 'generic' || lastSource === 'generic_adult';
}

function hasRealStaffContentForLabel(shelterCode: string, description?: string | null): boolean {
  if (getBehaviorNotesCount(shelterCode) > 0) return true;
  // ... checks SM description is non-trivial ...
}
```

### Key observations:

1. **`computeBioState` does NOT consider drafts at all.** Its `bio` parameter comes from `animal_bios` (the approved table). It never queries `animal_bio_drafts`. [VERIFIED]

2. **For Charlie (R2023007):** `bio.lastSource = 'promote_from_draft'` → `isGenericSource() = false` → step 1 succeeds → **returns 'approved'**. Charlie will NEVER appear under the "Pending" filter despite having a fully unpromoted short draft. [VERIFIED]

3. **For the 17 generic-bio animals with drafts:** `bio.lastSource = 'generic_adult'` → `isGenericSource() = true` → step 1 fails → step 2 checks `hasRealStaffContentForLabel` → all 17 have `behavior_notes` → **returns 'pending'**. These DO appear under the "Pending" filter, but for the wrong reason (staff content exists, not because a draft exists). [VERIFIED]

4. **For Abe (S2025966):** `bio.lastSource = 'backfill'` → `isGenericSource() = false` → step 1 succeeds → **returns 'approved'**. Same as Charlie — invisible to Pending filter. [VERIFIED]

---

## 3. WHAT "PENDING" CURRENTLY MATCHES [VERIFIED]

The "Pending" filter matches `bioState === 'pending'`, which means: "has a generic bio (or no bio) AND has real staff content (caregiver profile or SM description)."

### Why the user sees ~10 results, not 17 or 19:

The Pending filter is ANDed with the Adoption Status filter (default: "Adoptable & Pending"). Animals that are not adoptable and not adoption-pending are filtered out first. Of the 17 generic-bio + behavior_notes animals, only those currently adoptable/pending appear.

### What's wrong:

- **17 of 19 draft animals** appear under Pending — but for the wrong reason (staff content), and the panel shows the approved generic, not the draft. The Approve button is disabled (status shows "Approved and Public").
- **2 of 19 draft animals** (Charlie, Abe) are classified 'approved' and don't appear under Pending at all — they have non-generic `last_source` so step 1 matches.
- **The panel never shows the draft** regardless of which filter surfaces the animal, because `draft: null` in the cache (batch hardcoding).

---

## 4. THE BATCH ENDPOINT [VERIFIED]

```typescript
// server/src/server.ts:1224-1245
const fullBio = fullBiosMap.get(smAnimal.shelterCode) || null;  // approved bios ONLY

animals.push({
    // ...
    hasSeedContent: hasCaregiverData || !!(smAnimal.description && ...),
    bioState: computeBioState(fullBio, ...),
    bio: fullBio,      // ← approved only, no draft
    // ...
});
```

**No draft data included.** `fullBiosMap` is built from `getAllAnimalBios()` (the approved table). No `animal_bio_drafts` query in the entire endpoint. [VERIFIED]

### What would it take to add draft info:

**Insertion point:** Right after the `fullBiosMap` construction (~line 1112), add a batch draft load. There is currently no `getAllAnimalBioDrafts()` function — only the per-animal `getAnimalBioDraft(shelterCode)` exists (localDatabase.ts:1691). A new batch function would be needed.

**19 total draft rows, ~2KB average text per row → ~38KB total payload addition for full drafts.** Negligible. [VERIFIED]

The per-animal object would get `draft: draftData || null` alongside the existing `bio: fullBio`. The cache-population at dashboard:6812 would become:
```javascript
bioCache.set(animal.animalId, { data: animal.bio, draft: animal.draft || null });
```

---

## 5. FIX-SHAPE OPTIONS

### Option A: Full drafts in batch response

**Changes:**
1. Add `getAllAnimalBioDrafts()` to localDatabase.ts (batch SELECT)
2. Include `draft: draftMap.get(shelterCode) || null` in the batch endpoint response
3. Change dashboard:6812 from `draft: null` to `draft: animal.draft || null`
4. Update `computeBioState` to accept a `draft` parameter and factor unpromoted drafts into the state

**Pending filter:** ✅ Works IF computeBioState is updated to return 'pending' when an unpromoted draft exists (even if approved bio is non-generic). All 19 animals would get bioState='pending'.

**Panel display:** ✅ Works immediately. `useDraftLong`/`useDraftShort` logic already handles `draft.promotedLong/Short` correctly. The Approve button logic (`displayStatusLong === 'approved' ? disabled : enabled`) would work because `displayStatusLong` would show 'draft' when the draft is unpromoted.

**Payload cost:** +38KB (19 drafts × ~2KB). Negligible.

**Verdict:** Cleanest, simplest, fixes both the filter AND the panel in one shot. No lazy loading complexity. The draft table is tiny and won't grow large (drafts are replaced on regeneration, not accumulated).

### Option B: Lightweight flag + lazy load

**Changes:**
1. Add `hasPendingDraft: boolean` + `pendingDraftSourceLong/Short: string|null` to batch response
2. Update `computeBioState` to factor the flag
3. Change `loadBioForAnimal` to forceRefresh when `hasPendingDraft` is true and cache has `draft: null`
4. Or: change dashboard:6812 to not cache bio when hasPendingDraft, forcing a per-animal fetch on panel open

**Pending filter:** ✅ Works if computeBioState factors the flag.

**Panel display:** ⚠️ Requires a second fetch on panel open. Brief flash of approved-generic before draft loads. More complex, more code paths to maintain.

**Payload cost:** +~50 bytes per animal with draft (negligible). But adds a per-animal API call on panel open for draft animals.

**Verdict:** More complex for negligible payload savings. The full draft table is 38KB — not worth optimizing.

### Option C: Always forceRefresh on panel open

**Changes:**
1. Change `loadBioForAnimal` at dashboard:6919 to always use `forceRefresh = true`
2. No batch endpoint changes

**Pending filter:** ❌ Does NOT fix. bioState is still computed server-side without draft awareness. The Pending filter still misses Charlie/Abe and still shows the wrong bioState.

**Panel display:** ✅ Would load drafts when the panel is opened, but only AFTER the user scrolls to and expands the animal card.

**Payload cost:** Adds N per-animal API calls (one per rendered card). Defeats the purpose of batch loading. Performance regression.

**Verdict:** Partial fix only — doesn't fix the filter, adds N+1 fetches.

---

## CONCLUSION

**(a) BIO STATE "Pending" filter predicate:** `a.bioState === 'pending'` (dashboard:6874). `bioState` is server-computed by `computeBioState` (server.ts:2586) which does NOT consider drafts — only the approved bio's `lastSource` and staff content presence. [VERIFIED]

**(b) Why it can't see drafts:** `computeBioState` receives only the `animal_bios` row. No draft data is passed to it, and the batch endpoint doesn't include drafts. An animal with a non-generic approved bio (Charlie: `promote_from_draft`, Abe: `backfill`) gets `bioState='approved'` even with a fully unpromoted draft. [VERIFIED]

**(c) Current 10ish results:** The 17 generic-bio + behavior_notes animals that happen to be adoptable. They match 'pending' because `isGenericSource('generic_adult') = true` falls through to step 2 (staff content check), NOT because they have drafts. The panel still shows the approved generic. 2 animals (Charlie, Abe) with drafts are invisible to this filter. [VERIFIED]

**(d) Recommended fix: Option A** — include full draft objects in the batch response. 19 rows, ~38KB. Fixes both the filter (computeBioState gains draft awareness → returns 'pending' for any animal with unpromoted draft) AND the panel (draft data in cache → useDraftLong/useDraftShort work → shows pending draft text + enabled Approve button). No lazy loading, no extra fetches, no flash of wrong content. [VERIFIED that draft count is small and stable]

**(e) Implementation touches:**
1. `localDatabase.ts`: new `getAllAnimalBioDrafts()` batch function
2. `server.ts` batch endpoint (~1086): build drafts map, include `draft` per animal, update `computeBioState` to accept + factor draft
3. `dashboard/index.html:6812`: change `draft: null` to `draft: animal.draft || null`
4. Zero changes to `renderBioContent`, `approveBio`, or any panel logic — it already handles drafts correctly when they're present
