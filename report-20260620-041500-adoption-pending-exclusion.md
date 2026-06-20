# Adoption-Pending Exclusion Diagnosis — Custom-Search

**Date:** 2026-06-20 04:15 ET  
**Type:** READ-ONLY DIAGNOSIS  
**Source:** Code inspection + live DB query

---

## Answers

**(3) Can a pending animal currently surface in the searcher?** YES — **adoption_pending is NOT checked during pool construction.** The custom-search pool filter (server.ts:4497-4514) uses only `fetchAnimals()` (which filters on `ADOPTABLE === 1`) plus sex/age hard filters. There is zero reference to `adoption_pending` anywhere between pool construction and Phase-1 selection. A pending animal with `ADOPTABLE === 1` in SM enters the candidate pool, can be selected by Phase-1, and can be returned to an adopter. The `adoption_pending` flag is read ONLY at response assembly time (server.ts:5384-5393) to decorate the response with `adoptionPending: true` — it is never used to exclude. [VERIFIED]

**(1/2) Where does pending come from?** Dashboard-only. The flag lives in `animal_metadata.adoption_pending` (local SQLite). It is set via `PUT /api/animals/:shelterCode/adoption-pending` (server.ts:2942) → `setAdoptionPending()` (localDatabase.ts:2330) → `UPDATE animal_metadata SET adoption_pending = ? WHERE shelter_code = ?`. There is NO adoption_pending field in the SM API data — `normalizeAnimal()` (shelterManagerService.ts) does not read any pending/hold/reserved field. SM's `ADOPTABLE` flag is the only SM-sourced availability signal, and it does not reflect the dashboard's pending toggle. [VERIFIED]

**(5) Currently flagged:** **0 animals** have `adoption_pending = 1` as of this query. The feature is operationally available (button works, DB column exists, write path functional) but no animal is currently flagged. [VERIFIED]

---

## Detail

### 1. Adoption-Pending Write Path

**Dashboard button** → `PUT /api/animals/:shelterCode/adoption-pending` (server.ts:2942-2964):

```typescript
// server.ts:2941-2942
// PUT /api/animals/:shelterCode/adoption-pending — toggle adoption pending flag
app.put('/api/animals/:shelterCode/adoption-pending', async (req: Request, res: Response) => {
  const shelterCode = req.params.shelterCode as string;
  const { pending } = req.body || {};
  // ...
  const updated = setAdoptionPending(shelterCode, pending);
```

→ `setAdoptionPending()` (localDatabase.ts:2330-2334):

```typescript
export function setAdoptionPending(shelterCode: string, pending: boolean): boolean {
  const database = getDatabase();
  const result = database.prepare(
    'UPDATE animal_metadata SET adoption_pending = ? WHERE shelter_code = ?'
  ).run(pending ? 1 : 0, shelterCode);
  return result.changes > 0;
}
```

**Storage:** `animal_metadata.adoption_pending` column (INTEGER, default 0) in local SQLite. [VERIFIED]

### 2. SM Data — No Pending Field

`normalizeAnimal()` (shelterManagerService.ts:34-85) maps these SM fields:

```typescript
fivStatus: raw.COMBITESTED ...
felvStatus: raw.FLVRESULT ...
isAvailable: raw.ADOPTABLE === 1
```

There is no `adoption_pending`, `HOLD`, `RESERVED`, or equivalent field read from SM. The word "pending" does not appear anywhere in `shelterManagerService.ts`. [VERIFIED]

The SM `ADOPTABLE` flag reflects SM's own status logic (adopted = 0, foster-but-adoptable = 1, deceased = 0, etc.) but does NOT reflect the dashboard's pending toggle. These are independent systems:

| System | Field | Controls |
|--------|-------|----------|
| Shelter Manager API | `raw.ADOPTABLE` | Whether animal enters `fetchAnimals()` pool |
| Dashboard (local DB) | `animal_metadata.adoption_pending` | Badge decoration only (currently) |

Setting `adoption_pending = 1` on the dashboard does NOT change `ADOPTABLE` in SM. The animal remains in the pool. [VERIFIED]

### 3. Searcher Pool Construction — No Pending Check

The entire pool construction chain (server.ts:4497-4545):

```typescript
// server.ts:4497-4498 — Pool fetch
const allAnimals = await fetchAnimals();           // ADOPTABLE===1 only
const speciesPool = allAnimals.filter(a => { ... }); // species filter

// server.ts:4506-4514 — Hard filters
const filtered = speciesPool.filter(a => {
  const animalSex = (a.sex || '').toLowerCase();
  if (!sexLower.includes(animalSex)) return false;   // sex filter
  const bucket = deriveAgeGroup(a.ageInYears);
  if (ageLower.includes(bucket)) return true;         // age filter
  return false;
});

// server.ts:4516-4541 — Fallback (<3 candidates)
let withRecords = filtered;
```

**Zero references to `adoption_pending` in pool construction.** The only filters applied are:
1. `ADOPTABLE === 1` (inside `fetchAnimals()`)
2. Species match
3. Sex match
4. Age bucket match
5. Fallback (drops age if <3 candidates)

The `adoption_pending` flag is read much later, ONLY at response assembly (server.ts:5384-5393):

```typescript
// server.ts:5384-5393 — AFTER Phase-1 and Phase-2 have already run
const matchedCodes = parsed.matches.map(m => m.shelter_code).filter(Boolean);
// ...
const rows = database.prepare(
  `SELECT shelter_code, adoption_pending, bonded_pair FROM animal_metadata 
   WHERE shelter_code IN (${matchedCodes.map(() => '?').join(',')})`
).all(...matchedCodes);
```

And applied as a response decoration (server.ts:5432):

```typescript
adoptionPending: pendingMap.get(m.shelter_code) || false,
```

This means the flag is passed through to the client in the JSON response, but it never prevents the animal from being selected or displayed. The UI could theoretically use this flag to show a badge, but the animal is already in the results. [VERIFIED]

### 4. Independence Confirmation

A pending animal retains `ADOPTABLE === 1` in SM because the two systems are completely independent:

- `ADOPTABLE` is set by Shelter Manager based on the animal's SM status and active movement type
- `adoption_pending` is set by the dashboard via a local SQLite UPDATE

Setting one does not affect the other. An animal can be simultaneously `ADOPTABLE === 1` (in SM) and `adoption_pending = 1` (in local DB). The `fetchAnimals()` filter only checks `ADOPTABLE` — the pending flag is invisible to it. [VERIFIED]

### 5. Current State

```sql
SELECT COUNT(*) as total, 
       SUM(CASE WHEN adoption_pending = 1 THEN 1 ELSE 0 END) as pending 
FROM animal_metadata;
-- Result: 799 total, 0 pending
```

Zero animals currently flagged. The feature is functional (button, endpoint, DB column all work) but operationally unused at this moment. [VERIFIED]

---

## Summary

| Question | Answer |
|----------|--------|
| Can pending animals surface in searcher? | **YES** ❌ — no exclusion filter exists |
| Where does pending come from? | Dashboard-only (local DB `animal_metadata.adoption_pending`) |
| Does SM have a pending field? | **NO** — `normalizeAnimal()` has no pending/hold/reserved mapping |
| Are pending and ADOPTABLE independent? | **YES** — setting pending does NOT change ADOPTABLE |
| Currently flagged? | **0** animals |

**The gap:** The `adoption_pending` flag is a response decoration, not an exclusion filter. To exclude pending animals from the searcher, a filter would need to be added at pool construction time (~server.ts:4506) that checks `adoption_pending` from `animal_metadata` before the animal enters the candidate pool.
