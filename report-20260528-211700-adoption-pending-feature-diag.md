# Adoption Pending Feature — Pre-Implementation Diagnostic

**Date:** 2026-05-28 17:17 ET  
**Type:** Read-only code inspection  
**Purpose:** Map existing code surfaces, state model, and placement context before scoping the Adoption Pending feature.

---

## 1. Where Does "Adoptable" Status Come From?

### Schema: animal_metadata

```sql
CREATE TABLE animal_metadata (
  shelter_code TEXT PRIMARY KEY,
  animal_id TEXT,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  breed TEXT,
  age TEXT,
  date_of_birth TEXT,
  sex TEXT,
  fiv_status TEXT,
  felv_status TEXT,
  updated_at TEXT NOT NULL
);
```

**No adoptable column.** The `animal_metadata` table is a local cache of SM fields (name, species, breed, age, sex, fiv/felv). It does NOT store adoptable status. [VERIFIED — schema inspection]

### Adoptable status: SM API, in-memory only

`shelterManagerService.ts:49`:
```typescript
const isAvailable = raw.ADOPTABLE === 1;
```

SM's `ADOPTABLE` field (integer: 1 = adoptable, 0 = not) is read during API sync and stored in the in-memory animal cache as `animal.isAvailable` (boolean). It is **never persisted to SQLite**.

The `/api/dashboard/behavior-notes` endpoint (server.ts:1084) passes `isAvailable` through to the dashboard. The `/api/animals` endpoint (server.ts:899) only returns `isAvailable` animals by default (`fetchAnimals()` defaults to `includeUnavailable: false`), though the dashboard endpoint uses `includeUnavailable: true`.

### RG animals

RG (rehoming) animals are a completely separate system (`rg_requests`, `rg_requesters`, `rg_messages` tables). They do NOT appear in `animal_metadata`, the SM cache, or any of the three display surfaces relevant to this feature. RG animals are out of scope. [VERIFIED — schema and code inspection]

---

## 2. Media Tab Animal Strip Layout

**File:** `dashboard/index.html`, function `renderAnimalCard()` (~line 6735)

### Current structure (per animal):
```html
<div class="animal-card" id="card-{animalId}" data-available="{isAvailable}" ...>
  <div class="animal-header" onclick="toggleCard('{animalId}')">
    <div class="animal-info">
      <div class="animal-avatar">{emoji}</div>
      <div style="flex: 1;">
        <div class="animal-name">{name} ({shelterCode}) {unavailableBadge}</div>
        <div class="animal-meta">{species} {location}</div>
        <div class="animal-meta">{caregiverTag} · {bioStatusBadge}</div>
        <div class="animal-meta">{lastUpdate} · {recordsCount}</div>
      </div>
      <!-- Photo strip (6 slots) -->
      <div class="photo-strip" id="photos-{animalId}">...</div>
      <!-- Action buttons -->
      <button class="btn-strip-action btn-library" id="lib-btn-{animalId}">📁 Library (N)</button>
      <label class="btn-strip-action btn-upload-library" for="upload-{shelterCode}">📤 Upload</label>
      <input type="file" id="upload-{shelterCode}" style="display:none" ...>
    </div>
    <span class="expand-icon">+</span>
  </div>
  <div class="animal-details">...</div>
</div>
```

### Button CSS (dashboard/index.html:290):
```css
.btn-strip-action {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 4px; padding: 6px 12px; background: #C4753B; color: white;
  border: none; border-radius: 6px; font-size: 0.75rem; font-weight: 600;
  cursor: pointer; height: 36px; white-space: nowrap;
  transition: background 0.15s ease, transform 0.1s ease; margin-left: 8px;
}
.btn-strip-action:disabled {
  background: #CCCCCC; color: #666666; cursor: not-allowed; transform: none;
}
```

**Placement note:** The Library and Upload buttons currently sit INSIDE `.animal-info` (the same div as the name/meta/photo-strip), inline after the photo strip. They're siblings to the photo strip, not in a separate button container. The new adoption-pending button needs to be added in this same container area, below Library/Upload per the design spec.

### Unavailable badge (existing):
```javascript
const unavailableBadge = isAvailable ? '' : '<span class="unavailable-badge">NOT ADOPTABLE</span>';
```
Already rendered inline with the animal name. [VERIFIED — line ~6743]

---

## 3. Matcher Browse Cards (Ava-style — Small Info Cards)

**File:** `matcher-web/app.js:845–880`

