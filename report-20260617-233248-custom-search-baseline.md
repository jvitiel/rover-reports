# Custom-Search Pool Sizing & Baseline Capture — 2026-06-17

## TASK 1 — One-Gate Confirmation

### Filter chain (server.ts:4398–4423)

**Step 1 — Adoptable filter (server.ts:4398):**
```ts
const allAnimals = await fetchAnimals();
```
`fetchAnimals()` (shelterManagerService.ts:95) returns only `ADOPTABLE === 1` animals by default (line 132: `const availableAnimals = allAnimals.filter(a => a.isAvailable)`). This filter is upstream and unaffected by gate removal. [VERIFIED]

**Step 2 — Species filter (server.ts:4399):**
```ts
const cats = allAnimals.filter(a => (a.species || '').toLowerCase() === 'cat');
```
Only cats pass. Unaffected by gate removal. [VERIFIED]

**Step 3 — Sex + age hard filters (server.ts:4402–4408):**
```ts
const filtered = cats.filter(a => {
  const animalSex = (a.sex || '').toLowerCase();
  if (!sexLower.includes(animalSex)) return false;
  const bucket = deriveAgeGroup(a.ageInYears);
  if (ageLower.includes(bucket)) return true;
  return false;
});
```
`deriveAgeGroup` (server.ts:4213): young = <2yr, adult = 2–6yr, senior = 7+yr. Unaffected by gate removal. [VERIFIED]

**Step 4 — The behavior_notes gate (server.ts:4411):**
```ts
let withRecords = filtered.filter(a => getBehaviorNotesCount(a.shelterCode) > 0);
```
**This is the ONLY gate that would be removed.** [VERIFIED]

**Step 5 — Fallback (server.ts:4414–4435):**
If `withRecords.length < 3`, the fallback drops the age filter but keeps sex + behavior_notes gate:
```ts
const sameSexAllAges = cats.filter(a => {
  const animalSex = (a.sex || '').toLowerCase();
  return sexLower.includes(animalSex);
});
const fallbackWithRecords = sameSexAllAges.filter(a => getBehaviorNotesCount(a.shelterCode) > 0);
```
This fallback also has the notes gate and would also need modification. [VERIFIED]

### Confirmation

Removing the `getBehaviorNotesCount > 0` gate at line 4411 (and the parallel gate at line 4422 in the fallback path) changes **ONLY** the notes requirement. It does NOT admit:
- Non-adoptable animals (blocked by `fetchAnimals()` upstream) [VERIFIED]
- Non-cat species (blocked by species filter at line 4399) [VERIFIED]
- Animals outside requested sex/age (blocked by hard filters at lines 4402–4408) [VERIFIED]

**Remaining filters after gate removal:**
1. `ADOPTABLE === 1` (SM API level) — only adoptable animals
2. `species === 'cat'` — cats only
3. `sex ∈ selectedSexes` — user's sex filter
4. `deriveAgeGroup(age) ∈ selectedAges` — user's age filter

[VERIFIED]

---

## TASK 2 — Pool Sizing

Live query run against SM API + shelter.db at 2026-06-18 03:25 UTC.

| Metric | Count |
|--------|-------|
| **(a)** Total adoptable cats | **98** |
| **(b)** With ≥1 behavior_notes (matchable today) | **18** |
| **(c)** No notes but has SM description (newly exposed) | **4** |
| **(d)** Neither (base attributes only) | **76** |
| Sex breakdown | 51 male, 47 female |
| Worst-case pool (both sexes, all ages, gate removed) | **98** |

[VERIFIED — live SM API + sqlite3 query]

### Bucket (c) — SM-description-only cats (all 4):

| Shelter Code | Name | Sex | Age | SM Description (preview) |
|-------------|------|-----|-----|--------------------------|
| S20251236 | Blizzard | Male | 1y 11m | "Not meant to be a household pet, but would be a great barn cat." (63 chars) |
| S2023297 | Iron | Male | 7y 6m | "Iron found the shelter environment to stressful for him, he is front declaw and that makes him feel…" (270 chars) |
| R2024025 | Lucky | Male | 12y 10m | "Not meant to be a household pet, but would be a great barn cat." (63 chars) |
| S20241161 | Munster | Male | 4y 7m | "Not meant to be a household pet, but would be a great barn cat." (63 chars) |

