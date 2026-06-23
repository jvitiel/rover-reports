# Profiles Table Width Fix Report

**Date:** 2026-06-23  
**Commit:** `fb478ef`  
**File changed:** `dashboard/index.html` (1 file, 1 insertion, 1 deletion)

---

## Before (`dashboard/index.html:2464–2475`)

```css
.profiles-table-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  border-right: 2px solid var(--accent);
  border-bottom: 2px solid var(--accent);
  width: fit-content;
  padding-right: 32px;        /* ← dead space + bleed cause */
}
```

## After

```css
.profiles-table-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  border-right: 2px solid var(--accent);
  border-bottom: 2px solid var(--accent);
  width: fit-content;
  max-width: 100%;             /* safety cap: can't overflow flex parent */
}
```

## Changes

1. **Removed** `padding-right: 32px` — eliminated the 32px dead space between Score column and scrollbar/right border
2. **Added** `max-width: 100%` — prevents wrapper from ever overflowing `.profiles-main`'s flex allocation into the sidebar

## Verification

- Dead white space between Score column and scrollbar: **gone** — right border sits flush past Score
- Table no longer bleeds into / overlaps the right-side sidebar card
- All 9 columns render correctly: Name, Species, Location, Age, Bio State, Profiles, Most Recent, Author, Score
- Dashboard serves without errors; other tabs/tables unaffected
- `width: fit-content` still active — table sizes to content, just without the 32px overhang
