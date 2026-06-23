# Searcher: "All" Pills + Spacing Implementation Report

**Date:** 2026-06-23  
**Commit:** `9904e17`  
**Files changed:** `custom-search/index.html` (+2), `custom-search/app.js` (+31/−2), `custom-search/styles.css` (+4/−4)

---

## A. "All" Pill Markup

### Gender group (`index.html:44`, first pill):
```html
<label class="pill-label"><input type="checkbox" name="sex" value="all">All</label>
```

### Age group (`index.html:57`, first pill):
```html
<label class="pill-label"><input type="checkbox" name="ageGroup" value="all">All</label>
```

Same `.pill-label` markup — CSS `:has(input:checked)` handles the active visual automatically.

---

## B. Toggle Logic (`app.js:295–319`)

```js
function setupAllToggle(groupName) {
  const allInput = document.querySelector(`input[name="${groupName}"][value="all"]`);
  if (!allInput) return;
  const individuals = Array.from(document.querySelectorAll(`input[name="${groupName}"]`)).filter(el => el.value !== 'all');

  allInput.addEventListener('change', () => {
    individuals.forEach(el => el.checked = allInput.checked);
  });

  individuals.forEach(ind => {
    ind.addEventListener('change', () => {
      if (!ind.checked) {
        allInput.checked = false;
      } else if (individuals.every(el => el.checked)) {
        allInput.checked = true;
      }
    });
  });
}
setupAllToggle('sex');
setupAllToggle('ageGroup');
```

Per-group delegation: sex listeners only affect sex; ageGroup only ageGroup. Uses native checked state; no class toggling.

---

## C. Submit Strip (`app.js:310–311`)

```js
const sex = getChecked('sex').filter(v => v !== 'all');
const ageGroup = getChecked('ageGroup').filter(v => v !== 'all');
```

The API call (`app.js:335`) receives only `['male','female']` and `['young','adult','senior']` — never the literal `"all"`. Contract unchanged.

---

## D. Validation

Unchanged. When "All" is checked, all individuals are checked too → `getChecked()` returns non-empty → validation passes. When nothing is checked (reset state), "all" is also unchecked → validation error fires as before.

---

## E. Reset

`resetAndShowForm()` (`app.js:279`) uses `document.querySelectorAll('input[name="sex"], input[name="ageGroup"]')` — this selector matches ALL inputs with those names, including the new `value="all"` inputs. No change needed.

---

## F. i18n

### EN (`app.js:19–20`):
```js
'filter.sex_all': 'All',
'filter.age_all': 'All',
```

### ES (`app.js:63–64`):
```js
'filter.sex_all': 'Todos',
'filter.age_all': 'Todos',
```

### Pill label mapping (`app.js:138–139`):
```js
'sex:all': 'filter.sex_all',
'ageGroup:all': 'filter.age_all',
```

---

## G. Spacing Changes (styles.css)

| Property | From | To | Line |
|----------|------|----|------|
| `.filter-group-label { margin-right }` | 32px | 12px | 186 |
| `.pill-row { gap }` | 16px | 10px | 190 |
| `.pill-label { padding }` | 12px 30px | 12px 20px | 212 |
| `.filter-row-shared { gap }` (desktop ≥1024px) | 64px | 32px | 849 |

Mobile overrides (≤767px) untouched — they already use smaller values (padding 10px 16px, gap 8px).

---

## H. Verification

### Page loads:
- `curl http://localhost:3000/custom-search/` — serves 200, both "all" pills present in HTML
- `node -c app.js` — JS syntax OK
- CSS serves with all four spacing changes applied

### All pill markup:
- Gender group: All | Male | Female (3 pills)
- Age group: All | Young | Adult | Senior (4 pills)
- Same `.pill-label` class — active state applies automatically via `:has(input:checked)`

### Toggle behavior (confirmed via code review):
- Click All → all siblings checked (change event sets each to `allInput.checked`)
- Uncheck one individual → All unchecks (`if (!ind.checked) allInput.checked = false`)
- Re-check it (all now on) → All auto-checks (`individuals.every(el => el.checked)`)
- Per-group: sex listeners don't touch ageGroup, and vice versa

### Submit excludes "all":
- Both `getChecked()` calls have `.filter(v => v !== 'all')` — API receives only male/female and young/adult/senior

### Validation:
- All checked → individuals checked → non-empty → valid ✓
- Nothing checked → empty → error fires ✓

### i18n:
- EN: "All" / "All" on both groups
- ES: "Todos" / "Todos" — pill-label mapping wired for language switch

### Spanish row fit at 1024px:
With all four levers applied (label margin 12px, group gap 32px, pill padding 20px, pill gap 10px), the Spanish worst case row (Especie [Gato][Perro][Animal Pequeño] + Sexo [Todos][Macho][Hembra]) saves ~220px vs. previous values. Estimated row width ~970px at 1024px viewport — fits without mid-group wrapping. Age row (single group, 4 pills) fits easily.

### Production untouched:
- Dashboard, matcher-web, matcher-preview, staff-pwa: no files changed
- Only custom-search/index.html, custom-search/styles.css, custom-search/app.js edited

---

## Deviations

None. All changes confined to the three custom-search files. API contract unchanged. No server.ts changes.
