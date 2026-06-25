# Bio Source Badge Disappears on Regenerate — Diagnosis

**Date:** 2026-06-25  
**Type:** Read-only diagnosis  
**Status:** Root cause identified — STATE bug in `saveAnimalBioDraftSize`

---

## 1. Panel Render — Baseline Badge Population

**File:** `dashboard/index.html:7696-7707` — `sourceLabel()` helper and source value resolution  
**File:** `dashboard/index.html:7722` — long bio SOURCE badge render  
**File:** `dashboard/index.html:7750` — short bio SOURCE badge render  
**File:** `dashboard/index.html:7720` — STATUS badge render

### SOURCE badge

The source badge is driven by `draft.sourceLong` / `draft.sourceShort` (when showing a draft) or `bio.sourceLong` / `bio.sourceShort` (when showing approved bio):

```js
// dashboard/index.html:7706-7707
const srcLabelLong = sourceLabel(useDraftLong && draft ? draft.sourceLong : (bio ? bio.sourceLong : null));
const srcLabelShort = sourceLabel(useDraftShort && draft ? draft.sourceShort : (bio ? bio.sourceShort : null));
```

The `sourceLabel()` helper maps the stored origin values to display labels:

```js
// dashboard/index.html:7696-7704
function sourceLabel(source) {
  if (!source) return null;
  const labels = {
    youth_generic: 'Generic - Youth',
    adult_generic: 'Generic - Adult',
    from_profile: 'Derived from Profile',
    from_sm: 'Derived from SM Comment',
  };
  return labels[source] || null;
}
```

The badge renders conditionally — if `srcLabelLong` is null, it's omitted entirely:

```js
// dashboard/index.html:7722
${srcLabelLong ? `<span class="bio-source">${srcLabelLong}</span>` : ''}
```

### STATUS badge

Driven by `displayStatusLong` / `displayStatusShort`, rendered unconditionally:

```js
// dashboard/index.html:7720
<span class="bio-status ${displayStatusLong}">${displayStatusLong === 'approved' ? 'Approved and Public' : 'Pending Draft'}</span>
```

### On initial load

Both `data` (from `animal_bios`) and `draft` (from `animal_bio_drafts`) are fetched. Both tables have `source_long` and `source_short` columns. The full-generate path (`saveAnimalBioDraft`) writes both columns, so they're populated on initial load.

---

## 2. Regenerate Path — Frontend

**File:** `dashboard/index.html:7823-7843` — `regenerateBio()` handler

```js
// dashboard/index.html:7823-7843
async function regenerateBio(animalId, size) {
  if (!confirm(`Regenerate ${size} bio? ...`)) return;
  const btn = document.getElementById(`bio-regen-${size}-${animalId}`);
  // ... spinner ...
  try {
    const shelterCode = getShelterCodeForBio(animalId);
    const response = await fetch(`${API_BASE}/bio/${shelterCode}/regenerate/${size}`, { method: 'POST' });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to regenerate');
    bioCache.set(animalId, { data: result.data, draft: result.draft || null });
    renderBioContent(animalId, bioCache.get(animalId));
  } catch (error) { ... }
}
```

**What it updates:** It replaces the *entire* bioCache entry with the response's `data` + `draft`, then calls `renderBioContent()` which rebuilds the full panel `innerHTML` — both badges, textareas, buttons, everything. This is a **full re-render**, not a surgical status-only update.

**Key point:** The frontend re-render is NOT the problem. It renders both badges. But if `draft.sourceLong` (or `draft.sourceShort`) is null in the response, the conditional `${srcLabelLong ? ... : ''}` emits nothing — the badge element is simply not created.

---

## 3. Regenerate Path — Backend Response

**File:** `server/src/server.ts:2203-2270` — regenerate endpoint

```ts
// server.ts:2264
saveAnimalBioDraftSize(shelterCode, size as 'long' | 'short', bioEn, bioEs,
  size === 'long' ? 'regenerate_long' : 'regenerate_short');

// server.ts:2266
res.json({ success: true, data: getAnimalBio(shelterCode), draft: getAnimalBioDraft(shelterCode) });
```

The response includes BOTH `data` (animal_bios row) and `draft` (animal_bio_drafts row). The response shape carries `sourceLong` and `sourceShort` fields — **if they're in the DB row**. The `getAnimalBioDraft` / `rowToAnimalBioDraft` function reads them:

```ts
// localDatabase.ts:1793
sourceLong: (row.source_long as string) || null,
sourceShort: (row.source_short as string) || null,
```

So the response **would** carry the source fields — but only if the DB row has them populated.

---

## 4. The Source Value After Regenerate — DB Write

**File:** `server/src/localDatabase.ts:1849-1916` — `saveAnimalBioDraftSize()`

This is the smoking gun. Compare the two draft-save functions:

### `saveAnimalBioDraft()` (full generate) — WRITES source_long/source_short ✅

