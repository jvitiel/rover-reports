# Both Popups Spanish Values — Diagnosis

**Date:** 2026-06-23  
**Read-only:** No writes, no code/service changes  

---

## 1. Matcher-Preview Popup (confirmed)

Values set as raw English at `matcher-preview/app.js:1010-1012`:

```js
// app.js:1010
document.getElementById('modalGender').textContent = animal.sex;    // "Male"
// app.js:1011
document.getElementById('modalAge').textContent = animal.age;       // "3 years 0 months."
// app.js:1012
document.getElementById('modalColor').textContent = animal.color;   // "Black and Brown"
```

Labels localized via `modalLabelMap` at `app.js:389-391`. Values: zero i18n. Unchanged from prior diagnosis.

---

## 2. Custom-Search (Searcher) Popup

### 2a. Value rendering

Values set as raw English at `custom-search/app.js:541-543`:

```js
// app.js:541
document.getElementById('popupSex').textContent = match.sex || '-';    // "Male"
// app.js:542
document.getElementById('popupAge').textContent = match.age || '-';    // "2 years 10 months."
// app.js:543
document.getElementById('popupBreed').textContent = match.breed || '-'; // "Domestic Short Hair"
```

HTML at `custom-search/index.html:125-134`:
- `#popup-gender-label` → label (localized via `app.js:182` → `popup.gender_label` → "Sexo")
- `#popupSex` → value (raw English)
- `#popup-age-label` → label (localized via `app.js:183` → `popup.age_label` → "Edad")
- `#popupAge` → value (raw English)
- `#popup-breed-label` → label (localized via `app.js:184` → `popup.breed_label` → "Raza")
- `#popupBreed` → value (raw English)

**Note:** The searcher popup does NOT display color — only sex, age, breed. (Matcher shows sex, age, color; no breed.)

### 2b. Searcher i18n system

The searcher has its own TRANSLATIONS object (`app.js:3-96`) with EN/ES keys. Relevant sex keys:

| Key | EN | ES | Location |
|-----|----|----|----------|
| `filter.sex_male` | Male | Macho | app.js:20/64 |
| `filter.sex_female` | Female | Hembra | app.js:21/65 |

These are used ONLY for filter pill labels (`app.js:142-143`), NOT for the popup. But the values are identical to what the popup needs — can reuse via `i18n()`.

**Age formatter:** None. The searcher has zero age formatting functions. No `truncateAgeToYears`, no age i18n keys (`age_yr`, `age_yrs`, etc.). Pure raw English `match.age` ("2 years 10 months.").

**Breed:** No breed i18n of any kind. Raw `match.breed`.

---

## 3. Searcher Weeks Gap

The searcher has **no age formatter at all** — it renders raw English for ALL age formats:
- "3 years 0 months." → raw English
- "10 months." → raw English  
- "14 weeks." → raw English

So the searcher has the "weeks gap" AND the "years gap" AND the "months gap" — everything is raw. A complete age localizer is needed (same scope as matcher, but the searcher needs it built from scratch since it has no `truncateAgeToYears` equivalent).

---

## 4. Breed — Distinct Values

**35 distinct breeds** from live API data:

| Count | Breed |
|-------|-------|
| 127 | Domestic Short Hair |
| 12 | Terrier/Mixed Breed |
| 11 | American |
| 4 | Domestic Medium Hair |
| 3 | Domestic Long Hair |
| 3 | Terrier |
| 2 | Husky |
| 2 | Hotot |
| 2 | Pit Bull Terrier |
| 1 | Mixed Breed |
| 1 | Havanese/Terrier |
| 1 | Lop Eared |
| 1 | Chihuahua |
| 1 | Labrador Retriever/Mixed Breed |
| 1 | Husky/Mixed Breed |
| 1 | Basenji/Shepherd |
| 1 | Labrador Retriever |
| 1 | Chinchilla |
| 1 | Boxer/Mixed Breed |
| 1 | Lion Head |
| 1 | Florida White |
| 1 | Labrador Retriever/Pit Bull Terrier |
| 1 | German Shepherd Dog/Mixed Breed |
| 1 | Ferret |
| 1 | Maltese/Mixed Breed |
| 1 | German Shepherd Dog |
| 1 | Spaniel/Dachshund |
| 1 | Bichon Frise |
| 1 | Maltese/Poodle |
| 1 | Dwarf |
| 1 | Pekingese/Mixed Breed |
| 1 | Terrier/Pit Bull Terrier |
| 1 | Chihuahua/Mixed Breed |
| 1 | Guinea Pig |
| 1 | Labrador Retriever/Terrier |

### Recurring words (for word-level map)

