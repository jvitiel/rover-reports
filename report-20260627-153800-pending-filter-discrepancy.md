# Dashboard "Pending" Filter Discrepancy: Media Tab (11) vs Profiles Tab (0)

**Date:** 2026-06-27 19:38 UTC  
**Type:** Read-only diagnosis  
**Status:** Root cause identified — code bug

---

## 1. What Each Tab Counts

**Both tabs count animals (not individual media/photo rows).** The hypothesis that Media counts media rows and Profiles counts animals is incorrect — both filter the same kind of entity (animal objects). The difference is in how each endpoint computes the `bioState` label.

### Media Tab (main dashboard)

- **Data source:** `GET /api/dashboard/behavior-notes` → `renderData()` → `allAnimalsData`
- **Filter predicate:** `allAnimalsData.filter(a => a.bioState === currentBioStateFilter)` (dashboard/index.html:7020)
- **Default active filters:** `currentAdoptionStatusFilter = 'adoptable'` (line 7087) — only `isAvailable` animals shown
- **bioState computation on server:** `computeBioState(fullBio, smAnimal.shelterCode, smAnimal.description, smAnimal.dateOfBirth, draftData)` (server.ts:1256) — **passes actual draft data as 5th argument**

### Profiles Tab

- **Data source:** `GET /api/dashboard/profiles-summary` → `profilesCache`
- **Filter predicate:** `animals.filter(a => a.bioState === profilesBioStateFilter)` (dashboard/index.html:15734)
- **Default active filters:** `profilesAdoptableFilter = 'adoptable'` (line 15619) — only `isAvailable` animals shown
- **bioState computation on server:** `computeBioState(bioForLabel, sm.shelterCode, sm.description, sm.dateOfBirth, null)` (server.ts:1369) — **passes `null` for draft**

---

## 2. Why "Needed" Agrees But "Pending" Doesn't

The `computeBioState()` function (server.ts:2695) has this logic:

```typescript
// Helper: an unpromoted REAL draft exists on either size
const hasUnpromotedRealDraft = !!draft && (
    (!draft.promotedLong && (draft.sourceLong === 'from_profile' || draft.sourceLong === 'from_sm')) ||
    (!draft.promotedShort && (draft.sourceShort === 'from_profile' || draft.sourceShort === 'from_sm'))
);

// 1. PENDING — only for non-youth
if (!isYouth && (hasUnpromotedRealDraft || brokenPipeline)) return 'pending';

// 2. APPROVED — non-generic approved bio AND no unpromoted real draft waiting
if (hasApprovedRealBio && !hasUnpromotedRealDraft) return 'approved';
```

When `draft` is `null` (profiles-summary), `hasUnpromotedRealDraft` is always `false`. This eliminates one of two paths into "pending" and one exclusion from "approved".

**Why "Needed" agrees:** "Needed" is the catch-all fallback (step 4). Animals that reach "needed" have no approved bio, no draft, no staff content, and aren't youth. The draft parameter doesn't affect any of those conditions. The only animals affected by the draft bug are those with **both** an approved real bio **and** an unpromoted real draft — they flip between "pending" (Media tab) and "approved" (Profiles tab), never touching "needed" or "youth".

**Why "Pending" diverges:** The 11 animals have approved real bios AND unpromoted real drafts. With draft data (Media tab), `hasUnpromotedRealDraft` fires first → "pending". Without draft data (Profiles tab), it skips to `hasApprovedRealBio` → "approved". The `brokenPipeline` path (the other way into "pending") doesn't depend on draft data and works identically in both endpoints — but these 11 animals don't trigger it because they already have approved bios.

---

## 3. The 11 Pending Media-Tab Animals

All 11 are available (`isAvailable=true`) animals that the Media tab shows as "pending" but the Profiles tab shows as "approved":

