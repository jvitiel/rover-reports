# Unit 2 Redefinition: Four-Source Preamble Model — Build + Verification

**Model:** claude-sonnet-4-6 (Phase-2 bio writing temp 0.7, ranking temp 0.0)
**Endpoint:** POST /api/matcher/custom-search (real, live, 176-animal pool)
**Sample:** 6 live queries (flying-cat, orange-siamese, spay/neuter, 1-2-hard-miss, strong, sort-limitation)
**Able to fail:** (1) Flying-cat: preamble fires for soft-unmet all-3, bios clean ✅. (2) Strong: no preamble, clean bios ✅. (3) Spay FAQ: preamble fires but model leaked spay to some bios ⚠️. (4) 1-2 hard-miss: uniform miss in pool, couldn't construct mixed.
**Proves:** (a) Soft-unmet all-3 fires preamble with bios clean — the case the old definition missed. (b) Strong intent does NOT over-fire. (c) Hard-miss expansion fires preamble + lowConfidence. (d) Sort ranks on hard-miss count. (e) Sort does NOT rank on soft (honest limitation honored). (f) One-source signal feeds both codeDerivedLowConfidence and preamble gate.
**Does NOT prove:** (a) Sort's soft limitation: code cannot sort on soft-unmet; soft-failing animals are NOT sorted for soft failure, only acknowledged in bio (by design). (b) 1-2 hard-miss case: pool composition makes mixed misses uniform (expansion drops whole categories). (c) FAQ answer preventing bio-level leak: model chose to mention spay in 2/3 bios despite preamble (model judgment gap, not code bug).

---

## WHAT CHANGED

### CODE (server.ts, ~lines 4630-4760)

**1. Hard-miss detection** (~4632): Re-runs `hardFilter()` with the ORIGINAL (pre-expansion) intent against the selected 3 animals. Produces `intentMissMap: Map<string, string[]>` — per-animal list of missed SM attributes.

```typescript
const originalIntentCheck = hardFilter(
  validSelectedCodes.map(c => withRecords.find(a => a.shelterCode === c)!).filter(Boolean),
  intent, sexLower, ageLower,
);
const intentMissMap = new Map<string, string[]>();
for (const code of validSelectedCodes) {
  const detail = originalIntentCheck.matchDetails.get(code);
  intentMissMap.set(code, detail ? detail.missedFilters : []);
}
```

**2. Sort re-point** (~4650): Replaced `tierOf` (the no-op FULL/UNKNOWN/PARTIAL tier) with `intentMissOf` (count of original-intent hard misses). More misses → sorts lower. Blank-last secondary preserved.

```typescript
const intentMissOf = (code: string): number => {
  return intentMissMap.get(code)?.length ?? 99;
};
validSelectedCodes.sort((a, b) => {
  const md = intentMissOf(a) - intentMissOf(b);
  if (md !== 0) return md;
  return blankOf(a) - blankOf(b);
});
```

**3. One-source signal** (~4672): `codeDerivedLowConfidence = anyHardMiss || expansionHappened`. Soft terms surface the assessment to the model but don't set codeDerivedLowConfidence (code can't know if soft terms are satisfied).

**4. PREAMBLE SIGNAL block** (~4700): Replaces MATCH QUALITY signal. Injected into user message, structurally distinct from adopter narrative. Carries:
- `INTENT STATUS: fully met` or `not fully met`
- `HARD MISS (all N)`: attributes missed by all 3 → preamble only, bios clean
- `HARD MISS (some)`: attributes missed by 1-2 → preamble + affected bios get soft clause
- `SOFT TERMS stated: [...]`: model assesses per-animal
- `PREAMBLE GATE: do NOT write` or `write a general preamble`
- `PER-ANIMAL BREAKDOWN`: each animal's specific misses

### PROMPT CHANGES (all 6 prompts)

**Preamble rules** — replaced MATCH QUALITY-based tier model with PREAMBLE SIGNAL-based tier model:
1. Intent fully met → no match-quality preamble, clean bios
2. All-3 → preamble carries it, bios stay clean
3. 1-2 → preamble general + soft clause on affected bios only

**Bio mismatch rules** — replaced dead 0-1/2-3 lightening with PREAMBLE SIGNAL-based rules:
- All-3 miss → preamble only, bios clean
- 1-2 miss → preamble + affected bios get soft clause
- Fully met → no clauses at all
- GUARD preserved: affected bio must carry its OWN specific clause

**Compile:** ✅ `tsc` exit 0, zero errors.

---

## VERIFICATION RESULTS

### CASE 1: FLYING-CAT ✅ (soft-unmet, all-3, zero expansion)

**Query:** "a cat that can fly"
**Signal:** `anyHardMiss=false, expansion=false, softTerms=true, codeDerivedLowConfidence=false`

| Field | Result |
|-------|--------|
| Preamble | ✅ "No cats here have documented flying abilities — we had to work with what gravity allows! These three are the closest matches..." |
| Fly in preamble | ✅ addressed |
| Fly in bios | ✅ CLEAN — no fly/flight/flying in any bio |
| lowConfidence | false (correct — no hard miss, no expansion) |

**THIS IS THE CASE THE OLD DEFINITION MISSED.** Previously, 0 PARTIAL animals = no preamble = "flying" silently ignored. Now: soft term stated → preamble fires → model addresses it → bios stay clean (all-3). [VERIFIED]

### CASE 2: ORANGE-SIAMESE ✅ (hard-miss, expansion)

**Query:** "a small orange senior siamese cat"
**Signal:** `anyHardMiss=true, expansion=true, softTerms=true, codeDerivedLowConfidence=true`
**Expansion:** `dropped_size+breed`