Note: 3 of 4 have the identical barn-cat note. These are thin but meaningful signals — they indicate the animal is NOT suited for typical home placement. This is valuable context the AI should have. [VERIFIED]

### Bucket (d) — Neither (base attributes only): 76 cats

First 10 sample: Andrew (M, 2y), Basil (M, 12wk), Bobby (M, 8wk), Buddy (M, 15y), Cardinal (F, 11wk), Carol (F, 8wk), Catherine (F, 10wk), Catzilla (M, 13wk), Cheese Puff (F, 12wk), Cheshire (M, 11y). Many are kittens with no caregiver observations yet. [VERIFIED]

---

## TASK 3 — Baseline Capture

All queries run against `https://staff.4lgshelterapp.duckdns.org/api/matcher/custom-search` at 2026-06-18 ~03:26–03:30 UTC. All show `candidateCount: 18` (the 18 cats with behavior_notes). Gate is intact.

---

### Query 1 — Broad attribute, EN

**Request:**
```json
{
  "sex": ["male", "female"],
  "ageGroup": ["young", "adult", "senior"],
  "narrative": "I'd love a calm, affectionate lap cat for a quiet apartment."
}
```
URL: `POST /api/matcher/custom-search`

**Response time:** 19.2s

**Response:**
```json
{
  "matches": [
    {
      "shelter_code": "S2025966",
      "bio": "Abe is a handsome nine-and-a-half-year-old black and white gentleman who has been waiting a little too long for the right person to find him. He's a true lap cat — low energy, deeply affectionate, and the kind of cat who just wants to settle in beside you and stay there. His foster family calls him Baby Aby, and it suits him perfectly: he's social, easygoing, and genuinely happy to be wherever his people are. Abe does have diabetes, which means twice-daily insulin injections and a prescription diet, but his caregivers are emphatic that it's far simpler than it sounds — he's a patient, cooperative little guy who barely flinches. He came to us after his family was evicted, and he's bonded to his sister Edna, so the two of them would need to go home together — a package deal that doubles the sweetness. If a quiet, devoted companion (or two) sounds like exactly what your apartment needs, Abe and Edna would love to meet you.",
      "name": "Abe (Louie)",
      "sex": "Male",
      "age": "9 years 7 months.",
      "breed": "Domestic Short Hair"
    },
    {
      "shelter_code": "S20251008",
      "bio": "Edna is a beautiful white cat with soft black markings and a personality that is every bit as lovely as she looks. Mellow, affectionate, and genuinely at ease in the world, she's the kind of cat who makes a quiet home feel complete — happy to be near her people, easy to handle, and reliably gentle in every situation her foster family has put her in. Despite being nine and a half years old, she's got a playful, curious streak that has earned her the nickname Big Eddie from the family who fosters her. She came to the shelter after her family was evicted, and she's deeply bonded to her brother Abe, so the two would need to be adopted together — but for the right home, that's a gift, not a complication. Abe has diabetes that's easily managed with twice-daily insulin, and Edna has no medical concerns at all. If you have room in your heart and your apartment for a pair of devoted, calm, and loving senior cats, these two are ready to be your whole world. Come meet them.",
      "name": "Edna",
      "sex": "Female",
      "age": "9 years 7 months.",
      "breed": "Domestic Short Hair"
    },
    {
      "shelter_code": "W2026014",
      "bio": "Carlo Gambino is a sleek, all-black two-year-old with a heart of pure gold. Timid at first glance, he warms up quickly and becomes exactly what his caregiver describes: a lap cat through and through, the kind who will follow you from room to room just to be close. He loves being petted all over, doesn't mind being picked up, and has never met a person he didn't eventually adore. Carlo is FIV positive, which simply means he'll benefit from annual vet visits and does best as an only cat or with another FIV-positive companion — but since he is not an aggressive cat in the slightest, the risk to other animals is genuinely minimal, and shelter staff can walk you through everything in detail. For a quiet apartment and someone looking for a calm, devoted buddy who just wants to be loved, Carlo is a very compelling candidate. Give him a call.",
      "name": "Carlo Gambino",
      "sex": "Male",
      "age": "2 years 4 months.",
      "breed": "Domestic Short Hair"
    }
  ],
  "candidateCount": 18,
  "lowConfidence": false,
  "preamble": null
}
```

