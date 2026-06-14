# bioState Label — Verification Report

**Date:** 2026-06-14 14:17 ET  
**Type:** Read-only verification of commit `0bb36d1`  
**Status:** No changes made  

---

## A) YOUTH BIRTHDATES

### A1. All 46 youth animals with raw dateOfBirth and computed age

All 46 are cats. All are genuinely ≤84 fractional days as of 2026-06-14 18:04 UTC (when computeBioState runs server-side). [VERIFIED]

| shelterCode | name | dateOfBirth | ageDays |
|-------------|------|-------------|---------|
| B2026006 | Peekaboo | 2026-04-01 | 74 |
| S2026346 | Basil | 2026-03-25 | 81 |
| S2026347 | Chives | 2026-03-25 | 81 |
| S2026348 | Dill | 2026-03-25 | 81 |
| S2026349 | Parsley | 2026-03-25 | 81 |
| S2026350 | Rosemary | 2026-03-25 | 81 |
| S2026363 | Jo March | 2026-03-28 | 78 |
| S2026365 | Meg March | 2026-03-28 | 78 |
| S2026393 | Cinder | 2026-04-02 | 73 |
| S2026394 | Flame | 2026-04-02 | 73 |
| S2026404 | Thing 1 | 2026-03-28 | 78 |
| S2026405 | Thing 2 | 2026-03-28 | 78 |
| S2026413 | Catherine | 2026-04-02 | 73 |
| S2026414 | Heathcliff | 2026-04-02 | 73 |
| S2026432 | Moonbeam | 2026-04-09 | 66 |
| S2026433 | Stardust | 2026-04-09 | 66 |
| S2026434 | Starlight | 2026-04-09 | 66 |
| S2026445 | Regina George | 2026-04-17 | 58 |
| S2026448 | Gretchen Wieners | 2026-04-17 | 58 |
| S2026468 | Meadow | 2026-04-08 | 67 |
| S2026471 | Sprout | 2026-04-08 | 67 |
| S2026472 | Sunny | 2026-04-08 | 67 |
| S2026476 | Flora | 2026-04-11 | 64 |
| S2026477 | Petal | 2026-04-11 | 64 |
| S2026478 | Drizzle | 2026-03-28 | 78 |
| S2026479 | Puddle | 2026-03-28 | 78 |
| S2026483 | Dale Jr. | 2026-03-29 | 77 |
| S2026484 | Danica | 2026-03-29 | 77 |
| S2026485 | Kyle | 2026-03-29 | 77 |
| S2026486 | Kurt | 2026-03-29 | 77 |
| S2026494 | Twister | 2026-04-17 | 58 |
| S2026499 | Richard P. | 2026-04-01 | 74 |
| S2026500 | Sam K. | 2026-04-01 | 74 |
| S2026501 | Honey Mustard | 2026-04-15 | 60 |
| S2026502 | Chipotle Mayo | 2026-04-15 | 60 |
| S2026503 | Ketchup | 2026-04-15 | 60 |
| S2026507 | Andromeda | 2026-04-16 | 59 |
| S2026508 | Dorado | 2026-04-16 | 59 |
| S2026514 | Cardinal | 2026-03-26 | 80 |
| S2026515 | Goldfinch | 2026-03-26 | 80 |
| S2026516 | Meadowlark | 2026-04-09 | 66 |
| S2026517 | Wren | 2026-04-09 | 66 |
| S2026526 | Paprika | 2026-04-17 | 58 |
| S2026539 | Clint Eastwood | 2026-04-19 | 56 |
| S2026540 | Marilyn Monroe | 2026-04-19 | 56 |
| S2026541 | Grace Kelly | 2026-04-19 | 56 |

### A2. Old-generic-bios endpoint

Old generic bios count: **0**. Overlap with 46 youth: **0**. The old-generic-bios endpoint flags generic bios OVER 84 days — zero results confirms the two age paths (computeBioState and old-generic-bios) agree that all 46 youth are genuinely young. [VERIFIED]

### A3. Earlier "youth = 0" explanation

The earlier report (report-20260614-110710) claimed "Youth = 0 because no adoptable animal currently has dateOfBirth ≤ 84 days ago." This was **incorrect** — the earlier diagnostic query had a bug or used a different age source. The 46 kittens have valid DOBs in the 56-81 day range.

Root cause of the discrepancy: the earlier estimate treated ALL non-approved animals with ANY bio row (including generic bios) as "pending." This lumped the 46 kittens with generic bios into the "pending" bucket and suppressed them from reaching the youth check. The earlier estimate counted 89 pending = 41 with real staff content + 48 with generic-bio-only. Since youth (rule 3) only triggers if pending (rule 2) doesn't match, the kittens were hidden.

`computeBioState` fixes this: generic bios don't count as staff content, so the 46 kittens fall through pending → youth (≤84 days).

---

## B) LABEL SPOT-CHECKS

### B4. Blizzard (S20251236)

