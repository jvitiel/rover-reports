# Adoptions Tab Cleanup — Execution Report

## Step 1 — Pre-Delete Verify

13 rows confirmed. Target ids 1–9, 11 are test/dev rows. Keeper ids 12, 13, 14 match expected names (Test Verification, Pattie Stalter ×2).

```
id  submitted_at              applicant_name
1   2026-03-15T14:03:31.626Z  Test Applicant
2   2026-03-15T14:11:52.064Z  John Test
3   2026-03-15T14:38:12.548Z  Form Test User
4   2026-03-15T14:39:19.354Z  WordPress Form Test
5   2026-03-15T15:01:58.310Z  JV
6   2026-03-15T15:41:37.285Z  JV
7   2026-03-15T15:47:08.604Z  Email Test
8   2026-05-13T18:11:34.931Z  John Vitiello
9   2026-05-14T20:38:35.359Z  John Vitiello
11  2026-06-24T15:54:22.453Z  John Vitiello
12  2026-06-30T20:18:34.856Z  Test Verification   ← KEEP
13  2026-06-30T21:33:09.215Z  Pattie Stalter      ← KEEP
14  2026-07-01T16:52:07.639Z  Pattie Stalter      ← KEEP
```

## Step 2 — Resolved PDFs

10 PDF files matched for deletion:

```
1-Test_Applicant-2026-03-15.pdf          (84 KB)
2-John_Test-2026-03-15.pdf               (84 KB)
3-Form_Test_User-2026-03-15.pdf          (85 KB)
4-WordPress_Form_Test-2026-03-15.pdf     (85 KB)
5-JV-2026-03-15.pdf                      (84 KB)
6-JV-2026-03-15.pdf                      (84 KB)
7-Email_Test-2026-03-15.pdf              (84 KB)
8-John_Vitiello-2026-05-13.pdf           (84 KB)
9-John_Vitiello-2026-05-14.pdf           (84 KB)
11-John_Vitiello-2026-06-24.pdf          (85 KB)
```

None match keeper ids 12/13/14. Static templates (blank-english.pdf, blank-spanish.pdf, volunteer-application.pdf) unaffected.

## Step 3 — Delete Rows

```sql
DELETE FROM adoption_applications WHERE id IN (1,2,3,4,5,6,7,8,9,11);
```

**Rows affected: 10** ✅

## Step 4 — Delete PDFs

```bash
for id in 1 2 3 4 5 6 7 8 9 11; do rm -f /home/shelter/shelter-apps/adoption-pdfs/${id}-*.pdf; done
```

Completed with no errors.

## Step 5 — Post-Delete Verify

### Remaining DB rows (3):

```
id  submitted_at              applicant_name
12  2026-06-30T20:18:34.856Z  Test Verification
13  2026-06-30T21:33:09.215Z  Pattie Stalter
14  2026-07-01T16:52:07.639Z  Pattie Stalter
```

✅ Exactly 3 rows, ids 12/13/14 only.

### Keeper PDFs intact:

```
12-Test_Verification-2026-06-30.pdf   (84 KB) ✅
13-Pattie_Stalter-2026-06-30.pdf     (85 KB) ✅
14-Pattie_Stalter-2026-07-01.pdf     (85 KB) ✅
```

### Deleted PDFs confirmed gone:

All 10 files for ids 1–9, 11 return "No such file or directory". ✅

## Summary

- 10 DB rows deleted (ids 1, 2, 3, 4, 5, 6, 7, 8, 9, 11)
- 10 PDF files deleted from /home/shelter/shelter-apps/adoption-pdfs/
- 3 keeper rows intact (ids 12, 13, 14) with PDFs preserved
- Static templates untouched
- Service NOT restarted — no restart needed (no caching; tab reads DB directly on each load)
- Backup: pre-adoptions-cleanup-20260702-030845.db (taken by John pre-execution)
