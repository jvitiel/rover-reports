# Bio State Model Redesign — Code & Data Map

**Date:** 2026-06-14 11:07 ET  
**Type:** Read-only code/data mapping for design grounding  
**Status:** No changes — map only  

---

## Target Precedence (for reference)

1. Has APPROVED REAL (non-generic) bio → `approved`
2. Else has REAL STAFF CONTENT (caregiver profile OR non-empty SM ANIMALCOMMENTS) → `pending`
3. Else age ≤ 84 days → `youth`
4. Else → `needed`

Media "approved" count = approved + youth (per species).

---

## PART 1 — STATE DERIVATION INPUTS

### 1a. Where bioStatus is assembled today

`server/src/server.ts`, lines 1202–1212, inside `GET /api/dashboard/behavior-notes`:

```typescript
// Calculate bio status: Approved (green) / SM (grey) / None (red)
const bio = biosMap.get(smAnimal.shelterCode);
let bioStatus: 'none' | 'sm' | 'draft' | 'approved' = 'none';
if (bio && (bio.statusLong === 'approved' || bio.statusShort === 'approved')) {
  // Has an approved dashboard bio
  bioStatus = 'approved';
} else if (hasValue(smAnimal.description)) {
  // No approved bio, but SM has a bio (ANIMALCOMMENTS) — includes draft state
  bioStatus = 'sm';
}
// else: no bio at all → 'none' (red)
```

This is the ONLY place `bioStatus` is computed. It's returned in the per-animal object at line 1247 and consumed by the dashboard client. [VERIFIED]

### 1b. Input availability at the assembly point (~line 1202)

| Input | Available? | Source | File:Line |
|-------|-----------|--------|-----------|
| **AGE / date-of-birth** | **NOT-AVAILABLE-HERE** (client side). Available server-side on `smAnimal.dateOfBirth` (from `normalizeAnimal`) but NOT included in the response payload. The `animals.push()` block (line 1237–1257) does not emit `dateOfBirth` or `age`. | `normalizeAnimal` at `shelterManagerService.ts:66` | sMS:66, NOT in server.ts:1237 |
| **Caregiver-profile presence** | **AVAILABLE-HERE** as `hasCaregiverData` (boolean) | `records.length > 0` at line 1152 | server.ts:1152, emitted at :1246 |
| **SM ANIMALCOMMENTS presence** | **AVAILABLE-HERE** as `smAnimal.description` | `normalizeAnimal` maps `raw.ANIMALCOMMENTS` to `description` | sMS:62, checked at server.ts:1208 via `hasValue()` |
| **Bio row status_long/status_short** | **AVAILABLE-HERE** via `biosMap` | `getAllAnimalBios()` at line 1112, mapped into `biosMap` at line 1116 | server.ts:1112–1116, read at :1204 |
| **Bio SOURCE (generic vs real)** | **NOT-AVAILABLE-HERE** | `source` lives only in `animal_bios_history`, not on `animal_bios`. No join is done at this assembly point. | localDatabase.ts (history only) |

[ALL VERIFIED]

### 1c. Getting the current bio's source: generic vs real

The `source` column exists only on `animal_bios_history`, not `animal_bios`:

```
animal_bios schema:     id, generated_at, bio_en_long, bio_es_long, status_long, approved_at_long,
                        bio_en_short, bio_es_short, status_short, approved_at_short, shelter_code
                        ← NO source column

animal_bios_history:    id, shelter_code, bio_en_long, bio_en_short, bio_es_long, bio_es_short,
                        status_long, status_short, approved_at_long, approved_at_short,
                        generated_by, source, generated_at, notes
                        ← source IS here
```

To determine whether the CURRENT bio is generic, you'd need the latest history row:

```sql
SELECT h.source
FROM animal_bios_history h
INNER JOIN (
  SELECT shelter_code, MAX(rowid) as max_id
  FROM animal_bios_history
  GROUP BY shelter_code
) latest ON h.shelter_code = latest.shelter_code AND h.rowid = latest.max_id
WHERE h.shelter_code = ?
```

This is the exact query already used in the `old-generic-bios` endpoint (server.ts:11388–11398). [VERIFIED]

