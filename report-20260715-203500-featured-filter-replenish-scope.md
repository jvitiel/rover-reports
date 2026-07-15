# Featured Six — Filter & Replenishment Scoping

**Date:** 2026-07-15 20:35 UTC  
**Type:** Read-only scoping (no changes made)  
**Basis:** report-20260715-161400-featured-six-unknown.md

---

## PART 1: THE FILTER

### 1. readQueuesFromDb() — Full Listing and Edit Point

**File:** `featuredRotation.ts`, lines 378–404 [VERIFIED with code]

```typescript
export async function readQueuesFromDb(): Promise<Record<'cat' | 'dog' | 'small', EditionAnimal[]>> {
  const db = getDatabase();
  const rows = db.prepare(
    'SELECT species, shelter_code, position, date_available FROM featured_rotation_queue ORDER BY species, position'
  ).all() as Array<{ species: string; shelter_code: string; position: number; date_available: string }>;

  // Fetch live animals for name lookup
  const animals = await fetchAnimals();
  const nameMap = new Map(animals.map(a => [a.shelterCode, a.name]));
  const now = Date.now();

  const queues: Record<'cat' | 'dog' | 'small', EditionAnimal[]> = { cat: [], dog: [], small: [] };

  for (const row of rows) {
    const bucket = row.species as 'cat' | 'dog' | 'small';
    if (!queues[bucket]) continue;
    const parsed = new Date(row.date_available);
    const daysListed = isNaN(parsed.getTime()) ? 0 : Math.floor((now - parsed.getTime()) / (24 * 60 * 60 * 1000));
    queues[bucket].push({                           // <-- EDIT POINT
      shelterCode: row.shelter_code,
      name: nameMap.get(row.shelter_code) || '(unknown)',   // line ~397
      species: bucket,
      daysListed,
      position: row.position,
    });
  }

  return queues;
}
```

**Exact edit point:** The `for (const row of rows)` loop body, at the point where it unconditionally pushes every row into `queues[bucket]`. The filter goes here: before the `.push()`, check `if (!nameMap.has(row.shelter_code)) continue;` — this skips any queue entry whose `shelter_code` is absent from the live SM adoptable set. The `nameMap` is already built from `fetchAnimals()` (adoptable-only), so presence in `nameMap` is a reliable adoptable-status proxy.

The `'(unknown)'` fallback on line ~397 becomes dead code after the filter (since we skip before reaching it), but can be left as a safety net or removed.

### 2. Self-Adjustment Confirmation

**Verdict: The window math self-adjusts with no other changes needed.** [VERIFIED with code]

The downstream consumers of the filtered queues:

| Consumer | Uses queue length? | Uses `.position`? | Behavior on shorter list |
|---|---|---|---|
| `getWindowForWeek()` (line 350) | Yes: `offset = (perWeek * weekIndex) % (q.length \|\| 1)` | No — uses array index via `sliceWrapping` | ✅ Self-adjusts: modulo of smaller length = tighter wrap |
| `sliceWrapping()` (line 340) | Yes: `arr[(offset + i) % arr.length]` | No | ✅ Self-adjusts: wraps around shorter array |
| `computeEditionWindows()` (line 364) | No — delegates to `getWindowForWeek` | No | ✅ Passthrough |
| `renderAnimalRow()` (line 410) | No | No — renders `name`, `species`, `shelterCode`, `daysListed` | ✅ No change needed |
| `renderEditionEmailHtml()` (line 420) | No | No | ✅ No change needed |
| `last_featured_at` stamp (server.ts:13427) | No — maps `edition.currentSix` shelter codes | No | ✅ Stamps whatever is in currentSix — see §4 |

**Nothing reads the DB `position` column after `readQueuesFromDb()`.** The `position` field is stored in `EditionAnimal` but is never used by the windowing functions (they use array index), never rendered in the email HTML, and never used in the stamp logic. The DB column `position` is read into the struct at line 400 but is inert downstream. [VERIFIED]

**Nothing else reads queue length** outside of `getWindowForWeek()`. The edition number is computed from `featured_rotation_state.anchor_instant` and wall-clock time (server.ts:13408) — it has no dependency on queue size.

### 3. Edge Case — Underfill

