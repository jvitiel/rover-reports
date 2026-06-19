# P6: Phase-2 No-Drop/No-Rerank — Prompt Edit Report

**Date:** 2026-06-19 10:53 ET  
**Commit:** `bdfeac7` — "P6: Phase-2 writes bios for the 3 provided animals, no drop/re-rank (cat+dog, EN+ES)"  
**Status:** DEPLOYED

---

## What Changed

Removed legacy "pick the best from the list" language from all four Phase-2 system prompts (cat EN, cat ES, dog EN, dog ES). Phase-2 now explicitly knows it receives exactly 3 pre-selected animals and must write a bio for each, in order, without dropping, substituting, or re-ranking.

---

## Exact Edits (Before → After)

### Edit 1: Job description line (×4 prompts)

**Cat EN (line 4695):**
- BEFORE: `You will receive information about multiple cats and a description of one prospective adopter. Your job is to pick the three cats from the list that would be the best matches for this adopter, and write the bio described above for each of those three.`
- AFTER: `You will receive information about exactly three cats that have already been selected for this adopter, and a description of the adopter. Write the bio described above for EACH of the three cats provided. Do not drop, add, substitute, or re-rank them — write one bio for each of the three, in the order provided.`

**Cat ES (line 4763):**
- BEFORE: `Recibirás información sobre múltiples gatos y una descripción de un posible adoptante. Tu trabajo es elegir los tres gatos de la lista que serían las mejores coincidencias para este adoptante, y escribir la biografía descrita arriba para cada uno de esos tres.`
- AFTER: `Recibirás información sobre exactamente tres gatos que ya han sido seleccionados para este adoptante, y una descripción del adoptante. Escribe la biografía descrita arriba para CADA uno de los tres gatos proporcionados. No los elimines, agregues, sustituyas ni reordenes — escribe una biografía para cada uno de los tres, en el orden proporcionado.`

**Dog EN (line 4835):**
- BEFORE: `You will receive information about multiple dogs and a description of one prospective adopter. Your job is to pick the three dogs from the list that would be the best matches for this adopter, and write the bio described above for each of those three.`
- AFTER: `You will receive information about exactly three dogs that have already been selected for this adopter, and a description of the adopter. Write the bio described above for EACH of the three dogs provided. Do not drop, add, substitute, or re-rank them — write one bio for each of the three, in the order provided.`

**Dog ES (line 4906):**
- BEFORE: `Recibirás información sobre múltiples perros y una descripción de un posible adoptante. Tu trabajo es elegir los tres perros de la lista que serían las mejores coincidencias para este adoptante, y escribir la biografía descrita arriba para cada uno de esos tres.`
- AFTER: `Recibirás información sobre exactamente tres perros que ya han sido seleccionados para este adoptante, y una descripción del adoptante. Escribe la biografía descrita arriba para CADA uno de los tres perros proporcionados. No los elimines, agregues, sustituyas ni reordenes — escribe una biografía para cada uno de los tres, en el orden proporcionado.`

[VERIFIED] — all four before/after pairs confirmed via `git diff HEAD~1`.

### Edit 2: "Return your 3 best matches" paragraph (×4 prompts)

**Cat EN (line 4670):**
- BEFORE: `Even when the adopter's narrative is brief or vague, return your 3 best matches based on the hard filters and whatever signal you can extract.`
- AFTER: `Even when the adopter's narrative is brief or vague, write a bio for each of the 3 provided cats.`

**Cat ES (line 4738):**
- BEFORE: `...devuelve tus 3 mejores coincidencias basándote en los filtros estrictos y cualquier señal que puedas extraer.`
- AFTER: `...escribe una biografía para cada uno de los 3 gatos proporcionados.`

**Dog EN (line 4807):**
- BEFORE: `Even when the adopter's narrative is brief or vague, return your 3 best matches based on the hard filters and whatever signal you can extract.`
- AFTER: `Even when the adopter's narrative is brief or vague, write a bio for each of the 3 provided dogs.`

**Dog ES (line 4878):**
- BEFORE: `...devuelve tus 3 mejores coincidencias basándote en los filtros estrictos y cualquier señal que puedas extraer.`
- AFTER: `...escribe una biografía para cada uno de los 3 perros proporcionados.`

[VERIFIED] — all four before/after pairs confirmed via `git diff HEAD~1`.

### Edit 3: Residual "your matches/picks/returned" references (×4 prompts)

In the `low_confidence` definition and gap-acknowledgment lines, replaced possessive "your" framing that implied selection:

- `"your 3 returned cats/dogs"` → `"the 3 provided cats/dogs"` [VERIFIED]
- `"none of your matches are that breed"` → `"none of the provided cats/dogs are that breed"` [VERIFIED]
- `"none of your picks address"` → `"none of the provided cats/dogs address"` [VERIFIED]
- `"a returned cat/dog doesn't match"` → `"a provided cat/dog doesn't match"` [VERIFIED]
- ES equivalents: `"que devuelves"` → `"proporcionados"`, `"tus coincidencias"` → `"los gatos/perros proporcionados"`, `"tus elecciones"` → `"los gatos/perros proporcionados"`, `"gato/perro devuelto"` → `"gato/perro proporcionado"` [VERIFIED]

### Nothing else changed

- Voice, tone, examples: unchanged [VERIFIED]
- Honesty rules (ASSERT/DEFER): unchanged [VERIFIED]
- low_confidence logic: unchanged (only possessive references updated) [VERIFIED]
- Preamble rules: unchanged [VERIFIED]
- Policy FAQ injection: unchanged [VERIFIED]
- JSON output format instruction: unchanged [VERIFIED]

---

## Verification

### Build & Deploy
- `npm run build` (tsc): clean, exit 0 [VERIFIED]
- `systemctl restart shelter-app`: active [VERIFIED]
- Commit: `git add server/src/server.ts` only (no `-A`) [VERIFIED]
- Diff stat: `1 file changed, 16 insertions(+), 16 deletions(-)` — pure text swaps [VERIFIED]

### No-Drop Behavior: Cat
- Query: `sex=female, ageGroup=adult, species=cat, narrative="I want a friendly cat that likes to cuddle"`
- Phase-1 selected: `S2026314, S20241035, S2026177` [VERIFIED from journalctl]
- Phase-2 returned: `S2026314, S20241035, S2026177` — all 3 bios present, same codes, same order [VERIFIED]
- `low_confidence: false`, preamble: null, FIV/FeLV present in bios [VERIFIED]
- **Weak animal included:** S2026314 (Sky) has 0 behavior_notes rows — she's a blank cat. She was NOT dropped; she received a full bio. [VERIFIED]

### No-Drop Behavior: Dog
- Query: `sex=male+female, ageGroup=adult, species=dog, narrative="I want a playful dog good with kids"`
- Phase-1 selected: `A2025114, A2025088, A2024185` [VERIFIED from journalctl]
- Phase-2 returned: `A2025114, A2025088, A2024185` — all 3 bios present, same codes, same order [VERIFIED]
- `low_confidence: false`, preamble: null [VERIFIED]

### Sanity Checks
- Cat responses include FIV/FeLV status and cat-specific FAQ references [VERIFIED]
- Dog responses use dog-appropriate language, no FIV/FeLV [VERIFIED]
- Response shape unchanged: `{matches: [{shelter_code, bio, name, sex, age, breed, photo_url, video_url, ...}], candidateCount, lowConfidence, preamble}` [VERIFIED]

---

## Rollback

```bash
cd /home/shelter/shelter-apps && git revert bdfeac7 && cd server && npm run build && sudo systemctl restart shelter-app
```
