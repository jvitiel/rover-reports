# Volunteer Age/18+ Submission Data — Storage Map & 5 Pending Applicants

**Date:** 2026-07-12  
**Type:** Read-only diagnosis  
**Scope:** How age/18+ data flows from web form → server → database for volunteer applications

---

## 1. Storage Map

### Schema Column

The `volunteers` table has **one** age-related column:

| Column | Type | Values in DB |
|--------|------|-------------|
| `age_18_or_older` | BOOLEAN (SQLite integer) | `1` (345 rows), `0` (83 rows), `NULL` (27 rows) |

There is **no** column for submitted age (e.g. `age_under_18`, `applicant_age`). The specific age number is only stored inside the `form_data` JSON blob (see below).

### form_data JSON Structure (Web Form Submissions)

The web form sends its data inside `formData.personal` with these field names:

```json
{
  "personal": {
    "is_18_or_older": "yes" | "no",
    "age_if_under_18": "17" | ""
  }
}
```

These are stored verbatim in the `form_data` TEXT column as JSON.

### The Write Path — Field Name Mismatch Bug [VERIFIED]

**Server intake endpoint:** `POST /api/volunteers` in `server.ts` (line ~9841)

The server destructures `formData.personal` as `p`, then writes:

```typescript
// server.ts line 9928
age_18_or_older: p.age_18_or_older ?? null,
```

**But the web form sends `is_18_or_older`, not `age_18_or_older`.**

- `p.age_18_or_older` → `undefined` (field doesn't exist under that name)
- `undefined ?? null` → `null`
- Result: **the `age_18_or_older` column is always NULL for web_form submissions**

The same mismatch exists in the dashboard update path (`PATCH`), line ~10861:

```typescript
updates.age_18_or_older = p.age_18_or_older ?? vol.age_18_or_older;
```

This reads the same wrong field name, so dashboard edits that don't explicitly set the age field won't fix it either (they'll fall through to `vol.age_18_or_older`, preserving whatever was already there — which is NULL for web submissions).

### Insert Function (localDatabase.ts, line ~4865)

```typescript
data.age_18_or_older ? 1 : (data.age_18_or_older === false ? 0 : null)
```

This correctly converts `true` → `1`, `false` → `0`, `null/undefined` → `NULL`. But it never fires correctly because the input is already `null` due to the field name mismatch above.

### Where the Submitted Age Lives

The specific age (for under-18 applicants) is stored **only** in `form_data` JSON at `$.personal.age_if_under_18`. There is no dedicated column for it. The OCR prompt (for paper forms) uses `age_under_18` as the JSON field name, but web forms use `age_if_under_18`.

---

## 2. The 5 Pending Applicants — Stored Data [VERIFIED with SELECT]

All 5 are `submission_source = 'web_form'` and `status = 'pending'`.

| ID | Name | Submitted | `age_18_or_older` column | `form_data` → `is_18_or_older` | `form_data` → `age_if_under_18` |
|----|------|-----------|--------------------------|-------------------------------|-------------------------------|
| 471 | Amber Veloz | 2026-07-11 | **NULL** | `"yes"` | `""` (empty) |
| 470 | Hailey Veloz | 2026-07-10 | **NULL** | `"no"` | `"17"` |
| 469 | Everly Tejada | 2026-07-10 | **NULL** | `"no"` | `"16"` |
| 468 | Christia Ninan | 2026-07-09 | **NULL** | `"no"` | `"17"` |
| 464 | Jeremy Levine | 2026-07-03 | **NULL** | `"yes"` | `""` (empty) |

---

## 3. Per-Applicant Reconciliation

| Applicant | What They Actually Submitted | Column State | Drift? |
|-----------|------------------------------|-------------|--------|
| **Amber Veloz** (471) | 18 or older: **YES** (no specific age collected) | NULL — should be 1 | ⚠️ YES — column is NULL, submission says yes |
| **Hailey Veloz** (470) | 18 or older: **NO**, age submitted = **17** | NULL — should be 0 | ⚠️ YES — column is NULL, submission says no, age 17 |
| **Everly Tejada** (469) | 18 or older: **NO**, age submitted = **16** | NULL — should be 0 | ⚠️ YES — column is NULL, submission says no, age 16 |
| **Christia Ninan** (468) | 18 or older: **NO**, age submitted = **17** | NULL — should be 0 | ⚠️ YES — column is NULL, submission says no, age 17 |
| **Jeremy Levine** (464) | 18 or older: **YES** (no specific age collected) | NULL — should be 1 | ⚠️ YES — column is NULL, submission says yes |

**All 5 pending applicants have drifted.** The `age_18_or_older` column is NULL for every one, despite each having a clear yes/no submission in `form_data`.

---

## 4. Is Submitted Age Actually Stored?

**Yes, but only in the JSON blob — not in a dedicated column.**

- The `form_data` JSON contains `personal.age_if_under_18` with the actual submitted age string (`"16"`, `"17"`, or `""`)
- There is **no** `age_under_18` or `age_if_under_18` column in the `volunteers` table
- The data is **not dropped** by the write path — it's preserved inside `form_data` — but it's not extracted into a queryable column
- The dashboard would need to parse `form_data` JSON to display it, or a column would need to be added

**The `age_18_or_older` column IS dropped by the write path** due to the field name mismatch (`is_18_or_older` vs `age_18_or_older`). The 27 NULL rows in the database (out of 455 total) correspond to web_form submissions where this mismatch silently nullified the value.

---

## Root Cause Summary

The web form JavaScript sends `is_18_or_older` (with `is_` prefix). The server intake code reads `age_18_or_older` (with `age_` prefix). This single field name mismatch causes every web form submission to store NULL in the column. Paper/OCR submissions use `age_18_or_older` (matching the server's expectation), which is why 345+83 rows have correct values — those came through the OCR pipeline whose prompt specifies `age_18_or_older`.

**Fix (not implemented — read-only task):** The server intake and update paths need to read `p.is_18_or_older` (matching what the web form sends) OR the web form needs to send `age_18_or_older` (matching what the server expects). Additionally, the string values `"yes"`/`"no"` need boolean conversion since the insert function expects `true`/`false`/`null`, not string values.
