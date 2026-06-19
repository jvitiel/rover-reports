# Searcher Test Harness — Build + Smoke Test

**Date:** 2026-06-19 18:01 ET  
**Type:** TEST TOOLING (no production code changes)  
**Script path:** `/home/rover/rover/searcher-test.mjs`

---

## What It Is

A reusable, spec-driven test harness for the custom-search matcher with two modes:

| Mode | How It Works | Use Case |
|------|-------------|----------|
| **🌐 endpoint** | POSTs to `http://127.0.0.1:3000/api/matcher/custom-search` — the real production server | Normal queries: Phase-1 selects animals, Phase-2 writes bios, exactly as a user hits it |
| **🔧 forced** | Sends specific animal codes directly to claude-sonnet-4-6 via Anthropic API | Edge cases Phase-1 won't surface (blank seniors, the lone chinchilla, etc.) |

### Usage

```bash
cd /home/shelter/shelter-apps/server
sudo -u shelter node --experimental-vm-modules /home/rover/rover/searcher-test.mjs <spec.json> <output.md>
```

### Spec File Format

```json
{
  "queries": [
    {
      "label": "Cat EN basic",
      "mode": "endpoint",
      "narrative": "a friendly cat",
      "species": "cat",
      "sex": ["male", "female"],
      "ageGroup": ["young", "adult", "senior"],
      "language": "en",
      "bondedPair": false
    },
    {
      "label": "Blank senior chinchilla",
      "mode": "forced",
      "species": "small_animal",
      "language": "en",
      "narrative": "a calm gentle companion",
      "animalCodes": ["S2026403"]
    }
  ]
}
```

**Sex values must be lowercase:** `"male"`, `"female"` (endpoint validation rejects `"M"`/`"F"`). [VERIFIED]

### Output Per Query

For each query, the report shows:
- Mode label (endpoint vs forced)
- Full request body
- HTTP status
- `candidateCount`, `lowConfidence`, `preamble`
- Each returned animal: name, shelter_code, species, breed, age, **tier (BLANK/DOCUMENTED)**, and full bio text verbatim

Tier is computed live via `isBlankAnimal()` using `getBehaviorRecords()` + description sentinel check — same logic as production (server.ts:4608-4613). [VERIFIED]

---

## Smoke Test Result

**Spec:** 1 endpoint query — `"a friendly cat"`, species cat, sex [male,female], ageGroup [young,adult,senior], lang en

### Server Log Proof (journalctl)

```
[Matcher] Phase 1: selecting from 105 cats, narrative=yes
[Matcher] Phase 1 selected: S2025966, S20251008, S2025883 (low_confidence=false, retried=false, tokens=8393+53)
[Matcher] Phase 2: writing bios for 3 cats, narrative=yes
[Matcher] API response: 5469 input tokens, 752 output tokens
[Matcher] Audit row written: ffd593a8-2136-4673-8fc5-d865477b1c33 (status=success, 19156ms)
```

This confirms the query went through the real `/api/matcher/custom-search` endpoint — Phase-1 selection from 105 cats, Phase-2 bio generation, audit row written. [VERIFIED]

### Harness Output

```
Smoke test — Cat EN basic

Mode: 🌐 ENDPOINT (/api/matcher/custom-search)
Request: {"species":"cat","narrative":"a friendly cat","sex":["male","female"],
          "ageGroup":["young","adult","senior"],"language":"en"}
HTTP status: 200

| Field          | Value |
|----------------|-------|
| candidateCount | 105   |
| lowConfidence  | false |
| preamble       | (none)|
| matches        | 3     |
```

**Animal 1: Abe/Louie (S2025966)** — Cat, Domestic Short Hair, 9yr 7mo, **DOCUMENTED**
> Abe — also known as Baby Aby to the people who love him most — is a sweet, social, easygoing black-and-white cat who loves nothing more than a warm lap, a sunny window, and the company of the people around him. He's outgoing and curious, not the least bit shy, and he genuinely enjoys exploring his surroundings before settling in for a good, long chill. He's great with other cats, comfortable with dogs, and sleeps in bed with young kids every night in his foster home — he's just that kind of cat, the kind who fits in wherever he lands. Abe does have diabetes, managed with insulin injections twice a day and prescription food, but his caregivers want you to know it's genuinely easy: he's a patient, cooperative little guy who doesn't squirm, and the whole thing takes barely a moment. He's also bonded to his sister Edna, so they'd need to be adopted together — but honestly, you'd be getting twice the sweetness. Come meet him and see for yourself why everyone who knows him calls him a great cat.

**Animal 2: Edna (S20251008)** — Cat, Domestic Short Hair, 9yr 7mo, **DOCUMENTED**
> Edna — affectionately nicknamed Big Eddie by her foster family — is a mostly white cat with black markings who brings a wonderful mix of social energy and genuine warmth to every room she's in. She's curious and outgoing, always ready to explore, make a new friend, or bat around a toy, and she's just as comfortable with other cats and dogs as she is snuggled up with the kids in her foster home, where she sleeps with the little ones every night. She's a polite, litter-box-perfect girl with no medical issues — healthy and happy. The main reason she's still looking for a home is that she's deeply bonded to her brother Abe, and they need to go together. Abe has diabetes (manageable and straightforward, his caregivers say), but Edna herself is in great shape and full of the kind of friendly, curious energy that makes a home feel alive. If you've got room in your heart for two, this pair would be lucky to have you — come meet them.

**Animal 3: Reeboks (S2025883)** — Cat, Domestic Medium Hair, 10yr 9mo, **DOCUMENTED**
> Reeboks is a gorgeous orange tabby with beautiful markings and what his caregiver describes as a truly majestic posture — the kind of cat who owns every room he walks into just by being in it. He's sweet with people, low-energy, and currently living happily alongside another cat and a small dog in his foster home. He came into care after his owner passed away, along with a group of older feline siblings, and is now looking for a calm, loving place to call his own. His FIV and FeLV status are listed as untested and unknown in our search records — shelter staff will have the most current information when you visit, so be sure to ask. If you're looking for a friendly, handsome cat with a gentle presence, Reeboks is well worth a visit.

---

## Verification

- [x] Script hits the real `/api/matcher/custom-search` endpoint (not a direct Phase-2 call) [VERIFIED — server log shows Phase-1 selection + Phase-2 bio generation + audit row]
- [x] Response shape matches production: `matches`, `candidateCount`, `lowConfidence`, `preamble` [VERIFIED]
- [x] Sonnet selected animals (105 candidates → 3 matches) [VERIFIED]
- [x] Each animal shows code, name, species, breed, age, tier (BLANK/DOCUMENTED) [VERIFIED]
- [x] Full bio text verbatim in output [VERIFIED]
- [x] Forced mode code present (not exercised in smoke test — ready for edge-case queries) [VERIFIED — code review]
- [x] Sex values: lowercase `"male"`/`"female"` required by endpoint [VERIFIED — uppercase rejected with 400]
- [x] No production code changes — harness is a standalone script at `/home/rover/rover/searcher-test.mjs` [VERIFIED]
