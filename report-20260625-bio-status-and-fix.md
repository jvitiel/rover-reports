# Bio Status AND Rule Fix — Both Sizes Must Be Approved

**Date:** 2026-06-25  
**Commit:** 9f28b54  
**Files changed:** server/src/server.ts (1 file, 2 sites)

---

## Changes

### Site 1 — `bioStatus` (server.ts:1210)

**Before:**
```ts
if (bio && (bio.statusLong === 'approved' || bio.statusShort === 'approved')) {
  // Has an approved dashboard bio
  bioStatus = 'approved';
```

**After:**
```ts
if (bio && (bio.statusLong === 'approved' && bio.statusShort === 'approved')) {
  // Has approved dashboard bios (both sizes)
  bioStatus = 'approved';
```

### Site 2 — `computeBioState()` hasApprovedRealBio (server.ts:2686)

**Before:**
```ts
const hasApprovedRealBio = !!bio && !isGenericSource(bio.lastSource) &&
  (bio.statusLong === 'approved' || bio.statusShort === 'approved');
```

**After:**
```ts
const hasApprovedRealBio = !!bio && !isGenericSource(bio.lastSource) &&
  (bio.statusLong === 'approved' && bio.statusShort === 'approved');
```

### No other sites changed

Confirmed no other OR-based animal-level approved rollup exists. The following per-size consumers are untouched (correctly operate per-size, not rolled up):
- WordPress `/api/bios/approved` (server.ts:2542-2587) — `long_approved` / `short_approved` flags
- `resolveBioText()` (server.ts:2718-2738) — per-size approved checks
- Matcher (server.ts:5913-5915) — per-size approved checks
- Per-size panel badges (dashboard/index.html:7721, 7749) — individual Pending Draft / Approved and Public

---

## Build

```
cd /home/shelter/shelter-apps/server && npm run build
```

tsc clean — no errors. Service restarted and active.

---

## Verification

### Both approved → still approved ✅

**S2025966** (both `status_long='approved'` and `status_short='approved'`):
- `bioStatus = 'approved'` ✅
- Unchanged behavior for fully-approved animals

### Only one approved → NOW PENDING ✅ (rule taking effect)

**S20241099** (`status_long='approved'`, `status_short='draft'`):
- `bioStatus = 'sm'` (not 'approved') ✅ — previously would have been 'approved' under OR
- `bioState = 'pending'` ✅ — correctly shows pending, not approved

### Neither approved → pending ✅

Unchanged — animals with neither size approved were never 'approved' under either rule.

### Count effect

| Metric | Old (OR) | New (AND) | Delta |
|---|---|---|---|
| DB: animals with approved animal-level status | 247 | 204 | -43 |
| Only-long approved (flipped to pending) | — | 41 | +41 to pending |
| Only-short approved (flipped to pending) | — | 2 | +2 to pending |
| API `bioStatus=approved` (live animals) | ~174+N | 174 | some flipped |
| API `bioState=approved` (live animals) | — | 15 | filtered by non-generic + no unpromoted draft |

43 animals total had only one size approved and now correctly show as pending instead of approved.

### Per-size untouched ✅

**WordPress `/api/bios/approved`:**
- S20241099: `long_approved=True`, `short_approved=False` ✅ — per-size flags still expose the one approved size
- Total in endpoint: 247 animals (unchanged — endpoint returns any animal with at least one approved size)
- Breakdown: both=204, only_long=41, only_short=2

The AND rule applies only to the animal-level rollup. WordPress and other per-size consumers still see and use individual approved sizes.

---

## Commit

```
9f28b54 - Enforce AND rule for animal-level bio status: both sizes must be approved
1 file changed: server/src/server.ts
```
