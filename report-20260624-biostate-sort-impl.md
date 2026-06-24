# Bio State Sort — Priority Group Implementation Report

**Date:** 2026-06-24  
**Commit:** `6ee5731` — `dashboard/index.html` only (6 insertions, 3 deletions)

---

## Before / After

### Before — Precedence map (dashboard/index.html:15470)

```js
const bioStateOrder = { needed: 0, pending: 1, youth: 2, approved: 3 };
```

### After — Precedence map (dashboard/index.html:15470)

```js
const bioStateOrder = { priority: 0, needed: 1, pending: 2, youth: 3, approved: 4 };
```

Priority at rank 0, needed shifts to 1, rest shift +1. Relative order of pending/youth/approved preserved.

### Before — Comparator branch (dashboard/index.html:15479–15480)

```js
if (profilesSortCol === 'bioState') {
    return dir * ((bioStateOrder[va] ?? -1) - (bioStateOrder[vb] ?? -1));
}
```

### After — Comparator branch (dashboard/index.html:15480–15484)

```js
// bioState: use precedence order with effective state (priority/needed split)
if (profilesSortCol === 'bioState') {
    const ea = effectiveBioState(a);
    const eb = effectiveBioState(b);
    return dir * ((bioStateOrder[ea] ?? -1) - (bioStateOrder[eb] ?? -1));
}
```

### New — effectiveBioState helper (dashboard/index.html:15471)

```js
const effectiveBioState = (row) => row.bioState === 'needed' && row.dateOfBirth && (Date.now() - new Date(row.dateOfBirth).getTime()) / 86400000 >= 365 ? 'priority' : row.bioState;
```

Uses the **identical** ≥365-day-from-dateOfBirth determination as the label render (line 15522). Missing dateOfBirth → returns raw `bioState` ('needed'), same graceful fallback as label.

---

## Untouched (confirmed)

| Component | Location | Status |
|-----------|----------|--------|
| Label render | dashboard/index.html:15522 | **Not modified** — still the commit 22f1b05 label logic |
| Needed filter | dashboard/index.html:15464–15466 | **Not modified** — `a.bioState === profilesBioStateFilter` matches raw value |
| `a.bioState` property | row data object | **Not modified** — remains `'needed'` on both sub-groups |
| `computeBioState()` | server/src/server.ts | **Not modified** |
| Other sort branches | location, string, numeric | **Not modified** |

---

## Verification (API data simulation)

### Sort grouping — all animals

Sorted ascending by Bio State:

| Group | Count | Example animals | Underlying bioState |
|-------|-------|-----------------|---------------------|
| **priority** | 60 | Artemisia (Cat), Asher (Dog), Baki (Dog) | needed |
| **needed** | 107 | Aiden (Cat), Alice (Cat), Althea (Cat) | needed |
| **pending** | 47 | Abstract (Dog), Achilles (Dog), Arnold (Cat) | pending |
| **youth** | 235 | Akari (Cat), Alfie (Cat), Alo (Cat) | youth |
| **approved** | 40 | Abe/Louie (Cat), Amari (Dog), Anastasia (Rabbit) | approved |

Priority and needed animals form **distinct, non-interleaved blocks**. Priority sorts before needed.

### Sort grouping — under Needed filter

With the Needed filter engaged (167 total, `a.bioState === 'needed'`):

| Group | Count |
|-------|-------|
| **priority** | 60 |
| **needed** | 107 |

Both groups still captured by the filter (which matches raw `a.bioState === 'needed'`). Sorted into a priority block then needed block — no interleaving.

### Adoptable + Needed filter

51 total (unchanged): 29 priority + 22 needed. Filter count unchanged.

### Displayed labels match sort groups

- Every row in the priority sort group displays "priority" as its Bio State label (label render uses same ≥365d logic)
- Every row in the needed sort group displays "needed"
- No mismatch between sort grouping and displayed text

### Other columns

Location sort, string sort, numeric sort — all branches unchanged, unaffected.

---

## Commit

```
6ee5731 profiles: sort Bio State with priority/needed as distinct groups (effective-state ranking, display-only)
 1 file changed, 6 insertions(+), 3 deletions(-)
 dashboard/index.html
```
