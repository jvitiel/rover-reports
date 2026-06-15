# Dashboard "approved" count unchanged after adult-intake run — diagnosis

**Date:** 2026-06-15 19:20 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Root cause

`computeBioState()` (server.ts:2633) **never returns 'approved' for generic_adult bios**. This is by design — Rule 1 checks `!isGenericSource(bio.lastSource)` and `isGenericSource` matches both `'generic'` and `'generic_adult'`:

```typescript
// Rule 1: approved — non-generic bio with at least one approved status
if (bio && !isGenericSource(bio.lastSource) &&
    (bio.statusLong === 'approved' || bio.statusShort === 'approved')) {
  return 'approved';
}
```

So even though the 68 new `animal_bios` rows have `status_long='approved'` and `status_short='approved'`, they're invisible to the "approved" tile because their `last_source='generic_adult'` causes Rule 1 to skip them.

They fall through to Rule 2 (`hasRealStaffContentForLabel`) or Rule 4 ('needed'):

| bioState | Count | Why |
|----------|-------|-----|
| **pending** | 33 | Has caregiver profile OR meaningful SM comment |
| **needed** | 35 | No profile, no SM comment (or SM comment is empty/boilerplate) |
| **approved** | 0 | `isGenericSource('generic_adult')` → Rule 1 skipped |

The dashboard's "approved" tile counts `bioState === 'approved' || bioState === 'youth'`, which correctly excludes all 68.

---

## Q1: Adoptable definition match

**findAdultIntakeCandidates** uses `fetchAnimals({ includeUnavailable: false })` — adoptable only.

**Dashboard "Adoptable & Pending" filter** uses `a.isAvailable !== false`, applied to data from `fetchAnimals({ includeUnavailable: true })`.

Both identify the same population: animals where SM `isAvailable` is true. All 70 generic_adult animals (68 new + 2 Track C) are adoptable. **0 are non-adoptable.**

## Q2: Spot-check — 5 of the 68

| Code | Name | Species | isAvailable | bioState | statusLong | lastSource | Profile? | SM comment? |
|------|------|---------|-------------|----------|------------|------------|----------|-------------|
| A2025167 | Dodger | Dog | true | **pending** | approved | generic_adult | No | Yes |
| S2026495 | Andrew | Cat | true | **needed** | approved | generic_adult | No | No |
| R2026007 | Anastasia | Rabbit | true | **pending** | approved | generic_adult | Yes | No |
| S2026528 | Catzilla | Cat | true | **needed** | approved | generic_adult | No | No |
| S2026357 | Lilac | Cat | true | **pending** | approved | generic_adult | Yes | No |

- Dodger: no profile, but has SM comment → `hasRealStaffContentForLabel` returns true → `bioState='pending'`
- Andrew: no profile, no SM comment → falls through to Rule 4 → `bioState='needed'`
- Anastasia: has profile → `getBehaviorNotesCount > 0` → `bioState='pending'`
- Catzilla: no profile, no SM comment → `bioState='needed'`
- Lilac: has profile → `bioState='pending'`

**None get `bioState='approved'`** because `isGenericSource('generic_adult')` is true.

## Q3: Dashboard "approved" tile code

`updateTileCounts()` (dashboard/index.html:6814):

```javascript
const catsData = cats.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;
const dogsData = dogs.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;
const smallsData = smalls.filter(a => a.bioState === 'approved' || a.bioState === 'youth').length;
```

The tile counts animals where **`computeBioState()` returns 'approved' or 'youth'** — NOT `animal_bios.status_long`. Since `computeBioState` never returns 'approved' for generic_adult bios, the tile doesn't move.

The `tilePool` is scoped by adoption filter (line 6866):
```javascript
const tilePool = currentAdoptionStatusFilter === 'adoptable'
  ? allAnimalsData.filter(a => a.isAvailable !== false)
  : currentAdoptionStatusFilter === 'pending'
    ? allAnimalsData.filter(a => a.adoptionPending === true)
    : allAnimalsData;
```

"All" uses the full `allAnimalsData` (including non-adoptable), "Adoptable & Pending" filters to `isAvailable !== false`. **Neither would show these as approved** — the bioState is the bottleneck, not the adoption filter.

## Q4: Orchid (S2026358) and Peony (S2026356) — control case

| Code | Name | isAvailable | bioState | statusLong | lastSource | Profile? | SM comment? |
|------|------|-------------|----------|------------|------------|----------|-------------|
| S2026358 | Orchid | true | **needed** | approved | generic_adult | No | No |
| S2026356 | Peony | true | **needed** | approved | generic_adult | No | No |

Same behavior as the 68: `generic_adult` source → `isGenericSource` → Rule 1 skip → no profile/no SM comment → `bioState='needed'`. These have been this way since Track C (commit `e586a89`).

*(Note: Original Track C report used S2026441/S2026443 as internal IDs; the actual shelter_codes in animal_bios are S2026358/S2026356.)*

---

## Summary

**This is correct behavior, not a bug.** The `computeBioState` design intentionally treats generic bios (youth generic and adult generic alike) as placeholders, not "approved" content. The approved tile counts animals with **staff-authored, human-reviewed** bios — generic text doesn't qualify.

The 68 animals moved from "no bio at all" to "has an approved public bio" (visible to adopters), but their dashboard bioState reflects that they still need a **real** (non-generic) bio:
- 33 are **pending** (have seed content — SM comment or profile — ready for AI generation)
- 35 are **needed** (no seed content yet)

The "All → approved" number John saw increase was likely a different dashboard metric or a misread — the bioState-based approved count should be unchanged in both views.
