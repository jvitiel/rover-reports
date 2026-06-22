# Preview Header Fix: i18n Greeting + Emoji Removal

**Date:** 2026-06-22 23:15 UTC  
**Commit:** `4055c67`  
**Files:** `matcher-preview/app.js` (+16 -8), `matcher-preview/index.html` (+0 -7)

---

## Root Cause

`applyStaticTranslations()` (app.js:258) overwrote the HTML `<h1>` with `i18n('header.title')` on DOMContentLoaded and on every language toggle. The greeting inline script ran first but was immediately overwritten. Same for species tabs — `textContent` was set from i18n strings that still had emojis.

## 1. Species Strings — Emoji Removal (all 6)

### EN (app.js:76-78)
| Before | After |
|--------|-------|
| `'species.dogs': '🐕 Dogs'` | `'species.dogs': 'Dogs'` |
| `'species.cats': '🐱 Cats'` | `'species.cats': 'Cats'` |
| `'species.smalls': '🐰 Smalls'` | `'species.smalls': 'Smalls'` |

### ES (app.js:177-179)
| Before | After |
|--------|-------|
| `'species.dogs': '🐕 Perros'` | `'species.dogs': 'Perros'` |
| `'species.cats': '🐱 Gatos'` | `'species.cats': 'Gatos'` |
| `'species.smalls': '🐰 Animales Pequeños'` | `'species.smalls': 'Animales Pequeños'` |

## 2. Greeting + Browse Title in i18n

### New EN strings (app.js:50-54)
```javascript
'header.greeting_morning': 'Good morning.',
'header.greeting_afternoon': 'Good afternoon.',
'header.greeting_evening': 'Good evening.',
'header.browse': "Let's browse for your perfect pet.",
```

### New ES strings (app.js:147-151)
```javascript
'header.greeting_morning': 'Buenos días.',
'header.greeting_afternoon': 'Buenas tardes.',
'header.greeting_evening': 'Buenas noches.',
'header.browse': 'Busquemos tu mascota perfecta.',
```

### applyStaticTranslations title set (app.js:260-265)

**Before:**
```javascript
const h1 = document.querySelector('.hero-title h1');
if (h1) h1.textContent = i18n('header.title');
```

**After:**
```javascript
const h1 = document.querySelector('.hero-title h1');
if (h1) {
  const hour = new Date().getHours();
  const gKey = hour < 12 ? 'header.greeting_morning' : hour < 17 ? 'header.greeting_afternoon' : 'header.greeting_evening';
  h1.textContent = i18n(gKey) + ' ' + i18n('header.browse');
}
```

Runs on init (app.js:424) and on language toggle (app.js:448) — greeting updates to active language automatically.

## 3. Inline Script Removed (index.html:205-211)

**Removed:**
```html
<script>
  (function() {
    var h = new Date().getHours();
    var g = h < 12 ? 'Good morning.' : h < 17 ? 'Good afternoon.' : 'Good evening.';
    document.getElementById('heroTitle').textContent = g + " Let's browse for your perfect pet.";
  })();
</script>
```

The `<h1 id="heroTitle">` element remains — app.js targets it via `.hero-title h1` (same element, single owner).

## 4. Single Owner Confirmation

- app.js targets: `document.querySelector('.hero-title h1')` (line 260)
- index.html has: `<div class="hero-title"><h1 id="heroTitle">...</h1></div>` (line 25-27)
- Same element. No other code writes to this h1. ✅

## Verification

### Served content (curl localhost:3000/matcher-preview/)
- Greeting strings in served app.js: `'Good morning.'`, `'Buenos días.'` etc. ✅
- Species strings emoji-free: `'Dogs'`, `'Perros'` etc. ✅
- Inline greeting script: 0 hits in served HTML ✅
- HTTP 200 ✅

### Production untouched
- `matcher-web/app.js`: `'species.dogs': '🐕 Dogs'` — still has emojis ✅
- `custom-search/`: not modified ✅

### Rendered (incognito)
- Title: "Good evening. Let's browse for your perfect pet." (correct for 23:15 UTC) ✅
- One line, centered, Source Serif 4, dark color ✅
- Species tabs: "Dogs" / "Cats" / "Smalls" — no emojis ✅
- EN→ES toggle: title becomes "Buenas noches. Busquemos tu mascota perfecta." + tabs "Perros"/"Gatos"/"Animales Pequeños" ✅
- ES→EN toggle: returns to English greeting + labels ✅
- Coral pills styled, counter updates, filtering works ✅
- Filters/grid/cards/hover/popup unchanged ✅
