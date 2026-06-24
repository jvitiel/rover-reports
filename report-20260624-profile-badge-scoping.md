# Profile Badge on Activity Cards — Scoping Diagnosis

**Date:** 2026-06-24  
**Read-only:** No writes, no code/service changes  

---

## 1. The Existing "Profile" Badge/Button

There are **three** Profile button render sites, all on **active session cards** (checked-out animals):

```js
// staff-pwa/app.js:776 (local active sessions)
<button class="card-btn card-btn-small behavior-btn ${behaviorBtnClass}" 
  onclick="openBehaviorForSession('${session.id}')" title="Profile">Profile</button>

// staff-pwa/app.js:1176 (server active sessions — other caregivers' cards)
<button class="card-btn card-btn-small behavior-btn ${behaviorBtnClass}" 
  onclick="openBehaviorForSession('${sessionId}')" title="Profile">Profile</button>

// staff-pwa/app.js:1278 (combined view active sessions)
<button class="card-btn card-btn-small behavior-btn ${behaviorBtnClass}" 
  onclick="openBehaviorForSession('${session.id}')" title="Profile">Profile</button>
```

### Current color logic (working, not dead):

```js
// app.js:760 (local sessions)
const behaviorBtnClass = session.behaviorRecorded || session.behaviorStatus === 'green' 
  ? 'behavior-green' : 'behavior-red';

// app.js:1159 (server sessions)
const behaviorBtnClass = session.behavior_status === 'green' 
  ? 'behavior-green' : 'behavior-red';

// app.js:1262 (combined view)
const behaviorBtnClass = session.behaviorStatus === 'green' 
  ? 'behavior-green' : 'behavior-red';
```

**What it does now:** Red when the profiler hasn't been run during THIS activity session; green when profiler questions were answered (behaviorRecorded) or behavior_status is 'green'. This is a **per-session** "did you profile during this outing?" indicator — NOT the same as the dashboard profiles tab's "needs profile" state.

**Current onclick:** `openBehaviorForSession(sessionId)` — looks up the session in `activeSessions`, then calls `showBehaviorRecorder({ animalId, name, photoUrl })`. This **already navigates to the profiler section with the animal pre-selected**.

### Where it does NOT exist:

The **available animals list** (the main list view before checkout, `app.js:497-514`) has **no Profile badge** — it shows only name, location, activity count, and last activity time. If the requirement is to add a needs-profile indicator to the available list too, that's a separate render site.

---

## 2. Is "Needs Profile" State Reachable on the Activity Card?

### How the profiles tab derives bioState:

`computeBioState()` at `server.ts:2672` — strict precedence:
1. `pending` — has real staff content (caregiver profile or SM comment) but no approved bio, and age > 84 days
2. `approved` — non-generic approved bio, no unpromoted real draft
3. `youth` — age ≤ 84 days from dateOfBirth
4. `needed` — everything else

Inputs: `bio` object (from `animal_bios` table), `shelterCode`, `description` (SM ANIMALCOMMENTS), `dateOfBirth`, optional draft data.

### What feeds the activity cards:

**Active session cards** — `GET /api/sessions/active/:species` (`server.ts:7695`), returns `SELECT * FROM active_sessions`:
- Schema: id, species, shelter_code, animal_name, location, photo_url, caregiver_out/type, out_time, observations, behavior_status, created_at
- **No bioState, no dateOfBirth, no bio data.** Just the checkout session record.

**Available animals list** — `GET /api/staff/available/:species` (`server.ts:7154`), returns:
- id, shelterCode, name, location, photoUrl, activitiesToday, lastActivityTime, isActive
- **No bioState.** Comes from SM animal data + local activity stats only.

### Verdict: bioState is NOT reachable on either card today.

To get bioState onto the activity cards requires **plumbing it into the endpoint**. Two approaches:
- **A. Compute at endpoint time:** The available-animals endpoint already fetches SM animals. Adding `computeBioState()` requires also fetching the `animal_bios` row for each animal (a DB lookup per animal, or a bulk query). The active-sessions endpoint would need to join against SM data + bios.
- **B. Precomputed column:** Add bioState to a lookup table updated by the nightly job or on profile save. The endpoint joins against it.

Either way, this is a **backend plumbing** step — not just UI wiring.

---

## 3. The Deep-Link — Profiler Pre-Select

### Already exists!

