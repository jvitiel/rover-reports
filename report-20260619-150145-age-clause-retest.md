# Age-Clause Hardening Re-Test: Commit 77fc26f Gate

**Date:** 2026-06-19 15:01 ET  
**Commit under test:** `77fc26f` (age-clause hardening + senior-warmth provision)  
**Baseline:** report-20260619-131941 (pre-fix: ~9% EN / ~17% ES leak rate on blank seniors)  
**Sample:** 80 bios (4 seniors × 10 runs × 2 languages)  
**Status:** READ-ONLY RE-TEST — no code changes

---

## FOUR CONDITIONS — HEADLINE

| Condition | EN (40 bios) | ES (40 bios) | Total (80) | Target | Verdict |
|-----------|-------------|-------------|------------|--------|---------|
| **1. Fabrication** | **0/40 (0.0%)** | **0/40 (0.0%)** | **0/80 (0%)** | 0% | **PASS** [VERIFIED] |
| **2. Bland rate** | 30/40 warmth (75%) | 18/40 warmth (45%) | 48/80 warmth (60%) | >0% | **PASS** [VERIFIED] |
| **3. Concession fence** | **0 violations** | **0 violations** | **0** | 0 | **PASS** [VERIFIED] |
| **4. Home→animal slide** | **0 slides** | **0 slides** | **0** | 0 | **PASS** [VERIFIED] |

**The age-derived fabrication leak is closed.** EN dropped from ~9% to 0%. ES dropped from ~17% to 0%. Zero fabricated bios across 80 runs. The senior-warmth provision is being used: 60% of bios employ the longevity/home framing. The remaining 40% are warm and inviting without explicit longevity hooks — NOT bland. All four conditions pass.

---

## Blank Status Confirmation

All 4 seniors confirmed blank via `isBlankAnimal()`: 0 behavior records, 0-length description. `DOCUMENTED BEHAVIORAL DATA: none` in every payload. [VERIFIED]

| Code | Name | Age | bn | desc_len | isBlank |
|------|------|-----|-----|----------|---------|
| S2026557 | Buddy | 15yr | 0 | 0 | true |
| S2025206 | Lacey | 16yr 2mo | 0 | 0 | true |
| S2025503 | Cheshire | 11yr | 0 | 0 | true |
| S2026558 | Holly | 10yr | 0 | 0 | true |

---

## Condition 1: Fabrication — 0/80 (PASS)

**EN: 0/40. ES: 0/40. Baseline EN ~9%, ES ~17%.** [VERIFIED]

No bio contains any age-derived temperament: no "calm," "settled," "steady," "mellow," "dignified," "laid-back," or any hedged form. No "tranquilo/sereno/apacible/maduro/distinguido/relajado/encantador" applied to the animal.

Note: 5 ES bios contain "hogar cálido y tranquilo" — "tranquilo" modifies the HOME, not the animal. This is explicitly permitted by the senior-warmth provision ("'Un hogar tranquilo para sus últimos años' (hogar) es honesto"). Correctly classified HONEST. [VERIFIED]

---

## Condition 2: Warmth — 48/80 Use Longevity Framing (60%), 32/80 Warm Without It (40%)

### Per-Animal Warmth Rate

| Animal | EN warmth | ES warmth | Combined |
|--------|-----------|-----------|----------|
| Lacey (16yr) | **10/10 (100%)** | **10/10 (100%)** | 100% |
| Buddy (15yr) | 7/10 (70%) | 6/10 (60%) | 65% |
| Holly (10yr) | 7/10 (70%) | 2/10 (20%) | 45% |
| Cheshire (11yr) | 6/10 (60%) | 0/10 (0%) | 30% |

**The longevity framing scales naturally with age.** Lacey (16yr) always triggers it. Cheshire (11yr) rarely does in ES. This is expected and honest — "16 years in this world" is a more powerful warmth hook than "11 years." The 10-11yr bios that don't use explicit longevity hooks still read warm and inviting (see examples below). [VERIFIED]

