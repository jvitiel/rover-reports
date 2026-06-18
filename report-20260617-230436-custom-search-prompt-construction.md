# Custom-Search Prompt Construction — Verbatim Dump & Analysis — 2026-06-17

## TASK 1 — Full Prompt Construction (Verbatim)

### 1A. User Message Construction (server.ts:4480)

```ts
const userMessage = `FILTERS APPLIED:\nsex: ${sexLower.join(', ')}\nage: ${ageLower.join(', ')}\n\nCATS AVAILABLE (${withRecords.length} total):\n\n${shortlistEntries.join('\n\n')}\n\nADOPTER:\n${narrativeText || 'No additional preferences provided.'}`;
```

This produces a message structured as:
```
FILTERS APPLIED:
sex: <selected sexes>
age: <selected age groups>

CATS AVAILABLE (<N> total):

<shortlist entry 1>

<shortlist entry 2>

...

ADOPTER:
<narrative text or "No additional preferences provided.">
```

[VERIFIED]

### 1B. Shortlist Entry Assembly (server.ts:4448–4474)

Each animal's shortlist entry is built as follows:

```ts
// server.ts:4448-4474
const shortlistEntries: string[] = [];
for (const animal of withRecords) {
  const lines: string[] = [];
  lines.push(`SHELTER_CODE: ${animal.shelterCode}`);
  lines.push(`Name: ${animal.name}`);
  lines.push(`Species: Cat`);
  lines.push(`Breed: ${animal.breed}`);
  lines.push(`Age: ${animal.age}`);
  lines.push(`Sex: ${animal.sex}`);
  lines.push(`Color: ${animal.color}`);
  lines.push(`FIV: ${animal.fivStatus}`);
  lines.push(`FeLV: ${animal.felvStatus}`);

  // Get last 3 caregiver transcripts (most recent first)
  const records = getBehaviorRecords(animal.shelterCode);
  // getBehaviorRecords returns oldest-first (ASC); we want most-recent-first for display
  const recentRecords = [...records].reverse().slice(0, 3);
  if (recentRecords.length > 0) {
    lines.push('');
    lines.push('Caregiver transcripts (most recent first):');
    for (const rec of recentRecords) {
      const caregiver = rec.caregiver || 'Unknown';
      const date = (rec.recordedAt || '').slice(0, 10);
      lines.push(`--- ${caregiver}, ${date} ---`);
      lines.push(rec.rawTranscript || '(no transcript)');
    }
  }
  shortlistEntries.push(lines.join('\n'));
}
```

A resulting entry looks like (example):
```
SHELTER_CODE: SC-1234
Name: Luna
Species: Cat
Breed: Domestic Shorthair
Age: 2 years
Sex: Female
Color: Black
FIV: negative
FeLV: negative

Caregiver transcripts (most recent first):
--- Jane, 2026-06-10 ---
Luna is very friendly and loves to be held...
--- Mike, 2026-06-05 ---
Played with feather toy today, very active...
```

[VERIFIED]

### 1C. System Message — English (server.ts:4495–4561)

The complete EN system message, verbatim:

```
You are a professional animal shelter copywriter writing a bio for a specific cat that's being shown to a particular person who's considering adopting. Write one warm flowing paragraph of about 175–200 words.

This is a bio first. Describe this cat the way you would in any adoption listing: lead with personality, use active conversational language, be honest about any special needs while framing positively, and close with a warm invitation to come meet her. Voice: third person, friendly, descriptive. Like a friend telling someone about a wonderful pet they know — but the friend is not a character in the writing. No 'I,' no narrator persona, no 'what I'd love about her,' no 'there's a moment that keeps coming to mind.'

What makes this different from a generic bio: where the description naturally allows it, lean into one or two details that quietly align with what the reader has said about themselves. Don't announce the alignment. Don't try to address every point the reader mentioned. Don't write a checklist of fit. Let the bio describe the cat in a way that lands naturally — picking the most resonant connection, not all of them. If the reader mentioned medical experience, the medical details can be present but not catastrophized. If they mentioned being home a lot, the cat's preference for quiet companionship can sit naturally in the description.

Goal: invite a meeting. The reader should finish reading and want to call the rescue to set up a visit. The goal is connection, not exhaustive accuracy or thorough match justification.

Don't invent facts not present in the input.

Even when the adopter's narrative is brief or vague, return your 3 best matches based on the hard filters and whatever signal you can extract. Don't refuse to respond. If the narrative is just a color or single word, treat it as a soft preference and combine with what makes a generally good match.

Also include a "low_confidence" boolean in your JSON response. Set it to true ONLY if 0 or 1 of your 3 returned cats substantively matches the adopter's core specific request. Partial mismatches across all three (where each cat misses one or two specific things but is still a reasonable candidate) should set low_confidence to false — the bio-level acknowledgment handles that case. Set low_confidence to true when the inventory genuinely doesn't have what they asked for: e.g., they wanted a specific breed and none of your matches are that breed, or they wanted a kitten and none are under 1 year old, or they specified multiple specific attributes and none of your picks address most of them.

When unsure, lean false — the bio-level acknowledgment is the primary tool for honesty, the preamble is reserved for true inventory mismatches.

If the adopter's narrative mentions any specific attribute (color, age including "kitten," breed, declawed status, distinctive features, household-fit factors like kids/dogs/cats/other pets, lifestyle preferences) and a returned cat doesn't match that attribute, acknowledge the gap briefly in that cat's bio while anchoring what the cat IS. Don't fabricate a match. Don't omit when the adopter raised it. Don't shift to clinical or testing language. Keep this light — one sentence per miss at most, woven naturally.

For example:
- Adopter asked for orange, cat is grey: "Puccini's coat is a soft grey rather than the orange you mentioned, but his easy-going temperament and kitten-like playfulness might still be exactly what you're looking for."
- Adopter asked for kitten (under 6 months), cat is young (2+ years): "At 2 years old, Dean is past the kitten phase but still has plenty of playful energy and many years of companionship ahead."
- Adopter asked for declawed, no information in profile: "Macy has all his claws. If a declawed cat is essential for your situation, shelter staff can discuss options when you call."
- Adopter asked for bonded pair, this cat is solo: "Emma is happy as the only cat in your home, ready to be your sole feline companion."
- Adopter asked about health, no health notes in profile: "Our search records don't note any health concerns for Macy — please confirm with shelter staff when you visit for the most complete picture."

Two rules for attributes not mentioned in a candidate's profile:

ASSERT when the attribute has a reliable shelter default. Declawing: the default for shelter cats is claws intact — say so directly ("Macy has all his claws"). Breed: domestic shorthair or longhair unless the profile says otherwise. Don't hedge these.

Spay/neuter status, vaccination status, and microchip status are POLICY topics, not per-cat health attributes. They have universal answers across all cats and are handled in the preamble (see SHELTER POLICIES section). Do not add per-bio disclaimers for these — the preamble covers them.

DEFER when the attribute has no reliable default AND is cat-specific. This means individual medical history (chronic conditions like asthma, FIV, diabetes), behavioral incidents, or special needs where each cat may differ. Frame the gap as a search-records limitation: say "our search records don't note any health concerns" rather than "we don't know." The shelter has fuller records than the search system — direct the adopter there for confirmation. If a cat's profile mentions a health condition, surface it honestly in the bio.

This applies to specific attributes the adopter named. Don't add unsolicited disclaimers about attributes the adopter didn't mention. If the adopter asked only about spay/vaccinations/microchip (policy topics), do NOT add per-cat health DEFER lines — the preamble already answered those.

You will receive information about multiple cats and a description of one prospective adopter. Your job is to pick the three cats from the list that would be the best matches for this adopter, and write the bio described above for each of those three.

SHELTER POLICIES

When the adopter's narrative contains questions about shelter policies or logistics, address them in a "preamble" field in your JSON response. The preamble is a brief conversational paragraph (2-3 sentences max) that answers their questions before they see the cat bios.

Rules:
- Only address topics the adopter explicitly raised. Never pre-emptively add policy information they didn't ask about.
- Use the exact policy text below for substance. You may paraphrase framing and transitions ("Great news —", "To answer your questions:") but preserve the policy answer word-for-word.
- When multiple topics are raised, weave them into a flowing paragraph rather than a bullet list.
- Include the phone number (845) 414-9700 at most once, even if multiple answers reference it.
- When your matches don't closely match what the adopter asked for (low_confidence is true), fold a match-quality note into the same preamble paragraph: mention that these are the closest animals available and invite them to call for alternatives.
- If the adopter raised no policy questions and your matches are strong, omit the preamble field or set it to null.

Policy answers (use these verbatim for substance):
${policyBlock}

Return your response as a JSON object with this exact structure:
{
  "low_confidence": false,
  "preamble": null,
  "matches": [
    {"shelter_code": "<code>", "bio": "<bio paragraph>"},
    {"shelter_code": "<code>", "bio": "<bio paragraph>"},
    {"shelter_code": "<code>", "bio": "<bio paragraph>"}
  ]
}

The preamble field is a string or null. When present, it should be 2-3 sentences maximum.

The shelter_code values must exactly match codes from the cats provided to you. Do not invent shelter_codes. If fewer than three cats are provided, return matches for all of them — do not pad with invented entries. Return only the JSON object, no other text.
```

Note: `${policyBlock}` is dynamically loaded from `config/shelter-policy-faq.json` (or `shelter-policy-faq-es.json` for ES) at server.ts:4484–4491. [VERIFIED]

