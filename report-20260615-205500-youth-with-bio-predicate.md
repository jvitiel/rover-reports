# Dashboard: approved = approved or youth-with-bio

**Commit:** `cacaad2` — `dashboard: approved count/filter = approved or youth-with-bio (excludes bio-less youth)`  
**Scope:** `dashboard/index.html` only (5 insertions, 5 deletions). Static file, live on save.

---

## Field confirmation

`a.bio` on the dashboard payload (`/api/dashboard/behavior-notes`):
- **dict** (truthy) when an `animal_bios` row exists — including youth generics (`lastSource='generic'`, `statusLong='approved'`)
- **null** (falsy) when no row exists

Verified on Basil (S2026346, adoptable youth with generic bio): `a.bio` is a dict with `lastSource='generic'`, `statusLong='approved'`. Verified on Aiden (S2026397, non-adoptable youth, no bio): `a.bio` is `None`.

## Changes

### Change 1 — sub-counts in updateTileCounts (~line 6819)

```javascript
// FROM:
cats.filter(a => a.bioState === 'approved' || a.bioState === 'youth')
// TO:
cats.filter(a => a.bioState === 'approved' || (a.bioState === 'youth' && a.bio))
```
Applied to all three species lines (cats, dogs, smalls).

### Change 2 — row filter (~line 6849)

```javascript
// FROM:
filtered = filtered.filter(a => a.bioState === 'approved' || a.bioState === 'youth');
// TO:
filtered = filtered.filter(a => a.bioState === 'approved' || (a.bioState === 'youth' && a.bio));
```

## Before/after

### All view (big number: 492 — unchanged)

| Element | Before | After |
|---------|--------|-------|
| Sub-count (dataAll) | 302 approved | **81 approved** |
| Per-species | Cats 280, Dogs 16, Smalls 6 | **Cats 69, Dogs 7, Smalls 5** |
| SHOWING (Approved filter) | 302 | **81** |
| Sub-count == SHOWING | ✅ | ✅ |

### Adoptable & Pending (big number: 150 — unchanged)

| Element | Before | After |
|---------|--------|-------|
| Sub-count (dataAll) | 73 approved | **73 approved** (same) |
| Per-species | Cats 62, Dogs 7, Smalls 4 | **Cats 62, Dogs 7, Smalls 4** (same) |
| SHOWING (Approved filter) | 73 | **73** (same) |
| Sub-count == SHOWING | ✅ | ✅ |

### Exclusion confirmed

- 221 bio-less non-adoptable youth: **excluded from both sub-count and Approved row filter** (0 match new predicate)
- Big number (492/150): **unchanged**
- Species tiles (69/397/26 All, 40/91/19 Adoptable): **unchanged**

## Not changed

- `computeBioState` (server-side)
- Youth filter button / Needed / Pending filter branches
- Big number (`totalAnimals`)
- Species count tiles
