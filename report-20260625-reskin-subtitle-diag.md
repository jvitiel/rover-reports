# Matcher Reskin Subtitle Change — Diagnosis

**Date:** 2026-06-25  
**Scope:** Read-only. No writes, no code changes.

---

## 1. Current Subtitle String

**i18n key:** `header.browse`

**EN (matcher-preview/app.js:53):**
```js
'header.browse': "Let's browse for your perfect pet.",
```
Note: straight apostrophe (`'`), not curly. The JS string uses double-quote delimiters because of the internal apostrophe.

**ES (matcher-preview/app.js:173):**
```js
'header.browse': 'Busquemos tu mascota perfecta.',
```

---

## 2. Greeting Is Separate

The dynamic greeting uses three separate keys (matcher-preview/app.js:50–52, 170–172):

```js
// EN
'header.greeting_morning': 'Good morning.',
'header.greeting_afternoon': 'Good afternoon.',
'header.greeting_evening': 'Good evening.',

// ES
'header.greeting_morning': 'Buenos días.',
'header.greeting_afternoon': 'Buenas tardes.',
'header.greeting_evening': 'Buenas noches.',
```

The hero title is assembled at runtime (matcher-preview/app.js:315):
```js
h1.textContent = i18n(gKey) + ' ' + i18n('header.browse');
```

Greeting (`gKey`) and subtitle (`header.browse`) are separate keys concatenated with a space. Changing `header.browse` does NOT touch the greeting.

---

## 3. This Is matcher-preview Only

**Path:** `/home/shelter/shelter-apps/matcher-preview/app.js`

Production matcher (`/home/shelter/shelter-apps/matcher-web/app.js`) does NOT have a `header.browse` key — it uses a completely different header structure. The change is isolated to matcher-preview.

---

## 4. HTML Fallback

The HTML contains a static fallback that `applyStaticTranslations()` overwrites on load (matcher-preview/index.html:26):
```html
<h1 id="heroTitle">Good evening. Let's browse for your perfect pet.</h1>
```

This is overwritten by JS immediately, so users never see it — but it should be updated for consistency (and for the brief flash before JS runs, and for SEO/accessibility crawlers that don't execute JS).

---

## 5. No Other Duplicates

The string `"Let's browse for your perfect pet"` appears in exactly 3 places:
1. EN i18n entry: `matcher-preview/app.js:53`
2. ES i18n entry: `matcher-preview/app.js:173` (translated)
3. HTML fallback: `matcher-preview/index.html:26`

No other files contain it. The `meta.description` at app.js:47 says "Find your perfect pet companion" — different string, different key (`meta.description`), not part of this change.

---

## 6. Change Plan (3 edits)

| File | Line | Current | New |
|------|------|---------|-----|
| app.js | 53 | `"Let's browse for your perfect pet."` | `"Let's find your new best friend."` |
| app.js | 173 | `'Busquemos tu mascota perfecta.'` | `'Encontremos a tu nuevo mejor amigo.'` |
| index.html | 26 | `Good evening. Let's browse for your perfect pet.` | `Good evening. Let's find your new best friend.` |

ES translation note: "Encontremos a tu nuevo mejor amigo" = "Let's find your new best friend" (gender-neutral in context — "amigo" is standard for pets in Spanish, matching the informal tone).
