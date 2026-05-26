# Dashboard 11 — Phase A: animalId → shelterCode rename (server-side accept-both)

**Date:** 2026-05-26 21:54 UTC
**Commit:** c414ade
**Scope:** server/src/types.ts, server/src/server.ts (two endpoints only)

## Changes

### 1. types.ts — BehaviorNotes interface

**Before:**
```ts
export interface BehaviorNotes {
  id?: string;
  animalId: string;
  ...
```

**After:**
```ts
export interface BehaviorNotes {
  id?: string;
  shelterCode?: string;
  /** @deprecated Use shelterCode. Will be removed in a future cleanup phase. */
  animalId: string;
  ...
```

`shelterCode` added as the canonical field. `animalId` retained (required, not optional) to keep the save path in localDatabase.ts working unchanged — it reads `notes.animalId` to write the `shelter_code` DB column.

### 2. server.ts — /api/caregiver/transcribe handler

**Before:**
```ts
const { animalId, animalName, caregiver } = req.body;
if (!animalId) {
  res.status(400).json({ success: false, error: 'animalId required' });
  return;
}
```

**After:**
```ts
const shelterCode = req.body.shelterCode || req.body.animalId;
if (!req.body.shelterCode && req.body.animalId) {
  console.warn(`[Caregiver] Deprecated 'animalId' field used in /api/caregiver/transcribe; should be 'shelterCode'. Source: ${req.body.caregiver || 'unknown'}`);
}
const { animalName, caregiver } = req.body;
if (!shelterCode) {
  res.status(400).json({ success: false, error: 'shelterCode (or animalId) required' });
  return;
}
```

All downstream references within the handler updated from `animalId` → `shelterCode`. The BehaviorNotes object sets both fields:
```ts
const behaviorNotes: BehaviorNotes = {
  shelterCode,
  animalId: shelterCode, // Legacy: keeps save path working until cleanup phase
  ...parsed,
  ...
};
```

### 3. server.ts — /api/caregiver/save handler

**Before:**
```ts
const { behaviorNotes } = req.body;
if (!behaviorNotes || !behaviorNotes.animalId) {
  res.status(400).json({ ... error: 'behaviorNotes with animalId required' });
  return;
}
saveBehaviorNotes(behaviorNotes as BehaviorNotes);
console.log(`[Caregiver] Saved behavior notes for ${behaviorNotes.animalId} after user confirmation`);
```

**After:**
```ts
const { behaviorNotes } = req.body;
const resolvedCode = behaviorNotes?.shelterCode || behaviorNotes?.animalId;
if (!behaviorNotes || !resolvedCode) {
  res.status(400).json({ ... error: 'behaviorNotes with shelterCode (or animalId) required' });
  return;
}
if (!behaviorNotes.shelterCode && behaviorNotes.animalId) {
  console.warn(`[Caregiver] Deprecated 'animalId' field used in /api/caregiver/save; should be 'shelterCode'. Source: ${behaviorNotes.caregiver || 'unknown'}`);
}
behaviorNotes.shelterCode = resolvedCode;
behaviorNotes.animalId = resolvedCode;
saveBehaviorNotes(behaviorNotes as BehaviorNotes);
console.log(`[Caregiver] Saved behavior notes for ${resolvedCode} after user confirmation`);
```

## Verification

### Build
- `npm run build` — clean, zero TS errors [VERIFIED]

### Test 1 — new field name (shelterCode)
- POST /api/caregiver/transcribe with `shelterCode: "A2023030"` → success, response contains both `shelterCode` and `animalId` [VERIFIED]
- POST /api/caregiver/save → success [VERIFIED]
- DB row: `shelter_code = A2023030`, `caregiver = Phase A Test New`, `source = app` [VERIFIED]
- No deprecation warning in journal [VERIFIED]

### Test 2 — legacy field name (animalId)
- POST /api/caregiver/transcribe with `animalId: "A2023030"` → success [VERIFIED]
- POST /api/caregiver/save → success [VERIFIED]
- DB row: `shelter_code = A2023030`, `caregiver = Phase A Test Legacy`, `source = app` [VERIFIED]
- Deprecation warning logged: `[Caregiver] Deprecated 'animalId' field used in /api/caregiver/transcribe; should be 'shelterCode'. Source: Phase A Test Legacy` [VERIFIED via journalctl]

### Cleanup
- Both test rows deleted, count confirmed 0 [VERIFIED]

## Not touched (per scope)
- No client-side files modified
- localDatabase.ts unchanged (save path reads `notes.animalId` as before)
- parseBehaviorNotes unchanged
- No other endpoints modified
- No schema changes
