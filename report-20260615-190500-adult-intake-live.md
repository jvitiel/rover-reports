# Adult-intake bio pass — LIVE bulk run

**Date:** 2026-06-15 19:00 UTC  
**Scope:** One-time bulk execution of `POST /api/dashboard/adult-intake/run` with `dryRun=false`  
**Backup:** `shelter.db.pre-adult-intake.20260615-185251` (placed by John, pre-verified)

---

## Step 0 — Pre-state confirmed

| Table | Count |
|-------|-------|
| animal_bios | 115 |
| animal_bio_drafts | 0 |

## Step 1 — Live run

Endpoint returned `success: true, dryRun: false`.

| Metric | Value |
|--------|-------|
| Total candidates | **68** |
| has_profile | **18** → action `generic_and_draft` |
| no_profile | **50** → action `generic_only` |
| GPT draft failures | **0** |

All 68 animals received an approved adult generic bio. All 18 with profiles also received a profile-seeded AI draft.

### Per-animal results

| Code | Name | Bucket | Action | bioId | draftId |
|------|------|--------|--------|-------|---------|
| R2026007 | Anastasia | has_profile | generic_and_draft | 872895ef | cca040c7 |
| S2026495 | Andrew | no_profile | generic_only | 40db359f | — |
| S2026154 | Anna | has_profile | generic_and_draft | 1f32308a | caed04f5 |
| S2024718 | Bailey | has_profile | generic_and_draft | 8a3af804 | 23ab8c0d |
| S2026267 | Baki | no_profile | generic_only | 4770c64d | — |
| R2023065 | Butterscotch | has_profile | generic_and_draft | 90ab7ca1 | 1dc847e9 |
| R2026003 | Callie Rabbit | no_profile | generic_only | 234f567e | — |
| R2025003 | Caramel | has_profile | generic_and_draft | e51c5d4b | 2207406d |
| S2026528 | Catzilla | no_profile | generic_only | 033c83cc | — |
| R2023007 | Charlie | has_profile | generic_and_draft | 0d926cc0 | 2798addd |
| S2025503 | Cheshire | no_profile | generic_only | d07aca31 | — |
| S2026190 | Clover | no_profile | generic_only | 6699131b | — |
| R2025039 | Cookies and Cream | no_profile | generic_only | c58a37f8 | — |
| A2025167 | Dodger | no_profile | generic_only | 2d06c199 | — |
| A2025233 | Duke | no_profile | generic_only | b77ef416 | — |
| S2026446 | Eggo | no_profile | generic_only | e261c3d2 | — |
| S2026155 | Elsa | has_profile | generic_and_draft | 872ccad6 | ae76f1a8 |
| S2026391 | Ember | no_profile | generic_only | cc992974 | — |
| S2026403 | Fluffy | no_profile | generic_only | 02c5b6ef | — |
| S2026081 | Gigi | no_profile | generic_only | 8628230c | — |
| S2026496 | Gilda | no_profile | generic_only | 885ea62d | — |
| S2023445 | Grumpy McGee | no_profile | generic_only | 7a40a976 | — |
| W2026048 | Hershey | no_profile | generic_only | 963c43ca | — |
| A2023278 | Honey | no_profile | generic_only | efe672ee | — |
| S2026545 | Honeysuckle | no_profile | generic_only | 7e78d627 | — |
| S2025310 | Jax | no_profile | generic_only | ccfdd72f | — |
| A2025138 | Juno | no_profile | generic_only | 99760158 | — |
| S2025877 | Kirby | has_profile | generic_and_draft | 874be77c | 78d6ebb8 |
| S2025708 | Kobe | no_profile | generic_only | 72417561 | — |
| S2025206 | Lacey | no_profile | generic_only | 703e4e95 | — |
| A2024048 | Leo (Petey) | no_profile | generic_only | 19dfd67f | — |
| S2026357 | Lilac | has_profile | generic_and_draft | 67c0e838 | 82b48982 |
| S20251200 | Luna | no_profile | generic_only | 744462e1 | — |
| S2026519 | Luna Tuna | no_profile | generic_only | 20fcdffd | — |
| A2024047 | Lupa | no_profile | generic_only | bbdda9bc | — |
| S2026158 | Mambo | no_profile | generic_only | 6a800b40 | — |
| R2025037 | Maria | has_profile | generic_and_draft | 98c0bef4 | 1fac8e5e |
| S2026345 | Maya | no_profile | generic_only | f150d3a8 | — |
| S2026560 | Mikey | has_profile | generic_and_draft | 048954cf | 439135ab |
| A2026036 | Milo | no_profile | generic_only | d2f29249 | — |
| S2026606 | Mimi | no_profile | generic_only | 1cf46b53 | — |
| S2026527 | Mothra | no_profile | generic_only | 6823bacc | — |
| S2026132 | Muppett | no_profile | generic_only | 645757d7 | — |
| A2024053 | Nanook | no_profile | generic_only | d922e7d9 | — |
| S2026079 | Nena | has_profile | generic_and_draft | 53056737 | cd85bbda |
| W2026046 | Nestle | no_profile | generic_only | 771a7f06 | — |
| S2026045 | Nova | no_profile | generic_only | f979d8ab | — |
| W2026057 | Opal | no_profile | generic_only | 77770456 | — |
| S2026031 | Oreo | has_profile | generic_and_draft | 94ca4e3a | bae094e6 |
| S2026126 | Osuna | no_profile | generic_only | 220c257d | — |
| S2026043 | Parker | no_profile | generic_only | e04d4f7e | — |
| R2025005 | Peanut Butter | has_profile | generic_and_draft | 0deeb658 | 5a220e29 |
| S2025883 | Reeboks | has_profile | generic_and_draft | b509fa96 | 74cf51d7 |
| S2026513 | Robin | no_profile | generic_only | 95a8047a | — |
| S2026529 | Rodan | no_profile | generic_only | 35fdecac | — |
| A2025018 | Ryder | no_profile | generic_only | ce5ce8d0 | — |
| S2025131 | Scottie | has_profile | generic_and_draft | cb945513 | 110d7f15 |
| S2026415 | Shep | no_profile | generic_only | 8a725511 | — |
| S2026314 | Sky | no_profile | generic_only | 51a1b376 | — |
| A2023287 | Snowie | has_profile | generic_and_draft | e71f7753 | a1c31b6d |
| A2026092 | Snowy | no_profile | generic_only | 820be7aa | — |
| A2023030 | Spooky | no_profile | generic_only | fc41e9e2 | — |
| S2025639 | Spooky (Chi Mix) | no_profile | generic_only | b60d3c6a | — |
| S2026353 | Squeaky | no_profile | generic_only | 12ac32f1 | — |
| G2026002 | Tater Tot | has_profile | generic_and_draft | ae1dd979 | bc711cc1 |
| A2026025 | Tex | no_profile | generic_only | 9ba8a3a4 | — |
| W2026045 | Tostito | no_profile | generic_only | 47a7a5f5 | — |
| W2026058 | Willow | no_profile | generic_only | a1cc9958 | — |

