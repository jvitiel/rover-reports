# Health Issue Census — Adoptable Pool

**Source:** Live pool via `fetchAnimals()` + `getBehaviorRecords()` — 177 adoptable animals. [VERIFIED — not /api/animals]  
**Method:** FIV/FeLV from structured SM fields, "On Meds" from `additionalFlags`, medical conditions from SM description + caregiver transcripts (keyword scan with false-positive filtering: metaphorical "heart full of love" excluded, "no special needs" excluded).

---

## COMBINED

| Metric | Value |
|--------|-------|
| Total adoptable | **177** |
| With any health issue | **35 (19.8%)** |
| Without health issue | **142 (80.2%)** |

---

## CAT — 118 adoptable

| Metric | Value |
|--------|-------|
| With any health issue | **24 (20.3%)** |

### Condition Breakdown

| Condition | Count | Animals |
|-----------|-------|---------|
| On Meds (SM flag) | 17 | Aiden, Basil, Billy Boy, Chives, David Meowie, Dean, Dill, Hershey, Keanu, Nestle, Olive, Olivia, Parsley, Racheal, Rosemary, Segundo, Stevie |
| FIV+ | 7 | Carlo Gambino, Cheese Puff, Dante, Dean, Miguelito, Segundo, Squeaky |
| FeLV+ | 2 | Dante, Segundo |
| Diabetes | 2 | Abe (Louie), Edna |
| Urinary condition | 1 | Billy Boy (urinary care diet) |

**Notes:**
- Dante and Segundo are both FIV+/FeLV+ (dual positive)
- Dean is FIV+ AND On Meds
- Billy Boy is On Meds AND has urinary condition
- 24 unique cats (counted once even if multiple conditions)

---

## DOG — 40 adoptable

| Metric | Value |
|--------|-------|
| With any health issue | **9 (22.5%)** |

### Condition Breakdown

| Condition | Count | Animals |
|-----------|-------|---------|
| On Meds (SM flag) | 9 | Abstract, Ava, Baki, Cookie, Duke, Jax, Leo (Petey), Osuna, Rex |
| Heart condition | 1 | Ava (Pimobendan, ongoing monitoring — documented in caregiver notes) |
| Special diet | 1 | Leo (Petey) (documented in SM description) |

**Notes:**
- 5 dog descriptions use "heart" metaphorically ("heart full of love," "big hearted") — correctly excluded. Only Ava has a documented medical heart condition.
- All 9 affected dogs have the On Meds flag; Ava and Leo have additional specific conditions.

---

## SMALL ANIMAL — 19 adoptable (16 rabbits, 1 chinchilla, 1 ferret, 1 guinea pig)

| Metric | Value |
|--------|-------|
| With any health issue | **2 (10.5%)** |

### Condition Breakdown

| Condition | Count | Animals |
|-----------|-------|---------|
| Kidney condition | 1 | Kirby (chinchilla) |
| Liver condition | 1 | Maria (rabbit — liver disease, documented in caregiver notes) |

**Notes:**
- 14 small animals have "no special needs" or "no medical issues" explicitly stated in caregiver notes — correctly excluded from the health-issue count.
- No small animals have the On Meds flag.

---

## "On Meds" Flag Distribution

The `additionalFlags` field containing "On Meds" is the most common health indicator (26 total: 17 cats + 9 dogs + 0 small). This flag does NOT specify which medication — it's a binary indicator from SM. The specific condition (if any) must be found in the description or caregiver notes. Some On Meds animals have no further detail about what medication they take.

| Flag combination | Count |
|------------------|-------|
| On Meds only | 22 |
| On Meds + other flags (HVHS, etc.) | 4 |
| No flags (pipe-only) | 145 |
| Other flags without On Meds | 6 |

---

## Implications for Floor C (FIV/FeLV must-disclose)

- **7 FIV+ cats** and **2 FeLV+ cats** are the Floor C target population
- That's **5.9% of cats** (7/118 FIV+) and **1.7%** (2/118 FeLV+)
- The code floor only needs to check these 9 cat bios (7 FIV+ + 2 FeLV+, with overlap: 2 are both)
- All 7 unique animals: Carlo Gambino, Cheese Puff, Dante, Dean, Miguelito, Segundo, Squeaky
