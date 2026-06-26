# Matcher Color i18n Diagnosis

Read-only. Queried 2026-06-26 02:28 UTC.

---

## 1. OVERLAY RENDER — How Each Attribute Is Produced

The hover overlay attributes are assembled by `buildOverlayAttrs(animal)` at **app.js:738-781**. Each attribute is pushed to a `lines[]` array:

| Attribute | Lines | How it gets its string |
|-----------|-------|----------------------|
| **Sex** | 743-745 | `i18n('card.sex_male')` / `i18n('card.sex_female')` — explicit i18n lookup by value |
| **Age** | 748-749 | `truncateAgeToYears(animal.age)` — parses numeric + calls `i18n('card.age_yr')` etc. |
| **Color** | 752-753 | **`lines.push(color)`** — raw English string, NO i18n, NO translateColorEs call |
| Good w/ kids/dogs/cats | 756-764 | `i18n('overlay.good_with_...')` — i18n lookup |
| Energy | 767-770 | `i18n('overlay.energy_...')` — i18n lookup |
| Special needs | 773-776 | `i18n('overlay.special_needs')` — i18n lookup |

**Color is the ONLY attribute that doesn't pass through any translation.**

---

## 2. SEX + AGE — The Working Cases

**Sex** (app.js:743-745):
```js
const sex = (animal.sex || '').trim().toLowerCase();
if (sex === 'male') lines.push(i18n('card.sex_male'));
else if (sex === 'female') lines.push(i18n('card.sex_female'));
```
Mechanism: value-matching if/else → `i18n()` key lookup. The i18n tables have:
- EN: `card.sex_male` → `'Male'`, `card.sex_female` → `'Female'` (line 99-100)
- ES: `card.sex_male` → `'Macho'`, `card.sex_female` → `'Hembra'` (line 219-220)

**Age** (app.js:748-749 → function at 604-623):
```js
const age = truncateAgeToYears(animal.age);
```
Mechanism: `truncateAgeToYears` parses the SM age string (e.g. "13 weeks"), extracts the number, then calls `i18n('card.age_wks')` / `i18n('card.age_mos')` / `i18n('card.age_yrs')`. Tables:
- EN: `card.age_wks` → `'wks'` (line 123)
- ES: `card.age_wks` → `'sem'` (line 243)

Both produce localized output by construction.

---

## 3. COLOR — The Broken Case

**app.js:752-753:**
```js
const color = (animal.color || '').trim();
if (color && color.toLowerCase() !== 'unknown') lines.push(color);
```

**Root cause: `color` is pushed raw.** No `i18n()` call, no `translateColorEs()` call, no lookup of any kind. The value comes from the API's `animal.color` field, which is the SM `BASECOLOURNAME` — always in English (e.g. "Black", "Tabby Grey & White").

**The fix function ALREADY EXISTS in the same file:**
- `translateColorEs(colorText)` at **app.js:667-682**
- Uses `COLOR_WORD_MAP_ES` dictionary at **app.js:653-665**
- Already called at **app.js:1098** for the detail popup modal:
  ```js
  document.getElementById('modalColor').textContent = translateColorEs(animal.color);
  ```

The overlay was simply never wired to call it. The modal popup DOES correctly show colors in Spanish; the hover overlay does not.

---

## 4. COLOR DATA SOURCE + VALUE SET

**API field:** `BASECOLOURNAME` from SM's `json_shelter_animals` response, mapped to `animal.color` via `normalizeAnimal` in `shelterManagerService.ts:65` (`raw.BASECOLOURNAME`).

**46 distinct color values** across 188 current adoptable animals:

| Count | Color | Translatable? |
|-------|-------|---------------|
| 29 | Black | ✅ |
| 10 | White | ✅ |
| 10 | Brown | ✅ |
| 10 | Tuxedo: Black and White | ✅ (tuxedo + black + and + white all mapped) |
| 9 | Tabby Grey & White | ✅ (tabby + grey + white, & preserved) |
| 9 | tabby brown | ✅ |
| 8 | Black with white | ✅ |
| 8 | Brown and White | ✅ |
| 8 | Black and White | ✅ |
| 8 | tabby - brown and white | ✅ (tabby + brown + and + white) |
| 6 | Grey | ✅ |
| 6 | Tabby | ✅ |
| 6 | Calico | ✅ |
| 4 | Tabico | ✅ |
| 4 | Tricolour | ✅ |
| 4 | Tan and White | ✅ |
| 3 | Tabby - grey | ✅ |
| 3 | Patch Tabby | ✅ |
| 3 | Grey and White | ✅ |
| 3 | Tan | ✅ |
| 2 | Tabby and White | ✅ |
| 2 | White and Brown | ✅ |
| 2 | White and Black | ✅ |
| 2 | Orange / Red & White | ✅ (orange + red + white) |
| 2 | Buff and White | ✅ |
| 2 | Tabby - black and white | ✅ |
| 2 | Brown and Black | ✅ |
| 2 | White and orange | ✅ |
| 2 | Tabby: Orange and White | ✅ (tabby + orange + and + white) |
| 2 | Ginger | ✅ |
| 2 | Orange tabby | ✅ |
| 1 | Black and Brown | ✅ |
| 1 | Cream | ✅ |
| 1 | Torbi | ✅ |
| 1 | Chocolate | ✅ |
| 1 | White with black | ✅ |
| 1 | Various | ✅ |
| 1 | Black and Grey | ✅ |
| 1 | Brown and Tan | ✅ |
| 1 | tabby - ginger | ✅ |
| 1 | Dilute Tabico | ✅ |
| 1 | Tabby black & grey | ✅ |
| 1 | White and Grey | ✅ |
| 1 | Brindle | ✅ |
| 1 | Buff | ✅ |
| 1 | Dilute Tortie | ✅ |

**All 46 values are translatable** by `translateColorEs` — every word token in every value is in `COLOR_WORD_MAP_ES`. The function uses per-word regex replacement with English fallback for unmapped tokens, so compound colors like "Tabby Grey & White" become "Atigrado Gris & Blanco" (non-alpha delimiters like `&`, `-`, `:`, `/` are preserved).

---

## 5. EXISTING SPANISH COLOR MAP

**Two color maps exist in the codebase:**

### A. Client-side: `COLOR_WORD_MAP_ES` — matcher-preview/app.js:653-665
```js
const COLOR_WORD_MAP_ES = {
  'black': 'negro', 'white': 'blanco', 'brown': 'marrón',
  'tan': 'habano', 'grey': 'gris', 'gray': 'gris',
  'orange': 'naranja', 'cream': 'crema', 'red': 'rojo',
  'buff': 'ante', 'chocolate': 'chocolate',
  'tabby': 'atigrado', 'calico': 'calicó', 'tabico': 'tabicó',
  'tortie': 'carey', 'torbi': 'torbi', 'tuxedo': 'tuxedo',
  'tricolour': 'tricolor', 'tricolor': 'tricolor',
  'brindle': 'atigrado', 'ginger': 'pelirrojo',
  'patch': 'parche', 'dilute': 'diluido',
  'and': 'y', 'with': 'con', 'various': 'varios',
  'short': 'corto', 'long': 'largo', 'medium': 'medio',
};
```
**28 entries.** Already in the live build. Used by `translateColorEs()` for the detail popup.

### B. Server-side: `COLOR_DICT_ES` — server/src/server.ts:12792-12799
```ts
const COLOR_DICT_ES: Record<string, string> = {
  black: 'negro', white: 'blanco', brown: 'marrón', grey: 'gris', gray: 'gris',
  tan: 'canela', cream: 'crema', chocolate: 'chocolate', orange: 'naranja',
  ginger: 'naranja rojizo', buff: 'beige', tabby: 'atigrado', calico: 'calicó',
  tortie: 'carey', tortoiseshell: 'carey',
  tricolour: 'tricolor', tricolor: 'tricolor', brindle: 'atigrado',
};
```
**18 entries.** Used by the generic-bio ES builder. Lacks connectors (and/with) — those are handled by the server-side `translateColorEs` differently.

**The client-side map (A) is the correct one to reuse** — it's already in the same file, already handles connectors, and already powers the detail popup.

---

## 6. PROPOSED FIX SHAPE (not applied)

**One-line change** in `buildOverlayAttrs()` at **app.js:753**:

```diff
- if (color && color.toLowerCase() !== 'unknown') lines.push(color);
+ if (color && color.toLowerCase() !== 'unknown') lines.push(translateColorEs(color));
```

**Why this works:**
- `translateColorEs(colorText)` already exists at line 667 in the same file
- It checks `currentLang !== 'es'` and returns the original string unchanged for English — zero regression
- It uses `COLOR_WORD_MAP_ES` (line 653) which covers all 46 current color values
- Unmapped tokens fall back to the English word unchanged — no blanks, no errors on oddballs
- This is the **exact same pattern** the detail popup already uses at line 1098

**No new map needed.** No new function needed. No server changes. One line, one file.
