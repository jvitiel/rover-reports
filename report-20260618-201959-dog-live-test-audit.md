# Dog Live Test + Selection Audit

**Date:** 2026-06-18 20:19 ET  
**Production modified:** NO. Read-only. [VERIFIED]

---

## Q1 — EN Normal: "medium-energy, good with kids and other dogs"

**Filters:** sex: male+female, ageGroup: young+adult  
**Candidate pool:** 29 dogs [VERIFIED]  
**low_confidence:** false | **preamble:** null

### Match 1: Achilles (A2025088) — Mixed Breed, Male, 3 years

**Bio:** "Achilles is the kind of dog who fills a house with energy and laughter — a handsome black-and-brown mixed breed with bright eyes and a goofy, lovable personality that's hard to resist. At three years old, he's got plenty of enthusiasm to spare, and he channels it beautifully: he's crate trained, housebroken, knows his basic commands, and walks nicely on a leash, so all that exuberance comes with some real polish. He does well with other dogs given a proper meet and greet, making him a great candidate for a multi-dog home. Because of his size and big personality, he tends to do best with older kids or teens who can match his playful spirit — families with younger children may want to keep that in mind. He came to the shelter as a stray, picked up by police, and never reclaimed, which means he's ready to pour all that loyalty into someone who will finally call him theirs. If you're looking for a devoted companion who will make every day a little more fun, Achilles is absolutely worth a visit."

**Claim-by-claim audit:**

| Claim in bio | Source data | Verdict |
|---|---|---|
| "black-and-brown mixed breed" | Color: "Black and Brown", Breed: "Mixed Breed" | ✅ SUPPORTED |
| "bright eyes" | BN.specialFeatures: "Very bright eyes and a beautiful smile" | ✅ SUPPORTED |
| "goofy, lovable personality" | SM desc: "goofy antics and boundless energy" | ✅ SUPPORTED |
| "three years old" | Age: "3 years 0 months" | ✅ SUPPORTED |
| "crate trained" | SM desc: "He's crate trained" | ✅ SUPPORTED |
| "housebroken" | SM desc: "housebroken" | ✅ SUPPORTED |
| "knows his basic commands" | SM desc: "knows basic obedience commands" | ✅ SUPPORTED |
| "walks nicely on a leash" | SM desc: "walks nicely on a leash" | ✅ SUPPORTED |
| "does well with other dogs given a proper meet and greet" | BN.goodWithDogs: "Can be good with other dogs, will require a meet and greet" | ✅ SUPPORTED |
| "best with older kids or teens" | BN.goodWithKids: "Good with kids, but better with older kids due to size and energy" | ✅ SUPPORTED |
| "came to the shelter as a stray, picked up by police" | BN.backstory: "Comes as a stray, picked up by the police" | ✅ SUPPORTED |

**Fabrication check: ZERO fabrications.** Every substantive claim has direct source support. [VERIFIED]

**Adopter alignment note:** Adopter asked for "medium-energy" — Achilles is "very energetic" (BN.energyLevel). The bio acknowledges "plenty of enthusiasm" and "exuberance" rather than misrepresenting him as medium-energy. Honest framing. However, the bio does NOT explicitly flag the energy mismatch the way the gap-acknowledgment rule intends (adopter said "medium-energy," Achilles is high-energy, no "he's a bit more energetic than the medium level you mentioned" line). [INFERRED — minor gap-acknowledgment miss, not fabrication]

---

### Match 2: Amari (A2024185) — Havanese/Terrier, Female, 3 years

**Bio:** "Amari is a sweet, cream-colored Havanese-Terrier mix with a gentle soul and a quiet kind of charm... She's a medium-energy girl — happy to be active but equally content to settle in... She's wonderful with kids and absolutely loves other dogs... she would truly thrive in a home where another dog is already part of the family... She does take a little time to warm up to new people... she was found living as a stray and took two full days to safely trap... she'll need a securely fenced yard and a leash at all times outdoors..."

