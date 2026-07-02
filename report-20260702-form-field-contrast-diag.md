# Form Field Contrast — Diagnosis

## Q1 — What Generates Each Form

**No form plugin is active.** Active plugins: sg-ai-studio, polylang, seo-by-rank-math, sg-security, wordpress-starter, sg-cachepress. None is a form plugin. [VERIFIED via `wp plugin list --status=active`]

**Both forms are rendered from inline HTML + inline `<style>` blocks inside WordPress page content (post_content),** not from theme template files.

| Form | Page ID | Slug | Source |
|------|---------|------|--------|
| **Adoption application** | 7 | `adopt` | Inline HTML+CSS in post_content (Custom HTML block). `<div id="adoption-application" class="adoption-form-container">` at content line 726. Inline `<style>` at content lines 183–720 defines all `.form-section`, `.form-group`, field rules. |
| **Volunteer form** | 8 | `how-to-help` | Inline HTML+CSS in post_content. `<div id="volunteer-application" class="volunteer-form-container">` at content line 255. Inline `<style>` at content lines 256–325+ defines all `.volunteer-form-container .form-section`, `.form-group`, field rules. |

[VERIFIED via `wp post get <id> --field=post_content | grep -n ...` and `grep -rn` on theme dir returning zero matches for these form classes]

**The theme's `style.css` has NO rules for `.form-section`, `.form-group`, `.adoption-form-container`, `.volunteer-form-container`, or `.jobs-fieldset`.** All styling is self-contained in each page's inline `<style>`. [VERIFIED via grep returning empty results]

### Implication for the CSS change

