# Adult-intake Pass 3 — wired into daily runGenericBioJob

**Commit:** `b18cfad` — `server: wire adult-intake pass into runGenericBioJob as Pass 3 with per-animal error isolation`  
**Scope:** `server/src/server.ts` only (29 insertions, 4 deletions)

---

## What was added

### Pass 3 in runGenericBioJob (after Pass 2, before return)

```typescript
// Pass 3: adult-intake (adults with no bio at all)
const intakeCandidates = await findAdultIntakeCandidates();
let intakeGenericOnly = 0;
let intakeGenericAndDraft = 0;
let intakeFailed = 0;
const intakeDetails: string[] = [];

for (const animal of intakeCandidates) {
  try {
    const r = await upgradeAdultIntake(animal, { dryRun: false });
    if (r.action === 'generic_only') intakeGenericOnly++;
    else if (r.action === 'generic_and_draft') intakeGenericAndDraft++;
    intakeDetails.push(`${animal.name}(${animal.shelterCode})=${r.action}`);
  } catch (err) {
    console.error(`[Adult Intake] failed for ${animal.name} (${animal.shelterCode}):`, err);
    intakeFailed++;
    intakeDetails.push(`${animal.name}(${animal.shelterCode})=failed`);
  }
}
```

### Error isolation confirmed

Inside `upgradeAdultIntake`, the ordering is:
1. `renderAdultGenericBios` (deterministic, sync) — always succeeds
2. `saveAnimalBio` (sync DB write) — writes approved generic **first**
3. `generateBioDraftForAnimal` (async GPT) — only if `has_profile`, called **after** generic is persisted

If the GPT call throws, the generic is already saved. The try/catch in the daily loop catches the error, logs it, increments `intakeFailed`, and continues to the next candidate. **One GPT failure cannot prevent other animals from getting their generics.**

### Summary log

```
[Adult Intake] N adult-intake upgrades (M generic_only, K generic_and_draft, F failed): Name(Code)=action, ...
```

### Return type extended

```typescript
Promise<{ published: number; animals: string[]; adultUpgrades: number; adultIntake: number }>
```

### All-quiet log updated

```
[Generic Bio] No new youth candidates, aged-out upgrades, or adult intakes
```
(Only logged when all three passes produced zero results.)

---

## What was NOT changed

- Pass 1 (youth generics) — untouched
- Pass 2 (age-crossing) — untouched
- `findAdultIntakeCandidates` — untouched
- `upgradeAdultIntake` internals — untouched (ordering confirmed safe)
- On-demand endpoint (`POST /api/dashboard/adult-intake/run`) — untouched
- Schema, client — untouched

---

## Verification

### 1. Build + deploy
tsc clean (zero errors), `shelter-app` restarted and active. ✅

### 2–3. Pass 3 finds 0 candidates (expected — backlog cleared)

Individual endpoint results:
- Pass 1 (generic-bio/publish): `written=0` ✅
- Pass 2 (adult-generic/run): `upgraded=0, skipped=0` ✅
- Pass 3 (adult-intake/run dryRun=true): `total=0` ✅

Compiled `runGenericBioJob` verified: includes Pass 3 call to `findAdultIntakeCandidates`, loop with try/catch, return with `adultIntake: intakeSucceeded`.

### 4. Passes 1 + 2 unchanged

Server logs show existing patterns:
```
[Generic Bio] Daily job scheduled in 17.20 hours (9:30am ET)
[Generic Bio] Daily 9:30am ET generic bio job initialized
```
Pass 1 publish endpoint: 0 candidates. Pass 2 run endpoint: 0 upgraded, 0 skipped.

### 5. Adult-intake dry-run sanity

```
POST /api/dashboard/adult-intake/run {dryRun: true}
→ total: 0, hasProfile: 0, noProfile: 0
```
No regression — backlog remains cleared. ✅

### Next scheduled run

Daily job fires at 9:30am ET (13:30 UTC). Pass 3 will automatically process any new adult-intake animals that appear before then.
