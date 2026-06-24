# Staging Badge Bugs — Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only. Diagnose 3 bugs from John's testing on staging (446887e).

---

## Bug 1: Green Badge Turns WHITE on Click (~15s)

### Root Cause: CSS `.card-btn:hover` Override

The green badge renders as a `<span>` with classes `card-btn card-btn-small behavior-btn behavior-good` (staging-staff/app.js:791):

```html
<span class="card-btn card-btn-small behavior-btn behavior-good">Profile<br>Good</span>
```

No `onclick` — correct. But `.card-btn:hover:not(:disabled)` (staging-staff/styles.css:996) applies:

```css
.card-btn:hover:not(:disabled) {
  border-color: var(--primary);
  background: white;
}
```

**Problem:** On mobile, a tap creates a **sticky hover state** that persists until the next touch elsewhere. The `<span>` is never `:disabled` (HTML spans can't be disabled), so the hover rule fires → sets `background: white` → overrides the green `background: var(--behavior-green)`.

The "~15s = poll interval" timing is correct: `pollActiveSessions` runs every 15s (app.js:1031), calls `renderAllActiveCards`, which re-renders all card HTML. The fresh DOM replaces the hover-stuck span, restoring green.

**Fix:** Either (a) add `.behavior-btn.behavior-good:hover { background: var(--behavior-green) }` to override the hover, or (b) exclude `.behavior-good` from the hover rule, or (c) change the green element to NOT include `card-btn` class (use a separate badge class).

---

## Bug 2: Red Button Does NOT Navigate + Color Flips Darker

### Root Cause: `openBehaviorForSession` Can't Find Server Sessions

The red button renders correctly with `onclick="openBehaviorForSession('${sessionId}')"` (staging-staff/app.js:1192):

```html
<button class="card-btn card-btn-small behavior-btn behavior-priority" 
        onclick="openBehaviorForSession('f98c05e1-b46b-...')" title="Profile">Profile<br>Priority</button>
```

But `openBehaviorForSession` (app.js:2546–2553) only searches LOCAL sessions:

```js
function openBehaviorForSession(sessionId) {
  const session = activeSessions.find(s => s.id === sessionId);  // line 2548
  if (!session) return;   // <-- EXITS HERE for server sessions
  
  activeModule = 'animal-profile-recorder';
  showSection('animalProfile');
  showBehaviorRecorder({ animalId: session.animalId, name: session.name, photoUrl: session.photoUrl });
}
```

**The mismatch:** `activeSessions` (local) stores sessions with `id: Date.now().toString()` (a timestamp like `"1719244709000"`) and a separate `serverSessionId: "f98c05e1-b46b-..."` (app.js:679–681). But the red button passes the SERVER UUID. The `find(s => s.id === sessionId)` searches by LOCAL id — it never matches the server UUID → returns early → nothing opens.

For **own sessions** (rendered by `renderSessionCard` with `isOther=false`), the local session exists but with a different `.id`. The function should ALSO check `s.serverSessionId === sessionId`.

For **other users' sessions** (rendered by `renderSessionCard` with `isOther=true`), there is NO local session at all. The function would need to fall back to looking up `serverActiveSessions` and extracting the animal ID from the server session object (which has `shelter_code` and `animal_name`).

**The "darker red for ~15s"** is the same CSS hover issue: `.card-btn:hover:not(:disabled)` changes `background: white` and `border-color: var(--primary)`. On a red button, the hover white partially mixes with the active state, making it appear "darker" or shifted. Same 15s poll-refresh clears it.

---

## Bug 3: Old Handler — Was It Removed?

### Answer: There IS No Old Toggle Handler

The old code had `behaviorBtnClass = session.behavior_status === 'green' ? 'behavior-green' : 'behavior-red'` and an `onclick="openBehaviorForSession('${sessionId}')"` — the **same** function. There was never a separate "toggle behavior status" click handler on the badge. The old badge was always a button that called `openBehaviorForSession`.

What changed in 446887e:
- The `behaviorBtnClass` logic was REPLACED by `getProfileBadge(session)` at all 3 sites ✅
- The onclick target (`openBehaviorForSession`) was kept for clickable badges ✅
- Green badges became `<span>` with no onclick ✅

**The bugs are NOT from an old handler still firing.** They're from:
1. **CSS hover bleeding** — the shared `.card-btn` hover rule overrides badge colors on mobile touch
2. **Session lookup mismatch** — `openBehaviorForSession` can't find server sessions by their UUID (pre-existing bug, now exposed because the old behavior button had the same issue but nobody noticed since the old red/green was purely cosmetic and the profiler had other entry points)

---

## Bug 4: Font Size — Room to Grow

### Current Metrics

| Property | Value | Source |
|----------|-------|-------|
| Box height | 40px | `.card-btn-small { height: 40px }` |
| Border | 2px × 2 = 4px | `.card-btn { border: 2px solid }` |
| Padding (vertical) | 8px × 2 = 16px | `.card-btn-small { padding: 8px 12px }` |
| Content height | 40 - 4 - 16 = **20px** | `box-sizing: border-box` |
| Font size | 0.6rem (~9.6px) | `.behavior-btn` |
| Line height | 1.05 | `.behavior-btn` |
| Two lines | 2 × 10.08px = **20.16px** | At limit — fits barely |

### Headroom

At 20px content height, 0.6rem × 1.05 uses 20.16px — essentially 0px headroom. The text fits but has no margin for rendering variance.

**Without changing padding** (20px content):
| Font | Line-height | Two lines | Fits? |
|------|------------|-----------|-------|
| 0.65rem (10.4px) | 1.0 | 20.8px | ❌ 0.8px over |
| 0.63rem (10.1px) | 1.0 | 20.2px | ⚠️ borderline |

**With reduced padding** (behavior-btn only, box stays 40px):
| Padding | Content | Font | Line-height | Two lines | Fits? |
|---------|---------|------|------------|-----------|-------|
| 5px 12px | 26px | 0.7rem (11.2px) | 1.15 | 25.76px | ✅ comfortable |
| 4px 12px | 28px | 0.75rem (12px) | 1.15 | 27.6px | ✅ comfortable |
| 4px 12px | 28px | 0.7rem (11.2px) | 1.2 | 26.88px | ✅ comfortable |

### Recommendation

**Override padding to `4px 12px` on `.behavior-btn` only** (the other card-btn-small buttons keep 8px 12px), then use **0.75rem / line-height 1.15**. This gives clear, readable two-row labels at 12px font (vs 9.6px current) with 0.4px headroom. The box stays exactly 40px tall — only internal vertical padding redistributes from 16px to 8px to give the text more room.

```css
.behavior-btn {
  font-weight: 700;
  font-size: 0.75rem;
  line-height: 1.15;
  padding-top: 4px;
  padding-bottom: 4px;
  white-space: normal;
  text-align: center;
  overflow: hidden;
}
```
