# Bio State "Priority" Label Implementation Report

**Date:** 2026-06-24  
**Commit:** `22f1b05` — `dashboard/index.html` only (1 insertion, 1 deletion)

---

## Before / After

### Before (dashboard/index.html:15519)

```js
<td>${a.bioState || '—'}</td>
```

### After (dashboard/index.html:15519)

```js
<td>${a.bioState === 'needed' && a.dateOfBirth && (Date.now() - new Date(a.dateOfBirth).getTime()) / 86400000 >= 365 ? 'priority' : (a.bioState || '—')}</td>
```

**Logic:** When `bioState === 'needed'` AND `dateOfBirth` exists AND age ≥ 365 days → display `"priority"`. Otherwise display the raw `bioState` value unchanged. Missing `dateOfBirth` → falls through to `"needed"` (no crash).

---

## Untouched (confirmed)

| Component | Location | Status |
|-----------|----------|--------|
| `computeBioState()` | server/src/server.ts:2665 | **Not modified** — still returns `'needed'` for both sub-groups |
| `a.bioState` property | row data object | **Not modified** — remains `'needed'` on all these animals |
| Needed filter | dashboard/index.html:15465 | **Not modified** — `a.bioState === profilesBioStateFilter` matches underlying value |
| Sort precedence map | dashboard/index.html:15470 | **Not modified** — `{ needed: 0, pending: 1, youth: 2, approved: 3 }` keyed on `a.bioState` |
| Server code | server/src/server.ts | **Not modified** — zero changes |

---

## Verification (API data)

### Needed filter count

**167 animals** have `bioState === 'needed'` from the server. The Needed filter button (`setProfilesBioStateFilter('needed')` at line 5344) calls `animals.filter(a => a.bioState === profilesBioStateFilter)` at line 15465. Since `a.bioState` is still `'needed'` on all 167, the filter catches all 167 — both those displaying as "priority" and those displaying as "needed".

### Label split breakdown

- **60 animals** display as **"priority"** (bioState='needed', age ≥ 365 days)
- **107 animals** display as **"needed"** (bioState='needed', age < 365 days or no dateOfBirth)
- **Total in Needed filter: 167** (unchanged)

### Example priority animals

| Name | Species | Age | Underlying bioState | Displayed Label |
|------|---------|-----|---------------------|-----------------|
| Sleepie | Cat | ~17yr (6239d) | needed | **priority** |
| Lacey | Cat | ~16yr (5908d) | needed | **priority** |
| Buddy | Cat | ~15yr (5501d) | needed | **priority** |
| Baki | Dog | ~3yr (1168d) | needed | **priority** |

### Example still-needed animals

| Name | Species | Age | Underlying bioState | Displayed Label |
|------|---------|-----|---------------------|-----------------|
| Aiden | Cat | 89d | needed | **needed** |
| Alice | Cat | 116d | needed | **needed** |
| Althea | Cat | 92d | needed | **needed** |
| Amy March (Daisy) | Cat | 88d | needed | **needed** |

### Other states (unchanged)

| State | Count | Display |
|-------|-------|---------|
| youth | 235 | "youth" (unchanged) |
| pending | 47 | "pending" (unchanged) |
| approved | 40 | "approved" (unchanged) |

### Sort behavior

Bio State sort uses `bioStateOrder[va]` where `va = a.bioState`. Both "priority"-labeled and "needed"-labeled animals have `a.bioState === 'needed'`, so both get sort rank `0`. They group together at the top when sorted ascending. Within the group, sub-ordering is stable (original array order preserved by the sort comparator returning 0 for equal ranks).

---

## Commit

```
22f1b05 profiles: display 'priority' label for needed animals ≥1yr old (display-only, filter/sort/state unchanged)
 1 file changed, 1 insertion(+), 1 deletion(-)
 dashboard/index.html
```
