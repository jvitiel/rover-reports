# Matcher-Preview: Spanish Popup Values — Diagnosis

**Date:** 2026-06-23  
**Read-only:** No writes, no code/service changes  

---

## 1. Popup Value Rendering

The popup (`showAnimalDetail`, `app.js:990`) sets the three values as raw English strings:

```js
// app.js:1010
document.getElementById('modalGender').textContent = animal.sex;    // "Male" / "Female"
// app.js:1011
document.getElementById('modalAge').textContent = animal.age;       // "3 years 0 months."
// app.js:1012
document.getElementById('modalColor').textContent = animal.color;   // "Black and Brown"
```

No i18n or formatting is applied. The **labels** (Sex/Sexo, Age/Edad, Color) ARE localized via `modalLabelMap` at `app.js:389-391` which traverses from the value element up to `.detail-item` then down to `.detail-label`. But the **values** are raw `animal.sex` / `animal.age` / `animal.color`.

---

## 2. Age — Overlay's Approach

The overlay's age path uses `truncateAgeToYears()` at `app.js:588-601`:

```js
// app.js:588
function truncateAgeToYears(ageText) {
  if (!ageText) return '';
  const yearsMatch = ageText.match(/^(\d+)\s*years?/i);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1], 10);
    return `${years} ${years === 1 ? i18n('card.age_yr') : i18n('card.age_yrs')}`;  // "3 años"
  }
  const monthsMatch = ageText.match(/^(\d+)\s*months?/i);
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1], 10);
    return `${months} ${months === 1 ? i18n('card.age_mo') : i18n('card.age_mos')}`;  // "8 meses"
  }
  return ageText;  // FALLBACK: returns raw English
}
```

### What it handles in Spanish:

| Format | Example input | ES output | Handled? |
|--------|--------------|-----------|----------|
| Years+months | "3 years 0 months." | "3 años" | ✅ (truncates months) |
| Months only | "10 months." | "10 meses" | ✅ |
| Weeks | "14 weeks." | "14 weeks." (raw) | ❌ NO |

### i18n keys (app.js):

| Key | EN | ES |
|-----|----|----|
| `card.age_yr` (line 118/230) | yr | año |
| `card.age_yrs` (line 119/231) | yrs | años |
| `card.age_mo` (line 120/232) | mo | mes |
| `card.age_mos` (line 121/233) | mos | meses |
| `card.age_wk` / `card.age_wks` | **MISSING** | **MISSING** |

### Data distribution:
- Years+months: 102 animals — **truncated to years only** (months dropped)
- Months only: 7 animals — ✅ handled
- Weeks: **83 animals** — ❌ falls through to raw English ("14 weeks.")

### Recommendation for the popup:

The popup currently shows the **long format** ("3 years 0 months.") while the overlay shows the **short format** ("3 años"). Two options:

**Option A — Reuse `truncateAgeToYears` (+ add weeks):** Popup would show "3 años" like the overlay. Needs `card.age_wk`/`card.age_wks` keys added. Loses the months component for years+months animals (shows "3 años" not "3 años 2 meses").

**Option B — New popup-specific long formatter:** Popup shows "3 años 2 meses", "10 meses", "14 semanas". More informative but needs a new function with regex parsing for all three patterns. The raw data format is consistent: `"N years? M months."` or `"N months."` or `"N weeks."` — all parseable.

**Option B is the clean fix** — the popup is the detail view, it should show the full age, not the truncated overlay format. Either way, week keys (`card.age_wk`/`card.age_wks` → semana/semanas) are needed.

---

## 3. Sex — Enum

i18n keys already exist and are used by both the overlay and `abbreviateGender()`:

| Key | EN | ES | Location |
|-----|----|----|----------|
| `card.sex_male` | Male | Macho | app.js:99/211 |
| `card.sex_female` | Female | Hembra | app.js:100/212 |
| `card.sex_unknown` | Unknown | Desconocido | app.js:101/213 |

Usage: overlay at `app.js:664-665`, `abbreviateGender` at `app.js:606-608`.

The popup can map `animal.sex` → these keys identically:
```
if (sex === 'male') → i18n('card.sex_male')
if (sex === 'female') → i18n('card.sex_female')
else → i18n('card.sex_unknown')
```

---

