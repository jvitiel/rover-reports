# Custom-Search / Searcher Mechanics Map

**Date:** 2026-06-14 12:37 ET  
**Type:** Read-only mechanics capture for later implementation  
**Status:** No changes made  

---

## PART 1 — AGE FILTER BOUNDARIES

### 1a. Age bucket function

`deriveAgeGroup()` at server.ts:4101–4107:

```typescript
function deriveAgeGroup(ageInYears: number): string {
  // Three buckets aligned to website (Phase 18a, 2026-04-30):
  // Young: under 2 years, Adult: 2-6 years, Senior: 7+ years
  if (ageInYears < 2) return 'young';
  if (ageInYears < 7) return 'adult';
  return 'senior';
}
```

| Button | Bucket | Boundary |
|--------|--------|----------|
| Young | `young` | age < 2 years (< 730 days) |
| Adult | `adult` | 2 ≤ age < 7 years |
| Senior | `senior` | age ≥ 7 years |

Applied at server.ts:4294: `const bucket = deriveAgeGroup(a.ageInYears);` inside the hard-filter loop.

**Compared to generic/youth 84-day line:** Completely different cutoff. Our generic youth threshold is ≤ 84 days (~12 weeks). The searcher's "Young" bucket covers up to **2 years** (730 days) — nearly 9× wider. An animal at 6 months, 1 year, or 18 months is "Young" in the searcher but well past the 84-day youth/generic line. [VERIFIED]

### 1b. What a "Young" search actually returns

A "Young" search returns all adoptable cats with `ageInYears < 2` — any cat under 2 years old. This includes animals at 90 days, 6 months, 1 year, 18 months, etc. It could easily include animals well over 84 days (and typically will, since animals ≤ 84 days are rare — our last count found zero). [VERIFIED]

---

## PART 2 — CALL ARCHITECTURE / WHERE LATENCY LIVES

### 2c. Number of model calls

**Exactly ONE Sonnet call per search.** [VERIFIED]

The single call at server.ts:4540–4547:

```typescript
const apiBody = JSON.stringify({
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  temperature: 0.7,
  system: systemMessage,
  messages: [{ role: 'user', content: userMessage }],
});

const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': secrets.anthropic.apiKey,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  },
  body: apiBody,
});
```

**Selection AND bio-writing are folded into the SAME single call.** The system prompt instructs Sonnet to "pick the three cats from the list that would be the best matches" AND "write the bio described above for each of those three." There is no separate ranking call — selection/ranking and bio generation happen in one pass. [VERIFIED]

### 2d. Shortlist size sent to the model

**The entire `withRecords` array is sent — NO cap.** [VERIFIED]

The shortlist is built at server.ts:4336: `for (const animal of withRecords)` — it iterates ALL animals that survived the candidacy gate, with no cap or truncation. The user message at line 4366 sends all of them:

```typescript
const userMessage = `FILTERS APPLIED:\nsex: ${sexLower.join(', ')}\nage: ${ageLower.join(', ')}\n\nCATS AVAILABLE (${withRecords.length} total):\n\n${shortlistEntries.join('\n\n')}\n\nADOPTER:\n${narrativeText || 'No additional preferences provided.'}`;
```

The `audit.candidateCount` field records how many were sent; this is the full `withRecords.length` (line 4330).

**Implication:** Broadening the candidacy gate (adding SM-comment and generic animals) would directly increase the number of animals Sonnet evaluates, which increases input tokens and latency. [VERIFIED]

### 2e. Where latency accrues

Tracing the sequential steps in the handler:

| Step | Code lines | Sequential? | Estimated cost |
|------|-----------|-------------|----------------|
| 1. Input validation + content filter | 4236–4283 | Yes | Negligible |
| 2. `fetchAnimals()` — SM API call | 4288 | Yes | ~1–3s (external API) [INFERRED] |
| 3. Hard-filter + candidacy gate | 4291–4330 | Yes | Negligible (in-memory) |
| 4. `enrichWithLocalPhotos()` | 4332 | Yes | Negligible (DB reads) |
| 5. Build shortlist strings + `getBehaviorRecords()` per animal | 4336–4365 | Yes, N × DB query | Small (~ms per animal) |
| 6. Load policy FAQ from disk | 4371–4378 | Yes | Negligible |
| 7. **Claude Sonnet API call** | 4540–4547 | **Yes — single await** | **~10–20s** |
| 8. Parse JSON response | 4570–4617 | Yes | Negligible |
| 9. Build response with photo/video enrichment | 4640–4700 | Yes | Small (DB queries) |

