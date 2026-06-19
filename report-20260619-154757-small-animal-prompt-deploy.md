# Small-Animal Species: Prompt + Breed-Echo Suppression + Router + Enable

**Date:** 2026-06-19 15:47 ET  
**Commit:** `9518396`  
**Diff stat:** 1 file changed, 190 insertions(+), 4 deletions(-)  
**Status:** DEPLOYED (backend enabled, UI still gated) [VERIFIED]

---

## What Was Done

### Part 1: systemMessageSmallEn / systemMessageSmallEs created

Built by copying verified blocks from cat prompts (not retyped), then swapping in small-specific sections:

**Copied verbatim from cat prompts:**
- Block 3 (anti-laundering + age-clause) — 3rd copy, matches cat and dog ✓
- Block 1 (whitelist + hedge-ban + variation instruction + senior-warmth) — with small-specific examples ✓
- Block 2 (soft-assert guard) ✓
- Output format / JSON / low_confidence / preamble / tone sections — with species-noun swaps ✓

**Small-specific swaps (all approved text from prompt):**
- Species handling (rabbit/guinea pig/chinchilla/ferret enumeration, species-per-record, no "small animal" as noun)
- Breed rule (state only if record specifies; no "mixed breed" default)
- Compatibility rule (always defer to staff, even when documented — takes precedence)
- Medical rule (no FIV/FeLV, assume good health, surface documented conditions)
- FAQ placeholder (marked `[PLACEHOLDER — UNCONFIRMED — BLOCKS UI LAUNCH]`)
- Senior-warmth species addition (age numbers differ by species)
- Block 1 examples replaced: Sky → Clover (rabbit), Baki → Nibbles (guinea pig)

### Part 2: Breed-echo suppression

```typescript
// Breed-echo suppression: for small animals, SM records species as breed
// when no real breed exists (e.g. "Chinchilla" for a chinchilla). Suppress
// the breed field when it echoes the species to avoid "Chinchilla Chinchilla."
const breedVal = (animal.breed || '').trim();
const speciesVal = (animal.species || '').trim();
if (breedVal && breedVal.toLowerCase() !== speciesVal.toLowerCase()) {
  lines.push(`Breed: ${breedVal}`);
}
```

Inserted at line 4624, replacing the original `lines.push(\`Breed: ${animal.breed}\`);`. Applies to ALL species (the suppression is harmless for cats/dogs since no cat/dog has breed === species).

**Breed payload verification:**

| Animal | Species | Breed Field | Suppressed? | Payload |
|--------|---------|------------|-------------|---------|
| Fluffy (S2026403) | Chinchilla | Chinchilla | **YES** [VERIFIED] | No breed line |
| Kirby (S2025877) | Ferret | Ferret | **YES** [VERIFIED] | No breed line |
| Tater Tot (G2026002) | Guinea Pig | Guinea Pig | **YES** [VERIFIED] | No breed line |
| Charlie (R2023007) | Rabbit | Hotot | **NO** [VERIFIED] | `Breed: Hotot` |

### Part 3: Router wire + enable

**Router** (line 5265):
```typescript
} else if (speciesLower === 'small_animal') {
  systemMessage = lang === 'es' ? systemMessageSmallEs : systemMessageSmallEn;
}
```

**ENABLED_SPECIES** (line 4352): `['cat', 'dog', 'small_animal']`

**SPECIES_FILTER** (line 4356): `small_animal: ['Rabbit', 'Guinea Pig', 'Chinchilla', 'Ferret']` — explicit enumeration, not a catch-all. [VERIFIED]

**FAQ loader** (line 4673): `speciesLower === 'small_animal' ? '-small' : ''` — will look for `shelter-policy-faq-small.json` (doesn't exist yet; FAQ placeholder in prompt covers this).

**UI radio** (custom-search/index.html:36): `<input type="radio" name="species" value="small_animal" disabled>` — still disabled with `pill-disabled` class. [VERIFIED — UNTOUCHED]

---

## Placement Verification

### EN prompt — small-specific section among inherited blocks

```
[Opening: "You are a professional animal shelter copywriter...small animal"]
[Species handling: "This prompt serves rabbits, guinea pigs..."]  ← SMALL-SPECIFIC
[Breed rule: "State the breed only if..."]                        ← SMALL-SPECIFIC
[Medical: "Assume good health...No FIV/FeLV"]                    ← SMALL-SPECIFIC
[Block 3: "Personality and temperament claims..."]                ← COPIED from cat EN
[Age-clause: "Age is the trap case..."]                          ← COPIED from cat EN
[Even-when + low_confidence + preamble]                          ← ADAPTED (cat→animal nouns)
[FAQ PLACEHOLDER: "[PLACEHOLDER — UNCONFIRMED...]"]              ← SMALL-SPECIFIC
[Block 1: "HANDLING AN ANIMAL WITH NO DOCUMENTED..."]            ← COPIED from cat EN
  [Examples: Clover rabbit, Nibbles guinea pig]                  ← SMALL-SPECIFIC
  [Senior-warmth: "This provision does NOT relax..."]            ← COPIED from cat EN
  [Senior-warmth species addition: "For a senior small..."]      ← SMALL-SPECIFIC
[Block 2: "DO NOT IMPLY A REQUESTED ATTRIBUTE..."]               ← COPIED from cat EN
[Compatibility: "When the adopter asks..."]                      ← SMALL-SPECIFIC
[Two-rules + output format]                                      ← ADAPTED (cat→animal nouns)
```

**Reading order: Block 3 + age-clause → Block 1 + senior-warmth → Block 2.** ✓ [VERIFIED]

### ES prompt — same structure with ES text

Block 3 ES at `systemMessageSmallEs`, senior-warmth ES provision present, Block 2 ES present, compatibility ES present, FAQ placeholder ES (`[MARCADOR — SIN CONFIRMAR — BLOQUEA EL LANZAMIENTO]`) present. [VERIFIED]

---

## Smoke Test

Query: `species: "small_animal"`, narrative: "a friendly rabbit"

| Match | Breed in Bio | FIV/FeLV | Species Noun | Bio Length |
|-------|-------------|----------|-------------|-----------|
| Charlie (Hotot rabbit) | **"Hotot rabbit" ✓** | None ✓ | "rabbit" ✓ | 828 |
| Anastasia (Lop Eared rabbit) | **"Lop Eared rabbit" ✓** | None ✓ | "rabbit" ✓ | 771 |
| Elsa (American rabbit) | **"American rabbit" ✓** | None ✓ | "rabbit" ✓ | 770 |

No "small animal" as bio noun. No FIV/FeLV rendered. Real breeds stated. No TS/runtime errors. Response shape unchanged. [VERIFIED]

---

## Summary

- systemMessageSmallEn/Es created with copied verified blocks + small-specific sections
- Breed-echo suppression: Chinchilla/Ferret/Guinea Pig breed suppressed, rabbit breed retained
- Router wired: small_animal → systemMessageSmallEn/Es
- ENABLED_SPECIES: `['cat', 'dog', 'small_animal']`
- UI radio: still gated/disabled (untouched)
- FAQ placeholder: loudly marked `[PLACEHOLDER — UNCONFIRMED — BLOCKS UI LAUNCH]`
- Build clean, service active, smoke test passed
- Commit `9518396`
- Rollback: `cd /home/shelter/shelter-apps && git revert 9518396 && cd server && npm run build && sudo systemctl restart shelter-app`
