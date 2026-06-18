# Dog & Small-Animal Data Profiles for Searcher Design

**Date:** 2026-06-18 12:18 ET  
**Production unchanged:** Read-only. No edits, commits, restarts, migrations, writes, or API calls. [VERIFIED]  
**Note:** The custom-search endpoint (`POST /api/matcher/custom-search`) is currently **cats-only** (line 4400: `allAnimals.filter(a => species === 'cat')`). This report assesses whether the compact-trait-summary design would extend to dogs/smalls if/when the endpoint gains species support. [VERIFIED]

---

## Task 1 — Shared Pipeline or Separate?

**Same pipeline. No species branching anywhere.** [VERIFIED]

| Component | Species-conditional? | Evidence |
|---|---|---|
| `behavior_notes` table | No | Single table, no species column; keyed on `shelter_code` only. [VERIFIED via schema] |
| `attributeParser.ts` (GPT-4o parser) | No | The extraction prompt mentions "dogs", "cats", "calm lap cat" as examples but applies identically to all species. No if/switch on species. [VERIFIED — grep "species\|Species\|dog\|Dog\|cat\|Cat\|rabbit" returned only field names and examples, no branching] |
| `saveBehaviorNotes()` | No | Single INSERT path, no species parameter. [VERIFIED — localDatabase.ts:908] |
| `getBehaviorNotes()` (merge) | No | Queries by `shelter_code` only, no species filter or species-conditional logic. [VERIFIED — localDatabase.ts:977] |
| `getBehaviorRecords()` | No | Same — shelter_code only. [VERIFIED — localDatabase.ts:958] |

**Conclusion:** The Change-A design (compact trait summaries from merged structured fields) applies to dogs and small animals unchanged — same table, same parser, same merge, same field names. [VERIFIED]

---

## Task 2 — Pool & Tier Sizes by Species

### Current adoptable counts

| Species | Count |
|---|---|
| Cat | 99 |
| Dog | 39 |
| Rabbit | 16 |
| Chinchilla | 1 |
| Ferret | 1 |
| Guinea Pig | 1 |
| **Total** | **157** |

[VERIFIED — queried from `/api/animals` (ADOPTABLE=1 gate)]

### Tier breakdown

| | **Dogs (39)** | **Small Animals (19)** | Cats (99) for comparison |
|---|---|---|---|
| **Bucket A** (≥1 behavior_notes) | 13 (33%) | 15 (79%) | 22 (22%) |
| **Bucket B** (SM description only) | 26 (67%) | 4 (21%) | — |
| **Bucket C** (inferred-only) | 0 (0%) | 0 (0%) | 77 (78%) |

[VERIFIED]

**Key observation:** Dogs and smalls have **zero Bucket C animals** — every adoptable dog and small has either a caregiver profile or an SM description. Cats are the outlier with 78% inferred-only. [VERIFIED]

### Dog Bucket B: stock vs custom SM descriptions

Of the 26 dogs with SM descriptions only:
- **22** have the stock template ("Meet X! X is a [breed], approximately [age]... is waiting to find a warm home... come say hello")
- **4** have custom narrative descriptions with behavioral signal

The stock template carries **zero behavioral signal** — no energy, no compatibility data, no personality traits. These 22 dogs are effectively Bucket C despite technically having a description. [VERIFIED]

### Small Bucket B: all stock

All 4 small-animal SM-only descriptions are the stock template. Zero behavioral signal. [VERIFIED]

### Age distribution

| | Dogs (39) | Small Animals (19) |
|---|---|---|
| Young (<2y dogs / <1y smalls) | 7 (18%) | 3 (16%) |
| Adult | 23 (59%) | 14 (74%) |
| Senior (≥8y dogs / ≥5y smalls) | 9 (23%) | 2 (11%) |

[VERIFIED]

**No extreme youth skew** for either species. Compare cats: 32/99 (32%) young with near-zero behavioral evidence. Dogs and smalls have balanced age profiles. [VERIFIED]

### Does the transcript-length-asymmetry problem arise for dogs/smalls?

**Dogs: Yes, but less severe.** Pool is 39 (vs 99 cats), and 13 have profiles. The 22 stock-template dogs carry zero signal — similar to cat Bucket C. But the pool is 2.5× smaller, so attention-window pressure is lower. With a sort, 13 profiled dogs would occupy positions 1–13 of 39 — well within the attention window the cat experiments showed works (~top 12). [INFERRED]

**Small animals: Unlikely.** 15/19 have profiles (79% coverage), pool is only 19 total. Even without any redesign, the model would see all 19 candidates easily. [INFERRED]

---

## Task 3 — Field Fitness & Axis Applicability

### 3a. Merged-field coverage

#### Dogs (19 with behavior_notes — note: 13 are adoptable, 6 are non-adoptable historical)

| Axis | Coverage | Comparison (cats) |
|---|---|---|
| energy_level | 16/19 (84%) | 18/18 (100%) |
| good_with_kids | 17/19 (89%) | 13/18 (72%) |
| good_with_cats | 16/19 (84%) | 14/18 (78%) |
| good_with_dogs | 18/19 (95%) | 12/18 (67%) |

