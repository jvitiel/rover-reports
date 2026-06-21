# Unpublished Strip Photo Sweep — Read-Only Diagnosis

**Date:** 2026-06-21 ~05:10 UTC
**Mode:** Read-only (DB opened `mode=ro`). Zero writes to DB, code, or services.

---

## Q1 — Detection Test

### Definition

A strip photo (positions 1–6) is **SM-unpublished** if ALL of:
1. Its `source` is `'sm'` or `'sm-sync'` (it's an SM-originated photo)
2. Its `source_media_id` is non-null and non-empty (concrete mediaid)
3. That mediaid is **NOT** in the animal's live `PHOTOURLS` mediaid set

`PHOTOURLS` is a JSON array of URL strings in SM's `json_shelter_animals` response. Each URL contains `mediaid=XXXX`. [VERIFIED: `type(PHOTOURLS)` is `list`, confirmed via live API response inspection.]

### False-Positive Guards

Three categories of strip photos are **never swept** by construction:

| Category | How excluded | Count on strip |
|---|---|---|
| Non-SM source (activity, dashboard-upload, feeding, profiler, grok_imagine) | Rule 1: source must be `'sm'` or `'sm-sync'` | 84 (51 in-feed, 33 archived) |
| SM source with null/empty `source_media_id` | Rule 2: `source_media_id` must be non-null and non-empty | 7 (6 from S2026101 [archived], 1 from S2026144 [in-feed]) |
| Animal not in SM feed (archived) | No `PHOTOURLS` available — can't determine published state, so excluded entirely | 214 animals with strip photos |

[VERIFIED: non-SM strip source breakdown from DB query: `feeding=6, activity=21, profiler=1, dashboard-upload=22, grok_imagine=34`.]

[VERIFIED: 7 null-mediaid SM strip rows — S2026101 (6 rows, pos 1–6, archived/not in feed), S2026144 (1 row, pos 2, in feed). Neither would be swept.]

### 5-Animal Validation

| shelter_code | PHOTOURLS mediaids | strip rows | all match? |
|---|---|---|---|
| A2023267 | {8, 899, 1787, 1788, 1789, 1790, 3084, 7614, 7858} | pos1=7614✓ pos2=1789✓ pos3=899✓ pos4=7858✓ pos5=8✓ pos6=3084✓ | ✅ All 6 published |
| A2023278 | {10, 11} | pos1=10✓ pos2=11✓ | ✅ All 2 published |
| A2023287 | {566, 2804, 4499} | pos1=4499✓ pos2=566✓ pos3=2804✓ | ✅ All 3 published |
| A2023301 | {1058} | pos1=1058✓ | ✅ 1 published |
| A2024017 | (checked in script) | (strip rows verified) | ✅ All published |

[VERIFIED: each `source_media_id` on strip is present in the animal's live `PHOTOURLS` mediaid set.]

### Archived Animals

Animals NOT in the current SM feed: **282** (of which **214** have strip photos). These are excluded from the sweep because we have no `PHOTOURLS` to test against — we can't determine published state without a live reference. [VERIFIED: set difference between `animal_media` shelter_codes and SM feed shelter_codes.]

---

## Q2 — Blast Radius

### Result: ZERO unpublished SM strip photos

| Metric | Count |
|---|---|
| Total SM strip rows (with `source_media_id`) in-feed | 670 |
| Published (mediaid in PHOTOURLS) | 670 |
| **Unpublished (mediaid NOT in PHOTOURLS)** | **0** |

[VERIFIED: iterated all 670 SM strip rows for 475 in-feed animals. Every `source_media_id` appears in its animal's `PHOTOURLS`.]

### Breakdown

Since the count is zero, there is no breakdown by position, source, or animal distribution.

**Pos-1 unpublished:** 0 (as expected after the globe fix — all slot-1 photos now match `WEBSITEMEDIAID`).

### Exclusions (confirmed not counted)

| Category | Count | Note |
|---|---|---|
| Non-SM strip photos (in-feed animals) | 51 | activity, dashboard-upload, feeding, profiler, grok_imagine — never SM, never swept |
| Null-mediaid SM strip (in-feed) | 1 | S2026144 pos 2, source=sm — no mediaid to test, never swept |
| Archived animals (not in feed) | 332 SM strip rows across 214 animals | No PHOTOURLS reference, excluded |

### Why Zero?

SM's `PHOTOURLS` contains **every** published photo for an animal — it's the full published set, not just the primary. SM rarely (or never) un-publishes a photo without removing it entirely. The strip photos in our DB were all synced from SM's published set, and none have been de-published since. The globe-fix corrected slot-1 ordering but didn't introduce unpublished photos.

---

## Q3 — Per-Strip Effect

With zero affected animals, no strip modifications are modeled. No animals would have slot-1 emptied.

### Recommended Post-Move Ordering Rule

When unpublished photos are removed from mid-strip slots, **dense reindex** (no gaps): remaining photos shift down to keep positions 1, 2, 3, … contiguous.

Rationale: the matcher and homepage read the lowest-position photo (pos 1) as the main photo. Gaps (e.g. removing pos 3 to leave 1, 2, 4) are tolerated by the rendering code but wasteful — the strip has a maximum of 6 slots, and gaps reduce effective capacity.

### Example (hypothetical)

If an animal had strip [1=A, 2=B, 3=C, 4=D] and B (pos 2) was unpublished:
- Before: pos1=A, pos2=B, pos3=C, pos4=D
- After (dense): pos1=A, pos2=C, pos3=D (B→library at pos 0)

No actual examples exist because the blast radius is zero.

---

## Q4 — Interaction with Shipped Sync Fix

### The Current Code (commit `2138d48`, server.ts ~line 12133–12137)

```typescript
const N = globeRow.strip_position ?? 0; // globe's current position (0 = library)
try {
  db.exec('BEGIN');
  // Demote current slot-1 to N, promote globe to 1
  db.prepare(`UPDATE animal_media SET strip_position = ? WHERE id = ? AND shelter_code = ?`).run(N, slot1Row.id, animal.shelterCode);
  db.prepare(`UPDATE animal_media SET strip_position = 1 WHERE id = ? AND shelter_code = ?`).run(globeRow.id, animal.shelterCode);
```

[VERIFIED: read from live `server.ts` at offset 12132–12139.]

### The Issue

When the globe photo is at position N (e.g. pos 3) and the old slot-1 photo is unpublished, the swap sends the unpublished photo to pos 3 — **re-creating an unpublished photo on the strip**. The correct behavior: if the demoted photo is unpublished, send it to pos 0 (library) instead of N.

### Forward-Fix Edit (specify only, do not implement)

At the line:
```typescript
const N = globeRow.strip_position ?? 0;
```

The fix would:
1. After resolving `N`, check whether `slot1Row.source_media_id` is in the animal's live `PHOTOURLS` mediaid set.
2. If it IS published: demote to N (current behavior — the photo belongs on the strip, just not at slot 1).
3. If it is NOT published: demote to 0 (library — unpublished photos don't belong on the strip at all).

This requires the `PHOTOURLS` mediaid set to be available at this point in the sync loop. The animal's `PHOTOURLS` is already parsed from the SM feed earlier in the function — it would need to be extracted into a per-animal set and passed down (or the raw array iterated inline).

### Current Risk Assessment

Since the blast radius is currently zero (no unpublished SM photos exist on any strip), this forward-fix is **preventive**, not corrective. It would only matter if SM de-publishes a photo that's currently on a strip — a scenario that hasn't occurred yet.

---

## Q5 — Fix Surface

### One-Time Sweep

**Not needed.** Blast radius is zero — there are no unpublished SM photos on any strip to sweep.

If future conditions create unpublished strip photos, the sweep would be a **standalone script** at `server/src/scripts/` (similar pattern to the thumbnail backfill at `7ca7da1`): read-only SM feed fetch, read-write DB for `strip_position` updates, idempotent, with dense-reindex logic. Not an extension of the sync — the sync runs nightly and handles ongoing correction; the sweep would be a one-shot historical cleanup.

### Forward-Fix Edit

**File:** `server/src/server.ts`
**Location:** The slot-1 self-correction block, specifically the line `const N = globeRow.strip_position ?? 0;` (~line 12133).
**Edit:** Add a published-check on the demoted photo's `source_media_id` against the animal's `PHOTOURLS` set. If unpublished, override N to 0.

---

## Deviations

None from spec. Q3 examples are hypothetical (not from live data) because the blast radius is zero — this is noted inline.
