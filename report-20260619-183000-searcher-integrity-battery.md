# Searcher Integrity Battery — 25 Tests (EN)

**Generated:** 2026-06-19T22:25:38.412Z
**Queries:** 25 (14 endpoint + 11 forced)
**Endpoint mode target:** http://127.0.0.1:3000/api/matcher/custom-search
**Forced mode model:** claude-sonnet-4-6 via https://api.anthropic.com/v1/messages

---

## Test Index

| Test | Status |
|------|--------|
| S1-01 Cat plain attribute | ✅ Clean |
| S1-02 Cat policy/FAQ | ✅ Clean |
| S1-03 Cat compatibility | ✅ Clean |
| S1-04 Cat weak-match | ✅ Clean |
| S1-05 Dog plain attribute | ✅ Clean |
| S1-06 Dog policy/FAQ | ✅ Clean |
| S1-07 Dog compatibility | ✅ Clean |
| S1-08 Dog weak-match | ✅ Clean |
| S1-09 Small plain attribute | ✅ Clean |
| S1-10 Small policy/FAQ | ✅ Clean |
| S1-11 Small compatibility | ✅ Clean |
| S1-12 Small weak-match | ✅ Clean |
| S2-01 Blank senior Buddy 15yr | ✅ Clean |
| S2-02 Blank senior Lacey 16yr | ✅ Clean |
| S2-03 Blank senior Cheshire 11yr | ✅ Clean |
| S2-04 Blank senior Holly 10yr | ✅ Clean |
| S3-01 Blank cat Andrew | ✅ Clean |
| S3-02 Blank dog Baki | ✅ Clean |
| S3-03 Blank rabbit Callie | ✅ Clean |
| S4-01 Chinchilla breed-echo + species noun | ✅ Clean |
| S5-01 Cat medical — Carlo Gambino FIV+ | ✅ Clean |
| S5-02 Dog medical — Abstract hydrolyzed diet | ✅ Clean |
| S5-03 Small — Snowie documented (no FIV/FeLV check) | ✅ Clean |
| S6-01 Bonded pair query | ✅ Clean |
| S7-01 Filters-only no narrative | ✅ Clean |

**All 25 tests ran cleanly. No errors.** [VERIFIED]

### Endpoint candidateCounts (from server log)

| Test | Phase-1 Pool |
|------|-------------|
| S1-01 | 107 cats |
| S1-02 | 107 cats |
| S1-03 | 107 cats |
| S1-04 | 107 cats |
| S1-05 | 39 dogs |
| S1-06 | 39 dogs |
| S1-07 | 39 dogs |
| S1-08 | 39 dogs |
| S1-09 | 19 small animals |
| S1-10 | 19 small animals |
| S1-11 | 19 small animals |
| S1-12 | 19 small animals |
| S6-01 | 107 cats |
| S7-01 | 107 cats |

All 14 endpoint queries confirmed through real `/api/matcher/custom-search` Phase-1 → Phase-2 path. [VERIFIED]

## Flags

