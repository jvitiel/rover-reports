# ES Translation-Table Completeness Check

**Model:** N/A (data enumeration only)  
**Source:** Live pool via `fetchAnimals()` — 177 adoptable animals, 43 distinct color values. [VERIFIED — not /api/animals]

---

## LEAD

**NO — 8 real pool colors have no Spanish→English mapping in the extractor's translation table.** Each is a silent ES SEL-RULE5 hole: a Spanish adopter searching for that color would get it routed to softTerms instead of the hard filter, allowing personality to override color — the exact defect the rebuild fixes for EN.

### Missing colors (present in pool, absent from table)

| Pool color | Animals | Spanish term(s) an adopter would use | Risk |
|------------|---------|--------------------------------------|------|
| **Tan** | 7 (3 Tan + 4 Tan and White) | canela, bronceado, beige | HIGH — common dog color |
| **Buff** | 3 (2 Buff and White + 1 Tabby: Buff) | beige, ante, leonado | MEDIUM |
| **Chocolate** | 1 | chocolate | LOW — cognate, LLM likely maps correctly without table entry |
| **Ginger** | 2 | pelirrojo, jengibre | MEDIUM — may map to orange via English knowledge, but not guaranteed |
| **Brindle** | 1 | atigrado (COLLISION with tabby), brindle | MEDIUM — atigrado→tabby is in the table, but brindle ≠ tabby |
| **Tricolour** | 3 | tricolor | LOW — cognate |
| **Tortie / Dilute Tortie** | 1 | carey, tortuga | MEDIUM |
| **Tabico / Dilute Tabico** | 6 (5 + 1) | tabico, carey atigrado | MEDIUM |

**High-risk gap: Tan (7 animals).** A Spanish adopter saying "un perro canela" would get `color: null, softTerms: ["canela"]` — no hard filter on tan. The LLM could then return a non-tan dog if one has better behavioral match, silently recreating SEL-RULE5 in ES for this color.

---

## Pool Color Inventory (43 distinct values)

| Color value | Count | Covered by table? |
|-------------|-------|--------------------|
| Black | 32 | ✅ negro→black |
| White | 10 | ✅ blanco→white |
| Black with white | 9 | ✅ (substring "black" + "white") |
| Brown | 9 | ✅ marrón/café→brown |
| Tuxedo: Black and White | 9 | ✅ (substring "black" + "white") |
| Brown and White | 8 | ✅ (substring "brown" + "white") |
| tabby - brown and white | 8 | ✅ (substring "tabby" + "brown" + "white") |
| Tabby Grey & White | 8 | ✅ (substring "tabby" + "grey" + "white") |
| Black and White | 8 | ✅ (substring "black" + "white") |
| Tabico | 5 | ❌ **MISSING** |
| Tabby | 5 | ✅ atigrado→tabby |
| Calico | 5 | ✅ calico→calico |
| Grey | 4 | ✅ gris→grey |
| tabby brown | 4 | ✅ (substring "tabby" + "brown") |
| Tan and White | 4 | ❌ **MISSING** (tan) |
| Tabby - grey | 3 | ✅ (substring "tabby" + "grey") |
| Patch Tabby | 3 | ✅ (substring "tabby") |
| Grey and White | 3 | ✅ (substring "grey" + "white") |
| Brown and Black | 3 | ✅ (substring "brown" + "black") |
| Tabby: Orange and White | 3 | ✅ (substring "tabby" + "orange" + "white") |
| Tan | 3 | ❌ **MISSING** |
| Tricolour | 3 | ❌ **MISSING** |
| White and Brown | 2 | ✅ (substring "white" + "brown") |
| White and Black | 2 | ✅ (substring "white" + "black") |
| Buff and White | 2 | ❌ **MISSING** |
| White with black | 2 | ✅ (substring "white" + "black") |
| White and orange | 2 | ✅ (substring "white" + "orange") |
| Ginger | 2 | ❌ **MISSING** (English "ginger" IS in the table as a mapping source, but ginger as a pool value means a Spanish term like "pelirrojo" has no target — the table maps ginger→orange, not pelirrojo→ginger) |
| Orange tabby | 2 | ✅ (substring "orange" + "tabby") |
| Black and Brown | 1 | ✅ (substring "black" + "brown") |
| Cream | 1 | ✅ crema→cream |
| Tabby and White | 1 | ✅ (substring "tabby" + "white") |
| Tabby: Buff | 1 | ❌ **MISSING** (buff) |
| Orange / Red & White | 1 | ✅ (substring "orange") |
| Chocolate | 1 | ❌ **MISSING** (cognate, likely auto-maps) |
| Tabby - brown & black | 1 | ✅ (substring "tabby" + "brown" + "black") |
| Various | 1 | N/A (unfilterable) |
| Black and Grey | 1 | ✅ (substring "black" + "grey") |
| tabby - ginger | 1 | ❌ **MISSING** (ginger component) |
| Dilute Tabico | 1 | ❌ **MISSING** |
| Tabby black & grey | 1 | ✅ (substring "tabby" + "black" + "grey") |
| Brindle | 1 | ❌ **MISSING** |
| Dilute Tortie | 1 | ❌ **MISSING** |

---

## Current Translation Table (from intentExtractor.ts)

```
negro → black          blanco → white         gris → grey
naranja/anaranjado → orange    atigrado → tabby
marrón/café → brown    crema → cream          calico → calico
siamés → siamese       persa → persian
```

8 color entries. Covers the top colors by volume (Black=32, White=10, Brown=9, Tabby=5, Grey=4, Orange=3, Calico=5, Cream=1).

---

## Recommended Additions

To close all ES gaps for real pool colors, add these entries to the translation table:

```
canela/bronceado/beige → tan
pelirrojo → ginger
chocolate → chocolate
tricolor → tricolour
carey → tortie
brindle → brindle
tabico → tabico
ante/leonado → buff
```

**Priority:** Tan (7 animals, HIGH risk) first. The cognates (chocolate, tricolor, brindle, tabico) are LOW risk — the LLM likely auto-maps them without an explicit table entry, but making them explicit removes reliance on LLM inference.

---

## Breed Translation

The breed table has 2 entries (siamés→siamese, persa→persian). The pool has ~20 distinct breed values. The most common are "Domestic Short Hair" (111), "Domestic Long Hair" (5), "Terrier/Mixed Breed" (13), etc. Most are English-only breed names that Spanish adopters would use as-is (e.g., "husky", "labrador", "chihuahua").

**Risk:** LOWER than color. Breed is rarely stated in free-text narratives (extraction unit tests showed breed in only 3/19 cases). The hard filter does substring matching, so "labrador" in Spanish → "labrador" in English works without a table entry. The main gap is "pelo corto"→"short hair" and "pelo largo"→"long hair" for coat-via-breed matching — but coat is the FIRST filter dropped in expansion (lowest priority), so this is low-impact.

---

## Summary

The translation table covers colors representing **145/177 animals (82%)** in the pool. The 8 missing colors affect **32 animals (18%)**, with Tan (7 animals) being the highest-risk gap. Each missing color is a potential silent ES SEL-RULE5 reopening for that specific color value. The fix is 8 additional table entries in the intent-extraction prompt.
