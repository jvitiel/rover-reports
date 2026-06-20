# Freshness & Plumbing Diagnosis — Custom-Search

**Date:** 2026-06-20 01:05 ET  
**Type:** READ-ONLY DIAGNOSIS  
**Source:** Code inspection + live endpoint queries

---

## Answers

**(A) Does the pool exclude unavailable animals?** YES — `fetchAnimals()` returns only `ADOPTABLE === 1` animals (server.ts:4499, shelterManagerService.ts:49). **Zero stale animals currently in the pool** (verified: 177 animals, 0 unavailable). No adopted/pending/on-hold animals leak through. However, the `bonded_pair` and `adoption_pending` DB flags are **all zeros** — neither feature is operationally active, so the response flags are always false. [VERIFIED]

**(B) Can photo/flag enrichment cross-wire?** NO — each match is enriched by its own `shelter_code` via `recordsMap.get(m.shelter_code)` (server.ts:5399), and photo/video/flags are all keyed on the same code. Live verification: 3-match query returned Abe/Edna/Jeans, each with correct name, photo, video, and bio alignment. No cross-wiring possible in the current code. [VERIFIED]

**(C) Can bonded pairs split?** YES — **confirmed split in live test.** A male-only filter query returned Abe (male) without Edna (female). The sex hard filter at server.ts:4508-4512 excludes Edna before Phase-1 ever sees her. There is **no bonded-pair enforcement anywhere** — no code in Phase-1 selection (customSearchSelect.ts), no code in Phase-2, no code in response assembly. The `bonded_pair` flag is a response annotation only, and it's currently 0 for all animals anyway. [VERIFIED]

---

## PART A — Stale / Unavailable Animals

### Q1: Pool filter logic

`fetchAnimals()` at **shelterManagerService.ts:95** with default options (`includeUnavailable: false`):

```typescript
// shelterManagerService.ts:49
const isAvailable = raw.ADOPTABLE === 1;
```

```typescript
// shelterManagerService.ts:135-136
const availableAnimals = allAnimals.filter(a => a.isAvailable);
```

The custom-search endpoint calls `fetchAnimals()` with no options at **server.ts:4499**:
```typescript
const allAnimals = await fetchAnimals();
```

This returns only `ADOPTABLE === 1` animals. The `ADOPTABLE` field is set by Shelter Manager based on the animal's status and active movement type (adopted = 0, foster-but-adoptable = 1, on-hold = 0, etc.). [VERIFIED]

### Q2: Stale animals currently in pool

**Zero.** Cross-check at runtime: [VERIFIED]
```
Pool size: 177
Unavailable in pool: 0
```

All 177 animals have `isAvailable: true` and `status: 'available'`. No animal that has been adopted, placed on hold, or otherwise removed from the adoptable pool is leaking through. [VERIFIED]

### Q3: adoption_pending flag

The flag is populated at **server.ts:5384-5395**:
```typescript
const matchedCodes = parsed.matches.map(m => m.shelter_code).filter(Boolean);
const pendingMap = new Map<string, boolean>();
// ...
const rows = database.prepare(
  `SELECT shelter_code, adoption_pending, bonded_pair FROM animal_metadata 
   WHERE shelter_code IN (${matchedCodes.map(() => '?').join(',')})`
).all(...matchedCodes);
for (const row of rows) {
  pendingMap.set(row.shelter_code, row.adoption_pending === 1);
}
```

And applied per-match at **server.ts:5433**:
```typescript
adoptionPending: pendingMap.get(m.shelter_code) || false,
```

**Current state: all zeros.** No animal in `animal_metadata` has `adoption_pending = 1`:
```
Pending adoption in DB: 0
```

