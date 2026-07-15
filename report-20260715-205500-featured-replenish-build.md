# Featured Six — Queue Replenishment Build Report

**Date:** 2026-07-15 20:55 UTC  
**Type:** Implementation  
**Commit:** 92ef28b  
**Files changed:** server/src/featuredRotation.ts (new function), server/src/server.ts (import + call site)

---

## New Function: replenishQueues()

```typescript
export async function replenishQueues(): Promise<ReplenishResult> {
  const db = getDatabase();
  const animals = await fetchAnimals(); // adoptable-only, same source as seed
  const now = Date.now();
  const nowIso = new Date().toISOString();

  // Existing shelter_codes in queue
  const existingRows = db.prepare('SELECT shelter_code FROM featured_rotation_queue').all() as Array<{ shelter_code: string }>;
  const existingCodes = new Set(existingRows.map(r => r.shelter_code));

  // Find qualifying animals not yet in queue, bucketed and sorted oldest-first
  const newBySpecies: Record<'cat' | 'dog' | 'small', Array<{ shelterCode: string; dateAvailable: string; daysListed: number }>> = {
    cat: [], dog: [], small: [],
  };

  for (const animal of animals) {
    if (existingCodes.has(animal.shelterCode)) continue;

    const raw = animal.dateAvailableForAdoption;
    if (!raw) continue;
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) continue;

    const daysListed = Math.floor((now - parsed.getTime()) / (24 * 60 * 60 * 1000));
    const bucket = normalizeSpecies(animal.species);
    if (daysListed < LONGSTAY_THRESHOLD_DAYS[bucket]) continue;

    newBySpecies[bucket].push({
      shelterCode: animal.shelterCode,
      dateAvailable: raw.split('T')[0],
      daysListed,
    });
  }

  // Sort each bucket oldest-first (same order as seed)
  for (const bucket of ['cat', 'dog', 'small'] as const) {
    newBySpecies[bucket].sort((a, b) => {
      if (b.daysListed !== a.daysListed) return b.daysListed - a.daysListed;
      if (a.dateAvailable !== b.dateAvailable) return a.dateAvailable.localeCompare(b.dateAvailable);
      return a.shelterCode.localeCompare(b.shelterCode);
    });
  }

  // Get current MAX(position) per species
  const maxPos: Record<string, number> = {};
  for (const bucket of ['cat', 'dog', 'small'] as const) {
    const row = db.prepare('SELECT MAX(position) as mp FROM featured_rotation_queue WHERE species = ?').get(bucket) as { mp: number | null };
    maxPos[bucket] = row.mp ?? 0;
  }

  const added: Record<'cat' | 'dog' | 'small', number> = { cat: 0, dog: 0, small: 0 };
  const details: ReplenishResult['details'] = [];

  const insertStmt = db.prepare(`
    INSERT INTO featured_rotation_queue (species, shelter_code, position, date_available, added_at, last_featured_at)
    VALUES (?, ?, ?, ?, ?, NULL)
  `);

  const insertAll = db.transaction(() => {
    for (const bucket of ['cat', 'dog', 'small'] as const) {
      for (const entry of newBySpecies[bucket]) {
        maxPos[bucket]++;
        try {
          insertStmt.run(bucket, entry.shelterCode, maxPos[bucket], entry.dateAvailable, nowIso);
          added[bucket]++;
          details.push({ shelterCode: entry.shelterCode, species: bucket, position: maxPos[bucket], dateAvailable: entry.dateAvailable });
        } catch (err: any) {
          // UNIQUE constraint violation = already queued (idempotent skip)
          if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || err?.message?.includes('UNIQUE')) {
            maxPos[bucket]--; // don't consume the position
            continue;
          }
          throw err; // re-throw unexpected errors
        }
      }
    }
  });

  insertAll();

  const total = added.cat + added.dog + added.small;
  console.log(`[Featured Replenish] Added ${total} new animals (cat=${added.cat}, dog=${added.dog}, small=${added.small})`);

  return { added, total, details };
}
```

---

## Call Site (server.ts — inside runAdoptableStatusCheck)

