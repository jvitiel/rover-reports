# animal_metadata Upsert Verification — Pre-Phase A Audit

**Date:** 2026-05-28 17:45 ET  
**Type:** Read-only code inspection  
**Purpose:** Confirm the upsert won't clobber a new `adoption_pending` column on SM sync.

---

## Upsert Function

**File:** `localDatabase.ts:1850–1880`, function `upsertAnimalMetadata()`

```sql
INSERT INTO animal_metadata (shelter_code, animal_id, name, species, breed, age, date_of_birth, sex, fiv_status, felv_status, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(shelter_code) DO UPDATE SET
  animal_id = excluded.animal_id,
  name = excluded.name,
  species = excluded.species,
  breed = excluded.breed,
  age = excluded.age,
  date_of_birth = excluded.date_of_birth,
  sex = excluded.sex,
  fiv_status = excluded.fiv_status,
  felv_status = excluded.felv_status,
  updated_at = excluded.updated_at
```

## Verdict: CASE 1 — Safe [VERIFIED]

The upsert uses `ON CONFLICT(shelter_code) DO UPDATE SET` with an **explicit column list** of SM-sourced fields only. Columns not listed in the SET clause are preserved on conflict. A new `adoption_pending` column with `DEFAULT 0` will:

- Be set to 0 on **first INSERT** (new animal, correct default)
- Be **preserved** on subsequent upserts (ON CONFLICT path skips unlisted columns)

**No upsert modification is needed for Phase A.**

---

## All Writers to animal_metadata

Single writer found: `upsertAnimalMetadata()` in `localDatabase.ts:1855`. No other INSERT or UPDATE statements target this table. [VERIFIED — grep across server.ts and localDatabase.ts]

### Call sites (3 total, all pass SM-sourced fields only):

| Location | Context |
|----------|---------|
| `server.ts:1238` | `/api/dashboard/behavior-notes` loop — caches metadata during SM sync |
| `server.ts:4714` | Caregiver endpoint — caches metadata by animalId before animal is adopted out |
| `server.ts:4790` | Caregiver endpoint — same pattern, by shelterCode |

All three call sites pass the same SM-sourced fields. None touches or overwrites any locally-managed state. [VERIFIED]

---

## Conclusion

Phase A can safely add `ALTER TABLE animal_metadata ADD COLUMN adoption_pending INTEGER DEFAULT 0` with zero risk of clobber. The upsert's explicit SET list means SM sync will never overwrite the new column.
