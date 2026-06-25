# Bio Status AND Rule Diagnosis — Does Animal-Level "Approved" Require Both Sizes?

**Date:** 2026-06-25  
**Type:** Read-only diagnosis  
**Status:** OR logic found in two of three animal-level computations; one is intentional, one is the gap

---

## 1. Per-Size Approval Flags

Two independent approval flags exist on `animal_bios`:

- **`status_long`**: `'draft'` or `'approved'` — set to `'approved'` by `approveAnimalBioLong()` (`localDatabase.ts:1663-1679`) or by `promoteDraftSize()` (`localDatabase.ts:1960-1971`)
- **`status_short`**: `'draft'` or `'approved'` — set to `'approved'` by `approveAnimalBioShort()` (`localDatabase.ts:1681-1697`) or by `promoteDraftSize()` (`localDatabase.ts:1975-1986`)

Each has a corresponding `approved_at_long` / `approved_at_short` timestamp.

On `animal_bio_drafts`, the analogous flags are `promoted_long` / `promoted_short` (boolean 0/1). A draft size with `promoted = 0` is "pending"; `promoted = 1` means it has been pushed to `animal_bios`.

### Per-size badge (inside the bio panel)

Each size renders its own status badge independently — `dashboard/index.html:7721` (long) and `7749` (short):

```js
// dashboard/index.html:7721
<span class="bio-status ${displayStatusLong}">${displayStatusLong === 'approved' ? 'Approved and Public' : 'Pending Draft'}</span>
```

These are correct and independent — each size shows its own state.

---

## 2. Animal-Level Bio Status — Three Computations

There are **three distinct animal-level bio status computations**, each serving different consumers:

### 2A. `bioStatus` — Media tab card badge (server.ts:1209-1215)

```ts
// server.ts:1209-1212
let bioStatus: 'none' | 'sm' | 'draft' | 'approved' = 'none';
if (bio && (bio.statusLong === 'approved' || bio.statusShort === 'approved')) {
  bioStatus = 'approved';
} else if (hasValue(smAnimal.description)) {
  bioStatus = 'sm';
}
```

**Logic: OR** — flips to `'approved'` when EITHER `statusLong` or `statusShort` is approved.

**Consumer:** The dashboard media-tab animal card badge (`dashboard/index.html:7247-7248`):
```js
const bioStatus = animal.bioStatus || 'none';
const bioStatusBadge = renderBioStatusBadge(bioStatus);
```
Rendered via `renderBioStatusBadge()` (`dashboard/index.html:7534-7539`) as `"Bio: Approved"` / `"Bio: SM"` / `"Bio: None"`.

### 2B. `computeBioState()` — Profiles tab + media tab filters (server.ts:2668-2703)

```ts
// server.ts:2684-2686
const hasApprovedRealBio = !!bio && !isGenericSource(bio.lastSource) &&
  (bio.statusLong === 'approved' || bio.statusShort === 'approved');
```

**Logic: OR** — `hasApprovedRealBio` is true when EITHER size is approved (and source is non-generic).

This feeds the `'approved'` / `'pending'` / `'youth'` / `'needed'` state machine:

```ts
// server.ts:2698
if (hasApprovedRealBio && !hasUnpromotedRealDraft) return 'approved';
```

**Consumers:**
- Dashboard media tab: `animal.bioState` returned from `/api/dashboard/animals` (`server.ts:1255`), used by the bioState filter buttons (`dashboard/index.html:7007-7012`) and counts (`6979-6981`)
- Dashboard profiles tab: `animal.bioState` from `/api/profiles/summary` (`server.ts:1368`), used for profile table rendering and filtering (`dashboard/index.html:15648-15705`)

### 2C. WordPress/external consumers — per-size flags (server.ts:2542-2587)

```ts
// server.ts:2542-2545
long_approved: bio.statusLong === 'approved',
short_approved: bio.statusShort === 'approved',
```

**Logic: CORRECT** — WordPress gets per-size approval flags, no animal-level rollup. WordPress can (and does) use whichever size is approved independently.

---

## 3. AND vs OR Classification

| Computation | Location | Logic | Classification |
|---|---|---|---|
| `bioStatus` | server.ts:1210 | `statusLong === 'approved' \|\| statusShort === 'approved'` | **(b) OR — either flips it** |
| `computeBioState()` | server.ts:2686 | `statusLong === 'approved' \|\| statusShort === 'approved'` | **(b) OR — either flips it** |
| WordPress API | server.ts:2542-2587 | per-size flags, no rollup | **(d) N/A — no rollup** |
| `resolveBioText()` | server.ts:2718-2738 | per-size checks independently | **(d) N/A — per-size** |
| Matcher bio resolution | server.ts:5913-5915 | per-size checks independently | **(d) N/A — per-size** |

The **two animal-level computations** (`bioStatus` and `computeBioState`) both use **OR logic**.

---

## 4. All Consumers of Animal-Level Bio Status

### `bioStatus` (OR, server.ts:1210)
1. **Media-tab animal card badge** — `dashboard/index.html:7247-7275` — shows "Bio: Approved" / "Bio: SM" / "Bio: None"

