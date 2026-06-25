# SM Auto-Generation Trigger Design — Pending-State Detection + Once-Only Guard

**Date:** 2026-06-25  
**Type:** Read-only diagnosis  
**Status:** Hook point, fire predicate, and dedup strategy fully mapped

---

## 1. Where "Pending" Is Determined

`computeBioState()` at `server.ts:2668-2703`:

```ts
function computeBioState(
  bio: { lastSource?: string; statusLong: string; statusShort: string } | null,
  shelterCode: string,
  description: string | undefined | null,
  dateOfBirth: string | undefined | null,
  draft?: { promotedLong: boolean; promotedShort: boolean; sourceLong: string | null; sourceShort: string | null } | null,
): 'approved' | 'pending' | 'youth' | 'needed' {
  const age = ageInDays(dateOfBirth);
  const isYouth = age !== null && age <= 84;

  const hasUnpromotedRealDraft = !!draft && (
    (!draft.promotedLong && (draft.sourceLong === 'from_profile' || draft.sourceLong === 'from_sm')) ||
    (!draft.promotedShort && (draft.sourceShort === 'from_profile' || draft.sourceShort === 'from_sm'))
  );

  const hasApprovedRealBio = !!bio && !isGenericSource(bio.lastSource) &&
    (bio.statusLong === 'approved' && bio.statusShort === 'approved');

  const brokenPipeline = hasRealStaffContentForLabel(shelterCode, description) && !hasApprovedRealBio;

  // 1. PENDING — only for non-youth
  if (!isYouth && (hasUnpromotedRealDraft || brokenPipeline)) return 'pending';

  // 2. APPROVED
  if (hasApprovedRealBio && !hasUnpromotedRealDraft) return 'approved';

  // 3. YOUTH
  if (isYouth) return 'youth';

  // 4. NEEDED
  return 'needed';
}
```

### The exact "pending because SM comment exists but no AI draft yet" branch

An animal hits `'pending'` via the `brokenPipeline` path when:

- `hasRealStaffContentForLabel(shelterCode, description)` is true — meaning the animal has **either** a caregiver profile (`getBehaviorNotesCount > 0`) **or** a meaningful SM comment (non-empty, non-sentinel)
- `hasApprovedRealBio` is false — the animal does NOT have a non-generic approved bio
- `hasUnpromotedRealDraft` is false — there is NO real (from_profile/from_sm) draft awaiting approval
- `isYouth` is false (youth never pending)

**The distinguishing condition for "pending needs AI generation" vs "pending already has a draft":**

| State | hasUnpromotedRealDraft | brokenPipeline | Should fire? |
|---|---|---|---|
| SM comment, generic bio, NO real draft | false | true (staff content + no approved real bio) | ✅ YES |
| SM comment, real draft awaiting approval | true (from_sm draft exists) | irrelevant (short-circuit) | ❌ NO — draft exists |
| Profile, real draft awaiting approval | true (from_profile draft exists) | irrelevant | ❌ NO — profile path owns this |
| SM comment, approved real bio | false | false (has approved real bio) | ❌ NO — already approved |

The **fire-eligible state** is: `brokenPipeline === true && hasUnpromotedRealDraft === false` AND the reason for brokenPipeline is SM comment (not caregiver profile). The profile vs SM distinction must be checked externally — `hasRealStaffContentForLabel` doesn't differentiate them.

---

## 2. The Airtight Fire Predicate

Four clauses, all must be true:

### Clause 1: Meaningful SM comment exists
```ts
// server.ts:2650 — hasRealStaffContentForLabel uses this internally
// But we need the SM-specific check:
hasMeaningfulSMComment(smAnimal.description)  // server.ts:13173
// OR equivalently:
hasStaffSMComment(animal)  // server.ts:2616 — pure trim check
```

`hasMeaningfulSMComment` (server.ts:13173) is stricter (rejects sentinels like 'Unknown', 'Not specified'). Should use this one for consistency with `hasRealStaffContentForLabel`.

### Clause 2: No caregiver profile
```ts
getBehaviorNotesCount(shelterCode) === 0  // localDatabase.ts:1331
// OR in the dashboard loop: records.length === 0 (already computed)
```