**If a species queue drops below its slot count, `sliceWrapping` DUPLICATES entries via wrap-around.** [VERIFIED with code]

```typescript
function sliceWrapping(arr: EditionAnimal[], offset: number, count: number): EditionAnimal[] {
  if (arr.length === 0) return [];
  const result: EditionAnimal[] = [];
  for (let i = 0; i < count; i++) {
    result.push(arr[(offset + i) % arr.length]);
  }
  return result;
}
```

Behavior by queue size:

| Live queue size | Slot count | Behavior |
|---|---|---|
| ≥ slots (normal) | — | Picks `slots` distinct animals |
| 1 cat, slots=3 | 3 | Same cat appears 3 times in the email |
| 0 cats | 3 | Returns `[]` (the `arr.length === 0` guard) — 0 cats in email, total < 6 |
| 2 cats, slots=3 | 3 | 2 distinct + 1 duplicate (the first wraps) |

**Current live counts (post-filter):**

| Species | Queue total | Live (adoptable) | Dead (non-adoptable) | Post-filter count | Slots | Headroom |
|---|---|---|---|---|---|---|
| cat | 21 | 18 | 3 | 18 | 3 | 15 (safe) |
| dog | 35 | 30 | 5 | 30 | 2 | 28 (safe) |
| small | 20 | 20 | 0 | 20 | 1 | 19 (safe) |

Not imminent for any species. Duplication would only occur if a species queue drains to < 3 (cat), < 2 (dog), or < 1 (small) live entries.

**Email rendering with < 6:** The `renderSection()` function handles arbitrary-length arrays and renders whatever it receives. An empty array produces `"(none)"` text. There is no hard assertion that exactly 6 animals are present. The email would render sanely but with fewer rows. [VERIFIED with code — renderSection line 416]

### 4. Stamp Correctness

**The stamp logic is unaffected by filtering.** [VERIFIED with code]

Server.ts line 13427:
```typescript
const featuredCodes = edition.currentSix.map((a: any) => a.shelterCode);
if (featuredCodes.length > 0) {
  const placeholders = featuredCodes.map(() => '?').join(',');
  db.prepare(`UPDATE featured_rotation_queue SET last_featured_at=? WHERE shelter_code IN (${placeholders})`)
    .run(new Date().toISOString(), ...featuredCodes);
}
```

This stamps `currentSix` — the animals that were featured *last* week. With filtering:

