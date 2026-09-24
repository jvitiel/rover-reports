# Volunteer Availability Parse-Failure Prevalence — Diagnosis

**Date:** 2026-09-24  
**Type:** Read-only diagnosis (SELECT only, no writes)  
**Subject:** How prevalent are unparseable availability entries, and what breaks?

---

## 1. Storage Shape

Availability is stored inside the `form_data` TEXT column (JSON blob) on the `volunteers` table, under the key `availability`.

**Schema:** `form_data TEXT` — column index 14, `PRAGMA table_info(volunteers)`

**JSON keys under `$.availability`:**

| Key | Type | Purpose |
|-----|------|---------|
| `monday` through `sunday` | `string \| true \| null` | Per-day time range text, `true` = all day, `null` = blank |
| `almost_any_time` | `boolean` | Checkbox — if true, all days treated as all-day |
| `seasonal` | `string \| true \| null` | Seasonal availability note |
| `start_date` | `string \| null` | Training start date |

Parse flags are stored as a sibling key `$.availability_flags` (e.g. `{"monday": "unparseable"}`) — written by `normalizeAvailabilityFields()` at `server.ts:312–329`.

---

## 2. Parse / Flag Logic

### Normalization: `normalizeAvailabilityString()` — `server.ts:264–310`

Called during form submission (both INSERT and PATCH paths) via `normalizeAvailabilityFields()` at `server.ts:312–329`.

**PASS (flag = null):**
- Empty, `NONE`, `NA`, `N/A`, `—`, `-` → cleared to empty string
- Exact match in `AVAILABILITY_INTERPRETATIONS` table (`server.ts:249–259`): `all day`, `anytime`, `any time`, `open`, `flexible`, `before noon`, `morning`, `afternoon`, `evening` → mapped to a time range string
- Splits into exactly 2 parts on `-`, `–`, `—`, or ` to ` → each part normalizes to `H:MM` format → digit check passes

**FLAGGED as `interpreted`:**
- Matched the interpretation table (still stored, but noted as interpreted)

**FLAGGED as `unparseable`:**
- Does NOT split into exactly 2 parts (single token like `After 6pm`, `Any`, `Early mornings`) — `server.ts:275`
- Splits into 2 parts but formatted tokens don't pass `^\d{1,2}:\d{2}$` regex — `server.ts:308`

### Effect of `unparseable` flag:
- **Visual marker only** for `paper_ocr`: red-highlighted input in dashboard (`dashboard/index.html:4565`, class `ocr-low-confidence` at line `12952–12955`)
- **Hard rejection for `manual_entry`**: server returns 400 if any day is `unparseable` (`server.ts:9896–9901`)
- **Hard rejection on PATCH**: server returns 400 for dashboard edits with unparseable values (`server.ts:10892–10900`)

So `unparseable` values can only persist in `paper_ocr` records (OCR extracted, staff saved without editing the flagged field). Manual entry and subsequent edits block unparseable values.

### Downstream: `parseTimeRange()` — `server.ts:11100–11215`

When the availability-grid API reads stored availability, `parseTimeRange()` re-parses each day string. If it can't parse a range, it returns all-false (no cells lit). Unparseable strings silently produce zero availability — the volunteer is invisible on the scheduling grid for that day.

---

## 3. Prevalence [VERIFIED]

Query: Python script replicating `normalizeAvailabilityString()` logic over all rows via read-only SQLite connection (`PRAGMA query_only = ON`).

| Metric | Value |
|--------|-------|
| Total volunteers | 531 |
| With any availability data (≥1 non-empty day) | 88 |
| With ≥1 flagged (`unparseable`) cell | **27** |
| With stored `availability_flags` in form_data | 32 |
| Total non-empty day cells | 282 |
| Flagged cells | **85** |
| **Flagged rate (% of records with availability)** | **27/88 = 30.7%** |
| **Flagged rate (% of cells)** | **85/282 = 30.1%** |

