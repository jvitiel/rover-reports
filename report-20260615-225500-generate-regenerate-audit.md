# Generate + Regenerate endpoints — caller & write-path audit

**Date:** 2026-06-15 22:55 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Q1: "Generate Bios" button

**Markup** (dashboard/index.html:7472–7474):

```javascript
<button class="bio-generate-btn" onclick="generateBio('${animalId}')" id="bio-generate-btn-${animalId}"${disabledAttr}${disabledTitle}>
  ✨ Generate Bios
</button>
```

**Client handler** `generateBio()` (dashboard/index.html:7625–7643):

```javascript
async function generateBio(animalId) {
  const btn = document.getElementById(`bio-generate-btn-${animalId}`);
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="inline-spinner"></span> Generating...';
  
  try {
    const shelterCode = getShelterCodeForBio(animalId);
    const response = await fetch(`${API_BASE}/bio/generate/${shelterCode}`, { method: 'POST' });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to generate bio');
    bioCache.set(animalId, { data: result.data, draft: result.draft || null });
    renderBioContent(animalId, bioCache.get(animalId));
  } catch (error) {
    alert('Error generating bio: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}
```

Hits: `POST /api/bio/generate/${shelterCode}` [VERIFIED]

---

## Q2: Regenerate buttons + handler

**Markup** — two buttons, one per size:

Long (dashboard/index.html:7565):
```javascript
<button class="bio-btn secondary" onclick="regenerateBio('${animalId}', 'long')" id="bio-regen-long-${animalId}"${disabledAttr}>🔄 Regenerate</button>
```

Short (dashboard/index.html:7590):
```javascript
<button class="bio-btn secondary" onclick="regenerateBio('${animalId}', 'short')" id="bio-regen-short-${animalId}"${disabledAttr}>🔄 Regenerate</button>
```

**Client handler** `regenerateBio()` (dashboard/index.html:7645–7666):

```javascript
async function regenerateBio(animalId, size) {
  if (!confirm(`Regenerate ${size} bio? This will overwrite the current ${size} bio (EN + ES).`)) return;
  
  const btn = document.getElementById(`bio-regen-${size}-${animalId}`);
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="inline-spinner"></span>';
  
  try {
    const shelterCode = getShelterCodeForBio(animalId);
    const response = await fetch(`${API_BASE}/bio/${shelterCode}/regenerate/${size}`, { method: 'POST' });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to regenerate');
    bioCache.set(animalId, { data: result.data, draft: result.draft || null });
    renderBioContent(animalId, bioCache.get(animalId));
  } catch (error) {
    alert('Error regenerating bio: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}
```

Hits: `POST /api/bio/${shelterCode}/regenerate/${size}` [VERIFIED]

---

## Q3: All callers — complete grep

### Generate endpoint (`/bio/generate/`)

| File:line | Context |
|-----------|---------|
| dashboard/index.html:7472 | Button onclick `generateBio('${animalId}')` |
| dashboard/index.html:7625 | Function definition `async function generateBio(animalId)` |
| dashboard/index.html:7633 | `fetch(\`${API_BASE}/bio/generate/${shelterCode}\`)` |
| server/src/server.ts:2093 | Route: `app.post('/api/bio/generate/:animalId', ...)` |

No callers in staff-pwa, staging-staff, matcher-web, volunteer-app, custom-search, or any service worker. [VERIFIED]

### `generateBioDraftForAnimal` (the shared server function the endpoint delegates to)

| File:line | Context |
|-----------|---------|
| server/src/server.ts:2044 | Function definition |
| server/src/server.ts:2111 | Called by generate endpoint |
| server/src/server.ts:5049 | Called by profile-save trigger (background) |
| server/src/server.ts:11932 | Called by `upgradeAdultIntake` for has_profile bucket |

**Three callers:** generate endpoint, profile-save trigger, adult-intake pass. [VERIFIED]

### Regenerate endpoint (`/regenerate/`)

| File:line | Context |
|-----------|---------|
| dashboard/index.html:7565 | Long regenerate button |
| dashboard/index.html:7590 | Short regenerate button |
| dashboard/index.html:7645 | Function definition `async function regenerateBio(animalId, size)` |
| dashboard/index.html:7656 | `fetch(\`${API_BASE}/bio/${shelterCode}/regenerate/${size}\`)` |
| server/src/server.ts:2121 | Route: `app.post('/api/bio/:shelterCode/regenerate/:size', ...)` |

No callers in staff-pwa, staging-staff, matcher-web, volunteer-app, custom-search, or any service worker. [VERIFIED]

---

## Q4: Server generate endpoint — write path

**Route:** `POST /api/bio/generate/:animalId` (server/src/server.ts:2093–2119)

