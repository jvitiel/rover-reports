# Profiler Auto-Fill Fix

**Date:** 2026-06-21 ~21:45 UTC  
**Commit:** `e4a34ed`  
**File:** `server/src/localDatabase.ts` (1 deletion)

---

## Before/After

```typescript
// BEFORE (localDatabase.ts:4849-4852):
const shouldAutoFill = 
  params.source === 'profiler' || 
  params.source === 'sm' || 
  params.tagMarketing;

// AFTER (localDatabase.ts:4849-4851):
const shouldAutoFill = 
  params.source === 'sm' || 
  params.tagMarketing;
```

## Diff

```diff
@@ -4847,7 +4847,6 @@
      if (params.mediaType === 'photo' && params.shelterCode) {
        const shouldAutoFill = 
-         params.source === 'profiler' || 
          params.source === 'sm' || 
          params.tagMarketing;
```

## Build

TypeScript compile (`npx tsc --noEmit`): **exit 0, clean** [VERIFIED].

## Controlled Tests (scratch DB copy, live DB untouched)

| # | Source | Strip before | Expected pos | Actual pos | Result |
|---|--------|-------------|-------------|-----------|--------|
| 1 | `profiler` | empty (0 photos) | 0 (library) | **0** | ✅ PASS |
| 2 | `sm` | empty (0 photos) | 1 (auto-fill) | **1** | ✅ PASS |
| 3 | `activity` | empty (0 photos) | 0 (library) | **0** | ✅ PASS |

Tests ran on `/tmp/scratch-policy-test.db` (copy of live DB). Scratch DB deleted after tests.

## No-Data-Changed Confirmation

- Live DB `XTEST%` rows: **0** [VERIFIED via `SELECT COUNT(*) FROM animal_media WHERE shelter_code LIKE 'XTEST%'`]
- R2024034 profiler photo: still at **strip_position=6** [VERIFIED via `SELECT shelter_code, source, strip_position FROM animal_media WHERE id='2bc326ee-...'` → `R2024034|profiler|6`]
- No existing data modified. The fix is code-only — no DB rows were inserted, updated, or deleted.

## Deviations

None.
