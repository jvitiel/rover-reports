# Slot-1 Source Policy Diagnosis

**Date:** 2026-06-21 ~22:15 UTC  
**Mode:** Read-only. DB mode=ro. Zero writes. No code/service changes.

**Policy under review:** Only SM-sync (globe selection) and human dashboard drags may place a photo on the public strip (positions 1–6). All staff-app capture sources must go to library (position 0) and never auto-fill.

---

## 1. Every Photo Insert Path

| # | Caller | File:Line | source | tagMarketing | Initial strip_position | Auto-fill eligible? |
|---|--------|-----------|--------|-------------|----------------------|-------------------|
| 1 | Dashboard upload-to-library | server.ts:4020 | `'dashboard-upload'` | not passed (false) | 0 | NO (not profiler/sm/tagMarketing) |
| 2 | Grok Imagine video | server.ts:4128 | `'grok_imagine'` | n/a (video) | 0 (hardcoded) | NO (video, not photo) |
| 3 | Activity voice note | server.ts:7934 | `'activity'` | not passed (false) | 0 | NO (voice, not photo) |
| 4 | Activity photo | server.ts:8111 | `'activity'` | not passed (false) | 0 | NO (not profiler/sm/tagMarketing) |
| 5 | Feeding voice note | server.ts:8465 | `'feeding'` | not passed (false) | 0 | NO (voice, not photo) |
| 6 | Feeding photo | server.ts:8545 | `'feeding'` | not passed (false) | 0 | NO (not profiler/sm/tagMarketing) |
| 7 | **Profiler photo** | server.ts:8653 | **`'profiler'`** | not passed (false) | 0 | **YES — profiler matches** |
| 8 | Intake photo | server.ts:11334 | `'intake'` | not passed (false) | 0 | NO (not profiler/sm/tagMarketing) |
| 9 | Intake voice note | server.ts:11635 | `'intake'` | not passed (false) | 0 | NO (voice, not photo) |
| 10 | SM Photo Sync ingest | server.ts:12067 | `'sm-sync'` | not passed (false) | 0 | NO (not profiler/sm/tagMarketing) |

**Key finding:** Only row #7 (profiler) can auto-fill to the strip via `insertAnimalMedia`. All other staff-capture sources correctly land at strip_position = 0 and stay there.

Note: source `'sm'` would also trigger auto-fill, but NO current insert callsite uses source `'sm'`. The SM sync ingest path uses `'sm-sync'` which does NOT match.

---

## 2. Auto-Fill Rule (Exact Quote)

```typescript
// localDatabase.ts:4848-4869
// Auto-fill strip if this is a photo and animal has empty slots
// Only auto-fill for: profiler, sm, or marketing-tagged photos
if (params.mediaType === 'photo' && params.shelterCode) {
  const shouldAutoFill = 
    params.source === 'profiler' || 
    params.source === 'sm' || 
    params.tagMarketing;
  
  if (shouldAutoFill) {
    // Count current strip photos for this animal
    const countResult = database.prepare(`
      SELECT COUNT(*) as count FROM animal_media 
      WHERE shelter_code = ? AND media_type = 'photo' AND strip_position > 0
    `).get(params.shelterCode) as { count: number };
    
    const currentCount = countResult?.count || 0;
    
    // If fewer than 6, assign next available position
    if (currentCount < 6) {
      database.prepare(
        `UPDATE animal_media SET strip_position = ? WHERE id = ?`
      ).run(currentCount + 1, id);
    }
  }
}
```

**Triggering conditions:**
- `source === 'profiler'` — **FIRES** (profiler photo capture, server.ts:8653)
- `source === 'sm'` — would fire, but no current callsite uses this source
- `params.tagMarketing === true` — would fire, but no callsite passes `tagMarketing: true` at insert time. Tag is toggled via a separate API (server.ts:13349) AFTER insert, so it doesn't affect auto-fill.

**Can `currentCount + 1 === 1`?** YES. When an animal has zero photos on the strip (`currentCount === 0`), the formula produces `strip_position = 1`. **A profiler photo for a new animal with no strip photos lands directly at slot 1.**

---

## 3. Staff-App Source Verdicts

| Source | Used by | Auto-fill? | Can reach strip? | Policy verdict |
|--------|---------|-----------|-----------------|---------------|
| `'profiler'` | Profiler photo capture (server.ts:8653) | **YES** (`source === 'profiler'`) | **YES — auto-fills to pos 1–6** | **⚠️ VIOLATION** |
| `'activity'` | Activity photo capture (server.ts:8111) | No | Only via manual drag | ✅ Compliant |
| `'feeding'` | Feeding photo capture (server.ts:8545) | No | Only via manual drag | ✅ Compliant |
| `'dashboard-upload'` | Dashboard upload-to-library (server.ts:4020) | No | Only via manual drag | ✅ Compliant |
| `'intake'` | Intake photo (server.ts:11334) | No | Only via manual drag | ✅ Compliant |
| `'sm-sync'` | SM Photo Sync ingest (server.ts:12067) | No | Only via slot-1 self-correction block | ✅ Correct (SM path) |

**Only `'profiler'` violates the policy.** The comment in the code (`// Only auto-fill for: profiler, sm, or marketing-tagged photos`) reveals this was intentional behavior, not a bug — the original design considered profiler photos worthy of strip placement. The policy has since changed.

---

## 4. Data Check — Existing Staff-Capture Photos on Strip

### All staff-capture sources on strip (positions 1–6):

