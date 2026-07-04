# Adoptions Phase 1 — Part A: Columns + Code Changes

## DB Migration — 6 Additive Columns (guarded, idempotent)

Migration script: `/tmp/adopt-migration.sh` (not committed to app repo).
Ran as `sudo -u shelter`. Each column checked via `PRAGMA table_info` before `ALTER TABLE`.

| Column | Type | Result |
|--------|------|--------|
| `vet_ref` | INTEGER NOT NULL DEFAULT 0 | **ADDED** |
| `pers_ref` | INTEGER NOT NULL DEFAULT 0 | **ADDED** |
| `incomplete` | INTEGER NOT NULL DEFAULT 0 | **ADDED** |
| `concerns` | INTEGER NOT NULL DEFAULT 0 | **ADDED** |
| `notes` | TEXT | **ADDED** |
| `adopted` | TEXT | **ADDED** |

Re-run confirmed idempotent (all 6 SKIPPED on second run). [VERIFIED]

### PRAGMA table_info — new columns confirmed

```
87|vet_ref|INTEGER|1|0|0
88|pers_ref|INTEGER|1|0|0
89|incomplete|INTEGER|1|0|0
90|concerns|INTEGER|1|0|0
91|notes|TEXT|0||0
92|adopted|TEXT|0||0
```
[VERIFIED]

## Code Changes (3 files)

### 1. types.ts — ApplicationStatus union

```diff
-export type ApplicationStatus = 'new' | 'reviewed' | 'approved' | 'rejected';
+export type ApplicationStatus = 'pending' | 'in_progress' | 'declined' | 'approved';
```
[VERIFIED — symbol `ApplicationStatus`]

### 2. server.ts — POST handler insert literal

```diff
     const application: AdoptionApplication = {
       language_submitted: body.language === 'es' ? 'es' : 'en',
-      status: 'new',
+      status: 'pending',
       applicant_name: body.applicant_name,
```
[VERIFIED — in `app.post('/api/adoption-application', ...)`]

### 3. localDatabase.ts — saveAdoptionApplication fallback

```diff
   const result = stmt.run(
-    submittedAt, app.language_submitted || 'en', app.status || 'new',
+    submittedAt, app.language_submitted || 'en', app.status || 'pending',
     app.applicant_name, app.applicant_email, ...
```
[VERIFIED — in `saveAdoptionApplication()`]

## Build Result

```
> shelter-apps@2.0.0 build
> tsc

Process exited with code 0.
```

**tsc exit 0** — no stray references to removed literals `'new'`, `'reviewed'`, `'rejected'`. [VERIFIED]

## git diff --stat

```
server/src/localDatabase.ts | 2 +-
server/src/server.ts        | 2 +-
server/src/types.ts         | 2 +-
3 files changed, 3 insertions(+), 3 deletions(-)
```

Exactly 3 files as expected. [VERIFIED]

## Commit

```
[master 77b6681] Adoptions Phase 1: add 6 columns (migration), ApplicationStatus union →
  pending/in_progress/declined/approved, insert defaults new→pending
 3 files changed, 3 insertions(+), 3 deletions(-)
```

Only `src/types.ts`, `src/server.ts`, `src/localDatabase.ts` staged. Migration script NOT committed to app repo. [VERIFIED]

## Status UPDATE Confirmation

**The status UPDATE was NOT run.** All 5 existing rows remain `status = 'new'`:

```
12|new
13|new
14|new
15|new
16|new
```

The `UPDATE adoption_applications SET status = 'pending' WHERE status = 'new'` is deferred to a separate step after John restarts the service. [VERIFIED]

## DB Ownership

File owner unchanged — migration ran as `shelter` user via `sudo -u shelter`. [VERIFIED]
