# Track C — Youth→Adult Age-Crossing + Adult Generic Bio — Scoping Report

**Date:** 2026-06-14 21:38 ET  
**Type:** Read-only diagnosis for Track C implementation scoping  
**Status:** No changes made  

---

## PART 1 — THE CURRENT GENERIC-BIO JOB

### 1a. findGenericBioCandidates() — Full Function (server.ts:11302-11338)

```typescript
async function findGenericBioCandidates(): Promise<Array<{
  shelterCode: string; name: string; species: string; sex: string; ageDays: number
}>> {
  const animals = await fetchAnimals({ includeUnavailable: false }); // adoptable only
  const today = new Date();
  const candidates: Array<{ shelterCode: string; name: string; species: string; sex: string; ageDays: number }> = [];

  for (const animal of animals) {
    // Condition 1: adoptable — already filtered by fetchAnimals({ includeUnavailable: false })
    // Condition 2: age ≤ 84 days (exact days from DATEOFBIRTH)
    if (!animal.dateOfBirth) continue;
    const dobMs = new Date(animal.dateOfBirth).getTime();
    if (isNaN(dobMs)) continue;
    const ageFromDobDays = Math.floor((today.getTime() - dobMs) / 86400000);
    if (ageFromDobDays > GENERIC_BIO_MAX_AGE_DAYS) continue;

    // Condition 3: no behavior_notes
    const notes = getBehaviorNotes(animal.shelterCode);
    if (notes) continue;

    // Condition 4: ANIMALCOMMENTS empty
    if (hasStaffSMComment(animal)) continue;

    // Condition 5: no existing animal_bios row
    const existingBio = getAnimalBio(animal.shelterCode);
    if (existingBio) continue;

    candidates.push({
      shelterCode: animal.shelterCode,
      name: animal.name,
      species: animal.species,
      sex: animal.sex,
      ageDays: ageFromDobDays,
    });
  }

  return candidates;
}
```

**CRITICAL ANSWER:** Yes, **Condition 5 (`if (existingBio) continue`) EXCLUDES animals that already have an `animal_bios` row.** An animal that already has a youth generic bio will NEVER be re-selected by this function. When that youth generic ages past 84 days, it keeps its stale youth-language bio forever — there is NO existing path to regenerate it as an adult. [VERIFIED — L11327: `const existingBio = getAnimalBio(animal.shelterCode); if (existingBio) continue;`]

### 1b. Both saveAnimalBio call sites for generics

**Site 1: Scheduled daily job (L11379-11405, `runGenericBioJob()`)**

```typescript
async function runGenericBioJob(): Promise<{ published: number; animals: string[] }> {
  console.log('[Generic Bio] Daily job running');
  const candidates = await findGenericBioCandidates();
  // ...
  for (const c of candidates) {
    const bios = renderGenericBios(c.name, c.species, c.sex);
    saveAnimalBio({
      animalId: c.shelterCode,
      shelterCode: c.shelterCode,
      bioEnLong: bios.bioEnLong,
      bioEsLong: bios.bioEsLong,
      statusLong: 'approved',
      approvedAtLong: now,
      bioEnShort: bios.bioEnShort,
      bioEsShort: bios.bioEsShort,
      statusShort: 'approved',
      approvedAtShort: now,
    }, { source: 'generic', generatedBy: 'system' });
  }
}
```

**Trigger:** `scheduleGenericBioJob()` (L11407-11425) schedules `runGenericBioJob()` daily at 9:30am ET via `setTimeout` + `setInterval(24h)`. Runs on app startup, then every 24 hours. [VERIFIED]

**Site 2: API one-shot publish (L11428-11469, `POST /api/dashboard/generic-bio/publish`)**

```typescript
app.post('/api/dashboard/generic-bio/publish', async (_req: Request, res: Response) => {
  // ... identical logic: findGenericBioCandidates() → renderGenericBios → saveAnimalBio
  // Same status: 'approved', source: 'generic'
});
```

**Trigger:** Manual API call. [VERIFIED]

Both set: **statusLong = 'approved', statusShort = 'approved', source = 'generic'**. The bio is auto-approved and immediately public. [VERIFIED]

### 1c. Youth Generic Bio TEXT Template (L11262-11288)

