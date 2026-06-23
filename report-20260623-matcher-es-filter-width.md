# Matcher-Preview: Spanish Filter Label Width Diagnosis

**Date:** 2026-06-23  
**Type:** Read-only diagnosis  
**Scope:** matcher-preview — Spanish filter row overflow onto third line

---

## 1. Filter Labels + Options (EN + ES)

### Group labels (`matcher-preview/app.js`)

| Key | EN | ES | Line (ES) |
|-----|----|----|-----------|
| `filter.age_label` | Age | Edad | 168 |
| `filter.sex_label` | Sex | Sexo | 169 |
| `filter.color_label` | Color | Color | 170 |
| `filter.energy_label` | Energy | Energía | 172 |
| `filter.special_needs_label` | Special Needs | **Necesidades Especiales** | 173 |
| `filter.good_with_kids_label` | Good with Kids | **Bueno con Niños** | 174 |
| `filter.good_with_dogs_label` | Good with Dogs | **Bueno con Perros** | 175 |
| `filter.good_with_cats_label` | Good with Cats | **Bueno con Gatos** | 176 |

### Option labels (`matcher-preview/app.js`)

| Key | EN | ES | Line (ES) |
|-----|----|----|-----------|
| `filter.age_young` | Young | Joven | 177 |
| `filter.age_adult` | Adult | Adulto | 178 |
| `filter.age_senior` | Senior | Mayor | 179 |
| `filter.sex_male` | M | M | 180 |
| `filter.sex_female` | F | H | 181 |
| `filter.energy_unknown` | Unknown | **Desconocido** | 182 |
| `filter.energy_low` | Low | Bajo | 183 |
| `filter.energy_med` | Med | Medio | 184 |
| `filter.energy_high` | High | Alto | 185 |
| `filter.special_needs_yes` | Yes | Sí | 186 |
| `filter.special_needs_no` | No | No | 187 |
| `filter.compat_unknown` | Unknown | **Desconocido** | 188 |
| `filter.compat_yes` | Yes | Sí | 189 |
| `filter.compat_some` | Some | Algo | 190 |
| `filter.compat_no` | No | No | 191 |

Group labels are rendered with `text-transform: uppercase` and `white-space: nowrap` (`styles.css:246–249`), so the rendered text is the label uppercased and it never wraps internally.

---

## 2. Width Culprits — First Row

The filters container (`.filters`, `styles.css:218–224`) is `display: flex; flex-wrap: wrap; gap: 6px 8px`. All 8 filter groups are children. They wrap based on available width. In English, they typically fit on two lines. In Spanish, the longer strings push to three.

### Longest ES strings by rendered length:

| Rank | String | Type | Approx width* | Repeats |
|------|--------|------|---------------|---------|
| 1 | **NECESIDADES ESPECIALES** | Group label (uppercased) | ~170px | 1× |
| 2 | **BUENO CON NIÑOS** | Group label (uppercased) | ~130px | 1× |
| 3 | **BUENO CON PERROS** | Group label (uppercased) | ~135px | 1× |
| 4 | **BUENO CON GATOS** | Group label (uppercased) | ~130px | 1× |
| 5 | **Desconocido** | Option pill | ~85px | **4×** |

*Approximate at 0.7rem uppercase with letter-spacing 0.5px

### "Desconocido" repetitions:

`filter.energy_unknown` = "Desconocido" — appears in the Energy group (1 pill).  
`filter.compat_unknown` = "Desconocido" — shared by Good with Kids, Dogs, AND Cats via the cbMap (`app.js:345,349,353`). Appears in 3 groups.

**Total: 4 filter pills display "Desconocido."** This makes it the highest-leverage abbreviation — shortening one or two i18n keys reduces 4 rendered pills.

### First-row groups (the ones that overflow):

The first row tries to fit: Age (Edad) + Sex (Sexo) + Color + Energy (Energía) + Special Needs (Necesidades Especiales). In English this is ~5 compact groups. In Spanish, "NECESIDADES ESPECIALES" alone is ~170px (vs "SPECIAL NEEDS" ~100px), and "ENERGÍA" with "Desconocido" pill (~85px vs "Unknown" ~55px) adds ~30px each occurrence. The net ES overshoot on the first row is ~100–140px, forcing the wrap.

---

## 3. Shared vs Filter-Only Analysis

**Critical finding: All `filter.*` keys are filter-only.** The overlay and modal use completely separate key namespaces:

| Surface | Namespace | Example key |
|---------|-----------|-------------|
| Filter labels | `filter.*` | `filter.special_needs_label` → "Necesidades Especiales" |
| Filter options | `filter.*` | `filter.energy_unknown` → "Desconocido" |
| Hover overlay | `overlay.*` | `overlay.special_needs` → "Necesidades especiales" |
| Hover overlay | `overlay.*` | `overlay.energy_low` → "Energía baja" |
| Modal popup | `modal.*` | `modal.sex_label` → "Sexo" |