```typescript
  pruneTx();

  // Replenish featured rotation queue with newly-qualifying long-stay animals
  try {
    await replenishQueues();
  } catch (replenishErr) {
    console.error('[Adoptable Alert] Featured queue replenishment failed (non-fatal):', replenishErr);
  }

  return {
    baselineSeeded: false,
    ...
  };
```

The try/catch ensures a replenishment failure cannot break the adoptable check — it logs and continues. [VERIFIED with code]

---

## Verification

### 1. tsc clean + restart

- `npx tsc --noEmit`: exit 0 [VERIFIED]
- `npm run build`: exit 0 [VERIFIED]
- `systemctl restart shelter-app`: active [VERIFIED]

### 2. BEFORE — baseline counts

```
cat|21|21    (21 entries, max position 21)
dog|35|35    (35 entries, max position 35)
small|20|20  (20 entries, max position 20)
Total: 76
```
[VERIFIED with SELECT]

### 3. First run — 10 animals added

Output:
```
[Featured Replenish] Added 10 new animals (cat=7, dog=2, small=1)
```

### 4. AFTER — per-species counts + new rows

```
cat|28|28    (was 21, +7)
dog|37|37    (was 35, +2)
small|21|21  (was 20, +1)
Total: 86
```
[VERIFIED with SELECT]

**New rows added (all appended at end of species queue):**

| shelter_code | species | position | date_available | days_listed |
|---|---|---|---|---|
| S2026353 (Squeaky) | cat | 22 | 2026-05-14 | 62 |
| S20241161 (Munster) | cat | 23 | 2026-05-15 | 61 |
| S20251236 (Blizzard) | cat | 24 | 2026-05-15 | 61 |
| S2026291 (Rosie Cotton) | cat | 25 | 2026-05-21 | 55 |
| S2026440 (Leafs) | cat | 26 | 2026-05-28 | 48 |
| S2026441 (Sharky) | cat | 27 | 2026-05-28 | 48 |
| S2026446 (Eggo) | cat | 28 | 2026-05-29 | 47 |
| S2026345 (Maya) | dog | 36 | 2026-05-22 | 54 |
| A2025114 (Rex) | dog | 37 | 2026-05-29 | 47 |
| S2026403 (Fluffy) | small | 21 | 2026-05-16 | 60 |

Each position = old MAX + 1 (incrementing). Sorted oldest-listed-first within each species. [VERIFIED]

### 5. Idempotency proof — second run adds ZERO

```
[Featured Replenish] Added 0 new animals (cat=0, dog=0, small=0)
```

Total remains 86. No duplicates, no errors. [VERIFIED]

### 6. Existing rows untouched

Compared original 76 rows (species + position + shelter_code) before and after:

```
diff /tmp/frq_before.txt /tmp/frq_after_orig_only.txt
IDENTICAL — original 76 rows positions untouched
```

No renumbering, no reordering. [VERIFIED]

### 7. Dead entries still present + still filtered

- 8 dead entries still in DB: `SELECT COUNT(*) ... WHERE shelter_code IN (8 dead codes)` = **8** [VERIFIED]
- Dead codes are NOT adoptable → they fail `fetchAnimals()` lookup → they never qualify for replenishment (they can't re-enter)
- The 8f251b4 filter in `readQueuesFromDb()` still filters them from the in-memory queues [VERIFIED — dead codes not in filtered output]

### 8. Sanity — edition computation with new queue

```
Filtered queue sizes: cat=25, dog=32, small=21
New animals in filtered queues: 10/10
Edition 1 newSix: Lucky, Lupa, Dante, Nanook, Leo (Petey), Butterscotch
Unknowns in edition 1: 0
```

All 10 new animals present in filtered queues. Edition renders 6 live animals with real names, zero unknowns across all 3 sections. [VERIFIED]

---

## What's NOT changed

- `insertSeedQueues()` — untouched, COUNT>0 guard intact
- `computeEditionWindows` / `getWindowForWeek` / `sliceWrapping` — untouched
- `last_featured_at` stamp logic — untouched
- Dead-animal filter (commit 8f251b4) — untouched
- Email rendering / schedule — untouched

---

*Implementation complete. Commit 92ef28b.*