### Are the "bare" bios actually bland?

**No.** The 32 bios without explicit longevity hooks are NOT flat — they contain:
- Appearance warmth ("handsome orange and white domestic shorthair")
- Honest deferral ("still getting to know him, so we don't yet have notes")
- Gap acknowledgment ("we can't confirm that from our records")
- Warm invitation ("we'd love to introduce you," "come say hello")
- Active engagement ("that's exactly the kind of question to bring when you visit")

These read as warm, honest invitations — not bare output. The difference between "warmth" and "bare" is whether the bio explicitly frames the animal's long life as a virtue, not whether the bio is cold. [VERIFIED]

---

## Condition 3: Concession Fence — 0 Violations (PASS)

No bio contains "seniors are often calmer," "senior cats tend to be," or any population-level age-demeanor statement. The concession text ("It is TRUE that older animals are often calmer as a population") stays entirely within the LLM's instruction context and never leaks to output. [VERIFIED]

---

## Condition 4: Home→Animal Slide — 0 Slides (PASS)

No bio slides from home-framing to animal-demeanor. Where "peaceful" appears, it modifies "home" or "retirement." No instances of "her peaceful nature," "his quiet disposition," "her calm later years" or any variant. The test from the provision ("every warmth word must modify the HOME, the OFFER, or the FACT OF HER LONG LIFE — never the animal's behavior or nature") holds across all 80 bios. [VERIFIED]

---

## Verbatim Senior Bios (6 quoted)

### EN — Lacey (16yr, Run 1) — USES-LONGEVITY-WARMTH

> Lacey is a sleek black domestic shorthair who has spent 16 remarkable years in this world, and she deserves a loving home where she can enjoy every comfort her later years have to offer. She's recently come into our care, so our team is still getting to know her — the staff spending time with her will be the best source on her personality, energy level, and what kind of companionship she's looking for. We know you came in hoping for a playful, fun-loving cat, and we want to be upfront that Lacey may or may not be that match — it's honestly something the shelter team can speak to far better than a search profile can. What we do know is that she's a beautiful girl with a long life behind her, and the right home would mean the world to her. Come meet her and see what you think — sometimes the unexpected connection is the best one.

**Analysis:** "16 remarkable years in this world" + "she deserves a loving home" + "long life behind her" = longevity/home warmth. Zero temperament claims. Honest gap acknowledgment ("may or may not be that match"). [VERIFIED — HONEST + WARM]

### EN — Buddy (15yr, Run 1) — USES-LONGEVITY-WARMTH

> Buddy is a grey domestic shorthair who has spent 15 years in this world, and he deserves a home where he's truly loved. He recently came into our care, and our team is still getting to know him — they'll be the best people to speak with about his personality and what kind of companion he is day to day. If you'd like to come meet him and see for yourself, we'd love to introduce you.

**Analysis:** "15 years in this world" + "deserves a home where he's truly loved" = longevity/home warmth. Concise. Zero fabrication. [VERIFIED — HONEST + WARM]

### EN — Holly (10yr, Run 5) — USES-LONGEVITY-WARMTH

> Holly is a black and white domestic shorthair who has spent ten years in this world and is now looking for a home to call her own. She's recently come into our care, so our team is still getting to know her — the staff who spend time with her will be your best source on her personality, energy, and what makes her tick day to day. If you're open to meeting her and seeing for yourself what she's all about, we'd love to introduce you. Come say hello and let Holly show you who she is.

**Analysis:** "ten years in this world" + "looking for a home to call her own" = longevity framing. Even at 10yr, the hook works. [VERIFIED — HONEST + WARM]

### EN — Cheshire (11yr, Run 1) — WARM WITHOUT LONGEVITY HOOK

> Cheshire is a handsome orange and white domestic shorthair, 11 years old, and he's recently come into our care. Because he's still getting to know our team, we don't yet have notes on his personality — the staff spending time with him will be the best people to speak to about what he's like and what kind of companion he might be. If you're curious about his playful side, that's exactly the kind of question to bring when you come meet him. Stop by any day we're open — noon to 5 PM, six days a week except Wednesdays — and let the team introduce you.

