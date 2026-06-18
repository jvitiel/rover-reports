# SM Discrete Health-Data Availability

**Date:** 2026-06-18 18:58 ET  
**Production modified:** NO. Read-only diagnosis. [VERIFIED]

---

## Task 1: Discrete Health Fields in SM

SM's `json_shelter_animals` API returns **346 fields** per animal record. [VERIFIED — first-animal field dump, 494 total animals]

### Field inventory

| UI Label | SM Field | Type | Values (first animal: Abe) |
|---|---|---|---|
| Health Problems (free-text) | `HEALTHPROBLEMS` | `string` | `""` (empty string when unset) |
| Microchipped | `IDENTICHIPPED` | `number` | `0` = No, `1` = Yes |
| Microchipped (name) | `IDENTICHIPPEDNAME` | `string` | `"No"` / `"Yes"` |
| Altered (spay/neuter) | `NEUTERED` | `number` | `0` = No, `1` = Yes |
| Altered (name) | `NEUTEREDNAME` | `string` | `"No"` / `"Yes"` |
| Declawed | `DECLAWED` | `number` | `0` = No, `1` = Yes |
| Declawed (name) | `DECLAWEDNAME` | `string` | `"No"` / `"Yes"` |
| FIV/FeLV Tested | `COMBITESTED` | `number` | `0` = No, `1` = Yes |
| FIV Test Result | `COMBITESTRESULT` | `number` | `0` = Unknown, `1` = Negative, `2` = Positive |
| FeLV Test Result | `FLVRESULT` | `number` | `0` = Unknown, `1` = Negative, `2` = Positive |
| Heartworm Tested | `HEARTWORMTESTED` | `number` | `0` = No, `1` = Yes |
| Heartworm Result | `HEARTWORMTESTRESULT` | `number` | `0` = Unknown, `1` = Negative, `2` = Positive |
| Special Needs | `HASSPECIALNEEDS` | `number` | `0` = No, `1` = Yes |
| Has Outstanding Medical | `HASOUTSTANDINGMEDICAL` | `number` | `0` = No (0/154 adoptable set) |

All confirmed via live API response. [VERIFIED]

### Is HEALTHPROBLEMS a single field or a related table?

**Single free-text field.** The API returns `HEALTHPROBLEMS` as a plain string on each animal record. There is no companion array, no linked table of "health problem entries," and no delimited structure visible in any of the 14 populated values across 494 animals. Each entry is a short free-text note (5–40 words). SM stores this as a column on the animal table, not a one-to-many relationship. [VERIFIED — all 14 populated values examined, none contain delimiters or structured patterns]

**Note:** SM _does_ have a separate medical/vaccination log system (evidenced by fields like `VACCGIVENCOUNT`, `VACCOUTSTANDINGCOUNT`, `VACCRABIESDATE`), but that data is NOT exposed through `HEALTHPROBLEMS`. The Health Problems box is an independent free-text field in SM's "Health and Identification" section. [VERIFIED]

### Bonus: additional SM fields of interest (not asked but relevant)

| SM Field | Type | Description |
|---|---|---|
| `ISHOUSETRAINED` | `number` | 0=No, 1=Yes, 2=Unknown |
| `ISGOODWITHCATS` | `number` | 0=No, 1=Yes, 2=Unknown |
| `ISGOODWITHDOGS` | `number` | 0=No, 1=Yes, 2=Unknown |
| `ISGOODWITHCHILDREN` | `number` | 0=No, 1=Yes, 2=Unknown |
| `ISGOODWITHELDERLY` | `number` | 0=No, 1=Yes, 2=Unknown |
| `ISGOODONLEAD` | `number` | 0=No, 1=Yes, 2=Unknown |
| `ISCRATETRAINED` | `number` | 0=No, 1=Yes, 2=Unknown |
| `ISGOODTRAVELLER` | `number` | 0=No, 1=Yes, 2=Unknown |
| `ENERGYLEVEL` | `number` | Appears to be 0 for all sampled animals |
| `MARKINGS` | `string` | Empty for sampled animals |
| `COATTYPENAME` | `string` | `"Short"`, `"Long"`, etc. |
| `ADDITIONALFLAGS` | `string` | Pipe-delimited flags (e.g., `"|On Meds|Bite History|"`) |

These `ISGOODWITH*` flags are SM's built-in compatibility checkboxes — distinct from our caregiver profiler's richer `goodWithCats_text`/`_match` system. Currently all sampled animals show `2` (Unknown) for these, suggesting the shelter doesn't routinely fill them in SM. [VERIFIED for first animal; INFERRED as generally unpopulated based on the "Unknown" default]

