# Preview app.js Overwrite Diagnosis

**Date:** 2026-06-22 23:05 UTC  
**Mode:** Read-only

---

## 1. Title Overwrite

**app.js:257-258 — `applyStaticTranslations()`:**
```javascript
const h1 = document.querySelector('.hero-title h1');
if (h1) h1.textContent = i18n('header.title');
```

This runs on DOMContentLoaded (app.js:252: `document.addEventListener('DOMContentLoaded', init)` → init calls `applyStaticTranslations()` at app.js:416). It OVERWRITES the `<h1>` textContent with `i18n('header.title')`, which resolves to:

- **EN (app.js:49):** `'header.title': 'Browse Your Perfect Pet'`
- **ES (app.js:142):** `'header.title': 'Encuentra Tu Mascota Perfecta'`

**The inline greeting script runs first** (it's before `<script src="app.js">` in the HTML), but then app.js's `applyStaticTranslations()` fires on DOMContentLoaded and replaces the greeting with "Browse Your Perfect Pet". The greeting is visible for a flash, then overwritten.

## 2. Tab/Emoji Overwrite

**app.js:328-334 — `applyStaticTranslations()`:**
```javascript
const speciesTabMap = { dog: 'species.dogs', cat: 'species.cats', small: 'species.smalls' };
document.querySelectorAll('.species-tab').forEach(tab => {
  const species = tab.dataset.species;
  if (species && speciesTabMap[species]) {
    tab.textContent = i18n(speciesTabMap[species]);
  }
});
```

The i18n strings (with emojis encoded as Unicode escapes):

- **EN (app.js:76-78):**
  ```javascript
  'species.dogs': '🐕 Dogs',
  'species.cats': '🐱 Cats',
  'species.smalls': '🐰 Smalls',
  ```
- **ES (app.js:169-171):**
  ```javascript
  'species.dogs': '🐕 Perros',
  'species.cats': '🐱 Gatos',
  'species.smalls': '🐰 Animales Pequeños',
  ```

We removed the emojis from the HTML, but app.js replaces tab.textContent with the i18n strings that still contain emojis.

## 3. Render Order

1. HTML parses → `<h1 id="heroTitle">Good evening. Let's browse...</h1>` (new text)
2. Inline `<script>` runs → sets greeting via `heroTitle.textContent` (new text, but same as HTML)
3. `<script src="app.js">` loads
4. `DOMContentLoaded` fires → `init()` (app.js:416) → `applyStaticTranslations()`:
   - **Line 258:** Overwrites h1 with `'Browse Your Perfect Pet'` ← OLD title restored
   - **Lines 329-333:** Overwrites tab text with `'🐕 Dogs'` etc. ← emojis restored
5. Also on language switch click (app.js:440): `applyStaticTranslations()` runs again

**app.js is the authoritative source** for all visible text. The HTML is just an initial state that gets replaced.

## 4. i18n Strings — Root Cause

The TRANSLATIONS object in app.js is the single source of truth for ALL rendered text. The relevant entries:

| Key | EN (app.js line) | ES (app.js line) |
|-----|-------------------|-------------------|
| `header.title` | `'Browse Your Perfect Pet'` (49) | `'Encuentra Tu Mascota Perfecta'` (142) |
| `page.title` | `'Browse Your Perfect Pet'` (48) | `'Encuentra Tu Mascota Perfecta'` (141) |
| `species.dogs` | `'🐕 Dogs'` (76) | `'🐕 Perros'` (169) |
| `species.cats` | `'🐱 Cats'` (77) | `'🐱 Gatos'` (170) |
| `species.smalls` | `'🐰 Smalls'` (78) | `'🐰 Animales Pequeños'` (171) |

`page.title` is applied at app.js:379 (`document.title = i18n('page.title')`) — this sets the browser tab title.

## 5. Verdict

**The rendered text comes from app.js i18n strings, NOT from static HTML.** The fix must go in `matcher-preview/app.js`, not `index.html`:

### Title fix (app.js)
Two options:
- **(a) Move the greeting into applyStaticTranslations:** Replace line 258's `i18n('header.title')` with the dynamic greeting logic (compute greeting + set h1). Remove `'header.title'` from TRANSLATIONS or keep it only for `page.title`.
- **(b) Skip the h1 overwrite:** Delete/comment line 258, and let the inline script's greeting persist. But this breaks language switching (ES wouldn't update the title on toggle).

Option (a) is correct — put the greeting logic inside `applyStaticTranslations()` so it works for both languages. The i18n entries need:
- **EN:** `'header.greeting_morning': 'Good morning.'`, etc. + `'header.subtitle': "Let's browse for your perfect pet."`
- **ES:** `'header.greeting_morning': 'Buenos días.'`, etc. + `'header.subtitle': 'Busquemos a tu mascota perfecta.'`

Then line 258 becomes: compute greeting key from hour → `h1.textContent = i18n(greetingKey) + ' ' + i18n('header.subtitle')`.

### Tab fix (app.js)
Remove emojis from all 6 i18n entries (EN + ES):
- app.js:76: `'species.dogs': 'Dogs'`
- app.js:77: `'species.cats': 'Cats'`
- app.js:78: `'species.smalls': 'Smalls'`
- app.js:169: `'species.dogs': 'Perros'`
- app.js:170: `'species.cats': 'Gatos'`
- app.js:171: `'species.smalls': 'Animales Pequeños'`

### Files to change
- `matcher-preview/app.js` — i18n strings + greeting logic in applyStaticTranslations
- `matcher-preview/index.html` — can remove the inline greeting script (app.js will handle it)
