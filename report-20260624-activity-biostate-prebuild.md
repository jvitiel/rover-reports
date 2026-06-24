# Activity Endpoint bioState Pre-Build — Diagnosis

**Date:** 2026-06-24  
**Read-only:** No writes, no code/service changes  

---

## 1. How profiles-summary Gathers computeBioState Inputs

The profiles-summary endpoint (`server.ts:1326`) calls `computeBioState()` at line 1367:

```js
bioState: computeBioState(bioForLabel, sm.shelterCode, sm.description, sm.dateOfBirth, null),
```

### The 4 inputs + their sources:

| Input | Source | Fetch method | Bulk? |
|-------|--------|-------------|-------|
| **bio** (animal_bios row) | `animal_bios` table (SQLite) | `getAllAnimalBios()` at `localDatabase.ts:1712` — fetches ALL rows, builds Map by shelterCode (`server.ts:1339-1340`) | ✅ One query for all |
| **shelterCode** | SM animal object | `fetchAnimals()` → `sm.shelterCode` (`server.ts:1329`) | ✅ Already in hand |
| **description** (ANIMALCOMMENTS) | SM API, cached in-memory | `fetchAnimals({ includeUnavailable: true })` → `sm.description` (`shelterManagerService.ts:62`: `raw.ANIMALCOMMENTS`) | ⚠️ SM cache only (not in any local table) |
| **dateOfBirth** | SM animal object | `fetchAnimals()` → `sm.dateOfBirth` | ✅ Also available in `animal_metadata.date_of_birth` (local SQLite) |

The profiles endpoint fetches everything in **bulk**: one `getAllAnimalBios()` call, one `fetchAnimals()` call, then iterates and maps.

### description is the outlier:

`description` (ANIMALCOMMENTS) is **NOT** in `animal_metadata` (confirmed via `PRAGMA table_info` — no description column). It exists only in the SM API response, accessible via `fetchAnimals()`. There is no local SQLite table storing ANIMALCOMMENTS.

---

## 2. Bulk-Query Feasibility for Active Sessions

The active-sessions endpoint has 3 shelter_codes (typical count — see §5). For each, we need bio + dateOfBirth + description.

### animal_bios — bulk-able ✅

Schema (`localDatabase.ts:204-216`):
```sql
CREATE TABLE IF NOT EXISTS animal_bios (
  id TEXT PRIMARY KEY,
  shelter_code TEXT NOT NULL,
  ...
)
CREATE INDEX idx_bio_shelter_code ON animal_bios(shelter_code);
```

`shelter_code` is indexed. A `WHERE shelter_code IN (?, ?, ?)` query is trivial. No existing bulk-by-codes function exists (`getAnimalBio()` at `localDatabase.ts:1583` is per-code), but a 3-row IN-clause is effectively instant.

### dateOfBirth — bulk-able from local table ✅

`animal_metadata` table (`localDatabase.ts:430-443`):
```sql
CREATE TABLE IF NOT EXISTS animal_metadata (
  shelter_code TEXT PRIMARY KEY,
  ...
  date_of_birth TEXT,
  ...
)
```

`shelter_code` is the PRIMARY KEY. `WHERE shelter_code IN (?, ?, ?)` is instant. `dateOfBirth` is reliably populated (SM sync writes it on every sync run via `upsertAnimalMetadata`, `localDatabase.ts:2313`).

### description — requires SM cache ⚠️

`description` (ANIMALCOMMENTS) is only in the SM API response:
```js
// shelterManagerService.ts:62
description: raw.ANIMALCOMMENTS || '',
```

**Not in any local SQLite table.** To get it, we must call `fetchAnimals()`.

**Mitigation — the SM cache is almost always warm:**
- Cache TTL = 15 minutes (`shelterManagerService.ts:6`)
- `fetchAnimals()` without `forceRefresh` returns cached data if warm (`shelterManagerService.ts:106`)
- Multiple endpoints call `fetchAnimals()` constantly: available-animals (on every staff app section open), profiles-summary (on every dashboard load), the nightly SM sync, etc.
- In normal operation, the cache is warm and `fetchAnimals()` returns immediately (no HTTP call)

**But:** if the cache happens to be cold (server just restarted, 15 min elapsed with zero endpoint hits), `fetchAnimals()` will make a live SM API call (~2-5 seconds). This would block the active-sessions response.

**Safe pattern:** Call `fetchAnimals()` **without** `forceRefresh`. If cache is warm: instant. If cold: the SM fetch is unavoidable (same latency every other endpoint incurs). Alternatively, we can fall back to `null` for description when the cache is cold (makes `hasRealStaffContentForLabel` return based on `getBehaviorNotesCount` only, which is fine — description only matters for the `pending` state, and missing it means `pending` → `needed`, which is the safe/conservative direction).

### Summary — single bulk path:

| Query | Source | Cost |
|-------|--------|------|
| `SELECT * FROM animal_bios WHERE shelter_code IN (...)` | SQLite | <1ms for 3 rows |
| `SELECT * FROM animal_metadata WHERE shelter_code IN (...)` | SQLite | <1ms for 3 rows |
| `fetchAnimals()` (for description only) | SM cache (in-memory) | 0ms if warm; 2-5s if cold (rare) |

**Total: 2 SQLite queries + 1 in-memory cache read.** No per-animal SM API calls.

---

## 3. computeBioState Fail-Safe Behavior