| shelter_code | Name | Media Tab bioState | Profiles Tab bioState | Has Approved Real Bio | Has Unpromoted Draft |
|---|---|---|---|---|---|
| S2025966 | Abe (Louie) | pending | approved | ✅ (backfill) | ✅ from_profile |
| B2026001 | Arnold | pending | approved | ✅ (promote_from_draft) | ✅ from_profile |
| S2024718 | Bailey | pending | approved | ✅ (promote_from_draft) | ✅ from_profile |
| S2026047 | Buckley | pending | approved | ✅ (backfill) | ✅ from_profile |
| R2023007 | Charlie | pending | approved | ✅ (promote_from_draft) | ✅ from_profile |
| S2025877 | Kirby | pending | approved | ✅ (manual_edit_short) | ✅ short unpromoted |
| A2025203 | Marshmallow | pending | approved | ✅ (full_generate) | ✅ from_profile |
| R2025005 | Peanut Butter | pending | approved | ✅ (manual_edit_long) | ✅ from_profile |
| R2026008 | Willow the Rabbit | pending | approved | ✅ (promote_from_draft) | ✅ long unpromoted |
| S2026081 | Gigi | pending | approved | ✅ (promote_from_draft) | ✅ from_sm |
| S2026158 | Mambo | pending | approved | ✅ (manual_edit_short) | ✅ from_sm |

**Key finding:** All 11 have approved, non-generic bios that are currently public. They also have old draft rows in `animal_bio_drafts` that were never marked as promoted (even though the bio was already approved through another path like `manual_edit`, `backfill`, or a prior `promote_from_draft`).

The full mismatch is actually 32 animals (21 unavailable + 11 available), but only the 11 available ones are visible because both tabs default to the "Adoptable" filter.

---

## 4. Which Number Is Right

**(b) with nuance.** The Profiles tab (0 pending) is displaying the correct animal-level truth for these 11: their bios are approved and public. The Media tab (11 pending) is over-counting because it treats stale/orphaned draft rows as evidence of pending work.

However, the Media tab's behavior is also **intentionally designed** — the `computeBioState` function deliberately checks for unpromoted drafts and demotes "approved" to "pending" when one exists. The design intent is: "if there's a newer draft waiting to be promoted, the animal isn't truly done yet." The problem is that these draft rows are **stale** — they represent drafts that were superseded by direct bio edits (manual_edit, backfill, full_generate) and were never cleaned up.

---

## 5. Bug, Expected, or Stale Data?

**Verdict: (iii) Stale data, surfaced by a (ii) code inconsistency.**

Two separate issues:

### Issue A: Stale draft rows (data hygiene)
The 11 animals have `animal_bio_drafts` rows with `promoted_long=0` or `promoted_short=0` even though their bios were approved through non-draft paths (manual edit, backfill, full generation). When a bio is approved via `manual_edit_long`, `manual_edit_short`, `backfill`, or `full_generate`, the corresponding draft row's `promoted_*` flag is **not** updated. This leaves orphaned "unpromoted" drafts that `computeBioState` treats as pending work.

**Fix:** When a bio is approved through any path (not just promote-from-draft), mark the corresponding draft row as promoted. Or: add a cleanup sweep that marks drafts as promoted when the live bio is already approved with a newer timestamp.

### Issue B: profiles-summary skips draft data (code bug)
The profiles-summary endpoint (server.ts:1369) passes `null` for the draft parameter, while the behavior-notes endpoint (server.ts:1256) passes actual draft data. This means the two endpoints compute different `bioState` labels for the same animal. This is a real code bug — if the dashboard tab shows "pending" for an animal, the profiles tab should agree.

**Fix:** The profiles-summary endpoint should load draft data and pass it to `computeBioState`, matching the behavior-notes endpoint. The relevant change would be at server.ts:1369:
```typescript
// Current (buggy):
bioState: computeBioState(bioForLabel, sm.shelterCode, sm.description, sm.dateOfBirth, null),
// Fixed:
bioState: computeBioState(bioForLabel, sm.shelterCode, sm.description, sm.dateOfBirth, draftForAnimal),
```

### Recommended fix order:
1. **Fix Issue A first** (clean up stale drafts) — this eliminates the false "pending" signal at the source
2. **Then fix Issue B** (pass draft data in profiles-summary) — this ensures both tabs always agree, even when real unpromoted drafts exist

If only Issue B is fixed without addressing Issue A, both tabs would consistently show 11 animals as "pending" — which is still wrong because those drafts are stale.
