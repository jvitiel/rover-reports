# Age-Question Date Field Diagnosis

## Q1 — All `<input type="date">` on the EN Volunteer Form (`/how-to-help/`)

Exactly **two** native date inputs exist on the form. [VERIFIED — `grep type="date"` returned two element hits plus one CSS rule line]

### Field 1: "Date" (near "Are you 18 years of age or older?")

```html
<div class="form-row">
  <div class="form-group">
    <label for="vf-date">Date</label>
    <input type="date" id="vf-date" name="date">
    <span class="field-error"></span>
  </div>
</div>
```

- **Label:** "Date" [VERIFIED]
- **id:** `vf-date` [VERIFIED]
- **name:** `date` [VERIFIED]
- **Wrapper chain:** `div.form-row` → `div.form-group` [VERIFIED]
- **Position:** immediately above the "Are you 18 years of age or older?" radio group [VERIFIED]

### Field 2: "Earliest start date" (Availability section)

```html
<div class="form-group">
  <label for="vf-start">Earliest start date</label>
  <input type="date" id="vf-start" name="training_start_date">
  <span class="field-error"></span>
</div>
```

- **Label:** "Earliest start date" [VERIFIED]
- **id:** `vf-start` [VERIFIED]
- **name:** `training_start_date` [VERIFIED]
- **Wrapper chain:** `div.form-row` → `div.form-group` (sits beside "Seasonal availability" in the same form-row) [VERIFIED]

### Most precise selector for ONLY the age-question Date field

```css
#volunteer-application input#vf-date
```

or equivalently:

```css
#vf-date
```

Both are stable id-based selectors. `#vf-date` is the simplest and most precise — it targets exactly one element on the page and cannot match `#vf-start`. The `#volunteer-application` prefix adds specificity if needed to override inline styles, but the id alone is unique. [VERIFIED — only one element carries `id="vf-date"`]

Using `input[name="date"]` is an alternative but `name="date"` is a generic string that could collide with other forms; the id is safer. [INFERRED]

## Q2 — ES Parity (`/es/como-ayudar/`)

| Attribute | EN | ES | Identical? |
|-----------|----|----|------------|
| id | `vf-date` | `vf-date` | ✓ [VERIFIED] |
| name | `date` | `date` | ✓ [VERIFIED] |
| type | `date` | `date` | ✓ [VERIFIED] |
| Label text | "Date" | "Fecha" | Different (expected) |
| Wrapper classes | `form-row` → `form-group` | `form-row` → `form-group` | ✓ [VERIFIED] |

The id `vf-date` is identical across EN and ES. A single CSS rule using `#vf-date` or `#volunteer-application input#vf-date` covers both languages. [VERIFIED]

The second date input also matches across languages: `id="vf-start"`, `name="training_start_date"` — identical in both. [VERIFIED]

## Q3 — Current Appended CSS (Dedup Safety)

### Existing contrast rules in style.css

| Lines | Rule | Status |
|-------|------|--------|
| 1862–1870 | `#adoption-application .form-group input/select/textarea` + `#volunteer-application .form-group input/select/textarea` → `background-color: #F2ECE4; border-color: #D2C7B9` | Present [VERIFIED] |
| 1873–1875 | `#volunteer-application .day-row input[type="text"]` → `background-color: #F2ECE4; border-color: #D2C7B9` | Present [VERIFIED] |

The `.day-row` availability rule is already shipped. [VERIFIED]

**Note:** Both date inputs (`#vf-date` and `#vf-start`) already receive the warm fill (`#F2ECE4`) from the broad `.form-group input` rule at line 1865. Any new rule for `#vf-date` would be for **width/sizing** purposes, not for adding the background color (which is already applied). [VERIFIED — both sit inside `.form-group` and match `.form-group input`]