### 1D. System Message — Spanish (server.ts:4562–4628)

The ES system message is a full Spanish translation of the EN message — identical structure, instructions, and examples. Same `${policyBlock}` injection point. Not re-quoted here as the structure is identical; only the language differs. [VERIFIED]

### 1E. API Call Assembly (server.ts:4629–4641)

```ts
// server.ts:4629
const systemMessage = lang === 'es' ? systemMessageEs : systemMessageEn;

// server.ts:4631-4641
const apiBody = JSON.stringify({
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  temperature: 0.7,
  system: systemMessage,
  messages: [{ role: 'user', content: userMessage }],
});
```

[VERIFIED]

---

## TASK 2 — Honesty/Anti-Fabrication Instructions

### (a) Do not fabricate traits an animal does not have

**PRESENT.** Two explicit instructions:

1. **server.ts:4501 (line within systemMessageEn):**
   > `Don't invent facts not present in the input.`

2. **server.ts:4511 (mismatch-acknowledgment block):**
   > `Don't fabricate a match. Don't omit when the adopter raised it.`

[VERIFIED]

### (b) Be frank about what matches vs. what is missing per animal

**PRESENT.** Extensive instructions with examples:

**server.ts:4509–4521:**
> `If the adopter's narrative mentions any specific attribute (color, age including "kitten," breed, declawed status, distinctive features, household-fit factors like kids/dogs/cats/other pets, lifestyle preferences) and a returned cat doesn't match that attribute, acknowledge the gap briefly in that cat's bio while anchoring what the cat IS.`

Followed by 5 concrete examples showing gap acknowledgment (orange→grey, kitten→adult, declawed, bonded pair, health), plus the ASSERT/DEFER framework for attributes not in profile. [VERIFIED]

### (c) Always return the best available N matches even on a poor query

**PRESENT.**

**server.ts:4502:**
> `Even when the adopter's narrative is brief or vague, return your 3 best matches based on the hard filters and whatever signal you can extract. Don't refuse to respond. If the narrative is just a color or single word, treat it as a soft preference and combine with what makes a generally good match.`

[VERIFIED]

### (d) State inventory shortcomings / produce a preamble when nothing truly matches

**PRESENT.** Two mechanisms:

1. **`low_confidence` boolean (server.ts:4503–4507):**
   > `Set it to true ONLY if 0 or 1 of your 3 returned cats substantively matches the adopter's core specific request.`

2. **Preamble integration (server.ts:4540):**
   > `When your matches don't closely match what the adopter asked for (low_confidence is true), fold a match-quality note into the same preamble paragraph: mention that these are the closest animals available and invite them to call for alternatives.`

[VERIFIED]

---

## TASK 3 — Base Data Conditionality & Additive Text Injection Points

### 3A. Base structured attributes are UNCONDITIONAL

**Confirmed.** The base attributes are assembled for every animal in the shortlist loop, BEFORE and INDEPENDENT of the transcript check:

**server.ts:4449–4457:**
```ts
const lines: string[] = [];
lines.push(`SHELTER_CODE: ${animal.shelterCode}`);
lines.push(`Name: ${animal.name}`);
lines.push(`Species: Cat`);
lines.push(`Breed: ${animal.breed}`);
lines.push(`Age: ${animal.age}`);
lines.push(`Sex: ${animal.sex}`);
lines.push(`Color: ${animal.color}`);
lines.push(`FIV: ${animal.fivStatus}`);
lines.push(`FeLV: ${animal.felvStatus}`);
```

These 9 lines are pushed unconditionally for every animal in `withRecords`. The transcript block that follows is gated by `if (recentRecords.length > 0)` — it's additive. If the candidacy gate at server.ts:4423 were opened to include animals without `behavior_notes`, these base attributes would still be assembled for them. [VERIFIED]

**Opening the gate would automatically carry base data for newly-included no-transcript animals.** The structured attributes come from `fetchAnimals()` (shelterManagerService.ts), which returns them for all SM animals regardless of local DB state. [VERIFIED]

### 3B. Narrative injection point — current (behavior_notes transcripts)

**Location: server.ts:4459–4472**

```ts
// Get last 3 caregiver transcripts (most recent first)
const records = getBehaviorRecords(animal.shelterCode);
const recentRecords = [...records].reverse().slice(0, 3);
if (recentRecords.length > 0) {
  lines.push('');
  lines.push('Caregiver transcripts (most recent first):');
  for (const rec of recentRecords) {
    const caregiver = rec.caregiver || 'Unknown';
    const date = (rec.recordedAt || '').slice(0, 10);
    lines.push(`--- ${caregiver}, ${date} ---`);
    lines.push(rec.rawTranscript || '(no transcript)');
  }
}
```

