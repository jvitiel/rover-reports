# Adoption Applications `status` Column — Pre-Migration Consumer Enumeration

## 2a. READ-CONSUMER ENUMERATION

### Server-side reads

| # | File | Symbol/Expression | What it does | Compares to `'new'`? | Would break if `'pending'`? |
|---|------|-------------------|-------------|---------------------|---------------------------|
| 1 | `server.ts` | `app.get('/api/adoption-applications', ...)` — response object `status: app.status` | Passes status through to client as `status` field in JSON response. No comparison, pure pass-through. | No — passes raw value | **No** — would pass `'pending'` instead [VERIFIED] |
| 2 | `localDatabase.ts` | `getAdoptionApplications(status?)` — `WHERE status = ?` when arg provided | Optional filter. Only call site is `server.ts` line `getAdoptionApplications()` with **no argument**, so the WHERE clause is never applied. | No — never called with a filter value | **No** [VERIFIED] |
| 3 | `localDatabase.ts` | `rowToAdoptionApplication()` — `status: row.status as AdoptionApplication['status']` | Type cast during row mapping. Casts to `ApplicationStatus` (see 2b below for type union). | No — pure cast | **No** at runtime (JS casts are erased). **Yes at compile time** — see constraint in 2b. [VERIFIED] |
| 4 | `localDatabase.ts` | `getAdoptionApplication(id)` — `SELECT * FROM adoption_applications WHERE id = ?` | Fetches single row, maps via `rowToAdoptionApplication`. Same pass-through as #3. | No | **No** [VERIFIED] |

### Dashboard client reads

| # | File | Symbol/Expression | What it does | Compares to `'new'`? | Would break if `'pending'`? |
|---|------|-------------------|-------------|---------------------|---------------------------|
| 5 | `dashboard/index.html` | `loadAdoptionsData()` — row template `rows.map(a => ...)` | **Does NOT render `a.status` at all.** The 5 rendered columns are: Date, Applicant, Animal(s), Species, PDF. `a.status` is in the response object but ignored by the template. | No — field not referenced | **No** [VERIFIED] |

### Email templates

| # | File | Symbol/Expression | References status? |
|---|------|-------------------|--------------------|
| 6 | `emailService.ts` | `sendApplicationEmail()` — staff notification | **No.** Uses `app.applicant_name`, `app.applicant_email`, `app.animal_names_interested`, `app.language_submitted`, etc. Does not reference `app.status`. [VERIFIED] |
| 7 | `emailService.ts` | `sendApplicantConfirmationEmail()` — applicant confirmation | **No.** Same — no reference to `app.status`. [VERIFIED] |
| 8 | `test-email-samples.ts` | Test email content | **No.** Contains hardcoded sample HTML; does not reference status. [VERIFIED] |

### Other codepaths checked — no hits

| Scope | Searched | Result |
|-------|----------|--------|
| Adoption form | `adoption-form.html` | `pet_status` fields are for previous-pet ownership history, **not** `adoption_applications.status`. [VERIFIED] |
| PWA apps | `staff-pwa/`, `staging-staff/`, `volunteer-pwa/`, `dogwalker-pwa/`, `matcher-pwa/`, `caregiver-pwa/`, `coordinator-pwa/` | No reference to `adoption_applications` or its status. [VERIFIED] |
| Matcher web | `matcher-web/app.js`, `matcher-preview/app.js` | Reference `adoptionPending` (animal_metadata flag), not `adoption_applications.status`. [VERIFIED] |
| Public pages | `public/` directory | No reference to adoption_applications. [VERIFIED] |
| Scripts | `/home/shelter/scripts/` | `health-check.sh.bak-pre-rebuild` counts rows (`SELECT COUNT(*)`) — does not filter or read status. [VERIFIED] |
| CSV/export/report paths | grep across `server/src/` for csv/export/report + adoption | No hits. [VERIFIED] |
| Bio pipeline / attributeParser | `attributeParser.ts` | Handles Spanish field translation only; does not read status. [VERIFIED] |
| RescueGroups Cares module | `rg_*` tables and related code | Entirely separate data model (`rg_requests` etc.) — no cross-reference to `adoption_applications`. [VERIFIED] |
| Petfinder push / SM bridge | `shelterManagerService.ts` | Operates on `animal_metadata`; no reference to `adoption_applications`. [VERIFIED] |

### Bottom line

**No reader — logic or display — depends on the value being `'new'`.** [VERIFIED]

The `status` field is:
- Set to `'new'` on INSERT (2 places — see 2c)
- Passed through in the GET response but **never rendered, filtered, compared, or branched on** by any consumer
- Not displayed to any user on any screen or in any email

The migration from `'new'` → `'pending'` will not change any visible behavior or break any logic.

---

## 2b. CONSTRAINT CHECK

### Column definition (from live schema)

