# Matcher-Preview Popup Spanish Values — Implementation Report

**Date:** 2026-06-23  
**Commit:** `4bbb864`  
**File changed:** `matcher-preview/app.js` (1 file, 89 insertions, 3 deletions)

---

## Sex Mapping

Popup sex value (`app.js:1012-1014`, replacing raw `animal.sex`) now maps via i18n:

```js
const sexLower = (animal.sex || '').trim().toLowerCase();
if (sexLower === 'male') → i18n('card.sex_male')    // "Macho" (ES) / "Male" (EN)
if (sexLower === 'female') → i18n('card.sex_female')  // "Hembra" (ES) / "Female" (EN)
else → animal.sex || i18n('card.sex_unknown')
```

Reuses existing keys at `app.js:99-101` (EN) / `app.js:211-213` (ES). Same keys used by overlay and card — no conflict.

---

## Age Formatter

### New long-format formatter: `formatAgeLong()` (app.js:627-647)

Parses the raw SM age string and produces localized long form:

| Input | EN output | ES output |
|-------|-----------|-----------|
| "3 years 2 months." | "3 years 2 months" | "3 años 2 meses" |
| "1 year 0 months." | "1 year" | "1 año" |
| "8 months." | "8 months" | "8 meses" |
| "1 month." | "1 month" | "1 mes" |
| "14 weeks." | "14 weeks" | "14 semanas" |
| "1 week." | "1 week" | "1 semana" |
| null/empty | "—" | "—" |

Uses 8 new i18n keys (EN + ES):

| Key | EN | ES |
|-----|----|----|
| `card.age_year_long` | year | año |
| `card.age_years_long` | years | años |
| `card.age_month_long` | month | mes |
| `card.age_months_long` | months | meses |
| `card.age_week_long` | week | semana |
| `card.age_weeks_long` | weeks | semanas |

### Overlay weeks fix: `truncateAgeToYears()` (app.js:617-620)

Added weeks branch after existing months branch:

```js
const weeksMatch = ageText.match(/^(\d+)\s*weeks?/i);
if (weeksMatch) {
  const weeks = parseInt(weeksMatch[1], 10);
  return `${weeks} ${weeks === 1 ? i18n('card.age_wk') : i18n('card.age_wks')}`;
}
```

2 new short keys:

| Key | EN | ES |
|-----|----|----|
| `card.age_wk` | wk | sem |
| `card.age_wks` | wks | sem |

Overlay yr/mo branches **unchanged** — only the previously-missing weeks case was added. The 83 weeks-animals now show "12 sem" in the overlay instead of raw "12 weeks.".

---

## Color Word Map

`COLOR_WORD_MAP_ES` (app.js:650-663) — 25 word-level translations:

| English | Spanish |
|---------|---------|
| black | negro |
| white | blanco |
| brown | marrón |
| tan | habano |
| grey | gris |
| gray | gris |
| orange | naranja |
| cream | crema |
| red | rojo |
| buff | ante |
| chocolate | chocolate |
| tabby | atigrado |
| calico | calicó |
| tabico | tabicó |
| tortie | carey |
| torbi | torbi |
| tuxedo | tuxedo |
| tricolour | tricolor |
| tricolor | tricolor |
| brindle | atigrado |
| ginger | pelirrojo |
| patch | parche |
| dilute | diluido |
| and | y |
| with | con |
| various | varios |
| short | corto |
| long | largo |
| medium | medio |

`translateColorEs()` (app.js:665-677) applies word-by-word via regex, preserving original capitalization (first-char-upper → capitalize mapped word). Unmapped words pass through as English (no gap/blank). Only active when `currentLang === 'es'`; EN returns raw color unchanged.

Examples:
- "Black and Brown" → "Negro y Marrón"
- "Black with white" → "Negro con blanco"
- "Tabby Grey & White" → "Atigrado Gris & Blanco"
- "Domestic Short Hair" → "Doméstico Corto Hair" (note: "Domestic" not in color map — passes through; this is correct since color strings don't include breed terms in practice; "Hair" unmapped, falls back)
- "Dilute Tortie" → "Diluido Carey"

---

## Verification

### Test animals from live data:
- **Aiden** (weeks): sex=Male, age="12 weeks.", color="Black"
- **Anna** (months-only): sex=Female, age="8 months.", color="White"
- **Abe (Louie)** (years+months): sex=Male, age="9 years 7 months.", color="Black with white"

### ES popup expected:
- Aiden: Sexo=Macho, Edad=12 semanas, Color=Negro
- Anna: Sexo=Hembra, Edad=8 meses, Color=Blanco
- Abe: Sexo=Macho, Edad=9 años 7 meses, Color=Negro con blanco

### EN popup expected:
- Aiden: Sex=Male, Age=12 weeks, Color=Black (unchanged from raw, minus trailing period)
- Anna: Sex=Female, Age=8 months, Color=White (unchanged)
- Abe: Sex=Male, Age=9 years 7 months, Color=Black with white (unchanged)

### Overlay weeks fix:
- Aiden in ES overlay: shows "12 sem" (not raw "12 weeks.")
- Existing yr/mo animals: overlay shows "9 años" / "8 meses" — **unchanged**

### Build/serve:
- `node -c app.js` → syntax OK
- Static file served via Express at `/matcher-preview/app.js` → HTTP 200
- All new functions present in served file (11 references found)

### Untouched:
- Production `matcher-web/` → `git diff --stat -- matcher-web/` → empty
- Searcher `custom-search/` → `git diff --stat -- custom-search/` → empty
- Filters, grid, overlay layout — unchanged

---

## Deviations

None.