---

### Query 2 — Behavior-specific, EN

**Request:**
```json
{
  "sex": ["male", "female"],
  "ageGroup": ["young", "adult", "senior"],
  "narrative": "Looking for a playful, energetic cat that's good with young kids and other cats."
}
```

**Response time:** 21.2s

**Response:**
```json
{
  "matches": [
    {
      "shelter_code": "S2026047",
      "bio": "Buckley is a gorgeous, fluffy grey tabby with long silky fur, fuzzy paws, and striking green-gold eyes — the kind of cat that makes people stop and stare. He has a playful side that comes out in full force with wand toys and catnip, and when he gets the zoomies, he really commits. He's outgoing with new faces and loves to cuddle with the people he trusts, offering head bumps and the occasional enthusiastic lick. Buckley does best with patient, experienced cat owners who understand that he has his limits — he can get overstimulated more easily than most, and he's not a fan of being picked up, so he'd thrive in a calm, gentle household. He's lived with other cats and can do well with the right feline companion. Because he gets overwhelmed by a lot of commotion, he'd be happiest in a home with older or very calm children rather than busy young ones — just something to keep in mind as you picture him settling in. If you're a cat person who loves a cat with personality and a little bit of mystery, Buckley might be exactly your match — come meet him and see for yourself.",
      "name": "Buckley",
      "sex": "Male",
      "age": "2 years 0 months.",
      "breed": "Domestic Long Hair"
    },
    {
      "shelter_code": "S2026268",
      "bio": "Juliet is a sleek, all-black beauty with just a few wispy white hairs on her chest — a tiny detail that makes her completely one of a kind. She's a mellow, sweet, and gentle girl who has lived with a houseful of cats before and genuinely enjoys feline company; another cat in the home might even help bring her out of her shell. She's calm and easy to handle — you can touch her anywhere without fuss — and she carries herself with a quiet, docile grace that's hard not to fall for. Juliet is on the reserved side, so she takes a little time to build trust, but there's nothing nervous or jumpy about her — she just does things on her own terms. She'd do best with older, calmer children rather than very young kids who might overwhelm her gentle nature, so that's worth considering for your household. No medical concerns, perfect litter box habits, and a whole lot of quiet sweetness waiting to unfold — Juliet is ready for someone patient enough to let her show them who she really is. Give the shelter a call and come say hello.",
      "name": "Juliet",
      "sex": "Female",
      "age": "1 year 9 months.",
      "breed": "Domestic Short Hair"
    },
    {
      "shelter_code": "W2026014",
      "bio": "Carlo Gambino is a velvety, all-black two-year-old with the soul of a devoted companion — all he wants is to be near you, petted, and loved. He's a calm, gentle boy who leans into affection from everyone he meets, doesn't mind being picked up, and has real lap cat written all over him. He's good with other cats and has never shown an ounce of aggression, which makes him an easy, low-drama addition to a multi-cat home. Carlo is FIV positive, which simply means he'll need annual vet visits and is best kept indoors — since he's not an aggressive cat at all, the risk of transmission to other cats is very low, and shelter staff can walk you through everything when you visit. He's a patient, easygoing guy who would likely do just fine with children, too — he's not easily rattled and takes most things in stride. If you're looking for a sweet, loyal shadow of a cat who will follow you from room to room and purr the whole way, Carlo Gambino is your guy — call the shelter and come meet him.",
      "name": "Carlo Gambino",
      "sex": "Male",
      "age": "2 years 4 months.",
      "breed": "Domestic Short Hair"
    }
  ],
  "candidateCount": 18,
  "lowConfidence": false,
  "preamble": null
}
```

---

### Query 3 — Hard-attribute, EN

**Request:**
```json
{
  "sex": ["male", "female"],
  "ageGroup": ["young", "adult", "senior"],
  "narrative": "I want a young black cat, FIV-negative."
}
```

**Response time:** 23.3s

