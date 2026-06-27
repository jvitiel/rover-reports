# Stale Draft Cleanup — Step 2 of 3 (Bio Pending Fix)

**Date:** 2026-06-27 20:15 UTC  
**Type:** Production data cleanup (guarded)  
**Rollback:** Restore from backup at `/home/shelter/backups/pre-stale-draft-cleanup-20260627-201523.db`

---

## STEP 0 — Backup

- **Command:** `sudo -u shelter /home/shelter/scripts/do-backup.sh /home/shelter/shelter-apps/data/shelter.db pre-stale-draft-cleanup`
- **Destination:** `/home/shelter/backups/pre-stale-draft-cleanup-20260627-201523.db`
- **Size:** 31,895,552 bytes (30.4 MB) — confirmed non-empty

## STEP 1 — Stale Set Confirmation (GATE)

Ran the verified stale-identifying SELECT from report-20260627-bio-approval-promote-gap.md.

**Result: exactly 3 rows — GATE PASSED.**

| shelter_code | source_long | source_short | promoted_long | promoted_short | bio last_source | bio approved_at_long | draft generated_at |
|---|---|---|---|---|---|---|---|
| S2025877 (Kirby) | from_profile | from_profile | 1 | 0 | manual_edit_short | 2026-06-21T03:03 | 2026-06-15T18:57 |
| S2026158 (Mambo) | from_sm | from_sm | 0 | 0 | manual_edit_short | 2026-06-27T15:21 | 2026-06-27T15:19 |
| R2025005 (Peanut Butter) | from_profile | from_profile | 0 | 0 | manual_edit_long | 2026-06-21T03:07 | 2026-06-15T18:58 |

All 3 are animals with approved non-generic bios where the draft predates the approval — confirmed stale.

## STEP 2 — Promote Stale Sides

**UPDATE promoted_long:** 2 rows changed (S2026158 and R2025005; S2025877 already had promoted_long=1)

**UPDATE promoted_short:** 3 rows changed (all 3)

Post-update state: all 3 rows at promoted_long=1, promoted_short=1 (fully promoted).

## STEP 3 — Delete Fully-Promoted Drafts

All 3 had both sides promoted → deleted per standard `promoteDraftSize` behavior.

**Deleted:** S2025877, S2026158, R2025005 (3 rows)

**Remaining:** none of the 3 (correct — fully promoted drafts are removed)

## STEP 4 — Read-Back Verification

### 4a. Stale SELECT re-run
**Result: 0 rows** ✅ — no stale drafts remain.

### 4b. Draft rows for the 3 animals
**Result: empty** ✅ — all 3 draft rows were deleted (fully promoted).

### 4c. Legitimately-pending drafts untouched
**Count of unpromoted real drafts: 24** ✅ — unchanged from pre-cleanup (diagnosis confirmed 24).

### 4d. Bios intact for the 3 animals

| shelter_code | status_long | status_short | last_source |
|---|---|---|---|
| R2025005 | approved | approved | manual_edit_long |
| S2025877 | approved | approved | manual_edit_short |
| S2026158 | approved | approved | manual_edit_short |

All bios intact ✅ — approved status and content unchanged.

---

## Summary

- 3 stale draft rows promoted and deleted
- 24 legitimately-pending drafts untouched
- 3 animals' public bios intact
- Backup available for rollback
- No git commit (data-only change)
