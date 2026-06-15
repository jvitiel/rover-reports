# Dashboard: "Use as Starting Point", from-sm endpoint, toggleCard, bio panel — code map

**Date:** 2026-06-15 22:08 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Q1: "Use as Starting Point" button

**File:** `dashboard/index.html`

### Markup (line 7441–7444)

```javascript
<button class="bio-btn primary sm-use-bio-btn" onclick="useSmBioAsStartingPoint('${animalId}', event)">
  📋 Use as Starting Point
</button>
```

Rendered conditionally inside `${hasSmBio ? \`...\` : ''}` within the SM data section template. [VERIFIED]

### Handler: `useSmBioAsStartingPoint()` (dashboard/index.html:7465–7498)

```javascript
async function useSmBioAsStartingPoint(animalId, event) {
  event.stopPropagation();
  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="inline-spinner"></span> Copying...';
  
  try {
    const shelterCode = getShelterCodeForBio(animalId);
    const response = await fetch(`${API_BASE}/bio/from-sm/${shelterCode}`, { method: 'POST' });
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to copy SM bio');
    }
    
    // Update bio cache and re-render bio section
    bioCache.set(animalId, { data: result.data, draft: null });
    renderBioContent(animalId, bioCache.get(animalId));
    
    // Expand the card if not already expanded
    const card = document.getElementById(`card-${animalId}`);
    if (!card.classList.contains('expanded')) {
      toggleCard(animalId);
    }
    
    btn.innerHTML = '✓ Copied!';
    setTimeout(() => { btn.disabled = false; btn.innerHTML = originalText; }, 1500);
  } catch (error) {
    alert('Error: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}
```

**This handler is the ONLY thing that issues `POST /api/bio/from-sm/`.** [VERIFIED — grep confirmed, see Q2]

---

## Q2: All consumers of from-sm endpoint

```
$ grep -rn 'from-sm' dashboard/ staff-pwa/ staging-staff/ server/src/ matcher-web/ volunteer-app/ custom-search/

dashboard/index.html:7474:  const response = await fetch(`${API_BASE}/bio/from-sm/${shelterCode}`, { method: 'POST' });
server/src/server.ts:2038:    app.post('/api/bio/from-sm/:animalId', async (req: Request, res: Response) => {
```

**Only two references in the entire codebase:** the one dashboard client call and the server route definition. No staff-pwa, staging-staff, matcher-web, volunteer-app, custom-search, or service-worker references. [VERIFIED]

---

## Q3: Server route — POST /api/bio/from-sm/:animalId

**File:** `server/src/server.ts` lines 2038–2088

```typescript
app.post('/api/bio/from-sm/:animalId', async (req: Request, res: Response) => {
  try {
    const animalId = req.params.animalId as string;
    
    // Get animal from ShelterManager
    const animal = await getAnimalById(animalId);
    if (!animal) {
      res.status(404).json({ success: false, error: 'Animal not found' } as ApiResponse<null>);
      return;
    }
    
    const smBio = animal.description?.trim() || '';
    if (!hasStaffSMComment(animal)) {
      res.status(400).json({ success: false, error: 'No ShelterManager bio available for this animal' } as ApiResponse<null>);
      return;
    }
    
    // Check if bio already exists
    let existingBio = getAnimalBio(animal.shelterCode);
    
    if (existingBio) {
      // Update existing bio - copy SM bio to long English, reset to draft
      updateAnimalBioLong(existingBio.id, smBio, existingBio.bioEsLong, { source: 'sm_copy', generatedBy: 'sm_copy' });
      existingBio = getAnimalBio(animal.shelterCode);
    } else {
      // Create new bio with SM content in long English field
      existingBio = saveAnimalBio({
        animalId,
        shelterCode: animal.shelterCode,
        bioEnLong: smBio,
        bioEsLong: '',
        statusLong: 'draft',
        approvedAtLong: null,
        bioEnShort: '',
        bioEsShort: '',
        statusShort: 'draft',
        approvedAtShort: null,
      }, { source: 'sm_copy', generatedBy: 'sm_copy' });
    }
    
    console.log(`[API] Copied SM bio to draft for animal ${animalId}`);
    res.json({ success: true, data: existingBio });
  } catch (error) {
    console.error('[API] Copy SM bio error:', error);
    res.status(500).json({ success: false, error: 'Failed to copy SM bio' } as ApiResponse<null>);
  }
});
```

**What it does:** copies `animal.description` (SM ANIMALCOMMENTS) into `bioEnLong` as a draft. If an `animal_bios` row exists, it updates via `updateAnimalBioLong`; if not, it creates a new row via `saveAnimalBio` with `source: 'sm_copy'`. It writes directly to `animal_bios` (NOT to `animal_bio_drafts`). [VERIFIED]

**Note:** This route still uses `getAnimalById(animalId)` without `includeUnavailable: true` — it would 404 for non-adoptable animals. [VERIFIED]

---

## Q4: toggleCard function

**File:** `dashboard/index.html` lines 7841–7861

