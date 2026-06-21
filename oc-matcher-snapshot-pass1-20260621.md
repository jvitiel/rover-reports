# Matcher-Web Snapshot — Pass 1 (Markup + Styles)

**Date:** 2026-06-21 ~23:20 UTC  
**Mode:** Read-only. No files modified. Source copied to rover-reports for retrieval.

---

## Part A — Source Files (Verbatim Copies)

| File | Raw URL |
|------|---------|
| index.html | https://raw.githubusercontent.com/jvitiel/rover-reports/main/matcher-snapshot/index.html.txt |
| styles.css | https://raw.githubusercontent.com/jvitiel/rover-reports/main/matcher-snapshot/styles.css.txt |
| app.js | https://raw.githubusercontent.com/jvitiel/rover-reports/main/matcher-snapshot/app.js.txt |

All three are full, unmodified copies (index.html: 225 lines, styles.css: 1149 lines, app.js: 1188 lines).

---

## Part B — Orientation

### 2. Results Grid Card

**Render function:** `renderAnimals()` at app.js:834. The entire grid is built as a single `.innerHTML` assignment using `.map().join('')` on `filteredAnimals`.

**Card markup (app.js:887-930):**

```html
<article class="animal-card" onclick="showAnimalDetail('${animal.id}')">
  <div class="animal-card-photo">
    <img src="${photoSrc}" alt="${animal.name}" onerror="this.src='${placeholder}'">
  </div>
  <div class="animal-card-info">
    <h3 class="animal-card-name">
      <span class="animal-card-name-text">${animal.name}</span>
      <!-- optional: .card-status-badges with bondedPair / adoptionPending badges -->
    </h3>
    <div class="card-details">
      <!-- detail-row: Sex (abbreviated) | Age (truncated to years) -->
      <!-- detail-row: Color -->
      <!-- detail-row: Good with Kids/Dogs/Cats (compat symbols) -->
      <!-- detail-row: Energy (abbreviated) | Special Needs (yes/no) -->
    </div>
  </div>
</article>
```

**What's drawn on the tile besides the photo:**
- Animal name (in `h3`)
- Up to 2 status badges (Bonded Pair / Adoption Pending) — stacked right-justified in the name row
- Sex (abbreviated M/F) + Age (years only)
- Color
- Good with: Kids ✓/✗/~, Dogs ✓/✗/~, Cats ✓/✗/~
- Energy level (abbreviated) + Special Needs (Yes/No)

**Card CSS (styles.css:484-530):**

```css
.animal-card {
  background: var(--card-bg);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
  border: none;
}

.animal-card-photo {
  width: 100%;
  height: 220px;                          /* fixed height */
  background: linear-gradient(135deg, var(--glow) 0%, #F5EDE6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.animal-card-photo img {
  width: 100%;
  height: 100%;
  object-fit: contain;                    /* currently CONTAIN, not cover */
}
```

---

### 3. Hover Behavior

**CSS hover exists (styles.css:498-501):**

```css
.animal-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
```

Lift + shadow on hover. **No JS hover behavior** (no mouseenter/mouseleave/mouseover handlers found in app.js). No hover overlay, no text reveal, no image zoom — just the CSS lift effect.

---

### 4. Detail Popup (Click-Through)

**Function:** `showAnimalDetail(id)` at app.js:933.

**Container:** `#animalModal` — a full-screen modal overlay. Key elements:
- `#modalGallery .gallery-loading` — lead media (video if available, else photo)
- `#modalName` — animal name
- `#modalGender`, `#modalAge`, `#modalColor` — detail fields
- `#modalScoreContainer` / `#modalScore` — match score (shown only when available)
- `#modalDescription` — bio text (with EN/ES language fallback)
- `.modal-content` / `.modal-overlay` — layout containers

**Boundary:** The modal is a separate DOM tree (`#animalModal`) with its own CSS (styles.css:695-830 `.modal-*` classes). It is NOT part of the grid card — it opens on click via JS and populates from the animal data object. **The reskin should not touch any `#animalModal` or `.modal-*` elements.**

The modal also has a lightbox (`#lightboxOverlay`, app.js:971-1018) for full-screen media view.

---

