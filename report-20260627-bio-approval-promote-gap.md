# Bio Approval Paths vs Draft Promote Gap

**Date:** 2026-06-27 19:50 UTC  
**Type:** Read-only diagnosis  
**Status:** Root cause mapped; two distinct bugs identified

---

## 1. All Bio Approval Paths

There are **6 code paths** that result in an approved bio in `animal_bios`. Three are currently active code paths; two are historical; one is the reference-correct path.

### Path A: `promote_from_draft` (reference-correct)
- **Handler:** `POST /api/bio/draft/:shelterCode/promote/:size` — server.ts:2491
- **DB function:** `promoteDraftSize()` — localDatabase.ts:1942
- **Writes bio:** INSERT ON CONFLICT upsert into `animal_bios`, sets `status_{size} = 'approved'`, `last_source = 'promote_from_draft'`
- **Flips draft:** ✅ YES — `UPDATE animal_bio_drafts SET promoted_{size} = 1 WHERE shelter_code = ?` (localDatabase.ts:2015–2019). If both sides promoted, deletes the draft row entirely (localDatabase.ts:2022–2024).

### Path B: `manual_edit_long` / `manual_edit_short` + separate approve
- **Edit handler:** `PUT /api/bio/:bioId/long` (server.ts:2322) / `PUT /api/bio/:bioId/short` (server.ts:2348)
- **Edit DB function:** `updateAnimalBioLong()` (localDatabase.ts:1619) / `updateAnimalBioShort()` (localDatabase.ts:1636)
- **Edit writes:** `UPDATE animal_bios SET status_{size} = 'draft', approved_at_{size} = NULL, last_source = 'manual_edit_{size}'`
- **Approve handler:** `POST /api/bio/:bioId/approve/long` (server.ts:2426) / `POST /api/bio/:bioId/approve/short` (server.ts:2459)
- **Approve DB function:** `approveAnimalBioLong()` (localDatabase.ts:1677) / `approveAnimalBioShort()` (localDatabase.ts:1695)
- **Approve writes:** `UPDATE animal_bios SET status_{size} = 'approved', approved_at_{size} = ?`
- **Flips draft:** ❌ NO — neither the edit nor the approve step touches `animal_bio_drafts`

### Path C: `generic` (youth generic bio job)
- **Handler:** `runGenericBioJob()` daily cron (server.ts:13062) and `POST /api/dashboard/generic-bio/publish` (server.ts:13199)
- **DB function:** `saveAnimalBio()` (localDatabase.ts:1560) — deletes existing bio, inserts new with `statusLong = 'approved', statusShort = 'approved'`
- **Flips draft:** ❌ NO — does not touch `animal_bio_drafts`
- **Note:** Generic bios are excluded from `hasApprovedRealBio` by `isGenericSource()` so they don't normally mask the pending status. However, an existing draft IS left behind.

### Path D: `generic_adult` (adult generic bio)
- **Handler:** adult intake in `runGenericBioJob()` Pass 3 (server.ts:13390) and adult upgrade in `runAdultGenericUpgrades()` (server.ts:13530)
- **DB function:** `saveAnimalBio()` — same as Path C, `statusLong = 'approved', statusShort = 'approved'`, `source = 'generic_adult'`
- **Flips draft:** ❌ NO — does not touch `animal_bio_drafts`
- **Note:** Same as Path C — generic source, so won't mask pending. But also doesn't clean up existing drafts. Notably, Pass 3 sometimes GENERATES a new draft immediately after writing the generic bio (server.ts:13553), creating the exact stale-draft pattern.

### Path E: `backfill` (historical — Phase 13c migration)
- **Origin:** One-time migration script (history notes: "Backfilled from existing animal_bios on Phase 13c migration")
- **DB function:** Likely direct SQL or `saveAnimalBio()` call in a migration script (no longer in active codebase)
- **Flips draft:** ❌ NO — predates draft system or didn't account for it
- **Note:** 26 bios carry this source. No longer a recurrence vector.

### Path F: `full_generate` (AI bio generation)
- **Handler:** `POST /api/bio/generate/:animalId` calls `generateBioDraftForAnimal()` (server.ts:2115)
- **Writes:** Calls `saveAnimalBioDraft()` — writes to `animal_bio_drafts`, NOT directly to `animal_bios`
- **Approval:** Requires subsequent promote-from-draft to reach `animal_bios`
- **Flips draft:** N/A — this path creates drafts, doesn't approve bios. However, some bios have `last_source = 'full_generate'` (20 rows), suggesting an older code path or migration wrote directly to `animal_bios` with this source.

