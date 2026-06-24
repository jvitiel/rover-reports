# Searcher Popup Spanish Values — Implementation Report

**Date:** 2026-06-24  
**Commit:** `30212f9`  
**File changed:** `custom-search/app.js` (1 file, 90 insertions, 3 deletions)

---

## Sex Mapping

Popup sex value (`app.js:607-609`, replacing raw `match.sex`) now maps via i18n:

```js
const sexLower = (match.sex || '').trim().toLowerCase();
if (sexLower === 'male') → i18n('filter.sex_male')    // "Macho" (ES) / "Male" (EN)
if (sexLower === 'female') → i18n('filter.sex_female')  // "Hembra" (ES) / "Female" (EN)
else → match.sex || '-'
```

Reuses existing keys at `app.js:20-21` (EN) / `app.js:64-65` (ES). These keys are also used for filter pill labels — same values, safe to share.

---

## Age Formatter

### `formatAgeLong()` (app.js:548-571)

Parses the raw SM age string and produces localized long form:

| Input | EN output | ES output |
|-------|-----------|-----------|
| "3 years 2 months." | "3 years 2 months" | "3 años 2 meses" |
| "1 year 0 months." | "1 year" | "1 año" |
| "8 months." | "8 months" | "8 meses" |
| "14 weeks." | "14 weeks" | "14 semanas" |
| null/empty | "—" | "—" |

6 new i18n keys (EN + ES):

| Key | EN | ES |
|-----|----|----|
| `popup.age_year` | year | año |
| `popup.age_years` | years | años |
| `popup.age_month` | month | mes |
| `popup.age_months` | months | meses |
| `popup.age_week` | week | semana |
| `popup.age_weeks` | weeks | semanas |

---

## Breed Map

### Full-string overrides (`BREED_FULL_MAP_ES`, app.js:574-585)

| English | Spanish |
|---------|---------|
| Domestic Short Hair | Doméstico de Pelo Corto |
| Domestic Medium Hair | Doméstico de Pelo Medio |
| Domestic Long Hair | Doméstico de Pelo Largo |
| Mixed Breed | Raza Mestiza |
| German Shepherd Dog | Pastor Alemán |
| Lion Head | Cabeza de León |
| Florida White | Blanco de Florida |
| Lop Eared | Orejas Caídas |
| Guinea Pig | Cobayo |
| Pit Bull Terrier | Pit Bull Terrier |

### Word-level fallback (`BREED_WORD_MAP_ES`, app.js:587-592)

| English | Spanish |
|---------|---------|
| domestic | doméstico |
| short | corto |
| long | largo |
| medium | medio |
| hair | pelo |
| mixed | mestizo |
| breed | raza |
| shepherd | pastor |
| german | alemán |
| hound | sabueso |
| dwarf | enano |

### Translation logic (`translateBreedEs`, app.js:594-607)
1. If `currentLang !== 'es'`, return raw breed (EN unchanged)
2. Slash-separated breeds: split on `/`, translate each part recursively, rejoin
3. Full-string map check (case-insensitive)
4. Word-by-word fallback: translate known structural words, leave proper nouns as-is

### Top breed renderings:

| English | Spanish |
|---------|---------|
| Domestic Short Hair (127) | Doméstico de Pelo Corto |
| Terrier/Mixed Breed (12) | Terrier/Raza Mestiza |
| American (11) | American |
| Domestic Medium Hair (4) | Doméstico de Pelo Medio |
| Domestic Long Hair (3) | Doméstico de Pelo Largo |
| Terrier (3) | Terrier |
| Husky (2) | Husky |
| Pit Bull Terrier (2) | Pit Bull Terrier |
| Labrador Retriever/Mixed Breed (1) | Labrador Retriever/Raza Mestiza |
| German Shepherd Dog/Mixed Breed (1) | Pastor Alemán/Raza Mestiza |
| Chihuahua (1) | Chihuahua |
| Guinea Pig (1) | Cobayo |
| Dwarf (1) | Enano |
| Ferret (1) | Ferret |

Proper-noun breed names (Terrier, Husky, Chihuahua, Labrador Retriever, Bichon Frise, Maltese, Poodle, etc.) pass through unchanged — correct in Spanish usage.

---

## Verification

### Test animals from live data:
- **Weeks animal (Aiden):** sex=Male, age="12 weeks.", breed= — ES popup: Sexo=Macho, Edad=12 semanas
- **Months-only (Anna):** sex=Female, age="8 months." — ES popup: Sexo=Hembra, Edad=8 meses
- **Years+months (Abe):** sex=Male, age="9 years 7 months." — ES popup: Sexo=Macho, Edad=9 años 7 meses
- **Breed (Domestic Short Hair):** → Doméstico de Pelo Corto
- **Breed (Terrier/Mixed Breed):** → Terrier/Raza Mestiza

### EN popup: unchanged
- Male/Female, English age ("3 years 2 months"), raw English breed

### Build/serve:
- `node -c app.js` → syntax OK
- Static file served via Express at `/custom-search/app.js` → HTTP 200
- All new functions present in served file (14 references found)

### Untouched:
- `matcher-preview/` → `git diff --stat` → empty (no changes)
- `matcher-web/` → `git diff --stat` → empty (no changes)
- Searcher filters/grid/engine: openPopup() changes are value-display-only at lines 607-613

---

## Deviations

None.