**Single biggest contributor: Step 7 — the Sonnet API call.** This is the dominant latency source. The system prompt is very large (~2500+ words EN, similar ES), plus the per-animal shortlist (each animal contributes ~10 structured-field lines + up to 3 full caregiver transcripts). With ~30+ candidates and multi-paragraph transcripts, the input token count is substantial.

The `audit.inputTokens` field captures this per-request. There are no parallel calls — everything is strictly sequential, and the Sonnet call is the single blocking await. [VERIFIED]

### 2f. Return cap and bio scope

**Final return capped at 3 — by the system prompt, not code.** The system prompt instructs: "pick the three cats... and write the bio described above for each of those three." The response JSON format specifies exactly 3 match entries. [VERIFIED]

Post-response validation at server.ts:4600–4617 validates `parsed.matches` entries but does NOT enforce a count of exactly 3 — it validates each entry's `shelter_code` and `bio` types. The prompt says "If fewer than three cats are provided, return matches for all of them — do not pad."

**Bios are written for only the 3 winners.** Sonnet selects 3 from the shortlist and writes bios only for those 3. The remaining animals receive no bio text — they appear only in `audit.rejectedCodes` (server.ts:4627). [VERIFIED]

---

## PART 3 — FIELDS SONNET RECEIVES

### 3g. Exact per-animal shortlist payload

Built at server.ts:4336–4363:

```typescript
lines.push(`SHELTER_CODE: ${animal.shelterCode}`);
lines.push(`Name: ${animal.name}`);
lines.push(`Species: Cat`);                    // hardcoded "Cat"
lines.push(`Breed: ${animal.breed}`);
lines.push(`Age: ${animal.age}`);
lines.push(`Sex: ${animal.sex}`);
lines.push(`Color: ${animal.color}`);
lines.push(`FIV: ${animal.fivStatus}`);
lines.push(`FeLV: ${animal.felvStatus}`);
// Then: last 3 caregiver transcripts via getBehaviorRecords()
```

**Complete field list sent to Sonnet per animal:**

| # | Field | From | Present? |
|---|-------|------|----------|
| 1 | `SHELTER_CODE` | `animal.shelterCode` | ✅ Always |
| 2 | `Name` | `animal.name` | ✅ Always |
| 3 | `Species` | Hardcoded `"Cat"` | ✅ Always (searcher is cats-only) |
| 4 | `Breed` | `animal.breed` (SM `BREEDNAME`) | ✅ Always (100% populated) |
| 5 | `Age` | `animal.age` (SM `ANIMALAGE`, text) | ✅ Always (100% populated) |
| 6 | `Sex` | `animal.sex` (SM `SEXNAME`) | ✅ Always (100% populated) |
| 7 | `Color` | `animal.color` (SM `BASECOLOURNAME`) | ✅ Always (100% populated) |
| 8 | `FIV` | `animal.fivStatus` (derived) | ✅ Always |
| 9 | `FeLV` | `animal.felvStatus` (derived) | ✅ Always |
| 10 | Caregiver transcripts (up to 3) | `getBehaviorRecords()` → `behavior_notes` table | ✅ Always (gate ensures ≥1) |

**NOT included in the payload:**

| Field | Available on `animal` obj? | Sent to Sonnet? |
|-------|--------------------------|----------------|
| Size | ✅ `animal.size` | ❌ Not sent |
| Date of birth | ✅ `animal.dateOfBirth` | ❌ Not sent |
| Location | ✅ `animal.location` | ❌ Not sent |
| Intake date | ✅ `animal.dateIntake` | ❌ Not sent |
| SM ANIMALCOMMENTS | ✅ `animal.description` | ❌ Not sent |
| Weight | ❌ Not in `normalizeAnimal` | ❌ |
| Spay/neuter | ❌ Not in `normalizeAnimal` | ❌ |
| Additional flags | ✅ `animal.additionalFlags` | ❌ Not sent |

[ALL VERIFIED]

### 3h. What's missing for thin-content animals

