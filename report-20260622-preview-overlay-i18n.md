# Preview Overlay i18n Diagnosis

**Date:** 2026-06-22 23:09 UTC  
**Mode:** Read-only

---

## 1. Hardcoded Overlay Strings

### buildOverlayAttrs (app.js:628-672)

| Line | Hardcoded String | Category |
|------|-----------------|----------|
| 634 | `'Male'` | Sex |
| 635 | `'Female'` | Sex |
| 654 | `` `Good with ${label}` `` | Good-with (yes) |
| 655 | `` `Somewhat good with ${label}` `` | Good-with (somewhat) |
| 656 | `` `Not good with ${label}` `` | Good-with (no) |
| — | label = `'kids'`, `'dogs'`, `'cats'` | Good-with targets (lines 649-651) |
| 661 | `'Low energy'` | Energy |
| 662 | `'Medium energy'` | Energy |
| 663 | `'High energy'` | Energy |
| 668 | `'Has special needs'` | Special needs |

### buildOverlayFlags (app.js:673-678)

| Line | Hardcoded String | Category |
|------|-----------------|----------|
| 675 | `'Bonded pair'` | Flag |
| 676 | `'Adoption pending'` | Flag |

**Total: 14 distinct hardcoded English strings** (Male, Female, Good/Somewhat/Not good × kids/dogs/cats, Low/Medium/High energy, Has special needs, Bonded pair, Adoption pending).

**Age and color are NOT hardcoded** — age comes from `truncateAgeToYears()` which already uses `i18n('card.age_yr'/'card.age_yrs'/'card.age_mo'/'card.age_mos')` (app.js:563-569). Color is passed through from `animal.color` (raw data).

## 2. i18n Structure

### Global (app.js:42)
```javascript
let currentLang = 'en'; // Language: 'en' or 'es'
```

### Lookup function (app.js:242-244)
```javascript
function i18n(key) {
  return TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
```

### Dictionary (app.js:45)
```javascript
const TRANSLATIONS = {
  en: {
    'page.title': 'Browse Your Perfect Pet',
    'header.title': 'Browse Your Perfect Pet',
    'filter.age_label': 'Age',
    'card.sex_male': 'Male',
    // ... flat key-value, dot-namespaced
  },
  es: {
    'page.title': 'Encuentra Tu Mascota Perfecta',
    'card.sex_male': 'Macho',
    // ... same keys, Spanish values
  }
};
```

Keys use dot namespace: `category.concept` (e.g. `card.sex_male`, `filter.energy_low`). Overlay keys should follow: `overlay.sex_male`, `overlay.good_with_kids_yes`, etc.

## 3. Existing ES Translations to Reuse

The modal/card helpers AND filters already have natural Spanish for every concept the overlay needs:

### Sex
| Key | EN | ES |
|-----|----|----|
| `card.sex_male` (line 99/196) | `'Male'` | `'Macho'` |
| `card.sex_female` (line 100/197) | `'Female'` | `'Hembra'` |

### Energy
| Key | EN | ES |
|-----|----|----|
| `card.energy_low` (line 102/199) | `'Low'` | `'Bajo'` |
| `card.energy_med` (line 103/200) | `'Med'` | `'Medio'` |
| `card.energy_high` (line 104/201) | `'High'` | `'Alto'` |

### Good-with targets
| Key | EN | ES |
|-----|----|----|
| `card.compat_kids` (line 115/212) | `'Kids'` | `'Niños'` |
| `card.compat_dogs` (line 116/213) | `'Dogs'` | `'Perros'` |
| `card.compat_cats` (line 117/214) | `'Cats'` | `'Gatos'` |

### Good-with values
| Key | EN | ES |
|-----|----|----|
| `card.compat_yes` (line 106/203) | `'Yes'` | `'Sí'` |
| `card.compat_some` (line 107/204) | `'Some'` | `'Algo'` |
| `card.compat_no` (line 108/205) | `'No'` | `'No'` |

### Flags
| Key | EN | ES |
|-----|----|----|
| `card.adoption_pending` (line 113/210) | `'Adoption Pending'` | `'Adopción Pendiente'` |
| `card.bonded_pair` (line 114/211) | `'Bonded Pair'` | `'Pareja Vinculada'` |

### Special needs
| Key | EN | ES |
|-----|----|----|
| `card.special_needs_yes` (line 110/207) | `'Yes'` | `'Sí'` |