`openBehaviorForSession(sessionId)` at `app.js:2509`:
```js
function openBehaviorForSession(sessionId) {
  const session = activeSessions.find(s => s.id === sessionId);
  if (!session) return;
  
  activeModule = 'animal-profile-recorder';
  showSection('animalProfile');
  showBehaviorRecorder({ animalId: session.animalId, name: session.name, photoUrl: session.photoUrl });
}
```

This navigates from activity → profiler with the animal pre-selected. The profiler's `showBehaviorRecorder(animal)` (`app.js:1989`) accepts `{ animalId, name, photoUrl }` and renders the full recording UI for that animal.

### What needs adjustment:

The existing function requires a **sessionId** (active checkout session) to find the animal data. A "Needs Profile" button on the **available list** (not checked out) would need to call `showBehaviorRecorder()` directly with `{ animalId: animal.shelterCode, name: animal.name, photoUrl: animal.photoUrl }` — the same shape, just not from a session lookup.

**Cost: SMALL** — a one-liner wrapper that skips the session lookup and calls `showBehaviorRecorder` directly with the animal's fields from the available-list data.

---

## 4. PWA Refresh Model

### Active session cards:
- Poll every **15 seconds** via `pollActiveSessions()` (`app.js:1000`): fetches `GET /api/sessions/active/:species`
- Re-renders the card list on each poll
- If bioState were added to the session data, the badge would auto-update within 15 seconds

### Available animals list:
- Loads on section open (`showAvailableAnimals`, `app.js:449`)
- Has a manual **Refresh** button (`refreshAvailableList`, `app.js:521`)
- **No auto-poll** — does not refresh until the user navigates away and back, or clicks Refresh
- After a profile save, the badge would show stale until manual refresh or section re-entry

### Service worker:
- `staff-pwa/sw.js` exists — caches static assets. API calls are network-first (no stale API data issue).

### Verdict:
- **Active session cards:** Auto-refresh within 15s — badge updates promptly (if bioState plumbed into the sessions endpoint)
- **Available list:** Manual refresh only — badge would be stale after profile save until user triggers reload. Could add auto-refresh interval (matches the session polling pattern), or trigger a reload after profile save completes.

---

## 5. Scope Summary

| Piece | Size | Notes |
|-------|------|-------|
| Badge visual (red button / green badge, two labels) | **SMALL** | CSS + conditional class, 3 render sites for session cards + 1 for available list |
| Getting bioState onto the card | **MEDIUM** | Backend: add `computeBioState()` call to available-animals endpoint (bulk bio lookup), and/or to active-sessions endpoint. ~20-30 lines server-side + a bulk query. |
| Deep-link to profiler pre-selected | **SMALL** | Already exists for session cards (`openBehaviorForSession`). For available list: 1-line wrapper calling `showBehaviorRecorder()` directly. |
| Refresh after save | **SMALL** | Session cards: auto-refresh via existing 15s poll. Available list: either add poll interval or trigger reload after `saveBehaviorData()` completes — ~5 lines. |
| Removing old badge logic | **SMALL** | Replace `behaviorBtnClass` computation at 3 sites (lines 760, 1159, 1262) with bioState-based logic. Clean removal — the `behaviorRecorded`/`behaviorStatus` fields and CSS classes (`behavior-green`/`behavior-red`) are used ONLY for this badge. |

### Overall size: **SMALL-MEDIUM**

The **main driver** is the backend plumbing: getting `bioState` (or the underlying fields to compute it) into the activity endpoints. The bio lookup (`animal_bios` table) is currently only done by the profiles-summary endpoint and the bio-generation pipeline — the activity endpoints don't touch it. Adding it is straightforward (bulk query on shelter_codes, ~20 lines) but is a server-side change touching the activity data shape, so it needs testing.

Everything else is small: the badge visual is CSS, the deep-link already exists, the refresh is either free (15s poll) or ~5 lines, and the old logic is cleanly replaceable.

### Clarification needed:

The prompt says "the existing Profile badge on activity cards." The existing Profile **button** appears only on **active session cards** (checked-out animals), not on the **available list**. If the requirement includes adding a needs-profile indicator to the available list too (so staff can see which animals need profiling BEFORE checkout), that's one additional render site + plumbing bioState into the available-animals endpoint (same MEDIUM backend work — it shares the same SM data source).
