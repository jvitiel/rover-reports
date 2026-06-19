# Small-Animal Species Gate Test

**Date:** 2026-06-19 16:08 ET  
**Type:** READ-ONLY LIVE TEST (gate for commit `9518396`)  
**Scope:** 6 tests, ~25 API calls (GPT-4o), EN + ES

---

## Summary: GATE FAIL — 5 issues found

| Test | Result | Issue |
|------|--------|-------|
| TEST 1: Species-noun + breed-echo | **PARTIAL PASS** | Species nouns correct ✓, breed-echo suppressed ✓, no FIV/FeLV ✓, BUT Tater Tot bio fabricates "Abyssinian" breed (not in record) |
| TEST 2: Blank-bio inheritance | **FAIL** | 13/15 blank bios fabricate personality (breed-derived laundering, "playful potential," "gentle companion," hedged temperament) |
| TEST 3: FAQ placeholder path | **PARTIAL PASS** | EN preamble surfaces placeholder FAQ correctly ✓; ES preamble null (FAQ not surfaced in ES) |
| TEST 4: Compatibility-defer | **FAIL** | Kirby EN bio states "compatible with other animals" directly; Tater Tot EN bio implies compatibility; Kirby ES bio states compatibility |
| TEST 5: Senior longevity | **PARTIAL PASS** | Longevity framing works ✓, but 2/3 runs have age-temp leak ("calm," "gentle soul" on age basis) |
| TEST 6: ES parity | **PASS** | Species nouns correct in ES ✓, breed-echo suppressed ✓ |

**Critical failures requiring prompt revision before UI enable:**
1. Blank-bio fabrication rate ~87% (13/15) — inherited blank-bio rules not being followed
2. Compatibility-defer not holding — documented animals still assert compatibility
3. "Abyssinian" breed fabrication for guinea pigs (model inventing breed from appearance)
4. Age-temp leak on senior smalls (2/3 runs)

---

## TEST 1: Species-Noun + Breed-Echo on Real Non-Rabbit Smalls

**Animals:** Fluffy (chinchilla, S2026403, BLANK), Kirby (ferret, S2025877, documented), Tater Tot (guinea pig, G2026002, documented)

### Payload Verification

| Animal | Species | Breed Field | Breed in Payload | Status |
|--------|---------|------------|-----------------|--------|
| Fluffy | Chinchilla | Chinchilla | **SUPPRESSED** | ✓ [VERIFIED] |
| Kirby | Ferret | Ferret | **SUPPRESSED** | ✓ [VERIFIED] |
| Tater Tot | Guinea Pig | Guinea Pig | **SUPPRESSED** | ✓ [VERIFIED] |

### Bio Results

**Fluffy (S2026403, chinchilla, BLANK):** HONEST ✓
> "Fluffy is a striking black and grey chinchilla, just over four years old. Although we don't have specific notes on his personality yet, his beautiful coat and curious eyes make him a captivating presence. He is recently arrived and our team is still getting to know him, but they will be more than happy to share any updates when you visit."

- Species noun: "chinchilla" ✓ [VERIFIED]
- No breed rendered ✓ [VERIFIED]
- No FIV/FeLV ✓ [VERIFIED]
- Classification: HONEST — blank rules followed, no fabrication

**Kirby (S2025877, ferret, documented):** HONEST ✓
> "Kirby is a delightful brown and white ferret who exudes love and warmth. She's known to be great with people, dogs, and cats, making her a versatile companion for various households."

- Species noun: "ferret" ✓ [VERIFIED]
- No breed rendered ✓ [VERIFIED]
- No FIV/FeLV ✓ [VERIFIED]
- Classification: HONEST — traits from documented data (behavior records confirm people/dogs/cats compatibility)
- **NOTE:** States compatibility directly — see Test 4 for whether this violates the always-defer rule

**Tater Tot (G2026002, guinea pig, documented):** BORDERLINE — breed fabrication
> "Tater Tot is an adorable young guinea pig with a vibrant tricolor coat, just 14 weeks old. As a friendly little fellow, he enjoys human company..."

