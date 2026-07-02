# Availability-Section Markup Diagnosis

## Q1 — EN Markup (`/how-to-help/`)

### Availability section structure

```html
<h3 class="section-title"><span class="icon">📅</span> Availability</h3>
<p class="section-subtitle">Tell us when you're typically free...</p>

<div class="almost-any-time-row">
  <label class="checkbox-option"><input type="checkbox" name="almost_any_time"> Almost any time</label>
</div>

<div class="availability-days">
  <div class="day-row"><label for="vf-mon">Monday</label><input type="text" id="vf-mon" name="monday" placeholder="e.g. 9 - 1230"></div>
  <div class="day-row"><label for="vf-tue">Tuesday</label><input type="text" id="vf-tue" name="tuesday"></div>
  <div class="day-row"><label for="vf-wed">Wednesday</label><input type="text" id="vf-wed" name="wednesday"></div>
  <div class="day-row"><label for="vf-thu">Thursday</label><input type="text" id="vf-thu" name="thursday"></div>
  <div class="day-row"><label for="vf-fri">Friday</label><input type="text" id="vf-fri" name="friday"></div>
  <div class="day-row"><label for="vf-sat">Saturday</label><input type="text" id="vf-sat" name="saturday"></div>
  <div class="day-row"><label for="vf-sun">Sunday</label><input type="text" id="vf-sun" name="sunday"></div>
</div>

<div class="form-row" style="margin-top:1.5rem;">
  <div class="form-group"><label for="vf-seasonal">Seasonal availability</label><input type="text" id="vf-seasonal" name="seasonal" ...></div>
  <div class="form-group"><label for="vf-start">Earliest start date</label><input type="date" id="vf-start" name="training_start_date"></div>
</div>
```

[VERIFIED — curl output, all tags/classes exact]

### Analysis

| Element | Wrapper class | Input tag/type/class | Inside `.form-group`? |
|---------|---------------|----------------------|----------------------|
| Seven day inputs (Mon–Sun) | `div.day-row` inside `div.availability-days` | `<input type="text">` — no class attribute | **NO** |
| "Almost any time" | `div.almost-any-time-row` | `<input type="checkbox">` inside `label.checkbox-option` | **NO** |
| "Seasonal availability" | `div.form-group` inside `div.form-row` | `<input type="text">` | **YES** — already styled ✓ |
| "Earliest start date" | `div.form-group` inside `div.form-row` | `<input type="date">` | **YES** — already styled ✓ |

[VERIFIED]

### Why the existing rule missed the day inputs

The current CSS rule targets `#volunteer-application .form-group input`. The seven day inputs sit inside `.day-row` within `.availability-days` — they have **no `.form-group` ancestor**. The checkbox also lacks `.form-group` but must be excluded from the warm fill. [VERIFIED]

### Recommended selector

The most precise single selector that hits exactly the seven day text inputs without hitting the checkbox:

```css
#volunteer-application .day-row input[type="text"]
```

This works because:
- `.day-row` is the wrapper for all seven day inputs and nothing else [VERIFIED]
- All seven are `type="text"` [VERIFIED]
- The checkbox is inside `.almost-any-time-row`, not `.day-row` — excluded by structure [VERIFIED]
- The `[type="text"]` qualifier is a safety net even though `.day-row` alone is sufficient [VERIFIED]

Alternative broader selector if the intent is to catch any future inputs inside `.availability-days` that aren't checkboxes:

```css
#volunteer-application .availability-days input[type="text"]
```

Both are equivalent today (`.day-row` only appears inside `.availability-days`). [VERIFIED]

## Q2 — ES Parity (`/es/como-ayudar/`)

| Class | Present in ES? |
|-------|---------------|
| `availability-days` | ✓ present [VERIFIED] |
| `day-row` (×7) | ✓ present, same structure [VERIFIED] |
| `almost-any-time-row` | ✓ present [VERIFIED] |
| `checkbox-option` | ✓ present [VERIFIED] |
| `form-group` (seasonal + start date) | ✓ present [VERIFIED] |
| Input types (`type="text"` ×7, `type="checkbox"` ×1) | ✓ identical [VERIFIED] |
| Input ids (`vf-mon` through `vf-sun`) | ✓ identical [VERIFIED] |
| Input names (`monday` through `sunday`) | ✓ identical [VERIFIED] |

The ES page uses identical class names, wrapper structure, and input types. A single CSS rule using `.day-row input[type="text"]` covers both EN and ES with no language-specific selectors needed. [VERIFIED]