**Response:**
```json
{
  "matches": [
    {
      "shelter_code": "S2026268",
      "bio": "Juliet is a gorgeous, all-black girl with just a whisper of white hairs on her chest — a tiny detail that makes her completely one of a kind. At under two years old, she's still very much in the early chapters of her life, and she has a calm, gentle quality that's immediately disarming. She's not the cat who'll barrel out the door demanding attention, but she's not shy in a fearful way either — she's simply a cat who takes her time, builds trust on her own terms, and rewards patience with steady, quiet companionship. She has lived with other cats and would genuinely enjoy their company, and she's perfectly comfortable being handled from head to tail. Juliet is FIV-negative and has no medical or behavioral concerns whatsoever. If you're looking for a serene, beautiful black cat who will gradually reveal just how sweet she really is, Juliet is absolutely worth a visit — give us a call and come meet her.",
      "name": "Juliet",
      "sex": "Female",
      "age": "1 year 9 months.",
      "breed": "Domestic Short Hair"
    },
    {
      "shelter_code": "W2026014",
      "bio": "Carlo Gambino is a sleek, stunning two-year-old black cat with the kind of face that makes you stop and look twice — all smooth dark fur and soulful eyes. He is, without question, a lover: all he wants is to be near you, petted, and adored, and he will follow you around like a devoted shadow to make sure that happens. He's calm, he's gentle, he doesn't startle easily, and he genuinely doesn't mind being picked up. One thing worth knowing: Carlo is FIV-positive, which you mentioned you'd prefer to avoid. FIV is manageable with routine annual vet care and does not affect his day-to-day quality of life — he's healthy, happy, and thriving — but if FIV-negative is a firm requirement for your situation, shelter staff can talk through what that means in practice and help you decide. Carlo is the kind of cat who makes people fall in love the moment they meet him, and if you have the time and the lap for a devoted companion, he is absolutely worth a conversation.",
      "name": "Carlo Gambino",
      "sex": "Male",
      "age": "2 years 4 months.",
      "breed": "Domestic Short Hair"
    },
    {
      "shelter_code": "W2025068",
      "bio": "Dean is a sleek black cat with a small patch of white on his chest and an enormous personality to match — playful, cuddly, clingy in the best possible way, and genuinely enthusiastic about the humans in his life. He loves to climb on you, give hugs, and make sure you know he's there. At nearly three years old, he's past the kitten stage but still has tremendous energy and many, many years ahead of him. One note: like Carlo, Dean is FIV-positive, which you mentioned you'd prefer to avoid. His FIV is well-managed with annual vet visits, and the shelter team can walk you through what that looks like day-to-day. He also has a natural tendency to sneeze — just a quirky little trait of his, nothing serious. If you're open to hearing more, Dean is one of those cats the caregivers rave about, and it's easy to see why — he's just a genuinely wonderful boy who deserves a home to pour all that love into.",
      "name": "Dean",
      "sex": "Male",
      "age": "2 years 10 months.",
      "breed": "Domestic Short Hair"
    }
  ],
  "candidateCount": 18,
  "lowConfidence": true,
  "preamble": "You asked for a young, FIV-negative black cat, and while we do have some wonderful black cats available, the closest matches don't fully line up — the young black cats in our current inventory are FIV-positive, and our FIV-negative cats skew older or aren't solid black. These are the three best fits we could find given what's available right now; feel free to call us at (845) 414-9700 to ask about other options or upcoming arrivals."
}
```

---

### Query 4 — Inventory-mismatch probe, EN

**Request:**
```json
{
  "sex": ["male", "female"],
  "ageGroup": ["young", "adult", "senior"],
  "narrative": "I want a hairless Sphynx that can fetch."
}
```

**Response time:** 22.7s