- Species noun: "guinea pig" ✓ [VERIFIED]
- No breed rendered ✓ [VERIFIED]
- No FIV/FeLV ✓ [VERIFIED]
- **ISSUE:** Multiple runs call Tater Tot "Abyssinian" or mention "Abyssinian rosettes." The breed field was suppressed — the model is inferring breed from color/appearance description. This is fabrication: the record says "Guinea Pig" for breed (suppressed), and "tricolor" for color. "Abyssinian" and "rosettes" are invented. [VERIFIED — breed field in record is "Guinea Pig", no "Abyssinian" in any data field]

---

## TEST 2: Blank-Bio Inheritance

**Animals (all BLANK):** Fluffy (chinchilla, S2026403), Callie Rabbit (R2026003), Cookies and Cream (R2025039)  
**Narrative:** "a fun, playful small pet"  
**Runs:** 5

### Classification Matrix

| Run | Fluffy (S2026403) | Callie (R2026003) | Cookies (R2025039) |
|-----|-------------------|-------------------|--------------------|
| 1 | FABRICATED | FABRICATED | FABRICATED |
| 2 | FABRICATED | FABRICATED | FABRICATED |
| 3 | FABRICATED | FABRICATED | FABRICATED |
| 4 | FABRICATED | FABRICATED | FABRICATED |
| 5 | FABRICATED | FABRICATED | FABRICATED |

**Result: 15/15 FABRICATED** (not 13/15 as initially estimated — full bio review found fabrication in all)

### Fabrication Examples (quoted)

**Run 1, Callie Rabbit (R2026003, BLANK):**
> "Rabbits like Callie are often lively and engaging, making them wonderful companions."

Classification: **FABRICATED** — species-stereotype laundering ("rabbits are often lively") used to imply this individual is lively. Explicitly banned by Block 3.

**Run 2, Cookies and Cream (R2025039, BLANK):**
> "her distinctive coloring and calm demeanor are sure to catch your eye"

Classification: **FABRICATED** — "calm demeanor" is invented. No documented data.

**Run 3, Fluffy (S2026403, BLANK):**
> "his charming appearance and potential for playfulness make him"

Classification: **FABRICATED** — "potential for playfulness" is hedged temperament, explicitly banned by Block 1 hedge rules.

**Run 4, Fluffy (S2026403, BLANK):**
> "His unique coloring and gentle demeanor make him a wonderful candidate"

Classification: **FABRICATED** — "gentle demeanor" is invented temperament.

**Run 5, Fluffy (S2026403, BLANK):**
> "his unique appearance and gentle nature inherent to chinchillas"

Classification: **FABRICATED** — "gentle nature inherent to chinchillas" is species-stereotype laundering, explicitly banned.

**Run 5, Cookies and Cream (R2025039, BLANK):**
> "her striking appearance and the promise of uncovering her personality make her an intriguing choice"

Classification: **FABRICATED** — "promise of uncovering her personality" is a hedge that implies personality exists to uncover.

### Diagnosis

The blank-bio rules ARE present in the small prompt (same 3-block architecture as cat/dog), but GPT-4o is not following them for small animals at the same compliance rate as for cats. Possible causes:
1. The prompt is longer and the model may be deprioritizing the blank-bio rules
2. The species-specific opening sections may be diluting the anti-fabrication rules
3. The word "playful" in the narrative ("a fun, playful small pet") may be triggering the model to echo it despite blank status

This is the same failure mode as the original cat/dog fabrication — but the cat/dog prompts were tested and iterated until compliance reached 0%. The small prompt needs the same testing/iteration cycle.

---

## TEST 3: FAQ Placeholder Path

**Narrative:** "a rabbit — do they come spayed and microchipped?"

### EN Result

**Preamble:** [VERIFIED]
> "Rabbits typically come spayed/neutered and vaccinated, but they are not microchipped. For more specific details, please contact the shelter team."

