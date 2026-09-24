# Volunteer submitted_at ISO Normalization — Implementation

**Date:** 2026-09-24  
**Type:** Implementation (new file + 2 server.ts edits + build + test)  
**Commit:** `3c126e9`

---

## Changes Made

### 1. New file: `server/src/dateUtils.ts`

Helper `normalizeSubmittedDate(raw)` that:
- ISO leading (`YYYY-MM-DD...`): extracts date part, validates month 1–12 / day 1–31
- American format (`M/DD/YY`, `MM/DD/YYYY`, `M.DD.YY`): parses, converts to `YYYY-MM-DD`
- Junk / out-of-range / empty / null: returns `null`

### 2. server.ts — INSERT path (line 9978)

```
OLD: submitted_at: p.todays_date || now,
NEW: submitted_at: normalizeSubmittedDate(p.todays_date) || now,
```

If the helper returns `null` (junk or missing), falls through to `now` (ISO datetime) — preserves the existing web_form behavior unchanged.

### 3. server.ts — PATCH path (was lines 10919–10923)

```
OLD:
if (p.todays_date) {
  const parsed = new Date(p.todays_date);
  if (!isNaN(parsed.getTime())) {
    updates.submitted_at = p.todays_date.split('T')[0] + 'T12:00:00.000Z';
  }
}

NEW:
if (p.todays_date) {
  const normalized = normalizeSubmittedDate(p.todays_date);
  if (normalized) {
    updates.submitted_at = normalized;
  }
}
```

Replaces the old `new Date()` parsing (which mishandled 2-digit years: `5/30/26` → year 1926) with the same reliable helper.

### 4. Import added

`import { normalizeSubmittedDate } from './dateUtils.js';` — at line 231 (after the last local import).

---

## Build

```
cd /home/shelter/shelter-apps/server && npm run build
```

**Exit code: 0** (tsc clean, no errors)

---

## Unit Test [VERIFIED]

Command: `node /tmp/test-datenorm.mjs`

```
input                        | output      | expected    | result
---------------------------------------------------------------------------
"5/30/26"                    | 2026-05-30  | 2026-05-30  | PASS
"05/30/26"                   | 2026-05-30  | 2026-05-30  | PASS
"4.27.26"                    | 2026-04-27  | 2026-04-27  | PASS
"06/13/2026"                 | 2026-06-13  | 2026-06-13  | PASS
"6/1/26"                     | 2026-06-01  | 2026-06-01  | PASS
"2026-05-31"                 | 2026-05-31  | 2026-05-31  | PASS
"2026-09-24T15:52:45.125Z"  | 2026-09-24  | 2026-09-24  | PASS
"hello"                      | null        | null        | PASS
"13/45/99"                   | null        | null        | PASS
""                           | null        | null        | PASS

10/10 passed
```

Key validations:
- `5/30/26` → `2026-05-30` (NOT 1926 as `new Date('5/30/26')` would produce)
- `4.27.26` → `2026-04-27` (dot separator handled)
- `13/45/99` → `null` (month 13 rejected, not fabricated)
- ISO datetime stripped to date-only, ISO date passed through

---

## Compiled Output Wiring

```
grep -n "normalizeSubmittedDate" dist/server.js
50:import { normalizeSubmittedDate } from './dateUtils.js';
8852:            submitted_at: normalizeSubmittedDate(p.todays_date) || now,
9744:                const normalized = normalizeSubmittedDate(p.todays_date);
```

Both call sites present in compiled output. ✓

---

## What Was NOT Changed

- `insertVolunteer()` SQL in `localDatabase.ts` — untouched
- Web_form / `now` fallback path — untouched (normalizeSubmittedDate returns null for undefined → falls through to `now`)
- Dashboard HTML — untouched
- Database data — no rows modified
- Service — NOT restarted (awaiting John)

---

## Commit

```
3c126e9 — Normalize volunteer submitted_at to ISO at intake (INSERT + PATCH); fix American-date parsing
2 files changed, 26 insertions(+), 5 deletions(-)
create mode 100644 server/src/dateUtils.ts
```