| Claim | Source | Verdict |
|---|---|---|
| "cream-colored" | Color: "Cream" | ✅ SUPPORTED |
| "Havanese-Terrier mix" | Breed: "Havanese/Terrier" | ✅ SUPPORTED |
| "medium-energy" | BN.energyLevel: "Medium energy level" | ✅ SUPPORTED |
| "wonderful with kids" | BN.goodWithKids: "Good with kids" / _match: "yes" | ✅ SUPPORTED |
| "absolutely loves other dogs" | BN.goodWithDogs: "Very good with other dogs" / _match: "yes" | ✅ SUPPORTED |
| "needs another dog for confidence" | BN.goodWithDogs_text: "needs another dog for confidence" | ✅ SUPPORTED |
| "takes time to warm up" | BN.peopleReaction: "Good with people, but needs time to warm up" | ✅ SUPPORTED |
| "found as a stray, took two days to trap" | BN.backstory: "Found on the streets, took two days to trap her" | ✅ SUPPORTED |
| "securely fenced yard and leash" | BN.specialNeeds: "May be a flight risk, needs secure environment" | ✅ SUPPORTED |

**Fabrication check: ZERO fabrications.** [VERIFIED]

---

### Match 3: Rex (A2025114) — Terrier/Mixed Breed, Male, ~6 years

**Bio:** "Rex is a tan-and-white terrier mix... big, soulful eyes and distinctive markings... loves long walks and has the stamina for a good hike... equally happy playing fetch... He's great with other dogs... wonderful with people of all ages... a calm introduction before diving into friendship... dealing with significant skin issues, but those have fully cleared up... doesn't know yet whether he's good with cats... the shelter can arrange a test introduction..."

| Claim | Source | Verdict |
|---|---|---|
| "tan-and-white terrier mix" | Color: "Tan", Breed: "Terrier/Mixed Breed" | ✅ SUPPORTED |
| "big, soulful eyes and distinctive markings" | BN.specialFeatures: "Beautiful big eyes, distinctive marks" | ✅ SUPPORTED |
| "loves long walks" / "hike" | BN.energyLevel: "High energy, loves fetch and long walks" / additionalNotes: "enjoys hikes" | ✅ SUPPORTED |
| "playing fetch" | BN: "loves fetch" | ✅ SUPPORTED |
| "great with other dogs" | BN.goodWithDogs: "Great with other dogs" / _match: "yes" | ✅ SUPPORTED |
| "wonderful with people of all ages" | BN.goodWithKids: "Loves all people, shapes, sizes" / _match: "yes" | ✅ SUPPORTED |
| "calm introduction" | BN.peopleReaction: "Great with people, but needs slow introduction" | ✅ SUPPORTED |
| "skin issues fully cleared up" | BN.specialNeeds: "None currently, past skin issues cleared up" | ✅ SUPPORTED |
| "doesn't know about cats, can test" | BN.goodWithCats: "Not tested with cats, can be tested if needed" | ✅ SUPPORTED |

**Fabrication check: ZERO fabrications.** [VERIFIED]

**Energy mismatch note:** Same as Achilles — Rex is high-energy, adopter asked for medium-energy. Bio frames Rex as "loves long walks" and "enthusiastic" without explicitly flagging the mismatch. [INFERRED]

---

### Selection defensibility — Q1 rejected dogs

Of 26 rejected dogs, **6 have behavior profiles** and **20 have no profile** (SM description only or stock template).

| Rejected dog | Profile? | Why the 3 picks are defensible over it |
|---|---|---|
| Bailey (S2024718) | YES | High energy, but goodWithKids: **no** — disqualifying for "good with kids" ask |
| Clover (A2026061) | YES | Medium energy (good), but goodWithKids: "somewhat", goodWithDogs: **unknown** — weaker signal than Amari/Achilles |
| Scottie (S2025131) | YES | High energy, goodWithKids: **no**, needs days of ignore-period — disqualifying |
| Mikey (S2026560) | YES | High energy, goodWithKids: **unknown**, goodWithDogs: yes — no kids signal |
| Nena (S2026079) | YES | High energy, goodWithKids: **unknown** — no kids signal |
| Oreo (S2026031) | YES | All axes "unknown" — zero behavioral signal |

