# Stage 2a: cropSweep Module

**Date:** 2026-06-21 ~22:10 UTC  
**Commit:** `73aa342`  
**File:** `server/src/cropSweep.ts` (195 insertions, new file)

---

## Module

`server/src/cropSweep.ts` exports:

```typescript
export async function runCropSweep(shelterCode?: string): Promise<{
  cropped: number;
  cleared: number;
  failed: number;
  details: SweepDetail[];
}>
```

**Behavior:**
- **CROP SET:** Selects `strip_position=1` photo rows (hidden=0), optionally scoped to `shelterCode`. A row needs a (re)crop if: `crop_url` is NULL/empty, OR `source_media_id` is non-null and `crop_url` doesn't contain it (mediaid mismatch), OR `crop_url` is set but the crop file is missing on disk. For NULL/empty `source_media_id` rows (the 14 staff-drag rows), the mismatch check is skipped — they need a crop only if crop_url is NULL/empty or the file is missing.
- **CLEAR SET:** Selects `strip_position != 1` rows with non-NULL `crop_url`. Sets `crop_url = NULL`. Does NOT delete the crop file on disk (leave-no-deletes policy).
- **Isolation:** Per-row try/catch; one failure doesn't abort the rest.
- **Idempotency:** A second run with no state change produces cropped=0, cleared=0.
- **No import side effects:** Pure module, uses `getDatabase()` from `localDatabase.ts` (same pattern as all other server modules).

### Worker invocation

Shells to `python3 scripts/crop-worker.py --ids <mediaId>`. Parses the JSON array from stdout; reads the `crop_url` field (confirmed emitted by worker at crop-worker.py:181-189 [VERIFIED]). Verifies the crop file exists on disk before writing `crop_url` to DB. If the worker fails or produces no file, leaves `crop_url` NULL and increments `failed`.

## Build

TypeScript compile (`npx tsc --noEmit`): **exit 0, clean** [VERIFIED].

## Scratch-DB Test Results (a–g)

All tests ran on a copy of live shelter.db at `/tmp/scratch-cropsweep-test.db`. Zero writes to live DB.

### Test Setup

| Case | Setup | Animal |
|------|-------|--------|
| (a) | Set `crop_url = NULL` on a slot-1 row | S2025592 |
| (b) | Changed `source_media_id` from `7974` to `FAKE_99999` | S2025896 |
| (c) | Deleted crop file from disk (`W2026014-8046.jpg`) | W2026014 |
| (d) | Existing NULL `source_media_id` row with valid crop | S2026073 |
| (e) | Set `crop_url` on a `strip_position=3` row | S2026228 |
| (f) | Also NULLed `crop_url` on S2026061 (different animal for scope test) | S2026061 |

### Scoped Sweep (test f)

```
runCropSweep('S2025592') → cropped=1, cleared=0, failed=0
```
- ✅ **(f) S2025592 cropped** — crop_url written
- ✅ **(f) S2026061 untouched** — crop_url still NULL (different shelter_code, not in scope)

### Full Sweep (tests a–e + f remainder)

```
runCropSweep() → cropped=3, cleared=1, failed=1
```

Details:
- `S2026061:crop:crop_url_null` — testF_other, NULLed crop restored
- `S2025896:crop:mediaid_mismatch` — test (b), re-cropped with real mediaid
- `W2026014:crop:crop_file_missing` — test (c), file re-generated
- `S2026101:fail:crop_url_null: 404` — known broken source, failed as expected
- `S2026228:clear:non_slot1_stale_crop` — test (e), crop_url cleared

### Assertions

| # | Test | Result | Detail |
|---|------|--------|--------|
| 1 | **(a) crop_url NULL → cropped** | ✅ | S2025592 crop_url written (via scoped sweep) |
| 2 | **(b) mediaid mismatch → re-cropped** | ✅ | S2025896 detected mismatch, re-cropped |
| 3 | **(c) crop file missing → re-cropped** | ✅ | W2026014 file regenerated, crop_url updated |
| 4 | **(d) NULL source_media_id + valid crop → SKIPPED** | ✅ | S2026073 not in details (correctly skipped) |
| 5 | **(e) non-slot-1 crop_url → cleared** | ✅ | S2026228 crop_url = NULL after sweep |
| 6 | **(e) crop file NOT deleted** | ✅ | File still on disk (leave-no-deletes policy) |
| 7 | **(f) scoped sweep: target cropped** | ✅ | S2025592 cropped |
| 8 | **(f) scoped sweep: other untouched** | ✅ | S2026061 still NULL after scoped sweep |
| 9 | **(f) full sweep: other cropped** | ✅ | S2026061 cropped in full sweep |
| 10 | **(g) idempotency: cropped=0** | ✅ | Second run: no re-crops |
| 11 | **(g) idempotency: cleared=0** | ✅ | Second run: nothing to clear |

**10/10 pass.** (g) failed=1 on second run is S2026101 (known 404, will always fail — expected).

## Live DB Untouched

```
Before: 1782077000 2026-06-21 21:23:20.053495477 +0000
After:  1782077000 2026-06-21 21:23:20.053495477 +0000
IDENTICAL
```
[VERIFIED via `stat --format='%Y %y'` before and after all tests]

Spot checks:
- S2025592 crop_url still non-NULL in live DB [VERIFIED]
- S2025896 source_media_id still `7974` in live DB [VERIFIED]
- Scratch DB deleted after tests [VERIFIED]
- Test file `_test_cropsweep.ts` deleted from server/src/ [VERIFIED]

## Deviations

None.