| Word | Count | Spanish |
|------|-------|---------|
| domestic | 134 | doméstico |
| hair | 134 | pelo |
| short | 127 | corto |
| terrier | 22 | terrier |
| mixed | 20 | mestizo (or mezcla) |
| breed | 20 | raza |
| american | 11 | americano |
| medium | 4 | medio |
| labrador | 4 | labrador |
| retriever | 4 | retriever (or cobrador) |
| pit | 4 | pit |
| bull | 4 | bull |
| husky | 3 | husky |
| long | 3 | largo |
| shepherd | 3 | pastor |
| chihuahua | 2 | chihuahua |
| german | 2 | alemán |
| dog | 2 | perro |
| maltese | 2 | maltés |

**Note:** "Mixed Breed" → "Raza Mestiza" is the dominant compound. "Domestic Short Hair" → "Pelo Corto Doméstico" covers 66% of all animals. A full-string map for the top 10 breeds + a word-level fallback for the tail would cover everything.

Convention note: many breed names (Terrier, Husky, Chihuahua, Labrador, Pit Bull, Boxer, Bichon Frise, Pekingese) are kept as-is in Spanish usage. Only structural words need translation: Domestic→Doméstico, Short→Corto, Long→Largo, Medium→Medio, Hair→Pelo, Mixed Breed→Raza Mestiza, Shepherd→Pastor, German→Alemán. The remaining ~15 breed-name proper nouns stay unchanged.

---

## 5. Age — Both Popups

Both show the **long format** from the same SM-sourced `age` field:

| App | Field | Example | Formatter |
|-----|-------|---------|-----------|
| Matcher | `animal.age` | "3 years 0 months." | None in popup (raw). Overlay uses `truncateAgeToYears` but popup doesn't call it. |
| Searcher | `match.age` | "2 years 10 months." | None at all. No formatter exists in the codebase. |

Both need a **long-format Spanish age localizer** that handles:
- "X years Y months." → "X años Y meses"
- "X months." → "X meses"
- "X weeks." → "X semanas"

The matcher's `truncateAgeToYears` (app.js:588) drops months and has no weeks — it's for the compact overlay, not the popup. A new long-format formatter is needed.

---

## 6. Color — Same Field

The matcher popup reads `animal.color` (app.js:1012). The searcher popup does NOT display color. Both apps' data comes from the same SM animal pool via `/api/animals`. The 47 distinct color values and ~20 recurring words from the prior diagnosis apply. Only the matcher popup needs a color map.

---

## 7. Breed — Same Field

Both apps' data includes `breed` from the SM animal record. Only the **searcher** displays it in the popup (`match.breed`, app.js:543). The matcher does not show breed. A breed map only needs to be built in the searcher's codebase.

---

## 8. Per-App Reuse & Render-Only Safety

### Matcher-preview

| Need | Reusable | Source |
|------|----------|--------|
| Sex value | ✅ `card.sex_male`/`card.sex_female`/`card.sex_unknown` | app.js:99-101/211-213 (shared with overlay + card) |
| Age value | ❌ New long formatter needed | `truncateAgeToYears` drops months, no weeks — wrong format for popup |
| Color value | ❌ New color word map needed | No existing color i18n anywhere |

**Render-only safety:** Changes are in `showAnimalDetail()` at app.js:1010-1012 only. Overlay (`buildOverlayAttrs`, app.js:658), filters, cards all have their own render paths. No shared mutable state.

### Custom-search (Searcher)

| Need | Reusable | Source |
|------|----------|--------|
| Sex value | ✅ `filter.sex_male`/`filter.sex_female` keys exist | app.js:20-21/64-65 (used for filter pills, same values) |
| Age value | ❌ New formatter needed from scratch | No age formatter exists in this codebase |
| Breed value | ❌ New breed map needed | No breed i18n anywhere |

**Render-only safety:** Changes are in `openPopup()` at app.js:541-543 only. Filter pills use `filter.sex_*` keys at app.js:142-143 — reusing those keys for popup values is safe (same string values). Search engine logic (`app.js:350-410`) reads raw `match.*` fields for API payload, never touches i18n. No shared mutable state.

---

## Summary Table

| Field | Matcher Popup | Searcher Popup | Shared? |
|-------|--------------|----------------|---------|
| Sex | Needs i18n (keys exist) | Needs i18n (keys exist) | Same enum values, separate key namespaces |
| Age | Needs new long formatter + week keys | Needs new long formatter from scratch | Same raw `age` field, same format |
| Color | Needs word map (~20 words) | N/A (not displayed) | — |
| Breed | N/A (not displayed) | Needs breed map (~35 breeds, ~10 structural words) | — |
