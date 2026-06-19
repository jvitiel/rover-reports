# Auditor Plumbing Reconnaissance — Phase-2 Bio Payload & Result Order

**Date:** 2026-06-19 08:05 ET  
**Type:** Read-only code diagnosis (no API calls, no endpoint runs)

---

## Q1 — What Does the Phase-2 Bio Path Receive Per Animal?

### Answer: Raw transcripts + structured base attributes, NOT the compact trait summary

[VERIFIED] Phase 2 builds its per-animal payload at `server.ts:4604-4643`. Each selected animal gets a **structured header** of base attributes followed by **raw caregiver transcripts** (up to 3 most recent) and the **SM description**, assembled as free text:

```typescript
// server.ts:4604-4606
const selectedAnimals = validSelectedCodes.map(c => withRecords.find(a => a.shelterCode === c)!).filter(Boolean);
const shortlistEntries: string[] = [];
for (const animal of selectedAnimals) {
  const lines: string[] = [];
  lines.push(`SHELTER_CODE: ${animal.shelterCode}`);
  lines.push(`Name: ${animal.name}`);
  lines.push(`Species: ${animal.species}`);
  lines.push(`Breed: ${animal.breed}`);
  lines.push(`Age: ${animal.age}`);
  lines.push(`Sex: ${animal.sex}`);
  lines.push(`Color: ${animal.color}`);
  // FIV/FeLV for cats only
```