Per-species templates keyed by `Cat`, `Dog`, `Rabbit`, `_default`. Example (Cat):

```
Long EN: "Meet [name]! This adorable kitten is so young that we're still getting to know
their personality. Right now they're busy growing, playing, and discovering the world. We
can't tell you all their quirks yet — but we can tell you they're ready to be loved. If
you're interested in [name], please contact the shelter to learn more and meet this little one."

Short EN: "Meet [name], an adorable young kitten still growing into their personality!
Too little for us to know all their quirks yet. Contact the shelter to meet them!"
```

Spanish templates use gender-inflected closures (`(g) => ...`). Dog/Rabbit/_default follow the same pattern with species-appropriate words (puppy, bunny, young animal). [VERIFIED]

**Key observation:** These templates contain NO factual data (no breed, color, age, size). They're pure personality-placeholder text ("still getting to know their personality"). An adult generic MUST differ — it should use factual SM base data. [VERIFIED]

### 1d. Schedule

- **L11407-11425:** `scheduleGenericBioJob()` runs at app startup, calculates `msUntilNext930AM()` (9:30am ET), sets a `setTimeout` then `setInterval` every 24 hours. It runs `runGenericBioJob()` which iterates ALL adoptable animals via `findGenericBioCandidates()`. [VERIFIED]
- **L11428:** `POST /api/dashboard/generic-bio/publish` — on-demand manual trigger, same logic. [VERIFIED]
- **L11340:** `POST /api/dashboard/generic-bio/dry-run` — read-only preview, writes nothing. [VERIFIED]

---

## PART 2 — HOW A GENERIC GOES PUBLIC

### 2e. Auto-approve mechanism

A generic bio is created with `statusLong: 'approved'` and `statusShort: 'approved'` (both call sites, L11393-11394 and L11452-11453). [VERIFIED]

`resolveBioText()` (L2622-2659) shows a bio publicly when `bio.statusLong === 'approved' && bio.bioEnLong` is truthy:

```typescript
if (bio && bio.statusLong === 'approved' && bio.bioEnLong) {
  bioEnLong = bio.bioEnLong;   // ← generic text shown publicly
}
```

The generic's `bioEnLong` contains the youth template text, which is non-empty → it passes both checks → it's shown on all public surfaces (matcher, website, staff app bio cards). [VERIFIED]

**Mechanism:** Generic is publicly visible because `status === 'approved'` + non-empty bio text → `resolveBioText()` returns the generic text instead of falling back to SM description or stock placeholder. This is the SAME mechanism the adult generic will reuse: set `statusLong/Short = 'approved'` → auto-public. [VERIFIED]

### 2f. Public-but-'needed' for aged-out generics

For an aged-out generic animal (age >84 days, `last_source = 'generic'`):

1. **`resolveBioText()`** shows it publicly: `statusLong === 'approved'` ✓ + `bioEnLong` non-empty ✓ → generic text displayed. [VERIFIED]