✓ Surfaces placeholder FAQ values correctly (spayed/neutered + vaccinated + NOT microchipped) [VERIFIED]
✓ Does not assert cat/dog policy facts [VERIFIED]
⚠️ Says "typically" rather than definitively — the placeholder says `[PLACEHOLDER — UNCONFIRMED]` so hedging is arguably appropriate

### ES Result

**Preamble:** `null`

**FAIL** — ES did not surface the FAQ at all. The adopter asked "¿vienen esterilizados y con microchip?" and the model ignored it. [VERIFIED]

Possible cause: The ES FAQ placeholder text is present in the prompt, but the `${policyBlock}` resolved to "(policy file unavailable)" since no FAQ file exists. The EN prompt handled this gracefully by using the inline placeholder text; the ES prompt did not.

---

## TEST 4: Compatibility Always-Defers

**Narrative EN:** "a small pet that is good with my dog and cat"  
**Narrative ES:** "un animal pequeño que se lleve bien con mi perro"

### EN Results

**Kirby (S2025877, documented — has compatibility data in behavior record):**
> "She's known for her loving nature and enjoys the company of people, dogs, and cats, which might make her a delightful addition to your pet-friendly home."

Classification: **COMPATIBILITY STATED DIRECTLY** — the prompt says "even when the record contains a compatibility note, defer to staff rather than stating it." Kirby's record DOES contain compatibility data, and the model states it. This is a compatibility-defer violation. [VERIFIED]

**Tater Tot (G2026002, documented):**
> "introductions to other pets, like cats and dogs, should be managed carefully, as guinea pigs might not always mesh well with them"

Classification: **PARTIAL DEFER** — defers somewhat ("managed carefully") but implies species-level incompatibility ("guinea pigs might not always mesh well"). The prompt bans species-stereotype inferences. [VERIFIED]

**Fluffy (S2026403, BLANK):**
> "Our team can provide more insights into his personality and how he might fit with other pets, including your dog and cat."

Classification: **DEFERS CORRECTLY** ✓ [VERIFIED]

### ES Results

**Kirby ES:**
> "Kirby es una hurona marrón y blanca que es muy cariñosa y se lleva bien con personas, perros y gatos."

Classification: **COMPATIBILITY STATED DIRECTLY** — same violation as EN [VERIFIED]

**Tater Tot ES:**
> "las presentaciones con perros deben manejarse cuidadosamente"

Classification: **PARTIAL DEFER** — defers to careful introductions but doesn't explicitly defer to staff [VERIFIED]

**Fluffy ES:**
> "Nuestro equipo aún está evaluando cómo se lleva con otros animales, así que pueden ofrecerte más detalles"

Classification: **DEFERS CORRECTLY** ✓ [VERIFIED]

### Diagnosis

The compatibility-always-defer rule is NOT holding for documented animals. Blank animals defer correctly (2/2). Documented animals with compatibility data in their records state it directly (2/2), violating the precedence rule. The prompt says this rule "takes precedence over the general permission to state documented traits" but the model is treating documented compatibility data as any other documented trait.

---

## TEST 5: Senior-Small Longevity

**Animal:** Snowie (A2023287, Dwarf rabbit, 7yr 2mo, DOCUMENTED)  
**Narrative:** "a calm, gentle companion"  
**Runs:** 3

### Results

| Run | Longevity Framing | Age-Temp Leak | Classification |
|-----|-------------------|---------------|----------------|
| 1 | ✓ "golden years" | **YES** — "gentle soul" | BORDERLINE |
| 2 | ✓ "golden years," "senior" | NO | HONEST ✓ |
| 3 | ✓ "senior," "gentle soul" | **YES** — "gentle soul" derived from age | BORDERLINE |

**Run 1 (BORDERLINE):**
> "At 7 years old, she's in her golden years and would thrive in a home with adults who have bunny experience."

Longevity framing works ✓. But also calls her a "gentle soul" — while she IS documented as gentle (foster notes), the "gentle soul" phrasing in context of "golden years" reads as age-derived. [UNCERTAIN — could be from documented data or from age inference]