Since the styling lives in page content (not theme files), a contrast rule added to `style.css` will work (it's loaded on all pages), but it must use selectors specific enough to override the inline `<style>` block declarations, OR the inline styles must be edited directly. The inline styles define `background: var(--white)` (adoption) / `background: white` (volunteer) on the field elements. A theme-level rule targeting the same selectors with equal specificity will work because external stylesheets and inline `<style>` blocks have equal specificity — last-loaded wins, and `style.css` is enqueued in `<head>` while the inline `<style>` comes later in the `<body>`, so **the inline `<style>` would win at equal specificity**. To override from `style.css`, either:
- Use a more specific selector (e.g. `.adoption-form-container .form-group input[type="text"]`), OR
- Edit the inline `<style>` blocks in the page content directly

---

## Q2 — How-to-Help Page Slugs

| Lang | Page ID | Title | Slug | Full URL |
|------|---------|-------|------|----------|
| EN | 8 | How to Help | `how-to-help` | `https://www.fourlegsgoodnynj.org/how-to-help/` |
| ES | 345 | Cómo Ayudar | `como-ayudar` | `https://www.fourlegsgoodnynj.org/es/como-ayudar/` |

[VERIFIED via `wp post list --post_type=page`]

---

## Q3 — Rendered Form Structure

### Form A: Adoption Application

**Outer container:** `<div id="adoption-application" class="adoption-form-container">` [VERIFIED]

**White group boxes (form sections):** `<div class="form-section">` — these are the white card containers.
```css
/* From inline <style> in page 7 */
.form-section {
  background: var(--white);     /* #FFFFFF */
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border);  /* #E0DCD8 */
}
```
[VERIFIED via post_content line 279]

**Data fields (input/select/textarea):**
```css
.form-group input[type="text"],
.form-group input[type="email"],
.form-group input[type="tel"],
.form-group input[type="number"],
.form-group input[type="date"],
.form-group select,
.form-group textarea {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);    /* #E0DCD8 */
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 1rem;
  color: var(--charcoal);             /* #3D3835 */
  background: var(--white);           /* #FFFFFF */
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
```
[VERIFIED via post_content lines 332–345]

**No class attribute on the `<input>`/`<select>`/`<textarea>` elements themselves** — they are bare tags styled by parent `.form-group` context. [VERIFIED via rendered HTML grep]

### Form B: Volunteer Application

**Outer container:** `<div id="volunteer-application" class="volunteer-form-container">` [VERIFIED]

**White group box:** The `<form>` element itself is the white box, NOT `.form-section`:
```css
.volunteer-form-container form {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
```
[VERIFIED via post_content line 268]

`.form-section` inside volunteer form is a divider within the white box, not a separate white card:
```css
.volunteer-form-container .form-section {
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #F0EBE5;
}
```
[VERIFIED via post_content line 269]

**Data fields:**
```css
.volunteer-form-container .form-group input[type="text"],
.volunteer-form-container .form-group input[type="email"],
.volunteer-form-container .form-group input[type="tel"],
.volunteer-form-container .form-group input[type="date"],
.volunteer-form-container .form-group input[type="number"],
.volunteer-form-container .form-group textarea {
  padding: 10px 12px;
  border: 1px solid #D9D2C8;
  border-radius: 6px;
  font-size: 0.95rem;
  font-family: inherit;
  color: #3D3835;
  background: white;
  transition: border-color 0.15s, box-shadow 0.15s;
}
```
[VERIFIED via post_content line 279]

**Note: volunteer form also has `<fieldset class="jobs-fieldset">` elements:**
```css
.volunteer-form-container .jobs-fieldset {
  border: 1px solid #E5DED4;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin: 0;
}
```
[VERIFIED via post_content line 296]

### Do the forms share classes?

**Partially.** Both use `.form-section`, `.form-group`, `.form-row`, and bare `input`/`select`/`textarea` elements. BUT:

- The **adoption form** scopes styles with bare class selectors (`.form-section { ... }`, `.form-group input { ... }`)
- The **volunteer form** scopes ALL styles under `.volunteer-form-container` (`.volunteer-form-container .form-group input { ... }`)

The class names are the same but the CSS specificity/scoping differs. **A single background-color rule on `.form-group input` etc. would hit both forms**, but the inline `<style>` in each page would override it (later in document order). Scoped rules like `.adoption-form-container .form-group input` and `.volunteer-form-container .form-group input` are needed.

---

## Q4 — Current Styling Summary

### Adoption form (page 7 inline `<style>`)

| Element | Background | Border | Border-radius | Box-shadow |
|---------|-----------|--------|---------------|------------|
| `.form-section` (white box) | `var(--white)` = `#FFFFFF` | `1px solid var(--border)` = `#E0DCD8` | `12px` | none |
| `.form-group input/select/textarea` (fields) | `var(--white)` = `#FFFFFF` | `1px solid var(--border)` = `#E0DCD8` | `8px` | none (on focus: `0 0 0 3px rgba(196,117,59,0.15)`) |

**CSS variables defined in the same inline `<style>` block:**
```css
:root {
  --white: #FFFFFF;
  --border: #E0DCD8;
  --cream: #FAF7F4;
  --charcoal: #3D3835;
  --primary: #C4753B;
}
```
[VERIFIED via post_content lines 184–196]

### Volunteer form (page 8 inline `<style>`)

| Element | Background | Border | Border-radius | Box-shadow |
|---------|-----------|--------|---------------|------------|
| `form` (white box) | `white` | none | `12px` | `0 1px 3px rgba(0,0,0,0.06)` |
| `.form-group input/textarea` (fields) | `white` | `1px solid #D9D2C8` | `6px` | none (on focus: `0 0 0 3px rgba(196,117,59,0.15)`) |
| `.jobs-fieldset` | none (transparent) | `1px solid #E5DED4` | `8px` | none |

**Uses hardcoded hex values, not CSS variables.** [VERIFIED via post_content lines 268–280]

### The contrast problem restated with real values

Both forms: **white fields (#FFFFFF) inside white containers (#FFFFFF / white), separated only by a thin border (#E0DCD8 / #D9D2C8).** The border color is a very light warm gray — nearly invisible against the white background. The page background is cream (`#FAF7F4` / `has-cream-background-color`), providing some contrast for the white containers against the page, but none for the fields within those containers.

---

## Q5 — ES Parity

### Adoption form ES (`/es/adopta-una-mascota/`)

| Class | Present in ES rendered HTML |
|-------|-----------------------------|
| `adoption-form-container` | ✅ [VERIFIED] |
| `form-section` | ✅ [VERIFIED] |
| `form-group` | ✅ [VERIFIED] |

### Volunteer form ES (`/es/como-ayudar/`)

| Class | Present in ES rendered HTML |
|-------|-----------------------------|
| `volunteer-form-container` | ✅ [VERIFIED] |
| `form-section` | ✅ [VERIFIED] |
| `form-group` | ✅ [VERIFIED] |
| `jobs-fieldset` | ✅ [VERIFIED] |
| `jobs-fieldset two-col` | ✅ [VERIFIED] |

**All relevant classes are present in both EN and ES rendered HTML.** Each language is a separate WordPress page (Polylang translation), but both contain the same form HTML+CSS blocks. A single CSS rule targeting these selectors covers both languages. [VERIFIED via VPS curl + grep on all four page URLs]