**Response:**
```json
{
  "matches": [
    {
      "shelter_code": "W2025068",
      "bio": "Dean is the kind of cat who makes you feel like the most important person in the room the moment you walk in. This sleek, mostly black boy with a small white patch on his chest is medium-to-high energy, deeply affectionate, and the type who will climb right onto you and demand to be part of whatever you're doing — hugs, kisses, and all. He was born in a colony but raised with so much human care that he became genuinely social and trusting, and that warmth shows in every interaction. He's playful and engaged, and his clingy, interactive nature makes him the kind of cat who just might surprise you with how game he is for a little back-and-forth play. Dean is not a Sphynx — he's a short-haired domestic with a full coat — and we can't promise he'll fetch on command, but his energy and people-first personality put him in the right spirit. He is FIV positive, which simply means annual vet visits and indoor living. Come meet Dean and see for yourself what all the fuss is about — his caregivers are pretty smitten.",
      "name": "Dean",
      "sex": "Male",
      "age": "2 years 10 months.",
      "breed": "Domestic Short Hair"
    },
    {
      "shelter_code": "S2026047",
      "bio": "Buckley is a gorgeous, fluffy gray tabby with striking green-gold eyes and the kind of paws that look like they belong in a cloud. He's a cat of contrasts — lower energy at baseline, but give him a wand toy or a sprinkle of catnip and he'll treat you to a full case of the zoomies that will absolutely make your day. He loves to play, loves to be petted, and has a cuddly, licky side that comes out beautifully once he trusts you. Buckley is a longhaired domestic, not a Sphynx, and while he has a playful streak, he does best with patient, experienced cat owners who understand that he can get overstimulated and has his own very specific limits around handling. He's not a fetch cat in any documented sense, but his toy-driven enthusiasm and interactive energy make him a genuinely fun companion for someone who enjoys engaging with their cat. If you're open to a cat who'll keep you on your toes in a different way, Buckley is very much worth a visit.",
      "name": "Buckley",
      "sex": "Male",
      "age": "2 years 0 months.",
      "breed": "Domestic Long Hair"
    },
    {
      "shelter_code": "W2026014",
      "bio": "Carlo Gambino has a name that suggests he runs things, and honestly, he kind of does — he runs straight toward anyone willing to give him a scratch and doesn't stop until he's fully in your lap. This sweet, calm, all-black two-year-old is a lover through and through: he'll follow you around, soak up every pet, and settle in like he's been waiting for you his whole life. He's playful when the mood strikes, and his affectionate, velcro-cat energy makes him the kind of companion who's always in the mix. Carlo is a short-haired domestic, not a Sphynx, and while fetch isn't something we've noted for him, his people-first personality and gentle curiosity make him a natural candidate for a cat who might just surprise you. He is FIV positive, which is well-managed with annual vet care and keeping him indoors. Carlo deserves someone who just wants a buddy — and if that sounds like you, he's ready to make it official.",
      "name": "Carlo Gambino",
      "sex": "Male",
      "age": "2 years 4 months.",
      "breed": "Domestic Short Hair"
    }
  ],
  "candidateCount": 18,
  "lowConfidence": true,
  "preamble": "None of the cats currently available are Sphynx cats, and teaching fetch is more of an individual personality trait than something we can predict with certainty — so these three are the closest matches we have in terms of playful, people-loving energy. They're wonderful cats, but we wanted to be upfront that they're not the hairless Sphynx you described. If a Sphynx is truly your heart's desire, give us a call at (845) 414-9700 and we can let you know if one comes through our doors."
}
```

---

### Query 5 — Spanish

**Request:**
```json
{
  "sex": ["male", "female"],
  "ageGroup": ["young", "adult", "senior"],
  "narrative": "Busco un gato tranquilo y cariñoso para un apartamento pequeño."
}
```
URL: `POST /api/matcher/custom-search?lang=es`

**Response time:** 19.9s

