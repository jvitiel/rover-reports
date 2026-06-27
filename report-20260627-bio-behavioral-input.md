# Bio Generator — Behavioral Input Diagnosis

**Date:** 2026-06-27 21:17 UTC  
**Type:** Read-only diagnosis  
**Test case:** A2025203 (Marshmallow)

---

## 1. What Data Reaches the GPT Prompt

`generateBioDraftForAnimal(shelterCode)` (server.ts:2128) assembles input through two paths:

### Path A: Full Generate (has caregiver behavior_notes)
When `getBehaviorNotes(shelterCode)` returns data, the model receives:

| Field | Source | Content type |
|-------|--------|-------------|
| `name` | SM ANIMALNAME | Identifier |
| `species` | SM SPECIESNAME | Factual |
| `breed` | SM BREEDNAME | Factual |
| `age` | SM ANIMALAGE | Factual (e.g. "10 years 8 months.") |
| `sex` | SM SEXNAME | Factual |
| `color` | SM BASECOLOURNAME | Factual |
| `mergedAttributes` | behavior_notes (merged, newest wins) | **Behavioral** — energy level, people reaction, good-with-cats/dogs/kids text, special needs, backstory, additional notes |
| `transcripts` | behavior_notes.raw_transcript (all records concatenated) | **Behavioral** — raw caregiver voice recordings (transcribed), the richest signal |

The prompt assembles these into an `animalContext` block (attributeParser.ts:293):
```
Animal Information (from ShelterManager):
- Name / Species / Breed / Age / Sex / Color

Merged Behavior Attributes (from caregiver observations):
{JSON of mergedAttributes}

Raw Caregiver Transcripts (chronological observations):
{raw transcript text}
```

**This path has RICH behavioral signal.** The transcripts are verbatim caregiver recordings — first-person descriptions of the animal's personality, quirks, energy, compatibility, medical needs, and backstory.

### Path B: SM Generate (no behavior_notes, but has SM description)
When `getBehaviorNotes()` returns null but `hasStaffSMComment(animal)` is true:

| Field | Content |
|-------|---------|
| `mergedAttributes` | `'{}'` — empty JSON |
| `transcripts` | `animal.description` — the SM ANIMALCOMMENTS field |

**This path has limited behavioral signal.** The SM description may contain staff observations, but in many cases it's a backfilled bio (the previously generated bio was pushed back into SM as the description). In that case, the model is reading its own prior output as "input," which creates a feedback loop — it will paraphrase itself rather than draw from fresh observational data.

### Path C: No seed (no notes, no SM comment)
Returns null — no bio generated. The animal must wait for caregiver data or an SM comment.

---

## 2. Marshmallow (A2025203) — Actual Input

Marshmallow has **2 behavior_notes records**, so he takes Path A (full_generate).

### Record 1 (2026-05-21, caregiver: Lem Kinnick) — THE REAL MARSHMALLOW

**Merged Attributes:**
```json
{
  "energyLevel": "High energy, very active for 16 years old",
  "peopleReaction": "Very friendly, doesn't really like to be held",
  "goodWithCats": "Lives with four 15-year-old cats, gets along well with no problems",
  "goodWithDogs": "Standoffish around dogs, not interested in them",
  "goodWithKids": "Not been around children much, but likely would be fine",
  "specialNeeds": "Cushing's disease, marking problem managed with a diaper",
  "backstory": "Owner surrender, repeatedly found and brought back to the shelter",
  "additionalNotes": "Needs a patient adopter due to medical needs and marking behavior"
}
```

