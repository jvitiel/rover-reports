# Bio Generator Redesign — Scoping Diagnosis

**Date:** 2026-06-15
**Scope:** Read-only diagnosis. No writes, no edits, no GPT calls.

---

## PART 1 — GENERATE FLOW (the four windows)

### a. Endpoint and function

**Route:** `POST /api/bio/generate/:animalId` — `server.ts:2084`

ONE call produces all four windows. The endpoint calls `generateAnimalBio()` (attributeParser.ts:262) which makes a single GPT-4o call returning `{ bioEnLong, bioEsLong, bioEnShort, bioEsShort }`. [VERIFIED]

```typescript
// server.ts:2131-2136
const { bioEnLong, bioEsLong, bioEnShort, bioEsShort } = await generateAnimalBio({
  name: animal.name, species: animal.species, breed: animal.breed,
  age: animal.age, sex: animal.sex, color: animal.color,
  transcripts, mergedAttributes: mergedAttributesJson,
});
```

All four windows are saved together via `saveAnimalBio()` with **status: 'draft'** for both long and short. [VERIFIED — server.ts:2143-2155]

```typescript
const bio = saveAnimalBio({
  ...
  statusLong: 'draft', approvedAtLong: null,
  statusShort: 'draft', approvedAtShort: null,
}, { source: generationSource, generatedBy: 'gpt-4o' });
```

### b. Seed today — what blocks generation

The generate endpoint (server.ts:2096-2130) has a two-tier seed:

1. **Profile path (preferred):** `getBehaviorNotes(animal.shelterCode)` returns merged caregiver profile → `generationSource = 'full_generate'`
2. **SM comment fallback:** `hasStaffSMComment(animal)` → uses `animal.description` as transcript → `generationSource = 'sm_generate'`
3. **Neither → error:** `res.status(400).json({ success: false, error: 'No caregiver data available for this animal' })` — server.ts:2130

```typescript
// server.ts:2096-2130 — the seed check
const merged = getBehaviorNotes(animal.shelterCode);
if (merged) {
  // Profile path...
  generationSource = 'full_generate';
} else if (hasStaffSMComment(animal)) {
  // SM fallback...
  generationSource = 'sm_generate';
} else {
  res.status(400).json({ success: false, error: 'No caregiver data available for this animal' });
  return;
}
```

So the **Generate** button CAN work from either seed. [VERIFIED]

---

## PART 2 — REGENERATE ERROR ("No caregiver data available")

### c. Client button

**Regenerate buttons** (dashboard/index.html:7581, 7606):
```html
<button class="bio-btn secondary" onclick="regenerateBio('${animalId}', 'long')" ...>🔄 Regenerate</button>
<button class="bio-btn secondary" onclick="regenerateBio('${animalId}', 'short')" ...>🔄 Regenerate</button>
```

**Client function** (dashboard/index.html:7661):
```javascript
async function regenerateBio(animalId, size) {
  const cached = bioCache.get(animalId);
  if (!cached || !cached.id) throw new Error('Bio not found in cache');
  const response = await fetch(`${API_BASE}/bio/${cached.id}/regenerate/${size}`, { method: 'POST' });
  // ...
}
```

**Server endpoint:** `POST /api/bio/:bioId/regenerate/:size` — server.ts:2164

### The blocking guard — server.ts:2191-2194:

```typescript
const merged = getBehaviorNotes(animal.shelterCode);
if (!merged) {
  res.status(400).json({ success: false, error: 'No caregiver data available' });
  return;
}
```

**Confirmed: Regenerate ONLY works from caregiver profile data.** There is NO SM comment fallback in the regenerate path — unlike the generate endpoint which has `else if (hasStaffSMComment(animal))`. The regenerate endpoint checks `getBehaviorNotes()` only, and if null, returns the error immediately. [VERIFIED]

The regenerate endpoint then calls `regenerateSingleBio()` (attributeParser.ts:346) which takes the same `BioGenerationInput` shape (transcripts + mergedAttributes) but regenerates only one size (long OR short, EN+ES pair). [VERIFIED]

