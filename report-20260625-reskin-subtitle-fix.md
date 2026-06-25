# Matcher Reskin Subtitle Change — Implementation

**Date:** 2026-06-25  
**Commit:** 5babd88  
**Scope:** 2 files (matcher-preview/app.js + matcher-preview/index.html), 3 insertions, 3 deletions.

---

## Edits

### 1. EN — matcher-preview/app.js:53

**Before:**
```js
'header.browse': "Let's browse for your perfect pet.",
```

**After:**
```js
'header.browse': "Let's find your new best friend.",
```

### 2. ES — matcher-preview/app.js:173

**Before:**
```js
'header.browse': 'Busquemos tu mascota perfecta.',
```

**After:**
```js
'header.browse': 'Encontremos a tu nuevo mejor amigo.',
```

### 3. HTML fallback — matcher-preview/index.html:26

**Before:**
```html
<h1 id="heroTitle">Good evening. Let's browse for your perfect pet.</h1>
```

**After:**
```html
<h1 id="heroTitle">Good evening. Let's find your new best friend.</h1>
```

---

## Greeting Keys — Untouched

```js
// EN (app.js:50-52) — unchanged
'header.greeting_morning': 'Good morning.',
'header.greeting_afternoon': 'Good afternoon.',
'header.greeting_evening': 'Good evening.',

// ES (app.js:170-172) — unchanged
'header.greeting_morning': 'Buenos días.',
'header.greeting_afternoon': 'Buenas tardes.',
'header.greeting_evening': 'Buenas noches.',
```

Hero assembly (app.js:315) concatenates greeting + browse: `i18n(gKey) + ' ' + i18n('header.browse')`. Greeting is dynamic by time of day, unaffected by this change.

---

## Verification

- Served at `http://localhost:3000/matcher-preview/app.js`: both EN and ES `header.browse` entries show new text ✅
- No leftover "browse for your perfect pet" or "Busquemos tu mascota" in matcher-preview/ ✅
- Production matcher-web: 0 matches for `header.browse` — completely unaffected ✅
- matcher-preview loads: HTTP 200 ✅

---

## No deviations

Only matcher-preview/app.js and matcher-preview/index.html committed (explicit `git add`, not `git add -A`).

## Commit

```
5babd88 matcher-preview: hero subtitle → 'Let's find your new best friend' (EN + ES + HTML fallback)
 2 files changed, 3 insertions(+), 3 deletions(-)
```