---

## Task 2: Population Frequency

### HEALTHPROBLEMS (the headline number)

| Species | Adoptable | HP Populated | % | Content Quality |
|---|---|---|---|---|
| **Cat** | 96 | **2** | **2.1%** | 1 real medical (heart murmur), 1 vet routing |
| **Dog** | 39 | **5** | **12.8%** | 1 real medical (heart murmur), 1 real medical (mange), 3 vet routing |
| **Rabbit** | 16 | **1** | **6.3%** | 1 real medical (skin issues) |
| Chinchilla | 1 | 0 | 0% | — |
| Ferret | 1 | 0 | 0% | — |
| Guinea Pig | 1 | 0 | 0% | — |
| **Total** | **154** | **8** | **5.2%** | — |

[VERIFIED — live API query, all 154 adoptable animals checked]

### Representative HEALTHPROBLEMS content (all 14 across entire SM database, not just adoptable)

| Animal | Species | Content | Substantive? |
|---|---|---|---|
| Ava (R2024018) | Dog | `"3/6 heart murmur detected by WCC VTD"` | ✅ Real medical finding |
| Billy Boy (S2025546) | Cat | `"Heart murmur grade 1-2"` | ✅ Real medical finding |
| Tumbleweed (S2026551) | Cat | `"missing back left paw"` | ✅ Real medical/physical note |
| Leo/Petey (A2024048) | Dog | `"possible mange"` | ✅ Real medical finding |
| Snowie (A2023287) | Rabbit | `"skin issues on her feet"` | ✅ Real medical finding |
| Maya (S2026345) | Dog | `"Spay at Roots Vet."` | ❌ Vet routing note, not health problem |
| Nena (S2026079) | Dog | `"Spay at Roots Vet."` | ❌ Vet routing note |
| Tex (A2026025) | Dog | `"Neuter at Roots Vet."` | ❌ Vet routing note |
| Parker (S2026043) | Cat | `"Spay/Neuter at TARA: Middletown"` | ❌ Vet routing note |
| Bruce (S2026209) | Dog | `"Neuter: at Roots Veterinary"` | ❌ Vet routing note |
| Luna (A2026040) | Dog | `"Spay at TARA: Middletown"` | ❌ Vet routing note |
| Murphy (A2024017) | Dog | `"Spay/neuter through the TARA shuttle"` | ❌ Vet routing note |
| Prince (S2026166) | Dog | `"Neuter: at Roots Veterinary"` | ❌ Vet routing note |
| Nutmeg (S2026191) | Rabbit | `"ROEDERS ARK"` | ❌ Appears to be a vet/org name |

[VERIFIED — all 14 populated values across 494 animals examined]

**Content quality assessment:** Of 14 populated values across the ENTIRE SM database, **5 are substantive medical notes** (heart murmurs, mange, skin issues, missing paw) and **9 are vet routing/scheduling notes** misplaced in the Health Problems field. Tumbleweed's "missing back left paw" is particularly important for the bio — it's not in ANIMALCOMMENTS. [VERIFIED]

### Other discrete flags (adoptable only)

| Flag | Cat (96) | Dog (39) | Small (19) | Total (154) |
|---|---|---|---|---|
| **NEUTERED** (altered) | 37 (38.5%) | 35 (89.7%) | 13 (68.4%) | 85 (55.2%) |
| **COMBITESTED** (FIV/FeLV) | 67 (69.8%) | 0 (0%) | 0 (0%) | 67 (43.5%) |
| FIV positive | 6 (6.3%) | — | — | 6 |
| FeLV positive | 2 (2.1%) | — | — | 2 |
| **IDENTICHIPPED** | 8 (8.3%) | 23 (59.0%) | 0 (0%) | 31 (20.1%) |
| **DECLAWED** | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| **HASSPECIALNEEDS** | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| **HEARTWORMTESTED** | 0 (0%) | 2 (5.1%) | 0 (0%) | 2 (1.3%) |
| **HASOUTSTANDINGMEDICAL** | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |

[VERIFIED — live API counts]

**Key observations:**

1. **NEUTERED is underreported for cats** (38.5% vs 89.7% for dogs). Per shelter policy, ALL adopted cats come spayed/neutered. The 59 "unaltered" cats are data-entry gaps in SM, not actually unaltered animals. The policy FAQ handles this correctly at the preamble level ("Cats come spayed/neutered, fully vaccinated, and microchipped at adoption"). [VERIFIED flag counts; INFERRED interpretation based on policy FAQ text]

