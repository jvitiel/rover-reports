# from-sm endpoint retirement prerequisites — code map

**Date:** 2026-06-15 22:13 UTC  
**Scope:** Read-only diagnosis. No changes.

---

## Q1: renderSmDataSection() — FULL function

**File:** `dashboard/index.html` lines 7388–7462

```javascript
function renderSmDataSection(animal) {
  const sm = animal.smData;
  if (!sm) return '';
  
  const hasSmBio = sm.description && sm.description.trim().length > 0;
  const animalId = animal.animalId;
  
  // Format intake date
  const intakeDate = sm.dateIntake 
    ? new Date(sm.dateIntake).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  
  return `
    <div class="record-section sm-data-section" id="sm-section-${animalId}">
      <div class="record-header sm-record-header" onclick="toggleSmSection('${animalId}')">
        <span class="record-title">🏥 ShelterManager Data</span>
        <span class="sm-expand-icon" id="sm-expand-${animalId}">−</span>
      </div>
      <div class="sm-data-content" id="sm-content-${animalId}">
        <div class="fields-grid">
          <div class="field">
            <div class="field-label">Breed</div>
            <div class="field-value">${escapeHtml(sm.breed) || '—'}</div>
          </div>
          <div class="field">
            <div class="field-label">Age</div>
            <div class="field-value">${escapeHtml(sm.age) || '—'}</div>
          </div>
          <div class="field">
            <div class="field-label">Sex</div>
            <div class="field-value">${escapeHtml(sm.sex) || '—'}</div>
          </div>
          <div class="field">
            <div class="field-label">Color</div>
            <div class="field-value">${escapeHtml(sm.color) || '—'}</div>
          </div>
          <div class="field">
            <div class="field-label">Size</div>
            <div class="field-value">${escapeHtml(sm.size) || '—'}</div>
          </div>
          <div class="field">
            <div class="field-label">Location</div>
            <div class="field-value">${escapeHtml(sm.location) || '—'}</div>
          </div>
          <div class="field">
            <div class="field-label">Intake Date</div>
            <div class="field-value">${intakeDate}</div>
          </div>
        </div>
        ${hasSmBio ? `
          <div class="sm-bio-section">
            <div class="field-label">ShelterManager Bio (ANIMALCOMMENTS)</div>
            <div class="sm-bio-text">${escapeHtml(sm.description)}</div>
            <button class="bio-btn primary sm-use-bio-btn" onclick="useSmBioAsStartingPoint('${animalId}', event)">
              📋 Use as Starting Point
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}
```

The `${hasSmBio ? \`...\` : ''}` conditional (lines 7438–7446) renders a `<div class="sm-bio-section">` containing:
1. A label "ShelterManager Bio (ANIMALCOMMENTS)"
2. The description text in `<div class="sm-bio-text">`
3. The "📋 Use as Starting Point" button

Nothing else is inside the conditional — it's the entire sm-bio-section div. [VERIFIED]

---

## Q2: All callers of useSmBioAsStartingPoint

```
dashboard/index.html:7441:  <button ... onclick="useSmBioAsStartingPoint('${animalId}', event)">
dashboard/index.html:7465:  async function useSmBioAsStartingPoint(animalId, event) {
```

**Only the one button calls it.** No other references in the entire codebase. [VERIFIED — `grep -rn` across all apps]

---

## Q3: Server build + restart mechanism

### (a) Build

**Command:** `npm run build` (which runs `tsc`) from working directory `/home/shelter/shelter-apps/server/` [VERIFIED — `package.json` scripts: `"build": "tsc"`]

**Output:** `/home/shelter/shelter-apps/server/dist/server.js` (and companion `.js` files) [VERIFIED via `ls`]

### (b) Restart

**Service name:** `shelter-app` (systemd) [VERIFIED]

**Restart command:** `sudo systemctl restart shelter-app` [VERIFIED — used repeatedly this session]

### (c) OC/Rover permissions

Rover's sudoers entry permits this without password: [VERIFIED via `sudo -l`]

```
(root) NOPASSWD: /usr/bin/systemctl restart shelter-app
(root) NOPASSWD: /usr/bin/systemctl status shelter-app
(root) NOPASSWD: /usr/bin/systemctl status shelter-app --no-pager
(root) NOPASSWD: /usr/bin/systemctl reload caddy
```

**OC can execute the restart.** Confirmed by `sudo -l` output and by having executed `sudo systemctl restart shelter-app` multiple times this session without prompting. [VERIFIED]

---

## Q4: Would removing POST /api/bio/from-sm/:animalId orphan any helper?

| Function | Used by from-sm route (line) | Other callers in server.ts | Orphaned if route removed? |
|----------|------------------------------|---------------------------|---------------------------|
| `getAnimalBio` | 2056, 2061 | 929, 989, 2162, 2233, 2244, 2525, 2731, 4795, 11477, 11724, 11918 (11 other sites) | **No** [VERIFIED] |
| `updateAnimalBioLong` | 2060 | 2270 (manual edit endpoint) | **No** [VERIFIED] |
| `saveAnimalBio` | 2064 | 11543, 11634, 11828, 11965 (4 other sites: youth generic, age-crossing, adult-intake) | **No** [VERIFIED] |
| `hasStaffSMComment` | 2050 | 2119, 2155, 2208, 2592 (4 other sites: generate endpoint, regenerate, hasRealStaffContentForLabel) | **No** [VERIFIED] |

**Route removal is self-contained.** All four helpers have multiple other callers. Removing lines 2038–2088 (the route) and the `useSmBioAsStartingPoint` function + button from the dashboard leaves no orphaned server-side code. [VERIFIED]