**However**, this approach has a subtlety: the latest history row might be `approve_long` or `translate_es_long` rather than the original generation source. An `approve_long` row follows a `generic` row when the generic bio is auto-approved. The `old-generic-bios` endpoint accounts for this because the generic job writes `source='generic'` as the initial row AND the approval row for generics is written by `approveAnimalBioLong()` with `source='approve_long'` (localDatabase.ts:1473).

Wait — let me verify what the actual latest row would be for a generic bio:

The generic job at server.ts:11303–11313 calls `saveAnimalBio()` with `{ source: 'generic', generatedBy: 'system' }`. `saveAnimalBio()` (localDatabase.ts:1348) inserts the bio row AND a history row with `source='generic'`. The bio is saved with `statusLong: 'approved'` already — no separate approve call follows. So the latest history row for a generic-only animal IS `source='generic'`. [VERIFIED]

But if someone later manually edits or regenerates that bio, the latest row would change to `manual_edit_long` or `regenerate_long`. In that case, it's no longer a pure generic — which is correct behavior for the new model (a regenerated generic IS a real bio).

**Assessment:** The history-MAX-rowid query works but is fragile and requires a JOIN in every bioStatus computation. **A denormalized `last_source` column on `animal_bios` would be cleaner and is NET-NEW.** Alternatively, a boolean `is_generic` flag on `animal_bios` could be set/cleared by the save/update functions. Either is net-new schema.

Distinct `source` values in history today:
```
approve_long, approve_short, backfill, delete, full_generate, generic,
manual_edit_long, regenerate_long, regenerate_short, sm_copy, sm_generate,
translate_es_long
```
[VERIFIED]

### 1d. AGE/DOB in dashboard payloads

| Endpoint | dateOfBirth included? | age included? |
|----------|----------------------|---------------|
| `GET /api/dashboard/behavior-notes` (line 1094) | ❌ NOT in response | ❌ NOT in response |
| `GET /api/dashboard/profiles-summary` (line 1317) | ❌ NOT in response | ❌ NOT in response |
| `GET /api/animals` (line 903) | ✅ via spread `...animal` | ✅ via spread `...animal` |
| `GET /api/animals/:id` (line 987) | ✅ via spread `...animal` | ✅ via spread `...animal` |

**Where DOB lives:** `normalizeAnimal()` in `shelterManagerService.ts:66` maps `raw.DATEOFBIRTH` to `animal.dateOfBirth`. It's available server-side at the assembly point (the `smAnimal` object is the full normalized animal). To surface it to the dashboard, it would need to be added to the `animals.push()` block at server.ts:1237 and/or to the profiles-summary response at server.ts:1345. [VERIFIED]

---

## PART 2 — PUBLIC/SM TEXT FALLBACK CHAIN

Every place where public-facing bio text is resolved:

### Site 1: `GET /api/animals` (line 903) — External PWAs (staff, volunteer, dogwalker, etc.)

```typescript
// server.ts:927-935
let displayBio = animal.description || '';  // SM ANIMALCOMMENTS
if (bio && bio.statusLong === 'approved' && bio.bioEnLong) {
  displayBio = bio.bioEnLong;              // Approved bio wins
}
const smDesc = animal.description || '';
const bioEnLong = (bio && bio.statusLong === 'approved' && bio.bioEnLong) ? bio.bioEnLong : smDesc;
const bioEnShort = (bio && bio.statusShort === 'approved' && bio.bioEnShort) ? bio.bioEnShort : (smDesc ? smDesc.slice(0, 200) : '');
```
**Chain:** approved → SM → empty. No generic fallback, no stock placeholder. [VERIFIED]

### Site 2: `GET /api/animals/:id` (line 987) — Single animal detail

```typescript
// server.ts:998-1000
let displayBio = animal.description || '';
if (bio && bio.statusLong === 'approved' && bio.bioEnLong) {
  displayBio = bio.bioEnLong;
}
```
**Chain:** approved → SM → empty. Same pattern, no generic fallback. [VERIFIED]

### Site 3: Matcher / single-animal enrichment (line ~2582) — WordPress featured + matcher

