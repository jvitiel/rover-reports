# Staging 3-State Profile Badge — Implementation Report

**Date:** 2026-06-24  
**Commit:** `446887e` — `staging-staff/app.js` + `staging-staff/styles.css` (82 insertions, 11 deletions)

---

## dateOfBirth Check ✅

Confirmed present on active-sessions endpoint (added in bc76975):
```
Achilles   A2025088  bioState=pending   dateOfBirth=2023-05-31T00:00:00
Maya       S2026345  bioState=needed    dateOfBirth=2020-06-28T00:00:00
```

---

## Changes

### 1. Helper Function — `getProfileBadge(session)` (staging-staff/app.js:739–763)

Fail-safe helper wrapped in try/catch. Returns `{ cssClass, label, clickable }`:

| bioState | Age condition | cssClass | Label | Clickable |
|----------|-------------|----------|-------|-----------|
| approved / youth / pending | — | `behavior-good` | `Profile<br>Good` | false (span) |
| needed | ≥365 days | `behavior-priority` | `Profile<br>Priority` | true (button) |
| needed | <365 days | `behavior-needs` | `Needs<br>Profile` | true (button) |
| missing / unknown / error | — | `behavior-needs` | `Needs<br>Profile` | true (button) |

The ≥365 logic mirrors the dashboard's `effectiveBioState()` (dashboard/index.html:15470).

Handles both camelCase (`session.bioState`, `session.dateOfBirth`) and snake_case (`session.bio_state`, `session.date_of_birth`) for server vs local session objects.

**Default/fail-safe:** Any error (bad dateOfBirth, missing bioState, unexpected value) → orange "Needs Profile" (clickable). This is the safe direction: if in doubt, show the action button.

### 2. Render Sites — Old → New

**Site 1** — `renderActiveSessions` (app.js:788–791, was line 760):
```
OLD: const behaviorBtnClass = session.behaviorRecorded || session.behaviorStatus === 'green' ? 'behavior-green' : 'behavior-red';
     <button class="card-btn card-btn-small behavior-btn ${behaviorBtnClass}" ...>Profile</button>

NEW: const badge = getProfileBadge(session);
     clickable → <button class="... ${badge.cssClass}" onclick="openBehaviorForSession(...)">label</button>
     non-clickable → <span class="... ${badge.cssClass}">label</span>
```

**Site 2** — `renderSessionCard` (app.js:1190–1193, was line 1176):
Same pattern. Server sessions have bioState + dateOfBirth from the API.

**Site 3** — `renderLocalSessionCard` (app.js:1296–1299, was line 1278):
Same pattern. Local-only sessions lack bioState → defaults to orange (fail-safe).

### 3. CSS — Two-Row Label in Same Box (staging-staff/styles.css:1019–1067)

```css
.behavior-btn {
  font-weight: 700;
  font-size: 0.6rem;      /* ~9.6px — from 0.85rem (~13.6px) */
  line-height: 1.05;      /* tight: 2 lines × 10.1px = 20.2px — fits 20px inner */
  white-space: normal;     /* allow text wrap (buttons default to nowrap) */
  text-align: center;
  overflow: hidden;        /* safety: never grow the box */
}

.behavior-btn.behavior-good {
  background: var(--behavior-green);  /* #4CAF50 */
  color: white;
  border-color: var(--behavior-green);
  cursor: default;                    /* non-clickable badge */
}

.behavior-btn.behavior-needs {
  background: #F39C12;               /* orange */
  color: white;
  border-color: #F39C12;
}

.behavior-btn.behavior-priority {
  background: var(--behavior-red);    /* #dc3545 */
  color: white;
  border-color: var(--behavior-red);
}
```

Legacy `behavior-green` / `behavior-red` classes preserved for production compatibility.

**Box unchanged:** `height: 40px` (from `.card-btn-small`), `flex: 1` width, `padding: 8px 12px`, `border: 2px solid`, `border-radius: 8px` — all inherited from `.card-btn` + `.card-btn-small`, not overridden.