Full function at `server.ts:2665-2700`:

```typescript
function computeBioState(
  bio: { lastSource?: string; statusLong: string; statusShort: string } | null,
  shelterCode: string,
  description: string | undefined | null,
  dateOfBirth: string | undefined | null,
  draft?: { ... } | null,
): 'approved' | 'pending' | 'youth' | 'needed' {
```

### Missing-input analysis:

| Input | Missing value | Behavior | Throws? |
|-------|--------------|----------|---------|
| **bio = null** | `!!bio` = false → `hasApprovedRealBio` = false, `hasUnpromotedRealDraft` = false | Falls to `'needed'` | ❌ No |
| **dateOfBirth = null** | `ageInDays(null)` returns `null` → `isYouth` = false | Falls to `'needed'` | ❌ No |
| **dateOfBirth = invalid string** | `ageInDays('garbage')` → `isNaN(dobMs)` → returns `null` → `isYouth` = false | Falls to `'needed'` | ❌ No |
| **description = null/undefined** | `hasRealStaffContentForLabel(code, null)` → `if (!description)` → returns false → `brokenPipeline` = false (unless `getBehaviorNotesCount > 0`) | Falls to `'needed'` | ❌ No |
| **shelterCode = valid string** | Always present on active_sessions rows | Used by `getBehaviorNotesCount(shelterCode)` — returns 0 if no notes | ❌ No |
| **draft = null** | `!!draft` = false → `hasUnpromotedRealDraft` = false | No effect | ❌ No |

### `ageInDays()` (`server.ts:2631-2636`):
```typescript
function ageInDays(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dobMs = new Date(dateOfBirth).getTime();
  if (isNaN(dobMs)) return null;
  return Math.floor((Date.now() - dobMs) / (1000 * 60 * 60 * 24));
}
```

### `hasRealStaffContentForLabel()` (`server.ts:2645-2651`):
```typescript
function hasRealStaffContentForLabel(shelterCode: string, description?: string | null): boolean {
  if (getBehaviorNotesCount(shelterCode) > 0) return true;
  if (!description || typeof description !== 'string') return false;
  const t = description.trim().toLowerCase();
  return t !== '' && t !== 'not specified' && t !== 'unknown' && t !== 'n/a' && t !== 'none specified';
}
```

### Verdict: **Completely fail-safe. No wrapper needed.**

Every missing-input path gracefully falls through to `'needed'`. The function explicitly handles `null`/`undefined` for all parameters. The return type is a strict union — it ALWAYS returns one of `'approved' | 'pending' | 'youth' | 'needed'`. No throw path exists.

---

## 4. Active-Sessions Response Shape

Current endpoint (`server.ts:7694-7713`):

```typescript
app.get('/api/sessions/active/:species', async (req: Request, res: Response) => {
  const sessions = getActiveSessionsBySpecies(species);
  res.json({ success: true, data: sessions });
});
```

`getActiveSessionsBySpecies()` (`localDatabase.ts:4473`) returns `SELECT * FROM active_sessions` — raw rows as `ActiveSession` objects.

### Attach point:

Map over `sessions` before `res.json`, add `bioState` field to each:

```typescript
const enriched = sessions.map(s => ({
  ...s,
  bioState: computeBioState(biosMap.get(s.shelter_code), s.shelter_code, descriptionMap.get(s.shelter_code), dobMap.get(s.shelter_code), null),
}));
res.json({ success: true, data: enriched });
```

### Additive safety:

Adding `bioState` is purely additive — it's a new field on each session object. The frontend reads specific fields by name (`session.behavior_status`, `session.shelter_code`, etc.). An extra field is ignored by JS destructuring/property access.

### Frontend tolerance:

The 3 render sites (`app.js:760`, `app.js:1159`, `app.js:1262`) read `session.behaviorRecorded` / `session.behaviorStatus` / `session.behavior_status` for the current badge. They do NOT reference `bioState`. The new field will be silently present but unused until Stage 2 wires the badge to read it. **No breakage.**

---

## 5. Perf Sanity

```sql
SELECT COUNT(*) FROM active_sessions;
-- Result: 3
```

Active sessions are **only checked-out animals** — typically 0-10 at any given time (3 right now: Polly, Milo, Sparky). The bulk lookup:

- 2 SQLite queries with `IN (3 values)` on indexed/PK columns: **sub-millisecond**
- 1 `fetchAnimals()` from warm cache: **0ms** (returns cached array, no I/O)
- 3 calls to `computeBioState()` (each does 1 `getBehaviorNotesCount` query): **sub-millisecond per call**

**Total added cost per poll: <5ms** on a 15-second polling interval. Negligible.

Even in peak usage (10-15 active sessions), the cost would be <10ms — still trivial.

---

## Summary

| Question | Answer |
|----------|--------|
| Bio inputs bulk-able from local? | **Mostly yes**: animal_bios + animal_metadata (dateOfBirth) are local SQLite, bulk IN-clause. Description requires SM cache (in-memory, almost always warm). |
| SM per-animal API calls needed? | **No** — `fetchAnimals()` returns full cache; no per-animal calls. |
| computeBioState fail-safe? | **Yes** — all null/missing inputs fall through to `'needed'`. No throw path. No wrapper needed. |
| Attaching bioState additive? | **Yes** — new field on response, ignored by current frontend until wired. |
| Active session count | **3** (typical 0-10). Bulk lookup is sub-millisecond. |
