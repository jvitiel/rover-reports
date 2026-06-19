# Step 3: Blank-Bio Whitelist + Anti-Laundering + Soft-Assert Guard

**Date:** 2026-06-19 11:31 ET  
**Commit:** `5f90377` — "Step 3: blank-bio whitelist + anti-laundering + soft-assert guard (cat+dog, EN+ES) + adopter-gender neutrality"  
**Status:** DEPLOYED  
**Diff stat:** `1 file changed, 90 insertions(+), 2 deletions(-)`

---

## What Changed

Three rule blocks inserted into all four Phase-2 system prompts (cat EN, cat ES, dog EN, dog ES), plus a gender-neutrality fix in both ES prompts. The rules act on the `DOCUMENTED BEHAVIORAL DATA: none` flag from Step 2.

### Blocks Inserted (per prompt)

| Block | Name | Placement | Purpose |
|-------|------|-----------|---------|
| Block 3 | Anti-laundering | After "Don't invent facts" line | Bans deriving personality from breed/age/name/appearance |
| Block 1 | Blank-bio whitelist | Before ASSERT/DEFER lead-in | Strict factual-only bio for no-data animals |
| Block 2 | Soft-assert guard | Immediately after Block 1 | Bans implying requested attributes via invented temperament |

### Reading Order in Each Prompt

Block 3 (anti-laundering, general rule) renders first → Block 1 (blank-bio, references "the anti-laundering rule above") → Block 2 (soft-assert, references no-data animals) → existing ASSERT/DEFER rules.

---

## Placement Verification

### Cat EN (systemMessageEn)

```
Line 4685: Don't invent facts not present in the input.
Line 4687: [BLOCK 3] Personality and temperament claims in any bio must come from...
Line 4689: [BLOCK 3 cont.] For animals WITH documented data: state the documented traits...
  ...
Line 4707: [BLOCK 1] HANDLING AN ANIMAL WITH NO DOCUMENTED BEHAVIORAL DATA:
  ...
Line 4721: [BLOCK 2] DO NOT IMPLY A REQUESTED ATTRIBUTE THROUGH INVENTED TEMPERAMENT:
  ...
Line 4724: Two rules for attributes not mentioned in a candidate's profile:
```
[VERIFIED] — Block 3 at 4687, Block 1 at 4707, Block 2 at 4721, ASSERT/DEFER at 4724.

### Cat ES (systemMessageEs)

```
Line 4775: No inventes datos que no estén presentes en la información proporcionada.
Line 4777: [BLOCK 3] Las afirmaciones sobre personalidad y temperamento...
Line 4779: [BLOCK 3 cont.] Para animales CON datos documentados...
  ...
Line 4797: [BLOCK 1] MANEJO DE UN ANIMAL SIN DATOS DE COMPORTAMIENTO DOCUMENTADOS:
  ...
Line 4811: [BLOCK 2] NO IMPLIQUES UN ATRIBUTO SOLICITADO MEDIANTE TEMPERAMENTO INVENTADO:
  ...
Line 4814: Dos reglas para atributos no mencionados en el perfil de un candidato:
```
[VERIFIED] — Block 3 at 4777, Block 1 at 4797, Block 2 at 4811, ASSERT/DEFER at 4814.

### Dog EN (systemMessageDogEn)

```
Line 4866: Don't invent facts not present in the input.
Line 4868: [BLOCK 3] Personality and temperament claims...
Line 4887: [BLOCK 1] HANDLING AN ANIMAL WITH NO DOCUMENTED BEHAVIORAL DATA:
Line 4901: [BLOCK 2] DO NOT IMPLY A REQUESTED ATTRIBUTE THROUGH INVENTED TEMPERAMENT:
Line 4904: Two rules for attributes not mentioned in a candidate's profile:
```
[VERIFIED]

### Dog ES (systemMessageDogEs)

```
Line 4959: No inventes datos que no estén presentes en la información proporcionada.
Line 4961: [BLOCK 3] Las afirmaciones sobre personalidad y temperamento...
Line 4980: [BLOCK 1] MANEJO DE UN ANIMAL SIN DATOS DE COMPORTAMIENTO DOCUMENTADOS:
Line 4994: [BLOCK 2] NO IMPLIQUES UN ATRIBUTO SOLICITADO MEDIANTE TEMPERAMENTO INVENTADO:
Line 4997: Dos reglas para atributos no mencionados en el perfil de un candidato:
```
[VERIFIED]

