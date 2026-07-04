# Adoptions Phase 2 Fix

## FIX 1 — rowToAdoptionApplication() (localDatabase.ts)

### Root Cause
`rowToAdoptionApplication()` did not map the 6 Phase-1 columns. `SELECT *` returns them from the DB, but the mapper omitted them → `app.vet_ref` etc. were `undefined` → `JSON.stringify` drops `undefined` keys → GET response had no `vetRef`/`persRef`/`incomplete`/`concerns` fields. `notes`/`adopted` survived only because the GET projection used `|| null` (coercing `undefined` to `null`). [VERIFIED]

### 6 Added Lines (after `translated:`)

```ts
    vet_ref: (row.vet_ref as number) ?? 0,
    pers_ref: (row.pers_ref as number) ?? 0,
    incomplete: (row.incomplete as number) ?? 0,
    concerns: (row.concerns as number) ?? 0,
    notes: (row.notes as string) || undefined,
    adopted: (row.adopted as string) || undefined,
```

### Field Name Consistency

| Interface (types.ts) | Mapper field | GET projection | Match? |
|---------------------|-------------|----------------|--------|
| `vet_ref?: number` | `vet_ref` | `vetRef: app.vet_ref` | ✅ |
| `pers_ref?: number` | `pers_ref` | `persRef: app.pers_ref` | ✅ |
| `incomplete?: number` | `incomplete` | `incomplete: app.incomplete` | ✅ |
| `concerns?: number` | `concerns` | `concerns: app.concerns` | ✅ |
| `notes?: string` | `notes` | `notes: app.notes \|\| null` | ✅ |
| `adopted?: string` | `adopted` | `adopted: app.adopted \|\| null` | ✅ |

All snake_case in interface+mapper; GET projection maps to camelCase for the JSON response. `tsc exit 0` confirms type consistency. [VERIFIED]

### Type Note
Interface declares `notes?: string` and `adopted?: string` (optional, not nullable). Mapper returns `|| undefined` (not `?? null`) to match the `string | undefined` type. The GET projection's `app.notes || null` coerces `undefined` to `null` for JSON serialization (JSON null, not dropped). [VERIFIED]

---

## FIX 2 — 3 Status Headers Made Sortable

### Before
```html
<th>In Progress</th>
<th>Declined</th>
<th>Approved</th>
```

### After
```html
<th class="sortable" onclick="sortAdoptionsBy('status')">In Progress <span class="sort-arrow" id="ad-sort-status-ip"></span></th>
<th class="sortable" onclick="sortAdoptionsBy('status')">Declined <span class="sort-arrow" id="ad-sort-status-dec"></span></th>
<th class="sortable" onclick="sortAdoptionsBy('status')">Approved <span class="sort-arrow" id="ad-sort-status-app"></span></th>
```

All 4 status headers (Pending + In Progress + Declined + Approved) now call `sortAdoptionsBy('status')`. [VERIFIED]

### Arrow Update
Sort arrow logic updated: when `adoptionsSortCol === 'status'`, all 4 status arrow spans (`ad-sort-status`, `ad-sort-status-ip`, `ad-sort-status-dec`, `ad-sort-status-app`) show the direction arrow simultaneously. Non-status sorts set only the single matching arrow. `querySelectorAll('[id^="ad-sort-"]')` clears all arrows first (covers all IDs). [VERIFIED]

---

## Untouched

- PATCH handler — untouched [VERIFIED]
- isGatedWrite / isGatedPath — untouched [VERIFIED]
- gatedFetch — untouched [VERIFIED]
- .profiles-table base CSS — untouched [VERIFIED]
- server.ts GET projection — untouched (already had the 6 fields from Phase 2) [VERIFIED]

## Build Result

```
> shelter-apps@2.0.0 build
> tsc
Process exited with code 0.
```
[VERIFIED]

## git diff --stat

```
 dashboard/index.html        | 18 +++++++++++++-----
 server/src/localDatabase.ts |  6 ++++++
 2 files changed, 19 insertions(+), 5 deletions(-)
```

Exactly 2 files. [VERIFIED]

## Commit

```
[master d17daa2] Adoptions Phase 2 fix: map 6 new columns in rowToAdoptionApplication
  (were dropped as undefined), make all 4 status headers sortable
 2 files changed, 19 insertions(+), 5 deletions(-)
```