If a profile exists, the profile-save trigger owns generation. Don't double-fire.

### Clause 3: No real (non-generic) draft exists
```ts
const draft = allDraftsMap.get(shelterCode);
const hasRealDraft = !!draft && (
  draft.sourceLong === 'from_profile' || draft.sourceLong === 'from_sm' ||
  draft.sourceShort === 'from_profile' || draft.sourceShort === 'from_sm'
);
// Fire only if !hasRealDraft
```

**Fields checked:** `animal_bio_drafts.source_long` and `animal_bio_drafts.source_short` — the origin-vocabulary columns we just fixed in the source-badge work.

### Clause 4: Current bio is generic or absent
```ts
const bio = fullBiosMap.get(shelterCode);
const isGenericOrAbsent = !bio || isGenericSource(bio.lastSource);
// isGenericSource: lastSource === 'generic' || lastSource === 'generic_adult'
```

### Re-fire guard proof

After `generateBioDraftForAnimal()` completes successfully:

1. It calls `saveAnimalBioDraft(shelterCode, {...}, { source: 'sm_generate' })` (server.ts:2171)
2. `saveAnimalBioDraft` calls `mapSourceToOrigin('sm_generate')` → returns `'from_sm'` (localDatabase.ts:1763)
3. The draft is written with `source_long = 'from_sm'`, `source_short = 'from_sm'` (localDatabase.ts:1846)
4. On the next check, Clause 3 evaluates: `draft.sourceLong === 'from_sm'` → `hasRealDraft = true` → **predicate is FALSE** → no re-fire

**Proof complete:** The predicate flips to false after exactly one successful generation. The `from_sm` source written by `saveAnimalBioDraft` is the same value checked by Clause 3.

---

## 3. Callers of computeBioState (Cost Surface)

| Caller | Location | Animals per call | Frequency | Has draft data? |
|---|---|---|---|---|
| `/api/dashboard/behavior-notes` | server.ts:1255 | ~495 (all SM animals) | Every dashboard media-tab load | ✅ Yes — `draftData` from `allDraftsMap` |
| `/api/profiles/summary` | server.ts:1368 | ~495 (all SM animals) | Every dashboard profiles-tab load | ❌ No — passes `null` for draft |
| `/api/sessions/active/:species` | server.ts:7733 | variable (active sessions) | Polled periodically | ❌ No — passes `null` for draft |

### Recommendation: Fire in the CALLER, not inside computeBioState

