# Bio Source Badge Fix — saveAnimalBioDraftSize source_long/source_short

**Date:** 2026-06-25  
**Commit:** f97a537  
**Files changed:** server/src/server.ts, server/src/localDatabase.ts

---

## Root Cause (from diagnosis report)

`saveAnimalBioDraftSize` (localDatabase.ts:1849-1916) never wrote `source_long` or `source_short` columns. On INSERT, they defaulted to NULL; on UPDATE, they were left stale. The regenerate endpoint (server.ts:2263) only passed action-vocabulary sources (`regenerate_long`/`regenerate_short`), not origin-vocabulary (`from_profile`/`from_sm`). The frontend's conditional badge render `${srcLabelLong ? ... : ''}` correctly omitted the badge when the value was null.

---

## Changes

### 1. server.ts — Regenerate endpoint origin computation

**Before (line ~2263):**
```ts
saveAnimalBioDraftSize(shelterCode, size as 'long' | 'short', bioEn, bioEs,
  size === 'long' ? 'regenerate_long' : 'regenerate_short');
```

**After:**
```ts
// Compute origin matching full-generate vocabulary: profile → from_profile, SM comment → from_sm
const regenOrigin = merged ? 'from_profile' : 'from_sm';
saveAnimalBioDraftSize(shelterCode, size as 'long' | 'short', bioEn, bioEs,
  size === 'long' ? 'regenerate_long' : 'regenerate_short', regenOrigin);
```

The regenerate endpoint already branches on `merged` (profile path) vs `hasStaffSMComment` (SM comment fallback) — the same decision full-generate uses to set `generationSource = 'full_generate'` or `'sm_generate'`. The origin maps directly: merged → `from_profile`, SM comment → `from_sm`. This matches `mapSourceToOrigin`'s mapping (`full_generate` → `from_profile`, `sm_generate` → `from_sm`).

### 2. localDatabase.ts — saveAnimalBioDraftSize

**Before:** Function signature had 5 params (shelterCode, size, bioEn, bioEs, source). SQL wrote 10 columns — no `source_long`, no `source_short`.

**After:** Added `origin: string | null = null` as 6th param. Added per-size source computation:

```ts
let srcLong: string | null, srcShort: string | null;

if (size === 'long') {
  srcLong = origin;                                          // regenerated size gets new origin
  srcShort = existing ? existing.sourceShort                 // preserve from existing draft
           : current ? (current.sourceShort ?? null) : null; // or from animal_bios, or null
} else {
  srcShort = origin;
  srcLong = existing ? existing.sourceLong
          : current ? (current.sourceLong ?? null) : null;
}
```

SQL updated to include `source_long, source_short` in both INSERT column list (12 params) and ON CONFLICT DO UPDATE set:

```sql
INSERT INTO animal_bio_drafts (
  id, shelter_code, generated_at,
  bio_en_long, bio_es_long, bio_en_short, bio_es_short,
  promoted_long, promoted_short, last_source, source_long, source_short
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(shelter_code) DO UPDATE SET
  ...
  source_long = excluded.source_long,
  source_short = excluded.source_short
```

This mirrors `saveAnimalBioDraft`'s structure (lines 1826-1847).

---

## Build

```
cd /home/shelter/shelter-apps/server && npm run build
```

tsc clean — no errors.

Service restarted: `sudo systemctl restart shelter-app` — active (running).

---

## Verification

### Test 1: Existing draft — regenerate long (S2024718)

**Before:** `source_long = from_profile`, `source_short = from_profile`, `last_source = regenerate_short`

**After regenerate long:**
- API response: `draft.sourceLong = from_profile` ✅ (new origin)
- API response: `draft.sourceShort = from_profile` ✅ (preserved)
- DB row: `source_long = from_profile`, `source_short = from_profile`, `last_source = regenerate_long` ✅

### Test 2: Same animal — regenerate short (S2024718)

**After regenerate short:**
- API response: `draft.sourceLong = from_profile` ✅ (preserved from test 1)
- API response: `draft.sourceShort = from_profile` ✅ (new origin)
- DB row: `source_long = from_profile`, `source_short = from_profile`, `last_source = regenerate_short` ✅

### Test 3: Fresh draft case — no prior draft (R2026007)

**Before:** Bio exists in `animal_bios` with `source_long = from_profile`, `source_short = from_profile`. No row in `animal_bio_drafts`.

**After regenerate long:**
- API response: `draft.sourceLong = from_profile` ✅ (new origin from regen)
- API response: `draft.sourceShort = from_profile` ✅ (carried from animal_bios)
- DB row: `source_long = from_profile`, `source_short = from_profile`, `promoted_long = 0` (Pending Draft), `promoted_short = 1` (live) ✅

Test draft cleaned up after verification.

### Confirmed behaviors:
- ✅ Source badge persists after regenerate (both long and short)
- ✅ Fresh-draft case shows the badge (not NULL)
- ✅ Origin matches full-generate vocabulary (`from_profile` / `from_sm`)
- ✅ Regenerating one size does NOT wipe the other size's source badge
- ✅ Status badge still updates correctly (promoted_long/promoted_short)
- ✅ Frontend unchanged — its conditional render works correctly when data is present

---

## Commit

```
f97a537 - Fix bio source badge dropping on regenerate: write source_long/source_short in saveAnimalBioDraftSize
2 files changed: server/src/server.ts, server/src/localDatabase.ts
```
