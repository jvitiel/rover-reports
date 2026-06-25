# SM-Comment Auto-Generation Diagnosis — Why Profile Auto-Fires But SM Comment Doesn't

**Date:** 2026-06-25  
**Type:** Read-only diagnosis  
**Status:** Root cause identified — cause (a): auto-trigger is keyed to profile-save event; no equivalent SM-comment event

---

## 1. The Auto-Generate Trigger (Profile Path)

**Trigger location:** `server.ts:6213-6230` — inside the `/api/caregiver/save` endpoint handler.

When a caregiver profile is saved, the endpoint:
1. Writes the behavior notes to the DB (`saveBehaviorNotes`, line 6205)
2. Sends the HTTP response immediately (line 6210)
3. **Background:** fires `generateBioDraftForAnimal(resolvedCode)` (line 6215)

```ts
// server.ts:6213-6230
if (!bioGenerationInFlight.has(resolvedCode)) {
  bioGenerationInFlight.add(resolvedCode);
  generateBioDraftForAnimal(resolvedCode)
    .then(draft => {
      if (draft) {
        console.log(`[profile-trigger] background bio draft generated for ${resolvedCode} (source: ${draft.lastSource})`);
      } else {
        console.log(`[profile-trigger] no seed available for ${resolvedCode}, skipped`);
      }
    })
    .catch(err => {
      console.error(`[profile-trigger] background bio generation failed for ${resolvedCode}:`, err);
    })
    .finally(() => {
      bioGenerationInFlight.delete(resolvedCode);
    });
} else {
  console.log(`[profile-trigger] generation already in-flight for ${resolvedCode}, skipping duplicate`);
}
```

**What it calls:** `generateBioDraftForAnimal()` (server.ts:2126) — the shared generation core that:
1. Resolves the animal from SM
2. Checks for profile (`getBehaviorNotes`) → `full_generate` / SM comment (`hasStaffSMComment`) → `sm_generate`
3. Calls `generateAnimalBio()` (GPT-4o) to produce 4 windows (long EN, long ES, short EN, short ES)
4. Writes the draft via `saveAnimalBioDraft()` with `source: generationSource`

**Source produced:** `full_generate` (mapped to origin `from_profile` by `mapSourceToOrigin`)

**Key point:** `generateBioDraftForAnimal` already handles the SM-comment path internally (lines 2153-2156) — if there's no profile but there IS an SM comment, it generates with `source: 'sm_generate'`. The function is **ready** to handle SM-only animals. The gap is that nobody calls it for them.

---

## 2. Why SM-Comment Doesn't Auto-Fire

**Cause: (a)** — the auto-generate trigger is keyed specifically to the profile-save event (`/api/caregiver/save`), and there is no equivalent event when an SM comment arrives.

SM comments (ANIMALCOMMENTS) come from ShelterManager via the animal sync. They are fetched live by `fetchAnimals()` from the SM API on every dashboard load / API call. There is no "SM comment saved" event, no webhook, no write event — the comment is simply a field on the SM animal record that appears when someone edits it in ShelterManager.

**The lifecycle gap:**

| Path | Event | Auto-fires generation? |
|---|---|---|
| Profile saved | `/api/caregiver/save` | ✅ Yes — line 6215 |
| SM comment appears | SM animal record updated (external) | ❌ No event on our server |
| Youth animal created | Generic bio daily job (9:30am ET) | ✅ Yes — generic only, no AI |
| Youth ages out | Daily job Pass 2 (`runAdultGenericUpgrades`) | ✅ Yes — SM comment → `sm_generate` draft |
| Adult intake (no bio) | Daily job Pass 3 (`findAdultIntakeCandidates`) | ⚠️ Partial — only `has_profile` bucket gets AI draft; `no_profile` gets generic only |

**The daily job's aged-out path** (server.ts:13270-13283, `upgradeAgedOutGeneric`, bucket `has_sm_comment`) DOES auto-generate from SM comments — but only for animals that previously had a youth generic bio and aged out of youth. It does NOT cover:
- Animals that arrive as adults and only have an SM comment (adult-intake `no_profile` bucket → generic only, no AI draft)
- Animals of any age that get an SM comment added after their bio was already created as generic

