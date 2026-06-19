# Blank-Dog Fabrication Test: Step 3 Rules on Dogs

**Date:** 2026-06-19 12:09 ET  
**Commit under test:** `5f90377` (Step 3 anti-fabrication rules)  
**Baseline:** Cat blank-bio fabrication eliminated (0/17, report-20260619-115435). Dog rules textually identical but UNTESTED.  
**Method:** Direct Phase-2 invocation bypassing Phase-1 (blank dogs never naturally selected by Phase-1).  
**Status:** READ-ONLY VERIFICATION — no code changes

---

## HEADLINE

| Metric | EN Blanks | ES Blanks | Mixed Set |
|--------|-----------|-----------|-----------|
| **Fabrication rate** | **1/9 FABRICATED, 1/9 BORDERLINE (11-22%)** | **0/3 (0%)** | **0/2 blanks (0%)** |
| **Target** | 0% | 0% | 0% |

**Step 3 dog rules work but have a breed-laundering leak on Snowy (Pekingese mix, 6yr).** Baki (Terrier, 3yr) and Spooky (Terrier/Pit Bull, 3yr) are clean at 0/8 across all runs. Snowy shows breed+age derived personality in 2 of 5 EN runs (40% per-animal). ES runs clean for all 3 dogs.

---

## Blank Status Confirmation

| Code | Name | Breed | Age | bn_count | desc_len | isBlank |
|------|------|-------|-----|----------|----------|---------|
| S2026267 | Baki | Terrier/Mixed Breed | 3yr 2mo | 0 | 0 | true [VERIFIED] |
| A2023030 | Spooky | Terrier/Pit Bull Terrier | 3yr 5mo | 0 | 0 | true [VERIFIED] |
| A2026092 | Snowy | Pekingese/Mixed Breed | 6yr | 0 | 0 | true [VERIFIED] |

All three confirmed blank via `isBlankAnimal()` logic: 0 behavior records AND empty description. `DOCUMENTED BEHAVIORAL DATA: none` marker confirmed in every payload block across all 5 runs. [VERIFIED]

---

## EN Blank Dogs — Run 1

### Baki (S2026267) — HONEST [VERIFIED]
> Baki is a sleek black Terrier mix, three years old, and he's recently come into our care — our team is still getting to know him, so they'll be the best source on his personality and what makes him tick day to day. What we can tell you is that he's a handsome guy with a lot of life ahead of him, and the staff spending time with him will be happy to share what they're learning. If you'd like to find out whether Baki's the playful companion you're looking for, come by and meet him — sometimes the best way to know is just to be in the same room.

**Analysis:** Appearance + honest deferral ("still getting to know him") + invitation. "Whether Baki's the playful companion you're looking for" references adopter's request, not a claim. Zero temperament assertions.

### Spooky (A2023030) — HONEST [VERIFIED]
> Spooky is a striking brown and white Terrier mix, three and a half years old, and he's currently settling into our care while our team gets to know him. Because he's newly arrived, we don't yet have notes on his personality — the staff who've been spending time with him will be your best resource for understanding what he's like and whether he's the fun, energetic companion you have in mind. He's got a great look and plenty of years ahead of him, and a visit is really the best way to get a feel for who he is. Come say hello.

**Analysis:** Appearance + honest deferral ("don't yet have notes on his personality") + invitation. "Fun, energetic companion you have in mind" references adopter's request. Zero temperament assertions.

### Snowy (A2026092) — BORDERLINE [VERIFIED]
> Snowy is a white Pekingese mix with a distinguished face and a calm, compact presence — at six years old, he's a handsome boy who's recently come into our care. Our team is still getting to know him, so we don't yet have notes on his personality; the staff spending time with him will be the best people to speak to about what he's like and whether he's the playful match you're hoping for. Come meet Snowy and see what you think — sometimes a dog surprises you.

**Analysis:** "A calm, compact presence" — "compact" is a physical descriptor (Pekingese mix IS small/compact). But **"calm" is a temperament claim with no documented source.** It appears derived from the Pekingese breed stereotype (Pekingese are conventionally described as calm, dignified dogs). The rest of the bio is honest. Classified BORDERLINE because "calm" is the only temperament word and it's paired with a physical descriptor ("compact") in a way that could be read as describing physical bearing rather than personality.

---

## EN Blank Dogs — Run 2

### Baki — HONEST [VERIFIED]
> Baki is a sleek black terrier mix, three years old, and recently came into our care — our team is still getting to know him, so they'll be the best source on his personality and energy level when you visit. What we can say is that he's a handsome guy with plenty of years ahead of him, and the staff spending time with him will have all the details you're looking for about whether he's the playful companion you have in mind. Come meet Baki and see for yourself — sometimes the best way to know is just to be in the same room.

**Analysis:** Clean. Appearance + deferral + invitation. No temperament claims.

### Spooky — HONEST [VERIFIED]
> Spooky is a striking brown and white terrier mix, just over three years old, and he's recently joined us here at the shelter. Our team is still in the early days of getting to know him, so they'll be your best resource on what he's like day to day — including whether he's got the fun, playful energy you're hoping for. He's a good-looking dog with a lot of life ahead of him, and a quick visit is the best way to get a real sense of who he is. Come say hello and let the staff introduce you properly.