`computeBioState` is a **pure function** — it takes data in and returns a label. It should stay pure. Adding a side-effect (generation trigger) inside it would:
- Fire from ALL three callers (including profiles-tab and sessions, which don't even pass draft data)
- Make a pure function impure (harder to reason about, test, refactor)
- Risk unexpected generation from non-dashboard contexts

**The right place is the `/api/dashboard/behavior-notes` endpoint loop** (server.ts:1148-1260). This is:
- The primary dashboard load path (where the user sees the animal cards)
- The only caller that has ALL the data needed (SM animal, bio, draft, behavior notes)
- The natural place for background side-effects (the response loop already does other enrichment)

**Pattern:** After computing `bioState` for each animal, check the 4-clause predicate. If it fires, call `generateBioDraftForAnimal` in the background (non-blocking, guarded by `bioGenerationInFlight`). The dashboard response returns immediately with the current state; the AI draft appears on the next load.

---

## 4. The Dedup Guard — bioGenerationInFlight

**Declaration:** `server.ts:2122`
```ts
const bioGenerationInFlight = new Set<string>();
```

**Scope:** Module-level `const` — accessible from anywhere in `server.ts`, including both the `/api/caregiver/save` handler (line 6213) and the `/api/dashboard/behavior-notes` handler (line 1098).

**Reuse:** The SM auto-fire MUST use the SAME Set. This prevents:
1. **Two dashboard loads in quick succession:** First load adds shelterCode to Set, fires generation. Second load sees shelterCode in Set → skips. Draft is written → predicate false → no future re-fire.
2. **Profile save + dashboard load race:** If a profile is being saved (shelterCode in Set from profile-save trigger), the dashboard load won't double-fire.
3. **Multiple SM-eligible animals on one dashboard load:** Each animal checked independently, each guarded by its own shelterCode entry in the Set.

**The critical window:** Between adding to the Set (`bioGenerationInFlight.add(code)`) and the draft being written to DB, the "no real draft" predicate (Clause 3) is still true. Without the Set, a rapid reload would re-fire. The Set covers this exact window:

```ts
// Profile path pattern (server.ts:6213-6228) — to mirror:
if (!bioGenerationInFlight.has(resolvedCode)) {
  bioGenerationInFlight.add(resolvedCode);
  generateBioDraftForAnimal(resolvedCode)
    .then(draft => { /* log */ })
    .catch(err => { /* log */ })
    .finally(() => { bioGenerationInFlight.delete(resolvedCode); });
}
```

---

## 5. Re-Fire Safety Across Restarts

The `bioGenerationInFlight` Set is **in-memory only** — cleared on server restart.

**Worst case on restart mid-generation:**
1. Server crashes/restarts while `generateBioDraftForAnimal` is running
2. The GPT call either completed (draft written → Clause 3 blocks re-fire) or didn't (no draft → predicate true again)
3. If no draft was written: next dashboard load re-fires generation → one duplicate GPT call → produces the same `from_sm` draft
4. After that, Clause 3 blocks forever

**No infinite re-fire possible:** Once ANY `from_sm` draft is written (by either the interrupted or the re-fired generation), the predicate is permanently false. Worst case is one extra GPT call (~$0.01).

**No persistent marker needed:** The draft row itself IS the persistent marker. The in-memory Set covers the async gap; the DB state covers everything else.

---

## 6. Firing Mechanics

Mirror the profile-save pattern (server.ts:6213-6228):

```ts
// In the /api/dashboard/behavior-notes loop, after computing bioState:
// Check the 4-clause predicate
const shouldAutoGenSM = (
  hasMeaningfulSMComment(smAnimal.description) &&     // Clause 1
  !hasCaregiverData &&                                  // Clause 2 (records.length === 0)
  !hasRealDraft(draftData) &&                           // Clause 3
  (!fullBio || isGenericSource(fullBio.lastSource))     // Clause 4
);

if (shouldAutoGenSM && !bioGenerationInFlight.has(smAnimal.shelterCode)) {
  bioGenerationInFlight.add(smAnimal.shelterCode);
  generateBioDraftForAnimal(smAnimal.shelterCode)
    .then(draft => {
      if (draft) console.log(`[sm-auto-gen] background bio draft generated for ${smAnimal.shelterCode} (source: ${draft.lastSource})`);
      else console.log(`[sm-auto-gen] no seed available for ${smAnimal.shelterCode}, skipped`);
    })
    .catch(err => {
      console.error(`[sm-auto-gen] background bio generation failed for ${smAnimal.shelterCode}:`, err);
    })
    .finally(() => {
      bioGenerationInFlight.delete(smAnimal.shelterCode);
    });
}
```

**Non-blocking:** The `generateBioDraftForAnimal` call is not awaited. The dashboard response returns immediately with the current state. The generation runs in the background.

---

## 7. Latency Reality

**First load after SM comment appears:**
1. Dashboard loads → animal shows as "pending" with generic bio in the 4 windows
2. The 4-clause predicate fires → generation starts in background (~5-15 seconds for GPT call + translation)
3. The dashboard response is already sent → user sees generic bio on this load

**Second load (a few seconds / next refresh later):**
1. The `from_sm` draft is now in `animal_bio_drafts`
2. Dashboard loads → draft data is present → 4 windows show the AI bio (from_sm) awaiting approval
3. The predicate is false → no re-fire

**The user experience:**
- Open dashboard → see "Pending" badge + generic bio → generation is firing in the background
- Refresh (or open the animal's panel a moment later) → AI bio appears in all 4 windows, ready for review
- No "generating…" spinner needed for MVP — the generic bio serves as the visible placeholder during the brief async gap
- If desired later, a "generating AI bio…" indicator could be added when the predicate fires, but that's a UI enhancement, not required for the trigger

**Not blocking the load is correct:** Awaiting generation would add 5-15 seconds to the dashboard load, which serves ~495 animals. The background-fire pattern is what the profile path uses and what the daily job uses. Consistency + UX favor async.

---

*End of diagnosis.*