**20 no-profile dogs** (Bolt, Duke, Nanook, etc.): The model correctly ranked profiled dogs with documented evidence above stock-template dogs. No personality was fabricated for the no-profile dogs. [VERIFIED]

**Verdict: Selection is defensible.** The 3 picks are the strongest matches for "good with kids and other dogs" from the profiled pool. Bailey and Scottie (both goodWithKids: no) were correctly excluded. Clover was a reasonable near-miss but lacked dogs-compatibility signal. [VERIFIED]

---

## Q2 — ES Normal: "tranquilo y cariñoso, bueno con niños"

**Filters:** sex: male+female, ageGroup: young+adult+senior  
**Candidate pool:** 39 dogs [VERIFIED]  
**low_confidence:** false | **preamble:** null

### Match 1: Abstract (S2026133) — Terrier/Mixed Breed, Male, 8 years

**Bio (ES):** "Abstract es el tipo de perro que llena una casa de calma y ternura... mestizo de ocho años tiene modales impecables con la correa, está entrenado para el cajón, y es completamente limpio en casa... Ha convivido con niños y adolescentes y se lleva bien con otros perros... es uno de los perros más fáciles del refugio... tiene incluso un peluche favorito... necesita una alimentación hidrolizada especial para mantener su piel sana... luce radiante..."

| Claim | Source | Verdict |
|---|---|---|
| "ocho años" | Age: "8 years 3 months" | ✅ SUPPORTED |
| "modales impecables con la correa" (leash manners) | BN: "great leash manners, walks really nicely" | ✅ SUPPORTED |
| "entrenado para el cajón" (crate trained) | BN: "crate trained" | ✅ SUPPORTED |
| "completamente limpio en casa" (housebroken) | BN: "housebroken" | ✅ SUPPORTED |
| "convivido con niños y adolescentes" | BN.goodWithKids: "Lived with kids and teens before" / _match: "yes" | ✅ SUPPORTED |
| "se lleva bien con otros perros" | BN.goodWithDogs: "Good with other dogs" / _match: "yes" | ✅ SUPPORTED |
| "peluche favorito" (stuffed animal) | BN.additionalNotes: "has a special stuffed animal" | ✅ SUPPORTED |
| "staff washing it" | BN raw transcript: "staff have been washing" | ✅ SUPPORTED |
| "alimentación hidrolizada" (hydrolyzed food) | BN.specialNeeds: "Needs to be on hydrolyzed food for food sensitivities" | ✅ SUPPORTED |
| "piel sana, luce radiante" (skin healed) | BN raw: "skin is healed, looks amazing" | ✅ SUPPORTED |
| "perros más fáciles" (easiest dogs) | BN raw: "one of our easiest dogs" | ✅ SUPPORTED |

**Fabrication check: ZERO fabrications.** [VERIFIED]

**Health condition surfacing:** Abstract's hydrolyzed food requirement is a documented health condition. The bio surfaces it honestly, framed positively ("en este momento luce radiante"), per the dog DEFER rule case (2). ✅ [VERIFIED]

---

### Match 2: Donny (S2026134) — Basenji/Shepherd, Male, 16 years

**Bio (ES):** "Donny es la definición de un alma apacible... mix de Basenji y Pastor de 16 años... conoce comandos básicos como sentarse... energía serena... paseos largos... viajes en coche y las siestas con su peluche de cocodrilo favorito... entregado al refugio cuando su familia fue desalojada... mejor como mascota única... análisis de sangre recientes que muestran buena salud... limpieza dental reciente..."