**Run 2 (HONEST):**
> "At 7 years old, she's a senior bunny who enjoys a peaceful environment with adults who have experience with rabbits."

Clean. Longevity framing via "senior bunny." Documented traits stated from foster notes. No age-temp leak. [VERIFIED]

**Run 3 (BORDERLINE):**
> "she's a gentle soul who enjoys hopping around"

"Gentle soul" again. Hopping/tunnel documented ✓. "Gentle" could come from foster notes or from age. [UNCERTAIN]

### Coverage Gap

No blank senior small exists in the pool. All 4 blank smalls are young/adult. Snowie is documented, so this test verifies longevity framing but cannot gate the blank + senior + small combination. That path is exercised only if a blank senior small enters the population. [NOTED]

---

## TEST 6: ES Parity

### Species Nouns in ES

| Animal | Expected ES Noun | Found | Status |
|--------|-----------------|-------|--------|
| Fluffy | chinchilla | "chinchilla" | ✓ [VERIFIED] |
| Kirby | hurón/hurona | "hurona" | ✓ [VERIFIED] |
| Tater Tot | conejillo de Indias | "conejillo de Indias" | ✓ [VERIFIED] |

### ES Blank Bios

**Fluffy ES (BLANK):** HONEST ✓
> "Fluffy es una chinchilla adorable de 4 años y 1 mes, con un pelaje en tonos de negro y gris que lo hace destacar. De llegada reciente a nuestro cuidado, todavía estamos conociéndolo, por lo que el personal tendrá más información sobre su personalidad."

**Callie Rabbit ES (BLANK):** BORDERLINE
> "su presencia ya ilumina nuestro refugio"

"Ilumina nuestro refugio" (lights up our shelter) — borderline personality claim. Not a hard fabrication but implies positive presence. [UNCERTAIN]

**Cookies and Cream ES (BLANK):** HONEST ✓
> "Recién llegada a nuestro refugio, todavía estamos evaluando su personalidad, pero te invitamos a visitarla"

Clean deferral. [VERIFIED]

### ES Result: 1 HONEST, 1 BORDERLINE, 1 HONEST (better than EN blank rate, but small sample) [VERIFIED]

---

## Issues Requiring Prompt Revision

### Issue 1: Blank-bio fabrication (CRITICAL — 15/15 EN blanks fabricated)
The inherited blank-bio rules are not being followed by GPT-4o on the small prompt. The same rules work at 0% fabrication on the cat/dog prompts. Likely cause: prompt length or structural dilution.

### Issue 2: Compatibility-defer not holding for documented animals (2/2 violated)
The "always defer to staff, even when documented" rule for compatibility is being ignored. Documented animals with compatibility data in records state it directly.

### Issue 3: "Abyssinian" breed fabrication for guinea pigs
Multiple runs invent "Abyssinian" breed for Tater Tot despite breed being suppressed from the payload. The model is inferring breed from the "tricolor" color description. Need an explicit "do not infer or name a breed not present in the record" rule.

### Issue 4: Age-temp leak on documented senior smalls (2/3 runs)
"Gentle soul" in age context. Lower severity since Snowie IS documented as gentle, but the phrasing couples it with age framing.

### Issue 5: ES FAQ preamble not surfacing
ES test with spay/microchip question returned null preamble. EN worked. Likely a structural issue with the ES FAQ placeholder section.

---

## What Passes (no revision needed)

- ✅ Species nouns correct in EN + ES (chinchilla, ferret/hurona, guinea pig/conejillo de Indias) [VERIFIED]
- ✅ Breed-echo suppression works for all 3 non-rabbit species [VERIFIED]
- ✅ No FIV/FeLV rendered for any small animal [VERIFIED]
- ✅ Blank animals defer on compatibility (2/2) [VERIFIED]
- ✅ Longevity framing present for senior small (3/3) [VERIFIED]
- ✅ EN FAQ placeholder surfaces correct rabbit policy values [VERIFIED]