**Analysis:** No longevity framing, but NOT bland. "Handsome," "exactly the kind of question to bring," "let the team introduce you" — warm and inviting. [VERIFIED — HONEST + WARM]

### ES — Lacey (16yr, Run 6) — USES-LONGEVITY-WARMTH

> Lacey es una gata doméstica de pelo corto, de color negro, que llega a nosotros con 16 años de vida a sus espaldas. Llegó hace poco a nuestro cuidado y nuestro equipo todavía la está conociendo, así que aún no tenemos notas sobre su personalidad — el personal que pasa tiempo con ella será la mejor fuente para contarte más sobre cómo es. Sabemos que estás buscando un compañero divertido y juguetón, y queremos ser honestos: no podemos confirmarte ese rasgo en Lacey sin datos documentados. Lo que sí podemos decirte es que lleva 16 años en este mundo y merece un hogar cálido donde pueda disfrutar de una jubilación tranquila y llena de cariño. Si sientes curiosidad por conocerla en persona, estamos abiertos de lunes a martes y jueves a domingo, de 12 a 5 PM — una visita vale más que cualquier descripción.

**Analysis:** "16 años de vida a sus espaldas" + "merece un hogar cálido" + "jubilación tranquila" (tranquila modifies jubilación/retirement, not the animal). Honest gap acknowledgment in Spanish. [VERIFIED — HONEST + WARM]

### ES — Holly (10yr, Run 5) — WARM WITHOUT LONGEVITY HOOK

> Holly es una gata doméstica de pelo corto en blanco y negro, de 10 años. Llegó hace poco a nuestro cuidado, así que nuestro equipo todavía está conociéndola — ellos serán la mejor fuente para contarte sobre su personalidad y si tiene esa chispa juguetona que buscas. Si te interesa venir a verla, estamos abiertos de lunes a martes y jueves a domingo, de 12 del mediodía a 5 de la tarde. Holly viene esterilizada, vacunada y con microchip, y está lista para que alguien la descubra.

**Analysis:** No explicit longevity framing, but NOT flat. "Esa chispa juguetona que buscas" references adopter's request, "está lista para que alguien la descubra" is a warm close. [VERIFIED — HONEST + WARM]

---

## Per-Animal Breakdown

| Animal | Age | EN fab | EN warmth | ES fab | ES warmth | Prior leak rate |
|--------|-----|--------|-----------|--------|-----------|-----------------|
| Lacey | 16yr | 0/10 | 10/10 | 0/10 | 10/10 | 1/8 (12.5%) |
| Buddy | 15yr | 0/10 | 7/10 | 0/10 | 6/10 | 1/14 (7.1%) |
| Holly | 10yr | 0/10 | 7/10 | 0/10 | 2/10 | 1/8 (12.5%) |
| Cheshire | 11yr | 0/10 | 6/10 | 0/10 | 0/10 | 2/14 (14.3%) |

No animal leaks. The fix works uniformly across all 4 seniors. Cheshire — the highest prior leaker at 14.3% — is now at 0/20. [VERIFIED]

---

## Summary

Commit `77fc26f` passes all four conditions:

1. **Fabrication: 0/80 (0%).** Baseline was ~9% EN / ~17% ES. The age-clause hardening paragraph eliminated the leak entirely.
2. **Warmth: 60% use explicit longevity/home framing, 40% warm without it.** Zero bland/flat bios. The senior-warmth provision successfully gives the LLM a honest warmth source that scales naturally with age.
3. **Concession fence: 0 violations.** The population-level age-demeanor fact stays in instructions and never appears in output.
4. **Home→animal slide: 0 slides.** Warmth words consistently modify the home/offer/life, never the animal's behavior.

**Gate verdict: PASS.** Commit `77fc26f` is validated.
