# Preview Header/Tabs: SEARCHER-Style Restyle

**Date:** 2026-06-22 22:28 UTC  
**Commit:** `b887b04`  
**Files:** `matcher-preview/index.html` (+15 -7), `matcher-preview/styles.css` (+46 -39)

---

## 1. Dynamic Greeting + One-Line Title

### Before (index.html:26)
```html
<h1>Browse Your Perfect Pet</h1>
```

### After (index.html:26 + inline script)
```html
<h1 id="heroTitle">Good evening. Let's browse for your perfect pet.</h1>
```
```javascript
(function() {
  var h = new Date().getHours();
  var g = h < 12 ? 'Good morning.' : h < 17 ? 'Good afternoon.' : 'Good evening.';
  document.getElementById('heroTitle').textContent = g + " Let's browse for your perfect pet.";
})();
```

Same thresholds as SEARCHER: morning <12, afternoon 12–16, evening ≥17. Browser local time. Inline IIFE runs before app.js to avoid flash.

### Title CSS (styles.css:148-157)

**Before:**
```css
.hero-title h1 {
  font-family: var(--heading-font);
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 0;
  color: var(--text, #3D3835);
}
```

**After:**
```css
.hero-title h1 {
  font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif;
  font-size: clamp(1.4rem, 3.2vw, 2.4rem);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: #2C2925;
  margin-bottom: 0;
  white-space: nowrap;
}
```

**Size:** `clamp(1.4rem, 3.2vw, 2.4rem)` — 2.4rem (~38px) at desktop, scales down to 1.4rem (~22px) on narrow screens. `white-space: nowrap` ensures one line at desktop; mobile breakpoint overrides to `white-space: normal` at ≤768px for graceful wrap. Source Serif 4 loaded via updated Google Fonts link.

## 2. Language Toggle

**Before:** DM Sans (body font), weight 600, `var(--text-secondary)` inactive, `var(--text)` active, pipe separator.

**After (styles.css:107-142):**
```css
.lang-btn {
  font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif;
  font-size: 0.95rem;
  font-weight: 400;
  color: #6B6660;
  padding: 4px 8px;
  transition: color 0.2s ease;
  line-height: 1;
}
.lang-btn:hover { color: #C9613F; }
.lang-btn.active {
  color: #C9613F;
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-thickness: 1px;
}
.lang-sep { color: #6B6660; font-size: 0.75rem; line-height: 1; }
```

Separator changed from `|` to `·` (middot) in markup. Matches SEARCHER exactly: serif font, muted gray inactive, coral active+hover with thin underline.

## 3. Species Tabs → Coral Pills, Emojis Removed

### Before (index.html + styles.css:169-197)
```html
<button class="species-tab active" ...>🐕 Dogs</button>
```
```css
.species-tab {
  background: white;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: var(--body-font);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.species-tab.active {
  background: var(--primary);
  color: white;
}
```

### After
```html
<button class="species-tab active" ...>Dogs</button>
```
```css
.species-tab {
  padding: 10px 28px;
  border: 1.5px solid #C9613F;
  border-radius: 999px;
  background: #FAF7F0;
  color: #2C2925;
  font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif;
  font-size: 1.15rem;
  font-weight: 400;
  line-height: 1;
  box-shadow: none;
}
.species-tab:hover { border-color: #6B6660; }
.species-tab.active {
  border-color: #C9613F;
  background: rgba(201, 97, 63, 0.08);
  color: #C9613F;
  box-shadow: none;
}
```

Emojis removed (text only). SEARCHER pill style: full-round corners, coral border, warm off-white bg, serif font, selected = coral tint fill. Tab pill font size 1.15rem (slightly smaller than SEARCHER's 22px, appropriate for the matcher's denser layout).

## Verification

- **Greeting:** Shows "Good evening." (correct for 22:28 UTC = 18:28 ET) + one-line title ✅
- **One line:** `white-space: nowrap` + clamp max 2.4rem — fits full text on desktop without wrap ✅
- **Font/color:** Source Serif 4 loads, color `#2C2925` dark brown, weight 400 ✅
- **EN/ES toggle:** Coral active with underline, middot separator, serif font, functional ✅
- **Species pills:** Coral-outline rounded pills, no emojis, selected tab shows coral tint ✅
- **Tab filtering:** Dogs/Cats/Smalls still switch species, counter updates ✅
- **Counter:** "Showing XX adoptable dogs" still sits top-right of tab row ✅
- **Below header:** Filters, grid, cards, hover overlay, detail popup unchanged ✅
- **Production matcher-web/:** Still has emojis, old header style (1 grep hit for 🐕) ✅
- **Custom-search/:** Untouched (still has own greeting logic) ✅
- **Serves:** HTTP 200 ✅
