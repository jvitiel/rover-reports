# Adult-intake bio pass — implementation + dry-run verification

**Commit:** `531699c` — `server: add adult-intake pass + dry-run endpoint, not yet wired (backlog prep)`  
**Scope:** `server/src/server.ts` only (147 insertions, 0 deletions)

---

## What was added

### findAdultIntakeCandidates()

Selection: adoptable animals where:
- `ageInDays(dateOfBirth) > GENERIC_BIO_MAX_AGE_DAYS` (84)
- No `animal_bios` row (`getAnimalBio` returns null)
- No `animal_bio_drafts` row (`getAnimalBioDraft` returns null)

Classifies each as `has_profile` (getBehaviorNotes present) or `no_profile`.

### upgradeAdultIntake(animal, { dryRun })

- **Always**: renders factual adult generic via `renderAdultGenericBios(animal)` (the real server function — not reimplemented)
- **dryRun=true**: returns `{ action: 'would_generic' | 'would_generic_and_draft', rendered }` — no writes
- **dryRun=false** (live):
  - Writes approved adult generic via `saveAnimalBio(...)` with `source: 'generic_adult'`, `statusLong/Short: 'approved'` — same pattern as Track C `no_content` branch
  - If `has_profile`: also calls `generateBioDraftForAnimal(shelterCode)` for a profile-seeded AI draft

### Endpoint: POST /api/dashboard/adult-intake/run

Accepts `{ dryRun: true|false }` in body or `?dryRun=true` query param. Runs `findAdultIntakeCandidates`, calls `upgradeAdultIntake` per candidate, returns full results.

**NOT wired into `runGenericBioJob`** — manual/on-demand only via this endpoint.

---

## Dry-run verification

### Counts

| Metric | Value |
|--------|-------|
| Total candidates | **68** |
| has_profile | **18** (would get generic + AI draft) |
| no_profile | **50** (would get generic only) |

### Row counts (before → after)

| Table | Before | After | Delta |
|-------|--------|-------|-------|
| animal_bios | 115 | 115 | 0 |
| animal_bio_drafts | 0 | 0 | 0 |

**Zero writes confirmed.**

### Sample rendered generics (from real renderAdultGenericBios, not reimplemented)

#### Dodger (A2025167) — Dog, Husky/Mixed Breed, Male, Grey and White, medium, ~1yr (no_profile)

**EN Long:** Meet Dodger! Dodger is a male Husky/Mixed Breed, approximately 1 year old, with a Grey and White coat and a medium build. Dodger is waiting to find a warm home and loving family they can call their own. The best way to see what makes them special is to come say hello — please contact Four Legs Good Animal Rescue to arrange a visit.

**EN Short:** Meet Dodger, a male Husky/Mixed Breed with a Grey and White coat who is approximately 1 year old. Dodger is hoping for a loving home to call their own! Come say hello at Four Legs Good Animal Rescue.

**ES Long:** ¡Conoce a Dodger! Dodger es Husky/Mixed Breed (macho), de aproximadamente 1 año, con pelaje gris y blanco y de tamaño mediano. Dodger está esperando encontrar un hogar cálido y una familia cariñosa a quien llamar suyos. La mejor manera de descubrir lo que lo hace especial es venir a conocerlo — comunícate con Four Legs Good Animal Rescue para coordinar una visita.

**ES Short:** ¡Conoce a Dodger, Husky/Mixed Breed (macho) con pelaje gris y blanco, de aproximadamente 1 año! Dodger está buscando un hogar lleno de amor a quien llamar suyo. ¡Ven a saludarlo a Four Legs Good Animal Rescue!

#### Andrew (S2026495) — Cat, Domestic Short Hair, Male, Black, medium, ~2yrs (no_profile)

**EN Long:** Meet Andrew! Andrew is a male Domestic Short Hair, approximately 2 years old, with a Black coat and a medium build. Andrew is waiting to find a warm home and loving family they can call their own. The best way to see what makes them special is to come say hello — please contact Four Legs Good Animal Rescue to arrange a visit.