**Per-candidate safety:**

| Candidate | i18n key | Used by | Filter-only safe? |
|-----------|----------|---------|-------------------|
| "Necesidades Especiales" | `filter.special_needs_label` | Filter group label only | ✅ Yes — overlay uses `overlay.special_needs` separately |
| "Desconocido" (energy) | `filter.energy_unknown` | Energy filter pill only | ✅ Yes — overlay doesn't show "unknown" states |
| "Desconocido" (compat) | `filter.compat_unknown` | Kids/Dogs/Cats filter pills (shared key, 3 pills) | ✅ Yes — overlay doesn't show "unknown" states |
| "Bueno con Niños" | `filter.good_with_kids_label` | Filter group label only | ✅ Yes — overlay uses `overlay.good_with_kids` separately |
| "Bueno con Perros" | `filter.good_with_dogs_label` | Filter group label only | ✅ Yes — overlay uses `overlay.good_with_dogs` separately |
| "Bueno con Gatos" | `filter.good_with_cats_label` | Filter group label only | ✅ Yes — overlay uses `overlay.good_with_cats` separately |
| "Energía" | `filter.energy_label` | Filter group label only | ✅ Yes — overlay uses `overlay.energy_*` |

**All candidates are filter-only-safe.** Abbreviating any `filter.*` ES value will NOT affect the overlay, popup, or English text.

---

## 4. How Labels Are Applied

### Group labels (`app.js:305–327`):

```js
// Filter group labels (direct <label> children of .filter-group)
const filterLabelMap = [
  ['ageFilter', 'filter.age_label'],
  ['sexFilter', 'filter.sex_label'],
  ['colorFilter', 'filter.color_label'],
  ['energyLevel', 'filter.energy_label'],
  ['specialNeeds', 'filter.special_needs_label'],
  ['goodWithKids', 'filter.good_with_kids_label'],
  ['goodWithDogs', 'filter.good_with_dogs_label'],
  ['goodWithCats', 'filter.good_with_cats_label'],
];
```

Each maps a filter name to an i18n key. The `updateLanguage()` function finds the `.filter-group` containing that filter's inputs, then sets its `<label>` child's text to `i18n(key)`.

### Option labels (`app.js:333–365`):

```js
const cbMap = {
  'energyLevel:unknown': 'filter.energy_unknown',
  // ... etc
  'goodWithKids:unknown': 'filter.compat_unknown',
  'goodWithDogs:unknown': 'filter.compat_unknown',
  'goodWithCats:unknown': 'filter.compat_unknown',
};
```

Each maps `name:value` to an i18n key. The function finds the `<input>` by name+value, gets its parent `<label>`, and replaces the text node with `i18n(key)`.

**The `filter.*` namespace is fully self-contained.** Changing ES values in this namespace is Spanish-filter-only — it won't touch English (separate lang block) or the overlay/popup (separate `overlay.*`/`modal.*` keys).

---

## 5. Recommendation — Minimal ES Abbreviations

### High-leverage changes (first-row focused):

| Key | Current ES | Proposed ES | Savings (approx) | Repeats | Total saved |
|-----|-----------|-------------|------------------|---------|-------------|
| `filter.special_needs_label` | Necesidades Especiales | **Nec. Especiales** | ~50px | 1× | ~50px |
| `filter.energy_unknown` | Desconocido | **Desc.** | ~55px | 1× | ~55px |
| `filter.compat_unknown` | Desconocido | **Desc.** | ~55px | 3× | ~165px |

**Total first-row savings:** ~105px from `Nec. Especiales` + `Desc.` in the Energy group alone.  
**Total across all rows:** ~270px (including the 3 compat group pills on row 2).

### Lower-leverage (second row, if needed):

| Key | Current ES | Proposed ES | Savings |
|-----|-----------|-------------|---------|
| `filter.good_with_kids_label` | Bueno con Niños | **Niños** | ~80px |
| `filter.good_with_dogs_label` | Bueno con Perros | **Perros** | ~80px |
| `filter.good_with_cats_label` | Bueno con Gatos | **Gatos** | ~80px |

These are second-row labels; abbreviate only if the second row also overflows after the first-row fixes.

### All are filter-only-safe:
Every proposed change modifies only `filter.*` ES values. English values, overlay text, and popup text are untouched. No separate filter-specific label mechanism is needed — the existing `filter.*` namespace already IS the filter-specific path.

### Implementation scope:
- **File:** `matcher-preview/app.js` lines 173, 182, 188 (and optionally 174–176)
- **Change:** ES string values only — no key renames, no JS logic changes, no CSS changes
- **Also apply to:** `matcher-web/app.js` (same keys at different line numbers) to keep the two in sync
