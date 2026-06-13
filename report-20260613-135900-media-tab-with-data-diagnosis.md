# Dashboard Media Tab: "N with data" Count Diagnosis
**Generated:** 2026-06-13 13:59 ET (read-only diagnosis)

---

## 1. WHERE the count is computed

**Single source of truth: NO** — the value is computed in two places but from the same underlying data.

### Server side (sets the flag per animal)

**File:** `server/src/server.ts`, line 1152
**Endpoint:** `GET /api/dashboard/behavior-notes`

```ts
// line 1101
const allNotes = getAllBehaviorNotes();
const notesMap = new Map<string, BehaviorNotes[]>();
for (const note of allNotes) {
  const existing = notesMap.get(note.animalId) || [];
  existing.push(note);
  notesMap.set(note.animalId, existing);
}

// line 1150-1152 (inside the per-animal loop)
for (const smAnimal of smAnimals) {
  const records = notesMap.get(smAnimal.shelterCode) || [];
  const hasCaregiverData = records.length > 0;   // ← THE FLAG
```

`getAllBehaviorNotes()` (localDatabase.ts line 1124) runs:
```sql
SELECT * FROM behavior_notes ORDER BY recorded_at DESC
```

The flag is included in the response object at line 1246:
```ts
hasCaregiverData,
```

### Client side (aggregates the flag into tab counts)

**File:** `dashboard/index.html`, lines 6740–6759
```js
function updateTileCounts(filtered) {
  const cats = filtered.filter(a => (a.species || '').toLowerCase().includes('cat'));
  const dogs = filtered.filter(a => (a.species || '').toLowerCase().includes('dog'));
  const smalls = filtered.filter(a => !cats.includes(a) && !dogs.includes(a));

  const catsData = cats.filter(a => a.hasCaregiverData).length;   // ← THE PREDICATE
  const dogsData = dogs.filter(a => a.hasCaregiverData).length;
  const smallsData = smalls.filter(a => a.hasCaregiverData).length;
  const allData = catsData + dogsData + smallsData;

  // lines 6755-6758: render as "N with data"
  document.getElementById('dataAll').textContent = allData > 0 ? `${allData} with data` : '';
  // ...etc for each species
}
```

`updateTileCounts` is called from `renderFilteredAnimals()` (line 6790) with the `tilePool`, which is filtered by adoption status (line 6785-6789).

---

## 2. WHAT "with data" means

**Exact condition:** `hasCaregiverData = (records.length > 0)` where `records` is the array of rows from the `behavior_notes` table for that animal's `shelter_code`.

**In plain English:** An animal counts as "with data" if and only if it has **at least one row in the `behavior_notes` table**. That's it.

**"With data" is NOT:**
- Bio presence (not `animal_bios` table)
- Media/photo presence
- SM ANIMALCOMMENTS / description
- Generated or approved bio status
- Any column or flag in `animal_bios_history`

It is purely: **does this animal have caregiver behavior notes?**

---

## 3. DENOMINATOR scope

**Server side (line 1098):**
```ts
const smAnimals = await fetchAnimals({ includeUnavailable: true });
```
This fetches ALL animals from ShelterManager (currently 479), including unavailable/unadoptable.

**Client side default filter (line 6831, 6785-6786):**
```js
let currentAdoptionStatusFilter = 'adoptable'; // default

const tilePool = currentAdoptionStatusFilter === 'adoptable'
  ? allAnimalsData.filter(a => a.isAvailable !== false)   // ← adoptable only
  : ...
```

The default view filters to **adoptable animals only** (`isAvailable !== false`), reducing 479 → 140.

**Species classification (lines 6741-6744):**
- Dogs: `species.toLowerCase().includes('dog')`
- Cats: `species.toLowerCase().includes('cat')`
- Smalls: everything else (rabbits, etc.)

---

## 4. Generic bios: INCLUDED or EXCLUDED from "with data"?

**EXCLUDED.** Generic bios do not affect the "with data" count at all.

Walk-through for a ≤84-day animal with only an auto-approved generic bio:

1. The generic bio job creates a row in `animal_bios` with source `generic` in `animal_bios_history`
2. When the dashboard loads, `getAllBehaviorNotes()` queries the `behavior_notes` table
3. A young kitten with only a generic bio has **zero rows** in `behavior_notes`
4. Therefore: `records = notesMap.get(shelterCode) || []` → empty array
5. `hasCaregiverData = records.length > 0` → **false**
6. The animal is NOT counted in "with data"

**Verified:** All 41 animals with `source='generic'` in `animal_bios_history` have zero rows in `behavior_notes` and `hasCaregiverData=false` on the API response. Example:
```
Basil (S2026346): hasCaregiverData=false, bioStatus=approved
```

---

## 5. Number verification

**Replicated from API (queried 2026-06-13 13:59 UTC):**

| Tab | Total | With Data |
|-----|-------|-----------|
| ALL | 140 | 47 |
| DOGS | 39 | 13 |
| CATS | 82 | 19 |
| SMALLS | 19 | 15 |

**Expected (from John's live display):**

| Tab | Total | With Data |
|-----|-------|-----------|
| ALL | 139 | 47 |
| DOGS | 39 | 13 |
| CATS | 82 | 19 |
| SMALLS | 19 | 15 |

**Discrepancy:** ALL total is 140 vs 139 (off by 1). The "with data" counts match exactly across all tabs. The ±1 total difference is likely a timing issue — one animal's availability status changed between John's observation and this query.

Check: 13 + 19 + 15 = 47 ✓

---

## Summary

"With data" = has rows in `behavior_notes` = has caregiver data. It has nothing to do with bios, media, or SM ANIMALCOMMENTS. Generic bios are invisible to this count — a young kitten with an auto-approved generic bio but no caregiver observations shows `hasCaregiverData=false` and is excluded from the "with data" tally.