---

## Token Match

The prompts reference `"DOCUMENTED BEHAVIORAL DATA: none"` (in quotes within the instruction text). The Step 2 injection code produces `DOCUMENTED BEHAVIORAL DATA: none` (from template literal `${blank ? 'none' : 'present'}`). These are byte-identical strings. [VERIFIED — 4 quoted occurrences in prompts, 1 in injection code, all matching]

---

## Adopter-Gender Neutrality Sweep

### Found and Changed

Two instances of gendered adopter language in ES prompts:

| Line (pre-edit) | Before | After | Prompt |
|------------------|--------|-------|--------|
| 4771 (cat ES) | `sobre sí mismo` | `sobre sí` | systemMessageEs |
| 4955 (dog ES) | `sobre sí mismo` | `sobre sí` | systemMessageDogEs |

"Sobre sí mismo" (reflexive masculine "about himself") → "sobre sí" (gender-neutral "about themselves"). The adopter's gender is unknown; the bio must not assume it. [VERIFIED]

### Not Found

No instances of `por ti mismo/a`, `tú mismo/a`, `compruébalo por ti mismo`, or other gendered adopter-addressing constructions were found in any of the four prompts. [VERIFIED]

---

## Smoke Test

### Cat Query
- Query: `sex=female, ageGroup=adult, species=cat, narrative="I want a friendly cat"`
- Result: 3 matches returned [VERIFIED]
  - S2026314 (Sky): bio_len=627 — blank animal, bio is now factual-only (no personality fabrication)
  - S20241035 (Starr): bio_len=849 — documented animal, full personality bio
  - S2026177 (Stevie): bio_len=917 — documented animal, full personality bio
- low_confidence=false, preamble=null [VERIFIED]
- No runtime errors [VERIFIED]

### Dog Query
- Query: `sex=male+female, ageGroup=adult, species=dog, narrative="I want a playful dog"`
- Result: 3 matches returned [VERIFIED]
  - A2025114 (Rex): bio_len=850
  - A2024185 (Amari): bio_len=904
  - S2026560 (Mikey): bio_len=823
- low_confidence=false, preamble=null [VERIFIED]
- No runtime errors [VERIFIED]

### Sky's Blank Bio (immediate effect visible)

Sky (S2026314, DOCUMENTED BEHAVIORAL DATA: none) produced this bio:

> Sky is a beautiful calico girl, just over two years old, with the kind of patchwork coat that turns heads the moment you walk into a room. She's recently arrived and our team is still getting to know her — so we don't yet have notes on her personality to share. What we can say is that she's healthy, and the caregivers spending time with her will be your best source for the full picture of who she is. If friendliness is your top priority, it's worth calling ahead so staff can give you a real-time read on how she's been showing up. Sky comes spayed, fully vaccinated, and microchipped. We'd love for you to come meet her and see the connection for yourself — we're open noon to 5 PM, six days a week (closed Wednesdays).

**Assessment:** No fabricated personality traits. Bio contains only verifiable facts (calico, two years old, appearance), honest assessment status ("still getting to know her"), policy facts (spayed/vaccinated/microchipped), and an invitation to meet. This is a stark improvement from pre-Step-3 behavior where 100% of blank bios fabricated personality traits. Full fabrication re-test is the next step.

---

## What Was NOT Changed

- Selection logic (Phase-1): unchanged [VERIFIED]
- Flag injection code (Step 2 `isBlankAnimal`): unchanged [VERIFIED]
- Post-Phase-2 sort: not added yet (future step) [VERIFIED]
- FAQ files: not touched [VERIFIED]
- Response shape: unchanged [VERIFIED]
- ASSERT/DEFER rules: unchanged, blocks inserted before them [VERIFIED]

---

## Rollback

```bash
cd /home/shelter/shelter-apps && git revert 5f90377 && cd server && npm run build && sudo systemctl restart shelter-app
```