### Filter labels (for phrasing reference)
| Key | EN | ES |
|-----|----|----|
| `filter.good_with_kids_label` (line 62/159) | `'Good with Kids'` | `'Bueno con Niños'` |
| `filter.good_with_dogs_label` (line 63/160) | `'Bueno con Perros'` |
| `filter.good_with_cats_label` (line 64/161) | `'Bueno con Gatos'` |
| `filter.energy_label` (line 60/157) | `'Energy'` | `'Energía'` |
| `filter.special_needs_label` (line 61/156) | `'Special Needs'` | `'Necesidades Especiales'` |

## 4. Active Language Access

`buildOverlayAttrs` can call `i18n(key)` directly — it's a module-level function, `currentLang` is module-level. The card detail helpers (`abbreviateGender`, `abbreviateEnergy`, `truncateAgeToYears`) already call `i18n()` at render time. Same pattern works for the overlay builder.

**Re-render trigger:** `buildOverlayAttrs` is called from `renderAnimals()` which rebuilds all cards. On language toggle, `applyStaticTranslations()` runs but does NOT call `renderAnimals()`. Need to confirm whether language toggle re-renders cards or just updates static text. If it doesn't re-render cards, the overlay attrs would remain in the old language until a filter change triggers `renderAnimals()`.

## 5. Verdict

### Already have ES translations (reuse directly via i18n())
- **Sex:** `card.sex_male` / `card.sex_female` → Macho / Hembra
- **Energy:** compose `i18n('card.energy_low')` + `' '` + `i18n('overlay.energy_word')` — or add new overlay-specific keys
- **Flags:** `card.bonded_pair` / `card.adoption_pending` → Pareja Vinculada / Adopción Pendiente

### Need NEW overlay-specific i18n keys (compound phrases)
The overlay uses phrases like "Good with kids" / "Somewhat good with kids" / "Low energy" / "Has special needs" — these are compound constructions not present as-is in the existing i18n tables. Options:

**(a) Compose from existing pieces** — e.g. `i18n('filter.good_with_kids_label')` gives "Good with Kids" / "Bueno con Niños". But "Somewhat good with kids" and "Not good with kids" have no existing compound form.

**(b) Add new overlay keys** (recommended for clean per-language control):

| New key | EN | ES (natural) |
|---------|----|----|
| `overlay.good_with_kids` | `Good with kids` | `Bueno con niños` |
| `overlay.somewhat_kids` | `Somewhat good with kids` | `Algo bueno con niños` |
| `overlay.not_good_kids` | `Not good with kids` | `No bueno con niños` |
| `overlay.good_with_dogs` | `Good with dogs` | `Bueno con perros` |
| `overlay.somewhat_dogs` | `Somewhat good with dogs` | `Algo bueno con perros` |
| `overlay.not_good_dogs` | `Not good with dogs` | `No bueno con perros` |
| `overlay.good_with_cats` | `Good with cats` | `Bueno con gatos` |
| `overlay.somewhat_cats` | `Somewhat good with cats` | `Algo bueno con gatos` |
| `overlay.not_good_cats` | `Not good with cats` | `No bueno con gatos` |
| `overlay.low_energy` | `Low energy` | `Energía baja` |
| `overlay.med_energy` | `Medium energy` | `Energía media` |
| `overlay.high_energy` | `High energy` | `Energía alta` |
| `overlay.has_special_needs` | `Has special needs` | `Necesidades especiales` |
| `overlay.male` | `Male` | `Macho` |
| `overlay.female` | `Female` | `Hembra` |
| `overlay.bonded_pair` | `Bonded pair` | `Pareja vinculada` |
| `overlay.adoption_pending` | `Adoption pending` | `Adopción pendiente` |

**17 new keys total** (could reuse `card.sex_male`/`card.bonded_pair` etc. if casing matches, but overlay uses sentence-case while card keys use Title Case — "Bonded pair" vs "Bonded Pair". New keys give full control.)

### Wiring
Replace each hardcoded string in `buildOverlayAttrs`/`buildOverlayFlags` with `i18n('overlay.xxx')`. Since `i18n()` reads `currentLang` at call time, and `buildOverlayAttrs` is called from `renderAnimals()`, the overlay will render in the active language whenever cards are rendered.

### Re-render on language toggle
Check whether the language toggle calls `renderAnimals()` — if not, cards (including overlays) won't update language until a filter triggers re-render. May need to add a `renderAnimals()` call to the toggle handler.