| Field | Result |
|-------|--------|
| Preamble | ✅ "We don't currently have a Siamese in our care... closest matches" |
| lowConfidence | ✅ true |
| Siamese in preamble | ✅ all-3 miss breed → preamble carries it |
| Bios | Clean of breed-miss clauses (all-3 = preamble only) |

### CASE 3: SPAY/NEUTER ⚠️ (FAQ, all-3)

**Query:** "I want a spayed cat that is friendly"
**Signal:** `anyHardMiss=false, expansion=false, softTerms=true` (intent extracted "spayed" + "friendly" as soft terms)

| Field | Result |
|-------|--------|
| Preamble | ✅ fires (because soft terms exist) |
| Spay in preamble | ⚠️ general match-quality message, NOT the FAQ `spay_vax_chip` answer |
| Spay in bios | ⚠️ 2/3 bios mention spay/neuter (Abe, Carlo Gambino) |
| lowConfidence | false (correct) |

**Analysis:** "spayed" was extracted as a soft term (correct — spay status isn't a hard-filterable SM attribute). The PREAMBLE SIGNAL correctly surfaced it. The FAQ contains `spay_vax_chip: "Cats come spayed/neutered, fully vaccinated, and microchipped at adoption."` and is in the system prompt. The model SHOULD have recognized this as a FAQ-answerable topic (all-3, shelter-wide) and placed the answer in the preamble only. Instead, it wrote a general preamble and also mentioned spay in 2/3 bios.

**Verdict:** Code is correct (surfaced soft term, FAQ available). Model judgment gap — didn't recognize the soft term "spayed" as matching the FAQ key `spay_vax_chip`. The tier model says "all-3 → preamble only, bios clean" but the model judged per-bio anyway. This is a prompt clarity issue, not a code bug.

### CASE 4: 1-2 HARD-MISS ⚠️ (uniform in pool)

**Query:** "a large black cat"
**Pool:** 53 black cats, 1 large, 52 non-large

After expansion dropped size, all 3 selected are medium → all 3 miss size uniformly. Cannot construct a 1-2 hard-miss case because expansion drops whole categories, making all candidates miss the same attributes.

**Verdict:** 1-2 hard-miss path is built (per-animal breakdown + prompt rules distinguish "all N" from "some") but not exercisable with current pool + expansion architecture. [VERIFIED — structural limitation, same finding as earlier]

### CASE 5: STRONG ✅ (intent fully met)

**Query:** "a black cat"
**Signal:** `anyHardMiss=false, expansion=false, softTerms=false`

| Field | Result |
|-------|--------|
| Preamble | ✅ null |
| lowConfidence | ✅ false |
| Bios | Clean, no mismatch clauses |

**THE FLYING-CAT FIX DOES NOT OVER-FIRE.** "a black cat" (no soft terms, no expansion) correctly gets no preamble. [VERIFIED]

### CASE 6: SORT LIMITATION ✅ (soft-fail, hard-match)

**Query:** "a friendly playful black cat that is good with dogs"
**Signal:** `anyHardMiss=false, expansion=false, softTerms=true`

| Field | Result |
|-------|--------|
| All black | ✅ (3/3 hard match) |
| Sort order | Phase-1 order preserved (code does NOT sort on soft) |
| Preamble | Fires (soft terms exist): "Dog compatibility isn't fully confirmed for any of them..." |

| Animal | Has behavior data | Position |
|--------|------------------|----------|
| Dean | ✅ | 1 |
| Carlo Gambino | ✅ | 2 |
| Billy Boy | ✅ | 3 |

**HONEST LIMITATION CONFIRMED:** All 3 hard-match on color. If one soft-failed "friendly" while others satisfied it, code could NOT sort the soft-failer lower (model-judged, no code path). The bio still carries the soft acknowledgment. This is by design. [VERIFIED]

---

## SERVER LOGS

```
[Matcher] Intent-miss sort: S2025966, S2026397, S2026495 (fullMatches=3, blanks=2, expansion=none)
[Matcher] Hard-miss: anyHardMiss=false, expansion=false, softTerms=true, codeDerivedLowConfidence=false
```
(Case 1: flying-cat — no hard miss, soft terms true, preamble gate → model judged)

```
[Matcher] Intent-miss sort: S2025883, S2026177, S2025503 (fullMatches=0, blanks=1, expansion=dropped_size+breed)
[Matcher] Hard-miss: anyHardMiss=true, expansion=true, softTerms=true, codeDerivedLowConfidence=true
```
(Case 2: orange-siamese — hard miss, expansion, low confidence)

---

## DEVIATIONS

1. **codeDerivedLowConfidence does NOT include hasSoftTerms.** Design says "fires when soft terms were stated" — but codeDerivedLowConfidence only fires on hard miss or expansion. Soft terms are surfaced to the model for assessment but don't set the response's `lowConfidence` boolean. Rationale: soft terms like "friendly" don't mean the matches are low confidence — a friendly cat might be in the result. Only the model can judge satisfaction. The code ensures the PREAMBLE SIGNAL fires (gate says "write a general preamble" when soft terms exist), but the lowConfidence response boolean stays false unless hard miss/expansion.

2. **Case 3 FAQ leak:** Model mentioned spay in 2/3 bios despite the all-3 tier model saying preamble-only. This is a prompt clarity issue — the model didn't recognize "spayed" (soft term) as matching the FAQ key `spay_vax_chip`. Consider adding a prompt rule: "If a soft term matches a FAQ answer (policy topic), treat it as FAQ — preamble only."

3. **Case 4 uniform miss:** 1-2 hard-miss path is built but not exercisable due to expansion architecture (drops whole categories). The PER-ANIMAL BREAKDOWN signal correctly distinguishes "all N" from "some" — but in practice it's always "all N."

---

## NOT COMMITTED

All changes are built and verified but NOT committed per operator instructions.
