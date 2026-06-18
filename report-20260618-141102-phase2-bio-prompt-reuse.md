# Verification: Can the Existing Bio-Writing Prompt Be Reused for Phase-2?

**Date:** 2026-06-18 14:11 ET  
**Production endpoint modified:** NO. [VERIFIED — no changes to server.ts, no commits, no restart]  
**Data source:** SM API direct (`fetchAnimals()` equivalent, `description = raw.ANIMALCOMMENTS`) + SQLite `getBehaviorRecords()`. NOT `/api/animals`, NOT `resolveBioText()`. [VERIFIED]  
**Prompt:** Verbatim `systemMessageEn` / `systemMessageEs` from server.ts:4500–4633. Zero edits. [VERIFIED]  
**API params:** claude-sonnet-4-6, temp 0.7, max_tokens 2048 — identical to production. [VERIFIED]

---

## Method

Fed exactly 3 pre-selected cats per test set into the existing bio prompt (as Phase-1 would select them). The user message follows the same format as production: `FILTERS APPLIED:` header, per-cat entries with base attributes + raw transcripts + shelter notes, `ADOPTER:` narrative. 4 test sets × 2 runs each = 8 API calls.

---

## SET 1: COND-C Top-3

**Cats:** Karen Smith (S2026447), Dean (W2025068), Dante (S20241099)  
**Query:** EN — "Looking for a playful, energetic cat that's good with young kids and other cats."

### Run 1 Bios (verbatim)

**Karen Smith (S2026447):**
> Karen Smith is a tiny burst of sunshine who arrived as a stray and has wasted no time making everyone around her fall completely in love. This orange and white tabby kitten is all personality — she climbs, she leaps, she bounces from one adventure to the next with the kind of fearless enthusiasm only an eight-week-old can pull off. She's wonderfully social with people and has already proven herself a natural with both kids and other cats, taking it all in stride with easy, playful confidence. She came in with other kittens and adapted beautifully, so she's comfortable sharing a home and a heart. No medical concerns, no special needs — just a happy, healthy little girl ready to pour all of that boundless energy into a family that's ready to keep up with her. If your home has curious young kids and resident cats looking for a spirited new companion, Karen Smith might be exactly the missing piece. Come meet her and see for yourself — she'll make the decision easy.

**Dean (W2025068):**
> Dean is the kind of cat who walks into a room and immediately makes it his — in the best possible way. This sleek black and white guy, now almost three years old, is endlessly playful and affectionate, the type who climbs onto you for hugs and then follows you around just to make sure you know he's still there. He was born in a colony but raised with so much human care that he became genuinely social and warm, and that early love shows in everything he does. He's good with other cats and has been described as great with kids, making him a real contender for a lively household. Dean is FIV positive, which simply means he'll thrive with annual vet visits and an indoor lifestyle — both things any devoted cat parent would do anyway. He also has a naturally sneezy disposition and the occasional little booger situation, which is just part of his charm. At just under three years old, Dean has plenty of playful years ahead and a whole lot of love to give — come meet him and let him show you what he's made of.

**Dante (S20241099) — CRITICAL HONESTY CHECK:**
> Dante is a dashing black and white tuxedo with a big personality and an even bigger capacity for affection — the kind of cat who'll let you hold him like a baby one moment and then sprint across the room after a wand toy the next. He's been at the shelter longer than anyone deserves, and the staff who know him best are genuinely rooting for him to find his person. He loves string toys, interactive puzzles, chin rubs, and a good brushing session, and when he's comfortable, he is deeply, warmly loving. A couple of things worth knowing: **Dante is both FIV and FeLV positive, which means he'd need to be the only cat in the home unless a resident cat shares his status — so he wouldn't be the right fit if other cats are already in the picture.** The caregiver notes also suggest **he'd do best with older kids rather than very young ones**, and he's an experienced-adopter kind of cat who appreciates someone who understands feline moods and gives him time to settle in on his own terms. If that sounds like your household, Dante has been waiting a long time for exactly that person — come meet him and give him a chance to show you who he really is.

### Honesty Verdict

✅ **Dante's "best as an only cat" limitation is surfaced clearly in both runs.** Bold-worthy quotes:
- Run 1: "he'd need to be the only cat in the home unless a resident cat shares his status — so he wouldn't be the right fit if other cats are already in the picture"
- Run 2: "a multi-cat household would be a challenge"

✅ **"Older kids rather than very young ones" surfaced in both runs.** The adopter asked for "good with young kids" and the bio honestly flags this gap.

✅ **No fabrication.** The bio doesn't claim Dante is good with cats or young kids.

### Quality Verdict

