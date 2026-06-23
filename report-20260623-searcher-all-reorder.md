# Searcher: All Pill Reorder Report

**Date:** 2026-06-23  
**Commit:** `c6063d8`  
**File changed:** `custom-search/index.html` (1 file, 2 insertions, 2 deletions)

---

## Before (commit 9904e17)

**Gender:** All | Male | Female  
**Age:** All | Young | Adult | Senior

## After (commit c6063d8)

**Gender:** Male | Female | All  
**Age:** Young | Adult | Senior | All

---

## No JS/CSS Change Needed

The toggle logic (`setupAllToggle` in `app.js:295–319`) uses `document.querySelector('input[name="${groupName}"][value="all"]')` — keyed on `value="all"`, not DOM position. Reordering the pills has no effect on behavior.

Submit strip (`.filter(v => v !== 'all')`) and i18n mapping (`'sex:all'`, `'ageGroup:all'`) are also value-keyed, position-independent.

---

## Verification

- Gender row renders: Male, Female, All (All last) ✓
- Age row renders: Young, Adult, Senior, All (All last) ✓
- Toggle works: All checks/unchecks all siblings; individual uncheck unchecks All; all re-checked auto-checks All ✓
- Submit strips "all" — API receives only real values ✓
- ES shows "Todos" as last pill in both groups ✓
- Spacing/fit unchanged; production untouched ✓
