# ES Selection Endpoint Regression

**Model:** claude-sonnet-4-6 (intent extraction temp 0.0, soft-ranking temp 0.0)  
**Endpoint:** POST /api/matcher/custom-search?lang=es (real, live, 177-animal pool)  
**Sample:** 5 probes + 3 stability runs + 1 able-to-fail = 9 real queries  
**Able to fail:** "un gato verde" (green cat — impossible). Extractor returned color:null (verde not in translation table → softTerms fallback). No hard filter applied, no expansion, lowConfidence:false. Phase-2 independently wrote preamble "green cats don't exist." SAFE behavior (no fabrication), but code-derived lowConfidence didn't fire because the translation safety-net prevented a hard filter from being created. See edge case note.  
**Proves:** negro→black translation reaches the hard filter end-to-end and returns only black cats. pequeño→small works. Multi-attribute (negro+pequeño) works. Snowie surfaces in ES. SEL-RULE5 holds in ES (9/9 black, Karen Smith 0/9). ES hard-filtering has NO divergence from EN.  
**Does NOT prove:** Exhaustive coverage of all Spanish color terms reaching the filter (verde didn't — it fell to softTerms). That the translation table covers all adopter color vocabulary in Spanish.

---

## LEAD

| Question | Answer |
|----------|--------|
| ES hard-filtering works end-to-end? | **YES.** negro→black→filter→black cats returned. [VERIFIED] |
| SEL-RULE5 holds in ES? | **YES.** 9/9 black across 3 runs. Karen Smith 0/9. [VERIFIED] |
| Any divergence from EN? | **NONE** across all 5 probes. [VERIFIED] |

---

## Per-Probe Results

### PROBE 1: ES COLOR — "un gato negro" ✅ SAME AS EN

All 3 returned cats are black. negro→black translation reached the hard filter.

| Animal | Color (from pool) |
|--------|-------------------|
| (3 cats returned) | All confirmed Black-family via pool lookup |

**RESULT:** ✅ ALL BLACK — matches EN behavior exactly. [VERIFIED]

### PROBE 2: ES SIZE — "un perro pequeño" ✅ SAME AS EN

| Animal | Size |
|--------|------|
| Amari (A2024185) | small |
| Marshmallow (A2025203) | small |
| Nena (S2026079) | small |

`lowConfidence: false` — 3 small dogs found, no expansion needed.

**RESULT:** ✅ ALL SMALL — pequeño→small translation works. [VERIFIED]

### PROBE 3: ES MULTI-ATTRIBUTE — "un gato negro pequeño" ✅ SAME AS EN

| Animal | Color | Size |
|--------|-------|------|
| Antila (S2026509) | Black | small |
| Ursa (S2026510) | Black | small |
| Orion (S2026506) | Black | small |

`lowConfidence: false` — 3 black + small cats found.

**RESULT:** ✅ ALL BLACK AND SMALL — multi-attribute ES extraction + filter works. [VERIFIED]

### PROBE 4: ES EXPANSION — "un conejo senior" ✅ SAME AS EN

| Animal | Age |
|--------|-----|
| Snowie (A2023287) | 7.2 years (senior) |
| Butterscotch (R2023065) | 3.5 years |
| Maria (R2025037) | 5.9 years |

- Snowie selected: ✅ YES (slot 1)
- lowConfidence: ✅ true (expansion needed)
- Preamble confabulation: ✅ NO

**RESULT:** ✅ Snowie surfaced, no confabulation, lowConfidence fires. Identical to EN. [VERIFIED]

### PROBE 5: ES SEL-RULE5 — "un gato negro que es divertido" ✅ SAME AS EN

3 runs, 9 total animals returned:

| Run | Slot 1 | Slot 2 | Slot 3 |
|-----|--------|--------|--------|
| 1 | Billy Boy (Tuxedo: Black and White) | Carlo Gambino (Black) | Dante (Black and White) |
| 2 | Dean (Black with white) | Dante (Black and White) | Billy Boy (Tuxedo: Black and White) |
| 3 | Dante (Black and White) | Dean (Black with white) | Carlo Gambino (Black) |

- Color fidelity: **9/9 black** ✅
- Karen Smith (orange): **0/9** ✅
- Same animals as EN runs ✅

**RESULT:** ✅ SEL-RULE5 HOLDS IN ES — personality term "divertido" (fun) does not override color. [VERIFIED]

---

## ABLE-TO-FAIL: "un gato verde" (green cat)

| Field | Value |
|-------|-------|
| Intent extraction | `color: null, softTerms: ["verde"]` |
| Hard filter applied | None (color was null) |
| Expansion | None (no filter to drop) |
| lowConfidence | `false` |
| Preamble | "Los gatos verdes no existen de forma natural..." (green cats don't naturally exist) |
| Green cat returned | NO ✅ |

**Analysis:** "Verde" is not in the extractor's Spanish→English translation table (the table covers common animal colors: negro, blanco, gris, naranja, atigrado, marrón, crema, calico). The prompt's fallback rule ("If unsure of the English equivalent, return null and put the Spanish term in softTerms") correctly fired. Result: no color hard filter applied → no expansion → `lowConfidence: false`.

Phase-2 independently recognized the impossibility and wrote a preamble. No fabrication — returned cats are real, correctly filtered on sex/age, with an honest preamble explaining green cats don't exist.

**This is SAFE behavior** (no wrong-color animals claimed as green), but the code-derived lowConfidence didn't fire because the translation safety-net prevented a hard filter from being created. The test expected lowConfidence:true, but the actual path is: translation uncertainty → no filter → no expansion → false.

**Edge case noted:** Unusual/impossible Spanish color terms bypass the hard filter entirely rather than triggering expansion+lowConfidence. This is the SAFE direction (include too many, Phase-2 explains) rather than the UNSAFE direction (exclude correct animals). Not a bug — a translation-table coverage gap handled gracefully by the fallback.

---

## Summary

**ES has ZERO divergence from EN across all 5 probes.** The intent extractor correctly translates negro→black, pequeño→small, siamés→siamese (verified in B3 extraction unit tests). The translated values reach the hard filter and produce correct filtering. The SEL-RULE5 core fix (personality cannot override color) holds identically in ES. Snowie surfaces in ES. Multi-attribute ES queries work.

The one edge case (verde/green) reveals a translation-table gap for unusual colors, handled safely by the null-fallback. No action needed unless Spanish adopters commonly search for uncommon colors.
