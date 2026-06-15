# Adult-intake daily job wiring — scoping diagnosis

**Date:** 2026-06-15 21:18 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Q1: runGenericBioJob current structure

```typescript
async function runGenericBioJob(): Promise<{ published: number; animals: string[]; adultUpgrades: number }> {
  console.log('[Generic Bio] Daily job running');

  // PASS 1: youth generics
  const candidates = await findGenericBioCandidates();
  // ... loop: renderGenericBios → saveAnimalBio (source='generic', approved) ...
  if (names.length > 0) {
    console.log(`[Generic Bio] Published ${names.length} youth generic bios: ${names.join(', ')}`);
  }

  // PASS 2: age-crossing upgrades
  const upgradeResult = await runAdultGenericUpgrades();

  if (names.length === 0 && upgradeResult.upgraded === 0) {
    console.log('[Generic Bio] No new youth candidates or aged-out upgrades');
  }

  return { published: names.length, animals: names, adultUpgrades: upgradeResult.upgraded };
}
```

**Pass 1** call site: inline in `runGenericBioJob` (line 11538).  
**Pass 2** call site: `runAdultGenericUpgrades()` called at line 11565, which internally calls `findAgedOutGenerics()` then loops `upgradeAgedOutGeneric()`.

### Logging/summary per pass

| Pass | Log line |
|------|----------|
| Pass 1 | `[Generic Bio] Published N youth generic bios: Name (Code), ...` |
| Pass 2 | `[Adult Generic] Upgraded N, skipped N: Name(Code)=action, ...` |
| Neither | `[Generic Bio] No new youth candidates or aged-out upgrades` |

---

## Q2: Mutual exclusivity of the three candidate sets

### Pass 1 — findGenericBioCandidates
```typescript
// adoptable (includeUnavailable: false)
// age <= GENERIC_BIO_MAX_AGE_DAYS (84) — SKIP if age > 84
// no behavior_notes (getBehaviorNotes returns null)
// no animal_bios row (getAnimalBio returns null)
```

### Pass 2 — findAgedOutGenerics
```typescript
// adoptable (includeUnavailable: false)
// HAS animal_bios row — SKIP if (!bio) continue
// bio.lastSource === 'generic' — SKIP if not 'generic'
// age > GENERIC_BIO_MAX_AGE_DAYS (84) — SKIP if still youth
```

### Pass 3 — findAdultIntakeCandidates
```typescript
// adoptable (includeUnavailable: false)
// age > GENERIC_BIO_MAX_AGE_DAYS (84)
// NO animal_bios row — SKIP if getAnimalBio returns non-null
// NO animal_bio_drafts row — SKIP if getAnimalBioDraft returns non-null
```

### Exclusivity proof

**Pass 1 vs Pass 3:** Mutually exclusive by age gate. Pass 1 requires `age ≤ 84`. Pass 3 requires `age > 84`. No animal can match both. ✅

**Pass 2 vs Pass 3:** Mutually exclusive by bio existence. Pass 2 requires `getAnimalBio(code)` returns a non-null row with `lastSource='generic'`. Pass 3 requires `getAnimalBio(code)` returns null (no bio row). An animal cannot simultaneously have and not have an `animal_bios` row. ✅

**Pass 1 vs Pass 2:** Mutually exclusive by age gate (same as above — Pass 1 requires ≤84, Pass 2 requires >84). ✅

**All three are pairwise mutually exclusive. No animal can be processed by more than one pass in a single run.**

---

## Q3: Cross-pass interaction within a single run

### Can Pass 1 or 2 create an animal newly eligible for Pass 3?

**Pass 1** writes a new `animal_bios` row (source='generic'). An animal that Pass 1 processes now HAS a bio row → Pass 3 would skip it (requires no bio row). ✅ No overlap.

**Pass 2** writes/updates an `animal_bios` row (source='generic_adult' or 'sm_generate'). An animal that Pass 2 processes already HAD a bio row (that's how Pass 2 found it) and still has one → Pass 3 would skip it. ✅ No overlap.

**Pass 3** writes a new `animal_bios` row (source='generic_adult'). Could it make an animal eligible for Pass 1 or 2 on the same run? No — Pass 1/2 already ran before Pass 3. And on the NEXT run: the animal now has a bio, so Pass 3 won't pick it up again, and Pass 2 would only pick it up if `lastSource='generic'` (but it's 'generic_adult', so Pass 2 skips it). ✅ No interaction.

**Safe to run Pass 3 after Pass 1 and Pass 2.** No cross-pass contamination.

---

## Q4: upgradeAdultIntake suitability for daily job

`upgradeAdultIntake(animal, { dryRun: false })` already does:
1. Render adult generic via `renderAdultGenericBios(animal)` (deterministic, no GPT)
2. Write approved bio via `saveAnimalBio(...)` with `source: 'generic_adult'`
3. If `has_profile`: call `generateBioDraftForAnimal(shelterCode)` for AI draft

**Error handling gap:** Neither `upgradeAdultIntake` nor the on-demand endpoint's loop has per-animal try/catch. If `generateBioDraftForAnimal` throws (GPT timeout, network error), the entire loop aborts — remaining candidates don't get their generics.

**The daily job wiring needs a try/catch around each `upgradeAdultIntake` call** so one GPT failure doesn't prevent the remaining animals from getting their deterministic generic bios. Pattern to follow: Pass 2's `runAdultGenericUpgrades` has no per-animal try/catch either, but its `upgradeAgedOutGeneric` only calls GPT in the `has_content` branch — a similar risk exists there. The adult-intake pass has more GPT calls (up to 18 of 68 candidates had profiles), so the risk is higher.

**Recommended:** wrap in try/catch, log the error, continue to next candidate, count failures.

---

## Q5: Summary/log pattern

| Pass | Summary format |
|------|---------------|
| Pass 1 | `[Generic Bio] Published N youth generic bios: Name (Code), ...` |
| Pass 2 | `[Adult Generic] Upgraded N, skipped N: Name(Code)=action, ...` |
| Pass 3 (proposed) | `[Adult Intake] N adult-intake upgrades (M generic_only, K generic_and_draft, F failed): Name(Code)=action, ...` |

The return type of `runGenericBioJob` would need to be extended to include `adultIntake: number` (or similar) alongside the existing `published` and `adultUpgrades`.
