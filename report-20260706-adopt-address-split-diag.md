# Adoption Form Address-Split Diagnosis — 2026-07-06

## Q1 — Page IDs and Raw Content

### Page IDs [VERIFIED]

| Page | ID | Slug |
|------|----|------|
| EN Adopt | 7 | `adopt` |
| ES Adopta | 339 | `adopta-una-mascota` |

### EN address-field block (page 7, lines ~780-790)

```html
<div class="form-row single">
  <div class="form-group">
    <label>Address <span class="required">*</span></label>
    <input type="text" name="applicant_address" placeholder="Street, City, State, ZIP" required>
    <span class="field-error">Please enter your full address</span>
  </div>
</div>
```

Immediately preceded by the phone row (cell + home), followed by the age-confirmation checkbox row. [VERIFIED]

### ES address-field block (page 339, lines ~813-823)

```html
<div class="form-row single">
  <div class="form-group">
    <label>Dirección <span class="required">*</span></label>
    <input type="text" name="applicant_address" placeholder="Calle, Ciudad, Estado, Código Postal" required>
    <span class="field-error">Por favor ingresa tu dirección completa</span>
  </div>
</div>
```

Same structural position as EN — after phones, before age checkbox. [VERIFIED]

## Q2 — Current Address-Field Wrapper Structure

### Address field wrapper chain [VERIFIED]

The current address input sits inside:
```
<div class="form-row single">       ← outer: grid row, `.single` forces 1-column
  <div class="form-group">          ← inner: flex column (label + input + error)
    <label>...</label>
    <input ...>
    <span class="field-error">...</span>
  </div>
</div>
```

- `.form-row` = `display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;`
- `.form-row.single` = `grid-template-columns: 1fr;` (override to single column)
- `.form-group` = `display: flex; flex-direction: column;`
- At `@media (max-width: 600px)`: `.form-row` collapses to `grid-template-columns: 1fr;` (stacks)

### Current input tag attributes [VERIFIED]

```html
<input type="text" name="applicant_address" placeholder="Street, City, State, ZIP" required>
```

- `type="text"`
- `name="applicant_address"`
- `placeholder="Street, City, State, ZIP"` (EN) / `"Calle, Ciudad, Estado, Código Postal"` (ES)
- `required` attribute present
- No `id` attribute
- No `class` attribute

### Label element [VERIFIED]

```html
<label>Address <span class="required">*</span></label>
```

- Tag: `<label>` (no `for` attribute — relies on DOM nesting proximity)
- Text: "Address" (EN) / "Dirección" (ES)
- Required indicator: `<span class="required">*</span>`

### Nearby multi-field row (to mirror for city/state/zip) [VERIFIED]

The phone row (immediately above the address row) puts 2 fields side-by-side using a bare `<div class="form-row">` (no `.single`):

```html
<div class="form-row">
  <div class="form-group">
    <label>Cell Phone <span class="required">*</span></label>
    <input type="tel" name="applicant_phone_cell" required>
    <span class="field-error">Please enter your cell phone number</span>
  </div>
  <div class="form-group">
    <label>Home Phone</label>
    <input type="tel" name="applicant_phone_home">
  </div>
</div>
```

The grid auto-fit with `minmax(200px, 1fr)` handles 2-field and 3-field rows automatically — just drop multiple `.form-group` divs inside a bare `.form-row` (no `.single`). For a 3-field city/state/zip row, the same grid will auto-fit 3 columns on desktop (each ≥200px within the ~600px form width) and stack on mobile. No additional CSS class needed. [VERIFIED]

### Name/email row (another 2-field example) [VERIFIED]

```html
<div class="form-row">
  <div class="form-group">
    <label>Full Name <span class="required">*</span></label>
    <input type="text" name="applicant_name" required>
    <span class="field-error">Please enter your full name</span>
  </div>
  <div class="form-group">
    <label>Email Address <span class="required">*</span></label>
    <input type="email" name="applicant_email" required>
    <span class="field-error">Please enter a valid email address</span>
  </div>
</div>
```

Pattern is identical: bare `.form-row` + N × `.form-group` children.

## Q3 — Client-Side Required-Fields List

### EN page (page 7, line 1501) [VERIFIED]

