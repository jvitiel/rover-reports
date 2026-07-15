# Featured Six — Dead Animal Filter Build Report

**Date:** 2026-07-15 20:42 UTC  
**Type:** Implementation  
**Commit:** 8f251b4  
**File changed:** server/src/featuredRotation.ts (1 line added)

---

## Change

One line added to `readQueuesFromDb()` in the `for (const row of rows)` loop, before the `.push()`:

```typescript
  for (const row of rows) {
    const bucket = row.species as 'cat' | 'dog' | 'small';
    if (!queues[bucket]) continue;
    // Skip animals no longer in SM adoptable set (adopted/removed)
    if (!nameMap.has(row.shelter_code)) continue;                    // ← NEW
    const parsed = new Date(row.date_available);
    const daysListed = isNaN(parsed.getTime()) ? 0 : Math.floor((now - parsed.getTime()) / (24 * 60 * 60 * 1000));
    queues[bucket].push({
      shelterCode: row.shelter_code,
      name: nameMap.get(row.shelter_code) || '(unknown)',
      species: bucket,
      daysListed,
      position: row.position,
    });
  }
```

Nothing else changed. No window math, stamp logic, seed, schedule, or email rendering touched.

---

## Verification

### 1. tsc clean + restart

- `npx tsc --noEmit`: exit 0, no errors [VERIFIED]
- `npm run build`: exit 0 [VERIFIED]
- `systemctl restart shelter-app`: active [VERIFIED]

### 2. Per-species counts before/after filter

| Species | Queue rows (DB) | Pre-filter (in-memory) | Post-filter (in-memory) | Dead filtered |
|---|---|---|---|---|
| cat | 21 | 21 | 18 | 3 (S20241035 Starr, W2025068 Dean, S2026177 Stevie) |
| dog | 35 | 35 | 30 | 5 (A2024185 Amari, S2026031 Oreo, S2026079 Nena, S2026132 Muppett, S2026267 Baki) |
| small | 20 | 20 | 20 | 0 |
| **Total** | **76** | **76** | **68** | **8** |

[VERIFIED — queue rows from `SELECT COUNT(*)` = 76; filtered counts from test-four-editions report showing zero dead codes]

### 3. Filter proof — zero dead codes in output

Called `POST /api/dashboard/featured-rotation/test-four-editions`. The endpoint called `readQueuesFromDb()` (which now filters), computed editions 0–3, rendered and sent 4 emails, and wrote a report.

- Dead codes searched across all 4 editions × 3 sections: **0 hits** [VERIFIED — `grep -c` of all 8 dead codes against report = 0]
- `(unknown)` searched across all 4 editions × 3 sections: **0 hits** [VERIFIED — `grep -c "unknown"` against report = 0]

### 4. Able-to-fail — edition 3 (Jul 29, the next would-have-failed edition)

**Pre-filter** edition 3 newSix would have been:
- cat pos 7–9 (including W2025068 Dean at pos 11 via offset math), dog pos 5–6 (including A2024185 Amari at pos 8), small pos 3

**Post-filter** edition 3 newSix:

| Name | Code | Species | Days Listed |
|---|---|---|---|
| Lacey | S2025206 | cat | 439 |
| Cheshire | S2025503 | cat | 376 |
| Billy Boy | S2025546 | cat | 375 |
| Ava | R2024018 | dog | 740 |
| Isis the Goddess | S2024694 | dog | 730 |
| Snowie | A2023287 | small | 908 |

All six are live adoptable animals. No dead codes, no "(unknown)". [VERIFIED]

**Edition 1 (today's) recomputed** — S20241035 (Starr) is absent from all three sections. [VERIFIED — grep for S20241035 in report = 0]

### 5. All three sections clean across editions 1–4

Every section (Currently Featured / Swap In Now / Coming Next Week) across all 4 test editions contains only live adoptable animals with real names. Zero "(unknown)" entries anywhere. [VERIFIED]

### 6. Queue table unchanged

- `SELECT COUNT(*) FROM featured_rotation_queue` = **76** [VERIFIED]
- Dead entries still in DB: `SELECT COUNT(*) ... WHERE shelter_code IN (8 dead codes)` = **8** [VERIFIED]
- No DELETE statement ran against `featured_rotation_queue` — the filter is purely in-memory in `readQueuesFromDb()` [VERIFIED]

---

*Implementation complete. One line added, no other behavior changed.*
