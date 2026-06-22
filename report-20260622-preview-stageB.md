# Stage B: Grid + Hover Overlay Reskin (matcher-preview only)

**Date:** 2026-06-22 16:40 UTC  
**Commit:** `dcced7b`  
**Files:** `matcher-preview/app.js` (+92 -50), `matcher-preview/styles.css` (+102 -50)

---

## Before: Card Render (app.js:897-930)

```javascript
<article class="animal-card" onclick="showAnimalDetail('${animal.id}')">
  <div class="animal-card-photo">
    <img src="${photoSrc}" alt="${animal.name}" ...>
  </div>
  <div class="animal-card-info">
    <h3 class="animal-card-name">
      <span>${animal.name}</span>
      <div class="card-status-badges">...</div>
    </h3>
    <div class="card-details">
      <div class="detail-row detail-row--split">
        Sex: M/F, Age: 3 yrs
      </div>
      <div class="detail-row">Color: Cream</div>
      <div class="detail-row">Good with: Kids ✓, Dogs ✓, Cats ?</div>
      <div class="detail-row detail-row--split">
        Energy: Med, Special needs: No
      </div>
    </div>
  </div>
</article>
```

## Before: CSS

```css
.animals-grid { gap: 20px; }
.animal-card { border-radius: 16px; box-shadow: 0 2px 12px ...; }
.animal-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px ...; }
.animal-card-photo { height: 220px; }
.animal-card-photo img { object-fit: contain; }
.animal-card-info { padding: 14px 16px 16px; flex: 1; }
```

---

## After: Card Render

```javascript
<article class="animal-card" tabindex="0" onclick="showAnimalDetail('${animal.id}')">
  <div class="animal-card-photo">
    <img src="${photoSrc}" alt="${animal.name}" ...>
  </div>
  <div class="animal-card-overlay">
    <div class="overlay-name">${animal.name}</div>
    ${flags → <div class="overlay-flags">...<span class="overlay-flag">...</span>...</div>}
    ${attrs → <div class="overlay-attrs">...<span class="overlay-attr">...</span>...</div>}
  </div>
</article>
```

## After: CSS

```css
.animals-grid { gap: 2px; }
.animal-card { border-radius: 0; box-shadow: none; aspect-ratio: 1/1; position: relative; }
.animal-card:focus-visible { outline: 3px solid var(--primary); }
.animal-card-photo { height: 100%; }
.animal-card-photo img { object-fit: cover; }
.animal-card-overlay { position: absolute; inset: 0; opacity: 0; transition: 0.25s; ... }
.animal-card:hover .animal-card-overlay { opacity: 1; }
.animal-card-info { display: none; }  /* old info section hidden */
@media (hover: none) { /* touch: name strip only, attrs hidden */ }
```

## Attribute Packer (`buildOverlayAttrs` + `buildOverlayFlags`)

New helper functions added after `formatSpecialNeedsValue`. Fixed order, unknowns suppressed by omission:

| Field | Shown when | Suppressed when |
|-------|-----------|-----------------|
| Bonded pair (flag) | `animal.bondedPair` truthy | falsy |
| Adoption pending (flag) | `animal.adoptionPending` truthy | falsy |
| Sex | 'Male' or 'Female' | anything else |
| Age | non-empty after `truncateAgeToYears` | empty, 'Unknown', '?' |
| Color | non-empty, not 'unknown' (case-insensitive) | empty or 'unknown' |
| Good with kids/dogs/cats | 'yes' → "Good with X", 'somewhat' → "Sometimes good with X", 'no' → "Not good with X" | 'unknown', '?', empty |
| Energy | 'low'/'medium'/'high' → "X energy" | 'unknown' |
| Special needs | same hasNeeds logic as existing `formatSpecialNeedsValue` → "Has special needs" | no/none/n-a/etc. |

---

## Spot-Check: Expected Overlay Content

### Amari (A2024185) — Dog, full data
- **Photo:** Square crop (`/crops/A2024185-4484.jpg`), `object-fit: cover` — no bars ✅
- **Flags:** (none)
- **Attrs:** Female · 3 yrs · Cream · Good with kids · Good with dogs · Good with cats · Medium energy · Has special needs
- **8 lines**, all known, fully packed ✅

### Achilles (A2025088) — Bonded + Adoption Pending
- **Flags:** "Bonded pair" · "Adoption pending" (separated by hairline)
- **Attrs:** Male · 3 yrs · Black and Brown · Sometimes good with kids · Sometimes good with dogs · High energy
- cats=unknown → suppressed, specialNeeds=None → suppressed ✅

### Aiden (S2026397) — Mostly Unknown Cat
- **Flags:** (none)
- **Attrs:** Male · 12 mos · Black
- All compat fields unknown → suppressed, energy unknown → suppressed, specialNeeds='?' → suppressed
- **Collapses to name + 3 attribute lines** — no blanks, no "?", no "Unknown" ✅

### Aladdin (R2025053) — Rabbit
- **Flags:** (none)
- **Attrs:** Male · 1 yr · Black · Good with kids
- dogs/cats unknown → suppressed, energy unknown → suppressed
- **Renders identically** to any other card — no species-specific treatment ✅

### No "?" or "Unknown" anywhere
Confirmed: `buildOverlayAttrs` never emits '?', 'Unknown', or any unknown-state text. Every field either produces a human-readable positive/negative statement or is suppressed entirely.

## Click → Detail Popup
`onclick="showAnimalDetail('${animal.id}')"` preserved on `<article>`. `showAnimalDetail` function unchanged. `tabindex="0"` added for keyboard navigation.

## Production Unchanged
```
$ curl -s matcher.4lgshelterapp.duckdns.org/app.js | grep -c 'buildOverlayAttrs' → 0
$ curl -s matcher.4lgshelterapp.duckdns.org/styles.css | grep -c 'animal-card-overlay' → 0
```
`matcher-web/` directory not in the commit. Production matcher visually unchanged.

## Delivery
Static files — no service restart needed. Express `express.static` serves updated files on next browser request (Ctrl+Shift+R to bypass cache).

**Commit:** `dcced7b`  
**Files:** `matcher-preview/app.js`, `matcher-preview/styles.css`