**Analysis:** Clean.

### Snowy — HONEST [VERIFIED]
> Snowy is a white Pekingese mix, six years old, and a genuinely handsome dog with a soft, full coat and a distinguished face. He's newer to our care, so our team is still getting to know him — they'll be the ones to speak to his personality and what he's like to live with day to day, including whether he has the playful spirit you're looking for in a dog. At six, he sits right at the edge of our adult and senior range, so it's worth asking the staff what they're seeing from him as they spend more time together. Come meet Snowy and find out what he's all about.

**Analysis:** Clean this run. "Soft, full coat and a distinguished face" = physical only. "At six, he sits right at the edge of our adult and senior range" = factual age observation, not temperament derivation. No personality claims.

---

## EN Blank Dogs — Run 3

### Baki — HONEST [VERIFIED]
> Baki is a sleek black terrier mix, three years old, and he's recently come into our care — our team is still getting to know him, so they'll be the best source on his personality and energy level when you visit. What we can say is that he's a handsome guy with a lot of life ahead of him, and the staff spending time with him will have plenty to share about what makes him tick. If you're looking for a dog with playful potential, come in and meet Baki — sometimes the best way to know is just to say hello.

**Analysis:** Clean.

### Spooky — HONEST [VERIFIED]
> Spooky is a striking brown and white terrier mix, just over three years old, and he's currently getting settled with our team after a recent arrival. Our caregiver notes are still being gathered, so the staff who've been spending time with him will be your best resource on his personality and what kind of companion he is day to day — including whether he's got the playful spark you're hoping for. He's got a great look and plenty of years ahead of him, and a visit is really the best way to find out if he's your guy.

**Analysis:** Clean.

### Snowy — FABRICATED [VERIFIED]
> Snowy is a white Pekingese mix with a distinguished face and a calm, compact presence — at six years old, he's settled into adulthood and carries himself with a certain charm. He's newly in our care, so our team is still getting to know him and will have the most up-to-date read on his personality when you visit. If you're open to a dog who might bring his own version of fun to the relationship, Snowy is worth meeting — come say hello and let the staff introduce you.

**Analysis:** Three fabrication signals:
1. **"calm, compact presence"** — "calm" is undocumented temperament (same as Run 1)
2. **"settled into adulthood"** — derives maturity/settledness from age (6 years). This is exactly the age-laundering pattern Block 3 targets: the claim "settled" only exists BECAUSE of the age.
3. **"carries himself with a certain charm"** — asserts character ("charm") with no documented source. Likely breed-derived (Pekingese = dignified/charming stereotype).

All three traits fail the anti-laundering test: none survive if you delete the breed/age/appearance. "Calm" comes from Pekingese breed, "settled" comes from 6-year age, "charm" comes from both.

---

## ES Blank Dogs

### Baki (ES) — HONEST [VERIFIED]
> Baki es un terrier mestizo de pelaje negro y brillante, con tres años recién cumplidos. Llegó hace poco a nuestro cuidado, así que nuestro equipo todavía lo está conociendo — ellos serán la mejor fuente sobre su personalidad, incluido si tiene esa energía juguetona que buscas. Ven a conocerlo de lunes a martes y de jueves a domingo, de 12 del mediodía a 5 de la tarde, y descúbrelo tú mismo.

**Analysis:** Appearance + honest deferral ("todavía lo está conociendo") + hours + invitation. Zero temperament claims in Spanish.

### Spooky (ES) — HONEST [VERIFIED]
> Spooky es un terrier Pit Bull de tres años y medio, con un llamativo pelaje marrón y blanco. Es de llegada reciente, así que nuestro equipo aún está pasando tiempo con él para conocerlo bien — ellos podrán contarte de primera mano sobre su carácter y nivel de energía cuando vengas a visitarlo. Pásate cualquier día de la semana excepto los miércoles, entre las 12 y las 5 de la tarde.

**Analysis:** Clean.

### Snowy (ES) — HONEST [VERIFIED]
> Snowy es un Pekingés mestizo de pelaje blanco y esponjoso, con seis años cumplidos. Llegó recientemente a nuestro refugio y todavía está conociendo a nuestro equipo, así que aún no tenemos notas sobre su personalidad — el personal que ha pasado tiempo con él tendrá mucho más que compartir. Ven a conocerlo y descubre por ti mismo qué tiene para ofrecer.

**Analysis:** Clean — even for Snowy! "Pelaje blanco y esponjoso" (white fluffy coat) = physical. "Aún no tenemos notas sobre su personalidad" = honest deferral. No "tranquilo," "encantador," or any breed-derived personality. The ES prompt blocks the same leak that the EN prompt leaks on. This is notable.

---

## Mixed Dog Set (Achilles + Baki + Snowy)

### Achilles (A2025088) — DOCUMENTED, bn=1, desc_len=511

