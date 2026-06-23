# Searcher (custom-search): "All" Buttons Diagnosis

**Date:** 2026-06-23  
**Type:** Read-only diagnosis  
**Scope:** Adding "All" buttons to Gender and Age filter groups + tightening top-row width

---

## File Locations

| File | Path |
|------|------|
| HTML | `/home/shelter/shelter-apps/custom-search/index.html` (149 lines) |
| CSS | `/home/shelter/shelter-apps/custom-search/styles.css` (1003 lines) |
| JS | `/home/shelter/shelter-apps/custom-search/app.js` (641 lines) |

Served by Express under the `/custom-search` route (static files).

---

## 1. Filter Group Structure + Logic

### Species (for reference — NOT being changed)

**Type:** Radio buttons (single-select)  
Source: `index.html:34–36`
```html
<label class="pill-label"><input type="radio" name="species" value="cat" checked>Cat</label>
<label class="pill-label"><input type="radio" name="species" value="dog">Dog</label>
<label class="pill-label"><input type="radio" name="species" value="small_animal">Small Animal</label>
```
Always exactly one selected (radio). Default: `cat` (has `checked`). Collected via `getChecked('species')[0]` at `app.js:327`.

### Gender

**Type:** Checkboxes (MULTI-select)  
Source: `index.html:44–45`
```html
<label class="pill-label"><input type="checkbox" name="sex" value="male">Male</label>
<label class="pill-label"><input type="checkbox" name="sex" value="female">Female</label>
```

**Default on load:** None checked. The `resetAndShowForm()` (`app.js:279`) explicitly unchecks all:
```js
document.querySelectorAll('input[name="sex"], input[name="ageGroup"]').forEach(el => el.checked = false);
```

**"None selected" = INVALID.** The submit handler (`app.js:303–311`) validates that at least one is checked:
```js
const sex = getChecked('sex');
// ...
if (sex.length === 0) {
  document.getElementById('sex-error').classList.add('visible');
  valid = false;
}
```
Validation error at `index.html:47`: `"Please select at least one gender option."`

**State tracking:** Native checkbox `checked` state. No JS state object — collected at submit time via `getChecked('sex')` (`app.js:290–292`):
```js
function getChecked(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(el => el.value);
}
```

**Visual selection:** CSS `:has(input:checked)` at `styles.css:226–230`:
```css
.pill-label:has(input:checked) {
  border-color: #C9613F;
  background: rgba(201, 97, 63, 0.08);
  color: #C9613F;
}
```
No JavaScript class toggling — purely CSS-driven from the native checked state.

### Age

**Type:** Checkboxes (MULTI-select)  
Source: `index.html:55–57`
```html
<label class="pill-label"><input type="checkbox" name="ageGroup" value="young">Young</label>
<label class="pill-label"><input type="checkbox" name="ageGroup" value="adult">Adult</label>
<label class="pill-label"><input type="checkbox" name="ageGroup" value="senior">Senior</label>
```

**Default on load:** None checked (same `resetAndShowForm` clears all).

**"None selected" = INVALID.** Same validation pattern (`app.js:304–311`):
```js
const ageGroup = getChecked('ageGroup');
// ...
if (ageGroup.length === 0) {
  document.getElementById('age-error').classList.add('visible');
  valid = false;
}
```

**State tracking and visual:** Identical to Gender — native checkbox state, CSS `:has(input:checked)`.

---

## 2. Pill CSS

### Base pill (`styles.css:204–220`):
```css
.pill-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 30px;
  border: 1.5px solid #C9613F;
  border-radius: 999px;
  background: #FAF7F0;
  color: #2C2925;
  font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif;
  font-size: 22px;
  font-weight: 400;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  transition: border-color 200ms ease, background-color 200ms ease, color 200ms ease;
}
```

### Hover (`styles.css:222–224`):
```css
.pill-label:hover {
  border-color: #6B6660;
}
```

### Selected/checked (`styles.css:226–230`):
```css
.pill-label:has(input:checked) {
  border-color: #C9613F;
  background: rgba(201, 97, 63, 0.08);
  color: #C9613F;
}
```

### Focus-visible (`styles.css:232–235`):
```css
.pill-label:has(input:focus-visible) {
  outline: 3px solid rgba(201, 97, 63, 0.3);
  outline-offset: 2px;
}
```

