# Preview Header Restyle

**Date:** 2026-06-22 22:10 UTC  
**Commit:** `25d279e`  
**Files:** `matcher-preview/index.html` (-3), `matcher-preview/styles.css` (+11 -62)

---

## 1. Logo Removed

**Before (index.html:25):**
```html
<img src="logo.jpg" alt="Four Legs Good Animal Rescue" class="hero-logo">
```
**After:** Element deleted.

**CSS removed (styles.css:146-156):**
```css
.hero-logo { width: 72px; height: 72px; object-fit: contain; border-radius: 50%; ... }
```
Plus mobile `.hero-logo { width: 60px; height: 60px; }`.

## 2. CTA Button Removed

**Before (index.html:29):**
```html
<a href="https://custom-search.4lgshelterapp.duckdns.org/" target="_blank" rel="noopener" class="hero-cta">Know What You Want? Search Here</a>
```
**After:** Element deleted.

**CSS removed (styles.css:170-186):**
```css
.hero-cta { display: inline-block; background: #F5F1EA; ... font-size: 1.8rem; ... }
.hero-cta:hover { background: #EBE5D8; }
```
Plus mobile `.hero-cta { font-size: 1.4rem; padding: 8px 18px; order: 3; margin-top: 4px; }`.

## 3. Header Background → Tan

**Before (styles.css:88-94):**
```css
.hero {
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 60%, var(--primary-light) 100%);
  color: white;
  padding: 16px 20px;
  box-shadow: var(--shadow-md);
  position: relative;
}
```

**After:**
```css
.hero {
  background: var(--bg);
  color: var(--text);
  padding: 10px 20px;
  position: relative;
}
```
Brown gradient → tan (`--bg` = `#FAF7F4`). Box-shadow removed. Padding tightened 16→10px (less empty space without logo/CTA).

## 4. Title Centered + Dark

**Before (styles.css:157-168):**
```css
.hero-title { flex: 1; text-align: left; }
.hero-title h1 { ... text-shadow: 0 2px 4px rgba(0,0,0,0.12); }
```

**After:**
```css
.hero-title { text-align: center; }
.hero-title h1 { ... color: var(--text, #3D3835); }
```
Left-aligned → centered. White (inherited) → `var(--text)` dark brown. Text-shadow removed (unnecessary on light bg). `.hero-content` changed from `justify-content: space-between` to `center`.

## 5. Language Toggle Restyled

**Before:** White-on-brown (`rgba(255,255,255,0.6)` inactive, `white` active/hover).

**After:**
```css
.lang-btn { color: var(--text-secondary, #8C7E75); }
.lang-btn:hover { color: var(--text, #3D3835); background: rgba(0,0,0,0.05); }
.lang-btn.active { color: var(--text, #3D3835); text-decoration: underline; }
.lang-sep { color: var(--text-secondary, #8C7E75); }
```
Dark-on-tan. Active state underlined in dark. Position (top-right absolute) and functionality unchanged.

## Verification

- **Header bg:** Tan, blends with body — no brown band ✅
- **Logo:** Gone (0 grep hits for `hero-logo` in index.html) ✅
- **CTA:** Gone (0 grep hits for `hero-cta` in index.html) ✅
- **Title:** "Browse Your Perfect Pet" centered, dark text on tan ✅
- **Language toggle:** Present top-right, legible, English/Español still functional ✅
- **Below header:** Species tabs, counter, filters, grid, cards, hover overlay, detail popup all unchanged ✅
- **Production:** `matcher-web/index.html` still has logo + CTA (2 grep hits) ✅
- **Serves:** HTTP 200 on `/matcher-preview/` ✅
