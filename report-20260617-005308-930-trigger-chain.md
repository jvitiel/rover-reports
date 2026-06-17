# 9:30am Trigger Chain — Full Trace

**Date:** 2026-06-17 00:53 UTC  
**Scope:** Read-only diagnosis. No changes made.

---

## 1. The 9:30 Job Registration

```typescript
// server.ts:11580-11605
function scheduleGenericBioJob(): void {
  const msUntilNext930AM = (): number => {
    // ... calculates ms until 9:30am ET
  };
  setTimeout(() => {
    runGenericBioJob();                    // ← first run
    setInterval(() => {
      runGenericBioJob();                  // ← daily repeat
    }, 24 * 60 * 60 * 1000);
  }, initialDelay);
}

scheduleGenericBioJob();  // server.ts:11604 — called at startup
```

**Top-level function:** `runGenericBioJob()` (server.ts:11518) [VERIFIED]

---

## 2. Full Call Tree

```
runGenericBioJob()                              server.ts:11518
├── Pass 1: Youth Generics
│   ├── findGenericBioCandidates()              server.ts:11446
│   │   └── fetchAnimals({ includeUnavailable: false })   ← SM pull (adoptable only)
│   │       For each animal:
│   │       ├── ageInDays(dob) > 84 → skip
│   │       ├── getBehaviorNotes(sc) exists → skip
│   │       ├── getAnimalBio(sc) exists → skip
│   │       └── → candidate (youth, no profile, no bio)
│   └── For each candidate:
│       └── renderGenericBios() → saveAnimalBio(approved)   ← deterministic template, auto-approved
│
├── Pass 2: Aged-Out Youth → Adult Upgrade
│   ├── runAdultGenericUpgrades()               server.ts:11846
│   │   ├── findAgedOutGenerics()               server.ts:11703
│   │   │   └── fetchAnimals({ includeUnavailable: false })   ← SM pull (adoptable only)
│   │   │       For each animal:
│   │   │       ├── getAnimalBio(sc) → must exist
│   │   │       ├── bio.lastSource !== 'generic' → skip   ← ONLY youth-generic source
│   │   │       ├── ageInDays(dob) ≤ 84 → skip
│   │   │       └── → candidate (was youth-generic, now >84 days)
│   │   └── For each aged-out:
│   │       ├── classifyAgedOut(animal)          server.ts:11786
│   │       │   ├── getBehaviorNotesCount > 0 → 'has_caregiver_profile'
│   │       │   ├── hasMeaningfulSMComment → 'has_sm_comment'
│   │       │   └── else → 'no_content'
│   │       └── upgradeAgedOutGeneric(animal, bucket)   server.ts:11792
│   │           ├── has_caregiver_profile → SKIP (action: 'skipped')
│   │           ├── no_content → renderAdultGenericBios() → saveAnimalBio(approved)
│   │           └── has_sm_comment → generateAnimalBio() → saveAnimalBioDraft(pending)
│   │                                                      ↑ AI-SEED PATH (sm_generate)
│
└── Pass 3: Adult Intake (no bio at all)
    ├── findAdultIntakeCandidates()              server.ts:11894
    │   └── fetchAnimals({ includeUnavailable: false })   ← SM pull (adoptable only)
    │       For each animal:
    │       ├── ageInDays(dob) ≤ 84 → skip
    │       ├── getAnimalBio(sc) exists → skip      ← EXISTING BIO GUARD
    │       ├── getAnimalBioDraft(sc) exists → skip ← EXISTING DRAFT GUARD
    │       └── → candidate (adult, no bio, no draft)
    └── For each candidate:
        └── upgradeAdultIntake(animal, { dryRun: false })   server.ts:11926
            ├── renderAdultGenericBios() → saveAnimalBio(approved)   ← always writes generic
            └── if has_profile:
                └── generateBioDraftForAnimal(sc)   server.ts:2052   ← AI DRAFT
                    ├── getAnimalById(sc, true)
                    ├── getBehaviorNotes(sc) → profile path ('full_generate')
                    │   OR hasStaffSMComment → SM path ('sm_generate')
                    ├── generateAnimalBio({ ... })   ← GPT-4o, all 4 fields
                    └── saveAnimalBioDraft(sc, ...)   ← animal_bio_drafts, pending
```

[VERIFIED — every line number confirmed via direct code read]

### Does the 9:30 job pull/refresh from SM first?