### 5. Filter Section Structure

**Container hierarchy (index.html:34-152):**

```
<section class="species-tabs-section">        ← SPECIES SUBTABS
  <div class="container">
    <div class="species-tabs-wrapper">
      <span class="filter-hint">              ← "Check all that apply below:"
      <div class="species-tabs">              ← Dog / Cat / Smalls buttons
```

```
<section class="filters-section">             ← FILTER CHECKBOXES
  <div class="container">
    <div class="filters-card">
      <div class="filters">
        <input type="hidden" id="speciesFilter">
        
        <!-- ROW 1 (filter-group × 5): Age, Sex, Color, Energy, Special Needs -->
        <!-- ROW 2 (filter-group × 3): Good with Kids, Good with Dogs, Good with Cats -->
      </div>
      
      <!-- results-adoption-row -->
      <div class="results-adoption-row">
        <div class="results-count">           ← "Showing XX adoptable dogs"
        <div class="adoption-links">          ← Apply to Adopt + 2 PDFs
      </div>
    </div>
  </div>
</section>
```

**The TWO CHECKBOX ROWS** are inside `<div class="filters">`:
- **Row 1:** Age (3 opts), Sex (2 opts), Color (text input), Energy (4 opts), Special Needs (2 opts) — 5 filter-groups
- **Row 2:** Good with Kids (4 opts), Good with Dogs (4 opts), Good with Cats (4 opts) — 3 filter-groups

These are laid out with CSS flexbox (styles.css:298 `.filters { display: flex; flex-wrap: wrap; gap: 12px 24px; }`).

**Elements to be aware of for reskin scope:**
- `<span class="filter-hint">` — "Check all that apply below:" (between tabs and filters)
- `<div class="results-adoption-row">` — contains the count + adopt/PDF links. This is INSIDE `filters-card`, after the checkbox rows.
- The adoption-links div contains: 1 primary link ("Apply to Adopt"), 2 secondary links (English PDF, Español PDF).

---

### 6. Attribute Fields Read from Animal Object

| Field | Where Read | Used For |
|-------|-----------|---------|
| `animal.id` | app.js:888 | Card onclick → `showAnimalDetail(id)` |
| `animal.animalId` | app.js:192 | Data fetching / matching |
| `animal.name` | app.js:890, 894 | Card name, modal name, alt text |
| `animal.photoUrl` | app.js:886 | Card photo src |
| `animal.video_url` | app.js:938 | Modal lead media (video or photo) |
| `animal.species` | app.js:885, 755 | Placeholder selection, species filter |
| `animal.sex` | app.js:911 | Card "Sex" row (abbreviated M/F) |
| `animal.age` | app.js:914 | Card "Age" row (truncated to years) |
| `animal.ageInYears` | app.js:770 | Age filter matching |
| `animal.color` | app.js:917 | Card "Color" row, color search filter |
| `animal.matchScore` | app.js:959 | Modal match score display |
| `animal.description` | app.js:966 | Modal bio fallback |
| `animal.bio_en_long` | app.js:965 | Modal bio (English) |
| `animal.bio_es_long` | app.js:965 | Modal bio (Spanish) |
| `animal.adoptionPending` | app.js:893,897 | Card badge: "Adoption Pending" |
| `animal.bondedPair` | app.js:893,896 | Card badge: "Bonded Pair" |
| `animal.behaviorNotes` (as `bn`) | app.js:887 | Container for compat + energy fields |
| `bn?.goodWithKids_match` | app.js:888 | Card compat symbol |
| `bn?.goodWithDogs_match` | app.js:889 | Card compat symbol |
| `bn?.goodWithCats_match` | app.js:890 | Card compat symbol |
| `bn?.energyLevel_match` | app.js:924 | Card energy level (abbreviated) |

**Special needs** is derived via `formatSpecialNeedsValue(animal)` at app.js:891 — reads `animal.behaviorNotes` internally.

**Red flags (two):** `adoptionPending` and `bondedPair` — rendered as `.status-badge` elements in the card name row. Both are boolean fields.

**Not on card but in data:** `matchScore` (modal only), `bio_en_long`/`bio_es_long`/`description` (modal only), `video_url` (modal only).