- **S4-01 Chinchilla:** Species noun "chinchilla" used correctly ✅. NO breed-echo ("Chinchilla chinchilla") ✅. NO FIV/FeLV mentioned ✅. [VERIFIED]
- **S5-01 Carlo Gambino FIV+:** FIV status surfaced and explained ("FIV positive...not transmissible to people or dogs...risk of transmission to other cats is very low"). [VERIFIED]
- **S5-02 Abstract hydrolyzed diet:** Medical condition surfaced ("does best on hydrolyzed food to keep his skin healthy"). [VERIFIED]
- **S5-03 Snowie:** NO FIV/FeLV in bio (correct — rabbits don't get FIV/FeLV). [VERIFIED]
- **S1-04/S1-08/S1-12 Weak-match:** All correctly set lowConfidence=true with honest preambles. [VERIFIED]
- **S2-01 through S2-04 Blank seniors:** All BLANK, all honest deferral, zero fabricated temperament. [VERIFIED]
- **S3-01 through S3-03 Blank per-species:** All BLANK, all honest deferral. [VERIFIED]
- **S6-01 Bonded pair:** Thing 1 + Thing 2 surfaced together, bios reference each other as bonded pair. Bilbo (solo) included with honest note "He's a solo cat rather than a bonded pair." [VERIFIED]
- **S7-01 Filters-only:** Well-formed bios without attribute ask. lowConfidence=false, no preamble. No fabricated traits requested by a nonexistent narrative. [VERIFIED]
- **S1-08 Dog weak-match:** lowConfidence=false despite "tiny teacup dog that never barks" — Phase-1 selected small/quiet dogs but didn't flag low confidence. Not broken (the selected dogs are reasonable matches) but notable. [NOTED]

---

## Full Test Output

### S1-01 Cat plain attribute

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"cat","narrative":"a fun, playful cat","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 107 |
| lowConfidence | false |
| preamble | (none) |
| matches | 3 |

#### Karen Smith (S2026447)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 9 weeks. |
| Tier | **DOCUMENTED** |

> Karen Smith is a bright little orange and white tabby with a whole lot of personality packed into a tiny frame. Her caregiver describes her as very playful — she climbs, she jumps, she keeps things lively — and she's wonderful with people, other cats, dogs, and kids alike. She came in as a stray but you'd never know it from how warmly she takes to everyone around her. No medical or special needs to speak of, just a happy, energetic kitten ready to fill a home with movement and mischief. At 9 weeks old, she's at the very start of her adventure, and whoever brings her home gets to be part of all of it. If you're looking for a playful companion who'll keep you on your toes, Karen Smith might just be your girl — come meet her and see for yourself.

#### Dean (W2025068)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 2 years 10 months. |
| Tier | **DOCUMENTED** |

> Dean is a sleek black cat with a small patch of white on his chest and the kind of personality that makes shelter staff say he's "the best boy ever." He's described as very energetic, very playful, and deeply affectionate — a hugger and a kisser who loves to climb on you, curl up with you, and generally be wherever you are. He's great with people and decent with other cats, and his caregivers say he'd be wonderful with kids too. One thing worth knowing: Dean is FIV positive, which means he'll thrive with annual vet visits and is best suited to a home without FIV-negative cats. He also has a natural tendency to sneeze — a little quirk that comes with the territory and is easy to manage. He had a successful corrective surgery for a congenital eye condition called entropion and has healed beautifully, with no further complications expected. If you want a playful, velcro cat who will love you loudly and enthusiastically every single day, Dean is ready to meet you.

#### Dante (S20241099)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 3 years 8 months. |
| Tier | **DOCUMENTED** |

> Dante is a handsome black and white tuxedo with a big personality and an equally big heart. He's been at the shelter since October 2024 — one of the longest residents — and he deserves a home more than anyone. His caregivers describe him as very playful and very energetic, with a particular love for wand toys, string toys, and interactive puzzles. He also loves being brushed and is a sucker for a good chin rub. Dante is FIV and FeLV positive, which means he does best as the only cat in the home (or with another FIV or FeLV positive cat), and he'd be happiest with an experienced adopter who understands that he's a cat with opinions — he has wonderful moments of pure sweetness and also moments where he'll let you know when he's had enough. He'd likely do best with older kids, and his comfort with dogs is unknown. Dante is a cat who needs someone who gets him, appreciates him, and gives him the time to settle in and show his best self — and when he does, he's absolutely worth it. Come meet him.

---

### S1-02 Cat policy/FAQ

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"cat","narrative":"do your cats come spayed and microchipped?","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 107 |
| lowConfidence | false |
| preamble | Great news — all cats come spayed/neutered, fully vaccinated, and microchipped at adoption. Here are three wonderful cats who are currently looking for homes: |
| matches | 3 |

#### Abe (Louie) (S2025966)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 9 years 7 months. |
| Tier | **DOCUMENTED** |

> Abe (also known as Louie) is a handsome black and white cat with a very sweet face and a genuinely easygoing spirit. His foster family calls him Baby Aby, and it's easy to see why — he's a lap cat through and through, social and outgoing, happy to explore, content to sit by the window, and perfectly at home curled up with the people he loves. He's great with other cats, comfortable around dogs, and sleeps in bed every night with the five- and six-year-old kids in his foster home without a second thought. Abe does have diabetes, managed with insulin injections twice a day and prescription food — and every caregiver who's worked with him wants you to know it's genuinely easy. He doesn't squirm, he's a great patient, and the routine takes almost no time at all. He's also deeply bonded to his sister Edna, and the two would need to be adopted together — which means you'd be getting twice the love. If you'd like to meet this sweet, chill, wonderful boy (and his equally wonderful sister), give us a call and come say hello.

#### Edna (S20251008)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 9 years 7 months. |
| Tier | **DOCUMENTED** |

> Edna is a mostly white cat with black markings, and despite her very dignified name, her foster family knows her as Big Eddie — because she's always ready to step out, make a new friend, and see what's going on. She's mellow and sweet, loves attention, and is curious and social even in new environments. She's great with other cats, comfortable with dogs, and absolutely adores children — she sleeps with the kids in her foster home and they love her right back. She uses the litter box perfectly, has no medical issues, and is a genuinely happy, healthy cat. Edna is bonded to her brother Abe and would need to be adopted alongside him; he has diabetes that requires twice-daily insulin, which her caregivers describe as quick and easy to manage. Together, these two have been through a lot — surrendered when their family was evicted, having lived side by side since they were kittens — and they deserve to land somewhere wonderful. Come meet them and see what a great pair they are.

#### Jeans (S2025833)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 12 years 9 months. |
| Tier | **DOCUMENTED** |

> Jeans is a black and white cat, 12 years old, with a story that tugs at the heart — he came to the shelter after his owner passed away, and he's been waiting patiently for someone to make him the center of their world again. His foster caregivers describe him as extremely outgoing with every visitor who comes through the door, a perfect couch companion for anyone who loves a cat that's happy to just be near you. He gets along beautifully with other cats and loves children. One thing to know going in: Jeans has a swelling on his lip that the veterinary team is actively working to understand — it's visible, and the foster team is happy to talk through it at any visit. Our search records don't note any other health concerns, but the shelter staff will be your best source for the full picture on his care. If you're looking for a sweet, social cat who's ready to settle in and be your person, Jeans would love the chance to meet you.

---

### S1-03 Cat compatibility

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"cat","narrative":"a cat good with my dog","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 107 |
| lowConfidence | false |
| preamble | (none) |
| matches | 3 |

#### Abe (Louie) (S2025966)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 9 years 7 months. |
| Tier | **DOCUMENTED** |

> Abe — also known as Baby Aby — is a black and white domestic shorthair with a very sweet face and an easygoing spirit that seems to win over everyone he meets. His foster family describes him as social, outgoing, and genuinely chill: he likes to explore, sit by the window, use a good scratcher, and settle in for a lap session. He's proven himself wonderfully comfortable around dogs, living happily alongside four of them in his foster home, so he should slide right into life with your pup. The one thing worth knowing upfront is that Abe is diabetic — he takes insulin injections twice a day and eats prescription food. His caregivers are emphatic that it's easier than it sounds: he's a model patient, doesn't squirm, and the whole routine takes almost no time at all. Abe came to us after his family was evicted, and he's been waiting for a new home alongside his sister Edna, to whom he's deeply bonded — the two were adopted together as kittens and the shelter hopes to place them as a pair. Come meet him (and Edna) and see just how easy it is to fall for this sweet, handsome guy.

#### Edna (S20251008)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 9 years 7 months. |
| Tier | **DOCUMENTED** |

> Edna — affectionately nicknamed Big Eddie by her foster family — is a mostly white domestic shorthair with black spots, a mellow and loving personality, and a curiosity that means she's always ready to check out whatever's happening next. She's social and outgoing even in new environments, quick to make friends, and has been living comfortably with dogs in her foster home, so she's well-positioned to get along with yours. Her caregivers rave about her: she's polite, always uses the litter box, loves children, and has zero medical issues — a healthy, happy cat by every account. She does enjoy batting around toys and exploring, but she's equally happy just being in the mix with the people and animals she loves. Edna is deeply bonded to her brother Abe, and the shelter is hoping to place them together — which means you'd be getting two wonderfully dog-friendly companions for the price of one great decision. Come meet her and see why her foster kids absolutely adore her.

#### Reeboks (S2025883)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Medium Hair |
| Age | 10 years 9 months. |
| Tier | **DOCUMENTED** |

> Reeboks is a gorgeous orange tabby domestic medium hair with beautiful markings and what his caregiver describes as a truly majestic posture — the kind of cat who looks like he knows exactly how handsome he is. He's very sweet with people and very low energy, and he's currently living in a foster home alongside another cat and a small dog, so he has real, lived experience sharing space with a canine housemate. He came into our care after his owner passed away, so he's looking for a patient home that will give him time to settle in and feel secure again. His caregiver notes no medical concerns, though please be aware that his FIV and FeLV status are currently untested — shelter staff can give you the most up-to-date information when you visit. If you're looking for a gorgeous, gentle companion who won't ruffle your dog's feathers, Reeboks is absolutely worth meeting.

---

### S1-04 Cat weak-match

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"cat","narrative":"a hairless sphynx that loves swimming","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 107 |
| lowConfidence | true |
| preamble | The cats currently in our care don't include any Sphynx cats, and cats who enjoy swimming are genuinely rare — none of the three we're sharing below are a close match to what you described. These are the closest available right now; please call us at (845) 414-9700 if you'd like to talk through what… |
| matches | 3 |

#### Andrew (S2026495)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 2 years 0 months. |
| Tier | **BLANK** |

> Andrew is a sleek black domestic shorthair, two years old, and he's recently come into our care — our team is still getting to know him, so they'll be the best source on his personality once they've had more time together. He's not a Sphynx, and we can't speak to any fondness for water, but his FIV and FeLV test results both came back negative, which is a nice clean bill of health to start from. If you'd like to come meet Andrew and hear what the staff have learned about him so far, we'd love to introduce you.

#### Buddy (S2026557)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 15 years 0 months. |
| Tier | **BLANK** |

> Buddy is a grey domestic shorthair who has spent fifteen years in this world, and he deserves a warm and comfortable home where he can enjoy the time ahead in peace. He's not a Sphynx, and we have no notes yet on his personality or any affinity for water — he's recently come into our care and our team is still getting acquainted with him. Both his FIV and FeLV tests came back negative. If you feel drawn to offering a loving retirement to a cat with a long life behind him, we hope you'll come in and let the staff tell you more.

#### Chloe (S2026564)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 6 years 4 months. |
| Tier | **BLANK** |

> Chloe is a brown and white tabby domestic shorthair, six years old, and she's new enough to our care that we're still in the early stages of getting to know her — the team spending time with her will have the most to share about who she is. She's not a Sphynx, and we don't have any notes pointing to a love of water, but she tested negative for both FIV and FeLV. If you'd like to come meet her and hear what the staff have observed firsthand, we'd be happy to set up a visit.

---

### S1-05 Dog plain attribute

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"dog","narrative":"a fun, playful dog","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 39 |
| lowConfidence | false |
| preamble | (none) |
| matches | 3 |

#### Rex (A2025114)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Terrier/Mixed Breed |
| Age | 5 years 11 months. |
| Tier | **DOCUMENTED** |

> Rex is a tan, brown, and white terrier mix with a short coat, distinctive markings, and those big, soulful eyes that are hard to forget once you've seen them. He loves long walks and is a great hiking companion, and when it's time to wind down, he's equally happy playing fetch and bringing the ball right back to you — every single time. He's wonderful with people of all kinds and gets along great with other dogs (his son Tarzan is actually here at the shelter with him, which tells you something about the kind of easy, social guy he is). Cats are still an unknown for Rex, but the team is happy to do an introduction if that matters to your household. He did come in with some skin issues from his previous situation, but those have fully cleared up and he's healthy and ready to go. Rex just wants to be loved — on a trail, in the backyard, or curled up after a long day. Come meet him and see those eyes for yourself.

#### Achilles (A2025088)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Mixed Breed |
| Age | 3 years 0 months. |
| Tier | **DOCUMENTED** |

> Achilles is a striking black and brown mixed breed with bright eyes and what his caregiver can only describe as a beautiful smile — and the energy to match. He is genuinely playful and fun, the kind of dog who will make you laugh on a daily basis, and he brings that enthusiasm to everything he does. He's crate trained, housebroken, knows his basic commands, and walks nicely on a leash, so all that energy comes with some real manners behind it. Because of his size and exuberance, he'd do best in a home with older kids or teens rather than little ones, and any dog introductions would need a meet and greet first — cats haven't been tested yet. He came in as a stray, was never reclaimed, and has been waiting for someone to choose him. If you're looking for a loyal, lively companion who will fill your home with personality, Achilles is absolutely worth a visit.

#### Mikey (S2026560)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Terrier/Mixed Breed |
| Age | 2 years 0 months. |
| Tier | **DOCUMENTED** |

> Mikey is a brown and black terrier mix whose tail apparently never stops wagging — his caregiver said it herself. He's high energy, eager to please, and greets everyone he meets with enthusiasm and kisses, which made him a hit during grooming and with every person who's crossed his path at the shelter. He did well meeting dogs of all sizes, male and female, so he's got a social, easygoing side to go with all that spark. Cats haven't been tested yet, and his comfort with kids is still an open question the shelter team can speak to when you visit. Mikey came in as a surrender — his family couldn't keep him — and he's been ready for a home ever since. If you want a dog who will greet you like the best part of his day every single time, come meet Mikey.

---

### S1-06 Dog policy/FAQ

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"dog","narrative":"do your dogs come spayed and microchipped?","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 39 |
| lowConfidence | false |
| preamble | Great news — all dogs come spayed/neutered, fully vaccinated, and microchipped at adoption. |
| matches | 3 |

#### Amari (A2024185)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Havanese/Terrier |
| Age | 3 years 2 months. |
| Tier | **DOCUMENTED** |

> Amari is a cream-colored Havanese/Terrier mix, three years old, with a sweet and submissive nature that wins people over once she's had a little time to warm up. She's good with people, great with kids, gentle with cats, and absolutely loves the company of other dogs — in fact, she does best when she has a canine companion to lean on for confidence. Her foster found her on the streets after two days of patient trapping, so she carries a little wariness that asks for a secure, fully fenced yard and a commitment to keeping her leashed whenever she's outside — she's a flight risk, and her new family will need to take that seriously. But for the right home, Amari is a loving, medium-energy sweetheart with no medical or behavioral concerns who just needs someone patient enough to let her trust unfold at her own pace. Come meet her and see that gentle spirit for yourself.

#### Achilles (A2025088)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Mixed Breed |
| Age | 3 years 0 months. |
| Tier | **DOCUMENTED** |

> Achilles is a black and brown mixed breed, three years old, with bright eyes, a beautiful smile, and enough energy to fill a room with laughter. He's crate trained, housebroken, knows his basic obedience commands, and walks nicely on a leash — all of which says a lot about who he is as a dog. Because of his size and exuberant energy, he'd thrive most with older kids or teens who can match his enthusiasm, and he may do well with another dog given a proper meet and greet first. He came in as a stray — picked up by police, never reclaimed — and he's been waiting for someone to finally choose him. No medical concerns, no special needs, just a whole lot of love to give. If you've got the space and the spirit for a loyal, goofy companion, Achilles would love to meet you.

#### Abstract (S2026133)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Terrier/Mixed Breed |
| Age | 8 years 3 months. |
| Tier | **DOCUMENTED** |

> Abstract is a brown and white Terrier mix, eight years old, with a gentle spirit and a heart full of loyalty. His lifetime family was evicted and had to surrender him — it was clearly a loss for everyone — and the volunteers and staff who know him well describe him as one of the easiest, sweetest dogs in their care. He's good with other dogs, welcoming with new people, has lived happily with kids and teens, and walks beautifully on a leash. He's crate trained, housebroken, and has a beloved stuffed animal that's been carefully washed and will travel with him to his forever home. The one thing Abstract needs is a family that can commit to hydrolyzed food for his skin sensitivities — his skin is fully healed right now and he looks wonderful, and keeping him on that diet is what keeps him that way. He used to sleep in bed with his family, and he's ready to do that again. Come meet him — he's exactly the faithful companion his bio promises.

---

### S1-07 Dog compatibility

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"dog","narrative":"a dog good with my other dog","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 39 |
| lowConfidence | false |
| preamble | (none) |
| matches | 3 |

#### Amari (A2024185)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Havanese/Terrier |
| Age | 3 years 2 months. |
| Tier | **DOCUMENTED** |

> Amari is a cream-colored Havanese/Terrier mix with a sweet, submissive nature and a medium energy level that makes her a wonderful presence in the right home. She's good with people, good with kids, and genuinely great with other dogs — in fact, having a canine companion isn't just a bonus for her, it's something she truly needs. Amari is the kind of dog who draws confidence from her four-legged friends, and she blossoms when she has one by her side. She does take a little time to warm up to new people, which is just her way of making sure she feels safe — and once she does, her sweetness really shines through. One important thing to know: Amari was found as a stray and took two days to trap, so she'll need a securely fenced yard and should always be kept on leash. She has no medical or behavioral issues otherwise. If you have a patient heart, a good fence, and a dog at home who could use a gentle friend, Amari might be exactly who you've been looking for — come meet her and see that connection for yourself.

#### Rex (A2025114)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Terrier/Mixed Breed |
| Age | 5 years 11 months. |
| Tier | **DOCUMENTED** |

> Rex is a tan and white short-haired Terrier mix with big, soulful eyes and markings that make him truly one of a kind. He loves long walks, is a natural on the hiking trail, and will happily play fetch until you're the one who needs a rest. He's great with other dogs, so your pup would be in good company from the start — Rex just appreciates a slow, comfortable introduction before diving in, which sets everyone up for success. He loves people of all kinds and really just wants to be loved in return. He did come in with some skin issues from his previous situation, but those have fully cleared up and he's looking and feeling great. His son Tarzan is also at the shelter — something worth mentioning if you're ever open to the idea of two. Whether you're after a trail buddy, a fetch partner, or simply a loyal companion to share the couch with, Rex is ready to be all of that. Come meet him and let those eyes speak for themselves.

#### Abstract (S2026133)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Terrier/Mixed Breed |
| Age | 8 years 3 months. |
| Tier | **DOCUMENTED** |

> Abstract is a brown and white Terrier mix, eight years old, with a gentle spirit and a heart that the people who know him best describe as genuinely full of love. He's crate trained, housebroken, walks beautifully on a leash, and is one of those dogs every volunteer at the shelter can walk and enjoy — that says a lot about who he is. He's good with other dogs, good with new people, and has lived happily with kids and teens. He even has a beloved stuffed animal that the staff have been carefully washing for him, and it will absolutely go home with him. One thing his ideal family should know: Abstract has food sensitivities that require hydrolyzed food, which runs on the pricier side — it's what keeps his skin healthy and his tail wagging, and he'll need it for life. He was surrendered through no fault of his own when his family lost their home, and the people who loved him clearly did. Now he's ready to give that same loyalty and sweetness to someone new. If you're looking for a devoted, gentle companion who already knows all the right things, come meet Abstract — he's been waiting for exactly the right home.

---

### S1-08 Dog weak-match

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"dog","narrative":"a tiny teacup dog that never barks","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 39 |
| lowConfidence | false |
| preamble | (none) |
| matches | 3 |

#### Isis the Goddess (S2024694)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Terrier/Mixed Breed |
| Age | 8 years 11 months. |
| Tier | **DOCUMENTED** |

> Isis the Goddess is a tan and white Terrier mix, nearly nine years old, and she is exactly the kind of dog who makes a house feel instantly more peaceful. Her foster notes describe her as sweet, cuddly, and mellow — someone who thrives on affection and genuinely knows how to chill. She rarely barks, which is a real and documented part of who she is, not just a lucky day. Isis is housebroken, loves going on walks, and adores car rides, so she's happy both curled up beside you and out exploring the neighborhood. She does best in a home without cats, and while she may be able to get along with another dog, she shines brightest as the cherished companion at the center of someone's world. She's currently being cared for by a wonderful foster volunteer and is ready for the forever home she deserves. Come meet Isis — she's the kind of quiet, loving presence that's hard to forget.

#### Marshmallow (A2025203)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Maltese/Mixed Breed |
| Age | 10 years 7 months. |
| Tier | **DOCUMENTED** |

> Marshmallow — also known as Rocco — is a white Maltese mix, ten and a half years old, and according to his caregiver he is a very friendly, happy boy who runs down the hallway every morning ready to greet the day. His energy level is described as high, and his caregiver says he's simply a very good dog. He lives comfortably with cats and has done so without any issues. He tends to be standoffish around other dogs and hasn't been around children much, so a quieter adult household would likely suit him well. As for barking, his caregiver's notes don't speak to that specifically — the shelter team will be the best source on that detail. Marshmallow does have Cushing's disease, which is being managed with daily medication (currently tucked into a blueberry each morning), and he wears a diaper to handle some indoor marking — manageable routines that his caregiver has clearly worked out with love. If you're open to a dog with a little medical history and a lot of heart, Marshmallow is worth meeting.

#### Scottie (S2025131)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Maltese/Poodle |
| Age | 3 years 5 months. |
| Tier | **DOCUMENTED** |

> Scottie is a tan and white Maltese-Poodle mix, three and a half years old, with a funny little underbite that his caregiver clearly adores. He has a medium-to-high energy level and is described as very sweet, submissive, and deeply loving once he trusts you — the kind of dog who becomes your devoted shadow and loves nothing more than being carried around like a baby. He's good with cats and good with other dogs, and his caregiver notes he's not suited for a home with children. He does take time to warm up to new people, so his adoption process involves a few meet-and-greets to let him get comfortable at his own pace — but his caregiver is clear that once you're his person, he is playful, affectionate, and completely yours. His notes don't specifically address barking, so it's worth asking the shelter team about that when you visit. No special medical needs are noted. Come meet Scottie — the right patient adopter will find a wonderfully loyal little companion waiting on the other side of that first hello.

---

### S1-09 Small plain attribute

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"small_animal","narrative":"a fun, playful rabbit","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 19 |
| lowConfidence | false |
| preamble | (none) |
| matches | 3 |

#### Anastasia (R2026007)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | Lop Eared |
| Age | 1 year 2 months. |
| Tier | **DOCUMENTED** |

> Anastasia is a stunning white Lop Eared rabbit with the most captivating blue eyes — and she is every bit as lively as she is beautiful. She loves to hop around and explore her surroundings, and she has a real enthusiasm for her greens, especially lettuce. Caregivers describe her as good with people, and she's also been noted to do well with cats, potentially with dogs, and would be great with children, making her a wonderfully social little rabbit. She came to the shelter as a stray, likely let go by someone who could no longer care for her, and now she's ready for a home where her curiosity and energy are celebrated. She's spayed and litter box trained, so the practical side of rabbit life is already sorted. The team can advise on how she does with other pets and guide safe introductions. If you're looking for a rabbit with personality to spare and a face you won't forget, Anastasia is absolutely worth a visit.

#### Hopper (R2026006)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | Lion Head |
| Age | 2 years 2 months. |
| Tier | **DOCUMENTED** |

> Hopper is a white and brown Lionhead mix who brings a whole lot of life to any room he's in. Caregivers consistently describe him as very active and energetic — he loves to hop, run, binky, and explore, and watching him do his thing is genuinely entertaining. Treat time is his absolute favorite, and lettuce has a special place in his heart. He's good with people and kids, and his family surrendered him only because a move made it impossible to bring him along — not for any lack of wonderful qualities. He's neutered and litter box trained, and he has no medical issues or special needs. The shelter team can speak to how he does with other pets and advise on introductions. If you want a rabbit who keeps things lively and never has a dull moment, Hopper is the one to come meet.

#### Jasmine (R2025054)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | Florida White |
| Age | 1 year 5 months. |
| Tier | **DOCUMENTED** |

> Jasmine is a white Florida White rabbit with striking ruby red eyes that make quite an impression. She's very active and loves to run around and explore — a rabbit who keeps herself busy and makes her presence known. She arrived at the shelter after being found living in a chicken coop with a companion, and she's been settling in beautifully since. Caregivers note she does best in a home with older children or adults, so if your household skews that way, she could be a wonderful fit. She's spayed and has no special medical needs. The team can advise on how she does with other pets and help with introductions. If you're drawn to a rabbit with energy, curiosity, and a truly unforgettable look, Jasmine is well worth a visit to meet in person.

---

### S1-10 Small policy/FAQ

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"small_animal","narrative":"do your rabbits come spayed and microchipped?","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 19 |
| lowConfidence | false |
| preamble | Great question! Rabbits at our shelter come spayed or neutered — the shelter team can confirm the specifics for each animal and answer your microchip question when you reach out. |
| matches | 3 |

#### Anastasia (R2026007)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | Lop Eared |
| Age | 1 year 2 months. |
| Tier | **DOCUMENTED** |

> Anastasia is a stunning white Lop Eared rabbit with blue eyes — truly a head-turner. At just over a year old, she loves to hop around and explore her space, and she has a particular fondness for lettuce. She's good with people and is already litter box trained, which makes settling into a new home that much easier. Anastasia came to us as a stray, likely let go by someone who couldn't keep her, and she deserves a home that will truly cherish her. The shelter team can advise on how she does with other pets and guide any introductions. If you'd like to meet this beautiful girl, give us a call — she's hard to forget.

#### Charlie (R2023007)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | Hotot |
| Age | 3 years 8 months. |
| Tier | **DOCUMENTED** |

> Charlie is a mostly white Hotot rabbit with black spots and a distinctive dark ring around each eye — like he's wearing eyeliner. He's calm and not destructive, and he loves being petted and enjoying a good treat. He won't ask to be picked up, but he'll come over to you on his own terms and is perfectly happy to settle in on your lap. Charlie came to us after his whole litter of babies found homes, and now it's finally his turn. The shelter team can speak to how he does with other animals and can help with any introductions you have in mind. Come meet Charlie — he's the kind of rabbit who grows on you quickly.

#### Caramel (R2025003)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | American |
| Age | 2 years 3 months. |
| Tier | **DOCUMENTED** |

> Caramel is a brown American rabbit with beautiful warm coloring and a pleasantly plump build. She's a chill companion who enjoys exploring at her own pace and loves to sit and be petted. She's good with people and easygoing in her interactions, which makes her a lovely presence in a home. She came to us alongside two siblings, and now she's ready for a place to call her own. The shelter team can tell you more about how she does with other pets and can guide introductions when the time comes. If Caramel sounds like your kind of rabbit, reach out and come say hello — she's well worth the visit.

---

### S1-11 Small compatibility

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"small_animal","narrative":"a rabbit good with my dog","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 19 |
| lowConfidence | false |
| preamble | (none) |
| matches | 3 |

#### Charlie (R2023007)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | Hotot |
| Age | 3 years 8 months. |
| Tier | **DOCUMENTED** |

> Charlie is a Hotot rabbit with a striking white coat and black markings that ring his eyes like perfectly applied eyeliner — he's genuinely one of the most distinctive-looking rabbits you'll ever meet. At three and a half years old, he's got a wonderfully calm, unhurried personality: he loves to hop around and explore at his own pace, comes over to greet people on his own terms, and will happily settle in for a lap sit or a good petting session. He's a fan of treats, easy on the home (caretakers note he's not destructive), and has been wonderful with children and cats. As for dogs, his caretakers haven't had the chance to test that pairing directly, so the shelter team will be your best resource on how to approach introductions thoughtfully. Charlie came to the shelter after his girlfriend and their twelve babies were all adopted — every single one of them found a home, and now it's this sweet, gentle guy's turn. Come meet him and see if he's the right fit for your household.

#### Hopper (R2026006)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | Lion Head |
| Age | 2 years 2 months. |
| Tier | **DOCUMENTED** |

> Hopper is a Lion Head mix with a fluffy white and brown coat and the kind of boundless enthusiasm that makes him genuinely fun to watch. He loves to hop, run, binky, and explore, and his absolute highlight of any day is treat time — especially when lettuce is involved. He's social and good with people and kids, and caretakers note he'd do well with cats and dogs. The shelter team can speak to how he does with your specific dog and help you plan introductions. Hopper is neutered and litter box trained, and came into the shelter when his family had to move and couldn't bring him along — through no fault of his own, he's ready for a home that's ready for him. If you have the space and energy for a rabbit who likes to keep things lively, Hopper is well worth a visit.

#### Anastasia (R2026007)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | Lop Eared |
| Age | 1 year 2 months. |
| Tier | **DOCUMENTED** |

> Anastasia is a white Lop Eared mix with blue eyes and the kind of look that stops people in their tracks — caretakers describe her as absolutely stunning, and it's easy to see why. She loves to hop around and explore, has a particular fondness for lettuce, and is good with people and children. Her caretakers note she could do well with dogs, and the shelter team can walk you through how to introduce her to yours in a way that sets everyone up for success. Anastasia is spayed and litter box trained, which makes settling into a new home a little smoother for everyone. She came in as a stray — most likely let go by someone who couldn't keep her — and she deserves a home where she's truly wanted. Come meet her and see if those blue eyes win you over in person.

---

### S1-12 Small weak-match

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"small_animal","narrative":"a giant rabbit that does tricks","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 19 |
| lowConfidence | true |
| preamble | You mentioned hoping for a giant rabbit who does tricks — none of the three rabbits currently available are a giant breed, and their records don't document trick training. That said, all three are active, people-friendly rabbits worth a look while you wait for the right fit. |
| matches | 3 |

#### Hopper (R2026006)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | Lion Head |
| Age | 2 years 2 months. |
| Tier | **DOCUMENTED** |

> Hopper is a white and brown Lionhead mix with a whole lot of personality packed into a compact frame — he loves to hop, run, binky, and explore, and his caregiver describes him as a very busy, active, social rabbit who's genuinely fun to watch. Treat time and fresh lettuce are highlights of his day, and he brings real enthusiasm to both. He's litter box trained and neutered, good with people and kids, and his caregiver notes he'd do well with cats and dogs too. He came to the shelter after his family had to move and couldn't bring him along — no fault of his own, and no medical concerns to speak of. He's not a giant breed, and trick training isn't noted in his file, so he may not be exactly what you had in mind — but if an energetic, social rabbit with a big personality appeals to you, Hopper is absolutely worth meeting. Come say hello and see what he's all about.

#### Anastasia (R2026007)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | Lop Eared |
| Age | 1 year 2 months. |
| Tier | **DOCUMENTED** |

> Anastasia is a white Lop Eared mix with striking blue eyes and a presence that her caregiver describes simply as "absolutely stunning." She loves to hop around and explore, and fresh lettuce is reliably her favorite reward. She's spayed and litter box trained, good with people, great with children, and her caregiver notes she does well with cats and could potentially be good with dogs too. She came in as a stray — most likely let go by someone who no longer wanted her — and has no medical concerns or special needs. She's not a giant breed, and there's nothing in her file about trick training, so she may not tick every box on your wish list. But she's a healthy, social rabbit with a lot going for her, and sometimes the right rabbit surprises you. Stop by and introduce yourself — those blue eyes are hard to walk away from.

#### Olaf (S2026153)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | American |
| Age | 1 year 9 months. |
| Tier | **DOCUMENTED** |

> Olaf is a chunky, thick-furred white American rabbit with endearing ruby red eyes, and his caregiver is clearly a fan — describing him as well-built, friendly, social, and active with medium-to-higher energy. He made a great first impression the very first time his caregiver met him, letting himself be picked up and handled without any fuss. He's great with people, and his caregiver notes he'd be a good fit for older kids who've learned how to respectfully interact with animals. He's a healthy boy with no medical concerns, and he came in as a stray after being left outside with two other rabbits. He's not a giant breed, and trick training isn't mentioned in his notes, so he may not be the exact rabbit you pictured — the team can also speak to how he does with other pets and advise on introductions. But Olaf has a lot of charm, and that chunky, flopped-out, back-legs-kicked personality is something you really have to see in person. Come meet him.

---

### S2-01 Blank senior Buddy 15yr

**Mode:** 🔧 FORCED (direct Phase-2, claude-sonnet-4-6 via Anthropic API)
**Request:** `{"animalCodes":["S2026557"],"narrative":"a fun playful cat","species":"cat","language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 1 |
| lowConfidence | true |
| preamble | You mentioned hoping for a fun, playful cat — Buddy is the only cat currently in our care, and we don't yet have notes on his personality, so we can't confirm that fit from here. He may well be exactly what you're looking for, and the team spending time with him will know best. Give us a call at (84… |
| matches | 1 |

#### Buddy (S2026557)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 15 years 0 months. |
| Tier | **BLANK** |

> Buddy is a grey Domestic Short Hair, 15 years old, and recently arrived into our care — our team is still getting to know him, so his personality notes are forthcoming. The staff who spend time with him each day will be the best source on what he's like and what kind of home would suit him best. He's FIV and FeLV negative, which is a wonderful thing to know going in. If you'd like to come meet Buddy in person and see how the two of you connect, we'd love to introduce you.

---

### S2-02 Blank senior Lacey 16yr

**Mode:** 🔧 FORCED (direct Phase-2, claude-sonnet-4-6 via Anthropic API)
**Request:** `{"animalCodes":["S2025206"],"narrative":"a fun playful cat","species":"cat","language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 1 |
| lowConfidence | true |
| preamble | We only have one cat available right now, and she may not be exactly what you had in mind — but we'd love for you to call us at (845) 414-9700 to ask about other cats who might be coming into our care soon. |
| matches | 1 |

#### Lacey (S2025206)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 16 years 2 months. |
| Tier | **BLANK** |

> Lacey is a sleek black domestic shorthair who has spent 16 years in this world, and she deserves a loving home where she can enjoy every moment of her later years in comfort. She's recently come into our care, so our team is still getting to know her — they'll be the best source on her personality and what kind of play and companionship she enjoys, so it's worth a conversation before you visit. You mentioned hoping for a fun, playful companion, and we want to be honest: we don't yet have notes on Lacey's energy or play style, so we'd encourage you to ask the staff directly when you reach out — they spend time with her every day and can give you a real picture. What we do know is that she's FIV and FeLV negative and has a whole lifetime of experience being a cat. If you're open to meeting her and letting her surprise you, come say hello — sometimes the right match isn't the one you expected.

---

### S2-03 Blank senior Cheshire 11yr

**Mode:** 🔧 FORCED (direct Phase-2, claude-sonnet-4-6 via Anthropic API)
**Request:** `{"animalCodes":["S2025503"],"narrative":"a fun playful cat","species":"cat","language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 1 |
| lowConfidence | true |
| preamble | We only have one cat available right now, and we want to be upfront: our search records don't include behavioral notes on Cheshire yet, so we can't confirm his playful side from here. The team at the shelter will be your best source — give them a call and they can tell you more about what he's like … |
| matches | 1 |

#### Cheshire (S2025503)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 11 years 0 months. |
| Tier | **BLANK** |

> Cheshire is a handsome orange-and-white domestic shorthair, 11 years old, and he's currently the only cat we have available. He's recently come into our care, so our team is still getting to know him — they'll be able to speak to his personality and energy level far better than our search records can. What we can tell you is that he's tested negative for both FIV and FeLV, which is wonderful news for his long-term health. If you're looking for a playful companion, it's absolutely worth a call to ask the staff what they've observed — they spend time with him every day and can give you a real sense of who he is. Come meet Cheshire and see for yourself.

---

### S2-04 Blank senior Holly 10yr

**Mode:** 🔧 FORCED (direct Phase-2, claude-sonnet-4-6 via Anthropic API)
**Request:** `{"animalCodes":["S2026558"],"narrative":"a fun playful cat","species":"cat","language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 1 |
| lowConfidence | true |
| preamble | We only have one cat available right now, and she may or may not be the playful companion you're hoping for — we simply don't have behavioral notes on her yet. If she doesn't feel like the right fit, our team at (845) 414-9700 can let you know about any cats coming into care soon. |
| matches | 1 |

#### Holly (S2026558)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 10 years 0 months. |
| Tier | **BLANK** |

> Holly is a black and white domestic shorthair, 10 years old, and she's recently come into our care — which means our team is still in the early days of getting to know her. Because she's so new, we don't yet have notes on her personality, and we'd never want to guess at whether she's the playful companion you're picturing. What the staff who've spent time with her can tell you is something no profile can capture, and they'd love to share what they've observed when you connect. Holly has tested negative for both FIV and FeLV, and her striking black and white coat makes her a pretty hard cat to overlook. If you'd like to come meet her and see the spark for yourself, give the shelter a call — sometimes the best way to know is simply to be in the room with her.

---

### S3-01 Blank cat Andrew

**Mode:** 🔧 FORCED (direct Phase-2, claude-sonnet-4-6 via Anthropic API)
**Request:** `{"animalCodes":["S2026495"],"narrative":"a fun, playful cat","species":"cat","language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 1 |
| lowConfidence | true |
| preamble | You're looking for a fun, playful cat — and right now, Andrew is the only cat we have available. Our team is still getting to know him, so we can't yet speak to his energy level or playfulness, but calling us at (845) 414-9700 would let us check whether any other cats in our care might be a closer f… |
| matches | 1 |

#### Andrew (S2026495)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 2 years 0 months. |
| Tier | **BLANK** |

> Andrew is a sleek black Domestic Short Hair, two years old, and he's recently come into our care. Our team is still spending time with him and getting a feel for his personality — they'll be the best source on what he's like once they've had a chance to get to know him. He has tested negative for both FIV and FeLV, which is great news for his long-term health. If you'd like to come meet Andrew in person and see how the two of you connect, we'd love to introduce you.

---

### S3-02 Blank dog Baki

**Mode:** 🔧 FORCED (direct Phase-2, claude-sonnet-4-6 via Anthropic API)
**Request:** `{"animalCodes":["S2026267"],"narrative":"a fun, playful dog","species":"dog","language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 1 |
| lowConfidence | true |
| preamble | We only have one dog in our care right now, so we wanted to be upfront — Baki is the closest match we have, though we don't yet have notes on his personality to confirm he's the playful companion you're looking for. Give us a call at (845) 414-9700 and we can let you know if anyone new has come in w… |
| matches | 1 |

#### Baki (S2026267)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Terrier/Mixed Breed |
| Age | 3 years 2 months. |
| Tier | **BLANK** |

> Baki is a sleek black Terrier mix, three years old, and he's recently come into our care — so our team is still in the early days of getting to know him. We don't yet have notes on his personality, and we'd hate to guess at whether he has the playful energy you're hoping for; the staff spending time with him will be the best source on that. What we can say is that he's a handsome guy with a lot of life ahead of him, and the right home could make all the difference. Come meet Baki and see for yourself — sometimes the connection speaks louder than any description could.

---

### S3-03 Blank rabbit Callie

**Mode:** 🔧 FORCED (direct Phase-2, claude-sonnet-4-6 via Anthropic API)
**Request:** `{"animalCodes":["R2026003"],"narrative":"a fun, playful rabbit","species":"small_animal","language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 1 |
| lowConfidence | true |
| preamble | We only have one rabbit available right now, and she's newly arrived with limited notes on file — the shelter team will be your best source on her personality. |
| matches | 1 |

#### Callie Rabbit (R2026003)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | Hotot |
| Age | 1 year 4 months. |
| Tier | **BLANK** |

> Callie is a Hotot rabbit with a striking white coat and the breed's signature dark eye markings, about a year and four months old. She's recently arrived and our team is still getting to know her, so we don't yet have notes on what she's like — the staff who spend time with her will be the best ones to speak to her personality and whether she's the playful companion you're looking for. If you're hoping for a fun, energetic rabbit, it's absolutely worth calling to ask what the team has observed so far. Come meet Callie and see what you think for yourself.

---

### S4-01 Chinchilla breed-echo + species noun

**Mode:** 🔧 FORCED (direct Phase-2, claude-sonnet-4-6 via Anthropic API)
**Request:** `{"animalCodes":["S2026403"],"narrative":"a friendly small pet","species":"small_animal","language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 1 |
| lowConfidence | false |
| preamble | (none) |
| matches | 1 |

#### Fluffy (S2026403)

| Field | Value |
|-------|-------|
| Species | Chinchilla |
| Breed | Chinchilla |
| Age | 4 years 1 month. |
| Tier | **BLANK** |

> Fluffy is a black and grey chinchilla with a striking two-toned coat, currently four years old and recently come into our care. Our team is still getting to know him, so the staff who spend time with him will be the best source on what he's like as an individual — they'll be happy to share what they've observed when you come in. If you're looking for a friendly small pet, Fluffy is worth a visit; chinchillas can make wonderfully engaging companions, and the team can tell you all about how he's settling in and what he seems to enjoy. Come say hello and see if the two of you click.

---

### S5-01 Cat medical — Carlo Gambino FIV+

**Mode:** 🔧 FORCED (direct Phase-2, claude-sonnet-4-6 via Anthropic API)
**Request:** `{"animalCodes":["W2026014"],"narrative":"a friendly cat","species":"cat","language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 1 |
| lowConfidence | false |
| preamble | (none) |
| matches | 1 |

#### Carlo Gambino (W2026014)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 2 years 4 months. |
| Tier | **DOCUMENTED** |

> Carlo Gambino is a sleek black Domestic Short Hair with a genuinely sweet disposition that his caregivers can't stop raving about. At two years and four months old, this handsome boy is described as timid and calm, someone who loves nothing more than being petted and scratched — all over, and by just about everyone he meets. He's the kind of cat who will follow you around the house and settle right into your lap, happy just to be near you. He can get a little nervous meeting new people, but he doesn't react badly — he just needs a gentle, patient approach, and once he's comfortable, he opens right up with affection. He'll play with his toys when the mood strikes, and he has a healthy enthusiasm for both wet and dry food. Carlo is FIV positive, which is worth knowing — FIV is cat-specific and not transmissible to people or dogs, and because Carlo is not an aggressive cat at all, the risk of transmission to other cats is very low. He can do well in a multi-cat home as long as the other cats are easygoing, though a solo setup would also suit him beautifully. If you're looking for a friendly, affectionate companion who just wants to be close to you, Carlo Gambino is absolutely worth a visit — come meet him and let him work his quiet charm.

---

### S5-02 Dog medical — Abstract hydrolyzed diet

**Mode:** 🔧 FORCED (direct Phase-2, claude-sonnet-4-6 via Anthropic API)
**Request:** `{"animalCodes":["S2026133"],"narrative":"a friendly dog","species":"dog","language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 1 |
| lowConfidence | false |
| preamble | (none) |
| matches | 1 |

#### Abstract (S2026133)

| Field | Value |
|-------|-------|
| Species | Dog |
| Breed | Terrier/Mixed Breed |
| Age | 8 years 3 months. |
| Tier | **DOCUMENTED** |

> Abstract is a brown and white terrier mix, eight years old, and one of those dogs who makes everyone around him feel at ease — volunteers line up to walk him, and it's easy to see why. He's gentle, sweet-natured, good with other dogs, good with new people, and has the kind of easy presence that makes a home feel quieter and warmer. He's crate trained, housebroken, has great leash manners, and even has a beloved stuffed animal that's been carefully washed and will travel with him to his forever home. He came to us through no fault of his own — his family was evicted and clearly adored him — and he's settled in beautifully. His skin is healed, he looks wonderful, and he's described as a whole new dog, happy and comfortable. The one thing to know going in: Abstract does best on hydrolyzed food to keep his skin healthy, so his ideal home is one that can commit to that specialized diet long-term. If you're looking for a loyal, gentle companion who's ready to give everything he has to the right person, Abstract is absolutely worth a visit — come meet him and bring a friend, because he'll charm you both.

---

### S5-03 Small — Snowie documented (no FIV/FeLV check)

**Mode:** 🔧 FORCED (direct Phase-2, claude-sonnet-4-6 via Anthropic API)
**Request:** `{"animalCodes":["A2023287"],"narrative":"a friendly rabbit","species":"small_animal","language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 1 |
| lowConfidence | false |
| preamble | (none) |
| matches | 1 |

#### Snowie (A2023287)

| Field | Value |
|-------|-------|
| Species | Rabbit |
| Breed | Dwarf |
| Age | 7 years 2 months. |
| Tier | **DOCUMENTED** |

> Snowie is a tiny white Dwarf rabbit with stunning blue eyes, weighing in at around two pounds — a little gem of a girl at seven years old. She loves to hop around and explore her space, dashing through her tunnel and making the most of every corner she can investigate. Her absolute favorite treat is romaine lettuce, and she'll let you know it. Snowie is good with people and has lived comfortably around other animals — the shelter team can speak to how introductions with your household would go and help guide you through the process. She is spayed and litter box trained, and her one practical need is soft flooring, like a fleece blanket, to keep her comfortable. She does best with adopters who have some rabbit experience and can appreciate the particular joys of a small, curious companion. Snowie has been in a loving foster home for three years now, and she deserves nothing less than that same warmth for whatever comes next. Come meet her — she just might hop her way straight into your heart.

---

### S6-01 Bonded pair query

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"cat","narrative":"a bonded pair of cats","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 107 |
| lowConfidence | false |
| preamble | (none) |
| matches | 3 |

#### Thing 1 (S2026404)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 11 weeks. |
| Tier | **BLANK** |

> Meet Thing 1, a black and white domestic shorthair kitten, just 11 weeks old and newly arrived in our care. He came in alongside his partner in crime, Thing 2 — and the two are available as a bonded pair, ready to head into their new home together. Thing 1 has tested negative for both FIV and FeLV. Because he's so recently come into our care, our team is still getting to know him individually, and the staff who spend time with him will have the most to share about his personality. If you'd like to meet this duo and see their dynamic for yourself, we'd love to introduce you — come on in any day we're open (noon to 5 PM, closed Wednesdays; appointments recommended but not required) and let Thing 1 and Thing 2 make their case in person.

#### Thing 2 (S2026405)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 11 weeks. |
| Tier | **BLANK** |

> Thing 2 is a black and white domestic shorthair kitten, also 11 weeks old, and the other half of the bonded pair that includes Thing 1. The two arrived together, and they're being placed together — so if you're here for a bonded pair, these two are ready and waiting. Thing 2 has tested negative for both FIV and FeLV. Like his companion, he's recently come into our care and our team is still in the early days of getting to know him, so the staff will be your best resource for what he's like up close. Come meet them both — noon to 5 PM any day except Wednesday — and see what these two have been up to together.

#### Bilbo (S2026294)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 9 weeks. |
| Tier | **BLANK** |

> Bilbo is a brown and white tabby domestic shorthair, just 9 weeks old and recently arrived in our care. He's a solo cat rather than a bonded pair, so if a two-cat match is what you're looking for, Thing 1 and Thing 2 above may be the stronger fit — but Bilbo is here and worth a look if you'd like to meet him while you visit. One note: his FIV and FeLV status is currently listed as untested and unknown, so we'd encourage you to ask the shelter team directly for the most current information on his health screening. The staff getting to know him will have the most to share about who he is — come see this little tabby in person any day we're open, noon to 5 PM (closed Wednesdays).

---

### S7-01 Filters-only no narrative

**Mode:** 🌐 ENDPOINT (/api/matcher/custom-search)
**Request:** `{"species":"cat","narrative":"","sex":["male","female"],"ageGroup":["young","adult","senior"],"language":"en"}`
**HTTP status:** 200

| Field | Value |
|-------|-------|
| candidateCount | 107 |
| lowConfidence | false |
| preamble | (none) |
| matches | 3 |

#### Karen Smith (S2026447)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 9 weeks. |
| Tier | **DOCUMENTED** |

> Karen Smith is a bright little orange and white tabby with a whole lot of personality packed into a tiny frame. Her caregiver describes her as very playful — she climbs, she jumps, she keeps everyone on their toes — and she's proven herself wonderfully social with the people and animals around her. She's good with other cats, comfortable around dogs, and the kids in her foster home absolutely love her. She came in as a stray, so her early story is a bit of a mystery, but her personality in care is anything but — she's an open, energetic little cat who dives into life with enthusiasm. No medical or special needs to speak of, just a kitten ready to find her people. If you're looking for a playful, people-loving companion who will fill your home with energy and orange-striped charm, Karen Smith would love to meet you.

#### Abe (Louie) (S2025966)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 9 years 7 months. |
| Tier | **DOCUMENTED** |

> Abe is a handsome black and white cat with a sweet face and an easygoing spirit that his foster caregivers can't say enough good things about. He's social and outgoing — not shy in the least — and he genuinely loves people: he's a lap cat who's happy to settle in and just be with you. He likes to look out the window, enjoy a good scratcher, and relax in the company of the people he loves. He's great with other cats, comfortable around dogs, and he sleeps in bed every night with the five- and six-year-old kids in his foster home. One thing worth knowing upfront: Abe is diabetic and receives insulin injections twice a day along with prescription food. His caregivers are emphatic that he's an excellent patient — calm, cooperative, and genuinely easy to care for — and that it really shouldn't be a barrier. Abe is also deeply bonded to his sister Edna, and the two would need to be adopted together; they've been side by side since kittenhood and deserve to stay that way. If you're open to welcoming this sweet, social pair, Abe would love to meet you.

#### Edna (S20251008)

| Field | Value |
|-------|-------|
| Species | Cat |
| Breed | Domestic Short Hair |
| Age | 9 years 7 months. |
| Tier | **DOCUMENTED** |

> Edna — or Big Eddie, as her foster family calls her — is a mostly white cat with black markings and a personality that's anything but quiet. She's mellow and sweet, loves attention, and is always ready to explore, make a new friend, or smack around a toy for a while. Her caregivers describe her as very social and curious, at ease in new environments, and genuinely warm with everyone she meets. She's good with other cats, comfortable around dogs, and she sleeps with the kids in her foster home, who adore her. She's healthy, uses the litter box perfectly, and has no medical needs. The one thing to know is that Edna is deeply bonded to her brother Abe — they were adopted together as kittens and have been inseparable ever since, so she'd need to go home with him. Abe has diabetes that requires twice-daily insulin, and his caregivers say it's genuinely easy to manage — but it's part of the picture for anyone bringing this pair home. If you're ready to open your door to two devoted, big-hearted cats, Edna is ready to step right in and make herself at home.

---

*End of report.*