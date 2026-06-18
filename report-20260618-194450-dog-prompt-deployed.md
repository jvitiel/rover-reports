# Dog Prompt Connected + Dog Enabled — Endpoint-Only, UI Cat-Locked

**Date:** 2026-06-18 19:44 ET  
**Commit:** `4cdd30c`  
**Production modified:** YES. 3 files changed (+175/-4). [VERIFIED]  
**Status:** DEPLOYED

---

## Changes Implemented

| Change | File(s) | Description |
|---|---|---|
| 1. Dog Phase-2 prompts | server.ts | `systemMessageDogEn` + `systemMessageDogEs` — complete dog bio prompts with dog-specific ASSERT/DEFER rules, examples, and nouns |
| 2. Dog policy FAQ | server/config/ | `shelter-policy-faq-dog.json` + `shelter-policy-faq-dog-es.json` — `spay_vax_chip` says "Dogs", `age_definitions` says "dogs" |
| 3. Species→prompt router | server.ts | `speciesLower === 'dog'` → dog prompts; else → cat prompts (unchanged) |
| 4. Species-aware FAQ loader | server.ts | `faqSuffix = speciesLower === 'dog' ? '-dog' : ''` → loads dog FAQ for dog, cat FAQ for cat |
| 5. Enable dog | server.ts | `ENABLED_SPECIES = ['cat', 'dog']` |

**Client files UNTOUCHED** — UI still locked to cat. Dog reachable only via direct `POST /api/matcher/custom-search` with `species: "dog"`. [VERIFIED — git status shows only server.ts + 2 FAQ files]

---

## Verification: Cat Byte-Identity (PASS)

### Phase-2 cat system prompt

Pre-change and post-change cat Phase-2 system prompt captured and diffed:

```
$ diff /tmp/pre-cat-p2-sys-en.txt /tmp/post-cat-p2-sys-en.txt
(no output — files identical)
$ echo $?
0
```

File sizes: both **8701 bytes**. [VERIFIED — `diff` exit code 0, `wc -c` identical]

### Cat route unperturbed

- Cat query (no species param): returns 3 matches, Karen Smith #1 for "playful kitten" ✅ [VERIFIED]
- hard_filters: `{"species":"cat","sex":["female"],"ageGroup":["young"]}` ✅ [VERIFIED]
- FIV/FeLV present in cat input_profiles ✅ [VERIFIED — Phase-2 user message confirmed]
- Cat FAQ loaded (not dog FAQ) ✅ [VERIFIED — policyBlock source is `shelter-policy-faq.json` when speciesLower='cat']

---

## Verification: Dog Runs (PASS)

### Dog EN query

**Request:** `species:"dog", sex:["male","female"], ageGroup:["young","adult"], narrative:"I want an active friendly dog good with kids, we have a big yard"`

**Response:**

| Match | Code | Name | Bio excerpt |
|---|---|---|---|
| 1 | A2025114 | Rex | "Rex is the kind of dog who turns heads on the trail and melts hearts the moment he looks up at you — those big, expressive eyes are genuinely hard to resist. A tan and white Terrier mix with striking markings..." |
| 2 | A2025088 | Achilles | "Achilles is pure joy in dog form — a three-year-old black and brown mixed breed with bright eyes, a goofy grin, and enough energy to keep up with even the most active household. He's crate trained, housebroken..." |
| 3 | A2024185 | Amari | "Amari is a sweet, cream-colored Havanese-Terrier mix with a gentle spirit and a medium energy level that makes her a lovely, easygoing presence in a busy home. She's good with kids, friendly with cats..." |

- `low_confidence`: null (false) ✅
- No cat-isms ("kitten", "feline", "declaw") in any bio ✅ [VERIFIED — grep returned nothing]
- FIV/FeLV absent from dog input_profiles ✅ [VERIFIED]
- `Species: Dog` in profile lines ✅ [VERIFIED]
- hard_filters: `{"species":"dog","sex":["male","female"],"ageGroup":["young","adult"]}` ✅ [VERIFIED]