**The adult-intake path** (server.ts:13369-13415, `upgradeAdultIntake`) uses a two-bucket system (`has_profile` | `no_profile`). SM-comment-only animals land in `no_profile` and get **only a generic bio** — no AI draft is generated. The function doesn't distinguish "has SM comment but no profile" from "has nothing."

---

## 3. What "Regenerate" Does for SM (The Manual Path That Works)

**Regenerate endpoint:** `server.ts:2203-2270` — `/api/bio/:shelterCode/regenerate/:size`

The SM-comment branch (server.ts:2243-2245):
```ts
} else if (hasStaffSMComment(animal)) {
  // SM comment fallback
  transcripts = animal.description;
  mergedAttributesJson = '{}';
}
```

This calls `regenerateSingleBio()` (per-size, not full 4-window) and writes via `saveAnimalBioDraftSize()`.

**But** the shared `generateBioDraftForAnimal()` (server.ts:2126) also handles SM comments (line 2153-2156) and generates all 4 windows at once — this is the function the profile-trigger calls, and it's the right function for auto-generation (generates both long+short in one call).

```ts
// server.ts:2153-2156 — SM comment path in generateBioDraftForAnimal
} else if (hasStaffSMComment(animal)) {
  transcripts = animal.description;
  mergedAttributesJson = '{}';
  generationSource = 'sm_generate';
}
```

**The auto-trigger should call `generateBioDraftForAnimal()`** — the same function the profile-trigger uses. It already produces `sm_generate` source for SM-only animals.

---

## 4. The Generic Fallback

### Youth generics
- **Created by:** Daily job at 9:30am ET (`runGenericBioJob`, server.ts:12915)
- **Candidates:** `findGenericBioCandidates()` — animals ≤84 days old with no existing bio
- **What it writes:** Deterministic template bio via `renderGenericBios()` — no GPT call
- **Status:** Written directly to `animal_bios` as `status_long='approved'`, `status_short='approved'`, `source='generic'`
- **Lifecycle:** When the youth ages past 84 days, the daily job's Pass 2 (`runAdultGenericUpgrades`) upgrades it

### Adult generics
- **Created by:** Daily job Pass 2 (aged-out upgrade, `no_content` bucket) or Pass 3 (adult intake)
- **What it writes:** `renderAdultGenericBios()` — deterministic template, `source='generic_adult'`

### Generic → real lifecycle
The generic bio sits in `animal_bios` as approved. When a real bio is generated (from profile or SM), it lands in `animal_bio_drafts` as a pending draft. The generic stays as the live bio until the draft is promoted. This means:
- Profile path: generic is live → profile saved → AI draft generated automatically → shows in 4 windows as pending → user approves → replaces generic
- SM path (current): generic is live → SM comment exists → **nothing fires** → generic stays → user manually clicks Regenerate → AI draft appears → user approves

---

## 5. Side-by-Side: Profile vs SM

| Step | Profile Path | SM-Comment Path (current) |
|---|---|---|
| Data arrives | Caregiver saves via `/api/caregiver/save` | SM admin edits ANIMALCOMMENTS in ShelterManager |
| Event on server | POST handler fires (server.ts:6170) | No event — data fetched live on next API call |
| Auto-generate fires? | ✅ Yes — `generateBioDraftForAnimal()` called in handler (server.ts:6215) | ❌ No — no trigger exists |
| Draft appears? | ✅ Immediately — 4 windows populated | ❌ No — generic bio shown, no AI draft |
| User action needed? | Review + approve (or regenerate) | Must click Regenerate first, THEN review + approve |
| Source tag | `full_generate` → `from_profile` | (after manual regen) `sm_generate` → `from_sm` |

**The missing piece:** There is no code that detects "this animal has an SM comment but no real (non-generic) draft" and calls `generateBioDraftForAnimal()`. The profile path has an explicit event (profile save) that fires the generation. The SM path has no equivalent event because SM comments arrive from an external system with no webhook.

---

## 6. Firing Discipline

### How the profile path avoids re-firing

The profile auto-trigger has **two guards:**

