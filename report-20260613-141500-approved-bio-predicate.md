# Approved-Bio Predicate Diagnosis
**Generated:** 2026-06-13 14:15 ET (read-only diagnosis)

---

## 1. THE APPROVAL MODEL

**Table:** `animal_bios` (one row per animal, keyed by `shelter_code`)

**Columns:**
- `status_long TEXT NOT NULL DEFAULT 'draft'` — approval state of the long bio
- `status_short TEXT NOT NULL DEFAULT 'draft'` — approval state of the short bio
- `approved_at_long TEXT` — timestamp when long bio was approved (NULL if never)
- `approved_at_short TEXT` — timestamp when short bio was approved (NULL if never)

**Distinct values in use:**

| status_long | status_short | Count |
|-------------|-------------|-------|
| approved | approved | 52 |
| approved | draft | 40 |
| draft | approved | 1 |
| draft | draft | 9 |

**Total: 102 animals with bios.**

**How approval varies by generation source:**

- **Generic (auto-approved):** All 41 generic-bio animals have `status_long='approved'` AND `status_short='approved'`. The generic bio job (server.ts L11307/L11363) saves with `statusLong: 'approved'` and `statusShort: 'approved'` at creation time.

- **SM-comment-seeded (`sm_generate`):** Iron (S2023297) is the only sm_generate animal. Current state: `status_long='draft'`, `status_short='draft'`. SM-seeded bios generate as draft and require manual staff approval.

- **SM-copy (`sm_copy`):** 6 animals received direct SM comment copies. All are currently draft except Isis the Goddess (S2024694, approved long / draft short). The sm_copy path writes `status_long='draft'` then staff may approve.

- **Full-generate / manual / regenerate:** Bio starts as draft; staff approve via dashboard button, which flips `status_long` or `status_short` to `'approved'` and records an `approve_long`/`approve_short` history entry.

**Server-side bioStatus derivation** (server.ts L1203–1212):
```ts
const bio = biosMap.get(smAnimal.shelterCode);
let bioStatus: 'none' | 'sm' | 'draft' | 'approved' = 'none';
if (bio && (bio.statusLong === 'approved' || bio.statusShort === 'approved')) {
  bioStatus = 'approved';
} else if (hasValue(smAnimal.description)) {
  bioStatus = 'sm';
}
```

This means: `bioStatus='approved'` if **either** the long or short bio is approved. An animal with `approved`/`draft` still counts as approved.

---

## 2. CURRENT-BIO vs EVER-APPROVED

**`animal_bios` is the live/current state.** One row per `shelter_code`, no duplicates found (verified: `GROUP BY shelter_code HAVING COUNT(*) > 1` returns empty). When a bio is regenerated or overwritten (e.g., sm_copy), the row is updated in-place and a snapshot is appended to `animal_bios_history`.

**Can an animal have an approved history row but a draft current bio?** YES. One confirmed case:
- **Cookie (A2023267):** History shows `approve_long` at 2026-05-21 16:13:16, then `sm_copy` at 2026-05-21 16:14:03 which overwrote the approved bio with a draft SM copy. Current state: `status_long='draft'`, `status_short='draft'`.

**Correct semantics for "has an approved bio NOW":** Query the **`animal_bios` table** (the live row), not `animal_bios_history`. The `bioStatus` field already computed server-side (L1203–1212) uses the live `animal_bios` row and gives the right answer.

**The predicate for "animal has at least one approved bio right now":**
```sql
SELECT shelter_code FROM animal_bios
WHERE status_long = 'approved' OR status_short = 'approved'
```
This matches `getApprovedAnimalBios()` in localDatabase.ts (L1519–1525):
```ts
export function getApprovedAnimalBios(): AnimalBio[] {
  const stmt = database.prepare(`
    SELECT * FROM animal_bios 
    WHERE status_long = 'approved' OR status_short = 'approved'
    ORDER BY generated_at DESC
  `);
```

---

## 3. THE PREDICATE

**Adoptable animals with ≥1 approved bio, keyed by shelter_code:**

```sql
SELECT b.shelter_code
FROM animal_bios b
WHERE (b.status_long = 'approved' OR b.status_short = 'approved')
  -- adoptable filter applied client-side via SM API isAvailable
```

Or equivalently in the dashboard client JS, on the already-fetched data:
```js
const withApprovedBio = tilePool.filter(a => a.bioStatus === 'approved').length;
```

