# Blank-Last Within-Tier Sub-Sort — Build + Verification

**Model:** claude-sonnet-4-6 (intent extraction temp 0.0, soft-ranking temp 0.0)  
**Endpoint:** POST /api/matcher/custom-search (real, live, 177-animal pool — 118 cats: 24 documented, 94 blank)  
**Sample:** 4 live endpoint queries + 1 programmatic sort unit test  
**Able to fail:** Programmatic unit test proves the wrong sort (blank as primary tier) WOULD put doc-PARTIAL above blank-FULL — violation detected. The correct sort puts blank-FULL at idx 1, doc-PARTIAL at idx 2.  
**Proves:** Documented animals sort before blank animals within the same tier. Blank never crosses tiers — a blank FULL-match ranks above a documented PARTIAL. SEL-RULE5 (color fidelity) unaffected.  
**Does NOT prove:** That blank-last visibly changes bio QUALITY (that's Phase-2 bio lightening, separate spec item). That the sort affects results when all 3 selected animals are the same blank/doc status (it's a tiebreak, not a filter).

---

## LEAD

✅ **Blank-last within-tier sub-sort works.** Documented animals sort before blank within the same tier. Cross-tier guard holds: blank FULL-match ranks above documented PARTIAL. [VERIFIED]

---

## What Changed

**File:** `server/src/server.ts`

**Change 1:** Moved `isBlankAnimal()` and `DESCRIPTION_SENTINELS` ABOVE the tier re-sort block (was below it). No logic change — just hoisted so the sort can reference it.

**Change 2:** Extended the tier re-sort comparator to include blank as secondary key:

**Before:**
```typescript
validSelectedCodes.sort((a, b) => tierOf(a) - tierOf(b));
```

**After:**
```typescript
const blankOf = (code: string): number => {
  const animal = withRecords.find(a => a.shelterCode === code);
  return animal ? (isBlankAnimal(code, animal.description) ? 1 : 0) : 1;
};
// Stable sort: tier ASC (primary), blank ASC (secondary within tier),
// Phase-1 order preserved within same tier+blank group.
validSelectedCodes.sort((a, b) => {
  const td = tierOf(a) - tierOf(b);
  if (td !== 0) return td;
  return blankOf(a) - blankOf(b); // documented (0) before blank (1)
});
```

**Log line updated:** Now reports blank count alongside full match count:
```
[Matcher] Tier re-sort: ... (fullMatches=3, blanks=1, expansion=none)
```

**Compile:** ✅ `tsc` exit 0, zero errors.

---

## Verification Results

### TEST A: Cross-Tier Live ("a tabby cat with short hair that is playful")

| Slot | Animal | Color | Blank | Records |
|------|--------|-------|-------|---------|
| 1 | Karen Smith (S2026447) | Tabby: Orange and White | false | 1 |
| 2 | Arnold (B2026001) | Tabby and White | false | 2 |
| 3 | Bilbo (S2026294) | tabby - brown and white | **true** | 0 |

✅ Documented animals (Karen Smith, Arnold) sort before blank (Bilbo) within the same tier. [VERIFIED]

### TEST B: Within-Tier Live ("a tabby cat")

| Slot | Animal | Color | Blank | Records |
|------|--------|-------|-------|---------|
| 1 | Arnold (B2026001) | Tabby and White | false | 2 |
| 2 | Karen Smith (S2026447) | Tabby: Orange and White | false | 1 |
| 3 | Reeboks (S2025883) | Orange tabby | false | 1 |

All 3 documented, despite **30 blank tabby cats** existing in pool. Documented preferred by Phase-1 ranking + blank-last sub-sort. [VERIFIED]

### TEST C: Programmatic Cross-Tier Guard (the critical test)

**Input (shuffled):** blank-FULL, doc-PARTIAL, doc-FULL, blank-PARTIAL

**Correct sort output:** doc-FULL → blank-FULL → doc-PARTIAL → blank-PARTIAL ✅

| Position | Item | Tier | Blank |
|----------|------|------|-------|
| 0 | doc-FULL | 0 | false |
| 1 | **blank-FULL** | 0 | true |
| 2 | **doc-PARTIAL** | 2 | false |
| 3 | blank-PARTIAL | 2 | true |

**Cross-tier guard:** blank-FULL at idx 1, doc-PARTIAL at idx 2. **Blank FULL ranks ABOVE documented PARTIAL.** Tiers preserved. ✅ [VERIFIED]

### ABLE-TO-FAIL: Wrong Sort Detection

**Wrong sort (blank as primary tier):** doc-FULL → doc-PARTIAL → blank-FULL → blank-PARTIAL

With blank as primary tier, doc-PARTIAL (idx 1) would rank above blank-FULL (idx 2) — **a cross-tier violation**. The test detects this: ✅ [VERIFIED]

This proves: (a) the able-to-fail check works, (b) the correct sort algorithm avoids this violation.

### TEST D: SEL-RULE5 Re-check ("a black cat that is fun")

| Slot | Animal | Color |
|------|--------|-------|
| 1 | Billy Boy (S2025546) | Tuxedo: Black and White |
| 2 | Carlo Gambino (W2026014) | Black |
| 3 | Dante (S20241099) | Black and White |

- All black: ✅ 3/3
- Karen Smith: ✅ absent

SEL-RULE5 unaffected by blank-last sub-sort. [VERIFIED]

---

## Deviations

None.

---

## NOT COMMITTED

This change is built and verified but NOT committed. Commit is a separate step per operator instructions.
