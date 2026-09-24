# Availability Backfill — Applied

**Date:** 2026-09-24  
**Type:** Data UPDATE (54 cells in a single transaction)

---

## Baseline (pre-update)

- Total volunteers: **540**
- Total `unparseable`-flagged cells: **85**
- Volunteers with ≥1 flagged cell: **27**

---

## Transaction Result

54 cells updated using the shipped `normalizeAvailabilityString` from `dist/availabilityParse.js`. Each cell was updated only if the normalizer returned a non-empty text with flag null or 'interpreted'. Evening/out-of-hours cells (empty text) and genuinely unparseable cells were skipped per instructions.

**Cells changed: 54** [VERIFIED] — produced by a single transaction calling the shipped normalizer on every unparseable-flagged cell, updating only those that recovered to non-empty parseable text.

### Breakdown of all 85 flagged cells:

| Action | Cells | Description |
|--------|-------|-------------|
| Changed (recovered-to-hours) | 37 | Flag cleared or set to 'interpreted', text replaced with time range |
| Changed (interpreted) | 17 | Mapped via expanded interpretation table, flag set to 'interpreted' |
| Skipped (evening/out-of-hours) | 15 | Normalizer returned empty text — raw text + 'unparseable' flag preserved |
| Skipped (genuinely unparseable) | 16 | Normalizer returned 'unparseable' — no change |
| **Total** | **85** | |

---

## Post-State Verification

| Metric | Value | Expected |
|--------|-------|----------|
| Total volunteers | **540** | unchanged ✓ |
| Cells changed | **54** | 54 ✓ |
| Remaining `unparseable`-flagged cells | **31** | 31 (16 genuinely unparseable + 15 evening/out-of-hours) ✓ |

### Spot Checks

| id  | day      | old text     | new text              | old flag     | new flag     | result |
|-----|----------|--------------|-----------------------|--------------|--------------|--------|
| 478 | monday   | `Before 11`  | `9:00 AM - 11:00 AM` | unparseable  | null (cleared) | ✓ recovered-to-hours |
| 536 | monday   | `Any`        | `9:00 AM - 5:00 PM`  | unparseable  | interpreted  | ✓ interpreted |
| 491 | monday   | `After 6pm`  | `After 6pm` (unchanged) | unparseable | unparseable  | ✓ evening kept |
| 487 | saturday | `Never`      | `Never` (unchanged)   | unparseable  | unparseable  | ✓ still-unparseable kept |

All 4 spot-checks pass.

---

## What Was NOT Changed

- No other form_data fields modified (personal, jobs, open_text, etc.)
- No other columns modified (status, submitted_at, etc.)
- No rows added or deleted
- Clean (non-flagged) availability days untouched
- Service not restarted