**Confirmation:**
- Generic bios **QUALIFY** — all 41 have `status_long='approved'` AND `status_short='approved'` → `bioStatus='approved'` ✓
- SM-seeded draft (Iron, S2023297) does **NOT** qualify — `status_long='draft'`, `status_short='draft'` → `bioStatus` falls through to `'sm'` (has ANIMALCOMMENTS) ✓

---

## 4. WIRING POINTS

**Server endpoint:** `GET /api/dashboard/behavior-notes` (server.ts L1095)

**Per-animal payload assembly:** server.ts L1203–1247. The `bioStatus` field is already computed and included in the response at L1247:
```ts
bioStatus,   // 'none' | 'sm' | 'draft' | 'approved'
```

**Client already has the data:** `bioStatus` is used at dashboard/index.html L6977 for per-card badge rendering. The `updateTileCounts()` function (L6740) currently filters on `a.hasCaregiverData` but could filter on `a.bioStatus === 'approved'` with zero server changes.

**Verdict: CLIENT-ONLY change.** Replace `a.hasCaregiverData` with `a.bioStatus === 'approved'` in `updateTileCounts()` (dashboard/index.html L6747–6749). No new server-side flag needed.

---

## 5. CURRENT COUNT

**Adoptable animals with approved bio (from live API query):**

| Tab | Old (hasCaregiverData) | New (bioStatus=approved) |
|-----|------------------------|--------------------------|
| ALL | 47 | 68 |
| DOGS | 13 | 7 |
| CATS | 19 | 57 |
| SMALLS | 15 | 4 |

**Animals IN new predicate but NOT old (42 animals):**

41 cats with generic bios (Basil, Cardinal, Catherine, Chipotle Mayo, Chives, Cinder, Dale Jr., Danica, Dill, Drizzle, Flame, Flora, Goldfinch, Gretchen Wieners, Heathcliff, Honey Mustard, Jo March, Ketchup, Kurt, Kyle, Leonardo, Meadow, Meadowlark, Meg March, Moonbeam, Oats, Orchid, Parsley, Peekaboo, Peony, Petal, Puddle, Regina George, Rosemary, Sprout, Stardust, Starlight, Sunny, Thing 1, Thing 2, Wren) plus 1 dog with an sm_copy-approved bio (Isis the Goddess).

**Animals IN old predicate but NOT new (21 animals):**

| Name | Species | bioStatus |
|------|---------|-----------|
| Abstract | Dog | sm |
| Achilles | Dog | sm |
| Bailey | Dog | none |
| Mikey | Dog | none |
| Nena | Dog | none |
| Oreo | Dog | sm |
| Scottie | Dog | none |
| Karen Smith | Cat | none |
| Lilac | Cat | none |
| Reeboks | Cat | none |
| Kirby | Ferret | none |
| Tater Tot | Guinea Pig | none |
| Anastasia | Rabbit | none |
| Anna | Rabbit | none |
| Butterscotch | Rabbit | none |
| Caramel | Rabbit | none |
| Charlie | Rabbit | none |
| Elsa | Rabbit | none |
| Maria | Rabbit | none |
| Peanut Butter | Rabbit | none |
| Snowie | Rabbit | none |

These are animals with caregiver behavior notes but no approved bio — the count would drop for them.

---

## 6. EDGE CASES

### Mixed long/short status
41 animals have `approved`/`draft` (approved long, draft short). 1 animal (Clover, A2026061) has `draft`/`approved` (draft long, approved short). The `bioStatus` logic (L1205) uses OR: either approved → counts. This is correct for "has an approved bio."

### Approved then overwritten to draft
1 confirmed case: Cookie (A2023267). Was `approve_long` then `sm_copy` overwrote to draft. The live `animal_bios` row correctly shows draft. The predicate reads the live table, so this works — Cookie correctly does NOT count as having an approved bio.

### No duplicate bios per shelter_code
Verified: `GROUP BY shelter_code HAVING COUNT(*) > 1` returns empty. One row per animal in `animal_bios`.

### No NULL/empty shelter_codes
Verified: no rows with NULL or empty `shelter_code` in `animal_bios`.

### No orphaned bios
Verified: all `animal_bios.shelter_code` values have corresponding `animal_metadata` rows.

### Species classification
Uses `species.toLowerCase().includes('dog'|'cat')` with everything else as "smalls." No mismatches observed — species values from SM are clean ("Cat", "Dog", "Rabbit", "Ferret", "Guinea Pig").

### No complications found
The predicate is clean. Single source of truth (live `animal_bios` row), already exposed as `bioStatus` in the API, already consumed client-side for badges. The only decision for implementation is whether generic bios should be included in the count or not — the predicate includes them by default since they are `status_long='approved'`.
