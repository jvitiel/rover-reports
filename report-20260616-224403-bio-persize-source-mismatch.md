# Bio Per-Size Source Mismatch Investigation

**Date:** 2026-06-16 22:44 UTC  
**Scope:** Read-only — no changes  
**Animal:** Charlie (R2023007)

---

## 1. CHARLIE'S CURRENT STATE [VERIFIED]

### animal_bios

| Field | Long | Short |
|-------|------|-------|
| status | approved | approved |
| source | from_profile | adult_generic |
| approved_at | 2026-06-15T23:12:37.241Z | 2026-06-15T18:57:05.209Z |
| last_source | promote_from_draft | promote_from_draft |
| text (first ~15 words) | "Meet Charlie, the adorable Hotot rabbit with striking white and black fur. At 3 years…" | "Meet Charlie, a male Hotot with a White and Black coat who is approximately 3 years old…" |

### animal_bio_drafts

| Field | Value |
|-------|-------|
| generated_at | 2026-06-16T17:39:03.177Z (today, AFTER the promotion) |
| source_long | from_profile |
| source_short | from_profile |
| promoted_long | 0 |
| promoted_short | 0 |

A fresh draft exists with BOTH sizes from_profile, neither promoted yet. This was generated today after a profile form submission. [VERIFIED]

### Caregiver profile data

Charlie has **2 behavior_notes records** — profile data exists. [VERIFIED]

---

## 2. CHRONOLOGICAL HISTORY [VERIFIED]

From `animal_bios_history`:

```
ID   source              generated_at         status_long  status_short  notes
---  ------------------  -------------------  -----------  ------------  ----------------------------------------------------------------
194  generic_adult       2026-06-15 18:57:05  approved     approved      (none)
253  promote_from_draft  2026-06-15 23:12:37  approved     approved      Promoted long from draft (generated_at=2026-06-15T23:12:11.927Z)
```

### Reconstructed timeline [VERIFIED]:

1. **2026-06-15 18:57:05** — Adult intake pass (age-crossing) runs. Charlie classified as `has_profile` (has behavior notes). The pass:
   - First: calls `saveAnimalBio()` with source `generic_adult` → writes **BOTH** sizes as approved adult_generic (DELETE+INSERT replaces entire row). `source_long=adult_generic, source_short=adult_generic`.
   - Then: calls `generateBioDraftForAnimal()` → generates a profile-seeded draft with **BOTH** sizes `from_profile` in `animal_bio_drafts`.

2. **2026-06-15 23:12:37** — Someone (user via dashboard) promotes **ONLY the long** size from the draft. `promoteDraftSize('R2023007', 'long', ...)`:
   - Uses `INSERT ... ON CONFLICT DO UPDATE SET` — updates ONLY `bio_en_long, bio_es_long, status_long, approved_at_long, source_long`.
   - Short size columns **untouched** — `source_short` stays `adult_generic`.
   - Result: `source_long=from_profile, source_short=adult_generic`.

3. **2026-06-16 17:39:03** — Profile form submitted again → `generateBioDraftForAnimal()` runs, creates a new draft (BOTH sizes from_profile, promoted flags reset to 0). The approved bios row is **not changed** by draft generation.

---

## 3. PIPELINE MECHANISM [VERIFIED]

### Why does per-size source divergence happen?

**Root cause: `promoteDraftSize()` is per-size by design.** It operates on one size at a time via separate `ON CONFLICT DO UPDATE SET` clauses that touch only that size's columns. The other size is left untouched. This is **intentional architecture** — the dashboard UI has separate "Promote Long" and "Promote Short" buttons. [VERIFIED at localDatabase.ts:1799-1870]

### Per-path analysis:

| Pipeline step | Writes both sizes? | Can create divergence? |
|---|---|---|
| `saveAnimalBio()` (generic passes) | **YES** — DELETE+INSERT, both sizes get same source | No — always symmetric |
| `generateBioDraftForAnimal()` | **YES** — writes both sizes to drafts table with same source | No — drafts are separate from approved bios |
| `promoteDraftSize(size='long')` | **NO** — updates ONLY long columns on animal_bios | **YES** — this is the divergence point |
| `promoteDraftSize(size='short')` | **NO** — updates ONLY short columns on animal_bios | **YES** — same mechanism |
| Adult intake pass (`has_profile` bucket) | Writes generic to both, then generates draft (both) — but draft isn't auto-promoted | **YES** — if only one size is promoted later |

### The critical sequence for `has_profile` animals [VERIFIED]:

```
saveAnimalBio(generic_adult)    → BOTH sizes: adult_generic, approved
generateBioDraftForAnimal()     → Draft: BOTH sizes from_profile, NOT approved
                                  (user must promote each size separately)
promoteDraftSize('long')        → Long becomes from_profile; short stays adult_generic
                                  ← DIVERGENCE OCCURS HERE
```

### Does generation skip already-approved sizes?

**No.** `generateBioDraftForAnimal()` always generates both sizes. `saveAnimalBioDraft()` always writes both sizes to the drafts table (with `ON CONFLICT DO UPDATE` that replaces all content). The drafts table is separate from the approved bios table — generating a draft does NOT touch approved bios. [VERIFIED at localDatabase.ts:1697-1730]

The issue isn't generation skipping a size — it's that **promotion is manual and per-size**, and someone promoted only the long.

---

## 4. SCOPE [VERIFIED]

### Mismatched source query

```sql
SELECT COUNT(*) FROM animal_bios
WHERE (source_long IN ('from_profile','from_sm') AND source_short IN ('youth_generic','adult_generic'))
   OR (source_short IN ('from_profile','from_sm') AND source_long IN ('youth_generic','adult_generic'))
```

**Result: 1** — only Charlie (R2023007). [VERIFIED]

### Full source distribution

| source_long | source_short | count |
|---|---|---|
| adult_generic | adult_generic | 69 |
| from_profile | from_profile | 52 |
| youth_generic | youth_generic | 49 |
| from_sm | from_sm | 5 |
| from_sm | (NULL) | 4 |
| from_profile | (NULL) | 3 |
| **from_profile** | **adult_generic** | **1** ← Charlie |

The 7 NULL-source_short rows are from older operations (sm_copy, backfill, manual_edit) predating the per-size source columns — a different issue. [VERIFIED]

---

## CONCLUSION

**(a) Charlie's history:** Adult intake pass on June 15 at 18:57 UTC wrote both sizes as `adult_generic` (approved). A profile-seeded draft was generated simultaneously. At 23:12 UTC, someone promoted ONLY the long draft → `source_long` became `from_profile` while `source_short` stayed `adult_generic`. A new draft exists today (June 16) with both sizes `from_profile`, but neither has been promoted yet. [VERIFIED]

**(b) Pipeline mechanism:** `promoteDraftSize()` is per-size by design — separate "Promote Long" / "Promote Short" buttons in the dashboard. The `ON CONFLICT DO UPDATE SET` clause touches only the target size's columns; the other size is untouched. This is the sole mechanism that creates source divergence. [VERIFIED]

**(c) Intended or gap?** This is **intended behavior** — per-size promotion is deliberate architecture. The dashboard shows each size's draft and approved bio separately, and a user may approve one while wanting to review or edit the other. However, there is arguably a **UX gap**: when both draft sizes are ready and the user promotes one, there's no prompt or nudge to also promote the other. The user may not realize the short is still showing a generic. [INFERRED]

**(d) Scope:** Charlie is the **only animal** with a profile/generic mismatch. This is not a systematic issue — it's a one-off from a partial promotion. [VERIFIED]

**(e) Resolution path (not implemented):** The pending draft for Charlie already has both sizes `from_profile`. Promoting the short size via the dashboard would resolve the mismatch. Alternatively, a UX enhancement could offer "Promote Both" when both sizes are unpromoted. [INFERRED]
