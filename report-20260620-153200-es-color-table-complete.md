# ES Color Translation Table — Completeness Fix + Verification

**Model:** claude-sonnet-4-6 (intent extraction temp 0.0)  
**Endpoint:** POST /api/matcher/custom-search?lang=es (real, live, 177-animal pool)  
**Sample:** 1 live query ("un perro canela") + 1 programmatic coverage check  
**Able to fail:** Prior completeness report showed 145/177 coverage (8 colors missing). If the 8 additions didn't work, coverage would still be <177. The canela→tan live test is the able-to-fail proof — if the mapping doesn't reach the filter, non-tan dogs would be returned (same pattern as the negro→black proof).  
**Proves:** All 177 pool animals' colors now have a Spanish→English mapping. canela→tan reaches the hard filter end-to-end and returns only tan dogs. The 8 newly-added color translations are structurally identical to the existing 8 (same prompt table, same extraction path, same substring filter).  
**Does NOT prove:** That every possible Spanish color synonym an adopter might use is covered (only the table entries are covered — an adopter using an unlisted synonym still falls to softTerms). That the 7 non-tan additions work at the endpoint level (verified programmatically by substring match, not by live query).

---

## LEAD

**177/177 pool color coverage — YES.** Was 145/177 (82%). Now 177/177 (100%). [VERIFIED]

canela→tan works end-to-end: 3/3 returned dogs are tan. [VERIFIED]

---

## Changes

**File:** `intentExtractor.ts` — translation table in system prompt

**Added 8 entries (4 lines):**
```
canela/bronceado/beige → tan   chocolate → chocolate
carey → tortie                 tabico → tabico
pelirrojo → ginger             tricolor → tricolour
brindle → brindle              ante/leonado → buff
```

**Table now has 16 color entries** (was 8) + 2 breed entries. Label changed from "non-exhaustive" to "Translation table" (it now covers all pool colors).

**Compile:** ✅ `tsc` exit 0, zero errors.

---

## Coverage Verification

**Before (145/177):** 8 pool colors had no Spanish mapping: tan (7), tabico (6), tricolour (3), buff (3), ginger (3), tortie (1), chocolate (1), brindle (1).

**After (177/177):** Every animal's color value has at least one translation-table target that substring-matches it. [VERIFIED — programmatic check against all 177 animals, 0 uncovered]

---

## Live Endpoint Test: "un perro canela"

| Animal | Color (from pool) | Tan match? |
|--------|-------------------|------------|
| Isis the Goddess (S2024694) | Tan and White | ✅ |
| Muppett (S2026132) | Tan and White | ✅ |
| Nova (S2026045) | Tan and White | ✅ |

`lowConfidence: false` — 3 tan dogs found, no expansion needed.

**canela→tan translation reaches the hard filter end-to-end.** [VERIFIED]

---

## Deviations

None. All 8 mappings use the exact English values from the pool's BASECOLOURNAME (verified in completeness report: tan, chocolate, tortie, tabico, ginger, tricolour, brindle, buff).