**Yes.** Each pass calls `fetchAnimals({ includeUnavailable: false })` which hits SM's API live. There is no local cache or snapshot comparison — it reads the current SM state directly. [VERIFIED — shelterManagerService.ts:132, called at server.ts:11447, 11704, 11895]

### Where does it decide an animal needs a bio?

Each pass has different selection criteria (see tree above). The branching into bio-gen happens at:
- Pass 2: `upgradeAgedOutGeneric` → `has_sm_comment` bucket → `generateAnimalBio()` + `saveAnimalBioDraft()` (server.ts:11827-11838)
- Pass 3: `upgradeAdultIntake` → `has_profile` bucket → `generateBioDraftForAnimal()` (server.ts:11965)

[VERIFIED]

---

## 3. The Entry Signal — What Selects Animals

The 9:30 job does NOT key on "newly adoptable" status changes. It keys on **current state** — each pass evaluates the current SM + local DB state independently:

| Pass | Input Condition | Achilles (A2025088) |
|---|---|---|
| 1 — Youth | adoptable + age ≤84d + no behavior_notes + no animal_bios | ❌ age ~1100d |
| 2 — Aged-Out | adoptable + HAS animal_bios with lastSource='generic' + age >84d | ❌ lastSource='sm_copy' (not 'generic') |
| 3 — Adult Intake | adoptable + age >84d + NO animal_bios + NO animal_bio_drafts | ❌ HAS animal_bios row |

**Achilles is excluded from ALL 3 passes.** [VERIFIED]

- Pass 1 skips him: age ~1100 days >> 84 [VERIFIED — DOB 2023-05-31]
- Pass 2 skips him: `bio.lastSource = 'sm_copy'`, not `'generic'` [VERIFIED]
- Pass 3 skips him: `getAnimalBio('A2025088')` returns a row [VERIFIED]

**The 9:30 job would never process Achilles regardless of how many times it runs.** His existing partial `animal_bios` row (from the retired sm_copy endpoint) blocks Pass 3, and his `lastSource` blocks Pass 2.

---

## 4. Tickle Points Assessment

### (a) Top-level: `runGenericBioJob()`

- **Can it be run on demand?** No endpoint exists. Only the scheduler calls it (server.ts:11598-11600). [VERIFIED — grep for `runGenericBioJob` shows only 3 hits: definition + 2 scheduler calls]
- **Scope:** Processes ALL adoptable animals across 3 passes — mass side effects. [VERIFIED]
- **Would it pick up Achilles?** No — excluded from all 3 passes. [VERIFIED]
- **Verdict:** ❌ Not invocable, mass scope, and wouldn't process Achilles anyway.

### (b) Mid-chain: Per-animal functions

**`upgradeAdultIntake(animal, { dryRun: false })`** (server.ts:11926):
- Takes a single `AdultIntakeCandidate` object
- Writes an approved adult generic bio + fires `generateBioDraftForAnimal` if `has_profile`
- **Problem:** Achilles wouldn't reach this function because `findAdultIntakeCandidates` filters him out (existing bio). To use it, you'd have to construct the `AdultIntakeCandidate` object manually and call the function directly — there's no per-animal endpoint.
- **Side effect:** Writes an approved adult_generic bio (overwrites his existing sm_copy bio) PLUS fires a draft. This is destructive — it would replace his sm_copy content with template text. [VERIFIED]
- **Verdict:** ❌ Not safely invocable. Destructive. No endpoint.

**`upgradeAgedOutGeneric(animal, bucket)`** (server.ts:11792):
- Similar issues — no endpoint, Achilles wouldn't qualify (`lastSource` isn't `'generic'`).
- **Verdict:** ❌ Not applicable.

**`generateBioDraftForAnimal(shelterCode)`** (server.ts:2052):
- Takes a single shelterCode
- Produces all 4 bio fields via GPT-4o → writes to `animal_bio_drafts` (pending)
- Does NOT touch the existing `animal_bios` row
- Does NOT write to SM
- Has an HTTP endpoint: `POST /api/bio/generate/:animalId` (server.ts:2101)
- No existing-bio guard — works regardless of `animal_bios` state [VERIFIED]
- **Verdict:** ✅ Safe, single-animal, has endpoint, non-destructive.

### (c) Bottom: The generate endpoint

`POST /api/bio/generate/A2025088` (server.ts:2101):
- Calls `generateBioDraftForAnimal('A2025088')`
- Returns both the existing `animal_bios` data AND the new draft
- **Verdict:** ✅ This IS the bottom, and it's the highest safely-invocable point.

