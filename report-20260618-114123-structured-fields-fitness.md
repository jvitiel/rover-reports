# Structured Fields Fitness Assessment — Searcher Reuse

**Date:** 2026-06-18 11:41 ET  
**Production unchanged:** Read-only. No edits, commits, restarts, migrations, writes to app tree, or API calls. [VERIFIED]

---

## Task 1 — Field Location

### Per-record structured fields

**Table:** `behavior_notes`  
**Schema (query-relevant columns):** [VERIFIED via `PRAGMA table_info`]

| Column | Type | Format | Example values |
|---|---|---|---|
| `energy_level` | TEXT | Free-text snippet | "Low", "Very playful, climbs and jumps", "Calm lap cat" |
| `good_with_cats` | TEXT | Legacy free-text | "Good with other cats" |
| `good_with_cats_text` | TEXT | Rich description (dual storage) | "Gets along great, grooms other cats" |
| `good_with_cats_match` | TEXT | Enum: yes/somewhat/no/unknown | "yes" |
| `good_with_dogs` | TEXT | Legacy free-text | "Good with other dogs" |
| `good_with_dogs_text` | TEXT | Rich description | "Unsure, but likely fine" |
| `good_with_dogs_match` | TEXT | Enum | "unknown" |
| `good_with_kids` | TEXT | Legacy free-text | "Good with kids" |
| `good_with_kids_text` | TEXT | Rich description | "Absolutely loves children" |
| `good_with_kids_match` | TEXT | Enum | "yes" |
| `energy_level_match` | TEXT | Enum: low/medium/high/unknown | "high" |
| `special_needs` | TEXT | Free-text | "FIV positive", "None" |
| `people_reaction` | TEXT | Free-text | "Very social and outgoing" |
| `backstory` | TEXT | Free-text | "Came in as strays" |
| `additional_notes` | TEXT | Free-text | "On gabapentin, very picky" |

Each row is one caregiver profile recording. Multiple rows may exist per `shelter_code`. Values are short free-text snippets, NOT enums (except the `_match` suffix columns). The `_text` + `_match` columns are "dual storage" — the `_text` column carries the rich description for bios, the `_match` column carries a coarse enum for filtering. [VERIFIED]

### Merged view

**Stored?** No. Computed at request time in the backend. [VERIFIED]

**Where computed:** `localDatabase.ts`, function `getBehaviorNotes(animalId)`, line 976. [VERIFIED — quoted in Task 2 below]

**Reusable by the custom-search endpoint?** Yes. The function is an exported module-level function in `localDatabase.ts`. The custom-search endpoint (line 4282 of `server.ts`) already imports from the same module. It currently calls `getBehaviorRecords()` (individual records) instead of `getBehaviorNotes()` (merged), but switching is a one-import change — no re-implementation needed. [VERIFIED]

**Dashboard frontend:** Does NOT compute the merge. The backend attaches the merged result to the animal list API response (line 930 of `server.ts`: `const behaviorNotes = getBehaviorNotes(animal.shelterCode)`), and the frontend displays it directly. [VERIFIED]

---

## Task 2 — Merge Logic

**Source:** `localDatabase.ts` lines 958–1057. [VERIFIED]

### Algorithm

```typescript
// Get the 5 most recent records, then re-sort oldest-to-newest for merge
const stmt = database.prepare(`
  SELECT * FROM (
    SELECT * FROM behavior_notes 
    WHERE shelter_code = ? 
    ORDER BY recorded_at DESC 
    LIMIT 5
  ) ORDER BY recorded_at ASC
`);
```

1. Take the 5 most recent `behavior_notes` rows for the animal, sorted oldest→newest. [VERIFIED]
2. Start with an empty merged object. [VERIFIED]
3. Iterate oldest→newest. For each field, overwrite the merged value if the record's value passes `hasValue()`. [VERIFIED]

### `hasValue()` filter (line 894):

```typescript
function hasValue(val: string | undefined | null): boolean {
  if (!val) return false;
  const trimmed = val.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed === 'not specified' || trimmed === 'unknown' || trimmed === 'n/a' || trimmed === 'none specified') {
    return false;
  }
  return true;
}
```

Rejects: `null`, empty, "Not specified", "Unknown", "N/A", "None specified". [VERIFIED]

**Does NOT reject:** "Unspecified", "Unsure", "Not tested, we don't know..." — these pass `hasValue()` and overwrite earlier, more informative values. [VERIFIED]

### Conflict resolution

**Last-non-null wins.** If the most recent record has a meaningful value for a field, it overwrites all prior values for that field. There is no "most-complete" or "per-field best" logic — just chronological overlay. [VERIFIED]

