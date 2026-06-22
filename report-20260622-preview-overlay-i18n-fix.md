# Preview Overlay i18n Fix

**Date:** 2026-06-22 23:20 UTC  
**Commit:** `0505901`  
**File:** `matcher-preview/app.js` (+41 -11)

---

## Reused card.* Keys (no duplicates)

| Key | EN | ES | Overlay used for |
|-----|----|----|------------------|
| `card.sex_male` (line 99/210) | `Male` | `Macho` | Sex |
| `card.sex_female` (line 100/211) | `Female` | `Hembra` | Sex |

**Note:** `card.bonded_pair` and `card.adoption_pending` use Title Case ("Bonded Pair" / "Adoption Pending") while the overlay displays sentence-case ("Bonded pair" / "Adoption pending"). New `overlay.*` keys added for flags to preserve sentence-case styling.

## New overlay.* Keys (EN + ES)

### Good-with (9 keys)

| Key | EN | ES |
|-----|----|----|
| `overlay.good_with_kids` | Good with kids | Bueno con niños |
| `overlay.somewhat_kids` | Somewhat good with kids | Algo bueno con niños |
| `overlay.not_good_kids` | Not good with kids | No apto con niños |
| `overlay.good_with_dogs` | Good with dogs | Bueno con perros |
| `overlay.somewhat_dogs` | Somewhat good with dogs | Algo bueno con perros |
| `overlay.not_good_dogs` | Not good with dogs | No apto con perros |
| `overlay.good_with_cats` | Good with cats | Bueno con gatos |
| `overlay.somewhat_cats` | Somewhat good with cats | Algo bueno con gatos |
| `overlay.not_good_cats` | Not good with cats | No apto con gatos |

### Energy (3 keys)

| Key | EN | ES |
|-----|----|----|
| `overlay.energy_low` | Low energy | Energía baja |
| `overlay.energy_med` | Medium energy | Energía media |
| `overlay.energy_high` | High energy | Energía alta |

### Special needs (1 key)

| Key | EN | ES |
|-----|----|----|
| `overlay.special_needs` | Has special needs | Necesidades especiales |

### Flags (2 keys — sentence-case, distinct from Title Case card.* keys)

| Key | EN | ES |
|-----|----|----|
| `overlay.bonded_pair` | Bonded pair | Pareja vinculada |
| `overlay.adoption_pending` | Adoption pending | Adopción pendiente |

**Total: 15 new overlay.* keys** (EN + ES). Sex reuses 2 existing card.* keys.

## buildOverlayAttrs Rewire (app.js:~644-684)

**Before:** Hardcoded literals
```javascript
if (sex === 'male') lines.push('Male');
if (v === 'yes') lines.push(`Good with ${label}`);
if (energy === 'low') lines.push('Low energy');
if (hasNeeds) lines.push('Has special needs');
```

**After:** i18n calls
```javascript
if (sex === 'male') lines.push(i18n('card.sex_male'));
if (v === 'yes') lines.push(i18n(`overlay.good_with_${label}`));
if (energy === 'low') lines.push(i18n('overlay.energy_low'));
if (hasNeeds) lines.push(i18n('overlay.special_needs'));
```

Suppression logic identical — unknown/? still omitted, same order, same conditions.

## buildOverlayFlags Rewire (app.js:~689-694)

**Before:**
```javascript
if (animal.bondedPair) flags.push('Bonded pair');
if (animal.adoptionPending) flags.push('Adoption pending');
```

**After:**
```javascript
if (animal.bondedPair) flags.push(i18n('overlay.bonded_pair'));
if (animal.adoptionPending) flags.push(i18n('overlay.adoption_pending'));
```

## Language Toggle Re-render

Already wired: toggle handler (app.js:~456) calls `applyFilters()` which calls `renderAnimals()` — cards rebuild with `buildOverlayAttrs`/`buildOverlayFlags`, which call `i18n()` reading the updated `currentLang`. **No extra wiring needed.**

## Verification

### Served content
- All 15 overlay.* keys present in both EN and ES tables ✅
- buildOverlayAttrs/Flags use only `i18n()` calls (zero hardcoded push strings) ✅
- card.sex_male/female reused (no duplicate overlay.sex_* keys) ✅

### EN (no regression)
- Good with kids / Somewhat good with dogs / Not good with cats ✅
- Low energy / Medium energy / High energy ✅
- Has special needs ✅
- Bonded pair / Adoption pending ✅
- Male / Female ✅
- Age: "3 yrs" ✅

### ES
- Bueno con niños / Algo bueno con perros / No apto con gatos ✅
- Energía baja / Energía media / Energía alta ✅
- Necesidades especiales ✅
- Pareja vinculada / Adopción pendiente ✅
- Macho / Hembra ✅
- Age: "3 años" ✅
- Toggle EN→ES updates overlays live (applyFilters rebuilds cards) ✅

### Unchanged
- Filters/grid/cards layout/CSS ✅
- Detail popup ✅
- Suppression logic (unknown/? omitted) ✅
- Production matcher-web/ (doesn't have overlay feature) ✅
- custom-search/ ✅

### HTTP
- 200 on /matcher-preview/ ✅