**EN Short:** Meet Andrew, a male Domestic Short Hair with a Black coat who is approximately 2 years old. Andrew is hoping for a loving home to call their own! Come say hello at Four Legs Good Animal Rescue.

**ES Long:** ¡Conoce a Andrew! Andrew es Domestic Short Hair (macho), de aproximadamente 2 años, con pelaje negro y de tamaño mediano. Andrew está esperando encontrar un hogar cálido y una familia cariñosa a quien llamar suyos. La mejor manera de descubrir lo que lo hace especial es venir a conocerlo — comunícate con Four Legs Good Animal Rescue para coordinar una visita.

**ES Short:** ¡Conoce a Andrew, Domestic Short Hair (macho) con pelaje negro, de aproximadamente 2 años! Andrew está buscando un hogar lleno de amor a quien llamar suyo. ¡Ven a saludarlo a Four Legs Good Animal Rescue!

#### Anastasia (R2026007) — Rabbit, Lop Eared, Female, White, medium, ~1yr (has_profile)

**EN Long:** Meet Anastasia! Anastasia is a female Lop Eared, approximately 1 year old, with a White coat and a medium build. Anastasia is waiting to find a warm home and loving family they can call their own. The best way to see what makes them special is to come say hello — please contact Four Legs Good Animal Rescue to arrange a visit.

**EN Short:** Meet Anastasia, a female Lop Eared with a White coat who is approximately 1 year old. Anastasia is hoping for a loving home to call their own! Come say hello at Four Legs Good Animal Rescue.

**ES Long:** ¡Conoce a Anastasia! Anastasia es Lop Eared (hembra), de aproximadamente 1 año, con pelaje blanco y de tamaño mediano. Anastasia está esperando encontrar un hogar cálido y una familia cariñosa a quien llamar suyos. La mejor manera de descubrir lo que la hace especial es venir a conocerla — comunícate con Four Legs Good Animal Rescue para coordinar una visita.

**ES Short:** ¡Conoce a Anastasia, Lop Eared (hembra) con pelaje blanco, de aproximadamente 1 año! Anastasia está buscando un hogar lleno de amor a quien llamar suyo. ¡Ven a saludarla a Four Legs Good Animal Rescue!

*(Has profile — would ALSO get a profile-seeded AI draft on live run.)*

#### Caramel (R2025003) — Rabbit, American, Female, Brown, medium, ~2yrs (has_profile)

**EN Long:** Meet Caramel! Caramel is a female American, approximately 2 years old, with a Brown coat and a medium build. Caramel is waiting to find a warm home and loving family they can call their own. The best way to see what makes them special is to come say hello — please contact Four Legs Good Animal Rescue to arrange a visit.

**EN Short:** Meet Caramel, a female American with a Brown coat who is approximately 2 years old. Caramel is hoping for a loving home to call their own! Come say hello at Four Legs Good Animal Rescue.

**ES Long:** ¡Conoce a Caramel! Caramel es American (hembra), de aproximadamente 2 años, con pelaje marrón y de tamaño mediano. Caramel está esperando encontrar un hogar cálido y una familia cariñosa a quien llamar suyos. La mejor manera de descubrir lo que la hace especial es venir a conocerla — comunícate con Four Legs Good Animal Rescue para coordinar una visita.

**ES Short:** ¡Conoce a Caramel, American (hembra) con pelaje marrón, de aproximadamente 2 años! Caramel está buscando un hogar lleno de amor a quien llamar suyo. ¡Ven a saludarla a Four Legs Good Animal Rescue!

*(Has profile — would ALSO get a profile-seeded AI draft on live run.)*

---

## What was NOT changed

- `runGenericBioJob()` — untouched, not wired
- `renderAdultGenericBios()` — reused, not reimplemented
- `upgradeAgedOutGeneric()` — untouched
- `findGenericBioCandidates()` — untouched
- All three auto-approved generic paths — untouched
- `localDatabase.ts` — untouched (no new helpers needed)
- Schema — untouched
- Dashboard client — untouched