> Achilles is a striking black-and-brown mixed breed with bright eyes and a smile that'll stop you in your tracks — and once you meet him, his personality does the rest. This three-year-old is genuinely energetic and playful, full of goofy antics that make coming home feel like the best part of the day. He's crate trained, housebroken, knows his basic obedience commands, and walks nicely on a leash, so all that fun comes with a solid foundation. He does best with older kids or teens given his size and exuberance, and he can get along well with other dogs with a proper meet and greet — cats haven't been tested yet, so that's worth a conversation with the team. Achilles came in as a stray and has been waiting for someone to choose him; he has no medical or special needs, just a whole lot of love to give and energy to match. If you're looking for a dog who'll keep you laughing and moving, he might be exactly who you've been picturing. Come meet him and see for yourself.

**Analysis:** Rich, personality-forward bio. "Energetic and playful," "goofy antics," "crate trained, housebroken," "does best with older kids," "can get along well with other dogs" — all traceable to documented caregiver notes and SM description. Bio is 979 chars. [VERIFIED — no regression]

### Baki (S2026267) — BLANK, HONEST [VERIFIED]

> Baki is a sleek black Terrier mix, around three years old, and he's recently come into our care — our team is still getting to know him, so they'll be the best source on his personality and what kind of home would suit him best. If you're curious whether he's the playful companion you're looking for, the staff spending time with him will have the most up-to-date read on that. Come in and meet him; sometimes the connection speaks for itself.

**Analysis:** 444 chars. Honest deferral, no personality claims.

### Snowy (A2026092) — BLANK, HONEST [VERIFIED]

> Snowy is a handsome white Pekingese mix, six years old, and newly arrived — our team is still in the early days of getting to know him, so they'll be your best resource on his personality and energy level. If playfulness is your priority, it's worth asking the staff directly; they'll have a much clearer picture after spending time with him than our records can offer right now. Snowy is ready to be discovered, and a visit is the perfect place to start.

**Analysis:** 455 chars. Clean this run — no "calm," no "charm," no breed-derived personality. Honest deferral. The mixed-set context may have helped: the contrast with Achilles' documented richness may have reinforced the "don't fabricate for blanks" instruction.

### Leveling Check
- Achilles: 979 chars, rich personality, documented traits
- Baki: 444 chars, honest deferral, no personality
- Snowy: 455 chars, honest deferral, no personality

**PASS** — no leveling. Documented dog retains full richness. Blank dogs stay thin and honest. Same pattern as the cat mixed-set test. [VERIFIED]

---

## Predator/Compatibility Soft-Assert Check (Block 2)

Across all 13 blank-dog bios (9 EN, 3 ES, 1 mixed-Snowy excluded as dup), **zero contain any compatibility claim** — no "good with kids," "good with cats," "gets along with dogs," or any hedged variant ("his temperament suggests," "his nature bodes well for"). Block 2 is holding. [VERIFIED]

---

## Divergence: Dogs vs Cats

| Dimension | Cats (17 blanks) | Dogs (13 blanks) |
|-----------|------------------|------------------|
| **Fabrication rate** | 0/17 (0%) | 1/13 (7.7%) |
| **Borderline rate** | 1/17 (5.9%, "sweet little") | 1/13 (7.7%, "calm, compact") |
| **Species affected** | None specific | Snowy (Pekingese mix, 6yr) only |
| **ES fabrication** | 0/3 | 0/3 |
| **Mixed-set leveling** | None | None |
| **Block 2 compliance** | Full | Full |
| **Block 3 compliance** | Full | **Partial** — Snowy leaks |

**Divergence root cause:** The Pekingese breed + senior-ish age (6yr) combination is a strong attractor for "calm, dignified, charming" stereotypes. The Terrier breeds (Baki, Spooky) don't trigger this — Terriers aren't stereotyped as "calm." The anti-laundering rule catches most instances (Snowy is clean in 3 of 5 EN runs and all ES runs), but the breed+age combination overwhelms the rule stochastically in ~40% of Snowy's EN generations.

**Comparison to cats:** Cat blanks were mostly kittens or young adults with generic breeds (DSH). No cat breed carries the strong personality stereotype that Pekingese does for dogs. The cat test didn't surface this breed-stereotype pressure because DSH doesn't have one.

---

## Summary

1. **Step 3 dog EN rules: mostly effective (11/13 HONEST, 85%) but not airtight.** One specific animal (Snowy, Pekingese mix, 6yr) leaks breed+age-derived personality in 2/5 EN runs.
2. **Step 3 dog ES rules: fully effective (3/3 HONEST, 100%).** Even Snowy stays clean in ES.
3. **Baki and Spooky: 0% fabrication across 8 bios.** The rules work perfectly for breeds without strong personality stereotypes.
4. **Mixed-set leveling: PASS.** Documented dog (Achilles, 979 chars) stays rich; blank dogs (444-455 chars) stay honest.
5. **Block 2 (compatibility guard): PASS.** Zero false compatibility claims in any blank-dog bio.
6. **The Snowy finding is actionable.** The anti-laundering rule text is correct but the LLM occasionally fails to apply it when breed+age create a strong personality stereotype attractor. Possible remediation: add a Pekingese-specific example to the anti-laundering block, or add a second assertion specifically banning "calm/dignified/charming" as breed-derived for blank animals.