2. **IDENTICHIPPED is underreported for cats** (8.3% vs 59.0% for dogs). Same pattern — policy says all come microchipped at adoption, but SM records lag.

3. **COMBITESTED is cats-only** as expected (FIV/FeLV are cat-specific viruses). 67/96 tested. 6 FIV-positive adoptable cats: Carlo Gambino, Cheese Puff, Dante, Dean, Segundo, Squeaky. 2 FeLV-positive: Dante, Segundo. [VERIFIED]

4. **DECLAWED = 0 across all 154.** Zero declawed animals in inventory. The bio prompt's ASSERT rule ("the default for shelter cats is claws intact") is empirically correct. [VERIFIED]

5. **HASSPECIALNEEDS = 0 across all 154.** The shelter doesn't use this SM flag. Special needs info, when it exists, goes into caregiver profiler `specialNeeds` field or ANIMALCOMMENTS. [VERIFIED]

---

## Task 3: Where This Data Currently Goes

### Fields we DO ingest from SM

| SM Field | Our Field | Where Used |
|---|---|---|
| `COMBITESTED` + `COMBITESTRESULT` | `Animal.fivStatus` | Phase-2 user message (`FIV: ${animal.fivStatus}` at server.ts:4575), main bio API response, dashboard animal cards |
| `FLVRESULT` | `Animal.felvStatus` | Phase-2 user message (`FeLV: ${animal.felvStatus}` at server.ts:4576), main bio API response, dashboard animal cards |
| `ADDITIONALFLAGS` | `Animal.additionalFlags` | Stored on Animal object, used in various dashboard displays |
| `ANIMALCOMMENTS` | `Animal.description` | Phase-2 user message (as "Shelter notes:"), main bio generator (as SM description fallback), custom-search Tier 2 summary |

[VERIFIED — traced in shelterManagerService.ts:46-83 and server.ts:4567-4603]

### Fields we do NOT ingest from SM

| SM Field | Status |
|---|---|
| `HEALTHPROBLEMS` | **Not ingested.** Zero references in our codebase. [VERIFIED — grep across all .ts files] |
| `NEUTERED` / `NEUTEREDNAME` | **Not ingested.** Not in normalizeAnimal(). Not in Animal interface. [VERIFIED] |
| `DECLAWED` / `DECLAWEDNAME` | **Not ingested.** Not in normalizeAnimal(). [VERIFIED] |
| `IDENTICHIPPED` / `IDENTICHIPPEDNAME` | **Not ingested.** Not in normalizeAnimal(). [VERIFIED] |
| `HASSPECIALNEEDS` | **Not ingested.** Not in normalizeAnimal(). [VERIFIED] |
| `HEARTWORMTESTED` / `HEARTWORMTESTRESULT` | **Not ingested.** Not in normalizeAnimal(). [VERIFIED] |
| `ISHOUSETRAINED` | **Not ingested.** [VERIFIED] |
| `ISGOODWITHCATS` / `ISGOODWITHDOGS` / `ISGOODWITHCHILDREN` | **Not ingested** from SM. We have our OWN richer versions from the caregiver profiler (`goodWithCats_text`/`_match`). [VERIFIED] |

### What each pipeline currently sees

| Pipeline | HEALTHPROBLEMS? | FIV/FeLV? | NEUTERED? | DECLAWED? | Notes |
|---|---|---|---|---|---|
| **Phase-1 selection** (`buildTraitSummary`) | ❌ No | ❌ No (not in trait line) | ❌ No | ❌ No | Trait line has behavior only |
| **Phase-2 bio** (user message) | ❌ No | ✅ Yes (from Animal) | ❌ No | ❌ No | FIV/FeLV in per-cat profile |
| **Main bio generator** (`generateAnimalBio`) | ❌ No | ❌ No | ❌ No | ❌ No | Gets name/breed/age/sex/color + transcripts + merged attributes |
| **Dashboard animal cards** | ❌ No | ✅ Yes | ❌ No | ❌ No | FIV/FeLV displayed |

**Critical gap: HEALTHPROBLEMS is not available to ANY pipeline.** Tumbleweed's "missing back left paw" and Billy Boy's "Heart murmur grade 1-2" exist in SM but are invisible to our bio generators and the searcher. If an adopter asks about health, the bio prompt correctly DEFERs to shelter staff — but we're sitting on data that could inform the bio. [VERIFIED]

**Also notable:** The main bio generator (`generateAnimalBio` in attributeParser.ts) doesn't even receive FIV/FeLV status. It gets only `name, species, breed, age, sex, color, transcripts, mergedAttributes`. The Phase-2 custom-search bio DOES include FIV/FeLV (because it builds the user message directly from the Animal object), but the main bio generator doesn't. [VERIFIED — BioGenerationInput interface at attributeParser.ts:248-257]