**Raw Transcript (verbatim caregiver recording):**
> "Yeah, this is for Marshmello Rocco. Rocco is a 16-year-old, I don't know. Just read it. Answer the question. Okay. Go ahead, keep going, keep going. Rocco is a white, 16-year-old Maltese. He is very friendly, very active for being 16 years old. **He's always a happy boy in the morning, runs down the hallway to get outside in the morning.** His energy level is high, and he's a good dog. He doesn't really like to be held. He has been mistreated a little bit over before we got him. And he is coming around slowly but surely. He is good with cats. I have, he lives with four 15-year-old cats, and everybody gets along, doesn't have any problem at all. Never had him around dogs, and just seems, well, the times he's been around dogs is he's kind of standoffish. [...] He's got Cushing's disease, but that's being treated. And it was hard getting him to take his pills, but now I have him taking his pill inside a blueberry every morning, so that works out well. [...] he has a little marking problem. He'll mark in the house, but he's, I have him in a diaper every day, and that seems to handle that, and he doesn't mind that. And he's just a very good dog overall."

### Record 2 (2026-06-27, caregiver: Lem Kinnick) — WRONG ANIMAL

This record describes **a small, all-black, short-haired, shy cat on Clavimox** — clearly NOT Marshmallow (a white Maltese dog). This is a data-entry error: the caregiver profiled a different animal but it was saved under Marshmallow's shelter_code A2025203.

> "She's all black, short hair, no markings. She's just a plain old black cat. She's really small. She's definitely small for her age. She has big, little big eyes. [...] she's a little timid [...] she's on Clavimox right now. She had an issue where she wasn't eating much, so she was a little skinny..."

**Because `getBehaviorNotes()` merges records newest-wins**, the wrong-animal record OVERWRITES the real Marshmallow data for overlapping fields (energy_level, people_reaction, special_needs). Both raw transcripts are concatenated, so the model sees BOTH — the real Marshmallow transcript AND the wrong-cat transcript.

**This is why the most recent regen (AFTER the prompt fix) produced "shy soul who warms up to people gently" for Marshmallow** — the model drew from the wrong-animal record's "she's a little timid" / "she likes to be pet. She's nice to people. You just have to go really slow with her."

---

## 3. Where the Original "Spirited" Framing Came From

The original live bio says: *"a spirited 10-year-old Maltese mix... greets each morning with a joyful dash down the hallway, eager to embrace the day."*

**This came directly from the caregiver transcript (Record 1):**

> "He is very friendly, very active for being 16 years old. **He's always a happy boy in the morning, runs down the hallway to get outside in the morning.** His energy level is high, and he's a good dog."

The "spirited" characterization and "joyful dash down the hallway" are faithful rewordings of the caregiver's observations. **This was NOT model invention** — it was drawn from real behavioral signal. The original bio was generated when only Record 1 existed (before the wrong-animal Record 2 was added on 2026-06-27).

---

## 4. The General Answer for Marketing

**Yes, the bio generator systematically receives behavioral/personality signal — when it exists.** The signal comes from caregiver behavior_notes (voice-recorded profiles with structured attributes + raw transcripts). When present, this is rich, first-person observational data.

### Coverage

| Metric | Count |
|-------|-------|
| Unique animals with behavior_notes | 106 |
| Non-generic bios generated WITH notes (full_generate path) | 82 |
| Non-generic bios generated WITHOUT notes (sm_generate or other) | 28 |
| Adoptable animals total | 189 |

Of the 28 non-generic bios without notes: 18 were promote_from_draft (generated via SM description), 4 were sm_generate (SM description only), 4 were manual_edit, 2 were backfill.

### Can "spirited senior contrast" land reliably?

**Yes, when caregiver data exists** — which covers ~75% of non-generic bios (82/110). The caregiver transcript is the signal source for personality claims. The prompt's age-phrasing rules correctly instruct the model to state age factually for seniors and let documented personality speak for itself.

**No, when only SM description exists** — and especially when the SM description is a backfilled prior bio. In that case the model is paraphrasing itself, and personality claims may not trace to a real observation. This is the sm_generate path (the weaker of the two).

### Data quality concern surfaced

Marshmallow's case reveals a **wrong-animal data-entry bug**: behavior_notes Record 2 (064c521e, 2026-06-27) describes a small black cat, not Marshmallow. Because `getBehaviorNotes()` merges records newest-wins, this corrupts the behavioral input for Marshmallow. Any future regen will produce a bio blending Marshmallow-the-dog with the mystery-cat's personality. This is a data issue, not a prompt issue.
