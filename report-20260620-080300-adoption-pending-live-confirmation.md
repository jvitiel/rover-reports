# Adoption-Pending Live-Behavior Confirmation (EN Gap 7 — PEND-1)

**Date:** 2026-06-20 08:03 UTC  
**Type:** READ-ONLY LIVE TEST (flag set then restored — no permanent changes)  
**Test animal:** Chloe (S2026564) — Female, 6yr 4mo, Cat, Tabby Brown/White

---

## Verdict

**YES — a pending animal STILL surfaces in the searcher live.** [VERIFIED]  
**YES — the response decorates it with `adoptionPending: true`.** [VERIFIED]  
**FLAG RESTORED:** `adoption_pending = 0` confirmed in DB after test. [VERIFIED]

This confirms PEND-1: the `adoption_pending` flag is a response decoration only, NOT an exclusion filter. An adopter querying the matcher will receive pending animals in their results with no client-side indication that the animal is spoken for (unless the UI reads the `adoptionPending` field).

---

## Procedure & Evidence

### 1. Candidate Selection

Chloe (S2026564) — chosen because she appeared in slot 1 of the baseline query. Female adult cat, `adoption_pending = 0` at start.

```
API: shelterCode: S2026564 | name: Chloe | sex: Female | age: 6 years 4 months. | species: Cat | color: tabby - brown and white | adoptionPending: false
DB:  S2026564|0
```

### 2. BASELINE Query

**Query:** `POST /api/matcher/custom-search`  
**Body:** `{"species":"cat","sex":["female"],"ageGroup":["adult"],"narrative":"a friendly playful cat","language":"en"}`

**Result:**
```
Slot 1: Chloe (S2026564) adoptionPending=false
Slot 2: Sky (S2026314) adoptionPending=false
Slot 3: Stevie (S2026177) adoptionPending=false
```

Chloe in slot 1. All `adoptionPending: false`. [VERIFIED]

### 3. SET PENDING

**Request:** `PUT /api/animals/S2026564/adoption-pending`  
**Body:** `{"pending": true}`  
**Response:** `{"success": true}`

**DB confirmation:**
```sql
SELECT shelter_code, adoption_pending FROM animal_metadata WHERE shelter_code='S2026564';
-- S2026564|1
```

`adoption_pending = 1` confirmed set. [VERIFIED]

### 4. RE-RUN Same Query (with Chloe pending)

**Same query as baseline, identical parameters.**

**Result:**
```
Slot 1: Sky (S2026314) | adoptionPending: false
Slot 2: Chloe (S2026564) | adoptionPending: true
Slot 3: Stevie (S2026177) | adoptionPending: false
```

**Chloe STILL PRESENT in results.** Moved from slot 1 to slot 2 (normal Phase-1 non-determinism — the same 3 animals were selected, just reordered). The pending flag did NOT exclude her from the pool. [VERIFIED]

### 5. Response Field Check

Chloe's response object in the pending run:
```json
{
  "shelter_code": "S2026564",
  "name": "Chloe",
  "adoptionPending": true,
  ...
}
```

The `adoptionPending` field is `true` (boolean). The flag IS carried through to the response. A client could theoretically show a badge, but the animal is already in the results — the server does not filter it out. [VERIFIED]

### 6. RESTORE

**Request:** `PUT /api/animals/S2026564/adoption-pending`  
**Body:** `{"pending": false}`  
**Response:** `{"success": true}`

**DB confirmation:**
```sql
SELECT shelter_code, adoption_pending FROM animal_metadata WHERE shelter_code='S2026564';
-- S2026564|0
```

**`adoption_pending = 0` — flag fully restored.** Data is clean. [VERIFIED]

---

## Summary

| Check | Result | Tag |
|-------|--------|-----|
| Pending animal surfaces in searcher? | **YES** — Chloe appeared in all 3 result slots across both runs | [VERIFIED] |
| Response carries `adoptionPending: true`? | **YES** — boolean field set correctly | [VERIFIED] |
| Exclusion filter exists? | **NO** — pool construction (server.ts:4497-4514) has zero reference to `adoption_pending` | [VERIFIED] |
| Flag restored to 0? | **YES** — DB row confirmed `S2026564|0` | [VERIFIED] |

**The gap (PEND-1):** An adopter can be matched with an animal that staff has already flagged as adoption-pending. The flag exists, the API carries it, but nothing prevents the match. To close this gap, either:
1. Add `adoption_pending` check to pool construction (~server.ts:4506), or
2. Have the UI read `adoptionPending: true` and show a clear "this animal may already be spoken for" badge

Option 1 (server-side exclusion) is the cleaner fix — it prevents the match entirely rather than relying on client-side decoration.
