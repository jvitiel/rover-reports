# Bio State "Priority" Label Split — Diagnosis Report

**Date:** 2026-06-24  
**Scope:** Read-only diagnosis. Display-label-only split of "needed" into "needed" (84 days–under 1yr) vs "priority" (≥1yr).

---

## 1. Bio State Label Render

The Bio State column cell renders in `renderProfilesTable()` at **dashboard/index.html:15519**:

```js
<td>${a.bioState || '—'}</td>
```

There is **no label-mapping layer**. The raw `bioState` value from the server (`'needed'`, `'pending'`, `'youth'`, `'approved'`) is displayed directly as the cell text. The value comes from the API response object; the client does zero transformation.

The server computes `bioState` via `computeBioState()` at **server/src/server.ts:2665–2704** and returns it on the profiles endpoint response at **server/src/server.ts:1367**:

```ts
bioState: computeBioState(bioForLabel, sm.shelterCode, sm.description, sm.dateOfBirth, null),
```

The function returns one of four string literals: `'approved'`, `'pending'`, `'youth'`, `'needed'` (server.ts:2672).

---

## 2. dateOfBirth Availability on the Row

`dateOfBirth` is included on every profiles row at **server/src/server.ts:1368**:

```ts
dateOfBirth: sm.dateOfBirth || null,
```

On the client side, the same field is used for the Age column at **dashboard/index.html:15511**:

```js
const ageStr = formatShortAge(a.dateOfBirth);
```

`formatShortAge` is defined at **dashboard/index.html:15407** and parses `dateOfBirth` into a `Date` object.

**Confirmed:** `a.dateOfBirth` is available at the exact render point (line 15519) where the Bio State label is emitted. An age-in-days check (`(Date.now() - new Date(a.dateOfBirth)) / 86400000 >= 365`) can be performed inline at that spot.

---

## 3. Needed Filter Logic

### Profiles Tab Filter

The profiles-tab "Needed" button is at **dashboard/index.html:5344**:

```html
<button class="profiles-filter-btn" onclick="setProfilesBioStateFilter('needed')" id="pf-bio-needed">Needed</button>
```

`setProfilesBioStateFilter` sets `profilesBioStateFilter = 'needed'` at **dashboard/index.html:15401**.

The filter applies at **dashboard/index.html:15464–15465**:

```js
if (profilesBioStateFilter !== 'all') {
    animals = animals.filter(a => a.bioState === profilesBioStateFilter);
}
```

**This matches on `a.bioState` — the underlying server-computed value, not the displayed text.** Since the proposal only changes the *displayed label* (the `<td>` text) from "needed" to "priority" for ≥1yr animals, and does NOT change `a.bioState` (which remains `'needed'` from the server), the filter `a.bioState === 'needed'` will continue to match both sub-groups.

### Main Tab Filter (Overview)

The main-tab "Needed" button at **dashboard/index.html:5288** calls `setBioStateFilter('needed')`, which filters at **dashboard/index.html:6979**:

```js
filtered = filtered.filter(a => a.bioState === currentBioStateFilter);
```

Same pattern — matches the underlying `bioState` property, not a displayed label.

**Confirmed: A display-only label split will NOT drop any animals from the Needed filter on either tab.**

---

## 4. Sort Behavior

Bio State column sorting is handled at **dashboard/index.html:15470–15480**:

```js
const bioStateOrder = { needed: 0, pending: 1, youth: 2, approved: 3 };
// ...
if (profilesSortCol === 'bioState') {
    return dir * ((bioStateOrder[va] ?? -1) - (bioStateOrder[vb] ?? -1));
}
```

Sort uses the **underlying `a.bioState` value** (the `va`/`vb` are `a[profilesSortCol]` which is `a.bioState`), not the displayed label. Both "needed" and "priority" animals have `a.bioState === 'needed'`, so they'd both get sort order `0` and group together.

**Sort is unaffected by a display-only label change.** Within the "needed" group, the two sub-labels would be interleaved (since they share the same sort rank), but that's harmless — they're already all lumped together today.

---

## 5. Cleanest Minimal Split Point

The single change point is **dashboard/index.html:15519**, the `<td>` that renders Bio State:

**Current:**
```js
<td>${a.bioState || '—'}</td>
```

**Proposed (label-render-only):**
```js
<td>${a.bioState === 'needed' && a.dateOfBirth && (Date.now() - new Date(a.dateOfBirth)) / 86400000 >= 365 ? 'priority' : (a.bioState || '—')}</td>
```

This is the **entire change**. Nothing else needs to change:

- `computeBioState()` on the server: **untouched** — still returns `'needed'` for both sub-groups.
- `a.bioState` property on each row: **untouched** — remains `'needed'`.
- Profiles-tab "Needed" filter (line 15465): **untouched** — still matches `a.bioState === 'needed'`, catches both.
- Main-tab "Needed" filter (line 6979): **untouched** — same.
- Sort order map (line 15470): **untouched** — both display as sort rank 0.
- Filter button labels: **untouched** — "Needed" button still filters on `'needed'` state.
- Filter counts: if any badge/count logic exists, it counts by `a.bioState`, not displayed label — **untouched**.

### Optional Enhancement

If distinct CSS styling is desired for "priority" vs "needed" labels (e.g., different badge color), that can be added via a class on the `<td>` at the same spot, but that's a separate cosmetic decision.

---

## Summary

| Aspect | Finding |
|--------|---------|
| Label render point | dashboard/index.html:15519 — raw `a.bioState` as text, no mapping layer |
| dateOfBirth on row | Yes, `a.dateOfBirth` available at render point (same field as Age column) |
| Needed filter | Matches `a.bioState` (underlying value), NOT displayed label — safe |
| Sort | Uses `a.bioState` value with precedence map — unaffected |
| Minimal change | Single line at 15519: display "priority" when `bioState === 'needed'` AND age ≥ 365 days |
