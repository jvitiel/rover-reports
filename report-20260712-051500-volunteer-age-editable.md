# Volunteer Age Editable — Revert Design-A Immutability

**Date:** 2026-07-12  
**Commit:** 100b83d (builds on 8faf49f)  
**Files changed:** server/src/server.ts, dashboard/index.html  
**NOT changed:** localDatabase.ts (updateVolunteer already had age_under_18 from 8faf49f), schema, 3 app.js files, SEARCHER/matcher

---

## Changes Made

### PATCH (server.ts ~10862)

Removed Design-A immutability comment. Added age write logic with `!== undefined` guard:

```typescript
const rawAge18 = p.age_18_or_older ?? p.is_18_or_older;
if (rawAge18 !== undefined) {
  updates.age_18_or_older = (rawAge18 === true || rawAge18 === 'yes') ? true
    : (rawAge18 === false || rawAge18 === 'no') ? false : null;
}
const rawAgeU18 = p.age_under_18 ?? p.age_if_under_18;
if (rawAgeU18 !== undefined) {
  updates.age_under_18 = rawAgeU18 ? (parseInt(String(rawAgeU18), 10) || null) : null;
}
```

Handles all field-name variants (web form `is_18_or_older`/`age_if_under_18`, OCR/dashboard `age_18_or_older`/`age_under_18`). The `!== undefined` guard ensures a PATCH without age fields doesn't null them. [VERIFIED]

### Dashboard (index.html)

- **HTML:** Restored `<select id="vf-age_18_or_older">` (options: —/Yes/No) and `<input id="vf-age_under_18">` (placeholder "e.g. 16")
- **volToggleAge():** Restored — shows age input when No selected, hides otherwise
- **Population:** Reads from `volRecord.age_18_or_older` / `volRecord.age_under_18` (column values, not form_data.personal — avoids the field-name mismatch). 1→"true", 0→"false", null→""
- **Save/collect:** Re-added `age_18_or_older` (boolean from select) and `age_under_18` (string from input)

---

## Proofs

### 1. tsc + Build + Restart [VERIFIED]

- `npx tsc --noEmit`: exit 0
- `npm run build`: exit 0
- `systemctl is-active shelter-app`: active

### 2. Edit Proof — PATCH Now Writes Age [VERIFIED]

**Scratch row created:** id=476, web_form, initial state age_18_or_older=1, age_under_18=NULL

**PATCH 1:** `age_18_or_older=false, age_under_18="15"`
```
BEFORE: 476|1|
AFTER:  476|0|15
```
PATCH now writes age fields. ✓

**PATCH 2:** `age_18_or_older=true` (no age_under_18 in payload)
```
AFTER:  476|1|15
```
age_18_or_older switched to 1; age_under_18 retained at 15 (not in payload, so `!== undefined` guard preserved it). ✓

### 3. No-Nulling Proof [VERIFIED]

PATCH with only `cell_phone` in payload, no age fields:
```
BEFORE: 476|1|15|
AFTER:  476|1|15|5551234567
```
age_18_or_older and age_under_18 UNCHANGED. Cell phone updated. The `!== undefined` guard works. ✓

### 4. POST Intake Still Correct [VERIFIED]

Web form `is_18_or_older="no"` + `age_if_under_18="17"`:
```
477|0|17
```
POST field-name fix from 8faf49f intact. ✓

### 5. Dashboard Rendering [VERIFIED]

- `<select id="vf-age_18_or_older">` present with onchange="volToggleAge()" ✓
- `<input id="vf-age_under_18">` present ✓
- `volToggleAge()` function defined, referenced by: onchange (line 5726), function def (line 12647), population call (line 12895) — no dangling handlers ✓
- Population reads from `volRecord` columns, not form_data.personal ✓
- Save/collect sends age_18_or_older (boolean) and age_under_18 (string) ✓

### 6. Untouched Confirmations [VERIFIED]

- **Schema:** `PRAGMA table_info` shows age_under_18 INTEGER, nullable ✓
- **5 backfilled rows:**
  - 464 Jeremy Levine: 1/NULL ✓
  - 468 Christia Ninan: 0/17 ✓
  - 469 Everly Tejada: 0/16 ✓
  - 470 Hailey Veloz: 0/17 ✓
  - 471 Amber Veloz: 1/NULL ✓
- **3 app.js files:** not in `git diff --name-only HEAD` ✓
- **SEARCHER/matcher handlers:** untouched ✓
- **Row count:** 455 (test rows created and deleted) ✓
- **`git diff --name-only HEAD`:** only dashboard/index.html, server/src/server.ts ✓

### Test Row Cleanup [VERIFIED]
```
DELETE FROM volunteers WHERE id IN (476, 477) AND notes='__TEST_DATA_PHASE21__';
-- changes(): 2
-- Verify: empty result for those ids
-- Row count: 455
```