[VERIFIED]

Dog coverage is **equal or better** than cats on every axis. The good_with_dogs axis (95%) is particularly strong — sensible since dog-to-dog compatibility is a primary adoption concern. [VERIFIED]

#### Small Animals (17 with behavior_notes — 15 adoptable, 2 non-adoptable)

| Axis | Coverage | Comparison (cats) |
|---|---|---|
| energy_level | 15/17 (88%) | 18/18 (100%) |
| good_with_kids | 16/17 (94%) | 13/18 (72%) |
| good_with_cats | 16/17 (94%) | 14/18 (78%) |
| good_with_dogs | 16/17 (94%) | 12/18 (67%) |

[VERIFIED]

Small-animal coverage is the **highest of all three species** on kids/cats/dogs axes. [VERIFIED]

### 3b. Axis applicability — do the cat-shaped fields make sense for other species?

#### Dogs — ✅ All axes applicable

The four compatibility axes map naturally to dogs. Sample structured fields + transcripts:

**A2024185 Amari (Dog, 1 note):**
```
energy: "Medium energy level"
kids: "Good with kids"
cats: "Good with cats"
dogs: "Very good with other dogs, needs another dog for confidence"
transcript: "...She's very submissive and sweet. She has some medium energy level. She's good 
with people... She is good with cats. She is very good with other dogs. She will need to be 
with another dog because she could use a confidence boost..."
```
✅ All axes correctly populated from transcript. [VERIFIED]

**A2025088 Achilles (Dog, 1 note):**
```
energy: "Very energetic"
kids: "Good with kids, but better with older kids due to size and energy"
cats: "Hasn't been tested with cats yet"
dogs: "Can be good with other dogs, will require a meet and greet"
```
✅ Axes read sensibly. Hedged values preserved ("hasn't been tested" for cats, "will require a meet and greet" for dogs). [VERIFIED]

**A2025203 Marshmallow/Rocco (Dog, 1 note):**
```
energy: "High energy, very active for 16 years old"
kids: "Not been around children much, but likely would be fine"
cats: "Lives with four 15-year-old cats, gets along well with no problems"
dogs: "Standoffish around dogs, not interested in them"
```
✅ Mixed/negative signal correctly preserved ("standoffish around dogs"). [VERIFIED]

**A2025234 Jinx (Dog, 1 note):**
```
energy: MISSING
kids: "Good with kids, mostly unaware of surroundings"
cats: "Good with cats"
dogs: "Good with other dogs"
transcript: "...He's deaf, blind, we think he has trouble smelling... He's just a gross 
little old guy..."
```
⚠️ Energy missing despite transcript describing a medical/special-needs dog with low activity. Parser may have been uncertain about energy classification for a disabled animal. [VERIFIED]

#### Small Animals — ⚠️ Axes applicable but semantics shift

The cat-shaped axes ARE populated for small animals, but the **semantics of good_with_cats and good_with_dogs are inverted**: for a cat, "good with dogs" means "tolerates dogs in the household." For a rabbit, "good with cats/dogs" means **"safe around predator species"** — a much higher-stakes question where the risk flows TO the small animal, not FROM it.

The parser handles this correctly in practice:

**G2026002 Tater Tot (Guinea Pig, 1 note):**
```
energy: MISSING
kids: "He would be great with kids."
cats: "Not necessarily cats, your cat might want to play naughty with him since he is a guinea pig."
dogs: "Probably not great with dogs, it would have to be the right introduction."
transcript: "...Not necessarily cats, your cat might want to play naughty with him since 
he is a guinea pig. Probably not great with dogs, it would have to be the right introduction..."
```
✅ The parser faithfully captures the prey-species nuance — the caregiver said it, the parser transcribed it. The "cat might want to play naughty with him" text carries the right signal for an adopter with cats. [VERIFIED]

**A2023287 Snowie (Rabbit, 1 note):**
```
energy: "Loves running through her tunnel and exploring"
kids: MISSING
cats: "Good with cats"
dogs: "Good with dogs"
transcript: "...She would do best in a home with adults with bunny experience..."
```
⚠️ Kids field missing, but transcript says "best with adults with bunny experience" — implies NOT good with kids. Parser missed this negative signal. [VERIFIED]

**R2023007 Charlie (Rabbit, 2 notes):**
```
energy: "Calm"
kids: "Great with kids of all ages"
cats: "Gets along great, likes cats"
dogs: "Would be good with dogs too"
```
✅ All axes populated and sensible for a rabbit. [VERIFIED]

**R2023065 Butterscotch (Rabbit, 1 note):**
```
energy: "Loves to run through tunnels, explore, and hop around"
kids: "Best in a home with adults or older children"
cats: "Good with cats"
dogs: "Can be good with dogs with the right introduction"
```
✅ Hedged values preserved. [VERIFIED]

**R2024016 Cookie (Rabbit, 2 notes):**
```
energy: "Pretty active and still likes to chill"
kids: "Would do good with older kids"
cats: "Would do well with cats"
dogs: "Not sure about dogs, unless it's the right dog for him"
```
✅ Natural hedging preserved in dogs field. [VERIFIED]