If we want Sonnet to rank with SM base data AND write factual query-aware lines for thin-content animals (those with SM ANIMALCOMMENTS but no caregiver transcripts):

**Already available on the `animal` object (just needs adding to the shortlist builder):**
- `animal.size` — physical size
- `animal.description` — SM ANIMALCOMMENTS (the SM bio text)
- `animal.location` — shelter location
- `animal.dateIntake` — intake date (time at shelter)
- `animal.additionalFlags` — flags like "On Meds", "Bite History"

**Would need adding to `normalizeAnimal()`:**
- `NEUTERED` / `NEUTEREDNAME` — spay/neuter status (available in raw SM)
- `COATTYPENAME` — coat type (available in raw SM)

**Not reliably populated (skip):**
- Weight (0% populated in SM)

For thin-content animals, the SM ANIMALCOMMENTS field (`animal.description`) would serve as the narrative input where caregiver transcripts would normally go. Sonnet already receives structured fields; the only critical addition is `animal.description` as an alternative content source when transcripts are absent. [VERIFIED]

---

## PART 4 — CANDIDACY GATE (confirmed)

### 4i. Exact gate location and filter ordering

The filter pipeline at server.ts:4288–4330:

```
Step 1 (L4288): fetchAnimals()           → all adoptable animals (all species)
Step 2 (L4289): .filter(cat)             → cats only
Step 3 (L4291): .filter(sex + age)       → hard-filtered by user selection
Step 4 (L4300): .filter(getBehaviorNotesCount > 0)  ← THE CANDIDACY GATE
```

**The pre-filters (species, sex, age) run BEFORE the candidacy gate.** [VERIFIED]

Exact gate line — server.ts:4300:

```typescript
let withRecords = filtered.filter(a => getBehaviorNotesCount(a.shelterCode) > 0);
```

**Pool sizes at each step (estimated from current data):**
- After Step 1: ~152 adoptable animals
- After Step 2: ~93 cats
- After Step 3: varies by filter selection (~30–60 typical)
- After Step 4: only those with behavior_notes (~30–50 typical, drops any cat without caregiver data)

**Fallback gate** at server.ts:4305–4312 (triggers when `withRecords.length < 3`):

```typescript
if (withRecords.length < 3) {
  const sameSexAllAges = cats.filter(a => {
    const animalSex = (a.sex || '').toLowerCase();
    return sexLower.includes(animalSex);
  });
  const fallbackWithRecords = sameSexAllAges.filter(a => getBehaviorNotesCount(a.shelterCode) > 0);
  // ...
}
```

The fallback drops the age filter but **keeps the behavior-records requirement**. It never relaxes the caregiver-data gate.

**Where broadening would go:** Line 4300 is the exact insertion point. To include SM-comment and generic animals, you'd change:

```typescript
// Current (L4300):
let withRecords = filtered.filter(a => getBehaviorNotesCount(a.shelterCode) > 0);

// Broadened (conceptual — NOT implementing):
let withRecords = filtered.filter(a => 
  getBehaviorNotesCount(a.shelterCode) > 0 || hasRealStaffContent(a)
);
```

And the same change at the fallback gate at line 4309. The shortlist builder (L4336–4363) would also need a conditional branch: if `getBehaviorRecords()` returns empty, use `animal.description` (SM ANIMALCOMMENTS) as the content source instead of caregiver transcripts. [VERIFIED]

---

## Summary

| Question | Answer |
|----------|--------|
| Age buckets | Young < 2yr, Adult 2–7yr, Senior 7+yr — NOT aligned to 84-day generic cutoff |
| Model calls per search | Exactly 1 (Sonnet 4.6) — selection + bio writing in same call |
| Shortlist cap | None — ALL candidates with records are sent to Sonnet |
| Return cap | 3 (enforced by prompt, not code) — bios only for 3 winners |
| Latency bottleneck | The single Sonnet API call (~10–20s), amplified by large input (system prompt + N candidate profiles) |
| SM ANIMALCOMMENTS sent to Sonnet? | ❌ No |
| Candidacy gate location | server.ts:4300 — runs AFTER species/sex/age filters |
| Broadening candidacy increases Sonnet input? | ✅ Yes — more candidates = more tokens = potentially more latency |

---

*Report generated by Rover. Read-only map — no changes made.*
