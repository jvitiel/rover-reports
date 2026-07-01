# Profiles Tab "Entered" Column — Implementation Report

## Server change (server/src/server.ts)

One field added to the per-animal return object in `GET /api/dashboard/profiles-summary`:

```typescript
dateIntake: sm.dateIntake || null,
```

Inserted between `dateOfBirth` and `profileCount`. The `sm` object is the same `smAnimals` entry the handler already uses for `name`, `species`, `location`, etc. — no new fetch or lookup added. `sm.dateIntake` maps to SM's `DATEBROUGHTIN` field (set in `normalizeAnimal()` in `shelterManagerService.ts`).

## Dashboard changes (dashboard/index.html)

### New `<th>` (header)

Inserted between Location and Age:

```html
<th class="sortable" onclick="sortProfilesBy('dateIntake')">Entered <span class="sort-arrow" id="pf-sort-dateIntake"></span></th>
```

### New `<td>` (row cell)

Inserted between `location-cell` td and age td in `renderProfilesTable()`:

```html
<td class="entered-cell" title="${escapeHtml(a.dateIntake || '')}">${a.dateIntake ? formatShortDate(a.dateIntake) : '—'}</td>
```

### Date format helper

**Added new** — no reusable `formatShortDate` existed. The file had inline `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })` calls in ~8 places but no shared function. New helper:

```javascript
function formatShortDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
```

Renders e.g. `"2025-11-06T00:00:00"` → `"Nov 6, 2025"`. Placed immediately before `sortProfilesBy()`.

### Colspan updates

Three `colspan="9"` → `colspan="10"`:
- Loading state: `<tr><td colspan="10" ...>Loading profiles...</td></tr>`
- Empty state: `No animals match filters`
- Error state: `${error.message}` in the `loadProfilesData()` catch block

The RGC table's `colspan="9"` (line ~11192, different table) was correctly left untouched.

### Sort confirmation

`dateIntake` is an ISO-8601 string (e.g. `"2025-11-06T00:00:00"`). The sort comparator has special cases only for `bioState` and `location`. `dateIntake` falls through to the generic `typeof va === 'string'` → `localeCompare` branch, which sorts ISO-8601 strings chronologically. Nulls sort last via the existing null guards (`if (va == null) return 1`). No sort-logic changes made.

### Horizontal scroll — Profiles-scoped

**CSS modifier added:**

```css
.profiles-table-wrapper.wrapper-scroll-x {
  overflow-x: auto;
  overflow-y: auto;
}
```

Placed immediately after the base `.profiles-table-wrapper` rule (after its closing `}`).

**Class applied to Profiles wrapper ONLY:**

```html
<div class="profiles-table-wrapper wrapper-scroll-x">  <!-- Profiles table -->
```

**Adoptions wrapper NOT modified:**

```html
<div class="profiles-table-wrapper">  <!-- Adoptions table — unchanged -->
```

The base `.profiles-table-wrapper` rule is untouched (`overflow: hidden` remains the default). The modifier overrides overflow only on the Profiles instance. `overflow-y: auto` is explicitly set in the modifier to ensure vertical scroll is preserved (the base rule sets `overflow-y: auto` after `overflow: hidden`, but the modifier replaces both axes cleanly).

## Build

```
$ cd /home/shelter/shelter-apps/server && npm run build
> shelter-apps@2.0.0 build
> tsc
(exit 0)
```

## Git

```
$ git diff --stat
dashboard/index.html | 21 +++++++++++++++++----
 server/src/server.ts |  1 +
 2 files changed, 18 insertions(+), 4 deletions(-) 

$ git add server/src/server.ts dashboard/index.html
$ git commit -m "Add sortable Entered (SM intake date) column to Profiles table, Profiles-scoped horizontal scroll"
[master be8464d]
```

Service NOT restarted. Build artifacts in `server/dist/` are ready; restart needed before the API change takes effect.