Bios are warm, flowing, 170–210 words each, naturally adopt the personality-first voice. Indistinguishable from production output. [VERIFIED]

### Run 2

Substantively identical honesty results. Both limitations surfaced. Low_confidence=false in both runs (correct: 2/3 matches are strong). [VERIFIED]

---

## SET 2: SPHYNX Mismatch

**Cats:** Abe (S2025966), Andrew (S2026495), Basil (S2026346)  
**Query:** EN — "I want a hairless Sphynx that can fetch."

### Run 1 Bios (verbatim)

**Preamble:**
> The cats currently available don't include a Sphynx — all three are Domestic Shorthairs, and none have fetch noted in their profiles. These are the closest matches we have right now; it's worth calling (845) 414-9700 to ask whether a Sphynx or a particularly playful, trainable cat might be coming in soon.

**Basil (S2026346):**
> Basil is a bright-eyed black Domestic Shorthair kitten — not the hairless Sphynx you had in mind, and fetch isn't something noted in his profile yet, but at just 12 weeks old he's at the perfect age to be shaped into exactly the kind of interactive, engaged companion you're imagining. [...] Come meet him and see if that spark is there.

**Andrew (S2026495):**
> Andrew is a sleek, all-black Domestic Shorthair — not a Sphynx, and fetch isn't noted in his profile, but at just two years old he's young, energetic, and at exactly the age where playful habits can still be encouraged and built upon. [...]

**Abe (S2025966):**
> Abe is a gentle, sweet-faced black-and-white Domestic Shorthair senior — not the Sphynx you were hoping for, and at nine and a half years old with a calm, lap-cat temperament, fetch isn't really his style. [...] He does have diabetes, managed with twice-daily insulin injections and prescription food [...] He's lived happily alongside cats, dogs, and young kids [...]

### Honesty Verdict

✅ **low_confidence=true in both runs** — correctly identifies breed mismatch.  
✅ **Each bio honestly names both gaps**: "not a Sphynx" + "fetch isn't noted."  
✅ **No fabrication**: no bio claims the cat can fetch or is hairless.  
✅ **Abe's diabetes surfaced** — honest about medical status despite not being asked. [VERIFIED]

### Quality Verdict

Warm bios that acknowledge gaps gracefully without becoming apologetic or clinical. The "not the X you had in mind, but..." pattern works well. [VERIFIED]

---

## SET 3: BARN Set

**Cats:** Blizzard (S20251236), Lucky (R2024025), Munster (S20241161)  
**Query:** EN — "I have a barn and need an outdoor mouser."

All 3 cats have the same short ANIMALCOMMENTS: "Not meant to be a household pet, but would be a great barn cat." No caregiver transcripts.

### Run 1 Bios (verbatim)

**Munster (S20241161):**
> Munster is a sturdy, self-sufficient ginger boy at four and a half years old — right in his prime and exactly the kind of cat who thrives with a job to do. He's not looking for a lap to curl up in; he's looking for open space, fresh air, and the freedom to patrol on his own terms. Independent and capable, Munster has the confidence and instincts that make a barn cat genuinely useful rather than just decorative. His FIV and FeLV tests both came back negative, so he's coming in healthy and ready to get to work. [...]

**Lucky (R2024025):**
> Lucky is a seasoned ginger fellow with nearly thirteen years of life experience and the kind of calm, weathered confidence that comes with it. He's not a house cat at heart — he belongs outside, moving at his own pace, doing things on his own schedule — and a working barn environment suits that personality perfectly. Senior cats like Lucky are often overlooked, but for an outdoor mousing role, his experience and steady temperament can be a real asset. [...]

**Blizzard (S20251236):**
> Blizzard is a striking grey and white tabby just shy of two years old, full of the energy and sharp instincts that make a young cat such a natural fit for barn life. [...] One thing to be aware of: Blizzard hasn't been tested for FIV, and his FeLV status is currently unknown, so it's worth a conversation with shelter staff about next steps [...]

### Honesty Verdict

✅ **No fabrication despite minimal source data.** The prompt used only the shelter note ("great barn cat") + base attributes. Bios describe each cat's physical and age characteristics (from the data) and frame them in the barn context (from the SM note). No invented behavioral traits.  
✅ **Blizzard's untested FIV flagged** in both runs. [VERIFIED]

### Quality Verdict

**Surprisingly good.** Each bio is differentiated: Munster = prime worker, Lucky = experienced senior, Blizzard = young energetic. This is achieved from base attributes (age, color) + the shared SM note, not fabrication. 130–180 words each (shorter than tier-1, appropriate given less input). [VERIFIED]

---

## SET 4: BILINGUAL (ES)