The code is correct — it queries the right table and keys on `m.shelter_code` (the matched animal's own code). But the feature is operationally inert: no animal currently has the flag set, so no adopter will ever see `adoptionPending: true` in a response. [VERIFIED]

**Risk:** If an animal goes adoption-pending in the real workflow, does something SET this flag? The `adoption_pending` flag in `animal_metadata` is set manually via `PUT /api/animals/:shelterCode/adoption-pending` (server.ts:2948). It is NOT automatically synced from Shelter Manager. If staff mark an animal as pending in SM but don't toggle the flag in the shelter app, the animal could appear in search results without the pending flag. [INFERRED]

### Q4: Foster/ACTIVEMOVEMENTTYPE

Shelter Manager's `ADOPTABLE` field handles this upstream. Animals with `ACTIVEMOVEMENTTYPE = 2` (foster) are still `ADOPTABLE = 1` if they're available for adoption while in foster. Animals with `ACTIVEMOVEMENTTYPE = 1` (adoption) are `ADOPTABLE = 0` and filtered out. The app doesn't second-guess SM's `ADOPTABLE` flag — it trusts it. [VERIFIED]

Fostered-but-adoptable animals DO correctly appear. Example: Abe and Edna are in foster homes and appear in search results. [VERIFIED]

---

## PART B — Photo / Video Plumbing

### Q5: Enrichment mapping

At **server.ts:5399**, each match is enriched by its OWN shelter_code:

```typescript
const responseMatches = parsed.matches.map(m => {
  const animal = recordsMap.get(m.shelter_code) || 
    withRecords.find(a => a.shelterCode === m.shelter_code)!;
```

Where `recordsMap` is built at **server.ts:4547**:
```typescript
const recordsMap = new Map(enrichedRecords.map((a: any) => [a.shelterCode, a]));
```

This is a `Map<string, Animal>` keyed by `shelterCode`. The lookup `recordsMap.get(m.shelter_code)` uses the MATCH's own code to find the MATCH's own animal record. Cross-wiring is structurally impossible — each `.map()` iteration uses its own `m.shelter_code` for all lookups (animal record, video query, bio lookup, pending/bonded maps). [VERIFIED]

The video lookup also keys on the match's own code at **server.ts:5402-5406**:
```typescript
const videoRow = database.prepare(`
  SELECT file_url FROM animal_media
  WHERE shelter_code = ? AND media_type = 'video' AND hidden = 0
  ORDER BY captured_at DESC LIMIT 1
`).get(m.shelter_code);
```

And `photo_url` comes from `animal.photoUrl` which is the SM primary photo for that specific animal (set in `normalizeAnimal` from `raw.PHOTOURLS[0]`). [VERIFIED]

### Q6: Live verification

Query: "a friendly cat", cat, sex [male,female], ageGroup [young,adult,senior], EN

| Match | shelter_code | name | photo_url contains | video_url contains | adoptionPending | bondedPair | bio starts with |
|-------|-------------|------|-------------------|-------------------|-----------------|------------|-----------------|
| 1 | S2025966 | Abe (Louie) | SM external (animal ID 4441) | `/animal-media/videos/3874c643...` | false | false | "Abe — also known as Baby Aby" ✓ |
| 2 | S20251008 | Edna | `/library-photos/S20251008/...` | `/animal-media/videos/774e6fa0...` | false | false | "Edna — affectionately nicknamed Big Eddie" ✓ |
| 3 | S2025833 | Jeans | SM external (animal ID) | null | false | false | "Jeans is a black-and-white cat" ✓ |

**All 3 matches: name ↔ code ↔ photo ↔ video ↔ bio are aligned.** Each animal's bio mentions that animal by name in the first sentence. Each photo URL corresponds to the correct animal (S20251008 has a local library photo at `/library-photos/S20251008/`, Abe has SM external). No cross-wiring. [VERIFIED]

---

## PART C — Bonded Pair Splitting

### Q7: Can bonded pairs split?

**YES — confirmed.** [VERIFIED]

**Test: male-only filter, narrative "a friendly lap cat"**

Selected: Jeans (S2025833, M) | Macy (S2026028, M) | **Abe (S2025966, M)**

Abe appeared **without Edna**. Edna (female) was excluded by the sex hard filter at **server.ts:4508-4512**:

```typescript
const filtered = speciesPool.filter(a => {
  const animalSex = (a.sex || '').toLowerCase();
  if (!sexLower.includes(animalSex)) return false;
  // ...
});
```

The hard filter runs BEFORE Phase-1 selection (server.ts:4508, Phase-1 starts at 4570). Edna is removed from the candidate pool entirely — Phase-1 never sees her as an option.

**There is no bonded-pair enforcement anywhere in the pipeline:**

1. **Phase-1 selection (customSearchSelect.ts):** Zero mentions of "bonded" — the prompt doesn't instruct Phase-1 to keep pairs together. [VERIFIED — `grep -c bonded customSearchSelect.ts` = 0]
2. **Hard filters (server.ts:4506-4514):** Sex and age filters apply per-animal with no pair logic.
3. **Phase-2 bio writing:** The prompt mentions bonded pairs only in the context of bio tone ("this cat is solo" vs bonded). It doesn't enforce co-selection.
4. **Response assembly (server.ts:5398-5436):** No post-hoc pair validation.

**The `bonded_pair` DB flag is operationally inert:**
```
Bonded pair flags in DB: 0 (zero animals have bonded_pair = 1)
```

Even Abe/Edna and Thing 1/Thing 2 — known bonded pairs from caregiver transcripts — have `bonded_pair = 0` in `animal_metadata`. The flag exists in the schema and response but was never set for any animal. [VERIFIED]

**Splitting scenarios:**
- Sex filter splits (demonstrated): male-only filter shows Abe without Edna ✓
- Age filter splits: if one pair member is senior and the other is adult, an age-restricted query could split them
- Phase-1 selection: even without hard-filter splits, Phase-1 picks 3 of N candidates — it could pick one bonded member and not the other simply because the 3-slot limit forces a choice

**The adopter experience when split:** Abe's bio mentions he's "bonded with his sister" but the sister isn't in the results. The bio tells the adopter about the bond, but the UI shows 3 animals and one member of the pair is missing. The adopter would need to know to ask about Edna separately. [VERIFIED]

---

## Summary

| Area | Status | Risk |
|------|--------|------|
| Stale/unavailable animals in pool | **CLEAN** ✅ | None — `ADOPTABLE=1` filter works |
| adoption_pending flag accuracy | **INERT** ⚠️ | Flag exists but always 0 — no animal has it set |
| Photo/video cross-wiring | **CLEAN** ✅ | Structurally impossible — keyed by match's own code |
| Bonded pair splitting | **CONFIRMED DEFECT** ❌ | Hard filters can split pairs; no enforcement exists |
| bonded_pair DB flag | **INERT** ⚠️ | Always 0 — never set for any animal including known pairs |