1. **In-flight dedup** (server.ts:6213): `bioGenerationInFlight` Set prevents concurrent calls for the same animal:
   ```ts
   if (!bioGenerationInFlight.has(resolvedCode)) {
     bioGenerationInFlight.add(resolvedCode);
     // ... generate ...
     .finally(() => { bioGenerationInFlight.delete(resolvedCode); });
   }
   ```

2. **Event-driven, not poll-driven:** The trigger fires exactly once per profile save. It does NOT check "does a draft exist?" before generating — it always generates. This is intentional: re-saving a profile should regenerate the draft (the profile content may have changed).

### For SM auto-generation, the discipline must be different

Unlike profiles, SM comments have no save event. The auto-generation must be triggered from a poll/check point (e.g., the daily job, or the dashboard load). This means it MUST have a "no real draft yet" guard to avoid re-firing on every check. Specifically:

**Guard:** Fire only when:
- Animal has a meaningful SM comment (`hasStaffSMComment` or `hasMeaningfulSMComment`)
- Animal has NO caregiver profile (profile path takes priority)
- Animal has no existing real (non-generic) draft — i.e., no `animal_bio_drafts` row with `sourceLong` or `sourceShort` in (`from_profile`, `from_sm`), OR no `animal_bio_drafts` row at all, OR existing draft is from generic source only
- Animal's `animal_bios` source is generic (youth_generic or adult_generic) or doesn't exist yet

This mirrors the aged-out upgrade's `has_sm_comment` bucket guard: it only fires for animals that currently have a generic bio and no AI-seeded draft.

---

## 7. Where the Fix Belongs

There are **two viable trigger points** (not mutually exclusive):

### Option A: Daily job — extend `upgradeAdultIntake` / add a new pass (recommended)

**Location:** The daily generic bio job (`runGenericBioJob`, server.ts:12915)

Add a new pass (Pass 4) or extend the adult-intake logic:
- Find all animals with:
  - A generic bio (youth or adult) in `animal_bios` (source = `generic` or `generic_adult`)
  - No existing real draft in `animal_bio_drafts` (or no draft at all)
  - A meaningful SM comment (via `hasMeaningfulSMComment`)
  - No caregiver profile (profile path handles those)
- For each, call `generateBioDraftForAnimal(shelterCode)` — it will pick up the SM comment path and produce `sm_generate`

**Firing discipline:** The daily job runs once at 9:30am ET. The "no real draft exists" check prevents re-firing on subsequent days. The `bioGenerationInFlight` in-memory Set prevents concurrent calls.

**Also fix the adult-intake bucket:** `findAdultIntakeCandidates` (server.ts:13337) currently classifies all non-profile animals as `no_profile`. Extend to `has_profile` | `has_sm` | `no_data`. In `upgradeAdultIntake`, the `has_sm` bucket should write the adult generic AND fire `generateBioDraftForAnimal()` (mirroring what `has_profile` does). Currently `no_profile` only gets `generic_only`.

### Option B: Dashboard load trigger (more immediate, more complex)

**Location:** The dashboard behavior-notes endpoint (server.ts:1098, `/api/dashboard/behavior-notes`)

During the per-animal loop, check: "has SM comment, no profile, no real draft, has generic bio → fire background generation." This would trigger immediately when the dashboard is opened, not waiting for the daily job.

**Pros:** Immediate — the AI draft appears on first dashboard view after SM comment is added.  
**Cons:** Dashboard load becomes a trigger for generation calls (cost concern if many animals qualify). Needs the same guards + `bioGenerationInFlight` dedup.

### Recommendation

**Option A (daily job)** is the safer, more disciplined approach — mirrors the existing generic-bio lifecycle, fires once per day, batched, logged. The latency (up to 24h before the SM draft appears) is acceptable since SM comments aren't time-critical the way profile saves are.

If John wants near-instant triggering, Option B can be added alongside A, with the "no real draft yet" guard ensuring it fires at most once per animal.

**Single fix location for Option A:** `server.ts`, in or near `runGenericBioJob()` (~line 12915). One new pass, one new candidate finder function, calling the existing `generateBioDraftForAnimal()`.

---

*End of diagnosis.*