---

## PART 3 — HOW SM BIOS GOT INTO THE WINDOW (Blizzard's state)

### d. Blizzard's current animal_bios row

```
shelter_code: S20251236
bio_en_long:  "Not meant to be a household pet, but would be a great barn cat."
bio_en_short: ""  (empty)
bio_es_long:  ""  (empty)
bio_es_short: ""  (empty)
status_long:  approved
status_short: draft
last_source:  manual_edit_long
generated_at: 2026-06-12T13:54:20.948Z
```
[VERIFIED — direct DB query]

### History trail:

| # | source | generated_by | timestamp |
|---|--------|-------------|-----------|
| 1 | sm_copy | sm_copy | 2026-06-12 13:54:20 |
| 2 | sm_copy | sm_copy | 2026-06-14 12:57:17 |
| 3 | manual_edit_long | human | 2026-06-14 12:57:28 |
| 4 | manual_edit_long | human | 2026-06-14 12:57:32 |
| 5 | manual_edit_long | human | 2026-06-15 13:19:17 |
| 6 | approve_long | system | 2026-06-15 13:19:22 |
[VERIFIED — direct DB query]

### Writing path traced:

The initial write was **`POST /api/bio/from-sm/:animalId`** (server.ts:2033) — the "Copy SM Bio" button. This path:

```typescript
// server.ts:2063-2074 — the sm_copy save (new bio case)
existingBio = saveAnimalBio({
  animalId,
  shelterCode: animal.shelterCode,
  bioEnLong: smBio,       // ← SM comment goes HERE only
  bioEsLong: '',          // ← EMPTY
  statusLong: 'draft',
  approvedAtLong: null,
  bioEnShort: '',         // ← EMPTY
  bioEsShort: '',         // ← EMPTY
  statusShort: 'draft',
  approvedAtShort: null,
}, { source: 'sm_copy', generatedBy: 'sm_copy' });
```

**This is NOT the Track C `has_sm_comment` branch** (which calls `generateAnimalBio` to produce all 4 windows). This is the simple `from-sm` copy path that just puts the raw SM comment into `bioEnLong` and leaves the other three empty. Staff then manually edited the long-EN text and approved it, leaving short-EN + both ES windows empty. [VERIFIED]

**KEY answer:** The `from-sm` path is designed to fill ONLY `bioEnLong`. It does not generate anything — it's a raw copy. This is fundamentally different from the `generate` path which calls GPT and fills all four windows. The three empty windows are by design of the `from-sm` path, not a bug. [VERIFIED]

---

## PART 4 — SEED SOURCES (profile vs SM comment)

### e. One generation core or two?

There is **one generation core** — `generateAnimalBio()` in attributeParser.ts:262. It takes a `BioGenerationInput` with `transcripts` (string) and `mergedAttributes` (JSON string). The shape doesn't care whether the transcript came from a caregiver profile or an SM comment.

The **generate** endpoint (server.ts:2084) already feeds either seed into this one core:
- Profile → `transcripts = merged.rawTranscript`, `mergedAttributes = JSON.stringify(mergedAttrs)`
- SM comment → `transcripts = animal.description`, `mergedAttributes = '{}'`

The **regenerate** endpoint (server.ts:2164) only accepts profile data. It calls `regenerateSingleBio()` (same input shape) but hardcodes only the profile path.

**Cleanest single seam:** The seed-selection block at server.ts:2096-2130 (in the generate endpoint) is already the correct pattern. The regenerate endpoint at server.ts:2187-2194 needs the same two-tier fallback added. Both feed into the same `BioGenerationInput` → same GPT prompt. [VERIFIED]

---

## PART 5 — THE TWO PROFILE ENTRY POINTS

### f. Both save paths traced

**Staff-pwa profiler** (staff-pwa/app.js:2479):
```javascript
const response = await fetch(`${API_BASE}/caregiver/save`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ behaviorNotes: pendingBehaviorData.behaviorNotes }),
});
```