This is the ONLY narrative block appended today. It fires conditionally (`if (recentRecords.length > 0)`) and appends AFTER the 9 base attribute lines. For an animal with no behavior_notes, this block would produce nothing — the entry would consist of only the base attributes. [VERIFIED]

### 3C. Where SM description text would be inserted

**Insertion point: server.ts:4472 (after the transcript block, before `shortlistEntries.push`)**

The SM description is already available on the animal object as `animal.description` — this is mapped from `raw.ANIMALCOMMENTS` at shelterManagerService.ts:62:
```ts
description: raw.ANIMALCOMMENTS || '',
```

Every animal from `fetchAnimals()` carries this field. No additional helper function needed — it's a property on the `animal` object already in scope at the shortlist builder loop. [VERIFIED]

**Proposed additive injection pattern (after line 4472):**
```ts
// After the transcript block, add SM description if present
if (animal.description && animal.description.trim()) {
  lines.push('');
  lines.push('Shelter Manager notes:');
  lines.push(animal.description.trim());
}
```

This would layer the SM description ON TOP of the always-present base attributes, and alongside any transcripts if both exist. For animals with transcripts, the SM description becomes supplementary context. For animals without transcripts, it becomes the sole narrative. [VERIFIED — animal.description is in scope at this location]

### 3D. Where approved bio text would be inserted

**Insertion point: same location, server.ts:4472**

The approved bio can be fetched via `getAnimalBio(animal.shelterCode)` (localDatabase.ts:1476), which returns an `AnimalBio` object with `bioEnLong`, `bioEsLong`, `statusLong`, etc. This function is already imported and used later in the same endpoint (server.ts:4780). [VERIFIED]

**Proposed additive injection pattern (after SM description):**
```ts
// Add approved bio text if available
const existingBio = getAnimalBio(animal.shelterCode);
if (existingBio && existingBio.statusLong === 'approved' && existingBio.bioEnLong) {
  lines.push('');
  lines.push('Approved adoption bio:');
  lines.push(existingBio.bioEnLong);
}
```

This would provide the AI with richer personality context for animals that have approved bios — whether those bios originated from caregiver profiles (`from_profile`), SM-seeded generation (`from_sm`), or generic generation (`youth_generic`, `adult_generic`). The `statusLong === 'approved'` guard ensures only human-reviewed content feeds the prompt. [VERIFIED]

**Note on drafts:** `getAnimalBioDraft()` (localDatabase.ts:1691) exists but drafts are excluded by design per the task specification. Only approved bios should feed the prompt. [VERIFIED]

### 3E. Additive layering summary

For an animal with ALL sources available, the prompt entry would stack:

```
SHELTER_CODE: SC-1234        ← Base attributes (unconditional, ~100% populated)
Name: Luna
Species: Cat
Breed: Domestic Shorthair
Age: 2 years
Sex: Female
Color: Black
FIV: negative
FeLV: negative

Caregiver transcripts:        ← behavior_notes (conditional, richest source)
--- Jane, 2026-06-10 ---
Luna is very friendly...

Shelter Manager notes:         ← SM ANIMALCOMMENTS (conditional, ~22% populated)
Sweet girl who loves laps.

Approved adoption bio:         ← animal_bios approved (conditional)
Luna is a gentle two-year-old...
```

For an animal with NO transcripts and NO SM description and NO approved bio, the entry would be base attributes only:

```
SHELTER_CODE: SC-5678
Name: Mochi
Species: Cat
Breed: Domestic Shorthair
Age: 4 months
Sex: Male
Color: Orange tabby
FIV: untested
FeLV: unknown
```

The AI would still have species, breed, age, sex, color, and FIV/FeLV to work with — enough to write a basic personality-agnostic bio. The system prompt already instructs "return your 3 best matches based on the hard filters and whatever signal you can extract" even for sparse input. [VERIFIED]

### 3F. Helper functions summary

| Function | Module | Returns | Used for |
|----------|--------|---------|----------|
| `animal.description` | Property on Animal from shelterManagerService.ts:62 | SM ANIMALCOMMENTS string | SM description text |
| `getAnimalBio(shelterCode)` | localDatabase.ts:1476 | AnimalBio or null from `animal_bios` table | Approved bio text |
| `getBehaviorRecords(shelterCode)` | localDatabase.ts:959 | BehaviorNotes[] from `behavior_notes` table | Caregiver transcripts |
| `getBehaviorNotesCount(shelterCode)` | localDatabase.ts:1224 | number from `behavior_notes` table | Candidacy gate (current) |
| `getAnimalBioDraft(shelterCode)` | localDatabase.ts:1691 | AnimalBioDraft or null from `animal_bio_drafts` | **Excluded by design** |

[VERIFIED]
