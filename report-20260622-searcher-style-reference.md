# Searcher Style Reference Pull

**Date:** 2026-06-22 22:15 UTC  
**Mode:** Read-only  
**Source:** `/home/shelter/shelter-apps/custom-search/` (index.html, styles.css, app.js)

---

## 1. Dynamic Greeting

### JS (app.js:106-113)
```javascript
function setGreeting() {
  const hour = new Date().getHours();
  let key;
  if (hour < 12) key = 'hero.greeting_morning';
  else if (hour < 17) key = 'hero.greeting_afternoon';
  else key = 'hero.greeting_evening';
  document.getElementById('greeting').textContent = i18n(key);
}
```

**Thresholds:** morning < 12, afternoon 12–16, evening ≥ 17. Uses `new Date().getHours()` — **browser local time**, no explicit timezone handling.

### Strings (app.js:6-9, 48-50)
| Key | EN | ES |
|-----|----|----|
| `hero.greeting_morning` | Good morning. | Buenos días. |
| `hero.greeting_afternoon` | Good afternoon. | Buenas tardes. |
| `hero.greeting_evening` | Good evening. | Buenas noches. |
| `hero.subtitle` | Let's find your new best friend. | Encontremos a tu nuevo mejor amigo. |

### Markup (index.html:22-23)
```html
<h1 id="greeting"></h1>
<h2 id="greeting-sub">Let's find your new best friend.</h2>
```
Two separate elements (`h1` + `h2`) inside `.form-inner` (centered container, `text-align: center`). The `h1` is populated dynamically by `setGreeting()`, the `h2` is populated by `applyStaticTranslations()` at app.js:118.

---

## 2. Title Line Font + Color

### #greeting (styles.css:138-145)
```css
#greeting {
  font-size: 64px;
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: #2C2925;
  margin: 0;
}
```

### #greeting-sub (styles.css:147-155)
```css
#greeting-sub {
  font-size: 64px;
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: #2C2925;
  margin-top: 8px;
  max-width: 100%;
}
```

**Font-family:** Inherited from `body` — `'Source Serif 4', 'Source Serif Pro', Georgia, serif` (styles.css:22).

**Mobile (≤768px, styles.css:877-879):**
```css
#greeting, #greeting-sub { font-size: 36px; }
```

Both lines are identical styling: 64px, weight 400, tight tracking (-0.01em), dark brown `#2C2925`, line-height 1.15.

---

## 3. Language Toggle CSS

### .lang-toggle (styles.css:32-40)
```css
.lang-toggle {
  position: fixed;
  top: 24px;
  right: 28px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 50;
}
```

### .lang-btn (styles.css:42-54)
```css
.lang-btn {
  background: none;
  border: none;
  padding: 4px 8px;
  font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif;
  font-size: 0.95rem;
  font-weight: 400;
  color: #6B6660;
  cursor: pointer;
  transition: color 0.2s ease;
  line-height: 1;
}
```

### .lang-btn:hover (styles.css:55-58)
```css
.lang-btn:hover {
  color: #C9613F;
}
```

### .lang-btn.active (styles.css:59-64)
```css
.lang-btn.active {
  color: #C9613F;
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-thickness: 1px;
}
```

### .lang-sep (styles.css:72-77)
```css
.lang-sep {
  color: #6B6660;
  font-size: 0.75rem;
  user-select: none;
  line-height: 1;
}
```

**Summary:** Inactive = `#6B6660` (muted gray-brown). Active/hover = `#C9613F` (coral/burnt orange). Active underlined with 4px offset, 1px thickness. Serif font, 0.95rem, weight 400. Separator is middot (`·`) in `#6B6660`.

**Mobile (≤768px, styles.css:863-870):**
```css
.lang-toggle { top: 16px; right: 16px; }
.lang-btn { font-size: 0.85rem; padding: 4px 6px; }
```

---

## 4. Pill Buttons (Species/Gender/Age)

### .pill-label default (styles.css:204-220)
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

### .pill-label:hover (styles.css:222-224)
```css
.pill-label:hover {
  border-color: #6B6660;
}
```

### .pill-label selected (styles.css:226-230)
```css
.pill-label:has(input:checked) {
  border-color: #C9613F;
  background: rgba(201, 97, 63, 0.08);
  color: #C9613F;
}
```

### Locked pill (pre-selected, styles.css:115-120)
```css
.pill-label.pill-locked {
  border-color: #C9613F;
  background: rgba(201, 97, 63, 0.08);
  color: #C9613F;
  cursor: default;
}
```

### Disabled pill (styles.css:126-132)
```css
.pill-label.pill-disabled {
  border-color: #B8B3AE;
  color: #B8B3AE;
  background: #FAF7F0;
  cursor: not-allowed;
}
```

**Summary:**
- Default: `#FAF7F0` bg (warm off-white), `#C9613F` coral border (1.5px), `#2C2925` dark text, 999px radius (full-round), 22px serif, padding 12px 30px
- Hover: border shifts to `#6B6660` (muted)
- Selected: coral border + coral text + 8% coral bg tint (`rgba(201,97,63,0.08)`)
- Disabled: `#B8B3AE` border/text, same bg

---

## Theme Tokens

The Searcher uses **NO CSS custom properties** — all values are literal hex/rgba. Key palette:

| Role | Value | Notes |
|------|-------|-------|
| Body bg | `#F5F1EA` | Warm beige (slightly darker than matcher's `#FAF7F4`) |
| Text primary | `#2C2925` | Dark warm brown |
| Text secondary / muted | `#6B6660` | Gray-brown |
| Accent / coral | `#C9613F` | Used for pill borders, active states, hover |
| Accent tint (8%) | `rgba(201, 97, 63, 0.08)` | Selected pill fill |
| Pill bg (off-white) | `#FAF7F0` | Warmer than body bg |
| Disabled | `#B8B3AE` | Muted gray |
| Body font | `'Source Serif 4', 'Source Serif Pro', Georgia, serif` | Serif stack |
| Title font | Same (inherited) | 64px / 400 weight |

The matcher-preview uses CSS custom properties (`--primary: #C4753B`, `--bg: #FAF7F4`, `--text: #3D3835`). The Searcher's `#C9613F` coral maps closest to the matcher's `--primary` (`#C4753B`) — both are warm orange-brown, slightly different hue. The Searcher's `#2C2925` text maps to the matcher's `--text` (`#3D3835`).