### Mobile (<768px) overrides (`styles.css:929+`):
```css
.pill-label {
  padding: 10px 16px;
  font-size: 15px;
}
```

**An "All" pill should use the same `.pill-label` markup** — a `<label class="pill-label">` wrapping a checkbox input. The `:has(input:checked)` selector handles the active visual automatically.

---

## 3. "All" Behavior Feasibility

Both Gender and Age are **multi-select checkboxes** where **none selected = invalid** (submit blocked with error). This means "All" should mean "select all options" (both/all checked), not "clear all" — because clearing would trigger the validation error.

### Recommended model: "All" = select-all toggle

**Clicking "All":**
- Check all other checkboxes in the group (male+female, or young+adult+senior)
- Check the "All" checkbox itself (so it shows selected)

**Clicking any individual pill when "All" is active:**
- Uncheck "All"
- Uncheck that individual (the user is narrowing from all → some)
- Leave the remaining individuals checked

**Clicking an individual pill when "All" is NOT active:**
- Normal toggle behavior
- If the result is now all individuals checked → auto-check "All" too (optional nicety)

### Where the logic lives (locations for the All handler):

1. **HTML:** Add `<label class="pill-label"><input type="checkbox" name="sex" value="all">All</label>` as the first pill in each group's `.pill-row` — `index.html:44` (Gender) and `index.html:55` (Age).

2. **Click handler:** Currently no JS click handlers on the checkboxes — the form relies on native checkbox behavior and reads state at submit time. The "All" toggle logic requires adding event listeners. Best location: near `getChecked()` at `app.js:290`. Add a listener on each `.pill-row` (event delegation) that:
   - If the clicked input is `value="all"`, set all sibling checkboxes in the group to match its checked state
   - If the clicked input is NOT `value="all"` and is now unchecked, uncheck the "all" input
   - If the clicked input is NOT `value="all"` and now all siblings are checked, auto-check "all"

3. **Submit handler (`app.js:303`):** `getChecked('sex')` would now include `"all"` in the array when the All pill is checked. Either: (a) filter out `"all"` before sending to API: `sex.filter(v => v !== 'all')`, or (b) use a data attribute instead of a value for the All pill so it doesn't appear in `getChecked`. Option (a) is simpler — one line each at `app.js:303` and `app.js:304`.

4. **`resetAndShowForm()` (`app.js:279`):** Already clears all checkboxes including any new "all" checkbox — no change needed.

5. **i18n (`app.js`):** Add `'filter.sex_all': 'All'` / `'Todos'` and `'filter.age_all': 'All'` / `'Todos'` to both lang objects. Add the label-update mapping at `app.js:134–141`.

6. **Validation:** If "All" is checked, the group has selections → validation passes. If user unchecks "All" and all individuals, validation correctly fires. No change needed to validation logic.

---

## 4. Top-Row Width (Spanish Worst Case)

### Layout structure

On desktop (≥1024px), the Species + Gender groups sit on one flex row, and Age sits on its own line below.

**Desktop media query (`styles.css:837–852`):**
```css
@media (min-width: 1024px) {
  .filter-group {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }

  .filter-row-shared {
    flex-direction: row;
    justify-content: center;
    gap: 64px;
  }
}
```

- `.filter-row-shared` goes from `flex-direction: column; gap: 24px` (mobile default, `styles.css:103–108`) to `flex-direction: row; gap: 64px` on desktop.
- Each `.filter-group` becomes a flex row (label + pills inline).

### Current spacing values

| Spacing | Property | Location | Value |
|---------|----------|----------|-------|
| **Label → first pill** | `.filter-group-label { margin-right }` | `styles.css:186` | **32px** |
| **Between pills** | `.pill-row { gap }` | `styles.css:190` | **16px** |
| **Between groups** (Species ↔ Gender) | `.filter-row-shared { gap }` (desktop) | `styles.css:851` | **64px** |
| **Pill horizontal padding** | `.pill-label { padding }` | `styles.css:212` | **12px 30px** (30px each side) |

### Spanish worst-case labels

| Group | Label | Pill texts |
|-------|-------|------------|
| Species | `Especie` | `Gato`, `Perro`, `Animal Pequeño` |
| Gender | `Sexo` | `Macho`, `Hembra`, + new `Todos` |
| Age | `Edad` | `Joven`, `Adulto`, `Mayor`, + new `Todos` |