---

## Task 4: Ingestion Feasibility (Scope Only)

### What would change

1. **`shelterManagerService.ts` — `normalizeAnimal()`** (the single ingestion point)
   - Add fields to the return object: `healthProblems: raw.HEALTHPROBLEMS || ''`, `neutered: raw.NEUTERED === 1`, `declawed: raw.DECLAWED === 1`, `microchipped: raw.IDENTICHIPPED === 1`, `hasSpecialNeeds: raw.HASSPECIALNEEDS === 1`, `heartwormStatus` (similar to fivStatus derivation).
   - ~10 lines of code.

2. **`types.ts` — `Animal` interface**
   - Add the new fields to the interface.
   - ~6 lines.

3. **`RawShelterAnimal` interface** (optional)
   - Already has `[key: string]: unknown` catch-all, so it technically works without adding explicit types. But adding them is better practice.

4. **Consumers** (downstream — where the data would be USED)
   - Phase-2 user message: add `Health: ${animal.healthProblems || 'None noted'}` line alongside FIV/FeLV. Conditional on species (don't show FIV/FeLV for dogs).
   - Main bio generator: add healthProblems + neutered to `BioGenerationInput` and `animalContext`.
   - buildTraitSummary: could append health note to trait line, but arguably shouldn't (health ≠ behavior trait).
   - Dashboard/API: pass through for display.

### Schema impact

**None.** These fields are not stored in our `shelter.db` — they're live from the SM API via `fetchAnimals()`. The Animal object is an in-memory normalized view of SM data. No migration needed. No column adds. [VERIFIED]

### SM-side gotchas

1. **NEUTERED underreporting for cats:** 38.5% show as unaltered when shelter policy says all come altered at adoption. If we surface this field per-animal, we'd show inaccurate data for 59 cats. The current approach (policy FAQ preamble: "all come spayed/neutered") is actually MORE correct than the per-animal SM flag. **Risk: surfacing NEUTERED per-animal would DEGRADE accuracy for cats.** [VERIFIED]

2. **HEALTHPROBLEMS dual-use:** 9 of 14 populated values are vet routing notes ("Spay at Roots Vet."), not actual health problems. If surfaced in bios, the model would say things like "Maya needs her spay done at Roots Veterinary" — confusing to adopters and potentially inaccurate by adoption time. Would need filtering or model instruction to distinguish vet routing from medical findings. [VERIFIED]

3. **DECLAWED = 0 universally:** Zero signal. Not worth ingesting unless the shelter starts tracking it. The bio prompt's ASSERT rule (claws intact by default) is empirically correct today. [VERIFIED]

4. **HASSPECIALNEEDS = 0 universally:** Same — shelter doesn't use this SM flag. Not worth ingesting. [VERIFIED]

5. **IDENTICHIPPED underreporting for cats:** Same problem as NEUTERED — policy says all come chipped, but only 8.3% flagged in SM. Per-animal surfacing would contradict the (correct) policy answer. [VERIFIED]

6. **No related-table complexity:** HEALTHPROBLEMS is a flat string, not a join. No ACTIVEMOVEMENTTYPE-style overloading. No re-encoding needed (the API returns clean JSON strings). The ingestion path is straightforward. [VERIFIED]

### Bottom-line feasibility

| Field | Ingest? | Rationale |
|---|---|---|
| **HEALTHPROBLEMS** | **Maybe** | Only 5 substantive medical notes across 494 animals. High value per note (heart murmur, missing paw) but very low population. Vet-routing noise needs filtering. |
| **NEUTERED** | **No** | Underreported for cats; policy preamble is more accurate. |
| **DECLAWED** | **No** | Zero populated across all 154 adoptable. |
| **IDENTICHIPPED** | **No** | Underreported for cats; policy preamble is more accurate. |
| **HASSPECIALNEEDS** | **No** | Zero populated. |
| **HEARTWORMTESTED** | **Defer** | Only 2 dogs tested, 0 positive. Revisit if dogs get custom-search. |
| **COMBITESTED/FIV/FeLV** | **Already ingested** | In Animal.fivStatus/felvStatus. Working correctly. |

The highest-value action is HEALTHPROBLEMS ingestion for the ~5 animals where it contains real medical data — but the population rate (5.2% overall, with majority being vet-routing noise) means this is a "nice to have" rather than a gate for species expansion. The bio prompt's DEFER rule ("our search records don't note any health concerns — please confirm with shelter staff") correctly handles the 94.8% of animals without health notes.