```ts
// localDatabase.ts:1826-1847
database.prepare(`
  INSERT INTO animal_bio_drafts (
    id, shelter_code, generated_at,
    bio_en_long, bio_es_long, bio_en_short, bio_es_short,
    promoted_long, promoted_short, last_source, source_long, source_short
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
  ON CONFLICT(shelter_code) DO UPDATE SET
    ...
    source_long = excluded.source_long,
    source_short = excluded.source_short
`).run(newId, shelterCode, now, ..., meta.source, origin, origin);
```

### `saveAnimalBioDraftSize()` (regenerate) — NEVER WRITES source_long/source_short ❌

```ts
// localDatabase.ts:1901-1915
database.prepare(`
  INSERT INTO animal_bio_drafts (
    id, shelter_code, generated_at,
    bio_en_long, bio_es_long, bio_en_short, bio_es_short,
    promoted_long, promoted_short, last_source
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(shelter_code) DO UPDATE SET
    generated_at = excluded.generated_at,
    bio_en_long = excluded.bio_en_long,
    bio_es_long = excluded.bio_es_long,
    bio_en_short = excluded.bio_en_short,
    bio_es_short = excluded.bio_es_short,
    promoted_long = excluded.promoted_long,
    promoted_short = excluded.promoted_short,
    last_source = excluded.last_source
`).run(newId, shelterCode, now, enLong, esLong, enShort, esShort, promotedLong, promotedShort, source);
```

The column list has no `source_long`, no `source_short`. The ON CONFLICT UPDATE doesn't touch them either.

**On INSERT (new draft):** `source_long` and `source_short` default to NULL (no DEFAULT in schema).

**On UPDATE (existing draft):** The `ON CONFLICT DO UPDATE` doesn't mention `source_long`/`source_short`, so SQLite leaves them at their **previous values** — which would preserve them for the un-regenerated size, but the regenerated size's source column was never updated.

Wait — actually on `ON CONFLICT DO UPDATE`, columns not mentioned are left unchanged. So if there was a prior draft with `source_long = 'from_profile'` and you regenerate long, `source_long` would keep its old value. But on **INSERT** (no prior draft row), they're NULL.

**The deeper issue is that the function doesn't compute a new origin for the regenerated size.** The regenerate endpoint knows whether it used profile data (`merged` path → `from_profile`) or SM comment (`hasStaffSMComment` path → `from_sm`), but it only passes the action-vocabulary source (`regenerate_long` / `regenerate_short`) — it never passes origin-vocabulary (`from_profile` / `from_sm`). And `saveAnimalBioDraftSize` has no `mapSourceToOrigin` call and doesn't write the column.

**Summary of behavior:**

| Scenario | source_long/source_short after regen |
|---|---|
| Prior draft existed (ON CONFLICT UPDATE) | Old values preserved (unchanged) for BOTH sizes — the regenerated size keeps its stale origin, not recomputed |
| No prior draft (INSERT) | NULL for both → badges disappear |

So the bug manifests most clearly when there's no prior draft row, but even in the update case the regenerated size's origin isn't recomputed to reflect whether it used profile vs SM comment data for the new generation.

---

## 5. Pinpoint: The Drop

**Cause: STATE** — `saveAnimalBioDraftSize()` (`localDatabase.ts:1849-1916`) never writes `source_long` / `source_short` columns. On INSERT, they're NULL. On UPDATE, they're stale (not recomputed for the regenerated size). The response carries NULL for the regenerated size's source, and the frontend's conditional render `${srcLabelLong ? ... : ''}` correctly omits the badge because there's nothing to show.

The exact code causing the drop:

```ts
// localDatabase.ts:1901-1915 — the INSERT/UPDATE SQL
// Column list: id, shelter_code, generated_at, bio_en_long, bio_es_long,
//              bio_en_short, bio_es_short, promoted_long, promoted_short, last_source
// Missing: source_long, source_short
```

And the upstream caller doesn't pass origin information:

```ts
// server.ts:2263-2264
saveAnimalBioDraftSize(shelterCode, size as 'long' | 'short', bioEn, bioEs,
  size === 'long' ? 'regenerate_long' : 'regenerate_short');
```

The source parameter is `'regenerate_long'` / `'regenerate_short'` — an action-vocabulary value. Even if `saveAnimalBioDraftSize` tried to call `mapSourceToOrigin()`, these values aren't in the map and would return NULL.

---

## 6. Fix Direction (identify only — no implementation)

**Two changes needed:**

### A. Regenerate endpoint — pass the origin alongside the action source

In `server.ts:2263-2264`, the regenerate endpoint already knows whether it used profile (`merged` truthy → `from_profile`) or SM comment (`hasStaffSMComment` → `from_sm`). Pass this origin to `saveAnimalBioDraftSize`:

```
// server.ts ~line 2263
// Compute: const origin = merged ? 'from_profile' : 'from_sm';
// Pass origin as additional parameter
```

### B. `saveAnimalBioDraftSize` — write source_long/source_short

In `localDatabase.ts:1849`, add an `origin` parameter. In the SQL:
- Add `source_long` and `source_short` to the INSERT column list
- For the regenerated size's column, use the passed origin
- For the other size's column, preserve the existing value (from `existing.sourceLong`/`existing.sourceShort` or from the current bio)
- Add both to the ON CONFLICT UPDATE set

This mirrors what `saveAnimalBioDraft` already does — the per-size variant was simply built without the source columns that were added later.

**Location of fixes:**
1. `server/src/server.ts` ~line 2263 — compute and pass origin
2. `server/src/localDatabase.ts` ~line 1849-1916 — accept origin, write source_long/source_short

---

*End of diagnosis.*