| Claim | Source | Verdict |
|---|---|---|
| "16 años" | Age: "16 years 3 months" | ✅ SUPPORTED |
| "Basenji y Pastor" | Breed: "Basenji/Shepherd" | ✅ SUPPORTED |
| "comandos básicos como sentarse" (sit) | BN.additionalNotes: "knows basic obedience like sit" | ✅ SUPPORTED |
| "paseos largos" (long walks) | BN.energyLevel: "enjoys longer strolls" | ✅ SUPPORTED |
| "viajes en coche" (car rides) | BN raw: "likes the car ride" | ✅ SUPPORTED |
| "peluche de cocodrilo" (stuffed alligator) | BN raw: "sleeps in his bed with his favorite alligator stuffed animal" | ✅ SUPPORTED |
| "familia fue desalojada" (family evicted) | BN.backstory: "Surrendered after family was evicted" | ✅ SUPPORTED |
| "mejor como mascota única" (only pet) | BN.goodWithDogs: "best as an only pet now" | ✅ SUPPORTED |
| "análisis de sangre" (bloodwork) | SM desc: "recent bloodwork" | ⚠️ UNCERTAIN — SM desc mentions this but NOT in behavior notes. SM desc IS available as Phase-2 input. |
| "limpieza dental" (dental cleaning) | SM desc: "fresh dental cleaning" | ⚠️ UNCERTAIN — same source as above |
| "convivido con niños mayores y adolescentes" | BN.goodWithKids: "Lived with older kids and teens in the past" | ✅ SUPPORTED |

**Fabrication check: NO fabrications.** The bloodwork and dental claims trace to the SM description, which IS provided to Phase-2 as "Shelter notes" in the user message. [VERIFIED]

---

### Match 3: Amari (A2024185) — Havanese/Terrier, Female, 3 years

Already fully audited in Q1. Same claims, same verdicts. **ZERO fabrications.** [VERIFIED]

### Selection defensibility — Q2

Q2 pool is 39 dogs (all ages). Abstract (calm, documented kids, low energy) and Donny (mellow, lived with kids, senior calm) are strong matches for "tranquilo y cariñoso, bueno con niños." Amari (medium energy, good with kids) is a reasonable third pick. The rejected Cookie (no behavior profile, 4 years in shelter) lacks profiled calm/kids evidence. [VERIFIED]

---

## Q3 — EN Mismatch: "hypoallergenic show poodle, fully trained"

**Candidate pool:** 39 dogs  
**low_confidence:** **true** ✅ [VERIFIED]

**Preamble:** "The closest matches in our current inventory are three small dogs — a Maltese mix, a Maltese/Poodle mix, and a Havanese/Terrier mix — none of whom are poodles or show-trained, so these are quite a distance from what you described. We'd encourage you to call us at (845) 414-9700 to ask about upcoming intakes or other options that might be a closer fit."

✅ **Correctly flags no hypoallergenic show poodle available.** Does not pretend a match. Acknowledges distance from request. Includes phone number. [VERIFIED]

**Returned dogs:**
- Scottie (S2025131) — Maltese/Poodle mix. Real dog, in pool. Bio honestly says "He's not the show poodle you had in mind." ✅
- Amari (A2024185) — Havanese/Terrier. Real dog, in pool. Bio says "not a poodle and comes without show training." ✅
- Marshmallow (A2025203) — Maltese/Mixed Breed. Real dog, in pool. Bio says "He's not a poodle and is well past the trained-from-scratch stage." ✅

**All three are real dogs from the pool.** Selection is sensible — picked the most poodle-adjacent breeds available. [VERIFIED]

**Marshmallow health condition (DEFER rule case 2):** Marshmallow has documented Cushing's disease in his profile (`specialNeeds: "Cushing's disease, marking problem managed with a diaper"`). Bio surfaces it: "He does have Cushing's disease, currently managed with daily medication (a blueberry does the trick), and he wears a diaper to handle some marking." The blueberry detail comes from raw transcript: "hide pills in blueberries." **Health condition surfaced honestly, framed positively, regardless of whether the adopter asked about health.** This is exactly what the dog DEFER rule case (2) requires. ✅ [VERIFIED]

---

## Q4 — EN Policy: "Do dogs come neutered and vaccinated?"

**Candidate pool:** 39 dogs  
**low_confidence:** false