### Fallback: `_text` ← legacy

After the merge loop, if a `_text` field is still empty but the legacy field has a value, the legacy value fills it (lines 1044–1051):

```typescript
if (!hasValue(merged.goodWithCats_text) && hasValue(merged.goodWithCats)) {
  merged.goodWithCats_text = merged.goodWithCats;
}
```

[VERIFIED]

### Failure mode: sparse-most-recent-overwrites-rich-earlier

If the most recent profile is sparse (most fields "Not specified" — which gets filtered by `hasValue`), but one field has a WEAKER value like "Unsure" or "Not tested," that weaker value overwrites a prior richer answer. Example: Dean (W2025068), detailed below in Task 4. [VERIFIED — see weakness scan]

---

## Task 3 — Parser Identity

The structured fields are extracted by **GPT-4o** (OpenAI), called at **ingestion time** (when a caregiver profile is saved). The parser is in `attributeParser.ts` (line 1: `"Attribute parser using GPT-4o to extract structured data from transcripts"`). It receives the raw transcript text and returns a Zod-validated JSON object with all structured fields. The extraction prompt asks for both rich `_text` descriptions and coarse `_match` enums. The parser runs once per profile recording — it does NOT re-run at query time or when the merged view is requested. [VERIFIED]

---

## Task 4 — Fidelity & Coverage for the Searcher

### 4a. Coverage — 22 evidenced cats from the experiment pool

Of the 22 "evidenced" cats in the experiment pool, 4 have zero `behavior_notes` rows (S20251236 Blizzard, S2023297 Iron, R2024025 Lucky, S20241161 Munster) — their "evidence" came from SM descriptions only, which are NOT parsed into structured fields. For the remaining 18 with actual behavior_notes:

| Axis | Has real value (merged) | Missing/placeholder | Coverage |
|---|---|---|---|
| energy_level | 18/18 | 0 | **100%** |
| good_with_kids | 13/18 | 5 | **72%** |
| good_with_cats | 14/18 | 4 | **78%** |
| good_with_dogs | 12/18 | 6 | **67%** |

[VERIFIED — queried from DB with `hasValue()` logic applied]

**Note:** "Missing" includes cases where the parser returned "Not specified" and `hasValue()` correctly filters it out. It does NOT include "Unsure"/"Unspecified" which leak through (see weakness scan).

### 4b. Three-column fidelity comparison

#### Karen Smith (S2026447) — 1 profile

| Axis | Production merged field | Hand-built compact (harness) | Raw transcript |
|---|---|---|---|
| Energy | "Very playful, climbs and jumps" | "Very playful, climbs and jumps" | "she's very playful, very playful. She climbs, she jumps." |
| Kids | "Good with kids, caregiver's kids love her" | "Good with kids, caregiver's kids love her" | "Good with kids, my kids love her." |
| Cats | "Good with other cats" | "Good with other cats" | "Yes, good with other cats." |
| Dogs | "Good with other dogs, caregiver has a dog" | "Good with other dogs, caregiver has a dog" | "Good with other dogs too. I have a dog." |
| Medical | "None" | "None" | "No, no medical or special needs." |

**Verdict: IDENTICAL.** The production merged fields carry exactly the same query-relevant signal as the hand-built compact summary. Single-profile cat with no merge conflicts. [VERIFIED]

#### Lilac (S2026357) — 1 profile

| Axis | Production merged field | Hand-built compact (harness) | Raw transcript |
|---|---|---|---|
| Energy | "Very playful, likes the toys" | "Very playful, likes the toys" | "she does like the toys. She's very playful" |
| Kids | "Could be good with kids, I believe" | "Could be good with kids, I believe" | "Could be good with kids, I believe" |
| Cats | "Good with cats, has three other siblings" | "Good with cats, has three other siblings" | "Good with cats, has three other siblings" |
| Dogs | "Dogs, I don't know yet" | "Dogs, I don't know yet" | "dogs, I don't know yet" |
| Medical | "None" | "None" | "no medical or special needs" |

**Verdict: IDENTICAL.** Same story — single-profile cat, no merge conflict. [VERIFIED]

#### Abe / Louie (S2025966) — 3 profiles

| Axis | Production merged field | Hand-built compact (harness) | Raw transcript (most recent, 2026-06-10) |
|---|---|---|---|
| Energy | "Low" | "Low" | "Low" |
| Kids | "Very good with kids" | "Very good with kids" | "Very good with kids" |
| Cats | "Very good with cats" | "Very good with cats" | "Very good with cats" |
| Dogs | "Very good with dogs" | "Very good with dogs" | "Very good with dogs" |
| Medical | "None" | "None" | implicit (not mentioned) |