## Step 2 — Verify-after

### (a) animal_bios row count

**183** (was 115, +68). ✅

### (b) New rows source/status check

70 rows with `last_source='generic_adult'` (68 new + 2 pre-existing: Orchid S2026441, Peony S2026443 from Track C).

Zero rows where `last_source='generic_adult'` AND (`status_long != 'approved'` OR `status_short != 'approved'`). **All approved.** ✅

### (c) animal_bio_drafts row count

**18** (was 0, +18 — all has_profile animals got a draft). ✅

### (d) Public spot-checks

**Dodger (A2025167) — Dog:**
```
EN Long: Meet Dodger! Dodger is a male Husky/Mixed Breed, approximately 1 year old, with a Grey and White coa...
ES Short: ¡Conoce a Dodger, Husky/Mixed Breed (macho) con pelaje gris y blanco, de aproximadamente 1 año! Dodg...
status_long: approved, status_short: approved
```
Adult generic text served. ✅

**Andrew (S2026495) — Cat:**
```
EN Long: Meet Andrew! Andrew is a male Domestic Short Hair, approximately 2 years old, with a Black coat and ...
ES Short: ¡Conoce a Andrew, Domestic Short Hair (macho) con pelaje negro, de aproximadamente 2 años! Andrew es...
status_long: approved, status_short: approved
```
Adult generic text served. ✅

**Anastasia (R2026007) — Rabbit:**
```
EN Long: Meet Anastasia! Anastasia is a female Lop Eared, approximately 1 year old, with a White coat and a m...
ES Short: ¡Conoce a Anastasia, Lop Eared (hembra) con pelaje blanco, de aproximadamente 1 año! Anastasia está ...
status_long: approved, status_short: approved
```
Adult generic text served. ✅

### (e) Idempotency

Rerun with `dryRun=true`: **0 candidates** (0 has_profile, 0 no_profile). ✅

### (f) GPT failures

**None.** All 18 has_profile animals received both a generic bio and an AI draft. ✅

---

## Summary

| Before | After |
|--------|-------|
| animal_bios: 115 | animal_bios: **183** (+68) |
| animal_bio_drafts: 0 | animal_bio_drafts: **18** |
| generic_adult rows: 2 | generic_adult rows: **70** (+68) |

68 adult-at-intake animals now have approved public bios. 18 of those also have pending AI drafts ready for staff review on the dashboard.
