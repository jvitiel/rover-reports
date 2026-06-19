# Age-Clause Hardening (Block 3) + Senior-Warmth Provision (Block 1)

**Date:** 2026-06-19 14:44 ET  
**Commit:** `77fc26f`  
**Diff stat:** 1 file changed, 32 insertions (+0 deletions)  
**Status:** DEPLOYED [VERIFIED]

---

## What Was Inserted

**Piece 1 — Block 3 age-clause addition:** One paragraph appended after each Block 3 anti-laundering section. Explains why age-derived temperament is specifically banned (population fact ≠ individual fact), bans specific words ("calm," "settled," "steady," "mellow," "dignified," "laid-back" and their ES equivalents), and explicitly bans hedged forms ("may be more of a calm presence"). Inserted in all 4 prompts (cat EN, cat ES, dog EN, dog ES).

**Piece 2 — Block 1 senior-warmth provision:** Three paragraphs appended at the end of the "HANDLING AN ANIMAL WITH NO DOCUMENTED BEHAVIORAL DATA" section, after the Sky/Baki examples but before Block 2. Provides a narrow, bounded warmth source for seniors: the dignity of a long life and the HOME being offered. Every warmth word must modify the home/offer/life, never the animal's behavior. Includes the test: "if a warmth word could be read as describing how the animal ACTS, rewrite it to describe the home." Inserted in all 4 prompts.

---

## Placement Verification

### Cat EN (systemMessageEn) — Piece 1 context

```
[Block 3 existing text]
...the fact is decorative and allowed. If the trait only exists BECAUSE of
the breed/age/name/appearance, it is laundering and is banned.
                                                              ← ANCHOR
[NEW: Piece 1 — age-clause paragraph]
Age is the trap case. It is TRUE that older animals are often calmer as a
population — but that is a fact about populations, not about this individual.
...State the age as a fact; say nothing about what the age implies for
temperament.

Even when the adopter's narrative is brief or vague, write a bio for each
of the 3 provided cats.
```

Block 3 age-clause at line **4691**, Block 3 original at **4689**. ✓ [VERIFIED]

### Cat EN — Piece 2 context

```
Example, different lead (appearance-forward): "Baki is a sleek black
terrier mix...Come meet him."
                                              ← ANCHOR
[NEW: Piece 2 — senior-warmth provision]
This provision does NOT relax the no-temperament rule...
When a no-data animal is a senior, its age is an honest warmth source
when framed as longevity or life-stage dignity — NOT as predicted
temperament...
Test for this provision: every warmth word must modify the HOME, the OFFER,
or the FACT OF HER LONG LIFE...

DO NOT IMPLY A REQUESTED ATTRIBUTE THROUGH INVENTED TEMPERAMENT:
[Block 2 continues unchanged]
```

Senior-warmth provision at line **4723**, Baki example at **4721**, Block 2 starts at **4733**. ✓ [VERIFIED]

### Cat ES (systemMessageEs) — Piece 1 context

```
...Si el rasgo solo existe POR la raza/edad/nombre/apariencia, es lavado
y está prohibido.
                ← ANCHOR
[NEW: Piece 1 — ES age-clause]
La edad es el caso trampa. Es CIERTO que los animales mayores suelen ser
más tranquilos como población — pero eso es un hecho sobre poblaciones...
Indica la edad como un hecho; no digas nada sobre lo que la edad implica
para el temperamento.

Incluso cuando la narrativa del adoptante sea breve o vaga, escribe una
biografía para cada uno de los 3 gatos proporcionados.
```

ES age-clause at line **4789**. ✓ [VERIFIED]

### Cat ES — Piece 2 context

```
Ejemplo, comienzo distinto: "Baki es un elegante terrier mestizo
negro...Ven a conocerlo."
                              ← ANCHOR
[NEW: Piece 2 — ES senior-warmth]
Esta disposición NO relaja la regla de no-temperamento...
Cuando un animal sin datos es mayor, su edad es una fuente honesta de
calidez cuando se enmarca como longevidad o dignidad de su etapa de
vida — NO como temperamento predicho...

NO IMPLIQUES UN ATRIBUTO SOLICITADO MEDIANTE TEMPERAMENTO INVENTADO:
[Block 2 ES continues unchanged]
```

ES senior-warmth at line **4821**. ✓ [VERIFIED]

### Dog EN / Dog ES

Same structure as cat EN / cat ES respectively — verified at:
- Dog EN: Block 3 age-clause at **4888**, senior-warmth at **4919** [VERIFIED]
- Dog ES: Block 3 age-clause at **4989**, senior-warmth at **5020** [VERIFIED]

---

## Reading Order Verification (all 4 prompts)

| Prompt | Block 3 (anti-laundering) | Piece 1 (age-clause) | Block 1 (blank-bio rules) | Piece 2 (senior-warmth) | Block 2 (soft-assert) |
|--------|--------------------------|---------------------|--------------------------|------------------------|-----------------------|
| Cat EN | 4687 | **4691** | 4709 | **4723** | 4733 |
| Cat ES | 4785 | **4789** | 4807 | **4821** | 4831 |
| Dog EN | 4884 | **4888** | 4905 | **4919** | 4929 |
| Dog ES | 4985 | **4989** | 5008 | **5020** | 5030 |

Reading order: Block 3 → Piece 1 → Block 1 → Piece 2 → Block 2 in all 4 prompts. ✓ [VERIFIED]

---

## Smoke Test

| Query | Matches | Bio Lengths | Status |
|-------|---------|-------------|--------|
| Cat EN ("friendly cat") | 3 | 900, 1010, 1146 | ✓ well-formed |
| Dog EN ("playful dog") | 3 | 931, 912, 990 | ✓ well-formed |

No TS errors, no runtime errors, response shape unchanged. [VERIFIED]

---

## Summary

- 32 insertions across 1 file (server.ts), 8 text blocks (4 Piece-1 + 4 Piece-2) across all 4 Phase-2 prompts
- Build clean, service active, smoke test passed
- Commit `77fc26f`: "Age-clause hardening (Block 3) + senior-warmth provision (Block 1), cat+dog EN+ES."
- Rollback: `cd /home/shelter/shelter-apps && git revert 77fc26f && cd server && npm run build && sudo systemctl restart shelter-app`
- Behavior re-test is the SEPARATE next step