### Dog ES query

**Request:** `species:"dog", sex:["female"], ageGroup:["adult","senior"], lang:"es", narrative:"Quiero una perra tranquila para acompañarme, vivo sola"`

**Response:**

| Match | Code | Name | Bio excerpt |
|---|---|---|---|
| 1 | S2024694 | Isis | "Isis es exactamente el tipo de compañera que hace que una casa se sienta más llena sin que la vida se sienta más complicada. Esta terrier mestiza de casi nueve años tiene un temperamento tan tranquilo y afectuoso..." |
| 2 | A2023267 | Cookie | "Cookie lleva cuatro años en el refugio de Rockland County, y aun así sigue siendo la perra más alegre de la sala..." |
| 3 | A2026061 | Clover | "Clover es una mezcla de Labrador Retriever de cinco años que fue encontrada abandonada en Bear Mountain..." |

- Spanish bios: fluent, natural ✅ [VERIFIED]
- Dog ES FAQ used (verified by policyBlock loader selecting `shelter-policy-faq-dog-es.json`) ✅ [VERIFIED]
- No cat-isms in Spanish bios ✅ [VERIFIED]

---

## Dog Prompt Content Verification

Key dog-specific elements confirmed present in rendered prompt:

| Element | Cat version | Dog version | Status |
|---|---|---|---|
| Species noun | "cat"/"cats" | "dog"/"dogs" | ✅ All nouns correct |
| Pronoun | "come meet her" | "come meet them" | ✅ Gender-neutral for dogs |
| Young animal word | "kitten" | "puppy" | ✅ In low_confidence + examples |
| ASSERT: breed default | "domestic shorthair or longhair" | "mixed breed" | ✅ Dog-appropriate |
| ASSERT: declawing | Present (cat-specific) | Absent (removed) | ✅ Correctly removed |
| DEFER: health | Lists "asthma, FIV, diabetes" | Two-case rule (assume good / surface documented) | ✅ Dog-specific rule |
| Examples | Cat examples (Puccini, Dean, Macy, Emma) | Dog examples (Cooper, Rocky, Daisy) | ✅ All dog-appropriate |
| Policy FAQ spay_vax_chip | "Cats come spayed/neutered..." | "Dogs come spayed/neutered..." | ✅ |
| Policy FAQ age_definitions | "Young cats are under 2 years..." | "Young dogs are under 2 years..." | ✅ |

ES prompt mirrors EN structure with all the same dog-specific elements in Spanish. [VERIFIED]

---

## Files Changed

```
server/src/server.ts                        | +171 -4
server/config/shelter-policy-faq-dog.json   | new (906 bytes)
server/config/shelter-policy-faq-dog-es.json | new (1105 bytes)
3 files changed, 175 insertions(+), 4 deletions(-)
```

Client files unchanged: `custom-search/index.html` and `custom-search/app.js` not in git diff. [VERIFIED]

---

## Dog Animals for John's Review

### EN query matches (active/friendly/kids/yard)
- **A2025114 — Rex** (Terrier mix, tan and white)
- **A2025088 — Achilles** (mixed breed, black and brown, 3 years)
- **A2024185 — Amari** (Havanese-Terrier mix, cream, good with kids/cats/dogs)

### ES query matches (calm/companion/lives alone)
- **S2024694 — Isis** (Terrier mix, ~9 years, calm temperament)
- **A2023267 — Cookie** (Pit Bull Terrier, 8+ years, loves people)
- **A2026061 — Clover** (Labrador Retriever mix, 5 years, moderate energy)

---

## Rollback

```bash
cd /home/shelter/shelter-apps && git revert 4cdd30c
cd server && npm run build && sudo -n systemctl restart shelter-app
```

Dog FAQ files remain on disk after revert (harmless — no code references them without the router). To fully clean: `rm server/config/shelter-policy-faq-dog*.json`.