**Preamble:** "Great news — all dogs come spayed/neutered, fully vaccinated, and microchipped at adoption. We think you'll love meeting the three calm, older dogs we've highlighted below."

✅ **Uses DOG spay_vax_chip FAQ line** — "all dogs come spayed/neutered, fully vaccinated, and microchipped at adoption" — NOT the cat line ("Cats come spayed/neutered..."). [VERIFIED]

✅ **Only addresses what was asked** (spay/neuter + vaccination status). Does not add unsolicited policy info. [VERIFIED]

**Returned dogs:** Donny (S2026134, 16 yrs), Abstract (S2026133, 8 yrs), Cookie (A2023267, 8 yrs) — all calm/older dogs matching "calm older dog" ask. [VERIFIED]

---

## Cross-Query Checks

### Cat-isms
Searched all 12 bios (Q1–Q4) for: "kitten", "feline", "declaw", "litter box", "cat" (as species noun), "gato" (in EN bios).

**Result: ZERO cat-isms found across all 12 bios.** [VERIFIED]

### Pronoun usage (he/she vs "them")
| Dog | Sex | Pronoun used | Correct? |
|---|---|---|---|
| Achilles | Male | "he", "his" | ✅ |
| Amari | Female | "she", "her" | ✅ |
| Rex | Male | "he", "his" | ✅ |
| Abstract | Male | "he", "his" | ✅ |
| Donny | Male | "he", "his" | ✅ |
| Cookie | Female | "she", "her" | ✅ |
| Scottie | Male | "he", "him" | ✅ |
| Marshmallow | Male | "he", "his" | ✅ |

**No "them" for individual dogs.** All gendered correctly. [VERIFIED]

### Documented health conditions surfaced
| Dog | Health condition in source | Surfaced in bio? | Per DEFER rule? |
|---|---|---|---|
| Abstract (S2026133) | Hydrolyzed food for skin/food sensitivity | ✅ Yes (Q2, Q4) | Case (2): surfaced regardless of adopter ask ✅ |
| Marshmallow (A2025203) | Cushing's disease + marking/diaper | ✅ Yes (Q3) | Case (2): surfaced regardless of adopter ask ✅ |
| Rex (A2025114) | Past skin issues, now cleared | ✅ Yes (Q1) | Cleared condition noted honestly ✅ |

**All documented health conditions surfaced.** No omissions. [VERIFIED]

---

## Summary Scorecard

| Metric | Result |
|---|---|
| **Fabrications (Q1+Q2 combined, ~30 claims audited)** | **0 fabrications** |
| **Cat-isms (12 bios)** | **0 found** |
| **Pronoun errors** | **0 — all he/she correct** |
| **Q3 low_confidence** | **true — correct** |
| **Q3 preamble honesty** | **Acknowledged no poodle/show-trained — correct** |
| **Q4 policy line** | **Dog FAQ used — correct** |
| **Q4 scope** | **Only answered what was asked — correct** |
| **Health conditions surfaced** | **3/3 — all documented conditions surfaced** |
| **Stock-template dogs favored** | **No — profiled dogs ranked above no-signal dogs** |
| **Energy mismatch flagged (Q1)** | **Partial — high energy acknowledged but not explicitly called out as different from "medium" ask** |

### One minor finding

**Energy gap-acknowledgment:** In Q1, the adopter asked for "medium-energy." Achilles (high) and Rex (high) were selected and described accurately as energetic, but neither bio explicitly flags the mismatch ("he's a bit higher energy than the medium level you described"). The gap-acknowledgment rule says to "acknowledge the gap briefly" when an attribute doesn't match. The model implicitly let the description convey the mismatch rather than calling it out. This is a soft miss — the bios are honest (they don't claim "medium energy") but don't explicitly acknowledge the gap per the prompt's rule.

**This is a prompt-tuning question, not a code bug.** The selection is partly defensible because Amari IS medium-energy, and the adopter's "medium-energy" may be interpreted as a soft preference rather than a hard filter. But if you want stricter gap-acknowledgment, the Phase-1 or Phase-2 prompt could be strengthened for energy-level mismatches.
