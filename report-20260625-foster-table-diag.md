# Foster Table Diagnosis — Data Availability for Fosterer Contact Info

**Date:** 2026-06-26  
**Type:** Read-only diagnosis  
**Status:** Fosterer NAME available (from location string); phone + email NOT available from SM API

---

## 1. What Marks an Animal as "In Foster"

**Two signals, both from SM:**

### A. ACTIVEMOVEMENTTYPE = 2 (Foster)

SM field `ACTIVEMOVEMENTTYPE` (in `RawShelterAnimal`, `types.ts:36`):
- `null` / `0` = no active movement (in shelter)
- `1` = Adoption
- `2` = **Foster**
- Other values = other movement types

This is the authoritative SM signal for "currently in a foster home."

### B. Location string contains "Foster"

`DISPLAYLOCATION` is the animal's display location. For fostered animals, SM formats it as:
- `Foster::<Fosterer Name>` (e.g. `Foster::Holland Cox`, `Foster::Jennifer Dunn (Bunny Dunn)`)
- `4LG Foster House` (animals fostered at the shelter's own foster house — no individual fosterer)

The dashboard already has `isFosterLocation(loc)` (`dashboard/index.html:15704`) which checks `loc.toLowerCase().includes('foster')`, and `stripFosterPrefix(loc)` (`dashboard/index.html:15708`) which strips the `Foster::` prefix to get just the fosterer name.

**Location is read from SM in normalizeAnimal** (`shelterManagerService.ts:65`):
```ts
location: raw.DISPLAYLOCATION || raw.SHELTERLOCATION || 'Unknown',
```

### For the table: use `ACTIVEMOVEMENTTYPE === 2` AND/OR `isFosterLocation(location)`. Both detect foster; using location is simpler since it's already normalized + the fosterer name is embedded.

---

## 2. Fosterer ↔ Animal Link

The fosterer's identity IS linked to the animal — but only via the **location string**:

```
Foster::Holland Cox     → fosterer name = "Holland Cox"
Foster::Jennifer Dunn (Bunny Dunn) → fosterer name = "Jennifer Dunn (Bunny Dunn)"
4LG Foster House        → no individual fosterer
Foster:: Joseph Sanducci &  Brittany Sullivan → two people, extra spaces
```

The `CURRENTOWNERID`, `CURRENTOWNERNAME`, and all `CURRENTOWNER*` fields are **empty (0 / blank)** for ALL 168 foster animals in SM's `json_shelter_animals` response. SM apparently does not populate these fields for foster movements via this API endpoint. The link to the person exists internally in SM (via the movement record, `ACTIVEMOVEMENTID`) but is not exposed through `json_shelter_animals`.

**Confirmed:** Zero of 168 foster animals have `CURRENTOWNERID > 0` or any `CURRENTOWNER*` data.

---

## 3. Fosterer Contact Info (Name, Phone, Email)

### NAME: ✅ Available — from location string

Extractable via `stripFosterPrefix(location)`:
- `Foster::Holland Cox` → `"Holland Cox"`
- `4LG Foster House` → `"4LG Foster House"` (facility, not a person)

65 unique fosterer names across 168 foster animals. Already parsed in the dashboard.

### PHONE: ❌ NOT available

`CURRENTOWNERMOBILETELEPHONE`, `CURRENTOWNERHOMETELEPHONE`, `CURRENTOWNERWORKTELEPHONE` are ALL empty for ALL foster animals. The `json_shelter_animals` API does not expose the foster person's contact details.

SM does have a `json_person_find` API method, but it returns HTTP 500 for the 4LG account (tested with query `Holland Cox`). This may be a permissions issue or the method may not be enabled for the account type. Even if it worked, it would require per-fosterer API calls (N+1 pattern for 65+ unique fosterers).

### EMAIL: ❌ NOT available

Same as phone — `CURRENTOWNEREMAILADDRESS` is empty for all foster animals. No alternative source in the current data pipeline.

### Summary

| Column | Available? | Source |
|---|---|---|
| Fosterer name | ✅ Yes | `DISPLAYLOCATION` → `stripFosterPrefix()` |
| Animal name | ✅ Yes | `ANIMALNAME` / normalized `name` |
| Species | ✅ Yes | `SPECIESNAME` / normalized `species` |
| Fosterer phone | ❌ No | Not in `json_shelter_animals`; `json_person_find` returns 500 |
| Fosterer email | ❌ No | Not in `json_shelter_animals`; `json_person_find` returns 500 |

---

## 4. Adoptable + Foster

**Adoptable** is determined by `raw.ADOPTABLE === 1` (`shelterManagerService.ts:49`). SM sets `ADOPTABLE = 1` for animals that are available for adoption — foster animals CAN be adoptable (they're in a temporary home but still available).

```ts
// shelterManagerService.ts:49
const isAvailable = raw.ADOPTABLE === 1;
```

**Can an animal be BOTH adoptable AND in foster?** Yes — confirmed:

```
S2025966 Abe (Louie) location=[Foster::Holland Cox] available=True
S2026133 Abstract location=[Foster::Karen Meyers-Njenga] available=True
```

70 animals are both adoptable and in a foster location. The query for the table would be: `isAvailable === true && isFosterLocation(location)`.

Some foster animals may NOT be adoptable (e.g. medical hold, behavioral assessment). The table should filter for adoptable only.

---

## 5. Data Source

**All from SM** — fetched via `fetchAnimals()` (`shelterManagerService.ts:97`). The data is cached for 15 minutes.

**Already available in profiles path:** The profiles-summary endpoint (`server.ts:1325`) calls `fetchAnimals({ includeUnavailable: true })` and returns per-animal: `shelterCode`, `name`, `species`, `location`, `isAvailable`, `bioState`, etc. The location field (which contains the fosterer name) is already in the profiles response.

**Existing functions to reuse:**
- `isFosterLocation(loc)` (`dashboard/index.html:15704`) — detects foster location
- `stripFosterPrefix(loc)` (`dashboard/index.html:15708`) — extracts fosterer name from `Foster::Name`
- `fetchAnimals()` — already called in the profiles endpoint
- The profiles tab already has a "foster" location filter (`profilesLocationFilter === 'foster'`)

**No additional SM API call needed** for the name/species/animal columns. Phone + email would need a separate SM person lookup that isn't currently working.

---

## 6. Profiles-Tab Data Path

### Server: `/api/dashboard/profiles-summary` (server.ts:1325)

Already returns per-animal objects with:
```ts
{
  shelterCode, name, species, location, isAvailable,
  bioState, dateOfBirth, profileCount, mostRecentDate,
  mostRecentAuthor, mostRecentWordcount, mostRecentScore, scoreDetails
}
```

`location` is included — the foster table can be built entirely from this existing endpoint response. No new endpoint needed for the 3 available columns.

### Client: `renderProfilesTable()` (dashboard/index.html:~15720)

The profiles tab already renders a sortable table from `profilesCache.animals`. The new foster table would be a second table below it, filtered to `isAvailable && isFosterLocation(location)`, with columns: Fosterer Name (`stripFosterPrefix(location)`), Animal Name, Species.

---

## 7. Feasibility Verdict

### 3 of 5 columns obtainable: Fosterer name ✅, Animal name ✅, Species ✅

### 2 of 5 columns NOT obtainable: Phone ❌, Email ❌

**The fosterer's phone and email are not available** through the SM `json_shelter_animals` API. The `CURRENTOWNER*` contact fields are empty for all 168 foster animals. The `json_person_find` API method returns HTTP 500 for the 4LG account.

### Options:

1. **Build the table with 3 columns** (fosterer name, animal name, species) — all data available today, no server change needed, purely a dashboard addition using existing profiles data.

2. **Add phone + email later** if/when:
   - SM's `json_person_find` is enabled/fixed for the account (would require per-fosterer lookups + caching)
   - The fosterer contact info is imported into a local table (e.g. from a spreadsheet or manual entry)
   - SM's API is configured to populate `CURRENTOWNER*` fields for foster movements

3. **Alternative for phone + email:** If the shelter maintains a separate fosterer contact list (spreadsheet, Google Sheet, etc.), it could be imported into a local `foster_contacts` table keyed by fosterer name. The dashboard would join on the parsed fosterer name from the location string.

### Recommendation

Start with the 3-column table (fosterer name, animal name, species) — it's fully buildable from existing data with no server change. Add the location column as a bonus (already available). Table goes under the main profiles table, sortable, filtered to adoptable + foster location.

Phone + email are a separate data-sourcing question for John — where does this info live today? If it's in SM but not exposed via the API, a different SM API method or account setting may be needed. If it's in a spreadsheet, we can build an import.

---

*End of diagnosis.*