### Recommended Tickle Point

**`POST /api/bio/generate/A2025088`** — the generate endpoint. [VERIFIED]

This is the highest point in the chain that:
1. Can be invoked for a single animal ✅
2. Has an HTTP endpoint (no code-level access needed) ✅
3. Does not produce mass side effects ✅
4. Does not write to SM ✅
5. Writes to `animal_bio_drafts` (pending, not approved) ✅
6. Does not touch the existing partial `animal_bios` row ✅

There is no higher point that meets all these criteria. The 9:30 job itself is mass-scope and wouldn't pick up Achilles anyway. The mid-chain functions have no endpoints and some are destructive. The generate endpoint is the faithful test: it exercises the same `generateBioDraftForAnimal()` function that the production chain calls (at Pass 2 `has_sm_comment` and Pass 3 `has_profile`), with the same GPT-4o call, the same `saveAnimalBioDraft`, and the same pending-draft output. [VERIFIED]

---

## 5. Side Effects at the Recommended Tickle Point

When `POST /api/bio/generate/A2025088` is invoked:

| Side Effect | Detail |
|---|---|
| **SM read** | `getAnimalById('A2025088', true)` — reads Achilles from SM. No write. [VERIFIED] |
| **Local DB read** | `getBehaviorNotes('A2025088')` — reads behavior_notes. [VERIFIED] |
| **GPT-4o call** | `generateAnimalBio()` — one API call, produces EN+ES long+short. [VERIFIED] |
| **Local DB write** | `saveAnimalBioDraft('A2025088', ...)` — UPSERT into `animal_bio_drafts`. Creates new row (Achilles has none). promoted_long=0, promoted_short=0 (pending). [VERIFIED] |
| **Existing animal_bios** | UNTOUCHED. The sm_copy partial row stays as-is. [VERIFIED] |
| **Other animals** | UNTOUCHED. Endpoint takes single `animalId` parameter. [VERIFIED] |
| **SM write** | None. [VERIFIED] |
| **Email/alert** | None. [VERIFIED — no email or alert call in the generate endpoint or generateBioDraftForAnimal] |
| **Response** | Returns `{ success: true, data: <existing animal_bios>, draft: <new draft> }` for inspection. [VERIFIED — server.ts:2123] |

**Safe to run for Achilles (A2025088) without affecting others or SM.** [VERIFIED]

Achilles has behavior_notes (count=1), so `generateBioDraftForAnimal` will use the profile path (`full_generate`), producing a complete 4-field AI bio from the caregiver profile — the highest-quality generation path. [VERIFIED]

---

## Conclusions

**(a) Full 9:30 trigger chain:**

```
scheduleGenericBioJob() → setTimeout → runGenericBioJob()
  ├── Pass 1: findGenericBioCandidates → renderGenericBios → saveAnimalBio (approved youth templates)
  ├── Pass 2: findAgedOutGenerics → classifyAgedOut → upgradeAgedOutGeneric
  │     └── has_sm_comment → generateAnimalBio + saveAnimalBioDraft (pending AI draft)
  └── Pass 3: findAdultIntakeCandidates → upgradeAdultIntake
        └── has_profile → generateBioDraftForAnimal (pending AI draft)
```

All 3 passes start with `fetchAnimals({ includeUnavailable: false })` — live SM pull, adoptable only. No local-state comparison. [VERIFIED]

**(b) Input condition:** Current state evaluation, not status-change detection. Each pass has its own guard: age, lastSource='generic', existing bio/draft presence. Achilles fails all 3 guards — the 9:30 job would never process him. [VERIFIED]

**(c) Highest safe single-animal tickle point:**

```bash
curl -X POST http://localhost:3000/api/bio/generate/A2025088
```

Exercises the same `generateBioDraftForAnimal()` that production passes 2 and 3 call. Writes pending draft to `animal_bio_drafts`. No SM write, no mass side effects, no email, existing `animal_bios` row untouched. [VERIFIED]

**(d) Why this IS the faithful test:** The generate endpoint calls `generateBioDraftForAnimal`, which is the exact function invoked by the daily job's Pass 3 (`upgradeAdultIntake` for `has_profile` animals) and uses the same `generateAnimalBio()` → `saveAnimalBioDraft()` pipeline. The only difference is the candidate-selection logic above it — which is what excludes Achilles from the daily job. The generation + save chain is identical. [VERIFIED]