**Profile-form** (profile-form.html:659):
```javascript
var saveResp = await fetch('/api/caregiver/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ behaviorNotes: behaviorNotes })
});
```

**Both call the SAME backend endpoint:** `POST /api/caregiver/save` (server.ts:5034)

That endpoint calls a single function: `saveBehaviorNotes(behaviorNotes)` (server.ts:5054) [VERIFIED]

**They converge on ONE backend endpoint and ONE save function.** A single hook point at the end of `POST /api/caregiver/save` (after `saveBehaviorNotes` succeeds) would catch profiles from both front-ends. No drift risk. [VERIFIED]

---

## PART 6 — UI: BUTTON + PANEL

### g. "Generate Bios" button

**Markup** (dashboard/index.html:7507-7509):
```html
<div id="bio-placeholder-${animalId}">
  <button class="bio-generate-btn" onclick="generateBio('${animalId}')" id="bio-generate-btn-${animalId}">
    ✨ Generate Bios
  </button>
</div>
```

**onclick → `generateBio(animalId)`** (dashboard/index.html:7641):
```javascript
async function generateBio(animalId) {
  const btn = document.getElementById(`bio-generate-btn-${animalId}`);
  btn.disabled = true;
  btn.innerHTML = '<span class="inline-spinner"></span> Generating...';
  const shelterCode = getShelterCodeForBio(animalId);
  const response = await fetch(`${API_BASE}/bio/generate/${shelterCode}`, { method: 'POST' });
  // ...
}
```

Calls `POST /api/bio/generate/:animalId` which is the 4-window generator. [VERIFIED]

### h. Panel collapse/expand logic

The bio-generator panel is a **separate collapsible section** nested inside `animal-details`:

```html
<!-- dashboard/index.html:7500-7513 -->
<div class="record-section bio-section-wrapper" id="bio-section-${animalId}">
  <div class="record-header bio-record-header" onclick="toggleBioSection('${animalId}')">
    <span class="record-title">✍️ Adoption Bio Generator</span>
    <span class="bio-expand-icon" id="bio-expand-${animalId}">+</span>
  </div>
  <div class="bio-section-content" id="bio-section-content-${animalId}" style="display: none;">
    ...
  </div>
</div>
```

**toggleBioSection** (dashboard/index.html:7519-7527):
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

**Why it stays collapsed when details expand:** The animal card toggle (`toggleCard` at dashboard/index.html:7792) only toggles the `.expanded` class on the card, which shows the `.animal-details` container via CSS:

```css
/* dashboard/index.html:907-908 */
.animal-details { display: none; }
.animal-card.expanded .animal-details { display: block; }
```

The bio-section-content inside that container has its own independent `style="display: none"` that is only toggled by `toggleBioSection()`. **`toggleCard` does not call `toggleBioSection`.** The details panel expanding reveals the bio section's header bar (with the + icon), but the bio content itself stays hidden until the user clicks that header separately. [VERIFIED]

To make them expand together: either have `toggleCard` also call `toggleBioSection` when expanding (not collapsing), or remove the separate collapse and make `bio-section-content` default to `display: block` so it's visible whenever the card is expanded.

---

## SUMMARY — Key findings for redesign

1. **Generate (4-window)** already accepts either seed — works today. Single GPT call, all draft.
2. **Regenerate is broken for SM-only animals** — hardcoded profile-only check, no SM fallback. Fix: add the same two-tier seed logic from generate.
3. **`from-sm` (Copy SM Bio) is a raw copy**, not a generator — fills only bioEnLong, leaves 3 windows empty. This is Blizzard's path.
4. **One generation core** (`generateAnimalBio`) accepts any transcript string. The seam is the seed-selection block, not the GPT function.
5. **Both profile front-ends converge** on `POST /api/caregiver/save` → `saveBehaviorNotes()`. Single hook point for auto-trigger.
6. **Bio panel has independent collapse** from the details panel. Two separate toggle functions, no coupling.
