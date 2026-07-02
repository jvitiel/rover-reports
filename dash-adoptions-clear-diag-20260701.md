# Adoptions Tab Row Cleanup — Diagnosis

## 1. ROW INVENTORY

13 total rows in `adoption_applications`. Submission-date column: **`submitted_at`** (TEXT, ISO-8601 with milliseconds, e.g. `2026-07-01T16:52:07.639Z`). [VERIFIED via `.schema` + `SELECT`]

| id | submitted_at | applicant_name | animal_names_interested | animal_type |
|----|-------------|----------------|------------------------|-------------|
| 14 | 2026-07-01T16:52:07.639Z | Pattie Stalter | Grace Kelly and Dior | cat |
| 13 | 2026-06-30T21:33:09.215Z | Pattie Stalter | Grace Kelly and Dior | cat |
| 12 | 2026-06-30T20:18:34.856Z | Test Verification | Test kitty | cat |
| 11 | 2026-06-24T15:54:22.453Z | John Vitiello | Abe or Jean | cat |
| 9 | 2026-05-14T20:38:35.359Z | John Vitiello | *(empty)* | cat |
| 8 | 2026-05-13T18:11:34.931Z | John Vitiello | *(empty)* | cat |
| 7 | 2026-03-15T15:47:08.604Z | Email Test | Buddy | dog |
| 6 | 2026-03-15T15:41:37.285Z | JV | Barker | dog |
| 5 | 2026-03-15T15:01:58.310Z | JV | Puss | cat |
| 4 | 2026-03-15T14:39:19.354Z | WordPress Form Test | Marmalade, Biscuit | cat |
| 3 | 2026-03-15T14:38:12.548Z | Form Test User | Buddy | dog |
| 2 | 2026-03-15T14:11:52.064Z | John Test | Marmalade | cat |
| 1 | 2026-03-15T14:03:31.626Z | Test Applicant | Buddy, Max | dog |

Note: id 10 does not exist (gap in autoincrement sequence). [VERIFIED]

### KEEP set (3 most recent rows)

| id | submitted_at | applicant_name |
|----|-------------|----------------|
| **14** | 2026-07-01 | Pattie Stalter |
| **13** | 2026-06-30 | Pattie Stalter |
| **12** | 2026-06-30 | Test Verification |

### DELETE set (on/before 2026-06-24 — 10 rows)

| id | submitted_at | applicant_name |
|----|-------------|----------------|
| **11** | 2026-06-24 | John Vitiello |
| **9** | 2026-05-14 | John Vitiello |
| **8** | 2026-05-13 | John Vitiello |
| **7** | 2026-03-15 | Email Test |
| **6** | 2026-03-15 | JV |
| **5** | 2026-03-15 | JV |
| **4** | 2026-03-15 | WordPress Form Test |
| **3** | 2026-03-15 | Form Test User |
| **2** | 2026-03-15 | John Test |
| **1** | 2026-03-15 | Test Applicant |

**DELETE id list: 1, 2, 3, 4, 5, 6, 7, 8, 9, 11**

---

## 2. PDF / ATTACHMENT LINKAGE

PDFs live on disk at **`/home/shelter/shelter-apps/adoption-pdfs/`** with naming convention `{id}-{Name}-{date}.pdf`. [VERIFIED via `ls -la`]

The `adoption_applications` table has a `pdf_generated` flag (INTEGER 0/1) but does **NOT** store the PDF path — the path is derived at API response time by scanning the directory for files matching the id prefix. [VERIFIED via the `GET /api/adoption-applications` handler: `pdfFiles.find(f => f.startsWith(\`${app.id}-\`))`]

**Orphan risk: YES.** Deleting rows from `adoption_applications` will NOT automatically delete the corresponding PDF files. The following PDFs correspond to DELETE-set rows and would be orphaned:

| File | Size | Corresponds to id |
|------|------|-------------------|
| `1-Test_Applicant-2026-03-15.pdf` | 84KB | 1 |
| `2-John_Test-2026-03-15.pdf` | 84KB | 2 |
| `3-Form_Test_User-2026-03-15.pdf` | 85KB | 3 |
| `4-WordPress_Form_Test-2026-03-15.pdf` | 85KB | 4 |
| `5-JV-2026-03-15.pdf` | 84KB | 5 |
| `6-JV-2026-03-15.pdf` | 84KB | 6 |
| `7-Email_Test-2026-03-15.pdf` | 84KB | 7 |
| `8-John_Vitiello-2026-05-13.pdf` | 84KB | 8 |
| `9-John_Vitiello-2026-05-14.pdf` | 84KB | 9 |
| `11-John_Vitiello-2026-06-24.pdf` | 85KB | 11 |

Also in the directory but NOT linked to any application row (static/test files — not orphaned by this delete, already standalone):
- `blank-english.pdf` (309KB, chmod 444)
- `blank-spanish.pdf` (127KB, chmod 444)
- `volunteer-application.pdf` (221KB, chmod 444)
- `test-adoption-es.html` (58KB)
- `TEST-spacing-verify.pdf` (87KB)
- `.gitkeep`

**A clean delete should remove both the DB rows AND their corresponding PDF files.**

---

## 3. REFERENCES / BLAST RADIUS

- **No foreign keys reference `adoption_applications`.** No other table has a FK pointing to it. [VERIFIED via `PRAGMA foreign_key_list` on all tables — the FKs found are: `rg_requests→rg_requesters`, `rg_messages→rg_requests`, `rg_attachments→rg_messages`, `rg_sessions→rg_requesters`, `volunteer_commitments/declines/timeclock→volunteers`. None reference `adoption_applications`.]

- **`adoption_pending` on `animal_metadata` is NOT linked to application rows.** It's a standalone boolean flag set/unset via a separate UI toggle (`PUT` endpoint at `/api/animals/:shelterCode/adoption-pending`). The application submission handler does NOT set `adoption_pending`. [VERIFIED via grep: POST `/api/adoption-application` handler contains no reference to `adoption_pending` or `animal_metadata`.]

- **No link to `rg_requests`/`rg_messages`/`rg_attachments`.** Those tables reference `rg_requesters`, not `adoption_applications`. [VERIFIED via FK inspection.]

- **No audit table references application ids.** [VERIFIED via full table list + FK scan.]

- **`adopter_preferences` is a separate, unrelated table** (keyed by its own id, no FK to applications). [VERIFIED via `.schema adopter_preferences`.]

**Blast radius: DB row delete is self-contained.** No cascading deletes, no dangling FKs, no status flags to unset. The only cleanup needed beyond the row is the PDF file on disk.

---

## 4. EXISTING DELETE PATH

**No DELETE endpoint exists for adoption applications.** [VERIFIED via `grep -n 'app.delete.*adopt'` — zero matches in `server.ts`.]

The only endpoints are:
- `POST /api/adoption-application` — submit new application (inserts row, generates PDF, sends email)
- `GET /api/adoption-applications` — list all for dashboard

There is no app-level delete, so there is no reference implementation for what a clean delete should clean up. Based on the data model:
- A clean delete must: (1) remove the `adoption_applications` row, (2) remove the corresponding `{id}-*.pdf` file from `/home/shelter/shelter-apps/adoption-pdfs/`.
- No linked rows to cascade, no status flags to unset (per §3 above).

---

## 5. RENDER SOURCE

The Adoptions tab fetches `GET /api/adoption-applications` on tab activation (function `loadAdoptionsData()`). [VERIFIED via grep in `dashboard/index.html`.]

That endpoint calls `getAdoptionApplications()` which runs `SELECT * FROM adoption_applications ORDER BY submitted_at DESC` directly against the DB with **no caching** — no server-side cache, no client-side cache. [VERIFIED via `localDatabase.ts` source + grep for `adoptionCache`/`adoptionsCache` returning zero results.]

The PDF URL per row is resolved at query time by scanning the `adoption-pdfs/` directory for files matching the `{id}-` prefix. [VERIFIED via handler source.]

**A DB delete is immediately reflected on the next tab load/refresh. No cache invalidation needed.**
