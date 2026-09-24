# Availability Parser Extension — Implementation

**Date:** 2026-09-24  
**Type:** Implementation (new module + server.ts wiring + alphabetic guard)  
**Commit:** `5decf17`

---

## Changes Made

### 1. New file: `server/src/availabilityParse.ts`

Moved `AVAILABILITY_INTERPRETATIONS` table and `normalizeAvailabilityString()` from server.ts, then extended:

**Expanded interpretation table** (9 new entries):
- `any`, `open availability` → `9:00 AM - 5:00 PM`
- `mornings`, `early morning`, `early mornings`, `am` → `9:00 AM - 12:00 PM`
- `afternoons`, `pm` → `12:00 PM - 5:00 PM`
- `evenings` → `2:00 PM - 5:00 PM`

**Open-ended range handling** (before existing two-part split):
- `"After X"` / `"From X"` (single time) → `X - 5:00 PM` (operating end)
- `"From H - H"` (range with prefix) → strips "From", re-normalizes
- `"Before X"` → `9:00 AM - X` (operating start)
- Out-of-hours ranges (e.g. "After 6pm" where start ≥ 5pm) → blank, flag null
- AM/PM inference: explicit am/pm honored; otherwise 1–8 → PM, 9–12 → as-is

**Space-separated fallback**: `"12:00 pm 2:00 pm"` → treated as `"12:00 pm - 2:00 pm"`

**Alphabetic-content guard** (after two-part split, before formatting):
- Rejects tokens with letters (beyond trailing am/pm) as unparseable
- Prevents fabricating time ranges from non-time text (e.g. "depends on day, 1-3")
- Does NOT affect bare numbers ("1-3"), am/pm-suffixed tokens ("3-5pm"), or colon times ("9:00 - 11:00")

### 2. server.ts changes

- Removed inline `AVAILABILITY_INTERPRETATIONS` (was lines 249–259) and `normalizeAvailabilityString` (was lines 264–310)
- Added: `import { normalizeAvailabilityString } from './availabilityParse.js';`
- `normalizeAvailabilityFields()` remains in server.ts, unchanged — calls the imported function

---

## Build

```
cd /home/shelter/shelter-apps/server && npm run build
```

**Exit code: 0**

---

## Unit Test [VERIFIED]

Command: `node /tmp/test-avail.mjs`

```
input                       | text                      | flag          | exp_flag      | result
----------------------------------------------------------------------------------------------------
"After 3"                   | 3:00 PM - 5:00 PM         | null          | null          | PASS
"after 4"                   | 4:00 PM - 5:00 PM         | null          | null          | PASS
"After noon"                | 12:00 PM - 5:00 PM        | null          | null          | PASS
"After 6pm"                 |                           | null          | null          | PASS
"After 5:30"                |                           | null          | null          | PASS
"Before 11"                 | 9:00 AM - 11:00 AM        | null          | null          | PASS
"Before 10:45"              | 9:00 AM - 10:45 AM        | null          | null          | PASS
"From 2pm"                  | 2:00 PM - 5:00 PM         | null          | null          | PASS
"Any"                       | 9:00 AM - 5:00 PM         | interpreted   | interpreted   | PASS
"Early mornings"            | 9:00 AM - 12:00 PM        | interpreted   | interpreted   | PASS
"Afternoons"                | 12:00 PM - 5:00 PM        | interpreted   | interpreted   | PASS
"Am"                        | 9:00 AM - 12:00 PM        | interpreted   | interpreted   | PASS
"Open availability"         | 9:00 AM - 5:00 PM         | interpreted   | interpreted   | PASS
"12:00 pm 2:00 pm"          | 12:00 - 2:00              | null          | null          | PASS
"9:00 - 11:00"              | 9:00 - 11:00              | null          | null          | PASS
"3-5pm"                     | 3:00 - 5:00               | null          | null          | PASS
"morning"                   | 9:00 AM - 12:00 PM        | interpreted   | interpreted   | PASS
"all day"                   | 9:00 AM - 5:00 PM         | interpreted   | interpreted   | PASS
""                          |                           | null          | null          | PASS
"NONE"                      |                           | null          | null          | PASS
"occasionally"              | occasionally              | unparseable   | unparseable   | PASS
"3:00 - whenever"           | 3:00 - whenever           | unparseable   | unparseable   | PASS
"10/13"                     | 10/13                     | unparseable   | unparseable   | PASS
"depends on day, 1-3"       | depends on day, 1-3       | unparseable   | unparseable   | PASS
"1-3"                       | 1:00 - 3:00               | null          | null          | PASS

25/25 passed
```

Key validations:
- "After 6pm" / "After 5:30" → blank (out of 9–5 operating hours, not fabricated)
- "depends on day, 1-3" → unparseable (alphabetic guard catches non-time text in split token)
- "1-3" → still parses (guard does not over-reject bare numbers)
- "3-5pm" → still parses (am/pm stripped before letter check)
- All original table words and range formats unchanged

---

## Compiled Output Wiring

```
grep -n "normalizeAvailabilityString" dist/server.js dist/availabilityParse.js

dist/server.js:51:  import { normalizeAvailabilityString } from './availabilityParse.js';
dist/server.js:73:  const result = normalizeAvailabilityString(formData.availability[day]);
dist/availabilityParse.js:70:  export function normalizeAvailabilityString(raw) {
dist/availabilityParse.js:88:  return normalizeAvailabilityString(rest);   [from-range re-entry]
dist/availabilityParse.js:119: return normalizeAvailabilityString(...)     [space-separator re-entry]
```

---

## What Was NOT Changed

- `parseTimeRange()` — untouched
- `parseAvailability()` — untouched
- Grid rendering code — untouched
- `normalizeAvailabilityFields()` — remains in server.ts, unchanged
- Database data — no rows modified
- Service — NOT restarted (awaiting John)

---

## Commit

```
5decf17 — Extend availability normalization: open-ended ranges + period words (9-5 anchors)
2 files changed, 171 insertions(+), 63 deletions(-)
create mode 100644 server/src/availabilityParse.ts
```

No git remote configured on shelter-apps; push skipped.