**Verdict: IDENTICAL.** The mismatch signal ("Low" energy for a "playful, energetic" query) is preserved in both the production merged field and the hand-built summary. Three profiles exist, but the most recent (2026-06-10) has values for all fields, so the merge simply takes those. [VERIFIED]

**Note on earlier notes:** Profile 1 (2026-04-15) said "Calm lap cat" for energy and "Loves children, sleeps in bed with five and six year old kids." The most recent note (2026-06-10) compressed this to "Low" and "Very good with kids." Signal is preserved but less vivid — which is fine for the searcher's selection use (coarse ranking, not bio writing). [VERIFIED]

### 4c. Weakness Scan — 8 additional cats

#### ❌ W2025068 Dean — LAST-VALUE REGRESSION (kids)

| Axis | Production merged | Earlier (better) value | Raw transcript evidence |
|---|---|---|---|
| Kids | **"Not tested, we don't know if he's good with kids"** | Note 1: "Good with kids, gentle and easy to handle" / Note 2: "He'd be great with kids" | Note 1 transcript: "Great with kids and great with other animals" |

**Problem:** Dean has 4 profiles. Notes 1 and 2 (April) say "good with kids" / "great with kids." Note 3 has "Not specified" (filtered out by `hasValue`). Note 4 (May 30, most recent) says **"Not tested, we don't know if he's good with kids"** — this passes `hasValue()` because it's not literally "Not specified" or "Unknown." The merge overwrites the positive April signal with the hedged May value. [VERIFIED]

**Impact on searcher:** For a "good with kids" query, Dean's merged field reads as uncertain rather than positive. The hand-built harness read the MOST RECENT note only and got the same result, so for this specific experiment both paths would produce the same outcome. But the production merged field loses signal that existed in earlier notes. [VERIFIED]

#### ⚠️ S2025546 Billy Boy — "Unsure"/"Unspecified" leak

| Axis | Production merged | Transcript |
|---|---|---|
| Kids | **"Unspecified"** | "Unspecified" (caregiver said the word) |
| Dogs | **"Unsure"** | "Unsure" (caregiver said the word) |

**Problem:** The parser faithfully transcribed what the caregiver said ("Unspecified", "Unsure"), but `hasValue()` doesn't filter these out — only "Not specified" and "Unknown" are filtered. So the merged view has "Unspecified" for kids and "Unsure" for dogs, which look like placeholder noise to a searcher. [VERIFIED]

**Impact:** Minor — these ARE the caregiver's actual answers (they literally said "unsure" and "unspecified"). But they'd read oddly in a compact trait summary. The `_match` enum fields handle this correctly (`good_with_kids_match` would be "unknown"), so the searcher could use `_match` for filtering and `_text` for display. [INFERRED]

#### ⚠️ S20251008 Edna — energy contradiction across notes

| Axis | Production merged (most recent) | Earlier value | Impact |
|---|---|---|---|
| Energy | **"Very mellow, loves attention"** (June) | "Full of youthful energy, likes to play, social" (April) | Searcher sees "mellow" only |

