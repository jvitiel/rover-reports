# Staging Badge Bug Fixes — Implementation Report

**Date:** 2026-06-24  
**Commit:** `b8f16c0` — `staging-staff/app.js` + `staging-staff/styles.css` (23 insertions, 6 deletions)

---

## FIX 1 — Green Badge Hover Bleed

### Problem
`.card-btn:hover:not(:disabled)` (styles.css:996) sets `background: white`. On mobile, tap creates sticky hover on the `<span>` → green flips to white for ~15s until poll re-renders.

### Fix
Added `pointer-events: none` to `.behavior-btn.behavior-good` (staging-staff/styles.css:1036):

```css
.behavior-btn.behavior-good {
  background: var(--behavior-green);
  color: white;
  border-color: var(--behavior-green);
  cursor: default;
  pointer-events: none;   /* ← NEW: prevents hover/tap/click entirely */
}
```

`pointer-events: none` is stronger than a hover override — no CSS state (`:hover`, `:active`, `:focus`) can fire. The span becomes visually inert. No JavaScript events fire on it either, which is correct since green badges are non-clickable.

---

## FIX 2 — Red/Orange Don't Navigate

### Problem
`openBehaviorForSession(sessionId)` (app.js:2546) searched only `activeSessions.find(s => s.id === sessionId)`. Server sessions pass their server UUID, but local sessions store that in `.serverSessionId` (not `.id`). For other-user sessions, there's no local session at all.

### Before (app.js:2546–2553)
```js
function openBehaviorForSession(sessionId) {
  const session = activeSessions.find(s => s.id === sessionId);
  if (!session) return;
  
  activeModule = 'animal-profile-recorder';
  showSection('animalProfile');
  showBehaviorRecorder({ animalId: session.animalId, name: session.name, photoUrl: session.photoUrl });
}
```

### After (app.js:2546–2567)
```js
function openBehaviorForSession(sessionId) {
  // Try local sessions first (by local id OR serverSessionId)
  let session = activeSessions.find(s => s.id === sessionId || s.serverSessionId === sessionId);
  let animalId, name, photoUrl;

  if (session) {
    animalId = session.animalId;
    name = session.name;
    photoUrl = session.photoUrl;
  } else {
    // Fall back to server sessions (for other-user sessions not in local array)
    const serverSession = serverActiveSessions.find(s => s.id === sessionId);
    if (!serverSession) return;
    animalId = serverSession.shelter_code;
    name = serverSession.animal_name;
    photoUrl = serverSession.photo_url;
  }

  activeModule = 'animal-profile-recorder';
  showSection('animalProfile');
  showBehaviorRecorder({ animalId, name, photoUrl });
}
```

### Lookup chain:
1. `activeSessions.find(s => s.id === sessionId)` — matches Site 1 + Site 3 (local id) ✅
2. `activeSessions.find(s => s.serverSessionId === sessionId)` — matches own server sessions (Site 2, own cards) ✅
3. `serverActiveSessions.find(s => s.id === sessionId)` — matches other-user sessions (Site 2, other cards) ✅

### Callers
All 3 badge render sites call `openBehaviorForSession` with the session ID available at their scope:
- Site 1 (app.js:790): `session.id` (local) → matched by step 1
- Site 2 (app.js:1192): `sessionId` (server UUID) → matched by step 2 or 3
- Site 3 (app.js:1298): `session.id` (local) → matched by step 1

The server session fallback extracts `shelter_code` (= animalId), `animal_name` (= name), and `photo_url` (= photoUrl) using the server-response field names (snake_case).

---

## FIX 3 — Font Too Small

### Before
```css
.behavior-btn {
  font-size: 0.6rem;      /* ~9.6px */
  line-height: 1.05;
  /* padding inherited: 8px 12px from card-btn-small */
}
```
Two lines: 2 × 10.08px = 20.16px in 20px content area (barely fits).

### After
```css
.behavior-btn {
  font-size: 0.75rem;     /* ~12px — 25% larger */
  line-height: 1.15;
  padding-top: 4px;        /* reduced from 8px */
  padding-bottom: 4px;     /* reduced from 8px */
}
```
Content area: 40px - 4px border - 8px padding = **28px**.  
Two lines: 2 × 13.8px = **27.6px** — fits with 0.4px headroom.

### Box unchanged
- Height: 40px (from `.card-btn-small { height: 40px }` — not overridden)
- Width: `flex: 1` (unchanged)
- Position: 4th element in `.card-actions-row` (unchanged)
- Only internal vertical padding redistributed (16px → 8px) to give text more room

---

## Verification

### Green stays green on tap ✅
`pointer-events: none` prevents all mouse/touch interaction. No hover, no active, no focus — the green badge stays green regardless of tap/click. Confirmed by CSS inspection: the `.card-btn:hover:not(:disabled)` rule cannot fire when pointer-events is disabled.

### Red/orange navigate to profiler ✅
`openBehaviorForSession` now resolves server UUIDs via `serverSessionId` match or `serverActiveSessions` fallback. The function calls `showBehaviorRecorder({ animalId, name, photoUrl })` with the correct animal data from whichever source matched.

### Font larger + box unchanged ✅
Font bumped from 0.6rem (~9.6px) to 0.75rem (~12px). Two rows at line-height 1.15 = 27.6px in 28px content area. Box stays 40px × flex:1 — no width/height/position change.

### Profiler check-in unaffected ✅
The existing callers (Sites 1 + 3) pass local session IDs → matched by the FIRST check (`s.id === sessionId`), same as before. The new `|| s.serverSessionId === sessionId` and server fallback are additive — they only fire if the first check misses.

### Production untouched ✅
`curl staff.4lgshelterapp.duckdns.org/app.js | grep serverSessionId` → 0 results.

### All 3 render sites consistent ✅
All three call `openBehaviorForSession` with their respective session ID → all resolve correctly.

---

## Commit

```
b8f16c0 staging: fix badge hover bleed (pointer-events:none on green), session lookup (serverSessionId + serverActiveSessions fallback), font bump to 0.75rem
 2 files changed, 23 insertions(+), 6 deletions(-)
 staging-staff/app.js
 staging-staff/styles.css
```