```typescript
// server.ts:2586-2600
const smDescription = animal?.description || '';
const stockPlaceholder = `To meet ${name !== 'Unknown' ? name : 'me'}, please visit Four Legs Good Animal Rescue.`;

let bioEnLong = '';
if (bio && bio.statusLong === 'approved' && bio.bioEnLong) {
  bioEnLong = bio.bioEnLong;
} else if (smDescription) {
  bioEnLong = smDescription;
} else {
  bioEnLong = stockPlaceholder;
}
// (same pattern for bioEnShort)
```
**Chain:** approved → SM → stock placeholder. Has the stock fallback that Sites 1 & 2 lack. [VERIFIED]

### Site 4: `GET /api/bios` and `GET /api/bios/:animalId` (lines ~2460, ~2495)

These return raw `animal_bios` content only (no SM fallback). Used by WordPress bio integration. No fallback chain — just the bio row contents. [VERIFIED]

### Assessment:

**The fallback chain is computed in THREE separate places** (Sites 1, 2, 3) with slightly different logic:
- Sites 1 & 2: approved → SM → empty (no stock placeholder)
- Site 3: approved → SM → stock placeholder

None of them distinguish generic from real approved bios. Under the new model, the target chain (approved real → staff SM comment → age-appropriate generic) would need to be unified. This is a **divergence risk** — three independent fallback implementations. [VERIFIED]

---

## PART 3 — GENERICS

### 3f. Youth generic builder + scheduled job

**Builder:** `renderGenericBios()` at server.ts:11199–11209.

Uses only `name`, `species`, `sex` — no SM data fields beyond that. Templates are static text with `[name]` replacement.

**Templates (Cat, English long):**
```
Meet [name]! This adorable kitten is so young that we're still getting to know their
personality. Right now they're busy growing, playing, and discovering the world. We can't
tell you all their quirks yet — but we can tell you they're ready to be loved. If you're
interested in [name], please contact the shelter to learn more and meet this little one.
```
(Similar for Dog with "puppy", Rabbit with "bunny", _default with "young animal".)

**Short template (Cat):** `Meet [name], an adorable young kitten still growing into their personality! Too little for us to know all their quirks yet. Contact the shelter to meet them!`

Spanish templates use gender-inflected suffixes (`gatit${g}`, `cachorrit${g}`). [VERIFIED]

**Storage:** `saveAnimalBio()` with `{ source: 'generic', generatedBy: 'system' }`, status set to `'approved'` immediately (both long and short). [VERIFIED — server.ts:11303–11313]

**Job:** `runGenericBioJob()` at server.ts:11290, scheduled daily at 9:30am ET via `scheduleGenericBioJob()` at server.ts:11330–11345. Uses `setTimeout` + `setInterval(24h)`. [VERIFIED]

**Selection criteria** (`findGenericBioCandidates()`, server.ts:11216–11248):
1. Adoptable (via `fetchAnimals({ includeUnavailable: false })`)
2. Age ≤ 84 days (exact days from `DATEOFBIRTH`)
3. No behavior_notes (`getBehaviorNotes()` returns null)
4. ANIMALCOMMENTS empty (`!animal.description?.trim()`)
5. No existing `animal_bios` row (`getAnimalBio()` returns null)

All 5 conditions must be true. [VERIFIED]

### 3g. SM base-data fields available for adult generic template

Fields from `normalizeAnimal()` (shelterManagerService.ts:41–82) and their population across 152 adoptable animals:

