# Adult-intake bio pass — dry-run

**Date:** 2026-06-15 18:10 UTC  
**Scope:** Read-only dry-run. Zero writes confirmed (animal_bios: 115→115, animal_bio_drafts: 0→0).

---

## Candidate selection

Adoptable animals where:
- `ageInDays(dateOfBirth) > 84` (adult)
- No `animal_bios` row
- No `animal_bio_drafts` row

**Total candidates: 68**
- **has_profile: 18** — would get (1) factual adult generic (approved, public) AND (2) one-time profile-seeded AI draft (pending)
- **no_profile: 50** — would get factual adult generic ONLY

All 68 have SM comments. All 68 are over 84 days old (range: 85–5,899 days).

## Full candidate list

| Code | Name | Age(d) | Bucket | SM? |
|------|------|--------|--------|-----|
| S2025206 | Lacey | 5,899 | no_profile | Y |
| S2025503 | Cheshire | 4,013 | no_profile | Y |
| S2025883 | Reeboks | 3,922 | has_profile | Y |
| S2025310 | Jax | 3,684 | no_profile | Y |
| A2023278 | Honey | 3,180 | no_profile | Y |
| A2024048 | Leo (Petey) | 2,999 | no_profile | Y |
| A2024047 | Lupa | 2,847 | no_profile | Y |
| S2026126 | Osuna | 2,670 | no_profile | Y |
| A2023287 | Snowie | 2,632 | has_profile | Y |
| S2026132 | Muppett | 2,302 | no_profile | Y |
| A2026092 | Snowy | 2,201 | no_profile | Y |
| S2026606 | Mimi | 2,200 | no_profile | Y |
| S2026345 | Maya | 2,178 | no_profile | Y |
| R2025037 | Maria | 2,159 | has_profile | Y |
| A2025138 | Juno | 1,795 | no_profile | Y |
| S2026446 | Eggo | 1,673 | no_profile | Y |
| S2023445 | Grumpy McGee | 1,632 | no_profile | Y |
| S2026403 | Fluffy | 1,498 | no_profile | Y |
| R2023007 | Charlie | 1,353 | has_profile | Y |
| A2024053 | Nanook | 1,349 | no_profile | Y |
| R2023065 | Butterscotch | 1,278 | has_profile | Y |
| S2025877 | Kirby | 1,261 | has_profile | Y |
| S2025131 | Scottie | 1,254 | has_profile | Y |
| A2023030 | Spooky | 1,247 | no_profile | Y |
| S2026081 | Gigi | 1,230 | no_profile | Y |
| A2026036 | Milo | 1,212 | no_profile | Y |
| S2026267 | Baki | 1,159 | no_profile | Y |
| S2026353 | Squeaky | 1,142 | no_profile | Y |
| A2025233 | Duke | 1,107 | no_profile | Y |
| R2025039 | Cookies and Cream | 1,056 | no_profile | Y |
| S2024718 | Bailey | 992 | has_profile | Y |
| S2025708 | Kobe | 924 | no_profile | Y |
| S2025639 | Spooky (Chi Mix) | 894 | no_profile | Y |
| S2026155 | Elsa | 831 | has_profile | Y |
| R2025003 | Caramel | 819 | has_profile | Y |
| R2025005 | Peanut Butter | 819 | has_profile | Y |
| S2026314 | Sky | 785 | no_profile | Y |
| A2025018 | Ryder | 765 | no_profile | Y |
| S2026495 | Andrew | 750 | no_profile | Y |
| S2026545 | Honeysuckle | 745 | no_profile | Y |
| S2026560 | Mikey | 743 | has_profile | Y |
| S20251200 | Luna | 740 | no_profile | Y |
| S2026031 | Oreo | 696 | has_profile | Y |
| S2026045 | Nova | 695 | no_profile | Y |
| A2025167 | Dodger | 655 | no_profile | Y |
| S2026527 | Mothra | 562 | no_profile | Y |
| A2026025 | Tex | 496 | no_profile | Y |
| R2026003 | Callie Rabbit | 493 | no_profile | Y |
| S2026079 | Nena | 493 | has_profile | Y |
| S2026158 | Mambo | 465 | no_profile | Y |
| S2026519 | Luna Tuna | 455 | no_profile | Y |
| R2026007 | Anastasia | 446 | has_profile | Y |
| S2026391 | Ember | 404 | no_profile | Y |
| S2026415 | Shep | 400 | no_profile | Y |
| S2026496 | Gilda | 385 | no_profile | Y |
| S2026513 | Robin | 383 | no_profile | Y |
| S2026043 | Parker | 322 | no_profile | Y |
| S2026154 | Anna | 252 | has_profile | Y |
| W2026057 | Opal | 221 | no_profile | Y |
| W2026058 | Willow | 221 | no_profile | Y |
| W2026048 | Hershey | 192 | no_profile | Y |
| W2026046 | Nestle | 192 | no_profile | Y |
| W2026045 | Tostito | 192 | no_profile | Y |
| S2026190 | Clover | 173 | no_profile | Y |
| G2026002 | Tater Tot | 100 | has_profile | Y |
| S2026528 | Catzilla | 93 | no_profile | Y |
| S2026529 | Rodan | 93 | no_profile | Y |
| S2026357 | Lilac | 85 | has_profile | Y |

## Sample adult generic renders (deterministic, no GPT)

### Dodger (A2025167) — Dog, Husky/Mixed Breed, Male, Grey and White, medium, ~1 year