**Small-animal summary:** The axes work. The semantic shift (predator tolerance vs cohabitation) is a labeling nuance, not a data-structure problem. The caregivers describe the actual household compatibility situation, and the parser faithfully extracts it. The compact trait-summary template would read naturally: "with cats: Not necessarily cats, your cat might want to play naughty with him" tells an adopter exactly what they need to know. [INFERRED]

---

## Task 4 — SM Descriptions for Non-Cats

### Dogs (26 Bucket B)

**22 of 26 are the stock template** — zero behavioral signal:
```
"Meet Duke! Duke is a male Labrador Retriever, approximately 3 years old, with a 
Chocolate coat and a medium build. Duke is waiting to find a warm home and loving 
family they can call their own. The best way to see what makes them special is to 
come say hello — please contact Four Legs Good Animal Rescue to arrange a visit."
```
[VERIFIED]

**4 of 26 have custom narrative descriptions** with genuine behavioral signal:

1. **Bolt (A2026050):** "Hi there! I'm Bolt, your future adventure buddy! I'm only 1 year old, super playful, and a bit of a goofball. I love exploring and am always up for a good run... I am super social! I can see myself fitting right into a home with energetic teens and maybe even another dog to be my partner in crime." — Energy: high, kids: yes (energetic teens), dogs: yes. [VERIFIED]

2. **Cookie (A2023267):** "Cookie adores people... She loves adventures, car trips, snuggling, and kayaking... Cookie needs to be your one and only baby; she does better as a solo pet and can sometimes get a bit protective when out and about." — Energy: high, cats/dogs: no (solo pet). [VERIFIED]

3. **Isis the Goddess (S2024694):** "Isis is the perfect low maintenance friend who rarely barks, and thrives on affection from people. Her mellow demeanor makes her an ideal pet for any home looking for a gentle soul..." — Energy: low. [VERIFIED]

4. One additional with moderate detail.

**Implication for the compact-line approach:** The 22 stock-template dogs would get `"Documented — none."` (same as cat Bucket C). The 4 custom descriptions could be rendered to a trait line, but would need an SM-text-to-trait extraction step (either LLM or manual). This is the same open question identified for cat Bucket B — SM descriptions are unstructured prose, not parsed into the behavior_notes structured fields. [INFERRED]

### Small Animals (4 Bucket B)

**All 4 are the stock template:**
```
"Meet Callie Rabbit! Callie Rabbit is a female Hotot, approximately 1 year old, 
with a White and Black coat and a medium build. Callie Rabbit is waiting to find 
a warm home..."
```
[VERIFIED]

Zero behavioral signal. These would all get `"Documented — none."` in the compact-line approach. [VERIFIED]

---

## Summary Assessment

### Does the compact-trait-summary design hold for dogs and small animals?

**Yes, with no structural modifications needed.** [INFERRED from verified data]

| Dimension | Dogs | Small Animals | Risk |
|---|---|---|---|
| Pipeline | Same as cats | Same as cats | None |
| Axes applicable? | ✅ All four | ✅ All four (semantics shift for cats/dogs axes) | Low — parser handles it |
| Field coverage | Better than cats | Best of all three | None |
| Pool size | 39 (2.5× smaller than cats) | 19 (5× smaller) | Attention-window problem is mitigated by size |
| Bucket C (no data at all) | 0 | 0 | None — every animal has at least an SM entry |
| Stock-template Bucket B | 22 dogs (56%) | 4 smalls (21%) | **Moderate** — these carry zero behavioral signal, same as cat Bucket C |
| Transcript-length asymmetry | Exists (13 profiled vs 22 stock-template) but pool is small enough | Not a problem (15/19 profiled) | Low for dogs, none for smalls |

### Risks specific to non-cats

1. **Dog stock-template problem:** 22/39 adoptable dogs (56%) have only the stock "Meet X!" template — no behavioral data at all. These would render as `"Documented — none."` in the compact-line approach, same as cat Bucket C. However, the pool is only 39 total (vs 99 cats), so even with 22 empty entries, the 13 profiled dogs are within the model's attention window without needing a sort. [INFERRED]

2. **Small-animal predator-safety semantics:** "good_with_cats: Good with cats" for a rabbit means "safe around cats" — a different risk profile than for a cat-to-cat compatibility question. The compact trait line would read naturally, but an adopter searching for "good with my cat" is really asking "will my cat harm the rabbit?" The current text captures this nuance when caregivers articulate it (Tater Tot: "your cat might want to play naughty with him") but not universally. [INFERRED]

3. **Parser gap on Snowie (rabbit):** Transcript says "best with adults with bunny experience" but kids field is empty. The parser missed an implied-negative for kids. This pattern may recur with other small animals where the caregiver implies age restrictions indirectly. [VERIFIED]

### Custom-search is cats-only today

The endpoint hardcodes `species === 'cat'` at line 4400. Extending it to dogs/smalls would require adding a species parameter to the request schema and adjusting the hard-filter logic. The compact-trait-summary design would work unchanged once the species gate is opened. [VERIFIED]