---

## 4. Failure Modes [VERIFIED]

34 distinct flagged strings, bucketed by parseability.

### (a) NEAR-MISS — 22 distinct strings, 68 cells (79% of flagged)

A broader parser could handle these. Primary patterns:

**"After X" (open-ended start, 33 cells):**
- `After 6pm` (5×), `after 6 pm` (5×), `After 3:00` (5×), `After 5:30` (5×), `After 4` (5×), `after 4` (3×), `After noon` (2×), `after 12` (2×), `After 12` (1×)
- Fix: map "After X" → "X - 5:00 PM" (or shelter close time)

**"Before X" (open-ended end, 6 cells):**
- `Before 11` (4×), `Before 10:45` (2×)
- Fix: map "Before X" → "9:00 AM - X"

**"From X" (open-ended start, 14 cells):**
- `From 2pm` (4×), `From 9 am` (3×), `From 4pm` (2×), `From 12:00 - 6:00` (2×), `from 12:00 - 6:00` (2×), `From 12:00pm' - 6:00` (1×)
- Fix: strip "From" prefix, then re-parse; or map "From X" → "X - 5:00 PM"

**Period words not in table (8 cells):**
- `Any` (6×), `Early mornings` (5×), `Afternoons` (2×), `Am` (1×)
- Fix: add to `AVAILABILITY_INTERPRETATIONS` table

**Separator issues (2 cells):**
- `12:00 pm 2:00 pm` (1×) — space separator instead of dash
- Fix: detect "time time" pattern, insert dash

### (b) UNSTRUCTURED — 12 distinct strings, 18 cells (21% of flagged)

Genuinely human text that no reasonable parser should attempt:

- `Open availability` (3×) — synonym for "flexible" but not in table
- `7:00 - 11am after 3:30` (2×) — compound range with gap
- `Most of the day` (2×) — vague
- `not available` (2×), `not availabe` (1×) — negation
- `occasionally` (2×) — frequency, not time
- `Never` (1×) — refusal
- `Some availability` (1×) — vague
- `Prefer not - do Saturday` (1×) — preference note
- `3:00 - whenever` (1×) — open-ended with non-numeric token
- `10/13` (1×) — appears to be a date, not a time
- `depends on day, 1-3, some days 10-3` (1×) — conditional compound

---

## 5. Downstream Use

### Functional consumer: Availability Grid API
- **`GET /api/volunteers/availability-grid`** — `server.ts:10063–10112`
- Calls `parseAvailability()` → `parseTimeRange()` to build an 8-cell boolean mask per day (hours 9–16)
- The mask is returned to the **dashboard coordinator scheduling grid** (`dashboard/index.html:14264–14325`)
- Used for: **shift matching / scheduling** — volunteers with unparseable availability get all-false masks and are effectively invisible for that day on the grid

### Display-only consumers:
- **Dashboard volunteer detail form** — shows the raw text in input fields (`dashboard/index.html:5765–5771`), with red highlight for flagged values
- **PDF generator** — `pdfGenerator.ts` does NOT render availability (confirmed: no availability reference in the PDF output)

### Verdict: **NOT display-only** — parsed availability drives the scheduling grid. Unparseable entries = invisible volunteers on the coordinator view. 27 approved-or-pending volunteers with availability data are partially invisible.

---

## Summary

| Finding | Value |
|---------|-------|
| Flagged record rate | 30.7% of volunteers with availability |
| Flagged cell rate | 30.1% of non-empty day cells |
| Near-miss (parser-fixable) share | 79% of flagged cells (68/85) |
| Unstructured (human text) share | 21% of flagged cells (18/85) |
| Is parsed availability used downstream? | **Yes** — scheduling grid; unparseable = invisible |
| Primary fix patterns needed | "After X", "Before X", "From X" (open-ended ranges) + 4 period words to add to interpretation table |
