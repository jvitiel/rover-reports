# Dual-State Cutover — Legacy Draft State + Approve Wiring Map

**Date:** 2026-06-15 15:43 UTC
**Scope:** Read-only diagnosis. No writes, no edits.

---

## PART 1 — LEGACY DRAFT STATE in animal_bios

### a. All rows with any draft content (51 total)

| shelter_code | last_source | status_long | status_short | has_long | has_short | generated_at |
|---|---|---|---|---|---|---|
| A2025100 | sm_generate | draft | draft | 1 | 1 | 2026-06-15T13:14:48 |
| S2026133 | full_generate | draft | draft | 1 | 1 | 2026-06-12T21:40:14 |
| S2023297 | sm_generate | draft | draft | 1 | 1 | 2026-06-12T21:39:30 |
| A2025088 | sm_copy | draft | draft | 1 | 0 | 2026-06-12T16:48:19 |
| A2026050 | sm_copy | draft | draft | 1 | 0 | 2026-06-12T13:55:29 |
| S20251236 | regenerate_short | approved | draft | 1 | 1 | 2026-06-12T13:54:20 |
| S2026291 | full_generate | approved | draft | 1 | 1 | 2026-06-01 |
| S2026177 | full_generate | approved | draft | 1 | 1 | 2026-06-01 |
| S2026390 | full_generate | approved | draft | 1 | 1 | 2026-06-01 |
| S2024908 | full_generate | approved | draft | 1 | 1 | 2026-06-01 |
| S2025546 | manual_edit_long | approved | draft | 1 | 1 | 2026-06-01 |
| A2025114 | full_generate | approved | draft | 1 | 1 | 2026-06-01 |
| A2025203 | full_generate | approved | draft | 1 | 1 | 2026-05-22 |
| A2024185 | full_generate | approved | draft | 1 | 1 | 2026-05-21 |
| S2025833 | full_generate | approved | draft | 1 | 1 | 2026-05-21 |
| T2026003 | full_generate | approved | draft | 1 | 1 | 2026-05-18 |
| S2026360 | full_generate | approved | draft | 1 | 1 | 2026-05-18 |
| S2026290 | full_generate | approved | draft | 1 | 1 | 2026-05-17 |
| S2026351 | full_generate | approved | draft | 1 | 1 | 2026-05-17 |
| S2026310 | full_generate | approved | draft | 1 | 1 | 2026-05-16 |
| S2026308 | full_generate | approved | draft | 1 | 1 | 2026-05-16 |
| S2026312 | full_generate | approved | draft | 1 | 1 | 2026-05-16 |
| S2026268 | full_generate | approved | draft | 1 | 1 | 2026-05-16 |
| S2024694 | manual_edit_long | approved | draft | 1 | 0 | 2026-05-15 |
| S2026153 | full_generate | approved | draft | 1 | 1 | 2026-05-09 |
| R2025054 | regenerate_short | approved | draft | 1 | 1 | 2026-05-09 |
| R2026006 | full_generate | approved | draft | 1 | 1 | 2026-05-09 |
| R2024016 | full_generate | approved | draft | 1 | 1 | 2026-05-09 |
| S20241035 | backfill | approved | draft | 1 | 1 | 2026-04-28 |
| S2025961 | backfill | approved | draft | 1 | 1 | 2026-04-28 |
| W2026035 | backfill | approved | draft | 1 | 1 | 2026-04-28 |
| W2026033 | backfill | approved | draft | 1 | 1 | 2026-04-28 |
| S2026073 | backfill | approved | draft | 1 | 1 | 2026-04-28 |
| S2026028 | regenerate_long | approved | draft | 1 | 1 | 2026-04-28 |
| S2025783 | backfill | approved | draft | 1 | 1 | 2026-04-28 |
| W2026014 | backfill | approved | draft | 1 | 1 | 2026-04-25 |
| S20241225 | backfill | approved | draft | 1 | 1 | 2026-04-25 |
| S2026224 | backfill | approved | draft | 1 | 1 | 2026-04-25 |
| W2026027 | backfill | approved | draft | 1 | 1 | 2026-04-25 |
| S2026134 | backfill | approved | draft | 1 | 1 | 2026-04-25 |
| S2026237 | backfill | approved | draft | 1 | 1 | 2026-04-24 |
| S20251170 | backfill | approved | draft | 1 | 1 | 2026-04-18 |
| A2023267 | sm_copy | draft | draft | 1 | 0 | 2026-04-17 |
| A2026061 | regenerate_long | draft | approved | 1 | 1 | 2026-04-16 |
| A2023301 | backfill | approved | draft | 1 | 1 | 2026-04-13 |
| S2026110 | backfill | approved | draft | 1 | 0 | 2026-04-11 |
| A2023228 | backfill | draft | draft | 1 | 1 | 2026-04-02 |
| A2023124 | backfill | draft | draft | 1 | 1 | 2026-03-23 |
| S2026143 | backfill | approved | draft | 1 | 1 | 2026-03-21 |
| S20241099 | backfill | approved | draft | 1 | 0 | 2026-03-17 |
| A2024112 | backfill | draft | draft | 1 | 0 | 2026-03-17 |