```javascript
return `
  <article class="animal-card" onclick="showAnimalDetail('${animal.id}')">
    <div class="animal-card-photo">
      <img src="${photoSrc}" alt="${animal.name}" onerror="this.src='${placeholder}'">
    </div>
    <div class="animal-card-info">
      <h3>${animal.name}</h3>                    ← Name header: Adoption Pending goes here
      <div class="card-details">
        <div class="detail-row detail-row--split">
          <span class="detail-item"><span class="label">Sex:</span> ${abbreviateGender(animal.sex)}</span>
          <span class="detail-item"><span class="label">Age:</span> ${truncateAgeToYears(animal.age)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-item"><span class="label">Color:</span> ${animal.color || 'Unknown'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-item"><span class="label">Good with:</span> Kids ${kids}, Dogs ${dogs}, Cats ${cats}</span>
        </div>
        <div class="detail-row detail-row--split">
          <span class="detail-item"><span class="label">Energy:</span> ${energy}</span>
          <span class="detail-item"><span class="label">Special needs:</span> ${specialNeeds}</span>
        </div>
      </div>
    </div>
  </article>
`;
```

**Data source:** `GET /api/animals` (server.ts:899) — returns only adoptable animals by default (`fetchAnimals()` without `includeUnavailable`). The response currently does NOT include an `adoption_pending` field. This endpoint would need to pass the new flag through.

---

## 4. Custom Search Suggestion Cards (Dean-style — Bio + Meet Link)

**File:** `custom-search/app.js:365–405`, function `renderResults(matches, preambleText)`

```javascript
matches.forEach(match => {
  const row = document.createElement('div');
  row.className = 'result-row';

  const textCol = document.createElement('div');
  textCol.className = 'result-text';

  const name = document.createElement('h3');
  name.className = 'result-name';
  name.textContent = match.name;            ← Name header: Adoption Pending goes here
  textCol.appendChild(name);

  const bio = document.createElement('p');
  bio.className = 'result-bio';
  bio.textContent = match.bio;
  textCol.appendChild(bio);

  const meetLink = document.createElement('a');
  meetLink.className = 'meet-link';
  meetLink.href = '#';
  meetLink.textContent = template('results.meet_link', { name: match.name });
  // ...
});
```

**Data source:** `POST /api/matcher/custom-search` (server.ts:4081). Response per match (server.ts:4575–4589):
```javascript
{ shelter_code, bio, name, sex, age, breed,
  bio_en_short, bio_en_long, bio_es_short, bio_es_long,
  photo_url, video_url }
```

Does NOT include `adoption_pending`. Would need the flag added to the response shape.

---

## 5. Existing State-Changing Button Patterns on Media Tab

**No existing state-changing button on the Media tab strip.** Library is a UI toggle (expand/collapse local section). Upload is a file input. Neither makes an API call that changes server state.

The closest patterns in the dashboard are:
- **Featured slot management:** `PUT /api/featured-slots/{index}` and `DELETE /api/featured-slots/{index}` — fire-and-forget with error alert
- **Bio approval:** `POST /api/bio/{bioId}/approve/{size}` — await response, update UI on success
- **Photo hide:** `POST /api/dashboard/media/{mediaId}/hide` — await response, refresh photo strip

**Common pattern:** `await fetch(url, { method }); const result = await res.json(); if (result.success) updateUI(); else showError();`

No optimistic UI — all wait for server response before updating.

---

## 6. RG Animals on Media Tab

RG animals do **not** appear on the Media tab. The data source is `/api/dashboard/behavior-notes` (server.ts:1084), which fetches exclusively from `fetchAnimals({ includeUnavailable: true })` — the ShelterManager cache. RG animals have their own separate UI (RG Cares Portal). [VERIFIED]

---

## 7. Preliminary Reads

### 7a. Table + column for adoption_pending state

**Recommended: new column on `animal_metadata`.**

```sql
ALTER TABLE animal_metadata ADD COLUMN adoption_pending INTEGER DEFAULT 0;
```

Rationale:
- `animal_metadata` already has one row per SM animal (keyed by `shelter_code`)
- The row is upserted on every `/api/dashboard/behavior-notes` fetch (server.ts:~1237), so new animals get a row automatically
- A column here survives server restarts (unlike the in-memory SM cache)
- No new table needed — it's simple per-animal state

**Note:** `isAvailable` (the SM-sourced adoptable flag) is NOT in this table — it's in-memory only. `adoption_pending` would be the first locally-managed per-animal state column in `animal_metadata`. This is appropriate since adoption_pending is a local override, not SM-sourced.

### 7b. API endpoint shape

**Recommended: `PUT /api/animals/:shelterCode/adoption-pending`**

Body: `{ "pending": true | false }`  
Response: `{ "success": true }` or `{ "success": false, "error": "..." }`

Rationale:
- Uses `shelterCode` (canonical key per iron-law 1)
- RESTful sub-resource pattern consistent with existing `/api/bio/:id/approve/:size`
- PUT is idempotent (matches toggle semantics)

### 7c. Three display surfaces — file inventory

| Surface | File | Shared? |
|---------|------|---------|
| Media tab strip button | `dashboard/index.html` (single file, JS + HTML + CSS) | No |
| Matcher browse card (Ava-style) | `matcher-web/app.js` | No |
| Custom search card (Dean-style) | `custom-search/app.js` | No |

**Three separate files.** No shared component. Each builds its card HTML independently.

Both matcher surfaces also need the flag added to their API response:
- `GET /api/animals` (for matcher-web)
- `POST /api/matcher/custom-search` (for custom-search)

Plus the dashboard endpoint:
- `GET /api/dashboard/behavior-notes`

### 7d. Grey "Not Adoptable" disabled state — UX alignment

The existing disabled pattern on `.btn-strip-action:disabled`:
```css
background: #CCCCCC; color: #666666; cursor: not-allowed; transform: none;
```

This is a standard HTML `disabled` attribute pattern — the button is truly disabled (`pointer-events` still active but click handlers don't fire). No tooltip. This aligns well with the grey "Not Adoptable" non-clickable state.

**One consideration:** The existing "NOT ADOPTABLE" badge is already rendered as a `<span class="unavailable-badge">` next to the animal name. The new tri-state button will sit in the button row below. When `isAvailable === false`, the button should render as disabled/grey "Not Adoptable" AND the existing unavailable badge will still show in the name row. This is redundant but harmless — the button communicates the reason it's non-clickable, and the badge is the existing pattern. Dashboard 11 may want to consider whether to remove the name-row badge once the button exists, but that's a design decision, not a code concern.
