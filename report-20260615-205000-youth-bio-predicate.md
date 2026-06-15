# Youth-with-bio predicate — scoping the correct "X approved" sub-count

**Date:** 2026-06-15 20:50 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Q1: Does computeBioState return 'youth' purely from age?

**Yes.** Rule 3 checks age only — no bio existence check:

```typescript
// Rule 3 (server.ts:2650):
const age = ageInDays(dateOfBirth);
if (age !== null && age <= 84) return 'youth';
```

A non-adoptable kitten with no bio still gets `bioState='youth'` as long as it's ≤84 days old. The only things that preempt youth are Rule 1 (non-generic approved bio) and Rule 2 (has staff content / SM comment).

---

## Q2: Bio-related fields per animal in the dashboard payload

Each animal in `/api/dashboard/behavior-notes` response has:

| Field | Type | Meaning |
|-------|------|---------|
| `bio` | `object \| null` | Full `animal_bios` row when one exists, `null` when no row |
| `bioStatus` | `string` | Legacy field: `'approved'`, `'draft'`, `'none'` |
| `bioState` | `string` | Computed: `'approved'`, `'pending'`, `'youth'`, `'needed'` |

When `bio` is non-null, it contains:
```
id, animalId, shelterCode, bioEnLong, bioEsLong, statusLong, approvedAtLong,
bioEnShort, bioEsShort, statusShort, approvedAtShort, generatedAt, lastSource
```

**The key distinguisher:** `a.bio !== null` means an `animal_bios` row exists. Youth without a bio have `a.bio === null`.

---

## Q3: Youth with/without bio

### All 492 animals

| Category | Count |
|----------|-------|
| All youth (bioState='youth') | **270** |
| Youth WITH animal_bios row (`bio !== null`) | **49** |
| Youth WITHOUT bio (`bio === null`) | **221** |

### Non-adoptable youth (226)

| Category | Count |
|----------|-------|
| With bio | **5** |
| Without bio | **221** |

The 5 non-adoptable youth with bios are all `lastSource='generic'` — youth generics written while they were adoptable, before going non-available:

| Code | Name | lastSource |
|------|------|-----------|
| S2026507 | Andromeda | generic |
| S2026508 | Dorado | generic |
| S2026515 | Goldfinch | generic |
| S2026368 | Leonardo | generic |
| W2026053 | Oats | generic |

### Adoptable youth (44)

| Category | Count |
|----------|-------|
| With bio | **44** |
| Without bio | **0** |

Every adoptable youth animal has a bio (all youth generics from the daily job). This is why the adoptable sub-count is unaffected.

---

## Q4: Proposed predicate: `approved + youth-with-bio`

Client-side condition:
```javascript
a.bioState === 'approved' || (a.bioState === 'youth' && a.bio)
```

| View | Current (approved + all youth) | Proposed (approved + youth-with-bio) |
|------|-------------------------------|--------------------------------------|
| **All** | 32 + 270 = **302** | 32 + 49 = **81** |
| **Adoptable** | 29 + 44 = **73** | 29 + 44 = **73** (unchanged) |

The adoptable view stays at 73 because all 44 adoptable youth have bios. The "All" view drops from 302 to 81, excluding the 221 non-adoptable youth with no bio.

---

## Summary

The available client-side fields make the fix straightforward:

```javascript
// Current:
cats.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;

// Proposed:
cats.filter(a => a.bioState === 'approved' || (a.bioState === 'youth' && a.bio)).length;
```

`a.bio` is the full `animal_bios` row object (or `null`). Truthy check is sufficient — if the row exists, the animal has a bio.

| Element | Current All | Proposed All | Current Adoptable | Proposed Adoptable |
|---------|------------|-------------|-------------------|-------------------|
| Sub-count | 302 | **81** | 73 | **73** (same) |