```typescript
app.post('/api/bio/generate/:animalId', async (req: Request, res: Response) => {
  try {
    const animalId = req.params.animalId as string;
    const animal = await getAnimalById(animalId, true); // includeUnavailable: manual generate works on non-adoptable
    if (!animal) { res.status(404).json(...); return; }
    const merged = getBehaviorNotes(animal.shelterCode);
    if (!merged && !hasStaffSMComment(animal)) { res.status(400).json(...); return; }
    
    const draft = await generateBioDraftForAnimal(animal.shelterCode);
    
    res.json({ success: true, data: getAnimalBio(animal.shelterCode), draft: draft || getAnimalBioDraft(animal.shelterCode) });
  } catch (error) { ... }
});
```

**Delegates to `generateBioDraftForAnimal()`** (server/src/server.ts:2044–2090), which calls:

```typescript
return saveAnimalBioDraft(animal.shelterCode, { bioEnLong, bioEsLong, bioEnShort, bioEsShort }, { source: generationSource });
```

- **Writes to:** `animal_bio_drafts` (the dual-state draft table) via `saveAnimalBioDraft` [VERIFIED]
- **Source values:** `'full_generate'` (has profile) or `'sm_generate'` (SM comment only) [VERIFIED]
- **Does NOT write to `animal_bios`** — the draft must be explicitly promoted/approved [VERIFIED]

---

## Q5: Server regenerate endpoint — write path

**Route:** `POST /api/bio/:shelterCode/regenerate/:size` (server/src/server.ts:2121–2190)

The write call (line 2181):

```typescript
saveAnimalBioDraftSize(shelterCode, size as 'long' | 'short', bioEn, bioEs,
  size === 'long' ? 'regenerate_long' : 'regenerate_short');
```

- **Writes to:** `animal_bio_drafts` (the dual-state draft table) via `saveAnimalBioDraftSize` [VERIFIED]
- **Source values:** `'regenerate_long'` or `'regenerate_short'` [VERIFIED]
- **Does NOT write to `animal_bios`** — comment in code: "Write per-size draft to animal_bio_drafts (animal_bios left untouched)" [VERIFIED]

---

## Q6: Automatic generation write paths — comparison

| Path | Helper | Writes to | Status/Source |
|------|--------|-----------|---------------|
| Profile-save trigger (server.ts:5049) | `generateBioDraftForAnimal()` → `saveAnimalBioDraft()` | `animal_bio_drafts` | source: `full_generate` or `sm_generate` |
| Youth generic (Pass 1) | `saveAnimalBio()` | `animal_bios` | statusLong/Short: `approved`, source: `generic` |
| Age-crossing no_content (Pass 2) | `saveAnimalBio()` | `animal_bios` | statusLong/Short: `approved`, source: `generic_adult` |
| Age-crossing has_sm_comment (Pass 2) | `saveAnimalBioDraft()` | `animal_bio_drafts` | source: `sm_generate` |
| Adult-intake generic (Pass 3) | `saveAnimalBio()` | `animal_bios` | statusLong/Short: `approved`, source: `generic_adult` |
| Adult-intake has_profile (Pass 3) | `generateBioDraftForAnimal()` → `saveAnimalBioDraft()` | `animal_bio_drafts` | source: `full_generate` |

**Both manual endpoints (generate + regenerate) write through the same dual-state draft path as the automatic profile-save trigger.** The auto generic/age-crossing passes write directly to `animal_bios` with approved status, but those are system-generated deterministic bios, not AI content. [VERIFIED]

---

## Q7: Adoptability gating

| Endpoint | `getAnimalById` call | Ungated? |
|----------|---------------------|----------|
| Generate (`/api/bio/generate/:animalId`, line 2098) | `getAnimalById(animalId, true)` | **Yes — ungated** (includeUnavailable: true) [VERIFIED] |
| Regenerate (`/api/bio/:shelterCode/regenerate/:size`, line 2133) | `getAnimalById(shelterCode, true)` | **Yes — ungated** (includeUnavailable: true) [VERIFIED] |

Both were ungated in commit `e1621a4` earlier this session. [VERIFIED]

---

## Conclusions

### Generate endpoint (`POST /api/bio/generate/:animalId`)

- **(a) Only caller:** The dashboard "Generate Bios" button is the **only client caller** of this endpoint. However, the shared function `generateBioDraftForAnimal()` that it delegates to has two other callers: the profile-save trigger and the adult-intake pass. Removing the endpoint does NOT orphan the shared function. [VERIFIED]
- **(b) Write path:** Writes to `animal_bio_drafts` via `saveAnimalBioDraft` — the dual-state draft path. Does NOT write directly to `animal_bios`. [VERIFIED]
- **(c) Gating:** Ungated — `getAnimalById(animalId, true)`. [VERIFIED]

### Regenerate endpoint (`POST /api/bio/:shelterCode/regenerate/:size`)

- **(a) Only caller:** The two dashboard "🔄 Regenerate" buttons (long + short) are the **only callers**. No other app or script references this endpoint. [VERIFIED]
- **(b) Write path:** Writes to `animal_bio_drafts` via `saveAnimalBioDraftSize` — the dual-state draft path. Does NOT write directly to `animal_bios`. [VERIFIED]
- **(c) Gating:** Ungated — `getAnimalById(shelterCode, true)`. [VERIFIED]
