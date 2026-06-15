# Track C 2a-ii — Enumerate all 'generic' checks in server-side code

**Date:** 2026-06-15
**Scope:** Read-only diagnosis, no changes made

## Methodology

Grepped `'generic'` across all server-side `.ts` files. Classified each hit.

---

## All hits in server/src/server.ts

### 1. `isGenericSource` helper (line 2596) — ALREADY DONE
```typescript
return lastSource === 'generic' || lastSource === 'generic_adult';
```
Classification: **(A) — already routed** via commit `1f40190`.

### 2. `computeBioState` Rule 1 (line 2603 area) — ALREADY DONE
Uses `!isGenericSource(bio.lastSource)` as of commit `1f40190`.
Classification: **(A) — already routed**.

### 3. JSDoc comment (line 2592)
```typescript
 * Generic bios (last_source === 'generic') never count as 'approved'.
```
Classification: **(C) — comment only**. Could be updated to mention `generic_adult` for accuracy, but cosmetic.

### 4. Youth generic bio creation — `publishGenericBios()` (line 11508)
```typescript
}, { source: 'generic', generatedBy: 'system' });
```
Context: Inside the scheduled youth-generic creation function. Writes `source: 'generic'` when saving a new youth generic bio via `saveBio()`.
Classification: **(B) — WRITE of last_source='generic'**. Correct as-is. This is youth generic creation; adult generic (Track C step 2b) will write `'generic_adult'` separately.

### 5. Manual generic bio publish endpoint (line 11564)
```typescript
}, { source: 'generic', generatedBy: 'system' });
```
Context: Inside `POST /api/dashboard/generic-bio/publish` — the manual-trigger endpoint that publishes youth generic bios on demand. Same write as #4.
Classification: **(B) — WRITE of last_source='generic'**. Correct as-is.

### 6. Old generic bios endpoint — SQL filter (line 11591)
```typescript
WHERE h.source = 'generic'
```
Context: `GET /api/dashboard/old-generic-bios` — finds animals whose latest `animal_bios_history` row has `source='generic'` AND age > 84 days (i.e., youth-generic bios that aged out). Used by the dashboard to show "stale generic bios that need real bios."

Full SQL:
```sql
SELECT h.shelter_code
FROM animal_bios_history h
INNER JOIN (
  SELECT shelter_code, MAX(rowid) as max_id
  FROM animal_bios_history
  GROUP BY shelter_code
) latest ON h.shelter_code = latest.shelter_code AND h.rowid = latest.max_id
WHERE h.source = 'generic'
```

Classification: **(A) — CANDIDATE** for `isGenericSource`-style routing. If this stays as `= 'generic'` only, then animals with `source='generic_adult'` whose adult-generic bio later becomes stale (e.g., if a regeneration mechanism is added) would NOT appear in this endpoint. However:

- This endpoint is **parked for retirement** per the Auditor's pending manifest.
- Adult generic bios are not expected to "age out" the same way youth generics do (there's no age threshold that invalidates them).
- Routing through `isGenericSource` would make this endpoint also surface `generic_adult` bios — which is arguably correct for completeness but moot if the endpoint is retiring.

**Recommendation:** Note for the Enforcer. If the endpoint survives retirement, broaden the SQL to `WHERE h.source IN ('generic', 'generic_adult')`. If it's retiring, leave as-is.

### 7. Endpoint route names (lines 11445, 11544, 11577)
```
/api/dashboard/generic-bio/dry-run
/api/dashboard/generic-bio/publish
/api/dashboard/old-generic-bios
```
Classification: **(C) — URL path strings**, not source comparisons. No change needed.

---

## Other server-side files

### server/src/types.ts (line 161)
```typescript
lastSource?: string;     // e.g. 'generic', 'full_generate', 'sm_copy', etc.
```
Classification: **(C) — type comment**. Could be updated to mention `generic_adult` for documentation accuracy.

No other `.ts` files in `server/src/` reference `'generic'`.

---

## resolveBioText check

`resolveBioText` (line 2626) does **not** reference `'generic'` at all. It checks `statusLong === 'approved'` and `statusShort === 'approved'` — source-agnostic. Both youth-generic and adult-generic bios are written with `status: 'approved'`, so `resolveBioText` will correctly serve their text. No change needed.

---

## Dashboard payload check

The dashboard animal payloads (lines 1233, 1345) pass `bioState` (computed via `computeBioState`, already routed) and don't expose `lastSource` to the client. No client-side generic checks exist that need updating.

---

## Summary table

| # | Location | Line | What | Class | Action needed? |
|---|----------|------|------|-------|---------------|
| 1 | `isGenericSource` | 2596 | Helper definition | A | ✅ Done (1f40190) |
| 2 | `computeBioState` Rule 1 | ~2605 | Read check | A | ✅ Done (1f40190) |
| 3 | JSDoc comment | 2592 | Comment | C | Cosmetic update optional |
| 4 | `publishGenericBios()` | 11508 | Write `source: 'generic'` | B | No — youth generic write |
| 5 | Manual publish endpoint | 11564 | Write `source: 'generic'` | B | No — youth generic write |
| 6 | `old-generic-bios` SQL | 11591 | Read `source = 'generic'` | A | **Candidate** — note for Enforcer (retiring endpoint) |
| 7 | Endpoint URL paths | various | Route strings | C | No |
| 8 | `types.ts` comment | 161 | Type doc | C | Cosmetic update optional |

**Bottom line:** Only one remaining candidate (hit #6, the `old-generic-bios` SQL filter). It's parked for retirement. Everything else is either already done, a write (correct as-is), or cosmetic.