### b. Classification summary

| State | Count | Description |
|-------|-------|-------------|
| approved_long + draft_short | **41** | Long is approved/public; short exists but awaiting approval |
| draft_long + approved_short | **1** | A2026061 — short approved, long regenerated back to draft |
| pure_draft (both draft) | **9** | Nothing approved on either size (A2025100, S2026133, S2023297, A2025088, A2026050, A2023267, A2023228, A2023124, A2024112) |
| **Total** | **51** | |

The dominant pattern (41/51 = 80%) is: **long approved, short still draft**. Staff have been approving longs but not shorts. Only 1 animal has the inverse. 9 are fully in draft (3 sm_copy with empty short, 2 sm_generate/full_generate with both populated, 4 backfill-era). [VERIFIED]

---

## PART 2 — THE APPROVE WIRING

### c. Dashboard "Approve for Public Use" button

**Client markup** (dashboard/index.html:7580, 7605):
```html
<button class="bio-btn success" onclick="approveBio('${animalId}', '${bio.id}', 'long')"
  id="bio-approve-long-${animalId}" ${bio.statusLong === 'approved' || !isAvailable ? 'disabled' : ''}>
  ✓ Approve for Public Use
</button>
<!-- same pattern for short at line 7605 -->
```

**Client handler** (dashboard/index.html:7746-7763):
```javascript
async function approveBio(animalId, bioId, size) {
  const btn = document.getElementById(`bio-approve-${size}-${animalId}`);
  btn.disabled = true;
  btn.innerHTML = '<span class="inline-spinner"></span>';
  const response = await fetch(`${API_BASE}/bio/${bioId}/approve/${size}`, { method: 'POST' });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to approve bio');
  bioCache.set(animalId, result.data);
  renderBioContent(animalId, result.data);
}
```

**Server endpoints** (server.ts:2373-2437):
- `POST /api/bio/:bioId/approve/long` → calls `approveAnimalBioLong(bioId)`
- `POST /api/bio/:bioId/approve/short` → calls `approveAnimalBioShort(bioId)`

Both also check if the animal is in a featured slot and clear the WordPress cache if so.

**DB-level approve** (localDatabase.ts:1476-1512):
```sql
-- approveAnimalBioLong (localDatabase.ts:1480-1483)
UPDATE animal_bios 
SET status_long = 'approved', approved_at_long = ?
WHERE id = ?

-- approveAnimalBioShort (localDatabase.ts:1498-1501)
UPDATE animal_bios 
SET status_short = 'approved', approved_at_short = ?
WHERE id = ?
```

Both record a history row (`approve_long` / `approve_short`, generatedBy: `system`, notes: "Status change only — bio content unchanged"). [VERIFIED]

### d. GET /api/bio/:animalId (server.ts:2251-2267)

Calls `getAnimalBio(animalId)` which queries **only `animal_bios`**:
```sql
SELECT * FROM animal_bios WHERE shelter_code = ?
```
No reference to `animal_bio_drafts` anywhere in the current codebase. [VERIFIED]

### e. Auto-approved generic paths (must NOT change)

Three functions write `statusLong: 'approved', statusShort: 'approved'` directly to `animal_bios`:

1. **`runGenericBioJob()` Pass 1** (server.ts:11496-11512) — youth-generic daily job. Writes `source: 'generic'`, `generatedBy: 'system'`, both statuses approved. Uses `saveAnimalBio()`.

2. **`POST /api/dashboard/generic-bio/publish`** (server.ts:11555-11581) — manual youth-generic trigger. Same shape, same `saveAnimalBio()` call with `source: 'generic'`.

3. **`upgradeAgedOutGeneric()` `no_content` branch** (server.ts:11753-11770) — Track C adult-generic. Writes `source: 'generic_adult'`, `generatedBy: 'system'`, both statuses approved. Uses `saveAnimalBio()`.

All three bypass any draft/review step intentionally — they produce deterministic factual text that is pre-approved by design. The cutover must leave these three paths writing approved directly to `animal_bios`, never routing through `animal_bio_drafts`. [VERIFIED]