| Field | Value |
|-------|-------|
| bioState | **pending** ✓ |
| bioStatus | sm |
| lastSource | manual_edit_long |
| statusLong | draft |
| statusShort | draft |
| hasCaregiverData | false |
| records | 0 |
| SM description | "Not meant to be a household pet, but would be a great barn cat." |
| ageDays | 721 |

**Trace:** Rule 1 fails (status not approved). Rule 2 matches: SM description passes sentinel filter (not empty, not a sentinel). → **pending**. ✓

### B5. One of each label

**APPROVED — Abe (Louie) (S2025966)**

| Field | Value |
|-------|-------|
| lastSource | backfill |
| statusLong / statusShort | approved / approved |
| caregiver records | 3 |
| SM description | '' (empty) |
| sentinel-aware SM content | false |
| ageDays | 3507 |
| bioState | **approved** |

Trace: Rule 1 matches — non-generic bio (`backfill`) + approved status. → **approved** ✓

**PENDING — Abstract (S2026133)**

| Field | Value |
|-------|-------|
| lastSource | full_generate |
| statusLong / statusShort | draft / draft |
| caregiver records | 1 |
| SM description | "Hi, I'm Abstract, a senior dog with a heart full of love..." |
| sentinel-aware SM content | true |
| ageDays | 3031 |
| bioState | **pending** |

Trace: Rule 1 fails (status draft). Rule 2 matches — has caregiver records. → **pending** ✓

**YOUTH — Andromeda (S2026507)**

| Field | Value |
|-------|-------|
| lastSource | generic |
| statusLong / statusShort | approved / approved |
| caregiver records | 0 |
| SM description | '' (empty) |
| sentinel-aware SM content | false |
| ageDays | 59 |
| bioState | **youth** |

Trace: Rule 1 fails — `lastSource === 'generic'` (generic bio can't be approved). Rule 2 fails — no staff content. Rule 3 matches — 59 ≤ 84 days. → **youth** ✓

**NEEDED — Andrew (S2026495)**

| Field | Value |
|-------|-------|
| bio | null (no bio row at all) |
| caregiver records | 0 |
| SM description | '' (empty) |
| sentinel-aware SM content | false |
| ageDays | 749 |
| bioState | **needed** |

Trace: Rule 1 fails (no bio). Rule 2 fails (no content). Rule 3 fails (749 > 84). Rule 4 → **needed** ✓

---

## C) THE PENDING SHIFT (89 → 41)

### C6. Precise accounting

The earlier estimate of 89 "pending" counted: **any non-approved animal that had a bio row OR staff content.** This included 48 animals whose ONLY "content" was a generic bio. `computeBioState` correctly treats generic bios as NOT real content.

| Bucket | Count | Where they went |
|--------|-------|-----------------|
| Real staff content (caregiver or SM comment) | 41 | Stayed **pending** (41) |
| Generic-bio-only, age ≤84 days | 46 | Moved to **youth** (46) |
| Generic-bio-only, age >84 days | 2 | Moved to **needed** (2) |
| **TOTAL** | **89** | **41 + 46 + 2 = 89** ✓ |

The 2 generic-only animals that aged into 'needed':

| shelterCode | name | ageDays | dateOfBirth | Note |
|-------------|------|---------|-------------|------|
| S2026358 | Orchid | 84.76 (fractional) | 2026-03-22 | Just crossed 84-day line |
| S2026356 | Peony | 84.76 (fractional) | 2026-03-22 | Just crossed 84-day line |

These are boundary cases — both DOB 2026-03-22, which at the time of computation (18:04 UTC) yields 84.76 fractional days > 84. The JS `computeBioState` uses fractional days (`(Date.now() - dobMs) / (1000*60*60*24)`), so 84.76 > 84 → not youth → needed. This is correct behavior; they'll need real bios.

### Sentinel filter impact

**Zero animals** have sentinel-only SM descriptions ('Unknown', 'Not specified', 'N/A', 'None specified') in the current adoptable population. [VERIFIED — exhaustive check] The sentinel filter is a forward-looking safety net that prevents future junk values from being classified as real content. It did not cause any current pending→needed shift.

### Summary of shift

The entire 48-animal shift from old-pending is explained by **generic bio reclassification**, not sentinel filtering:

- Old model: generic bio = "has a bio" = pending ❌
- New model: generic bio ≠ real content → falls through to youth/needed ✓

---

## Data Integrity Confirmations

| Check | Result |
|-------|--------|
| Generic bios labeled 'approved' | 0 ✓ |
| Missing/unparseable dateOfBirth | 0 of 152 ✓ |
| All youth verified ≤84 fractional days | 46/46 ✓ |
| Both endpoints return identical distribution | ✓ |
| bioStatus field unchanged | approved=77, none=52, sm=23 ✓ |
| Sentinel-filtered animals | 0 (no sentinel-only SM descriptions exist) |

---

*Report generated by Rover. Read-only verification — no changes made.*