| Source | Pos 1 | Pos 2 | Pos 3 | Pos 4 | Pos 5 | Pos 6 | Total |
|--------|-------|-------|-------|-------|-------|-------|-------|
| activity | 6 | 5 | 5 | 2 | 1 | 2 | 21 |
| dashboard-upload | 4 | 0 | 7 | 5 | 2 | 4 | 22 |
| feeding | 3 | 1 | 1 | 0 | 1 | 0 | 6 |
| profiler | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| **Total** | **13** | **6** | **13** | **7** | **4** | **7** | **50** |

**50 staff-capture photos currently on the public strip.** 13 are at slot 1 (the main/featured position).

### Slot-1 staff-capture photos:

| shelter_code | source | How it got to slot 1 |
|---|---|---|
| A2025162 | activity | Manual drag (activity doesn't auto-fill) |
| A2026061 | activity | Manual drag (known protected non-SM pick) |
| S2025963 | activity | Manual drag (known protected non-SM pick) |
| S2026028 | activity | Manual drag (known protected non-SM pick) |
| S2026078 | activity | Manual drag (known protected non-SM pick) |
| S2026228 | activity | Manual drag |
| A2026051 | dashboard-upload | Manual drag |
| A2026067 | dashboard-upload | Manual drag |
| S20251008 | dashboard-upload | Manual drag (known protected non-SM pick) |
| S2026224 | dashboard-upload | Manual drag |
| S2026061 | feeding | Manual drag |
| S2026073 | feeding | Manual drag |
| S2026230 | feeding | Manual drag (tag_marketing toggled after insert) |

**All 13 slot-1 staff-capture photos were placed by manual dashboard drag** (human choice), not by auto-fill. The 5 known protected non-SM picks (A2026061, S20251008, S2025963, S2026028, S2026078) are among them. These are INTENTIONAL placements by staff — they should NOT be demoted.

### Profiler auto-fill evidence:

Only 1 profiler photo is on the strip: R2024034 at position 6 (auto-filled when strip had 5 SM photos, so `currentCount=5 → pos=6`). **No profiler photo has auto-filled to slot 1** in the current data, but the code allows it.

### Cropped staff-capture photos (among the 688 we cropped):

**13 of the 688 cropped slot-1 photos are staff-capture sources** [VERIFIED via `SELECT shelter_code, source FROM animal_media WHERE strip_position=1 AND crop_url IS NOT NULL AND source NOT IN ('sm','sm-sync')`]:

| shelter_code | source |
|---|---|
| A2025162 | activity |
| A2026061 | activity |
| S2025963 | activity |
| S2026028 | activity |
| S2026078 | activity |
| S2026228 | activity |
| A2026051 | dashboard-upload |
| A2026067 | dashboard-upload |
| S20251008 | dashboard-upload |
| S2026224 | dashboard-upload |
| S2026061 | feeding |
| S2026073 | feeding |
| S2026230 | feeding |

These were all placed by staff via manual drag — they are legitimate slot-1 photos and were correctly cropped.

---

## 5. Fix Surface (Identify Only — NO CHANGES MADE)

### The violation

The `insertAnimalMedia` auto-fill condition at localDatabase.ts:4850-4852:
```typescript
const shouldAutoFill = 
  params.source === 'profiler' || 
  params.source === 'sm' || 
  params.tagMarketing;
```

`'profiler'` should be removed from this condition. No staff-app capture source should trigger auto-fill.

### Is removing 'profiler' sufficient?

**YES.** No other non-SM, non-drag insert callsite can trigger auto-fill:
- `'sm'` — no current callsite uses this source string (SM sync uses `'sm-sync'`)
- `tagMarketing` — never passed `true` at insert time by any callsite
- All other sources (`activity`, `feeding`, `dashboard-upload`, `intake`) don't match any auto-fill condition

### The precise edit:

```typescript
// BEFORE:
const shouldAutoFill = 
  params.source === 'profiler' || 
  params.source === 'sm' || 
  params.tagMarketing;

// AFTER:
const shouldAutoFill = false; // Auto-fill disabled — strip placement is SM sync + manual drag only
```

Or, if `'sm'` auto-fill should be preserved for future use:
```typescript
const shouldAutoFill = 
  params.source === 'sm' || 
  params.tagMarketing;
```

### Is there a legitimate reason for profiler auto-fill?

**Historical context:** The original design intended profiler photos (field/kennel captures) to auto-seed the strip for new animals that don't yet have SM photos. This was reasonable when profiler was the primary photo source. Now that SM sync populates the strip and staff use the dashboard media tab for curation, profiler auto-fill creates unsanctioned public-facing photos.

**Current impact:** Only 1 profiler photo is on the strip (R2024034 at pos 6), and 0 are at slot 1. The violation is theoretical (code allows it) more than practical (rarely fires because most animals get SM photos before profiler photos). But the policy should be enforced in code, not by lucky timing.

### Other callsites needing correction?

**None.** All other insert paths (activity, feeding, dashboard-upload, intake, sm-sync) already land at strip_position = 0 and don't trigger auto-fill. The direct INSERT at server.ts:4128 (grok_imagine video) hardcodes `strip_position = 0`.

The dashboard drag paths (`addPhotoToStrip`, `reorderStripPhoto`) are intentional human actions — they should NOT be restricted.

---

## Summary

- **1 policy violation found:** `'profiler'` source in auto-fill condition (localDatabase.ts:4850)
- **50 staff-capture photos on the public strip** — all placed by manual dashboard drag (human choice), not auto-fill
- **13 staff-capture photos at slot 1** — all manual drag (6 activity, 4 dashboard-upload, 3 feeding), all intentional
- **1 profiler auto-fill on record:** R2024034 at pos 6 (not slot 1)
- **13 of 688 cropped photos are staff-capture** — all legitimate manual placements
- **Fix:** Remove `'profiler'` from auto-fill condition. One line. No other callsite needs correction.