```sql
CREATE TABLE adoption_applications (
  ...
  status TEXT NOT NULL DEFAULT 'new',
  ...
)
```
[VERIFIED — `SELECT sql FROM sqlite_master WHERE name='adoption_applications'`]

**No CHECK constraint.** The column is plain `TEXT NOT NULL DEFAULT 'new'`. SQLite will accept any text value. [VERIFIED]

### TypeScript type constraint

```ts
// types.ts, symbol ApplicationStatus
export type ApplicationStatus = 'new' | 'reviewed' | 'approved' | 'rejected';
```
[VERIFIED]

**⚠️ This type union does NOT include `'pending'`, `'in_progress'`, or `'declined'`.** The migration requires updating this type to:

```ts
export type ApplicationStatus = 'pending' | 'in_progress' | 'declined' | 'approved';
```

Without this change, `tsc` will reject code that sets `status: 'pending'`. The type is used in:
- `AdoptionApplication.status` interface field (symbol `status: ApplicationStatus` in `types.ts`)
- `rowToAdoptionApplication()` cast in `localDatabase.ts` (runtime safe, compile-time enforced)

**The old values `'new'`, `'reviewed'`, `'rejected'` should be removed** since they'll never be written again. `'approved'` stays (it's in both old and new sets). [VERIFIED]

### DB-level constraint

No CHECK, no ENUM, no triggers on `adoption_applications`. The index `idx_app_status` is a plain B-tree index — it indexes any value, no restriction. [VERIFIED]

**Conclusion:** The new values `pending / in_progress / declined / approved` cannot be rejected at the DB level. The only gate is the TypeScript type union, which must be updated. [VERIFIED]

---

## 2c. INSERT-PATH ENUMERATION

### INSERT paths

| # | File | Symbol | Sets status explicitly? | Value | Relies on DEFAULT? |
|---|------|--------|------------------------|-------|-------------------|
| 1 | `server.ts` | `app.post('/api/adoption-application', ...)` — builds application object | **Yes, explicitly:** `status: 'new'` | `'new'` | No — explicit in object literal | [VERIFIED] |
| 2 | `localDatabase.ts` | `saveAdoptionApplication()` — INSERT statement | **Yes, explicitly:** `app.status \|\| 'new'` in the VALUES list | `'new'` (from caller or fallback) | No — status is in the INSERT column list, not left to DEFAULT | [VERIFIED] |

**No other INSERT paths exist.** No seed scripts, no import tools, no RG Cares code, no test harness inserts into `adoption_applications`. The test-mode branch in the POST handler (`body._test === true`) returns early before the `saveAdoptionApplication` call. [VERIFIED]

**Migration plan for inserts:** Change the literal `'new'` → `'pending'` in two places:
1. `server.ts` symbol `status: 'new'` in the application object builder → `status: 'pending'`
2. `localDatabase.ts` symbol `app.status || 'new'` → `app.status || 'pending'`

The schema DEFAULT (`DEFAULT 'new'`) is dead code — never reached because the INSERT always provides status explicitly. It can be left as-is (no table rebuild needed) or updated in the CREATE TABLE string for future consistency (only affects fresh database creation, not existing data). [VERIFIED]

### UPDATE paths (writers of status)

| # | File | Symbol | Callers | Values written |
|---|------|--------|---------|---------------|
| 1 | `localDatabase.ts` | `updateAdoptionApplicationStatus(id, status)` | **Zero callers.** Exported but never imported or called anywhere in `server.ts` or any other file. [VERIFIED — grep found only the definition] | Accepts any `string` (parameter type is `string`, not `ApplicationStatus`) — tolerates any value. [VERIFIED] |

**No HTTP endpoint calls `updateAdoptionApplicationStatus`.** The function exists but is orphaned — it was presumably written for future use. Its `string` parameter type means it will accept `'pending'`, `'in_progress'`, `'declined'`, and `'approved'` without complaint. [VERIFIED]

### Existing data

```
id=12  status='new'
id=13  status='new'
id=14  status='new'
id=15  status='new'
id=16  status='new'
```
5 rows, all `'new'`. [VERIFIED — `SELECT id, status FROM adoption_applications`]

Migration statement: `UPDATE adoption_applications SET status = 'pending' WHERE status = 'new';` — affects all 5 rows. [INFERRED]

### Summary: safe to proceed

The full change set for the status remap is:
1. `types.ts` — update `ApplicationStatus` union to `'pending' | 'in_progress' | 'declined' | 'approved'`
2. `server.ts` — change `status: 'new'` → `status: 'pending'` in the POST handler object builder
3. `localDatabase.ts` — change `app.status || 'new'` → `app.status || 'pending'` in `saveAdoptionApplication`
4. DB migration — `UPDATE adoption_applications SET status = 'pending' WHERE status = 'new'`
5. (Optional) `localDatabase.ts` — update the CREATE TABLE string's DEFAULT from `'new'` to `'pending'` for fresh-DB consistency

No consumer will break. No display will change (status is not rendered anywhere today). [VERIFIED]