## 4. Color — Free-Text, Needs Curated Map

### 4a. Distinct values (47 total)

| Count | Color |
|-------|-------|
| 34 | Black |
| 11 | Tuxedo: Black and White |
| 10 | White |
| 10 | Brown |
| 9 | Black with white |
| 9 | Black and White |
| 9 | Tabby Grey & White |
| 8 | Brown and White |
| 8 | tabby - brown and white |
| 6 | tabby brown |
| 6 | Tabby |
| 6 | Calico |
| 5 | Grey |
| 4 | Tabico |
| 4 | Tan and White |
| 3 | Tabby and White |
| 3 | Tabby - grey |
| 3 | Patch Tabby |
| 3 | Grey and White |
| 3 | Tan |
| 3 | Tricolour |
| 2 | White and Brown |
| 2 | White and Black |
| 2 | Buff and White |
| 2 | Tabby - black and white |
| 2 | Brown and Black |
| 2 | White and orange |
| 2 | Tabby: Orange and White |
| 2 | Ginger |
| 2 | Orange tabby |
| 1 | Black and Brown |
| 1 | Cream |
| 1 | Orange with white |
| 1 | Orange / Red & White |
| 1 | Torbi |
| 1 | Chocolate |
| 1 | Tabby - brown & black |
| 1 | White with black |
| 1 | Various |
| 1 | Black and Grey |
| 1 | tabby - ginger |
| 1 | Dilute Tabico |
| 1 | Tabby black & grey |
| 1 | White and Grey |
| 1 | Brindle |
| 1 | Buff |
| 1 | Dilute Tortie |

### 4b. Recurring component words

A word-level map would cover these recurring words:

| Word | Count | Spanish |
|------|-------|---------|
| white | 90 | blanco/a |
| black | 74 | negro/a |
| and | 63 | y |
| tabby | 47 | atigrado/a |
| brown | 38 | marrón |
| grey | 23 | gris |
| with | 11 | con |
| tuxedo | 11 | tuxedo / blanco y negro |
| orange | 8 | naranja |
| tan | 7 | canela |
| calico | 6 | calicó |
| tabico | 5 | tabicó |
| patch | 3 | parche |
| buff | 3 | ante |
| tricolour | 3 | tricolor |
| ginger | 3 | pelirrojo |
| dilute | 2 | diluido |
| cream | 1 | crema |
| red | 1 | rojo |
| torbi | 1 | torbi |
| chocolate | 1 | chocolate |
| various | 1 | varios |
| brindle | 1 | atigrado (brindle) |
| tortie | 1 | carey |

A word-level replacement map of ~20 words would translate all 47 distinct values. Delimiters to handle: "and", "with", "&", "/", "-", ":".

### 4c. Existing color i18n

**None.** The filter's color input has a placeholder:
```js
// app.js:171 (ES)
'filter.color_placeholder': 'ej. atigrado, negro...',
```

This is just hint text for the search box — not a translation map. The overlay (`buildOverlayAttrs`, `app.js:672`) also passes raw `animal.color` with no translation.

---

## 5. Shared-Key Safety

| Key set | Used by | Popup reuse safe? |
|---------|---------|-------------------|
| `card.sex_male/female/unknown` | Overlay (app.js:664), `abbreviateGender` (app.js:606) | ✅ Same values, same mapping |
| `card.age_yr/yrs/mo/mos` | `truncateAgeToYears` (app.js:593-598), overlay (app.js:668) | ✅ Same keys, popup uses them the same way |
| New `card.age_wk/wks` | Would be new keys | ✅ Additive, no conflict |
| New color word map | Would be new (e.g. `color.black`, `color.white`, etc.) | ✅ New namespace, no conflict |

Localizing the popup values will NOT disturb:
- **Overlay:** Overlay already uses the sex/age keys. Adding new week keys doesn't affect overlay (it falls through to raw text for weeks, which is unchanged).
- **Filters:** Filter checkboxes use `filter.*` keys, not `card.*`. Color filter is a text search on the English `animal.color` field — popup translation is display-only, doesn't touch filter logic.
- **Cards:** Front card uses `abbreviateGender` / `truncateAgeToYears` which already use the same keys.

The popup rendering at `app.js:1010-1012` is the **only** code that needs changes. All key reuse is safe.