```javascript
function toggleCard(animalId) {
  const card = document.getElementById(`card-${animalId}`);
  card.classList.toggle('expanded');
  const icon = card.querySelector('.expand-icon');
  icon.textContent = card.classList.contains('expanded') ? '−' : '+';
  
  // If collapsing, reset library button to its count label
  if (!card.classList.contains('expanded')) {
    const libBtn = document.getElementById(`lib-btn-${animalId}`);
    const countSpan = document.getElementById(`lib-count-${animalId}`);
    const libContent = document.getElementById(`library-content-${animalId}`);
    if (libBtn && countSpan) {
      const count = countSpan.textContent;
      libBtn.innerHTML = `📁 Library (<span id="lib-count-${animalId}">${count}</span>)`;
    }
    if (libContent) {
      libContent.style.display = 'none';
    }
  }
}
```

**Mechanism:** toggles `.expanded` class on `#card-${animalId}` (the `.animal-card` element). [VERIFIED]

**What `.expanded` controls** (CSS line 908):
```css
.animal-details { display: none; border-top: 1px solid var(--gray-200); }
.animal-card.expanded .animal-details { display: block; }
```

`toggleCard` shows/hides the single `.animal-details` div, which contains ALL of:
1. The bio section (`renderBioSection`)
2. The merged caregiver/SM view (`renderMergedView`)
3. All behavior records (`renderRecord`)
4. The SM data section (`renderSmDataSection`)

These are all children of `.animal-details`. `toggleCard` expands/collapses them as a group — it has no per-panel granularity. [VERIFIED]

On collapse, it also resets the library button label and hides library content. [VERIFIED]

---

## Q5: Bio-generator panel

### Container element

`<div class="record-section bio-section-wrapper" id="bio-section-${animalId}">` [VERIFIED]

### Markup (dashboard/index.html:7500–7519, `renderBioSection()`)

```javascript
function renderBioSection(animalId, isAvailable = true) {
  const disabledAttr = isAvailable ? '' : ' disabled';
  const disabledTitle = isAvailable ? '' : ' title="Animal is no longer available"';
  return `
    <div class="record-section bio-section-wrapper" id="bio-section-${animalId}">
      <div class="record-header bio-record-header" onclick="toggleBioSection('${animalId}')">
        <span class="record-title">✍️ Adoption Bio Generator${isAvailable ? '' : ' <span style="font-size: 0.8rem; color: var(--gray-500);">(Read Only)</span>'}</span>
        <span class="bio-expand-icon" id="bio-expand-${animalId}">+</span>
      </div>
      <div class="bio-section-content" id="bio-section-content-${animalId}" style="display: none;">
        <div id="bio-placeholder-${animalId}">
          <button class="bio-generate-btn" onclick="generateBio('${animalId}')" id="bio-generate-btn-${animalId}"${disabledAttr}${disabledTitle}>
            ✨ Generate Bios
          </button>
        </div>
        <div class="bio-content" id="bio-content-${animalId}"></div>
      </div>
    </div>
  `;
}
```

### Separate expand/collapse handler: `toggleBioSection()` (line 7522–7532)

```javascript
function toggleBioSection(animalId) {
  const content = document.getElementById(`bio-section-content-${animalId}`);
  const icon = document.getElementById(`bio-expand-${animalId}`);
  if (content.style.display === 'none') {
    content.style.display = 'block';
    icon.textContent = '−';
  } else {
    content.style.display = 'none';
    icon.textContent = '+';
  }
}
```

**Mechanism:** toggles `style.display` between `'none'` and `'block'` on `#bio-section-content-${animalId}`. This is completely independent of `toggleCard` — it uses inline `style.display`, not a CSS class. [VERIFIED]

### DOM position

The bio panel is the **first child** inside `.animal-details`:

```javascript
<div class="animal-details">
  ${renderBioSection(animal.animalId, isAvailable)}     ← bio panel (FIRST)
  ${renderMergedView(animal.merged, animal.hasCaregiverData)}  ← profile view
  ${animal.records[0]...}                                      ← records
  ${renderSmDataSection(animal)}                               ← SM data
</div>
```

It is a **sibling** of the other sections, all inside the same `.animal-details` container that `toggleCard` controls. When `toggleCard` collapses the card, `.animal-details` gets `display: none`, hiding the bio panel along with everything else. When expanded, the bio panel is visible but its **inner content** (`bio-section-content`) starts with `style="display: none"` — the user must separately click the bio panel header to expand it. [VERIFIED]

---

## Q6: Dashboard service worker

**No service worker caches the dashboard.** [VERIFIED]

- No `sw.js` or `service-worker.js` exists in `/home/shelter/shelter-apps/dashboard/` [VERIFIED via `ls`]
- No `serviceWorker.register()` call exists in `dashboard/index.html` [VERIFIED via `grep`]

Edits to `dashboard/index.html` are served immediately by Express `static` — no cache-version bump needed. Users may still see stale content from browser HTTP cache; a hard-refresh clears that, but no SW invalidation is required. [VERIFIED]
