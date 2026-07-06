# Adoption Address Split Implementation — 2026-07-06

## DB Migration (guarded, idempotent)

Migration script: `scripts/migrate-address-split.sh`

| Column | Result |
|--------|--------|
| applicant_city | ADDED |
| applicant_state | ADDED |
| applicant_zip | ADDED |

All 3 nullable TEXT, no NOT NULL, no DEFAULT. `applicant_address` untouched (col 8, TEXT NOT NULL).

PRAGMA table_info (address columns):
```
8|applicant_address|TEXT|1||0
93|applicant_city|TEXT|0||0
94|applicant_state|TEXT|0||0
95|applicant_zip|TEXT|0||0
```

0 rows mutated (additive schema only).

## types.ts

Added 3 optional fields to `AdoptionApplication` interface after `applicant_address`:
```typescript
applicant_city?: string;
applicant_state?: string;
applicant_zip?: string;
```
Snake_case matches existing `applicant_address` convention.

## localDatabase.ts — INSERT + rowToAdoptionApplication

### INSERT (saveAdoptionApplication)
Column list extended: `applicant_city, applicant_state, applicant_zip` added after `applicant_address`. 3 additional `?` placeholders in VALUES. Bound params: `app.applicant_city || null`, `app.applicant_state || null`, `app.applicant_zip || null`.

### rowToAdoptionApplication mapper
All 3 mapped from row:
```typescript
applicant_city: (row.applicant_city as string) || undefined,
applicant_state: (row.applicant_state as string) || undefined,
applicant_zip: (row.applicant_zip as string) || undefined,
```
These will appear in the object and surface in JSON responses (avoids the undefined-drops-from-JSON bug that hit adoptions checkboxes).

## server.ts — POST handler

POST `/api/adoption-application` reads from `req.body`:
```typescript
applicant_city: body.applicant_city,
applicant_state: body.applicant_state,
applicant_zip: body.applicant_zip,
```
NOT added to `requiredFields` (soft-launch: accept-but-don't-require).

## server.ts — GET projection

GET `/api/adoption-applications` `.map()` extended with:
```typescript
applicantCity: app.applicant_city || null,
applicantState: app.applicant_state || null,
applicantZip: app.applicant_zip || null,
```
CamelCase convention matches existing GET response fields (vetRef, persRef, etc.).

## pdfGenerator.ts — Address Block

Legacy conditional logic:
- **New structured submission** (any of city/state/zip has a value): renders `applicant_address` (street) via `twoColumn`, then a second line below with `"city, state zip"` formatted from the 3 fields (filters out empty segments).
- **Legacy row** (all 3 new fields empty/NULL — the 5 existing rows): renders `applicant_address` alone via `twoColumn`. No empty structured line, no garbled ", " with empty fields.

Format for structured: `"City, ST 12345"` (city + comma + space + state + space + zip, skipping empty parts).

## Untouched (confirmed)

| Item | Status |
|------|--------|
| `applicant_address` column | Untouched (col 8, TEXT NOT NULL) |
| `applicant_address` handling in POST | Untouched (line 9027: `applicant_address: body.applicant_address`) |
| `requiredFields` array | Untouched (6 fields, no city/state/zip) |
| Translation allowlist | Untouched (grep: 0 matches in `fieldsToTranslate` block) |
| Public POST gate status | Untouched (no auth/gate change) |

## git diff --stat
```
server/src/localDatabase.ts |  9 ++++++---
server/src/pdfGenerator.ts  | 17 ++++++++++++++++-
server/src/server.ts        |  6 ++++++
server/src/types.ts         |  3 +++
4 files changed, 31 insertions(+), 4 deletions(-)
```

Plus `scripts/migrate-address-split.sh` (new, 5 files total in commit).

## Build

`npm run build` (tsc) exit code 0. Service NOT restarted per instructions.

## Commit

`fc81899` — "Adoption address split: add applicant_city/state/zip (additive, nullable, soft-launch accept-but-don't-require); wire types/db/POST/PDF; applicant_address kept as street; legacy rows render blob-only"

Files: `scripts/migrate-address-split.sh`, `server/src/types.ts`, `server/src/localDatabase.ts`, `server/src/server.ts`, `server/src/pdfGenerator.ts`
