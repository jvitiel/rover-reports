# Bio State Sort — Priority Group Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only diagnosis. Find where Bio State sort keys, confirm dateOfBirth available, identify minimal change to sort priority/needed as distinct groups.

---

## 1. Bio State Sort Logic

The sort is in `renderProfilesTable()` at **dashboard/index.html:15468–15485**:

```js
// Sort                                                          // :15468
const dir = profilesSortAsc ? 1 : -1;                           // :15469
const bioStateOrder = { needed: 0, pending: 1, youth: 2, approved: 3 };  // :15470
animals = [...animals].sort((a, b) => {                          // :15471
    let va = a[profilesSortCol];                                 // :15472
    let vb = b[profilesSortCol];                                 // :15473
    // Nulls always sort last
    if (va == null && vb == null) return 0;                      // :15475
    if (va == null) return 1;                                    // :15476
    if (vb == null) return -1;                                   // :15477
    // bioState: use precedence order instead of alphabetical
    if (profilesSortCol === 'bioState') {                        // :15479
        return dir * ((bioStateOrder[va] ?? -1) - (bioStateOrder[vb] ?? -1));  // :15480
    }
```

**Precedence map (current):** `needed: 0, pending: 1, youth: 2, approved: 3`

Ascending sort order: needed → pending → youth → approved (most-urgent-first).

---

## 2. What Key It Sorts On

The comparator gets `va = a[profilesSortCol]` at **line 15472**. When `profilesSortCol === 'bioState'`, `va` is `a.bioState` — the raw server value. Both "needed" and "priority"-displayed animals have `a.bioState === 'needed'`, so `va` is `'needed'` for both, they get the same precedence rank `0`, and they interleave (sort is not stable — `[...animals].sort()` with equal keys gives arbitrary order).

**Confirmed:** sort keys on raw `a.bioState`, not the displayed label.

---

## 3. Label Logic to Mirror

The label-render change (commit `22f1b05`) at **dashboard/index.html:15519**:

```js
<td>${a.bioState === 'needed' && a.dateOfBirth && (Date.now() - new Date(a.dateOfBirth).getTime()) / 86400000 >= 365 ? 'priority' : (a.bioState || '—')}</td>
```

The determination: `a.bioState === 'needed'` AND `a.dateOfBirth` is truthy AND `(Date.now() - new Date(a.dateOfBirth).getTime()) / 86400000 >= 365`.

**dateOfBirth at the sort comparator:** The sort comparator iterates the same `animals` array with `(a, b) => { ... }`. Each `a` and `b` is the full row object with `a.dateOfBirth` available (same field the label render and Age column use — confirmed at server/src/server.ts:1368 where `dateOfBirth: sm.dateOfBirth || null` is on the response). So the ≥365d check can be performed identically inside the comparator.

---

## 4. Where Priority Slots in the Order

**Current order (ascending):**

| Rank | State | Meaning |
|------|-------|---------|
| 0 | needed | Needs a bio, 84d–<1yr |
| 1 | pending | Has real staff content, awaiting approval |
| 2 | youth | ≤84 days old |
| 3 | approved | Has approved non-generic bio |

**Proposed order with priority:**

| Rank | State | Meaning |
|------|-------|---------|
| 0 | **priority** | Needs a bio, ≥1yr old (most urgent) |
| 1 | needed | Needs a bio, 84d–<1yr |
| 2 | pending | Has real staff content, awaiting approval |
| 3 | youth | ≤84 days old |
| 4 | approved | Has approved non-generic bio |

Priority slots **before** needed (rank 0, needed shifts to 1, rest shift +1). Both are "needs a profile" but priority is more urgent (older animal, been waiting longer). The relative order of pending/youth/approved is preserved.

---

## 5. Minimal Change

**Approach:** Compute an "effective state" for each row in the bioState sort branch, using the same ≥1yr logic as the label render. Key the precedence map on the effective state.

**Exact spot:** Lines **15470** and **15479–15480** in `dashboard/index.html`.

**Change 1 — Expand the precedence map (line 15470):**

```js
// Current:
const bioStateOrder = { needed: 0, pending: 1, youth: 2, approved: 3 };

// Proposed:
const bioStateOrder = { priority: 0, needed: 1, pending: 2, youth: 3, approved: 4 };
```

**Change 2 — Compute effective state in the comparator (lines 15479–15480):**

```js
// Current:
if (profilesSortCol === 'bioState') {
    return dir * ((bioStateOrder[va] ?? -1) - (bioStateOrder[vb] ?? -1));
}

// Proposed:
if (profilesSortCol === 'bioState') {
    const ea = va === 'needed' && a.dateOfBirth && (Date.now() - new Date(a.dateOfBirth).getTime()) / 86400000 >= 365 ? 'priority' : va;
    const eb = vb === 'needed' && b.dateOfBirth && (Date.now() - new Date(b.dateOfBirth).getTime()) / 86400000 >= 365 ? 'priority' : vb;
    return dir * ((bioStateOrder[ea] ?? -1) - (bioStateOrder[eb] ?? -1));
}
```

`ea`/`eb` = "effective state" for sort purposes. Mirrors the label-render logic exactly.

**What this affects:**
- ✅ Sort ordering — priority animals group before needed animals
- ❌ `a.bioState` value — **untouched** (still `'needed'` on the object)
- ❌ Needed filter — **untouched** (matches `a.bioState === 'needed'`, catches both)
- ❌ Label render — **untouched** (already done in commit 22f1b05)
- ❌ Server/computeBioState — **untouched**
- ❌ Other states' sort order — **preserved** (pending/youth/approved shift +1 but keep same relative order)

**Total change:** 2 lines modified in `dashboard/index.html`, both inside `renderProfilesTable()`.