Then transcripts:
```typescript
// server.ts:4622-4632
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

Then SM description:
```typescript
// server.ts:4633-4637
if (animal.description && animal.description.trim()) {
  lines.push('');
  lines.push('Shelter notes:');
  lines.push(animal.description.trim());
}
```

### Key findings for the Auditor design:

1. **Phase 2 does NOT receive the compact trait summary** (`buildTraitSummary` output). That is Phase-1-only (`customSearchSummary.ts` → `customSearchSelect.ts`). [VERIFIED] Phase 2 calls `getBehaviorRecords()` (raw transcripts) instead of `getBehaviorNotes()` (merged profile) or `buildTraitSummary()`.

2. **There is NO structured "has signal for X" flag per animal in the Phase-2 payload.** [VERIFIED] The bio prompt receives free text — raw caregiver transcripts plus SM description. The model must *infer* from the text whether documented signal exists for a given attribute. There is no machine-distinguishable field like `{has_fun_data: false}`.

3. **A BLANK animal vs a documented animal look different in *quantity* of text, but not in a structured way.** [VERIFIED] A blank animal (zero transcripts, stock/empty SM description) produces only the 7-8 line base-attribute header. A documented animal produces the same header plus transcript blocks. The difference is visible (more text), but there's no explicit flag like `"Documented — none."` — that label exists only in the Phase-1 trait summary, never in Phase-2.

4. **The user message combines all animals into one prompt**, at `server.ts:4643`:
```typescript
const userMessage = `FILTERS APPLIED:\nsex: ${sexLower.join(', ')}\nage: ${ageLower.join(', ')}\n\n${SPECIES_LABEL[speciesLower]} AVAILABLE (${selectedAnimals.length} total):\n\n${shortlistEntries.join('\n\n')}\n\nADOPTER:\n${narrativeText || 'No additional preferences provided.'}`;
```

5. **The Phase-2 system prompt does instruct the model to acknowledge attribute gaps** (e.g. "if the adopter asked for orange and the cat is grey, acknowledge it"). But this instruction is about *base-attribute mismatches* (color, age, breed), not about "this animal has no behavioral data for the trait you asked about." [VERIFIED] There is no instruction in the system prompt that says "if there is no documented signal for a requested behavioral attribute, state the absence." The current gap-acknowledgment rules address attribute mismatches, not data absence.

### Implication for the Auditor spec:

To reliably handle "weak animal = no documented signal for requested attribute," the Phase-2 prompt must be told which attributes each animal has/lacks documentation for. The current free-text-only path means the bio model would have to judge "does this animal have fun/playful data?" from raw transcript text — unreliable. Options:

- (a) Add a structured signal line per animal in the Phase-2 payload (e.g., appending the `buildTraitSummary` output as a machine-readable annotation alongside the raw transcripts).
- (b) Add explicit instructions to the Phase-2 system prompt teaching it to detect transcript absence as "no documented signal."
- (c) Pre-compute the "weak" flag in Phase-1 or a post-Phase-1 step and inject it into Phase-2's per-animal block.

---

## Q2 — Where Is Result Order Determined?

### Answer: Order is set by Phase-1 selection, preserved through Phase-2, but Phase-2 can reorder

**Phase 1 returns ranked order.** [VERIFIED] `customSearchSelect.ts:63-64` — the system prompt says:

```
1. ALWAYS return exactly 3 shelter_codes, ranked best-match first.
```

So Phase-1's `selectMatches()` returns `shelter_codes` in rank order (best first). [VERIFIED at `customSearchSelect.ts:63`]

**The endpoint preserves Phase-1 order into Phase-2's user message.** [VERIFIED] At `server.ts:4604`:
```typescript
const selectedAnimals = validSelectedCodes.map(c => withRecords.find(a => a.shelterCode === c)!).filter(Boolean);
```
`validSelectedCodes` is derived from `selectionResult.shelter_codes` (filtered for validity), preserving Phase-1's array order. The `shortlistEntries` loop iterates `selectedAnimals` in that same order. The user message to Phase-2 presents animals in Phase-1 rank order.

**However, Phase-2 returns its OWN order.** [VERIFIED] The Phase-2 system prompt says:

```
"matches": [
    {"shelter_code": "<code>", "bio": "<bio paragraph>"},
    ...
]
```

And the endpoint at `server.ts:5097-5114` builds the response directly from `parsed.matches` in the order Phase-2 returned them:

```typescript
const responseMatches = parsed.matches.map(m => {
  const animal = recordsMap.get(m.shelter_code) || ...;
  return { shelter_code: m.shelter_code, bio: m.bio, ... };
});
res.json({ matches: responseMatches, ... });
```

**There is no post-Phase-2 sort step.** [VERIFIED] No code between the JSON parse (`server.ts:5057`) and the response (`server.ts:5120`) reorders `parsed.matches`. The final response array order is whatever Phase-2 emits.

**The client renders in array order.** [INFERRED — would need to check client JS, but the response structure has no explicit `rank` field or sort key, so the client almost certainly renders `matches[0]`, `matches[1]`, `matches[2]` in order.]

### Where to insert "sort weak animals last":

**Natural insertion point: post-Phase-2, pre-response** (around `server.ts:5097`). [VERIFIED] This is where `parsed.matches` is mapped to `responseMatches`. A sort step here could reorder based on a "weak" flag computed earlier.

Alternatively:
- **Phase-1 could rank weak animals last** in its `shelter_codes` array (since it already has the trait summary and knows which animals have "Documented — none."). But Phase-2 can still reorder, so this alone isn't sufficient.
- **Phase-2 prompt could be instructed to maintain input order** — but this fights against the model's tendency to order by its own judgment of best-match.
- **Post-Phase-2 sort** is the most reliable because it's deterministic code, not model behavior.

### Complication:

Phase-2's system prompt currently tells it to pick the 3 best matches AND write bios. But the 3 animals are already selected by Phase-1 — Phase-2 is supposed to write bios for ALL 3, not re-select. The system prompt contains legacy language like "pick the three cats from the list" and "return your 3 best matches" even though the user message only contains the 3 pre-selected animals. This means Phase-2 could theoretically try to re-rank or even drop one if it disagrees with Phase-1's choice. [VERIFIED — the system prompt at `server.ts:4655` says "pick the three cats from the list that would be the best matches" even though there are only 3 in the list.]

---

## Summary

| Question | Answer | Confidence |
|----------|--------|------------|
| Phase-2 per-animal payload | Structured base attributes + raw transcripts + SM description (free text). NO compact trait summary. NO structured "has signal" flags. | [VERIFIED] |
| Blank vs documented distinction | Different text volume only — no structured marker in Phase-2. Phase-1's "Documented — none." label does NOT flow to Phase-2. | [VERIFIED] |
| Can Phase-2 reliably detect "no signal for requested attribute"? | Not currently — must infer from transcript text absence. Unreliable. | [VERIFIED] |
| Result order source | Phase-1 ranked → preserved into Phase-2 input → Phase-2 may reorder → no post-Phase-2 sort → client gets Phase-2's order | [VERIFIED] |
| Best insertion point for "weak last" sort | Post-Phase-2, pre-response (~server.ts:5097) as deterministic code | [VERIFIED] |
| Complication | Phase-2 system prompt has legacy "pick the three" language despite receiving exactly 3 pre-selected animals | [VERIFIED] |
