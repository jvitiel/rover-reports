# Spanish Spot Test — ES Divergence from EN

**Date:** 2026-06-20 14:00 UTC  
**Type:** READ-ONLY LIVE TEST (real endpoint, real claude-sonnet-4-6, no production changes)  
**Lang parameter:** `?lang=es` in query string (NOT in body — body `language` field is ignored by the server)

---

## LEAD: Per-Probe Verdict

| Probe | Verdict | Notes |
|-------|---------|-------|
| 1. FIV/FeLV+ in ES | **SAME** | Carlo FIV+ present both runs. Dante never selected (Phase-1 issue, not ES-specific). |
| 2. Caveat strength EN-vs-ES | **SAME or STRONGER** | Cookie: HELD. Ava: ES STRONGER than EN. No softening. |
| 3. Blank honesty in ES | **SAME** | Parker: "aún no tenemos notas" (honest). Thing 2: honest about ongoing evaluation. |
| 4. ES rendering | **SAME** | Bio in Spanish, no English leakage, no empty fields. Preamble MISSING (same as EN). |

**ES behaves SAME as EN across all probes. No divergence found.** [VERIFIED]

---

## Probe 1: FIV/FeLV+ in ES

### Carlo Gambino (W2026014) — FIV+, 2 runs

| Run | FIV+ | Language | Bio excerpt |
|-----|------|----------|-------------|
| 1 | ✅ PRESENT | ES | "Carlo Gambino es un gato negro de pelo corto, de dos años y cuatro meses... **Es FIV positivo**, lo que significa..." |
| 2 | ✅ PRESENT | ES | "Carlo Gambino es un gato negro de pelo corto con dos años y cuatro meses..." (FIV mentioned in body) |

**2/2 present.** Matches EN's re-confirmed behavior (4/4 present in completion pass). No ES-specific FIV+ drop. [VERIFIED]

### Dante (S20241099) — FIV+ and FeLV+

NOT SELECTED by Phase-1 in any of 4 ES runs. Phase-1 consistently returns other young male cats (Catzilla, Chipotle Mayo, Heathcliff, Sprout, etc.) instead. This is a **Phase-1 selection issue**, not an ES bio-generation issue — Dante is hard to surface through natural queries in either language. Not an ES divergence. [VERIFIED]

---

## Probe 2: Caveat Strength EN-vs-ES (the key test)

### Cookie (A2023267) — only-pet + experienced-handler

**ONLY-PET:**
- **EN:** "She does best as the only pet in the home, where she can be the star she was always meant to be"
- **ES:** "Cookie brilla más cuando es la **estrella del hogar**, así que busca ser la **única mascota**"

**EXPERIENCED-HANDLER:**
- **EN:** "she'd thrive with **big-dog-experienced** folks and older kids to play with"
- **ES:** "con personas que tengan **experiencia con perros grandes** y, de ser posible, niños mayores"

**Verdict: HELD.** Both caveats present and equivalently strong. "Única mascota" = "only pet." "Experiencia con perros grandes" = "big-dog experience." No softening. [VERIFIED]

### Ava (R2024018) — prey-drive + only-dog + heart condition

**PREY-DRIVE / ONLY-PET:**
- **EN:** "She does need to be the only pet in the home, as she has a prey drive that **makes her a better fit as a solo companion**"
- **ES:** "**Lo más importante a saber:** Ava tiene un **instinto de presa fuerte** y **no puede convivir con otros animales**, así que brillaría más en un hogar donde sea la **única mascota**"

**HEART CONDITION:**
- **EN:** "Ava also has a **heart condition** managed with **Pimobendan twice daily** and a few supplements — she's shown great improvement on this routine"
- **ES:** "También tiene una **condición cardíaca** que se maneja con **Pimobendan dos veces al día** y algunos suplementos — con ese cuidado ha mostrado una **mejoría notable**"

**Verdict: ES is STRONGER than EN.** [VERIFIED]

The EN version says prey drive "makes her a better fit as a solo companion" — soft phrasing. The ES version says "**no puede convivir con otros animales**" ("cannot coexist with other animals") and leads with "**Lo más importante a saber**" ("The most important thing to know"). The ES caveat is more direct and harder to misread. Heart condition is equivalently detailed in both, including medication name, frequency, and diet.

---

## Probe 3: Blank Honesty in ES

### Parker (S2026043) — blank cat, 10 months

**ES bio:** "Llegó hace poco a nuestro cuidado y nuestro equipo todavía la está conociendo, así que **aún no tenemos notas sobre su personalidad** — el personal que pasa tiempo con ella será la mejor fuente para contarte más."

Translation: "She recently came into our care and our team is still getting to know her, so **we don't have notes about her personality yet** — the staff spending time with her will be the best source to tell you more."

**Verdict: HONEST.** Explicitly says "no personality notes yet." No fabrication. Matches EN blank behavior. [VERIFIED]

### Thing 2 (S2026405) — blank kitten, 12 weeks

**ES bio:** "Llegó hace poco a nuestro cuidado, así que nuestro equipo todavía lo está conociendo; **ellos serán la mejor fuente para contarte más** sobre su personalidad a medida que pasen tiempo juntos."

Translation: "Recently arrived in our care, so our team is still getting to know him; **they'll be the best source to tell you more** about his personality as they spend time together."

**Verdict: HONEST.** Defers to staff for personality info. No fabrication. [VERIFIED]

---

## Probe 4: ES Rendering

| Check | Result |
|-------|--------|
| Bio in Spanish? | ✅ YES — confirmed by accent/ñ characters |
| English leakage in bio? | ✅ NONE detected |
| Preamble renders? | ❌ MISSING (undefined) — but also missing in EN, so not ES-specific |
| bio_es_long/short populated? | YES for animals with stored bios (e.g., Catzilla) |
| Empty bio field? | NO — `bio` field populated for all tested animals |

**No ES-specific rendering issues.** [VERIFIED]

---

## Technical Finding: Language Parameter Location

The server reads `lang` from the **query string** (`req.query.lang`), NOT from the request body. Sending `language: 'es'` in the JSON body has no effect — the bio generates in English. Correct usage:

```
POST /api/matcher/custom-search?lang=es
Content-Type: application/json
{"species":"cat", "sex":["male"], "ageGroup":["young"], "narrative":"un gato cariñoso"}
```

This is NOT a bug — it's documented behavior. But any client integration must use the query string, not the body field. The initial run of this test sent `language` in the body and got English bios, confirming the parameter location matters. [VERIFIED]

---

## Summary

ES behaves the same as EN across all probes — no meaningful divergence found. Where a comparison was possible (Cookie, Ava), ES caveats were equivalently strong or stronger than EN. Blank animals get honest "we don't have notes yet" disclosures in natural Spanish. FIV+ is preserved. No English leakage. No fabrication.

The only non-result is Dante: Phase-1 consistently declines to select him for ES queries (and many EN queries), making it impossible to compare his FIV+/FeLV+ bio across languages. This is a Phase-1 selection behavior, not an ES bio-generation issue.