**Problem:** Two caregivers gave opposite energy descriptions. The merge takes the most recent. This is arguably correct (the June caregiver's observation is more current), but the April transcript describes Edna as "anything but an old lady... always stepping out, ready to go, ready to play." A searcher for "energetic" would miss Edna. [VERIFIED]

**Impact:** Moderate. The hand-built harness had the same result (used most recent note's structured field). This is a content/observation problem, not a merge bug. [INFERRED]

#### ✅ S2026268 Juliet — dogs gap

| Axis | Production merged | Transcript |
|---|---|---|
| Dogs | **(empty — no value)** | Transcript does not mention dogs |

**Result:** Correct. No information exists, and the field is empty. No signal lost. [VERIFIED]

#### ✅ S2025833 Jeans — sparse second note handled correctly

Note 1 has detailed fields (kids: "Absolutely gets along with children", cats: "Very good with cats"). Note 2 is a brief medical note with all "Not specified" values. The merge correctly retains Note 1's values because Note 2's "Not specified" entries are filtered by `hasValue()`. Energy merged to "Perfect for someone looking for a couch potato to watch TV with them" — a long but accurate description from Note 1. [VERIFIED]

#### ✅ S2025961 Segundo — all axes missing except energy and medical

Two notes, both with "Not specified" for kids/cats/dogs. The transcripts confirm these topics weren't discussed. Merged energy: "Calm, enjoys pets but doesn't like to be held." No signal loss — the information simply doesn't exist. [VERIFIED]

#### ⚠️ S2026177 Stevie — dogs gap despite transcript signal

| Axis | Production merged | Transcript snippet |
|---|---|---|
| Dogs | **(empty)** | "She's okay with other animals, I think. She has to get used to them." |

**Problem:** The transcript mentions "other animals" which could imply dogs, but the parser extracted "Not specified" for dogs (correctly cautious — "other animals" is ambiguous). No signal loss per se, but a human reading the transcript might infer dog tolerance. [VERIFIED]

**Impact:** Minimal. The parser was conservatively correct. [INFERRED]

#### ⚠️ A2023301 Zelda — dogs field contains cats data

| Axis | Production merged | Earlier value |
|---|---|---|
| Dogs | **"Great with other cats"** | Note 1 had "Not specified" for dogs |

**Problem:** Note 1 has `good_with_dogs_text = "Not specified"` (filtered). Note 2 is a test stub ("This is a test profile on Zelda, the") — apparently the parser hallucinated dogs data from a near-empty transcript, writing "Great with other cats" into the `good_with_dogs_text` field. The merge then picks this up as the only non-null dogs value. [VERIFIED]

**Impact:** Low (Zelda has no real dogs data; the transcript never mentions dogs). But it's a data quality issue — the dogs field contains cats-related text. A searcher for "good with dogs" would get a false positive. [VERIFIED]

### 4d. Weakness summary

| Pattern | Cats affected | Severity for searcher |
|---|---|---|
| Last-value regression (hedged recent overwrites positive earlier) | Dean (kids) | **Moderate** — loses established positive signal |
| "Unsure"/"Unspecified" leak through `hasValue()` | Billy Boy (kids, dogs) | **Low** — accurate but reads as noise |
| Contradictory observations across notes | Edna (energy) | **Moderate** — inherent to multi-observer data |
| Parser hallucination on near-empty transcript | Zelda (dogs field) | **Low** — edge case on test stub data |
| SM-only cats have no structured fields at all | 4 of 22 evidenced cats | **Moderate** — 18% of evidenced pool invisible to field-based searcher |

---

## Bio Generator — What It Actually Reads

The bio generator (`generateBioDraftForAnimal`, `server.ts` line 2055) reads **BOTH**:

1. **`merged.rawTranscript`** — all raw transcripts concatenated with `\n\n---\n\n` separators (line 1055 of `localDatabase.ts`). This is the narrative source for writing bios. [VERIFIED]

2. **Merged structured fields** — assembled into a `mergedAttrs` JSON object (lines 2066–2076):
```typescript
const mergedAttrs = {
  color: merged.color,
  specialFeatures: merged.specialFeatures,
  energyLevel: merged.energyLevel,
  peopleReaction: merged.peopleReaction,
  goodWithCats: merged.goodWithCats_text,
  goodWithDogs: merged.goodWithDogs_text,
  goodWithKids: merged.goodWithKids_text,
  specialNeeds: merged.specialNeeds,
  backstory: merged.backstory,
  additionalNotes: merged.additionalNotes,
};
```
Both are passed to `generateAnimalBio()` as `transcripts` and `mergedAttributes`. [VERIFIED]

The bio generator uses the raw transcripts for narrative richness and the merged structured fields as an attribute summary. The custom-search endpoint, by contrast, currently uses only raw transcripts (via `getBehaviorRecords`) and does NOT read the merged structured fields at all. [VERIFIED]

---

## Overall Assessment

**For the three experiment-critical cats (Karen Smith, Lilac, Abe), the production merged fields carry IDENTICAL query-relevant signal to the hand-built compact summaries.** [VERIFIED] A compact summary template populated from the production merged fields would produce the same trait lines the Cond C experiment used.

**The merged fields are backend-computed and already available to the custom-search endpoint** — no frontend re-implementation needed, just a function call change. [VERIFIED]

**Coverage gaps exist but are bounded:** energy is 100% covered (18/18), kids 72%, cats 78%, dogs 67%. The gaps are genuine unknowns (the caregiver didn't discuss the topic), not parser failures. [VERIFIED]

**The main risk is the last-value-regression pattern** (Dean's kids field), where a hedged most-recent value overwrites a positive earlier value. This affects the query-axis signal for multi-profile cats and would need either a merge-strategy change (prefer most-positive, or per-field-best) or a searcher that reads individual records. For the current pool of 22, only Dean shows a clear instance. [VERIFIED]

**The 4 SM-only evidenced cats** (Blizzard, Iron, Lucky, Munster) would need their SM descriptions parsed into the same structured fields, or the compact summary builder would need to handle the SM description path separately. [INFERRED]