```javascript
const REQUIRED_TEXT_FIELDS = [
  { name: 'applicant_name', label: 'Full Name' },
  { name: 'applicant_email', label: 'Email' },
  { name: 'applicant_phone_cell', label: 'Cell Phone' },
  { name: 'applicant_address', label: 'Address' },
  { name: 'digital_signature_name', label: 'Digital Signature' }
];
```

- **`applicant_address` IS in the list** with label `'Address'`
- Format: array of `{ name: string, label: string }` objects
- `name` = the input's `name` attribute; `label` = human-readable for error messages
- Lives in an inline `<script>` inside the page post_content

### ES page (page 339, line 1534) [VERIFIED]

```javascript
const REQUIRED_TEXT_FIELDS = [
  { name: 'applicant_name', label: 'Nombre Completo' },
  { name: 'applicant_email', label: 'Correo Electrónico' },
  { name: 'applicant_phone_cell', label: 'Teléfono Celular' },
  { name: 'applicant_address', label: 'Dirección' },
  { name: 'digital_signature_name', label: 'Firma Digital' }
];
```

- Identical structure; `applicant_address` present with label `'Dirección'`
- Same format, same inline `<script>` location

### Validation usage (line ~1654-1664) [VERIFIED]

```javascript
// Uses the config arrays at the top of this script (REQUIRED_TEXT_FIELDS, etc.)
...
REQUIRED_TEXT_FIELDS.forEach(field => {
```

The validator iterates REQUIRED_TEXT_FIELDS, looks up each `field.name` as an input name attribute, checks for a value, and uses `field.label` in the error message.

## Q4 — ES Label/Placeholder Translations

### Current ES address field [VERIFIED]

- Label: `Dirección`
- Placeholder: `Calle, Ciudad, Estado, Código Postal`
- Error message: `Por favor ingresa tu dirección completa`

### Spanish vocabulary for new fields (from placeholder and form) [VERIFIED]

The existing placeholder `"Calle, Ciudad, Estado, Código Postal"` already establishes the Spanish terms:

| EN field | Spanish term (from existing placeholder) |
|----------|------------------------------------------|
| Street | Calle |
| City | Ciudad |
| State | Estado |
| ZIP Code | Código Postal |

These terms are already in use on the ES form in the address placeholder. The word "Estado" also appears elsewhere in the ES form as a column header in the previous-pets table (`<th>Estado</th>`). [VERIFIED]

### No existing separate city/state/zip fields [VERIFIED]

No other form fields on either page use `city`, `state`, `zip`, `ciudad`, or `código postal` as input names or standalone labels. The address is the only location field. The new fields will be the first structured address inputs on the form.

### Suggested ES labels and placeholders (for implementation prompt)

Based on established form voice:

| Field | EN Label | EN Placeholder | ES Label | ES Placeholder |
|-------|----------|----------------|----------|----------------|
| applicant_address | Street Address | 123 Main St | Calle | 123 Calle Principal |
| applicant_city | City | Nyack | Ciudad | Ciudad |
| applicant_state | State | NY | Estado | Estado |
| applicant_zip | ZIP Code | 10960 | Código Postal | 10960 |

### Error messages (matching form's existing voice)

| Field | EN Error | ES Error |
|-------|----------|----------|
| applicant_address | Please enter your street address | Por favor ingresa tu calle |
| applicant_city | Please enter your city | Por favor ingresa tu ciudad |
| applicant_state | Please enter your state | Por favor ingresa tu estado |
| applicant_zip | Please enter your ZIP code | Por favor ingresa tu código postal |

### Implementation notes

1. Replace the current `<div class="form-row single">` address block with TWO rows:
   - Row 1: `<div class="form-row single">` — street address (full width, required)
   - Row 2: `<div class="form-row">` (bare, no `.single`) — city + state + zip (3 fields, auto-fit grid)
2. State is a plain text input (no dropdown), matching the prompt spec.
3. In REQUIRED_TEXT_FIELDS: replace the single `applicant_address` entry with 4 entries (address/city/state/zip) or keep address and add 3 — depends on whether city/state/zip should be required client-side (prompt says "accept-but-don't-require" server-side, but client-side required is a separate decision).
4. The `minmax(200px, 1fr)` grid will naturally fit 3 fields on desktop (~200px each in a ~650px form) and stack on mobile (≤600px media query forces 1fr).
5. All 4 input names match the server's existing `req.body` reads from commit fc81899.
