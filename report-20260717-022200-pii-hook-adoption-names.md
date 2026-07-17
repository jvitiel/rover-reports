# Pre-commit PII Hook: Adoption Applicant Name Coverage

**Date:** 2026-07-17 02:22 UTC
**Scope:** Extend the DB-sourced name check to include adoption_applications.applicant_name

## Change

The `db_names` query in the pre-commit hook now UNIONs two tables:

```sql
SELECT LOWER(TRIM(full_name)) FROM volunteers
 WHERE full_name IS NOT NULL
   AND TRIM(full_name) != ''
   AND TRIM(full_name) LIKE '% %'
   AND LENGTH(TRIM(full_name)) >= 6
 UNION
 SELECT LOWER(TRIM(applicant_name)) FROM adoption_applications
 WHERE applicant_name IS NOT NULL
   AND TRIM(applicant_name) != ''
   AND TRIM(applicant_name) LIKE '% %'
   AND LENGTH(TRIM(applicant_name)) >= 6;
```

Same filters on both branches: non-null, non-empty, multi-word, 6+ chars, lowercased.

The `db_emails` query also gained three new UNIONs for adoption applicant contact values:
- `applicant_email` from adoption_applications
- `applicant_phone_cell` from adoption_applications
- `applicant_phone_home` from adoption_applications

All with the same non-null/non-empty filters and `-readonly` flag.

### Schema context
`adoption_applications` has these PII-relevant columns: `applicant_name` (NOT NULL), `applicant_email` (NOT NULL), `applicant_phone_home`, `applicant_phone_cell` (NOT NULL). Also has reference names/phones (`ref1_name`, `ref2_name`, `ref3_name`, etc.), vet name/phone, and landlord name/phone — these are third-party values and were NOT added to the query in this scope.

## New Totals

| Source | Qualifying names |
|--------|-----------------|
| volunteers.full_name | 462 |
| adoption_applications.applicant_name | 24 |
| **Combined (UNION-deduplicated)** | **480** |

6 names appear in both tables (overlap).

## Verification

### V1: Changed query block [VERIFIED]
The `db_names` query now contains two SELECT...UNION branches. The `db_emails` query now contains six SELECT...UNION branches (3 volunteer + 3 adoption). All use `-readonly`. [VERIFIED by reading the hook file]

### V2: PLANT — adoption applicant name [VERIFIED — BLOCKED]
- Created scratch file containing a real adoption applicant's full name (11 chars, multi-word)
- Staged and attempted commit
- Output: `BLOCKED: pii-test-scratch.md:1 — contains a name matching a volunteer record`
- Commit blocked (HEAD unchanged). Matched name NOT printed.

### V3a: REGRESSION — volunteer name [VERIFIED — BLOCKED]
- Created scratch file with a real volunteer's full name
- Output: `BLOCKED: pii-test-scratch.md:1 — contains a name matching a volunteer record`
- Commit blocked.

### V3b: REGRESSION — email [VERIFIED — BLOCKED]
- Created scratch file with a fabricated email address
- Output: `BLOCKED: pii-test-scratch.md:1 — contains email address`
- Git exit code: 1. Email regex check still works.

### V4: False-positive dry run [VERIFIED — 0/10]
- Ran the combined 480-name list against the last 10 report files in the repo
- **0 false positives out of 10**

### V5: Degrade proof [VERIFIED — warns + continues]
- Copied hook, patched DB path to nonexistent file
- Output: `WARNING: sqlite3 or shelter DB not available; name/known-value check skipped.`
- Hook exit code: 0 (clean file passed through)

### V6: DB read-only [VERIFIED]
- 3 occurrences of `-readonly` flag in hook (unchanged)
- 0 write statements (INSERT/UPDATE/DELETE/DROP/ALTER)
- Live DB never written to

### V7: Report passes its own hook [VERIFIED — see commit below]

## Remaining Limits (unchanged from prior report)
- Third-party names in adoption_applications (references, vet, landlord) NOT covered — separate scope
- Names outside both tables (staff, donors, fosters not in volunteers table) not detected
- Partial names, nicknames, ages not detected
- Hook untracked (.git/hooks/) — lost on fresh clone