### `computeBioState()` (OR, server.ts:2668)
1. **Media-tab bioState filter** — `dashboard/index.html:7007-7012` — filter by approved/pending/youth/needed
2. **Media-tab species counts** — `dashboard/index.html:6979-6981` — count of animals with approved bios per species
3. **Profiles-tab bioState column** — `dashboard/index.html:15705` — shows bio state per animal
4. **Profiles-tab bioState filter** — `dashboard/index.html:15648` — filter by bio state
5. **Profiles-tab bioState sort** — `dashboard/index.html:15653-15666` — sort by bio state precedence

### Per-size (correct, no rollup)
1. **WordPress `/api/bios/approved`** — server.ts:2542 — `long_approved` / `short_approved` flags
2. **WordPress `/api/bios/:animalId`** — server.ts:2584 — same per-size flags
3. **`resolveBioText()`** — server.ts:2718-2738 — picks approved long/short independently for public display
4. **Matcher** — server.ts:5913-5915 — picks approved long/short independently
5. **Per-size panel badges** — dashboard/index.html:7721, 7749 — individual Pending Draft / Approved and Public

### Is there ONE canonical function?

**No.** There are two separate computations:
- `bioStatus` (inline, server.ts:1209-1215) — simpler, feeds only the media card badge
- `computeBioState()` (function, server.ts:2668) — richer state machine, feeds filters/profiles

Both use OR independently. They are **not** a single source of truth — they compute overlapping but different things (bioStatus has `none`/`sm`/`draft`/`approved`; bioState has `approved`/`pending`/`youth`/`needed`).

---

## 5. The Gap

### Current state: **OR logic, not AND**

Both animal-level computations flip to "approved" when **either** size is approved. Neither enforces the rule that **both** must be approved.

### Exact code that's wrong

**Site 1 — `bioStatus`** (server.ts:1210):
```ts
if (bio && (bio.statusLong === 'approved' || bio.statusShort === 'approved')) {
```
Should be `&&` for both-approved rule.

**Site 2 — `computeBioState()`** (server.ts:2686):
```ts
const hasApprovedRealBio = !!bio && !isGenericSource(bio.lastSource) &&
  (bio.statusLong === 'approved' || bio.statusShort === 'approved');
```
Should be `&&` for both-approved rule.

### Where the fix belongs

Two sites need the same change (`||` → `&&`). However, there's a **design consideration**:

The OR logic may be **intentionally permissive** in some contexts. For example:
- An animal might have an approved long bio but no short bio at all (empty string). Requiring both would mark it as "not approved" even though the only bio it has IS approved.
- `computeBioState()` feeds the filter that shows which animals still need work. Changing to AND would cause animals with one approved size to show as "pending"/"needed" — which is arguably correct if the goal is "both must be approved before the animal is considered bio-complete."

The fix should handle the case where a size has no content (empty bio text). The rule "both approved" should mean "both non-empty sizes approved" — if a size is empty, it doesn't block the other's approval status. OR the rule could be strict: both must exist AND be approved. This is a product decision.

### If the rule is strict (both must be approved):

1. `server.ts:1210` — change `||` to `&&`
2. `server.ts:2686` — change `||` to `&&`

### If the rule is "both non-empty sizes must be approved":

1. `server.ts:1210` — `(bio.statusLong === 'approved' || !bio.bioEnLong) && (bio.statusShort === 'approved' || !bio.bioEnShort) && (bio.statusLong === 'approved' || bio.statusShort === 'approved')`
2. `server.ts:2686` — same pattern

---

## 6. Draft vs Approved — Field Clarification

### The promotion lifecycle

1. **Generate/Regenerate** → writes to `animal_bio_drafts` with `promoted_long = 0` / `promoted_short = 0` (pending draft)
2. **Approve in panel** → calls `approveBio()` on the dashboard, which calls `/api/bio/draft/:shelterCode/promote/:size`
3. **`promoteDraftSize()`** (`localDatabase.ts:1928`) → copies draft content to `animal_bios` via INSERT ON CONFLICT, setting `status_long = 'approved'` (or `status_short`), and marks `promoted_long = 1` (or `promoted_short`) on the draft

### What "approved" means at the animal level

A size is "approved" when its `status_long` / `status_short` = `'approved'` in the **`animal_bios`** table (not the drafts table). The `promoted_long`/`promoted_short` flags on `animal_bio_drafts` track whether the draft has been pushed to `animal_bios`, but the **status** fields on `animal_bios` are the authoritative approval flags.

The `computeBioState()` function reads `bio.statusLong` / `bio.statusShort` from `animal_bios` (passed as the `bio` parameter). It also reads `draft.promotedLong` / `draft.promotedShort` from `animal_bio_drafts` to detect unpromoted real drafts (which force the state to `'pending'` even if a bio is approved — ensuring pending drafts are visible).

### For the AND-rule fix

The fix should check `status_long` and `status_short` on `animal_bios` — these are the fields that both `bioStatus` and `computeBioState()` already read. The draft flags (`promoted_long`/`promoted_short`) are only relevant for the "pending" override in `computeBioState()`.

---

*End of diagnosis.*