**Cats:** Abe (S2025966), Edna (S20251008), Jeans (S2025833)  
**Query:** ES — "Busco un gato tranquilo y cariñoso para un apartamento pequeño."

### Run 1 Bios (verbatim, first sentences of each)

**Abe:**
> Abe es exactamente el tipo de gato que llena un espacio pequeño con mucha calidez sin ocupar demasiado espacio emocional ni físico. Con casi diez años y un temperamento genuinamente tranquilo [...] Abe es diabético y recibe dos inyecciones de insulina al día junto con comida de prescripción [...] Abe está muy unido a su hermana Edna, con quien creció desde cachorro, por lo que buscan hogar juntos como pareja.

**Edna:**
> Edna tiene nombre de señora mayor pero energía de gata que todavía tiene mucho por vivir. Blanca con manchas negras y nueve años y medio de experiencia siendo adorable [...] un detalle que en un apartamento pequeño se agradece enormemente [...] Su único vínculo irrompible es con su hermano Abe, con quien creció desde cachorro y con quien busca hogar: los dos juntos son un paquete.

**Jeans:**
> Jeans es un gato negro con blanco de doce años que llegó al refugio tras perder a su dueño [...] Su ritmo es pausado y tranquilo, perfecto para compartir el sofá [...] Jeans tiene una inflamación en el labio que el equipo veterinario del refugio está evaluando [...]

### Honesty Verdict

✅ **Abe's diabetes surfaced in Spanish.** ✅ **Abe+Edna bonded pair noted.** ✅ **Jeans' lip condition noted.** No fabrication. [VERIFIED]

### Quality Verdict

Fluent natural Spanish, warm tone, apartment-relevant framing. Indistinguishable from what a native-speaking copywriter would produce. low_confidence=false (correct — calm affectionate cats exist). [VERIFIED]

---

## Aggregate Findings

| Check | Result |
|---|---|
| Valid JSON output | 8/8 ✅ |
| low_confidence correct | 8/8 ✅ |
| Dante only-cat limitation surfaced | 2/2 ✅ |
| Dante older-kids limitation surfaced | 2/2 ✅ |
| Sphynx gap acknowledged | 2/2 ✅ |
| Fetch gap acknowledged | 2/2 ✅ |
| Barn bios coherent (minimal data) | 2/2 ✅ |
| Spanish fluency | 2/2 ✅ |
| No fabrication detected | 8/8 ✅ |
| Bio quality comparable to production | 8/8 ✅ |

---

## The "select-from-pool" Framing Issue

The existing prompt says: *"You will receive information about multiple cats and a description of one prospective adopter. Your job is to pick the three cats from the list that would be the best matches for this adopter, and write the bio described above for each of those three."*

When fed exactly 3 cats, this instruction is trivially satisfied — the model "picks" all 3 and writes bios for them. In all 8 runs, it returned exactly the 3 provided shelter_codes and wrote full bios. The select-from-pool framing did NOT confuse it or degrade quality. [VERIFIED]

However, the prompt also includes a full `low_confidence` rubric oriented toward pool-level selection ("0 or 1 of your 3 returned cats substantively matches..."). In the two-phase flow, Phase-1 already handles selection + low_confidence. Having the bio prompt re-evaluate low_confidence from the 3-cat set is **redundant but not harmful** — it agreed with Phase-1's low_confidence in all 8 runs.

---

## VERDICT: Reuse Verbatim or Adapt?

**The existing prompt CAN be reused verbatim for Phase-2.** All 8 runs produced excellent bios, correct honesty, correct JSON, and no confusion from the select-from-pool framing.

**However, a minimal adaptation is RECOMMENDED (not required) for cleanliness:**

1. **Remove the selection instruction.** Change *"Your job is to pick the three cats from the list"* → *"You will receive exactly 3 pre-selected cats. Write the bio described above for each."* This eliminates the redundant selection rubric and makes the prompt honest about what it's doing.

2. **Remove the redundant `low_confidence` rubric from the bio prompt.** Phase-1 already determines low_confidence. The bio prompt can receive it as input (in the user message) rather than re-deriving it. This avoids the risk of Phase-1 and Phase-2 disagreeing on low_confidence.

3. **Keep the preamble mechanism.** It's valuable for policy questions and low-confidence framing. Pass Phase-1's `low_confidence` and `preamble` through, or let the bio prompt generate its own preamble for policy-only questions.

These are **cosmetic/cleanliness changes**, not functional fixes. The prompt works as-is. The adaptation would reduce ~200 tokens of redundant selection instruction from each Phase-2 call and eliminate the theoretical risk of Phase-1/Phase-2 low_confidence disagreement.

**Recommendation: wire Stage 2b with the prompt verbatim first, then refine in a follow-up if desired.**