**Response:**
```json
{
  "matches": [
    {
      "shelter_code": "S2026028",
      "bio": "Macy es un gato tabby de color naranja rojizo con una personalidad tan dulce como su apariencia. A sus siete años, ya pasó la etapa de explorador inquieto y ahora vive para algo mucho más sencillo y satisfactorio: recibir caricias. Le encanta que lo mimen, y aunque al principio puede mostrarse un poco tímido cuando alguien se acerca, en cuanto confía en ti se convierte en un compañero tranquilo y agradecido. No es de los que necesitan grandes espacios ni entretenimiento constante — Macy está perfectamente feliz en un ambiente íntimo donde pueda relajarse y recibir toda tu atención. Para alguien que busca un gato de bajo mantenimiento y mucho corazón, Macy podría ser exactamente lo que estás imaginando. Nuestros registros de búsqueda no señalan problemas de salud para Macy — el personal del refugio podrá darte el panorama completo cuando visites. Ven a conocerlo; creemos que la conexión va a ser inmediata.",
      "name": "Macy",
      "sex": "Male",
      "age": "7 years 5 months.",
      "breed": "Domestic Short Hair"
    },
    {
      "shelter_code": "S2025883",
      "bio": "Reeboks es un gato naranja tabby de pelo mediano con una presencia verdaderamente majestuosa — el tipo de gato que llena una habitación simplemente por cómo se sienta. Con más de diez años de vida, su energía es baja y su carácter es profundamente tranquilo: le encanta la calma, disfruta de la compañía serena de las personas y se adapta muy bien a vivir en un ambiente íntimo. Llegó al refugio tras perder a su dueño, junto a varios de sus compañeros felinos, y ahora está en un hogar de acogida donde convive sin drama con otro gato y un perrito pequeño — lo que habla muy bien de su temperamento apacible. No tiene problemas de salud conocidos, y para alguien que busca un compañero de sofá elegante y afectuoso, Reeboks tiene mucho que ofrecer. Llama al refugio y agenda una visita para conocerlo en persona.",
      "name": "Reeboks",
      "sex": "Male",
      "age": "10 years 8 months.",
      "breed": "Domestic Medium Hair"
    },
    {
      "shelter_code": "S2026268",
      "bio": "Juliet es una gata negra de casi dos años, joven pero con una personalidad sorprendentemente madura y serena. Es dulce, dócil y mellow — esa es la palabra que mejor la describe. No es de las que llena el apartamento de caos; prefiere observar, confiar despacio y, una vez que se siente segura, ser una compañía genuinamente tranquila. Llegó al refugio tras una situación familiar complicada, pero no tiene ningún problema médico ni de comportamiento, y se maneja perfectamente con el arenero y con otras personas. En un apartamento pequeño y silencioso, Juliet podría florecer de una manera que en el refugio todavía no ha podido mostrar del todo. Es el tipo de gata que te recompensa con calma y cariño a quienes le dan el espacio y la paciencia que merece. Pasa a conocerla — creemos que te va a sorprender.",
      "name": "Juliet",
      "sex": "Female",
      "age": "1 year 9 months.",
      "breed": "Domestic Short Hair"
    }
  ],
  "candidateCount": 18,
  "lowConfidence": false,
  "preamble": null
}
```

---

## Baseline Summary Table

| Query | Matches (shelter_codes) | lowConfidence | preamble | Time |
|-------|------------------------|---------------|----------|------|
| 1. Calm lap cat (EN) | S2025966, S20251008, W2026014 | false | null | 19.2s |
| 2. Playful + kids + cats (EN) | S2026047, S2026268, W2026014 | false | null | 21.2s |
| 3. Young black FIV-neg (EN) | S2026268, W2026014, W2025068 | **true** | inventory gap note | 23.3s |
| 4. Sphynx fetch (EN) | W2025068, S2026047, W2026014 | **true** | breed mismatch note | 22.7s |
| 5. Gato tranquilo (ES) | S2026028, S2025883, S2026268 | false | null | 19.9s |

All queries: `candidateCount: 18`. All drew from the same 18-cat pool with behavior_notes. [VERIFIED]

### SM-description-only cats to watch post-change

These 4 cats have SM descriptions but no behavior_notes — after gate removal they should become matchable:

| Shelter Code | Name | Sex | Age | SM Description |
|-------------|------|-----|-----|----------------|
| **S20251236** | Blizzard | Male | 1y 11m | "Not meant to be a household pet, but would be a great barn cat." |
| **S2023297** | Iron | Male | 7y 6m | "Iron found the shelter environment to stressful for him, he is front declaw..." |
| **R2024025** | Lucky | Male | 12y 10m | "Not meant to be a household pet, but would be a great barn cat." |
| **S20241161** | Munster | Male | 4y 7m | "Not meant to be a household pet, but would be a great barn cat." |

Post-change verification: re-run the same 5 queries. `candidateCount` should jump from 18 to 98. These 4 shelter codes should appear as matchable candidates (though the barn-cat description should cause the AI to avoid matching them to apartment/home queries). [VERIFIED — codes and descriptions confirmed from live SM API]