| Field | SM Source Key | normalizeAnimal property | Population |
|-------|-------------|------------------------|------------|
| Name | `ANIMALNAME` | `name` | 152/152 (100%) [VERIFIED] |
| Species | `SPECIESNAME` | `species` | 152/152 (100%) [VERIFIED] |
| Breed | `BREEDNAME` | `breed` | 152/152 (100%) [VERIFIED] |
| Age (text) | `ANIMALAGE` | `age` | 152/152 (100%) [VERIFIED] |
| Date of birth | `DATEOFBIRTH` | `dateOfBirth` | 152/152 (100%) [VERIFIED] |
| Sex | `SEXNAME` | `sex` | 152/152 (100%) [VERIFIED] |
| Size | `SIZENAME` | `size` | 152/152 (100%) [VERIFIED] |
| Color | `BASECOLOURNAME` | `color` | 152/152 (100%) [VERIFIED] |
| Location | `DISPLAYLOCATION` / `SHELTERLOCATION` | `location` | 152/152 (100%) [VERIFIED] |
| Intake date | `DATEBROUGHTIN` | `dateIntake` | 152/152 (100%) [VERIFIED] |
| FIV status | `COMBITESTED` + `COMBITESTRESULT` | `fivStatus` | derived (100%) [VERIFIED] |
| FeLV status | `FLVRESULT` | `felvStatus` | derived (100%) [VERIFIED] |
| Additional flags | `ADDITIONALFLAGS` | `additionalFlags` | varies; values include "On Meds" (22), "HVHS" (3), "Bite History" (2), etc. [VERIFIED] |
| **Weight** | — | — | **NOT in normalizeAnimal.** Not in `RawShelterAnimal` typed interface. 0/152 via API. [VERIFIED] |
| **Spay/neuter** | — | — | **NOT in normalizeAnimal.** Not in typed interface. [VERIFIED] |

**Raw SM API:** The `RawShelterAnimal` interface (types.ts:163) has a `[key: string]: unknown` catch-all, so SM may send `NEUTERED`, `WEIGHT`, etc. — but they are not mapped by `normalizeAnimal()` today. Whether SM populates them would require a raw API check (not done here — would need direct SM API call). [UNCERTAIN for weight/neuter SM-side population]

**Available for a rich adult generic with NO behavior inference:** name, species, breed, age (text + computed days), sex, size, color, intake date, FIV/FeLV. All at 100% population. This is enough for a template like "Meet [name], a [age] [sex] [breed] [color] [species]…" [VERIFIED]

---

## PART 4 — YOUTH→ADULT AGE CROSSING + OLD BIOS

### 4h. How 84-day crossing is detected

**The generic job does NOT re-evaluate aged-out animals.** It only adds generics to young ones.

`findGenericBioCandidates()` (server.ts:11216–11248) filters for animals ≤ 84 days AND with no existing `animal_bios` row (condition 5). Once a generic bio is written, the animal will NEVER match `findGenericBioCandidates()` again because it now has a bio row. The job does not delete or replace aged-out generics. [VERIFIED]

An animal that crosses 84 days keeps its generic bio indefinitely until someone manually replaces or deletes it. No automatic detection or transition occurs.

### 4i. What "Old Bios" is

**Endpoint:** `GET /api/dashboard/old-generic-bios` (server.ts:11382–11428).

**What it detects:** Animals whose LATEST `animal_bios_history` row has `source='generic'` AND whose computed age from `DATEOFBIRTH` exceeds 84 days. [VERIFIED]

**Logic (server.ts:11388–11422):**
1. Query all `shelter_code`s where the latest history row has `source='generic'`
2. For each, compute age from SM `DATEOFBIRTH`
3. Return only those exceeding `GENERIC_BIO_MAX_AGE_DAYS` (84)
4. Sort by age descending

**Dashboard display:**
- **Media tab:** Badge `#oldBiosBadge` showing count, turns red when > 0 (dashboard/index.html:5131, CSS at :1821)
- **Profiles tab:** Sidebar list `#oldBiosProfilesList` showing name + age in weeks (dashboard/index.html:5224)
- Populated by `fetchOldGenericBios()` (dashboard/index.html:6362–6387), called on both tab loads

**Is it a viable hook for "youth generic now stale"?** Yes — it already identifies exactly the animals that aged out of the youth window while still carrying a generic bio. The "Old Bios" count IS the "youth generics that need replacement" count. The endpoint could be extended or its logic reused for the state model's youth→needed transition. [VERIFIED]

However, note: if someone manually edits a generic bio (latest history becomes `manual_edit_long`), it falls out of the "Old Bios" detection. This is correct — a manually edited bio is no longer a pure generic. [VERIFIED]

---

## PART 5 — SCREENS

### 5j. Media tab: `updateTileCounts`

Dashboard/index.html lines 6740–6759:

```javascript
function updateTileCounts(filtered) {
  const cats = filtered.filter(a => (a.species || '').toLowerCase().includes('cat'));
  const dogs = filtered.filter(a => (a.species || '').toLowerCase().includes('dog'));
  const smalls = filtered.filter(a => !cats.includes(a) && !dogs.includes(a));

  const catsData = cats.filter(a => a.hasCaregiverData).length;
  const dogsData = dogs.filter(a => a.hasCaregiverData).length;
  const smallsData = smalls.filter(a => a.hasCaregiverData).length;
  const allData = catsData + dogsData + smallsData;

  document.getElementById('totalAnimals').textContent = filtered.length;
  document.getElementById('totalCats').textContent = cats.length;
  document.getElementById('totalDogs').textContent = dogs.length;
  document.getElementById('totalSmalls').textContent = smalls.length;

  document.getElementById('dataAll').textContent = allData > 0 ? `${allData} with data` : '';
  document.getElementById('dataCats').textContent = catsData > 0 ? `${catsData} with data` : '';
  document.getElementById('dataDogs').textContent = dogsData > 0 ? `${dogsData} with data` : '';
  document.getElementById('dataSmalls').textContent = smallsData > 0 ? `${smallsData} with data` : '';
}
```

**Currently displays:** species counts + "N with data" (caregiver profiles). Does NOT display bio-approved count.

**To compute "approved = approved + youth" per species, the client would need:**
1. A per-animal field indicating the new label (approved/pending/youth/needed) — NOT currently present
2. OR: `bioStatus`, `bio.source` (generic vs real), and `dateOfBirth` — only `bioStatus` is present today; source and DOB are not.

**Assessment:** The client currently has `hasCaregiverData` and `bioStatus` per animal. It does NOT have `dateOfBirth` or bio source. The approved+youth count cannot be computed client-side with current data. The server would need to either: (a) compute and send the new label, or (b) add `dateOfBirth` + bio source to the response. Option (a) is cleaner. [VERIFIED]

### 5k. Profiles tab

**Data source:** `GET /api/dashboard/profiles-summary` (server.ts:1317–1378).

**Columns currently rendered** (dashboard/index.html:5191–5201):
- Name (sortable)
- Species (sortable)
- Profiles (count, sortable)
- Most Recent (date, sortable)
- Author (sortable)
- Words (sortable)
- Score (sortable)

**Per-animal data in profiles-summary response** (server.ts:1345–1370):
```
shelterCode, name, species, location, isAvailable,
profileCount, mostRecentDate, mostRecentAuthor, mostRecentWordcount,
mostRecentScore, scoreDetails (q1-q10 booleans)
```

**NOT included:** bioStatus, hasCaregiverData, dateOfBirth, bio source/source-type, SM ANIMALCOMMENTS presence.

**To add a sortable label column (youth/needed/pending/approved):**
- The server needs to compute the label (requires: bio row + history source, behavior_notes presence, SM description, dateOfBirth)
- Add it to the profiles-summary response
- Client-side: add a `<th>` column, render label with color/badge, enable sort

**Assessment:** The data needed for the label is NOT present client-side and is NOT in the profiles-summary endpoint's current response. The endpoint would need to be extended to include the computed label (or its inputs). The label should be computed server-side in one place to avoid client-side divergence. [VERIFIED]

---

## PART 6 — COUNTS (Live Adoptable Animals)

Query methodology: For each adoptable animal, applied the target precedence:
1. Has bio row with `status_long='approved'` or `status_short='approved'`, AND latest history source ≠ `'generic'` → `approved`
2. Else has behavior_notes OR non-empty SM ANIMALCOMMENTS → `pending`
3. Else age ≤ 84 days → `youth`
4. Else → `needed`

### Results:

| Species | approved | pending | youth | needed | **media_approved** (approved+youth) |
|---------|----------|---------|-------|--------|-------------------------------------|
| Cat | 18 | 53 | 0 | 22 | **18** |
| Dog | 7 | 25 | 0 | 8 | **7** |
| Small | 4 | 11 | 0 | 4 | **4** |
| **TOTAL** | **29** | **89** | **0** | **34** | **29** |

[VERIFIED — all counts from live data queries]

**Youth = 0** because no adoptable animal currently has `dateOfBirth` ≤ 84 days ago. [VERIFIED — explicit check of all adoptable DOBs returned zero results]