- `currentSix` will only contain live/adoptable animals (dead ones were filtered out of the queue arrays before windowing)
- The UPDATE targets `shelter_code IN (...)` — it will match the rows in `featured_rotation_queue` (they're still in the DB table, just not in the in-memory filtered array)
- No dead animal can appear in `currentSix`, so no dead row gets stamped — correct behavior
- If an animal was alive last week and adopted this week, it won't appear in this week's `currentSix` (filtered out) — the stamp simply doesn't fire for it. This is acceptable: the animal is gone.

### 5. All Three Sections Confirmed

**Yes — one filter in `readQueuesFromDb()` fixes all three email sections.** [VERIFIED with code]

The call chain is:

```
runWeeklyFeaturedEmail()
  → readQueuesFromDb()           ← FILTER GOES HERE (one place)
  → computeEditionWindows(queues, currentEdition)
      → getWindowForWeek(queues, weekIndex - 1)  → currentSix ("Currently Featured")
      → getWindowForWeek(queues, weekIndex)       → newSix ("Swap In Now")
      → getWindowForWeek(queues, weekIndex + 1)   → nextSix ("Coming Next Week")
  → renderEditionEmailHtml(edition)
```

All three sections consume the same `queues` object returned by `readQueuesFromDb()`. A filter applied there propagates to all three windows. No section has an independent data path.

The test endpoint `POST /api/dashboard/featured-rotation/test-four-editions` (server.ts:13184) also calls `readQueuesFromDb()` and would equally benefit from the filter. [VERIFIED]

---

## PART 2: REPLENISHMENT

### 6. Seed Criteria

**File:** `featuredRotation.ts`, lines 246–280 (`insertSeedQueues`) and lines 69–135 (`computeSeedQueues`)  [VERIFIED with code]

`insertSeedQueues()` full listing:

```typescript
export async function insertSeedQueues(): Promise<InsertResult> {
  const db = getDatabase();

  // Guard: refuse if queue is not empty
  const existing = (db.prepare('SELECT COUNT(*) as cnt FROM featured_rotation_queue').get() as { cnt: number }).cnt;
  if (existing > 0) {
    return { inserted: { cat: 0, dog: 0, small: 0 }, total: 0, refused: true,
             refuseReason: `queue already has ${existing} rows — aborting seed` };
  }

  const result = await computeSeedQueues();
  const now = new Date().toISOString();

  const insertStmt = db.prepare(`
    INSERT INTO featured_rotation_queue (species, shelter_code, position, date_available, added_at, last_featured_at)
    VALUES (?, ?, ?, ?, ?, NULL)
  `);

  const insertAll = db.transaction(() => {
    for (const bucket of ['cat', 'dog', 'small'] as const) {
      for (const entry of result.queues[bucket]) {
        insertStmt.run(bucket, entry.shelterCode, entry.position, entry.dateAvailable, now);
      }
    }
  });

  insertAll();

  return {
    inserted: { cat: result.queues.cat.length, dog: result.queues.dog.length, small: result.queues.small.length },
    total: result.queues.cat.length + result.queues.dog.length + result.queues.small.length,
    refused: false,
  };
}
```

**Seeding criteria** (from `computeSeedQueues()`):

1. **Source:** `fetchAnimals()` — SM API, adoptable only (`ADOPTABLE===1`)
2. **Species bucketing:** `normalizeSpecies()` — dogs → `dog`, cats → `cat`, everything else → `small`
3. **Threshold:** `dateAvailableForAdoption` must be ≥ 45 days ago (same threshold for all species)
4. **Exclusions:** Animals with empty or unparseable `dateAvailableForAdoption` are skipped
5. **Sort order:** Per-species, **oldest-listed-first** (descending `daysListed`), tiebreak by `dateAvailable` ASC then `shelterCode` ASC
6. **Position assignment:** Sequential 1..N per species after sort — so position 1 = longest-waiting animal in that species

### 7. Current Queue Composition + Backlog

**Queue composition:** [VERIFIED with SELECT + API]

| Species | Total entries | Live (adoptable) | Dead (non-adoptable) | date_available range |
|---|---|---|---|---|
| cat | 21 | 18 | 3 | 2023-12-05 → 2026-05-05 |
| dog | 35 | 30 | 5 | 2023-10-13 → 2026-04-20 |
| small | 20 | 20 | 0 | 2023-10-22 → 2026-03-26 |
| **Total** | **76** | **68** | **8** | |

**Currently-adoptable animals qualifying under seed criteria (≥ 45 days listed) but NOT in the queue:** [VERIFIED with API + SELECT]

| Species | Qualifying backlog | Animals |
|---|---|---|
| cat | 7 | S2026353 Squeaky (62d), S20251236 Blizzard (60d), S20241161 Munster (60d), S2026291 Rosie Cotton (55d), S2026440 Leafs (48d), S2026441 Sharky (48d), S2026446 Eggo (47d) |
| dog | 2 | S2026345 Maya (54d), A2025114 Rex (47d) |
| small | 1 | S2026403 Fluffy (60d) |
| **Total** | **10** | |

These 10 animals have crossed the 45-day threshold since the queue was seeded on 2026-06-26 but have never been added. Under the current design, they will never enter the rotation.

### 8. What Replenishment Would Touch

**A. Insert path:**

`insertSeedQueues()` is **NOT reusable** for replenishment — the `COUNT(*) > 0` guard (line 251) refuses to run if the queue has any rows. A replenishment function would need either:
- A new function that appends to the existing queue (no count guard)
- Or removal of the guard (but this risks full re-seed if called incorrectly)

The `UNIQUE INDEX idx_frq_shelter_code` on `featured_rotation_queue(shelter_code)` prevents duplicate entries, so an INSERT of an already-queued animal would fail safely. [VERIFIED with schema]

**B. Position assignment:**

Two options exist, each with different rotation behavior:

1. **Append to end:** New entries get `position = MAX(position) + 1` within their species. They enter at the back of the rotation and won't be featured until the window wraps around. This preserves existing rotation order.

2. **Re-sort by oldest-waiting:** Recompute all positions by `date_available` (matching the original seed sort). This would shuffle existing entries and potentially change which animals appear in upcoming editions. It would also invalidate the `featured_rotation_state.last_sent_edition` cursor indirectly — the same edition number would now select different animals than the ones shown in the "Coming Next Week" preview.

**However**, `position` is inert downstream (see §2 — windowing uses array index, not DB `position`). Since `readQueuesFromDb()` `ORDER BY species, position`, the DB `position` column controls the in-memory array order. New entries appended with higher positions would land at the end of each species array, which is where `sliceWrapping` will eventually reach them.

**C. Does a growing queue break the anchor/edition math?**

**No.** [VERIFIED with code] The edition number is purely time-based:
```typescript
const currentEdition = Math.floor((nowMs - anchorMs) / (7 * 24 * 60 * 60 * 1000));
```
It depends only on `anchor_instant` and wall-clock time, not on queue length.

However, the **wrap cadence changes** when queue length changes. Currently cats wrap every 7 editions (21 ÷ 3). Adding 7 cats makes it 28 entries → wraps every ~9.3 editions. This means:
- Animals cycle through the rotation more slowly
- The "Coming Next Week" preview in one email may not match "Swap In Now" in the next email if entries were added between sends (the preview computed with old queue length, the actual send with new queue length)

This preview inconsistency is minor but real. It would happen at most once per replenishment.

**D. `last_featured_at` as ordering signal:**

The column exists on every queue row (NULL if never featured, ISO timestamp if featured). A replenishment or re-ordering function could use it for "least-recently-featured" prioritization:
- `ORDER BY last_featured_at ASC NULLS FIRST, date_available ASC` — unfeatured animals go first, then oldest-featured
- This would replace the static `position` column as the ordering axis

Constraint: `readQueuesFromDb()` currently `ORDER BY species, position`. Switching to `last_featured_at`-based ordering would change rotation behavior for all existing entries, not just new ones. The `position` column would need to either be kept in sync or abandoned.

### 9. Existing Jobs That Could Host Replenishment

**Seven scheduled jobs exist in server.ts:** [VERIFIED with code]

| Job | Schedule | Fetches SM data? | Suitable? |
|---|---|---|---|
| `scheduleActivityAutoClose` | 11:55 PM ET daily | No | ❌ Unrelated |
| `scheduleNightlySMPhotoSync` | 2:00 AM ET daily | Yes (photo-specific) | ⚠️ Tangential |
| `scheduleMidnightFeedingJob` | Midnight ET daily | No | ❌ Unrelated |
| `scheduleDailyAdoptableCheck` | 9:00 AM ET daily | **Yes** (`fetchAnimals({includeUnavailable: true})`) | ✅ Best candidate |
| `scheduleGenericBioJob` | 1:30 PM UTC daily | **Yes** (`fetchAnimals()`) | ✅ Also viable |
| `scheduleDailySearcherSnapshot` | Midnight ET daily | No | ❌ Unrelated |
| `scheduleWeeklyFeaturedEmail` | Wed 4 PM ET weekly | **Yes** (via `readQueuesFromDb`) | ⚠️ Could piggyback, but runs weekly not daily |

**Best candidate: `scheduleDailyAdoptableCheck`** (9 AM ET daily). It already:
- Fetches the full SM animal set (including unavailable)
- Has stale-row pruning logic (it prunes `adoptable_status_snapshot` for removed animals)
- Runs daily, so new 45-day qualifiers would be caught within 24 hours
- Fires at a reasonable time (not during heavy load periods)

**Second candidate: `scheduleGenericBioJob`** (1:30 PM UTC daily). It calls `fetchAnimals()` (adoptable-only) and processes new animals. Same daily cadence. Less ideal because it uses adoptable-only fetch (same as the queue's original seed), while `scheduleDailyAdoptableCheck` has the full animal set which could also support dead-entry detection.

**Neither job currently touches `featured_rotation_queue`.** A replenishment function would need to be written and called from within one of these jobs. No existing job has queue-management logic that can be reused.

**Alternative: new dedicated job.** A standalone `scheduleQueueReplenishment()` following the same setTimeout-chain pattern used by all other jobs. Advantage: no coupling to unrelated job logic. Disadvantage: another scheduler to maintain.

---

*Read-only scoping. No changes made. No queue entries modified.*