**🇺🇸 EN Long:**
Meet Dodger! Dodger is a male Husky/Mixed Breed, approximately 1 year old, with a Grey and White coat and a medium build. Dodger is waiting to find a warm home and loving family they can call their own. The best way to see what makes them special is to come say hello — please contact Four Legs Good Animal Rescue to arrange a visit.

**🇺🇸 EN Short:**
Meet Dodger, a male Husky/Mixed Breed with a Grey and White coat who is approximately 1 year old. Dodger is hoping for a loving home to call their own! Come say hello at Four Legs Good Animal Rescue.

**🇪🇸 ES Long:**
¡Conoce a Dodger! Dodger es Husky/Mixed Breed (macho), de aproximadamente 1 año, con pelaje gris y blanco y de tamaño mediano. Dodger está esperando encontrar un hogar cálido y una familia cariñosa a quien llamar suyos. La mejor manera de descubrir lo que lo hace especial es venir a conocerlo — comunícate con Four Legs Good Animal Rescue para coordinar una visita.

**🇪🇸 ES Short:**
¡Conoce a Dodger, Husky/Mixed Breed (macho) con pelaje gris y blanco, de aproximadamente 1 año! Dodger está buscando un hogar lleno de amor a quien llamar suyo. ¡Ven a saludarlo a Four Legs Good Animal Rescue!

### Andrew (S2026495) — Cat, Domestic Short Hair, Male, Black, medium, ~2 years

**🇺🇸 EN Long:**
Meet Andrew! Andrew is a male Domestic Short Hair, approximately 2 years old, with a Black coat and a medium build. Andrew is waiting to find a warm home and loving family they can call their own. The best way to see what makes them special is to come say hello — please contact Four Legs Good Animal Rescue to arrange a visit.

**🇺🇸 EN Short:**
Meet Andrew, a male Domestic Short Hair with a Black coat who is approximately 2 years old. Andrew is hoping for a loving home to call their own! Come say hello at Four Legs Good Animal Rescue.

**🇪🇸 ES Long:**
¡Conoce a Andrew! Andrew es Domestic Short Hair (macho), de aproximadamente 2 años, con pelaje negro y de tamaño mediano. Andrew está esperando encontrar un hogar cálido y una familia cariñosa a quien llamar suyos. La mejor manera de descubrir lo que lo hace especial es venir a conocerlo — comunícate con Four Legs Good Animal Rescue para coordinar una visita.

**🇪🇸 ES Short:**
¡Conoce a Andrew, Domestic Short Hair (macho) con pelaje negro, de aproximadamente 2 años! Andrew está buscando un hogar lleno de amor a quien llamar suyo. ¡Ven a saludarlo a Four Legs Good Animal Rescue!

### Anastasia (R2026007) — Rabbit, Lop Eared, Female, White, medium, ~1 year (has_profile)

**🇺🇸 EN Long:**
Meet Anastasia! Anastasia is a female Lop Eared, approximately 1 year old, with a White coat and a medium build. Anastasia is waiting to find a warm home and loving family they can call their own. The best way to see what makes them special is to come say hello — please contact Four Legs Good Animal Rescue to arrange a visit.

**🇺🇸 EN Short:**
Meet Anastasia, a female Lop Eared with a White coat who is approximately 1 year old. Anastasia is hoping for a loving home to call their own! Come say hello at Four Legs Good Animal Rescue.

**🇪🇸 ES Long:**
¡Conoce a Anastasia! Anastasia es Lop Eared (hembra), de aproximadamente 1 año, con pelaje blanco y de tamaño mediano. Anastasia está esperando encontrar un hogar cálido y una familia cariñosa a quien llamar suyos. La mejor manera de descubrir lo que la hace especial es venir a conocerla — comunícate con Four Legs Good Animal Rescue para coordinar una visita.

**🇪🇸 ES Short:**
¡Conoce a Anastasia, Lop Eared (hembra) con pelaje blanco, de aproximadamente 1 año! Anastasia está buscando un hogar lleno de amor a quien llamar suyo. ¡Ven a saludarla a Four Legs Good Animal Rescue!

*(Anastasia has a caregiver profile — would ALSO get a profile-seeded AI draft in addition to this generic.)*

### Anna (S2026154) — Rabbit, American, Female, White, medium, ~8 months (has_profile)

**🇺🇸 EN Long:**
Meet Anna! Anna is a female American, approximately 8 months old, with a White coat and a medium build. Anna is waiting to find a warm home and loving family they can call their own. The best way to see what makes them special is to come say hello — please contact Four Legs Good Animal Rescue to arrange a visit.

**🇺🇸 EN Short:**
Meet Anna, a female American with a White coat who is approximately 8 months old. Anna is hoping for a loving home to call their own! Come say hello at Four Legs Good Animal Rescue.

**🇪🇸 ES Long:**
¡Conoce a Anna! Anna es American (hembra), de aproximadamente 8 meses, con pelaje blanco y de tamaño mediano. Anna está esperando encontrar un hogar cálido y una familia cariñosa a quien llamar suyos. La mejor manera de descubrir lo que la hace especial es venir a conocerla — comunícate con Four Legs Good Animal Rescue para coordinar una visita.

**🇪🇸 ES Short:**
¡Conoce a Anna, American (hembra) con pelaje blanco, de aproximadamente 8 meses! Anna está buscando un hogar lleno de amor a quien llamar suyo. ¡Ven a saludarla a Four Legs Good Animal Rescue!

*(Anna has a caregiver profile — would ALSO get a profile-seeded AI draft.)*

## Zero writes confirmed

| Table | Before | After |
|-------|--------|-------|
| animal_bios | 115 | 115 |
| animal_bio_drafts | 0 | 0 |