---

## 2. Which Flip the Draft, Which Don't

| Path | Source label | Flips promoted_* | Notes |
|------|-------------|-------------------|-------|
| A. promote_from_draft | `promote_from_draft` | ✅ YES (per-side) | Reference correct behavior |
| B. manual_edit + approve | `manual_edit_long/short` | ❌ NO | **Active recurrence vector** |
| C. generic bio | `generic` | ❌ NO | Not visible (generic excluded from approved) |
| D. generic_adult bio | `generic_adult` | ❌ NO | Not visible (generic excluded from approved) |
| E. backfill | `backfill` | ❌ NO | Historical, won't recur |
| F. full_generate (draft) | `full_generate` | N/A | Creates drafts, not approvals |

**The active recurrence vector is Path B (manual_edit + approve).** When staff edits a bio directly and approves it, the old draft row's `promoted_*` flags are never updated. This is the ongoing bug.

---

## 3. Shared Choke Point vs Scattered

**Scattered — but with a clear primary target.**

There is no single shared "approve bio" function. The approval paths are:

1. `promoteDraftSize()` — handles draft promotion (✅ flips correctly)
2. `approveAnimalBioLong()` / `approveAnimalBioShort()` — handles manual edit approval (❌ doesn't flip)
3. `saveAnimalBio()` — handles generic/backfill creation (❌ doesn't flip, but these are generic and thus not visible)

For the **active bug** (manual edit approval), the fix goes in **2 sites**: `approveAnimalBioLong()` (localDatabase.ts:1677) and `approveAnimalBioShort()` (localDatabase.ts:1695). These are the only non-promote approval functions called by active code paths.

Optionally, a belt-and-suspenders fix could also go in `saveAnimalBio()` (localDatabase.ts:1560), but this only creates generic bios which are already excluded from the approved label by `isGenericSource()`.

---

## 4. The Correct Flip Logic (from promote_from_draft)

From `promoteDraftSize()` at localDatabase.ts:2015–2024:

```typescript
// 5. Mark promoted on draft
if (sz === 'long') {
  database.prepare('UPDATE animal_bio_drafts SET promoted_long = 1 WHERE shelter_code = ?').run(sc);
} else {
  database.prepare('UPDATE animal_bio_drafts SET promoted_short = 1 WHERE shelter_code = ?').run(sc);
}

// 6. If both promoted, delete draft
const updatedDraft = database.prepare('SELECT promoted_long, promoted_short FROM animal_bio_drafts WHERE shelter_code = ?').get(sc);
if (updatedDraft && updatedDraft.promoted_long === 1 && updatedDraft.promoted_short === 1) {
  database.prepare('DELETE FROM animal_bio_drafts WHERE shelter_code = ?').run(sc);
}
```

**Per-side logic:** Only the promoted size's flag is set. The other side remains as-is. The draft row is deleted only when BOTH sides are promoted.

**What's logically correct for manual_edit_short (only short side approved):**
Only `promoted_short` should flip. `computeBioState` checks each side independently:
```typescript
const hasUnpromotedRealDraft = !!draft && (
    (!draft.promotedLong && (draft.sourceLong === 'from_profile' || draft.sourceLong === 'from_sm')) ||
    (!draft.promotedShort && (draft.sourceShort === 'from_profile' || draft.sourceShort === 'from_sm'))
);
```
Both sides are OR'd — if EITHER side has an unpromoted real draft, the animal is pending. So for manual_edit_short to clear the pending state, it must flip `promoted_short`. If `promoted_long` is also 0 with a real source, the animal stays pending until that side is also addressed.

---

## 5. Forward-Fix Shape (description only, NOT applied)

### Primary fix: 2 sites in localDatabase.ts

In `approveAnimalBioLong()` (line 1677), after the UPDATE to `animal_bios`, add:

```typescript
// Mark corresponding draft side as promoted (if exists)
if (row) {
  database.prepare('UPDATE animal_bio_drafts SET promoted_long = 1 WHERE shelter_code = ?').run(row.shelter_code);
  // Delete draft if both sides now promoted
  const d = database.prepare('SELECT promoted_long, promoted_short FROM animal_bio_drafts WHERE shelter_code = ?').get(row.shelter_code) as { promoted_long: number; promoted_short: number } | undefined;
  if (d && d.promoted_long === 1 && d.promoted_short === 1) {
    database.prepare('DELETE FROM animal_bio_drafts WHERE shelter_code = ?').run(row.shelter_code);
  }
}
```

Same pattern in `approveAnimalBioShort()` (line 1695), but with `promoted_short`.

This mirrors the exact logic from `promoteDraftSize()` steps 5–6.

**Per-side, not both:** Each approve function flips only its own side. This is correct because a manual edit to the short bio shouldn't mark the long draft as promoted — that long draft may still be waiting for review.

**Prevents new stale drafts without touching existing ones:** The UPDATE uses `WHERE shelter_code = ?` — it only fires at approval time for the specific animal being approved. The 27 existing draft rows (including the 3 truly stale ones) are unaffected until someone next approves one of those animals' bios.

### Optional secondary fix: profiles-summary endpoint

At server.ts:1369, load draft data and pass it to `computeBioState()` instead of `null`. This eliminates the tab-level discrepancy regardless of stale drafts. (This was identified in the prior report.)

---

## 6. Cleanup Preview (read-only)

### Critical finding: only 3 of 27 are truly stale

Temporal analysis reveals that most "unpromoted" drafts are **legitimately pending new work** — drafts generated AFTER the bio was approved, representing a newer revision waiting for review. Only 3 are genuinely stale (draft predates the current approval).

| Category | Count | Description |
|----------|-------|-------------|
| STALE | 3 | Bio approved AFTER draft was generated; draft is superseded |
| LIVE_NEW_DRAFT | 8 | Draft generated AFTER bio was approved; real pending work |
| LIVE_GENERIC | 5 | Generic bio (doesn't count as approved); draft is real pending |
| LIVE_NO_BIO | 11 | No bio at all; draft is real pending |
| **Total** | **27** | |

### The 3 truly stale rows

| shelter_code | Bio source | Bio approved | Draft generated | Gap |
|---|---|---|---|---|
| S2025877 (Kirby) | manual_edit_short | 2026-06-21T03:03 | 2026-06-15T18:57 | bio 6 days newer |
| S2026158 (Mambo) | manual_edit_short | 2026-06-27T15:21 | 2026-06-27T15:19 | bio 2 min newer |
| R2025005 (Peanut Butter) | manual_edit_long | 2026-06-21T03:07 | 2026-06-15T18:58 | bio 6 days newer |

All 3 stale rows were caused by Path B (manual_edit + approve without flipping the draft).

### SELECT to identify exactly the stale rows

```sql
SELECT d.shelter_code, d.source_long, d.source_short, d.promoted_long, d.promoted_short,
       b.last_source, b.approved_at_long, b.approved_at_short, d.generated_at
FROM animal_bio_drafts d
JOIN animal_bios b ON d.shelter_code = b.shelter_code
WHERE b.status_long = 'approved' AND b.status_short = 'approved'
  AND b.last_source NOT IN ('generic', 'generic_adult')
  AND ((d.promoted_long = 0 AND (d.source_long = 'from_profile' OR d.source_long = 'from_sm'))
    OR (d.promoted_short = 0 AND (d.source_short = 'from_profile' OR d.source_short = 'from_sm')))
  AND d.generated_at <= COALESCE(b.approved_at_long, b.approved_at_short);
```

**Returns 3 rows** — confirmed matches exactly the stale set.

**Excludes genuinely pending drafts:** ✅ Verified. The `d.generated_at <= COALESCE(b.approved_at_long, b.approved_at_short)` clause excludes all 8 LIVE_NEW_DRAFT animals (drafts generated after the bio was approved). The JOIN excludes all 11 NO_BIO animals. The `last_source NOT IN ('generic', 'generic_adult')` excludes all 5 GENERIC animals.

### Correction to prior report

The prior report stated "32 stale draft rows." The corrected count is **3 truly stale + 24 legitimately pending = 27 total unpromoted real drafts.** The original 32 included 5 animals whose drafts have `from_profile`/`from_sm` source but with one side already promoted (partial promotion) — the query above correctly handles these via the per-side OR clause.

---

## Summary

| Finding | Detail |
|---------|--------|
| Active bug | `approveAnimalBioLong/Short()` doesn't flip draft `promoted_*` flags |
| Fix sites | 2 functions in localDatabase.ts (lines 1677, 1695) |
| Fix pattern | Mirror `promoteDraftSize()` steps 5–6: per-side flag flip + delete-if-both |
| Truly stale rows | 3 (not 32) — all from manual_edit path |
| Legitimately pending | 24 — real drafts awaiting review |
| Second bug | profiles-summary passes `null` for draft → both tabs should pass draft data |