Longest pill text: **"Animal Pequeño"** (14 chars at 22px serif ≈ ~190px with 30px padding each side).

### Width analysis — Species + Gender row (Spanish)

Current row width (approximate at 22px font):

**Species group:**
- Label "Especie": ~80px + 32px margin-right = 112px
- Pills: "Gato" (~110px) + 16px + "Perro" (~120px) + 16px + "Animal Pequeño" (~250px) = ~512px
- Subtotal: ~624px

**Gender group (after adding "Todos"):**
- Label "Sexo": ~50px + 32px margin-right = 82px
- Pills: "Todos" (~120px) + 16px + "Macho" (~130px) + 16px + "Hembra" (~140px) = ~422px
- Subtotal: ~504px

**Gap between groups:** 64px

**Total row:** 624 + 64 + 504 = **~1192px**

On a 1024px viewport, this overflows by ~168px. The `flex-wrap: wrap` on `.filter-group` lets it wrap, but wrapping within a group splits the label from its pills or pills from each other, which is ugly.

### Tightening levers

**Lever 1 — Label-to-button spacing (`margin-right: 32px` → 16px or 12px):**
Saves 32→12 = 20px × 2 groups = **40px**. Moderate help.

**Lever 2 — Between-group gap (`gap: 64px` → 32px or 24px):**
Saves 64→32 = **32px**. Significant.

**Lever 3 — Pill horizontal padding (`padding: 12px 30px` → `12px 20px`):**
Saves 20px per pill × 6 pills on the row = **120px**. Most impactful.

**Lever 4 — Pill gap (`gap: 16px` → 10px or 8px):**
Saves 6–8px × 5 gaps = **30–40px**.

### Assessment

Label spacing alone (Lever 1, ~40px) is **not sufficient** to fit the Spanish worst case on a 1024px viewport — the deficit is ~168px. You'd need at minimum Levers 1 + 2 + 3 (40 + 32 + 120 = 192px savings) to comfortably fit. Lever 3 (pill padding) is the biggest single win.

The Age row is less constrained (only one group: "Edad" + 4 pills including "Todos"), so it fits easily with any tightening.

### Where it currently wraps in Spanish

On viewports 1024–1200px, the Species+Gender row likely already wraps — the Gender group drops below Species within `.filter-row-shared` (which has `flex-wrap: wrap` inherited from `.filter-group`'s wrap). Adding "Todos" to Gender makes this worse. On wide screens (1400px+), it fits.

---

## 5. Recommendation (Minimal Plan)

### Adding the "All" pills

1. **HTML (`index.html`):**
   - Gender group (line 44): add `<label class="pill-label"><input type="checkbox" name="sex" value="all">All</label>` as the first pill
   - Age group (line 55): add `<label class="pill-label"><input type="checkbox" name="ageGroup" value="all">All</label>` as the first pill

2. **JS (`app.js`):**
   - Add click-delegation listeners on both `.pill-row` containers (near line 290) implementing the all/individual toggle logic
   - Filter `"all"` from `getChecked()` results at submit time (lines 303–304)
   - Add i18n keys: `'filter.sex_all': 'All'` / `'Todos'`, `'filter.age_all': 'All'` / `'Todos'`
   - Add label-update mappings at line 134

### Tightening spacing

Apply all four levers for safe Spanish fit at 1024px:

| Change | Property | From → To | File:Line |
|--------|----------|-----------|-----------|
| Label → pills | `.filter-group-label { margin-right }` | 32px → 12px | `styles.css:186` |
| Between groups | `.filter-row-shared { gap }` (desktop) | 64px → 32px | `styles.css:851` |
| Pill padding | `.pill-label { padding }` | 12px 30px → 12px 20px | `styles.css:212` |
| Pill gap | `.pill-row { gap }` | 16px → 10px | `styles.css:190` |

These are desktop values; mobile overrides (`styles.css:929+`) already use smaller values (padding 10px 16px, gap 8px) and are unaffected.

The Age row (single group, own line) fits easily with these changes. The mobile 2×2 grid layout (`styles.css:928`) would become 2×2 with 4 pills (All, Young, Adult, Senior) — no grid change needed.