2. **`computeBioState()`** labels it correctly:
   - Rule 1: `bio.lastSource !== 'generic'` → **FALSE** (it IS generic) → skip
   - Rule 2: `hasRealStaffContentForLabel()` → FALSE (no caregiver, no SM comment — that's why it got a generic in the first place)
   - Rule 3: `age <= 84` → FALSE (aged out)
   - Rule 4: → **'needed'**

**Result:** An aged-out generic is publicly visible (shows the stale youth text) AND labeled 'needed' in the dashboard. The adult generic Track C will replace the stale youth text with factual adult text while keeping the same public mechanism (`status = 'approved'`) and the same label (`bioState = 'needed'`). [VERIFIED]

**Current live examples:** Orchid (S2026358) and Peony (S2026356) are at exactly 84 days — currently `bioState = 'youth'`, `last_source = 'generic'`, `status = 'approved'`. Tomorrow they'll cross to 85 days and become `bioState = 'needed'` while remaining publicly visible with stale youth text. They are the first animals that will need Track C's age-crossing logic. [VERIFIED]

---

## PART 3 — AGE-CROSSING DETECTION

### 3g. Does anything ACT on the old-generic-bios list?

**No.** The `GET /api/dashboard/old-generic-bios` endpoint (L11472-11519) returns a list of aged-out generics. Its ONLY consumers are:
- `fetchOldGenericBios()` in dashboard/index.html (L6427-6456) — populates the media badge (now hidden) and the profiles sidebar list (now removed)
- No server-side code reads or acts on the endpoint's results [VERIFIED]

The endpoint is purely informational. No automated action triggers on aged-out generics. [VERIFIED]

### 3h. THE KEY ANSWER: No existing path regenerates aged-out youth generics

**Confirmed: there is NO existing path.** When a youth generic crosses 84 days:

1. `findGenericBioCandidates()` — **skips it** (Condition 5: `if (existingBio) continue`) because the animal already has an `animal_bios` row [VERIFIED]
2. `runGenericBioJob()` — calls `findGenericBioCandidates()`, so same skip [VERIFIED]
3. The old-generic-bios endpoint — read-only, no action [VERIFIED]
4. No other scheduled job or endpoint detects or acts on aged-out generics [VERIFIED — grep for 'generic' + '84' + 'aged' across server.ts found only the above]

**The aged-out youth keeps its stale youth-language bio forever.** Track C MUST add new logic.

**Where new age-crossing logic would hook in:**

**Option A: Extend the existing `runGenericBioJob()`.** Add a second pass after the youth-candidate pass: query for animals with `last_source = 'generic'` AND `ageInDays(dateOfBirth) > 84`. For each, branch:
- Has real SM comment → call the AI-generate path (sm_generate equivalent) with status='draft' → 'pending'
- No SM comment → render adult factual generic, overwrite the existing bio with status='approved' → stays public, still 'needed'

This keeps all generic bio logic in one daily job. The `saveAnimalBio()` call handles the existing-bio case via its delete-then-insert pattern (L1361-1380 in localDatabase.ts). [VERIFIED — saveAnimalBio deletes the old row first: `database.prepare('DELETE FROM animal_bios WHERE shelter_code = ?').run(shelterCode);`]

**Option B: Separate job.** New function `runAdultGenericUpgradeJob()` scheduled alongside the existing job. Cleaner separation but more scheduling code.

**Recommendation:** Option A (extend existing job) is simpler — it's one daily pass, same schedule, same infrastructure. [INFERRED]

---

## PART 4 — THE SM-SEED AI PATH

### 4i. sm_generate and sm_copy production

**`POST /api/bio/from-sm/:animalId` (L2032-2081) — sm_copy:**
- Copies SM `description` (ANIMALCOMMENTS) verbatim as `bioEnLong`
- Status: `statusLong: 'draft'`, `statusShort: 'draft'` — NOT auto-approved
- If existing bio: `updateAnimalBioLong()` (resets status to draft)
- If no existing bio: `saveAnimalBio()` with draft status
- Source: `'sm_copy'`

[VERIFIED]

**`POST /api/bio/generate/:animalId` (L2086-2160) — sm_generate or full_generate:**
- If caregiver profile exists → `generationSource = 'full_generate'`
- Else if SM comment exists → `generationSource = 'sm_generate'`, uses `animal.description` as transcript
- GPT-4o generates all 4 bio versions
- Status: `statusLong: 'draft'`, `statusShort: 'draft'` — NOT auto-approved
- Source: `generationSource` (either `'full_generate'` or `'sm_generate'`)

[VERIFIED]

**Key finding:** Both paths produce **draft** status. A human must approve before the bio goes public. This is exactly the behavior wanted for the "adult with SM comment → pending" branch. [VERIFIED]

### 4j. Building blocks for the SM-seed path

**What exists:**
- The generate endpoint already handles SM-comment-only animals (`sm_generate` path) — it calls `generateAnimalBio()` with the SM description as transcript [VERIFIED]
- It produces draft status (pending for human approval) [VERIFIED]
- `saveAnimalBio()` handles the existing-bio-overwrite case (delete-then-insert) [VERIFIED]

**What needs wiring for Track C:**
1. A server-side function that invokes the same `generateAnimalBio()` logic programmatically (not via HTTP endpoint) for a specific animal — avoiding the API request overhead of calling the endpoint from within the server
2. Detection logic: aged-out generic WITH `hasStaffSMComment()` → trigger AI generation
3. `last_source` would be set to `'sm_generate'` (matching the existing source taxonomy)
4. After generation, `computeBioState()` would label it `'pending'` (draft status + real staff content) — correct behavior [VERIFIED by tracing the precedence rules]

---

## PART 5 — SM BASE-DATA FIELDS FOR ADULT GENERIC

### 5k. Field availability (adoptable animals, N=149)

| Field | Populated | Percentage | Notes |
|-------|-----------|------------|-------|
| `name` | 149/149 | 100% | Always present |
| `species` | 149/149 | 100% | Cat, Dog, Rabbit, Chinchilla, etc. |
| `breed` | 149/149 | 100% | e.g. "Domestic Shorthair", "Pit Bull Terrier" |
| `sex` | 149/149 | 100% | Male or Female |
| `color` | 149/149 | 100% | e.g. "Black", "Tabby" |
| `size` | 149/149 | 100% | e.g. "Medium", "Large" |
| `age` | 149/149 | 100% | Text string from SM, e.g. "2 years 3 months" |
| `fivStatus` | 149/149 | 100% | e.g. "Negative", "Not Tested" |
| `felvStatus` | 149/149 | 100% | e.g. "Negative", "Not Tested" |
| `dateOfBirth` | 149/149 | 100% | ISO date string |

[ALL VERIFIED — live API query]

**All 9 factual fields are 100% populated.** An adult factual generic template can reliably use: name, species, breed, sex, color, size, and age. Per the prompt's constraint, FIV/FeLV, neuter/spay, behavior inference, and additionalFlags are excluded from the template.

**Available fields for the strictly-factual template:** name, species, breed, age (text), sex, color, size. Seven fields, all 100% populated — sufficient for a meaningful factual bio without any behavioral claims.

---

## PART 6 — AGE MATH DEDUP

### 6l. findGenericBioCandidates age computation

```typescript
// findGenericBioCandidates (L11313):
const ageFromDobDays = Math.floor((today.getTime() - dobMs) / 86400000);
```

```typescript
// ageInDays (L2567-2569):
return Math.floor((Date.now() - dobMs) / (1000 * 60 * 60 * 24));
```

**Semantically identical.** `today.getTime()` ≡ `Date.now()` (both return ms since epoch at call time). `86400000` ≡ `1000 * 60 * 60 * 24`. Both use `Math.floor`. [VERIFIED]

**Safe to route through `ageInDays()` during Track C implementation** — behavior-neutral dedup. The candidate function can be refactored to:

```typescript
const ageDays = ageInDays(animal.dateOfBirth);
if (ageDays === null || ageDays > GENERIC_BIO_MAX_AGE_DAYS) continue;
```

[VERIFIED — no semantic difference]

---

## Summary: Track C Implementation Roadmap (for planning, NOT now)

### What exists (no new code needed):
- `computeBioState()` already labels aged-out generics as 'needed' ✓
- `resolveBioText()` already shows approved generics publicly ✓
- AI-generate path for SM comments exists (`sm_generate`) and produces draft status ✓
- `saveAnimalBio()` handles overwrite of existing bios ✓
- All 7 factual SM fields are 100% populated ✓

### What Track C must add:
1. **Adult factual generic templates** — new `ADULT_GENERIC_BIO_TEMPLATES` using breed/age/sex/color/size (no behavior claims)
2. **Age-crossing detection** — extend `runGenericBioJob()` with a second pass: find animals where `last_source = 'generic'` AND `ageInDays() > 84`
3. **Branching logic** — for each aged-out generic:
   - Has SM comment (`hasStaffSMComment()`) → AI-generate with `sm_generate`, status='draft' → bioState='pending'
   - No SM comment → render adult factual generic, status='approved' → bioState='needed' (public stop-gap)
4. **Route `findGenericBioCandidates` through `ageInDays()`** — behavior-neutral dedup

### Timeline pressure:
Orchid and Peony (S2026358, S2026356) are at 84 days today. **Tomorrow (2026-06-15) they cross to 85 days** and will display stale youth-language text ("adorable kitten... still getting to know their personality") as adults. They should be the first Track C candidates.

---

*Report generated by Rover. Read-only scoping — no changes made.*