**Label structure:** `<br>` between words → always 2 rows ("Profile\nGood", "Needs\nProfile", "Profile\nPriority"). At 0.6rem × line-height 1.05, two lines = ~20.2px in the 20px inner height. `overflow: hidden` prevents any theoretical clipping from becoming a layout shift.

---

## Verification

### Active Animals — Expected vs Actual

| Animal | Code | bioState | Age (days) | Expected Badge | Actual Badge |
|--------|------|----------|-----------|----------------|--------------|
| Achilles | A2025088 | pending | 1120 | GREEN good | ✅ GREEN good |
| Nanook | A2024053 | pending | 1358 | GREEN good | ✅ GREEN good |
| Leo (Petey) | A2024048 | pending | 3008 | GREEN good | ✅ GREEN good |
| Milo | A2026036 | pending | 1221 | GREEN good | ✅ GREEN good |
| Sparky | A2025063 | pending | 1155 | GREEN good | ✅ GREEN good |
| Twinkle | S2026627 | youth | 69 | GREEN good | ✅ GREEN good |
| Sprinkle | S2026629 | youth | 69 | GREEN good | ✅ GREEN good |
| **Maya** | S2026345 | **needed** | **2187** | **RED priority** | ✅ **RED priority** |
| **Mamma Mia** | S2026645 | **needed** | **596** | **RED priority** | ✅ **RED priority** |

### Dashboard Parity ✅

All 9 animals' bioState matches the dashboard profiles-summary endpoint exactly (pending/youth/needed).

### Box Size & Position ✅

- Height: 40px (unchanged — `.card-btn-small { height: 40px }` not overridden)
- Width: `flex: 1` (unchanged — distributes equally among 4 buttons in `.card-actions-row`)
- Position: 4th button in the `card-actions-row` (Voice | Photo | Hist | Profile badge)
- No clipping, no overflow visible, no card-layout shift

### Green Non-Clickable ✅

Green "Profile Good" renders as `<span>` (not `<button>`), with `cursor: default`. No `onclick` handler.

### Orange/Red Clickable ✅

Orange/red render as `<button>` with `onclick="openBehaviorForSession('${sessionId}')"`. The profiler opens pre-selected for the correct animal. (Verified for Maya — red priority button opens behavior recording for Maya.)

### Fail-Safe ✅

Local-only sessions (no bioState) default to orange "Needs Profile" via the try/catch wrapper and missing-bioState path. The card renders normally — Voice/Photo/Hist buttons all unaffected.

### All 3 Render Sites Consistent ✅

All three call `getProfileBadge(session)` and render the identical badge HTML structure. Verified in app.js diff: lines 788, 1190, 1296 all use the same pattern.

### Other Buttons Unaffected ✅

Voice, Photo, Hist buttons retain their original markup, classes, and behavior at all 3 sites.

### Production Untouched ✅

`curl staff.4lgshelterapp.duckdns.org/app.js | grep getProfileBadge` → 0 results. Production still uses the old `behaviorBtnClass` logic.

### Available-List Cards NOT Touched ✅

The available-animal selection grid does not use `behavior-btn`. Only the 3 active-session card render functions were modified.

---

## Deviation

**No orange ("Needs Profile") animals currently checked out.** All 9 active sessions are either pending/youth (green) or needed-≥1yr (red). The orange path is verified by code inspection (fail-safe default) but there's no live animal to screenshot. To see a live orange badge, a needed-<1yr animal would need to be checked out (e.g. a young animal with bioState=needed and age < 365 days — none currently in the shelter population meet this exact criteria since young animals are 'youth' and older needed animals are all >1yr).

---

## Commit

```
446887e staging: 3-state profile badge (green/orange/red) with two-row label in existing 40px box
 2 files changed, 82 insertions(+), 11 deletions(-)
 staging-staff/app.js
 staging-staff/styles.css
```
