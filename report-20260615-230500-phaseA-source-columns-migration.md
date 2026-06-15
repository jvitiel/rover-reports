# Phase A: per-size source columns — schema migration + backfill

**Date:** 2026-06-15 23:05 UTC  
**Commit:** `11eae61`  
**Backup:** `/home/shelter/backups/pre-source-columns.db` (WAL-safe `.backup`, integrity_check = ok, taken before migration)

---

## Columns added

All four columns confirmed via PRAGMA table_info: [VERIFIED]

| Table | Column | Position |
|-------|--------|----------|
| animal_bios | source_long | 12 |
| animal_bios | source_short | 13 |
| animal_bio_drafts | source_long | 10 |
| animal_bio_drafts | source_short | 11 |

Existing `last_source` column left untouched on both tables. [VERIFIED]

---

## Backfill results — animal_bios

### source_long (183 rows total)

| source_long | count |
|-------------|-------|
| adult_generic | 70 |
| from_profile | 55 |
| from_sm | 9 |
| youth_generic | 49 |
| **Total** | **183** |

All 183 rows have long content; all 183 got a source_long value. 0 NULL. [VERIFIED]

### source_short (183 rows total)

| source_short | count |
|--------------|-------|
| adult_generic | 70 |
| from_profile | 52 |
| from_sm | 5 |
| youth_generic | 49 |
| NULL | 7 |
| **Total** | **183** |

The 7 NULLs are rows with **empty short bio content** (`bio_en_short = ''`). These are correct — no content, no badge. [VERIFIED]

Breakdown of the 7 NULL source_short rows:
- 3× `sm_copy` (retired "Use as Starting Point" — only copied to long, never to short)
- 3× `backfill` (legacy import — only had long content)
- 1× `manual_edit_long` (staff edited long only, short was never generated)

All confirmed: `length(bio_en_short) = 0` for every NULL. [VERIFIED]

---

## Backfill results — animal_bio_drafts

### source_long (18 rows)

| source_long | count |
|-------------|-------|
| from_profile | 18 |

### source_short (18 rows)

| source_short | count |
|--------------|-------|
| from_profile | 18 |

All 18 draft rows have full content (both sizes) and all got `from_profile`. [VERIFIED]

---

## Cross-check: content-bearing bios with NULL source

| Check | Count |
|-------|-------|
| animal_bios: bio_en_long != '' AND source_long IS NULL | **0** ✓ |
| animal_bios: bio_en_short != '' AND source_short IS NULL | **0** ✓ |
| animal_bio_drafts: bio_en_long != '' AND source_long IS NULL | **0** ✓ |
| animal_bio_drafts: bio_en_short != '' AND source_short IS NULL | **0** ✓ |

Every content-bearing size got a source value. [VERIFIED]

---

## Spot-check: 5 representative rows

| shelter_code | last_source | source_long | source_short | has_long | has_short | Notes |
|---|---|---|---|---|---|---|
| S2026346 | generic | youth_generic | youth_generic | yes | yes | Youth generic — direct map ✓ |
| S2026358 | generic_adult | adult_generic | adult_generic | yes | yes | Adult generic — direct map ✓ |
| S2023297 | sm_generate | from_sm | from_sm | yes | yes | SM-seeded AI — direct map ✓ |
| A2026061 | regenerate_long | from_profile | from_profile | yes | yes | Regenerated — inferred from behavior_notes ✓ |
| S2024694 | manual_edit_long | from_sm | (NULL) | yes | no | Manual edit — inferred from history sm_copy; no short content → NULL ✓ |

[VERIFIED — each row's mapping matches the expected logic]

---

## Inference detail (7 action-overwritten rows)

These rows had `last_source` in `('manual_edit_long','regenerate_long','regenerate_short')` — the original seed type was overwritten.

| shelter_code | last_source | behavior_notes | history origin | inferred source |
|---|---|---|---|---|
| A2026061 | regenerate_long | 1 record | — | from_profile ✓ |
| S2026028 | regenerate_long | 1 record | — | from_profile ✓ |
| R2025054 | regenerate_short | 2 records | — | from_profile ✓ |
| A2026067 | regenerate_long | 1 record | — | from_profile ✓ |
| S2025546 | manual_edit_long | 1 record | — | from_profile ✓ |
| S2024694 | manual_edit_long | 0 records | sm_copy | from_sm ✓ |
| S20251236 | regenerate_short | 0 records | sm_copy | from_sm ✓ |

Logic: behavior_notes present → from_profile; else check animal_bios_history for sm_copy/sm_generate → from_sm. [VERIFIED]

---

## Infrastructure

- **Build:** tsc exit 0, clean [VERIFIED]
- **Service:** active (running) since 23:04:06 UTC [VERIFIED]
- **Commit:** `11eae61` — `schema: add per-size source_long/source_short to animal_bios + animal_bio_drafts; idempotent backfill from last_source (Auditor-approved SOP-3 migration)` [VERIFIED]
- **git diff --stat:** only `server/src/localDatabase.ts` — 79 insertions [VERIFIED]

---

## Idempotency

- **ALTERs:** wrapped in `try { } catch {}` — re-running after column exists is a no-op (error swallowed). [VERIFIED]
- **Backfill:** all UPDATE statements guarded with `WHERE source_long IS NULL` / `WHERE source_short IS NULL` — re-running writes nothing on second startup. [VERIFIED]
- **Inference loop:** query only selects rows where `source_long IS NULL OR source_short IS NULL` — on second run, returns 0 rows (all already filled). [VERIFIED]

---

## No deviations

All 4 columns added. All content-bearing rows backfilled. Zero content rows left NULL as specified. Cross-checks all 0. Service healthy. No other files touched.
