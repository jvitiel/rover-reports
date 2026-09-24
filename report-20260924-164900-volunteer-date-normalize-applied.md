# Volunteer submitted_at ISO Normalization — Applied

**Date:** 2026-09-24  
**Type:** Data UPDATE (17 rows, single transaction)

---

## Baseline (pre-update)

- `SELECT COUNT(*) FROM volunteers;` → **540**
- `SELECT COUNT(*) FROM volunteers WHERE submitted_at NOT LIKE '____-__-__%';` → **17**

---

## Transaction Result

17 guarded UPDATEs executed in a single transaction. Each UPDATE was conditioned on `id = ? AND submitted_at = '<old value>'` to prevent unintended changes.

**Rows changed: 17** [VERIFIED] — confirmed by post-state SELECT showing all 17 ids now hold ISO values and non-ISO count dropped from 17 to 0.

All 17 updated rows:

| id  | old value     | new value    |
|-----|---------------|--------------|
| 428 | `5/31/26`     | `2026-05-31` |
| 429 | `5/31/26`     | `2026-05-31` |
| 430 | `5/31/26`     | `2026-05-31` |
| 435 | `5/31/2026`   | `2026-05-31` |
| 436 | `5/30/26`     | `2026-05-30` |
| 437 | `05/30/26`    | `2026-05-30` |
| 438 | `4.27.26`     | `2026-04-27` |
| 439 | `5/28/26`     | `2026-05-28` |
| 441 | `5/24/26`     | `2026-05-24` |
| 442 | `05/31/2026`  | `2026-05-31` |
| 443 | `06/13/26`    | `2026-06-13` |
| 444 | `06/13/2026`  | `2026-06-13` |
| 445 | `05/11/26`    | `2026-05-11` |
| 446 | `6/1/26`      | `2026-06-01` |
| 447 | `6/8/26`      | `2026-06-08` |
| 448 | `5/26/26`     | `2026-05-26` |
| 449 | `5/31/26`     | `2026-05-31` |

---

## Post-State Verification

- `SELECT COUNT(*) FROM volunteers;` → **540** (unchanged from baseline ✓)
- `SELECT COUNT(*) FROM volunteers WHERE submitted_at NOT LIKE '____-__-__%';` → **0** ✓

### Spot-check (3 rows)

| id  | submitted_at |
|-----|--------------|
| 438 | `2026-04-27` ✓ (was `4.27.26`, dot-separated) |
| 444 | `2026-06-13` ✓ (was `06/13/2026`, 4-digit year) |
| 446 | `2026-06-01` ✓ (was `6/1/26`, single-digit day) |

---

## Not touched

- Row id 310 (`1900-01-03`, bulk_import_2026 placeholder) — already ISO, excluded per instructions.
- No schema changes, no sort code changes, no other columns modified.