**No ambiguous animals found.** Each animal fell cleanly into exactly one label under the precedence. The only potential ambiguity would be an animal with an approved generic bio AND real staff content — under the precedence, `pending` wins over `youth` (rule 2 before rule 3), and `approved` (rule 1) requires non-generic. If such an animal existed (approved generic + caregiver data), the label would be `pending` because the generic bio is not "real." No such case exists in current data. [VERIFIED]

### Needed animals (34):

```
Cat (22):  Andrew, Catzilla, Cheshire, Eggo, Ember, Gilda, Grumpy McGee, Hershey,
           Lacey, Luna Tuna, Lupa, Mothra, Nestle, Opal, Parker, Robin, Rodan,
           Shep, Sky, Squeaky, Tostito, Willow
Dog (8):   Baki, Honey, Luna, Maya, Mimi, Snowy, Spooky, Spooky (Chi Mix)
Small (4): Callie Rabbit, Clover, Cookies and Cream, Fluffy
```

---

## PART 7 — PROVENANCE SEAM

### Can "real staff content" be centralized into a single predicate?

**Current state: scattered.** The concept "does this animal have real staff-authored content" is checked in multiple independent locations with different formulations:

| Check | File:Line | Formulation |
|-------|-----------|-------------|
| bioStatus = 'sm' | server.ts:1208 | `hasValue(smAnimal.description)` |
| Generate fallback | server.ts:2124 | `animal.description?.trim()` |
| sm_copy guard | server.ts:2049 | `animal.description?.trim() \|\| ''` |
| hasCaregiverData | server.ts:1152 | `records.length > 0` (behavior_notes) |
| Generic exclusion | server.ts:11231 | `animal.description?.trim()` |
| Matcher fallback | server.ts:2589 | `smDescription` (truthiness check) |
| PWA fallback | server.ts:933 | `smDesc` (truthiness check) |

**Assessment:** The "real staff content" check is NOT centralized. It's spread across at least 7 code locations with two independent sub-checks (caregiver profile + SM comment). Today, these aren't combined into a single concept anywhere — `hasCaregiverData` and `hasValue(description)` are checked separately in different contexts.

**Centralization is feasible.** A predicate like:

```typescript
function hasRealStaffContent(animal: Animal): boolean {
  const hasProfile = getBehaviorNotesCount(animal.shelterCode) > 0;
  const hasSmComment = !!animal.description?.trim();
  // Future: && !isOurOwnPushedBio(animal.shelterCode) for SM narrowing
  return hasProfile || hasSmComment;
}
```

…could replace all 7 sites. The SM-comment half of this predicate is where the future provenance gate would narrow "any SM comment" to "staff-written SM comment only" — a one-place change. The caregiver-profile half would remain unchanged.

**Net assessment:** Centralization is architecturally clean and would work. Today's code is scattered enough that each site would need to be individually updated to call the shared predicate. Not a refactor blocker, but not zero-effort either. The key benefit: when the SM push feature lands and the provenance gate needs to narrow the SM check, it changes in ONE predicate instead of 7 locations. [VERIFIED]

---

## Summary of What Exists vs What's Net-New

| Component | Status |
|-----------|--------|
| bioStatus assembly point | ✅ Exists (server.ts:1202) — needs precedence rewrite |
| hasCaregiverData | ✅ Exists in dashboard payload |
| SM ANIMALCOMMENTS check | ✅ Exists (scattered, 7 sites) |
| Bio row status_long/short | ✅ Exists |
| Bio source (generic vs real) | ⚠️ In history table only — needs denormalization OR join |
| dateOfBirth in dashboard payload | ❌ Net-new (available server-side, not emitted) |
| dateOfBirth in profiles payload | ❌ Net-new |
| Label in profiles payload | ❌ Net-new |
| `hasRealStaffContent()` predicate | ❌ Net-new (logic exists scattered) |
| Adult generic templates | ❌ Net-new |
| Media "approved" count display | ❌ Net-new (currently shows "with data" not "approved") |
| Profiles label column | ❌ Net-new |

---

*Report generated by Rover. Read-only map — no changes made.*
